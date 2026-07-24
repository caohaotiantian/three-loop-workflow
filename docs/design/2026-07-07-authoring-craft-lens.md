# Design: Negation→Positive check for skill-self edits (the one non-duplicative craft rule)

```
Status: closed
Closing-commit: ce87529
Closed-on: 2026-07-07
Deferred: none  (backlog #3 meta-model doc, #4 leading-word sweep, #5 _Avoid_ guards, #1 in-place rewrite all
  dropped as duplicative/out-of-scope — see scope note; not issue-tracked deferrals)
```

Task slug: `2026-07-07-authoring-craft-lens`
Tier: **Full Mode** (edits the load-bearing three-loop skill: `references/loop-1-design.md`).
Provenance: Cycle 2 of `docs/analysis-2026-07-07-external-skills-comparison.md` (backlog #1 negation→positive).
Ported from mattpocock `writing-great-skills` (the negation failure mode).

> **Scope note (post-L1-round-1).** The initial draft imported a broad "craft lens" (a meta-model reference +
> three review checks: negation, no-op, synonym-drift + `_Avoid_` role guards + L2 wiring). L1 review proved
> **two of the three checks duplicate existing rules** — *no-op* ↔ Simplicity First 0.2 / trace test 0.3 /
> anti-bloat; *synonym-drift* ↔ the review templates' existing `[Language constraint]` (already severe and
> already gate-checked via the five role tokens) — and that the **L2 template has no skill-self-edit branch**
> to wire into. Per Simplicity First the design is reduced to the **one genuinely novel, non-duplicative,
> testable** piece: a **negation→positive** review check on the *existing* L1 skill-self-edit branch. The
> standalone meta-model doc and the duplicative checks are dropped (they were the reads-well-changes-nothing
> bloat the discipline rejects). Finding recorded: the craft layer is largely *already embodied* in the skill.

## 1. Background and Purpose

The external audit's headline recommendation was a "craft/human-factors layer." Rigorous L1 review revealed
that three-loop **already embodies** almost all of it — Simplicity First, the trace test, the anti-bloat
`wc -w` gate, and the terminology `[Language constraint]` cover no-op detection, sediment, and synonym drift.
The **one** craft rule with no existing analog is the **negation failure mode** (mattpocock
`writing-great-skills`): *"Steering by prohibition… drags the forbidden behaviour into context and makes it
more available, not less… the ban half-reads as an instruction to do the thing."* The cure is to **prompt the
positive** — state the target behavior — keeping a prohibition only as a hard guardrail *paired with* the
positive target.

This skill is **prohibition-dense**, and it is **self-hosted** (every edit to it runs through its own L1
review). The L1 review template already has a *skill-self-edit branch* (`loop-1-design.md` lines 182-187) that
fires when the artifact under review is a discipline-rule edit to the three-loop skill — but that branch has
**no craft check**, so a skill edit can add a new bare prohibition (the counterproductive pattern) and pass.
This design adds exactly one check there.

If we do not do this: the skill keeps accreting bare prohibitions, each making its banned behavior *more*
available to the reading agent — a slow, measurable erosion of the skill's own steering quality.

## 2. Deliverables

