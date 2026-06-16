# Design: audit-2 follow-ups

Slug: `2026-06-16-audit-2-followups`
Status: closed
Closing-commit: 3e707f7
Closed-on: 2026-06-16
Deferred: none
Notes: Finishes the two loose ends from `2026-06-16-audit-2-repair` — F1 resolves that cycle's recorded
"Advisory follow-up" (the `end-to-end-review.md:121` closure-rule report block now covers a deferred
finding, completing the D-D2 broadening); F2 closes the Phase-B review clarification by documenting the
whitespace-in-global-option-value limitation (comment-only, no behavior change). L1 passed rounds 1–2
(clean + confirming, two-generation); L2 rounds 1–2; L3 closed both phases on a clean first review
(clean-first-round relaxation, no fix applied). F whole-change review 0 severe / 0 general; the closeout
scenario still grades `record-and-defer`; consistency + workflow-syntax gates green; `SKILL.md` untouched
(`wc -w` 2860). Folds into the unreleased v1.5.1 (no version bump). Loose coupling to audit-2-repair (one
advisory item completed), not a supersession — no cross-link per the convention.

## 1. Background and Purpose

The round-2 audit repair (`docs/design/2026-06-16-audit-2-repair.md`, closeout `c01967f`) left two
loose ends, both recorded in that cycle's reviews:

