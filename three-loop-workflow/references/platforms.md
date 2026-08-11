# Platforms

## Where the skill goes

| Runtime | Discovery path |
|---|---|
| Claude Code | `~/.claude/skills/three-loop-workflow/` (user) or `.claude/skills/` (project) |
| Codex | `.agents/skills/three-loop-workflow/` |
| opencode | either of the above |

One canonical folder; copy or symlink it. The layout conforms to the open Agent Skills structure, so nothing runtime-specific lives in `SKILL.md`.

Sources, checked 2026-07-30: Codex scans `.agents/skills` from the working directory up to the repository root, plus `$HOME/.agents/skills` (OpenAI Codex "Build skills"). opencode reads six locations including `.claude/skills/` and `.agents/skills/` at both project and home scope (opencode.ai/docs/skills). The spec requires `name` and `description` and allows `license`, `compatibility` and `metadata` (agentskills.io/specification) — `name` must equal the directory name, which is why the folder cannot be renamed on its own.

## The project guide

This skill never names a fixed instruction file. It reads **`AGENTS.md`, `CLAUDE.md`, or both** — whichever your repo has — and resolves sections through the role anchor map inside them, so it works unchanged on a repo that has only one.

`AGENTS.md` is the cross-tool standard — released by OpenAI in August 2025 and contributed to the Linux Foundation's Agentic AI Foundation at its formation, alongside MCP and goose; `CLAUDE.md` is Claude Code's. If you keep both, the common pattern is shared rules in `AGENTS.md` and runtime-specific ones in `CLAUDE.md`, wired together with an `@AGENTS.md` import or a symlink. Read both rather than picking one.

## What degrades off Claude Code

| Mechanism | Claude Code | Elsewhere |
|---|---|---|
| Fresh reviewer | Spawned subagent — genuinely isolated | Clear context and re-read the diff, or review in a second session |
| Parallel reviewers (Deep) | `parallel()` in `scripts/phase.js` | Run them one after another; independence matters, simultaneity does not |
| Round counting | `scripts/phase.js` | Count by hand in the plan file |
| Asking the user | `AskUserQuestion` | `STOP: QUESTION` in normal output, then stop spawning |
| A persistent store outside the repo, for `maintenance.md` to verify | Claude Code keeps one per project | Codex and opencode keep none — the project guide is the only durable context, so verify that and skip the rest |

**Be honest about isolation.** A runtime with no subagents cannot enforce author-≠-reviewer; clearing context is a weaker approximation, because the same session's habits persist. Say so in the change rather than claiming a review happened that did not.
