# Implementation: Disambiguate the Dependency-Upgrade Tier Boundary

Task slug: `2026-07-08-tier-boundary-dependency`
Design doc: `docs/design/2026-07-08-tier-boundary-dependency.md` (L1-closed, 3 rounds).

## Task Index

Maps to design Deliverables (§2) and ACs (§7):
- SKILL.md frontmatter (`:3`) + None-row (`:25`) `minor/patch` qualifiers → Deliverable 1; AC2.
- fixture → Deliverable 2; AC3.
- (No gate / CLAUDE edit — the fixture is unregistered, matching sibling tier fixtures.)
- regression: l3-phase.js syntax gate → AC4.

## Phase Breakdown

Single atomic Phase (2 word-qualifiers + 1 fixture). TDD order: author the fixture first (it encodes the
intended tier decision), then apply the two SKILL.md qualifiers.

No unit-test suite (CLAUDE.md _common-commands_). `<ACCEPT-CMD>`:
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (incl. the SKILL.md `wc -w` ≤ 2888 check)
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
- the new `tests/scenarios/*.md` run via a fresh subagent → asserted `expected` holds

### Phase 1 — minor/patch qualifier + major-bump fixture

**Entry condition:** L1 closed (done).
**Design references:** design §2, §4 (D1/D2), §7.

**Task list, in TDD order:**

1. **[test] Author the fixture** `tests/scenarios/tier-major-dependency-bump-is-full.md`, forcing a discrete
   A/B/C tier choice (mirror `dep-upgrade-still-gets-a-review.md` / `quickly-add-is-full.md`): a proposed
   **major-version** dependency bump (e.g. `react 17 → 18`, or `foo 3.x → 4.0`) framed as "just a version
   bump, no code change." The tempting-but-wrong pick is **None** (citing the None-row "dependency upgrade").
   Correct = **Full** — a dependency **major-version migration** (per the migration definition), which also
   triggers the F migration-verification step. `expected: {"chosen_tier":"Full"}`. State inline why a rule-less
   agent reading the *unqualified* None row would pick None.
   **Insert the bare word `minor/patch` — no markdown bold markers — in both edits below** (the `**…**` in the
   design doc was emphasis, not literal content; the frontmatter is plain-text trigger prose with no markdown).
2. **[impl] Qualify the frontmatter** (`SKILL.md:3`): change "and dependency upgrades" → "and minor/patch
   dependency upgrades" (in the "Skip the full cycle … for …" clause).
3. **[impl] Qualify the None-tier row** (`SKILL.md:25`): change "doc reordering / dependency upgrade" →
   "doc reordering / minor/patch dependency upgrade".

**Per-task acceptance command (whole Phase, from repo root):**
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (SKILL.md `wc -w` ≤ 2888; the two
  qualifiers add +2 → ~2880; no existing token/fixture regression).
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0.
- `grep -c "minor/patch" three-loop-workflow/SKILL.md` returns 2 (frontmatter + None row); the Full row
  (`:23`) and the migration definition are unchanged.
- The fixture runs via a fresh subagent → asserted `expected` `{"chosen_tier":"Full"}` holds.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; the fixture passes; SKILL.md `wc -w` ≤ 2888 (record the exact
count); `git diff` touches only SKILL.md (the two qualifier phrases), the one new fixture, and the two archive
docs (design + impl) — the trace test.

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (anti-bloat binding on SKILL.md — this is a +2-word
  edit within headroom, deliberate; English; terminology consistent with the migration definition).
- **Four-corner / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):`; `fix(phase1-roundR): <keyword>`.

## Data and Fixture Dependencies

- Reuse the forced-pick tier format from `tests/scenarios/dep-upgrade-still-gets-a-review.md`. One new fixture;
  no data files. The fixture is **not** gate-registered (matches its siblings).

## Regression Protection

- The existing `dep-upgrade-still-gets-a-review.md` (patch bump → None-with-a-review) stays green — a patch
  bump is still `minor/patch` → None; do not edit it.
- SKILL.md `wc -w` stays ≤ 2888; the Full-tier row, migration definition, `light-mode.md`, `check-consistency.sh`,
  and CLAUDE.md are untouched.
- `l3-phase.js` / `review-panel.js` untouched — syntax gates stay green.
