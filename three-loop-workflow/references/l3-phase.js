export const meta = {
  name: 'l3-phase',
  description: 'Three-loop-workflow L3 per-Phase runner: dev → review-loop → accept-loop with round cap 3',
  phases: [
    { title: 'Dev', detail: 'dev subagent implements phase tasks' },
    { title: 'Review', detail: 'review subagent audits diff; two-generation termination' },
    { title: 'Accept', detail: 'accept subagent runs all ACCEPT-CMDs' },
  ],
}

// ── ROLE-ISOLATION INVARIANT (load-bearing) ──────────────────────────────────
// Every agent() call below MUST spawn a fresh subagent. dev / review / accept / fix
// are isolated roles; no subagent may carry context from a prior role. A future
// refactor that reuses an agent handle across roles to save tokens would silently
// break self-review prevention — the skill's central safety property. Do not collapse
// roles. See the role-isolation rule in SKILL.md.

// Required args:
//   phaseLabel:    string  — e.g. "Phase 1"
//   phaseSpec:     string  — full Phase task list from the impl doc
//   designDocPath: string  — path to docs/design/<slug>.md
//   implDocPath:   string  — path to docs/implementation/<slug>.md

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    severe:       { type: 'array', items: { type: 'string' } },
    general:      { type: 'array', items: { type: 'string' } },
    clarifications: { type: 'array', items: { type: 'string' } },
    verdict:      { type: 'string', enum: ['pass', 'needs-fix', 'severe-nonconformance'] },
    severe_count: { type: 'number' },
    general_count:{ type: 'number' },
  },
  required: ['severe', 'general', 'verdict', 'severe_count', 'general_count'],
}

const ACCEPT_SCHEMA = {
  type: 'object',
  properties: {
    all_pass: { type: 'boolean' },
    failures: { type: 'array', items: { type: 'string' } },
  },
  required: ['all_pass', 'failures'],
}

const DEV_SCHEMA = {
  type: 'object',
  properties: {
    branch:   { type: 'string' },
    baseSha:  { type: 'string' },
    summary:  { type: 'string' },
    conflict: { type: 'boolean' },
  },
  required: ['branch', 'baseSha', 'summary', 'conflict'],
}

const MAX_ROUNDS = 3
// reviewMode: 'single' (default) | 'panel'. Panel mode runs an adversarial multi-voter
// review (see references/multi-voter-review.md) INSIDE one review round — the N voters do
// not each consume a round. panelVoters defaults to 3 (an overridable arg, not a constant).
const { phaseLabel, phaseSpec, designDocPath, implDocPath, reviewMode = 'single', panelVoters = 3 } = args

// Retry-once wrapper. A transient agent failure (thrown error or null/undefined
// return) is retried once; a second failure returns null so the caller can emit
// 'agent-error' (infrastructure failure) rather than 'cap-exhausted' (a genuine
// review deadlock that would wrongly trigger a deadlock escalation report).
async function tryAgent(prompt, opts) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await agent(prompt, opts)
      if (r) return r
    } catch (e) {
      log(`${opts.label}: attempt ${attempt} failed: ${e && e.message ? e.message : e}`)
    }
  }
  return null
}

