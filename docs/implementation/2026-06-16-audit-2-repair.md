# Implementation: Round-2 self-audit repair

Slug: `2026-06-16-audit-2-repair` (matches `docs/design/2026-06-16-audit-2-repair.md`)
Status: closed
Closing-commit: c01967f
Closed-on: 2026-06-16
Deferred: none
Notes: Implements design `2026-06-16-audit-2-repair` Phases A–E. Acceptance: every per-Phase
`<ACCEPT-CMD>` exits 0 (re-run fresh at closeout); consistency + workflow-syntax gates green;
`tests/scenarios/` 13/13 graded to `expected` by fresh subagents. No L2 rollback occurred (no Deprecated
section). B2 shipped a more robust escape-aware `sed` than the doc's literal example (it handles any
`\`-escape, not just `\"`) — a sound deviation confirmed at L3 + F review.

## 1. Task Index

| Phase | Design Deliverables | Design Acceptance |
|---|---|---|
| A | §2 Phase A (A1–A5) | §7 Phase A |
| B | §2 Phase B (B1–B2) | §7 Phase B |
| C | §2 Phase C (C1–C2) | §7 Phase C |
| D | §2 Phase D (D1–D3) | §7 Phase D |
| E | §2 Phase E (E1–E3) | §7 Phase E |

Design Key Decisions: §4 D-A1, D-A3, D-B1, D-D1, D-D2, D-E1, D-E3.

All `<ACCEPT-CMD>` below are runnable verbatim from the repository root. Repo has no unit-test
suite (CLAUDE.md _common-commands_): acceptance is grep/exit-code predicates over the modified
files, the consistency + workflow-syntax gates, and fresh-subagent grading of the behavioral
scenarios. The "test before implementation" TDD order is realized as: state the acceptance
predicate first (it fails on the current tree), then make the edit so it passes.

## 2. Phase Breakdown

### Phase A — Termination-contract integrity
- **Entry condition**: L1 passed; on `HEAD` of `audit-repair-2026-06-16`.
- **Design refs**: design §2 Phase A, §4 D-A1 / D-A3, §7 Phase A.
- **Files**: `three-loop-workflow/references/schemas.md`, `three-loop-workflow/references/check-consistency.sh`, `tests/scenarios/l1-clean-first-round-still-confirms.md` (new).
- **Task list (TDD order)**:
  1. (test) Confirm the acceptance predicates currently FAIL: `grep -F 'verdict == "pass"' three-loop-workflow/references/schemas.md` currently matches (line 53). Record baseline.
  2. (impl A1) In `schemas.md`, change the L1/L2 closure line from `closed = (verdict == "pass") || (severe_count == 0 && round > 1 && prior_general_count == 0)` to `closed = (severe_count == 0 && round > 1 && prior_general_count == 0)`.
  3. (impl A2) Rewrite the `verdict` enum description (`schemas.md:34`) so `pass` reads as a single-round readiness signal: `pass = zero severe AND zero general THIS round`. Remove any "last round" phrasing. Verify the prose at `:62` and the A3 note agree (no residual "last round").
  4. (impl A3) Add one sentence near the closure-check block stating the mechanical closure decision uses only `severe_count`/`general_count`, never the `verdict` string (`verdict` stays a readiness annotation; it remains `required` — producers always emit it).
  5. (impl A4) Add a guard to `check-consistency.sh`: fail with a clear message if `three-loop-workflow/references/schemas.md` contains the literal `verdict == "pass"`. Place it with the other paired-token checks; set `fail=1` and echo a token name (e.g. `verdict-not-a-closure-authority`).
  6. (impl A5) Create `tests/scenarios/l1-clean-first-round-still-confirms.md` (structure mirrors siblings; ends with an `expected:` line). Scenario: an orchestrator applying the `references/schemas.md` closure formula literally; L1 round 1 returned `verdict:"pass"`, `severe_count:0`, `general_count:0`; options (A) closed — verdict is pass; (B) not closed — the count-driven rule needs `round > 1`, a confirming round is required; (C) closed only if no fix was applied. `expected: {"closed": false}`.