- [ ] **Negation→positive check** added to the *existing* skill-self-edit branch of the L1 review template
      (`references/loop-1-design.md`, the bullet at lines 182-187): when the artifact is a discipline-rule edit
      to the three-loop skill, also check whether it **adds a new rule phrased as a bare prohibition** ("never
      X" / "do not X") that could instead be a **positive target** ("do Y"). A new bare prohibition that names
      a target behavior expressible positively is a **general** issue — recommend the positive rephrasing,
      keeping a prohibition **only** as a hard guardrail paired with the positive target. Carries the literal
      token `negation_positive`.
- [ ] Behavioral fixture `tests/scenarios/skill-edit-bare-prohibition-flagged.md` — a skill-self edit that
      **adds a new reference-level rule** (a *principle*-category edit that fires the skill-self-edit branch,
      **not** a literal expansion of the four fixed SKILL.md §0 core principles) phrased
      as a bare prohibition, constructed to isolate the negation check on **all three** confounds: (i) it is a
      **new addition, not a rewrite** (Surgical/trace stay silent); (ii) it has **no semantic overlap with any
      existing principle** (0.1–0.4 stay silent) — e.g. a portability rule like *"Never hardcode absolute
      filesystem paths in generated code"*, a domain no existing principle covers; (iii) it **comes with a
      before/after behavior demonstration** (so the branch's *own* existing "asserted-but-not-observed" severe
      check is **satisfied**, leaving negation as the **sole general finding**). The L1 skill-self review must
      flag the bare prohibition and call for the positive rephrasing (e.g. *"Use relative paths or a configured
      base directory"*, keeping the prohibition only as a paired guardrail). Forced A/B/C discrete choice →
      `expected: {"negation_positive":"flag-and-rephrase"}`.
- [ ] `check-consistency.sh`: add a **single-file presence token** `negation_positive` required in
      `references/loop-1-design.md` (the check's sole home — like the existing single-file `five questions` /
      role-name tokens), and register the fixture for existence **inside the `[ -d tests/scenarios ]` guard**.
      The **fixture is the behavioral protection**: if the check is deleted from the L1 branch, a fresh
      reviewer would no longer raise the negation finding and the fixture's decision flips off
      `flag-and-rephrase` (a clean pass on that dimension) — a red-failing behavioral regression.
- [ ] CLAUDE.md _common-commands_ gate description reconciled to name the new token + fixture.

## 3. Scope Boundary (NOT in scope)

- **No standalone `authoring-principles.md` meta-model doc** — an on-demand reference whose predictability /
  two-loads / leading-word content drives no review branch is the reads-well-changes-nothing pattern the
  discipline rejects (L1-round-1 finding). The one actionable rule is inlined into the review branch.
- **No no-op check** (duplicates Simplicity First 0.2 + the trace test 0.3 + anti-bloat).
- **No synonym-drift check / `_Avoid_` role guards** (duplicates the existing `[Language constraint]`, which
  is already severe and already gate-checked via the five role tokens).
- **No L2 wiring** — the L2 review template has no skill-self-edit branch, and the L2 artifact (a task list) is
  not skill prose. Negation applies to prose, reviewed at L1 (whose skill-self-edit branch already demands the
  before/after wording, so the new prose is inspectable there). (No claim of a second L3 catch-point — the L3
  philosophy check has no negation lens; L1 is the sole home.)
- **No broad in-place negation→positive rewrite of existing skill prose** (backlog #1's rewrite pass) — a
  large, risky edit to protected prose; this design installs the *check that catches new ones*, deferring the
  historical-cleanup pass.
- **No SKILL.md surface change** — the check lives in `references/loop-1-design.md`. `wc -w` unchanged.
- **No new severity class**; the check maps to the existing general calibration.

## 4. Key Design Decisions

### D1 — One check on the existing L1 branch (vs a meta-model doc, vs multi-check lens, vs L2 too)
- **Problem:** how much of the audited craft layer earns a place, given most of it duplicates existing rules?
- **Options:** (a) the full lens (meta-model doc + negation + no-op + synonym + L2 wiring); (b) **only the
  negation check, inlined into the existing L1 skill-self-edit branch**; (c) negation check but in a new
  standalone reference doc.
- **Choice: (b).** Rationale: L1-round-1 proved (a)'s no-op/synonym checks duplicate existing rules and its L2
  branch does not exist; a multi-check lens with unobserved checks is the asserted-but-not-observed severe the
  discipline forbids. (c) reintroduces the reads-well-changes-nothing doc — a one-rule "reference" is bloat.
  (b) adds the single non-duplicative rule at the exact point it applies (the existing branch), fully
  instrumented by one fixture. Rejected (a): duplication + unobserved checks + nonexistent L2 branch; (c): doc
  bloat.

### D2 — Fixture constructed to isolate the negation check (three confounds, not one)
- **Problem:** the fixture must make **negation the sole general finding**, which means neutralizing *three*
  confounds a naive example trips: (i) rewriting an existing rule → Surgical/trace fire; (ii) an example that
  overlaps an existing principle (e.g. "no speculative config" ↔ 0.2) → a "drop-as-duplicate" outcome instead
  of `flag-and-rephrase`; (iii) an undemonstrated new rule → the branch's *own* "asserted-but-not-observed"
  **severe** co-fires, so negation is not the sole finding.
- **Choice:** the fixture is a **new principle addition** (fires the branch), on a **domain no existing
  principle covers** (0.1–0.4 stay silent → no drop-as-duplicate), **carrying a before/after demonstration**
  (the existing severe check is satisfied), phrased as a bare prohibition. With all three neutralized, the
  **only general finding** is negation → the decidable `flag-and-rephrase`. A reviewer lacking the negation
  check produces no such finding (clean on that dimension). Rejected alternatives: rewrite an existing rule
  (Surgical/trace confound); an overlapping/ undemonstrated new rule (drop-as-duplicate / severe confounds).

### D3 — Single-file token + fixture (vs a multi-site paired token)
- **Problem:** the check has exactly one home (the L1 branch); there is no second site to pair a token across.
- **Choice:** a **single-file presence token** `negation_positive` in `loop-1-design.md` (the established
  pattern for single-home clauses — `five questions`, the role names), with the **fixture as the real
  behavioral protection**. Rejected a forced multi-site pairing: it would require inventing a second site
  (e.g. a meta-model doc) whose only purpose is to satisfy the gate — bloat for the gate's sake.

## 5. Dependencies and Assumptions

- Depends on the existing L1 skill-self-edit branch (`loop-1-design.md` lines 182-187) and the behavioral-
  scenario discipline (no unit suite).
- Assumes `references/loop-1-design.md` is load-bearing (it is) so the check is protected by the full cycle.
- No `l3-phase.js` / `review-panel.js` / L2-template / SKILL.md change; no external systems.

## 6. Relationship with Existing Designs

- Extends the L1 review template's skill-self-edit branch (`loop-1-design.md`). Complements — does not
  duplicate — Simplicity First 0.2, the trace test 0.3, anti-bloat (`wc -w`), and the `[Language constraint]`
  (the L1-round-1 review confirmed the negation check is the one non-overlapping addition). Sibling to Cycle 3
  (`docs/design/2026-07-07-l1-review-sharpening.md`), which sharpened the same loop's pre-step B; no conflict.
  Terminology anchors: `SKILL.md` §0 principles, the audit report §3 (negation failure mode).

## 7. Acceptance Criteria (measurable / automatable)

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0 with a `require "negation_positive"` line
   for `references/loop-1-design.md` (grep the script) and the fixture existence-checked inside the
   `[ -d tests/scenarios ]` guard (line-range). SKILL.md `wc -w` unchanged (no SKILL.md edit).
2. `references/loop-1-design.md` skill-self-edit branch contains the literal `negation_positive` and the
   negation→positive check wording (a new bare prohibition expressible as a positive target is a general
   issue; keep prohibitions only as guardrails paired with the positive) — grep for `negation_positive`.
3. `tests/scenarios/skill-edit-bare-prohibition-flagged.md` exists, forces an A/B/C discrete choice with
   `expected: {"negation_positive":"flag-and-rephrase"}`, and is constructed so negation is the **sole general
   finding**: a new **principle-category** addition (fires the branch), on a domain **no existing principle
   covers** (0.1–0.4 silent), **carrying a before/after demonstration** (the branch's existing
   asserted-but-not-observed severe is satisfied). Runs green via a fresh subagent applying the skill.
4. CLAUDE.md names the new token + fixture (grep).
5. `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js`
   exits 0 (regression guard; untouched).

Quality budget: N/A — process/docs change to a skill; no user-facing behavior/hot-path/interface. Excluded.

## 8. Risks and Rollback

- **Risk: the check duplicates an existing rule (the Red-Flags / round-1 failure).** Mitigation: L1-round-1
  established negation→positive is the one non-duplicative craft rule; §3 enumerates exactly what was dropped
  as duplicative.
- **Risk: the fixture does not discriminate.** Mitigation: D2 constructs it as a new-rule addition so only the
  negation check fires; AC3 pins that construction.
- **Risk: a single-file token is weak protection.** Mitigation: D3 — the fixture is the behavioral protection;
  the token only guards against silent textual deletion, matching the established single-home-token pattern.
- **Rollback:** additive one review bullet + one fixture + gate lines. Revert the branch. Reversible.
