# Implementation: Spike/Experiment Branch of the Evidence Rule

```
Status: closed
Closing-commit: 9d3a9f3
Closed-on: 2026-07-08
Deferred: none
```

Task slug: `2026-07-08-spike-branch`
Design doc: `docs/design/2026-07-08-spike-branch.md` (L1-closed, 4 rounds).

## Task Index

Maps to design Deliverables (§2) and ACs (§7):
- spike branch in loop-1-design.md Evidence Rule → Deliverable 1; AC2.
- rationalization row in escalation-rules.md → Deliverable 2; AC3.
- fixture → Deliverable 3; AC4.
- gate: paired token `spike_answer` + fixture in the l1-evidence-rule loop → Deliverable 4; AC1.
- CLAUDE reconciliation (token + two→three count) → Deliverable 5; AC5.
- regression: l3-phase.js syntax gate → AC6.

## Phase Breakdown

Single atomic Phase (the `spike_answer` paired token is green only once both reference files carry it). TDD
order: fixture + gate assertions first (failing spec), then the spike branch + rationalization row bring it
green. **Add a NEW `require "spike_answer"` line — do not edit the existing `evidence_rule` require** (L1
execution note).

No unit-test suite. `<ACCEPT-CMD>`:
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
- the new `tests/scenarios/*.md` run via a fresh subagent → asserted `expected` holds

### Phase 1 — spike branch (Evidence Rule + rationalization row + gate + fixture)

**Entry condition:** L1 closed (done).
**Design references:** design §2, §4 (D1/D2/D3), §7.

**Task list, in TDD order:**

1. **[test] Author the fixture** `tests/scenarios/l1-evidence-rule-spike-runs-experiment.md`, forcing a discrete
   A/B/C/D choice. Scenario: at L1 you need to know a **measurable-by-running** fact — e.g. "does the vendor SDK
   **actually** support the streaming mode we need — the SDK docs are silent/ambiguous on it (documented ≠
   actual behavior), so it can only be settled by running a probe against it — which is neither a
   repo-answerable fact (nothing in *our* repo answers it, and it is not a "read the vendor docs" look-up
   either) nor a product/scope decision. Options: **(A)** assume it works and design around it (silent default); **(B)**
   escalate to the user (ask them if it's feasible); **(C)** run a **marked-throwaway spike** in an ephemeral
   worktree, record the answer + question in the design doc (§4/§5), delete the spike code, then design; **(D)**
   just start building the real streaming integration to see if it works. Correct = **(C)** → `expected:
   {"evidence_rule":"spike"}`. State inline why each wrong option is tempting (A=fast, B=feels like "ask
   don't assume", D="just build it"). **Guard:** the option text must not reveal which is correct beyond the
   routing logic; keep the family key `evidence_rule`.
2. **[test] Add the gate assertions** to `check-consistency.sh`: a **new** line `require "spike_answer"
   "$SKILL/references/loop-1-design.md" "$SKILL/references/escalation-rules.md"` (do not edit the existing
   `evidence_rule` require), and add `l1-evidence-rule-spike-runs-experiment` to the **existing**
   `for s in l1-evidence-rule-lookup-not-ask l1-evidence-rule-decision-still-escalates` loop.
   (Gate RED here — token absent from the two files.)
3. **[impl] Add the spike branch** to `references/loop-1-design.md` pre-step B, after the Evidence Rule bullet
   (`:44-54`): a new bullet for the **third category** (measurable-by-running → spike) with the three
   load-bearing bounds — (a) throwaway + **ephemeral isolated worktree, mechanically deleted** (reuse the
   `loop-3-development.md` "Isolated spawn procedure": `git worktree add` … `git worktree remove --force` +
   `rm -rf`); (b) **only durable output = the answer + question**, recorded in the design doc's **Key Design
   Decisions (§4)** or **Dependencies and Assumptions (§5)**; (c) **bounded to the question — the positive rule
   is *record the answer, then design*; not permission to start the deliverable; design still gates L3**. Add
   the zero-install fallback (runner degrades to a manual one-shot; **worktree isolation + delete still hold**).
   Carry the literal `spike_answer`. Keep the prohibition positive-dominant (negation→positive check).
4. **[impl] Add the rationalization row** to `references/escalation-rules.md` "Rationalizations": left =
   *"I'll just build the real thing to see if it works"*; right → a spike is throwaway; its **answer** (not its
   code) is the durable output, recorded in the design doc; **build the deliverable at L3, after design closes**
   (positive rule dominant) (`spike_answer`, loop-1-design.md Evidence Rule).
5. **[impl] Reconcile CLAUDE.md** _common-commands_: add `spike_answer` to the paired-token list, and change
   "the **two** `tests/scenarios/l1-evidence-rule-*.md` fixtures" → "**three**".

**Per-task acceptance command (whole Phase, from repo root):**
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (token paired across 2 files; fixture in
  the l1-evidence-rule loop + present; SKILL.md `wc -w` unchanged; no regression).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0.
- greps: `spike_answer` in loop-1-design.md + escalation-rules.md; `throwaway` + a `git worktree remove` /
  "deleted" clause + a "§4"/"§5" section-home phrase in loop-1-design.md; CLAUDE.md says "three".
- The fixture runs via a fresh subagent → asserted `{"evidence_rule":"spike"}` holds.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; the fixture passes; SKILL.md `wc -w` unchanged (2880); `git diff`
touches only loop-1-design.md, escalation-rules.md, check-consistency.sh, CLAUDE.md, and the one new fixture
(trace test).

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (anti-bloat; zero SKILL.md edit; English; terminology
  consistent — reuse the existing worktree machinery, do not re-author it).
- **Four-corner / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):`; `fix(phase1-roundR): <keyword>`.

## Data and Fixture Dependencies

- Reuse the forced-pick format from `tests/scenarios/l1-evidence-rule-lookup-not-ask.md` (same routing key
  `evidence_rule`). One new fixture; no data files.

## Regression Protection

- The two existing `l1-evidence-rule-*` fixtures stay green (a look-up fact is still look-up; a decision still
  escalates) — do not edit them. The new fixture is the third value of the same key.
- Existing gate tokens + fixtures remain green; the new `require` is additive; the l1-evidence-rule loop gains
  one entry (do not restructure the guard).
- `l3-phase.js` / `review-panel.js` / SKILL.md untouched — syntax + `wc -w` gates stay green.
