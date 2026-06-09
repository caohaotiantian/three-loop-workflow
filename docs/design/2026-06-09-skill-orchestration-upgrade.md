# Design — Skill Orchestration Upgrade (v1.4)

> Task slug: `2026-06-09-skill-orchestration-upgrade`
>
> Status: closed
> Closing-commit: 8460330
> Closed-on: 2026-06-09
> Deferred: none
>
> Follow-up (post-closeout, same day): `WORKFLOW-v3.md` was removed entirely. The canonical
> flip (D-Canonical / P4a) made the derived spec redundant, so the "Derived" banner was
> superseded by outright deletion (user-authorized). The `three-loop-consistency` check was
> repurposed from spec-vs-skill comparison to verifying intra-skill commitment-clause tokens.

## 1. Background and Purpose

The three-loop-workflow skill (v1.3.3) enforces strong process discipline —
fresh-reviewer isolation, two-generation termination, round caps → escalation,
the four core principles — but it taps only a sliver of what Claude Code now
offers for orchestration. A seven-lens, adversarially-verified review (25 agents)
against the current Claude Code docs (dynamic workflows, agent teams, sub-agents,
parallel agents) found two classes of problem:

1. **Correctness drift.** The recommended L3 Workflow script (`references/l3-phase.js`)
   and three reference files have drifted from the canonical spec. The most serious:
   review/accept subagents are handed a dev branch name with **no instruction to
   materialize a diff**, so the fresh reviewer — the skill's single most load-bearing
   safety property — may audit an unstated, agent-guessed tree state. Two reference
   files advertise "worktree isolation as code" the script never implements. README
   and `claude-md-integration.md` declare **two different canonical sources of truth**,
   the root cause of the existing four-vs-five-question drift.

2. **Under-used capability.** L1/L2/F run as single sequential reviewers; only L3 uses
   a workflow. The skill never uses model routing, tool-restricted reviewers, persistent
   memory, the Explore agent for codebase understanding, behavior-observation
   verification (running the app), adversarial multi-voter review panels, or agent
   teams. It is excellent at preventing failure and nearly silent on raising the
   *quality ceiling* of the applications it helps build.

**Purpose:** close both gaps in one coordinated upgrade (v1.4) — fix the correctness
drift, and add the orchestration and quality levers — **without** weakening any of the
discipline that is the skill's whole point. The upgrade is itself produced by running
the skill's own L1 → L2 → L3 → F cycle on the skill (dogfooding).

**If we do not:** the recommended L3 path keeps corrupting the fresh-eyes audit; the
dual source-of-truth keeps generating drift; and the skill keeps producing safe-but-
unremarkable output because it never reaches for the primitives that raise the ceiling.

### Governing decisions (set by the user before this design)

- **D-Scope:** ship *everything* — including the heavy optional modes (review panel,
  tool-restricted reviewer agents, agent-team modes), each behind explicit opt-in with a
  zero-install fallback.
- **D-Canonical:** make the **skill files** (`SKILL.md` + `references/`) the single
  canonical source of truth; demote `WORKFLOW-v3.md` to a derived spec-level narrative.
- **D-TwoGen:** relax the clean-first-round two-generation tax in **L3 only**; leave
  L1/L2 two-generation intact (there the second clean round is fresh-reviewer
  corroboration, a distinct safety property).
- **D-Process:** dogfood — author this design doc + an impl doc, then implement in
  fresh-subagent-reviewed phases.

## 2. Deliverables

Grouped by workstream. Each maps to a verified review proposal (P-id). All edits land
in this repo; no behavior is changed in any consuming project except via the skill text
they already follow.

**WS1 — L3 correctness foundation (lands first; everything else reviews against it)**
- [x] **P1** `l3-phase.js`: add required `baseSha` to `DEV_SCHEMA`/`DevResult`; dev agent
  captures `git rev-parse HEAD` *before* editing; review + accept + fix prompts begin
  with a mandatory `git diff <baseSha>..HEAD` (and `git log` for commit checks); `baseSha`
  threaded to all fix rounds. Same unstated-diff gap fixed in the prose fallback
  (`loop-3-development.md` role table).
