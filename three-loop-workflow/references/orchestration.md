# Orchestration

Read this when you are **handing implementation work to another agent**, running **more than one writer
at a time**, or driving the Build loop as a **script**. None of the three is part of an ordinary change:
`build.md` is the whole loop, and for a single Standard change running it by hand is cheaper than
orchestrating it.

## Spawn, or do it yourself

A fresh agent's cost is the **context it lacks** — delegation buys isolation and parallelism, not
understanding — so the control arm for any orchestration, hand-spawned or scripted, is **one agent with
a better prompt or a better model**. Run that comparison first.

Sources, read 2026-09-17: Anthropic's *Multi-agent research system* (2025-06-13), where a model upgrade
beat a larger budget on the weaker model; Cognition's *Don't Build Multi-Agents* (2025-06-12); *MAST*
(Cemri et al., 2025).

## Briefing a writer

This is the agent that **writes**; a reviewer's brief is `build.md` (Review) and `SKILL.md` §4.

The brief is what you control: your session and your reasoning are not inherited — unless you fork,
which inherits everything, including what you did not mean to hand over — and whatever a harness injects
is no substitute for it. Four things go in — the **objective**, the **output shape**, **what to read**
(the plan's path, the files), and the **boundaries**, meaning the plan's Non-goals plus what it may not
touch — along with the phase's `baseSha`, which you capture before spawning. Then three a writer gets
wrong unprompted:

- **Stay on the branch you are given**, in those words — otherwise a per-phase branch appears, and the
  next phase's review re-shows this phase's work.
- **Commit before returning**, for the reason `build.md`'s Write step gives.
- **Report the branch and head sha you finished on**, not "done".

Name the rest of that Write step rather than restating it: the self-pass over its own diff, stopping on
a plan conflict, and what it was blocked on or least sure of. Where a runtime prefers structure, make
all of it a schema: `scripts/phase.js` has its writer answer as fields, so "done" is not expressible. On
Claude Code that is the Workflow tool's `agent()`; with the Agent tool, prose.

## Verify the claim, not the report

"Done" is a claim about a repository. Confirm the reported sha equals `git rev-parse <branch>` — the
comparison is the check, since `git rev-parse` prints any well-formed sha back at you, and `git cat-file
-e <sha>` is the existence test — then require `git diff <baseSha>..<branch>` to be non-empty; name the
branch, not `HEAD`, because the writer may have worked in its own worktree. A failed check is this
phase's `agent-error`: re-brief, do not accept. Only by hand do you get the comparison at all — a
Workflow script has no shell (below).

## Two writers: divide, then land

**Partition by file ownership, and write the partition into the plan before you spawn anyone.** Two
writers on one file overwrite each other with no conflict marker to show it, and in one checkout the
second's diff contains the first's work — so each needs its own worktree, below. This is the
hand-spawned case throughout: the script runs a change's phases in sequence, in one tree.

Land the branches **one at a time**, and name an **integrator**: a third role, neither writer. Neither
writer's green covers the merge — each ran on a tree without the other's work — so the integrator runs
the gates again on the merged tree, fixes a red run there itself rather than handing it
back to a writer, and only then sends the merged diff through `SKILL.md` §4's review. That review's base
is the **merge target's head before the first branch landed**, not either writer's `baseSha`, and the
range must be non-empty (`close.md` owns that trap).

## The plan does not travel

The task directory reaches no worktree, clone or container (`SKILL.md` §2 says why), so an agent
starting in one reads `.agent/<task>/plan.md` there, finds nothing, and works from the brief alone.
**The main worktree's copy is authoritative**: hand the agent its absolute path, and copy the directory
in only where the agent cannot see the main tree at all — a container — copying nothing back.
Under the script that path is `planPath`, resolved where `repoPath` puts the agents; with the Agent tool
it is a line in the brief.

## Worktrees — one per concurrent writer

Phases share one working tree and a branch name is not isolation, so a writer running concurrently needs
its own worktree — and its own gate runs inside it, because gates are not read-only: they leave build
output, caches and coverage data behind.

**Look for a native mechanism before you hand-roll one.** A runtime may create the worktree for you —
per-agent inside an orchestrated run, per-session at launch, or for the session you are already in — and
where it does, the mechanics below are its problem rather than yours. Check the runtime, then read on
for the case where you are doing it by hand.

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

For a throwaway spike, `$TMPDIR` is simpler still.

**What actually bites:**

- One branch per worktree — git refuses the same branch twice unless you force it.
- Remove with `git worktree remove <path>`, not `rm -rf`. If you already deleted the directory by hand, `git worktree prune` clears the stale metadata.
- Use `--detach` for throwaway work so you do not strand disposable branches.
- **Dependencies are not shared.** `node_modules`, virtualenvs and build caches are per-worktree and need reinstalling. On a large project that setup can exceed what parallelism saves — measure before assuming it is a win.

On Claude Code, the Workflow tool takes `isolation: 'worktree'` per agent and creates the worktree for you. It removes it again only if the agent left it **unchanged** — which is never true of the writers this option exists for, so a worktree holding real work is still yours to remove with `git worktree remove`. It costs a few hundred milliseconds and disk per agent, so reach for it when writers actually overlap — not by default.

## Workflow mode — where the runtime can run a script

`scripts/phase.js` runs the Build loop as a deterministic script — round counting, closure arithmetic, and role isolation become code instead of instructions.

**Confirm the tool is there before you plan around it.** It is a Claude Code feature, it is not present in every session — a subagent's tool set is not the main session's, and a session can be configured to accept only named workflows and to refuse an arbitrary script path. Probe for it; where it is absent, `build.md` is the same loop by hand and nothing in the skill depends on the script.

Six arguments are required — `planPath`, `tasks`, `acceptCmds`, `baseSha`, `behaviorCheck`, and one of `depth`/`reviewers` — and no default changes how much verification runs:

| Arg | What it is |
|---|---|
| `planPath` | **required** — `.agent/<task>/plan.md`; a shared path lets two tasks overwrite each other |
| `tasks` | **required** — the phase's task list, verbatim from the plan: a string, or an array of strings. Checked for shape, because an array of task *objects* stringifies to `[object Object]` and the writer then receives that as its whole task list |
| `acceptCmds` | **required** — an **array** of non-empty command strings whose exit codes decide the phase: `["npm test", "npm run lint"]`. A bare string is a `usage-error`, and so is `[""]` |
| `baseSha` | **required** — `git rev-parse HEAD` from before editing; *this phase's* base at Deep depth. `build.md` explains why one fixed base for the whole change costs a fix round |
| `depth` | `'standard'` or `'deep'` — it selects the reviewer prompts and what the result reports, and `'deep'` runs two diff reviewers. **One of `depth` or `reviewers` must be present** |
| `reviewers` | an explicit count, which **wins** over what `depth` implies; the override is logged and the result reports both, and the script logs the cost of the default so the bill is visible at the call site. `depth: 'deep', reviewers: 1` on a **reversible** Deep phase is `SKILL.md` §4's call to make. More than 4 is a `usage-error` |
| `branch` | optional, authoritative when given — the branch the phase commits on |
| `repoPath` | absolute path to the repository under test. Omittable **only** when the agents already start there |
| `maxRounds` | optional, default 3 — bounds fixes **spent**, not verifications. Raising it raises the cap the rest of the skill states as three, so record why in the plan; more than 10 is a `usage-error` |
| `behaviorCheck` | **required** — the user-visible path to drive, in enough detail for an agent that has not read the code, or `{ read: "the files, in the order a new user meets them" }` where what this phase produces is **read** rather than run, or `false` if a person will never click, type or call it. A fresh agent drives or reads it beside the reviewers under `build.md`'s Behavior check rules; asked for and not runnable returns `behavior-unverified` below. Required rather than optional for the reason `depth` is: a stage that silently does not run is the defect |
| `phaseLabel` | optional, default `'phase'`. It labels agents and logs **and** is interpolated into the Write agent's instructions (`You are implementing <phaseLabel>`), so it is caller text an agent reads: a short name that matches the plan, single-line, or it is a `usage-error` |
| `models` | optional per-stage model overrides: `{write, gates, review, behavior, triage, fix}`. The largest unused cost lever here — gates is a shell proxy that judges nothing and runs happily on the cheapest model available, while review and triage are where capability pays |

Omitting both `depth` and `reviewers` is a `usage-error`: a count that defaulted to 1 let a Deep phase run the Standard review with nothing in the result to show it. The returned object states the `depth` and `reviewers` it actually used.

**Chain multi-phase runs on the returned `headSha`.** Put yourself on one task branch before the first call; every phase commits to it in sequence, and passing `branch` makes that explicit rather than trusting the implementer's self-report. A closed phase returns the commit its review actually saw, and that becomes the next phase's `baseSha`:

```js
// A driver script — `workflow()` is callable from inside a Workflow script; `Workflow` is the tool
// the main agent calls, and the main agent does not execute JavaScript. Use the path where the skill
// is actually installed, which for a user-level install is
// ~/.claude/skills/three-loop-workflow/scripts/phase.js
//
// Build the argument objects explicitly, as below. Spreading a phase straight out of your plan
// (`{ ...planPhase, ... }`) looks tidier and does not work: a plan's phase carries whatever fields you
// happened to write in it, so `tasks` arrives as objects, or with another name, or not at all.
const phases = [
  { phaseLabel: 'phase1', tasks: ['add the bucket', 'wire it into the middleware'],
    acceptCmds: ['npm test -- rate-limit'],
    behaviorCheck: 'start the server, send 61 requests in a minute, confirm the 61st returns 429 with Retry-After' },
  { phaseLabel: 'phase2', tasks: ['emit the X-RateLimit-* headers'], acceptCmds: ['npm test', 'npm run lint'],
    behaviorCheck: 'curl -i the endpoint and read the three headers back' },
]
let base = baseSha
for (const p of phases) {
  const r = await workflow({ scriptPath: SKILL + '/scripts/phase.js' },
                           { phaseLabel: p.phaseLabel, tasks: p.tasks, acceptCmds: p.acceptCmds,
                             behaviorCheck: p.behaviorCheck,
                             planPath, baseSha: base, branch: 'my-task', depth: 'deep',
                             repoPath: '/abs/path/to/your/repo' })
  if (r.status !== 'closed') break        // escalate; do not start the next phase on a broken one
  base = r.headSha
}
```

**Pass `repoPath` unless the agents already start in the repository.** Triage and Fix are built from a
branch name and a sha and nothing else, so without it an agent standing elsewhere searches the
filesystem, commits nothing, and the phase dies on the no-op-fix guard — a correct error three steps
downstream of its cause. Measured, not inferred.

**What the script does that the manual path cannot.** It fails closed on an empty review. The gates step reports its own `git rev-parse HEAD`, its own branch, and `git diff --numstat <base>..HEAD | wc -l`, and the phase stops on any round where the head equals the base *or* the diff is empty — the second is the one that catches a fix round that reverted or reset the phase's own commits, because that moves HEAD and sha equality sees nothing wrong. A gates step that cannot report a usable head, or a branch that is not a usable ref, stops it too, rather than silently disabling the guards downstream.

Note what that does **not** do: it does not detect a fabricated sha. If the implementer reports a well-formed sha it never created, the reported value is discarded in favour of the real head and the phase reviews the real diff — the fabrication is made harmless, not visible. Resolving a sha in the repository needs a shell, which a Workflow script does not have.

**Two more checks run every round, not only at the write step.** The wrong-branch check stops the phase
as an `agent-error`: a fix agent that strays leaves this branch unchanged, so without it the phase
grinds to `cap-exhausted` with nothing to say why. The gates' test tally is not an error — fewer tests
collected than an earlier round, more skipped, or no tally where one was reported before, each becomes a
**finding routed through triage**, because deleting an obsolete test is legitimate work. That routing
happens only on a round whose gates went green. A `closed` result carries the tally as `tests`, or a
note where no round reported one: a shrink check with no baseline is a guard that was off, not one that
passed.

**The gates are run by an agent.** Same cause: a Workflow script can dispatch agents and shape control flow — `agent()`, `parallel()`, `pipeline()`, `phase()`, `log()`, `workflow()` — and it has no shell, so it cannot run your test command itself. It sends an agent to run the commands and report exit codes and tallies. That still buys the ordering the loop needs — gates precede every reviewer, and a red build never spends a review — and the agent judges nothing.

`all_pass` is a judgement; the tally reported beside it is data, and where they disagree the script believes the data: green with a failing test in its own tally, or with nothing passed and everything skipped, stops the phase instead of dispatching reviewers. What remains uncheckable is a gates agent that reports green on a red build **and fabricates the tally to match**. If that matters more than the orchestration does, run the gates yourself and pass the phase a command that has already gone green.

**What it does not do, by decision rather than by omission.** The implementer commits before the gates run, so gate output cannot land in *that* commit's trailers — record them yourself, or on the fix commits; moving the commit after the gates would mean amending, which changes the sha every guard here is tracking. Non-blocking findings are accumulated and returned, not triaged: "fix the cheap and correct ones" is a scope judgment, and handing it to an agent is how scope creep gets automated. Gate-driven and review-driven fix rounds share one budget, because the cap is per phase and splitting it would change a documented rule — they are reported separately (`gateFixes`, `reviewFixes`, `exhaustedBy`) so an escalation can say which one spent it.

**Triage is a separate agent**, implementing `SKILL.md` §4's *triage before you fix, and before you
count* — and it rules on no work of its own. Handed the findings numbered, it may return only numbers
from that list, so a finding no reviewer raised is unrepresentable rather than discouraged. Rejections
carry a reason each. A triage that rules on nothing at all is an `agent-error`; a partial ruling stops
the phase as `triage-incomplete`, with the rest returned as `untriaged`.

## What comes back, and what to do with it

Switch on `status`. Only `closed` continues the run; every other value is a stop. `agentsDispatched` is on all of them; findings, rejections and `untriaged` only on the stops that got far enough to have them — `behavior-unverified`, `triage-incomplete`, `no-progress`, `cap-exhausted` — and an `agent-error` discards them.

| `status` | What it means | Next |
|---|---|---|
| `closed` | gates green, no confirmed blocking finding, behavior check ran | Chain `headSha` into the next phase's `baseSha` |
| `cap-exhausted` | the fix budget is spent and findings remain | Escalate with `unresolved` and `exhaustedBy` (`references/escalation.md`) |
| `no-progress` | a review-driven fix round changed the code and not the confirmed findings, with budget left | Escalate now — the remaining rounds buy nothing the deadlock report does not already have |
| `behavior-unverified` | the check was asked for and could not be run or read | Drive it somewhere safe and cheap, or fix what blocked it; do not close on the gates |
| `triage-incomplete` | triage ruled on some findings and not others | Rule on `untriaged` yourself, then re-run the phase |
| `usage-error` | an argument is missing or the wrong shape | Fix the call. Nothing was dispatched |
| `agent-error` | a stage did not return, or a guard fired — an empty diff, a wrong branch, a no-op fix round | Read `stage`, which is always set, and `reason` where a guard wrote one; it is an infrastructure or environment fault, not a verdict on the change |
| `plan-conflict` | the implementer found the plan contradicting the code | Resolve it in the plan (`references/plan.md`, Conflicts), then re-run |
| `write-escalation` | the implementer was blocked twice | Its `concerns` say what is in the way |