- **Per-task `<ACCEPT-CMD>`** (all from repo root):
  - `! grep -F 'verdict == "pass"' three-loop-workflow/references/schemas.md` (no match → exit 0).
  - `grep -Fq 'closed = (severe_count == 0 && round > 1 && prior_general_count == 0)' three-loop-workflow/references/schemas.md`
  - `! grep -in 'last round' three-loop-workflow/references/schemas.md` (no residual "last round" wording).
  - Inject test (guard proven to fail): `cp three-loop-workflow/references/schemas.md /tmp/schemas.bak && printf '\nclosed = (verdict == "pass")\n' >> three-loop-workflow/references/schemas.md && ! bash three-loop-workflow/references/check-consistency.sh >/dev/null 2>&1 && echo GUARD_FIRES; cp /tmp/schemas.bak three-loop-workflow/references/schemas.md` → prints `GUARD_FIRES` and restores the file.
  - `bash three-loop-workflow/references/check-consistency.sh` → exit 0 on the real tree.
  - A5 grading: a fresh subagent given the post-edit `schemas.md` closure section + the scenario (up to the `expected:` line) returns `{"closed": false}`.
- **Exit condition**: all Phase-A `<ACCEPT-CMD>` exit 0; A5 graded to expected; gate green.

### Phase B — Commit-msg gate hardening
- **Entry condition**: Phase A committed.
- **Design refs**: design §2 Phase B, §4 D-B1, §7 Phase B.
- **Files**: `three-loop-workflow/references/validate-commit-msg.sh`.
- **Task list (TDD order)**:
  1. (test) Confirm baseline bypass: a payload whose command is `git -C /repo commit -m "fix(phase): bad"` currently exits 0 (bypassed) — record.
  2. (impl B1) Replace the contiguous-substring policing guard (`case "$CMD" in *"git commit"*) ;; *) exit 0 ;; esac`) with a match that recognizes `git`, then zero or more global-option tokens — including option-with-bare-argument forms (`-C <path>`, `-c k=v`, `--no-pager`, other `-x`/`--x`) — then `commit`. Anchor on a `grep -Eq` regex; on no-match `exit 0`. Update the header comment.
  3. (impl B2) Replace the no-jq `sed` capture so it stops at the first unescaped closing quote: `sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\(\\"[^"]*\)*\)".*/\1/p'`. Leave the jq path and the awk subject-extraction unchanged.
- **Per-task `<ACCEPT-CMD>`** (each `printf` the JSON payload into the script; check exit code):
  - Blocked (exit 2): `git -C /repo commit -m "fix(phase): bad"`, `git --no-pager commit -m "fix(phase): bad"`, `git -c commit.gpgsign=false commit -m "fix(phase): bad"`.
  - Allowed (exit 0): `git commit -m "fix(phase1): ok"`; `git status` (non-commit).
  - No-jq path (run with `jq` shadowed out of `PATH`) on payload `{"tool_input":{"command":"git commit -m \"fix(phase1): ok\"","description":"x"}}`: exit 0, and the extracted `CMD` does not contain the string `description`.
  - No-jq path on a malformed-subject payload still exits 2.
- **Exit condition**: all Phase-B `<ACCEPT-CMD>` exit as specified.

### Phase C — L3 path completeness
- **Entry condition**: Phase B committed.
- **Design refs**: design §2 Phase C, §7 Phase C.
- **Files**: `three-loop-workflow/references/loop-3-development.md`, `three-loop-workflow/references/loop-3-workflow.md`, `three-loop-workflow/references/l3-phase.js`.
- **Task list (TDD order)**:
  1. (impl C1) In `loop-3-workflow.md` post-Workflow discharge list (the "status === 'closed' is not a complete Phase close" block, ~72-77), add the skill-self behavioral check (for a Phase that edits a discipline rule of THIS skill) alongside PhaseEnd verification and the E2E gate. In `loop-3-development.md:~205`, reword "the accept step adds a GREEN behavioral check" to "the main agent runs (after accept passes) a GREEN behavioral check". Verify the behavioral-check ownership/trailer wording is consistent across `loop-3-development.md` (~199-205) and the discharge block; `SKILL.md:197` carries no accept-corner attribution (confirm, no edit expected).
  2. (impl C2) In `l3-phase.js:~161`, change `concerns: retry.concerns || devResult.concerns` to a length-aware fallback: `concerns: (retry.concerns && retry.concerns.length) ? retry.concerns : (devResult.concerns || [])`.
