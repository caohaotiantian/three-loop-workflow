# Design: Round-2 self-audit repair (substantive load-bearing findings)

Slug: `2026-06-16-audit-2-repair`
Status: closed
Closing-commit: <pending>
Closed-on: 2026-06-16
Deferred: none
Notes: L1 passed rounds 1–4 (2 severe + 4 general found and fixed; two-generation pass on the clean
confirming round). L2 passed rounds 1–3 (1 severe shape-only-acceptance + 2 general fixed). L3 Phases:
A closed clean-first-round (A5 scenario graded); B rounds 1–3 (a false-positive on a ref named "commit"
found+fixed, two-generation); C clean-first-round; D rounds 1–3 (a 4th incomplete-broadening `Deferred:`
site found+fixed, two-generation; D3 scenario graded); E clean-first-round + behavioral gate 13/13. F
whole-change correctness review passed (0 severe / 0 general). `SKILL.md` `wc -w` 2876 → 2860 (anti-bloat
held). Consistency + workflow-syntax gates green throughout. Folds into the unreleased v1.5.1.
Advisory follow-up (out of audit-2 scope): the `end-to-end-review.md` closure-rule report block (~:121)
still describes only the deferred-deliverable path; a later task could generalize it to deferred findings.

## 1. Background and Purpose

A fresh multi-lens audit of the v1.5.1 skill (40-agent workflow, adversarially
verified, 2026-06-16) surfaced 21 confirmed findings. The direct-edit and None-tier
subset was already applied (commit `18b6b92`). This task fixes the **substantive
load-bearing** subset, which touches `SKILL.md` / `references/*` and therefore requires
the full L1→L2→L3→F cycle.

Why it matters: every finding here is a place where the skill's own machinery either
states a protection it does not provide, or contains a latent correctness bug — the exact
failure class the skill exists to prevent. The headline (A1) is a documented closure
formula that silently collapses the strict two-generation rule into a single clean round.
If we do not fix these, a maintainer following the documented contract can close L1/L2 in
one round, ship a commit through a globally-flagged `git commit` the lint never screened,
or lose a general correctness finding at closeout.

Full finding text: `docs/audit-2026-06-16.md` is the prior (round-1) audit; the round-2
findings are recorded in this design doc directly (the round-2 report lives in the workflow
transcript, not a committed file).

## 2. Deliverables

Grouped into five independently-committable Phases.

**Phase A — Termination-contract integrity** (`references/schemas.md`, `references/check-consistency.sh`)
- [x] A1: Drop the `(verdict == "pass")` disjunct from the L1/L2 closure formula at `schemas.md:53` so closure is count-driven, matching the L3 form and `SKILL.md:154`.
- [x] A2: Reconcile the `verdict` enum description (`schemas.md:34`) so `pass` is a single-round readiness signal (zero severe AND zero general **this** round), not a "last round" claim a single reviewer cannot compute. Ensure all `verdict`-describing sentences in `schemas.md` agree after the edit (the enum at :34, the prose at :62, and the A3 note) — no residual "last round" wording.
- [x] A3: Add one line to `schemas.md` stating the mechanical closure decision uses only `severe_count`/`general_count`, never the `verdict` string. (`verdict` stays `required` — producers always emit it; no schema-contract or code change.)
- [x] A4: Add a regression guard to `check-consistency.sh` that fails if `schemas.md` reintroduces `verdict == "pass"` as a closure condition. Guard must be proven to fail (delete/inject test), not a comment-only no-op.
- [x] A5 (behavioral observation): add `tests/scenarios/l1-clean-first-round-still-confirms.md` — an orchestrator applying the `schemas.md` closure formula literally, L1 round 1 returned `verdict:"pass", severe_count:0, general_count:0`; expected the loop is **not** closed (a confirming round is required). This scenario **distinguishes** the fix: pre-edit the `(verdict=="pass")` disjunct closes it (wrong); post-edit the count-driven formula needs `round > 1` (correct). It observes the A1 rule change, not just the prose.

**Phase B — Commit-msg gate hardening** (`references/validate-commit-msg.sh`)
- [x] B1: Loosen the policing match so a `git commit` invoked with intervening global options (`git -C <path> commit`, `git -c k=v commit`, `git --no-pager commit`) is still screened. The match must tolerate option tokens **and their bare arguments** (e.g. `-C <path>`) between `git` and `commit`.
- [x] B2: Fix the no-jq `sed` fallback (`validate-commit-msg.sh:23`) so the `command` capture stops at the first unescaped closing quote instead of greedily bleeding across trailing JSON fields (`description`, …).

