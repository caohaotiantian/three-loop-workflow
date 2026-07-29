# CLAUDE.md — three-loop-workflow skill repo

<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"

This repo distributes the **three-loop-workflow** Claude skill. Two versions live here:

- `three-loop-workflow/` — **v1.14.0, shipped.** What users install today.
- `v2/` — **a ground-up rewrite, staged and unpromoted.** Not shipped, not installed, not yet run on a
  real task. See `v2/README.md` for what changed and on what evidence.

It is the canonical case where the load-bearing documents *are* the product.

## Development Workflow

Changes to the **shipped** skill (`three-loop-workflow/`) follow that skill's own L1 → L2 → L3 → F cycle.
Entry point: `three-loop-workflow/SKILL.md`.

Work on **v2** follows v2's discipline — `v2/three-loop-workflow/SKILL.md`: choose a depth, write
`.agent/plan.md`, run the gates before spawning a reviewer, review the diff with a fresh subagent, triage
findings before counting them. Dogfooding v2 is the point; it is how v2 earns promotion.

Escalation: open an issue or comment in the PR.

**On gating.** Two things this repo previously treated as acceptance gates do not work. Both were measured
on 2026-07-28 and neither should block or bless a merge on its own:

- `check-consistency.sh` is **bypassable**. Replacing `SKILL.md`'s central termination rule with its
  semantic opposite, leaving the token present in an HTML comment, still returned
  `three-loop-consistency: OK`, exit 0. Roughly 100 of its 242 lines are `grep -qF` presence checks, and
  presence of a word is not presence of a rule.
- `tests/scenarios/` has **0% discrimination**. Six fixtures were run with the skill loaded and with it
  withheld: skill-off passed 6/6, skill-on passed 6/6. All 12 runs self-reported that the scenario text
  stated the answer; 9 of 9 files inspected had the same defect. It has been green for 16 releases while
  carrying no information.

Use `v2/tests/run-scenarios.js` instead — it runs both arms and fails a fixture that both arms pass.

## Load-Bearing Documents

Protected by the full cycle:

- `three-loop-workflow/SKILL.md`
- `three-loop-workflow/references/*.md`
- `three-loop-workflow/references/*.js`
- `three-loop-workflow/references/*.sh`
- `v2/three-loop-workflow/SKILL.md`
- `v2/three-loop-workflow/references/*.md`
- `v2/three-loop-workflow/scripts/*.js`
- `v2/three-loop-workflow/scripts/*.sh`
- `CLAUDE.md`

**Not** load-bearing — edited directly with one fresh-agent review: `tests/scenarios/*.md`,
`v2/tests/**`, `README.md` / `README-cn.md`, `CHANGELOG*.md`, and the `docs/design/` +
`docs/implementation/` per-task archives.

## Language Policy

All skill files and process documents: English. Terminology must be consistent with the shipped
`SKILL.md` and, for v2 work, with `v2/three-loop-workflow/SKILL.md` — the two use **different
vocabularies on purpose** (v1: L1/L2/L3/F, Full/Light/None, severe/general; v2: Plan/Build/Close,
Direct/Standard/Deep, blocking/non-blocking). Do not mix them in one file.

The only exception to English is `README-cn.md`, a Chinese translation of `README.md`.

## Common Commands

- `<TEST-CMD>`: N/A — no unit-test suite. Acceptance is the gates below plus, for any change to the
  discipline itself, the two-arm scenario suite.
- **Two-arm scenario suite (v2, the one that works):** `Workflow({ scriptPath: "v2/tests/run-scenarios.js" })`.
  Runs every fixture with the skill loaded and withheld. A fixture both arms answer correctly proves
  nothing and is reported INVALID; a `guard` fixture that skill-on gets wrong is the most serious result
  it can return. Answers live in `v2/tests/expected.json`, deliberately outside the fixtures.
- **Workflow-script syntax gate:** `bash three-loop-workflow/references/check-workflow-syntax.sh <file.js>`
  — reliably parses a Workflow script (`node --check` mis-parses these `export` + top-level-`return`
  files). Works; use it on every `.js` change in either version.
- **Consistency gate (v1 only, known-weak):** `bash three-loop-workflow/references/check-consistency.sh`.
  Still catches a genuinely missing token or a drifted byte-identity pair. It cannot detect a rule whose
  meaning was inverted — see the Development Workflow note. Do not describe it as authoritative.
- **Zip rebuild** (from repo root): `rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/`
  (`rm -f` first so a stale archive cannot retain deleted files).
- **Installed-copy sync:** `rsync -a --delete three-loop-workflow/ "$HOME/.claude/skills/three-loop-workflow/"`
  (`--delete` so removed files do not linger; `cp -r` would leave them behind).

## Engineering Norms

- This repo distributes a Claude skill, not application code. Primary artifacts: Markdown, JavaScript
  Workflow scripts, shell hook/gate helpers, and behavioral fixtures.
- **A check that cannot fail when the behavior is wrong is worse than no check** — it reads as coverage
  that does not exist. Before adding a gate, write the failing case first and watch it fail. If you cannot
  make it fail, write a two-arm scenario instead.
- **Do not claim a script does something without testing that it does.** A v2 reference once shipped a
  claim that a bundled script rejected AI attribution in commit messages; the script contained no such
  check, and nobody had run it. State what you ran, not what you intended.
- Anti-bloat binds the always-loaded `SKILL.md` surface in both versions — push detail into references.
  v1 is capped by `SKILL_WORD_CEILING`; v2 has no gate-enforced cap and is held at ~1,200 words by review.
- Workflow scripts are plain JavaScript — no TypeScript, no `Date.now()`, no `Math.random()`. Validate with
  `check-workflow-syntax.sh`, not `node --check`.
- `v2/three-loop-workflow/scripts/phase.js` carries load-bearing control flow: `round` increments **only**
  on a fix; reviewer findings are **unioned, never intersected**; triage runs **before** the closure count;
  a reviewer that fails to return is an `agent-error`, never a pass. Preserve all four and re-run the
  syntax gate.
- Commit messages: conventional prefixes, no mention of AI involvement, model names, or tooling.
- Do not add new CLAUDE.md roles without updating the anchor map above and every downstream file that
  reads those roles.
