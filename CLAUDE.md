# CLAUDE.md — three-loop-workflow skill repo

<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"

This repo distributes the **three-loop-workflow** Claude skill (currently **v1.5.2**). It is the
canonical case where the load-bearing documents *are* the product: the skill is maintained by its
own L1 → L2 → L3 → F discipline.

## Development Workflow

All non-trivial changes use the three-loop-workflow skill. Entry point: `three-loop-workflow/SKILL.md`.
Load-bearing documents require the full L1 → L2 → L3 → F cycle; the Light/Full/None tier gate lives in the
skill (`references/light-mode.md`) and is fresh-eyes-enforced. Escalation: open an issue or comment in the PR.

- **Behavioral gate (v1.5).** Before merging any edit to the tier table, the escalation rules, or the
  termination wording, run the pressure scenarios in `tests/scenarios/` via a fresh subagent and confirm
  each `expected` field holds. These scenarios are the skill's behavioral acceptance fixture — they catch a
  discipline regression that the grep/gate checks cannot.

## Load-Bearing Documents

Protected by the full L1 → L2 → L3 → F cycle:

- `three-loop-workflow/SKILL.md`
- `three-loop-workflow/references/*.md` (all reference files)
- `three-loop-workflow/references/*.js` (`l3-phase.js`, `review-panel.js` — Workflow scripts)
- `three-loop-workflow/references/*.sh` (`check-consistency.sh`, `check-workflow-syntax.sh`, `validate-commit-msg.sh` — gate/hook helpers)

**Not** load-bearing — edited directly (one fresh-agent review, no full cycle): `tests/scenarios/*.md`
(the behavioral suite), `README.md` / `README-cn.md`, and the `docs/design/` + `docs/implementation/`
per-task archives.

## Language Policy

All skill files and process documents: English. Terminology must be consistent with existing
`docs/design/`, `docs/implementation/`, and the skill's `SKILL.md`. The only exception is `README-cn.md`,
which is a Chinese translation of `README.md`.

## Common Commands

- `<TEST-CMD>`: N/A — this repo has no unit-test suite. Acceptance is grep-based checks over the modified
  files, the two gates below (consistency + workflow-syntax), and — for any edit to the discipline
  itself — the `tests/scenarios/` behavioral suite (also below).
- **Consistency gate:** `bash three-loop-workflow/references/check-consistency.sh` — fails if a
  commitment-clause token is missing from its source file or a paired reference site within the skill.
  Checked tokens — the five role names and "five questions" are single-file presence checks;
  `fix(phaseN-roundR)`, the `two-generation` termination rule (paired across SKILL.md + schemas.md +
  loop-1/loop-2 + escalation-rules), `clean-first-round` (SKILL.md ↔ schemas.md), and `fixApplied`
  (schemas.md ↔ l3-phase.js) are paired-site checks. The `zero severe`/`zero general` tokens are the
  per-round cleanliness predicate, not the termination rule. The gate also fails if `SKILL.md` exceeds
  its `wc -w` word-count ceiling (2888).
- **Workflow-script syntax gate:** `bash three-loop-workflow/references/check-workflow-syntax.sh <file.js>`
  — reliably parses a Workflow script (`node --check` mis-parses these `export`+top-level-`return` files).
- **Behavioral scenarios:** run each `tests/scenarios/*.md` via a fresh subagent against the current skill
  and assert the file's `expected` field (see the Development Workflow behavioral gate).
- **Zip rebuild** (from repo root): `rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/`
  (the `rm -f` first so a stale archive cannot retain files that were removed from `three-loop-workflow/`).
- **Installed-copy sync** (if an installed copy exists): `rsync -a --delete three-loop-workflow/ "$HOME/.claude/skills/three-loop-workflow/"`
  (`--delete` so removed files do not linger in the installed copy; a plain `cp -r` would leave them behind).

## Engineering Norms

- This repo distributes a Claude skill, not application code. Primary artifacts: Markdown files, two
  JavaScript Workflow scripts (`references/l3-phase.js`, `references/review-panel.js`), shell gate/hook
  helpers (`references/*.sh`), and the `tests/scenarios/` behavioral fixtures.
- Follow the skill's own four core principles: Think Before Coding, Simplicity First, Surgical Changes,
  Goal-Driven Execution. Anti-bloat is binding on the always-loaded `SKILL.md` surface — prefer
  net-neutral or net-negative edits there and push detail into `references/`.
- The Workflow scripts are plain JavaScript (no TypeScript, no `Date.now()`, no `Math.random()`); validate
  with `check-workflow-syntax.sh`, not `node --check`. `l3-phase.js` carries load-bearing control flow —
  the dev status signal (`blocked` / `concerns[]` with a **bounded single re-dispatch** then
  `dev-escalation`), the retained `conflict` outcome, per-corner `models` routing, and the accumulated
  review-prompt segments. Preserve all of these when editing it, and re-run the syntax gate.
- Do not add new CLAUDE.md roles without updating the anchor map above and all downstream reference files
  that read those roles.