**Phase C — L3 path completeness** (`references/loop-3-development.md`, `references/loop-3-workflow.md`, `references/l3-phase.js`)
- [x] C1: Re-attribute the skill-self behavioral check off the accept corner (which never runs it on the recommended Workflow path and is barred from judging) onto the main-agent post-Workflow discharge list in `loop-3-workflow.md`; reword `loop-3-development.md:205` to be path-independent. **Ownership must be consistent across all sites**: the owner statement and any `Behavioral-check: complied` trailer instruction in `loop-3-development.md` (~199-205), the discharge block in `loop-3-workflow.md:72-77`, and the per-Phase self-check in `SKILL.md:197` — a fix that moves one site but leaves the trailer/self-check attributed to the accept corner re-creates the drift.
- [x] C2: Make the dev-escalation `concerns` fallback length-aware at `l3-phase.js:161` so an empty retry array does not mask the original blockers.

**Phase D — Accept / closeout contract** (`references/schemas.md`, `references/loop-3-development.md`, `references/end-to-end-review.md`)
- [x] D1: Re-attribute the per-command passed/failed/skipped/xfail tally from the accept subagent (which `AcceptVerdict` cannot carry and which is forbidden from interpreting output) to the main-agent PhaseEnd re-run; soften `loop-3-development.md:82` accordingly so the "skipped tests are not passing tests" guard has an owner that can actually apply it. (`loop-3-development.md:95` already references the closing-run tally; D1 only re-points the skip/xfail guard there and softens :82 — it adds no new requirement at :95.)
- [x] D2: Add a general-finding disposition to F-closeout step 4b (`end-to-end-review.md`): a general finding from the whole-change correctness review is recorded and either fixed in the same bounded round or filed as a follow-up listed in the closure block `Deferred:` line — it does not silently vanish. Per **D-D2**, also broaden the `Deferred:` line definition at `end-to-end-review.md:51` to two named item classes (deferred deliverable | deferred finding), each with a follow-up issue ID, so the line is not silently overloaded.
- [x] D3 (behavioral observation): add `tests/scenarios/closeout-general-finding-deferred.md` — the F-closeout 4b whole-change review returned zero severe but one general finding, not fixed this round; expected the task does **not** close clean — the general is recorded and routed to the closure block `Deferred:` line / a follow-up. Observes the D2 rule change (pre-edit 4b defines only the severe disposition, so the general could vanish; post-edit it must be recorded).

**Phase E — Light-Mode termination + SKILL.md surface** (`references/light-mode.md`, `SKILL.md`)
- [x] E1: Pin Light Mode's termination rule explicitly. **Primary edit in `light-mode.md`** (state the rule: a fully-clean first review closes; the moment any fix lands, a confirming clean round is required). **Plus a minimal `SKILL.md:155` touch** so its "L3-only clean-first-round relaxation" wording is not contradicted — note Light Mode mirrors the relaxation, with a pointer to `references/light-mode.md`. The `clean-first-round` token (paired `SKILL.md` ↔ `schemas.md` by `check-consistency.sh:45`) and the `two-generation` token must survive the edit. **Decision: clean-first-round relaxation** (see §4 D-E1).
- [x] E2: Qualify the Full-Mode file-count trigger at `SKILL.md:23` ("more than 3 files" → "more than 3 non-load-bearing files") to match the predicate used everywhere else.
- [x] E3: De-densify the `SKILL.md:25` None cell — keep the routing outcome plus a pointer to `references/light-mode.md`, push the trivial/substantive adjudication detail (already in `light-mode.md`) into the reference. Must net word-neutral-or-negative on `SKILL.md`.

## 3. Scope Boundary (NOT in scope)

- **No change to `l3-phase.js` / `review-panel.js` closure or verdict-production logic.** The code is already correct (it keys off counts, ignores `verdict`); only the `schemas.md` doc and the C2 fallback line change.
- **No demotion of `verdict` from `required`** (rejected alternative — see §4 D-A3). No structured `tally` field added to `AcceptVerdict` (rejected — see §4 D-D1).
- **No edit to the already-shipped Stage-1 fixes** (commit `18b6b92`): version drift, M6 archive body, the new scenario, packaging commands, the three None-tier reference fixes.
- **No new reference file.** Anti-bloat is binding: `SKILL.md` net word change must be ≤ 0 across Phase E; the standing `wc -w` ceiling (2888) is enforced by the consistency gate.
- **No push, no PR, no merge to `main`.** Work stays on `audit-repair-2026-06-16`.
- **No re-litigation of the 9 refuted/not-material round-2 items** (e.g. the round-label off-by-one, the `STOP:QUESTION` spacing, the bloat nits).