- **Per-task `<ACCEPT-CMD>`**:
  - `grep -nri 'behavioral' three-loop-workflow/references/loop-3-workflow.md` shows the check in the discharge list.
  - `! grep -n 'accept step adds a GREEN behavioral check' three-loop-workflow/references/loop-3-development.md` (old attribution gone).
  - `grep -Fq 'retry.concerns && retry.concerns.length' three-loop-workflow/references/l3-phase.js`
  - `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → ok.
- **Exit condition**: all Phase-C `<ACCEPT-CMD>` exit 0; syntax gate ok.

### Phase D — Accept / closeout contract
- **Entry condition**: Phase C committed.
- **Design refs**: design §2 Phase D, §4 D-D1 / D-D2, §7 Phase D.
- **Files**: `three-loop-workflow/references/loop-3-development.md`, `three-loop-workflow/references/end-to-end-review.md`, `tests/scenarios/closeout-general-finding-deferred.md` (new).
- **Task list (TDD order)**:
  1. (impl D1) Soften `loop-3-development.md:82` (accept-role Output): the accept subagent returns per-command exit code + pass/fail only (purely mechanical); move the per-command passed/failed/skipped/xfail tally and the "skipped tests are not passing tests" guard to the main-agent PhaseEnd re-run (`loop-3-development.md:95`, which already references a closing-run tally). Add no new requirement at :95.
  2. (impl D2) In `end-to-end-review.md` step 4b, add a general-finding disposition: a general finding from the whole-change review is recorded in the closeout report and fixed in the same bounded round if cheap, else filed as a follow-up and listed on the closure block `Deferred:` line — it does not silently vanish.
  3. (impl D2/D-D2) Broaden the `Deferred:` line definition (`end-to-end-review.md:51`) to two named item classes: deferred deliverable | deferred finding, each with a follow-up issue ID.
  4. (impl D3) Create `tests/scenarios/closeout-general-finding-deferred.md` (sibling structure; `expected:` line). Scenario: F-closeout 4b returned zero severe + one general finding, not fixed this round; options (A) close clean — general is non-blocking; (B) record the general and route it to the closure block `Deferred:` line / a follow-up, do not close until recorded; (C) re-run 4b. `expected: {"action":"record-and-defer"}`.
- **Per-task `<ACCEPT-CMD>`**:
  - `! grep -n 'passed/failed/skipped/xfail tally' three-loop-workflow/references/loop-3-development.md | grep -i accept` (accept row no longer owns the tally) — confirmed by reading the accept-role row at :82.
  - `grep -Fq 'does not silently vanish' three-loop-workflow/references/end-to-end-review.md` — distinctive phrase the D2 edit adds to step 4b (does not pre-match the current tree); plus manual confirm the general disposition reads correctly in step 4b.
  - `grep -Fq 'a correctness finding left unfixed' three-loop-workflow/references/end-to-end-review.md` — distinctive two-class phrasing the D-D2 edit adds at the `Deferred:`-line definition (does not pre-match the current tree; replaces a prior file-wide alternation grep that pre-matched on unrelated text).
  - D3 grading: a fresh subagent given the post-edit step 4b + the scenario returns `{"action":"record-and-defer"}`.
- **Exit condition**: all Phase-D `<ACCEPT-CMD>` exit 0; D3 graded to expected.

### Phase E — Light-Mode termination + SKILL.md surface
- **Entry condition**: Phase D committed.
- **Design refs**: design §2 Phase E, §4 D-E1 / D-E3, §7 Phase E.
- **Files**: `three-loop-workflow/references/light-mode.md`, `three-loop-workflow/SKILL.md`.
- **Task list (TDD order)**:
  1. (impl E1) In `light-mode.md` (the termination/round-cap items, ~49-51), state the termination rule: a fully-clean first review closes the change; the moment any fix is applied, a confirming clean round is required (mirrors the L3 clean-first-round relaxation; references/schemas.md). In `SKILL.md:155`, minimally adjust the "L3-only clean-first-round relaxation" wording so it is not contradicted — note Light Mode mirrors the relaxation, pointing to `references/light-mode.md`. Retain the literal tokens `two-generation` and `clean-first-round` on that line.
  2. (impl E2) In `SKILL.md:23` change "a change touching more than 3 files" to "a change touching more than 3 non-load-bearing files".
  3. (impl E3) In `SKILL.md:25` (None cell), replace the trivial/substantive adjudication detail with the routing outcome + a pointer to `references/light-mode.md`; ensure `light-mode.md` carries the detail. Net word change on `SKILL.md` across E1+E2+E3 must be ≤ 0.
- **Per-task `<ACCEPT-CMD>`**:
  - `grep -niq 'clean first\|confirming\|two-generation' three-loop-workflow/references/light-mode.md` — Light Mode termination rule present.
  - `grep -Fq 'more than 3 non-load-bearing files' three-loop-workflow/SKILL.md`
  - `grep -Fq 'routes to Full on any commitment-clause touch (references/light-mode.md)' three-loop-workflow/SKILL.md` — the distinctive None-cell pointer the E3 edit adds (does not pre-match); plus manual confirm the None cell no longer carries the full trivial/substantive detail.
  - `[ "$(wc -w < three-loop-workflow/SKILL.md)" -le 2876 ]` — enforces the design's net-word-change ≤ 0 (E3's removal must offset E1+E2's additions; 2876 is the current count). The consistency gate independently enforces the hard ceiling 2888.
  - `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (word ceiling + `two-generation`/`clean-first-round` tokens survive).
  - Behavioral gate (CLAUDE.md): a fresh subagent grades each `tests/scenarios/*.md` (13 files) to its `expected` field — all pass.
