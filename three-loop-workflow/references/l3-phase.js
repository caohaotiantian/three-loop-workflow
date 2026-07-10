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
    blocked:  { type: 'boolean' },                      // E-i: dev cannot complete (missing context / too hard)
    concerns: { type: 'array', items: { type: 'string' } }, // E-i: low-confidence areas to steer the reviewer
  },
  required: ['branch', 'baseSha', 'summary', 'conflict'],
}

const MAX_ROUNDS = 3
// reviewMode: 'single' (default) | 'panel'. Panel mode runs an adversarial multi-voter
// review (see references/multi-voter-review.md) INSIDE one review round — the N voters do
// not each consume a round. panelVoters defaults to 3 (an overridable arg, not a constant).
// Harness arg normalization (load-bearing — do NOT remove as "dead"): some Workflow runtimes deliver
// `args` to the script as a JSON STRING (verbatim tool-call pass-through), not a parsed object. Parse +
// validate so EVERY malformed-args path lands on the descriptive throw below — never a cryptic
// `phaseLabel.replace`/destructure crash that misreads as "args delivery is broken" (it is not).
// Tolerant of an object OR a JSON string. See references/loop-3-workflow.md "Invocation" (Arg delivery).
let inputs
try { inputs = (typeof args === 'string') ? JSON.parse(args) : args } catch (e) { inputs = null }
if (!inputs || typeof inputs !== 'object') {
  throw new Error('l3-phase.js: args missing or not a valid object / JSON string — pass {phaseLabel, phaseSpec, designDocPath, implDocPath} per references/loop-3-workflow.md "Invocation". A thrown arg error means the invocation is wrong, NOT that the Workflow runner is unavailable; fix the args, do not fall back to prose.')
}
const { phaseLabel, phaseSpec, designDocPath, implDocPath, reviewMode = 'single', panelVoters = 3, models = {} } = inputs
if (!phaseLabel || !phaseSpec || !designDocPath || !implDocPath) {
  throw new Error('l3-phase.js: missing required arg(s) phaseLabel/phaseSpec/designDocPath/implDocPath — pass args per references/loop-3-workflow.md "Invocation".')
}

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
  'SCOPE CREEP / Simplicity First: anything beyond the stated deliverables; speculative abstraction.',
  'UNVERIFIABLE ACCEPTANCE / Goal-Driven Execution: criteria or commands that are not mechanically checkable.',
  'MISSING ALTERNATIVES / Think Before Coding: single-option decisions, silent defaults, unstated assumptions.',
  'SURGICAL CHANGES: drive-by edits, process-narration comments, contract / cross-file drift.',
  'CORRECTNESS: bugs, contradictions, broken references, off-by-one, dead or unreachable logic.',
]
async function panelReview(basePrompt, round) {
  const n = Math.max(1, Math.min(panelVoters, PANEL_ANGLES.length))
  const verdicts = (await parallel(
    Array.from({ length: n }, (_, i) => () => agent(
      `${basePrompt}\n\n[Adversarial angle — try to REFUTE that the change is ready] ${PANEL_ANGLES[i]}`,
      { label: `review:${phaseLabel}:r${round}:voter${i + 1}`, phase: 'Review', schema: REVIEW_SCHEMA, model: models.review }
    ))
  )).filter(Boolean)
  const uniq = (arr) => Array.from(new Set(arr))
  const severe = uniq(verdicts.flatMap(v => v.severe || []))
  const general = uniq(verdicts.flatMap(v => v.general || []))
  const clarifications = uniq(verdicts.flatMap(v => v.clarifications || []))
  // A soft-failed voter is dropped (no retry): the union over fewer voters can narrow but never weaken
  // the gate vs a single reviewer. But a CLEAN verdict needs a surviving quorum (strict majority): a
  // clean result from a sub-quorum panel is an unproven negative, so it must NOT pass — return null →
  // the caller emits agent-error and the main agent re-runs the panel. Findings (severe/general) are
  // reported regardless of survivor count; 0 survivors is the degenerate sub-case.
  const quorum = Math.floor(n / 2) + 1
  if (verdicts.length < n) log(`${phaseLabel}: panel r${round} — ${verdicts.length}/${n} voters survived${verdicts.length < quorum ? ` (<${quorum} quorum)` : ''}`)
  if (severe.length === 0 && general.length === 0 && verdicts.length < quorum) return null
  return {
    severe, general, clarifications,
    severe_count: severe.length,
    general_count: general.length,
    verdict: severe.length > 0 ? 'severe-nonconformance' : (general.length > 0 ? 'needs-fix' : 'pass'),
  }
}

