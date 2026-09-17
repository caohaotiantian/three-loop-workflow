# Escalation

A silent default is a decision nobody made and no later reviewer can challenge. Surface it instead.

## Stop and ask when

| Situation | What to say |
|---|---|
| The defect is causing harm right now — money moving, data being corrupted, a job still running | What you are stopping and how, done **before** you diagnose. Say it, do not ask permission to stop the bleeding; ask before anything itself irreversible (refunds, deletes) |
| The request admits more than one reading, and they lead to different work | The readings, with your recommendation |
| A breaking change to a published contract — schema, exit code, CLI, wire protocol, storage layout, or an exported symbol callers import | The non-breaking alternative if one exists, the change, and what migration costs |
| A threshold or magic number with no source | Cite an existing constant if one exists; otherwise ask |
| Legacy fields on a schema: keep, migrate, or drop | The options, plus the surface each one touches |
| Deleting a file listed under the project guide's _load-bearing-docs_ | Which contract it fulfills, what replaces it, and every file that references it — **ask before deleting** |
| The action exceeds your authority: pushing to main, deleting outside the workspace, sending anything externally | Ask for authorization first |
| Credentials, network, or permissions are missing | Verify the actual failure first, then report what you found |
| Another in-flight task overlaps this domain | Which files both touch, which task is further along, and your recommendation — merge now, serialize behind it, or split ownership — and what gets redone either way |

**Peer sessions and agents are in-flight tasks too.** Two sessions on one checkout are two writers in one tree; `orchestration.md` (Worktrees) has the remedy. Taking over a task another session or agent started means reading `.agent/<task>/plan.md` and its recorded `baseSha` **before** your first edit: its Non-goals bind you as they bound the writer before you, and a base you pick yourself makes the review read a different change. That directory is the hand-off contract between peers as much as across a compaction (`SKILL.md` §2). Where there is none, you are starting a task, not taking one over.

## How to ask

Three parts, every time:

1. **Options** — two or more concrete choices, not "what should we do?"
2. **Recommendation** — which one you would pick.
3. **Rationale** — why, and what trade-off you accepted.

The user should be able to answer "B, because of Y" in ten seconds. If your question requires them to design something, you have not done your half of the work.

> The plan says "low-latency request handling" with no target. Three viable readings:
> **(a) p99 < 100ms** — matches our existing API tier, needs the cache layer upgraded.
> **(b) p99 < 250ms** — achievable as-is, modest change.
> **(c) p50 < 50ms, no p99 target** — different goal, simplest build.
>
> Recommend (b): it holds the current cache contract, which the plan flags as the risky surface. Leaves room to tighten later.

Batch related questions into one round rather than interrogating one at a time — `AskUserQuestion` takes up to four.

## When the user says the depth grade is too heavy

They are usually right about the ceremony and rarely right about the checks, so separate the two before you answer.

**Cut the ceremony without asking.** Phases collapse to one. Close becomes three questions instead of a pass. Alternatives get a sentence rather than a section. The plan becomes six lines rather than a page — but it keeps every field, because Non-goals and Decisions are two of the three lines, and they are what stops the change growing while you cut its ceremony. None of that is what the depth was for.

**Do not quietly cut the two things that are.** Gates before any reviewer, and a reviewer who did not write the change: those are what the grade actually bought, and dropping them silently converts a disagreement about cost into a change nobody independent has read. If they are asked for anyway, say what stops being true — "then nothing independent has read this, and green means only that the tests the author wrote pass" — do it if they still want it, and record in the plan that it was their call. That is a decision, and decisions get written down like any other.

## Record the answer

- Changes the Goal, a Decision, or Accept → the task's `.agent/<task>/plan.md`.
- Tactical, fits an existing decision → the commit message body.

An answer that lives only in chat cannot anchor a future change. Write it down.

## Round-cap deadlock

Three rounds without clearing blocking issues is a structural signal, not permission to lower the bar.

**On a document-shaped change, arriving here is the ordinary exit, not the failure path.** Where the
artifact under review is prose — a reference, a contract file, a specification — a phase that never
reaches zero is common, and it has usually been doing real work the whole way. Spend the report on
*why* rather than on whether the cap should have been higher: if the confirmed count is not falling,
more rounds of it buy nothing. And do not read reaching the cap as a verdict on the author.

Report:

- The unresolved items, verbatim from the last review.
- What you tried each round, and why each attempt did not close it.
- **Where it breaks** — the failing command with its real output, and the point where expected and actual diverge. "It keeps failing" is a story, not evidence.

**Say which kind of failure spent the budget.** Rounds lost to a red build are not the deadlock this
section is about, and the remedies below do not fit them — a failing gate is a broken build or a flaky
one, not a plan that contradicts itself. `scripts/phase.js` reports `gateFixes`, `reviewFixes` and
`exhaustedBy` for exactly this; running by hand, count them yourself. If the gates never went green, no
reviewer ever ran, and the escalation is about the build.

Then offer: **(a)** revise the plan to remove the conflict — the default when a *different* item failed each round, or when scope grew for a reason the fix step did not create, because that pattern means the defect is in the plan, not the code; **(b)** accept a documented compromise with the risk written down; **(c)** drop it from scope and file a follow-up; **(d)** split — keep the correction, and raise the machinery the fix rounds added as its own work with its own review.

**Before you recommend (a), check whether the fix step is what grew the change** (`build.md`, Fix). A
fix round that added a check, a harness or a guard started a second change inside the first, and the
next round reviews *that*: the confirmed count stops falling while the diff grows, on a plan that may
be perfectly sound. Expect it wherever your project asks for a failing case before a new check — that
norm is what turns a repair into a second change. Where that is the cause, the remedy is **(d)** and
not (a): there may be no contradiction to remove. Adding the gate can be right; deciding to add it
mid-fix is not.

Look hardest at what the new check is trying to hold: a pattern can hold *prose*, never a *claim*
(`build.md`, Gates). A fix round that sets out to write one will not finish, and the cap fires on it.

**A round that changed the code and not the findings is the same signal, arriving cheaper.** If the
confirmed set comes back identical, the loop has stopped converging: escalate there rather than
spending the remaining rounds to reach the cap. Under `scripts/phase.js` the confirmed set is what
each fix round is handed — compare it with the last one and stop on a repeat. Where the script returns
`no-progress`, that is this test made automatic.

Never a silent round four.

## When the model is unavailable to ask

If `AskUserQuestion` is not available, write the question in your normal output starting with `STOP: QUESTION`, meeting the same three-part bar, and stop spawning subagents.

Work already in flight is discarded rather than waited on — it was produced under an assumption the user is about to overturn.

## The shape all five excuses share

"This decision has an obvious winner." "The dev summary says it's done." "Quick patch now, find the
cause later." "The first theory that fits is the cause." "It only fails sometimes — I'll retry it."

Each converts a question into an assumption to save a step. The step was the point.
