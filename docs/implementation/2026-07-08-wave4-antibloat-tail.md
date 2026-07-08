# Implementation — Wave 4 anti-bloat / hygiene tail

## Task Index

Design document: `docs/design/2026-07-08-wave4-antibloat-tail.md`.
- Deliverables §2 (L17–45); Scope Boundary §3 (L47–65); Key Design Decisions §4 (L67–111);
  Acceptance Criteria §7 (L136–163); Risks §8 (L157–171).
- Phase↔Deliverable map: P1 → F6 (§2 L23), F4 (§2 L35); P2 → F15 (§2 L32); P3 → F5/F13/F14 (§2 L19,27,30);
  P4 → CLAUDE.md reconciliation (§2 L37) + version bump (§2 L38) + zip/sync (§2 L45).

**Note on TEST-CMD / ACCEPT-CMD (CLAUDE.md _common-commands_):** this repo has **no unit-test suite**.
`<TEST-CMD>` ≡ `bash three-loop-workflow/references/check-consistency.sh` (exit 0). Per-Phase `<ACCEPT-CMD>`s
are the gate plus, for each new gate check, a **red→green demonstration** (the "test-first" analog for a
gate/prose change: prove the check fires on a corrupt input, then revert). The behavioral `tests/scenarios/`
fixtures are the regression suite for F5.

## Phase Breakdown

### Phase 1 — F6 (calibration/grounding sync gate) + F4 (per-file word cap)

Both are additive edits to `three-loop-workflow/references/check-consistency.sh` only; no content file changes.

- **Entry condition**: L1/L2 closed; on branch `feat/wave4-antibloat-tail`.
- **Design references**: D1 (F6, design L69–81), D2 (F4, design L83–94); AC2, AC3 (design L139–143).
- **Task list (verification-first — the red→green demo is defined before the edit is trusted):**
  1. (demo/red for F6) Confirm the *absence* of the check: temporarily alter one `[Calibration]` line in
     `loop-2-implementation.md`; note that the current gate does **not** catch it (baseline). Revert.
  2. (impl) Add an F6 block to `check-consistency.sh` after the panel-angles check (~L95): extract the
     `[Calibration]` and `[Grounding]` lines from `loop-1-design.md` and `loop-2-implementation.md` via a
     prefix-anchored grep (`grep -m1 '^\[Calibration\]'`, `grep -m1 '^\[Grounding\]'`), `diff` each pair, and on
     mismatch print `DRIFT: calibration/grounding — loop-1-design.md != loop-2-implementation.md (must be
     byte-identical)` and set `fail=1`. Exclude `[Trip-wires]` (legitimately differs L1/L2) and `l3-phase.js`
     (deliberately reworded).
  3. (impl) Add an F4 block: loop over `three-loop-workflow/references/*.md`; for each, `wc -w`; if > the
     ceiling, print `BLOAT: <file> wc -w=<n> exceeds references ceiling <cap>` and set `fail=1`. Mirror the
     existing SKILL.md-ceiling block's shape (L176–182), but declare the cap **env-overridable** —
     `REFS_WORD_CEILING="${REFS_WORD_CEILING:-3000}"` — so the red demo can trigger it without editing the
     script (the SKILL ceiling is a plain assignment; the env-override form is a strict improvement and keeps
     the default at 3000).
  4. (accept/green) Run the gate → exit 0.
  5. (accept/red→green for F6) Mutate one word *inside* loop-2's `[Calibration]` line (keeping the
     `[Calibration]` prefix intact, so both sides still extract non-empty and the byte-`diff` itself fires) →
     gate prints `DRIFT: calibration/grounding` and exits non-zero → `git checkout` → exit 0.
  6. (accept/red→green for F4) **Primary (robust):** append >3000 filler words to a real `references/*.md`
     (`loop-3-teams.md`, 572 w) → gate prints `BLOAT:` and exits non-zero → `git checkout` the file → exit 0.
     **Convenience (env-override):** `REFS_WORD_CEILING=100 bash …/check-consistency.sh` → `BLOAT:` for the
     real large files → non-zero → re-run without the override → exit 0.
- **Per-task acceptance commands** (runnable from repo root):
  - `bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"` → prints `three-loop-consistency: OK` and `exit=0`.
  - F6 red demo (content drift, prefix kept): `perl -0pi -e 's/(\[Calibration\] Grade by actual severity: a genuine blocker)/$1X/' three-loop-workflow/references/loop-2-implementation.md && bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"; git checkout three-loop-workflow/references/loop-2-implementation.md` → shows `DRIFT: calibration/grounding` + `exit=1`, then clean.
  - F4 red demo (primary): `( yes word | head -3100 | tr '\n' ' ' >> three-loop-workflow/references/loop-3-teams.md ) && bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"; git checkout three-loop-workflow/references/loop-3-teams.md` → shows `BLOAT: .../loop-3-teams.md` + `exit=1`, then clean. (Env-override alt: `REFS_WORD_CEILING=100 bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"`.)
