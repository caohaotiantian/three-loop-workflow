# Implementation — Skill Orchestration Upgrade (v1.4)

> Task slug: `2026-06-09-skill-orchestration-upgrade`
> Design doc: `docs/design/2026-06-09-skill-orchestration-upgrade.md`
>
> Status: closed
> Closing-commit: 8460330
> Closed-on: 2026-06-09
> Deferred: none
>
> Closeout notes: all 8 Phases closed with fresh-subagent review + green grep acceptance;
> the F end-to-end review (holistic, all 21 Deliverables) passed with zero severe/general.
> Behavior verification: this upgrade was itself produced by running the skill's L1 → L2 → L3
> process on the skill (the dogfood is the behavior evidence); the two Workflow scripts were
> syntax-validated and the L3 close predicate logic-simulated; `validate-commit-msg.sh` was
> functionally tested across 7 cases. A full CLI-subprocess E2E (spawning a `claude` subprocess
> to load the skill) was not run — it would require a paid subprocess and adds nothing over the
> dogfood evidence above.

## Task Index

| Design Deliverable group | Design ACs | Phase |
|---|---|---|
| WS1 correctness (P1, P2, P15a, P15b) | AC-P1, AC-P2, AC-P15a, AC-P15b | Phase 1 |
| WS2 source-of-truth + drift (P4a–d, P3) | AC-P4a, AC-P4b, AC-P4c, AC-P3 | Phase 2 |
| WS4 P10 L3 two-gen relaxation | AC-P10 | Phase 3 |
| WS3 quality ceiling (P6, P7, P12, P13, P14) | AC-P6, AC-P7, AC-P12, AC-P13, AC-P14 | Phase 4 |
| WS4 P9 tiering | AC-P9 | Phase 5 |
| WS5 panel + identity guard (P8, P16-1) | AC-P8, AC-P16-1 | Phase 6 |
| WS5 agent bundle + hook + teams (P5, P11, P16-2) | AC-P5, AC-P11, AC-P16-2 | Phase 7 |
| WS6 release packaging | AC-Release, AC-Consistency | Phase 8 |

## Engineering Constraints Index

- **Project engineering norms:** CLAUDE.md _engineering-norms_ role (this repo distributes a
  Claude skill; primary artifacts are Markdown + one JS Workflow script; follow the four core
  principles; `l3-phase.js`/`review-panel.js` are plain JS — no TypeScript, no `Date.now()`,
  no `Math.random()`).
