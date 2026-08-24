# Platforms

## Where the skill goes

| Runtime | Discovery path |
|---|---|
| Claude Code | `~/.claude/skills/three-loop-workflow/` (user) or `.claude/skills/` (project) |
| Codex | `.agents/skills/three-loop-workflow/` |
| opencode | either of the above |

One canonical folder; copy or symlink it. The layout conforms to the open Agent Skills structure. `SKILL.md` names Claude Code in exactly one place — the `compatibility` field — and every rule in it is runtime-neutral, phrased as "where the runtime can run it". What actually needs a runtime is the table below.

Sources, checked 2026-07-30: OpenAI Codex "Build skills"; opencode.ai/docs/skills; agentskills.io/specification, which requires `name` to equal the directory name — which is why the folder cannot be renamed on its own.

## The project guide

This skill never names a fixed instruction file. It reads **`AGENTS.md`, `CLAUDE.md`, or both** — whichever your repo has — and resolves sections through the role anchor map inside them, so it works unchanged on a repo that has only one.

`AGENTS.md` is the cross-tool standard; `CLAUDE.md` is Claude Code's. If you keep both, the common pattern is shared rules in `AGENTS.md` and runtime-specific ones in `CLAUDE.md`, wired together with an `@AGENTS.md` import or a symlink. Read both rather than picking one.

## What degrades off Claude Code

| Mechanism | Claude Code | Elsewhere |
|---|---|---|
| Fresh reviewer | Spawned subagent — genuinely isolated | Clear context and re-read the diff, or review in a second session |
| Parallel reviewers (Deep) | `parallel()` in `scripts/phase.js` | Run them one after another; independence matters, simultaneity does not |
| Round counting | `scripts/phase.js` | Count by hand in the plan file |
| Asking the user | `AskUserQuestion` | `STOP: QUESTION` in normal output, then stop spawning |
| A persistent store outside the repo, for `maintenance.md` to verify | One per project, under `~/.claude/projects/` | Runtime- and version-dependent — look before concluding there is none; where there is none, the project guide is the only durable context |
| A security-specific review pass | The built-in `security-review` skill: fresh sub-tasks to hunt, then a parallel pass that drops false positives (`build.md`, Purpose-built reviewers) | Nothing equivalent — the security line in the reviewer prompt is all there is. Say in the change that no security-specific pass ran |
| A reviewer sharing no context at all | An off-machine review of the branch or PR, where the runtime offers one, so author-≠-reviewer holds by construction rather than by discipline | Clear context and re-read the diff, and say that is what happened |

**Look for the store rather than assuming.** Whether a runtime keeps notes between sessions changes release to release, so this table names no runtime as having none: check the runtime's own state directory before deciding the target does not exist. An earlier version of this row asserted two runtimes kept none, and one of them did.

**Be honest about isolation.** A runtime with no subagents cannot enforce author-≠-reviewer; clearing context is a weaker approximation, because the same session's habits persist. Say so in the change rather than claiming a review happened that did not.

## Check the tool, do not assume it

Two failures to avoid, both observed. A capability named in a runtime's documentation may be **absent from the session you are in**: the tool set a subagent gets is not the tool set the main session gets, and a session can be configured to allow only named workflows. And a capability whose name suggests a rollback may not be one — a conversation rewind that does not touch files edited by hand is not what a plan's Rollback field promises.

So: probe the session for the tool before you plan around it, and where it is missing, run the manual path in this table and say that is what you ran.
