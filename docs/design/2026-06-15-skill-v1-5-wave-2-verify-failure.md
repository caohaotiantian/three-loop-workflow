# Design — v1.5 Wave 2: verify-don't-label + failure-handling depth

**Slug:** `2026-06-15-skill-v1-5-wave-2-verify-failure`
**Loop:** L1 (design) · Wave 2 of the v1.5 program
**Umbrella:** `docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` — §3 (scope/guardrails), §4b
(cross-cutting corrections, **binding** — esp. corrections 1, 3, 9), §9 (all-32 crosswalk).
**Evidence base:** `docs/design/2026-06-15-superpowers-comparison.md` (report; greppable lesson-ID Appendix).

Ships **Group C** (verify, don't label: TDD watch-it-fail, evidence-gated closeout, fresh-eyes
whole-change EER correctness review) and **Group D** (failure-handling: root-cause gate, reproduction
test, architectural-reframe, evidence deadlock report). All edit reference files / `l3-phase.js`; **none
touch the always-loaded `SKILL.md`** (Decision W2-1), so the anti-bloat budget is preserved by construction.

## 1. Background and Purpose

Closes the third blind spot (the skill *labels* disciplines it never verifies) and deepens
failure-handling:
- **C1** TDD is asserted ("tests first") but unchecked — code-first + green-from-birth tests-after pass
  every gate. **C2** the main agent's closeout re-run is honor-system (a stale tally passes). **C3** F's
  "End-to-End Review" checks doc-consolidation fidelity, not whole-change correctness — integration
  defects (Phase A+B wrong together) fall through.
- **D-i/D-ii** the fix corner constrains change *size* (Surgical) but not *causal correctness* — a
  symptom-patch passes the review item and the defect resurfaces, burning the cap. **D-iii/D-iv** round-cap
  exhaustion fires into a flat 3-option deadlock report with no architectural-signal read and no
  where-it-breaks evidence.

**If we do not:** the skill keeps accepting unverified TDD, stale closeout claims, and uncaught
integration defects, and its failure path stays a narrative rather than a diagnosis.

## 2. Deliverables

Class: **[S]** structural grep/gate · **[B]** behavioral (ad-hoc structured-output scenario at this wave's
EER closeout, per umbrella §4b-3).

**Group C — verify, don't label** (`l3-phase.js`, `loop-3-development.md`, `end-to-end-review.md`, `schemas.md`)
- [ ] C1 **[S][B]** TDD watch-it-fail (`tdd-iron-law-l3`): (a) `l3-phase.js` dev prompt gains one sentence — for each new behavior, write its test FIRST and run it to confirm it FAILS for the right reason (feature missing, not a typo/import error) before writing code, and note in the summary that you watched each new test fail; (b) the reviewer-side check lands on **BOTH operative reviewer surfaces** (umbrella §4b-1: the Workflow-mode reviewer reads only its prompt, *not* `loop-3-development.md`): (b-i) the `l3-phase.js` **review prompt** — append, threaded onto the `git log` the reviewer already runs, "; for new behavior, confirm a corresponding new test precedes/accompanies the production change — a body of new production code with no corresponding new test is a severe Goal-Driven Execution issue"; (b-ii) the `loop-3-development.md` step-2 review Input cell — the same clause (manual/fallback surface). **Drop** delete-and-restart wording (umbrella guardrail).
- [ ] C2 **[S]** Evidence-gated closeout (`evidence-over-claims-phaseend`): (a) `loop-3-development.md` "Main agent constraints" PhaseEnd bullet gains "the pasted exit codes/tally must come from THIS closing run; a recalled tally or the accept subagent's earlier report is not sufficient — re-run fresh and record this run's output"; (b) `end-to-end-review.md` step 2 gains "...captured in this closeout step; a prior run or the accept subagent's report is not sufficient." **Does NOT edit SKILL.md §0.4** (Decision W2-1).
- [ ] C3 **[S][B]** Fresh-eyes whole-change EER correctness review (`f-correctness-review`; umbrella §4b-9): add ONE **default-always** step to `end-to-end-review.md` (before consolidation) — spawn a fresh non-author subagent to read `git diff <first-phase-base>..HEAD` against design Deliverables + Acceptance Criteria for (a) every Deliverable actually implemented, (b) no cross-phase regression/interface mismatch, (c) no scope creep; emit `ReviewVerdict`; a severe finding routes to **one bounded fix round then escalate** (no per-Phase counter exists at closeout) and **blocks closure**. It **runs on the default single-agent path even when no panel/teams slot exists** (folding into such a slot is an optimization, not a precondition); it is distinct from the *conditional* behavior-verify step (that checks observed app behavior; this checks diff-vs-Deliverables). `schemas.md`: one line noting the EER correctness review reuses `ReviewVerdict`. No new prompt template.

