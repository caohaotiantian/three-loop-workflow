# three-loop-workflow

A disciplined three-loop workflow for non-trivial software changes, packaged as a portable Agent Skill (runs on Claude Code, Codex, and opencode).

中文版本 → [README-cn.md](./README-cn.md)

## What's in this repo

- **`three-loop-workflow/`** — a Claude skill that operationalizes the workflow. Drop this folder into Claude Code or Claude.ai and Claude will follow it on any non-trivial code change.

The skill files (`SKILL.md` + `references/`) are the single source of truth — they are what Claude Code loads and executes. A short entry point (`SKILL.md`) routes to per-stage reference files that load only when needed.

## What's new

| Version | Key additions |
|---|---|
| **v1.3** | `agentType` recommendation column in routing table; `references/schemas.md` (ReviewVerdict schema); `## When this skill does NOT apply` table; Quick orientation box; Common failure modes table; Document naming convention; TaskCreate round-tracking guidance |
| **v1.3.1** | `references/l3-phase.js` — Workflow-based L3 Phase runner (recommended mode); `references/loop-3-workflow.md` — invocation guide; `references/schemas.md` gains AcceptVerdict and DevResult schemas; SKILL.md routing table gains Workflow-mode row |
| **v1.3.2** | Skill is now self-contained: all subagent/Workflow nodes run on the built-in default subagent; removed the dependency on the feature-dev plugin's agent types (`agentType` recommendation column and the bare-vs-namespaced `code-reviewer` paragraph dropped from SKILL.md) |
| **v1.3.3** | Skill no longer induces process-narration comments in code: explicit Surgical-Changes rule ("comments explain the code, not the workflow") added to SKILL.md, plus an L3 review check that flags them; the `references/l3-phase.js` exemplar scrubbed of design-doc/decision/diagram references |
| **v1.4** | **Orchestration upgrade.** Correctness: L3 dev diff materialized via `baseSha` + an `agent-error` status distinct from cap-exhaustion (`l3-phase.js`); the skill files made the **sole source of truth** (the redundant derived `WORKFLOW-v3.md` spec removed) with a `three-loop-consistency` self-check; false worktree-isolation claims removed. Discipline tuning: L3-only clean-first-round termination relaxation; gated **Light/Full tier** (`references/light-mode.md`) with a fresh-eyes tier check; scope-based phases; cost expectation. Quality ceiling: L1 "understand before designing" Explore pre-step; gating **behavior verification** (`/run`, `/verify`); declare-or-exclude perf/UX/a11y budgets. Optional modes (opt-in, zero-install fallback): adversarial **review panel** with mechanical union (`references/review-panel.js`, `multi-voter-review.md`); tool-restricted **reviewer agents** with model routing (`references/optional-subagents.md`); commit-prefix lint hook (`references/validate-commit-msg.sh`); **agent-team** modes (`references/loop-3-teams.md`) |
| **v1.5** | **Compliance-hardening** (32 vetted lessons from a comparison with the `superpowers` skill collection, shipped in 3 waves). **Anti-summary:** the always-loaded `description` no longer paraphrases the workflow and the "Quick orientation" box became a *read-the-reference-in-full* directive — the always-loaded surface net **shrank**. **Human-factors:** one consolidated rationalization / red-flag table (`escalation-rules.md`) plus inline reviewer trip-wires where the reviewer actually reads. **Verify, don't label:** TDD watch-it-fail is reviewer-checked from the git log; closeout requires *fresh* command output; a fresh-eyes **whole-change correctness review** now runs by default at F (not just doc-consolidation). **Failure-handling:** root-cause gate + failing-reproduction-test in the fix corner; round-cap exhaustion reframed as a possible design/decomposition defect; evidence-based deadlock reports. **Ergonomics:** honest dev status (`blocked` / `concerns[]` with a bounded single re-dispatch → `dev-escalation`); per-corner `models` routing; calibrated severity (anti-inflation); verify-by-diff grounding. **Elicitation:** gated intent-confirmation L1 pre-step; free pre-spawn self-review; multi-subsystem decomposition signal. **Self-testing:** a standing `tests/scenarios/` behavioral suite + maintenance gates (`check-consistency.sh` now also pairs `clean-first-round` / `fixApplied`) — the skill now tests its own discipline under pressure |
| **v1.5.1** | **Audit-repair hardening** (from a multi-lens self-audit). The consistency gate now genuinely pins the `two-generation` token across its source files (it had been a comment-only no-op) and enforces a `wc -w` ceiling on the always-loaded `SKILL.md`; the commit-prefix lint extracts the subject from the *first* `-m` (multi-`-m` commits went unvalidated) and JSON-unescapes its no-jq fallback; the None tier now requires the reviewer to re-confirm a load-bearing edit changes no rule; `l3-phase.js` unions `clarifications` and reports the round that actually ran on cap-exhaustion; +6 behavioral scenarios (tier-down, None boundary, design-conflict rollback, delete-asks-first, disguised rule-change, dep-upgrade review); MIT `LICENSE` + superpowers acknowledgment; the packaged `.skill` is now built in CI on a `v*` tag instead of committed; the adversarial review **panel** now requires a surviving voter quorum (⌊N/2⌋+1) to render a clean PASS — a panel that loses most voters re-runs instead of silently passing on one. A **second self-audit round** then closed nine more load-bearing gaps: the documented L1/L2 closure no longer collapses the strict `two-generation` rule into a single clean round (the reviewer-emitted `verdict` is no longer a closure authority, and a gate guard forbids it returning); the commit-prefix lint now screens a `git commit` invoked with global options (`git -C` / `-c` / `--no-pager`) and its no-jq fallback no longer over-captures trailing fields; the skill-self behavioral check is discharged by the main agent (the mechanical accept corner cannot run it) and a dev-escalation no longer drops the original blockers; the accept corner stays exit-code-only while the skip/xfail tally moves to the PhaseEnd re-run, and a general finding at the closeout whole-change review is recorded/deferred instead of vanishing; Light Mode's termination rule is now stated, and the tier-table file-count trigger and None cell were tightened (net-negative on `SKILL.md` word count) |
| **v1.5.2** | **L3 runner arg-delivery fix.** `references/l3-phase.js` and `references/review-panel.js` now **normalize their Workflow `args`**: some Workflow runtimes deliver the script's global `args` as a JSON *string* (a verbatim tool-call pass-through) rather than a parsed object, so destructuring fields straight off it left every field `undefined` and the run died with a cryptic `undefined is not an object (evaluating 'phaseLabel.replace')` — previously misread as "args delivery is broken / the Workflow runner is unavailable" and used to justify the prose fallback. Both scripts now parse **and** validate `args` (tolerant of an object *or* a JSON string), so every malformed-args path lands on a descriptive throw that names the fix instead of a raw crash. `references/loop-3-workflow.md` ("Arg delivery") and `references/multi-voter-review.md` record the string-delivery reality so the `JSON.parse` is known-intentional (not dead code) and a thrown arg error is not re-misread as a runner outage. |
| **v1.6.0** | **Project-wide closeout.** The final **F: End-to-End Review** grows from a diff-and-task-doc closeout into a project-wide closeout (`references/end-to-end-review.md`, renumbered to a 9-step checklist), adding five behaviors: (1) **repo-wide validation gates** — F runs every gate the project declares under `_common-commands_`, not only `<TEST-CMD>` (with an operational test that excludes build/deploy/packaging actions); (2) a **whole-project blast-radius review** — the fresh-eyes review now also scans *outside* the diff for consumers/callers of changed or removed symbols, catching a stale caller the diff cannot show; (3) a **change-orphan cleanup sweep** — F removes artifacts *this change* orphaned project-wide while sparing pre-existing dead code (Principle 0.3); (4) **conditional migration verification** — when the change involves a schema / data / config / storage / API-version / dependency migration (now itself a Full-Mode trigger), F verifies it is committed, reversible-or-rolled-back, applied+tested, and free of callers on the old contract; (5) **scoped project-doc reconciliation** — F updates project-facing docs (README, CLAUDE.md, user/API docs) whose described behavior the change made wrong, bounded by an in-scope-vs-drive-by test that keeps Surgical Changes intact. Five new behavioral scenarios pin the new behaviors and `check-consistency.sh` gates each new clause, its cross-reference delimiter, and the fixtures. |
| **v1.7.0** | **Failure retrospective** (a stateless port of Trellis's `trellis-break-loop`, from a comparison with the `mattpocock-skills` and `Trellis` collections). A **systemic (class-level) failure** — a round-cap **deadlock** whose surviving cause is a task-domain class of bug, or an **F step-6 systemic (blast-radius) cause** — now drives a durable **class-prevention** onto an already-read surface (a test, an `_engineering-norms_` line, a skill guardrail) instead of dying in the diff. Detection is **within-invocation** (the skill stays stateless — git is the memory); the cross-task payoff comes from *where the prevention lands*. The retrospective is **additive**: it never relaxes F severity routing (a severe finding still blocks closure), and a **`_load-bearing-docs_` prevention defers as a `finding`** rather than smuggling an unreviewed edit into closeout (the **subject-partition** keeps it non-duplicative with "Meta-test the cap"). New `references/failure-retrospective.md`, hooks in `escalation-rules.md` + `end-to-end-review.md`, a Light-Mode disposition clause, a **reference-only paired token** `failure_retrospective` + four behavioral fixtures in `check-consistency.sh` — **zero SKILL.md surface** (a conditional trigger does not earn always-loaded words). |
| **v1.8.0** | **L1 Evidence Rule** (from the same external-skills comparison; ported from Trellis `trellis-brainstorm`). At L1 pre-step B, before escalating a clarifying question the agent first answers it from the codebase / `docs/design/` / CLAUDE.md: a **repo-answerable fact is looked up, not asked** (no rubber-stamp escalations), while a genuine **product / scope / risk decision the repo cannot answer is still escalated**. Guards **both** failure directions — over-asking *and* the more dangerous under-asking (guessing a decision and calling it "a fact the repo settles", a silent default) — via a new Rationalizations-table row in `escalation-rules.md` and two opposite-direction behavioral fixtures. Reference-only paired token `evidence_rule` across `loop-1-design.md` ↔ `escalation-rules.md`; **zero SKILL.md surface**. |
| **v1.9.0** | **Negation→positive check for skill-self edits** (from the same comparison; ported from mattpocock `writing-great-skills`). This skill is self-hosted, so every edit to it runs through its own L1 review; that review's skill-self-edit branch now flags a **new rule phrased as a bare prohibition** ("never X") that could be a **positive target** ("do Y") and calls for the rephrasing — a bare ban drags the forbidden behavior into the reading agent's context and half-reads as an instruction to do it; a prohibition is kept only as a hard guardrail paired with the positive. Notably, L1 review of this change proved the **rest** of the audited "craft layer" is *already embodied* in the skill (no-op detection ↔ Simplicity First / the trace test / anti-bloat; synonym-drift ↔ the terminology `[Language constraint]`), so only this one non-duplicative rule was added. Single-file token `negation_positive` + one behavioral fixture; **zero SKILL.md surface**. |
| **v1.9.1** | **L3-runner correctness (audit hardening).** Two fixes from a fresh self-audit: (1) the **merge-handoff footgun** — because the dev subagent works in the shared working tree, its `git checkout -b` moved HEAD onto the dev branch, so the recommended close-out `git merge --ff-only <branch>` was a merge-into-itself; dev now branches off the captured `baseSha` before editing, the main agent records its integration branch at invocation, and the merge step returns to it first (`l3-phase.js` dev-prompt + `loop-3-workflow.md`, no control-flow change); (2) two **backfill behavioral fixtures** for previously-unasserted core mechanics — round-cap→deadlock escalation and the L3 clean-first-round *positive* close. (A larger audit finding — separating the accept-loop round budget from the review budget — was split to its own cycle.) Zero SKILL.md surface. |
| **v1.9.2** | **Dependency-tier disambiguation (audit hardening).** A **major-version dependency bump** was simultaneously "dependency upgrade → None tier" (SKILL.md None row + description) and "dependency major-version migration → Full tier" (Full row + the migration definition) — a real mis-tier vector on a common task. The None-tier dependency clause is now qualified **minor/patch** (the exact semver complement of the migration definition's "major-version"), so a major bump routes to Full via the unchanged migration trigger and gets F's migration verification. Two one-word qualifiers + one behavioral fixture (major bump → Full). |
| **v1.10.0** | **A diagnosis method for the fix corner** (Wave 2 of the audit backlog; the one genuine capability gap both `mattpocock-skills` and `Trellis` independently converged on). The fix corner *demanded* "name the root cause" but prescribed **no method to find one** — so an agent under round-budget pressure anchors on the first plausible theory and patches it (the "different item failed each round" churn the deadlock report exists to catch). Now, when the cause is **not obvious after the repro**: generate **3-5 ranked, falsifiable hypotheses** (each states a testable prediction — "if you can't predict, it's a vibe") and seek **discriminating evidence** (the observation that separates the top hypotheses), rather than confirming the first. Wired into `loop-3-development.md`, **both** `l3-phase.js` fix prompts, and a Rationalizations row; paired token `diagnosis_method` + a refutation-constructed fixture (the tempting first theory is refutable-and-wrong, so only the discriminating path reaches the right answer). Zero SKILL.md surface. |
| **v1.11.0** | **A spike/experiment branch of the L1 Evidence Rule** (Wave 2b; ported from mattpocock `prototype`). The Evidence Rule was binary — repo-answerable *fact* → look up; *decision* → escalate — but some design-input questions are **neither**: they're settled only by **running** (does the vendor SDK *actually* support X; what shape is a real payload; can approach X clear the budget). Escalating bounces to a user who'd have to run it too; assuming is a silent default. Now: run a **spike**, tightly bounded so it can't become "code before design" — **(a)** throwaway, run in an **ephemeral isolated worktree and mechanically deleted** (reusing the existing E2E isolated-spawn machinery); **(b)** only durable output = the answer + question, recorded in the design doc (git = memory); **(c)** bounded to the question — design still gates L3. Paired token `spike_answer` + a Rationalizations row + a 4-way fixture (spike vs assume vs escalate vs build-the-real-thing). Zero SKILL.md surface. |
| **v1.12.0** | **A verbatim-evidence standard for external/technical claims in design docs** (Wave 3; ported from Trellis `research.md`). The Evidence Rule governs *whether* to look up / escalate / spike a question; nothing governed the **form of a stated fact**. So a design doc could assert a *confident* external/technical claim ("the callback fires synchronously") as **settled fact with no source**, and that (often hallucinated) claim would propagate into L2 Phase plans and L3 code as if established. Now the L1 review flags a **load-bearing external/technical claim stated without its verbatim `file:line` source** (or a spike-derived value) — **confident or hedged** (a confident unevidenced claim being the more dangerous case) — as a general issue, and the **fresh-eyes reviewer owns the classification** (an author can't dodge by recasting an API-behavior claim as "intent"). Composes with the Evidence Rule + spike (whether-to-ask / run-to-find-out / form-of-a-fact). Paired token `verbatim_evidence` + a Rationalizations row + a fixture (a confident unevidenced claim a baseline reviewer accepts → demand-source). Zero SKILL.md surface. |
| **v1.12.1** | **Gate the adversarial panel-angles sync (gate-integrity hardening).** The five voter angles (the four principles restated as adversarial lenses + correctness) exist twice — `ANGLES` in `review-panel.js` and `PANEL_ANGLES` in `l3-phase.js` — as a *registered* commitment clause that was **ungated**, so the two had silently **drifted** (`l3-phase.js`'s copy had been trimmed, losing "speculative abstraction / unstated assumptions / cross-file drift / unreachable logic"): the standalone and inline panels were reviewing against subtly different lenses. Reconciled `PANEL_ANGLES` to the richer canonical `ANGLES` (strictly more coverage for the inline panel) and added a **block-anchored byte-identity gate** to `check-consistency.sh` (negative-tested: perturbing one string red-fails it) so any future divergence is caught. Zero SKILL.md surface. |
| **v1.12.2** | **Wave-4 anti-bloat / gate-integrity tail (net-negative hygiene, no behavior change).** Six items: **F6** adds a byte-identity gate so the `[Calibration]`/`[Grounding]` review-prompt lines cannot silently drift between `loop-1-design.md` and `loop-2-implementation.md` (the same fix pattern as the v1.12.1 panel-angles sync; the `[Trip-wires]` line legitimately differs L1/L2 and is excluded). **F4** adds an env-overridable per-file word cap (default 3000) for `references/*.md`, catching a single reference file ballooning without penalizing the skill's push-detail-out-of-SKILL.md design. **F15** replaces the near-worthless bare-word gate token `consolidation` (15 incidental occurrences → false-green) with the distinctive references-only marker `consolidation_pass`. **F5/F13/F14** trim over-documented prose in `failure-retrospective.md`, `loop-3-teams.md`, and `optional-subagents.md` with every gated token, fixture-asserted field, and behavioral rule preserved (the four `failure-retrospective-*` fixtures still pass cold). Zero SKILL.md prose surface (only the frontmatter version bumped). |
| **v1.12.3** | **Close F11 (L3 accept-loop budget starvation) as won't-fix.** Records — as a design-rationale comment at `l3-phase.js`'s `acceptRound = round` line — *why* the accept loop deliberately shares the review round-cap budget rather than getting its own: acceptFix commits are code the fresh-review gate never sees, so a separate accept budget would multiply review-ungated churn to buy back a rare edge case (a Phase that needed a review fix has no accept-fix slack); a Phase that exhausts the shared budget escalates by design. The alternative of routing acceptFix back through review (which *would* close that bypass) was weighed and declined for now — a full L3 redesign to close a hole with zero observed instances of opening. Comment-only, no behavior change; the comment follows §0.3 (explains the code, no audit labels). Zero SKILL.md prose surface. |
| **v1.13.0** | **Cross-runtime portability (Claude Code / Codex / opencode).** The skill's structure already conforms to the agentskills.io open standard, so it runs on three agent runtimes off one canonical folder; this release makes that explicit without changing any discipline rule. A new `references/platforms.md` carries the per-runtime **install/discovery matrix** (`.claude/skills/` for Claude Code, `.agents/skills/` for Codex, both for opencode), the **capability map** from each Claude-Code mechanism to its manual-mode realization (incl. `AskUserQuestion → STOP:QUESTION`), and the **fresh-reviewer-isolation ladder** (spawned subagent → fresh/cleared context → disclosed degradation, honest that a subagent-less runtime cannot self-enforce isolation). `SKILL.md` gains a top-level `compatibility` frontmatter field + a dedicated routing row, and reframes the L3 orchestration split so **Workflow mode is named the Claude-Code acceleration layer and manual mode the portable baseline** Codex/opencode run (existing vocabulary; D8 restates that manual mode keeps the L3 clean-first-round relaxation, changing no rule). A paired `cross_runtime` drift token + a new `no-subagent-review-stays-fresh` behavioral fixture gate the SKILL.md ↔ platforms.md pair. The always-loaded word ceiling was raised once, **2888 → 2920**, as a bounded, user-authorized allowance for the honest `compatibility` field + the routing row — a genuine new capability, not a licence for drift. |

## What is the three-loop workflow?

Most agentic coding failures share a pattern: rushing into implementation, picking silent defaults, skipping review. This workflow forces the discipline that prevents those failures by gating every functional change through three top-down loops, plus a closeout review.

| Stage | Output | Round cap |
|---|---|---|
| **L1** Design Document Loop | `docs/design/<task-slug>.md` (8 required sections) | 3 |
| **L2** Implementation Document Loop | `docs/implementation/<task-slug>.md` (Phase breakdown + acceptance commands) | 3 |
| **L3** Development Work Loop | code changes via the four-corner template (dev → review → accept → fix) | 3 per Phase |
| **F** End-to-End Review | task closeout | — |

Every loop closes only when a **fresh subagent review** reports zero severe issues this round and zero general issues in the prior round. Hitting the round cap escalates to the user — never silently lowers the bar.

Four non-negotiable principles every subagent inherits:

1. **Think Before Coding** — surface, do not assume.
2. **Simplicity First** — minimum code that solves the stated problem.
3. **Surgical Changes** — touch only what the request requires.
4. **Goal-Driven Execution** — define success, loop until mechanically verified.

## When the skill applies

| Change type | Apply full L1 → L2 → L3? |
|---|---|
| New feature, bug fix, optimization, refactor | yes |
| Modification to a load-bearing document (CLAUDE.md, OpenAPI spec, schema, etc.) | yes |
| Pure typo fix, doc reordering, dependency upgrade | no — but still requires one independent fresh-agent review |
| Questions / exploration with no code change | no |

## Installing the skill

The skill is **self-contained** — it depends on no external plugin. Every subagent / Workflow node runs on the built-in default subagent, so installing this skill alone is sufficient.

**Optional** reviewer agents (`three-loop-workflow/references/optional-subagents.md`) add tool-restricted, model-routed reviewers — these are **built-in Claude Code `.claude/agents` files, not the external plugin v1.3.2 removed**, and the skill still runs zero-install without them.

### Claude Code

Drop the skill folder into one of the standard locations:

```bash
# Project-level: applies only inside <your-repo>
cp -r three-loop-workflow <your-repo>/.claude/skills/

# User-level: applies across all projects
cp -r three-loop-workflow ~/.claude/skills/
```

Or package it as a single distributable `.skill` file:

```bash
# from the repo root (rm first so a stale archive can't keep already-removed files)
rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/
# produces three-loop-workflow.skill — a zip Claude Code recognizes
```

Tagged releases (`v*`) also ship a prebuilt `.skill`, attached to the GitHub release by
`.github/workflows/release.yml` — so you can download it instead of building locally.

### Claude.ai

Upload the packaged `.skill` file via the Skill management page.

### Cross-platform install (Claude Code / Codex / opencode)

The skill conforms to the agentskills.io open standard, so one canonical `three-loop-workflow/` folder runs on three runtimes:

| Runtime | Install location |
|---|---|
| **Claude Code** | `.claude/skills/` (project) or `~/.claude/skills/` (user) |
| **Codex** | `.agents/skills/` (or `$HOME/.agents/skills/`) |
| **opencode** | reads both `.claude/skills/` and `.agents/skills/` natively — no separate install |

Copying the folder into `.claude/skills/` and `.agents/skills/` covers all three. The discipline is runtime-agnostic; only the Workflow/subagent orchestration is a Claude-Code acceleration layer. See `three-loop-workflow/references/platforms.md` for the full capability matrix and the fresh-reviewer-isolation ladder.

## Project setup (one-time per repo)

The skill references project-specific values via **roles**, not literal heading names. Each project pins those in its `CLAUDE.md` anchor map. The five required roles:

| Role | Holds |
|---|---|
| `_repo-workflow_` | how tasks proceed in this repo |
| `_load-bearing-docs_` | which contract files are protected by the full cycle |
| `_language-policy_` | language and terminology rules |
| `_common-commands_` | concrete `<TEST-CMD>` value and similar |
| `_engineering-norms_` | project-level coding standards |

Example anchor map at the top of a project's `CLAUDE.md`:

```markdown
<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"
```

See `three-loop-workflow/references/claude-md-integration.md` for the full convention, the cross-file consistency checklist, and grep-based self-check commands.

## Repository layout

```
.
├── three-loop-workflow/              The skill (the single source of truth)
│   ├── SKILL.md                      Entry point: principles + tier table + routing
│   └── references/
│       ├── loop-1-design.md          L1 review template + 8 sections + understand pre-step
│       ├── loop-2-implementation.md  L2 Phase breakdown + review template
│       ├── loop-3-workflow.md        L3 Workflow mode (invoking l3-phase.js)
│       ├── loop-3-development.md     L3 four-corner template + commits + E2E/behavior
│       ├── l3-phase.js               L3 Workflow script (dev → review → accept → fix)
│       ├── review-panel.js           Optional adversarial review panel (mechanical union)
│       ├── schemas.md                ReviewVerdict / AcceptVerdict / DevResult
│       ├── light-mode.md             The Light tier
│       ├── multi-voter-review.md     Optional review-panel escalation
│       ├── optional-subagents.md     Optional tool-restricted reviewer agents
│       ├── loop-3-teams.md           Optional agent-team modes
│       ├── end-to-end-review.md      F closeout checklist
│       ├── escalation-rules.md       When/how to escalate; deadlock procedure
│       ├── failure-retrospective.md  Turn a class of failure into a durable prevention
│       ├── claude-md-integration.md  CLAUDE.md roles + cross-file consistency
│       ├── check-consistency.sh      three-loop-consistency self-check
│       ├── check-workflow-syntax.sh  Workflow-script syntax gate
│       └── validate-commit-msg.sh    Optional commit-prefix lint hook
├── tests/scenarios/                  Standing pressure-scenario suite — the v1.5 behavioral gate (run before
│                                     merging tier/escalation/termination edits; not shipped in the .skill, not load-bearing)
├── docs/design/, docs/implementation/  Per-task L1/L2 archives (created on demand)
├── README.md                         this file
└── README-cn.md                      Chinese version
```

## Iterating on the workflow

This skill is **load-bearing by its own definition**. Modifying `SKILL.md` or any `references/*.md` triggers the full L1 → L2 → L3 cycle.

One transitional clause: when a load-bearing doc is first introduced (or first retroactively classified as load-bearing), a one-page retroactive design brief plus an independent review with two consecutive clean rounds may substitute for the full cycle. Subsequent modifications must follow the formal procedure.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

The v1.5 human-factors / craft concepts (the rationalization / red-flag table, the anti-summary description thesis, calibrated severity) were adapted from the [superpowers](https://github.com/obra/superpowers) skill collection (Jesse Vincent, MIT).
