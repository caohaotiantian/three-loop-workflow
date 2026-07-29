# three-loop-workflow

A disciplined workflow for non-trivial software changes, packaged as a portable Agent Skill (runs on Claude Code, Codex, and opencode).

中文版本 → [README-cn.md](./README-cn.md)

> **v2.0.0 is a ground-up rewrite and a breaking change.** If you have v1 installed, read
> [Upgrading from v1](#upgrading-from-v1) before copying anything — you must replace the folder, not
> copy into it. What changed and why: [docs/why-v2.md](./docs/why-v2.md).

## What's in this repo

- **`three-loop-workflow/`** — a Claude skill that operationalizes the workflow. Drop this folder into Claude Code or Claude.ai and Claude will follow it on any non-trivial code change.

The skill files (`SKILL.md`, `references/`, `scripts/`) are the single source of truth — they are what Claude Code loads and executes. A short entry point (`SKILL.md`) routes to per-stage reference files that load only when needed.

## What's new

[**Announcing v2.0.0**](./docs/announcement-v2.0.0.md) — the short version, and how to upgrade.
[**Why we rebuilt it**](./docs/why-v2.md) — the long version, with the measurements.
Release notes and full version history live in [CHANGELOG.md](./CHANGELOG.md).

## What is the three-loop workflow?

Most agentic coding failures share a pattern: rushing into implementation, picking silent defaults, skipping review. This workflow prevents those by making the work pass through three loops — and by making the *depth* of those loops proportionate to what the change can break.

| Loop | What it produces |
|---|---|
| **Plan** | `.agent/<task>/plan.md` — Goal, Non-goals, Decisions, and an **Accept** command with an exit code |
| **Build** | write → gates → review → fix, repeated until the blocking count is zero |
| **Close** | *(Deep changes only)* the coherence questions no single phase asked |

**Depth is chosen first, before anything else is read.** Two questions decide it: *if this is wrong, how much breaks?* and *how hard is it to undo?*

| Depth | When | What runs |
|---|---|---|
| **Direct** | Contained and reversible — typo, comment, formatting, local rename, patch/minor dependency bump | Make the change, run the gates, done |
| **Standard** | Default for real work — a feature, a behavior fix, a refactor, a perf change | Plan brief → build → gates → **one** fresh-reviewer diff review → fix |
| **Deep** | A breaking change to a published contract; a data or config migration; an edit to a rule in a load-bearing document; or a decision the repository cannot settle | Standard, plus alternatives recorded before choosing, phased build, and a Close pass |

Four rules carry most of the weight:

1. **Gates before agents.** Run the project's own typecheck/lint/build/test *before* spawning any reviewer. An agent's opinion about code that does not compile is worthless, and the compiler is free.
2. **The author never reviews their own work.** This binds to identity, not to invocation.
3. **Triage before you count.** Ask reviewers for everything, then check each finding against the code and reject the ones that misread it. Closure is computed from *confirmed* findings, never from the raw report or a reviewer's prose verdict.
4. **Hitting the round cap escalates.** Three fix rounds per phase. The cap never quietly becomes a fourth round and never lowers the bar.

## When the skill applies

| Change type | Depth |
|---|---|
| New feature, behavior fix, optimization, refactor | Standard |
| Breaking a published contract; migrating data or config; changing a rule in a load-bearing document | Deep |
| Typo, comment, formatting, doc reordering, local rename, minor/patch dependency bump | Direct |
| Questions / exploration with no code change | skill does not apply |

Between Direct and Standard, choose Standard. Between Standard and Deep, the Deep list is a **checklist, not a vibe** — if no item fires, Standard is correct. One risky corner does not upgrade the whole change; run Standard and escalate the corner.

## Installing the skill

The skill is **self-contained** — no external plugin, no companion agents, no hooks. Every subagent and Workflow node runs on the built-in default subagent.

### Claude Code

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

The skill references project-specific values via **roles**, not literal heading names. Each project pins those in its project guide — `AGENTS.md`, `CLAUDE.md`, or both. Two of them drive rules:

| Role | Holds | Used by v2 |
|---|---|---|
| `_load-bearing-docs_` | which contract files are protected by the full cycle | **yes** — it decides the Deep tier, and gates deleting one |
| `_common-commands_` | the concrete typecheck / lint / build / test commands | **yes** — Gates run these before any reviewer |
| `_engineering-norms_` | project-level coding standards | named as an example only; no rule reads it |
| `_repo-workflow_` | how tasks proceed in this repo | not referenced |
| `_language-policy_` | language and terminology rules | not referenced |

Populate all five anyway — they are the anchor-map convention, other tooling and human readers use them, and an agent reading your guide will use them as context. But only the first two change what this skill does, so those are the ones to get right.

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
│   │   ├── build.md                  write → gates → review → triage → fix; diagnosis; flakes; worktrees
│   │   ├── close.md                  Deep-tier closeout: orphans, blast radius, migrations
│   │   ├── escalation.md             When and how to ask; deadlock reports
│   │   └── platforms.md              Runtimes, and how the skill degrades off Claude Code
│   └── scripts/
│       ├── phase.js                  The Build loop as a deterministic Workflow script
│       └── check-workflow-syntax.sh  Parses a Workflow script (node --check cannot)
├── tests/                            Two-arm behavioral suite: every fixture runs with the skill
│                                     loaded AND withheld; a fixture both arms pass is INVALID
├── docs/
│   ├── announcement-v2.0.0.md        Release announcement
│   ├── why-v2.md                     The long-form account of the rebuild
│   └── design/, implementation/      Frozen v1 per-task archive — historical, not current behavior
├── README.md                         this file
├── README-cn.md                      Chinese version
├── CHANGELOG.md                      Full version history
└── CHANGELOG-cn.md                   Chinese version history
```

## Iterating on the workflow

This skill is **load-bearing by its own definition**. Editing `SKILL.md` or any `references/*.md` changes a rule in a contract file, which is a **Deep** change under the skill's own depth gate: alternatives recorded before choosing, two independent reviewers, and a Close pass.

If you change the discipline itself, run the two-arm suite:

```
Workflow({ scriptPath: "tests/run-scenarios.js" })
```

A fixture that both arms answer correctly is reported INVALID rather than green — it proves the rule is not carrying weight. Read `tests/README.md` before writing one; most of the ways to write a scenario produce a test of reading comprehension instead of a test of the skill.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

The "excuses worth recognizing" table in `references/escalation.md` descends from the rationalization / red-flag table in the [superpowers](https://github.com/obra/superpowers) skill collection (Jesse Vincent, MIT), as does the anti-summary treatment of the always-loaded `description`.