- [x] **P2** Remove the false "worktree isolation as code" claim at exactly two sites —
  `loop-3-workflow.md:6` and `loop-3-development.md:5` — and replace with the three *real*
  guarantees (round caps, structured verdicts, two-generation termination) + "dev writes to
  the main working tree, no git worktree isolation, so accept commands see the correct
  state". Also delete the **dead** worktree-isolation version-note + fallback bullet at
  `loop-3-workflow.md:8-10,16` — they warn about `isolation:'worktree'` issues for a feature
  the script never invokes (the script passes no `isolation` option), so they are dead in
  context. **Do not** touch the legitimate E2E worktree machinery (the real `git worktree
  add` in the E2E section of `loop-3-development.md`/`loop-3-workflow.md`), which is correct.
- [x] **P15a** Add an editor-visible load-bearing comment to `l3-phase.js` asserting the
  fresh-spawn / role-isolation invariant.
- [x] **P15b** Disambiguate transient agent failure from deadlock: retry each `agent()`
  once (try/catch covering throw *and* null return); on second failure return a new
  `agent-error` status (distinct from `cap-exhausted`) with a defined main-agent action
  in `loop-3-workflow.md`.

**WS2 — source-of-truth + drift gate (D-Canonical)**
- [x] **P4a** Make skill files canonical: add a "Derived — do not edit directly; the
  three-loop-workflow skill is the source of truth" banner to `WORKFLOW-v3.md`; update
  `README.md`/`README-cn.md` and `claude-md-integration.md` so every declaration agrees.
- [x] **P4b** Add a **token-scoped** grep consistency check to `CLAUDE.md` Common Commands
  that fails if named tokens diverge between `WORKFLOW-v3.md` and the skill (five role
  names, `fix(phaseN-roundR)`, "five questions", termination wording).
- [x] **P4c** Delete the now-false transitional supersedes note at
  `loop-2-implementation.md:93-95`; demote `claude-md-integration.md:91` temporal wording
  to a standing invariant.
- [x] **P4d** Diagram/return-table accuracy: note that a phase cannot close on review
  round 1 (two-generation rule); note that `status:'closed'` does **not** discharge the
  main-agent PhaseEnd re-run or the E2E gate.
- [x] **P3** (docs-only) Document that the L3 round cap `R` is a single phase-wide budget
  shared by review and accept (a review-heavy phase may reach accept with no fix budget —
  by design). **No code change** (the proposed `acceptRound = 1` was refuted: it would
  relax the round cap).

**WS3 — quality ceiling (raise output excellence)**
- [x] **P6** L1 pre-step "Understand before designing": an Explore-based, read-only
  codebase-understanding sweep feeding L1 (not a loop — no round counter, no review).
  Triggers on tasks touching existing code; no-ops on greenfield. Flags the Explore/Plan
  CLAUDE.md-non-inheritance trap. Optional main-agent `parallel()` fan-out + judge merge.
- [x] **P7** Behavior-observation verification: broaden the E2E trigger to include any
  externally observable behavior (UI / CLI / endpoint / user-visible output); a **fresh
  non-author** subagent drives the app and checks observed behavior against design
  Acceptance Criteria as a **gating** finding; `/run` and `/verify` as recommended drivers
  with the existing manual smoke test as fallback. Propagate the trigger change to every
  load-bearing copy (the mermaid gate label, the skip note, SKILL.md success definition +
  closed-Phase row, and WORKFLOW-v3.md), and update `end-to-end-review.md` step 3 so
  closeout evidence includes a behavior observation, not only exit-code tallies.
- [x] **P12** Declare-or-exclude quality budgets: L1 section 7 must declare a measured
  budget (latency / throughput / bundle size / a11y score) for user-facing / hot-path /
  interface changes, or record an explicit Scope Boundary exclusion; missing-and-not-
  excluded is a **general** issue at L1 review. Realized at L2 as a runnable `<ACCEPT-CMD>`.
