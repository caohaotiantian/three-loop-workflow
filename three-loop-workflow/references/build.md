# Build

One cycle: **write → gates → review → triage → fix**, at Deep depth one cycle per phase. The behavior
check runs **beside the review**, on the same green build, and its observations are triaged with the
reviewers' findings.

## Contents
Before you start · Write · Gates · Review (+ Purpose-built reviewers) · Behavior check · Triage · Fix ·
Commits · Parallel work · The journal · Diagnosis · Flaky tests · Round cap · Running this loop as a
script

## Before you start

Capture `baseSha = git rev-parse HEAD` **before editing anything**, and write it into the plan. The reviewer's first tool call needs it, and after a compaction the plan is all you have. Recovering it later is possible but fiddly and easy to get silently wrong — `close.md` has the procedure and the traps; capturing it costs one command.

**At Deep depth, `baseSha` advances with each phase** — re-capture it from the previous phase's last
commit, and **keep the phase-1 value** in the plan, because Close diffs the whole change against it
(`close.md`). One fixed base for every phase means phase 3's reviewer also sees phases 1 and 2,
correctly reports them as outside this phase's Goal, and you spend a fix round arguing with a correct
review.

**Be on a branch before you capture it.** This loop commits before it reviews, so on a checkout sitting on the default branch every fix round lands there unreviewed, and a phase that hits the cap escalates against a branch already carrying the failure. `git switch -c <task>` costs nothing. If the repository's convention really is to work on the default branch, say so in the plan rather than discovering it at Close.

**In a repository with no commits yet**, `git rev-parse HEAD` exits 128 and there is no sha to capture. Use the empty-tree object `4b825dc642cb6eb9a060e54bf8d69288fbee4904`, which diffs correctly against a working tree, or make an empty initial commit and use that.

## Write

Follow the plan's phase task list. Tests first where the project practises TDD — and where you write a test for new behavior, watch it fail before you make it pass. A test that never failed has not been shown to test anything.

Before you hand off to review, read your own diff once against `SKILL.md`'s Working rules and remove what fails them. This self-pass is free and does not replace the review.

If the plan conflicts with what you find in the code, stop and say so. Do not decide unilaterally and do not paper over it — go fix the plan.

**Commit before you leave this step.** The review reads `git diff <baseSha>..HEAD`, and work still sitting in your working tree is outside that range — the reviewer gets an empty diff and reports nothing wrong with a change it cannot see, which reads exactly like a clean review. Fix rounds already commit here (see Fix); this is the same point in the first pass through.

## Gates

Run the project's mechanical checks from the project guide's _common-commands_, in this session, and paste the real output. A recalled result is not a result, and exit 0 with every test skipped is not a pass.

Record the gate output as commit trailers. The work is already committed by the time these run, so put them on the next commit — or, on a clean pass that ends with no further commit, amend the last one.

**An amend does not move this phase's `baseSha`.** It rewrites HEAD, not HEAD's parent, so the base the reviewer diffs from is untouched — leave the plan's value alone. Re-capturing it here would point it at the commit you just amended and hand the reviewer the empty diff that Write warns about. What an amend *does* move is the **next** phase's base at Deep depth: capture that after the amend, never before. `scripts/phase.js` cannot amend for the same reason — it returns that sha to its caller mid-run — and records no trailers at all, so under the script they are yours to add afterwards.

**If you add a gate, write its failing case first and watch it fail.** A check that cannot fail when the behavior is wrong is worse than none, because it reads as coverage that is not there — presence of a word is not presence of a rule. If you cannot make a check fail, do not write it, and do not reach for an agent-run fixture to cover what a mutation cannot.

**Check what kind of thing you are gating.** A pattern can hold *prose* — the presence of a sentence is the property you want, and a grep is the right instrument. It cannot hold a *claim*: nothing separates "the script detects X" from "the script does not detect X" without also rejecting the true sentences a writer is entitled to make about X. If you find yourself adding one more counter-example to a regex, stop. That check does not converge, and the rounds you spend on it come out of the budget for the change.

## Review

**Standard: one reviewer. A Deep phase: two where that phase is hard to undo, one elsewhere — in parallel, independent, findings unioned.**

Each gets the diff and the plan — not your summary of the change, and not the whole skill. Do not let them see each other's output; the value comes from their independence.

The case for two was made on **plans** (`plan.md`, "Why two"), and a Deep *plan* always gets two. A diff is a friendlier target — the gates have already removed a whole class of defect before a reviewer looks — so the second reader buys less here, and is worth paying for where the phase itself is a migration, a contract, or anything that reaches production before the next phase lands. Say in the plan which phases got two.