## 4. Key Design Decisions

**D-A1 — How to fix the L1/L2 closure formula.**
Problem: `schemas.md:53` reads `closed = (verdict == "pass") || (severe_count == 0 && round > 1 && prior_general_count == 0)`. `verdict` is set to `"pass"` on a single clean round (`review-panel.js:91`, `l3-phase.js:118`), so the first disjunct closes L1/L2 in one round — violating the strict two-generation rule.
Options: (a) drop the `(verdict == "pass")` disjunct entirely → count-driven, identical in shape to the L3 form at `schemas.md:59`; (b) qualify it to `(verdict == "pass" && round > 1)`. 
Choice: **(a)**. Rationale: option (b) still implies the `verdict` string is a closure authority, perpetuating the confusion that `verdict` gates closure; (a) makes L1/L2 closure purely count-driven, exactly matching the only correct coded path (`l3-phase.js` reviewPasses), and is the simplest change that removes the bug. (b) rejected: leaves two competing closure signals (string + counts) that can diverge again.

**D-A3 — Whether to keep `verdict` in `required`.**
Problem (rank 15): `verdict` is `required` and described as authoritative, but the only coded consumer (`l3-phase.js` closure) never reads it. Options: (a) demote `verdict` out of `required` and document it as a human-readable annotation; (b) keep it `required` and add a note that closure uses only counts.
Choice: **(b)**. Rationale: the producers (`l3-phase.js:118`, `review-panel.js:91`) and the in-code review schemas always emit `verdict`; demoting it in the doc while the code keeps emitting/requiring it would create new doc↔code drift — the very defect class this audit targets. (b) removes the false "verdict gates closure" impression with one sentence and zero contract change (Surgical Changes). (a) rejected: introduces drift for no behavioral gain.

**D-B1 — Match shape for the commit-msg policing filter.**
Problem: the contiguous-substring guard `case "$CMD" in *"git commit"*)` misses `git -C /repo commit`. Options: (a) a `grep -E` regex matching `git`, then zero-or-more option tokens (including `-C <bare-arg>` and `-c k=v`), then `commit`; (b) require `jq` as a hard prerequisite and drop the no-jq path.
Choice: **(a)**. Rationale: (b) would regress portability (the no-jq fallback exists deliberately for machines without `jq`); (a) keeps both paths and closes the bypass. The regex must allow a bare option-argument token after `-C`/`-c` so `git -C /repo commit` matches (the originally-proposed naive regex missed this — explicitly tested in acceptance). The extraction/grammar logic downstream is unchanged.

**D-D1 — Where the skipped/xfail tally lives.**
Problem (rank 6): `loop-3-development.md:82` requires the accept role to emit a per-command passed/failed/skipped/xfail tally, but `AcceptVerdict` has no field for it, and the accept role is forbidden from interpreting output beyond exit codes (so it cannot even detect "skipped"). An all-skipped run exits 0 → `all_pass:true`.
Options: (a) add a structured `tally`/`perCommand` field to `AcceptVerdict` and have `l3-phase.js` surface it; (b) re-attribute the tally to the main-agent PhaseEnd re-run (`loop-3-development.md:95`), which already re-runs every command and reads output, and keep the accept subagent purely exit-code mechanical.
Choice: **(b)**. Rationale: the accept corner is deliberately mechanical and routed to a cheap model (`optional-subagents.md`) precisely because it never judges; asking it for a skip/xfail tally contradicts its own contract and cannot be honored from exit codes alone. The main-agent PhaseEnd re-run is the role that already reads output and can apply "skipped ≠ passing." (a) rejected: adds a schema field + code path for a judgment the mechanical corner structurally cannot make; heavier and still mis-placed.

**D-D2 — Where a deferred general finding from the F-closeout 4b review is recorded.**
Problem: D2 requires a general finding from the 4b whole-change review not to vanish — but where does a *deferred* one land? The closure block's `Deferred:` line is currently defined (`end-to-end-review.md:51`) as "every **Deliverable** that was unticked at closeout, with its follow-up issue ID." Routing a general *finding* there overloads two item classes onto one line.
Options: (a) reuse the existing `Deferred:` line, broadening its definition to two classes (unticked deliverables + deferred correctness findings) with each entry naming its class; (b) add a new dedicated closure-block field (e.g. `Deferred-findings:`) separate from deferred deliverables.
Choice: **(a)**. Rationale: the `Deferred:` line already pairs each item with a follow-up issue ID — exactly what a deferred finding needs — so reuse is Simplicity First (no new closure-block field for a rare case). To keep the classes distinguishable, each entry names its class, e.g. `Deferred: finding — <desc> (<issue-id>)` vs `Deferred: deliverable — <name> (<issue-id>)`; D2's edit to `end-to-end-review.md:51` must broaden the line's definition accordingly. (b) rejected: a new field for an uncommon case is closure-block structure that does not earn its keep.