- [x] **P13** Replace the wall-clock phase metric at all three sites it appears
  (`loop-2-implementation.md:27` "2 to 4 days", `loop-2-implementation.md:117` ">1 week",
  `WORKFLOW-v3.md:299` "2 to 4 days") with scope invariants (independently committable;
  leaves `<TEST-CMD>` green; maps to a contiguous block of Deliverables) + "do not pad a
  Phase to fill calendar time". (Drop the originally-proposed "exactly one regression
  surface" invariant — undefined term, forces over-splitting.)
- [x] **P14** State the skill's own cost: a 2-3 line spawn-count expectation near the
  applicability table; correctly-scoped concurrency caps (16/1000 govern the workflow
  runtime only) in `loop-3-workflow.md`.

**WS4 — tiering so the discipline is actually run (D-Scope default)**
- [x] **P9** Gated Light/Full tier replacing the binary applicability table, routed to a
  new `references/light-mode.md`. Light keeps the four non-negotiables (inline four-field
  brief, fresh-reviewer diff review, round-cap→escalation, four principles) and drops the
  separate L2 doc + collapses F to "acceptance green + one-line closure note". A **hard
  gate** forces Full Mode for any load-bearing file / breaking change / unresolved
  >1-option decision / magic number, and the Light-Mode reviewer **re-runs that gate**
  against the diff (fresh-eyes-enforced, not author-asserted). "When in doubt → Full."
  Plan mode is a drafting affordance, not the artifact. Folds in the description
  over-trigger carve-out (trivial non-commitment-clause edits to load-bearing docs get one
  independent review, not the full cycle).
- [x] **P10** Relax the two-generation tax in **L3 only** (D-TwoGen): `l3-phase.js` closes
  a phase on a single clean round **iff no fix was applied** (`fixApplied` gate); the
  moment a fix lands, two-generation re-engages. Guard the fix-spawn so it does not run on
  a clean round; update `schemas.md` closure formula and every restatement site. L1/L2
  prose two-generation rule unchanged.

**WS5 — heavy optional orchestration modes (D-Scope; opt-in, zero-install fallback)**
- [x] **P8** Optional adversarial review panel: `references/multi-voter-review.md` +
  `references/review-panel.js`. N (default 3, overridable arg) fresh reviewers in
  `parallel()`, each returning the existing `ReviewVerdict`; **union counts computed
  mechanically in the script** (never by an agent) and fed to the termination check; any
  dedup agent is merge-only and may not change counts. `reviewMode:'single'|'panel'`
  defaults to `single`. Gated to load-bearing/high-risk artifacts.
- [x] **P5** Optional tool-restricted reviewer bundle: `references/optional-subagents.md`
  with built-in `.claude/agents` definitions (`three-loop-design-reviewer` /
  `-impl-reviewer` / `-l3-reviewer`: `tools: Read, Grep, Glob, Bash`, no Edit/Write,
  `skills:[three-loop-workflow]` preload; optional Haiku `-accept-runner`). Honest
  enforcement-gap note (tool restriction does **not** transfer to the Workflow
  `agent(prompt,{schema})` path). Registered in the cross-file consistency table. Bold
  README note: optional built-in agents, **not** the external plugin v1.3.2 removed; skill
  still runs zero-install.
- [x] **P11** Optional commit-prefix `PreToolUse` hook:
  `references/validate-commit-msg.sh` + documented `settings.json` hook. Enforces the
  prefix **grammar** only (honestly described as a lint complementing the semantic
  review, not "Surgical Changes enforced"). Narrow matcher; exempts `chore:`/`docs:`/the
  closeout commit. Soften the "enforced mechanically" prose at the three sites.
- [x] **P16-1** (mandatory even if no team mode is used) Bind role isolation to teammate
  **identity** at `SKILL.md` and `loop-3-development.md`: a subagent that authored (or
  self-claimed dev for) an artifact may never claim its review/accept; lead plan-approval
  is not the fresh-reviewer gate.
