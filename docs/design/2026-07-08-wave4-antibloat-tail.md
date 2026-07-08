# Design — Wave 4 anti-bloat / hygiene tail (F5, F6, F13, F14, F15, F4)

```
Status: closed
Closing-commit: c068279
Closed-on: 2026-07-08
Deferred: none
```

## 1. Background and Purpose

The v1.9.0 self-audit + external re-mine produced a four-wave improvement plan whose substance
shipped as v1.9.1–v1.12.1. What remains is the **Wave 4 anti-bloat / gate-integrity tail** — six
net-neutral-to-net-negative hygiene items. They do not change agent behavior; they reduce
over-documentation, drift-proof two duplicated review-prompt blocks, and close two soft spots in
the consistency gate. Left undone, `references/` keeps accreting prose, two silently-drifting
copies of the Calibration/Grounding block stay ungated (the exact class of bug the F1 panel-angles
gate just fixed), and a bare-word gate token (`consolidation`, 15 incidental occurrences across its gated sites)
gives false-green drift protection.

(All `consolidation` occurrence figures in this doc are: 15 across the three currently-gated sites —
end-to-end-review.md 11 + SKILL.md 3 + loop-2 1.)

## 2. Deliverables

- [ ] **F5** — trim `references/failure-retrospective.md` (811 w): compress the "subject-partition"
  treatise (lines 29–38) while preserving the two triggers, the skip predicate, the dedup boundary,
  the three-field record, the landing test, the `failure_retrospective` gate token, and every field
  name asserted by the four `failure-retrospective-*` fixtures.
- [ ] **F6** — drift-proof the Calibration/Grounding duplication: add a **byte-identity gate** (mirroring
  the F1 panel-angles check) asserting the `[Calibration]` and `[Grounding]` lines are identical between
  `loop-1-design.md` and `loop-2-implementation.md`. No extraction (the templates must stay self-contained
  spawn prompts); `l3-phase.js`'s deliberately-reworded panel copy is excluded and noted as intentionally variant.
- [ ] **F13** — trim `references/loop-3-teams.md` (572 w): tighten prose, preserve the three modes,
  the identity guardrail, the "when NOT to use a team" rule, the auto-advance exclusion, and the
  self-contained-spawn-prompt sentence (reviewer teammate must inline schema + principles — D1 leans on it).
- [ ] **F14** — trim `references/optional-subagents.md` (679 w): tighten prose, preserve the four agent
  definitions, the honest enforcement boundary, the model-routing note, and the mandatory fallback.
- [ ] **F15** — replace the 3-site bare `consolidation` gate token (a common word, 15 occurrences → near-zero
  drift protection) with a **distinctive references/-only paired token** across `end-to-end-review.md` ↔
  `loop-2-implementation.md` (SKILL.md prose left untouched per decision).
- [ ] **F4** — add a **per-file word-budget lever** to `check-consistency.sh`: no single `references/*.md`
  may exceed a uniform soft cap (3000 words).
- [ ] CLAUDE.md _common-commands_ consistency-gate description updated to match the F4/F6/F15 gate changes.
- [ ] Skill patch version bumped v1.12.1 → v1.12.2. **Two distinct operations** (not a uniform swap):
  (a) **same-shape numeric swap** of the version token in `SKILL.md` frontmatter `version:` and `CLAUDE.md`
  ("currently v1.12.1") — does not change `SKILL.md`'s `wc -w`; (b) **add a new v1.12.2 changelog row** to
  `README.md`'s "What's new" table describing F4/F5/F6/F13/F14/F15 (the existing `1.12.1` row is the
  panel-angles record and must NOT be relabeled), and a **Chinese translation** of that new row to
  `README-cn.md` per the CLAUDE.md _language-policy_ (this is translated prose, a real language-policy step,
  not a numeric swap).
- [ ] Zip rebuilt and installed-copy synced per Common Commands.

## 3. Scope Boundary

**NOT in scope:**
- **F11** (cap × two-generation starvation) — explicitly deferred pending a user decision on the
  review-coverage trade-off; unchanged here.
- **W3 A3 / B3** — dropped in the plan; not revived.
- **No behavior change.** No termination rule, escalation rule, tier boundary, principle, or
  review-prompt *semantics* change. F6 only gates existing text; it does not reword it.
- **F6 extraction** — not pursued; the duplication is intentional (self-contained spawn prompts), so
  the fix is a sync gate, not a shared include.
- **F15 SKILL.md / `migration verification`** — SKILL.md prose is not touched (anti-bloat surface);
  `migration verification` is not strengthened (its pairing includes SKILL.md, so it is out of scope).
- **No global references/ ceiling** — rejected as fighting the skill's push-detail-into-references design.
- **No trim that drops a load-bearing clause** — trims are prose-density only; every gated token,
  fixture-asserted field, and behavioral rule survives verbatim in meaning.