// Adversarial multi-voter review (reviewMode === 'panel'). N fresh voters review the same
// diff through distinct adversarial angles, in parallel, within ONE review round. The
// severe/general counts are the MECHANICAL UNION across voters (computed here, no agent in
// the counting path): an issue is severe if ANY voter says so. Union strengthens both
// termination fields — panel mode can only make the gate stricter. Returns a verdict shaped
// like REVIEW_SCHEMA, or null if every voter failed. See references/multi-voter-review.md.
const PANEL_ANGLES = [
  'SCOPE CREEP / Simplicity First: anything beyond the stated deliverables.',
  'UNVERIFIABLE ACCEPTANCE / Goal-Driven Execution: criteria not mechanically checkable.',
  'MISSING ALTERNATIVES / Think Before Coding: single-option decisions, silent defaults.',
  'SURGICAL CHANGES: drive-by edits, process-narration comments, contract drift.',
  'CORRECTNESS: bugs, contradictions, broken references, off-by-one, dead logic.',
]
async function panelReview(basePrompt, round) {
  const n = Math.max(1, Math.min(panelVoters, PANEL_ANGLES.length))
  const verdicts = (await parallel(
    Array.from({ length: n }, (_, i) => () => agent(
      `${basePrompt}\n\n[Adversarial angle — try to REFUTE that the change is ready] ${PANEL_ANGLES[i]}`,
      { label: `review:${phaseLabel}:r${round}:voter${i + 1}`, phase: 'Review', schema: REVIEW_SCHEMA }
    ))
  )).filter(Boolean)
  if (verdicts.length === 0) return null
  // A soft-failed voter is dropped (no retry): the union is over fewer voters, which can
  // narrow but never weaken the gate vs a clean single reviewer. Surface it rather than hide it.
  if (verdicts.length < n) log(`${phaseLabel}: panel r${round} — ${n - verdicts.length}/${n} voters failed; union over ${verdicts.length} (narrower, never weaker)`)
  const uniq = (arr) => Array.from(new Set(arr))
  const severe = uniq(verdicts.flatMap(v => v.severe || []))
  const general = uniq(verdicts.flatMap(v => v.general || []))
  return {
    severe, general,
    severe_count: severe.length,
    general_count: general.length,
    verdict: severe.length > 0 ? 'severe-nonconformance' : (general.length > 0 ? 'needs-fix' : 'pass'),
  }
}

// ── Step 1: Dev ──────────────────────────────────────────────
phase('Dev')
log(`${phaseLabel}: running dev subagent`)

const devResult = await tryAgent(
  `You are the dev subagent for ${phaseLabel}. FIRST, capture the diff base: run ` +
  '`git rev-parse HEAD` BEFORE making any edit and return it as baseSha. Then implement the ' +
  `tasks below in the main working tree (no worktree isolation). Commit your changes to a branch ` +
  `named "${phaseLabel.replace(/\s+/g, '').toLowerCase()}-dev-r1" and return DevResult with the ` +
  `branch name, baseSha, a summary, and conflict=true if the design doc conflicts with any task.` +
  ` For each new behavior, write its test FIRST and run it to confirm it FAILS for the right reason ` +
  `(feature missing, not a typo/import error) before writing code; note in your summary that you ` +
  `watched each new test fail.` +
  `\n\nDesign doc: ${designDocPath}\nImpl doc: ${implDocPath}\n\nPhase tasks:\n${phaseSpec}`,
  { label: `dev:${phaseLabel}`, phase: 'Dev', schema: DEV_SCHEMA }
)

if (!devResult) return { status: 'agent-error', phaseLabel, round: 0, stage: 'dev', reason: 'dev agent failed after retry' }
if (devResult.conflict) return { status: 'design-conflict', phaseLabel, round: 0, branch: devResult.branch }

// Explicit null-branch guard (defense-in-depth; schema required:[] is primary gate)
if (!devResult.branch) return { status: 'agent-error', phaseLabel, round: 0, stage: 'dev', reason: 'dev agent did not return branch name' }
let devBranch = devResult.branch
const baseSha = devResult.baseSha   // diff base for the review/accept fresh-eyes audit

// ── Review loop ───────────────────────────────────────────────
// `round` starts at 1 and increments on every fix cycle.
// Termination (L3-only relaxation, see references/schemas.md): a Phase closes on a
// single round when the first review is fully clean AND no fix was applied
// (`!fixApplied && general_count === 0`); the moment any fix lands, the standard
// two-generation rule re-engages (`round > 1 && priorGeneralCount === 0`). This relaxes
// only the clean-first-round tax for L3; L1/L2 keep strict two-generation.
phase('Review')
let round = 1
let priorGeneralCount = Infinity
let fixApplied = false