- [x] **P16-2** (optional) `references/loop-3-teams.md`: three narrow agent-team modes
  behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, each with a sequential-subagent fallback
  (competing-hypothesis L1 debugging; parallel multi-lens F review; cross-layer L3 with
  mandatory disjoint file ownership). "When NOT to use a team" box pins the default path
  to subagents/Workflow. Optional `TaskCompleted` hook example. Whole-task auto-advance
  explicitly excluded (no in-team user gate).

**WS6 — release packaging**
- [x] Version bump to `1.4.0` in `SKILL.md` metadata; `README.md` + `README-cn.md`
  "What's new" v1.4 row (CN mirrors EN per Language Policy).
- [x] Update `CLAUDE.md` load-bearing list / common-commands for any new load-bearing
  files and the grep gate.
- [x] Rebuild `three-loop-workflow.skill` zip; sync installed copy (if present).

## 3. Scope Boundary (explicitly NOT in scope)

- **No whole-task auto-advancing workflow** that chains understand→L1→L2→L3→F without
  returning to the user on escalation triggers. Excluded by design: a team/workflow has no
  in-run user-question gate, so auto-advance would swallow the AskUserQuestion human gate.
- **No removal or weakening** of the four principles, fresh-reviewer/role-isolation rule,
  round caps, or escalation-on-cap. Every change either preserves or strengthens them.
- **No new external-plugin dependency.** Every optional mode degrades to the built-in
  default subagent + built-in tools.
- **No project-specific constants** baked into the skill (model names, file paths, test
  commands stay resolved via CLAUDE.md roles; default counts like panel `N=3` are
  overridable args, not constants).
- **No `acceptRound = 1` code change** (P3): refuted — it would widen the shared round cap.
- **No regeneration of `WORKFLOW-v3.md` prose** beyond the banner + the load-bearing
  tokens the grep gate checks. It becomes a derived narrative; the skill is authoritative.
- **No retroactive renaming** of prior `docs/` files or edits to other tasks' docs.
- Light Mode does **not** apply to any load-bearing or contract change — those are always
  Full Mode.
- **P12's new L1 quality-budget requirement is forward-only.** It adds a *general*-issue
  trigger to the L1 Acceptance-Criteria bar for tasks created after v1.4 ships; it does
  **not** retroactively fail existing design docs (including this one).

## 4. Key Design Decisions

### KDD-1 — Source of truth: skill files canonical (resolves D-Canonical)
- **Problem:** `README.md` says `WORKFLOW-v3.md` is canonical; `claude-md-integration.md`
  names the skill files. A fresh agent told to "edit the source of truth" cannot decide.
- **Options:** (a) dual-layer (both canonical, grep gate); (b) skill files canonical,
  WORKFLOW-v3.md derived; (c) WORKFLOW-v3.md canonical, regenerate skill.
- **Choice:** **(b)**, per the user. `WORKFLOW-v3.md` gets a "Derived — do not edit
  directly" banner; the skill is the operational source Claude Code loads. A token-scoped
  grep gate (KDD-2) still enforces the named tokens match, so the derived file cannot drift
  on the load-bearing items.
- **Rejected:** (a) keeps two co-equal canons, which is the ambiguity we are removing;
  (c) throws away the skill's per-clause granularity and the file Claude Code actually
  reads. Note WORKFLOW-v3.md is itself load-bearing, so the banner edit runs the cycle.

### KDD-2 — Drift enforcement: token-scoped grep, not clause-level
- **Problem:** Hand-sync between the skill and the derived spec keeps drifting (four-vs-five).
- **Options:** clause-level diff; token-scoped grep; no automated check.
- **Choice:** **token-scoped grep** over specific named tokens (five role names,
  `fix(phaseN-roundR)`, "five questions", termination wording). A clause-level diff
  false-positives on legitimate paraphrase (`WORKFLOW.md` vs `WORKFLOW-v3.md`, section vs
  filename references) and would erode trust in the gate.

### KDD-3 — Two-generation relaxation scoped to L3 (resolves D-TwoGen)
- **Problem:** No loop closes in one round even when the first review is spotless; the
  recommended Workflow path is therefore the most expensive for small phases — an
  abandonment driver.
