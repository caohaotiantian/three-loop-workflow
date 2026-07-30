# Build

One cycle: **write → gates → review → fix**. At Deep depth, one cycle per phase.

Capture `baseSha = git rev-parse HEAD` **before editing anything**. The reviewer needs it and you cannot reconstruct it later.

**At Deep depth, `baseSha` advances with each phase.** Capture it once before phase 1, then before each
later phase re-capture it from the previous phase's last commit. One fixed base for the whole change
means phase 3's reviewer also sees phases 1 and 2, correctly reports them as work outside this phase's
Goal, and you spend a fix round arguing with a correct review. This holds whether you run the loop by
hand or through `scripts/phase.js` (see Workflow mode).

## Write

Follow the plan's phase task list. Tests first where the project practises TDD — and where you write a test for new behavior, watch it fail before you make it pass. A test that never failed has not been shown to test anything.

Before you hand off to review, read your own diff once and remove: anything not traceable to the Goal or a recorded Decision, abstractions used once, and comments that narrate the process rather than explain the code. This self-pass is free and does not replace the review.

If the plan conflicts with what you find in the code, stop and say so. Do not decide unilaterally and do not paper over it — go fix the plan.

## Gates

Run the project's mechanical checks from the project guide's _common-commands_: typecheck, lint, build, tests. Run them yourself, in this session, and paste the real output.

- Do this **before** spawning a reviewer. Reviewing code that does not compile wastes a subagent on defects the compiler already found.
- A recalled result is not a result. Re-run and paste this run's output.
- Exit 0 with every test skipped is not a pass. Check the tally, not just the code.

Record the gate output as commit trailers.

**If you add a gate, write its failing case first and watch it fail.** A check that cannot fail when the behavior is wrong is worse than none. This skill's own v1 shipped one: a script that grepped for the words naming each rule, and passed cleanly after a rule had been replaced with its exact opposite. Presence of a word is not presence of a rule. If you cannot make a check fail, write a scenario instead.

## Review

**Standard: one reviewer. Deep: two, in parallel, independent — union their findings.**

Each gets the diff and the plan — not your summary of the change, and not the whole skill. Send both the same prompt and do not let them see each other's output; the value comes from their independence.

Two is measured on design documents, where a second independent reviewer cut the misses roughly in half and surfaced a severe defect the first had missed in every document (see `plan.md`, "Why two"). Diffs are a friendlier target — the gates have already removed a whole class of defect before a reviewer looks — so a second reviewer buys less here than on a plan. Standard changes take one; Deep phases take two, because that is where an escaped defect is expensive.

```
Review the diff at `git diff <baseSha>..HEAD` against the plan at .agent/<task>/plan.md.
(At Deep depth <baseSha> is *this phase's* base, not the base of the whole change.)

Report everything you find, at any severity — I will triage. For each finding cite
file:line from the diff. Mark each one blocking or non-blocking:
blocking = wrong behavior, a broken contract, or work outside the plan's Goal.

Check specifically:
- Does every changed line trace to the Goal or a recorded Decision?
- Does anything land in the Non-goals?
- Does new behavior have a test, and did that test ever fail?
- Any comment narrating process (round numbers, review history, plan references)?

Return: {blocking: [...], nonblocking: [...], blocking_count, nonblocking_count}
Do not modify code.
```

**The author never reviews their own work** — bound to identity, not invocation. An agent that wrote the change cannot review it, whether the second role arrives by assignment, self-claim, or approval of its own plan.

**Closure is computed from `blocking_count`, not from the reviewer's prose.** A reviewer that writes "looks good overall" while listing a blocking issue has not passed. Read the counts.

Ask for everything and triage yourself. A reviewer told to be conservative reports less — including real defects.

## Triage

**Do not fix a finding you have not confirmed.** Take each blocking finding and check it against the code it cites. Keep it only if the defect is really there.

Reject a finding when it misreads the code, attacks something the code does not do, describes a real property that is not a problem, or dissolves once you read the surrounding lines. When you are torn, look again rather than fixing defensively — a fix applied to a non-defect is a change with no reason behind it, and the next reviewer will ask why it exists.

This step is not optional bookkeeping. Measured on this repo's own review output, blind adversarial checking rejected a large share of what reviewers reported — including a substantial fraction of the findings they graded *blocking*, which are the ones you are most tempted to fix on sight. A reviewer asked to report everything will report things that are not there; that is the trade you made to get its recall up, and triage is where you pay it back.

**The confirmed count is what closes the phase**, not the reported one. Skipping triage means a phantom finding consumes a fix round and can exhaust the round cap on code that was already correct.

Record rejections briefly — one line each, saying what the finding claimed and what the code actually does. That record is what stops the same phantom coming back next round.