- **`loop-1-design.md` (2692 w, largest references file) is NOT trimmed here** — its bulk is dense gated
  rules (evidence-rule, spike, verbatim-evidence, negation→positive), not redundant prose; trimming it
  risks dropping a gated clause, a risk out of proportion to this hygiene wave. It is instead named the
  F4 cap **watch-item** (see D2) — the file most likely to approach the cap on the next L1-craft edit.

## 4. Key Design Decisions

**D1 — F6: gate the sync, do not extract.**
- Problem: the `[Calibration]`/`[Grounding]` block is byte-identical in loop-1 and loop-2 and can drift silently.
- Options: (a) extract to one canonical block + pointer; (b) byte-identity gate (like panel-angles); (c) leave ungated.
- Choice: **(b)**. Rejected (a): the review templates are copy-paste spawn prompts a fresh subagent
  receives inlined (`loop-3-teams.md` documents this requirement); a pointer defeats self-containment and
  needs the same sync machinery anyway. Rejected (c): that is precisely the drift F1 just closed. (b) is
  the established, near-zero-cost pattern already proven in this repo.
- Boundary: gate covers only the two byte-identical lines (`[Calibration]`, `[Grounding]`). The `[Trip-wires]`
  line legitimately differs (L1 vs L2) and is excluded. `l3-phase.js`'s panel-context copy ("ADD-only") is
  deliberately variant and excluded.
- Extraction anchor: unlike the multi-line panel-angles array (a `sed` range), these are **single lines** —
  extract each with a prefix-anchored grep (`grep '^\[Calibration\]'`, `grep '^\[Grounding\]'`); each marker
  occurs exactly once per file (verified), so a prefix match is unambiguous.

