# Implementation: L3 Handoff Footgun + Termination-Mechanic Fixtures

```
Status: closed
Closing-commit: 389520c
Closed-on: 2026-07-08
Deferred: none
```

Task slug: `2026-07-07-l3-runner-correctness`
Design doc: `docs/design/2026-07-07-l3-runner-correctness.md` (L1-closed, 4 rounds).

## Task Index

Maps to design Deliverables (§2) and ACs (§7):
- F3 dev-prompt `checkout -b` (l3-phase.js) + Invocation record-branch + merge step (loop-3-workflow.md) →
  Deliverable 1; AC1, AC3.
- 2 fixtures → Deliverable 2; AC5.
- check-consistency.sh fixture registration → Deliverable 3; AC2.
- CLAUDE.md reconciliation → Deliverable 4; AC4.
- regression: review-panel.js syntax gate → AC6.

## Phase Breakdown

Single atomic Phase (all edits are doc/string/fixture; no control flow). TDD order within the Phase: author the
fixtures + gate registration first (failing spec — the gate DRIFT-fails until the fixtures exist), then the F3
prose edits. `l3-phase.js`'s only change is the dev-prompt string literal.

No unit-test suite (CLAUDE.md _common-commands_). `<ACCEPT-CMD>`:
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/review-panel.js` → exit 0
- each new `tests/scenarios/*.md` run via a fresh subagent → asserted `expected` holds

### Phase 1 — F3 handoff + 2 termination fixtures

**Entry condition:** L1 closed (done).
**Design references:** design §2 (Deliverables), §4 (D1/D2), §7 (ACs).

**Task list, in TDD order:**

1. **[test] Author the two fixtures** (`tests/scenarios/`), each forcing a discrete A/B/C choice (mirror
   `quickly-add-is-full.md`), each stating inline why a rule-less agent could pick wrong:
   - `l3-round-cap-deadlock-escalates.md` — an L3 Phase's round-3 review still reports an unresolved **severe**;
     the tempting move is a quiet "one more fix round". Correct = compose a deadlock report and **escalate to
     the user** (never a silent round 4). `expected: {"action":"escalate-deadlock"}`.
   - `l3-clean-first-round-closes-in-one.md` — an L3 Phase's **first** review is fully clean (zero severe, zero
     general) and **no fix was applied**; the tempting move is to demand a second confirming round (the strict
     two-generation habit). Correct = the Phase **closes in one round** (the L3 clean-first-round relaxation).
     `expected: {"closes_this_round":true}`. (State that this is L3-with-no-fix — the relaxation's exact
     precondition — so it does not read as the L1 strict case.)
2. **[test] Register the two fixtures** in `check-consistency.sh` as a **separate labeled block** (own comment +
   own DRIFT message `DRIFT: missing L3 termination behavioral fixture …`) **inside** the `[ -d tests/scenarios ]`
   guard. Do not fold into the closeout / failure-retrospective / evidence-rule / authoring-craft loops.
   (Gate is RED here — fixtures don't exist yet. Intended failing spec — actually the `-f` check fails until
   step 1's files exist; author step 1 first so this passes.)
3. **[impl] F3(a) — dev-prompt `checkout -b`.** In `l3-phase.js` devPrompt (the string at `:139-156`), add:
   after capturing `baseSha`, instruct the dev to `git checkout -b <branch>` off that `baseSha` before editing
   (so the integration branch stays at `baseSha`). Edit the **string literal only**; do not touch control flow.
4. **[impl] F3(b) — Invocation record-branch step.** In `loop-3-workflow.md` "Invocation" section (`:14-27`),
   add a step: the main agent records its current branch name before invoking the Workflow (that is the
   integration branch — it is not returned in `DevResult`, and HEAD moves to the dev branch during the run).
5. **[impl] F3(c) — merge-step checkout.** In `loop-3-workflow.md` merge step (`:78-82`), instruct the main
   agent to `git checkout <recorded-integration-branch>` (not a positional `git checkout -`) **before**
   `git merge --ff-only <result.branch>`.
6. **[impl] Reconcile CLAUDE.md** _common-commands_ gate description: name the two new fixtures.

**Per-task acceptance command (whole Phase, from repo root):**
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (2 fixtures registered + present; word
  ceiling holds; no regression on existing tokens/fixtures).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0.
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/review-panel.js` → exit 0.
- `grep -q "checkout -b" three-loop-workflow/references/l3-phase.js` and greps for the Invocation record-branch
  step + the merge-step checkout in `loop-3-workflow.md` all succeed.
- Both fixtures run via a fresh subagent → asserted `expected` holds.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; both fixtures pass; SKILL.md `wc -w` unchanged (2878); `git diff`
touches only l3-phase.js (dev-prompt string), loop-3-workflow.md, check-consistency.sh, CLAUDE.md, and the two
new fixtures (trace test).

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (anti-bloat; zero SKILL.md edit; English; terminology
  consistent with docs/design + SKILL.md). The JS scripts are plain JavaScript — validate with
  `check-workflow-syntax.sh`, not `node --check`; preserve `l3-phase.js`'s load-bearing control flow (only the
  dev-prompt string changes).
- **Four-corner / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):`; `fix(phase1-roundR): <keyword>`.

## Data and Fixture Dependencies

- Reuse the forced-pick format from `tests/scenarios/quickly-add-is-full.md`. Two new fixtures; no data files.

## Regression Protection

- Existing consistency-gate tokens + all existing fixtures remain green (new fixture block is additive; do not
  alter existing lines or the `[ -d tests/scenarios ]` guard structure).
- `l3-phase.js` review/accept loops, counters, two-generation, panel, schemas untouched — the syntax gate and
  the review-loop `git diff` (AC1) confirm it.
- `review-panel.js` / SKILL.md untouched — syntax + `wc -w` gates stay green.
