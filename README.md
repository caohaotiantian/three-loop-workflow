# three-loop-workflow

A disciplined workflow for non-trivial software changes, packaged as a portable Agent Skill (runs on Claude Code, Codex, and opencode).

中文版本 → [README-cn.md](./README-cn.md)

> **v3 is a ground-up rewrite and a breaking change from v2.** Replace the folder; do not copy into it.
> If you have v2 installed, read [Upgrading from v2](#upgrading-from-v2) first. What changed and why:
> [docs/why-v3.md](./docs/why-v3.md).

## What's in this repo

- **`three-loop-workflow/`** — a Claude skill that operationalizes the workflow. Drop this folder into Claude Code or Claude.ai and Claude will follow it on any non-trivial code change.

The skill is four Markdown files plus its `LICENSE`: `SKILL.md`, which is always loaded; `references/deep.md`, which only Deep work reads; `references/parallel.md`, which only work split across writers reads; and `references/writing.md`, which is read before any English is written. They are the single source of truth.

## What's new

**v3.2.0** separates implementation from orchestration.
See [CHANGELOG.md](./CHANGELOG.md) for the changes.

[**Why v3**](./docs/why-v3.md) — what v3.0.0 cut, what it kept and on what evidence, and what nobody
has measured.
[**Is three fix rounds the right cap?**](./docs/2026-07-31-round-cap-experiment.md) — pre-registered,
raw data committed, and the answer is that the cap was not the problem.
Release notes and full version history live in [CHANGELOG.md](./CHANGELOG.md).

History:
[**Announcing v2.0.0**](./docs/announcement-v2.0.0.md) and [**why v2 was rebuilt**](./docs/why-v2.md) —
the v1 → v2 rewrite, with the measurements.
[**What the v2.7.0 delegation guidance rested on**](./docs/analysis-2026-09-17-orchestration-evidence.md)
(retired in v3) — every source behind it, with its date, its grade, and what was left out.

## What is the three-loop workflow?

Most agentic coding failures share a pattern: rushing into implementation, picking silent defaults, skipping review. This workflow prevents those by making the work pass through three loops — and by making the *depth* of those loops proportionate to what the change can break.

| Loop | What it produces |
|---|---|
| **Plan** | Before the first edit: the Goal, the Non-goals you were tempted by, and **Accept** — the cheapest real evidence that would fail without the change. Decisions only at real forks. The plan is `.agent/<task>/plan.md`, one directory per task, committed with the change. An existing `.gitignore` entry for `.agent` stays |
| **Build** | build → evidence → **one** independent review → triage → fix, with the reviewer re-checking each fix; stop and ask when fixing stops converging |
| **Close** | the hand-off, in the change description: what the evidence actually showed, what could not be checked, who reviewed it, unfixed non-blocking findings and residual risk |

**Depth is chosen from the stakes, taking the lightest that fits.** The agent raises it on its own judgement, including when the build reveals a trigger; only you lower it, after the agent recommends its depth and shows what this change would skip and the failure left open. If you still insist, it follows and records that, and a hard constraint stays.

| Depth | When | What runs |
|---|---|---|
| **Direct** | An obvious small edit whose correctness is visible or covered by an existing check. Non-trivial behavior changes use Standard or Deep, even with tests. A changed default cannot be Direct | Make the change and run the checks. No plan or reviewer is required. Report checks and results in one line |
| **Standard** | The default for behavior changes | Plan → build → evidence → **one** independent review → triage → fix, scaled to the change: a one-line change gets a one-line plan and one short review |
| **Deep** | Only when a trigger fires: a breaking change to a contract consumed outside the repository; an irreversible effect outside the repository; a changed rule in a file the project treats as a contract; alternatives that commit to different structures | Standard, plus `references/deep.md`: Decisions written before choosing, a rollback, sourced external claims, an independent read of the plan, and Close checks, with a final whole-change review if it was built in phases — and the extras for the trigger that fired, including two reviewers for the first two triggers |

Five hard constraints are the only rules that are not defaults:

1. **A change above Direct requires independent review.** Use available independent reviewers first. For missing roles, follow the fallback in `SKILL.md` section 5. It uses complete artifacts and reports self-review separately. Stronger independence requirements still apply.
2. **Run the project's checks.** A check that could not be run is not a check that passed.
3. **The hand-off reports what was observed**, not what was intended.
4. **A change to who can reach what** — authentication, authorization, secrets, a new path for untrusted input — is never Direct.
5. **An action outside the repository that cannot be undone waits for you**: pushing to a shared branch, deploying, writing real data, sending anything.

Everything else is a default: the agent leaves one only for a stated reason, your project's guide overrides any of them, and the means are the agent's. Evidence is proportionate — **no new unit test is required by default**, and the skill names where one is the wrong check (UI rendering, wiring, configuration, thin calls to external services, one-off scripts, prose). Where a person clicks, types or calls the change, a context that did not write it drives that path.

## Use with a coordinator

Three-loop-workflow owns each assigned implementation, including its plan, changes, evidence, review, and repairs.
The implementer can be the parent or an assigned executor.
When Orchestrate coordinates work, it owns task allocation, dependencies, shared interfaces, integration ownership, and overall acceptance.
Execution mode and implementation depth remain separate. Direct execution does not remove required implementation gates.

Use the supplied implementation plan path and reference shared requirements.
Return artifact revisions, evidence, review state, and unresolved requests to the coordinator.
Request scheduling changes instead of recursively coordinating other tasks.
Without a coordinator, manage the change and required roles directly.

## When the skill applies

| Change type | Depth |
|---|---|
| New feature, behavior fix, optimization, refactor | Standard |
| A breaking change to a contract consumed outside the repository; an irreversible effect outside it — migrating persisted data, money, anything sent to a third party; a changed rule in a file the project treats as a contract; alternatives that commit to different structures | Deep |
| An obvious small edit whose correctness is visible or covered by an existing check, such as a typo fix | Direct |
| Reviewing a change you did not write, before it lands | review only — the same brief, with the change's description as the plan; triage, then the confirmed findings go to the author. You do not fix them |
| Questions about how existing code works, exploration with no code change | skill does not apply |

If no Deep trigger fires, Deep is wrong. One risky corner raises its own depth, never the whole change's depth.

## Installing the skill

The skill is **self-contained**: no plugins, hooks, scripts or named tools.
It assumes version control, project checks, and access to `references/deep.md` when a Deep trigger applies.
It uses independent review when available, with the fallback in `SKILL.md` section 5.
It requires user decisions for irreversible external actions and the repair stop conditions in section 6.

### Claude Code

```bash
# Project-level: applies only inside <your-repo>
mkdir -p <your-repo>/.claude/skills
cp -r three-loop-workflow <your-repo>/.claude/skills/

# User-level: applies across all projects
mkdir -p ~/.claude/skills
cp -r three-loop-workflow ~/.claude/skills/

# Confirm it landed at the right depth — if this file is missing, the skill will not activate
test -f ~/.claude/skills/three-loop-workflow/SKILL.md && echo installed
```

The `mkdir -p` matters. If `skills/` does not already exist — the normal state of a repo where Claude
Code has run but no skill was ever installed — `cp -r` copies the folder's *contents* into
`.claude/skills/`, putting `SKILL.md` one level too high. It exits 0 and nothing warns you; the skill
simply never activates.

Or package it as a single distributable `.skill` file:

```bash
# from the repo root (rm first so a stale archive can't keep already-removed files)
rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/
# produces three-loop-workflow.skill — a zip Claude Code recognizes
```

Tagged releases (`v*`) also ship a prebuilt `.skill`, attached to the GitHub release by
`.github/workflows/release.yml` — so you can download it instead of building locally.

### Claude.ai

Upload the packaged `.skill` file via the Skill management page.

### Cross-platform install (Claude Code / Codex / opencode)

The skill conforms to the agentskills.io open standard, so one canonical `three-loop-workflow/` folder runs on three runtimes:

| Runtime | Install location |
|---|---|
| **Claude Code** | `.claude/skills/` (project) or `~/.claude/skills/` (user) |
| **Codex** | `.agents/skills/` (or `$HOME/.agents/skills/`) |
| **opencode** | reads both `.claude/skills/` and `.agents/skills/` natively — no separate install |

Copying the folder into `.claude/skills/` and `.agents/skills/` covers all three.

## Upgrading from v2

**Replace the folder; do not copy over it.** Copying v3 over a v2 install overwrites `SKILL.md` and
leaves every other v2 reference and script in the directory. Nothing routes to them, but an agent that
greps the skill directory will still find them and read rules v3 retired.

```bash
# Claude Code, user-level — use the same form for a project-level or .agents/skills/ install
rsync -a --delete three-loop-workflow/ ~/.claude/skills/three-loop-workflow/
```

What you need to know:

- **Commit `.agent/<task>/plan.md` with the change,** one directory per task, so the history stays
  readable. If `.agent/` is already in `.gitignore`, leave that entry; the skill does not remove it.
- **An anchor map in your project guide is harmless and no longer read.** v3 reads the guide as prose,
  for its check commands and the files it treats as contracts.
- **Remove any instruction to run the skill's scripts.** v2 shipped `scripts/phase.js` and
  `scripts/check-workflow-syntax.sh` inside the skill; v3 ships no scripts, so a guide, wrapper or CI
  step that calls either from the installed skill will find nothing there.
- **The terms are unchanged.** Plan/Build/Close, Direct/Standard/Deep and blocking/non-blocking mean
  what they meant, narrowed: Deep's triggers are narrower, and Direct is decided by whether
  correctness is visible in the edit.

Staying on v2: `git checkout v2.7.0`, or download the `.skill` from the v2.7.0 release. It receives no
further changes.

## Upgrading from v1

The v1 → v2 note, kept for anyone still on v1. The rule was the same: **replace the folder; do not
merge into it.** v1 and v2 shared exactly two filenames — `SKILL.md` and `references/platforms.md` — so
copying v2 over a v1 install left the **other 18 v1 files** sitting in the directory
(`loop-1-design.md`, `l3-phase.js`, `check-consistency.sh`, and the rest). The `rsync --delete` above
clears them too; going from v1 straight to v3 is the same folder replacement.

- If your `settings.json` wired up v1's `validate-commit-msg.sh` as a commit hook, remove that entry — a
  hook pointing at a missing command fails on every commit.
- v1's terms map as L1/L2/L3/F → Plan/Build/Close, Full/Light/None → Deep/Standard/Direct, and
  severe/general → blocking/non-blocking.

v1 still exists at `git checkout v1.14.0`, or as the `.skill` on the v1.14.0 release. It receives no
further changes.

## Project setup (one-time per repo)

**There is nothing to do.** The skill reads the repository's project guide — `AGENTS.md`, `CLAUDE.md`, or both — as prose, for its check commands and the files it treats as contracts. Where the guide names none, the agent derives them from the repository — checks from the build config and CI, contracts from what is consumed outside the repository or persisted — and says what it inferred. A missing guide never means the checks are skipped.

Your guide overrides any of the skill's defaults, so a project that keeps plans in a fixed place, or wants its own review or security tools run, says so there. Tools you add supplement the independent review; they never replace it.

## Repository layout

```
.
├── three-loop-workflow/              The skill (the single source of truth)
│   ├── SKILL.md                      Always loaded: hard constraints, depth, plan, build, evidence,
│   │                                 review, fix and stop, hand-off
│   ├── references/
│   │   ├── deep.md                   Read only when a Deep trigger fires
│   │   ├── parallel.md               Read only when writers run at once
│   │   └── writing.md                Read before any English is written
│   └── LICENSE
├── scripts/
│   ├── accept-release.sh             The repository gate: recomputes every published figure and runs
│   │                                 everything below
│   ├── lint-skill.sh                 The shipped skill's prose properties: no runtime mechanism names,
│   │                                 no statistics, routing checked in both directions
│   ├── negative-test.sh              Breaks each check on a copy and requires it to notice
│   ├── check-workflow-syntax.sh      Parses a Workflow script (node --check cannot); gates probe.js
│   └── exp-analyse.mjs               Recomputes the round-cap experiment's figures from its raw data
├── tests/                            gate-fixtures/ for the syntax gate (deterministic, free), and
│                                     probe.js — an on-demand control-arm instrument for asking
│                                     whether a rule changes what a model does
├── docs/
│   ├── why-v3.md                     What v3 cut and kept, on what evidence, and what is unmeasured
│   ├── why-v2.md                     The long-form account of the v1 → v2 rebuild
│   ├── announcement-v2.0.0.md        The v2.0.0 release announcement
│   ├── 2026-07-31-round-cap-*.md     Does a document-shaped Deep change converge in three rounds?
│   ├── analysis-2026-09-17-*.md      What the v2.7.0 delegation guidance rested on (retired in v3):
│   │                                 every source with its date and a grade, and what was left out
│   ├── measurements/                 Pre-registration and raw artifacts, committed so the figures
│   │                                 can be recomputed rather than taken on trust
│   └── design/, implementation/      Frozen v1 per-task archive — historical, not current behavior
├── README.md                         this file
├── README-cn.md                      Chinese version
├── CHANGELOG.md                      Full version history
└── CHANGELOG-cn.md                   Chinese version history
```

## Iterating on the workflow

This skill is **load-bearing by its own definition**.
A rule change in a shipped skill file requires **Deep** under the third depth trigger.
Obvious spelling and formatting fixes can use Direct.
Deep requires decisions, rollback, independent plan review, and the Close checks in `references/deep.md`.
For rule changes, the cold read covers the complete affected rule surfaces.

If you are adding a rule to the discipline — or wondering whether one still earns its tokens — run the probe:

```
Workflow({ scriptPath: "tests/probe.js" })
```

It poses a situation to fresh agents that have never seen the skill, several times, and hands you the answers. Answered correctly unprompted means the rule is redundant with the model's own judgment. Answered wrong means it is load-bearing — the only positive result here. Answered *better* than the rule means the rule is wrong.

It is an instrument, not a gate: nothing asserts it stays green and it is deliberately not in CI. Read the header of `probe.js` before writing a situation. A situation that names the rule measures reading comprehension, and that is how both of this project's earlier behavioural suites died — the second of them, an eleven-fixture two-arm suite costing 23 agents a run, was deleted on 2026-08-11 after returning one bit.

The probe runs a control arm only, and that costs something worth naming: it cannot detect the skill making a capable model *worse* — a rule that pushes it away from a correct default. That was what the deleted suite's guards were for, and nothing replaces them. To ask that question you run both arms by hand and compare.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

v2's "excuses worth recognizing" table (in `references/escalation.md`, retired in v3.0.0) descended from the rationalization / red-flag table in the [superpowers](https://github.com/obra/superpowers) skill collection (Jesse Vincent, MIT), as does the anti-summary treatment of the always-loaded `description`, which v3 keeps.
