# Implementation — v1.5 Wave 2: verify-don't-label + failure-handling depth

```
Status: closed (wave)
Phase-commits: fb52474 (Phase 1, Group C), b4f2bce (Phase 2, Group D)
Closed-on: 2026-06-15
PhaseEnd: Phase 1 14/14 ACCEPT-CMDs; Phase 2 14/14; both gates green; SKILL.md untouched (pinned f43d105)
Behavioral [B]: AC-W2-BEH-C1 PASS ({"flagged_missing_test":true}); AC-W2-BEH-C3 PASS ({"ran_whole_change_review":true,"flagged_cross_phase_defect":true})
```

**Slug:** `2026-06-15-skill-v1-5-wave-2-verify-failure` (matches the design doc)
**Design doc:** `docs/design/2026-06-15-skill-v1-5-wave-2-verify-failure.md`
**Umbrella:** `docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` (§3, §4b binding)

Executable by a fresh agent. "Tests" are grep/gate/structured-output assertions; TDD order = write the
acceptance grep, confirm it FAILS on the current file (watch-it-fail), edit, confirm it PASSES. All
new-content anchors verified absent from the baseline. **`SKILL.md` is not edited this wave** (Decision W2-1).

## 1. Task Index

| Phase | Design Deliverables | Acceptance |
|---|---|---|
| Phase 1 (Group C) | C1, C2, C3 | AC-C1, AC-C2, AC-C3, AC-W2-BEH-C1, AC-W2-BEH-C3 |
| Phase 2 (Group D) | D-i, D-ii, D-iii, D-iv | AC-D-i…D-iv |
| Both | global | AC-W2-G1 (consistency), AC-W2-G2 (workflow-syntax), AC-W2-G4 (SKILL.md unchanged), AC-W2-G5 (banned-import + ref count) |

Paths relative to repo root; skill under `three-loop-workflow/`.

## 2. Phase Breakdown

### Phase 1 — Group C (verify, don't label)

**Entry:** Wave 1 merged (`f43d105`); gates green.
**Design refs:** design §2 Group C; umbrella §4b-1 (reviewer reads the prompt, not the role table), §4b-9 (C3).

**Tasks (TDD order):**
- **T-C1 (test):** `grep "watched each new test fail" l3-phase.js` 0→1; `grep "no corresponding new test"` 0→1 in BOTH `l3-phase.js` and `loop-3-development.md`.
- **I-C1a:** In `three-loop-workflow/references/l3-phase.js`, extend the **dev** prompt (the string beginning `You are the dev subagent for ${phaseLabel}.`) by appending one sentence before its closing backtick: `" For each new behavior, write its test FIRST and run it to confirm it FAILS for the right reason (feature missing, not a typo/import error) before writing code; note in your summary that you watched each new test fail."` Keep valid JS string concatenation; run `check-workflow-syntax.sh` after.
- **I-C1b-i:** In `three-loop-workflow/references/l3-phase.js`, extend the **review** prompt (the `reviewPrompt` string; it already ends with the Wave-1 trip-wire line) by appending: `" For new behavior, confirm a corresponding new test precedes/accompanies the production change (use the git log you already ran) — a body of new production code with no corresponding new test is a severe Goal-Driven Execution issue."` Run `check-workflow-syntax.sh` after.
- **I-C1b-ii:** In `three-loop-workflow/references/loop-3-development.md`, append to the **step-2 review role Input cell** (role-responsibilities table): `"; confirm test changes precede/accompany production changes for new behavior — a body of new production code with no corresponding new test is a severe Goal-Driven Execution issue"`.
- **T-C2 (test):** `grep "THIS closing run" loop-3-development.md` 0→1; `grep "captured in this closeout step" end-to-end-review.md` 0→1.
- **I-C2a:** In `three-loop-workflow/references/loop-3-development.md` "Main agent constraints", append to the end-of-Phase PhaseEnd bullet: `" The pasted exit codes and tally must come from THIS closing run; a recalled tally or the accept subagent's earlier report is not sufficient — re-run fresh and record this run's output."`
- **I-C2b:** In `three-loop-workflow/references/end-to-end-review.md` **Checklist step 2** (the `<TEST-CMD>`/`<ACCEPT-CMD>` run+paste item), append: `" The result summary must be captured in this closeout step; a prior run or the accept subagent's report is not sufficient."`
- **T-C3 (test):** in `end-to-end-review.md` 0→1 for each of: `"whole-change"`, `"runs on the default"`, `"one bounded fix round"`, `"blocks closure"` (the unique anchors — NOT `ReviewVerdict`, which pre-exists); `schemas.md` 0→1 for the EER-correctness-reuse note.
- **I-C3:** In `three-loop-workflow/references/end-to-end-review.md`, add a NEW Checklist item (place it **before** step 5 "Consolidate task documents", renumbering subsequent steps, OR insert as step "4b" if renumbering is risky — the dev chooses the least-churn placement and the L3 reviewer checks numbering is consistent):

  ```markdown
  N. **Fresh-eyes whole-change correctness review (default — always runs).** Spawn a fresh non-author
     subagent to read `git diff <first-phase-base>..HEAD` (the first Phase's base sha, recoverable from
     `git log`) against the design Deliverables + Acceptance Criteria. Scope: (a) every Deliverable is
     actually implemented (not just ticked), (b) no cross-phase regression or interface mismatch between
     Phases, (c) no scope creep beyond the design. Emit `ReviewVerdict` (`references/schemas.md`). A severe
     finding routes to **one bounded fix round, then escalate** (there is no per-Phase round counter at
     closeout) and **blocks closure** — author confidence does not substitute. This step **runs on the
     default single-agent path even when no panel/teams slot exists**; if the optional L3 panel or teams
     mode-2 already reviewed the assembled diff this task, that satisfies this step (folding in is an
     optimization, not a precondition). It is distinct from the conditional behavior-verification step
     (step 3): that checks observed app behavior; this checks the diff against Deliverables.
  ```
  Then in `three-loop-workflow/references/schemas.md`, add one line under the `ReviewVerdict` section: `"> The F / EER closeout fresh-eyes whole-change correctness review (see end-to-end-review.md) reuses this same ReviewVerdict schema."`

