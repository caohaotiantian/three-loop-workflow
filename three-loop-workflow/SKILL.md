---
name: three-loop-workflow
description: Implement non-trivial code or contract-rule changes through Plan, Build, and Close. Also use for pre-landing review. Exclude questions, exploration, and obvious small edits.
license: MIT
compatibility: Assumes version control, project checks, and user decisions for irreversible actions and repair limits. Use independent review when available, otherwise section 5.
metadata:
  version: "3.5.0"
---

# Three-Loop Workflow

**Plan → Build → Close**, at a depth chosen from the stakes.

Own the assigned implementation: its plan, changes, evidence, review, and repairs.
The implementer can be the parent or an assigned executor.
When a coordinator exists, leave task allocation, dependencies, shared interfaces, and integration ownership with it.
Request required roles or scheduling changes from that coordinator. Do not recursively coordinate other tasks.
Route user decision requests through the coordinator.
Without a coordinator, manage the change and required roles directly.
Implementation depth and execution mode are separate. Direct execution does not remove required review.

**Hard constraints**, the only rules that are not defaults:

1. A change above Direct is reviewed by a context that did not write it; only where none is available, the hand-off says so (section 5).
2. Run the project's checks. A check that could not be run is not a check that passed.
3. The hand-off reports what was observed, not what was intended.
4. A change to who can reach what (authentication, authorization, secrets, a new path for untrusted input) is never Direct.
5. An action outside the repository that cannot be undone waits for the user: pushing to a shared branch, deploying, writing real data, sending anything.

**Everything else is a default:** leave one only for a stated reason. The project's guide overrides any default, and the means are yours.

**Read the project's guide** (AGENTS.md, CLAUDE.md) for its check commands and the files it treats as contracts; where it names none, derive them from the repository and say what you inferred. Checks come from the build config and CI; contracts are what is consumed outside this repository or persisted: public APIs, schemas, CLIs, wire formats, stored data.

**Apply the text-type, language, and visual rules in `references/writing.md` to this task's writing.**

## 1. Depth

Take the lightest depth that fits.

- **Direct:** an obvious small edit whose correctness is visible or covered by an existing check. A non-trivial behavior change is Standard or Deep, even with tests. A typo fix can be Direct. A changed default cannot. Make the change and run the checks. No plan or reviewer is required. Report the change, checks, results, and absence of review in one line.
- **Standard:** the default for behavior changes.
- **Deep:** only when a trigger fires:
  1. a breaking change to a contract consumed outside this repository;
  2. an irreversible effect outside the repository: a migration of persisted data, money, anything sent to a third party;
  3. a changed rule in a file the project treats as a contract;
  4. alternatives that commit to different structures.

  Then read `references/deep.md`.

One risky corner raises its own depth, never the whole change's depth. Raise the depth yourself, including when the build reveals a trigger; only the user lowers it. Before lowering it, recommend your depth. For someone new to this workflow, show what this change would skip and the failure left open. If they insist, follow them without waiving a hard constraint.

## 2. Plan

At Standard and Deep, before the first edit, write the **Goal**, the **Non-goals** you were tempted by, and **Accept**, the evidence (section 4).

Scale the plan and review to the change.

Add **Decisions** only at real forks: the options, including the smaller one, and why the winner won.

Write it to `.agent/<task>/plan.md`, one directory per task, and commit the files with the change, unless the project has its own convention. If `.agent` is in `.gitignore`, leave that entry and do not force-add the files.

For assigned work, use the supplied plan path and reference shared scope and acceptance criteria.
Keep implementation details there. Leave global task records with the coordinator.
Preserve existing canonical task directories. For delegated plans, default to `.agent/<task>/tasks/<slice-id>/plan.md`.

When two readings of the request need different work, state yours in the Goal, show it and the Accept to the user, and wait; if no one can answer, proceed on your reading and mark it unconfirmed in the hand-off. Ask about real product, scope or risk decisions with options, a recommendation and a rationale, never deciding silently; record the answer in the plan.

When a defect's cause is unknown, finding it is the task: its Accept is a reproduction; plan the fix after it.

## 3. Build

- Every changed line traces to the Goal or a Decision. No abstraction, configurability or error handling nobody needs.
- If the code, or a fix, contradicts the plan, stop and correct the plan openly, not at the end.
- Stay within assigned files and interfaces. If these need changes, pause affected work and request a revised assignment.
- **Parallel reading, isolated writing.** Use a separate working tree for each concurrent writer (`references/parallel.md`).
- For integration work, run checks and review against the merged change. Passing slice checks do not establish integrated acceptance.
- Where a document quotes a figure that a command produces, cite the command beside the figure, or have a check recompute it.

