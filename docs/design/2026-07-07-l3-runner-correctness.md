# Design: L3 Handoff Footgun + Termination-Mechanic Fixtures

```
Status: closed
Closing-commit: 389520c
Closed-on: 2026-07-08
Deferred: none  (F11 accept-budget split to its own cycle 2026-07-08-l3-accept-budget — see scope note)
```

Task slug: `2026-07-07-l3-runner-correctness`
Tier: **Full Mode** (edits load-bearing L3 reference docs + `l3-phase.js` prose).
Provenance: Wave 1a of the approved audit backlog (`memory/improvement-waves-plan-2026-07-07`) — findings F3
(merge handoff) and F9 (missing core-mechanic fixtures, L3 subset).

> **Scope note (post-L1-round-1).** The initial draft also included **F11** (separating the accept loop's
> round counter from the review counter). L1 review found F11 is a **separate, riskier subsystem**: it changes
> the per-Phase work bound from ≤3 to ≤6 fix rounds, which makes SKILL.md's always-loaded "round cap = 3 per
> Phase" (`SKILL.md:120`, `:156`) inaccurate and requires reconciling that crown-jewel termination statement,
> the `loop-3-development.md` mermaid (multiple accept-side nodes), a latent `R increments only on a fix`
> doc/code drift, and a new paired gate token. Per the multi-subsystem rule (one design doc = one coherent
> subsystem), **F11 is split into its own follow-up cycle** (`2026-07-08-l3-accept-budget`). This cycle keeps
> the two **safe, independent** parts: the F3 merge-handoff clarification and the F9 termination fixtures,
> neither of which changes control flow or SKILL.md.

## 1. Background and Purpose

Two L3-runner correctness gaps, both low-risk and independent of the deferred F11:

- **F3 — merge handoff footgun.** `l3-phase.js:142-143` tells the dev subagent to "commit to a branch named X"
  without saying it branches off the captured `baseSha` first, and `loop-3-workflow.md:79-82` tells the main
  agent to `git merge --ff-only <result.branch>` with no instruction to first return to the integration
  branch. Because dev works in the shared main working tree, its `checkout -b` leaves HEAD on the dev branch —
  so a bare `--ff-only <devBranch>` is a merge-into-itself. Verified by the L1 control-flow reviewer.
