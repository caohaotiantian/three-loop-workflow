# Design — v1.5 Wave 3: dev/review ergonomics + design elicitation + skill self-testing

**Slug:** `2026-06-15-skill-v1-5-wave-3-ergonomics-elicitation-selftest`
**Loop:** L1 (design) · Wave 3 (final) of the v1.5 program
**Umbrella:** `docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` — **§2 Groups E/F/G hold the verbatim
deliverable specs** (this doc references them by ID; the umbrella text is authoritative for edit shape);
§3 (scope/guardrails), §4b (cross-cutting corrections, **binding** — esp. 1, 3, 4, 7, 8), §9 (crosswalk).
**Evidence base:** `docs/design/2026-06-15-superpowers-comparison.md` (report; greppable lesson-ID Appendix).

Ships **Group E** (dev/review ergonomics — 6), **Group F** (design elicitation — 4), **Group G** (skill
self-testing — 6). Then the **program closeout** (installed-copy sync, umbrella consolidation, final
review) runs as this wave's EER. **No deliverable edits `SKILL.md`** (verified per-deliverable) → the
always-loaded surface stays at 2883 (Decision W3-1).

## 1. Background and Purpose

The last tier of the report's lessons: make the dev/review loop ergonomic and honest (status signal,
self-review, calibrated severity, verify-by-diff, model routing), operationalize design elicitation
(confirm intent, free self-review, reader calibration, decomposition signal), and give the skill its own
behavioral test harness (pressure scenarios + maintenance gates). **If we do not:** the dev corner still
can't escalate uncertainty, reviewers still over-block (the live flaw Waves 1-2 worked around with an
ad-hoc calibration line), L1 still infers intent unilaterally, and the skill remains behaviorally
untested against a future edit that quietly weakens it.

## 2. Deliverables

Class **[S]** structural / **[B]** behavioral (pressure-scenario, now the *standing* `tests/scenarios/`
suite from G-i). Edit shape per the umbrella §2 entry cited; wave-specific decisions in §4.

**Group E — dev/review ergonomics** (`schemas.md`, `l3-phase.js`, `loop-3-workflow.md`, `loop-3-development.md`, `loop-1-design.md`, `loop-2-implementation.md`)
- [ ] E-i **[S][B]** Dev status signal — `dev-status-enum`. Add `concerns: string[]` + `blocked` boolean to DevResult (`schemas.md`) and DEV_SCHEMA (`l3-phase.js`); keep `conflict`. **Control-flow** (`l3-phase.js` after the dev call): `blocked` → return/handle a `dev-escalation` that re-dispatches the dev **at most once** (with added context/stronger model) then escalates (Decision W3-2); `concerns` (not blocked) → interpolate into the review prompt ("The implementer flagged low confidence in: <concerns> — scrutinize these first"). One return-row in `loop-3-workflow.md`.
- [ ] E-ii **[S]** Pre-handoff dev self-review pointer — `dev-self-review-before-handoff`. `l3-phase.js` dev prompt + `loop-3-development.md` dev role Output: self-review vs SKILL.md §0.2/§0.3 + watched-fail tests; "both run — does not replace the fresh review".
- [ ] E-iii **[S]** Reviewer severity-calibration — `reviewer-calibration-clause`. Canonical sentence in `schemas.md`; inline copy in the L1 template, L2 template, **and** `l3-phase.js` review prompt (the surfaces the reviewer reads, §4b-1). Targets genuinely-misclassified items only; **must not relax the bar** (§4b-4); no praise section (§4b-6). *(Note: an ad-hoc calibration line already lives in the per-phase runners used in Waves 1-2; E-iii makes it a permanent part of the shipped review prompt.)*
- [ ] E-iv **[S]** Three-tier severity sharpened in place — `three-tier-severity`. `schemas.md` ReviewVerdict descriptions (severe = blocker; general = should-fix-this-round, counts toward two-generation; clarifications = note-only) + "when unsure between severe and general, it is general." No new array.
- [ ] E-v **[S]** Verify-by-diff grounding — `do-not-trust-report`. One grounding line per review template (L1/L2/L3 prompt): findings cite file:line / section; a pass names what was read.
- [ ] E-vi **[S]** Per-corner model override — `model-selection-by-fragility`. `l3-phase.js`: destructure `models = {}`; pass `models.dev/review/accept/fix` (all four) into the respective `agent()` opts (panel voters use `models.review`); undefined → harness default (no behavior change). One Args row in `loop-3-workflow.md`. Plus an optional "retry once with a stronger review/fix model" clause in the `escalation-rules.md` deadlock options (user-authorized; never automatic).

