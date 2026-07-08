# Implementation: Verbatim-Evidence Standard for External/Technical Claims

```
Status: closed
Closing-commit: <CLOSING_SHA>
Closed-on: 2026-07-08
Deferred: none
```

Task slug: `2026-07-08-verbatim-evidence`
Design doc: `docs/design/2026-07-08-verbatim-evidence.md` (L1-closed, 4 rounds).

## Task Index

Maps to design Deliverables (§2) and ACs (§7):
- verbatim-evidence rule (authoring + review check) in loop-1-design.md → Deliverable 1; AC2.
- rationalization row in escalation-rules.md → Deliverable 2; AC3.
- fixture → Deliverable 3; AC4.
- gate: paired token `verbatim_evidence` + fixture → Deliverable 4; AC1.
- CLAUDE reconciliation → Deliverable 5; AC5.
- regression: l3-phase.js syntax gate → AC6.

## Phase Breakdown

Single atomic Phase (the `verbatim_evidence` paired token is green only once both reference files carry it).
TDD order: fixture + gate assertions first (failing spec), then the rule + rationalization row bring it green.

No unit-test suite. `<ACCEPT-CMD>`:
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
- the new `tests/scenarios/*.md` run via a fresh subagent → asserted `expected` holds

### Phase 1 — verbatim-evidence rule (loop-1-design.md + rationalization row + gate + fixture)

**Entry condition:** L1 closed (done).
**Design references:** design §2, §4 (D1/D2/D3), §7.

**Task list, in TDD order:**

1. **[test] Author the fixture** `tests/scenarios/l1-unevidenced-external-claim-needs-source.md`, forcing a
   discrete A/B/C choice. A design doc's Dependencies section states, **as confident settled fact with no
   source**, a plausible external/technical claim a decision rests on: *"The `PaymentClient.charge()` callback
   fires synchronously on the calling thread, so our retry wrapper is safe."* It is **confident, not hedged**
   (so it is not a silent-default dodge), reads as known, and a **rule-less reviewer accepts it**. Options:
   **(A)** accept it — it reads settled and plausible; **(B)** flag it and **demand the verbatim source** (the
   SDK signature/docs `file:line`, or a spike) before it can anchor the design — a confidently-stated external
   fact with no source is not evidence; **(C)** escalate it to the user as a decision. Correct = **(B)** →
   `expected: {"verbatim_evidence":"demand-source"}`. **Guard:** the discriminator is confident-vs-hedged (so it
   isn't caught by the silent-default check) and the *remedy* is demand-verbatim-source (not escalate, which is
   the silent-default/evidence_rule remedy) — do not reveal in the option text that the claim is false.
2. **[test] Add the gate assertions** to `check-consistency.sh`: a **new** `require "verbatim_evidence"
   "$SKILL/references/loop-1-design.md" "$SKILL/references/escalation-rules.md"` line, and register the fixture
   as a **separate labeled block** (own DRIFT message) inside the `[ -d tests/scenarios ]` guard.
   (Gate RED here — token absent from the two files.)
3. **[impl] Add the verbatim-evidence rule** to `references/loop-1-design.md` — an authoring rule near the
   section-4 / self-review-traps area **and** a matching L1 **review-template** check: an external/technical
   claim asserted as fact must carry its **verbatim `file:line` source** (or a spike-derived value with its
   source); a claim stated as settled fact with no verbatim backing — **confident or hedged** — is a **general**
   issue; **the L1 reviewer (fresh-eyes) owns the external/technical + load-bearing classification** (an author
   can't dodge by recasting an API-behavior claim as "intent"). Positive rule: *state the claim, then paste its
   source*. Carry the literal `verbatim_evidence`. Keep the prohibition positive-dominant (negation→positive).
4. **[impl] Add the rationalization row** to `references/escalation-rules.md` "Rationalizations": left = *"the
   API returns X / the callback is synchronous — I'll just state it"*; right → a confidently-stated
   external/technical fact is not evidence; paste the verbatim `file:line` source or **spike** it before
   asserting it as a design fact; distinct from the `evidence_rule` (whether to ask) and `spike_answer` (don't
   build the real thing) rows (positive rule dominant) (`verbatim_evidence`, loop-1-design.md).
5. **[impl] Reconcile CLAUDE.md** _common-commands_: add `verbatim_evidence` to the paired-token list and name
   the new fixture.

**Per-task acceptance command (whole Phase, from repo root):**
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (token paired across 2 files; fixture
  registered + present; SKILL.md `wc -w` unchanged; no regression).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0.
- greps: `verbatim_evidence` in loop-1-design.md + escalation-rules.md; a "verbatim" + "file:line" +
  "external"/"technical claim" phrase + a "reviewer"/"fresh-eyes" classification phrase in loop-1-design.md;
  CLAUDE.md names the fixture.
- The fixture runs via a fresh subagent → asserted `{"verbatim_evidence":"demand-source"}` holds.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; the fixture passes; SKILL.md `wc -w` unchanged (2880); `git diff`
touches only loop-1-design.md, escalation-rules.md, check-consistency.sh, CLAUDE.md, and the one new fixture
(trace test).

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (anti-bloat; zero SKILL.md edit; English; terminology
  consistent with the Evidence Rule / spike vocabulary).
- **Four-corner / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):`; `fix(phase1-roundR): <keyword>`.

## Data and Fixture Dependencies

- Reuse the forced-pick format from `tests/scenarios/l1-evidence-rule-lookup-not-ask.md`. One new fixture; no
  data files.

## Regression Protection

- Existing gate tokens + all fixtures remain green (new `require` + fixture block additive; do not alter
  existing lines or the `[ -d tests/scenarios ]` guard structure).
- The Evidence Rule / spike branch rows in escalation-rules.md + loop-1-design.md are unchanged (A2 composes,
  does not replace).
- `l3-phase.js` / `review-panel.js` / SKILL.md untouched — syntax + `wc -w` gates stay green.
