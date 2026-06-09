# Optional reviewer subagent bundle (built-in `.claude/agents`)

The skill runs **zero-install** on the built-in default subagent. This file is an **optional**
upgrade: ready-to-copy `.claude/agents` definitions that turn the prose "Forbidden" columns into
harness-enforced guarantees on the paths where they apply, route compute (a strong model on
judgment, a cheap model on the mechanical accept corner), and preload the skill so reviewers
cannot drift from it.

> **These are built-in Claude Code `.claude/agents` files — NOT an external plugin.** v1.3.2
> deliberately removed the external-plugin dependency; this re-introduces *optional* reviewer
> roles via the built-in agent mechanism, and the skill **still runs with no install** via the
> mandatory fallback below.

## The honest enforcement boundary (read first)

A `tools` allowlist makes a reviewer **physically unable to edit** — but only on the spawn paths
that honor an agent *definition*: the manual L3 mode (Agent tool / `@`-mention / `--agent`) and
the L1 / L2 reviews. The skill's **recommended L3 mode** spawns review/accept via the Workflow
primitive `agent(prompt, { schema })` in `l3-phase.js`, which passes a prompt + schema, **not an
agent-type name** — so the named-agent tool restriction **does not transfer** to that path. On the Workflow
path, role isolation is still enforced (fresh spawn per role), but the read-only *tool* guarantee
is not. Do not market the allowlist as a blanket guarantee; it hardens the manual/L1/L2 paths.

## The definitions

Copy into `.claude/agents/` (project) or `~/.claude/agents/` (user). Each body **is** the
relevant review prompt template from the loop references, and restates the four principles, the
role's Forbidden list, and the role-isolation rule.

```markdown
---
name: three-loop-design-reviewer
description: Fresh-eyes reviewer for an L1 design document. Use to review docs/design/<slug>.md.
tools: Read, Grep, Glob, Bash
model: opus
skills:
  - three-loop-workflow
---
You are the design review engineer. Apply the L1 review template from
references/loop-1-design.md. You MUST NOT modify any file (you have no Edit/Write). Treat any
violation of the four principles — Think Before Coding, Simplicity First, Surgical Changes,
Goal-Driven Execution — as a severe issue. Output only the review report.
```

```markdown
---
name: three-loop-impl-reviewer
description: Fresh-eyes reviewer for an L2 implementation document. Use to review docs/implementation/<slug>.md.
tools: Read, Grep, Glob, Bash
model: opus
skills:
  - three-loop-workflow
---
You are the implementation review engineer. Apply the five-question L2 review template from
references/loop-2-implementation.md. Do not modify any file. Output only the review report.
```

```markdown
---
name: three-loop-l3-reviewer
description: Fresh-eyes reviewer for an L3 Phase diff. Use after a Phase's dev corner finishes.
tools: Read, Grep, Glob, Bash
model: opus
skills:
  - three-loop-workflow
---
You are the L3 review corner. Your first action is `git diff <baseSha>..<devBranch>`. Review
that diff against the design and impl docs; flag drive-by edits, process-narration comments, and
any principle violation. Do not modify code. Output a ReviewVerdict (see references/schemas.md).
```

```markdown
---
name: three-loop-accept-runner
description: Mechanical accept corner — runs the Phase ACCEPT-CMDs and reports pass/fail. Use after review passes.
tools: Read, Bash
model: haiku
---
You are the accept corner. Run every <ACCEPT-CMD> for the Phase and report each command's exit
code as pass/fail. Do NOT modify code or tests, and do NOT interpret or judge output beyond the
mechanical exit-code → pass/fail derivation (judgement is the review corner's job). Return an
AcceptVerdict.
```

Notes:
- **Model routing**: Opus where senior judgment lives (the reviewers); Haiku is acceptable for
  `three-loop-accept-runner` **only because** the accept corner is forbidden from judging output
  — it is pure exit-code → pass/fail. Cheap-model routing must never leak into the review or
  behavior-verification steps.
- **`skills: [three-loop-workflow]` preload** injects the skill content so a reviewer cannot
  forget the templates. It still receives the artifact (the diff + design/impl docs) and the
  round-specific prompt — preload removes only the need to *re-read the skill's own templates*,
  not the need to read the artifact.

## Mandatory fallback (keeps the skill self-contained)

Wherever a loop reference says "spawn the review subagent", read it as: **if the
`three-loop-*` subagents are installed, spawn them by name; otherwise spawn a fresh default
subagent with the prompt template in the reference.** The skill never requires these files.
