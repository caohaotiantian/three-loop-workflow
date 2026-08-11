# Build

One cycle: **write → gates → review → fix**. At Deep depth, one cycle per phase.

Capture `baseSha = git rev-parse HEAD` **before editing anything**. The reviewer needs it and you cannot reconstruct it later.

**At Deep depth, `baseSha` advances with each phase.** Capture it once before phase 1, then before each
later phase re-capture it from the previous phase's last commit. One fixed base for the whole change
means phase 3's reviewer also sees phases 1 and 2, correctly reports them as work outside this phase's
Goal, and you spend a fix round arguing with a correct review. This holds whether you run the loop by
hand or through `scripts/phase.js` (`references/orchestration.md`).

## Write

Follow the plan's phase task list. Tests first where the project practises TDD — and where you write a test for new behavior, watch it fail before you make it pass. A test that never failed has not been shown to test anything.

Before you hand off to review, read your own diff once and remove: anything not traceable to the Goal or a recorded Decision, abstractions used once, and comments that narrate the process rather than explain the code. This self-pass is free and does not replace the review.

If the plan conflicts with what you find in the code, stop and say so. Do not decide unilaterally and do not paper over it — go fix the plan.

**Commit before you leave this step.** The review reads `git diff <baseSha>..HEAD`, and work still sitting in your working tree is outside that range — the reviewer gets an empty diff and reports nothing wrong with a change it cannot see, which reads exactly like a clean review. Fix rounds already commit here (see Fix); this is the same point in the first pass through.

## Gates

Run the project's mechanical checks from the project guide's _common-commands_: typecheck, lint, build, tests. Run them yourself, in this session, and paste the real output.

- Do this **before** spawning a reviewer. Reviewing code that does not compile wastes a subagent on defects the compiler already found.
- A recalled result is not a result. Re-run and paste this run's output.
- Exit 0 with every test skipped is not a pass. Check the tally, not just the code.

Record the gate output as commit trailers. The work is already committed by the time these run, so put them on the next commit — or amend, which is safe by hand because nothing here is tracking the sha. A clean pass that ends with no further commit is exactly the case that needs the amend. `scripts/phase.js` cannot amend, because its guards track that sha, so it records on the fix commits instead (`references/orchestration.md`).

**If you add a gate, write its failing case first and watch it fail.** A check that cannot fail when the behavior is wrong is worse than none. This skill's own v1 shipped one: a script that grepped for the words naming each rule, and passed cleanly after a rule had been replaced with its exact opposite. Presence of a word is not presence of a rule. If you cannot make a check fail, write a scenario instead.

**Check what kind of thing you are gating.** A pattern can hold *prose* — the presence of a sentence is the property you want, and a grep is the right instrument. It cannot hold a *claim*: nothing separates "the script detects X" from "the script does not detect X" without also rejecting the true sentences a writer is entitled to make about X. If you find yourself adding one more counter-example to a regex, stop. That check does not converge, and the rounds you spend on it come out of the budget for the change.

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

Nor is a second *independent* reviewer the same thing as double-checking your own work. Re-reading your own reasoning adds nothing; a reader who never saw it finds much of what you missed.

**Closure is computed from `blocking_count`, not from the reviewer's prose.** A reviewer that writes "looks good overall" while listing a blocking issue has not passed. Read the counts.

Ask for everything and triage yourself. A reviewer told to be conservative reports less — including real defects.

## Triage

**Do not fix a finding you have not confirmed.** Take each blocking finding and check it against the code it cites. Keep it only if the defect is really there.

Reject a finding when it misreads the code, attacks something the code does not do, describes a real property that is not a problem, or dissolves once you read the surrounding lines. When you are torn, look again rather than fixing defensively — a fix applied to a non-defect is a change with no reason behind it, and the next reviewer will ask why it exists.

