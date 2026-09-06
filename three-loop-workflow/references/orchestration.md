# Orchestration

Read this when you are running **more than one writer at a time**, or driving the Build loop as a
**script**. Neither is part of an ordinary change: `build.md` is the whole loop, and for a single
Standard change running it by hand is cheaper than orchestrating it.

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
| `reviewers` | an explicit count, which **wins** over what `depth` implies. `depth: 'deep', reviewers: 1` is the documented choice on a **reversible** Deep phase — `build.md` buys the second reviewer where the phase is hard to undo — and the script logs the cost of the default so it is visible at the call site. The override is logged too, and the result reports both |
| `branch` | optional, authoritative when given — the branch the phase commits on |
| `repoPath` | absolute path to the repository under test. Omittable **only** when the agents already start there |
| `maxRounds` | optional, default 3 — bounds fixes **spent**, not verifications. Raising it raises the cap the rest of the skill states as three, so record why in the plan |
| `behaviorCheck` | **required** — the user-visible path to drive, in enough detail for an agent that has not read the code, or `{ read: "the files, in the order a new user meets them" }` where what this phase produces is **read** rather than run, or `false` if a person will never click, type or call it. A fresh agent drives or reads it beside the reviewers; observations that contradict the plan become findings and go through triage, and asked-for-but-not-runnable returns `behavior-unverified` rather than closing. Required rather than optional for the reason `depth` is: a stage that silently does not run is the defect |
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

**The gates are run by an agent.** Same cause: a Workflow script can dispatch agents and shape control flow — `agent()`, `parallel()`, `pipeline()`, `phase()`, `log()`, `workflow()` — and it has no shell, so it cannot run your test command itself. It sends an agent to run the commands and report exit codes and tallies. That still buys the ordering the loop needs — gates precede every reviewer, and a red build never spends a review — and the agent judges nothing.

`all_pass` is a judgement; the tally reported beside it is data, and where they disagree the script believes the data: green with a failing test in its own tally, or with nothing passed and everything skipped, stops the phase instead of dispatching reviewers. What remains uncheckable is a gates agent that reports green on a red build **and fabricates the tally to match**. If that matters more than the orchestration does, run the gates yourself and pass the phase a command that has already gone green.

**What it does not do, by decision rather than by omission.** The implementer commits before the gates run, so gate output cannot land in *that* commit's trailers — record them yourself, or on the fix commits; moving the commit after the gates would mean amending, which changes the sha every guard here is tracking. Non-blocking findings are accumulated and returned, not triaged: "fix the cheap and correct ones" is a scope judgment, and handing it to an agent is how scope creep gets automated. Gate-driven and review-driven fix rounds share one budget, because the cap is per phase and splitting it would change a documented rule — they are reported separately (`gateFixes`, `reviewFixes`, `exhaustedBy`) so an escalation can say which one spent it.

## What comes back, and what to do with it

Switch on `status`. Only `closed` continues the run; every other value is a stop, and each returns what the round already paid for — findings, rejections, `agentsDispatched`.

| `status` | What it means | Next |
|---|---|---|
| `closed` | gates green, no confirmed blocking finding, behavior check ran | Chain `headSha` into the next phase's `baseSha` |
| `cap-exhausted` | the fix budget is spent and findings remain | Escalate with `unresolved` and `exhaustedBy` (`references/escalation.md`) |
| `no-progress` | a review-driven fix round changed the code and not the confirmed findings, with budget left | Escalate now — the remaining rounds buy nothing the deadlock report does not already have |
| `behavior-unverified` | the check was asked for and could not be run or read | Drive it somewhere safe and cheap, or fix what blocked it; do not close on the gates |
| `triage-incomplete` | triage ruled on some findings and not others | Rule on `untriaged` yourself, then re-run the phase |
| `usage-error` | an argument is missing or the wrong shape | Fix the call. Nothing was dispatched |
| `agent-error` | a stage did not return, or a guard fired — an empty diff, a wrong branch, a no-op fix round | Read `stage` and `reason`; it is an infrastructure or environment fault, not a verdict on the change |
| `plan-conflict` | the implementer found the plan contradicting the code | Resolve it in the plan (`references/plan.md`, Conflicts), then re-run |
| `write-escalation` | the implementer was blocked twice | Its `concerns` say what is in the way |

Use it when a Deep change has several phases — the scope this file's opening states.
