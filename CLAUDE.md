# CLAUDE.md — three-loop-workflow skill repo

<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"

## Development Workflow

All non-trivial changes use the three-loop-workflow skill. Entry point: `SKILL.md`.
Load-bearing documents require the full L1 → L2 → L3 cycle. Escalation: open an
issue or comment in the PR.

## Load-Bearing Documents

The following files are protected by the full L1 → L2 → L3 cycle:

- `three-loop-workflow/SKILL.md`
- `three-loop-workflow/references/*.md` (all reference files)
- `three-loop-workflow/references/l3-phase.js`
- `WORKFLOW-v3.md`

## Language Policy

All skill files and process documents: English. Terminology must be consistent with
existing `docs/design/`, `docs/implementation/`, the skill's `SKILL.md`, and
`WORKFLOW-v3.md`. The only exception is `README-cn.md`, which is a Chinese translation
of `README.md`.

## Common Commands

- `<TEST-CMD>`: N/A — this repo has no test suite; acceptance is verified by
  grep-based checks over the modified files.
- Zip rebuild: `cd /home/fedora/workflow && zip -r three-loop-workflow.skill three-loop-workflow/`
- Installed-copy sync: `cp -r /home/fedora/workflow/three-loop-workflow/. /home/fedora/.claude/skills/three-loop-workflow/`

## Engineering Norms

- This repo distributes a Claude skill, not application code. The primary artifacts
  are Markdown files and one JavaScript Workflow script (`references/l3-phase.js`).
- Follow the skill's own four core principles: Think Before Coding, Simplicity First,
  Surgical Changes, Goal-Driven Execution.
- `l3-phase.js` is plain JavaScript (no TypeScript, no `Date.now()`, no `Math.random()`).
- Do not add new CLAUDE.md roles without updating the anchor map above and all
  downstream reference files that read those roles.