This step is not optional bookkeeping. Measured on this repo's own review output, blind adversarial checking rejected a large share of what reviewers reported — including a substantial fraction of the findings they graded *blocking*, which are the ones you are most tempted to fix on sight. A reviewer asked to report everything will report things that are not there; that is the trade you made to get its recall up, and triage is where you pay it back.

**The confirmed count is what closes the phase**, not the reported one. Skipping triage means a phantom finding consumes a fix round and can exhaust the round cap on code that was already correct.

Record rejections briefly — one line each, saying what the finding claimed and what the code actually does. That record is what stops the same phantom coming back next round.

**Put it where it outlives the round.** Running by hand, that is the task's `.agent/<task>/` directory, beside the plan; `scripts/phase.js` carries the rejections in the phase result instead. A rejection recorded only in the current turn's output is gone at the next compaction, and then the phantom returns to a reviewer with nothing to contradict it.

A rejection outlives the round; some of what you learn outlives the *task*. A trap that cost you an hour, an idea you rejected for a reason that will still hold next time, a claim in the project guide the repo contradicts — those go in `.agent/<task>/journal.md`, and `references/maintenance.md` is what folds them into the guide later. Do not detour to fix the guide now.

**Never a summary of what you did.** The commits already carry that, and a journal that accumulates it becomes the per-task archive this skill deleted. Running through `scripts/phase.js`, the same applies: the script returns the rejections, and anything worth keeping past the change still has to be written down by you.

## Fix

Fix confirmed blocking findings. Triage non-blocking ones the same way: fix the cheap and correct ones, and for the rest say plainly what you are not doing and why.

Name the root cause before you edit — `item X is caused by Y` — and change that cause. One at a time.

**A fix round repairs what the review found. New machinery is new work.** If the repair suggests a check, a harness or a guard that does not exist yet, name it and raise it — do not build it here. Machinery added mid-fix arrives unreviewed, so the next round reviews *it* rather than the change: the confirmed count stops falling, the diff keeps growing, and the cap fires on scaffolding nobody planned. Adding the gate can be right. Deciding to add it mid-fix is not. This is the same judgment the Gates step asks for, arriving at the worst moment to make it — under budget pressure, on a defect you have just been shown.

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

## Parallel work

Phases run sequentially and share one working tree; `scripts/phase.js` assumes exactly that. **A branch name is not isolation** — two writers in one checkout overwrite each other's files, and the second one's diff will contain the first one's work.

If you deviate from that and run writers concurrently — parallel phases, an agent team, two experiments at once — give each writer its own worktree, and run that writer's gates inside it. Gates are not read-only: they leave build output, caches and coverage data behind.

Where to put a worktree, and the four things that bite: `references/orchestration.md`.

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

If a *different* item failed each round, the cap is firing on a planning defect rather than a local bug. Say so in the escalation and point at the plan.

If the **fix kept growing**, look at the fix step before you blame the plan. A fix round that adds a check, a harness or a guard has started a second change inside the first, and the next round reviews *that* — so the count stops falling while the diff grows, on a plan that may be perfectly sound. Measured on this repository's own reference material: the same plan, run repeatedly, both converged and did not, and what separated the runs was whether the fix step built machinery. `escalation.md` has the remedy.

## Behavior check

When the change is externally observable — a UI surface, a CLI command, an endpoint, user-visible output — run it and watch it work. Green unit tests are not a working feature.

A fresh subagent that did not write the change drives the new path and reports what it observed against the plan's Accept criteria. Observed behavior that does not match is a blocking finding, not a note.

Skip this for internal refactors, test-only changes, and doc updates.

## Running this loop as a script

On Claude Code, `scripts/phase.js` runs the whole cycle deterministically — round counting, closure arithmetic and role isolation become code instead of instructions. Its arguments, the multi-phase chaining loop, and what it does and does not guarantee: `references/orchestration.md`.

Use it when a Deep change has several phases. For a single Standard change, running the loop by hand is cheaper than orchestrating it.