// The two fix prompts below carry the `diagnosis_method` clause (loop-3-development.md fix corner): when the
// cause is not obvious, rank 3-5 falsifiable hypotheses and seek discriminating evidence before editing. The
// clause is in the prompt prose; this comment carries the paired token for the consistency gate. They also carry the `test_integrity` clause (loop-3-development.md fix corner): a non-deterministic (flaky) failure is escalated as a flake, not masked; this comment carries the paired token for the consistency gate.

// ── Step 1: Dev ──────────────────────────────────────────────
phase('Dev')
log(`${phaseLabel}: running dev subagent`)

function devPrompt(extra) {
  return `You are the dev subagent for ${phaseLabel}. FIRST, capture the diff base: run ` +
    '`git rev-parse HEAD` BEFORE making any edit and return it as baseSha. Then, BEFORE editing, create and ' +
    `switch to a branch named "${phaseLabel.replace(/\s+/g, '').toLowerCase()}-dev-r1" off that baseSha ` +
    '(`git checkout -b <name>`) so the integration branch stays at baseSha, then implement the ' +
    `tasks below in the main working tree (no worktree isolation), committing to that branch. Return DevResult with the ` +
    `branch name, baseSha, a summary; conflict=true if the design doc conflicts with any task; ` +
    `blocked=true with concerns[] if you cannot complete it (missing context or too hard — do NOT ` +
    `fabricate success); or concerns[] (blocked=false) to flag low-confidence areas for the reviewer. ` +
    // C1 (Wave 2) — RETAINED verbatim; this TDD watch-it-fail directive must NOT be lost in the rewrite:
    `For each new behavior, write its test FIRST and run it to confirm it FAILS for the right reason ` +
    `(feature missing, not a typo/import error) before writing code; note in your summary that you watched each new test fail. ` +
    // E-ii (Wave 3) — pre-handoff self-review pointer (folded into the dev prompt here):
    `Before reporting, self-review your diff against SKILL.md §0.2 (overcomplication) and §0.3 (trace test, ` +
    `no process-narration comments) and confirm each assigned checkbox is done; this self-review does NOT ` +
    `replace the fresh review corner — both run.` +
    (extra ? `\n\n${extra}` : '') +
    `\n\nDesign doc: ${designDocPath}\nImpl doc: ${implDocPath}\n\nPhase tasks:\n${phaseSpec}`
}

let devResult = await tryAgent(devPrompt(''), { label: `dev:${phaseLabel}`, phase: 'Dev', schema: DEV_SCHEMA, model: models.dev })

if (!devResult) return { status: 'agent-error', phaseLabel, round: 0, stage: 'dev', reason: 'dev agent failed after retry' }
if (devResult.conflict) return { status: 'design-conflict', phaseLabel, round: 0, branch: devResult.branch }

// E-i: a BLOCKED dev is re-dispatched AT MOST ONCE (its concerns become added context), then escalated.
// The dev step has no round counter, so this one-retry bound is what stops it becoming an uncounted retry.
if (devResult.blocked) {
  const blockers = (devResult.concerns || []).join('; ')
  log(`${phaseLabel}: dev BLOCKED (${blockers}); re-dispatching once with added context`)
  const retry = await tryAgent(
    devPrompt(`You previously reported BLOCKED on: ${blockers}. Treat this as added context and try once more; if still blocked, return blocked=true again.`),
    { label: `dev:${phaseLabel}:re-dispatch`, phase: 'Dev', schema: DEV_SCHEMA, model: models.dev }
  )
  if (!retry) return { status: 'agent-error', phaseLabel, round: 0, stage: 'dev', reason: 'dev re-dispatch failed after retry' }
  if (retry.conflict) return { status: 'design-conflict', phaseLabel, round: 0, branch: retry.branch }
  if (retry.blocked) return { status: 'dev-escalation', phaseLabel, round: 0, stage: 'dev', concerns: (retry.concerns && retry.concerns.length) ? retry.concerns : (devResult.concerns || []) }
  devResult = retry
}

