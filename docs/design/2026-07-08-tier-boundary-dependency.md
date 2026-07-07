# Design: Disambiguate the Dependency-Upgrade Tier Boundary (F2)

```
Status: closed
Closing-commit: <CLOSING_SHA>
Closed-on: 2026-07-08
Deferred: none
```

Task slug: `2026-07-08-tier-boundary-dependency`
Tier: **Full Mode** (edits the always-loaded SKILL.md tier table + frontmatter description).
Provenance: Wave 1b of the approved audit backlog (`memory/improvement-waves-plan-2026-07-07`) — finding F2.

## 1. Background and Purpose

A **major-version dependency bump** currently maps to two contradictory tiers:
- **None** — SKILL.md frontmatter (`:3`, "Skip the full cycle … for … dependency upgrades") and the None-tier
  row (`:25`, "Pure typo / doc reordering / **dependency upgrade** … no cycle").
- **Full** — SKILL.md Full-tier row (`:23`, "any migration (schema / data / config / storage / API-version /
  **dependency**)"), reinforced by the migration definition in `end-to-end-review.md` (B4: "a … **dependency
  major-version migration**") and the Light-Mode gate (`light-mode.md:20`, "any migration (… / dependency)
  forces Full").

So an agent bumping `foo 3.x → 4.0` reads the None row and skips the cycle, when it should be Full (a
dependency major-version migration). The existing fixture only exercises a *patch* bump
(`dep-upgrade-still-gets-a-review.md`, 4.17.20→4.17.21). This is a real mis-tier vector on a common task.

## 2. Deliverables

- [ ] **Qualify the None-tier dependency clause to `minor/patch`** — aligning it with the existing migration
      definition (a **major-version** bump *is* a dependency migration → Full). Two SKILL.md edits, both
      minimal:
      - Frontmatter description (`:3`): "dependency upgrades" → "**minor/patch** dependency upgrades".
      - None-tier row (`:25`): "dependency upgrade" → "**minor/patch** dependency upgrade".
      No change to the Full-tier row or the migration definition — a major bump already routes to Full via the
      existing "any migration (… / dependency)" trigger; this edit only closes the None-row's over-capture.
- [ ] Behavioral fixture `tests/scenarios/tier-major-dependency-bump-is-full.md` — a proposed **major-version**
      dependency bump framed as "just a version bump" → **Full Mode** (a dependency major-version migration),
      not None. `expected: {"chosen_tier":"Full"}` (the suite-standard key, matching every existing tier
      fixture). The tempting-but-wrong option is **None** (citing the pre-fix None row "dependency upgrade"), so
      the fixture discriminates the None-row over-capture. **Not** gate-registered in `check-consistency.sh` and
      **not** named in CLAUDE.md — matching its sibling tier fixtures (`quickly-add-is-full.md`,
      `dep-upgrade-still-gets-a-review.md`), which the manual behavioral gate runs but the consistency gate does
      not existence-check (gate-registration is reserved for feature-specific fixture families). This keeps the
      change to **two one-word qualifiers + one unregistered fixture**.

## 3. Scope Boundary (NOT in scope)

- **No change to the Full-tier row, the migration definition (`end-to-end-review.md` B4), or `light-mode.md`** —
  they are already correct (a dependency major-version migration is Full); the bug is only the None row's
  unqualified "dependency upgrade" over-capturing major bumps.
- **No new tier, no new severity class, no control-flow / gate change** — `check-consistency.sh` and CLAUDE.md
  are **not** touched (the fixture is unregistered, matching its sibling tier fixtures).
- **SKILL.md word ceiling respected** — the two qualifiers add ~2 words (2878 → ~2880 ≤ 2888).
- **No persistence/state.** Stateless.
- The F11 cycle (deferred) and Waves 2-4 are separate.

## 4. Key Design Decisions

### D1 — Qualifier: `minor/patch` vs `non-breaking` vs a new sub-rule
- **Problem:** what qualifier on the None-row "dependency upgrade" cleanly separates it from the Full-tier
  dependency migration, without inventing a new concept?