## Fix

Fix confirmed blocking findings. Triage non-blocking ones the same way: fix the cheap and correct ones, and for the rest say plainly what you are not doing and why.

Name the root cause before you edit — `item X is caused by Y` — and change that cause. One at a time.

For a correctness bug, write the failing test first, then fix to green. For style, scope, or comment findings, no test is needed.

Commit fixes to the same branch, naming the failing item — a drive-by edit has nothing to name. Format: see Commits, below.

Then re-run the gates and re-review. The cycle ends when blocking count is zero and gates are green.

## Commits

**Derive the convention, don't impose one.** Before your first commit, read `git log --oneline -20` and match what is there — prefix style, capitalization, scope vocabulary, whether bodies are used. A repo whose history reads `[api] fix null deref` is not asking for `fix(api): …`, and an agent that "corrects" it has made the history worse while feeling helpful.

With no discernible convention, default to Conventional Commits: `<type>(<scope>): <summary>`, with a body explaining *why* when the change is not self-evident.

Whatever the format, two things hold:

- **The message names the phase and the item it addresses**, so it ties back to the plan. Under Conventional that is `fix(phase2): off-by-one in bucket refill`; under another convention, carry the same two facts in that convention's shape.
- **Gate output goes in the trailers** (see Gates, above).

**One logical change per commit.** The test: can this commit be reverted alone without taking something unrelated with it? That is what keeps `bisect` and `revert` usable.

**If the change breaks a published contract, stop and check your depth.** That is a Deep-tier trigger, and escalating it is `escalation.md`'s first row. Discovering it mid-build is normal; committing past it is not. Mark it however your convention marks breakage — Conventional uses `!` or a `BREAKING CHANGE:` footer.

## Parallel work and worktrees

Phases run sequentially and share one working tree; `scripts/phase.js` assumes exactly that. **A branch name is not isolation** — two writers in one checkout overwrite each other's files, and the second one's diff will contain the first one's work.

If you deviate from that and run writers concurrently — parallel phases, an agent team, two experiments at once — give each writer its own worktree, and run that writer's gates inside it. Gates are not read-only: they leave build output, caches and coverage data behind.

**Where to put them.** Outside the repository, grouped under one hidden sibling:

```
~/projects/
  myrepo/                     # main worktree
  .myrepo-worktrees/
    phase-2-ratelimit/
```

**Anchor the path to the repo root.** `git worktree add` resolves a relative path against your *current directory*, not the repository — so `../.myrepo-worktrees/x` run from `myrepo/src/` silently creates it **inside** the repo, and run from another worktree it nests one inside the other. Git creates the intermediate directories and exits 0 both times, so nothing warns you:

```bash
root=$(git rev-parse --show-toplevel)
git -C "$root" worktree add -b phase-2-ratelimit \
  "$root/../.$(basename "$root")-worktrees/phase-2-ratelimit"
```

Outside the repository is the property that matters: a worktree inside one lands in the index as an embedded-repo entry, and a worktree nested in a worktree confuses tooling. The leading dot is tidiness, not safety. For a throwaway spike, `$TMPDIR` is simpler still.

**What actually bites:**

- One branch per worktree — git refuses the same branch twice unless you force it.
- Remove with `git worktree remove <path>`, not `rm -rf`. If you already deleted the directory by hand, `git worktree prune` clears the stale metadata.
- Use `--detach` for throwaway work so you do not strand disposable branches.
- **Dependencies are not shared.** `node_modules`, virtualenvs and build caches are per-worktree and need reinstalling. On a large project that setup can exceed what parallelism saves — measure before assuming it is a win.

On Claude Code, the Workflow tool takes `isolation: 'worktree'` per agent and creates the worktree for you. It removes it again only if the agent left it **unchanged** — which is never true of the writers this option exists for, so a worktree holding real work is still yours to remove with `git worktree remove`. It costs a few hundred milliseconds and disk per agent, so reach for it when writers actually overlap — not by default.

## Diagnosis — when the cause is not obvious

Do not declare the cause obvious to save a round. That shortcut, under budget pressure, is what produces the "different thing broke each round" churn.

1. Generate **3–5 ranked, falsifiable hypotheses**. Each states a concrete prediction. If you cannot state what you would observe, it is a hunch, not a hypothesis.
2. Look for the **discriminating** evidence — the one observation that differs between your top two hypotheses. Let that pick the cause instead of confirming the first plausible one.

Anchoring on the first theory that fits is the most common debugging failure. If no hypothesis survives its discriminating test, escalate rather than shipping a guess.

## Flaky tests

If a failure passes on re-run with no code change, it is **non-deterministic** — a flake, not a regression in this diff.