- **Exit condition**: gate exits 0 on the clean tree; both F6 and F4 red→green demos observed and reverted;
  `check-consistency.sh` carries both new blocks with clear `DRIFT:`/`BLOAT:` messages.

### Phase 2 — F15 (`consolidation_pass` distinctive token)

Edits `three-loop-workflow/references/end-to-end-review.md`, `three-loop-workflow/references/loop-2-implementation.md`,
and `check-consistency.sh` **together** (atomic — the require change and the token injections must land in one Phase or the gate reddens).

- **Entry condition**: Phase 1 committed; gate green.
- **Design references**: D3 (design L96–106); AC4 (design L144–145).
- **Task list:**
  1. (impl) Inject the literal token `consolidation_pass` exactly once into the document-consolidation clause of
     `end-to-end-review.md` (the F step-7 consolidation step) and once into the consolidation clause of
     `loop-2-implementation.md` (L60, the "pruned during F step 7 (document consolidation)" sentence), as a
     natural marker following the underscore-literal convention (e.g. "the single consolidation pass
     (`consolidation_pass`)").
  2. (impl) In `check-consistency.sh`, replace the existing `require "consolidation" <end-to-end> <SKILL.md>
     <loop-2>` (L64) with `require "consolidation_pass" <end-to-end-review.md> <loop-2-implementation.md>` — a
     distinctive references/-only paired token. Update the adjacent comment to explain the strengthening
     (bare word → distinctive literal; SKILL.md dropped per design, its consolidation surface covered by the
     always-loaded review + word ceiling).
  3. (accept/green) Gate exits 0; `grep -c consolidation_pass` = 1 in each of the two reference sites.
  4. (accept/red→green) Delete the token from either reference site → gate prints
     `DRIFT: commitment-clause token [consolidation_pass] missing from <file>` + non-zero → revert → exit 0.
- **Per-task acceptance commands:**
  - `bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"` → OK + `exit=0`.
  - `grep -c consolidation_pass three-loop-workflow/references/end-to-end-review.md three-loop-workflow/references/loop-2-implementation.md` → each `:1`.
  - red demo: `perl -0pi -e 's/consolidation_pass//' three-loop-workflow/references/end-to-end-review.md && bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"; git checkout three-loop-workflow/references/end-to-end-review.md` → `DRIFT` + `exit=1`, then clean.
- **Exit condition**: gate green; token present exactly once per reference site; red→green demo observed; no
  `require "consolidation"` (bare) remains in `check-consistency.sh`.

### Phase 3 — F5 / F13 / F14 (prose-density trims)

Independent trims to three reference files; no gate-logic change. Each preserves every gated token, fixture-asserted field, and behavioral rule.

- **Entry condition**: Phase 2 committed; gate green.
- **Design references**: F5/F13/F14 (design L19–31); D4 (L108–111); AC5, AC6 (design L146–151).
- **Task list:**
  1. (baseline) Record `wc -w` of `failure-retrospective.md`, `loop-3-teams.md`, `optional-subagents.md`.
  2. (impl F5) Compress `failure-retrospective.md` — primarily the "subject-partition" section (L29–38) — while
     preserving: the two triggers (deadlock path, F-systemic path), the skip predicate ("task-domain class
     absent"), the dedup boundary vs "Meta-test the cap", the three-field record, the landing test
     (load-bearing→defer, test-file→inline), the `failure_retrospective` token, and the field names
     `prevention_disposition`, `closure`, `triggered`, `skipped`.
  3. (impl F13) Compress `loop-3-teams.md` preserving the three modes, the identity guardrail, "when NOT to use
     a team", the auto-advance exclusion, and the self-contained-spawn-prompt sentence (inline schema + principles).
  4. (impl F14) Compress `optional-subagents.md` preserving the four agent definitions, the honest enforcement
     boundary, the model-routing note, and the mandatory fallback.
  5. (accept) Gate green; each file's `wc -w` strictly less than baseline.
  6. (accept/regression) The four `tests/scenarios/failure-retrospective-*.md` fixtures pass cold via a fresh
     subagent against the trimmed `failure-retrospective.md`.
- **Per-task acceptance commands:**
  - `bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"` → OK + `exit=0`.
  - `wc -w three-loop-workflow/references/{failure-retrospective,loop-3-teams,optional-subagents}.md` → each < baseline.
  - token survival: `grep -c 'failure_retrospective\|prevention_disposition\|closure' three-loop-workflow/references/failure-retrospective.md` → all ≥ 1.
  - fixture regression: fresh subagent runs each `tests/scenarios/failure-retrospective-*.md` `expected` assertion against the trimmed file (see Regression Protection).
- **Exit condition**: all three files smaller; gate green; every listed token present; fixtures pass cold.

### Phase 4 — CLAUDE.md gate-desc reconciliation + version bump + zip/sync

Doc/packaging reconciliation; no gate-logic change.

- **Entry condition**: Phase 3 committed; gate green.
- **Design references**: §2 L37–45; AC7, AC7b, AC9, AC10 (design L152–162, and the version deliverable L38–44).
- **Task list:**
  1. (impl) Update `CLAUDE.md` _common-commands_ consistency-gate paragraph: describe the new F6
     calibration/grounding byte-identity check, the F4 per-file `references/*.md` word cap (3000), and the F15
     `consolidation_pass` distinctive token (replacing the old bare-`consolidation` parity description).
  2. (impl) Bump version: `SKILL.md` frontmatter `version: "1.12.1"` → `"1.12.2"`; `CLAUDE.md` "currently
     v1.12.1" → "v1.12.2".
  3. (impl) Add a new **v1.12.2** row to `README.md`'s "What's new" table describing F4/F5/F6/F13/F14/F15;
     do NOT modify the existing v1.12.1 (panel-angles) row. Add the Chinese translation of the new row to
     `README-cn.md` (language-policy).
  4. (accept) Gate green (SKILL.md `wc -w` unchanged, ≤ 2888). Version present at all four sites; README v1.12.1
     row intact; README-cn row is a translation.
  5. (impl) Rebuild zip: `rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/`.
  6. (impl) Sync installed copy IF it exists: `rsync -a --delete three-loop-workflow/ "$HOME/.claude/skills/three-loop-workflow/"`.
- **Per-task acceptance commands:**
  - `bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"` → OK + `exit=0`.
  - `grep -rl '1\.12\.2' three-loop-workflow/SKILL.md CLAUDE.md README.md README-cn.md` → all four listed.
  - `grep -c '1\.12\.1' README.md` → ≥ 1 (the old row still present).
  - `wc -w < three-loop-workflow/SKILL.md` → 2880 (≤ 2888).
  - `unzip -l three-loop-workflow.skill | grep -c check-consistency.sh` → 1 (package rebuilt).
- **Exit condition**: CLAUDE.md matches the gate; version at all four sites with the v1.12.1 row preserved;
  gate green; zip rebuilt; installed copy synced (or skip recorded if none).

## Engineering Constraints Index

- **Engineering norms**: CLAUDE.md _engineering-norms_ role — Markdown + shell gate helpers; anti-bloat binding
  on SKILL.md; follow the four core principles; do not add CLAUDE.md roles.
- **Four-corner subagent template**: `references/loop-3-development.md` (dev / review / accept / fix, each a
  fresh subagent).
- **Commit conventions**: SKILL.md "Commit conventions" — `feat(phaseN):` / `fix(phaseN):` opener,
  `fix(phaseN-roundR): <keyword>` within-round; `<TEST-CMD>` result as trailer; no AI/tooling mention.
- **Gate helper**: `check-consistency.sh` is the source of truth; `check-workflow-syntax.sh` only if a `.js`
  is edited (none in this task).

## Data and Fixture Dependencies

- No new fixtures. The existing `tests/scenarios/failure-retrospective-*.md` (4 files) are reused as the F5
  regression suite. No new `tests/scenarios/*.md` is added (this task adds no behavior).
- No test data files. All acceptance is gate-exit-code + grep/wc + the fixture cold-run.

## Regression Protection

- **Every prior gate token stays green**: `check-consistency.sh` exit 0 after each Phase is the standing
  regression check (it asserts `failure_retrospective`, `two-generation`, `panel-angles`, `diagnosis_method`,
  `verbatim_evidence`, the F-closeout tokens, all fixtures exist, and the SKILL.md word ceiling).
- **F5 behavioral regression**: the four `failure-retrospective-*.md` fixtures must pass cold via a fresh
  subagent after the trim — asserting the trimmed doc still drives `triggered`/`skipped`,
  `prevention_disposition: deferred`, and `closure: blocked-pending-instance-fix` correctly.
- **SKILL.md word ceiling** (2888) is a standing regression gate; Phase 4's version bump must not breach it
  (same-shape token swap, verified 2880).
- **Panel-angles + all pre-existing checks**: unaffected; the gate run per Phase confirms no collateral drift.
</content>
