# Implementation: F-phase project-closeout expansion

Design: `docs/design/2026-06-22-f-phase-project-closeout.md` (8 sections, D1–D11, KD1–KD7, AC1–AC8).

## 1. Task Index

| Design item | Where it lands |
|---|---|
| D1 blast-radius / B1 (design §2; KD1) | Phase 1 — `end-to-end-review.md` whole-project review step |
| D2 repo-wide gates / B2 (design §2; KD1 predicate) | Phase 1 — `end-to-end-review.md` run-commands step |
| D3 change-orphan sweep / B3 (design §2) | Phase 1 — `end-to-end-review.md` cleanup step |
| D4 migration verification / B4 (design §2; KD3) | Phase 1 (F step) + Phase 2 (tier trigger) |
| D5 project-doc reconciliation / B5 (design §2; KD4) | Phase 1 — new F step + AC7 cross-ref literals |
| D6 SKILL.md surface sync (design §2; KD5 anchor, KD7 budget) | Phase 2 |
| D7 gate parity (design §2; KD5) | Phase 0 (table registration, pre-edit) + Phase 4 (gate require lines) |
| D8 five behavioral fixtures (design §2 + D8 matrix; AC4) | Phase 3 |
| D9 Light-Mode echo (design §2) | Phase 2 |
| D10 version bump + README rows (design §2; AC8) | **F closeout** (dogfoods D5) — not an L3 Phase |
| D11 §8 risk sync (design §2) | done in design §8 (no code) |
| AC1–AC8 (design §7) | Phase acceptance commands below |

**Slug parity:** design and impl docs share slug `2026-06-22-f-phase-project-closeout` (SKILL.md naming convention).

## 2. Phase Breakdown

> TDD framing for doc/gate edits: each acceptance command is a `grep`/exit-code assertion. Where a
> token is *new*, the assertion is **red before the edit, green after** (the red→green check is the
> test). Phase 4's `require` lines are added **last** so every token/fixture they pin already exists —
> otherwise the gate would red-fail mid-cycle (Phase ordering is load-bearing).

### Phase 0 — Register new commitment clauses (`references/claude-md-integration.md`), pre-edit

Honors the canonical registration-order rule (`claude-md-integration.md:94` + design KD5): a new
commitment clause is registered in the cross-file table **before modifying any file**. This is the
first edit of the cycle.

- **Entry condition:** L1 + L2 closed; design doc on disk.
- **Design references:** §2 D7(i); §4 KD5 (reference-site table + cross-ref delimiter).
- **Task list:**
  1. Add one cross-file-table row per new clause (B1–B5) with its source (`end-to-end-review.md`) and
     reference-site set exactly per the KD5 table, plus a row for the AC7 cross-reference delimiter.
     (The table is a source↔reference-site *mapping*, not a grep target, so registering rows whose
     tokens are added in Phases 1–3 is correct and is the point of "register before editing".)
- **Per-task acceptance command:**
  ```sh
  cd three-loop-workflow && for t in 'blast-radius' 'repo-wide validation gates' 'change-orphan' \
    'migration verification' 'project-doc reconciliation'; do \
    grep -qF "$t" references/claude-md-integration.md || { echo "UNREGISTERED $t"; exit 1; }; done && echo PHASE0-OK
  ```
- **Exit condition:** new clause rows present in the `claude-md-integration.md` table; review passes.

### Phase 1 — Canonical F procedure (`references/end-to-end-review.md`)

- **Entry condition:** Phase 0 committed (clauses registered); design doc on disk.
- **Design references:** §2 D1–D5, D8 matrix (`expected:` values), §4 KD1 (blast-radius bound +
  validation-gate predicate), KD3 (migration trigger), KD4 (boundary test + cross-ref literals).
