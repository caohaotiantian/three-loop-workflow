export const meta = {
  name: 'review-panel',
  description: 'Adversarial multi-voter review: N fresh reviewers vote in parallel; severe/general counts are the MECHANICAL UNION across voters (no agent in the counting path); returns one aggregated ReviewVerdict',
  phases: [
    { title: 'Panel', detail: 'N fresh reviewers each apply a distinct adversarial angle' },
  ],
}

// Plain JavaScript only — no TypeScript, and none of the wall-clock or randomness APIs the
// workflow runtime forbids (vary voter prompts by index instead of randomizing).
//
// Args:
//   reviewPrompt: string  — the per-voter review task (what to review, doc paths, the
//                           `git diff <baseSha>..<branch>` command, the output schema)
//   voters:       number  — voter count (default 3); an overridable arg, NOT a project constant
//   label:        string  — display-label prefix, e.g. "L1 design" or "Phase 2"
//
// Returns a ReviewVerdict (see references/schemas.md): { severe, general, clarifications,
// verdict, severe_count, general_count }. The orchestrator consumes it exactly like a
// single reviewer's verdict, so round counting and cap → escalation are unchanged: the
// panel runs INSIDE one review round and emits one verdict; the N voters do not each
// consume a round.

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    severe:         { type: 'array', items: { type: 'string' } },
    general:        { type: 'array', items: { type: 'string' } },
    clarifications: { type: 'array', items: { type: 'string' } },
    verdict:        { type: 'string', enum: ['pass', 'needs-fix', 'severe-nonconformance'] },
    severe_count:   { type: 'number' },
    general_count:  { type: 'number' },
  },
  required: ['severe', 'general', 'verdict', 'severe_count', 'general_count'],
}

// Distinct adversarial angles so voters are diverse rather than redundant. Each voter is
// told to try to REFUTE that the artifact is ready, through one lens.
const ANGLES = [
  'SCOPE CREEP / Simplicity First: anything beyond the stated deliverables; speculative abstraction.',
  'UNVERIFIABLE ACCEPTANCE / Goal-Driven Execution: criteria or commands that are not mechanically checkable.',
  'MISSING ALTERNATIVES / Think Before Coding: single-option decisions, silent defaults, unstated assumptions.',
  'SURGICAL CHANGES: drive-by edits, process-narration comments, contract / cross-file drift.',
  'CORRECTNESS: bugs, contradictions, broken references, off-by-one, dead or unreachable logic.',
]

// Harness arg normalization (see l3-phase.js — load-bearing, do NOT remove as "dead"): `args` may be
// delivered as a JSON STRING rather than a parsed object; parse + validate so a malformed call lands on
// the descriptive throw below instead of a cryptic destructure crash. Tolerant of an object OR a JSON
// string. See references/multi-voter-review.md "How to invoke".
let inputs
try { inputs = (typeof args === 'string') ? JSON.parse(args) : args } catch (e) { inputs = null }
if (!inputs || typeof inputs !== 'object' || !inputs.reviewPrompt) {
  throw new Error('review-panel.js: args missing or has no reviewPrompt — pass args as an object (or JSON string) per references/multi-voter-review.md. A thrown arg error means the invocation is wrong, not that the Workflow runner is unavailable.')
}
const { reviewPrompt, voters = 3, label = 'review' } = inputs
const N = Math.max(1, Math.min(voters, ANGLES.length))

phase('Panel')
log(`${label}: adversarial panel of ${N} fresh reviewers`)

const verdicts = (await parallel(
  Array.from({ length: N }, (_, i) => () => agent(
    `${reviewPrompt}\n\n[Adversarial angle for this voter — try to REFUTE that the artifact is ready] ${ANGLES[i]}\n\nReturn a ReviewVerdict.`,
    { label: `${label}:voter${i + 1}`, phase: 'Panel', schema: REVIEW_SCHEMA }
  ))
)).filter(Boolean)

// ── MECHANICAL UNION (no agent in the counting path) ─────────────────────────
// An issue is severe for the round if ANY voter marks it severe; likewise general. The
// counts fed to the termination check are the sizes of the unioned sets. `uniq` removes
// only byte-identical duplicates for readability — it never lowers a count below the true
// number of distinct findings, and never demotes a severe to general. Because both counts
// are unions, panel mode makes BOTH termination fields strictly harder: it can only
// strengthen the gate, never relax it.
const uniq = (arr) => Array.from(new Set(arr))
const severe = uniq(verdicts.flatMap(v => v.severe || []))
const general = uniq(verdicts.flatMap(v => v.general || []))
const clarifications = uniq(verdicts.flatMap(v => v.clarifications || []))

// A clean verdict requires a surviving quorum (strict majority of requested voters): a clean result
// from a sub-quorum panel is an unproven negative, so the standalone path fails closed (it has no
// round machine) — the caller re-runs the panel rather than advancing on degraded coverage. Findings
// are reported regardless of survivor count; 0 survivors is the degenerate sub-case.
const quorum = Math.floor(N / 2) + 1
if (verdicts.length < N) log(`${label}: ${verdicts.length}/${N} voters survived${verdicts.length < quorum ? ` (<${quorum} quorum)` : ''}`)
if (severe.length === 0 && general.length === 0 && verdicts.length < quorum) {
  const msg = verdicts.length === 0
    ? 'panel: all voters failed'
    : `panel: only ${verdicts.length}/${N} voters survived — below the ${quorum}-quorum needed to confirm a clean verdict; re-run the panel`
  return { severe: [msg], general: [], clarifications: [], verdict: 'severe-nonconformance', severe_count: 1, general_count: 0 }
}

return {
  severe,
  general,
  clarifications,
  severe_count: severe.length,
  general_count: general.length,
  verdict: severe.length > 0 ? 'severe-nonconformance' : (general.length > 0 ? 'needs-fix' : 'pass'),
}
