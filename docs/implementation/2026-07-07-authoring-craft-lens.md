# Implementation: Negation→Positive check for skill-self edits

```
Status: closed
Closing-commit: ce87529
Closed-on: 2026-07-07
Deferred: none
```

Task slug: `2026-07-07-authoring-craft-lens`
Design doc: `docs/design/2026-07-07-authoring-craft-lens.md` (L1-closed, 4 rounds).

## Task Index

Maps to design Deliverables (§2) and ACs (§7):
- negation→positive bullet in loop-1-design.md skill-self-edit branch → Deliverable 1; AC2.
- fixture → Deliverable 2; AC3.
- check-consistency.sh (single-file token + fixture existence) → Deliverable 3; AC1.
- CLAUDE.md reconciliation → Deliverable 4; AC4.
- regression: l3-phase.js syntax gate → AC5.

## Phase Breakdown

Single atomic Phase — the check + its token + the fixture land together (the single-file `require` is green
once the token is in `loop-1-design.md`; the fixture must exist for the guard check). TDD order within the
Phase: fixture + gate assertions first (failing spec), then the review-branch bullet brings it green.

No unit-test suite (CLAUDE.md _common-commands_). `<ACCEPT-CMD>`:
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
- the new `tests/scenarios/*.md` run via a fresh subagent → asserted `expected` holds

### Phase 1 — Negation→positive check (review-branch bullet + gate + fixture + CLAUDE reconciliation)

**Entry condition:** L1 closed (done).
**Design references:** design §2 (Deliverables), §4 (D1/D2/D3), §7 (ACs).

**Task list, in TDD order:**

1. **[test] Author the fixture** `tests/scenarios/skill-edit-bare-prohibition-flagged.md`, forcing an A/B/C
   discrete choice, constructed to make negation the **sole general finding** (design D2/AC3 + the two L1
   advisories):
   - The scenario: a proposed edit to the three-loop skill **adds a new reference-level development rule**
     phrased as a **bare prohibition** — use *"Never hardcode absolute filesystem paths in generated code"* —
     as a new bullet under an L3 development reference. Frame it as a **principle-category** rule (so it trips
     the skill-self-edit branch, which fires on the `principle` category) but **NOT** a literal expansion of
     the four fixed SKILL.md §0 core principles (that framing would invite the reviewer to reject it as
     out-of-scope — option C — instead of flagging the negation). Siting it at reference-level (not the
     always-loaded SKILL.md surface) also keeps anti-bloat `wc -w` from co-firing (L1 advisory #2).
   - The proposed edit **carries a before/after behavior demonstration** (so the branch's existing
     asserted-but-not-observed **severe** is satisfied), is a **new addition not a rewrite** (Surgical/trace
     silent), and covers a **domain no existing principle addresses** (portability — 0.1–0.4 silent; make the
     rule read as one three-loop could plausibly hold — L1 advisory #1).
   - Options: **(A)** accept the new prohibition rule as written; **(B)** flag that a bare prohibition drags the
     banned behavior into context and call for the positive rephrasing (*"Use relative paths or a configured
     base directory"*), keeping the prohibition only as a paired guardrail; **(C)** reject the rule as
     out-of-scope. Expected = **(B)** → `expected: {"negation_positive":"flag-and-rephrase"}`.
   - State inline **why a reviewer lacking the negation check would not produce the flag** (they read a valid,
     demonstrated new rule and accept it — option A), so the fixture is a red-failing regression guard.
2. **[test] Add the gate assertions** to `check-consistency.sh`:
   - `require "negation_positive" "$SKILL/references/loop-1-design.md"` (single-file presence token, placed
     after the `evidence_rule` block, with a source comment consistent with existing `require` blocks).
   - one `[ ! -f "tests/scenarios/skill-edit-bare-prohibition-flagged.md" ]` check as a **separate labeled
     block** (own comment + own DRIFT message `DRIFT: missing authoring-craft behavioral fixture …`) **inside**
     the `[ -d tests/scenarios ]` guard. Do not fold into the closeout / failure-retrospective / evidence-rule
     loops.
   (Gate is RED here — token absent from loop-1-design.md. Intended failing spec.)
3. **[impl] Add the negation→positive bullet** to the skill-self-edit branch of the L1 review template
   (`references/loop-1-design.md`, immediately after the existing "discipline-rule edit… asserted but never
   observed is a severe issue" bullet at lines 182-187): "Also apply the **negation→positive** check: a **new**
   rule phrased as a bare prohibition ('never X' / 'do not X') that names a target behavior expressible as a
   positive ('do Y') is a **general** issue — recommend the positive rephrasing; keep a prohibition **only** as
   a hard guardrail paired with the positive target (a bare ban half-reads as an instruction to do the banned
   thing)." Carry the literal token `negation_positive`.
4. **[impl] Reconcile CLAUDE.md** _common-commands_ gate description: name the new `negation_positive` token +
   the new fixture.

**Per-task acceptance command (whole Phase, from repo root):**
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (single-file token present; fixture check
  passes; word ceiling holds; no regression on existing tokens).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0.
- `grep -q negation_positive three-loop-workflow/references/loop-1-design.md` succeeds. (The `require` targets
  only loop-1-design.md, so no filename-substring concern applies here.)
- The fixture run via a fresh subagent → asserted `expected` holds.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; the fixture passes; SKILL.md `wc -w` unchanged (2878); `git diff`
touches only loop-1-design.md, check-consistency.sh, CLAUDE.md, and the one new fixture (trace test).

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (anti-bloat binding on SKILL.md — zero SKILL.md edit
  here; English; terminology consistent with docs/design + SKILL.md).
- **Four-corner / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):`; `fix(phase1-roundR): <keyword>`; no
  AI/model/tooling mention.

## Data and Fixture Dependencies

- Reuse the forced-pick format from `tests/scenarios/quickly-add-is-full.md` /
  `tests/scenarios/l1-evidence-rule-lookup-not-ask.md`. One new fixture; no data files.

## Regression Protection

- Existing consistency-gate tokens + fixtures remain green (new `require` + fixture block are additive; do not
  alter existing lines or the `[ -d tests/scenarios ]` guard structure).
- Existing L1 review template behavior unchanged except the additive bullet in the skill-self-edit branch.
- `l3-phase.js` / `review-panel.js` / L2 template / SKILL.md untouched — syntax + `wc -w` gates stay green.