- **Options:** (a) **`minor/patch`** (semver) — a major bump is Full; (b) `non-breaking` — a breaking bump is
  Full; (c) a new explicit None-vs-Full dependency sub-rule paragraph.
- **Choice: (a).** Rationale: the skill's *own* migration definition (`end-to-end-review.md` B4) already names
  the Full case a "dependency **major-version** migration", so `minor/patch` is the exact complement — it
  reuses the existing boundary rather than introducing a second, subtly-different one. (b) `non-breaking` is
  fuzzier (breaking-for-whom?) and does not match the migration definition's major-version wording, risking a
  *new* ambiguity (a non-breaking major bump). (c) spends scarce always-loaded words on a paragraph when a
  one-word qualifier suffices (anti-bloat). Rejected (b)/(c). **The `minor/patch`↔major split is deliberately the
semver split**; a non-semver dep change (calendar/hash-pinned, or a `0.x` bump) matches neither the None row nor
"major-version migration" and falls to the existing **"When in doubt → Full"** backstop — the safe
(over-process) direction, and a strict improvement over the old unqualified wording that sent *all* bumps to None.

### D2 — Fixture: the major-bump → Full case (the untested cell)
- **Choice:** the existing `dep-upgrade-still-gets-a-review.md` covers the patch-bump → None-with-a-review
  cell; the untested, mis-tiered cell is the **major bump → Full**. The fixture forces that discrete tier
  decision under "just a version bump" minimization pressure. Rejected: re-testing the patch cell (covered).

## 5. Dependencies and Assumptions

- Depends on the existing tier table, the migration definition (`end-to-end-review.md` B4), and the
  behavioral-scenario discipline.
- Assumes semver-style dependency versioning is the common case the None row addresses (the fixture states its
  major-bump premise explicitly).
- No external systems, no control-flow change.

## 6. Relationship with Existing Designs

- Edits SKILL.md's tier gate (frontmatter + None row). Complements — does not alter — the migration definition
  (`end-to-end-review.md`, unchanged) and the Light-Mode migration gate (`light-mode.md`, unchanged), both of
  which already treat a dependency migration as Full. Terminology anchors: SKILL.md "Which tier applies",
  `end-to-end-review.md` B4 migration definition. First design to disambiguate the dependency tier boundary.

## 7. Acceptance Criteria (measurable / automatable)

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0 (unchanged — the gate is **not** edited
   this cycle), and **SKILL.md `wc -w` ≤ 2888** (assert the exact count in the closeout; the two `minor/patch`
   qualifiers add ~2 words, 2878 → ~2880, leaving ~8 headroom).
2. `SKILL.md` frontmatter (`:3`) and the None-tier row (`:25`) both qualify the dependency clause as
   `minor/patch` (grep both). The Full-tier row (`:23`) and the migration definition are unchanged; `git diff`
   touches only those two SKILL.md qualifier phrases (+ the new fixture + the two archive docs).
3. `tests/scenarios/tier-major-dependency-bump-is-full.md` exists with a discrete `expected: {"chosen_tier":
   "Full"}` (the suite-standard key) and runs green via a fresh subagent: a major-version dependency bump →
   Full. It **discriminates** — the tempting option is None (citing the pre-fix None row); a rule-less agent on
   the old unqualified wording could plausibly pick None.
4. `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js`
   exits 0 (regression guard; untouched).

Quality budget: N/A — process/docs change to a skill.

## 8. Risks and Rollback

- **Risk: `minor/patch` under-captures a rare non-major breaking dependency change.** Mitigation: such a change
  trips other Full triggers (breaking change / API-version migration) already in the table; the None row's job
  is only routine bumps, and the "When in doubt → Full" rule (`:23`) backstops edge cases.
- **Risk: SKILL.md word ceiling breach.** Mitigation: AC1 asserts `wc -w` ≤ 2888; the edit is +2 words (2878 →
  ~2880, ~8 headroom remaining).
- **Rollback:** revert the branch. Two-word qualifier + one fixture + gate line. No migration, no state.
  Reversible.