- **Options:** keep everywhere; relax L3 only; relax L1/L2/L3.
- **Choice:** **relax L3 only.** In L3, review N+1 audits the exact post-fix diff, so when
  no fix occurred the second clean round adds zero information. In L1/L2 the second clean
  round is a *fresh reviewer corroborating the first* — a different, still-valuable safety
  property — so it stays. Mechanism: a `fixApplied` flag. The close predicate becomes an
  **OR of two paths**, not a removal of the `round > 1` guard:
  `reviewPasses = severe_count === 0 && ( (!fixApplied && general_count === 0) || (round > 1 && priorGeneralCount === 0) )`.
  The first disjunct is the new clean-first-round close (requires zero general *and* no fix,
  so a dirty first round still cannot close); the second is the unchanged two-generation
  post-fix path. The fix-spawn must additionally be guarded so it does not run when
  `severe_count === 0 && general_count === 0` (else `round++` fires before the close check
  and no round-1 close is possible). `fixApplied` is set true only inside that guarded fix
  branch. Closure formula in `schemas.md` and all restatement sites updated in the same
  change set.

### KDD-4 — Dev-diff materialization via `baseSha`, not a checkout/worktree (P1)
- **Problem:** Review/accept subagents are told a branch name but never instructed to
  diff it; the workflow runtime has no shell to do it for them.
- **Options:** (a) dev returns `baseSha`, reviewers run `git diff <baseSha>..HEAD`;
  (b) reviewers `git checkout <branch>` first; (c) `isolation:'worktree'` for dev.
- **Choice:** **(a).** The skill already commits to a shared working tree (no isolation);
  `baseSha` makes the audited diff explicit and deterministic with no new footguns.
  `baseSha` must be captured *before* the dev agent edits (else the diff collapses to
  empty) and threaded to every fix round (so multi-round phases audit the cumulative diff).
- **Rejected:** (b)/(c) reintroduce worktree isolation the skill deliberately abandoned
  (documented footguns: worktree forks from default branch not caller HEAD; stale-branch
  reuse) and would make accept commands see the wrong tree.

### KDD-5 — Optional modes are opt-in with a mandatory zero-install fallback (D-Scope)
- **Problem:** The heavy modes (panel, agent bundle, hook, teams) must not break
  self-containment or portability.
- **Options:** (a) ship each mode always-on as the new default; (b) ship them as an
  external plugin; (c) ship them opt-in in their own on-demand `references/*.md` with a
  mandatory built-in default-subagent fallback.
- **Choice:** **(c).** Each optional mode is gated behind an explicit flag/arg/install
  step, documents its zero-install fallback, and adds at most one SKILL.md routing row
  (progressive disclosure). Every new file that copies commitment-clause text (principles,
  Forbidden columns, review prompt) is **registered in the cross-file consistency table**
  in the same change so it cannot drift.
- **Rejected:** (a) breaks Simplicity First — small tasks would pay for panels/teams they
  do not need, and always-on agent-teams contradict the docs' "sequential work → use
  subagents". (b) re-introduces exactly the external-plugin dependency v1.3.2 deliberately
  removed (see `2026-06-02-self-contained-agent-types.md`).

### KDD-6 — Panel safety is mechanical union-counting (P8)
- **Problem:** How should N voters' findings be aggregated into the single `ReviewVerdict`
  the termination check consumes, without re-introducing a blind single reviewer?
- **Options:** (a) a fresh "dedup judge" agent reduces the union to a canonical list;
  (b) intersection (an issue counts only if a majority of voters raise it);
  (c) mechanical union computed in the script, fed pre-dedup to the termination check.
- **Choice:** **(c).** The script computes `severe_count`/`general_count` as the union
  across voters with no agent in the counting path. A dedup agent, if used at all, is
  merge-only (textual de-duplication for fix-prompt readability) and may never lower a
  count or demote severe→general. Because both counts are unions, panel mode makes *both*
  termination fields strictly harder — it can only strengthen the gate.
- **Rejected:** (a) a single dedup judge is itself an un-paneled solo reviewer that can
  drop/demote a severe — it reintroduces the exact failure the panel removes, one stage
  later, so it would refute the panel's own safety claim. (b) intersection can *remove* a
  real severe that only one voter caught, lowering the bar — forbidden by hard-constraint #2.