- **Task list (TDD order):**
  1. **Assert-red:** `grep -F 'blast-radius' references/end-to-end-review.md` → no match (confirms the
     behavior is genuinely new). Repeat for `repo-wide validation gates`, `change-orphan`,
     `migration verification`, `project-doc reconciliation step below`, `two-doc consolidation step above`.
  2. **Extend step 2 (B2):** run *whatever validation gates `_common-commands_` declares* (not only
     `<TEST-CMD>`), with the KD1 operational predicate (a gate = a command whose exit code is a
     pass/fail verdict on repo correctness/consistency; build/deploy/packaging actions are not gates,
     run per-file for arg-driven gates — defer the per-`.js` invocation detail to the runner).
  3. **Extend the cleanup step (B3):** add a project-wide **change-orphan** sweep (remove artifacts
     *this change* orphaned; never pre-existing dead code — Principle 0.3). Token `change-orphan`.
  4. **Add conditional migration step (B4):** define the **migration trigger** canonically here
     (schema / data-backfill / config-format / storage-layout / API-protocol-version / dependency
     migration; cite overlap-but-distinct from the breaking-change list), the checklist, and the
     `Migration: n/a` skip record. Token `migration verification`. (Trigger defined **only here** —
     duplicating the definition elsewhere is a language-policy severe.)
  5. **Extend step 4b (B1) → whole-project review:** add the blast-radius scan outside the diff
     (consumers/callers of changed/removed symbols are updated) alongside the existing
     diff-vs-Deliverables review. Token `blast-radius`.
  6. **Add project-doc reconciliation step (B5):** the KD4 operational boundary test (a doc passage
     whose described behavior the diff altered is in scope; unrelated docs are drive-by, forbidden).
     Place this step **after** the consolidation step so the AC7 directional literals read correctly.
  7. **Add the two AC7 cross-reference literals:** the consolidation step body gets
     `project-doc reconciliation step below`; the new D5 step body gets `two-doc consolidation step above`.
  8. **Renumber** the checklist cleanly (today it has a duplicate "step 4" + "4b"); preserve every
     existing step's content. Surgical: no rewording of unchanged steps.
- **Per-task acceptance command** (run from repo root, `three-loop-workflow/` is the cwd-relative base):
  ```sh
  cd three-loop-workflow && for t in 'blast-radius' 'repo-wide validation gates' 'change-orphan' \
    'migration verification' 'project-doc reconciliation step below' 'two-doc consolidation step above'; do
    grep -qF "$t" references/end-to-end-review.md || { echo "MISSING: $t"; exit 1; }; done && echo PHASE1-OK
  ```
- **Exit condition:** all six tokens present in `end-to-end-review.md`; the migration trigger defined
  once; checklist renumbered with no content loss; fresh-eyes L3 review passes.

### Phase 2 — Always-loaded surface + tier gate (`SKILL.md`, `references/light-mode.md`)

- **Entry condition:** Phase 1 committed.
- **Design references:** §2 D6/D9, §4 KD5 (bound anchor), KD6 (version), KD7 (net-neutral trim + token
  guard), D4/KD3 tier consequence.
- **Task list (TDD order):**
  1. **Assert word baseline:** `wc -w < SKILL.md` (record; ceiling 2888).
  2. **SKILL.md Task-closed bullet (D6):** append one compact clause carrying the five literal gate
     tokens (`blast-radius`, `repo-wide validation gates`, `change-orphan`, `migration verification`,
     `project-doc reconciliation`).
  3. **SKILL.md net-neutral trim (KD7):** compress the Self-check L1/L2 bullets' repeated
     two-generation phrasing into one shared clause; **measure** recovered words. Guard: do **not**
     drop the gate literals `zero severe` / `zero general`, and do **not** collapse the
     L1/L2-strict-two-generation vs L3-clean-first-relaxation distinction (both load-bearing). If the
     measured net delta still exceeds headroom, raise the ceiling in `check-consistency.sh` with a
     one-line justification (deliberate fallback, KD7(b)).
  4. **SKILL.md tier table (D4/KD3):** add the Full-Mode trigger using the **distinctive literal
     `any migration`** (e.g. "…; or **any migration** (schema / data / config / storage / API-version /
     dependency)") in the Full-Mode "When" cell. The literal `any migration` is deliberately chosen so
     the acceptance check is **not** satisfied by the substring `migration` inside `migration
     verification` (Phase 2 step 2) — it pins the *tier* edit specifically. This trigger phrase is
     **not** gate-`require`-pinned (consistent with un-pinned siblings `breaking change` /
     `magic-number`).
  5. **SKILL.md version (KD6):** `metadata.version` `1.5.2` → `1.6.0`.
  6. **light-mode.md (D9):** add the one-line echo carrying **both** literal tokens `change-orphan`
     **and** `project-doc reconciliation`; and add the Full-Mode-forcing entry carrying the same
     literal `any migration` (e.g. "no migration — **any migration** forces Full Mode") so a
     non-breaking migration cannot stay in Light Mode.
- **Per-task acceptance command:**
  ```sh
  cd three-loop-workflow
  W=$(wc -w < SKILL.md); [ "$W" -le 2888 ] || { echo "BLOAT $W"; exit 1; }
  for t in 'blast-radius' 'repo-wide validation gates' 'change-orphan' 'migration verification' \
    'project-doc reconciliation'; do grep -qF "$t" SKILL.md || { echo "MISS SKILL $t"; exit 1; }; done
  grep -qF '1.6.0' SKILL.md || { echo "no version"; exit 1; }
  grep -qF 'any migration' SKILL.md || { echo "MISS SKILL tier-trigger 'any migration'"; exit 1; }
  for t in 'change-orphan' 'project-doc reconciliation' 'any migration'; do
    grep -qF "$t" references/light-mode.md || { echo "MISS light $t"; exit 1; }; done
  echo PHASE2-OK
  ```