while (round <= MAX_ROUNDS) {
  log(`${phaseLabel}: review round ${round}/${MAX_ROUNDS} (prior generals: ${priorGeneralCount === Infinity ? 'n/a' : priorGeneralCount})`)

  const reviewPrompt =
    `You are the review subagent for ${phaseLabel} round ${round}. Your FIRST tool call MUST be ` +
    `\`git diff ${baseSha}..${devBranch}\` to see exactly the changes under review (and ` +
    `\`git log ${baseSha}..${devBranch}\` to check commit conventions). Review that diff ` +
    `against design doc ${designDocPath} and impl doc ${implDocPath}. ` +
    `Return a ReviewVerdict (see references/schemas.md). ` +
    `Trip-wires (do not rationalize past these): read the diff, not the dev summary — the summary is not evidence; an unresolved general issue blocks closure.` +
    ` For new behavior, confirm a corresponding new test precedes/accompanies the production change ` +
    `(use the git log you already ran) — a body of new production code with no corresponding new test ` +
    `is a severe Goal-Driven Execution issue.`
  const review = reviewMode === 'panel'
    ? await panelReview(reviewPrompt, round)
    : await tryAgent(reviewPrompt, { label: `review:${phaseLabel}:r${round}`, phase: 'Review', schema: REVIEW_SCHEMA })

  if (!review) return { status: 'agent-error', phaseLabel, round, stage: 'review' }

  const noIssues = review.severe_count === 0 && review.general_count === 0
  const reviewPasses = review.severe_count === 0 &&
    ((!fixApplied && review.general_count === 0) || (round > 1 && priorGeneralCount === 0))
  priorGeneralCount = review.general_count

  if (reviewPasses) break  // exit review loop, enter accept loop

  round++
  if (round > MAX_ROUNDS) return { status: 'cap-exhausted', phaseLabel, round, stage: 'review' }

  if (!noIssues) {
    // Real issues remain — run a fix. This sets fixApplied, re-engaging two-generation
    // (a fix can introduce a new defect, so a confirming clean round is then required).
    fixApplied = true
    log(`${phaseLabel}: review issues remain (severe=${review.severe_count} general=${review.general_count}), running fix round ${round}`)
    phase('Fix')
    await tryAgent(
      `You are the fix subagent for ${phaseLabel} review round ${round}. Fix the following review issues on branch "${devBranch}" ` +
      `(inspect the cumulative diff with \`git diff ${baseSha}..${devBranch}\`). ` +
      `Surgical Changes only — commit fixes to the same branch.\n\nSevere: ${review.severe.join('; ')}\nGeneral: ${review.general.join('; ')}`,
      { label: `fix:review:${phaseLabel}:r${round}`, phase: 'Fix' }
    )
    phase('Review')
  } else {
    // Clean round but two-generation not yet satisfied (a prior fix's confirming round):
    // do NOT spawn a fix — just re-review to obtain the confirming generation.
    log(`${phaseLabel}: clean round; running confirming review round ${round}`)
  }
}

// ── Accept loop ───────────────────────────────────────────────
// Accept failures route back to ACCEPT, not review.
// The `acceptRound` counter shares the same cap pool as `round`.
phase('Accept')
let acceptRound = round

while (acceptRound <= MAX_ROUNDS) {
  log(`${phaseLabel}: accept round ${acceptRound}/${MAX_ROUNDS}`)

  const accept = await tryAgent(
    `You are the accept subagent for ${phaseLabel}. The dev branch is "${devBranch}" (diff base ${baseSha}; ` +
    `inspect the changes with \`git diff ${baseSha}..${devBranch}\`). ` +
    `Run every ACCEPT-CMD listed in impl doc ${implDocPath} and return AcceptVerdict.`,
    { label: `accept:${phaseLabel}:r${acceptRound}`, phase: 'Accept', schema: ACCEPT_SCHEMA }
  )

  if (!accept) return { status: 'agent-error', phaseLabel, round: acceptRound, stage: 'accept' }
  if (accept.all_pass) return { status: 'closed', phaseLabel, round: acceptRound, branch: devBranch }

  acceptRound++
  if (acceptRound > MAX_ROUNDS) return { status: 'cap-exhausted', phaseLabel, round: acceptRound, stage: 'accept' }
  log(`${phaseLabel}: accept failures: ${accept.failures.join('; ')}, running acceptFix round ${acceptRound}`)
  phase('Fix')
  await tryAgent(
    `You are the fix subagent for ${phaseLabel} accept round ${acceptRound}. Fix the following accept failures on branch "${devBranch}" ` +
    `(diff base ${baseSha}). Commit fixes to the same branch.\n\nFailures: ${accept.failures.join('; ')}`,
    { label: `acceptFix:${phaseLabel}:r${acceptRound}`, phase: 'Fix' }
  )
  phase('Accept')
}

return { status: 'cap-exhausted', phaseLabel, round: acceptRound, stage: 'accept-loop-exit' }