- **F1 (recorded follow-up in the audit-2 closure block):** audit-2 D-D2 made "deferred finding" a
  first-class deferral class on the closure-block `Deferred:` line, and broadened step 4b + the
  consolidation checklist. But the **closure-rule report block** at `end-to-end-review.md:121-126`
  ("If a deliverable cannot be closed and a follow-up issue is filed instead, the closeout report
  must…") was out of audit-2's declared scope and still describes only the *deferred-deliverable*
  path. A deferred *finding* therefore has a `Deferred:` slot and a step-4b disposition but no
  report-requirement spec — an asymmetry that could let a deferred finding be listed without the
  same name/why/issue-ID rigor a deferred deliverable gets.

- **F2 (audit-2 Phase-B review clarification):** the Phase-B B1 hardening tolerates global options
  before `git commit`, but the policing regex matches each option's bare argument as a single
  whitespace-free token, so a **global-option value containing whitespace** — e.g.
  `git -C "/my repo" commit -m "…"` — is not recognized and the lint passes it unscreened. The
  Phase-B reviewer confirmed this is **not a regression** (the prior contiguous-substring guard
  passed *every* `git -C … commit` form) and is an uncommon idiom for a phase commit.

Why finish them: F1 closes a real consistency gap in the closeout contract (the failure class this
skill exists to prevent — a rule that is broadened in some sites but not its report-requirement
twin). F2 makes the lint's known boundary honest and discoverable instead of silent.

## 2. Deliverables

**Phase F1 — closeout report-requirement generalization** (`references/end-to-end-review.md`)
- [x] F1: Generalize the closure-rule report block (`:121-126`) so it covers a deferred **item of
  either class** (a Deliverable left unticked, or a correctness finding from step 4b left unfixed):
  name the item **and its class**, state why it could not be closed/fixed, link the follow-up issue
  ID (also on the `Deferred:` line), and confirm the deferral does not break the closed items.

**Phase F2 — commit-lint limitation note** (`references/validate-commit-msg.sh`)
- [x] F2: Add a one-line **known-limitation note** to the policing-block comment (`:29-34`) stating
  that a global-option value containing whitespace (e.g. `-C "/my repo"`) is not recognized — the
  lint treats it as a non-commit and passes; uncommon, and the review corner still judges the diff.
  **No regex/behavior change.**

## 3. Scope Boundary (NOT in scope)

- **No regex/behavior change to `validate-commit-msg.sh`.** F2 is a comment-only limitation note
  (Decision D-F2). Quote-aware bare-argument parsing is explicitly rejected (Simplicity First; the
  file already documents analogous limitations and states it is "a lint, not an airtight gate").
- **No edit to the audit-2 closed docs** (`docs/{design,implementation}/2026-06-16-audit-2-repair.md`)
  or any other already-shipped fix. F1 completes a broadening at a *new* site only.
- **No new `Deferred:` field or closure-block structure** — F1 reuses the existing report block; it
  only generalizes its wording from one class to two.
- **No new reference file.** Anti-bloat binding. `SKILL.md` is not touched in this task.
- **No push, no PR, no merge to `main`.** Work stays on `audit-repair-2026-06-16`.

## 4. Key Design Decisions

**D-F1 — How to generalize the report block.**
Problem: the report block names only the deliverable class. Options: (a) generalize the existing
block to "an item (deliverable or finding)" with a class label, reusing the four bullets; (b) add a
separate parallel block for deferred findings. Choice: **(a)**. Rationale: the four
report-requirements (name / why / issue-ID / no-collateral-breakage) are identical for both classes,
so a parallel block would duplicate them and drift (the exact failure mode audit-2 D-D2 fought); a
single generalized block with a class label is Simplicity First and stays consistent with the
already-broadened `Deferred:` definition (`end-to-end-review.md:54`) and step 4b. (b) rejected:
duplication + future drift.

**D-F2 — Fix vs document the whitespace-in-global-option-value edge.**
Problem: `git -C "/my repo" commit` is not policed. Options: (a) extend the regex's bare-argument
unit to also match a quoted token (`"…"` / `'…'`) so a space-bearing value is consumed; (b) document
it as a known limitation, no behavior change. Choice: **(b)**. Rationale: the case is uncommon for a
phase commit, it is a **non-regression** (strictly better than the prior substring guard), the lint
is explicitly best-effort ("not an airtight gate") with the fresh-review corner as the real
surgical-ness check, and the file already documents analogous limitations (the single-quote
apostrophe case). Adding quote-aware alternations grows regex complexity and false-positive surface
for a rare input — against Simplicity First and "no handling for scenarios that effectively cannot
occur in practice." (a) rejected: disproportionate complexity/risk for the value.

## 5. Dependencies and Assumptions

- The consistency (`check-consistency.sh`) and workflow-syntax gates are the mechanical acceptance
  backbone; both must stay green. F2's comment-only edit must not change `validate-commit-msg.sh`
  behavior (verified by re-running the audit-2 Phase-B acceptance matrix: the global-option forms
  still block, valid/non-commit still pass).
- No `SKILL.md` edit → no word-ceiling or behavioral-scenarios-gate trigger for this task. The tier
  table, escalation rules, and termination wording are untouched, so the CLAUDE.md behavioral gate
  is not triggered (but the suite must remain green as a regression check — 13/13 unchanged).
- Assumption: the F1/F2 line citations are current on `HEAD` of `audit-repair-2026-06-16` (re-checked
  at L3 dev time).

## 6. Relationship with Existing Designs

- Completes `docs/design/2026-06-16-audit-2-repair.md` (closed, `c01967f`): F1 finishes the D-D2
  `Deferred:` broadening at the one report-requirement site that was out of that cycle's scope; F2
  closes the Phase-B (B1) review clarification. No conflict — F1 brings `end-to-end-review.md:121`
  *into* agreement with the already-shipped `:54` definition and step 4b.
- Terminology anchors: CLAUDE.md `_language-policy_` (English; consistent with existing `docs/`),
  `_load-bearing-docs_`, and `references/end-to-end-review.md`'s existing closure vocabulary
  (`Deferred:`, deferred deliverable / deferred finding).

## 7. Acceptance Criteria (measurable, automated at L2)

Phase F1:
- The report block at `end-to-end-review.md:~121` names a deferred item of **either** class with its
  class label (a distinctive new phrase the edit introduces, e.g. "item (a Deliverable, or a step-4b
  finding)" — chosen at L3 — that does **not** pre-match the current tree).
- `grep -niq 'deliverable' end-to-end-review.md` still matches (deliverable path retained) AND the
  block no longer restricts the report requirement to deliverables only (manual confirm + the
  distinctive-phrase grep above).
- No other `end-to-end-review.md` site regresses (`grep -ni deferred` shows every site class-aware).

Phase F2:
- `validate-commit-msg.sh:~29-34` comment contains a distinctive known-limitation phrase the edit
  introduces (e.g. "value containing whitespace" — chosen at L3; does not pre-match).
- **Behavior unchanged** (re-run the audit-2 Phase-B matrix): `git -C /repo commit -m "fix(phase): bad"`,
  `git --no-pager commit …`, `git -c k=v commit …` all exit 2; `git commit -m "fix(phase1): ok"` and
  `git status` exit 0; the no-jq path still extracts without bleed.

Cross-cutting:
- `check-consistency.sh` exit 0; `check-workflow-syntax.sh` ok on both JS files.
- `tests/scenarios/*.md` 13/13 still graded green (regression check; no tier/termination edit here).
- F whole-change review (`end-to-end-review.md` 4b over `git diff task-base..HEAD`): zero severe.

## 8. Risks and Rollback

- **Risk: F1 wording drifts from the `Deferred:` definition (`:54`) or step 4b.** Mitigation: D-F1
  reuses the existing block and the same class vocabulary; the fresh L3 review reads all three sites.
- **Risk: F2's comment is mistaken for a behavior change, or the edit accidentally alters the regex.**
  Mitigation: F2 is comment-only; the acceptance re-runs the full Phase-B behavior matrix to prove
  the regex is byte-unchanged in effect.
- **Rollback: each Phase is one commit on `audit-repair-2026-06-16`; revert that commit.** No
  published history touched (branch unmerged).