```
Review the diff at `git diff <baseSha>..HEAD` against the plan at .agent/<task>/plan.md.
(At Deep depth <baseSha> is *this phase's* base, not the base of the whole change.)
Your FIRST tool call is that git diff — review the diff, not any summary of it.

Report everything you find, at any severity — I will triage. For each finding cite
file:line from the diff. Mark each one blocking or non-blocking:
blocking = wrong behavior, a broken contract, or work outside the plan's Goal.

Check specifically, in this order:
- What does this do on the inputs it does not expect — absent, empty, malformed,
  at the boundary, out of order, concurrent, or far larger than the happy path?
  Name the case and what happens.
- What happens when something this change calls FAILS — a raised exception, a
  non-2xx, a timeout, a null return? Name each error path and say what the caller
  observes. Flag any error swallowed, logged-and-continued, or returned as a
  success shape.
- Which facts about code OUTSIDE this diff does the change assume — a method that
  exists, a config key, a parameter's meaning, a return shape, an ordering
  guarantee? Name each and say whether you confirmed it in the repository or
  could not.
- If the diff touches untrusted input, authentication, authorization, secrets,
  file paths, subprocess or shell invocation, query construction, deserialization,
  or anything sent to a third party: what is the worst a hostile input can make it
  do? Skip this line if it touches none of them.
- Does the diff weaken the existing tests — an assertion removed or loosened, a
  case skipped or marked expected-to-fail, a selector narrowed, a timeout raised,
  a retry added? Quote the removed lines. Deleting a test can be correct; doing it
  in the same change that had to pass is the case to flag.
- Does new behavior have a test that would fail without this change? Name the line
  of the diff that makes it pass. A test that passes with the change reverted is
  testing nothing.
- Does every changed line trace to the Goal or a recorded Decision, and does
  anything land in the Non-goals?
- Does the PLAN look wrong — an Accept that cannot fail, a Goal that does not
  match what was asked, a Decision with one option? A diff that conforms to a
  wrong plan passes every other question here.

If the diff contains generated or non-text artefacts — notebooks, lockfiles,
snapshots, minified output — say so and read the source form instead (a notebook's
cells, the manifest the lockfile was generated from). A diff you cannot read is not
a diff you reviewed.

Return: {blocking: [...], nonblocking: [...], blocking_count, nonblocking_count}
Do not modify code.
```

**The order is the point.** A directed question dominates a reviewer's attention, and the top of the list gets most of it — so the questions that ask whether the code is *wrong* come before the ones that ask whether it is *in scope*.

At Deep depth, give the two reviewers the same list and a **different closing line**:

- *Reviewer 1* — "Read as an adversary hunting a case that breaks it: assume the change is wrong somewhere and find where."
- *Reviewer 2* — "After that diff, run `git log -p -20` on the paths it touches and read how the code got here. Then read as the person who maintains it next year: assume the change works today, and find what it will cost."

Reviewer 2's extra read is the **repository**, not the author — §4's isolation rule bars your summary and your session, not git history — and it buys a class a diff cannot show: an approach that was already tried here and reverted. `scripts/phase.js` sends this block and both closing lines verbatim; the two copies are one mechanism, so edit them together.

Closure comes from `blocking_count`, never the reviewer's prose (`SKILL.md` §4): "looks good overall" alongside a listed blocking item is not a pass.

### Purpose-built reviewers

Where the change touches a class someone has already built a specialised reviewer for, run it **in addition to** the review above, never instead of it. Security is the case that matters here: on Claude Code a built-in `security-review` skill hunts with fresh sub-tasks and then runs a parallel pass to drop false positives. It is a better instrument than one line in a generalist's prompt.

Two conditions on using one, and they are the same conditions §4 puts on any reviewer. It must not be the **author** — a specialised reviewer that read your session is not fresh. And its findings still go through **your** triage: a tool that ships its own confidence filter has already narrowed the report in the way this skill tells you not to, so read what it dropped if it will show you.

If your runtime has no such pass, say so in the change rather than implying one ran (`references/platforms.md`).

## Behavior check — beside the review, on the same green build

**If a person will click, type, or call what you just built, green gates are not done.** An exit code says the author's assertions hold. Only running the path says a user can complete the job. This is the step whose absence produces the expensive failure — a change that is justified, reviewed, green, and wrong — and it is the cheapest one here.

A **fresh subagent that did not write the change** drives the new path and reports what it observed: the actual output, not a summary of it. Give it the plan and the path to exercise, and nothing else — not the diff, not your account of the work. It is there to find out what the software does, and reading the diff tells it what the author meant instead.

What comes back should read like this, not like a verdict:

