# Plan

**Understand the request → understand the code → write the fields → review it (Deep) → build.**
Also here: facts vs. decisions · claims need their source · spikes · conflicts.

Goal: the task's `.agent/<task>/plan.md` should let a fresh agent finish the work using only that file plus the repo. No session context required.

One directory per task — see `SKILL.md` §2. Everything this task needs that is not source code goes in that directory, so a second task running beside it cannot overwrite any of it.

Nothing backs that directory up — `SKILL.md` §2 has the rule and the one durable copy to take. If the plan is gone, do not reconstruct it from the diff: that recovers what you did, not what you meant. Say it is gone, re-derive the base from `git log` (`close.md` has the traps), and get the Goal re-confirmed before continuing.

Write it, confirm the reading if there was one (`SKILL.md` §5), then start building. It is working state — keep it short and edit it as you learn.

## Understand the request first

Before anything else, write one sentence saying what the user will be able to do that they cannot do now. If you cannot, you do not have a Goal yet — you have a topic.

Then look for the second reading. Most requests admit more than one, and the expensive failure in agent-assisted work is not a defect in the diff: it is a well-built, well-reviewed, green implementation of the wrong thing. Two readings that lead to *different work* is a decision, and decisions get escalated (`SKILL.md` §5) — before the plan, not after the build. Two readings that converge on the same work cost nothing to notice.

Say which reading you took, in the Goal. A reader who disagrees can then say so in one line; a Goal that hides the choice gives them nothing to disagree with.

## Understand the code (when the change touches existing code)

Design quality is bounded by understanding quality. Before writing the plan, map what you are about to touch: the current invariants, the immediate callers of the code you will change, and the closest existing pattern to follow.

For anything spanning more than one module, delegate this to read-only **Explore** subagents and merge their findings — that keeps a large read out of your own context. Skip it for greenfield work and single-file changes.

> **Explore and Plan subagents do not see the project guide or git status.** If the sweep must honor a project constraint — a language policy, a naming rule, an engineering norm — restate that constraint in the delegation prompt. It will not be inherited.

## The fields

**Goal.** What changes and why. One or two sentences.

**Non-goals.** What this change deliberately does not do. This is where scope creep gets stopped before it starts, so write the ones you were tempted by.

**Decisions.** Only real ones. Each: `problem → options considered → choice → why`, including why the alternatives lost. A decision with one option is not a decision; if you can only name one approach, you have not looked for a second.

**One option worth naming in most plans is the smaller one** — the version that does less, reuses something that already exists, or does nothing — with what it fails to give the user. It usually loses, and writing why is cheap. The cheapest change is the one that turned out not to be needed, and it is the option that never gets generated unless the field asks for it.

At **Deep** depth, record alternatives *before* choosing, not as post-hoc justification.

**Accept.** Two halves, and most plans only write the first.

*The command* — one with an exit code. `pytest tests/rate_limit -x`, `npm run typecheck`, `curl -sf localhost:8080/health`. If you cannot express success as a command, say so explicitly and name what a human must look at instead — but try hard first, because "I'll check it works" is how regressions ship.

*The observable outcome* — **whenever a person will click, type or call this**, what they should be able to do afterwards, written so someone who has not read the code can go and do it. "Send 61 requests in a minute; the 61st returns 429 with a `Retry-After` header, and the counter resets on the next window." That sentence is what `build.md`'s behavior check drives, and it is the half that catches building the wrong thing. An exit code says the assertions the author wrote hold. It cannot say the job can be completed. Write it so it is **cheap to observe** — three requests rather than a soak, and `build.md`'s behavior check for the surfaces you must not drive directly. That is a property of the plan, not a concession made later: the check that has to run beside every review is the one that must not cost hours.

Write both, or say which one does not apply and why. A refactor has no second half; a feature almost always does.

**Phases** *(Deep only).* Split by what can be independently verified, not by file. Each phase gets its own Accept command and lands as its own commit.

**Rollback** *(Deep only).* How to undo this if it goes wrong in production. If you cannot describe the rollback, you do not yet understand the change.

**baseSha.** The one line of bookkeeping the plan carries: `git rev-parse HEAD` from before you edited anything. The review's first tool call is a diff against it, and after a compaction this file is all a fresh agent has. At Deep depth keep the phase-1 value here as well as the live one — Close needs it (`close.md`).

## What one looks like

A Standard change, complete. It is short because it is working state, not a deliverable — and every
line in it is load-bearing for either the build or the review.

Standard, not Deep, and the reason is worth stating because the nouns look Deep: the endpoint is public,
but nothing existing callers rely on changes. Adding a response header is not a new rejection, a new
error code or a new limit. Ship the limiter that *enforces* those headers and box 1 fires.

