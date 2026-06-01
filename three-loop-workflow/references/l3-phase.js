export const meta = {
  name: 'l3-phase',
  description: 'Three-loop-workflow L3 per-Phase runner: dev → review-loop → accept-loop with round cap 3',
  phases: [
    { title: 'Dev', detail: 'dev subagent implements phase tasks' },
    { title: 'Review', detail: 'review subagent audits diff; two-generation termination' },
    { title: 'Accept', detail: 'accept subagent runs all ACCEPT-CMDs' },
  ],
}

// Required args (see docs/design/2026-06-01-f3-f5-workflow-l3-engine.md §4 Decision 2):
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
    summary:  { type: 'string' },
    conflict: { type: 'boolean' },
  },
  required: ['branch', 'summary', 'conflict'],
}

const MAX_ROUNDS = 3
const { phaseLabel, phaseSpec, designDocPath, implDocPath } = args

// ── Step 1: Dev ──────────────────────────────────────────────
phase('Dev')
log(`${phaseLabel}: running dev subagent`)

const devResult = await agent(
  `You are the dev subagent for ${phaseLabel}. Implement the tasks below in the current worktree. ` +
  `Commit your changes to a branch named "${phaseLabel.replace(/\s+/g, '').toLowerCase()}-dev-r1" ` +
  `and return DevResult with the branch name, a summary, and conflict=true if the design doc ` +
  `conflicts with any task.\n\nDesign doc: ${designDocPath}\nImpl doc: ${implDocPath}\n\nPhase tasks:\n${phaseSpec}`,
  { label: `dev:${phaseLabel}`, phase: 'Dev', agentType: 'feature-dev:feature-dev',
    schema: DEV_SCHEMA }
)

if (!devResult) return { status: 'cap-exhausted', phaseLabel, round: 0, reason: 'dev agent returned null' }
if (devResult.conflict) return { status: 'design-conflict', phaseLabel, round: 0, branch: devResult.branch }

// Explicit null-branch guard (defense-in-depth; schema required:[] is primary gate)
if (!devResult.branch) return { status: 'cap-exhausted', phaseLabel, round: 0, reason: 'dev agent did not return branch name' }
let devBranch = devResult.branch

// ── Review loop ───────────────────────────────────────────────
// `round` starts at 1 and increments on every fix cycle.
// Two-generation termination: `round > 1 && priorGeneralCount === 0`
// This formula matches references/schemas.md ReviewVerdict loop-closure check.
phase('Review')
let round = 1
let priorGeneralCount = Infinity

while (round <= MAX_ROUNDS) {
  log(`${phaseLabel}: review round ${round}/${MAX_ROUNDS} (prior generals: ${priorGeneralCount === Infinity ? 'n/a' : priorGeneralCount})`)

  const review = await agent(
    `You are the review subagent for ${phaseLabel} round ${round}. Review the diff on branch "${devBranch}" ` +
    `against design doc ${designDocPath} and impl doc ${implDocPath}. ` +
    `Return a ReviewVerdict (see references/schemas.md).`,
    { label: `review:${phaseLabel}:r${round}`, phase: 'Review',
      agentType: 'feature-dev:code-reviewer', schema: REVIEW_SCHEMA }
  )

  if (!review) return { status: 'cap-exhausted', phaseLabel, round, stage: 'review-null-return' }

  const reviewPasses = review.severe_count === 0 && round > 1 && priorGeneralCount === 0
  priorGeneralCount = review.general_count

  if (reviewPasses) break  // exit review loop, enter accept loop

  round++
  if (round > MAX_ROUNDS) return { status: 'cap-exhausted', phaseLabel, round, stage: 'review' }
  log(`${phaseLabel}: review issues remain (severe=${review.severe_count} general=${review.general_count}), running fix round ${round}`)
  phase('Fix')
  await agent(
    `You are the fix subagent for ${phaseLabel} review round ${round}. Fix the following review issues on branch "${devBranch}". ` +
    `Surgical Changes only — commit fixes to the same branch.\n\nSevere: ${review.severe.join('; ')}\nGeneral: ${review.general.join('; ')}`,
    { label: `fix:review:${phaseLabel}:r${round}`, phase: 'Fix',
      agentType: 'feature-dev:feature-dev' }
  )
  phase('Review')
}

// ── Accept loop ───────────────────────────────────────────────
// Accept failures route back to ACCEPT (not review) per the four-corner diagram.
// The `acceptRound` counter shares the same cap pool as `round`.
phase('Accept')
let acceptRound = round

while (acceptRound <= MAX_ROUNDS) {
  log(`${phaseLabel}: accept round ${acceptRound}/${MAX_ROUNDS}`)

  const accept = await agent(
    `You are the accept subagent for ${phaseLabel}. The dev branch is "${devBranch}". ` +
    `Run every ACCEPT-CMD listed in impl doc ${implDocPath} and return AcceptVerdict.`,
    { label: `accept:${phaseLabel}:r${acceptRound}`, phase: 'Accept', schema: ACCEPT_SCHEMA }
  )

  if (!accept) return { status: 'cap-exhausted', phaseLabel, round: acceptRound, stage: 'accept-null-return' }
  if (accept.all_pass) return { status: 'closed', phaseLabel, round: acceptRound, branch: devBranch }

  acceptRound++
  if (acceptRound > MAX_ROUNDS) return { status: 'cap-exhausted', phaseLabel, round: acceptRound, stage: 'accept' }
  log(`${phaseLabel}: accept failures: ${accept.failures.join('; ')}, running acceptFix round ${acceptRound}`)
  phase('Fix')
  await agent(
    `You are the fix subagent for ${phaseLabel} accept round ${acceptRound}. Fix the following accept failures on branch "${devBranch}". ` +
    `Commit fixes to the same branch.\n\nFailures: ${accept.failures.join('; ')}`,
    { label: `acceptFix:${phaseLabel}:r${acceptRound}`, phase: 'Fix',
      agentType: 'feature-dev:feature-dev' }
  )
  phase('Accept')
}

return { status: 'cap-exhausted', phaseLabel, round: acceptRound, stage: 'accept-loop-exit' }
