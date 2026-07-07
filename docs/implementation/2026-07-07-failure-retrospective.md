# Implementation: Failure Retrospective

```
Status: closed
Closing-commit: b42900a
Closed-on: 2026-07-07
Deferred: none
```

Task slug: `2026-07-07-failure-retrospective`
Design doc: `docs/design/2026-07-07-failure-retrospective.md` (L1-closed).

## Task Index

Maps to the design doc's Deliverables (§2, lines ~44–72) and Acceptance Criteria (§7, lines ~193–221):
- Reference file → Deliverable 1; ACs 3.
- escalation-rules.md hook → Deliverable 2; AC5.
- end-to-end-review.md step-6 hook → Deliverable 3; AC5.
- light-mode.md clause → Deliverable 4; AC5.
- check-consistency.sh (paired token + fixture existence) → Deliverable 5; ACs 1, 2.
- four fixtures → Deliverable 6; AC4.
- CLAUDE.md reconciliation → Deliverable 7; AC5.
- regression: l3-phase.js syntax gate → AC6.

## Phase Breakdown

This change is a single atomic Phase. Rationale (design §2, and L2 granularity rule): the consistency-gate
paired-token assertion cannot be green until the token exists in all four reference files, and the behavioral
fixtures cannot pass until the hooks exist — so the "test" surface (gate assertions + fixtures) and the
"implementation" surface (reference + hooks) must land together to leave the gates green at Phase end.
TDD order is preserved **within** the Phase: the failing spec (fixtures + gate assertions) is authored first,
then the reference/hooks bring it green.

This repo has **no unit-test suite** (CLAUDE.md _common-commands_). `<TEST-CMD>` ≙ the two gates + the
behavioral-scenario discipline. `<ACCEPT-CMD>` for this Phase:
- `bash three-loop-workflow/references/check-consistency.sh` → exits 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exits 0
- each new `tests/scenarios/*.md` fixture run via a fresh subagent → asserted `expected` holds

### Phase 1 — Failure-retrospective capability (reference + two hooks + Light clause + gate + four fixtures + CLAUDE reconciliation)

**Entry condition:** L1 design closed (done).

**Design document references:** `docs/design/2026-07-07-failure-retrospective.md` §2 (Deliverables), §4 (D1/D1b/
D2/D3/D4), §7 (ACs).

**Task list, in TDD order** (tests/specs before implementation):

