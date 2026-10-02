# CLAUDE.md — three-loop-workflow skill repo

<!-- Anchor map: a v2 convention the skill no longer reads; kept because accept-release.sh checks these headings -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"

This repo distributes the **three-loop-workflow** Claude skill, shipped from `three-loop-workflow/`.

**The current version is whatever `sed -n 's/^  version: "\(.*\)"/\1/p' three-loop-workflow/SKILL.md`
prints** — that is the authority, and `accept-release.sh` fails unless it equals the newest
`CHANGELOG.md` heading. Do not copy the number here: this file records the command rather than what it
prints, because the line that used to name a version went stale twice.

The v3 line is a ground-up rewrite of v2, as v2 was of v1. v2's Build-loop script, its named runtime
mechanisms, and the anchor-map roles are gone; v2.7.0 remains at tag `v2.7.0`.
v1's L1/L2/L3/F loops, Full/Light/None tiers, five-voter panel, committed per-task document archive and
`check-consistency.sh` were retired in v2.0.0; v1.14.0 remains at tag `v1.14.0`. `docs/why-v3.md` and
`docs/why-v2.md` are the accounts of what changed and on what evidence.

It is the canonical case where the load-bearing documents *are* the product.

## Development Workflow

Changes to the skill follow that skill's own **Plan → Build → Close** cycle. Entry point:
`three-loop-workflow/SKILL.md`. Choose a depth, write the plan to `.agent/<task>/plan.md` (one directory
per task; this repo lists `.agent/` in `.gitignore` and that entry stays, overriding the skill's default
of committing the plan),
run the gates before a reviewer sees the change, review the diff with a fresh reviewer, and **triage
findings before counting them**.

Any edit that changes a rule in a file under _load-bearing-docs_ is a **Deep** change by the skill's own
depth triggers. A typo or formatting fix in one of those files is still Direct.

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
were demonstrated in a fresh clone. The repair asserted control flow by **execution**: `sim-phase.js` drove
the real script with stub agents, and `negative-test.sh` broke it and required the harness to notice. Even
that had to be read by rate, not count: on 2026-08-11 `sim-phase` reported every invariant holding while
a fifth of an 88-mutation audit survived it. The lesson generalises: to check a *rule*, run it; grep only
for *prose*, which is the one thing whose presence is the property you want.

In v3.0.0 the Build-loop script was retired from the shipped skill, and `sim-phase.js` and its mutations
went with it; both remain at tag `v2.7.0`. The syntax gate moved to `scripts/` to keep gating
`tests/probe.js`. What executes now is `lint-skill.sh` and the syntax gate, each proven able to fail by
`negative-test.sh`, plus `exp-analyse.mjs`. `lint-skill.sh` greps, rightly: what it holds are prose
properties.

Nothing replaced the consistency gate as such — `lint-skill.sh` checks named patterns and routing, never
whether two rules agree. The two-arm runner that replaced the scenario suite was itself deleted on
2026-08-11, for the third instance of the same disease: 23 agents per run to return one bit, four of its
eleven fixtures unable to fail by construction, and fourteen commits since it was last run. What survives
is `tests/probe.js`: the question that suite's one discriminating fixture asked, on demand, scored by a
person. Not the same coverage — the probe runs a control arm only, so nothing here detects the skill
pushing a capable model *away* from a correct default. That class is uncovered, deliberately, and saying
so is cheaper than a suite nobody ran.

## Load-Bearing Documents

Protected by the full cycle:

- `three-loop-workflow/SKILL.md`
- `three-loop-workflow/references/*.md`
- `scripts/**` — the acceptance gate and its harnesses. A weakened gate reads as coverage that is not
  there, which is the defect this repo has shipped more than once, so relaxing one is never a Direct edit.
- `CLAUDE.md`

`lint-skill.sh` checks routing in both directions, and only in the literal `references/<name>.md` form:
every file under `references/` must be cited that way from `SKILL.md`, and every such citation in a
shipped file must name a file that exists. Adding or removing a shipped file also means editing the
gate's file-set pins (Common Commands).

**Not** load-bearing — edited directly with one fresh-agent review: `tests/**`, `README.md` /
`README-cn.md`, `CHANGELOG*.md`, every top-level `docs/*.md` (announcements, the rebuild articles, the
audit records), and the `docs/design/` + `docs/implementation/` archives.