**Phase-1 ACCEPT-CMD** (all exit 0):
```bash
cd three-loop-workflow
# C1
grep -q "watched each new test fail" references/l3-phase.js
grep -q "no corresponding new test" references/l3-phase.js
grep -q "no corresponding new test" references/loop-3-development.md
# C2
grep -q "THIS closing run" references/loop-3-development.md
grep -q "captured in this closeout step" references/end-to-end-review.md
# C3
grep -q "whole-change" references/end-to-end-review.md
grep -q "runs on the default" references/end-to-end-review.md
grep -q "one bounded fix round" references/end-to-end-review.md
grep -q "blocks closure" references/end-to-end-review.md
grep -q "reuses this same ReviewVerdict" references/schemas.md
# gates
bash references/check-consistency.sh
bash references/check-workflow-syntax.sh references/l3-phase.js
test "$(ls references/*.md | wc -l)" -eq 12
# anti-bloat: SKILL.md untouched this wave. Pinned to the pre-wave-2 base f43d105 (Wave 1 closeout tip).
# Exit 0 iff NO commit in f43d105..HEAD touched SKILL.md (run from repo root, not inside three-loop-workflow/).
( cd .. && ! git log --oneline f43d105..HEAD -- three-loop-workflow/SKILL.md | grep . )
```
> The SKILL.md-untouched check is pinned to `f43d105` (the pre-wave-2 tip), so it measures only the wave-2
> delta and cannot false-pass after a commit (a committed SKILL.md edit appears in `git log` and trips the
> `! … | grep .`). Do NOT use a working-tree-only `git diff` form — it goes empty after commit and false-passes.

**Exit:** Phase-1 ACCEPT-CMDs exit 0; both [B] scenarios (below) pass at EER closeout.

### Phase 2 — Group D (failure-handling depth)

**Entry:** Phase 1 committed and green.
**Design refs:** design §2 Group D; umbrella guardrails (no 4-phase scaffold, no new verdict state).

**Tasks (TDD order):**
- **T-D-i (test):** `grep "root cause" l3-phase.js` 0→1 (both fix prompts); `grep "cause, not the symptom"` 0→1 in `l3-phase.js` and `loop-3-development.md`.
- **I-D-i:** In `three-loop-workflow/references/l3-phase.js`, prepend to BOTH fix prompts (the review-fix string `You are the fix subagent for ${phaseLabel} review round` and the accept-fix string `You are the fix subagent for ${phaseLabel} accept round`): `"Before editing, state the root cause of each item ('X is caused by Y'); make the smallest change that addresses the cause, not the symptom; one cause at a time. "`. In `three-loop-workflow/references/loop-3-development.md`: (a) role-table step-4 fix **Input** cell append "; each item prefixed by a one-line root cause ('item X is caused by Y')"; (b) add one sentence after the role-responsibilities table: "Fix corner is debugging, not patching: name the root cause of each failing item before editing and change that cause, one at a time. If a failing item has no identifiable cause after investigation, escalate via the design-conflict / escalation path — do not ship a guess."
- **T-D-ii (test):** `grep "reproduces it"` 0→1 in `l3-phase.js` and `loop-3-development.md`; `grep "red→green"` 0→1.
- **I-D-ii:** In `three-loop-workflow/references/l3-phase.js`, add to BOTH fix prompts: `"If a failing item is a correctness/behavior bug, write a failing test that reproduces it before fixing (red→green); a style/scope/comment finding needs no test."` (On the accept-fix prompt, phrase so it does not imply a redundant test when the failing item is already a failing ACCEPT-CMD test — e.g. "...unless the failing item is itself the reproducing test.") In `three-loop-workflow/references/loop-3-development.md` role-table step-4 fix **Output** cell, append: "; for a correctness/behavior finding (not style/scope/comment): add a failing test that reproduces it first, then fix to green (red→green)".
- **T-D-iii (test):** `grep "architectural/decomposition defect" escalation-rules.md` 0→1; `grep "option (a) the recommended default"` 0→1.
- **I-D-iii:** In `three-loop-workflow/references/escalation-rules.md` "Round-cap exhaustion" deadlock procedure, after step 1's bullets, add: "Pattern check: if a different item failed each round, or fix scope grew each round, the cap is firing on an architectural/decomposition defect — not a local bug. Name the likely source (L1 design or L2 phase split) and make option (a) the recommended default per the existing L3→L1/L2 rollback routing. When per-round failures are stable and local, leave the three options flat."
- **T-D-iv (test):** `grep "Evidence of where it breaks" escalation-rules.md` 0→1.
- **I-D-iv:** In `three-loop-workflow/references/escalation-rules.md` deadlock-report list (step 1), add a bullet: "**Evidence of where it breaks** — for each unresolved item, the failing acceptance command or reviewer-cited symptom (with its actual output) and the file/layer/value where expected and actual diverge. 'It keeps failing' is a story, not evidence."