- **Exit condition:** `wc -w ≤ 2888`; five tokens in SKILL.md; version bumped; `any migration` in
  SKILL.md tier table; `change-orphan`+`project-doc reconciliation`+`any migration` in light-mode.md;
  review passes.

### Phase 3 — Behavioral fixtures (`tests/scenarios/`, non-load-bearing)

- **Entry condition:** Phases 1–2 committed (the rules the fixtures observe exist).
- **Design references:** §2 D8 + the D8 demonstration matrix (`expected:` JSON per fixture); AC4.
- **Task list (TDD order — each fixture *is* the regression test for its behavior):**
  1. Create `tests/scenarios/closeout-blast-radius-untouched-caller.md` →
     `expected: {"action":"block-closure-blast-radius"}`.
  2. `closeout-runs-all-declared-gates.md` → `{"action":"run-all-declared-gates"}` (scenario must make
     the unrun declared gate the deciding red signal — tests green, that gate would fail).
  3. `closeout-orphan-sweep-not-scheduled.md` → `{"action":"run-change-orphan-sweep"}` (discriminator
     is the *scheduled project-wide sweep*, an un-revisited file's orphan — NOT the 0.3 spare-rule).
  4. `closeout-migration-unverified-blocks.md` → `{"action":"block-closure-verify-migration"}`.
  5. `closeout-doc-reconcile-changed-surface.md` → `{"action":"reconcile-changed-surface-only"}`
     (updates the changed-surface passage; spares the unrelated typo).
  Each fixture follows the existing format (prose pressure scenario + single-line `expected:` JSON),
  and each states the before→after delta so a reviewer can confirm before≠after.
- **Per-task acceptance command** (run from **repo root** — `tests/scenarios/` is at the repo root,
  NOT under `three-loop-workflow/`, so there is no `cd` prefix here):
  ```sh
  for s in closeout-blast-radius-untouched-caller closeout-runs-all-declared-gates \
    closeout-orphan-sweep-not-scheduled closeout-migration-unverified-blocks closeout-doc-reconcile-changed-surface; do
    test -f tests/scenarios/$s.md && grep -q 'expected:' tests/scenarios/$s.md || { echo "BAD $s"; exit 1; }; done && echo PHASE3-OK
  ```
- **Exit condition:** five fixtures exist with their fixed `expected:` JSON; each independently
  fresh-agent reviewed (non-load-bearing one-review tier); each before→after delta confirmed real
  (a fresh subagent on the **unedited** skill would not produce the `expected`).

### Phase 4 — Gate parity (`references/claude-md-integration.md`, `references/check-consistency.sh`)

- **Entry condition:** Phases 1–3 committed (all tokens + fixtures exist, so the new `require` lines
  go green immediately).
- **Design references:** §2 D7 (i–iv), §4 KD5 (reference-site table + cross-ref gate + consolidation
  parity).
- **Task list (TDD order):**
  1. **claude-md-integration.md table:** already registered in **Phase 0** (pre-edit, honoring the
     `claude-md-integration.md:94` registration-order rule). Re-confirm the rows are present before
     adding the gate lines below.
  2. **check-consistency.sh `require` lines** (placed in the accumulate body, **after** `cd "$ROOT"`;
     the gate sets `SKILL="three-loop-workflow"` and runs at repo root, so **every skill-file path is
     `$SKILL/...`** — `$SKILL/SKILL.md` and `$SKILL/references/<file>` — matching the existing gate
     lines; only the repo-root `tests/scenarios/` path is bare):
     - `require "blast-radius"  "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md"`
     - `require "repo-wide validation gates"  "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md"`
     - `require "change-orphan"  "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md" "$SKILL/references/light-mode.md"`
     - `require "migration verification"  "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md"`
     - `require "project-doc reconciliation"  "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md" "$SKILL/references/light-mode.md"`
     - cross-ref pair: `require "project-doc reconciliation step below"  "$SKILL/references/end-to-end-review.md"` and
       `require "two-doc consolidation step above"  "$SKILL/references/end-to-end-review.md"`
     - consolidation parity (D7iv): `require "<token>" "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md" "$SKILL/references/loop-2-implementation.md"`
       — **pick a fixed-string token present case-identically in all three** (`require` uses
       `grep -qF`, case-sensitive). NB casing trap: `end-to-end-review.md` heading is
       `Document consolidation` (capital D) but SKILL.md / loop-2 use lowercase
       `document consolidation`; the lowercase single word **`consolidation`** is present in all three
       (verified) and is the safe parity token — verify on disk before pinning.
     - fixture-existence loop (D7iii, accumulate form, after `cd "$ROOT"`; `tests/scenarios/` is at
       repo root so the path is bare, **not** `$SKILL/`-prefixed):
       `for s in <five slugs>; do test -f "tests/scenarios/$s.md" || { echo "DRIFT: missing fixture $s"; fail=1; }; done`
  3. Do **not** add a `require` for the bare `migration` tier-trigger word (intentionally un-pinned).
- **Per-task acceptance command:**
  ```sh
  bash three-loop-workflow/references/check-consistency.sh && echo PHASE4-OK
  ```
  (This is the integration gate: exit 0 proves every new token, the cross-ref pair, the consolidation
  parity token, the five fixtures, and the `wc -w` ceiling are all satisfied — validating Phases 1–3.)
- **Exit condition:** `check-consistency.sh` exits 0; table rows registered; review passes.

### F-closeout tasks (D10 — dogfooded D5/version sync; runs at F, not an L3 Phase)

D10 is deliberately performed during this change's **own** F closeout (it *is* an instance of the new
B5 project-doc reconciliation + version sync applied to this change). Spelled out so the F executor
does not reconstruct it from the design:

