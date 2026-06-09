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
- `three-loop-workflow/references/*.js` (`l3-phase.js`, `review-panel.js` — Workflow scripts)
- `three-loop-workflow/references/*.sh` (`check-consistency.sh`, `check-workflow-syntax.sh`, `validate-commit-msg.sh` — gate/hook helpers)

## Language Policy

All skill files and process documents: English. Terminology must be consistent with
existing `docs/design/`, `docs/implementation/`, and the skill's `SKILL.md`. The only
exception is `README-cn.md`, which is a Chinese translation of `README.md`.

## Common Commands

- `<TEST-CMD>`: N/A — this repo has no unit-test suite; acceptance is verified by
  grep-based checks over the modified files, plus the two gates below.
- three-loop-consistency check: `bash three-loop-workflow/references/check-consistency.sh` —
  fails if a commitment-clause token (the five role names, `fix(phaseN-roundR)`, "five
  questions", the two-generation termination wording) is missing from its source file or a
  paired reference site within the skill.
- Workflow-script syntax check: `bash three-loop-workflow/references/check-workflow-syntax.sh <file.js>` —
  reliably parses a Workflow script (`node --check` mis-parses these `export`+top-level-`return` files).
- Zip rebuild (from repo root): `zip -r three-loop-workflow.skill three-loop-workflow/`
- Installed-copy sync (if an installed copy exists): `cp -r three-loop-workflow/. "$HOME/.claude/skills/three-loop-workflow/"`

## Engineering Norms

- This repo distributes a Claude skill, not application code. The primary artifacts
  are Markdown files, two JavaScript Workflow scripts (`references/l3-phase.js`,
  `references/review-panel.js`), and shell gate/hook helpers (`references/*.sh`).
- Follow the skill's own four core principles: Think Before Coding, Simplicity First,
  Surgical Changes, Goal-Driven Execution.
- The Workflow scripts (`l3-phase.js`, `review-panel.js`) are plain JavaScript (no
  TypeScript, no `Date.now()`, no `Math.random()`); validate them with
  `check-workflow-syntax.sh`, not `node --check`.
- Do not add new CLAUDE.md roles without updating the anchor map above and all
  downstream reference files that read those roles.
