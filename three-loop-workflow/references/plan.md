# Plan

Goal: the task's `.agent/<task>/plan.md` should let a fresh agent finish the work using only that file plus the repo. No session context required.

One directory per task — see `SKILL.md` §2. Everything this task needs that is not source code goes in that directory, so a second task running beside it cannot overwrite any of it.

Write it, then start building. It is working state — keep it short and edit it as you learn.

## Understand first (when the change touches existing code)

Design quality is bounded by understanding quality. Before writing the plan, map what you are about to touch: the current invariants, the immediate callers of the code you will change, and the closest existing pattern to follow.

For anything spanning more than one module, delegate this to read-only **Explore** subagents and merge their findings — that keeps a large read out of your own context. Skip it for greenfield work and single-file changes.

> **Explore and Plan subagents do not see the project guide or git status.** If the sweep must honor a project constraint — a language policy, a naming rule, an engineering norm — restate that constraint in the delegation prompt. It will not be inherited.

## The fields

**Goal.** What changes and why. One or two sentences.

**Non-goals.** What this change deliberately does not do. This is where scope creep gets stopped before it starts, so write the ones you were tempted by.

**Decisions.** Only real ones. Each: `problem → options considered → choice → why`, including why the alternatives lost. A decision with one option is not a decision; if you can only name one approach, you have not looked for a second.

At **Deep** depth, record alternatives *before* choosing, not as post-hoc justification.

**Accept.** A command with an exit code. `pytest tests/rate_limit -x`, `npm run typecheck`, `curl -sf localhost:8080/health`. If you cannot express success as a command, say so explicitly in the plan and name what a human must look at instead — but try hard first, because "I'll check it works" is how regressions ship.

**Phases** *(Deep only).* Split by what can be independently verified, not by file. Each phase gets its own Accept command and lands as its own commit.

**Rollback** *(Deep only).* How to undo this if it goes wrong in production. If you cannot describe the rollback, you do not yet understand the change.

## Facts vs. decisions

Before asking the user anything, try to answer it from the code, from git history, and from the project guide.

If the guide answers it *wrongly* — a command that no longer exists, a count that has moved, a file it does not know about — note it in `.agent/<task>/journal.md` and carry on with what the repo actually says. This is where that discovery usually happens, and fixing the guide here turns one change into two (`build.md`, "The journal").

- **A fact the repo settles** — what a module does today, which constant already exists, how a caller is wired — is **looked up, never asked**. Asking someone to confirm what the code already says invites a rubber-stamp of something that was never a decision.
- **A product, scope, or risk-tolerance judgment the repo cannot answer** goes to the user.

The failure mode to avoid is relabelling a real decision as "a fact the repo can answer" and resolving it quietly. If you are choosing on the user's behalf, that is a decision.

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

At **Deep** depth, spawn **two fresh subagents in parallel** to read the plan before you build. Give each the plan and the relevant code, independently, with the same prompt. Take the union of their findings.

Ask each to report everything and let you triage. Do not ask for "only the important issues".

What they should look for:

- An acceptance command that cannot actually fail.
- A decision presented with one option, or a rationale written after the choice.
- A Non-goal the Goal quietly contradicts.
- A claim about external behavior with no pasted source.
- Missing rollback on something irreversible.
- An internal contradiction between two sections — the single highest-yield defect class in practice, and the one a lone reviewer most often misses.

**Why two.** Measured on this repo's own design documents, with every reported defect re-checked by independent adversarial adjudicators before it counted. A second independent reviewer cut what a single reviewer missed by roughly half, and surfaced a severe defect the first had missed entirely in *every* document.

Stopping at two is a **cost** decision, not a claim that a third finds nothing. Re-analysis of the same data disagreed with itself on that point, depending on the denominator used, and the underlying artifacts were never kept — so treat "two is enough" as where this project chose to stop paying, and raise it if your defects are expensive enough to justify the third.

The reason is not thoroughness. Reviewers miss **different** things: most defects were seen by only one of the three, and few by all of them. That is what a second reader buys, and why their findings are unioned rather than reconciled.

The corollary matters as much: **a clean first review is weak evidence that the plan is clean.** One reviewer misses closer to half the defects than none of them, so "reviewer 1 found nothing" and "there is nothing to find" are very different statements. Do not close a Deep plan on one clean review.

At **Standard** depth, skip plan review entirely. Re-read the plan yourself once against the list above and start building — that is where fresh eyes pay for themselves on a small change.

## Conflicts

If the plan turns out to contradict the code once you start building, stop and fix the plan. Do not let the build and the plan drift apart and reconcile them at the end; the plan is what the reviewer checks the diff against, so a stale plan silently disables the review.

If the change turns out to span two genuinely independent subsystems, split it into two tasks with two plans rather than one plan that covers both badly.