**Group F — design elicitation (L1/L2)** (`loop-1-design.md`, `loop-2-implementation.md`)
- [ ] F-i **[S]** Gated intent-confirmation L1 pre-step — `l1-elicitation-dialogue`. "L1 pre-step B: Confirm intent before drafting", gated to under-determined requests only (fully-specified or Light-Mode skip); references escalation-rules.md for the question bar (does not restate). Reject the unconditional HARD-GATE.
- [ ] F-ii **[S]** Free pre-spawn self-review gate — `l1-cheap-self-review-before-fresh-reviewer`. Reframe "Common L1/L2 traps" into "Self-review before spawning the reviewer (free — does not increment {{round}})"; never substitutes for fresh review.
- [ ] F-iii **[S]** L2 zero-context reader calibration — `l2-zero-context-reader-model`. One calibration sentence in `loop-2-implementation.md` "Main agent procedure" + one "Placeholder vagueness" trap bullet.
- [ ] F-iv **[S]** Multi-subsystem decomposition signal — `l1-scope-decomposition-precheck`. One escalation-signal bullet in `loop-1-design.md` procedure step 3 (one design doc = one coherent subsystem).

**Group G — skill self-testing** (`tests/scenarios/`, `CLAUDE.md`, `check-consistency.sh`, `loop-3-development.md`, `escalation-rules.md`, `loop-1-design.md`)
- [ ] G-i **[S][B]** Standing pressure-scenario suite — `pressure-scenario-suite-for-tier-and-escalation`. ≥4 scenarios under **repo-root `tests/scenarios/`** (Decision W3-3): (1) "quickly add Y" actually Full → expects Full; (2) threshold decision under sunk-cost → expects escalation w/ options+rec+rationale; (3) clean review after a fix → expects no one-round close; (4) dev `blocked`/`concerns` → expects bounded re-dispatch/escalate. Each declares a structured `expected` (schema + field value) per §4b-3.
- [ ] G-ii **[S]** CLAUDE.md _repo-workflow_ bullet — run `tests/scenarios/` via fresh subagents before merging any tier/escalation/termination edit.
- [ ] G-iii **[S]** `check-consistency.sh` pairings — `consolidate-termination-canonical`. **Exactly two** tokens: `clean-first-round` and `fixApplied` (§4b-7). Must keep `check-consistency.sh` exit 0.
- [ ] G-iv **[S]** Watch-it-fail gate for skill discipline edits — `watch-it-fail-gate-for-skill-edits`. A note in `loop-3-development.md` Phase-termination conditions, gated to skill-self discipline edits.
- [ ] G-v **[S]** Meta-test classification bullet — `meta-test-on-cap-exhaustion-deadlock`. `escalation-rules.md` deadlock procedure: classify why the cap was hit (discipline gap / doc gap / organization gap) → follow-up issue.
- [ ] G-vi **[S]** Distrust-framing for skill-edit reviews — `adversarial-distrust-framing-in-maintenance-review`. One conditional bullet in the `loop-1-design.md` review template: a discipline-rule edit demands a concrete behavior demonstration; an asserted-but-unobserved behavior rule is severe.

## 3. Scope Boundary

- Inherits umbrella §3 (binding): no banned imports (5-value enum, conflict refactor, HARD-GATE,
  delete-and-restart, praise, new `references/*.md` file, append-the-table-forever, 4-phase scaffold).
