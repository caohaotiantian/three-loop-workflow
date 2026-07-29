# Platforms and enforcement

## Where the skill goes

| Runtime | Discovery path |
|---|---|
| Claude Code | `~/.claude/skills/three-loop-workflow/` (user) or `.claude/skills/` (project) |
| Codex | `.agents/skills/three-loop-workflow/` |
| opencode | either of the above |

One canonical folder; copy or symlink it. The layout conforms to the open Agent Skills structure, so nothing runtime-specific lives in `SKILL.md`.

## The project guide

This skill never names a fixed instruction file. It reads **`AGENTS.md`, `CLAUDE.md`, or both** — whichever your repo has — and resolves sections through the role anchor map inside them, so it works unchanged on a repo that has only one.

`AGENTS.md` is the cross-tool standard (originated at OpenAI, now under the Linux Foundation's Agentic AI Foundation); `CLAUDE.md` is Claude Code's. If you keep both, the common pattern is shared rules in `AGENTS.md` and runtime-specific ones in `CLAUDE.md`, wired together with an `@AGENTS.md` import or a symlink. The hook unions the patterns from both rather than picking one.

## What degrades off Claude Code

| Mechanism | Claude Code | Elsewhere |
|---|---|---|
| Fresh reviewer | Spawned subagent — genuinely isolated | Clear context and re-read the diff, or review in a second session |
| Parallel reviewers (Deep) | `parallel()` in `scripts/phase.js` | Run them one after another; independence matters, simultaneity does not |
| Round counting | `scripts/phase.js` | Count by hand in the plan file |
| Asking the user | `AskUserQuestion` | `STOP: QUESTION` in normal output, then stop spawning |
| Gate enforcement | Hooks (below) | Prose only — you are trusting the agent |

**Be honest about isolation.** A runtime with no subagents cannot enforce author-≠-reviewer; clearing context is a weaker approximation, because the same session's habits persist. Say so in the change rather than claiming a review happened that did not.

## Hooks — turning requests into guarantees

An instruction in a skill is a request. A hook is enforcement. Where a rule must hold every time, make it a hook.

The skill runs fine without any of these. Install them when you want the rule to be non-negotiable.

### `require-plan.sh` — no contract edit without a plan

Blocks `Edit`/`Write` on any file matching a pattern under the project guide's _load-bearing-docs_ section when `.agent/plan.md` does not exist.

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Edit|Write|NotebookEdit",
      "hooks": [{
        "type": "command",
        "command": "$CLAUDE_PROJECT_DIR/.claude/skills/three-loop-workflow/hooks/require-plan.sh"
      }]
    }]
  }
}
```

It resolves the project guide (`AGENTS.md`, `CLAUDE.md`, or both — unioning the patterns when both exist) and reads the role → heading indirection from it, so it follows your project's own headings. With neither file, or no such section, it protects nothing and allows everything — it fails open by design, because a hook that blocks edits on a misconfigured repo is worse than the rule it enforces.

Override the resolution with `THREE_LOOP_GUIDE=path/to/file`.

Override for a deliberate exception: `THREE_LOOP_PLAN=/path/to/plan`.

### `validate-commit-msg.sh` — commit grammar *(carried from v1, not yet adapted)*

Blocks a `git commit` whose scope begins with `phase` but does not match v1's `(phaseN)` / `(phaseN-roundR)` form. Tested: `fix(phase0):` and `fix(phaseX):` are blocked; everything else passes.

**Do not install this yet.** Two known problems:

- It enforces v1's round-numbered vocabulary. v2 does not mandate a format at all — it derives the convention from the repository's own history (`build.md`, "Commits"), so this hook encodes a rule v2 no longer states, and never fires on a scope that does not begin with `phase`.
- It contains **no AI-attribution check**, despite v1 documenting one. `feat: generated with Claude Code` passes, exit 0.

Delete it, or rewrite it to check only what is project-independent — an AI-attribution trailer, a push to a protected branch. Commit *grammar* is the wrong thing to hard-code now that the convention is derived per repository. It is listed here because it ships in the directory, not because it works.

## What not to enforce with hooks

Resist wiring up everything. A hook that fires constantly gets disabled, and a disabled hook enforces nothing.

Good hook candidates share a shape: **binary, cheap to evaluate, and expensive to get wrong** — a contract file edited without a plan, a commit message with the wrong grammar, a push to a protected branch.

Bad candidates: anything requiring judgment about the code. "Is this change surgical", "is this abstraction premature", "is this decision well-reasoned" — those need a reader, and a grep pretending to answer them produces a green light that means nothing.

That failure has a track record here. The v1 gate asserted it was "the authoritative acceptance check" while being ~100 lines of `grep -qF` presence checks; the skill's central termination rule could be replaced with its exact opposite and the gate still returned `OK`, exit 0. Presence of a word is not presence of a rule. If you cannot write a check that fails when the behavior is wrong, do not write the check — write a scenario instead (`tests/README.md`).