**`tests/**` stays off that list deliberately, and the reason is not that the tests are unimportant.**
Agents asked to improve this skill have repeatedly redirected their effort into the test suite —
elaborating fixtures and harnesses, spending a large share of the budget there, and leaving the skill
itself no better. Classifying `tests/**` as load-bearing would route *more* attention there. So: do not
spend a change's budget on the suite unless the change is about the suite. What remains under `tests/`
is small on purpose: the syntax gate's `gate-fixtures/`, which cost nothing, and `probe.js`, which is an
instrument rather than a gate. The deterministic harnesses live in `scripts/`, which **is** load-bearing.

`docs/design/` and `docs/implementation/` are a **frozen v1 archive**, kept as the record of how v1 was
built. Do not add to those directories and do not treat their contents as describing current behavior.

## Language Policy

All skill files and process documents: English. Terminology must be consistent with `SKILL.md` —
**Plan/Build/Close**, **Direct/Standard/Deep**, **blocking/non-blocking**.

v1's vocabulary (L1/L2/L3/F, Full/Light/None, severe/general) is **retired for new writing**. It still
appears throughout the historical record — the `CHANGELOG*.md` version tables, the frozen `docs/design/`
and `docs/implementation/` archives, and the dated audit and analysis files under `docs/` — all of which
are records of what was true when written and must not be retro-edited into current terms. v2's retired
file names get the same treatment wherever a record written before v3.0.0 names them.

The exceptions to English are the `-cn.md` files, of which there are six: `README-cn.md`,
`CHANGELOG-cn.md`, `docs/why-v2-cn.md`, `docs/announcement-v2.0.0-cn.md`, `docs/why-v3-cn.md` and
`docs/2026-07-31-round-cap-experiment-cn.md` — each a Chinese translation of its English counterpart.
When one changes, change its pair. `scripts/accept-release.sh` fails when one of the **first five**
pairs quotes a recomputed figure a different number of times; the sixth pair is held by
`scripts/exp-analyse.mjs` instead, so do not read the pairing rule as one check covering all six.
`find . -name '*-cn.md' -not -path './.git/*'` lists them.

## Common Commands

- `<TEST-CMD>`: `bash scripts/accept-release.sh` — the repository gate. Recomputes every published
  figure, runs the syntax gate, `lint-skill.sh`, `negative-test.sh` **and** the round-cap figure check,
  and exits non-zero with each failure named. CI runs it on every push and pull request
  (`.github/workflows/check.yml`), and again on a tag before the archive is built. It is not a
  sub-second check: it exports tags, builds a zip, and drives every harness. It needs a UTF-8
  locale (it refuses to run without one), plus `python3`, `node`, `git`, `tar`, `zip` and `unzip`, and a
  checkout with full history **and tags** — CI pins `fetch-depth: 0` for exactly that reason. A missing
  required tag is a named `FAIL` before any figure check. The run does not stop there: the figure checks
  still run, and some print `ok` carrying an **empty** figure, because `want()` then greps for the empty
  string and that matches every line. On a tag-less checkout, read the `FAIL` lines, never the `ok`s.
- **The shipped file set is pinned by exact names in two files.** Adding or removing a file under
  `three-loop-workflow/` means editing `scripts/accept-release.sh` — the `SHIPPED=` list, which the layout
  check and the archive check near the end compare against, and the archive count — *and*
  `.github/workflows/release.yml`, which keeps its own copy of the archive assertion (count and exact
  names) and so fails on the tag build, after acceptance has already printed `ACCEPT: all checks passed`.
  `grep -n 'SHIPPED\|scripts directory\|archive entry count' scripts/accept-release.sh`
  and `grep -n 'entries\|expected' .github/workflows/release.yml` find every site; do not carry the names
  or the count around in prose. An earlier version of this bullet did, and its grep missed two of the
  sites it claimed to find.
- **Round-cap experiment (2026-07-31):** `node scripts/exp-analyse.mjs --raw
  docs/measurements/2026-07-30-round-cap/raw --docs docs/2026-07-31-round-cap-experiment.md
  docs/2026-07-31-round-cap-experiment-cn.md` recomputes the listed figures, requires each to appear in
  both languages, requires the **multi-digit** ones to appear the same number of times, and asserts the
  per-round series against what the Build-loop script returned during the runs. Single-digit figures are
  presence-only, which almost no prose can fail — say so rather than calling it coverage.
  `accept-release.sh` runs it, and it is the only experiment script under `scripts/`. The scripts that
  drove the runs are archived beside the data in `docs/measurements/2026-07-30-round-cap/harness/` so the
  method is inspectable, not as a gate and **not** as a turnkey re-run: two of them still name the private
  working directory the runs used. `preregistration.md` beside the raw data is what the experiment was
  committed to do, before any of it existed.
