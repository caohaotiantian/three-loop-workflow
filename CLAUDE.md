# CLAUDE.md — three-loop-workflow skill repo

<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"

This repo distributes the **three-loop-workflow** Claude skill, shipped from `three-loop-workflow/`.

**v2.3.0 is current.** The v2 line is a ground-up rewrite, not an increment: v1's L1/L2/L3/F loops, Full/Light/None
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

A third followed on 2026-07-30, and this one was **repaired rather than deleted**, because it was the only
thing standing between the release and a regression. The v2.0.0-era acceptance script pinned `phase.js`'s
guards with `grep -q`: disabling both empty-diff guards with `false &&` left every token intact and it
still printed `ok an uncommitted phase is rejected, not reviewed` and `ACCEPT: all checks passed`, exit 0.
Deleting one guard outright also passed, because the rule's wording survived in the comment above it. Both
were demonstrated in a fresh clone. Control flow is now asserted by **execution** — `scripts/sim-phase.js`
drives the real script with stub agents — and `scripts/negative-test.sh` breaks the two scripts
twenty-five ways and requires the harness to notice each one. The lesson generalises: to check a *rule*, run it; grep only for
*prose*, which is the one thing whose presence is the property you want.

Nothing replaced the consistency gate as such. The scenario suite was replaced by the two-arm runner below;
a *discriminating* fixture that both arms pass is INVALID, while a guard both arms pass is a pass.

## Load-Bearing Documents

Protected by the full cycle:

- `three-loop-workflow/SKILL.md`
- `three-loop-workflow/references/*.md`
- `three-loop-workflow/scripts/*.js`
- `three-loop-workflow/scripts/*.sh`
- `scripts/**` — the acceptance gate and its harnesses. A weakened gate reads as coverage that is not
  there, which is the defect this repo has now shipped twice, so relaxing one is never a Direct edit.
- `CLAUDE.md`

The six references are `plan.md`, `build.md`, `orchestration.md` (worktrees for concurrent writers, and
the Build loop as a script — split out of `build.md` on 2026-08-04), `close.md`, `escalation.md` and
`platforms.md`. `SKILL.md`'s routing table is the only index of them, and nothing in the gate checks
that table, so a reference nobody routes to is invisible to every check here.

**Not** load-bearing — edited directly with one fresh-agent review: `tests/**`, `README.md` /
`README-cn.md`, `CHANGELOG*.md`, every top-level `docs/*.md` (announcements, the rebuild article, the
audit records), and the `docs/design/` + `docs/implementation/` archives.

**`tests/**` stays off that list deliberately, and the reason is not that the tests are unimportant.**
Agents asked to improve this skill have repeatedly redirected their effort into the test suite —
elaborating fixtures and harnesses, spending a large share of the budget there, and leaving the skill
itself no better. Classifying `tests/**` as load-bearing would route *more* attention there. So: do not
spend a change's budget on the suite unless the change is about the suite. One procedural fact does
apply, because the gate does not honour the classification — `tests/run-scenarios.js` is mutated five
ways by `scripts/negative-test.sh`, syntax-gated in CI, and has its fixture list pinned by
`accept-release.sh`, so touching it means re-running the three harnesses below before you commit.

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

The exceptions to English are the `-cn.md` files, of which there are five: `README-cn.md`,
`CHANGELOG-cn.md`, `docs/why-v2-cn.md`, `docs/announcement-v2.0.0-cn.md` and
`docs/2026-07-31-round-cap-experiment-cn.md` — each a Chinese translation of its English counterpart.
When one changes, change its pair. `scripts/accept-release.sh` fails when one of the **first four**
pairs quotes a recomputed figure a different number of times; the fifth pair is held by
`scripts/exp-analyse.mjs` instead, so do not read the pairing rule as one check covering all five.
`find . -name '*-cn.md' -not -path './.git/*'` lists them.

## Common Commands

- `<TEST-CMD>`: `bash scripts/accept-release.sh` — the repository gate. Recomputes every published
  figure, runs the three execution harnesses below **and** the round-cap figure check, and exits
  non-zero with each failure named. CI runs it on every push and pull request
  (`.github/workflows/check.yml`), and again on a tag before the archive is built. It is not a
  sub-second check: it exports two tags, builds a zip, and drives every harness. It needs a UTF-8
  locale (it refuses to run without one), plus `python3`, `node`, `git`, `zip` and `unzip`, and a
  checkout with full history **and tags** — CI pins `fetch-depth: 0` for exactly that reason, and
  without the tags eleven published-figure checks fail at once.
- **The shipped file set is pinned by literals in two files.** Adding or removing one file under
  `three-loop-workflow/` means editing `scripts/accept-release.sh` (the layout counts, and the archive
  count near the end) *and* `.github/workflows/release.yml`, which keeps its own independent copy of the
  archive assertion and therefore fails on the tag build, after acceptance has already printed
  `ACCEPT: all checks passed`. `grep -n "find three-loop-workflow -type f\|archive entry count\|entries" scripts/accept-release.sh .github/workflows/release.yml`
  finds them; do not carry the count around in prose, it has already drifted once.