**Phase-2 ACCEPT-CMD** (all exit 0):
```bash
cd three-loop-workflow
grep -q "root cause" references/l3-phase.js
grep -q "cause, not the symptom" references/l3-phase.js          # the l3-phase.js fix prompts (I-D-i)
grep -q "change that cause" references/loop-3-development.md     # the loop-3 post-table sentence (I-D-i): "...change that cause, one at a time."
grep -q "reproduces it" references/l3-phase.js
grep -q "reproduces it" references/loop-3-development.md
grep -q "red→green" references/l3-phase.js
grep -q "architectural/decomposition defect" references/escalation-rules.md
grep -q "option (a) the recommended default" references/escalation-rules.md
grep -q "Evidence of where it breaks" references/escalation-rules.md
bash references/check-consistency.sh
bash references/check-workflow-syntax.sh references/l3-phase.js
test "$(ls references/*.md | wc -l)" -eq 12
! grep -rq "delete the implementation and restart" .
# anti-bloat: SKILL.md still untouched across the whole wave (pinned to pre-wave-2 base f43d105)
( cd .. && ! git log --oneline f43d105..HEAD -- three-loop-workflow/SKILL.md | grep . )
```
> Anchors are file-scoped: the `l3-phase.js` fix prompts use "cause, not the symptom" (I-D-i), while the
> `loop-3-development.md` post-table sentence uses "change that cause" — each grep targets the exact phrase
> its file receives, so both are discriminating and the doc is internally consistent.

**Exit:** Phase-2 ACCEPT-CMDs exit 0.

### Behavioral [B] — at EER closeout (structured output, umbrella §4b-3)

- **AC-W2-BEH-C1:** fresh subagent given the post-edit `l3-phase.js` review prompt + a synthetic Phase diff that ADDS production code (a new function/branch) with NO new test, summary claiming "tests pass". Acting as reviewer, emit `{"flagged_missing_test": bool}`. **Pass = true.**
- **AC-W2-BEH-C3:** fresh subagent given the C3 step text + a synthetic assembled diff where Phase A and Phase B are each internally fine but mismatch at their interface (e.g. A renames a field, B still reads the old name). Acting as the EER correctness reviewer, emit `{"ran_whole_change_review": bool, "flagged_cross_phase_defect": bool}`. **Pass = both true.**

## 3. Engineering Constraints Index

- Norms: CLAUDE.md _engineering-norms_; English (_language-policy_).
- L3 four-corner / execution: `references/loop-3-development.md` / `loop-3-workflow.md`. **L3 review corner runs the calibrated panel** (the Wave-1 runner pattern: per-corner params baked in, E-iii calibration line in the review prompt; `args` does not propagate via `scriptPath`).
- Commit conventions: `feat(phase1):` / `feat(phase2):`; within-round fixes `fix(phaseN-roundR): <keyword>`; gate results as trailers; no AI/tooling mention.
- After any `l3-phase.js` edit: `check-workflow-syntax.sh`, never `node --check`.

## 4. Data and Fixture Dependencies

- No committed fixtures. The two [B] scenarios use ad-hoc synthetic diffs built by the closeout subagent (the standing `tests/scenarios/` suite is Wave 3).
- Reuses gates `check-consistency.sh`, `check-workflow-syntax.sh`.

## 5. Regression Protection

- `check-consistency.sh` green every Phase (AC-W2-G1).
- `check-workflow-syntax.sh references/l3-phase.js` green after every `l3-phase.js` edit (AC-W2-G2) — C1 and D edits are prompt-string content only (no control-flow change).
- `SKILL.md` unchanged this wave (AC-W2-G4); reference `.md` count stays 12.
- The Wave-1 additions (rationalization table, B2 trip-wires, operating rule) must remain intact — none of the Wave-2 edit sites overlap them except the `l3-phase.js` review prompt, which only GAINS the C1(b-i) clause after the existing trip-wire (append, not replace).
