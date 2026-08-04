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
//   { phaseLabel?, planPath, tasks, acceptCmds: [...], baseSha, depth,
//     branch?, reviewers?, repoPath?, maxRounds?, models?: {write,gates,review,triage,fix} }
//
//   phaseLabel  label for this phase, used in agent labels and logs.
//   planPath    path to the task's plan — `.agent/<task>/plan.md`. No default: a shared path would
//               let two tasks overwrite each other.
//   tasks       the phase's task list, verbatim from the plan. Required — a phase dispatched with an
//               empty task list produces a meaningless run that still looks like a run.
//   acceptCmds  the commands whose exit codes decide the phase.
//   baseSha     `git rev-parse HEAD` captured BEFORE editing. At Deep depth this is *this phase's*
//               base, not the base of the whole change.
//   depth       'standard' (one reviewer) or 'deep' (two, in parallel, unioned). Named in the skill's
//               own vocabulary rather than as a raw count. `reviewers: 1 | 2` is still accepted for
//               callers written against the earlier contract; what is rejected is passing NEITHER,
//               because a count that defaulted to 1 let a Deep phase silently run the Standard review.
//   phaseLabel  optional, defaults to 'phase' — it only labels agents and logs.
//   models      optional per-stage model overrides.
//   branch      optional, and authoritative when given. The review diffs baseSha..branch, so whoever
//               owns the branch should say which one rather than trusting the implementer's report.
//   repoPath    absolute path to the repository under test. Optional, and only omittable when the
//               agents already start there. Every prompt carries it: without it the Triage and Fix
//               prompts are a branch name and a sha and nothing else, so an agent standing anywhere
//               else cannot find the tree — measured, and it makes a fix round impossible to complete.
//   maxRounds   fix rounds allowed. Bounds FIXES SPENT, not verifications.
//
// Why this script exists: round counting, closure arithmetic, and role isolation become code
// instead of instructions an agent can rationalize past. The main agent cannot accidentally
// grant itself a fourth round, and cannot close a phase on a reviewer's encouraging prose.
//
// Every invariant below is asserted by execution in this repository's scripts/sim-phase.js, and that
// harness is itself mutation-tested. Change the control flow here and re-run both.

// The Workflow tool delivers `args` to a script as a JSON **string**, not an object. Measured with a
// probe script, not assumed: `typeof args === 'string'`, `Object.keys` unavailable, and the string
// parses cleanly back to the object the caller passed. Destructuring a string yields all-undefined, so
// before this every invocation through the tool returned `usage-error: planPath is required` however
// complete the arguments were — which is why this script had never once run end to end. The nested
// `workflow(ref, args)` form may differ; both shapes are accepted so it does not matter which you use.
function inputs(v) {
  if (v == null) return {}
  if (typeof v === 'object') return v
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      if (parsed && typeof parsed === 'object') return parsed
      return { __argsError: `args parsed to a ${typeof parsed}, not an object` }
    } catch (e) {
      return { __argsError: `args is a string that is not JSON: ${v.slice(0, 60)}` }
    }
  }
  return { __argsError: `args is a ${typeof v}, which cannot carry named arguments` }
}
const input = inputs(args)

const {
  phaseLabel = 'phase',
  planPath,
  tasks,
  acceptCmds = [],
  baseSha,
  depth,
  reviewers: legacyReviewers,
  branch: callerBranch,
  repoPath,
  maxRounds = 3,
  models = {},
} = input

// A sha reported by an agent is a string it typed, not a fact. Normalise before comparing: the
// empty-diff guard is an equality test, so an abbreviated sha or stray whitespace would slip past it
// and the phase would review nothing. Reject anything that is not a full 40-hex object id.
function sha(v) {
  const t = String(v == null ? '' : v).trim().toLowerCase()
  return /^[0-9a-f]{40}$/.test(t) ? t : null
}

// Branch names are interpolated into `git diff` commands that other agents run. Accept only what git
// itself would accept as a simple ref.
function ref(v) {
  const t = String(v == null ? '' : v).trim()
  return /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(t) && !t.includes('..') ? t : null
}

