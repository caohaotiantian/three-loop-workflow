---
name: three-loop-workflow
description: Structured workflow for non-trivial code changes — features, behavior fixes, refactors, performance work, and edits to contract files (AGENTS.md, CLAUDE.md, this skill, OpenAPI specs, schemas, public APIs). Chooses a proportionate depth, records decisions and non-goals in a durable plan file, verifies with the project's own gates, drives the user-visible path, and reviews the diff with a fresh reviewer. Use when a change needs more than a single obvious edit; when it touches a published contract or a security-sensitive surface; when a defect's cause is not yet known; or to review a change before it lands. Do NOT use for questions, code reading, exploration, or one obvious edit whose correctness is visible in the edit itself.
license: MIT
compatibility: Subagents are the one hard requirement — a fresh reviewer needs one. The rest is runtime-neutral; Claude Code adds an optional scripted Build loop. See references/platforms.md
metadata:
  version: "2.4.0"
---

# Three-Loop Workflow

**Plan → Build → Close** — one loop (Build), with a pass on either side. Depth is chosen per change; most changes run a short Plan, a Build, and no Close.

**The project guide** is the repo's agent instruction file — `AGENTS.md`, `CLAUDE.md`, or both; read whichever exist. It names sections by *role* (`_load-bearing-docs_`, `_common-commands_`, `_engineering-norms_`, …) via an anchor map at its top, so this skill cites a role without knowing your headings.

**If no guide exists, or a role is missing**, derive what you need from the repo — gate commands from its build config, contract files from what depends on them — say what you inferred, and offer to write the anchor map. A missing role never means the rule it feeds is skipped. **If the repo has no gates at all**, say so before you build: §3 has nothing to run, so writing the Accept command is part of the work.

## 1. Choose depth — first, before reading anything else

Two questions: **if this is wrong, how much breaks?** and **how hard is it to undo?** Where the change is user-facing, a third: **who relies on today's behavior, and how would they find out it changed?** A change that is one commit to revert can still be unrecoverable for whoever already consumed it.

| Depth | When | What runs |
|---|---|---|
| **Direct** | Where the change turns out smaller than it looked. Typo, comment, formatting, a rename nothing outside the file uses, a dependency bump with no advisory behind it. Not a doc edit that moves a rule, and not a rename of anything exported. | Make the change. Run the gates (§3). Done. |
| **Standard** | Default for real work. A feature, a behavior fix, a refactor, a perf change — contained blast radius, revertable with one commit. | Plan brief → build → gates → one fresh-reviewer diff review → fix. |
| **Deep** | Any one of the four triggers below fires. | Standard, plus: alternatives recorded before choosing, phased build, and a Close pass. |

**The Deep triggers. The first three you can tick by reading the diff; the fourth is a judgement, so make it out loud. If none fires, Standard is correct — this is a checklist, not a vibe.**

- [ ] A **breaking change to a published contract**: schema, exit code, CLI, wire protocol, storage layout, or what existing callers already observe at runtime — a new rejection, a new error code, a new limit.
- [ ] An **irreversible effect outside this repository**: a migration of persisted data or config, anything that overwrites stored data, spends money, or is sent to a third party. Reverting the commit reverts none of them.
- [ ] An edit that changes a **rule** in a contract file listed under the project guide's _load-bearing-docs_.
- [ ] A decision the repository cannot settle whose **alternatives commit to different structures**, so choosing wrong means redoing the work rather than editing it.

Between Direct and Standard, choose **Standard**. Do not upgrade the whole change because one corner is risky; run Standard and escalate that corner.

A change to **who can reach what** — authentication, authorization, secrets, or a new path for untrusted input — is never Direct, whatever its size. Where your runtime ships a specialised reviewer for it, run that too (`references/build.md`).

Worked: *rename a private helper* → Direct. *Add pagination to an internal list endpoint* → Standard. *Add pagination to a **public** endpoint, changing the default response shape* → Deep, box 1: existing callers observe something new. One feature, three grades, and the nouns in the request predicted none of them.

Terse phrasing is not a depth signal either. "Just quickly add X" describes urgency, not blast radius — grade the change, not the sentence.

**If this skill loaded after you started editing**, stop and grade now. Capture `baseSha` from the last commit before your edits, write the plan from what you have, and say that you started first — a plan written late still binds the review. **If the user says the grade is too heavy**, cut ceremony freely and never the two things that *are* the depth — see `references/escalation.md`.

**Deep scales with the change.** A one-line rule edit that trips a trigger still records its alternatives and still gets two readers on the plan; its phased build is one phase and its Close is a few questions. Run the parts that catch the risk, not the ceremony. Where the loop is delegated, route the cheap stages to a cheap model: running the gate commands is a shell errand that judges nothing.

## 2. Durable state — `.agent/<task>/plan.md`

Every task gets **its own directory** under `.agent/`, named for the task: `.agent/rate-limit-headers/plan.md`. Scratch notes and a journal live beside it. Never a shared path — two tasks both writing `.agent/plan.md` overwrite each other. Nothing backs this up, so what must outlive the task has to reach the repository.

**Check `.agent/` is in the repo's `.gitignore` the first time you use it here**, and add it if not: untracked, a `git add -A` commits the plan into the very diff the reviewer reads it against.

It is the **re-entry point after context compaction**: `ls -t .agent/*/plan.md | head -1` is the most recent.

Standard needs these five. Deep adds the sixth.

