# Implementation: audit-2 follow-ups

Slug: `2026-06-16-audit-2-followups` (matches `docs/design/2026-06-16-audit-2-followups.md`)

## 1. Task Index

| Phase | Design Deliverable | Design Acceptance |
|---|---|---|
| F1 | §2 Phase F1 | §7 Phase F1 |
| F2 | §2 Phase F2 | §7 Phase F2 |

Design Key Decisions: §4 D-F1, D-F2. Repo has no unit-test suite — acceptance is grep/exit-code
predicates over the modified files plus the consistency + workflow-syntax gates. TDD order: state the
acceptance predicate first (fails on the current tree), then make the edit so it passes. Commits use
the task-scoped form `fix(audit-2-fu): Phase F1 — …` (the numeric `fix(phaseN)` grammar is for in-cycle
L3 Phase commits; verified to pass `validate-commit-msg.sh`).

## 2. Phase Breakdown

### Phase F1 — closeout report-requirement generalization
- **Entry condition**: L1 passed; on `HEAD` of `audit-repair-2026-06-16`.
- **Design refs**: design §2 Phase F1, §4 D-F1, §7 Phase F1.
- **Files**: `three-loop-workflow/references/end-to-end-review.md`.
- **Task list (TDD order)**:
  1. (test) Confirm the acceptance predicates currently FAIL: `grep -Fq 'Name the item and its class' three-loop-workflow/references/end-to-end-review.md` does not match (the block is deliverable-only). Record baseline.
  2. (impl F1) Rewrite the closure-rule report block (`end-to-end-review.md:121-126`) to cover a deferred item of **either** class. The opening line becomes: "If an item — a Deliverable left unticked, or a correctness finding from step 4b left unfixed — cannot be closed/fixed in this task and a follow-up issue is filed instead, the closeout report must:". The four bullets become: "Name the item and its class (deliverable or finding)." / "State why it could not be closed/fixed in this task." / "Link the follow-up issue ID (also recorded in the closure block's `Deferred:` line)." / "Confirm that the deferred work does not break the items that *were* closed (otherwise the entire task is not yet ready for closeout)."
- **Per-task `<ACCEPT-CMD>`** (from repo root):
  - `grep -Fq 'Name the item and its class (deliverable or finding)' three-loop-workflow/references/end-to-end-review.md` — distinctive both-classes phrase the edit adds (does not pre-match).
  - `grep -Fq 'a correctness finding from step 4b left unfixed' three-loop-workflow/references/end-to-end-review.md` — the opening line now names the finding class (does not pre-match).
  - `grep -ni deferred three-loop-workflow/references/end-to-end-review.md` — manual confirm every site is class-aware, none deliverable-only.
- **Exit condition**: all Phase-F1 `<ACCEPT-CMD>` exit 0; the report block covers both classes.

### Phase F2 — commit-lint limitation note
- **Entry condition**: Phase F1 committed.
- **Design refs**: design §2 Phase F2, §4 D-F2, §7 Phase F2.
- **Files**: `three-loop-workflow/references/validate-commit-msg.sh`.
- **Task list (TDD order)**:
  1. (test) Confirm baseline: `git -C "/my repo" commit -m "fix(phase): bad"` currently exits 0 (passes unscreened); `grep -Fq 'value containing whitespace' validate-commit-msg.sh` does not match. Record.
  2. (impl F2) Add ONE comment line to the policing block (after `:34`, before the `if` at `:35`) documenting the known limitation, e.g.: "# Known limitation: a global-option VALUE containing whitespace (e.g. `-C \"/my repo\"`) splits into two tokens and is not recognized — the lint treats it as a non-commit and passes; uncommon for a phase commit, and the fresh-review corner still judges the diff." **No change to the regex or any executable line.**
- **Per-task `<ACCEPT-CMD>`**:
  - `grep -Fq 'value containing whitespace' three-loop-workflow/references/validate-commit-msg.sh` — distinctive note the edit adds (does not pre-match).
  - **Behavior unchanged** (re-run the audit-2 Phase-B matrix): payloads whose command is `git -C /repo commit -m "fix(phase): bad"`, `git --no-pager commit -m "fix(phase): bad"`, `git -c k=v commit -m "fix(phase): bad"` each exit 2; `git commit -m "fix(phase1): ok"` and `git status` exit 0; the no-jq path (jq shadowed) extracts without bleed.
  - `bash three-loop-workflow/references/check-workflow-syntax.sh` is N/A (shell, not a Workflow script); instead `bash -n three-loop-workflow/references/validate-commit-msg.sh` parses clean.
- **Exit condition**: the note is present; the Phase-B behavior matrix is byte-for-byte unchanged in outcome.

## 3. Engineering Constraints Index

- **Project engineering norms**: CLAUDE.md _engineering-norms_ role (Markdown + shell helper; anti-bloat; shell hooks validated with `bash -n`, JS Workflow scripts with `check-workflow-syntax.sh`).
- **Four-corner subagent template**: `references/loop-3-development.md`.
- **Commit conventions**: SKILL.md "Commit conventions" — gate results as trailers; no AI/tooling mention. Task-scoped prefix `fix(audit-2-fu): Phase F1 — …` (not numeric `fix(phaseN)`).

## 4. Data and Fixture Dependencies

- No fixtures, no new files. Two single-site edits to existing reference files. No external systems.

## 5. Regression Protection

- After each Phase: `bash three-loop-workflow/references/check-consistency.sh` exits 0 and `check-workflow-syntax.sh` is ok on both `l3-phase.js` and `review-panel.js`.
- F2 must not change `validate-commit-msg.sh` behavior — the audit-2 Phase-B acceptance matrix (global-option forms block; valid/non-commit pass; no-jq no bleed) must hold identically before and after.
- `tests/scenarios/*.md` (13 files) must still grade green at F (regression check; no tier/escalation/termination edit in this task, so the CLAUDE.md behavioral gate is not triggered but the suite must not regress).
- `SKILL.md` is untouched; its `wc -w` (2860) is unchanged.
