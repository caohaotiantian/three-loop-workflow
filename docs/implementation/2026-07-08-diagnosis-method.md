# Implementation: Diagnosis Method for the Fix Corner

```
Status: closed
Closing-commit: 734851d
Closed-on: 2026-07-08
Deferred: none
```

Task slug: `2026-07-08-diagnosis-method`
Design doc: `docs/design/2026-07-08-diagnosis-method.md` (L1-closed, 3 rounds).

## Task Index

Maps to design Deliverables (§2) and ACs (§7):
- fix-corner method (loop-3-development.md) → Deliverable 1; AC3.
- fix-prompt clause + `diagnosis_method` comment (l3-phase.js) → Deliverable 2; AC2.
- rationalization row (escalation-rules.md) → Deliverable 3; AC4.
- fixture → Deliverable 4; AC5.
- gate: paired token + fixture registration → Deliverable 5; AC1.
- CLAUDE reconciliation → Deliverable 6; AC6.
- regression: review-panel.js syntax gate → AC7.

## Phase Breakdown

Single atomic Phase (the paired token `diagnosis_method` is green only once all three reference files carry it,
so the method + prompts + rationalization land together). TDD order: fixture + gate assertions first (failing
spec), then the three prose/prompt edits bring it green.

No unit-test suite (CLAUDE.md _common-commands_). `<ACCEPT-CMD>`:
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/review-panel.js` → exit 0
- the new `tests/scenarios/*.md` run via a fresh subagent → asserted `expected` holds

### Phase 1 — diagnosis method (fix corner + 2 fix prompts + rationalization row + gate + fixture)

**Entry condition:** L1 closed (done).
**Design references:** design §2, §4 (D1/D2/D3), §7.

**Task list, in TDD order:**

1. **[test] Author the fixture** `tests/scenarios/fix-corner-ranks-hypotheses-not-first-theory.md`, forcing a
   discrete A/B/C choice. **Refutation construction (the load-bearing part):** a concrete non-obvious bug where
   the immediately-tempting theory **H1** is *refutable by one cheap observation and is WRONG*, and the real
   cause **H2** only surfaces if you run that discriminating observation. Example shape: a test fails; H1
   ("the assertion's expected value is stale") is tempting under a demo deadline, but one cheap check (print
   the actual computed value / read the upstream data) would show H1 predicts X while the observed value is Y →
   H1 refuted → H2 (the real upstream cause). Options: **(A)** declare the cause obvious, patch H1, move on
   (the deadline-pressured move) — produces an observably-wrong fix; **(B)** rank 3-5 falsifiable hypotheses
   and run the one discriminating observation that separates them → it refutes H1 and points at H2, then fix
   H2; **(C)** escalate immediately without investigating. Correct = **(B)** → `expected: {"diagnosis":
   "discriminate"}`. State inline: a rule-less agent on the pre-edit "state the root cause / smallest change"
   prompt plausibly picks A (patches H1); only the added method routes to B. **Fixture-authoring guard:** do
   NOT reveal in the presented option text that H1 is wrong / that patching it fails — H1 must read as the
   plausible, tempting fix; the discriminating outcome is *withheld* (it's what running the method reveals).
   Leaking H1's wrongness into the options makes B trivially correct and defeats discrimination.
2. **[test] Add the gate assertions** to `check-consistency.sh`: `require "diagnosis_method"
   "$SKILL/references/loop-3-development.md" "$SKILL/references/l3-phase.js" "$SKILL/references/escalation-rules.md"`
   (a comment notes it is carried in a JS comment in l3-phase.js, not the prompt prose), and register the
   fixture as a **separate labeled block** (own DRIFT message) inside the `[ -d tests/scenarios ]` guard.
   (Gate RED here — token absent from the three files.)
3. **[impl] Add the diagnosis method** to `references/loop-3-development.md` at the "Fix corner is debugging"
   paragraph (`:85`): after the existing "name the root cause … one at a time", add — *when the cause is not
   obvious after the repro (and do not cheaply declare it obvious to skip this)*: (1) generate **3-5 ranked
   falsifiable hypotheses** (each states a testable prediction; if you cannot state the prediction it is a
   vibe, not a hypothesis); (2) seek **discriminating evidence** — the observation that differs between the top
   hypotheses ("what would I see if H1 but not H2?") and lets evidence pick the cause. If no hypothesis
   survives its test, escalate (unchanged). Carry the literal `diagnosis_method`.
4. **[impl] Add the clause to both fix prompts** in `references/l3-phase.js` (review-fix ~`:240-247` and
   accept-fix ~`:282-289`): after "state the root cause of each item", add "if the cause is not obvious,
   generate 3-5 ranked falsifiable hypotheses and seek discriminating evidence before editing (do not anchor on
   the first plausible theory)". **Edit the string literals only.** Add a **JS comment** near the prompts
   carrying the literal `diagnosis_method` (not in the prompt prose). No control-flow change.
5. **[impl] Add the rationalization row** to `references/escalation-rules.md` "Rationalizations": left =
   *"the first theory that fits is the cause"*; right → single-hypothesis anchoring is the top debugging
   failure; generate 3-5 ranked **falsifiable** hypotheses and let **discriminating** evidence pick, not the
   first plausible fit; distinct from the "Quick patch now" row (that skips investigation; this stops at the
   first theory during it) (`diagnosis_method`, loop-3-development.md fix corner).
6. **[impl] Reconcile CLAUDE.md** _common-commands_ gate description: name the `diagnosis_method` paired token +
   the new fixture.

**Per-task acceptance command (whole Phase, from repo root):**
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (token paired across 3 files; fixture
  registered + present; SKILL.md `wc -w` unchanged; no regression).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
  (fix-prompt string + comment edits parse; review/accept loops + counters unchanged).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/review-panel.js` → exit 0.
- greps: `diagnosis_method` in all three reference files; `falsifiable` + `discriminating` in
  loop-3-development.md; the token is in a JS comment in l3-phase.js (not the prompt prose).
- The fixture runs via a fresh subagent → asserted `{"diagnosis":"discriminate"}` holds.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; the fixture passes; SKILL.md `wc -w` unchanged (2880); `git diff`
touches only loop-3-development.md, l3-phase.js (2 fix-prompt strings + 1 comment), escalation-rules.md,
check-consistency.sh, CLAUDE.md, and the one new fixture (trace test).

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (anti-bloat; zero SKILL.md edit; English; terminology
  consistent). The JS scripts are plain JavaScript — validate with `check-workflow-syntax.sh`, not `node
  --check`; preserve `l3-phase.js`'s load-bearing control flow (only the two fix-prompt strings + a comment change).
- **Four-corner / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):`; `fix(phase1-roundR): <keyword>`.

## Data and Fixture Dependencies

- Reuse the forced-pick format from `tests/scenarios/quickly-add-is-full.md`. One new fixture; no data files.

## Regression Protection

- Existing consistency-gate tokens + all fixtures remain green (new `require` + fixture block additive; do not
  alter existing lines or the `[ -d tests/scenarios ]` guard structure).
- `l3-phase.js` review/accept loops, counters, two-generation, panel, schemas untouched — syntax gate + the
  review-loop `git diff` confirm it. The existing red→green repro rule in the fix prompts is preserved (the
  method builds on it).
- `review-panel.js` / SKILL.md untouched — syntax + `wc -w` gates stay green.