1. **Goal** — what changes, and why.
2. **Non-goals** — what this change does *not* do.
3. **Decisions** — each as `problem → options → choice → why`. If a decision has no clear winner and the repo cannot settle it, escalate (§5) instead of picking.
4. **Accept** — two halves. *A command* whose exit code decides success; "I'll check it works" is not one. And, whenever a person will click, type or call this, *the observable outcome* — what they should be able to do afterwards, written so someone who has not read the code can go and do it. An exit code says the author's assertions hold, not that the job can be done.
5. **baseSha and progress** — `git rev-parse HEAD` from before you edited anything, plus one line rewritten in place: `phase 2/3 · fix round 2 of 3`. The review's first tool call needs the sha, and the cap is per phase and lives nowhere else — a compaction with that line missing restarts it at zero.
6. *(Deep)* **Phases** — each with its own Accept; and **Rollback** — how to undo.

Keep it short: working state, not a deliverable. One repository per task — plan, `baseSha`, diff and Accept all resolve in one checkout, so a change spanning two repos is two tasks, sequenced.

## 3. Gates before agents

Before any reviewer looks at anything, run the project's own mechanical checks — typecheck, lint, build, tests — from _common-commands_. They cost near-zero context and catch the most common defect in generated code: an API that does not exist. An agent's opinion about code that does not compile is worthless. A command that exits 0 with everything skipped is not a pass, and neither is one that went green because a fix round deleted an assertion.

**Green gates are necessary, not sufficient.** Where Accept named an observable outcome, a fresh agent that did not write the change drives that path and reports what it saw; behavior that contradicts the plan is a blocking finding, and a check that could not be run is not a check that passed (`references/build.md`).

## 4. Review — fresh eyes on the diff

Reviewers are fresh subagents receiving the diff and the plan — and **nothing else**: not your summary, not your session, not the reasoning that produced it. The repository is not "else"; a reviewer may read the code's history. The first tool call is `git diff <baseSha>..HEAD`, where `baseSha` was captured before editing began — or, on a Deep phase, before *that phase* began (`references/build.md`).

**How many reviewers.** Standard: one. Deep: **two on the plan**, in parallel and independently — union what they find. On a Deep phase's *diff*, two where that phase is hard to undo, one elsewhere: the measurement behind "two" was taken on plans, and the gates have already stripped a class of defect out of a diff (`references/plan.md`).

- **Ask about what is likely to be wrong**, not only about scope: unexpected inputs, hostile ones where the diff touches untrusted data or access control, whether existing tests were weakened, and whether the *plan itself* is wrong. A directed question dominates a reviewer's attention, so their order is part of the rule (`references/build.md`).
- **The author never reviews their own work.** This binds to identity, not invocation: an agent that wrote the change cannot review it, whether the second role arrives by assignment, self-claim, or lead approval.
- Ask for **everything, and triage yourself**. A reviewer told to be conservative reports less, including real defects.
- **Triage before you fix, and before you count.** Check each finding against the code it cites and reject the ones that misread it; expect to reject a large share, including blocking ones (`references/build.md`).
- **Closure is computed, not asserted** — from the count of *confirmed* findings, never the reviewer's verdict and never the raw report. Counting unconfirmed ones burns a fix round on a phantom, and can exhaust the cap on code that was already correct.

**Termination**: the change closes when the *confirmed* blocking count is zero, the gates are green, and — where Accept named an observable outcome — someone who did not write it has driven that path and reported what they saw. Fix rounds are capped at **three** by default; raising that is a decision for the plan, not a knob to reach for at round four. Hitting the cap escalates with a deadlock report, and never lowers the bar.

Where the runtime can run it, `scripts/phase.js` executes §3 and §4 as code — round counting, closure arithmetic and author-≠-reviewer stop being rules you must remember. Reach for it when a change has several phases (`references/orchestration.md`).

## 5. Escalate decisions, look up facts

If the repository can answer it, look it up — asking the user to confirm what the code already settles wastes their attention. If it is a real product, scope, or risk-tolerance decision, ask.

Every escalation carries **options, a recommendation, and the rationale**. Never an open-ended "what should we do?".

Never substitute a silent default for a real decision. Record what the user decides in the task's `plan.md`.

## Routing

| You are about to... | Read |
|---|---|
| Write the plan, or surface a decision | `references/plan.md` |
| Build, review, and fix a change | `references/build.md` |
| Debug a failing check, or a flaky test | `references/build.md` (Diagnosis) |
| Drive the path a user takes, before closing | `references/build.md` (Behavior check) |
| Close a Deep change | `references/close.md` |
| Escalate, or handle a round-cap deadlock | `references/escalation.md` |
| Run on Codex or opencode | `references/platforms.md` |
| Run the Build loop deterministically rather than by hand | `references/orchestration.md` (`scripts/phase.js`) |
| Run more than one writer at once | `references/orchestration.md` (Worktrees) |
| Fold a task's notes into the project guide | `references/maintenance.md` |

Read the reference for the loop you are in. You do not need the others.

## Working rules

- **Scope**: every changed line traces to the Goal or to a recorded Decision. Revert the rest.
- **Simplicity**: no abstraction for single-use code, no configurability nobody asked for, no error handling for cases that cannot occur.
- **Comments explain the code, not the process.** Never leave round numbers, review history, or plan references in source comments.
- When two existing patterns conflict, follow the more recent or better-tested one and say so. A hybrid that satisfies neither is the failure mode.
