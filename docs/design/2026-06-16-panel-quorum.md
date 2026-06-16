# Design — Panel quorum floor (I1)

Slug: `2026-06-16-panel-quorum`
Status: closed
Closing-commit: 2e0e42a
Closed-on: 2026-06-16
Deferred: none (Q1–Q5 all shipped)
Notes: L1 passed review rounds 1–3 (two-generation), L2 rounds 1–2; L3 closed on a clean first review
(clean-first-round relaxation). F whole-change review satisfied by the L3 review, which audited the
complete `git diff` (all 4 files) against Q1–Q5. 17/17 quorum truth-table; consistency + workflow-syntax
gates green. Ships in the unreleased v1.5.1.

## 1. Background and Purpose

The optional adversarial **review panel** (`references/multi-voter-review.md`, `review-panel.js`, and
`l3-phase.js`'s `panelReview`) exists for one reason the two-generation rule cannot cover: a single
*blind* reviewer that misses a real issue every round. You escalate to a panel of N fresh voters
specifically to get N independent lenses on a load-bearing / high-risk artifact.

Today a panel that loses voters to soft-failure silently passes on the survivors: with the default
N=3, if two voters fail and the one survivor returns a clean verdict, the panel returns **pass** on a
single reviewer — exactly the single-blind-reviewer coverage the escalation was meant to eliminate.
The current contract defends this as "narrower never weaker than a single reviewer," which is true on
the *gate-strength* axis but defeats the *purpose* of having escalated: a clean verdict is accepted on
degraded coverage with no signal to the caller.

The decision rests on an in-repo principle, not an external one: **a clean verdict from a sub-quorum
panel is an unproven negative.** The panel was escalated precisely because one reviewer's clean verdict
is not trustworthy for this artifact; accepting a clean verdict from a lone survivor reintroduces the
exact single-blind-reviewer failure the panel exists to remove. (Claude Code's built-in `deep-research`
workflow applies the same idea by analogy — a claim survives its adversarial vote only with a quorum of
valid voters — but this design does **not** depend on that external artifact, which is not part of this
repo; the rationale above is self-contained.)

## 2. Deliverables

- [ ] Q1: a clean panel verdict (zero severe AND zero general) requires a **surviving quorum** —
  a strict majority of the requested voters, `quorum = floor(N/2) + 1`. Below quorum, a *clean* panel
  does **not** pass; it signals **insufficient coverage** so the caller re-runs the panel rather than
  advancing on degraded coverage.
- [ ] Q2: implemented in **both** panel paths, preserving each one's existing failure-surfacing:
  - `l3-phase.js` `panelReview`: below-quorum-clean returns `null` → the caller emits `agent-error`
    (an infrastructure/coverage failure the main agent re-runs — *not* a review deadlock). This
    **generalizes** the existing `verdicts.length === 0 → null` total-failure case.
  - `review-panel.js` (standalone): below-quorum-clean fails closed — returns a blocking
    `severe-nonconformance` with a "re-run the panel" message, generalizing its existing
    all-voters-failed return.
- [ ] Q3: findings are **always** reported regardless of survivor count — a panel that found severe or
  general issues returns them (`needs-fix` / `severe-nonconformance`) even below quorum. The quorum
  gates **only** the clean-PASS boundary.
- [ ] Q4: `multi-voter-review.md` contract updated — the "narrower never weaker" clause now also states
  the clean-pass quorum requirement and what a below-quorum clean panel does.
- [ ] Q5: `loop-3-workflow.md` Return-values notes that panel mode can return `agent-error` on
  insufficient voter quorum (re-run the panel), distinct from a review deadlock.

## 3. Scope Boundary (NOT in scope)

- **No change to the single-reviewer (non-panel) path** — quorum applies only to `reviewMode: 'panel'`
  / `review-panel.js`. Single mode is unchanged.
- **No change to voter retry policy.** Voters are still not retried (the deliberate "dropped, not
  retried" choice in `multi-voter-review.md` stands); a *thrown* voter still resolves to `null` via the
  documented `parallel()` contract and is dropped. Quorum is about how many survivors are needed to
  PASS, not about retrying failures.
- **No change to the findings union** (mechanical, no agent in the counting path) or to the
  standalone-vs-inline total-failure asymmetry (it is deliberate; quorum extends it consistently).
- **No quorum gate on a non-clean panel** — a below-quorum panel that found issues reports them; the
  union only narrows with fewer voters, and a real finding from even one voter is valid evidence.
- **No new schema fields** and **no `Date.now`/`Math.random`** (resume-determinism preserved).

## 4. Key Design Decisions

**KDD-1 — Quorum = strict majority `floor(N/2)+1`.**
Options: (a) `>= 2` always (so a panel is never a single reviewer); (b) `>= ceil(N/2)` (half);
(c) `>= floor(N/2)+1` (strict majority). **Chosen: (c).** Rationale: "quorum" conventionally means a
majority; it directly expresses "most of the panel must agree the artifact is clean." It degrades
gracefully across N — N=1→1 (a one-voter panel is single-by-request, quorum trivially met), N=2→2
(a 2-voter panel can't pass on one), N=3→2, N=5→3. (a) is too weak for large N (2 of 5 could pass);
(b) lets N=2 pass on one (half of 2 is 1). (c) is the principled middle — it expresses "most of the
panel must confirm clean," the natural reading of *quorum*.

**KDD-2 — Quorum gates the clean-PASS boundary only, never findings.**
Options: gate all verdicts vs gate only PASS. **Chosen: gate only PASS.** A below-quorum panel that
found a severe or general issue must still surface it — suppressing a real finding because few voters
survived would be strictly worse than today. Only the *clean* verdict is suspect on thin coverage
(it is an unproven negative). By the same logic a thin panel can only fail to *confirm* a clean result;
it can never suppress a real finding.

**KDD-3 — Each path keeps its existing failure-surfacing (preserve the deliberate asymmetry).**
`l3-phase.js` returns `null` → `agent-error` (the main agent re-runs the Phase; not a deadlock report);
`review-panel.js` fails closed with a blocking verdict (it is standalone, no round machine). This is
the *same* asymmetry the two scripts already use for total failure (documented in
`multi-voter-review.md`); quorum generalizes the threshold from 0 to `< quorum`, it does not introduce
a new asymmetry. The total-failure (`0` survivors) case becomes the degenerate sub-case of the quorum
rule (0 < quorum, vacuously clean).

**KDD-4 — Behavior-scoped, not a refactor.** The change adds one predicate to each panel path and
updates two docs. It does not touch the union math, the angles, the single-review path, or control
flow elsewhere. Verified by the syntax gate + a quorum truth-table test + a fresh reading review.

## 5. Dependencies and Assumptions

- The `parallel()` runtime contract: "A thunk that throws (or whose agent errors) resolves to `null`
  in the result array — the call itself never rejects, so `.filter(Boolean)` before using the results."
  (Workflow tool contract.) The quorum check runs on the post-`filter(Boolean)` survivor list.
- `<TEST-CMD>` = N/A. Acceptance: `check-workflow-syntax.sh` (both scripts parse),
  `check-consistency.sh` (no token dropped), and a node truth-table test of the quorum decision.
- No project test suite; the quorum decision is a pure predicate, so its truth table is testable in
  isolation even though the full Workflow script needs the runtime to run agents.

## 6. Relationship with Existing Designs

- `docs/audit-2026-06-16.md` — surfaced the panel-failure asymmetry; this is the I1 follow-up from the
  dynamic-workflow comparison against the built-in `deep-research` workflow (used as an external
  analogy, not a dependency — see §1).
- `references/multi-voter-review.md` lines ~44-49 ("narrower never weaker") — Q4 amends this clause;
  **no conflict** (the clause stays true; quorum adds the clean-pass requirement on top).
- `references/schemas.md` ReviewVerdict — unchanged (no new fields).
- Terminology anchors: CLAUDE.md _language-policy_; consistent with the skill's existing panel wording.
  No conflict requiring escalation.

## 7. Acceptance Criteria (measurable)

- AC-Q-syntax: `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js three-loop-workflow/references/review-panel.js` exits 0.
- AC-Q-consistency: `bash three-loop-workflow/references/check-consistency.sh` exits 0. (Note: the gate
  pins none of the tokens this change touches, so this AC only guards against accidentally dropping an
  *unrelated* token during the Q4/Q5 doc edits — it does not verify the quorum behavior.)
- AC-Q-equivalence (named, not prose): the quorum-decision predicate used by the truth-table test is
  **character-equivalent** to the inline logic in BOTH `panelReview` (l3-phase.js) and `review-panel.js`
  — the fresh L3 reviewer asserts this by diffing the test predicate against both inline sites. Keep
  the predicate in one canonical wording reused verbatim in both scripts so equivalence is mechanical.
- AC-Q-truthtable: a node test of the quorum decision predicate asserts the full truth table for N∈{1,2,3,5}:
  - clean + survivors ≥ quorum → **pass**; clean + survivors < quorum → **insufficient** (null / blocking);
  - any severe → **severe-nonconformance** regardless of survivors (even 1);
  - general-only (no severe) → **needs-fix** regardless of survivors;
  - 0 survivors → **insufficient** (degenerate clean case).
  The test predicate must be character-equivalent to the inline logic in both scripts (the fresh
  review confirms equivalence by reading the diff).
- AC-Q-bothpaths: `grep -q 'quorum' three-loop-workflow/references/l3-phase.js` AND `grep -q 'quorum' three-loop-workflow/references/review-panel.js`.
- AC-Q-findings-preserved (negative — quorum must NOT suppress findings): the truth-table test asserts a 1-survivor verdict carrying a severe issue still returns `severe-nonconformance` (severe_count ≥ 1), not insufficient.
- AC-Q-doc: `grep -qi 'quorum' three-loop-workflow/references/multi-voter-review.md` AND `loop-3-workflow.md` notes the panel→agent-error-on-insufficient-quorum path.
- AC-Q-single-unchanged: the single-reviewer path in `l3-phase.js` (the `tryAgent` branch) is unchanged — `git diff` shows no edit outside `panelReview` for that file.

**Quality budget:** no hot path / latency / UI surface; the relevant attribute is gate correctness,
covered by the truth-table AC. No other budget applies.

## 8. Risks and Rollback

- **R1 — quorum too strict → spurious `agent-error` / re-runs.** A panel that legitimately loses one
  voter to a transient blip on N=3 still has quorum (2), so the common single-failure case is
  unaffected; only ≥⌈N/2⌉ failures (the genuinely-degraded case) trip insufficient. Mitigation: the
  threshold is strict-majority, not unanimity; logged clearly. At the **default N=3** the only visible
  change is "lose 2 of 3 voters → insufficient (re-run) instead of pass-on-1"; losing a single voter
  still has quorum (2) and is unaffected.
- **R2 — suppressing a real finding.** Mitigated by KDD-2 (quorum gates only the clean PASS; findings
  always report) and AC-Q-findings-preserved.
- **R3 — the truth-table test diverges from the inline code.** Mitigated by the fresh review confirming
  character-equivalence between the test predicate and both scripts' inline logic.
- **Rollback:** one isolated commit on the work branch; `git revert` restores the prior pass-on-one
  behavior. No state/contract migration. Schemas unchanged, so consumers are unaffected.