```markdown
# Rate-limit headers on the public API

baseSha: 4f2a9c1e8b3d5a7f0c2e6b9d1a4f7c3e5b8d0a2f

## Goal
Callers can see how much quota they have left without waiting for a 429. Every /v1/*
response carries X-RateLimit-Limit, -Remaining and -Reset.
(Read as: headers on every response. The other reading — headers only on the 429 —
would be a smaller change; asked, and the user confirmed every response.)

## Non-goals
- Not changing the limits themselves, or where they are configured.
- Not adding per-endpoint limits. Tempting while I am in here; separate task.
- Not touching the internal /admin routes.

## Decisions
- Where the headers are written.
  Options: (a) in the rate-limit middleware, which already holds the bucket state;
  (b) in a response filter that re-reads the bucket.
  Chose (a) — (b) reads Redis a second time per request, and the middleware already
  has the numbers in hand. See middleware/ratelimit.go:82, where the remaining count
  is already computed for the 429 path.
- Reset as a unix timestamp, not seconds-remaining. Matches what our other public
  API already emits (api/quota.go:41), and the draft IETF header spec allows both.

## Accept
- Command: `go test ./middleware/... -run RateLimit -count=1` and `make lint`
  (checked that `-run RateLimit` selects 4 tests, not 0 — a filter that matches nothing exits 0)
- Observable: start the server, `curl -i localhost:8080/v1/things` — the response
  carries all three headers, Remaining decrements on each call, and the 61st call in
  a minute returns 429 with Retry-After and Remaining: 0.
```

Things to notice: the Goal names the reading it took, so the user can overturn it in one line. Both
Non-goals are things the author actually wanted to do. Each Decision has a loser and a reason, and
the claims about existing behavior carry a `file:line`. Accept has both halves.

## Facts vs. decisions

The line between them is `SKILL.md` §5's. The part worth stating here is the failure mode, which is not a competence gap but a temptation: **relabelling a real decision as "a fact the repo can answer" and resolving it quietly.** If you are choosing on the user's behalf, that is a decision, however obvious the choice looks from here.

If the guide answers something *wrongly* — a command that no longer exists, a count that has moved — carry on with what the repo actually says, and correct the guide line in its own commit rather than folding it into this change (`build.md`, "The journal").

## Claims need their source

When the plan states how something external behaves — an API's return shape, a library's threading model, whether a callback is synchronous, a concrete value — paste the evidence next to the claim: a `file:line` snippet, or the command you ran and its output.

A confidently-worded claim with nothing behind it is the dangerous case, more so than a hedged one, because it propagates into the build as though it were established. State the claim, then paste its source.

If you cannot source it, spike it.

## Spikes — when only running it will tell you

Some questions are neither repo-answerable nor a matter of preference: *does this SDK actually support that mode? what shape is the real payload? can this approach hit the budget?* Escalating just bounces the question back; assuming is a silent default. Run a spike instead.

A spike is bounded by three rules:

1. **Throwaway.** Marked so from the first line, run outside the repository — `$TMPDIR`, or a detached worktree placed as `orchestration.md` ("Worktrees") describes — and deleted afterward. It never lands in the main tree.
2. **The answer is the only output.** Record the question and what you measured in the plan's Decisions. The code is discarded; git is not the memory here, the plan is.
3. **It answers one question.** A spike does not authorize starting the real work. Record the number, then plan with it.

## Reviewing the plan

At **Deep** depth the plan gets fresh readers before you build — `SKILL.md` §4 has the count. Give each the plan and the relevant code, independently, with the same checklist and a different closing line (below). Take the union of their findings.

Ask each to report everything and let you triage. Do not ask for "only the important issues".

What they should look for:

- An acceptance command that cannot actually fail.
- A decision presented with one option, or a rationale written after the choice.
- A Non-goal the Goal quietly contradicts.
- A claim about external behavior with no pasted source.
- Missing rollback on something irreversible.
- An internal contradiction between two sections — the single highest-yield defect class in practice, and the one a lone reviewer most often misses.

**Why two, and why different.** A single reviewer misses a substantial share of what is there, and a second finds much of what the first missed — they miss *different* things, which is why findings are unioned rather than reconciled, and why the union must never be narrowed to what they agree on. Stopping at two is a **cost** decision, not a claim that a third finds nothing. Give each a different closing instinct: one an adversary hunting the case that breaks it, one whoever maintains this next year.

The corollary matters as much: **a clean first review is weak evidence that the plan is clean.** "Reviewer 1 found nothing" and "there is nothing to find" are very different statements. Do not close a Deep plan on one.

At **Standard** depth there is no plan reviewer, and §4's author-≠-reviewer rule means re-reading your own plan is not a substitute. The diff reviewer is sent the diff *and this plan*, and its blocking test is "outside the plan's Goal" — so a plan that is **wrong** does not fail review, it defines what passing means. Three covers, and the first two are free:

- State in the Goal, in one sentence someone can overturn, **which reading of the request you took** — "`RateLimit-*` per RFC 9331, not `X-RateLimit-*`".
- Put that sentence and Accept in front of whoever asked, before you build (`SKILL.md` §5).
- Write Accept's observable outcome as something a person can go and do, and ask the diff reviewer whether the **plan** looks wrong, not only whether the diff matches it.

Where that is not enough, buy one plan reviewer.

## Conflicts

If the plan turns out to contradict the code once you start building, stop and fix the plan. Do not let the build and the plan drift apart and reconcile them at the end; the plan is what the reviewer checks the diff against, so a stale plan silently disables the review.

If the change turns out to span two genuinely independent subsystems, split it into two tasks with two plans rather than one plan that covers both badly.
