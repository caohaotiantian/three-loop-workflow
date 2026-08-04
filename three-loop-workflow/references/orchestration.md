# Orchestration

Read this when you are running **more than one writer at a time**, or driving the Build loop as a
**script**. Neither is part of an ordinary change: `build.md` is the whole loop, and for a single
Standard change running it by hand is cheaper than orchestrating it.

## Worktrees — one per concurrent writer

`build.md` ("Parallel work") carries the rule: phases share one working tree, a branch name is not
isolation, and a writer running concurrently needs its own worktree with its own gate runs. This is where
to put them and what bites.

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

## Workflow mode (Claude Code)

`scripts/phase.js` runs the Build loop as a deterministic script — round counting, closure arithmetic, and role isolation become code instead of instructions.

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
| `repoPath` | absolute path to the repository under test. Omittable **only** when the agents already start there |
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
                           { ...p, planPath, baseSha: base, branch: 'my-task', depth: 'deep',
                             repoPath: '/abs/path/to/your/repo' })
  if (r.status !== 'closed') break        // escalate; do not start the next phase on a broken one
  base = r.headSha
}
```

**Pass `repoPath` unless the agents already start in the repository.** The Write and Review prompts name
`planPath`, so an absolute plan gives those two agents something to find the tree with. Triage and Fix
are built from a branch name and a sha and nothing else. Without `repoPath` an agent standing elsewhere
searches the filesystem, commits nothing, and the phase dies on the no-op-fix guard — a correct error
three steps downstream of the cause. Measured, not inferred.

Pass the same `baseSha` to every phase and phase 3's reviewer sees phases 1 and 2 as well — it will correctly report them as changes outside this phase's Goal, and you will spend a fix round arguing with it. One branch, an advancing base, one phase per review.

**What the script does that the manual path cannot.** It fails closed on an empty review. The gates step reports its own `git rev-parse HEAD`, and a head equal to the base — on any round, including a fix round that reset or dropped the phase's commits — stops the phase instead of handing a reviewer an empty range. A gates step that cannot report a usable head also stops the phase, rather than silently disabling the guards downstream of it.

Note what that does **not** do: it does not detect a fabricated sha. If the implementer reports a well-formed sha it never created, the reported value is discarded in favour of the real head and the phase reviews the real diff — the fabrication is made harmless, not visible. Resolving a sha in the repository needs a shell, which a Workflow script does not have.

**The gates are run by an agent, and `all_pass` is the one report nothing cross-checks.** Same cause: a Workflow script has `agent()`, `parallel()`, `phase()` and `log()`, so it cannot run your test command itself. It sends an agent to run the commands and report exit codes and tallies. That still buys the ordering the loop needs — gates precede every reviewer, and a red build never spends a review — and the agent judges nothing. But note the asymmetry with the sha beside it: `headSha` is checked against the base and against the previous round's head, so a wrong one stops the phase, whereas a gates agent that reports green on a red build is believed. If that matters more than the orchestration does, run the gates yourself and pass the phase a command that has already gone green.

**What it does not do, by decision rather than by omission.** The implementer commits before the gates run, so gate output cannot land in *that* commit's trailers — record them yourself, or on the fix commits; moving the commit after the gates would mean amending, which changes the sha every guard here is tracking. Non-blocking findings are accumulated and returned, not triaged: "fix the cheap and correct ones" is a scope judgment, and handing it to an agent is how scope creep gets automated. Gate-driven and review-driven fix rounds share one budget, because the cap is per phase and splitting it would change a documented rule — they are reported separately (`gateFixes`, `reviewFixes`, `exhaustedBy`) so an escalation can say which one spent it.

Use it when a Deep change has several phases — the scope this file's opening states.