### KDD-7 — Honest capability claims are a standing policy, not an alternative (P5, P11, P16)
- **Problem:** Several proposals over-claim what a primitive enforces; an inaccurate claim
  in a load-bearing file is itself drift.
- **Decision type:** this is a *constraint/policy* applied to every optional mode, not a
  choice among alternatives — the only alternative is "state something false", which is not
  a candidate. The policy: state the truth at each site.
  - Tool-restricted reviewers enforce read-only on the manual/L1/L2 paths but **not** on
    the Workflow `agent(prompt,{schema})` path (named-agent restrictions do not transfer there).
  - The commit hook enforces prefix **grammar**, not "Surgical Changes" (it cannot see the
    review report).
  - A plain teammate **does** load skills/CLAUDE.md like a normal session — only a
    subagent-*definition* teammate drops `skills`/`mcpServers` frontmatter — so the real
    point is "loaded ≠ injected, and history doesn't carry over, so inline the schema +
    principles in the spawn prompt."
  - Do not assert "the runtime forbids mid-run user input" (not in the docs); say teammates
    run autonomously with no in-team question gate.

### KDD-8 — The L1 understand step is a pre-step, not a fourth loop (P6)
- **Problem:** Where does a codebase-understanding sweep sit relative to the three loops,
  and what machinery (if any) governs it?
- **Options:** (a) a new full loop "L0" with its own round counter and review subagent;
  (b) fold it into L1 step 1 with no distinct framing; (c) a named but non-looping
  "L1 pre-step: Understand before designing" with no review subagent, no round counter,
  no termination condition.
- **Choice:** **(c).** Scope to code understanding only (defer design-doc relationships to
  the existing L1 step 1 / section 6). Trigger on "touches existing code"; no-op on
  greenfield.
- **Rejected:** (a) "L0" collides with the three-loop identity (SKILL.md:10) and invites
  someone to attach round-cap/review machinery to a sweep that produces no artifact to
  gate — phantom fourth loop. (b) burying it loses the explicit trigger and the
  CLAUDE.md-non-inheritance warning that make it actually get run.

## 5. Dependencies and Assumptions

- **Claude Code primitives used** (all documented): dynamic workflows (`agent`,
  `parallel`, structured `schema`); built-in `Explore` subagent (read-only, Haiku);
  sub-agent frontmatter (`tools`, `model`, `skills`, `disallowedTools`); `PreToolUse`
  hooks (exit 2 = block); `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`; `/run`, `/verify`,
  `/run-skill-generator` bundled skills.
- **Assumption:** consuming projects fill the five CLAUDE.md roles; the skill stays
  project-agnostic. New optional files resolve any command via `_common-commands_`.