- **F9 (L3 subset) — missing behavioral fixtures for two central, pre-existing termination behaviors.** The
  skill's own doctrine is that *fixtures*, not gate tokens, are the real protection — yet neither the
  **round-cap → deadlock escalation** (the mechanic that forces the user conversation, `escalation-rules.md`
  Round-cap exhaustion) nor the **L3 clean-first-round *positive* close** (the relaxation's actual novelty) has
  one. Existing fixtures assert only the *non*-close direction (`clean-review-after-fix.md`,
  `l1-clean-first-round-still-confirms.md`).

If we do not fix these: the recommended L3 close-out step fails confusingly (F3), and two of the most
load-bearing L3 termination behaviors ship unverified (F9).

## 2. Deliverables

- [ ] **F3 — deterministic branch/merge handoff.** No-control-flow (a dev-prompt **string** edit + doc prose):
      (a) `l3-phase.js` devPrompt (`:139-156`): instruct dev to **`git checkout -b <branch>` off the captured
      `baseSha` before editing** (integration branch stays at `baseSha`; the dev branch fast-forwards cleanly).
      (b) `loop-3-workflow.md`: add a step to the **Invocation** section (`:14-27`) telling the main agent to
      **record its current branch name before invoking the Workflow** (that is the integration branch — it is
      not in `DevResult`, and HEAD moves to the dev branch during the run). (c) `loop-3-workflow.md` merge step
      (`:78-82`): instruct the main agent to **check out that recorded integration branch** (not a positional
      `git checkout -`, per the L1 clarification) **before** `git merge --ff-only <result.branch>`. The
      **main-agent return-to-integration-branch is the load-bearing half**; the dev-side `checkout -b` clarifies
      existing behavior.
- [ ] **F9 fixtures** (2, each a discrete-decision pressure scenario over *existing* behavior):
      1. `tests/scenarios/l3-round-cap-deadlock-escalates.md` — an L3 Phase hits round 3 with a severe still
         unresolved → compose a deadlock report + escalate to the user (never a silent round 4).
      2. `tests/scenarios/l3-clean-first-round-closes-in-one.md` — the first L3 review is fully clean (zero
         severe, zero general) and **no fix was applied** → the Phase closes in **one** round (the relaxation's
         positive direction; complements the existing non-close fixtures).
- [ ] `check-consistency.sh`: register the two fixtures for existence **inside the `[ -d tests/scenarios ]`
      guard** (separate labeled block + own DRIFT message).
- [ ] CLAUDE.md _common-commands_ gate description reconciled to name the two new fixtures.

## 3. Scope Boundary (NOT in scope)

- **No F11 / accept-counter change** — split to its own cycle (scope note). This cycle changes **no** control
  flow: `l3-phase.js`'s only edit is the dev-prompt string (the `git checkout -b` instruction); the review
  loop, accept loop, counters, two-generation, panel, and schemas are untouched.
- **No SKILL.md surface change** — genuinely none now (no counter/termination-bound change). `wc -w` unchanged.
- **No worktree isolation change** — F3 only makes the existing branch/merge steps explicit.
- **No new severity class, no persistence/state.** Stateless as ever.
- Wave 1b (tier fix), the F11 cycle, and Waves 2-4 are separate.

## 4. Key Design Decisions

### D1 — F3: make the existing branch/merge steps explicit (vs restructuring to worktrees)
- **Problem:** the branch-creation point and the pre-merge checkout are unstated, producing a merge-into-itself
  footgun.
- **Options:** (a) state the two missing steps explicitly (dev `checkout -b` off `baseSha`; main agent returns
  to the **named** integration branch before `--ff-only`); (b) move dev to an isolated worktree so HEAD never
  moves; (c) have the script itself perform the merge.
- **Choice: (a).** Rationale: worktree isolation was deliberately removed earlier for simplicity on the
  sequential L3 path; re-adding it to fix a documentation gap is disproportionate (b). Having the script merge
  (c) would violate the existing "the **main agent**, not the script, owns the merge" boundary
  (`loop-3-workflow.md:78`). (a) is a two-sentence clarification that removes the footgun with zero mechanism,
  and naming the recorded integration branch (not `git checkout -`) survives a cross-session restart. Rejected
  (b)/(c).

### D2 — F9: fixture the two *untested* termination cells, not the covered ones
- **Problem:** which termination behaviors are genuinely unasserted vs already covered?
- **Choice:** the L1 fixture-review confirmed the two proposed fixtures fill genuinely-missing cells:
  `l3-clean-first-round-closes-in-one` is the untested *positive* cell (L3 + clean-first + no-fix → closes),
  triangulating with the existing non-close fixtures along the loop (L1/L3) and `fixApplied` (true/false) axes;
  `l3-round-cap-deadlock-escalates` asserts the escalation *decision* that no existing fixture covers
  (`failure-retrospective-deadlock-taskdomain-triggers` presumes the escalation already happened). No
  duplication. Rejected alternative (re-fixturing covered cells): waste.

## 5. Dependencies and Assumptions

- Depends on the existing `l3-phase.js` structure (only its dev-prompt string is edited), the
  `check-workflow-syntax.sh` gate (the JS must still parse), and the behavioral-scenario discipline.
- Assumes the sequential single-live-agent L3 model.
- No external systems, no new data formats. `review-panel.js`, schemas, the review/accept loops unaffected.

## 6. Relationship with Existing Designs

- Modifies `references/loop-3-workflow.md` (merge step) and `references/l3-phase.js` (dev-prompt string only);
  adds two fixtures. Complements — does not alter — the two-generation termination (`schemas.md`, unchanged),
  the accept loop (unchanged; F11 deferred), and the round-cap deadlock escalation (`escalation-rules.md`,
  which fixture 1 now covers). Terminology anchors: `loop-3-development.md` four-corner template,
  `escalation-rules.md` Round-cap exhaustion, `SKILL.md` "Shared termination condition".

## 7. Acceptance Criteria (measurable / automatable)

1. `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js`
   exits 0 (the dev-prompt string edit parses). `git diff` shows the review/accept loops and all counters
   unchanged (only the dev-prompt string changed in `l3-phase.js`).
2. `bash three-loop-workflow/references/check-consistency.sh` exits 0 with the two fixtures existence-checked
   inside the `[ -d tests/scenarios ]` guard. SKILL.md `wc -w` unchanged (no SKILL.md edit).
3. `references/l3-phase.js` devPrompt contains a `git checkout -b` instruction naming `baseSha`;
   `references/loop-3-workflow.md` Invocation section instructs the main agent to record its current branch,
   and its merge step instructs the main agent to check out that recorded integration branch before
   `git merge --ff-only` (grep all three).
4. CLAUDE.md _common-commands_ gate description names the two new fixtures (grep both basenames in the
   consistency-gate description).
5. The two new `tests/scenarios/*.md` fixtures exist, each with a discrete-decision `expected:` field, and each
   runs green via a fresh subagent: round-3-unresolved → deadlock report + escalate; clean-first + no-fix →
   close-in-one.
6. `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/review-panel.js`
   exits 0 (regression guard; untouched).

Quality budget: N/A — process/docs change to a skill; no user-facing behavior/hot-path/interface.

## 8. Risks and Rollback

- **Risk: F3 wording introduces a new inconsistency.** Mitigation: AC3 greps the two sites; the change is
  additive clarification, not a mechanism; the L1 control-flow reviewer confirmed the diagnosis and fix.
- **Risk: the dev-prompt string edit breaks the JS parse.** Mitigation: AC1 syntax gate; the edit is a string
  literal only.
- **Risk: a fixture is non-discriminating.** Mitigation: the L1 fixture-review confirmed both are discrete
  decisions a rule-less agent could get wrong, with no overlap.
- **Rollback:** revert the branch. No control-flow change, no migration, no persisted state. Reversible.
