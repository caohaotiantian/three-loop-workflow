# three-loop-workflow

A disciplined workflow for non-trivial software changes, packaged as a portable Agent Skill (runs on Claude Code, Codex, and opencode).

中文版本 → [README-cn.md](./README-cn.md)

> **v2 is a ground-up rewrite and a breaking change from v1.** If you have v1 installed, read
> [Upgrading from v1](#upgrading-from-v1) before copying anything — you must replace the folder, not
> copy into it. What changed and why: [docs/why-v2.md](./docs/why-v2.md).

## What's in this repo

- **`three-loop-workflow/`** — a Claude skill that operationalizes the workflow. Drop this folder into Claude Code or Claude.ai and Claude will follow it on any non-trivial code change.

The skill files (`SKILL.md`, `references/`, `scripts/`) are the single source of truth — they are what Claude Code loads and executes. A short entry point (`SKILL.md`) routes to per-stage reference files that load only when needed.

## What's new

[**Announcing v2.0.0**](./docs/announcement-v2.0.0.md) — the short version, and how to upgrade.
[**Why we rebuilt it**](./docs/why-v2.md) — the long version, with the measurements.
[**Is three fix rounds the right cap?**](./docs/2026-07-31-round-cap-experiment.md) — pre-registered,
raw data committed, and the answer is that the cap was not the problem.
Release notes and full version history live in [CHANGELOG.md](./CHANGELOG.md).

## What is the three-loop workflow?

Most agentic coding failures share a pattern: rushing into implementation, picking silent defaults, skipping review. This workflow prevents those by making the work pass through three loops — and by making the *depth* of those loops proportionate to what the change can break.

| Loop | What it produces |
|---|---|
| **Plan** | `.agent/<task>/plan.md` — Goal, Non-goals, Decisions, and an **Accept** in two halves: a command with an exit code, and, wherever a person will click, type or call it, the observable outcome someone who has not read the code can go and do |
| **Build** | write → gates → review → triage → fix, repeated until the blocking count is zero |
| **Close** | *(Deep changes)* the coherence questions no single phase asked — plus one depth-independent pass, reading the result as a product, wherever what a change produced is read or run as a whole |

**Depth is chosen first, before anything else is read.** Two questions decide it: *if this is wrong, how much breaks?* and *how hard is it to undo?*

| Depth | When | What runs |
|---|---|---|
| **Direct** | Contained and reversible — typo, comment, formatting, local rename, a patch or minor dependency bump with no advisory behind it. Never a major-version bump, a rename of anything exported, or a doc edit that moves a rule | Make the change, run the gates, done |
| **Standard** | Default for real work — a feature, a behavior fix, a refactor, a perf change | Plan brief → build → gates → **one** fresh-reviewer diff review → fix |
| **Deep** | A breaking change to a published contract; an irreversible effect outside the repository; an edit to a rule in a load-bearing document; or a decision the repository cannot settle whose alternatives commit to different structures | Standard, plus alternatives recorded before choosing, phased build, and a Close pass — **scaled to the trigger that fired**: each trigger names the mechanisms that catch *its* risk and the ones to drop without asking |

Five rules carry most of the weight:

1. **Confirm the reading before you build.** Where the Goal names a reading of the request that could have gone the other way, that sentence and Accept's observable outcome go in front of whoever asked, and you wait. On a Standard change there is no plan reviewer, so it is the cheapest check that it is the *right* change and not a correct build of a wrong one. Where nothing was ambiguous it costs nothing: say what you are about to do and carry on.
2. **Gates before agents.** Run the project's own typecheck/lint/build/test *before* spawning any reviewer. An agent's opinion about code that does not compile is worthless, and the compiler is free.
3. **The author never reviews their own work.** This binds to identity, not to invocation.
4. **Ask about what is likely to be wrong, and triage before you count.** Reviewers are asked, in order, what the change does on inputs it does not expect, what happens when something it calls *fails*, and which facts about code *outside the diff* it assumes — and are asked for everything. Then each finding is checked against the code it cites, in two questions: is it true, and is it this change's problem? One that names a declared Non-goal is rejected by name. Closure is computed from *confirmed* findings, never from the raw report or a reviewer's prose verdict.
5. **Hitting the round cap escalates.** Three fix rounds per phase. The cap never quietly becomes a fourth round and never lowers the bar — and a round that changes the code without changing the confirmed findings escalates immediately rather than spending the rest of the budget.

## When the skill applies

| Change type | Depth |
|---|---|
| New feature, behavior fix, optimization, refactor | Standard |
| Breaking a published contract; an irreversible effect outside the repository — migrating persisted data or config, overwriting stored data, spending money, sending to a third party; changing a rule in a load-bearing document | Deep |
| Typo, comment, formatting, doc reordering, local rename, minor/patch dependency bump | Direct |
| Verifying the project guide — `AGENTS.md` or `CLAUDE.md` — against what the repository now does | graded like anything else — Direct to correct a stale command or count, Deep where it changes a rule the guide lists as load-bearing. Always its own task, never a step inside another |
| Reviewing a change you did not write, before it lands | review only — gates, a fresh reviewer, triage, then the confirmed findings go to the author. Nothing closes, because you cannot fix |
| Questions about how existing code works, exploration with no code change | skill does not apply |

Between Direct and Standard, choose Standard. Between Standard and Deep, the Deep list is a **checklist, not a vibe** — if no item fires, Standard is correct. One risky corner does not upgrade the whole change; run Standard and escalate the corner.

## Installing the skill

The skill is **self-contained** — no external plugin, no companion agents, no hooks. Every subagent and Workflow node runs on the built-in default subagent by default; `phase.js` accepts per-stage model overrides.

### Claude Code

```bash
# Project-level: applies only inside <your-repo>
mkdir -p <your-repo>/.claude/skills
cp -r three-loop-workflow <your-repo>/.claude/skills/

# User-level: applies across all projects
mkdir -p ~/.claude/skills
cp -r three-loop-workflow ~/.claude/skills/

# Confirm it landed at the right depth — if this file is missing, the skill will not activate
test -f ~/.claude/skills/three-loop-workflow/SKILL.md && echo installed
```

The `mkdir -p` matters. If `skills/` does not already exist — the normal state of a repo where Claude
Code has run but no skill was ever installed — `cp -r` copies the folder's *contents* into
`.claude/skills/`, putting `SKILL.md` one level too high. It exits 0 and nothing warns you; the skill
simply never activates.

Or package it as a single distributable `.skill` file:

```bash
# from the repo root (rm first so a stale archive can't keep already-removed files)
rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/
# produces three-loop-workflow.skill — a zip Claude Code recognizes
```

Tagged releases (`v*`) also ship a prebuilt `.skill`, attached to the GitHub release by
`.github/workflows/release.yml` — so you can download it instead of building locally.

### After installing, in each repo you use it on

Add `.agent/` to that repository's `.gitignore`. The skill writes one directory per task there and
assumes it is ignored; nothing else is required.

### Claude.ai

Upload the packaged `.skill` file via the Skill management page.

### Cross-platform install (Claude Code / Codex / opencode)

The skill conforms to the agentskills.io open standard, so one canonical `three-loop-workflow/` folder runs on three runtimes:

| Runtime | Install location |
|---|---|
| **Claude Code** | `.claude/skills/` (project) or `~/.claude/skills/` (user) |
| **Codex** | `.agents/skills/` (or `$HOME/.agents/skills/`) |
| **opencode** | reads both `.claude/skills/` and `.agents/skills/` natively — no separate install |

Copying the folder into `.claude/skills/` and `.agents/skills/` covers all three. The discipline is runtime-agnostic; only the Workflow/subagent orchestration is a Claude-Code acceleration layer. See `three-loop-workflow/references/platforms.md` for what degrades elsewhere and how honest to be about it.

## Upgrading from v1

**Replace the folder; do not merge into it.** v1 and v2 share exactly two filenames — `SKILL.md` and `references/platforms.md`. Copying v2 over an existing v1 install overwrites those two and leaves the **other 18 v1 files** sitting in the directory (`loop-1-design.md`, `l3-phase.js`, `check-consistency.sh`, and the rest). Nothing routes to them, but an agent that greps the skill directory will still find them and read rules this version retired.

```bash
# Claude Code, user-level
rm -rf ~/.claude/skills/three-loop-workflow
cp -r three-loop-workflow ~/.claude/skills/

# or, equivalently
rsync -a --delete three-loop-workflow/ ~/.claude/skills/three-loop-workflow/
```

What you need to know:

- **Your `CLAUDE.md` anchor map still works, unchanged.** The role names are the same; only two of the five
  change what the skill does (see below). If you keep an `AGENTS.md`, v2 reads that too.
- **`docs/design/` and `docs/implementation/` are no longer written.** v2 writes one gitignored directory
  per task — `.agent/<task>/plan.md`, plus whatever else that task needs. Add `.agent/` to your
  `.gitignore`. Existing archives are yours to keep or delete; nothing reads them.
- **The gate scripts are gone.** v1 shipped `check-consistency.sh`, `validate-commit-msg.sh` and
  `check-workflow-syntax.sh`; v2 ships only the last of those, moved to `scripts/`. If your
  `settings.json` wired up `validate-commit-msg.sh` as a commit hook, remove that entry — a hook
  pointing at a missing command fails on every commit.
- **Terminology changed.** L1/L2/L3/F → Plan/Build/Close. Full/Light/None → Deep/Standard/Direct.
  severe/general → blocking/non-blocking. Any project doc quoting the old terms needs updating.

Staying on v1 is supported in the sense that it still exists: `git checkout v1.14.0`, or download the
`.skill` from the v1.14.0 release. It receives no further changes.

## Project setup (one-time per repo)

**There is nothing you have to do.** The skill reads the repo's project guide — `AGENTS.md`, `CLAUDE.md`, or both — and most guides are unstructured prose, which is the normal case it is written for: it takes what it needs, the gate commands, the files the guide treats as contracts, the norms it states. Where something it needs has no home in the guide, it derives it from the repository — gate commands from the build config and CI workflow, contract files from what depends on them — and says in one line what it inferred and from where. A missing role never means the rule it feeds is skipped.

The optional refinement: the skill cites those things by **role** rather than by heading name, so an **anchor map** at the top of the guide, naming sections by role, makes its role citations resolve directly instead of being inferred. Two roles are worth pinning if you write one, because they are the two that change what the skill does:

| Role | Holds | Used by v2 |
|---|---|---|
| `_load-bearing-docs_` | which contract files are protected by the full cycle | **yes** — it decides the Deep grade, and gates deleting one |
| `_common-commands_` | the concrete typecheck / lint / build / test commands | **yes** — Gates run these before any reviewer |
| `_engineering-norms_` | project-level coding standards | named as an example only; no rule branches on it, but `maintenance.md` files promoted norms there |
| `_repo-workflow_` | how tasks proceed in this repo | not referenced |
| `_language-policy_` | language and terminology rules | not referenced |

The other three are part of the anchor-map convention and useful to other tooling and to human readers, but no rule branches on them — `maintenance.md` only files promoted norms under `_engineering-norms_`. And the skill will not restructure your guide in the middle of a change: an anchor map edits a contract file, so it is a Deep change of its own, offered as a separate task after the current one lands.

Example anchor map at the top of a project's guide:

```markdown
<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"
```

The skill never hard-codes a filename. It reads `AGENTS.md`, `CLAUDE.md`, or both — if you keep both, the usual split is shared rules in `AGENTS.md` and runtime-specific ones in `CLAUDE.md`, and it reads both rather than picking one.

## Repository layout

```
.
├── three-loop-workflow/              The skill (the single source of truth)
│   ├── SKILL.md                      Always loaded: depth gate first, then routing
│   ├── references/
│   │   ├── plan.md                   The plan artifact, facts-vs-decisions, spikes, plan review
│   │   ├── build.md                  write → gates → review → triage → fix; diagnosis; flakes
│   │   ├── orchestration.md          Worktrees for concurrent writers; the Build loop as a script
│   │   ├── close.md                  Closeout: orphans, blast radius, migrations, rollback re-read,
│   │   │                             and reading the result as a product
│   │   ├── maintenance.md            Folding a task's journal back into the project guide
│   │   ├── escalation.md             When and how to ask; deadlock reports
│   │   └── platforms.md              Runtimes, and how the skill degrades off Claude Code
│   └── scripts/
│       ├── phase.js                  The Build loop as a deterministic Workflow script
│       └── check-workflow-syntax.sh  Parses a Workflow script (node --check cannot)
├── tests/                            gate-fixtures/ for the syntax gate (deterministic, free), and
│                                     probe.js — an on-demand control-arm instrument for asking
│                                     whether a rule changes what a model does
├── docs/
│   ├── announcement-v2.0.0.md        Release announcement
│   ├── why-v2.md                     The long-form account of the rebuild
│   ├── 2026-07-31-round-cap-*.md     Does a document-shaped Deep change converge in three rounds?
│   ├── measurements/                 Pre-registration and raw artifacts, committed so the figures
│   │                                 can be recomputed rather than taken on trust
│   └── design/, implementation/      Frozen v1 per-task archive — historical, not current behavior
├── README.md                         this file
├── README-cn.md                      Chinese version
├── CHANGELOG.md                      Full version history
└── CHANGELOG-cn.md                   Chinese version history
```

## Iterating on the workflow

This skill is **load-bearing by its own definition**. Editing `SKILL.md` or any `references/*.md` changes a rule in a contract file, which is a **Deep** change under the skill's own depth gate: alternatives recorded before choosing, two independent readers on the plan, and a Close pass. Deep scales to the trigger, and this is the trigger that fires here — so the Close section that carries the weight is reading the result as a product, and phases and migration steps drop without asking.

If you are adding a rule to the discipline — or wondering whether one still earns its tokens — run the probe:

```
Workflow({ scriptPath: "tests/probe.js" })
```

It poses a situation to fresh agents that have never seen the skill, several times, and hands you the answers. Answered correctly unprompted means the rule is redundant with the model's own judgment. Answered wrong means it is load-bearing — the only positive result here. Answered *better* than the rule means the rule is wrong.

It is an instrument, not a gate: nothing asserts it stays green and it is deliberately not in CI. Read the header of `probe.js` before writing a situation. A situation that names the rule measures reading comprehension, and that is how both of this project's earlier behavioural suites died — the second of them, an eleven-fixture two-arm suite costing 23 agents a run, was deleted on 2026-08-11 after returning one bit.

The probe runs a control arm only, and that costs something worth naming: it cannot detect the skill making a capable model *worse* — a rule that pushes it away from a correct default. That was what the deleted suite's guards were for, and nothing replaces them. To ask that question you run both arms by hand and compare.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

The "excuses worth recognizing" table in `references/escalation.md` descends from the rationalization / red-flag table in the [superpowers](https://github.com/obra/superpowers) skill collection (Jesse Vincent, MIT), as does the anti-summary treatment of the always-loaded `description`.
