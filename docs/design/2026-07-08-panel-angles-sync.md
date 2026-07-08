# Design: Gate the Adversarial Panel-Angles Sync (F1)

```
Status: closed
Closing-commit: e0cc8dc
Closed-on: 2026-07-08
Deferred: none  (Wave 4 remainder — F5/F13/F14 trims, F15 token-strengthening, F6 calibration dedup, F4 references budget — see memory backlog)
```

Task slug: `2026-07-08-panel-angles-sync`
Tier: **Full Mode** (edits load-bearing JS `review-panel.js` + `l3-phase.js` + the gate + `claude-md-integration.md`).
Provenance: Wave 4 of the approved audit backlog (`memory/improvement-waves-plan-2026-07-07`) — finding F1
(the panel-angles clause is a registered commitment clause but ungated, and has already drifted).

## 1. Background and Purpose

The adversarial review panel's five angles (the four core principles restated as voter lenses + correctness)
exist **twice**: `ANGLES` in `references/review-panel.js` and `PANEL_ANGLES` in `references/l3-phase.js`. They
are a **registered commitment clause** (`claude-md-integration.md:81`: source of truth = SKILL.md "Core
principles"; reference sites = both JS lists) — but the clause is **not gated**, and the two lists have already
**drifted**:

- `review-panel.js` `ANGLES`: *"SCOPE CREEP / Simplicity First: anything beyond the stated deliverables;
  **speculative abstraction**."*, *"…single-option decisions, silent defaults, **unstated assumptions**."*,
  *"…contract **/ cross-file** drift."*, *"…dead **or unreachable** logic."*
- `l3-phase.js` `PANEL_ANGLES`: the same five angles with the **shorter** wording (each clause trimmed).

Both lists still cover the same five angles, so the drift is currently cosmetic — but it is exactly the
un-gated divergence the consistency gate exists to prevent: nothing stops a future edit adding a sixth angle to
one list, or sharpening one and not the other, so the standalone and inline panels silently review against
**different** adversarial lenses. The commitment-clause registration promises they stay in sync; the gate must
enforce it.

## 2. Deliverables

- [ ] **Reconcile the two lists to byte-identical angle strings.** Adopt the richer `review-panel.js` `ANGLES`
      wording as canonical and update `l3-phase.js` `PANEL_ANGLES` to match it exactly (the five angle string
      literals identical; the surrounding `const NAME = [ … ]` and code unchanged). No behavior change beyond
      the inline panel now using the fuller angle text.
- [ ] **Gate the sync** in `check-consistency.sh`: extract the five angle string literals **anchored to the
      array block** — a `sed` range from `const ANGLES = [` / `const PANEL_ANGLES = [` to the **bracket-only closing line** (`/^]/`, not any line merely *containing* `]`, so a future angle string holding a literal `]` cannot truncate the range early — parallel to the apostrophe caveat) (NOT a
      whole-file grep of `'…',` lines, which would leak an unrelated bare single-quoted-string line from either
      file's other code and false-fail) — strip the differing `const NAME` line, and **fail if the two extracted
      blocks are not byte-identical** (a `panel-angles drift` DRIFT message). This is a *content-equality* check;
      **byte-identity is deliberately stronger than "same set of angles"** — a semantically-equivalent reword of
      one list *will* red-fail, which is the point (forbid wording drift, not just angle-count drift). Note: a
      single-quoted JS literal cannot carry an unescaped apostrophe, so a future angle needing one must switch
      both literals' quoting (and the extractor) together.
- [ ] **`claude-md-integration.md:81`** updated to note the **JS↔JS** sync is now **gate-enforced** (the clause
      was table-registered only; now `check-consistency.sh` verifies byte-identity of the two JS lists). Scope
      the note precisely to the JS pair — the clause's *source-of-truth arm* (both lists agreeing with SKILL.md
      "Core principles") stays a fresh-eyes/reviewer property, not byte-gated; do not imply the whole clause is
      now mechanically gated.
- [ ] CLAUDE.md _common-commands_ gate description reconciled to name the new panel-angles sync check.
- [ ] Both syntax gates (`check-workflow-syntax.sh` on `l3-phase.js` and `review-panel.js`) stay green.

## 3. Scope Boundary (NOT in scope)

- **No change to the angle *content*'s meaning** — the five angles stay the four principles + correctness; only
  the shorter list is brought up to the richer wording. No sixth angle, no removal.
- **No behavioral fixture** — this is a **mechanical gate** (content-equality), and the gate *is* the test: it
  fails on drift and passes on sync. A pressure scenario would add nothing a byte-comparison doesn't already
  guarantee (unlike a discipline rule, there is no agent decision to observe).
- **No change to the panel mechanics** (`panelReview`, quorum, mechanical union) or the review/accept loops.
- **No SKILL.md surface change** — the lists live in `references/*.js`. `wc -w` unchanged.
- **No extraction to a shared module** — the two Workflow scripts are independently loaded by the runtime and
  cannot share an import; two copies kept in sync by the gate is the pragmatic design (a shared module would
  change how the scripts are invoked, out of scope).

## 4. Key Design Decisions

### D1 — Gate the sync vs de-duplicate to one source vs leave documented-only
- **Problem:** two copies of the angles drifted because nothing enforced the registered "keep in sync" clause.
- **Options:** (a) **gate byte-identity** of the two lists (keep two copies, enforce equality); (b) extract the
  angles to a single shared source both scripts import; (c) leave it as a documented-only clause.
- **Choice: (a).** Rationale: (b) is not available cheaply — the two `l3-phase.js` / `review-panel.js` scripts
  are separately loaded by the Workflow runtime (each is a self-contained `export const meta …` script; there
  is no shared-module mechanism without changing how they're invoked). (c) is the current failed state (the
  clause was documented but ungated → it drifted). (a) enforces the exact load-bearing property (the two lists
  are the same angles) with a small `check-consistency.sh` addition, matching how every other commitment clause
  is gated. Rejected (b): infra change out of scope; (c): the status quo that failed.

### D2 — Canonical wording = the richer `ANGLES` (not the shorter `PANEL_ANGLES`)
- **Choice:** adopt `review-panel.js` `ANGLES` (the fuller text — "speculative abstraction", "unstated
  assumptions", "cross-file drift", "unreachable logic") as canonical, because it is strictly more complete: it
  names more of each angle's failure surface, so the inline panel gains coverage rather than losing it.
  Bringing the richer list *down* to the shorter one would discard real adversarial prompts. Rejected: the
  shorter wording (loses coverage).

## 5. Dependencies and Assumptions

- Depends on the existing two JS lists, the `check-workflow-syntax.sh` gate, and `check-consistency.sh`'s
  extend-with-a-check pattern.
- Assumes both angle lists use single-quoted string literals on their own lines (they do), so a line-based
  extraction is reliable.
- No external systems; no control-flow change to the panel mechanics.

## 6. Relationship with Existing Designs

- Edits `references/review-panel.js` + `references/l3-phase.js` (the two angle lists), `check-consistency.sh`
  (the new sync check), and `claude-md-integration.md:81` (the registration note). Complements — does not alter
  — the panel mechanics (`multi-voter-review.md`, unchanged) and the four principles (SKILL.md, the source of
  truth, unchanged). Terminology anchor: `claude-md-integration.md` commitment-clause table.

## 7. Acceptance Criteria (measurable / automatable)

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0. The new panel-angles check passes with
   the two lists synced. **Negative test:** temporarily perturbing one angle string in one file makes the gate
   exit non-zero with a `panel-angles drift` message (demonstrate in the closeout, then revert).
2. The five angle string literals are **byte-identical** between `l3-phase.js` `PANEL_ANGLES` and
   `review-panel.js` `ANGLES` — verify with the **block-anchored** extractor (sed range `[`…`]`, drop the
   `const NAME` line): `diff <(extract l3-phase) <(extract review-panel)` is empty. The extractor keys on the
   array block, not a whole-file `'…',` grep.
3. `check-workflow-syntax.sh` on both `l3-phase.js` and `review-panel.js` exits 0 (the JS still parses).
4. `references/claude-md-integration.md:81` states the sync is gate-enforced (grep). SKILL.md `wc -w` unchanged.
5. CLAUDE.md _common-commands_ names the new panel-angles sync check (grep).

Quality budget: N/A — gate/consistency change to a skill.

## 8. Risks and Rollback

- **Risk: the extraction/compare is fragile (misses an angle or false-matches).** Mitigation: AC1's negative
  test (perturb → gate fails) proves the check actually discriminates; AC2's `diff` proves byte-identity; the
  extraction keys on the stable single-quoted-string-per-line shape.
- **Risk: the JS edit breaks a script.** Mitigation: AC3 syntax gates; the edit is string-literal only in
  `PANEL_ANGLES`, and the panel code reads the array unchanged.
- **Risk: over-claiming a behavioral change.** Mitigation: §3 — no fixture; the gate is the test.
- **Rollback:** revert the branch. Two string-literal edits + one gate check + two doc lines. No control-flow,
  no state. Reversible.