- **Round-cap experiment (2026-07-31):** `node scripts/exp-analyse.mjs --raw
  docs/measurements/2026-07-30-round-cap/raw --docs docs/2026-07-31-round-cap-experiment.md
  docs/2026-07-31-round-cap-experiment-cn.md` recomputes the listed figures, requires each to appear in
  both languages, requires the **multi-digit** ones to appear the same number of times, and asserts the
  per-round series against what `phase.js` returned. Single-digit figures are presence-only, which
  almost no prose can fail — say so rather than calling it coverage. `accept-release.sh` runs it, and it is the only
  experiment script under `scripts/`. The fourteen that drove the runs once are archived beside the
  data in `docs/measurements/2026-07-30-round-cap/harness/` — kept so the method is inspectable, not
  kept as a gate. They are **not** a turnkey re-run: two of them still name the private working
  directory the runs used. `preregistration.md` beside the raw data is what the experiment was
  committed to do, before any of it existed.
- **Invariant harnesses (fast, deterministic, no agents):**
  `node scripts/sim-phase.js` asserts `phase.js`'s control flow by driving the real script with stub
  agents; `node scripts/sim-scenarios.js` asserts the two-arm suite's scoring arithmetic;
  `bash scripts/negative-test.sh` breaks `phase.js` twenty ways, `run-scenarios.js` five, and the
  round-cap experiment's published figures three, and fails if the harness misses one.
  Run all three after touching either script — and add the failing case to the harness *before* the fix.
- **Two-arm scenario suite (slow, spawns agents):** `Workflow({ scriptPath: "tests/run-scenarios.js" })`.
  Runs every fixture with the skill loaded and withheld. A **discriminating** fixture both arms answer
  correctly proves nothing and is reported INVALID; a **guard** both arms answer correctly is GUARD-HELD, a
  pass — ten of the eleven current fixtures are guards. `GUARD-BROKEN` is the most serious result it can
  return. The verdict and the pass condition are computed in the runner, never asserted by the scoring
  agent. Answers live in `tests/expected.json`, deliberately outside the fixtures. Paths resolve relative
  to the repo root; pass `args: {repo: "<path>"}` to run it against a checkout elsewhere.
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
- Anti-bloat binds the always-loaded `SKILL.md` surface — push detail into references. Review is the
  mechanism, not a ceiling: v1 reached 2,915 words under a numeric cap, which is why the cap is not the
  mechanism. `accept-release.sh` fails above **1,500** words, and that is a backstop against silent drift
  set above the reviewed size, not a budget to spend — the file is 1,468 words, and the slack above it is
  not an allowance: an addition that does not displace something has to argue for itself in review. Rules live here; the measurements behind them live in the references,
  because a statistic on the always-loaded surface costs tokens on every activation, changes no behavior,
  and drifts.
- Workflow scripts are plain JavaScript — no TypeScript, no `Date.now()`, no `Math.random()`, no argless
  `new Date()`. `check-workflow-syntax.sh` now fails on all four and on a missing `export const meta`;
  `node --check` cannot gate these files at all. It checks nothing about the logic — that is what the
  execution harnesses are for.
- `three-loop-workflow/scripts/phase.js` carries load-bearing control flow. The originals: `round`
  increments **only** on a fix; the round cap tests **fixes spent** (`fixes >= maxRounds`), never the round
  about to be verified; reviewer findings are **unioned, never intersected**; triage runs **before** the
  closure count; a reviewer that fails to return is an `agent-error`, never a pass. Added 2026-07-30, each
  after a demonstrated bypass: two independent agent reports of HEAD are **cross-checked** rather than one
  being trusted, which is what makes an empty review detectable — note that it does not detect a
  fabricated sha, only render it harmless, because resolving a sha needs a shell the script does not
  have; an unparseable sha **fails closed** rather than disabling the guards downstream of it; reviewers receive the diff and the plan and nothing else; `depth`
  decides the reviewer count so a Deep phase cannot run the Standard review by omission; and the verify
  loop keeps a **structural bound** independent of the fix counter, without which a broken counter spins
  forever instead of returning.
  Do not verify any of these by reading. `node scripts/sim-phase.js` asserts them by execution and
  `scripts/negative-test.sh` breaks each one in turn and requires the harness to notice. One is different
  and worth knowing: the verify loop's structural bound is **defence in depth**, so removing it alone
  changes no observable behaviour — the cap still returns first. It is asserted in *combination* with a
  broken fix counter, where its absence turns a wrong return into a run that never terminates. The cap
  invariant alone has been broken twice, and every regression this repo has shipped passed a gate that
  read the code instead of running it. Add the failing invariant to the harness before the fix, and watch
  it fail.
- Commit messages: conventional prefixes, no mention of AI involvement, model names, or tooling.
- Do not add new CLAUDE.md roles without updating the anchor map above and every downstream file that reads
  those roles.