Do not disable the test, loosen the assertion, add a retry, or raise a timeout to get a green bar. That fakes the signal and can bury a real intermittent bug.

Say the cause is non-deterministic, leave the test alone, and raise the flake as its own piece of work. The intermittent reproduction is itself the discriminating observation — you do not need a deterministic repro to call it.

A failure that reproduces every time stays a fix target.

## Round cap

Three fix rounds per phase, counted independently per phase. Hitting the cap escalates with a deadlock report (`references/escalation.md`). It never lowers the bar and never becomes a quiet round four.

If a *different* item failed each round, or the fix kept growing, the cap is firing on a planning defect rather than a local bug. Say so in the escalation and point at the plan.

## Behavior check

When the change is externally observable — a UI surface, a CLI command, an endpoint, user-visible output — run it and watch it work. Green unit tests are not a working feature.

A fresh subagent that did not write the change drives the new path and reports what it observed against the plan's Accept criteria. Observed behavior that does not match is a blocking finding, not a note.

Skip this for internal refactors, test-only changes, and doc updates.

## Workflow mode (Claude Code)

`scripts/phase.js` runs this loop as a deterministic script — round counting, closure arithmetic, and role isolation become code instead of instructions.

Four arguments are required, and no default changes how much review runs:

| Arg | What it is |
|---|---|
| `planPath` | **required** — `.agent/<task>/plan.md`; a shared path lets two tasks overwrite each other |
| `tasks` | **required** — the phase's task list, verbatim from the plan |
| `acceptCmds` | **required** — the commands whose exit codes decide the phase |
| `baseSha` | **required** — `git rev-parse HEAD` from before editing; *this phase's* base at Deep depth |
| `depth` | `'standard'` (one reviewer) or `'deep'` (two, parallel, unioned). **One of `depth` or `reviewers` must be present** |
| `reviewers` | `1` or `2`, accepted for callers written before `depth` existed. Passing both is an error if they disagree |
| `branch` | optional, authoritative when given — the branch the phase commits on |
| `maxRounds` | optional, default 3 — bounds fixes **spent**, not verifications |
| `phaseLabel` | optional, default `'phase'` — labels agents and logs, nothing else |
| `models` | optional per-stage model overrides: `{write, gates, review, triage, fix}` |

`depth` rather than a bare count is deliberate, and the reason is the one default that was dangerous: `reviewers` used to default to 1, so a Deep phase ran the Standard review by having the argument forgotten, with nothing in the result to show it. Now omitting both is a `usage-error`, and the returned object states the `depth` and `reviewers` it actually used.

**Chain multi-phase runs on the returned `headSha`.** Put yourself on one task branch before the first call; every phase commits to it in sequence, and passing `branch` makes that explicit rather than trusting the implementer's self-report. A closed phase returns the commit its review actually saw, and that becomes the next phase's `baseSha`:

```js
// A driver script — `workflow()` is callable from inside a Workflow script; `Workflow` is the tool
// the main agent calls, and the main agent does not execute JavaScript. Use the path where the skill
// is actually installed, which for a user-level install is
// ~/.claude/skills/three-loop-workflow/scripts/phase.js
let base = baseSha
for (const p of plan.phases) {
  const r = await workflow({ scriptPath: SKILL + '/scripts/phase.js' },
                           { ...p, planPath, baseSha: base, branch: 'my-task', depth: 'deep' })
  if (r.status !== 'closed') break        // escalate; do not start the next phase on a broken one
  base = r.headSha
}
```

Pass the same `baseSha` to every phase and phase 3's reviewer sees phases 1 and 2 as well — it will correctly report them as changes outside this phase's Goal, and you will spend a fix round arguing with it. One branch, an advancing base, one phase per review.

**What the script does that the manual path cannot.** It fails closed on an empty review. The gates step reports its own `git rev-parse HEAD`, and a head equal to the base — on any round, including a fix round that reset or dropped the phase's commits — stops the phase instead of handing a reviewer an empty range. A gates step that cannot report a usable head also stops the phase, rather than silently disabling the guards downstream of it.

Note what that does **not** do: it does not detect a fabricated sha. If the implementer reports a well-formed sha it never created, the reported value is discarded in favour of the real head and the phase reviews the real diff — the fabrication is made harmless, not visible. Resolving a sha in the repository needs a shell, which a Workflow script does not have.

**What it does not do.** The implementer commits before the gates run, so gate output cannot land in that commit's trailers — record them yourself, or on the fix commits. Non-blocking findings are accumulated and returned, not triaged; that step is still yours.

Use it when a Deep change has several phases. For a single Standard change, running the loop by hand is cheaper than orchestrating it.
