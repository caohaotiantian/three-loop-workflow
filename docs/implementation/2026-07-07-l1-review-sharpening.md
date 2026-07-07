# Implementation: L1 Evidence Rule

```
Status: closed
Closing-commit: <CLOSING_SHA>
Closed-on: 2026-07-07
Deferred: none
```

Task slug: `2026-07-07-l1-review-sharpening`
Design doc: `docs/design/2026-07-07-l1-review-sharpening.md` (L1-closed).

## Task Index

Maps to design Deliverables (§2) and ACs (§7):
- Evidence Rule clause in loop-1-design.md pre-step B → Deliverable 1; AC2.
- Rationalization-table row in escalation-rules.md → Deliverable 2; AC3.
- two fixtures → Deliverable 3; AC4.
- check-consistency.sh (paired token + fixture existence) → Deliverable 4; AC1.
- CLAUDE.md reconciliation → Deliverable 5; AC5.
- regression: l3-phase.js syntax gate → AC6.

## Phase Breakdown

Single atomic Phase — the `require "evidence_rule"` pairing is green only once **both** `loop-1-design.md`
and `escalation-rules.md` carry the token, so the clause + row + gate land together. TDD order within the
Phase: fixtures + gate assertions authored first (failing spec), then the two prose clauses bring it green.

No unit-test suite (CLAUDE.md _common-commands_). `<ACCEPT-CMD>`:
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
- each new `tests/scenarios/*.md` run via a fresh subagent → asserted `expected` holds

### Phase 1 — L1 Evidence Rule (clause + rationalization row + gate + two fixtures + CLAUDE reconciliation)

**Entry condition:** L1 closed (done).
**Design references:** design §2 (Deliverables), §4 (D1/D2/D3), §7 (ACs).

**Task list, in TDD order:**

1. **[test] Author the two fixtures** (`tests/scenarios/`), each forcing a discrete look-up-vs-escalate choice
   from an explicit A/B/C menu (mirroring `quickly-add-is-full.md`), and each stating **inline why a rule-less
   agent would plausibly err** (so the discriminating property is auditable — L1 advisory):
   - `l1-evidence-rule-lookup-not-ask.md` — an **escalation-tempting** question that is a repo-answerable fact
     (e.g. "what serializer does module X currently use?" — checkable by reading the code) → the agent looks it
     up. `expected: {"evidence_rule":"look-up"}`.
   - `l1-evidence-rule-decision-still-escalates.md` — a question **dressed as a fact** but actually a genuine
     product/scope decision the repo **cannot** answer (e.g. "should the new export default to CSV or JSON?" —
     a product preference no code settles) → the agent escalates, does not guess-and-call-it-a-fact.
     `expected: {"evidence_rule":"escalate"}`. Construct so a fresh subagent cannot plausibly argue the repo
     answers it (L1 advisory: genuinely repo-unanswerable).
2. **[test] Add the gate assertions** to `check-consistency.sh`:
   - `require "evidence_rule" "$SKILL/references/loop-1-design.md" "$SKILL/references/escalation-rules.md"`
     with a source/reference-site comment consistent with the existing `require` blocks (L1 advisory).
   - two `[ ! -f "tests/scenarios/<name>.md" ]` checks as a **separate labeled block** (own comment + own DRIFT
     message `DRIFT: missing L1 evidence-rule behavioral fixture …`) **inside** the `[ -d tests/scenarios ]`
     guard. Do not fold into the closeout or failure-retrospective loops.
   (Gate is RED here — token absent from the two source files. Intended failing spec.)
3. **[impl] Add the Evidence Rule clause** to `references/loop-1-design.md` "L1 pre-step B": before escalating a
   clarifying question, first answer it from the codebase + existing `docs/design/` + CLAUDE.md; a
   repo-answerable **fact** is looked up (not asked), only a genuine **product-intent / preference / scope /
   risk-tolerance decision the repo cannot answer** is escalated. Carry the literal `evidence_rule`. Cross-link
   to both `escalation-rules.md` "Question quality requirements" and the forbidden-deferral clause. Keep the
   wording distinct from pre-step A's Explore sweep (this is the *whether-to-ask fact/decision gate*, not
   "read the code") — L1 advisory.
4. **[impl] Add the Rationalization-table row** to `references/escalation-rules.md` "Rationalizations —
   recognize and stop": left cell *"I'll just look this up / the repo can answer this"*; right cell → a genuine
   product/scope/risk **decision** is not a repo-answerable fact; look up facts, escalate decisions
   (`evidence_rule`, loop-1-design.md pre-step B). Match the existing two-column row format.
5. **[impl] Reconcile CLAUDE.md** _common-commands_ gate description: name the new `evidence_rule` paired token
   and the two new fixtures.

**Per-task acceptance command (whole Phase, from repo root):**
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (token paired across the 2 files; 2
  fixture checks pass; word ceiling holds; no regression on existing tokens).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0.
- Portability: `grep -c evidence_rule three-loop-workflow/references/escalation-rules.md` ≥1; the underscore
  token is absent from the hyphenated fixture filenames. (Note: the fixtures' `expected:` lines contain the
  literal `evidence_rule`, but the `require` greps only the two source files, so fixture contents are not a
  paired site.)
- AC2 cross-links (grep loop-1-design.md): `grep -q "Question quality" three-loop-workflow/references/loop-1-design.md`
  and a grep for the forbidden-deferral cross-link both succeed.
- AC3 row key (grep escalation-rules.md): the new Rationalizations row is present — e.g.
  `grep -q "repo can answer" three-loop-workflow/references/escalation-rules.md` succeeds and the row carries
  `evidence_rule`.
- Both fixtures run via a fresh subagent → asserted `expected` holds.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; both fixtures pass; SKILL.md `wc -w` unchanged (2878); `git diff`
touches only loop-1-design.md, escalation-rules.md, check-consistency.sh, CLAUDE.md, and the two new fixtures
(trace test).

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (anti-bloat binding on SKILL.md — zero SKILL.md edit
  here; English; terminology consistent with docs/design + SKILL.md).
- **Four-corner / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):`; `fix(phase1-roundR): <keyword>`; no
  AI/model/tooling mention.

## Data and Fixture Dependencies

- Reuse the forced-pick format from `tests/scenarios/quickly-add-is-full.md`. Two new fixtures; no data files.

## Regression Protection

- Existing consistency-gate tokens + fixtures remain green (new `require` + fixture block are additive; do not
  alter existing lines or the `[ -d tests/scenarios ]` guard structure).
- Existing L1 behavior (pre-step B, review template) unchanged except the additive clause.
- `l3-phase.js` / `review-panel.js` untouched — syntax gate stays green. SKILL.md untouched — `wc -w` ceiling
  stays green at 2878.
