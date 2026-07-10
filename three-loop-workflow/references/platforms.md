# Cross-runtime portability (Claude Code / Codex / opencode)

This skill conforms to the agentskills.io open standard — a `SKILL.md` (`name` + `description`
frontmatter) plus a `references/` tree loaded by progressive disclosure — so it runs on **Claude
Code**, **OpenAI Codex**, and **opencode** off a single canonical folder. The **discipline is
runtime-agnostic**: L1 → L2 → L3 → F, the four core principles, the round caps, two-generation
termination, and fresh-eyes review are plain prose that any conformant runtime executes. Only the
**orchestration automation** (the Workflow scripts and skill-spawned subagents) is Claude-specific —
it is an acceleration layer, not a requirement.

Portability commitment (`cross_runtime`): the discipline runs on every listed runtime; Workflow /
subagent orchestration is a Claude-Code acceleration layer, not a requirement.

## Install / discovery

The canonical source is this repo's `three-loop-workflow/` folder. Copy it into the runtime's skills
directory; each runtime discovers it by name + description at startup and loads the body on demand.

| Runtime | Install location | Discovery |
|---|---|---|
| **Claude Code** | copy `three-loop-workflow/` into `.claude/skills/` (project) or `~/.claude/skills/` (user) | reads `.claude/skills/` |
| **Codex** | copy `three-loop-workflow/` into `.agents/skills/` (or `$HOME/.agents/skills/`) | reads `.agents/skills/` |
| **opencode** | no separate install — it reads both `.claude/skills/` and `.agents/skills/` natively | reads both `.claude/skills/` and `.agents/skills/` |

Because opencode reads both paths, Claude Code reads `.claude/skills/`, and Codex reads
`.agents/skills/`, **copying the folder into `.claude/skills/` and `.agents/skills/` covers all
three** runtimes with no sync tooling.

## Capability matrix — Claude-Code mechanism → manual-mode realization

On Claude Code the skill uses the mechanisms in the left column. On Codex and opencode the
acceleration layer is absent; each maps to the manual-mode realization on the right, and **the
discipline is unchanged** — the manual path is authoritative regardless of mode
(`references/loop-3-development.md:3-8`).

| Claude-Code mechanism | Manual-mode realization (Codex / opencode) |
|---|---|
| Workflow scripts `l3-phase.js` / `review-panel.js` | the manual four-corner template in `references/loop-3-development.md` (dev → review → accept → fix); the acceleration layer is absent, the discipline is unchanged |
| Subagent spawn (fresh-reviewer isolation) | the isolation ladder below |
| AskUserQuestion | the `STOP:QUESTION` path — a plain-text `STOP: QUESTION` block (`references/escalation-rules.md` "Degraded mode") that still carries options + recommendation + rationale and suspends further subagent spawns until the reply arrives |
| Tasks round-cap tracking | track the round counter inline in the impl doc / conversation |
| `.claude/agents` tool-restricted reviewers | a fresh default subagent, or a fresh / cleared session (`references/optional-subagents.md` mandatory fallback) |
| StructuredOutput `schema` | a prose-structured verdict matching the `references/schemas.md` fields |
| `/run` + `/verify` E2E drivers | the manual smoke test — walk the entry-point flow by hand (`references/loop-3-development.md`) |

## Fresh-reviewer-isolation realization ladder

Author ≠ reviewer is the load-bearing invariant (`SKILL.md` "Role isolation rule"). How it is realized
depends on what the runtime offers; use the strongest mechanism available and **disclose** the weakest
case honestly — do not imply parity where there is none. Best-to-weakest:

1. **Spawned subagent** (Claude Code; opencode's agent system if the model delegates) — full structural
   isolation; the author identity never reviews its own artifact.
2. **Fresh / cleared reviewer context** — where no skill-callable subagent exists, run the review in a
   new or cleared session seeded with **only** the artifact + the review prompt template + the linked
   design/impl docs, never the author's reasoning. This isolates information exposure but depends on a
   genuine context reset (often operator-initiated).
3. **Disclosed degradation** — if neither is available, the skill **cannot self-enforce** isolation.
   The agent must **state that isolation is not runtime-enforced and request a fresh review session**,
   and must **not** silently self-review. Self-review presented as fresh review is the failure this
   discloses.

The research found **no confirmed skill-callable subagent / orchestration API on Codex or opencode**
(`docs/analysis-2026-07-10-cross-runtime-research.md` §7), so on those runtimes tiers 2–3 are the
realistic default: obtain a fresh/cleared reviewer context, or disclose the degradation.

## Termination note (manual mode keeps the L3 rules)

Manual mode is an **L3 execution mode**, not a separate loop, so it uses the **L3 termination rules,
including the clean-first-round relaxation** — a Phase whose first review is fully clean (zero severe
AND zero general) with no fix applied closes in a single round — exactly as
`references/loop-3-development.md:63` states. The moment any fix lands, the standard two-generation
rule re-engages. Only **L1 and L2** keep the strict two-generation rule (there the second clean round
is fresh-reviewer corroboration, not a post-fix re-check). This restates the existing scope for the
portable reader; it introduces no new or changed rule, and denies the manual path nothing.
