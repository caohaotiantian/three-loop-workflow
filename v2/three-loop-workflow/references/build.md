# Build

One cycle: **write → gates → review → fix**. At Deep depth, one cycle per phase.

Capture `baseSha = git rev-parse HEAD` **before editing anything**. The reviewer needs it and you cannot reconstruct it later.

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

## Review

**Standard: one reviewer. Deep: two, in parallel, independent — union their findings.**

Each gets the diff and the plan's Goal / Non-goals / Accept — not your summary of the change, and not the whole skill. Send both the same prompt and do not let them see each other's output; the value comes from their independence.

Two is measured on design documents, where a second independent reviewer added ~45% more defects including one blocker per document (see `plan.md`, "Why two"). Diffs are a friendlier target — the gates have already removed a whole class of defect before a reviewer looks — so a second reviewer buys less here than on a plan. Standard changes take one; Deep phases take two, because that is where an escaped defect is expensive.

```
Review the diff at `git diff <baseSha>..HEAD` against the plan at .agent/plan.md.

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

This step is not optional bookkeeping. Measured on this repo's own review output, blind adversarial checking rejected **30–50% of findings graded blocking** and **54–70% of lower-severity findings**. A reviewer asked to report everything will report things that are not there; that is the trade you made to get its recall up, and triage is where you pay it back.

**The confirmed count is what closes the phase**, not the reported one. Skipping triage means a phantom finding consumes a fix round and can exhaust the round cap on code that was already correct.

Record rejections briefly — one line each, saying what the finding claimed and what the code actually does. That record is what stops the same phantom coming back next round.

## Fix

Fix confirmed blocking findings. Triage non-blocking ones the same way: fix the cheap and correct ones, and for the rest say plainly what you are not doing and why.

Name the root cause before you edit — `item X is caused by Y` — and change that cause. One at a time.

For a correctness bug, write the failing test first, then fix to green. For style, scope, or comment findings, no test is needed.

Commit fixes to the same branch: `fix(<phase>): <the failing item>`. The message names a real finding; a drive-by edit has nothing to name.

Then re-run the gates and re-review. The cycle ends when blocking count is zero and gates are green.

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

`scripts/phase.js` runs this loop as a deterministic script — round counting, closure arithmetic, and role isolation become code instead of instructions. Invoke it with the phase label, plan path, and accept commands. See the header comment in that file.

Use it when a Deep change has several phases. For a single Standard change, running the loop by hand is cheaper than orchestrating it.
