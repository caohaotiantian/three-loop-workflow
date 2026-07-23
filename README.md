# three-loop-workflow

A disciplined three-loop workflow for non-trivial software changes, packaged as a portable Agent Skill (runs on Claude Code, Codex, and opencode).

中文版本 → [README-cn.md](./README-cn.md)

## What's in this repo

- **`three-loop-workflow/`** — a Claude skill that operationalizes the workflow. Drop this folder into Claude Code or Claude.ai and Claude will follow it on any non-trivial code change.

The skill files (`SKILL.md` + `references/`) are the single source of truth — they are what Claude Code loads and executes. A short entry point (`SKILL.md`) routes to per-stage reference files that load only when needed.

## What's new

Release notes and the full version history live in **[CHANGELOG.md](./CHANGELOG.md)**.

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
├── README-cn.md                      Chinese version
├── CHANGELOG.md                      Full version history
└── CHANGELOG-cn.md                   Chinese version history
```

## Iterating on the workflow

This skill is **load-bearing by its own definition**. Modifying `SKILL.md` or any `references/*.md` triggers the full L1 → L2 → L3 cycle.

One transitional clause: when a load-bearing doc is first introduced (or first retroactively classified as load-bearing), a one-page retroactive design brief plus an independent review with two consecutive clean rounds may substitute for the full cycle. Subsequent modifications must follow the formal procedure.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

The v1.5 human-factors / craft concepts (the rationalization / red-flag table, the anti-summary description thesis, calibrated severity) were adapted from the [superpowers](https://github.com/obra/superpowers) skill collection (Jesse Vincent, MIT).