// Where the repository is. Absolute only, and no character an agent could paste into a shell and get
// substitution from. Optional: without it every agent works wherever it starts, which is right when
// that IS the repository and is how the script is normally driven.
function dir(v) {
  const t = String(v == null ? '' : v).trim()
  return /^\/[^\n\r`$"';|&<>]*$/.test(t) ? t.replace(/\/+$/, '') || '/' : null
}

if (input.__argsError) return { status: 'usage-error', reason: input.__argsError }
if (!planPath) return { status: 'usage-error', reason: 'planPath is required — plans live at .agent/<task>/plan.md, one directory per task, so there is no default to fall back to' }
if (!baseSha) return { status: 'usage-error', reason: 'baseSha is required and must be captured BEFORE editing' }
if (!tasks || !String(tasks).trim()) return { status: 'usage-error', reason: 'tasks is required — a phase dispatched with an empty task list produces a run that looks complete and implemented nothing' }
if (!acceptCmds.length) return { status: 'usage-error', reason: 'acceptCmds is required — a phase with no runnable acceptance cannot close' }
if (!Number.isInteger(maxRounds) || maxRounds < 0) return { status: 'usage-error', reason: `maxRounds must be a non-negative integer (got ${JSON.stringify(maxRounds)})` }

// `depth` is the preferred spelling because it is the skill's own vocabulary; a numeric `reviewers`
// is still accepted for callers written against the earlier contract. What is NOT accepted is omitting
// both, which is the actual defect: a count that defaulted to 1 let a Deep phase run the Standard
// review by being forgotten, silently and with nothing in the result to show it.
if (depth === undefined && legacyReviewers === undefined) {
  return { status: 'usage-error', reason: "one of depth ('standard' | 'deep') or reviewers (1 | 2) is required — with neither, a Deep phase would quietly run the Standard review" }
}
if (depth !== undefined && depth !== 'standard' && depth !== 'deep') {
  return { status: 'usage-error', reason: `depth must be 'standard' or 'deep' (got ${JSON.stringify(depth)})` }
}
if (legacyReviewers !== undefined && !Number.isInteger(legacyReviewers)) {
  return { status: 'usage-error', reason: `reviewers must be an integer (got ${JSON.stringify(legacyReviewers)})` }
}
const reviewers = depth !== undefined ? (depth === 'deep' ? 2 : 1) : legacyReviewers
if (reviewers < 1) return { status: 'usage-error', reason: `reviewers must be at least 1 (got ${JSON.stringify(reviewers)})` }
// Both spellings given and disagreeing is a caller bug, not something to resolve by precedence.
if (depth !== undefined && legacyReviewers !== undefined && legacyReviewers !== reviewers) {
  return { status: 'usage-error', reason: `depth '${depth}' implies ${reviewers} reviewer(s) but reviewers=${legacyReviewers} was also passed — pass one or the other` }
}
const resolvedDepth = depth !== undefined ? depth : (reviewers >= 2 ? 'deep' : 'standard')

const base = sha(baseSha)
if (!base) return { status: 'usage-error', reason: `baseSha is not a full 40-hex sha (${JSON.stringify(baseSha)}); pass the output of \`git rev-parse HEAD\`` }
if (callerBranch !== undefined && !ref(callerBranch)) {
  return { status: 'usage-error', reason: `branch is not a usable git ref (${JSON.stringify(callerBranch)})` }
}

// WHERE THE WORK IS. Every prompt below carries this when the caller gives it, and the reason is a
// failure that was measured rather than imagined: driven against a repository that was not the
// agents' working directory, a phase could not complete a fix round at all. The Write and Review
// prompts happen to name `planPath`, so an absolute plan gave those two agents something to find the
// tree with — but Triage and Fix are built from a branch name and a sha and nothing else. The fix
// agent searched the filesystem, committed nothing, and the phase died on the no-op-fix guard below,
// which fired correctly on a cause three steps upstream of it.
//
// `orchestration.md` documents driving this script from an installed skill against your own repository,
// which is exactly that case. Omitting it is still supported and still correct when the agents already
// start in the repository; passing it is what makes the documented usage work.
const repoRoot = repoPath === undefined ? null : dir(repoPath)
if (repoPath !== undefined && !repoRoot) {
  return { status: 'usage-error', reason: `repoPath must be an absolute path with no shell metacharacters (got ${JSON.stringify(repoPath)})` }
}
const where = repoRoot ? `Work in the repository at ${repoRoot}. \`cd\` there first; every path and every git command below resolves there.\n\n` : ''
// Said once, at dispatch, so the choice is visible before anything fails rather than only after.
// Without repoPath every agent works wherever it happens to start, which is right when that is the
// repository and silently wrong when it is not — and the way it fails is three steps downstream.
const noRepoHint = repoRoot ? '' : ' No repoPath was given, so the agents worked in whatever directory they started in; if that is not this repository, that is the cause and not the symptom.'
if (!repoRoot) log(`${phaseLabel}: no repoPath — agents will work in their own starting directory, which is only correct if that is the repository under test`)

const WRITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['branch', 'headSha', 'conflict', 'blocked', 'concerns'],
  properties: {
    branch: { type: 'string', description: 'The branch you committed on — report it, do not create one' },
    headSha: { type: 'string', description: 'Output of `git rev-parse HEAD` AFTER committing. The review diffs ref-to-ref, so uncommitted work is invisible to it.' },
    conflict: { type: 'boolean', description: 'True if the plan contradicts the code — do not decide, report it' },
    blocked: { type: 'boolean', description: 'True if you could not complete the task' },
    concerns: { type: 'array', items: { type: 'string' }, description: 'Parts you are least confident in' },
  },
}

