# Multi-agent orchestration — evidence record (2026-09-17)

Record of what evidence the v2.7.0 delegation guidance in
`three-loop-workflow/references/orchestration.md` rests on. The shipped skill carries no statistics, so
every number and source lives here. `orchestration.md` cites two of them by title and date and MAST by
title and year, and quotes one finding beside a title; it carries no figure from this file.

## 1. Sources

| # | Title | Publisher | Date | URL | What it is | Grade |
|---|---|---|---|---|---|---|
| 1 | Multi-agent research system | Anthropic | 2025-06-13 | anthropic.com/engineering/multi-agent-research-system | Orchestrator-worker Research system; Anthropic's only measured source | measured |
| 2 | Building multi-agent systems: when and how to use them | Anthropic (claude.com) | 2026-01-23 | claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them | Decision guide on when multi-agent is warranted | vendor advice |
| 3 | Building a C compiler | Anthropic | 2026-02-05 | anthropic.com/engineering/building-c-compiler | 16 parallel Claudes on a 100k-line compiler: 2 weeks, 2B input tokens, ~$20k | case study |
| 4 | Effective context engineering for AI agents | Anthropic | 2025-09-29 | anthropic.com/engineering/effective-context-engineering-for-ai-agents | Context rot, attention budget, compaction | vendor advice |
| 5 | Building agents with the Claude Agent SDK | Anthropic (claude.com) | 2025-09-29 | claude.com/blog/building-agents-with-the-claude-agent-sdk | Gather/act/verify loop | vendor advice |
| 6 | Agents | Claude Code docs | current | code.claude.com/docs/en/agents | Comparison of delegation surfaces | vendor advice |
| 7 | Subagents | Claude Code docs | current | code.claude.com/docs/en/sub-agents | Isolation, concurrency caps, SendMessage | vendor advice |
| 8 | Agent teams | Claude Code docs | v2.1.178+ | code.claude.com/docs/en/agent-teams | Lead/teammate model, documented limits | vendor advice |
| 9 | Workflows | Claude Code docs | current | code.claude.com/docs/en/workflows | Workflow tool, `agent()`/`pipeline()`/`parallel()` | vendor advice |
| 10 | Worktrees | Claude Code docs | current | code.claude.com/docs/en/worktrees | `EnterWorktree`/`ExitWorktree` | vendor advice |
| 11 | Costs | Claude Code docs | current | code.claude.com/docs/en/costs | Agent-team token cost guidance | vendor advice |
| 12 | MAST (failure taxonomy) | Cemri et al. | v3 Oct 2025, NeurIPS | arxiv.org/abs/2503.13657 | 14 failure modes over 1600+ traces and 7 frameworks | measured |
| 13 | AgenticFlict | Ogenrwot & Businge, AIware '26 | Jul 2026 | arxiv.org/abs/2604.03551 | 142K+ agent PRs over 59K+ repos, merge-conflict rate | measured |
| 14 | Don't Build Multi-Agents | Cognition (Yan) | 2025-06-12 | cognition.com/blog/dont-build-multi-agents | Best-known argument against multi-agent | opinion |
| — | Practical Guide to Building Agents | OpenAI | — | — | Not fetched: PDF returned undecodable binary | not fetched |
| — | New tools for building agents | OpenAI | — | — | Not fetched: HTTP 403 | not fetched |

Google ADK/A2A was not attempted; nothing here cites the two OpenAI sources. The MAST 42/37/21 split
circulating in secondary blogs is **not** in the MAST abstract as read (12) and must not be cited.

## 2. Recommendations considered

Each is marked against `orchestration.md` as it now stands. "Adopted" means the file states it; the
verification was reading the file, not the diff.

1. Decompose by shared context, not job title — a feature and its tests belong to one agent. *(2;
   advice)* — **not adopted**: out of scope for this pass; the file partitions writers by file ownership.
2. Multi-agent suits research/review, not implementation; teams should start on PR review, not code.
   *(2, 8; advice)* — **adopted in part**: the file's opening says delegation is no part of an ordinary
   change and that a single Standard change is cheaper by hand. Agent teams are excluded (§5).
3. Token cost is the main lever: token usage explained 80% of performance variance on BrowseComp.
   The multipliers on top of it disagree — §4. *(1; measured for the 80%. 2, 11 for the rest)* —
   **not adopted**: barred by the no-figures rule; the cost argument ships without a number.
4. A model upgrade beat doubling the token budget on the older model. *(1; measured)* — **adopted**:
   *Spawn, or do it yourself* cites the finding, with the models and the multiplier left here.
5. Better single-agent prompting is the control arm every orchestration proposal owes. *(2; advice)* —
   **adopted**: same section — one agent with a better prompt or a better model, run first.
6. Early-victory verification failures need concrete acceptance criteria, not "make sure it works" —
   "run the full test suite and report all failures". *(5; advice, matching MAST's verification
   category, 12)* — **not adopted**: already owned elsewhere — Accept (`SKILL.md` §2) and the gates.
7. Verification tiers cheapest-first: rules-based, then visual/output, then a single LLM-judge call
   scoring against a rubric — the single call is the measured part, and beat multiple calls. *(5)* —
   **not adopted**: the skill's gates-then-review order is already cheapest-first.
