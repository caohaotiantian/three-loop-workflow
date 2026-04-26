# three-loop-workflow

A disciplined three-loop workflow for non-trivial software changes, packaged as a Claude skill.

中文版本 → [README-cn.md](./README-cn.md)

## What's in this repo

- **`WORKFLOW-v3.md`** — the canonical specification of the workflow.
- **`three-loop-workflow/`** — a Claude skill that operationalizes the spec. Drop this folder into Claude Code or Claude.ai and Claude will follow it on any non-trivial code change.

The spec is the source of truth. The skill is a derivative artifact tuned for Claude consumption: it splits the spec into a short entry point (`SKILL.md`) plus per-stage references that load only when needed.

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
python -m scripts.package_skill three-loop-workflow
# produces three-loop-workflow.skill — a zip Claude Code recognizes
```

### Claude.ai

Upload the packaged `.skill` file via the Skill management page.

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
├── WORKFLOW-v3.md                    Source specification (canonical)
├── three-loop-workflow/              The skill itself
│   ├── SKILL.md                      Entry point: principles + routing + applicability table
│   └── references/
│       ├── loop-1-design.md          L1 review template + 8 required sections
│       ├── loop-2-implementation.md  L2 Phase breakdown + review template
│       ├── loop-3-development.md     L3 four-corner template + commits + E2E
│       ├── end-to-end-review.md      F closeout checklist
│       ├── escalation-rules.md       When/how to escalate; deadlock procedure
│       └── claude-md-integration.md  CLAUDE.md roles + cross-file consistency
├── README.md                         this file
└── README-cn.md                      Chinese version
```

## Iterating on the workflow

This skill is **load-bearing by its own definition**. Modifying `SKILL.md` or any `references/*.md` triggers the full L1 → L2 → L3 cycle.

One transitional clause: when a load-bearing doc is first introduced (or first retroactively classified as load-bearing — including the first version of `WORKFLOW.md`), a one-page retroactive design brief plus an independent review with two consecutive clean rounds may substitute for the full cycle. Subsequent modifications must follow the formal procedure.