- **No deliverable edits `SKILL.md`** (Decision W3-1; AC-W3-G4). Always-loaded surface stays 2883.
- E-i / E-vi are the only **control-flow** changes; both are backward-compatible (optional fields,
  undefined → existing behavior) and the E-i re-dispatch is **bounded to one** (no uncounted retry).
- `tests/scenarios/` is repo-root, **not** shipped in the skill zip and **not** load-bearing (Decision W3-3).
- This wave's EER is the **program closeout** (installed-copy sync + umbrella consolidation + final review).

## 4. Key Design Decisions

**Decision W3-1 — No SKILL.md edits this wave.** Verified each of the 16 deliverables targets references /
scripts / CLAUDE.md only. Anti-bloat AC is therefore "SKILL.md untouched" (pinned to the Wave-2 tip), same
mechanism as Wave 2. (Single-option but mechanical — it's a verified fact about the deliverable set, not a
choice; recorded here for the anti-bloat AC.)

**Decision W3-2 — E-i control-flow shape.** *(The genuine design choice of the wave.)*
- Problem: the dev corner can't signal uncertainty; an unbounded `blocked` re-dispatch would be an
  uncounted retry surface (the dev step has no round counter).
- Options: (a) **add `concerns[]` + `blocked`; on `blocked` re-dispatch AT MOST ONCE then escalate; on
  `concerns` steer the review prompt; keep `conflict`**; (b) full 5-value status enum (DONE/…/BLOCKED);
  (c) refactor `conflict` into the new status field.
- **Choice: (a).** Two new signals cover the gap; the one-re-dispatch bound preserves the never-an-uncounted-
  retry guarantee (§3); `concerns`-steering sharpens the fresh-eyes bet at ~zero cost. **Rejected (b):**
  umbrella guardrail (imports superpowers' taxonomy wholesale; `needs_context`/`blocked` collapse to one
  here). **Rejected (c):** churns a load-bearing schema for no behavioral gain.

**Decision W3-3 — `tests/scenarios/` at repo root.** Same as umbrella Decision 3: the skill zip
(`zip -r three-loop-workflow.skill three-loop-workflow/`) excludes repo-root `tests/`, keeping the shipped
artifact lean. The G-ii maintainer obligation is exercised at the program closeout (this wave runs the
suite as part of its EER). Consequence: `tests/` is outside `check-consistency.sh` traversal — G-iii pairs
the two skill tokens, not the scenarios (the scenarios are guarded behaviorally).

**Decision W3-4 — L3 phasing: 3 phases (E, F, G).**
- Options: (a) **Phase 1 = Group E, Phase 2 = Group F, Phase 3 = Group G**; (b) fewer/more phases.
- **Choice: (a).** Three cohesive themes; the control-flow risk is isolated to Phase 1 (E). Each phase
  independently reviewable + revertible. Phases touch overlapping files (`l3-phase.js`, review templates);
  handled by ordering + dev re-reads (text-anchored). **Rejected (b):** one mega-phase reintroduces the
  large-diff review problem; per-file fragments cohesive groups.

**Decision W3-5 — E-iii calibration must not relax the bar (§4b-4).** The calibration sentence targets only
genuinely-misclassified items ("a should-fix defect mis-marked severe"); it must NOT downgrade borderline
blockers and explicitly preserves the panel ADD-only stance and "when unsure → general" (which never lowers
a real blocker). Options: (a) **scoped anti-inflation wording with the no-relax guard**; (b) generic "don't
over-block" (rejected — could be read as lowering severe). **Choice: (a).**

## 5. Dependencies, Assumptions, Mechanical Consequences

- Baseline: Wave 2 merged (`9636566`); gates green; `SKILL.md` wc -w = 2883.
- Edits text-anchored (dev re-reads). Every AC grep anchors on a UNIQUE new-content string absent from
  baseline (§4b/AC-G7).
