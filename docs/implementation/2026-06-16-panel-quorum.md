# Implementation — Panel quorum floor (I1)

Slug: `2026-06-16-panel-quorum` (matches `docs/design/2026-06-16-panel-quorum.md`)
Status: draft

## Task Index

Design Deliverables → tasks. Acceptance source: design §7.
- Q1/Q2/Q3 (quorum predicate, both paths, findings preserved) → **T-code** (l3-phase.js + review-panel.js).
- Q4 (contract) → **T-doc-mvr** (multi-voter-review.md).
- Q5 (return-values note) → **T-doc-l3wf** (loop-3-workflow.md).
- AC-Q-truthtable → **T-test** (node truth-table of the predicate).

## Engineering Constraints Index

- Engineering norms: CLAUDE.md _engineering-norms_ (plain JS Workflow scripts; no `Date.now`/`Math.random`; validate with `check-workflow-syntax.sh`).
- `<TEST-CMD>` N/A. ACCEPT = `check-workflow-syntax.sh` + `check-consistency.sh` + the quorum truth-table.
- **L3 mode:** manual/fallback (the change is a precise, pre-verified predicate). Main agent applies; a fresh review subagent audits the diff (author≠reviewer); ACCEPT-CMDs run.

## The canonical quorum predicate (verified at L2 — 17/17 truth-table cases pass)

`quorum = Math.floor(N / 2) + 1` (strict majority). A panel is **insufficient** (cannot confirm clean)
when `severe.length === 0 && general.length === 0 && survivors < quorum`. Otherwise the verdict is the
existing ternary. `insufficient` surfaces as `null` (l3-phase.js → agent-error) or a blocking verdict
(review-panel.js). This predicate is reused **verbatim** in both scripts (AC-Q-equivalence).

## Tasks

### T-code-1 — `l3-phase.js` `panelReview` (Q1/Q2/Q3)
Replace the tail of `panelReview` (from `)).filter(Boolean)` through the `return { … }`) with:

```js
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
```
Notes: this **removes** the separate `if (verdicts.length === 0) return null` (now subsumed: 0 < quorum,
vacuously clean → null) and moves the union computation above the quorum check. The caller's shared
`if (!review) return { status: 'agent-error', … }` line (outside `panelReview`) is **unchanged** —
do not touch it (AC-Q-single-unchanged).

### T-code-2 — `review-panel.js` (Q1/Q2/Q3)
Replace from `)).filter(Boolean)` through the final `return { … }` with:

```js
)).filter(Boolean)

// ── MECHANICAL UNION (no agent in the counting path) ─────────────────────────
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
  severe, general, clarifications,
  severe_count: severe.length,
  general_count: general.length,
  verdict: severe.length > 0 ? 'severe-nonconformance' : (general.length > 0 ? 'needs-fix' : 'pass'),
}
```
Notes: this **subsumes** the old `if (verdicts.length === 0) { … blocking }` (the 0-survivor message is
kept as the degenerate branch) and the old separate narrowing-log line. The union block moves above the
quorum check. The decision predicate (`clean && survivors < quorum → insufficient`) is character-
identical to T-code-1; only the surfacing differs (blocking verdict vs `null`).

### T-doc-mvr — `multi-voter-review.md` (Q4)
The "Voter failures" note currently ends (the `>` blockquote): "…If **every** voter fails, the
*standalone* `review-panel.js` returns a blocking non-conformance, while the *inline* `l3-phase.js`
path returns `null` → an `agent-error` status … Neither is a silent pass." Append a sentence to that
blockquote stating the quorum rule:
`A clean PASS additionally requires a surviving **quorum** (strict majority, ⌊N/2⌋+1): below quorum a *clean* panel does not pass — it is treated like a total failure (standalone → blocking; inline → null → agent-error) so the caller re-runs rather than advancing on what has shrunk toward a single reviewer. A below-quorum panel that *found* issues still reports them.`
This amends the "narrower never weaker" framing (which stays true) by adding the clean-pass quorum.

### T-doc-l3wf — `loop-3-workflow.md` (Q5)
In the Return values table, the `agent-error` row currently reads "A dev/review/accept subagent failed
(threw or returned null) twice in a row — infrastructure failure …". Add a clause so the quorum cause
(a **single** null from the panel, not a twice-in-a-row retry) is distinct: append to that row's
description: ` In panel mode, an insufficient surviving voter **quorum** on an otherwise-clean panel also returns this status (re-run the panel — it is degraded coverage, not a review deadlock).`

### T-test — `tests/` quorum truth-table (AC-Q-truthtable, AC-Q-findings-preserved)
A node test whose `panelOutcome(severeCount, generalCount, survivors, n)` predicate is character-
equivalent to the inline decision in both scripts, asserting the 17-case table (verified at L2):
N=3 {3,2 clean→pass; 1,0 clean→insufficient; 1-survivor severe→severe-nonconformance; general→needs-fix};
N=1 {1 clean→pass; 0→insufficient}; N=2 {2 clean→pass; 1 clean→insufficient}; N=5 {3,5 clean→pass; 2
clean→insufficient; 1-survivor severe→severe-nonconformance}. (Lives at `$CLAUDE_JOB_DIR/tmp/` during
L3; not committed — it tests the predicate, which the fresh review confirms matches both inline sites.)

## Acceptance Criteria (from design §7)
- AC-Q-syntax: `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js three-loop-workflow/references/review-panel.js` exits 0.
- AC-Q-consistency: `bash three-loop-workflow/references/check-consistency.sh` exits 0. (drop-guard only.)
- AC-Q-truthtable: the node truth-table exits 0 (17/17).
- AC-Q-bothpaths: `grep -q quorum three-loop-workflow/references/l3-phase.js` AND `grep -q quorum three-loop-workflow/references/review-panel.js`.
- AC-Q-findings-preserved: truth-table asserts a 1-survivor severe verdict → `severe-nonconformance` (not insufficient).
- AC-Q-equivalence: the test predicate is character-equivalent to the inline `clean && survivors < quorum → insufficient; else ternary` logic in BOTH scripts — fresh review confirms by diff.
- AC-Q-doc: `grep -qi quorum three-loop-workflow/references/multi-voter-review.md` AND `grep -qi quorum three-loop-workflow/references/loop-3-workflow.md`.
- AC-Q-single-unchanged: `git diff` shows no change to the single-reviewer (`tryAgent`) path in l3-phase.js — only `panelReview`'s tail changed; the shared `if (!review)` caller line is byte-identical.

## Regression Protection
- `check-consistency.sh` + `check-workflow-syntax.sh` re-run after the edits (no token dropped; both scripts parse).
- No schema change; ReviewVerdict consumers unaffected. Single-reviewer path untouched.