For durable work, store check results in `evidence/checks.md` beside the plan.
Record criteria, commands, revisions, results, evidence links, and invalidation conditions.
Store findings, triage, reviewer identity, and repair rounds in `evidence/review.md`.

## 4. Evidence

- **Accept names the cheapest real evidence that would fail without the change**: an existing check turning green, a new test, or the observed outcome. Say what failure looks like.
- **No new unit test is required by default.** Write one where the behavior is logic a test pins cheaply and a regression is worth guarding. It is the wrong check for UI rendering and layout, wiring and glue, configuration, thin calls to external services, one-off scripts, and prose: observe the outcome instead.
- **Where a person clicks, types or calls it,** a context that did not write the change drives it and reports what it saw. Give it the path and the failure, not the diff or your account. A contradiction is a finding. No such context: drive it yourself and paste what you saw. Drive an off-limits surface somewhere safe and name the gap. Not driven means not checked.
- **Where the output is read rather than run** (documents, help text, a spec), the evidence is a cold read of the finished files by a reader without the change context: read it as a product, not as a diff.
- **An intermittent failure is itself a reproduction** and the discriminating evidence. Do not re-run this change's failure until it passes, and do not demand a deterministic reproduction before treating it as one. One this change did not cause is a named follow-up, not fixed inside this change.
- **Run the checks** before review, those covering the change after each fix, and the full set once before the hand-off. Paste the pass/fail lines, not whole logs. Everything skipped, or green bought by weakening a test, is not a pass.

## 5. Review

The reviewer gets the whole change (or, for a change built in phases, the whole phase), the plan and the repository, not your summary or reasoning. Whole means every file the change adds, modifies or deletes, new untracked files included; a review of an empty or incomplete diff is not a clean review. Direct needs no reviewer; Standard gets one.

**Unavailable independent reviews or reads:** use available independent contexts first.
For missing roles, inspect the complete artifacts specified above, not your recollection of the work.
Apply the missing roles' briefs in one self-review pass.
Label it "self-review, not independent" and report the missing independent roles.
Offer the user the briefs to run elsewhere.
This fallback does not override stricter user, project, or host requirements.

Hand over this brief verbatim:

```
Review this change against its plan. Report every finding with file:line,
marked blocking (wrong behavior, a broken contract, work outside the plan)
or non-blocking. Do not modify code.
1. Where does it break? Unexpected input, hostile input where it touches
   trust, failures of what it calls, facts assumed from outside the diff.
2. Were existing tests weakened?
3. Is the new behavior shown by evidence, a test or an observed
   outcome, that fails without the change? Ask for nothing more.
4. Does anything fall outside the Goal or inside a Non-goal?
5. Is the plan itself wrong?
```

**Triage before fixing.** Confirm each finding against the cited code. Reject misreadings, and findings asking for work a Non-goal excludes, one line each. A missing test is non-blocking unless it guards a confirmed correctness bug. The change closes when no confirmed blocking finding remains.

**Reviewing someone else's change:** the same brief, with its description as the plan; missing Non-goals are a finding. Triage, then hand the author the confirmed findings; do not fix them.

## 6. Fix and stop

- A fix repairs what a confirmed finding cites, at its root cause, everywhere the same defect occurs.
- New machinery is new work: a new check, harness, guard, abstraction or test file becomes a named follow-up, not part of the fix. Add a failing test only for a confirmed correctness bug, and extend an existing test file.
- After each fix, the reviewer re-checks only the fix: are the cited findings resolved, and did the fix introduce anything? A fix plus its re-check is a round.

**Stop and ask the user** when a round leaves the confirmed findings unchanged, a fix grows into files or machinery the plan did not cover, or blocking findings remain after the third round. Bring the unresolved findings verbatim, what was tried, where it breaks with real output, the options (revise the plan, accept a documented risk, drop the item as a follow-up, split the machinery out) and your recommendation. Never lower the bar silently.

## 7. Close: the hand-off

The hand-off is the final change description. A coordinator's HANDOFF.md instead provides resume instructions.
Apply selective reads and record lifecycle rules in `references/writing.md`.
With a coordinator, return sourced memory candidates and leave shared updates with it.

At Standard and Deep, the change description carries:

- the Goal, as what a user can now do, and the Non-goals;
- Accept, and what the evidence actually showed;
- what could not be checked, and why;
- who reviewed it, or "self-review, not independent", or that no review happened, and the same for a path a person drives;
- a depth the user lowered, and what you showed them before they insisted;
- unfixed non-blocking findings, one line each;
- residual risk;
- at Deep, the rollback as it now stands.

For assigned work, return artifact paths and revisions, evidence, review state, unresolved requests, and active or unknown modifying commands.
Report local completion to the coordinator. Do not claim completion of the overall task.

Review, security or orchestration tools the user adds supplement the independent review, never replace it.
