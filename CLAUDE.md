# CLAUDE.md — three-loop-workflow skill repo

<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"

This repo distributes the **three-loop-workflow** Claude skill, shipped from `three-loop-workflow/`.

**v2.1.0 is current.** It is a ground-up rewrite, not an increment: v1's L1/L2/L3/F loops, Full/Light/None
tiers, five-voter panel, committed per-task document archive, and `check-consistency.sh` are all gone.
v1.14.0 remains at tag `v1.14.0` for anyone who needs it. `docs/why-v2.md` is the full account of what
changed and on what evidence.

It is the canonical case where the load-bearing documents *are* the product.

## Development Workflow

Changes to the skill follow that skill's own **Plan → Build → Close** cycle. Entry point:
`three-loop-workflow/SKILL.md`. Choose a depth, write `.agent/<task>/plan.md`, run the gates before spawning a
reviewer, review the diff with a fresh subagent, and **triage findings before counting them**.

Any edit that changes a rule in a file under _load-bearing-docs_ is a **Deep** change by the skill's own
depth gate. A typo or formatting fix in one of those files is still Direct.

Escalation: open an issue or comment in the PR.

**On gating.** Two things this repo once treated as acceptance gates did not work. Both were measured on
2026-07-28 and both were deleted in v2.0.0 rather than repaired:

- `check-consistency.sh` was **bypassable**. Replacing `SKILL.md`'s central termination rule with its
  semantic opposite, leaving the token present in an HTML comment, still returned
  `three-loop-consistency: OK`, exit 0. Its only checking primitive was `require()`, a bare
  `grep -qF` for a literal token, invoked 24 times against five checks that inspected content at all —
  and presence of a word is not presence of a rule.
- v1's `tests/scenarios/` had **0% discrimination**. Six fixtures were run with the skill loaded and with
  it withheld: skill-off passed 6/6, skill-on passed 6/6. All 12 runs self-reported that the scenario text
  stated the answer; 9 of 9 files inspected had the same defect. It had been green for 16 releases while
  carrying no information.

Nothing replaced the consistency gate. The scenario suite was replaced by the two-arm runner below, which
fails a fixture that both arms pass.

## Load-Bearing Documents

Protected by the full cycle:

- `three-loop-workflow/SKILL.md`
- `three-loop-workflow/references/*.md`
- `three-loop-workflow/scripts/*.js`
- `three-loop-workflow/scripts/*.sh`
- `CLAUDE.md`

**Not** load-bearing — edited directly with one fresh-agent review: `tests/**`, `README.md` /
`README-cn.md`, `CHANGELOG*.md`, every top-level `docs/*.md` (announcements, the rebuild article, the
audit records), and the `docs/design/` + `docs/implementation/` archives.

`docs/design/` and `docs/implementation/` are a **frozen v1 archive**, kept as the record of how v1 was
built. v2 does not produce per-task documents; its plan lives in a gitignored `.agent/<task>/plan.md`, one directory per task. Do not add
to those directories and do not treat their contents as describing current behavior.

## Language Policy

All skill files and process documents: English. Terminology must be consistent with `SKILL.md` —
**Plan/Build/Close**, **Direct/Standard/Deep**, **blocking/non-blocking**.

v1's vocabulary (L1/L2/L3/F, Full/Light/None, severe/general) is **retired for new writing**. It still
appears throughout the historical record — the `CHANGELOG*.md` version tables, the frozen `docs/design/`
and `docs/implementation/` archives, and the dated audit and analysis files under `docs/` — all of which
are records of what was true when written and must not be retro-edited into v2 terms.

The exceptions to English are the `-cn.md` files — `README-cn.md`, `CHANGELOG-cn.md`,
`docs/why-v2-cn.md`, `docs/announcement-v2.0.0-cn.md` — each a Chinese translation of its English
counterpart. When one changes, change its pair — a release's acceptance script should fail when a pair
quotes different figures.

## Common Commands

- `<TEST-CMD>`: N/A — no unit-test suite. Acceptance is the gates below plus, for any change to the
  discipline itself, the two-arm scenario suite.
- **Two-arm scenario suite:** `Workflow({ scriptPath: "tests/run-scenarios.js" })`. Runs every fixture with
  the skill loaded and withheld. A fixture both arms answer correctly proves nothing and is reported
  INVALID; a `guard` fixture that skill-on gets wrong is the most serious result it can return. Answers
  live in `tests/expected.json`, deliberately outside the fixtures. Paths resolve relative to the repo
  root; pass `args: {repo: "<path>"}` to run it against a checkout elsewhere.
- **Workflow-script syntax gate:** `bash three-loop-workflow/scripts/check-workflow-syntax.sh <file.js>` —
  reliably parses a Workflow script (`node --check` mis-parses these `export` + top-level-`return` files).
  Works; use it on every `.js` change.
- **Zip rebuild** (from repo root): `rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/`
  (`rm -f` first so a stale archive cannot retain deleted files).
- **Installed-copy sync:** `rsync -a --delete three-loop-workflow/ "$HOME/.claude/skills/three-loop-workflow/"`
  (`--delete` so removed files do not linger; upgrading from v1 with `cp -r` overwrites only the two
  colliding paths and leaves the other 18 v1 files behind, after which the directory holds both
  versions at once).

## Engineering Norms

- This repo distributes a Claude skill, not application code. Primary artifacts: Markdown, JavaScript
  Workflow scripts, shell gate helpers, and behavioral fixtures.
- **A check that cannot fail when the behavior is wrong is worse than no check** — it reads as coverage
  that does not exist. Before adding a gate, write the failing case first and watch it fail. If you cannot
  make it fail, write a two-arm scenario instead.
- **Do not claim a script does something without testing that it does.** A v2 draft once shipped a claim
  that a bundled script rejected AI attribution in commit messages; the script contained no such check, and
  nobody had run it. State what you ran, not what you intended.
- Anti-bloat binds the always-loaded `SKILL.md` surface — push detail into references. There is no
  gate-enforced cap; it is held near 1,400 words by review. Rules live here; the measurements behind them live in the references, because a statistic on the always-loaded surface costs tokens on every activation, changes no behavior, and drifts. v1 reached 2,915 words under a numeric ceiling,
  which is why the ceiling is not the mechanism.
- Workflow scripts are plain JavaScript — no TypeScript, no `Date.now()`, no `Math.random()`. Validate with
  `check-workflow-syntax.sh`, not `node --check`.
- `three-loop-workflow/scripts/phase.js` carries load-bearing control flow: `round` increments **only** on
  a fix; the round cap tests **fixes spent** (`fixes >= maxRounds`), never the round about to be verified;
  reviewer findings are **unioned, never intersected**; triage runs **before** the closure count; a reviewer
  that fails to return is an `agent-error`, never a pass. Preserve all five and re-run the syntax gate. The
  cap invariant is the one that has now been broken twice — once in v1, once in v2 — so check it by
  simulating the loop, not by reading it.
- Commit messages: conventional prefixes, no mention of AI involvement, model names, or tooling.
- Do not add new CLAUDE.md roles without updating the anchor map above and every downstream file that reads
  those roles.