**Group D — failure-handling depth** (`loop-3-development.md`, `l3-phase.js`, `escalation-rules.md`)
- [ ] D-i **[S]** Root-cause gate in the fix corner (`root-cause-gate-fix-corner`): `loop-3-development.md` step-4 fix Input gains "each item prefixed by a one-line root cause ('item X is caused by Y')" + one sentence after the role table ("Fix corner is debugging, not patching: name the root cause of each failing item before editing and change that cause, one at a time. If a failing item has no identifiable cause after investigation, escalate via the design-conflict / escalation path — do not ship a guess."); both `l3-phase.js` fix prompts gain "Before editing, state the root cause of each item ('X is caused by Y'); make the smallest change that addresses the cause, not the symptom; one cause at a time." **No** 4-phase scaffold, **no** new verdict state (umbrella guardrail).
- [ ] D-ii **[S]** Failing reproduction test for behavior fixes (`reproduction-test-for-fixes`): `loop-3-development.md` step-4 fix Output gains "for a correctness/behavior finding (not style/scope/comment): add a failing test that reproduces it first, then fix to green (red→green)"; both `l3-phase.js` fix prompts gain "If a failing item is a correctness/behavior bug, write a failing test that reproduces it before fixing (red→green); style/scope findings need no test." Scoped to correctness/behavior only (not TDD-everywhere).
- [ ] D-iii **[S]** Architectural-reframe on cap (`architectural-reframe-on-cap`): `escalation-rules.md` deadlock procedure (after step 1's bullets) gains "Pattern check: if a different item failed each round, or fix scope grew each round, the cap is firing on an architectural/decomposition defect — not a local bug. Name the likely source (L1 design or L2 phase split) and make option (a) the recommended default per the existing L3→L1/L2 rollback routing." (Leave the flat options for stable/local failures.)
- [ ] D-iv **[S]** Evidence in the deadlock report (`diagnostic-deadlock-report`): `escalation-rules.md` deadlock-report list gains "**Evidence of where it breaks** — for each unresolved item, the failing acceptance command or reviewer-cited symptom (with its actual output) and the file/layer/value where expected and actual diverge. 'It keeps failing' is a story, not evidence."

## 3. Scope Boundary

- Inherits the umbrella §3 boundary (binding): no banned imports (delete-and-restart, 4-phase debugging
  scaffold, new verdict states, new `references/*.md` file, praise), Surgical Changes only.
- **Does NOT touch `SKILL.md`** (Decision W2-1) — preserves the always-loaded surface at Wave 1's 2883 words.
- No semantic change to existing termination/round-cap/identity-isolation. New checks (C1 review check, C3
  step) **add** rigor; the C3 step's severe-routing is bounded (one fix round then escalate) so it cannot
  become an uncounted retry loop.
- Groups A/B (Wave 1, done) and E/F/G (Wave 3) are out of scope.

## 4. Key Design Decisions

**Decision W2-1 — Keep C2 (and all of Wave 2) off `SKILL.md`.** *(Overrides the report's
`evidence-over-claims-phaseend`, which added a §0.4 clause.)*
- Problem: the report put C2's freshness qualifier in three places including SKILL.md §0.4 (always-loaded).
  Adding it there pushes `SKILL.md` over the 2888-word anti-bloat budget (Wave 1 left it at 2883).
- Options: (a) **edit only the L3/F operative surfaces** (`loop-3-development.md` PhaseEnd + `end-to-end-review.md`
  step 2), not §0.4; (b) edit §0.4 too and offset by trimming adjacent SKILL.md prose; (c) edit §0.4 and
  raise the budget.
- **Choice: (a).** §0.4 already states "'I think it works' does not close a Phase. The accept subagent
  does." — the principle is present; the *freshness qualifier's* operative home is the closeout surfaces
  the main agent actually reads. This keeps the always-loaded surface flat (the v1.5 anti-bloat thesis).
  **Rejected (b):** offsetting churns unrelated §0.4 prose for no gain. **Rejected (c):** net SKILL.md
  growth contradicts the thesis.

**Decision W2-2 — C3 EER correctness review: default-always vs. conditional/optional.** (Umbrella §4b-9.)
- Options: (a) **a default-always gated step** distinct from the conditional behavior-verify step, severe →
  one bounded fix round then escalate; (b) fold into the existing behavior-verify step (which is
  *conditional* on a contract/observable change); (c) panel/teams-only.
- **Choice: (a).** The report's whole point is that the *default* path currently has no whole-change
  correctness review; (b) leaves the non-observable majority uncovered; (c) is optional. Folding into a
  panel/teams slot when one already ran is an optimization, not a precondition. The bounded
  one-fix-then-escalate routing avoids an uncounted retry surface at closeout (no per-Phase counter there).

**Decision W2-3 — D-ii reproduction-test scope.**
- Options: (a) **correctness/behavior findings only**; (b) all findings (TDD-everywhere); (c) none.
- **Choice: (a).** A style/scope/comment-narration fix has no behavior to reproduce; requiring a test
  there is the TDD-everywhere absolutism the umbrella forbids. Scope to correctness/behavior bugs — the
  class that silently regresses (accept only re-runs declared ACCEPT-CMDs).

**Decision W2-4 — L2 phase split.**
- Options: (a) **Phase 1 = Group C, Phase 2 = Group D**; (b) one phase; (c) per-file.
- **Choice: (a).** C and D are independent themes; two phases keep each L3 review focused and revertible.
  Both touch `l3-phase.js`/`loop-3-development.md`, handled by ordering + the dev corner re-reading before
  editing (text-anchored). **Rejected (b):** one large diff is harder to review surgically. **Rejected (c):**
  fragments cohesive changes.

## 5. Dependencies, Assumptions, Mechanical Consequences

- Baseline: Wave 1 merged (`f43d105`); gates green; `SKILL.md` wc -w = 2883.
- Edits text-anchored, not line-number-anchored (dev re-reads before editing).
- **Every AC grep anchors on a UNIQUE new-content string** absent from the pre-edit file (run against
  baseline first → 0), per umbrella §4b/AC-G7.
- `l3-phase.js` edits (C1 dev prompt, D-i/D-ii fix prompts) must keep `check-workflow-syntax.sh` green;
  they are prompt-string content additions (no control-flow change) — *no-runtime-test limitation recorded*
  (umbrella §4b), behavior covered by the C1 [B] scenario + the review corner.
- Anti-bloat: `SKILL.md` untouched → stays 2883 (≤2888). Reference files grow by design (the new clauses);
  per-deliverable additions are ≤ a few lines each.

## 6. Relationship with Existing Designs

Child of the umbrella; sequential after Wave 1. Extends v1.4. No conflict. Terminology anchors: `SKILL.md`,
CLAUDE.md _language-policy_, existing `docs/`. English.

## 7. Acceptance Criteria

**Global**
- **AC-W2-G1.** `check-consistency.sh` exits 0.
- **AC-W2-G2.** `check-workflow-syntax.sh references/l3-phase.js` exits 0.
- **AC-W2-G3.** Token regression guard: pinned commitment tokens still present (AC-W2-G1 authoritative for paired sites).
- **AC-W2-G4 (anti-bloat).** `SKILL.md` unchanged this wave: `git diff <wave2-base>..HEAD -- three-loop-workflow/SKILL.md` is empty (and `wc -w` stays 2883).
- **AC-W2-G5 (banned-import).** `grep` finds no "delete the implementation and restart"/"delete it. Start over" as an instruction, no new verdict-state enum in `l3-phase.js`, no new `references/*.md` (count still 12); each pattern verified 0 on baseline.
- **AC-W2-G6 (anchored-grep meta-rule).** Every per-deliverable grep targets a unique string absent from the pre-edit file.

**Behavioral (at EER closeout; structured output)**
- **AC-W2-BEH-C1.** Fresh subagent given the post-edit `l3-phase.js` dev prompt + review Input cell, plus a synthetic Phase where production code was added with NO new test (summary claims "tests pass"); acting as the reviewer it must emit `{"flagged_missing_test": bool}`. **Pass = true.**
- **AC-W2-BEH-C3.** Fresh subagent given the C3 step text + a synthetic assembled diff where Phase A and Phase B are individually fine but mismatch at their interface; acting as the EER correctness reviewer it must emit `{"ran_whole_change_review": bool, "flagged_cross_phase_defect": bool}`. **Pass = both true.**

**Per-deliverable [S] (anchor strings; absent from baseline)**
- **C1.** `l3-phase.js` dev prompt contains "watched each new test fail" (or "FAILS for the right reason"); **and "no corresponding new test" appears in BOTH `l3-phase.js` (review prompt) AND `loop-3-development.md` (review Input cell)** — the Workflow-mode reviewer reads the prompt, the manual reviewer reads the role table.
- **C2.** `loop-3-development.md` PhaseEnd bullet contains "THIS closing run"/"not sufficient"; `end-to-end-review.md` step 2 contains "captured in this closeout step".
- **C3.** `end-to-end-review.md` contains a whole-change step citing "git diff", "ReviewVerdict", "blocks closure", "runs on the default" (default-path clause), and "one bounded fix round"; `schemas.md` notes the EER correctness review reuses ReviewVerdict.
- **D-i.** both `l3-phase.js` fix prompts and the `loop-3-development.md` fix-role Input contain "root cause"/"cause, not the symptom".
- **D-ii.** both fix prompts and the fix-role Output contain "reproduces"/"red→green" scoped to correctness/behavior.
- **D-iii.** `escalation-rules.md` deadlock procedure contains "architectural/decomposition defect" and "option (a) the recommended default".
- **D-iv.** `escalation-rules.md` deadlock report contains "Evidence of where it breaks".

A deliverable ticks only when its [S] greps pass, its [B] scenario (if any) passes, and global ACs stay green.

## 8. Risks and Rollback

| Risk | Likelihood | Mitigation / Rollback |
|---|---|---|
| `l3-phase.js` prompt edits break the script | Low | AC-W2-G2 per phase touching it; content-only additions. Revert phase commit. |
| C3 step becomes an uncounted retry loop at closeout | Low/High | Decision W2-2 bounds it (one fix round then escalate). AC asserts the bound text present. |
| Reference-file bloat | Medium | Per-deliverable ≤few lines; review corner enforces. SKILL.md untouched (AC-W2-G4). |
| Reviewer over-blocking again (advisory generals) | Medium | Reuse the calibrated panel runner from Wave 1 (E-iii calibration in the review prompt). |
| C1 watch-it-fail not mechanically provable from a static diff | Known | Honest split: dev-prompt instruction + review git-log check (diff-checkable) + [B] scenario; recorded. |

Rollback: two phases, two commits, green gates; revert either to restore the prior state.

## 9. Lesson → Deliverable crosswalk (Wave 2 subset)

| Lesson ID | Deliverable |
|---|---|
| `tdd-iron-law-l3` | C1 |
| `evidence-over-claims-phaseend` | C2 |
| `f-correctness-review` | C3 |
| `root-cause-gate-fix-corner` | D-i |
| `reproduction-test-for-fixes` | D-ii |
| `architectural-reframe-on-cap` | D-iii |
| `diagnostic-deadlock-report` | D-iv |