- **Assumption:** this repo has no test suite; acceptance is grep-based checks over the
  modified files (per this project's CLAUDE.md _common-commands_ role). `<TEST-CMD>` for
  this repo = the grep self-checks; `<ACCEPT-CMD>` per phase = specific grep assertions.
- **Assumption:** the installed-copy sync path in CLAUDE.md (`/home/fedora/...`) is the
  documented convention; on this machine the sync target may not exist, in which case the
  F step records "installed copy not present on this host" rather than failing.

## 6. Relationship with Existing Designs

- **Extends** `docs/design/2026-06-01-f3-f5-workflow-l3-engine.md` (introduced
  `l3-phase.js`): this task fixes the dev-diff bug (P1), the accept round-cap
  documentation (P3), and the two-generation L3 relaxation (P10) in that engine.
- **Extends** `docs/design/2026-06-02-self-contained-agent-types.md` (v1.3.2 removed the
  external-plugin agent types): this task *re-introduces* optional agent definitions (P5)
  but as **built-in `.claude/agents`**, not a plugin, preserving the self-containment that
  prior design established. No conflict — different mechanism, same guarantee.
- **Extends** `docs/design/skill-v1-3-improvements.md` (the four-vs-five question change,
  "D4"): this task removes the now-stale supersedes note that change left behind (P4c).
- **Supersedes nothing wholesale.** Terminology anchors: SKILL.md, WORKFLOW-v3.md, and the
  references. No conflicts requiring a source-of-truth ruling beyond KDD-1, which the user
  has already decided.

## 7. Acceptance Criteria (measurable / automatable — grep over modified files)

Each criterion is a shell-runnable check from the repo root. `PASS` = the grep exits as
stated. These become per-phase `<ACCEPT-CMD>`s in the impl doc.

- **AC-P1:** `grep -q 'baseSha' three-loop-workflow/references/l3-phase.js` and
  `grep -q 'baseSha' three-loop-workflow/references/schemas.md` and
  the review/accept prompts use the **branch-qualified** diff form
  `git diff ${baseSha}..${devBranch}` (KDD-4): `grep -q 'baseSha}..' three-loop-workflow/references/l3-phase.js`
  (the diff is taken against the dev branch tip, not bare `HEAD`).
- **AC-P2:** `! grep -riq 'worktree isolation as' three-loop-workflow/references/loop-3-workflow.md three-loop-workflow/references/loop-3-development.md`
  and `grep -q 'no git worktree isolation' three-loop-workflow/references/loop-3-workflow.md`
  and the dead version-note is gone — assert zero occurrences of the token (the on-disk
  text wraps it in backticks, so match the substring, not a backtick-free literal):
  `! grep -q "isolation: 'worktree'" three-loop-workflow/references/loop-3-workflow.md`
  (currently present at the version-note + fallback bullet, so this fails on the old tree).
- **AC-P15a:** `grep -q 'MUST spawn a fresh subagent' three-loop-workflow/references/l3-phase.js`.
- **AC-P15b:** `grep -q "agent-error" three-loop-workflow/references/l3-phase.js` and
  `grep -q "agent-error" three-loop-workflow/references/loop-3-workflow.md`.
- **AC-P4a:** the old wrong-direction claim is gone and the new one is affirmative:
  `! grep -q 'The spec is the source of truth' README.md` and
  `! grep -q '(canonical)' README.md` (catches the repo-layout line "Source specification
  (canonical)") and `grep -Eiq 'skill (files )?(is|are) the (single |canonical )?source of truth' README.md`,
  plus `grep -q 'Derived' WORKFLOW-v3.md`. (The prior AC false-passed on the unmodified
  tree because today's README already contains "source of truth … skill".)
- **AC-P4b:** the gate is a named command. `grep -q 'three-loop-consistency' CLAUDE.md`
  (a labelled check under Common Commands) and running it greps the specific tokens —
  the five role names, `fix(phaseN-roundR)`, `five questions`, and the termination
  wording — across `WORKFLOW-v3.md` and the skill, exiting non-zero on any divergence;
  the check exits 0 over the final tree.
- **AC-P4c:** `! grep -q 'supersedes the four-question count' three-loop-workflow/references/loop-2-implementation.md`
  and the second drift site is reconciled: `! grep -q 'currently updated' three-loop-workflow/references/claude-md-integration.md`
  (the temporal "currently updated to five" wording becomes a standing must-match invariant).
- **AC-P3:** `grep -riq 'shared.*cap\|phase-wide budget' three-loop-workflow/references/loop-3-development.md three-loop-workflow/references/l3-phase.js`.
- **AC-P6:** `grep -q 'Understand before designing' three-loop-workflow/references/loop-1-design.md`
  and `grep -qi 'explore' three-loop-workflow/references/loop-1-design.md` and a SKILL.md
  routing row for it.
- **AC-P7:** `grep -qi 'behavior verification\|externally observable behavior' three-loop-workflow/references/loop-3-development.md`
  and `grep -qi 'behavior' three-loop-workflow/references/end-to-end-review.md`.
- **AC-P12:** `grep -qi 'quality budget\|declare.*exclude' three-loop-workflow/references/loop-1-design.md`.
- **AC-P13:** `! grep -q '2 to 4 days' three-loop-workflow/references/loop-2-implementation.md WORKFLOW-v3.md`
  and `grep -qi 'do not pad' three-loop-workflow/references/loop-2-implementation.md`.
- **AC-P14:** `grep -qi 'cost expectation\|spawns roughly' three-loop-workflow/SKILL.md`.
- **AC-P9:** `test -f three-loop-workflow/references/light-mode.md` and
  `grep -qi 'Light Mode\|Full Mode' three-loop-workflow/SKILL.md` and
  `grep -qi 'when in doubt' three-loop-workflow/references/light-mode.md`.
- **AC-P10:** `grep -q 'fixApplied' three-loop-workflow/references/l3-phase.js` and
  `grep -q 'fixApplied' three-loop-workflow/references/schemas.md`.
- **AC-P8:** `test -f three-loop-workflow/references/review-panel.js` and
  `test -f three-loop-workflow/references/multi-voter-review.md` and
  `grep -q 'reviewMode' three-loop-workflow/references/l3-phase.js` and the panel script
  computes union counts without an agent (`grep -q 'union' three-loop-workflow/references/review-panel.js`).
- **AC-P5:** `test -f three-loop-workflow/references/optional-subagents.md` and
  `grep -q 'three-loop-design-reviewer' three-loop-workflow/references/optional-subagents.md`
  and `grep -qi 'does not transfer\|enforcement gap' three-loop-workflow/references/optional-subagents.md`.
- **AC-P11:** `test -f three-loop-workflow/references/validate-commit-msg.sh` and
  `grep -qi 'grammar\|lint' three-loop-workflow/references/validate-commit-msg.sh`.
- **AC-P16-1:** `grep -qi 'self-claim\|teammate.*identity' three-loop-workflow/SKILL.md three-loop-workflow/references/loop-3-development.md`.
- **AC-P16-2:** `test -f three-loop-workflow/references/loop-3-teams.md` and
  `grep -qi 'When NOT to use a team' three-loop-workflow/references/loop-3-teams.md`.
- **AC-Release:** `grep -q '1.4' three-loop-workflow/SKILL.md` (version) and a v1.4 row in
  **both** READMEs — `grep -q '1.4' README.md` and `grep -q '1.4' README-cn.md` (the CN
  changelog row is required by the Language Policy, not optional); the rebuilt `.skill`
  zip exists at the repo root and contains the updated files.
- **AC-Consistency:** the WS2 grep gate exits 0 over the final tree; no reference file
  claims a guarantee the code does not implement; every new commitment-clause copy is
  registered in `claude-md-integration.md`'s cross-file table.

## 8. Risks and Rollback

| Risk | Likelihood | Mitigation / Rollback |
|---|---|---|
| The upgrade is large and could itself introduce drift across the many load-bearing files | med | The WS2 grep gate + a final fresh-subagent consistency review (F) catch token drift; each phase is independently committed and revertable. |
| Demoting WORKFLOW-v3.md leaves it stale | med | The grep gate pins the load-bearing tokens; the banner tells readers the skill wins; F review confirms no contradiction remains. |
| L3 two-generation relaxation weakens post-fix re-review | low | `fixApplied` re-engages two-generation on any fix; an F reviewer specifically confirms the post-fix property is unweakened; rollback = restore the `round > 1` guard. |
| Optional modes over-claim enforcement and mislead users | low | KDD-7 mandates honest claim text; the verifiers' specific corrections are encoded as acceptance checks (AC-P5/P11 require the enforcement-gap note). |
| Panel mode accidentally lowers the bar via a dedup agent | low | KDD-6: union counts are mechanical in the script; AC-P8 asserts it. |
| Installed-copy sync path absent on this host | high | F records "installed copy not present" rather than failing; zip rebuild is the portable deliverable. |
| Adding agent-team text bloats SKILL.md | low | All team content lives in `loop-3-teams.md`; SKILL.md gets one routing row + the one-sentence identity guard. |

**Rollback mechanism:** the whole upgrade is on the `skill-v1.4-orchestration-upgrade`
branch; any phase can be reverted independently (each is its own commit). If the upgrade
must be abandoned, `git checkout main` restores v1.3.3 with no residue.