1. **[test] Author the four behavioral fixtures** in `tests/scenarios/` — each a single concrete scenario with
   an `expected:` field asserted by **subset-match** (assert only the field(s) named in `expected`, not
   exact-JSON equality — the semantics the existing compound-`expected` `closeout-*.md` fixtures already rely
   on; the design's compound tokens in §2 are only assertable this way). Business invariant each protects:
   - `failure-retrospective-deadlock-taskdomain-triggers.md` — a round-cap deadlock, user keeps the deliverable
     (option b), the surviving failure is a task-domain class of bug → `expected: {"failure_retrospective":"triggered"}`. Protects: the deadlock-path trigger fires on a real domain class.
   - `failure-retrospective-skill-process-deadlock-skips.md` — a round-cap deadlock whose *only* cause is a
     skill-process gap (an unclear/missing SKILL rule), no surviving task-domain class → `expected: {"failure_retrospective":"skipped"}`. Protects: the **dedup boundary** (Meta-test path only; retrospective does not fire).
   - `failure-retrospective-severe-systemic-still-blocks.md` — F step-6 finds a **severe** systemic (non-local,
     blast-radius) cause → `expected: {"failure_retrospective":"triggered","closure":"blocked-pending-instance-fix"}`. Protects: **non-displacement** — the retrospective is additive; the severe instance-fix still blocks closure.
   - `failure-retrospective-loadbearing-prevention-defers.md` — retrospective triggered, but the designed
     prevention targets a load-bearing surface (`_engineering-norms_` / a skill rule) → `expected: {"failure_retrospective":"triggered","prevention_disposition":"deferred"}`. Protects: **no-smuggle** — a load-bearing prevention defers as a `finding`, never lands inline.
2. **[test] Add the gate assertions** to `three-loop-workflow/references/check-consistency.sh`:
   - a `require "failure_retrospective" "$SKILL/references/failure-retrospective.md" "$SKILL/references/escalation-rules.md" "$SKILL/references/end-to-end-review.md" "$SKILL/references/light-mode.md"` line (reference-only paired token; underscore literal, not path-satisfiable).
   - four `[ ! -f "tests/scenarios/<name>.md" ]` existence checks for the fixtures above, added as a
     **separate labeled loop/block** (its own comment header, e.g. `# Failure-retrospective behavioral
     fixtures — one per trigger/invariant …`, and its own DRIFT message, e.g. `DRIFT: missing
     failure-retrospective behavioral fixture tests/scenarios/$s.md`) placed **inside** the existing
     `if [ -d tests/scenarios ]; then … fi` guard. Do **not** fold them into the existing `for s in …`
     `closeout-*` loop — that loop's DRIFT message and comment are scoped to F-closeout fixtures and would
     mislabel a missing failure-retrospective fixture.
   (At this point the gate is RED — the token is absent from the four files and fixtures-as-behavior unproven. That is the intended failing spec.)
3. **[impl] Author `three-loop-workflow/references/failure-retrospective.md`** containing the literal anchors
   (AC3): `failure_retrospective`, `prevention_disposition`, `subject-partition`, `class-prevention`,
   `_load-bearing-docs_`, and the four fixture filenames. Content = design §4: the two-event systemic trigger
   (deadlock-return with a surviving task-domain class; F step-6 systemic/blast-radius cause), the
   subject-partition dedup rule (skip encoded as "task-domain class absent", never "Meta-test also fired"), the
   three-field record, the D1b landing operational test (`_load-bearing-docs_` surface → always defer; only a
   `tests/scenarios/` fixture may land inline, deadlock-path pre-review only), the emitted anchors + emission
   sites, the literal phrase **"additive"** (design Deliverable 1), and the fixture subset-match convention.
4. **[impl] Add the escalation-rules.md hook** at "Returning from escalation": scoped to a round-cap-deadlock
   return with a surviving task-domain class; states it is **additive** to the skill-process→repo-issue path;
   carries the literal `failure_retrospective`. Point to `references/failure-retrospective.md`.
5. **[impl] Add the end-to-end-review.md step-6 hook**: on a systemic (non-local, blast-radius) cause, run the
   retrospective, **additive** to severity routing (severe still blocks closure); carries `failure_retrospective`.
6. **[impl] Add the light-mode.md clause**: Light inherits the deadlock trigger via escalation-rules.md;
   F-systemic is Full-only; a Light-Mode deadlock whose surviving prevention is load-bearing defers as a
   `finding`; carries `failure_retrospective`.
7. **[impl] Reconcile CLAUDE.md** _common-commands_ gate description: name the new `failure_retrospective`
   paired token and the four new fixtures the gate asserts (project-doc reconciliation — the diff made the
   enumerated token/fixture list factually stale).

**Per-task acceptance command** (whole Phase, run from repo root):
- `bash three-loop-workflow/references/check-consistency.sh` → **exit 0** (token paired across 4 files; four
  fixture checks pass; word ceiling holds; no regression on existing tokens).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → **exit 0**.
- Portability spot-check: `grep -c failure_retrospective three-loop-workflow/references/end-to-end-review.md`
  returns ≥1 real hook occurrence, and the underscore token is confirmed absent from the hyphenated path string.
- Each of the four fixtures run via a fresh subagent against the modified skill → asserted `expected` holds.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; the four fixtures pass via fresh subagent; SKILL.md `wc -w`
unchanged (2878); `git diff` touches only: the new reference, the three hook files, check-consistency.sh,
CLAUDE.md, and the four new fixtures (Trace test — every changed line maps to a Deliverable).

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ role (anti-bloat binding on SKILL.md — here **zero**
  SKILL.md edit; net-neutral/negative preferred; skill files are English; terminology consistent with existing
  docs/design, docs/implementation, SKILL.md).
- **Four-corner subagent template / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):` opener; `fix(phase1-roundR): <keyword>`
  within-round fixes; no AI/model/tooling mention.

## Data and Fixture Dependencies

- Reuse the existing fixture style from `tests/scenarios/closeout-migration-unverified-blocks.md` (block-closure
  compound token) and `tests/scenarios/quickly-add-is-full.md` (single-token) — no new test infrastructure.
- Four new fixture files must be added (Deliverable 6). No data files, no external resources.

## Regression Protection

- **Existing consistency-gate tokens** must all still pass — the new `require` line is additive; do not alter
  existing `require` lines, the `[ -d tests/scenarios ]` guard structure, the `verdict == "pass"` guard, or the
  word-ceiling check.
- **Existing behavioral fixtures** (`tests/scenarios/*.md`, incl. the five `closeout-*`) remain valid — this
  change adds fixtures, does not modify existing skill behavior they assert.
- **`l3-phase.js` / `review-panel.js`** untouched — AC6 syntax gate must stay green.
- **SKILL.md** untouched — the `wc -w` ceiling check must stay green at 2878.