```
Ran: server on :8080, then `curl -i localhost:8080/v1/things` ×62.
Calls 1-60: 200, X-RateLimit-Remaining counts 59→0.
Call 61: 429, Retry-After: 34, Remaining: 0.  ✓ matches Accept.
Empty path /v1/: 404 with an HTML body, not the JSON error shape the
  other 4xx use. Plan is silent on it. Flagging.
```

The second observation is why the example is here: silence is not permission, and a report that only confirmed the happy path would have passed while missing it.

**Do not rediscover how to run the thing.** Where your runtime ships a pass that builds and drives the app and records the launch recipe it found, use that recipe as the *how* and still send a fresh agent to do the driving: a pass that runs in your own turn is not an independent observer, and the recipe is the expensive half to rediscover each phase (`references/platforms.md`).

Have it try the edges as well as the happy path: the empty case, the error case, the unauthorized case, and whatever a user would plausibly do wrong. Those are where a change that passes its own tests stops matching the plan.

**Observed behavior that contradicts the plan is a blocking finding**, and it goes through triage like any other. Two things follow that are easy to get wrong:

- If the check **could not be run** — no service, no credentials, no way to reach the surface — the phase is not verified. Say so plainly and stop; do not record it as a note and close on the gates. `scripts/phase.js` returns `behavior-unverified` for exactly this and refuses to close.
- If the real surface is one you must not touch — production payments, a live third party, an hours-long job — the check is **not** waived, and `behaviorCheck: false` is the wrong answer, because a person does call this. Drive it somewhere safe and cheap instead: a sandbox or staging credential, a test card, a toy dataset, `--max-steps 500`. Name in the plan where it was driven and what that environment does not cover. `false` asserts one thing only: nothing this phase builds is ever clicked, typed or called.
- If the plan is **silent** on something you observed and it looks wrong, that is still a finding.

**If what you built is read rather than run** — a reference, a CLI's help text, a config schema, an error-message set — the equivalent is a reader handed the **finished files** with no diff and no change context, the way a new user meets them. That catches what diff review structurally cannot: two sections that now contradict each other, a documented step that cannot be performed. `close.md` ("Read the result as a product") has the questions; it is worth doing at Standard depth too, and it costs one agent.

Skip both only where the change puts nothing new in front of anyone: an internal refactor, a test-only change, a doc edit that reconciles stale wording with behavior that did not move. **Writing or rewriting something a reader will meet is not one of those** — that is the case above, and the reader is what drives it.

Running the loop as a script, `behaviorCheck` is a required argument, `false` is how you declare that nothing here is observable, and `{ read: "..." }` is how you ask for the reader above where what the phase produces is read rather than run (`references/orchestration.md`). The check runs beside the reviewers, so it costs an agent and no wall-clock.

## Triage

**Do not fix a finding you have not confirmed.** Check each blocking finding against the code it cites, and keep it only if the defect is really there.

Reject a finding when it misreads the code, attacks something the code does not do, describes a real property that is not a problem, or dissolves once you read the surrounding lines. When you are torn, look again rather than fixing defensively — a fix applied to a non-defect is a change with no reason behind it, and the next reviewer will ask why it exists.

Two questions, in this order. **Is it true?** and **is it this change's problem?** A finding can be perfectly true and still not belong here, and the scale below answers only the first:

- The finding names something the plan lists as a **Non-goal**, or something the diff did not create → **reject, and say which Non-goal**. One line. It is not a defect in this change, however real; if it is worth doing it is worth its own task, so say that too. Expect several — a reviewer directed at the Non-goals producing them is the prompt working, not a backlog.
- Otherwise, score it:
  - **0** — false under any scrutiny.
  - **25** — might be real; you could not verify it against the code.
  - **50** — real, but a nitpick, or too rare to matter here.
  - **75** — verified, and likely to be hit in practice.
  - **100** — confirmed, and it will happen.

Fix 75 and above. Below that, say in one line what the code actually does and move on.

This step is not optional bookkeeping. A reviewer asked to report everything will report things that are not there — a large share of them, including a substantial fraction of what it graded *blocking*, which are the ones you are most tempted to fix on sight.

**The confirmed count is what closes the phase**, not the reported one. Skipping triage means a phantom finding consumes a fix round and can exhaust the round cap on code that was already correct.

Record rejections briefly — one line each, saying what the finding claimed and what the code actually does. That record is what stops the same phantom coming back next round.

**Put it where it outlives the round.** Running by hand, that is the task's `.agent/<task>/` directory, beside the plan; `scripts/phase.js` carries the rejections in the phase result instead. A rejection recorded only in the current turn's output is gone at the next compaction, and then the phantom returns to a reviewer with nothing to contradict it.