- **Tasks:** (a) `SKILL.md metadata.version` `1.5.2`→`1.6.0` is already done in Phase 2 step 5; (b) add
  a **new v1.6.0 row** to the version-history table in `README.md` **and** `README-cn.md` (Chinese
  translation per `_language-policy_`), each row containing the literal phrase **`project-wide
  closeout`**; (c) confirm the F-label cell (README.md:35) and tree comment (:131) need no edit
  (no-ops, design D10).
- **F acceptance command (AC8 — per-file, since `grep -q t f1 f2` passes on *any* file):**
  ```sh
  for f in three-loop-workflow/SKILL.md README.md README-cn.md; do grep -q '1.6.0' "$f" || { echo "MISS 1.6.0 in $f"; exit 1; }; done
  for f in README.md README-cn.md; do grep -q 'project-wide closeout' "$f" || { echo "MISS phrase in $f"; exit 1; }; done
  echo D10-OK
  ```
  (Run standalone at F — do **not** paste into the gate's accumulate body, trap §3.3.)

## 3. Engineering Constraints Index

- **Project engineering norms:** CLAUDE.md _engineering-norms_ role (skill-distribution repo; Markdown +
  two `.js` Workflow scripts + `.sh` gates + `tests/scenarios/`; anti-bloat binding on `SKILL.md`).
- **Four-corner subagent template:** `references/loop-3-development.md` (dev / review / accept / fix).
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phaseN):` / `fix(phaseN):` openers,
  `fix(phaseN-roundR): <keyword>` within-round fixes; no AI/model/tooling mentions.
- **Implementation traps surfaced by the L1 panels (carry into L3):**
  1. `require()` is `grep -qF` (case-sensitive fixed-string) — the consolidation parity token must be
     case-identical across all three sites (heading casing differs).
  2. The fixture-existence loop and any new `require` lines go **after** `cd "$ROOT"` in
     `check-consistency.sh`, and use `fail=1` (accumulate-then-exit), never `exit 1`.
  3. AC8's per-file `grep -q … || exit 1` snippet is a **standalone** acceptance command (run on its
     own at F) — do **not** paste it into the gate's accumulate body verbatim.
  4. `migration` (tier trigger) and `migration verification` (closeout step token) are **distinct
     literals** with distinct homes; pin only the latter.
  5. Keep the two AC7 cross-ref literals on their correct sides (the B5 token is a substring of the
     consolidation-side literal — harmless, but don't collapse them).
  6. `schemas.md` and `loop-3-teams.md` are **intentionally not edited** (the F whole-change review
     already reuses `ReviewVerdict` per schemas.md:69; teams mode-2 lens list is illustrative, not a
     gate obligation — verified no contradiction introduced).

## 4. Data and Fixture Dependencies

- **Reuse:** existing `tests/scenarios/*.md` format (prose + single-line `expected:` JSON, e.g.
  `closeout-general-finding-deferred.md`, `quickly-add-is-full.md`).
- **New:** five fixtures (Phase 3). No other test resources.

## 5. Regression Protection

- All 13 pre-existing `tests/scenarios/*.md` must still yield their `expected` under a fresh-subagent
  run (AC5) — verified in F (behavioral gate).
- All pre-existing `check-consistency.sh` tokens stay green (the gate is run whole in Phase 4 / F).
- `SKILL.md` `wc -w` ≤ 2888 (AC6) — the net-neutral trim must not regress the ceiling.
- Every existing F step's content survives Phase 1's renumber (no step dropped).

---
Status: closed
Closing-commit: (set at the closing commit on branch feat/f-phase-project-closeout)
Closed-on: 2026-06-22
Deferred: none