8. Cross-check independent agents adversarially rather than trust one. *(9; shipped behavior)* —
   **adopted in a narrower form**: not adversarial review, but *Verify the claim, not the report* (check
   a writer's claim against the repository) and the script's gates step reporting its own head beside
   the writer's.
9. Scale agent count to the question and say so in the brief: ~1 agent/3–10 tool calls for
   fact-finding, 2–4 for comparisons, 10+ for complex research; teams start at 3–5. *(1, 8)* — **not
   adopted**: every part of it is a figure, and the teams half is excluded with agent teams (§5).
10. Every delegation brief states objective, output format, tool/source guidance, task boundaries.
    *(1; maps to MAST's specification category, 12)* — **adopted**, in the file's words: objective,
    output shape, what to read, boundaries.
11. Partition file ownership before spawning writers — teams do not isolate teammates in worktrees.
    *(8, 13; 27.67% conflict rate measured)* — **adopted**: *Two writers: divide, then land* requires the
    partition in the plan before anyone is spawned. The rate stays here.
12. Externalize state before context runs out — plans to external memory before ~200k tokens, hand-off
    to fresh agents. The C-compiler run coordinated 2,000 sessions through a lock directory and git,
    not context. *(4, 5, 3)* — **not adopted**: the durable plan is `SKILL.md` §2's rule already, and the
    threshold is a figure. *The plan does not travel* is about gitignore, not context.
13. Tests are the coordination substrate for autonomous writers, with an external oracle. *(3; case
    study, n=1)* — **not adopted**: out of scope for this pass, on n=1.
14. Statefulness compounds errors; resume agents rather than restart them. *(1)* — **not adopted**:
    out of scope for this pass; nothing in the file resumes an agent.
15. Human checkpoints must be structural — Workflow runs take no mid-run input; sign-off means running
    each stage as its own workflow. *(9)* — **not adopted**: out of scope for this pass; the file maps
    one phase to one call and says nothing about sign-off between them.

## 3. Failure modes with evidence

- **MAST** (12): 14 modes in three categories — spec design, inter-agent misalignment, verification
  failure — over 1600+ traces and 7 frameworks, 150 of them human-annotated at κ=0.88. Its own
  conclusion: these need more than prompt or topology tweaks. Strongest-graded evidence here.
- **Anthropic's observed list** (1): 50+ subagents for a simple query, endless search for nonexistent
  sources, duplicated work, SEO farms over primary sources, sequential calls where parallel was possible.
- **Merge conflicts** (13): a measured 27.67% rate over 142K+ agent PRs, varying by agent.
- **Agent-teams limits** (8): teammates stop early and need nudging; the lead can declare completion
  early too; task status lags; `/resume` does not restore in-process teammates; no nested teams.
- **Cognition's Flappy Bird story** (14): mutually incompatible subagent output — illustrative, not
  measured, by the author's own framing.

## 4. Where sources disagree

- **Cognition vs. Anthropic.** Cognition (14): don't build multi-agents, keep one thread. Anthropic (1,
  2): use them narrowly, and partly concedes Cognition's ground on coding/shared-context work. Cognition
  is opinion; Anthropic has measurement only on the research side.
- **Anthropic vs. itself on cost.** Three figures, three workloads: ~15× a chat turn (1, Research system),
  3–10× vs. single-agent (2, decision guide), ~7× for teammates in plan mode (11, cost docs). None is "the" number.
- **Verification depth.** The Agent SDK post (5) prefers cheap rules-based checks; the workflows docs (9)
  sell adversarial cross-checking. Both Anthropic; the first is cheaper, the second pays only absent a
  deterministic oracle.
- **Team autonomy.** The C-compiler post (3) celebrates near-unattended teams; the agent-teams docs (8)
  warn unattended time increases wasted effort. The reconciler is the compiler project's own test suite.

## 5. Deliberately not carried into the skill

- **Any number** — the shipped skill's standing rule; every figure stays in this file, referenced by
  title and date only.
- **Agent teams as a recommended pattern** — experimental, off by default (8).
- **Token or dollar budgets** — the cost figures disagree by workload (§4), so none is stable enough to prescribe.
- **The 42/37/21 MAST split** — not in the abstract as read (12); excluded everywhere.

## 6. Claude Code names current at time of writing

A snapshot taken 2026-09-17; these names move, so re-read the docs before relying on the list.

**Agent tool** (`subagent_type`, `model`, `isolation: "worktree"`, `run_in_background`,
`subagent_type: "fork"`, `/subtask`); **SendMessage** (resumes a named subagent with history and cache
intact); **Workflow tool** (`.claude/workflows/*.js`, `export const meta`, `agent()`/`pipeline()`/
`parallel()`/`phase()`/`log()`, `args`, `schema`, resume-by-replay, caps of 16 concurrent / 4,096 per
call / 1,000 agents per run; `Date.now()`/`Math.random()`/argless `new Date()` deliberately throw);
`/workflow-authoring`; **EnterWorktree**/**ExitWorktree**, `claude --worktree|-w`, `.worktreeinclude`,
`worktree.baseRef`; **agent teams** (experimental, off by default,
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`); **agent view** (`claude agents`), `/tasks`, `/workflows`; hooks
`SubagentStart`, `SubagentStop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `WorktreeCreate`,
`WorktreeRemove`; `/batch`; `ultracode`; `workflowSizeGuideline`.

**Retired or wrong:** "Task tool" for delegation (it's **Agent**; `Task*` tools are the shared task
list); `TeamCreate`/`TeamDelete` (removed); `team_name` (deprecated); `teammateDefaultModel`; "`/agents`
as a panel".