## Fix

Fix confirmed blocking findings. Triage non-blocking ones the same way: fix the cheap and correct ones, and for the rest say plainly what you are not doing and why.

Name the root cause before you edit — `item X is caused by Y` — and change that cause. One at a time.

**A fix round repairs what the review found. New machinery is new work.** If the repair suggests a check, a harness or a guard that does not exist yet, name it and raise it — do not build it here. Machinery added mid-fix arrives unreviewed, so the next round reviews *it* rather than the change: the confirmed count stops falling, the diff keeps growing, and the cap fires on scaffolding nobody planned. Adding the gate can be right. Deciding to add it mid-fix is not. This is the same judgment the Gates step asks for, arriving at the worst moment to make it — under budget pressure, on a defect you have just been shown.

**A fix round never edits the plan either.** If a finding says the diff does not match the plan, either the code is wrong — fix it — or the plan is, and that is a conflict to raise (`plan.md`, Conflicts), not a paragraph to rewrite. The plan is gitignored, so an edit to it is invisible to every reviewer that follows.

For a correctness bug, write the failing test first, then fix to green. For style, scope, or comment findings, no test is needed.

Commit fixes to the same branch, naming the failing item — a drive-by edit has nothing to name. Format: see Commits, below.

Then re-run the gates and re-review. The cycle ends when blocking count is zero and gates are green.

## Commits

**Derive the convention, don't impose one.** Read `git log --oneline -20` and match it. A repo whose history reads `[api] fix null deref` is not asking for `fix(api): …`, and an agent that "corrects" it has made the history worse while feeling helpful.

With no discernible convention, default to Conventional Commits: `<type>(<scope>): <summary>`, with a body explaining *why* when the change is not self-evident.

Whatever the format: **the message names the phase and the item it addresses**, so it ties back to the plan — `fix(phase2): off-by-one in bucket refill`, or the same two facts in your convention's shape — and **gate output goes in the trailers** (see Gates).

**If the change breaks a published contract, stop and check your depth.** That is a Deep-tier trigger, and escalating it is `escalation.md`'s first row. Discovering it mid-build is normal; committing past it is not. Mark it however your convention marks breakage — Conventional uses `!` or a `BREAKING CHANGE:` footer.

## Parallel work

Phases run sequentially and share one working tree; `scripts/phase.js` assumes exactly that. **A branch name is not isolation** — two writers in one checkout overwrite each other's files, and the second one's diff contains the first one's work. Running writers concurrently is `references/orchestration.md`, which owns that rule and its traps.

## The journal — what outlives the task

A triage rejection outlives the round; some of what you learn outlives the **task** and has no diff to
attach it to. That goes in `.agent/<task>/journal.md`, beside the plan — read the entry conditions in
`references/maintenance.md` first, because a journal that grows past them is the per-task archive this
skill deleted.

## Diagnosis — when the cause is not obvious

Do not declare the cause obvious to save a round. That shortcut, under budget pressure, is what produces the "different thing broke each round" churn.

1. Generate **3–5 ranked, falsifiable hypotheses**. Each states a concrete prediction. If you cannot state what you would observe, it is a hunch, not a hypothesis.
2. Look for the **discriminating** evidence — the one observation that differs between your top two hypotheses. Let that pick the cause instead of confirming the first plausible one.

Anchoring on the first theory that fits is the most common debugging failure. If no hypothesis survives its discriminating test, escalate rather than shipping a guess.

## Flaky tests

Raise the flake as its own work. The non-obvious part: the intermittent reproduction **is** the discriminating observation, so you do not owe a deterministic repro before calling it one.

## Round cap

Three fix rounds per phase, counted independently per phase. Hitting the cap escalates with a deadlock report (`references/escalation.md`). It never lowers the bar and never becomes a quiet round four.

If a *different* item failed each round, the cap is firing on a planning defect rather than a local bug. Say so in the escalation and point at the plan.

If the **fix kept growing**, look at the fix step before you blame the plan (see Fix, above). Run repeatedly, the same plan both converged and did not, and what separated the runs was whether the fix step built machinery. `escalation.md` has the remedy.

## Running this loop as a script

Where the runtime can run it, `scripts/phase.js` runs the whole cycle deterministically — round counting, closure arithmetic and role isolation become code instead of instructions. Its arguments, the chaining loop, and what it does and does not guarantee: `references/orchestration.md`. Use it when a Deep change has several phases; for a single Standard change, running the loop by hand is cheaper than orchestrating it.

**Route the stages** by cost, as `SKILL.md` §1 says. Running by hand, that is which subagent you pick for each stage; under the script it is `models`.
