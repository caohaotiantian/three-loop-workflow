# Design — v1.5 Wave 1: anti-summary surface + one consolidated rationalization table

```
Status: closed (wave)
Phase-commits: 817bc4a (Phase 1, Group A), d531f26 (Phase 2, Group B)
Closed-on: 2026-06-15
Deferred: none — all 7 deliverables (A1–A4, B1–B3) shipped and verified
Note: installed-copy sync + umbrella consolidation + final program review are deferred to the Wave 3 program closeout (per umbrella §0).
```

**Slug:** `2026-06-15-skill-v1-5-wave-1-anti-summary-table`
**Loop:** L1 (design) · Wave 1 of the v1.5 program
**Umbrella:** `docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` — §3 (scope boundary/guardrails),
§4b (cross-cutting corrections, **binding here**), §9 (all-32 crosswalk).
**Evidence base:** `docs/design/2026-06-15-superpowers-comparison.md` (the report; greppable lesson-ID Appendix).

This wave ships **Group A** (anti-summary surface + tier calibration) and **Group B** (one consolidated
rationalization/red-flag table). It is the report's recommended first cut — highest leverage, net prose
neutral-or-negative on the always-loaded surface. Every umbrella §4b correction applies; the wave-specific
consequences are restated where they bite.

## 1. Background and Purpose

Two of the skill's three blind spots live entirely on surfaces this wave touches:
- **Anti-summary thesis violation:** the always-loaded `description` summarizes the workflow, and the
  "Quick orientation" blockquote is a second paraphrasable summary — the exact shortcut trap superpowers
  documented (an agent follows the gist and skips the body where the discipline bites).
- **No named rationalizations:** a `grep` over the whole skill finds exactly one rationalization rebuttal
  (`escalation-rules.md:27`), despite the skill existing because agents shortcut discipline under pressure.

**Purpose:** shrink/trim the always-loaded summaries and add the single highest-leverage compliance device
(a curated Excuse→Reality table) at the point of temptation. **If we do not:** the loaded surface keeps
letting agents paraphrase past the load-bearing mechanisms, and the predictable excuses stay unguarded.

## 2. Deliverables