**D2 — F4: per-file soft cap, one uniform number.**
- Problem: `references/` (~17.9k w) grows unchecked; a global ceiling would penalize healthy
  SKILL.md→references/ redistribution (the skill's own anti-bloat design).
- Options: (a) global total ceiling; (b) uniform per-file cap; (c) drop.
- Choice: **(b)** at 3000 w. Rejected (a): fights the push-detail-out design and false-fails on
  redistribution. Rejected (c): leaves the real failure (one file ballooning) ungated. (b) catches
  ballooning without penalizing distribution; one number, low maintenance. Scope: `*.md` only (the two
  `.js` files are code, not prose). 3000 leaves the current max (loop-1-design.md, 2692) ~308 w headroom.
- **Watch-item**: `loop-1-design.md` (2692 w) is the largest references file and the actively-growing one
  (recent L1-craft additions). It will approach the cap first. The cap's response to a legitimate breach is
  to trim that file's redundancy OR raise the one number in a reviewed change — never to block healthy growth
  (see R2). The cap catches *ballooning*; it does not freeze dense files.

**D3 — F15: replace bare `consolidation` with a distinctive references/-only paired token.**
- Problem: `grep -qF consolidation` passes on incidental hits (15 occurrences across the three currently-gated
  sites: end-to-end-review.md 11 + SKILL.md 3 + loop-2 1) → the token proves nothing about the clause's presence.
- Options: (a) distinctive underscore literal marker (like `failure_retrospective`); (b) a distinctive
  natural phrase shared by both sites (e.g. "document consolidation", which does appear in both); (c) drop.
- Choice: **(a)**, references/-only. Rejected (b): even "document consolidation" risks incidental recurrence
  and breaks convention consistency with the other underscore-literal gate tokens; a purpose-built marker
  guarantees exactly-once. Rejected (c): the user chose to strengthen. SKILL.md is excluded per decision (protect the always-loaded
  surface); the SKILL.md consolidation clause relies on the always-loaded review + word ceiling instead of a
  near-worthless bare-word grep. Token: `consolidation_pass`, injected once into each of the two reference sites'
  consolidation clauses, following the existing underscore-literal marker convention.

**D4 — F5/F13/F14: prose-density trims, behavior-preserving.**
- Problem: three reference files carry redundant/over-explained prose.
- Choice: compress wording only. Every gated token, fixture-asserted field name, behavioral rule, and
  cross-reference survives. Fresh-review verifies no load-bearing clause was lost — the primary risk.

## 5. Dependencies and Assumptions

- Consistency gate: `three-loop-workflow/references/check-consistency.sh` (source of truth for F4/F6/F15).
- Behavioral fixtures under `tests/scenarios/` lock the load-bearing behavior of the trimmed files;
  they must still pass cold after F5.
- The four core principles and the tier gate are unchanged; this is a Full-Mode cycle because every
  target is a load-bearing file.
- Line-extraction tooling for F6: a prefix-anchored `grep` + `diff` (F6 gates single lines), alongside the
  existing `sed`-range + `diff` block-extraction the panel-angles check already uses — both available.
- Assumption: `bash three-loop-workflow/references/check-consistency.sh` is the accept command; there is
  no unit-test suite (per CLAUDE.md _common-commands_).

## 6. Relationship with Existing Designs

- Prior per-task `docs/design/*.md` exist (2026-06-22 … 2026-07-08 archives — closeout, craft-lens,
  diagnosis-method, spike-branch, verbatim-evidence, panel-angles-sync, etc.), but none covers this
  gate-hygiene / anti-bloat domain, so there is no design conflict. Terminology anchors: CLAUDE.md
  _common-commands_ / _language-policy_ roles, `SKILL.md`, and the existing `check-consistency.sh`.
- **F6 mirrors the shipped panel-angles sync** (`check-consistency.sh` lines 86–95; PR #13, v1.12.1) —
  same byte-identity-gate pattern, applied to a second duplicated block.
- **F15 follows the shipped underscore-literal token convention** (`failure_retrospective`, `evidence_rule`,
  `spike_answer`, `verbatim_evidence`, `diagnosis_method`).
- CLAUDE.md _common-commands_ documents every gate token; it is updated in lock-step (no conflict — it is the
  reference site being reconciled). No warning marker needed.

## 7. Acceptance Criteria

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0 after all edits.
2. **F6**: manually corrupting one `[Calibration]` line in loop-2 makes the gate exit non-zero with a
   `panel-angles`-style `DRIFT: calibration/grounding` message; reverting restores exit 0. (Demonstrated, then reverted.)
3. **F4**: appending >3000 words of filler to any `references/*.md` makes the gate emit a `BLOAT:` message and
   exit non-zero; removing it restores exit 0. (Demonstrated, then reverted.) With the real tree, every
   `references/*.md` is ≤3000 w so the gate is green.
4. **F15**: deleting the `consolidation_pass` token from either reference site makes the gate exit non-zero;
   both sites contain it → green. `grep -c consolidation_pass` = 1 in each of the two reference sites.
5. **F5/F13/F14**: each file's word count strictly decreases; `wc -w` recorded before/after. All
   `tests/scenarios/failure-retrospective-*.md` fixtures pass cold via a fresh subagent after F5.
6. **Anti-regression (per trimmed file)**: the tokens/fields that actually live in each trimmed file survive.
   For F5's `failure-retrospective.md`: the `failure_retrospective` gate token and the fixture-asserted field
   names `prevention_disposition` and `closure` (plus the `triggered`/`skipped` values) remain present; the
   full consistency gate (which checks the cross-file tokens) stays green (AC1).
7. `SKILL.md` **prose/body** untouched; only the frontmatter `version:` token changes (same-shape v1.12.1→
   v1.12.2 swap), so `SKILL.md` `wc -w` stays 2880 ≤ 2888.
7b. **Version bump verified at every site**: `grep` confirms `1.12.2` in `SKILL.md` frontmatter and `CLAUDE.md`;
   `README.md` has a **new** v1.12.2 "What's new" row (the v1.12.1 panel-angles row still present, unmodified);
   `README-cn.md` has the Chinese translation of that new row. No orphaned `1.12.1` "current-version" reference remains.
8. `check-workflow-syntax.sh` green for any `.js` touched (F6 touches no `.js`, but run if l3-phase.js is edited).
9. **CLAUDE.md gate-description reconciliation**: after the gate edits, CLAUDE.md _common-commands_ describes
   the new F6 calibration/grounding sync check, the F4 per-file `references/*.md` word cap, and the F15
   `consolidation_pass` token — and no longer describes the old bare-`consolidation` parity as-was. Confirmed by
   reading the updated CLAUDE.md against the final `check-consistency.sh` (also covered by F-step reconciliation).
10. Zip rebuilt and installed copy synced.

## 8. Risks and Rollback

- **Risk: a trim silently drops a load-bearing clause (F5/F13/F14).** Mitigation: AC6 token/field
  anti-regression grep + the fixture cold-run (AC5) + fresh-review reads the diff, not the summary.
  Rollback: `git revert` the trim commit; the gate and fixtures are unaffected by the other items.
- **Risk: F4 cap is too tight and false-fails a legitimately large file.** Mitigation: 3000 > current max
  (2692) with headroom; the cap is a soft ceiling reviewed per-change, not a hard architectural limit. If a
  file legitimately needs >3000 w, raising the one number is a one-line, reviewed change.
- **Risk: F6/F15 gate additions are asserted but never observed to fire.** Mitigation: AC2/AC3/AC4 each
  require a demonstrated red→green corruption test (the skill's "a behavior rule asserted but never observed
  is severe" standard applied to gate rules). Rollback: revert the `check-consistency.sh` hunk.
- **Risk: CLAUDE.md gate description drifts from the actual gate.** Mitigation: update it in the same cycle
  (Deliverable) and F-step project-doc reconciliation verifies it.
- Each of the six items is independently revertible; they share only `check-consistency.sh` (F4/F6/F15) and
  CLAUDE.md, edited in additive, non-overlapping hunks.