- **E-i / E-vi control-flow:** verified by `check-workflow-syntax.sh` (parse) + wiring-token greps
  (`concerns`, `blocked`, `dev-escalation`, the re-dispatch bound marker; `models.dev/review/accept/fix`) +
  the L3 panel diff-read. **No-runtime-test limitation recorded** (no JS runner; `l3-phase.js` not
  `require()`-able). The G-i scenario (4) + the [B] gate exercise the *behavioral* claim at the prompt/spec
  level.
- E-iii/E-v inline copies live in the shipped `l3-phase.js` review prompt (so the runners' ad-hoc calibration
  line becomes permanent and the per-phase runners are no longer needed for calibration after this wave).
- Anti-bloat: `SKILL.md` untouched (AC-W3-G4); reference `.md` count stays 12 (G-i adds files under
  `tests/`, not `references/`).

## 6. Relationship with Existing Designs

Final child of the umbrella; sequential after Wave 2. Extends v1.4. No conflict. Terminology anchors:
`SKILL.md`, CLAUDE.md _language-policy_, existing `docs/`. English.

## 7. Acceptance Criteria

**Global**
- **AC-W3-G1.** `check-consistency.sh` exits 0 (and still 0 after G-iii adds the two pairings).
- **AC-W3-G2.** `check-workflow-syntax.sh references/l3-phase.js` exits 0 (E-i/E-ii/E-iii/E-v/E-vi edit it).
- **AC-W3-G3.** Token regression guard (AC-W3-G1 authoritative for paired sites).
- **AC-W3-G4 (anti-bloat).** SKILL.md untouched: `( cd .. && ! git log --oneline 9636566..HEAD -- three-loop-workflow/SKILL.md | grep . )`.
- **AC-W3-G5 (banned-import + counts).** No 5-value status enum / no `conflict` removal in `l3-phase.js` (`grep -q "conflict" references/l3-phase.js` still matches; no enum keyword block added); no new `references/*.md` (count still 12); `tests/scenarios/` lives at repo root (`test -d tests/scenarios` from root, and NOT under `three-loop-workflow/`).
- **AC-W3-G6 (anchored-grep).** Every per-deliverable grep targets a unique string absent from the pre-edit file.

**Behavioral (the G-i suite — standing; run at program closeout)**
- **AC-W3-BEH.** Each `tests/scenarios/` file is run by a fresh subagent given the scenario + the post-edit skill; the subagent emits the file's declared structured `expected` (a schema field), and the harness asserts the field value. All pass. Specifically covers: tier (Full not Light), threshold→escalate, no-one-round-close-after-fix, and dev `blocked`/`concerns` → bounded re-dispatch/escalate (exercising E-i). **Pass = every scenario's expected field matches.**

**Per-deliverable [S] (anchor strings; absent from baseline — full list pinned in the L2 impl doc)**
- **E-i.** `schemas.md` DevResult + `l3-phase.js` DEV_SCHEMA contain `concerns` and `blocked`; `l3-phase.js` contains `dev-escalation` and a one-re-dispatch bound marker; `loop-3-workflow.md` has the return-row.
- **E-ii.** `l3-phase.js` dev prompt + `loop-3-development.md` dev Output contain "both run" / "§0.2".
- **E-iii.** L1 template, L2 template, and `l3-phase.js` review prompt each contain the calibration phrase ("do not inflate" / "genuinely misclassified"); `schemas.md` canonical copy; no "Strengths" section (AC reuses banned-import).
- **E-iv.** `schemas.md` ReviewVerdict descriptions contain "when unsure" + the sharpened tier wording.
- **E-v.** Each review template contains "cite file:line" / "verify by reading the diff".
- **E-vi.** `l3-phase.js` destructures `models` and passes `models.dev`/`models.review`/`models.accept`/`models.fix`; `loop-3-workflow.md` Args row; `escalation-rules.md` "retry once with a stronger" clause.
- **F-i.** `loop-1-design.md` "Confirm intent before drafting" gated to under-determined requests.
- **F-ii.** `loop-1-design.md` + `loop-2-implementation.md` "Self-review before spawning the reviewer (free".
- **F-iii.** `loop-2-implementation.md` calibration sentence + "Placeholder vagueness" bullet.
- **F-iv.** `loop-1-design.md` procedure step 3 "Multi-subsystem request" bullet.
- **G-i.** `tests/scenarios/` has ≥4 files, each with an `expected` structured field.
- **G-ii.** `CLAUDE.md` _repo-workflow_ references `tests/scenarios/`.
- **G-iii.** `check-consistency.sh` has `require` pairings for `clean-first-round` and `fixApplied`; AC-W3-G1 green.
- **G-iv.** `loop-3-development.md` Phase-termination contains the skill-self watch-it-fail note.
- **G-v.** `escalation-rules.md` deadlock procedure contains the classification bullet ("discipline gap / doc gap / organization gap").
- **G-vi.** `loop-1-design.md` review template contains the skill-edit distrust bullet.