**D-E1 — Light Mode's termination rule.**
Problem (rank 5): `light-mode.md` never states whether a clean first review closes the change or a confirming clean round is required; `SKILL.md:153-155` scopes its two forms to L1/L2 (strict) and L3 (relaxation) and names Light Mode in neither.
Options: (a) Light Mode inherits the **strict two-generation** rule (the single reviewer gives less corroboration, arguing for a confirming round); (b) Light Mode uses the **clean-first-round relaxation** (same as L3).
Choice: **(b)**. Rationale: Light Mode is by definition the *lightweight* tier for small, low-risk changes — it already drops the L2 doc and the F consolidation. Imposing strict two-generation on the lighter tier while L3 (which handles larger work) gets the relaxation would invert the ceremony gradient. The relaxation's own guard still holds: the moment any fix lands, a confirming clean round is required, so a change with any unresolved issue never closes on one round. (a) rejected: heavier requirement on the lighter tier, contradicting Light Mode's stated purpose; the corroboration concern is met by the "any fix re-engages two-generation" guard. This is a >1-option termination decision; per the user's round-2 scope approval the direction is decided here in L1 with this rationale and is subject to the fresh L1 review and the behavioral-scenarios gate.

**D-E3 — How to de-densify the None cell without losing the rule.**
Problem (rank 16): the `SKILL.md:25` None cell stacks four conditional rules and uses the term "commitment clause" undefined on the always-loaded surface; the same adjudication is duplicated in `light-mode.md`.
Options: (a) drop the None-cell adjudication from `SKILL.md` entirely and rely on the routing table / `light-mode.md` — rejected: the always-loaded surface must still carry the routing *outcome* (trivial→None / substantive→Full) so the tier gate is decidable from the surface; only the detail moves. (b) keep both the surface detail and the `light-mode.md` copy — rejected: that is exactly the current duplicated state the finding targets (anti-bloat).
Choice: leave the None cell with the routing outcome (trivial-no-rule-change → None; substantive → Full; the None reviewer re-confirms and routes to Full on any commitment-clause touch) **plus a pointer to `references/light-mode.md`**, where the detail already lives. Rationale: the surface carries the decision outcome and a pointer, not a second home of detail the reference owns. Net word change must be ≤ 0 (the added pointer is offset by removed duplicated detail).

## 5. Dependencies and Assumptions

- Plain-JS constraints on `l3-phase.js` (no `Date.now()` / `Math.random()`; `export` + top-level `return`); validate with `check-workflow-syntax.sh`, not `node --check`.
- The consistency gate (`check-consistency.sh`) and workflow-syntax gate are the mechanical acceptance backbone; both must stay green.
- The CLAUDE.md **Behavioral gate (v1.5)** requires running `tests/scenarios/*.md` via a fresh subagent before merging any edit to the tier table, the escalation rules, or the termination wording. Phases A (termination) and E (tier table + Light-Mode termination) trigger it. The suite is now 11 scenarios (10 prior + the Stage-1 reasonable-default scenario).
- Assumption: the round-2 findings' code citations are current on `HEAD` of `audit-repair-2026-06-16` (verified during the audit and re-checked at L3 dev time before each edit).
- **User scope approval (2026-06-16):** the user approved driving all ~9 substantive load-bearing findings through one decomposed cycle (this five-Phase bundle) and explicitly delegated the D-E1 termination-direction decision to L1 (rather than a separate AskUserQuestion escalation). The behavioral-scenarios gate + fresh review remain the check on that direction.

## 6. Relationship with Existing Designs

- Supersedes nothing; complements `docs/design/2026-06-16-audit-repair.md` (round-1 repair) and `docs/design/2026-06-16-panel-quorum.md` (the quorum floor). The closure formulas this task edits (`schemas.md:49-65`) are the encoding of the **two-generation** termination rule paired across `SKILL.md:153-155`, `references/loop-1-design.md:179`, `references/loop-2-implementation.md:114`, and `references/escalation-rules.md` — terminology must stay consistent with all of them. No conflict detected: A1 brings `schemas.md` *into* agreement with `SKILL.md:154`, which already states the strict rule.
- Light Mode termination (E1) must stay consistent with `SKILL.md:153-155` "Shared termination condition"; E1 adds Light Mode as a named third case using the L3-form relaxation.
- Terminology anchors: CLAUDE.md `_language-policy_` (English; consistent with existing `docs/`), `_load-bearing-docs_`, and the skill's `SKILL.md`.