Acceptance class: **[S]** structural grep/gate · **[B]** behavioral (ad-hoc structured-output scenario at
this wave's EER closeout, per umbrella §4b correction 3).

**Group A — anti-summary + tier calibration** (`SKILL.md`, `light-mode.md`)
- [x] A1 **[S]** Delete the workflow-summary middle sentence of the `description` ("It enforces a three-loop discipline … explicit escalation rules."); keep trigger/skip keywords. Bump `metadata.version` `1.4.0` → `1.5.0` (the release this wave opens). (`description-no-workflow-summary`)
- [x] A2 **[S]** Replace the "Quick orientation" blockquote (SKILL.md ~lines 34-38) with an **Operating-rule** directive: execute from the reference files; once routed, read that reference **in full** before acting; operating from a gist is the drift this skill prevents. (`demote-quick-orientation`)
- [x] A3 **[S]** Add a ≤4-row "Looks Light, is actually Full" table to `light-mode.md` immediately after "When in doubt → Full", reusing escalation trigger vocabulary verbatim ("threshold", "breaking change", ">3 files"). (`tier-worked-examples`)
- [x] A4 **[S]** Add one code-fenced cap Iron-Law line immediately above the A2 Operating-rule directive — restoring (sharper) the cap reminder A2 removes with the blockquote: `HITTING THE ROUND CAP ESCALATES — IT NEVER LOWERS THE BAR.` (`imperative-iron-law-framing`; see Decision W1-4.)

**Group B — one consolidated rationalization table** (`escalation-rules.md` canonical; inline reviewer subset in `l3-phase.js` review prompt + `loop-1-design.md`/`loop-2-implementation.md` templates; pointers from `SKILL.md`, `loop-3-development.md`, `end-to-end-review.md`)
- [x] B1 **[S]** ONE curated rationalization/red-flag table (≤9 rows, grouped by surface: tier · review/accept · fix/round-cap · escalation), homed in `escalation-rules.md` after the "Forbidden" section. Rows = dedup union of all table-lessons (`rationalization-table`, `rationalization-table-harvested-from-baseline`, `review-stage-rationalization-table`, `fix-corner-red-flags`, `design-elicitation-rationalization-row`, `tdd-rationalization-table`). Each Reality cell cites an existing clause. **Must include** the net-new row *"they said do it quickly / just add Y" → instructions say WHAT not HOW; terse phrasing is not a tier downgrade.* **Plus** the skip-clarifying content delivered as a `Forbidden` **bullet** (umbrella §4b "G2"): "deferring the interpretation decision to the L1 reviewer — the reviewer reads only the doc, it cannot know intent."
- [x] B2 **[S][B]** Inline the **review-relevant** trip-wire rows (genuinely-clean-first-round; read the diff not the dev summary; an unresolved general issue blocks closure) into the surface the reviewer actually reads — the `l3-phase.js` review prompt and the L1/L2 review templates (umbrella §4b correction 1). All three rows are gated structurally (AC-B2). The **[B]** scenario this wave covers only the **read-the-diff-not-the-summary** trip-wire (the highest-risk one); the genuinely-clean and general-blocks-closure rows are structural-only this wave and get their behavioral coverage when the standing suite lands in Wave 3.
- [x] B3 **[S]** One-line pointer to the B1 table from `SKILL.md` (near "Principle composition"), `loop-3-development.md` (near the role table), `end-to-end-review.md` (near the closure rule). No table duplication.

## 3. Scope Boundary

- Inherits the umbrella §3 boundary verbatim (binding): no banned imports (HARD-GATE, delete-and-restart,
  4-phase debugging scaffold, **no "Strengths/praise" section** — and per §4b correction 6 we do **not**
  add a praise no-op guard), no new `references/*.md` file, no relaxed bar, Surgical Changes only.
- **Wave-scoped exclusions:** Groups C–G are out of scope for Wave 1 (separate waves). This wave does **not**
  add the persistent `tests/scenarios/` suite (Wave 3) — its one [B] item uses an ad-hoc closeout scenario.
- No semantic change to termination/round-cap/identity-isolation. A4 restores (does not strengthen or
  weaken) the cap reminder; B1/B2 add rebuttals that point at *existing* rules, changing no rule.

## 4. Key Design Decisions

**Decision W1-1 — Home of the consolidated table.** *(Overrides the report's stated homes — stated as an
override per the umbrella's disclosure rule. The report's `rationalization-table` lesson named `SKILL.md`;
its `review-stage-rationalization-table` lesson named `schemas.md`.)*
- Options: (a) **one consolidated table in `escalation-rules.md`** after "Forbidden"; (b) in `SKILL.md`
  after "Principle composition" (report's skill-craft home); (c) in `schemas.md` (report's review-stage home).
- **Choice: (a).** `escalation-rules.md` already holds the sole existing rationalization (line 27) and the
  "Forbidden / reasonable default" framing — the natural canonical home; it keeps the table **off** the
  always-loaded `SKILL.md` surface we are shrinking (A1/A2); and one table avoids the unverifiable
  zero-overlap problem that sank the three-table draft. **Rejected (b):** grows the always-loaded surface.
  **Rejected (c):** `schemas.md` is schema reference, not a temptation surface; and reviewers are only
  *pointed* there (umbrella §4b-1), so canonical-there + inline-in-prompt is still needed.

**Decision W1-2 — How review-relevant rows reach the reviewer (B2).** Basis = umbrella §4b correction 1
(`SKILL.md:32` role isolation: the reviewer receives only its prompt + artifact + linked docs; `l3-phase.js`
hands it only the prompt + diff + design/impl docs, pointing at `schemas.md` solely for the verdict schema).
- Options: (a) **canonical rows in `escalation-rules.md` + an inline operative subset in the review prompt/
  templates**; (b) canonical only (reviewer may never read it → dead weight); (c) inline only (no canonical
  home → drift, no human/maintainer surface).
- **Choice: (a).** The prompt is the only guaranteed-read reviewer surface, so the operative subset lives
  there; the canonical table lives once in `escalation-rules.md`. This is the report's canonical-plus-inline
  pattern, and the inline subset is ~3 lines, not a second table.

**Decision W1-3 — L2 phase split for this wave.**
- Options: (a) **2 phases: Phase 1 = Group A (anti-summary), Phase 2 = Group B (table + inline + pointers)**;
  (b) 1 phase (all of A+B together); (c) per-file phases.
- **Choice: (a).** A and B are independent and touch mostly different files; two phases keep each L3 review
  focused and each commit revertible. **Rejected (b):** one big diff is harder to review surgically.
  **Rejected (c):** B legitimately spans several files as one cohesive change; per-file would fragment it.

**Decision W1-4 — Keep or drop A4 (the report flagged "drop if redundant with the blockquote").**
- Options: (a) **keep A4 as a one-line cap Iron-Law**; (b) drop it.
- **Choice: (a).** The report's drop-condition was redundancy *with the Quick-orientation blockquote* — but
  A2 **removes** that blockquote, which currently carries the only "round cap … never a relaxed bar" reminder
  on that surface. A4 therefore **restores** that message in one sharper line; it is not redundant with A2
  (A2 is a read-in-full directive, different content). **Rejected (b):** dropping would silently delete the
  cap reminder A2 removes.

## 5. Dependencies, Assumptions, Mechanical Consequences

- Baseline gates green (verified at program start: `check-consistency.sh` OK, `check-workflow-syntax.sh` ok).
- Edits are **text-anchored, not line-number-anchored** (the L3 dev corner re-reads each file before editing).
- **Every AC grep anchors on a UNIQUE new-content string** absent from the pre-edit file (verified by running
  the grep against the baseline first → must return 0), per umbrella §4b/AC-G7.
- Version bump to `1.5.0` is **minor** (umbrella §4b/G15): all v1.5 additions are backward-compatible
  clauses/optional fields; nothing is removed or breaks an external contract.
- Installed-copy sync + the final program-level umbrella consolidation happen at the **Wave 3 program
  closeout**, not per wave (so A1's loaded-surface effect is verified once, at the end); each wave still runs
  its own EER closeout for its own deliverables.

## 6. Relationship with Existing Designs

- Child of the umbrella program doc; extends v1.4 (`2026-06-09-skill-orchestration-upgrade.md`). No conflict.
- Terminology anchors: `SKILL.md`, CLAUDE.md _language-policy_, existing `docs/design/`. English.

## 7. Acceptance Criteria (measurable, automatable)

**Global**
- **AC-W1-G1.** `bash three-loop-workflow/references/check-consistency.sh` exits 0 (authority for paired-site
  token invariants).
- **AC-W1-G2.** `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` exits 0 (B2 edits the review-prompt string). *Limitation recorded:* parse-only; B2's reviewer behavior is covered by the [B] scenario + the L3 review corner reading the diff.
- **AC-W1-G3 (token regression).** The pinned pre-edit commitment tokens (five role names, `fix(phaseN-roundR)`, "five questions", two-generation wording) each still `grep`-match; AC-W1-G1 is authoritative for paired sites.
- **AC-W1-G4.** `grep 'version: "1.5.0"' three-loop-workflow/SKILL.md` matches.
- **AC-W1-G5 (anti-bloat, measurable — umbrella §4b-5).** The bloat-relevant metric for the always-loaded surface is **word count**, not physical lines (a code-fenced A4 is ~3 physical lines but few words). Assert `wc -w three-loop-workflow/SKILL.md` is **≤ the pre-edit baseline**: A1 deletes a ~40-word sentence, which more than covers A2's trimmed directive + A4's short fenced line + B3's one-line pointer. Both the baseline and post-edit `wc -w` are recorded in the Phase commit trailer. (Physical-line delta is reported too, for transparency, but word-count is the gating budget.)
- **AC-W1-G6 (banned-import, fireable only).** `grep` finds none of: an unconditional "every project … regardless" HARD-GATE imperative; "delete the implementation and restart"/"delete it. Start over" as an *instruction*; each pattern verified to return 0 on the pre-edit baseline (AC-G7). **No praise-guard** (umbrella §4b-6). `ls three-loop-workflow/references/*.md | wc -l` unchanged from baseline.

**Per-deliverable [S] (anchor strings; absent from baseline)**
- **A1.** `grep -c "It enforces a three-loop discipline" SKILL.md` = 0; "just do X" / "quickly add Y" / "Skip only for" still present.
- **A2.** SKILL.md contains "Operating rule" and "read … in full"; `grep -c "Quick orientation" SKILL.md` = 0.
- **A3.** `light-mode.md` contains the unique heading "Looks Light, is actually Full" AND a unique new row-cell phrase introduced by the table (e.g. "splitting to dodge is still Full" and "default-threshold decision"). The grep is scoped to strings absent from the pre-edit `light-mode.md` (NOT the bare words "threshold"/"breaking change", which already occur — AC-G7).
- **A4.** SKILL.md contains the exact line "ESCALATES — IT NEVER LOWERS THE BAR" immediately above the Operating-rule directive.
- **B1.** `escalation-rules.md` contains the table heading + a row matching "WHAT not HOW" / "quickly add Y"; row count ≤ 9; plus a `Forbidden` bullet matching "reviewer reads only the doc".
- **B2.** `l3-phase.js` review prompt and the L1/L2 templates each contain an inline trip-wire phrase ("read the diff, not the … summary" and/or "genuinely clean" and/or "general issue … blocks closure").
- **B3.** A one-line pointer to the B1 table exists in each of `SKILL.md`, `loop-3-development.md`, `end-to-end-review.md`.

**Behavioral [B] (ad-hoc, at EER closeout; structured output — umbrella §4b-3)**
- **AC-W1-BEH.** A fresh subagent is given (i) the post-edit `l3-phase.js` review prompt, (ii) a small diff whose dev summary says "all done, looks good" but which contains a planted unhandled-error defect, and must emit `{read_diff: bool, flagged_defect: bool}`. **Pass = `read_diff == true AND flagged_defect == true`.** This checks B2's inline trip-wires actually steer the reviewer to read the diff rather than trust the summary.

A deliverable is ticked only when its [S] greps pass, its [B] scenario (if any) passes, and the global ACs stay green.

## 8. Risks and Rollback

| Risk | Likelihood | Mitigation / Rollback |
|---|---|---|
| A2 removes the cap reminder, losing it from the loaded surface | Medium | A4 restores it as a one-liner (Decision W1-4); AC-A4 checks it present. |
| Consolidated table grows past budget | Low | ≤9-row cap (AC-B1); AC-W1-G5 net-line budget. Rollback: revert Phase 2. |
| Inline trip-wires (B2) duplicate the table → bloat | Low | B2 is a ~3-line subset, not a table (Decision W1-2); canonical lives once. |
| A1 description edit drops a commitment token | Low | AC-W1-G1/G3; the deleted sentence carries no unique commitment token (verified: all live elsewhere). |
| [B] scenario flaky | Low | structured boolean output + planted defect = crisp pass/fail (umbrella §4b-3). |

Rollback: two phases, two commits, green gates; revert either to restore the prior state.
