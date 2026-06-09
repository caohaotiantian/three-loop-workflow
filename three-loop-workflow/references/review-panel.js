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

const { reviewPrompt, voters = 3, label = 'review' } = args
const N = Math.max(1, Math.min(voters, ANGLES.length))

phase('Panel')
log(`${label}: adversarial panel of ${N} fresh reviewers`)

const verdicts = (await parallel(
  Array.from({ length: N }, (_, i) => () => agent(
    `${reviewPrompt}\n\n[Adversarial angle for this voter — try to REFUTE that the artifact is ready] ${ANGLES[i]}\n\nReturn a ReviewVerdict.`,
    { label: `${label}:voter${i + 1}`, phase: 'Panel', schema: REVIEW_SCHEMA }
  ))
)).filter(Boolean)

if (verdicts.length === 0) {
  // Treat a total panel failure as a blocking non-conformance, not a silent pass.
  return { severe: ['panel: all voters failed'], general: [], clarifications: [], verdict: 'severe-nonconformance', severe_count: 1, general_count: 0 }
}

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

return {
  severe,
  general,
  clarifications,
  severe_count: severe.length,
  general_count: general.length,
  verdict: severe.length > 0 ? 'severe-nonconformance' : (general.length > 0 ? 'needs-fix' : 'pass'),
}