- **Exit condition**: all Phase-E `<ACCEPT-CMD>` exit 0; full scenario suite passes; gate green.

## 3. Engineering Constraints Index

- **Project engineering norms**: CLAUDE.md _engineering-norms_ role (Markdown + two JS Workflow scripts + shell helpers; anti-bloat binding on `SKILL.md`; preserve `l3-phase.js` load-bearing control flow; validate JS with `check-workflow-syntax.sh`, not `node --check`; no `Date.now()` / `Math.random()`).
- **Four-corner subagent template**: `references/loop-3-development.md`.
- **Commit conventions**: SKILL.md "Commit conventions" — gate results as trailers; no AI/tooling mention. The numeric `fix(phaseN):` / `fix(phaseN-roundR):` grammar (`validate-commit-msg.sh:53`) is for **in-cycle L3 Phase** commits. These doc/reference repairs are committed with the **task-scoped** form the branch already uses: `fix(audit-2): Phase A — …` (matches `fix(audit-repair): …` on this branch; verified to pass `validate-commit-msg.sh`). Do **not** use `fix(phaseA): …` — the lint requires a numeric phase and would block it.

## 4. Data and Fixture Dependencies

- No test fixtures. The only new artifacts are two behavioral scenario files (`tests/scenarios/l1-clean-first-round-still-confirms.md`, `closeout-general-finding-deferred.md`), authored in this task. The behavioral gate reuses the existing fresh-subagent grading procedure (CLAUDE.md). No external systems.

## 5. Regression Protection

- After every Phase: `bash three-loop-workflow/references/check-consistency.sh` exits 0 and `bash three-loop-workflow/references/check-workflow-syntax.sh` is ok on both `l3-phase.js` and `review-panel.js`.
- Earlier-Phase acceptance greps must continue to hold (e.g. after Phase E, the Phase A `! grep -F 'verdict == "pass"'` still passes).
- The full `tests/scenarios/*.md` suite (13 files) must grade green at Phase E and again at F — including the 10 pre-existing scenarios and the Stage-1 `reasonable-default-escalates.md`, which guard tier / escalation / termination and must not regress under any edit in this task.
- `wc -w SKILL.md` ≤ 2888 must hold from Phase E onward (the only Phase touching `SKILL.md`).