- **Four-corner subagent template + role isolation:** `references/loop-3-development.md`.
  The author of a phase's edits (the main agent) must never review them — each phase's review
  corner is a **fresh subagent**.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phaseN):` / `fix(phaseN-roundR):`.
  This repo's CLAUDE.md forbids mentioning AI involvement in commit messages, which overrides
  the harness default; no `Co-Authored-By` trailer is added here.
- **`<TEST-CMD>` for this repo** (per CLAUDE.md _common-commands_): there is no unit-test
  suite; the test command is the grep-based self-checks over the modified files. Each phase's
  `<ACCEPT-CMD>` set is the design ACs (runnable greps) for that phase, plus a JS syntax check
  (`node --check`) for any phase that edits a `.js` file and `bash -n` for any `.sh` file.
- **Execution mode:** manual four-corner (the file under heavy edit is `l3-phase.js` itself, so
  driving the changes through `l3-phase.js` would be circular). Per the design's D-Process
  ("dogfood, pragmatically"), each phase is implemented by the main agent (dev corner), reviewed
  by one fresh subagent (review corner), accepted via the grep `<ACCEPT-CMD>` set (accept corner),
  and fixed by the main agent (fix corner) if the review or accept fails. A phase closes on a
  clean fresh review **plus** a green accept set; a second confirming round is run only when the
  first review surfaced a substantive (severe or non-trivial general) issue.

## Phase Breakdown

### Phase 1 — L3 correctness foundation (P1, P2, P15a, P15b)

- **Entry condition:** L1 design doc closed (done).
- **Design refs:** Deliverables WS1; KDD-4 (baseSha), KDD-7; Acceptance AC-P1/P2/P15a/P15b.
- **Why first:** every later phase's review/accept reads "the diff"; P1 makes that diff
  deterministic, so it must land before any other orchestration change.
- **Task list (TDD order — assert the acceptance grep, then make the edit):**
  1. (test) Confirm AC-P1/AC-P2/AC-P15a/AC-P15b currently FAIL on the tree (tokens absent /
     forbidden strings present). Recorded as the red baseline.
  2. `schemas.md`: add required `baseSha` to the `DevResult` schema (string; "captured by the
     dev agent via `git rev-parse HEAD` BEFORE editing; the diff base for review/accept").
  3. `l3-phase.js`: add `baseSha` (required) to `DEV_SCHEMA`; in the dev prompt instruct capture
     of `git rev-parse HEAD` before any edit and return it; prepend the review, accept, and both
     fix prompts with a mandatory first step `git diff ${devResult.baseSha}..${devBranch}` (and
     `git log ${baseSha}..${devBranch}` for commit-convention checks). Thread `baseSha` to the
     fix-round prompts.
  4. `l3-phase.js`: add the load-bearing fresh-spawn invariant comment near the top (P15a).
  5. `l3-phase.js`: wrap each `agent()` (dev/review/accept) in a single retry (try/catch handling
     both a thrown error and a null/undefined return); on the second failure return a new
     `agent-error` status (distinct from `cap-exhausted`) at the three sites (P15b).
  6. `loop-3-workflow.md`: add an `agent-error` row to the return-value table with the main-agent
     action ("report infrastructure failure; do NOT compose a deadlock report; offer to relaunch
     the Workflow for this Phase").
  7. `loop-3-workflow.md` + `loop-3-development.md`: remove the false "worktree isolation as code"
     claims (loop-3-workflow.md:6, loop-3-development.md:5) and the dead version-note/fallback
     bullet (loop-3-workflow.md:8-10,16); replace per KDD-4 wording. Add the explicit `git diff`
     step to the prose review input (loop-3-development.md role table line ~75). Leave the E2E
     `git worktree add` machinery untouched.
- **`<ACCEPT-CMD>` (all must pass):**
  - `grep -q 'baseSha' three-loop-workflow/references/l3-phase.js`
  - `grep -q 'baseSha' three-loop-workflow/references/schemas.md`
  - branch-qualified diff shape (not bare HEAD): `grep -q 'baseSha}\.\.\${devBranch}' three-loop-workflow/references/l3-phase.js`
  - `! grep -riq 'worktree isolation as' three-loop-workflow/references/loop-3-workflow.md three-loop-workflow/references/loop-3-development.md`
  - `grep -q 'no git worktree isolation' three-loop-workflow/references/loop-3-workflow.md`
  - `! grep -q "isolation: 'worktree'" three-loop-workflow/references/loop-3-workflow.md`
  - `grep -q 'MUST spawn a fresh subagent' three-loop-workflow/references/l3-phase.js`
  - `grep -q 'agent-error' three-loop-workflow/references/l3-phase.js`
  - `grep -q 'agent-error' three-loop-workflow/references/loop-3-workflow.md`
  - `node --check three-loop-workflow/references/l3-phase.js`
- **Exit condition:** all ACCEPT-CMDs green; fresh review reports zero severe; `node --check`
  passes (script still valid JS).

### Phase 2 — Source-of-truth + drift gate + diagram accuracy (P4a–d, P3)

- **Entry condition:** Phase 1 closed.
- **Design refs:** KDD-1, KDD-2; Deliverables P4a–d, P3; AC-P4a/P4b/P4c/P3.
- **Task list:**
  1. (test) Confirm AC-P4a/P4c FAIL on tree (old claims present); the gate command does not yet exist.
  2. `README.md` + `README-cn.md`: flip the canonical declaration — skill files are the single
     source of truth; remove "The spec is the source of truth" and the "(canonical)" label on the
     repo-layout line; state WORKFLOW-v3.md is a derived spec-level narrative.
  3. `WORKFLOW-v3.md`: add a top banner "Derived — do not edit directly; the three-loop-workflow
     skill (SKILL.md + references/) is the source of truth. This file is a spec-level narrative
     kept token-consistent with the skill by the `three-loop-consistency` check."
  4. `claude-md-integration.md`: reconcile the cross-file table so the skill is named source of
     truth; demote the temporal "currently updated to five" wording (line 91) to a standing
     must-match invariant.
  5. `loop-2-implementation.md`: delete the now-false transitional supersedes note (lines 93-95).
  6. `references/check-consistency.sh` (new) + `CLAUDE.md` Common Commands line: a deterministic
     `three-loop-consistency` check. The script asserts each named token is present in BOTH the
     derived spec and the specific skill file that owns it, exiting non-zero on divergence. Pin
     the token→file map so the gate greps the right file: the **five role names**
     (`_repo-workflow_`, `_load-bearing-docs_`, `_language-policy_`, `_common-commands_`,
     `_engineering-norms_`) in `claude-md-integration.md` + `WORKFLOW-v3.md`; **`fix(phaseN-roundR)`**
     in `loop-3-development.md` + `WORKFLOW-v3.md`; **`five questions`** in
     `loop-2-implementation.md` + `WORKFLOW-v3.md` (NOT SKILL.md — it has zero occurrences); the
     **termination wording** (`zero severe`, `zero general`) in `SKILL.md` + `WORKFLOW-v3.md`.
     CLAUDE.md Common Commands gains a labelled line: `three-loop-consistency check:
     bash three-loop-workflow/references/check-consistency.sh`.
  7. `loop-3-development.md` + `WORKFLOW-v3.md`: add a "Notes on the diagram" bullet that a phase
     cannot close on review round 1 (two-generation rule); note R is a single phase-wide budget
     shared by review and accept (P3, docs-only — NO `acceptRound = 1` code change).
  8. `loop-3-workflow.md`: note in the return-value table that `status:'closed'` does NOT
     discharge the main-agent PhaseEnd re-run or the E2E gate.
- **`<ACCEPT-CMD>`:**
  - `! grep -q 'The spec is the source of truth' README.md`
  - `! grep -q '(canonical)' README.md`
  - `grep -Eiq 'skill (files )?(is|are) the (single |canonical )?source of truth' README.md`
  - `grep -q 'Derived' WORKFLOW-v3.md`
  - `grep -q 'three-loop-consistency' CLAUDE.md`
  - `! grep -q 'supersedes the four-question count' three-loop-workflow/references/loop-2-implementation.md`
  - `! grep -q 'currently updated' three-loop-workflow/references/claude-md-integration.md`
  - `grep -Eiq 'shared.*cap|phase-wide budget' three-loop-workflow/references/loop-3-development.md`
  - `test -f three-loop-workflow/references/check-consistency.sh`
  - `bash three-loop-workflow/references/check-consistency.sh` (exits 0 over the tree)
  - `bash -n three-loop-workflow/references/check-consistency.sh`
- **Exit condition:** ACCEPT green; the consistency gate runs clean; fresh review zero severe.

### Phase 3 — L3 two-generation relaxation (P10, L3-only)

- **Entry condition:** Phase 2 closed.
- **Design refs:** KDD-3 (the OR-of-two-paths close predicate); AC-P10.
- **Task list:**
  1. (test) Confirm `fixApplied` absent from `l3-phase.js`/`schemas.md`.
  2. `l3-phase.js`: introduce `let fixApplied = false`; change the review-loop close check to
     `review.severe_count === 0 && ( (!fixApplied && review.general_count === 0) || (round > 1 && priorGeneralCount === 0) )`;
     guard the fix-spawn so it does not run when `severe_count === 0 && general_count === 0`, and
     break before `round++` on a clean round 1; set `fixApplied = true` only inside the guarded
     fix branch.
  3. `schemas.md`: update the `ReviewVerdict` loop-closure formula comment to the new L3 predicate
     and note it is the **L3-only** relaxation (L1/L2 keep strict two-generation).
  4. `SKILL.md` + `loop-3-development.md` + `WORKFLOW-v3.md`: add one sentence to the shared
     termination text noting the L3 (Workflow-mode) clean-first-round exception, explicitly
     stating L1/L2 are unchanged. Do NOT edit the L1/L2 termination behavior.
- **`<ACCEPT-CMD>`:**
  - `grep -q 'fixApplied' three-loop-workflow/references/l3-phase.js`
  - `grep -q 'fixApplied' three-loop-workflow/references/schemas.md`
  - `grep -Eiq 'L3.only|clean.first.round' three-loop-workflow/references/l3-phase.js three-loop-workflow/SKILL.md`
  - `node --check three-loop-workflow/references/l3-phase.js`
- **Exit condition:** ACCEPT green; a fresh reviewer specifically confirms a dirty first round
  still cannot close and the post-fix two-generation property is unweakened.

### Phase 4 — Quality ceiling (P6, P7, P12, P13, P14)

- **Entry condition:** Phase 3 closed.
- **Design refs:** KDD-8 (pre-step), Deliverables P6/P7/P12/P13/P14; AC-P6/P7/P12/P13/P14.
- **Task list:**
  1. `loop-1-design.md`: add the "L1 pre-step: Understand before designing" subsection (P6,
     Explore-based, read-only, NOT a loop; CLAUDE.md/git-status non-inheritance warning;
     optional main-agent `parallel()` fan-out + judge merge; trigger = touches existing code,
     no-op on greenfield). Add the declare-or-exclude quality-budget rule after section 7 (P12);
     add the matching L1-review-template general-issue check.
  2. `SKILL.md`: one routing-table row for the understand pre-step (P6); a 2-3 line cost
     expectation near the applicability table (P14).
  3. `loop-3-development.md`: broaden the E2E trigger to externally observable behavior; add the
     gating "Behavior verification" step run by a fresh non-author subagent; name `/run`,
     `/verify`, `/run-skill-generator` as drivers with the manual smoke test as fallback (P7).
  4. `end-to-end-review.md`: step 3 closeout evidence must include a behavior observation (P7).
  5. `loop-2-implementation.md` + `WORKFLOW-v3.md`: replace the wall-clock phase metric at all
     three sites with scope invariants + "do not pad a Phase to fill calendar time" (P13).
  6. `SKILL.md` + `WORKFLOW-v3.md` (+ `loop-3-development.md` gate label): propagate the P7
     trigger change to every load-bearing copy (success definition, closed-Phase row, mermaid
     gate label, skip note).
  7. `loop-3-workflow.md`: add correctly-scoped concurrency-cap note (16/1000 govern the workflow
     runtime only) (P14).
- **`<ACCEPT-CMD>`:**
  - `grep -q 'Understand before designing' three-loop-workflow/references/loop-1-design.md`
  - `grep -qi 'explore' three-loop-workflow/references/loop-1-design.md`
  - `grep -Eiq 'behavior verification|externally observable behavior' three-loop-workflow/references/loop-3-development.md`
  - `grep -qi 'behavior' three-loop-workflow/references/end-to-end-review.md`
  - `grep -Eiq 'quality budget|declare.*exclude' three-loop-workflow/references/loop-1-design.md`
  - `! grep -q '2 to 4 days' three-loop-workflow/references/loop-2-implementation.md WORKFLOW-v3.md`
  - third wall-clock site gone: `! grep -q '1 week' three-loop-workflow/references/loop-2-implementation.md`
  - `grep -qi 'do not pad' three-loop-workflow/references/loop-2-implementation.md`
  - `grep -Eiq 'cost expectation|spawns roughly' three-loop-workflow/SKILL.md`
- **Exit condition:** ACCEPT green; fresh review zero severe; the understand step is unmistakably
  framed as a non-looping pre-step (no round counter / review subagent attached to it).

### Phase 5 — Gated Light/Full tier (P9)

- **Entry condition:** Phase 4 closed.
- **Design refs:** Deliverable P9; AC-P9; Scope Boundary (Light Mode never for load-bearing).
- **Task list:**
  1. `references/light-mode.md` (new): the Light-Mode procedure — four-field inline brief, the
     same fresh-reviewer diff review, round-cap→escalation, four principles; drops the separate
     L2 doc and collapses F to "acceptance green + one-line closure note"; the hard Full-Mode
     gate; the Light-Mode reviewer re-runs that gate against the diff (fresh-eyes-enforced);
     "when in doubt → Full"; plan mode is a drafting affordance, not the artifact.
  2. `SKILL.md`: replace the binary applicability table with the 3-row tier table (Light / Full /
     None) routed to `light-mode.md`; fold in the description over-trigger carve-out (trivial
     non-commitment-clause edits to load-bearing docs get one independent review, not the full
     cycle).
  3. `WORKFLOW-v3.md`: mirror the tier model (derived narrative).
- **`<ACCEPT-CMD>`:**
  - `test -f three-loop-workflow/references/light-mode.md`
  - `grep -Eqi 'Light Mode|Full Mode' three-loop-workflow/SKILL.md`
  - `grep -qi 'when in doubt' three-loop-workflow/references/light-mode.md`
- **Exit condition:** ACCEPT green; fresh review confirms the Full-Mode gate is fresh-eyes-enforced
  (not author-asserted) and Light Mode cannot apply to a load-bearing/contract change.

### Phase 6 — Adversarial review panel + team identity guard (P8, P16-1)

- **Entry condition:** Phase 5 closed.
- **Design refs:** KDD-6 (mechanical union); Deliverables P8, P16-1; AC-P8, AC-P16-1.
- **Task list:**
  1. `references/review-panel.js` (new): a Workflow script that spawns N (default 3, overridable
     arg) fresh reviewers in `parallel()`, each returning the existing `ReviewVerdict`; computes
     `severe_count`/`general_count` as the **mechanical union** across voters (no agent in the
     count path) and returns one aggregated `ReviewVerdict`; any dedup is merge-only and may not
     change counts. Plain JS; no `Date.now()`/`Math.random()`.
  2. `references/multi-voter-review.md` (new): when to escalate to panel (load-bearing / high-risk);
     the union-strengthens-both-fields safety proof; how to wire it.
  3. `l3-phase.js`: add `reviewMode: 'single'|'panel'` arg defaulting to `'single'`; when
     `'panel'`, the review step calls the panel and consumes the unioned `ReviewVerdict` within a
     single round (N voters do NOT each consume a round).
  4. `SKILL.md` + `loop-1-design.md` + `loop-2-implementation.md` + `loop-3-development.md`: one
     optional line each — "for load-bearing or high-risk artifacts, escalate to panel review".
  5. `SKILL.md` + `loop-3-development.md`: extend the role-isolation rule to bind isolation to
     teammate IDENTITY (P16-1): a subagent that authored or self-claimed dev for an artifact may
     never claim its review/accept; lead plan-approval is not the fresh-reviewer gate.
  6. `claude-md-integration.md`: register `multi-voter-review.md` and `review-panel.js` as
     reference sites for the principles/Forbidden/review-prompt commitment clauses (drift gate).
- **`<ACCEPT-CMD>`:**
  - `test -f three-loop-workflow/references/review-panel.js`
  - `test -f three-loop-workflow/references/multi-voter-review.md`
  - `grep -q 'reviewMode' three-loop-workflow/references/l3-phase.js`
  - `grep -qi 'union' three-loop-workflow/references/review-panel.js`
  - `! grep -Eq 'Math\.random|Date\.now' three-loop-workflow/references/review-panel.js`
  - `node --check three-loop-workflow/references/review-panel.js`
  - `node --check three-loop-workflow/references/l3-phase.js`
  - `grep -Eqi 'self-claim|teammate.*identity' three-loop-workflow/SKILL.md three-loop-workflow/references/loop-3-development.md`
- **Exit condition:** ACCEPT green; fresh review confirms the union counts are computed
  mechanically (no agent in the counting path) and panel mode runs within one round.

### Phase 7 — Optional agent bundle + commit hook + team modes (P5, P11, P16-2)

- **Entry condition:** Phase 6 closed.
- **Design refs:** KDD-5, KDD-7; Deliverables P5, P11, P16-2; AC-P5, AC-P11, AC-P16-2.
- **Task list:**
  1. `references/optional-subagents.md` (new): built-in `.claude/agents` definitions
     (`three-loop-design-reviewer` / `-impl-reviewer` / `-l3-reviewer`: `tools: Read, Grep, Glob,
     Bash`, no Edit/Write, `skills:[three-loop-workflow]`; optional Haiku `-accept-runner`); the
     honest enforcement-gap note (tool restriction does NOT transfer to the Workflow
     `agent(prompt,{schema})` path); the mandatory default-subagent fallback.
  2. `references/validate-commit-msg.sh` (new): a `PreToolUse` Bash hook that enforces the commit
     prefix GRAMMAR only (early-exit 0 for non-`git commit`; exempt `chore:`/`docs:`/closeout);
     honestly described as a lint complementing the semantic review, not "Surgical Changes".
  3. `references/loop-3-teams.md` (new): three narrow agent-team modes behind
     `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, each with a sequential-subagent fallback; "When NOT
     to use a team" box; the corrected skill-inheritance claim; optional `TaskCompleted` hook
     example resolving commands via `_common-commands_`; whole-task auto-advance excluded.
  4. `SKILL.md`: optional routing rows (agent bundle, commit hook, team modes); soften the
     "enforced mechanically" prose for the commit prefix to "named, and checked by the review
     subagent (optionally pre-screened by a commit-prefix hook)".
  5. `loop-1-design.md` + `loop-2-implementation.md` + `loop-3-development.md`: the optional
     "spawn the three-loop-* subagent if installed, else a fresh default subagent" line.
  6. `claude-md-integration.md`: register `optional-subagents.md` as a reference site for the
     review-prompt/Forbidden/principles clauses.
  7. `README.md` + `README-cn.md`: one bold sentence that these are OPTIONAL built-in
     `.claude/agents` files (NOT the external plugin v1.3.2 removed); the skill still runs zero-install.