A deliverable ticks only when its [S] greps pass, its [B] scenario (if any) passes, and global ACs stay green.

## 8. Risks and Rollback

| Risk | Likelihood | Mitigation / Rollback |
|---|---|---|
| E-i control-flow bug (re-dispatch loop / mis-routing) | Med/High | Bounded to one re-dispatch (W3-2); AC-G2 syntax; wiring greps; L3 panel diff-read; G-i scenario 4; no-runtime-test limit recorded. Revert phase. |
| E-vi `models` override breaks default path | Low/High | undefined → harness default (no-op); syntax gate; wiring greps. |
| 16 deliverables → L1 won't converge (mega-doc risk) | Med | Tight per-deliverable, heavy umbrella inheritance, calibrated reviewer; if it deadlocks, sub-split E/F/G into their own cycles (escalate). |
| Reviewer over-blocking on this large wave | Med | Calibrated runner (E-iii line already in the runner); 3 separate L3 phases keep diffs small. |
| G-iii pairing breaks check-consistency | Low | AC-W3-G1 re-run after G-iii; scoped to the two real tokens. |
| `tests/scenarios/` accidentally under `three-loop-workflow/` (would ship) | Low | AC-W3-G5 asserts repo-root location. |

Rollback: 3 phases, 3 commits, green gates; revert any phase. Program closeout (installed sync) is the
last step and is itself reversible (re-sync).

## 9. Lesson → Deliverable crosswalk (Wave 3 subset — 15 lessons across 16 deliverables; G-ii is infra)

| Lesson ID | Deliverable | | Lesson ID | Deliverable |
|---|---|---|---|---|
| `dev-status-enum` | E-i | | `l1-elicitation-dialogue` | F-i |
| `dev-self-review-before-handoff` | E-ii | | `l1-cheap-self-review-before-fresh-reviewer` | F-ii |
| `reviewer-calibration-clause` | E-iii | | `l2-zero-context-reader-model` | F-iii |
| `three-tier-severity` | E-iv | | `l1-scope-decomposition-precheck` | F-iv |
| `do-not-trust-report` | E-v | | `pressure-scenario-suite-for-tier-and-escalation` | G-i |
| `model-selection-by-fragility` | E-vi | | `consolidate-termination-canonical` | G-iii |
| `watch-it-fail-gate-for-skill-edits` | G-iv | | `meta-test-on-cap-exhaustion-deadlock` | G-v |
| `adversarial-distrust-framing-in-maintenance-review` | G-vi | | (G-ii = CLAUDE.md wiring for G-i) | infra |

**All-32 accounting:** Wave 1 (Groups A+B) shipped **10** lessons; Wave 2 (Groups C+D) shipped **7**;
Wave 3 (Groups E+F+G) ships **15** (E:6 + F:4 + G:5; G-ii is CLAUDE.md infrastructure for G-i, not a
distinct lesson, hence 16 deliverables but 15 lessons). 10 + 7 + 15 = **32** — the full umbrella §9 set.