- **Lint and its mutation proof (fast, deterministic, no agents):** `bash scripts/lint-skill.sh <skill-dir>`
  holds the shipped skill's prose properties — no runtime mechanism names, statistics, retired claims,
  retired file names or plan-only provenance forms, and references routed in both directions — printing
  one `ok` or `FAIL` line per check. Its regexes live there and nowhere else. `bash scripts/negative-test.sh`
  mutates a copy of the skill once per regex alternative and fails if the lint misses one; it also breaks
  the syntax gate and the round-cap figures. Add the failing case to `negative-test.sh` before changing
  the lint. A full kill rate bounds only the defects someone thought to inject.
- **Control-arm probe (spawns agents; an instrument, not a gate):**
  `Workflow({ scriptPath: "tests/probe.js" })`. Poses a situation to fresh agents that have never seen
  the skill, several times, and hands you the answers to score. Answered correctly unprompted means the
  rule is redundant; answered wrong means it is load-bearing; answered better means the rule is wrong.
  Run it when deciding whether to write or keep a rule, not to stay green. Read its header first — a
  situation that names the rule measures reading comprehension, which is how both previous behavioural
  suites here died.
- **Workflow-script syntax gate:** `bash scripts/check-workflow-syntax.sh <file.js>` — for
  `tests/probe.js` or any other Workflow script. Use it on every `.js` change.
- **Zip rebuild** (from repo root): `rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/`
  (`rm -f` first so a stale archive cannot retain deleted files).
- **Installed-copy sync:** `rsync -a --delete three-loop-workflow/ "$HOME/.claude/skills/three-loop-workflow/"`
  (`--delete` so removed files do not linger; a `cp -r` over an older version keeps every file the new
  one dropped, and the directory then holds both versions at once).

## Engineering Norms

- This repo distributes a Claude skill, not application code. Primary artifacts: Markdown, and the shell
  and Node scripts that gate it.
- **A check that cannot fail when the behavior is wrong is worse than no check** — it reads as coverage
  that does not exist. Before adding a gate, write the failing case first and watch it fail. If you cannot
  make it fail, do not write it — and do not reach for an agent-run fixture to cover what a mutation
  cannot, which is the move that produced two dead suites here.
- **Do not claim a script does something without testing that it does.** A v2 draft once shipped a claim
  that a bundled script rejected AI attribution in commit messages; the script contained no such check, and
  nobody had run it. State what you ran, not what you intended.
- **Anti-bloat binds every prose surface, not only the always-loaded one.** A reference is not free
  either: `accept-release.sh` carries a per-file backstop for `SKILL.md` and each reference, plus one on
  their total, and prints each count. Review is the mechanism, not the number — v1 reached 2,915 words
  under a numeric cap. Each backstop sits above the reviewed size as a guard against drift nobody looked
  at; the slack under it is not an allowance, and an addition that displaces nothing has to argue for
  itself in review. Do not quote a current count here; it is one line of the gate's own output
  (`bash scripts/accept-release.sh | grep backstop`). Two things are NOT answers to a red backstop:
  shaving synonyms to land under it, which is how the drifted two-reviewer paraphrase was produced, and
  raising it in the same commit as the growth. Re-review, then move the number in its own commit with the
  reason written into the gate beside it.
- `tests/probe.js` is a Workflow script, so it stays plain JavaScript — no TypeScript, no `Date.now()`,
  no `Math.random()`, no argless `new Date()`. `scripts/check-workflow-syntax.sh` fails on all four and on
  a missing `export const meta`; `node --check` mis-parses these `export` + top-level-`return` files and
  cannot gate them. The syntax gate checks nothing about the logic.
- **A rule has one home.** A second file may point at it by name; it may not restate it. Two copies of a
  rule are two things to keep in sync, and the drift is silent — the shipped two-reviewer justification
  said "cut the misses by roughly half" for months against a record that said two-thirds, because the
  sentence had been rewritten in one of its two homes. `SKILL.md` wins every tie: it is always loaded,
  so a reference restating it is pure duplication.
- **Reasons stay out of shipped text.** A plan gives each rule its reason — evidence, argument, file:line
  and memory citations, model names — for the plan's reviewers. None of it ships; the skill states the
  rule. `lint-skill.sh` fails on the forms those reasons take.
- Commit messages: conventional prefixes, no mention of AI involvement, model names, or tooling.
- Rename or add a section here only together with the anchor map above and the gate's heading check
  (`grep -n 'role heading' scripts/accept-release.sh`).