## 7. Acceptance Criteria (measurable, automated at L2)

Phase A:
- `grep -F 'verdict == "pass"' references/schemas.md` returns no line inside a closure formula (the only permitted mention is none).
- The L1/L2 closure line in `schemas.md` reads `closed = (severe_count == 0 && round > 1 && prior_general_count == 0)`.
- `check-consistency.sh` exits non-zero when `verdict == "pass"` is injected into `schemas.md` (proven by a scratch-copy inject test) and exits 0 on the real tree.
- A fresh subagent, given the post-edit `schemas.md` closure section + `tests/scenarios/l1-clean-first-round-still-confirms.md`, grades it to its `expected` field (loop **not** closed; confirming round required) — the behavioral observation of A1.
Phase B:
- Running the real `validate-commit-msg.sh` on a payload whose command is `git -C /repo commit -m "fix(phase): bad"` exits 2 (blocked); likewise for `git --no-pager commit …` and `git -c k=v commit …`; a valid `fix(phase1): …` still exits 0; a non-`commit` git command still exits 0.
- On the no-jq path, a payload `{"tool_input":{"command":"git commit -m \"fix(phase1): ok\"","description":"x"}}` yields an extracted `CMD` with no field-boundary bleed (the `description` value does not appear in `CMD`).
- On the no-jq path, that same bled-input payload run through the full script yields the correct end-to-end decision: the valid `fix(phase1): ok` subject exits 0 (the trailing `description` does not corrupt subject extraction), and a payload carrying a malformed subject still exits 2.
Phase C:
- `loop-3-workflow.md` post-Workflow discharge list contains the skill-self behavioral check; `loop-3-development.md:~205` no longer attributes it to "the accept step"; `l3-phase.js:~161` uses the length-aware fallback; `check-workflow-syntax.sh l3-phase.js` ok.
Phase D:
- `loop-3-development.md:~82` no longer requires the accept subagent to emit a structured per-command skip/xfail tally; the skipped-≠-passing guard is attributed to the main-agent PhaseEnd re-run.
- `end-to-end-review.md` step 4b contains an explicit disposition for a general finding (record + fix-or-defer-to-closure-block).
- A fresh subagent, given the post-edit step 4b + `tests/scenarios/closeout-general-finding-deferred.md`, grades it to its `expected` field (the task does not close clean; the general is recorded/deferred) — the behavioral observation of D2.
Phase E:
- `light-mode.md` states the termination rule (clean-first-round relaxation, any-fix re-engages two-generation).
- `SKILL.md:~23` reads "more than 3 non-load-bearing files".
- `SKILL.md:~25` None cell points to `references/light-mode.md` and no longer carries the full trivial/substantive detail.
- `wc -w SKILL.md` ≤ 2888 (consistency gate green).
- `tests/scenarios/*.md` (13 files, incl. the two new A5/D3 observation scenarios): a fresh subagent grades each to its `expected` field — all pass (behavioral gate for A + E).

Cross-cutting: `check-consistency.sh` exits 0; `check-workflow-syntax.sh` ok on both JS files; the fresh-eyes whole-change F review (`end-to-end-review.md` 4b) returns zero severe.

## 8. Risks and Rollback

- **Risk: a `schemas.md` edit desyncs from `SKILL.md`/loop docs.** Mitigation: A1 explicitly aligns to `SKILL.md:154`; the consistency gate pairs the `two-generation` token; the fresh L3 review reads both sides.
- **Risk: the B1 regex re-introduces a false-pass (misses a global-option form) or a false-block.** Mitigation: acceptance enumerates the three global-option forms + a valid commit + a non-commit command, all run against the real script; a fresh review re-derives the regex behavior.
- **Risk: Phase E pushes `SKILL.md` over the word ceiling, or drops a paired token.** E1 rewrites `SKILL.md:155`, where the `two-generation` and `clean-first-round` paired tokens (`check-consistency.sh:42,45`) co-reside — the rewrite must retain both literal strings. Mitigation: E1's word add is budgeted against E3's removal (not free headroom); E3 nets negative; the consistency gate enforces 2888 and both token pairings, and is re-run after every Phase-E edit.
- **Risk: E1 termination direction is wrong.** Mitigation: the behavioral-scenarios gate + fresh review; rollback = revert the Phase E commit and re-decide in L1.
- **Rollback (all phases): each Phase is a single commit on `audit-repair-2026-06-16`; revert that commit to undo it.** No published history is touched (branch unmerged, unpushed except the existing origin mirror).
