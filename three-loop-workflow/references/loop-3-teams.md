# Agent-team modes (optional, experimental)

Agent teams (a lead + peer teammates with a shared task list and inter-agent messaging) are
**experimental** and disabled by default — enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
They cost far more tokens than subagents and are **strictly worse** for the skill's dominant path.
This file lists the **three narrow** places a team genuinely helps — each with a sequential-subagent
fallback of identical safety — plus the guardrails that keep role isolation intact.

## When NOT to use a team

> The **default path stays on subagents / the Workflow**. The sequential L3 dev → review →
> accept → fix pipeline and all single-author L1 / L2 drafting must **not** be run as a team:
> the work is sequential and often same-file, so a team only adds token cost and contention with
> no parallelism to exploit. Use a team only for one of the three modes below.

## Non-negotiable guardrail (applies even if you never use a team)

Role isolation binds to **identity** (see SKILL.md and `references/loop-3-development.md`): a
teammate that authored or self-claimed the dev task for an artifact may **never** claim its
review/accept off the shared task list — teammate **self-claim is documented behavior**, so without
this rule a teammate could silently review its own work. **Lead plan-approval is autonomous
coordination, not the fresh-reviewer gate**, and never substitutes for it.

A teammate loads CLAUDE.md, MCP, and skills like a normal session (only a teammate spawned from a
*subagent definition* drops that definition's `skills`/`mcpServers` frontmatter). But a loaded skill
is **not** an injected one, and the lead's history never carries over — so a reviewer teammate's spawn
prompt **must inline** the `ReviewVerdict` schema (`references/schemas.md`) and the four principles,
exactly as the loop-3 templates already do for default subagents.

## The three modes

1. **Competing-hypothesis L1 root-cause debate** (for a behavior bug). Spawn N teammates, each
   investigating a different hypothesis and challenging the others. The **main agent — not a
   teammate** — distills the surviving hypothesis into the 8-section design doc, which still
   faces the normal fresh-subagent L1 review. Fallback: sequential subagents each testing one
   hypothesis, main agent synthesizing.
2. **Parallel multi-lens F review.** At closeout, teammates review the full change along different
   lenses (correctness, security, consolidation fidelity); the lead synthesizes. Fallback: the single
   F consolidation review in `references/end-to-end-review.md`, optionally escalated to the review
   panel (`references/multi-voter-review.md`).
3. **Cross-layer L3 with disjoint file ownership.** For a change spanning frontend / backend / tests,
   teammates each own a **disjoint** file set declared in the impl doc. **Forbidden without a declared
   partition** — two teammates editing one file overwrite each other. Each layer's diff still gets a
   fresh non-author review. Fallback: sequential Phases, one per layer.

## Optional quality-gate hook

A `TaskCompleted` hook can re-run `<TEST-CMD>` + the Phase `<ACCEPT-CMD>` and exit 2 to block a
teammate closing a Phase on author confidence (Goal-Driven Execution). Ship it as a per-project
example only — resolve commands via the CLAUDE.md `_common-commands_` role; never bake project
constants into the skill.

## Explicitly excluded: whole-task auto-advance

Do **not** build a team (or workflow) that auto-advances understand → L1 → L2 → L3 → F without
returning to the user on escalation triggers. Teammates run autonomously with **no in-team
AskUserQuestion gate**, so an auto-advancing team would bypass the human decision gate the escalation
rules require. A team mode must **halt and return to the lead** on every escalation trigger.
