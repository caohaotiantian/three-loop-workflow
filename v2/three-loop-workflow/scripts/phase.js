export const meta = {
  name: 'three-loop-phase',
  description: 'Runs one Build phase: write -> gates -> review -> fix, with round counting as code',
  phases: [
    { title: 'Write' },
    { title: 'Gates' },
    { title: 'Review' },
    { title: 'Triage' },
    { title: 'Fix' },
  ],
}

// Invoke with args:
//   { phaseLabel, planPath, tasks, acceptCmds: [...], baseSha, maxRounds?, models?: {write,gates,review,triage,fix} }
//
// Why this script exists: round counting, closure arithmetic, and role isolation become code
// instead of instructions an agent can rationalize past. The main agent cannot accidentally
// grant itself a fourth round, and cannot close a phase on a reviewer's encouraging prose.

const {
  phaseLabel = 'phase',
  planPath = '.agent/plan.md',
  tasks = '',
  acceptCmds = [],
  baseSha,
  maxRounds = 3,
  reviewers = 1,   // 1 for Standard, 2 for Deep — see references/build.md "Review"
  models = {},
} = args || {}

if (!baseSha) return { status: 'usage-error', reason: 'baseSha is required and must be captured BEFORE editing' }
if (!acceptCmds.length) return { status: 'usage-error', reason: 'acceptCmds is required — a phase with no runnable acceptance cannot close' }

const WRITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['branch', 'conflict', 'blocked', 'concerns'],
  properties: {
    branch: { type: 'string', description: 'Branch the work landed on' },
    conflict: { type: 'boolean', description: 'True if the plan contradicts the code — do not decide, report it' },
    blocked: { type: 'boolean', description: 'True if you could not complete the task' },
    concerns: { type: 'array', items: { type: 'string' }, description: 'Parts you are least confident in' },
  },
}

const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['all_pass', 'results', 'failures'],
  properties: {
    all_pass: { type: 'boolean' },
    results: { type: 'array', items: { type: 'string' }, description: 'One line per command: the command, its exit code, and the pass/fail/skip tally' },
    failures: { type: 'array', items: { type: 'string' } },
  },
}

const TRIAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['confirmed', 'rejected'],
  properties: {
    confirmed: { type: 'array', items: { type: 'string' }, description: 'Claims you checked and found real, verbatim as given' },
    rejected: { type: 'array', items: { type: 'string' }, description: 'Claim, then one line on what the code actually does' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['blocking', 'nonblocking', 'blocking_count', 'nonblocking_count'],
  properties: {
    blocking: { type: 'array', items: { type: 'string' } },
    nonblocking: { type: 'array', items: { type: 'string' } },
    blocking_count: { type: 'integer' },
    nonblocking_count: { type: 'integer' },
  },
}

// One retry on a dead agent, so an infrastructure failure is not counted as a review round.
async function tryAgent(prompt, opts) {
  const r = await agent(prompt, opts)
  if (r !== null && r !== undefined) return r
  log(`${phaseLabel}: ${opts.label} returned nothing; retrying once`)
  return await agent(prompt, opts)
}

// ── Write ─────────────────────────────────────────────────────
phase('Write')

let work = await tryAgent(
  `You are implementing ${phaseLabel}. Read the plan at ${planPath}.\n\n` +
  `Tasks:\n${tasks}\n\n` +
  `Create a branch for this phase and implement the tasks. Where you add new behavior, write the test ` +
  `first and watch it fail before making it pass.\n` +
  `Before returning, read your own diff and remove anything that does not trace to the plan's Goal or a ` +
  `recorded Decision, plus any comment that narrates process rather than explaining code.\n` +
  `If the plan contradicts what you find in the code, set conflict=true and stop — do not decide it yourself.\n` +
  `Report honestly: set blocked=true if you could not finish, and list anything you are unsure about in concerns.`,
  { label: `write:${phaseLabel}`, phase: 'Write', schema: WRITE_SCHEMA, model: models.write }
)

if (!work) return { status: 'agent-error', phaseLabel, round: 0, stage: 'write' }
if (work.conflict) return { status: 'plan-conflict', phaseLabel, round: 0 }

// A blocked implementer gets exactly one re-dispatch carrying its own concerns forward.
// Bounded so it cannot become an uncounted retry loop.
if (work.blocked) {
  log(`${phaseLabel}: implementer blocked — one re-dispatch with its concerns surfaced`)
  const retry = await tryAgent(
    `You are implementing ${phaseLabel}. A previous attempt stopped, reporting:\n` +
    `${(work.concerns || []).join('; ') || 'no detail given'}\n\n` +
    `Read the plan at ${planPath} and the tasks below, resolve what blocked the previous attempt if you can, ` +
    `and implement.\n\nTasks:\n${tasks}\n\n` +
    `If you are blocked for the same reason, set blocked=true again with a specific explanation — do not guess.`,
    { label: `write:${phaseLabel}:redispatch`, phase: 'Write', schema: WRITE_SCHEMA, model: models.write }
  )
  if (!retry) return { status: 'agent-error', phaseLabel, round: 0, stage: 'write-redispatch' }
  if (retry.conflict) return { status: 'plan-conflict', phaseLabel, round: 0 }
  if (retry.blocked) {
    return {
      status: 'write-escalation',
      phaseLabel,
      round: 0,
      concerns: (retry.concerns && retry.concerns.length) ? retry.concerns : (work.concerns || []),
    }
  }
  work = retry
}

if (!work.branch) return { status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: 'no branch returned' }

const branch = work.branch
const concerns = work.concerns || []

// ── Verify loop ───────────────────────────────────────────────
// `round` counts FIX rounds and increments only when a fix actually runs. A clean pass never
// consumes budget, so the caller gets the full `maxRounds` of recovery it was promised.
let round = 1

while (round <= maxRounds) {
  // Gates run before review, every round: an agent's opinion about code that does not compile
  // is worthless, and gate output is far cheaper than a review pass.
  //
  // This corner needs an agent only because a Workflow script cannot shell out — it has
  // agent()/parallel()/phase()/log() and nothing else. The agent is a shell proxy here, not a
  // reviewer: it runs commands and reports exit codes, and it judges nothing.
  phase('Gates')
  const gates = await tryAgent(
    `Run each of these commands in order and report its exit code and result tally. Run them; do not ` +
    `evaluate the code and do not fix anything.\n\n${acceptCmds.map(c => `- ${c}`).join('\n')}\n\n` +
    `For each: the command, its exit code, and the pass/fail/skip counts if it is a test command. ` +
    `A command that exits 0 with every test skipped is NOT a pass — report the tally so that is visible. ` +
    `Set all_pass only if every command exited 0 and none of them skipped everything.`,
    { label: `gates:${phaseLabel}:r${round}`, phase: 'Gates', schema: GATE_SCHEMA, model: models.gates }
  )
  if (!gates) return { status: 'agent-error', phaseLabel, round, stage: 'gates' }

  let review = null
  if (gates.all_pass) {
    phase('Review')
    const reviewPrompt =
      `Review the diff at \`git diff ${baseSha}..${branch}\` against the plan at ${planPath}. ` +
      `Your FIRST tool call must be that git diff — review the diff itself, not any summary of it.\n\n` +
      `Report everything you find, at any severity; the caller triages. Cite file:line from the diff for ` +
      `each finding. Mark a finding blocking only if it is wrong behavior, a broken contract, or work ` +
      `outside the plan's Goal.\n\n` +
      `Check specifically:\n` +
      `- Does every changed line trace to the Goal or a recorded Decision?\n` +
      `- Does anything land in the plan's Non-goals?\n` +
      `- Does new behavior have a test, and does \`git log ${baseSha}..${branch}\` show it failing first?\n` +
      `- Any comment narrating process rather than explaining code?\n` +
      (concerns.length ? `\nThe implementer flagged low confidence in: ${concerns.join('; ')} — look there first.\n` : '') +
      `\nDo not modify code.`

    // Reviewers run independently and in parallel, and their findings are UNIONed.
    // Measured on this repo's own design docs: a single reviewer caught 54% of known defects,
    // two caught 86%, and only 19% of defects were found by every reviewer. Low overlap is the
    // reason a second reviewer pays; it is also why the union must never be filtered down to
    // what they agree on — agreement would discard half the real findings.
    const verdicts = (await parallel(
      Array.from({ length: Math.max(1, reviewers) }, (_, i) => () =>
        tryAgent(reviewPrompt, {
          label: reviewers > 1 ? `review:${phaseLabel}:r${round}:v${i + 1}` : `review:${phaseLabel}:r${round}`,
          phase: 'Review',
          schema: REVIEW_SCHEMA,
          model: models.review,
        })
      )
    )).filter(Boolean)

    // A reviewer that dies is not a reviewer that passed.
    if (verdicts.length < Math.max(1, reviewers)) {
      return { status: 'agent-error', phaseLabel, round, stage: 'review', reason: `${verdicts.length}/${reviewers} reviewers returned` }
    }

    const reported = [...new Set(verdicts.flatMap(v => v.blocking || []))]
    const nonblocking = [...new Set(verdicts.flatMap(v => v.nonblocking || []))]

    // Triage before counting. Measured on this repo's own review output, blind adversarial
    // checking rejected 30-50% of blocking-graded findings. Closing on the RAW count lets a
    // phantom defect consume a fix round and exhaust the cap on already-correct code, so the
    // arithmetic below runs on confirmed findings only.
    let blocking = reported
    if (reported.length) {
      phase('Triage')
      const triage = await tryAgent(
        `Check each claimed defect below against the actual code in \`git diff ${baseSha}..${branch}\`. ` +
        `Decide which are real.\n\n${reported.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n` +
        `Reject a claim when it misreads the code, attacks something the code does not do, describes a ` +
        `real property that is not a problem, or dissolves once you read the surrounding lines. ` +
        `Confirm one only after you have looked at the cited code and the defect is really there. ` +
        `When torn, look again rather than confirming defensively.\n` +
        `Return confirmed (verbatim, as given) and rejected (each with one line on what the code actually does). ` +
        `Do not modify code.`,
        { label: `triage:${phaseLabel}:r${round}`, phase: 'Triage', schema: TRIAGE_SCHEMA, model: models.triage }
      )
      if (!triage) return { status: 'agent-error', phaseLabel, round, stage: 'triage' }
      blocking = triage.confirmed || []
      if (triage.rejected && triage.rejected.length) {
        log(`${phaseLabel}: triage rejected ${triage.rejected.length}/${reported.length} blocking findings`)
      }
      phase('Review')
    }

    review = { blocking, nonblocking, blocking_count: blocking.length, nonblocking_count: nonblocking.length, reported_count: reported.length }

    // Closure is arithmetic on the counts. The reviewer's prose verdict is deliberately not read:
    // "looks good overall" alongside a listed blocking item is not a pass.
    if (review.blocking_count === 0) {
      return {
        status: 'closed',
        phaseLabel,
        round,
        branch,
        gates: gates.results,
        nonblocking: review.nonblocking,
      }
    }
  }

  const failures = gates.all_pass ? review.blocking : gates.failures
  const stage = gates.all_pass ? 'review' : 'gates'

  if (round === maxRounds) {
    return { status: 'cap-exhausted', phaseLabel, round, stage, branch, unresolved: failures }
  }

  phase('Fix')
  log(`${phaseLabel}: ${stage} failures (${failures.length}), running fix round ${round}`)
  await tryAgent(
    `Fix these ${stage} failures on branch "${branch}". Inspect the diff with ` +
    `\`git diff ${baseSha}..${branch}\`.\n\n${failures.map(f => `- ${f}`).join('\n')}\n\n` +
    `State the root cause of each item ("X is caused by Y") before editing, and change that cause — ` +
    `one at a time, smallest change that addresses it.\n` +
    `If a cause is not obvious, rank 3-5 falsifiable hypotheses and find the observation that ` +
    `discriminates between the top two. Do not anchor on the first theory that fits.\n` +
    `If an item is a correctness bug, write a failing test that reproduces it first, then fix to green.\n` +
    `If an item passes on re-run with no code change it is a flake, not a regression in this diff: do not ` +
    `disable the test, loosen an assertion, add a retry, or raise a timeout to force green. Leave it and ` +
    `report it as a separate concern.\n` +
    `Commit to the same branch as fix(${phaseLabel}): naming the item you fixed.`,
    { label: `fix:${phaseLabel}:r${round}`, phase: 'Fix', model: models.fix }
  )

  round++
}

return { status: 'cap-exhausted', phaseLabel, round: maxRounds, stage: 'loop-exit', branch }
