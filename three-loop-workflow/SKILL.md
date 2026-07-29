---
name: three-loop-workflow
description: Structured workflow for non-trivial code changes — features, behavior fixes, refactors, performance work, and edits to contract files (AGENTS.md, CLAUDE.md, this skill, OpenAPI specs, schemas, public APIs). Chooses a proportionate depth, records decisions and non-goals in a durable plan file, verifies with the project's own gates, and reviews the diff with a fresh reviewer. Use when a change needs more than a single obvious edit, or when it touches a published contract.
license: MIT
compatibility: Claude Code (subagents, Workflow). Codex/opencode run the manual path — see references/platforms.md
metadata:
  version: "2.0.0"
---

# Three-Loop Workflow

**Plan → Build → Close.** Depth is chosen per change. Most changes run a short Plan, a Build, and no Close.

**The project guide** is this repo's agent instruction file — `AGENTS.md`, `CLAUDE.md`, or both. Read whichever exist; projects keeping both usually put shared rules in `AGENTS.md` and runtime-specific ones in `CLAUDE.md`. It names sections by *role* (`_load-bearing-docs_`, `_common-commands_`, `_engineering-norms_`, …) via an anchor map at its top, so this skill can reference a role without knowing your headings.

## 1. Choose depth — first, before reading anything else

Two questions: **if this is wrong, how much breaks?** and **how hard is it to undo?**

| Depth | When | What runs |
|---|---|---|
| **Direct** | Contained and reversible. Typo, comment, formatting, doc reordering, local rename, patch/minor dependency bump. | Make the change. Run the gates (§3). Done. |
| **Standard** | Default for real work. A feature, a behavior fix, a refactor, a perf change — contained blast radius, revertable with one commit. | Plan brief → build → gates → one fresh-reviewer diff review → fix. |
| **Deep** | Any one of: a breaking change to a published contract (schema, exit code, CLI, wire protocol, storage layout); a migration of persisted data or config; an edit that changes a rule in a contract file listed under the project guide's _load-bearing-docs_; or a decision with no clear winner that the repository cannot answer. | Standard, plus: alternatives recorded before choosing, phased build, and a Close pass. |

Between Direct and Standard, choose **Standard**. Between Standard and Deep, the Deep list is a **checklist, not a vibe** — if no item fires, Standard is correct. Do not upgrade the whole change because one corner of it is risky; run Standard and escalate that corner.

Terse phrasing is not a depth signal. "Just quickly add X" describes urgency, not blast radius — grade the change, not the sentence.

## 2. Durable state — `.agent/<task>/plan.md`

Every task gets **its own gitignored directory** under `.agent/`, named for the task: `.agent/rate-limit-headers/plan.md`. Anything else scoped to the task — an acceptance script, scratch notes — lives beside it in that directory.

Never a shared path. Two tasks both writing `.agent/plan.md` overwrite each other, and a finished task leaves no record of what it decided. The directory is that record.

It is the **re-entry point after context compaction**: if you resume and cannot remember the task, read its plan first — `ls -t .agent/*/plan.md | head -1` is the most recent.

Standard needs four fields. Deep adds the fifth.

1. **Goal** — what changes, and why.
2. **Non-goals** — what this change does *not* do.
3. **Decisions** — each as `problem → options → choice → why`. If a decision has no clear winner and the repo cannot settle it, escalate (§5) instead of picking.
4. **Accept** — a runnable command whose exit code decides success. English prose is not an acceptance command.
5. *(Deep)* **Phases** — each with its own Accept command; and **Rollback** — how to undo.

Keep it short. This is working state, not a deliverable.

## 3. Gates before agents

Before any reviewer looks at anything, run the project's own mechanical checks — typecheck, lint, build, tests — from the project guide's _common-commands_. They cost near-zero context and catch the most common defect in generated code: an API that does not exist.

An agent's opinion about code that does not compile is worthless. Gates first, every time.

A command that exits 0 with everything skipped is not a pass.

## 4. Review — fresh eyes on the diff

Reviewers are fresh subagents receiving the diff and the plan — and **nothing else**: not your summary of the change, not your session, not the reasoning that produced it. The first tool call is `git diff <baseSha>..HEAD`, where `baseSha` was captured before editing began.

**How many reviewers.** Standard: one. Deep: **two, in parallel, independently** — take the union of what they find.

Two is measured on this repo's own design documents, not chosen for symmetry. A second independent reviewer adds roughly thirty points of defect coverage and catches blockers the first missed entirely; a third mostly repeats the second. Reviewers miss *different* things — that is the whole reason a second one pays. The measurement, and what it does not establish, are in `references/plan.md`.

- **The author never reviews their own work.** This binds to identity, not to invocation: an agent that wrote the change cannot review it, whether the second role arrives by assignment, self-claim, or lead approval.
- Ask for **everything, and triage yourself**. Do not tell a reviewer to be conservative or to report only high-severity items — it will comply literally and report less.
- **Triage before you fix, and before you count.** Check each finding against the actual code and reject the ones that misread it. Expect to reject a large share, including findings graded blocking — measured on this repo, and quantified in `references/build.md`. That is the cost of asking for everything, and it is cheaper than the alternative.
- **Closure is computed, not asserted** — from the count of *confirmed* findings, never the reviewer's summary verdict and never the raw report. Counting unconfirmed findings makes a phantom defect burn a fix round and can exhaust the cap on work that was already correct.
- Two *independent* reviewers is not the same as double-checking your own work. Re-reading your own reasoning adds nothing; a reader who never saw it finds much of what you missed.

**Termination**: the change closes when the *confirmed* blocking count is zero and the gates are green. Fix rounds are capped at **3**; hitting the cap escalates with a deadlock report — it never lowers the bar.

## 5. Escalate decisions, look up facts

If the repository can answer it, look it up — asking the user to confirm what the code already settles wastes their attention. If it is a genuine product, scope, or risk-tolerance decision, ask.

Every escalation carries **options, a recommendation, and the rationale**. Never an open-ended "what should we do?".

Never substitute a silent default for a real decision. Record what the user decides in the task's `plan.md`.

## Routing

| You are about to... | Read |
|---|---|
| Write the plan, or surface a decision | `references/plan.md` |
| Build, review, and fix a change | `references/build.md` |
| Debug a failing check, or a flaky test | `references/build.md` (Diagnosis) |
| Close a Deep change | `references/close.md` |
| Escalate, or handle a round-cap deadlock | `references/escalation.md` |
| Run on Codex or opencode | `references/platforms.md` |
| Run the Build loop as a script (Claude Code) | `references/build.md` (Workflow mode) → `scripts/phase.js` |

Read the reference for the loop you are in. You do not need the others.

## Working rules

- **Scope**: every changed line traces to the Goal or to a recorded Decision. Revert the rest.
- **Simplicity**: no abstraction for single-use code, no configurability nobody asked for, no error handling for cases that cannot occur.
- **Comments explain the code, not the process.** Never leave round numbers, review history, or plan references in source comments.
- When two existing patterns conflict, follow the more recent or better-tested one and say so. A hybrid that satisfies neither is the failure mode.
