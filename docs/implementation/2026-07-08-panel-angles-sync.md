# Implementation: Gate the Adversarial Panel-Angles Sync

```
Status: closed
Closing-commit: <CLOSING_SHA>
Closed-on: 2026-07-08
Deferred: none
```

Task slug: `2026-07-08-panel-angles-sync`
Design doc: `docs/design/2026-07-08-panel-angles-sync.md` (L1-closed, 3 rounds).

## Task Index

Maps to design Deliverables (§2) and ACs (§7):
- reconcile PANEL_ANGLES → ANGLES (l3-phase.js) → Deliverable 1; AC2.
- byte-identity gate in check-consistency.sh → Deliverable 2; AC1.
- claude-md-integration.md:81 gate-enforced note → Deliverable 3; AC4.
- CLAUDE reconciliation → Deliverable 4; AC5.
- both syntax gates green → Deliverable 5; AC3.

## Phase Breakdown

Single atomic Phase. **No behavioral fixture** — this is a mechanical content-equality gate; the gate *is* the
test (design §3). TDD order: add the gate check first (it goes RED because the lists currently differ), then
reconcile PANEL_ANGLES to make it GREEN.

No unit-test suite. `<ACCEPT-CMD>`:
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` → exit 0
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/review-panel.js` → exit 0

### Phase 1 — reconcile PANEL_ANGLES + gate the sync

**Entry condition:** L1 closed (done).
**Design references:** design §2, §4 (D1/D2), §7.

**Task list, in TDD order:**

1. **[test] Add the byte-identity gate** to `check-consistency.sh`. First confirm the script's shebang supports
   process substitution (it is `bash`); if so, add:
   ```bash
   extract_angles() { sed -n "/const $2 = \[/,/^]/p" "$1" | sed '1d;$d'; }  # strip the const line + the ] line
   if ! diff <(extract_angles "$SKILL/references/review-panel.js" ANGLES) \
             <(extract_angles "$SKILL/references/l3-phase.js" PANEL_ANGLES) >/dev/null 2>&1; then
     echo "DRIFT: panel-angles — review-panel.js ANGLES != l3-phase.js PANEL_ANGLES (must be byte-identical)"
     fail=1
   fi
   ```
   The `sed` range ends on the bracket-only line `/^]/` (not any line containing `]`). If the shebang is not
   bash / process-substitution is unavailable, fall back to comparing two `"$(extract_angles …)"` command
   substitutions with `[ "$a" = "$b" ]`. (Gate RED here — the two lists currently differ.)
2. **[impl] Reconcile `PANEL_ANGLES`** in `references/l3-phase.js` to the **richer canonical `ANGLES`** wording
   from `references/review-panel.js` (design D2): replace the five `PANEL_ANGLES` string literals with the exact
   five `ANGLES` strings (byte-for-byte). **Edit only the five string literals** inside the `PANEL_ANGLES = [ … ]`
   array; the `const` name stays `PANEL_ANGLES`, the surrounding `panelReview` code is untouched. After this the
   gate goes GREEN.
3. **[impl] Update `references/claude-md-integration.md:81`** — note the **JS↔JS** sync is now gate-enforced by
   `check-consistency.sh` (byte-identity of the two lists); keep the note scoped to the JS pair (the
   source-of-truth arm vs SKILL.md "Core principles", and the `multi-voter-review.md` prose site, stay
   reviewer-checked, not byte-gated).
4. **[impl] Reconcile CLAUDE.md** _common-commands_: name the new panel-angles sync check in the gate
   description.

**Per-task acceptance command (whole Phase, from repo root):**
- `bash three-loop-workflow/references/check-consistency.sh` → exit 0 (the new sync check passes; no regression).
- Negative test (record in closeout, then revert): perturb one `PANEL_ANGLES` string → `check-consistency.sh`
  exits non-zero with the `panel-angles` DRIFT message → revert.
- `diff <(sed -n '/const ANGLES = \[/,/^]/p' three-loop-workflow/references/review-panel.js | sed '1d;$d') <(sed -n '/const PANEL_ANGLES = \[/,/^]/p' three-loop-workflow/references/l3-phase.js | sed '1d;$d')` → empty.
- `check-workflow-syntax.sh` on both `l3-phase.js` and `review-panel.js` → exit 0.

**Exit condition:** all `<ACCEPT-CMD>` exit 0; the two angle lists are byte-identical; SKILL.md `wc -w` unchanged
(2880); `git diff` touches only l3-phase.js (the 5 PANEL_ANGLES strings), check-consistency.sh, CLAUDE.md,
claude-md-integration.md, and the two archive docs (trace test).

## Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (anti-bloat; zero SKILL.md edit; English). The JS scripts
  are plain JavaScript — validate with `check-workflow-syntax.sh`, not `node --check`; preserve `l3-phase.js`'s
  load-bearing control flow (only the 5 PANEL_ANGLES string literals change) and `review-panel.js`'s ANGLES
  (unchanged — it is canonical).
- **Four-corner / L3 procedure:** `references/loop-3-development.md`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):`; `fix(phase1-roundR): <keyword>`.

## Data and Fixture Dependencies

- No new fixture (mechanical gate). No data files.

## Regression Protection

- `review-panel.js` `ANGLES` is unchanged (canonical); only `l3-phase.js` `PANEL_ANGLES` strings change.
- `l3-phase.js` control flow (loops, counters, panelReview, two-generation) untouched — syntax gate + the
  targeted diff confirm it.
- Existing gate tokens + fixtures remain green (the new check is additive; do not alter existing checks or the
  `[ -d tests/scenarios ]` guard). SKILL.md untouched — `wc -w` ceiling holds.
