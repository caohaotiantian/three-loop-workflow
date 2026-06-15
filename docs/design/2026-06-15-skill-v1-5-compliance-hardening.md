# Design — three-loop-workflow v1.5: compliance-hardening from superpowers

```
Status: CLOSED (program) — all 3 waves complete; all 32 lessons shipped
Closed-on: 2026-06-15
Waves: Wave 1 = f43d105 (Groups A+B, 10 lessons); Wave 2 = 9636566 (Groups C+D, 7 lessons); Wave 3 = ace3452 (Groups E+F+G, 15 lessons). 10+7+15 = 32.
Branch: skill-v1.5-compliance-hardening (main untouched). SKILL.md v1.5.0; always-loaded surface net SHRANK (2888 → 2883 words).
Program closeout (this wave's EER): installed-copy sync verified identical; standing tests/scenarios/ suite 4/4 PASS; C3 whole-change correctness review PASS (0/0); all gates green.
Decomposition: the original single mega-cycle hit an L1 round-cap deadlock and was decomposed into 3 waves (§0) — which converged cleanly, validating the round cap.
Deferred: README.md / README-cn.md updates (§3) — the v1.5 changes do not invalidate their level of description.
```

**Slug:** `2026-06-15-skill-v1-5-compliance-hardening`
**Loop:** L1 (design) · revised after L1 panel round 1 (9 severe / 23 general addressed)
**Primary design input:** `docs/design/2026-06-15-superpowers-comparison.md` (the report — 32 vetted lessons
with line-accurate proposals, a greppable lesson-ID **Appendix**, and an explicit "do not import" list).

> This document is the *decision record*. The report is the evidence base. Where the report gives a
> "refined proposal," that text is the authoritative edit shape **unless** a Key Design Decision (§4)
> overrides it — and every override is stated as such in §4. Deliverables cite report lesson IDs from the
> report's Appendix (greppable); the §9 crosswalk maps all 32 lessons to deliverables so coverage is
> auditable.

## 0. Decomposition (decided 2026-06-15, after L1 escalation) — THIS IS NOW THE UMBRELLA DOC

The single-cycle plan below hit an L1 round-cap deadlock: a 30-deliverable / 7-phase / ~every-file
design doc surfaced a fresh batch of severe design-doc-rigor findings each round (round 1: 9 severe;
round 2: 9 *different* severe), so two-generation closure was unreachable within the 3-round cap. Per
v1.5's own `architectural-reframe-on-cap` lesson, *different item each round = a decomposition defect*.
Escalated to the user (`escalation-rules.md` round-cap procedure); **decision: decompose into waves**
(option a, revise-upstream). The user's directive ("for each task … until all finished with high
quality") is satisfied by shipping all 32 lessons across waves, each its own tight cycle.

**This document is now the UMBRELLA / program record** — it holds the shared scope boundary (§3),
cross-cutting decisions (§4, §4b), guardrails, and the all-32 coverage crosswalk (§9). **Each wave has
its own L1→L2→L3→F and its own design + implementation docs** (identical slug per wave); those wave docs
are authoritative for execution. The §2 grouping (A–G) and §7 ACs below are the source pool the wave docs
draw from.

| Wave | Deliverable groups | Own docs (slug) | Review posture |
|---|---|---|---|
| **Wave 1** | A (anti-summary) + B (one consolidated table) | `2026-06-15-skill-v1-5-wave-1-anti-summary-table` | L1/L2: single fresh reviewer (default); L3 skill edits: 4-voter panel |
| **Wave 2** | C (verify) + D (failure-handling) | `2026-06-15-skill-v1-5-wave-2-verify-failure` | same |
| **Wave 3** | E (ergonomics) + F (elicitation) + G (self-testing) | `2026-06-15-skill-v1-5-wave-3-ergonomics-elicitation-selftest` | same |

**Behavioral [B] items before Wave 3:** the persistent pressure-scenario suite (`G-i`) is formalized in
Wave 3. Waves 1–2 verify their few [B] items with an *ad-hoc* structured-output scenario at that wave's
EER closeout (see §4b correction 3); Wave 3 then promotes those into the standing `tests/scenarios/`
suite. (Wave 1 is in practice almost entirely structural — see the Wave 1 doc.)

## 4b. Cross-cutting corrections from L1 round 2 (apply to EVERY wave)

The L1 round-2 panel found nine severe design-rigor defects. They are corrected here once, and every
wave doc inherits these corrections:

1. **Decision 2 citation fix (S1/S7/G8/G18).** The justification for inlining reviewer-facing copies is
   **not** "the reviewer never reads schemas.md/escalation-rules.md." True basis: per `SKILL.md:32`
   role-isolation, the review subagent "receives only the artifact, the prompt template, and the linked
   design/impl docs"; `l3-phase.js` hands the reviewer only its prompt + the diff + design/impl docs and
   merely *points* it at `schemas.md` for the `ReviewVerdict` schema (not guaranteed to read prose tables
   there). So the **prompt is the only guaranteed-read surface** → operative copies of calibration
   (E-iii) and review trip-wires (B2) live in the prompt; `schemas.md`/`escalation-rules.md` hold the
   canonical copy.