if (!devResult.branch) return { status: 'agent-error', phaseLabel, round: 0, stage: 'dev', reason: 'dev agent did not return branch name' }
let devBranch = devResult.branch
const baseSha = devResult.baseSha   // diff base for the review/accept fresh-eyes audit
const devConcerns = (devResult.concerns || []).filter(Boolean)   // E-i: steer the reviewer

// ── Review loop ───────────────────────────────────────────────
// `round` starts at 1 and increments on every fix cycle.
// Termination (L3-only relaxation, see references/schemas.md): a Phase closes on a
// single round when the first review is fully clean AND no fix was applied
// (`!fixApplied && general_count === 0`); the moment any fix lands, the standard
// two-generation rule re-engages (`round > 1 && priorGeneralCount === 0`). This relaxes
// only the clean-first-round tax for L3; L1/L2 keep strict two-generation.
// RESUMABLE via the Workflow runtime journal: within a session, resume (the Workflow tool's
// resumeFromRunId, or `p` in /workflows) and completed corners return cached results (no re-dispatch,
// no duplicate commits) — the script stays deterministic (no Date.now/Math.random) so replay is exact.
// A cross-session restart begins fresh; only then delete the round-stable <phase>-dev-r1 branch before
// relaunch. See references/loop-3-workflow.md "Resumption".
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
    `is a severe Goal-Driven Execution issue.` +
    (devConcerns.length ? ` The implementer flagged low confidence in: ${devConcerns.join('; ')} — scrutinize these areas first.` : '') +
    ` Calibration: grade by actual severity. A genuine blocker is severe; a real but non-blocking defect is general; an advisory/cosmetic observation is a clarification (note-only). do not inflate a genuinely-misclassified should-fix item to severe — inflation burns the shared round budget and forces false escalations. This sharpens accuracy; it never lowers a real blocker, and the panel stays ADD-only.` +
    ` Ground every finding: cite file:line (or section) from the diff/artifact; a pass must name at least one section read in full — verify by reading the diff, not the summary.`
  const review = reviewMode === 'panel'
    ? await panelReview(reviewPrompt, round)
    : await tryAgent(reviewPrompt, { label: `review:${phaseLabel}:r${round}`, phase: 'Review', schema: REVIEW_SCHEMA, model: models.review })

  if (!review) return { status: 'agent-error', phaseLabel, round, stage: 'review' }

  const noIssues = review.severe_count === 0 && review.general_count === 0
  const reviewPasses = review.severe_count === 0 &&
    ((!fixApplied && review.general_count === 0) || (round > 1 && priorGeneralCount === 0))
  priorGeneralCount = review.general_count

  if (reviewPasses) break  // exit review loop, enter accept loop

  round++
  if (round > MAX_ROUNDS) return { status: 'cap-exhausted', phaseLabel, round: MAX_ROUNDS, stage: 'review' }

  if (!noIssues) {
    // Real issues remain — run a fix. This sets fixApplied, re-engaging two-generation
    // (a fix can introduce a new defect, so a confirming clean round is then required).
    fixApplied = true
    log(`${phaseLabel}: review issues remain (severe=${review.severe_count} general=${review.general_count}), running fix round ${round}`)
    phase('Fix')
    await tryAgent(
      `You are the fix subagent for ${phaseLabel} review round ${round}. ` +
      `Before editing, state the root cause of each item ('X is caused by Y'); make the smallest ` +
      `change that addresses the cause, not the symptom; one cause at a time. ` +
      `If the cause is not obvious, generate 3-5 ranked falsifiable hypotheses and seek discriminating ` +
      `evidence before editing — do not anchor on the first plausible theory. ` +
      `If a failing item is a correctness/behavior bug, write a failing test that reproduces it before ` +
      `fixing (red→green); a style/scope/comment finding needs no test. ` +
      `If a failing item is NON-DETERMINISTIC (it passes on re-run with no code change) it is a flake, not a regression in this diff: do NOT mask it — no disabling/skipping the test, loosening an assertion, blind retry, or timeout bump to force green; report the flake and escalate it as a separate concern. ` +
      `Fix the following review issues on branch "${devBranch}" ` +
      `(inspect the cumulative diff with \`git diff ${baseSha}..${devBranch}\`). ` +
      `Surgical Changes only — commit fixes to the same branch.\n\nSevere: ${review.severe.join('; ')}\nGeneral: ${review.general.join('; ')}`,
      { label: `fix:review:${phaseLabel}:r${round}`, phase: 'Fix', model: models.fix }
    )
    phase('Review')
  } else {
    // Clean round but two-generation not yet satisfied (a prior fix's confirming round):
    // do NOT spawn a fix — just re-review to obtain the confirming generation.
    log(`${phaseLabel}: clean round; running confirming review round ${round}`)
  }
}