- **`<ACCEPT-CMD>`:**
  - `test -f three-loop-workflow/references/optional-subagents.md`
  - `grep -q 'three-loop-design-reviewer' three-loop-workflow/references/optional-subagents.md`
  - `grep -Eqi 'does not transfer|enforcement gap' three-loop-workflow/references/optional-subagents.md`
  - `test -f three-loop-workflow/references/validate-commit-msg.sh`
  - `grep -Eqi 'grammar|lint' three-loop-workflow/references/validate-commit-msg.sh`
  - `bash -n three-loop-workflow/references/validate-commit-msg.sh`
  - `test -f three-loop-workflow/references/loop-3-teams.md`
  - `grep -qi 'When NOT to use a team' three-loop-workflow/references/loop-3-teams.md`
- **Exit condition:** ACCEPT green; fresh review confirms every optional mode states its
  zero-install fallback and its honest capability claim; new commitment-clause copies are
  registered in the cross-file consistency table.

### Phase 8 — Release packaging (WS6)

- **Entry condition:** Phases 1-7 closed.
- **Design refs:** Deliverables WS6; AC-Release, AC-Consistency.
- **Task list:**
  1. `SKILL.md`: bump `metadata.version` to `1.4.0`.
  2. `README.md` + `README-cn.md`: add the v1.4 "What's new" row (CN mirrors EN).
  3. `CLAUDE.md`: add any new load-bearing files (`light-mode.md`, `multi-voter-review.md`,
     `review-panel.js`, `optional-subagents.md`, `loop-3-teams.md`, `validate-commit-msg.sh`,
     `check-consistency.sh`) to the load-bearing list as appropriate; ensure the zip-rebuild
     command works from this repo root.
  4. Rebuild the `three-loop-workflow.skill` zip from the repo root
     (`zip -r three-loop-workflow.skill three-loop-workflow/`); sync the installed copy if present
     (record "installed copy not present on this host" otherwise).
  5. Run the full `three-loop-consistency` check + every phase's `<ACCEPT-CMD>` set as the
     final `<TEST-CMD>` sweep.