2. **Naming collision fix (S5/S8).** Deliverable groups are **"Group A … Group G"** (never "Phase F").
   The workflow's closeout is always **"EER closeout"** / "End-to-End Review", never bare "F". L3
   per-phase numbering uses "Phase N".
3. **AC-BEH must be mechanical (S4/G5/G19).** A behavioral scenario is automatable only if the fresh
   subagent emits a **structured verdict** (small schema with a specific enum/boolean field, e.g.
   `{chosen_tier:"Full"|"Light", complied:bool}`) and the harness asserts the **field value** (field
   comparison, like `ReviewVerdict`). No "subagent judges free text." Each scenario declares its schema +
   the exact expected field value.
4. **Calibration must not relax the bar (S9).** The E-iii calibration sentence targets only
   **genuinely-misclassified** items ("a should-fix defect mis-marked severe"); it must **not** downgrade
   borderline blockers, and explicitly preserves the panel's ADD-only stance. Wording includes that guard
   (reconciles with §3 "never relaxes a bar").
5. **Measurable anti-bloat AC (S3).** Add a measurable budget as a real AC. The bloat-relevant metric for
   the always-loaded `SKILL.md` surface is **word count** (`wc -w`), not physical lines (a code-fenced line
   is several physical lines but few words). Each wave pins a `wc -w`-checkable cap on `SKILL.md` (Wave 1:
   `wc -w SKILL.md` ≤ baseline, since A1 deletes a ~40-word sentence) and reports the physical-line delta
   for transparency. Other touched files get a stated small line cap per wave.
6. **Drop the praise no-op guard (S2/G11).** The skill has no "Strengths/praise" section and never adds
   one; remove that guard from AC-G6. Keep only banned-import greps that **can** fire, anchored on
   imperative-import phrasing and verified to return 0 on the pre-edit baseline (AC-G7).
7. **Decision 6 gets real options (S6).** Each wave doc states its L2 phase split with the 1–2
   alternatives it rejected. The umbrella drops the false "§4 has no single-option entries" claim.
8. **E-vi token scope (G7).** The `models` override passes **all four corners**
   `models.{dev,review,accept,fix}`; the wiring-token grep checks all four. (Wave 3.)
9. **C3 severe-routing + default-path (G10/G17).** The EER-closeout correctness review (C3) is a
   **default-always** step (distinct from the *conditional* behavior-verify gate); a severe finding routes
   to a **single bounded fix round then escalate** (no per-Phase counter exists at closeout) and blocks
   closure. (Wave 2.)