// ── Accept loop ───────────────────────────────────────────────
// Accept failures route back to ACCEPT, not review: the review already passed, so a failure
// here is a code/test problem, not a code-quality one.
// `acceptRound` deliberately SHARES the review cap pool (it starts at `round`, not 1). A separate
// accept budget is intentionally NOT given: acceptFix commits are code the fresh-review gate never
// sees, so widening accept's budget would multiply review-ungated churn to buy back a rare edge case
// (a Phase that needed a review fix has no accept-fix slack). A Phase that exhausts the shared budget
// escalates by design rather than grinding out extra unreviewed fix rounds.
phase('Accept')
let acceptRound = round

while (acceptRound <= MAX_ROUNDS) {
  log(`${phaseLabel}: accept round ${acceptRound}/${MAX_ROUNDS}`)

  const accept = await tryAgent(
    `You are the accept subagent for ${phaseLabel}. The dev branch is "${devBranch}" (diff base ${baseSha}; ` +
    `inspect the changes with \`git diff ${baseSha}..${devBranch}\`). ` +
    `Run every ACCEPT-CMD listed in impl doc ${implDocPath} and return AcceptVerdict.`,
    { label: `accept:${phaseLabel}:r${acceptRound}`, phase: 'Accept', schema: ACCEPT_SCHEMA, model: models.accept }
  )

  if (!accept) return { status: 'agent-error', phaseLabel, round: acceptRound, stage: 'accept' }
  if (accept.all_pass) return { status: 'closed', phaseLabel, round: acceptRound, branch: devBranch }

  acceptRound++
  if (acceptRound > MAX_ROUNDS) return { status: 'cap-exhausted', phaseLabel, round: MAX_ROUNDS, stage: 'accept' }
  log(`${phaseLabel}: accept failures: ${accept.failures.join('; ')}, running acceptFix round ${acceptRound}`)
  phase('Fix')
  await tryAgent(
    `You are the fix subagent for ${phaseLabel} accept round ${acceptRound}. ` +
    `Before editing, state the root cause of each item ('X is caused by Y'); make the smallest ` +
    `change that addresses the cause, not the symptom; one cause at a time. ` +
    `If the cause is not obvious, generate 3-5 ranked falsifiable hypotheses and seek discriminating ` +
    `evidence before editing — do not anchor on the first plausible theory. ` +
    `If a failing item is a correctness/behavior bug, write a failing test that reproduces it before ` +
    `fixing (red→green), unless the failing item is itself the reproducing test; a style/scope/comment ` +
    `finding needs no test. ` +
    `If a failing item is NON-DETERMINISTIC (it passes on re-run with no code change) it is a flake, not a regression in this diff: do NOT mask it — no disabling/skipping the test, loosening an assertion, blind retry, or timeout bump to force green; report the flake and escalate it as a separate concern. ` +
    `Fix the following accept failures on branch "${devBranch}" ` +
    `(diff base ${baseSha}). Commit fixes to the same branch.\n\nFailures: ${accept.failures.join('; ')}`,
    { label: `acceptFix:${phaseLabel}:r${acceptRound}`, phase: 'Fix', model: models.fix }
  )
  phase('Accept')
}

return { status: 'cap-exhausted', phaseLabel, round: MAX_ROUNDS, stage: 'accept-loop-exit' }