- **`<ACCEPT-CMD>`:**
  - `grep -q '1.4' three-loop-workflow/SKILL.md`
  - `grep -q '1.4' README.md`
  - `grep -q '1.4' README-cn.md`
  - `test -f three-loop-workflow.skill`
  - the `three-loop-consistency` check exits 0; every prior phase ACCEPT-CMD re-runs green.
- **Exit condition:** all phases green; zip rebuilt; F closeout (consolidation + fresh review) done.

## Data and Fixture Dependencies

None. All artifacts are Markdown, two JS Workflow scripts, and one shell script. No test
fixtures are created. New files live under `three-loop-workflow/references/`.

## Regression Protection

- After each phase, re-run the prior phases' `<ACCEPT-CMD>` sets — no earlier assertion may
  regress (e.g., the Phase 2 consistency gate must stay green as later phases add tokens).
- `node --check` must keep passing on both `l3-phase.js` and `review-panel.js` after every phase
  that edits them.
- The `three-loop-consistency` gate (added in Phase 2) is the standing regression guard for
  cross-file token drift through Phases 3-8.
- **Negated greps must be paired with a `test -f` guard.** A `! grep` over a not-yet-created
  file false-passes (grep errors → `!` inverts to success). Every phase that asserts the absence
  of a token in a NEW file also runs `test -f` (and, for scripts, `node --check`/`bash -n`),
  which hard-fail on a missing file, so the ACCEPT set as a whole cannot pass without the file.
- No phase may weaken the four principles, role isolation, round caps, or escalation; the F review
  re-confirms this against the full diff.