Other round-2 generals folded in: every report-deviation is surfaced explicitly as an override
(G9/G12/G13/G14/G21 — Decision 2 overrides the report's `SKILL.md`/`schemas.md` table homes; Decision 3
overrides the report's `scenarios/` path); "four recommendations" softened to "repeatedly" (G20); version
bump keeps a one-line why-minor rationale (G15: minor = all additions backward-compatible, no
removal/break); AC-G6 also asserts `tests/scenarios/` lives at **repo root**, not under
`three-loop-workflow/` (G4); skip-clarifying content is delivered as a Forbidden **bullet**, not only a
table row (G2).

## 1. Background and Purpose

The three-loop-workflow skill enforces discipline **structurally** (numeric two-generation termination,
identity-bound fresh-reviewer isolation, round caps). The report (a 43-agent comparison with the
`superpowers` collection) found three blind spots, all in superpowers' **craft / human-factors layer**:

1. The skill **never names its rationalizations** — exactly one rationalization rebuttal exists in the
   whole skill, despite the skill existing because agents shortcut discipline under pressure.
2. The skill **violates its own anti-summary thesis** — its always-loaded `description` and the
   "Quick orientation" blockquote are paraphrasable procedure summaries (the shortcut trap superpowers
   documented empirically).
3. The skill **labels disciplines it never verifies** — TDD ("tests first") is unchecked; the main
   agent's closeout re-run is honor-system; F's "End-to-End Review" checks doc-consolidation fidelity,
   not whole-change correctness; and the skill has no behavioral test of its own claims.

**Purpose:** apply the report's vetted, anchored, low-bloat changes so the skill closes these gaps —
sharpening its goal without diluting it into a general-purpose library and without net prose growth on
the highest-leverage surfaces. **If we do not:** the always-loaded surface keeps letting agents
paraphrase the discipline past its load-bearing parts, and the gaps stay exploitable under pressure.

## 2. Deliverables

Grouped by the L2 phase (A–G = **7 phases**, §4 Decision 6) that will land them. Each item cites report
lesson ID(s) from the report Appendix. A checked box means the edit is present **and** its acceptance
criterion (§7) passes. Acceptance class per item: **[S]** = structural grep/gate; **[B]** = behavioral
(pressure-scenario gate at F, §4 Decision 4).

**Phase A — Anti-summary surface + tier calibration** (`SKILL.md`, `light-mode.md`)
- [ ] A1 **[S]** Delete the workflow-summary middle sentence of the `description`; keep trigger/skip keywords (`description-no-workflow-summary`).
- [ ] A2 **[S]** Replace the "Quick orientation" blockquote with an "Operating rule: execute from the reference files; read the routed reference in full; do not operate from a gist" directive (`demote-quick-orientation`).
- [ ] A3 **[S]** Add a ≤4-row "Looks Light, is actually Full" table to `light-mode.md`, reusing escalation trigger vocabulary verbatim (`tier-worked-examples`).
- [ ] A4 **[S]** Add a single code-fenced cap Iron-Law line **immediately above the A2 Operating-rule directive** (`imperative-iron-law-framing`). (A4/A2 reconciliation: the old blockquote is gone, so the report's "drop if redundant with the blockquote" no longer applies; the line stands alone above the Operating-rule directive.)

**Phase B — One consolidated rationalization / red-flag table** (`escalation-rules.md` canonical; inline reviewer subset in `l3-phase.js` + L1/L2 templates; pointers from `SKILL.md`, `loop-3-development.md`, `end-to-end-review.md`)
- [ ] B1 **[S]** ONE curated rationalization/red-flag table (≤9 rows, grouped by surface: tier · review/accept · fix/round-cap · escalation), homed in `escalation-rules.md` after "Forbidden" (§4 Decision 2). Rows are the **deduplicated union** of all table-lessons (`rationalization-table`, `rationalization-table-harvested-from-baseline`, `review-stage-rationalization-table`, `fix-corner-red-flags`, `design-elicitation-rationalization-row`, `tdd-rationalization-table`). Each Reality cell cites an existing clause. Must include the net-new row *"they said do it quickly / just add Y" → instructions say WHAT not HOW; terse phrasing is not a tier downgrade.*
- [ ] B2 **[S][B]** Inline the **review-relevant** trip-wire rows (genuinely-clean-first-round; read the diff not the dev summary; general issues block closure) into the `l3-phase.js` review prompt and the L1/L2 review templates — the surface the reviewer subagent actually reads (the reviewer never reads `escalation-rules.md`/`schemas.md`; see §4 Decision 2). Behavioral half checked by the review scenario at F.
- [ ] B3 **[S]** One-line pointers to the B1 table from `SKILL.md` (near Principle composition), `loop-3-development.md` (near the role table), and `end-to-end-review.md` (near the closure rule). No table duplication.

**Phase C — Verify, don't label** (`l3-phase.js`, `loop-3-development.md`, `end-to-end-review.md`, `SKILL.md`)
- [ ] C1 **[S][B]** TDD watch-it-fail: one sentence in the `l3-phase.js` dev prompt; review-Input gains "new production code with no corresponding new test is a severe Goal-Driven Execution issue" (`tdd-iron-law-l3`). Behavioral half: a scenario asserting an agent watches the test fail / the reviewer flags tests-after.
- [ ] C2 **[S]** Evidence-gated closeout: freshness qualifier appended at PhaseEnd (`loop-3-development.md`), F step 2 (`end-to-end-review.md`), SKILL §0.4 (`evidence-over-claims-phaseend`).
- [ ] C3 **[S][B]** Fresh-eyes whole-change correctness review as a **default** gated F step over `git diff <first-phase-base>..HEAD`, emitting ReviewVerdict, blocking closure; distinct from the existing behavior-verification step (that checks observed app behavior; this checks diff-vs-Deliverables). Folding into an existing panel/teams slot is an **optimization, not a precondition** — it runs on the default single-agent path when no such slot exists (`f-correctness-review`).

**Phase D — Failure-handling depth** (`loop-3-development.md`, `l3-phase.js`, `escalation-rules.md`)
- [ ] D-i **[S]** Root-cause gate in the fix corner (fix-role Input + both `l3-phase.js` fix prompts) (`root-cause-gate-fix-corner`).
- [ ] D-ii **[S]** Failing reproduction test for correctness/behavior fixes only (fix-role Output + both fix prompts) (`reproduction-test-for-fixes`).
- [ ] D-iii **[S]** Architectural-reframe clause in the deadlock procedure; rollback option (a) becomes the conditional default when failures mutate across rounds (`architectural-reframe-on-cap`).
- [ ] D-iv **[S]** Evidence-of-where-it-breaks bullet in the deadlock report (`diagnostic-deadlock-report`).

**Phase E — Dev/review ergonomics** (`schemas.md`, `l3-phase.js`, `loop-3-workflow.md`, `loop-3-development.md`, `loop-1-design.md`, `loop-2-implementation.md`)
- [ ] E-i **[S][B]** Dev status signal: add `concerns: string[]` + `blocked` boolean to DevResult/DEV_SCHEMA; in `l3-phase.js`, `blocked` → `dev-escalation` re-dispatch **bounded to at most one re-dispatch, then escalate** (§4 Decision 5); `concerns` → interpolate into the review prompt; one `loop-3-workflow.md` return-row (`dev-status-enum`). Keep `conflict` as-is.
- [ ] E-ii **[S]** Pre-handoff dev self-review pointer to §0.2/§0.3 with the "both run — does not replace fresh review" guard (`dev-self-review-before-handoff`).
- [ ] E-iii **[S]** Reviewer severity-calibration sentence inlined into the L1 template, L2 template, **and** the `l3-phase.js` review prompt (the surfaces the reviewer reads); a canonical copy documented in `schemas.md`; no praise section (`reviewer-calibration-clause`).
- [ ] E-iv **[S]** Three-tier severity sharpened in place in `schemas.md` ReviewVerdict descriptions + "when unsure, it's general" (`three-tier-severity`).
- [ ] E-v **[S]** "Verify by reading the diff" grounding line in each review template (`do-not-trust-report`).
- [ ] E-vi **[S]** Optional per-corner `models` override in `l3-phase.js` (undefined → harness default) + one Args row in `loop-3-workflow.md`; **plus** an optional "retry once with a stronger review/fix model" user-authorized clause in the deadlock options (`model-selection-by-fragility`).

**Phase F — Design/spec elicitation (L1/L2)** (`loop-1-design.md`, `loop-2-implementation.md`)
- [ ] F-i **[S]** Gated "Confirm intent before drafting" L1 pre-step (under-determined requests only; references escalation-rules.md for the question bar, does not restate) (`l1-elicitation-dialogue`).
- [ ] F-ii **[S]** Reframe "Common L1/L2 traps" into a free pre-spawn self-review gate (does not increment `{{round}}`; never substitutes for fresh review) (`l1-cheap-self-review-before-fresh-reviewer`).
- [ ] F-iii **[S]** L2 zero-context reader calibration sentence + placeholder-vagueness trap bullet (`l2-zero-context-reader-model`).
- [ ] F-iv **[S]** Multi-subsystem decomposition escalation signal in L1 procedure step 3 (`l1-scope-decomposition-precheck`).

**Phase G — Skill self-testing** (`tests/scenarios/`, `CLAUDE.md`, `check-consistency.sh`, `loop-3-development.md`, `escalation-rules.md`, `loop-1-design.md`)
- [ ] G-i **[B]** ~4 pressure scenarios under `tests/scenarios/` (§4 Decision 3): (1) "quickly add Y" that is actually Full → expects Full; (2) threshold decision under sunk-cost → expects escalation with options+recommendation+rationale; (3) clean review after a fix → expects no one-round close; (4) dev `blocked`/`concerns` → expects bounded re-dispatch/escalation, not silent success. Each file states its expected_behavior. This suite **is the [B] gate** for C1/C3/E-i (`pressure-scenario-suite-for-tier-and-escalation`).
- [ ] G-ii **[S]** CLAUDE.md _repo-workflow_ bullet: run `tests/scenarios/` via fresh subagents before merging any tier/escalation/termination edit (the obligation is now mechanically exercised at F closure, §7).
- [ ] G-iii **[S]** `check-consistency.sh` pairings for **exactly two** tokens — `clean-first-round` and `fixApplied` (`consolidate-termination-canonical`); the report's scope. No pairing for free-prose calibration sentences (§4 Decision 7 / not a stable token).
- [ ] G-iv **[S]** Watch-it-fail behavioral-check note for the skill's own discipline edits, in `loop-3-development.md` Phase-termination conditions, gated to skill-self discipline edits (`watch-it-fail-gate-for-skill-edits`).
- [ ] G-v **[S]** Meta-test classification bullet in the deadlock procedure (clear-but-ignored / doc gap / organization gap → follow-up issue) (`meta-test-on-cap-exhaustion-deadlock`).
- [ ] G-vi **[S]** Distrust-framing bullet for skill-edit reviews in the L1 review template (demand a behavior demonstration; an asserted-but-unobserved behavior rule is severe) (`adversarial-distrust-framing-in-maintenance-review`).

## 3. Scope Boundary (explicitly NOT in scope)

- **Not importing** (the report's guardrail table is binding): unconditional "every project needs a
  design" HARD-GATE; TDD-everywhere / delete-and-restart; the full 4-phase systematic-debugging
  scaffold; "acknowledge strengths" praise; any **new `references/*.md`** reference file; PANEL_ANGLES
  edits; append-the-table-forever instructions; per-section design approval loops; the visual companion.
- **No behavioral/semantic change to the existing discipline:** two-generation rule, round-cap value (3),
  identity isolation, and the existing termination math are unchanged. v1.5 only *hardens* — it never
  relaxes a bar. The one new control-flow path (E-i `blocked` re-dispatch) is **bounded** (§4 Decision 5)
  so it cannot become an uncounted retry loop outside the cap discipline.
- **No new external contract.** The `l3-phase.js` `models` arg and DevResult additions are
  backward-compatible (optional fields; undefined → existing behavior).
- **No rewrite of the report's body.** The report received only an additive greppable lesson-ID Appendix
  (required to make traceability mechanical); its analysis is unchanged.
- **No mass reflow / reformatting** of unedited prose (Surgical Changes).
- **Deferred (recorded, not silently dropped):** `README.md` / `README-cn.md` updates — the v1.5 changes
  do not invalidate their level of description; revisit if A1's description change makes them stale.
- **All 32 lessons are mapped to a deliverable** (§9 crosswalk); none is silently dropped. The L3 review
  corner may still reject an individual edit as *redundant with existing text*; such a drop is recorded
  in the impl doc Deprecated/Deferred section, never silent (§4 Decision 1).

## 4. Key Design Decisions

> Genuine multi-option decisions only. Forced/mechanical consequences are in §5, not here (so §4 contains
> no single-option entries — per the skill's own L1 bar).

**Decision 1 — Scope: which lessons ship.**
- Problem: 32 lessons (P0–P3); some P2/P3 flagged "drop if redundant."
- Options: (a) all 32; (b) P0–P1 only (report's recommended first cut); (c) P0–P2.
- **Choice: (a) all 32.** The user directive is explicit: *"keep working … until all of them being
  finished with high quality."* The report's refined proposals already pruned bloat; marginal items are
  ≤1–3 lines. **Rejected (b)/(c):** they under-deliver the directive. **Acknowledged tension** (report
  §7 recommends P0–P1 as the first cut to keep net size flat): mitigated by phased, independently
  committable edits (Phases A–G) and the anti-bloat acceptance guards (per-row line budgets; AC-G6
  file-count guard). **Guard:** a redundancy-drop at L3 is recorded, never silent.

**Decision 2 — Rationalization content: ONE consolidated table vs. surface-local tables.** *(This
overrides the round-1 draft, which chose three surface-local tables; the L1 panel correctly flagged that
as contradicting the report and resting on an unverifiable "zero-overlap" check.)*
- Problem: several table-shaped lessons target different surfaces (tier excuses; review/accept evasions;
  fix/round-cap excuses). Three separate tables (i) contradict the report's **four** explicit
  "one curated table, cross-referenced" recommendations, (ii) grow net prose on an anti-bloat skill
  (~15 rows across three tables vs ~9 curated), and (iii) require a "no row appears in two tables"
  guard that is a semantic judgment, not a grep.
- Options: (a) **one consolidated table** (`escalation-rules.md`) + inline reviewer subset where the
  reviewer actually reads + one-line pointers from other surfaces; (b) three surface-local tables;
  (c) one table in `SKILL.md`.
- **Choice: (a)**, adopting the report's repeated recommendation. The "point-of-temptation" goal that
  motivated (b) is met by the report's own **canonical-plus-inline** pattern (the same pattern E-iii uses
  for the calibration sentence): the *one* table is canonical in `escalation-rules.md`; the **review
  subagent never reads `escalation-rules.md` or `schemas.md`** (report lines 229-230; confirmed in
  `l3-phase.js` — the reviewer is handed only its prompt), so the review-relevant rows are **inlined into
  the review prompt/templates** (B2). One canonical table + a small inline subset where the blind agent
  reads is strictly less prose than three tables and removes the unverifiable overlap check. **Rejected
  (b):** more prose, contradicts the report, unverifiable guard. **Rejected (c):** SKILL.md is the
  always-loaded surface we are trying to *shrink*; the table belongs with the existing lone rationalization
  in `escalation-rules.md`.

**Decision 3 — Pressure-scenario location.**
- Problem: scenarios verify the skill's *behavior*; they are maintenance artifacts, not runtime.
- Options: (a) `three-loop-workflow/scenarios/` (ships in the skill zip — the zip command is
  `zip -r three-loop-workflow.skill three-loop-workflow/`, so anything under `three-loop-workflow/` ships);
  (b) **repo-root `tests/scenarios/`** (the zip command does not include repo-root `tests/`, so it is
  excluded from the shipped artifact).
- **Choice: (b)**, real rationale = **the zip-exclusion mechanic** keeps the shipped skill lean (token
  efficiency / Simplicity First) while the scenarios remain reachable by the CLAUDE.md _repo-workflow_
  runner. Consequence: `tests/` is outside `check-consistency.sh`'s traversal, so G-iii pairings guard the
  *skill clauses*, not the scenarios (the scenarios are guarded behaviorally at F instead). The new
  maintainer obligation (G-ii) is **not honor-system** — Decision 4 makes the suite a closure gate.

**Decision 4 — Acceptance for the "verify, don't label" deliverables (C1, C3, E-i) and discipline edits.**
- Problem: a presence-grep that the *instruction text exists* does not verify the *behavior* — and for
  this skill specifically, accepting verify-don't-label deliverables on label-presence alone would
  reproduce blind-spot #3 inside the very change meant to fix it. This repo has no JS test runner and
  `l3-phase.js` is a Workflow script (top-level `return`) that is not `require()`-able, so a unit test of
  its branches is not available.
- Options: (a) presence-grep only; (b) **presence-grep (structural) + a pressure-scenario behavioral gate
  run at F closure**; (c) build a bespoke JS harness for `l3-phase.js`.
- **Choice: (b).** Deliverables marked **[B]** must pass both their structural grep and the relevant
  `tests/scenarios/` scenario, executed by fresh subagents at F (§7 AC-BEH); a behavioral failure blocks
  closure. For `l3-phase.js` logic (E-i, E-vi) the structural half is syntax-green (AC-G2) **plus** greps
  for the specific wiring tokens (`dev-escalation`, `concerns`, `models.dev`/`models.review`), and the L3
  review corner reads the diff to confirm the branch fires on the right condition; the **no-runtime-test
  limitation is recorded** (AC-G2 note). **Rejected (a):** self-inconsistent with the skill's thesis.
  **Rejected (c):** disproportionate; the script is not unit-testable as written and the scenario gate
  covers the user-visible behavior.

**Decision 5 — Bound on the E-i `blocked` re-dispatch.**
- Problem: the dev step has no round counter (the counter starts at the review loop), so an unbounded
  `blocked → re-dispatch` path would be an uncounted retry surface outside the cap discipline.
- Options: (a) unbounded re-dispatch; (b) **at most one re-dispatch** (with added context / stronger
  model), then escalate via AskUserQuestion; (c) fold dev re-dispatch into the phase round counter.
- **Choice: (b).** One re-dispatch preserves the "supply context/better model, don't retry unchanged"
  intent while keeping a hard bound; further failure escalates. **Rejected (a):** violates the
  never-an-uncounted-retry principle. **Rejected (c):** conflates a pre-review dev escalation with the
  review/accept round budget; cleaner to bound it independently.

**Decision 6 — L2 phase structure.**
- The L2 phases track the **A–G deliverable groups (7 phases)**, not the report's 5 file-oriented phases.
  Rationale: the A–G grouping is by theme + risk and keeps each phase independently reviewable; same-file
  contention (e.g. `escalation-rules.md` edited by B/D/G) is handled by ordering and by the L3 dev corner
  re-reading the file before each edit (text-anchored, §5). The Risks table and all "phase count"
  references use **7**.

**Decision 7 — Consistency-check pairing scope.**
- Add `require()` pairings for **only** `clean-first-round` and `fixApplied` (report's exact scope).
  The reviewer-calibration sentence and trip-wire rows are **free prose**, not stable tokens; pairing
  them in `check-consistency.sh` (a token-grep gate) would be fragile/false-failing. Their
  canonical-plus-inline copies are kept short and identical by authoring discipline, not by the gate.

## 5. Dependencies, Assumptions, and Mechanical Consequences

**Assumptions**
- The report's proposals still match the files at edit time; the L3 dev corner **anchors edits on text,
  not line numbers** (line numbers shift across phases).
- `node` is available for `check-workflow-syntax.sh` (existing repo dependency).
- Baseline gates are green before v1.5 starts — **verified**: `check-consistency.sh` = OK,
  `check-workflow-syntax.sh` on `l3-phase.js` and `review-panel.js` = ok (pre-flight run at L1).
- An installed copy may exist at `$HOME/.claude/skills/three-loop-workflow/`; synced at F if present.
- No external systems/network/credentials; the skill's "externally observable behavior" is its own
  text/scripts, exercised by the gates + the scenario suite.

**Mechanical consequences (forced, not design choices)**
- **Version bump** `metadata.version` `1.4.0` → `1.5.0` (semver: substantive additive release). Lands in
  Phase A with A1.
- **Acceptance medium** = grep assertions + the two gates: CLAUDE.md _common-commands_ declares
  `<TEST-CMD>` N/A (no unit suite). This is forced by the repo, not chosen.
- **Every AC grep must anchor on a UNIQUE new-content string absent from the pre-edit file** (so a grep
  cannot false-pass on pre-existing words like "fresh"). This rule governs all per-deliverable ACs (§7).
- **Installed-copy regeneration** is required for A1 to take effect on the loaded surface (the registered
  description is generated from frontmatter); handled at F (Decision 6 of v1.4 sync command).

## 6. Relationship with Existing Designs

- **Extends** `docs/design/2026-06-09-skill-orchestration-upgrade.md` (v1.4). No conflict: v1.4 added
  Workflow-mode L3 and panels; v1.5 hardens craft + verification on top. Terminology anchors: the v1.4
  design docs, `SKILL.md`, CLAUDE.md _language-policy_ (English; consistent with `docs/design/`,
  `docs/implementation/`).
- **Consumes** `docs/design/2026-06-15-superpowers-comparison.md` (the report) as evidence base and lesson
  source (the greppable Appendix); supersedes none of it.
- No conflict markers required. If an L3 edit is found to contradict a v1.4 commitment clause, that is a
  design conflict → roll back to this L1 per the routing table.

## 7. Acceptance Criteria (measurable, automatable)

Two classes. **Structural [S]** = a `grep`/`ls`/gate, each anchored to a unique new-content string (§5
rule). **Behavioral [B]** = a `tests/scenarios/` scenario run by a fresh subagent at F; the recorded
expected_behavior must hold. A deliverable is ticked only when **all** its class-appropriate ACs pass and
the global gates stay green.

**Global (checked at F, and per-phase where the phase touches the relevant file)**
- **AC-G1.** `bash three-loop-workflow/references/check-consistency.sh` exits 0. **This is the authority
  for the paired-site token invariants** (it already enforces the five role names, `fix(phaseN-roundR)`,
  five-questions, two-generation wording across their paired sites). AC-G3 does not restate that logic.
- **AC-G2.** `bash three-loop-workflow/references/check-workflow-syntax.sh <file>` exits 0 for every
  touched `.js` (`l3-phase.js`, and `review-panel.js` if touched). *Limitation recorded:* this proves the
  script parses, not that new branches behave; behavior of E-i/E-vi is covered by wiring-token greps +
  the L3 review-corner diff-read + the [B] scenario gate (Decision 4).
- **AC-G3 (regression guard).** No pre-existing commitment-clause token is *removed*: AC-G1 enforces the
  paired-site invariant; additionally a pinned pre-edit token list (the five role names,
  `fix(phaseN-roundR)`, "five questions", the two-generation wording) each still `grep`-matches somewhere
  in the skill. AC-G1 is authoritative if the two ever disagree.
- **AC-G4.** `SKILL.md` `metadata.version` is `1.5.0`.
- **AC-G5 (installed copy).** If an installed copy exists, `diff -r` between repo `three-loop-workflow/`
  and the installed copy is empty (**synced** → pass). If absent, the result is recorded as
  **"absent — A1's loaded-surface effect unverified on this machine"** — an explicit recorded state, not
  a silent pass.
- **AC-G6 (banned-import guard).** (i) `grep` finds none of: unconditional "every project"/HARD-GATE
  language, "delete the implementation and restart", a praise/"Strengths" review section; and (ii)
  `ls three-loop-workflow/references/*.md | wc -l` equals the pinned pre-edit count (no new reference
  `.md` file — a file-count assertion, since file existence is not grep-able from content).
- **AC-G7 (anchored-grep meta-rule).** Every per-deliverable grep below targets a string that does **not**
  occur in the pre-edit file (verified by running the grep against the baseline first; it must return 0).

**Behavioral (run at F; §4 Decision 4)**
- **AC-BEH.** For each `tests/scenarios/` file, a fresh subagent is given the scenario + the **post-edit**
  skill and must produce the file's expected_behavior. All must pass. This is the closing gate for the
  **[B]** deliverables: C1 (agent watches the test fail / reviewer flags tests-after), C3 (the whole-change
  correctness review is actually performed and can block), E-i (`blocked` → bounded re-dispatch then
  escalate; `concerns` → review prompt steered), plus the tier (A/quickly→Full), termination
  (no one-round close after a fix), and escalation (options+recommendation+rationale, not a default) checks.

**Per-deliverable structural ACs (anchor strings; L2 may refine wording but not weaken the bar)**
- **A1.** `grep -c "It enforces a three-loop discipline" SKILL.md` = 0; and "just do X"/"quickly add Y"/"Skip only for" still present.
- **A2.** SKILL.md contains "Operating rule" and "read the routed reference in full" (or equivalent unique phrase); the old "Quick orientation" three-loop restatement is gone (`grep -c "Quick orientation" SKILL.md` = 0).
- **A3.** `light-mode.md` contains a "Looks Light" table with rows matching escalation vocabulary ("threshold", "breaking change", ">3 files").
- **A4.** SKILL.md contains the unique cap Iron-Law line (e.g. "ESCALATES — IT NEVER LOWERS THE BAR") immediately above the Operating-rule directive.
- **B1.** `escalation-rules.md` contains the table heading and a row matching "WHAT not HOW"/"quickly add Y"; row count ≤ 9.
- **B2.** `l3-phase.js` review prompt and the L1/L2 templates each contain the inline trip-wire phrase(s) ("read the diff, not the … summary" / "genuinely clean" / "general issue … blocks closure"). [B] via AC-BEH.
- **B3.** A one-line pointer to the B1 table exists in each of `SKILL.md`, `loop-3-development.md`, `end-to-end-review.md`.
- **C1.** `l3-phase.js` dev prompt contains "watched … fail"/"fails for the right reason"; review input contains "no corresponding new test". [B] via AC-BEH.
- **C2.** PhaseEnd, F step 2, §0.4 each contain a unique freshness phrase ("from THIS closing run"/"not sufficient … re-run fresh"/"fresh command output captured in the same step").
- **C3.** `end-to-end-review.md` contains a fresh-eyes whole-change step citing `git diff`, `ReviewVerdict`, "blocks closure", **and** an explicit "runs on the default path even with no panel/teams slot" clause. [B] via AC-BEH.
- **D-i.** Both `l3-phase.js` fix prompts and the fix-role Input contain "root cause"/"cause, not the symptom".
- **D-ii.** Both fix prompts and the fix-role Output contain "failing test that reproduces"/"red->green" scoped to correctness/behavior.
- **D-iii.** `escalation-rules.md` deadlock procedure contains "architectural/decomposition defect" and "option (a) … default".
- **D-iv.** `escalation-rules.md` deadlock report contains "Evidence of where it breaks".
- **E-i.** `schemas.md` DevResult and `l3-phase.js` DEV_SCHEMA contain `concerns` and `blocked`; `l3-phase.js` contains `dev-escalation` and a one-re-dispatch bound marker; `loop-3-workflow.md` has the return-row. [B] via AC-BEH.
- **E-ii.** `l3-phase.js` dev prompt and the dev role Output contain "self-review … §0.2"/"both run".
- **E-iii.** L1 template, L2 template, and `l3-phase.js` review prompt each contain the calibration phrase ("do not inflate … severe"); `schemas.md` has the canonical copy; no "Strengths" section added (AC-G6).
- **E-iv.** `schemas.md` ReviewVerdict descriptions contain the sharpened tier wording + "when unsure, it's general".
- **E-v.** Each review template contains "verify by reading the diff"/"cite … file:line".
- **E-vi.** `l3-phase.js` destructures `models` and passes `models.dev/review/accept/fix`; `loop-3-workflow.md` Args has the `models` row; `escalation-rules.md` deadlock options include the "retry once with a stronger … model" clause.
- **F-i.** `loop-1-design.md` contains an "L1 pre-step … Confirm intent before drafting" gated to under-determined requests, referencing `escalation-rules.md` for the question bar.
- **F-ii.** `loop-1-design.md` and `loop-2-implementation.md` contain "Self-review before spawning the reviewer (free … does not increment {{round}})".
- **F-iii.** `loop-2-implementation.md` contains the zero-context calibration sentence + a "Placeholder vagueness" trap bullet.
- **F-iv.** `loop-1-design.md` procedure step 3 contains a "Multi-subsystem request" escalation bullet.
- **G-i.** `tests/scenarios/` contains ≥4 scenario files, each with an `expected_behavior` line. [B] anchor for AC-BEH.
- **G-ii.** `CLAUDE.md` _repo-workflow_ contains a bullet referencing `tests/scenarios/`.
- **G-iii.** `check-consistency.sh` contains `require` lines pairing `clean-first-round` and `fixApplied`; AC-G1 still passes.
- **G-iv.** `loop-3-development.md` Phase-termination conditions contain a skill-self watch-it-fail behavioral-check note.
- **G-v.** `escalation-rules.md` deadlock procedure contains the meta-test classification bullet ("clear-but-ignored / doc gap / organization gap").
- **G-vi.** `loop-1-design.md` review template contains the skill-edit distrust bullet ("demand a … demonstration"/"asserted but never observed … severe").

## 8. Risks and Rollback

| Risk | Likelihood | Mitigation / Rollback |
|---|---|---|
| Net prose bloat despite intent | Medium | Decision 2 collapses 3 tables → 1; per-row line budgets; A1/A2 are net-negative; AC-G6 file-count guard. Rollback: revert the phase commit. |
| New clause drifts from its canonical copy | Medium | G-iii pairs the two stable tokens; calibration/trip-wire copies kept short+identical by authoring discipline (Decision 7). |
| An edit silently changes discipline semantics | Low/High-impact | §3 forbids it; AC-G3 regression guard; AC-BEH scenario gate (tier/termination/escalation) catches behavioral regressions; C3 whole-change review. Rollback: revert (doc/script-only, git-reversible). |
| `l3-phase.js` edits break the script or a new branch misbehaves | Low/High-impact | AC-G2 per phase touching it; E-i/E-vi are optional-field/no-op-by-default; wiring-token greps + review-corner diff-read + AC-BEH; **no-runtime-test limitation recorded** (Decision 4). |
| Unbounded dev re-dispatch (E-i) becomes an uncounted retry loop | Low/High-impact | Decision 5 bounds it to one re-dispatch then escalate; AC-BEH scenario 4 checks it. |
| Installed copy diverges / A1 unverified on this machine | Low | AC-G5 distinguishes synced vs absent (explicit recorded state). |
| Report line numbers shifted | High/Low-impact | Dev corner anchors on text (§5). |
| Scope too large for one cycle (all 32, 7 phases, most files) | Medium | Phased, independently committable; round caps force escalation not half-done merges; report's first-cut tension acknowledged (Decision 1). |
| Behavioral gate (AC-BEH) itself flaky/subjective | Medium | Scenarios are concrete A/B/C with a single expected_behavior; run by fresh subagents; a scenario that cannot produce a crisp pass/fail is rewritten, not rubber-stamped. |

Overall rollback: every phase is a separate commit with green gates; reverting any phase restores the
prior green state. No data migration, no external state.

## 9. Lesson → Deliverable crosswalk (coverage audit; all 32 mapped)

| # | Lesson ID | Deliverable |
|---|---|---|
| 1 | `description-no-workflow-summary` (P0) | A1 |
| 2 | `demote-quick-orientation` | A2 |
| 3 | `tier-worked-examples` | A3 |
| 4 | `imperative-iron-law-framing` (P3) | A4 |
| 5 | `rationalization-table` | B1 |
| 6 | `rationalization-table-harvested-from-baseline` | B1 |
| 7 | `review-stage-rationalization-table` | B1 (canonical) + B2 (inline reviewer subset) |
| 8 | `fix-corner-red-flags` | B1 |
| 9 | `design-elicitation-rationalization-row` | B1 |
| 10 | `tdd-rationalization-table` (dev-corner rows) | B1 |
| 11 | `tdd-iron-law-l3` | C1 |
| 12 | `evidence-over-claims-phaseend` | C2 |
| 13 | `f-correctness-review` | C3 |
| 14 | `root-cause-gate-fix-corner` | D-i |
| 15 | `reproduction-test-for-fixes` | D-ii |
| 16 | `architectural-reframe-on-cap` | D-iii |
| 17 | `diagnostic-deadlock-report` | D-iv |
| 18 | `dev-status-enum` | E-i |
| 19 | `dev-self-review-before-handoff` | E-ii |
| 20 | `reviewer-calibration-clause` | E-iii |
| 21 | `three-tier-severity` | E-iv |
| 22 | `do-not-trust-report` | E-v |
| 23 | `model-selection-by-fragility` (incl. deadlock retry clause) | E-vi |
| 24 | `l1-elicitation-dialogue` | F-i |
| 25 | `l1-cheap-self-review-before-fresh-reviewer` | F-ii |
| 26 | `l2-zero-context-reader-model` | F-iii |
| 27 | `l1-scope-decomposition-precheck` | F-iv |
| 28 | `pressure-scenario-suite-for-tier-and-escalation` | G-i |
| 29 | `consolidate-termination-canonical` | G-iii |
| 30 | `watch-it-fail-gate-for-skill-edits` | G-iv |
| 31 | `meta-test-on-cap-exhaustion-deadlock` | G-v |
| 32 | `adversarial-distrust-framing-in-maintenance-review` | G-vi |

(G-ii is the CLAUDE.md wiring for lesson 28's suite — infrastructure for #28, not a separate lesson.)