const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['all_pass', 'results', 'failures', 'headSha'],
  properties: {
    all_pass: { type: 'boolean' },
    headSha: { type: 'string', description: 'Output of `git rev-parse HEAD`, exactly 40 hex characters. Captured here because gates run immediately before review, so this is the commit the reviewer will actually see.' },
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

const branchInstruction = callerBranch
  ? `You are already on branch "${callerBranch}". Commit there and report it as branch. Do NOT create another one: `
  : `Implement the tasks on the branch you are already on. Do NOT create a per-phase branch: `

let work = await tryAgent(
  where +
  `You are implementing ${phaseLabel}. Read the plan at ${planPath}.\n\n` +
  `Tasks:\n${tasks}\n\n` +
  branchInstruction +
  `phases are sequential commits on one branch, and branching per phase makes the next phase's review ` +
  `show this phase's work again. Where you add new behavior, write the test first and watch it fail ` +
  `before making it pass.\n` +
  `**Commit your work before returning**, matching the convention in \`git log --oneline -20\`, then ` +
  `report \`git rev-parse HEAD\` as headSha. Review diffs ref-to-ref: anything left uncommitted is ` +
  `invisible to it and will be reviewed as though you had changed nothing.\n` +
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
    where +
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

// The review diffs baseSha..branch. If the implementer never committed, that range is empty and the
// phase would close green having reviewed nothing — gates pass, because they run against the working
// tree, and an empty diff is indistinguishable from a clean one. Fail loudly instead.
//
// Shape is not existence, and this check does not establish existence. What the gates step's own
// `git rev-parse HEAD` adds below is that the range is not EMPTY — the reported sha is then discarded
// in favour of that real head. So a fabricated sha does not survive into the returned `headSha`, but it
// is not itself detected: if the branch has commits, a phase whose implementer reported a sha it never
// created still reviews the real diff and closes on it. Detecting the fabrication would need the sha
// resolved in the repository, which this script cannot do — it has no shell.
const writeHead = sha(work.headSha)
if (!writeHead) {
  return { status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: `headSha is not a full 40-hex sha (${JSON.stringify(work.headSha)}) — cannot confirm the work was committed` }
}
if (writeHead === base) {
  return { status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: `nothing committed on ${work.branch}: HEAD is still baseSha, so the review would see an empty diff.${noRepoHint}` }
}

const reportedBranch = ref(work.branch)
if (!reportedBranch) {
  return { status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: `the reported branch is not a usable git ref (${JSON.stringify(work.branch)})` }
}
if (callerBranch && reportedBranch !== callerBranch) {
  return { status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: `the implementer committed to "${reportedBranch}" but this phase runs on "${callerBranch}" — phases are sequential commits on one branch, and a side branch makes the next phase's review show this phase's work again` }
}
const branch = callerBranch || reportedBranch
const concerns = work.concerns || []

// ── Verify loop ───────────────────────────────────────────────
// Two counters, deliberately separate. `verifyRound` counts trips through gates+review; `fixes`
// counts fix rounds actually run, and only a fix increments it. Conflating them is how a cap of
// N silently delivers N-1 fixes: the budget check fires on the round about to be verified rather
// than on the fixes already spent. `maxRounds` bounds FIXES, matching SKILL.md and build.md.
// Verifying N+1 times to spend N fixes is correct — the last fix still has to be checked.
let verifyRound = 1
let fixes = 0
let gateFixes = 0
let reviewFixes = 0
let lastHead = writeHead
// Accumulated across rounds. A non-blocking finding reported in round 1 and not repeated at closure
// is still a real finding; recomputing the list each round silently drops it. Rejections accumulate
// for the same reason, and because build.md requires the record to survive the phase.
const nonblockingSeen = new Set()
const rejectedSeen = []

// Bounded by the verifications a full budget needs: maxRounds fixes plus one final check. The bound is
// deliberately structural and independent of `fixes`, so the loop terminates even if the fix counter
// stops advancing — which is precisely how v1's runner failed. The return after the loop is therefore
// a live path, not dead code: negative-test.sh reaches it by breaking the counter, and without the
// bound that mutation spins forever instead of returning.
while (verifyRound <= maxRounds + 1) {
  const round = verifyRound
  // Gates run before review, every round: an agent's opinion about code that does not compile
  // is worthless, and gate output is far cheaper than a review pass.
  //
  // This corner needs an agent only because a Workflow script cannot shell out — it has
  // agent()/parallel()/phase()/log() and nothing else. The agent is a shell proxy here, not a
  // reviewer: it runs commands and reports exit codes, and it judges nothing.
  phase('Gates')
  const gates = await tryAgent(
    where +
    `Run each of these commands in order and report its exit code and result tally. Run them; do not ` +
    `evaluate the code and do not fix anything.\n\n${acceptCmds.map(c => `- ${c}`).join('\n')}\n\n` +
    `For each: the command, its exit code, and the pass/fail/skip counts if it is a test command. ` +
    `A command that exits 0 with every test skipped is NOT a pass — report the tally so that is visible. ` +
    `Set all_pass only if every command exited 0 and none of them skipped everything.\n` +
    `Also run \`git rev-parse HEAD\` and report it as headSha, all 40 characters, exactly as printed.`,
    { label: `gates:${phaseLabel}:r${round}`, phase: 'Gates', schema: GATE_SCHEMA, model: models.gates }
  )
  if (!gates) return { status: 'agent-error', phaseLabel, round, stage: 'gates' }

  // Fail closed. An unparseable head means the script cannot tell whether anything was committed, and
  // every guard below is an equality test against it. Treating it as "unknown, carry on" is what let a
  // no-op fix round grind to cap-exhausted against an unchanged tree.
  const gateHead = sha(gates.headSha)
  if (!gateHead) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage: 'gates', branch, reason: `the gates step did not report a usable HEAD (${JSON.stringify(gates.headSha)}), so neither the empty-diff nor the no-op-fix guard can be evaluated` }
  }
  // The other half of the empty-diff guard: this is the real HEAD, not a self-report. If it is the
  // base, nothing from this phase is committed, however well-formed the implementer's claim looked.
  // Checked every round, not only before the first fix: a fix round that resets or drops the phase's
  // commits also lands HEAD back on the base, and `gateHead === lastHead` does not catch that because
  // lastHead is the previous round's non-base head. HEAD equal to the base is never legitimate here.
  if (gateHead === base) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage: fixes === 0 ? 'write' : 'fix', branch, reason: `HEAD is baseSha on ${branch}: nothing from this phase is committed, so the review would see an empty diff` }
  }
  // A fix round that committed nothing leaves the tree identical: the reviewer will report the same
  // findings, and the phase grinds to cap-exhausted without anyone noticing the fix never landed.
  if (fixes > 0 && gateHead === lastHead) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage: 'fix', branch, reason: `the last fix round committed nothing — HEAD is unchanged, so the next review would be identical.${noRepoHint}` }
  }
  lastHead = gateHead

  let review = null
  if (gates.all_pass) {
    phase('Review')
    // The diff and the plan, and nothing else. Not the implementer's summary, not its list of
    // low-confidence areas, not an instruction about where to look: the value of a second reviewer is
    // that it never saw the reasoning that produced the change, and a shared attention directive
    // correlates the two readings it is there to keep independent. The concerns are returned to the
    // caller instead, where they inform the human without steering the review.
    const reviewPrompt =
      where +
      `Review the diff at \`git diff ${base}..${branch}\` against the plan at ${planPath}. ` +
      `Your FIRST tool call must be that git diff — review the diff itself, not any summary of it.\n\n` +
      `Report everything you find, at any severity; the caller triages. Cite file:line from the diff for ` +
      `each finding. Mark a finding blocking only if it is wrong behavior, a broken contract, or work ` +
      `outside the plan's Goal.\n\n` +
      `Check specifically:\n` +
      `- Does every changed line trace to the Goal or a recorded Decision?\n` +
      `- Does anything land in the plan's Non-goals?\n` +
      `- Does new behavior have a test, and does \`git log ${base}..${branch}\` show it failing first?\n` +
      `- Any comment narrating process rather than explaining code?\n` +
      `\nDo not modify code.`

    // Reviewers run independently and in parallel, and their findings are UNIONed.
    // Measured on this repo's own design docs, with every finding re-checked adversarially: a second
    // reviewer finds much of what the first missed, and the three overlap little. Low overlap is the
    // reason a second reviewer pays; it is also why the union must never be filtered down to
    // what they agree on — agreement would discard most of the real findings.
    const verdicts = (await parallel(
      Array.from({ length: reviewers }, (_, i) => () =>
        tryAgent(reviewPrompt, {
          label: reviewers > 1 ? `review:${phaseLabel}:r${round}:v${i + 1}` : `review:${phaseLabel}:r${round}`,
          phase: 'Review',
          schema: REVIEW_SCHEMA,
          model: models.review,
        })
      )
    )).filter(Boolean)

    // A reviewer that dies is not a reviewer that passed.
    if (verdicts.length < reviewers) {
      return { status: 'agent-error', phaseLabel, round, stage: 'review', reason: `${verdicts.length}/${reviewers} reviewers returned` }
    }

    const reported = [...new Set(verdicts.flatMap(v => v.blocking || []))]
    verdicts.flatMap(v => v.nonblocking || []).forEach(n => nonblockingSeen.add(n))

    // Triage before counting. Measured on this repo's own review output, blind adversarial
    // checking rejected a large share of blocking-graded findings. Closing on the RAW count lets a
    // phantom defect consume a fix round and exhaust the cap on already-correct code, so the
    // arithmetic below runs on confirmed findings only.
    let blocking = reported
    if (reported.length) {
      phase('Triage')
      const triage = await tryAgent(
        where +
        `Check each claimed defect below against the actual code in \`git diff ${base}..${branch}\`. ` +
        `Decide which are real.\n\n${reported.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n` +
        (rejectedSeen.length
          ? `An earlier round already checked these claims and rejected them, with the reason. If one ` +
            `reappears above, it is very likely the same phantom — say so rather than re-deriving it:\n` +
            `${rejectedSeen.map(x => `- ${x}`).join('\n')}\n\n`
          : '') +
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
        triage.rejected.forEach(x => { if (!rejectedSeen.includes(x)) rejectedSeen.push(x) })
        log(`${phaseLabel}: triage rejected ${triage.rejected.length}/${reported.length} blocking findings`)
      }
      phase('Review')
    }

    review = { blocking, blocking_count: blocking.length, reported_count: reported.length }

    // Closure is arithmetic on the counts. The reviewer's prose verdict is deliberately not read:
    // "looks good overall" alongside a listed blocking item is not a pass.
    if (review.blocking_count === 0) {
      return {
        status: 'closed',
        phaseLabel,
        round,
        fixes,
        gateFixes,
        reviewFixes,
        branch,
        depth: resolvedDepth,
        reviewers,
        // Pass this back in as the NEXT phase's baseSha. Without it a multi-phase run reviews every
        // earlier phase again, and phase N's reviewer flags phases 1..N-1 as work outside the Goal.
        headSha: gateHead,
        gates: gates.results,
        nonblocking: [...nonblockingSeen],
        // The rejection record build.md asks for, carried out of the phase rather than left in a log
        // line: it is what stops the same phantom coming back, and what a reader needs to see whether
        // triage was doing its job or waving findings through.
        rejected: rejectedSeen,
        concerns,
      }
    }
  }

  const failures = gates.all_pass ? review.blocking : gates.failures
  const stage = gates.all_pass ? 'review' : 'gates'

  // A gate run that fails without naming what failed cannot be fixed: the Fix agent would get an
  // empty list, edit something arbitrary, and spend a round on a null instruction.
  if (!failures.length) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage, branch, reason: `${stage} reported failure with nothing listed` }
  }

  // Cap on fixes SPENT, not on the round about to start: the Nth fix is allowed to run, and its
  // result is verified on the next trip. Only then is the budget genuinely exhausted.
  if (fixes >= maxRounds) {
    return {
      status: 'cap-exhausted',
      phaseLabel, round, fixes, gateFixes, reviewFixes, stage, branch, depth: resolvedDepth, reviewers,
      unresolved: failures,
      nonblocking: [...nonblockingSeen],
      rejected: rejectedSeen,
      // Which kind of failure consumed the budget changes what the escalation should say: three
      // rounds lost to a red build is not the planning deadlock escalation.md describes.
      exhaustedBy: gateFixes > 0 && reviewFixes === 0 ? 'gates' : reviewFixes > 0 && gateFixes === 0 ? 'review' : 'mixed',
    }
  }

  phase('Fix')
  log(`${phaseLabel}: ${stage} failures (${failures.length}), running fix round ${fixes + 1} of ${maxRounds}`)
  const fixed = await tryAgent(
    where +
    `Fix these ${stage} failures on branch "${branch}". Inspect the diff with ` +
    `\`git diff ${base}..${branch}\`.\n\n${failures.map(f => `- ${f}`).join('\n')}\n\n` +
    `State the root cause of each item ("X is caused by Y") before editing, and change that cause — ` +
    `one at a time, smallest change that addresses it.\n` +
    `If a cause is not obvious, rank 3-5 falsifiable hypotheses and find the observation that ` +
    `discriminates between the top two. Do not anchor on the first theory that fits.\n` +
    `If an item is a correctness bug, write a failing test that reproduces it first, then fix to green.\n` +
    `If an item passes on re-run with no code change it is a flake, not a regression in this diff: do not ` +
    `disable the test, loosen an assertion, add a retry, or raise a timeout to force green. Leave it and ` +
    `report it as a separate concern.\n` +
    `Commit to the same branch, matching the convention in \`git log --oneline -20\`, and name both the ` +
    `phase and the item you fixed.`,
    { label: `fix:${phaseLabel}:r${round}`, phase: 'Fix', model: models.fix }
  )
  // A fix agent that never returned did not fix anything. Spending the round anyway reports an
  // infrastructure failure as a deadlock, which escalation.md tells the reader to treat as a defect
  // in the plan.
  if (!fixed) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage: 'fix', branch, reason: 'the fix agent did not return, so this round changed nothing' }
  }

  fixes++
  if (stage === 'gates') gateFixes++
  else reviewFixes++
  verifyRound++
}

// Reached only if the counters above stopped advancing — the loop's structural bound firing before any
// verdict was returned. That is a defect in this script, not a result about the change, so it is an
// agent-error rather than a cap-exhaustion the caller might try to absorb.
return {
  status: 'agent-error',
  phaseLabel, round: verifyRound, fixes, gateFixes, reviewFixes, branch, depth: resolvedDepth, reviewers,
  stage: 'loop-exit',
  reason: 'the verify loop hit its structural bound without returning a verdict — the fix counter did not advance',
}
