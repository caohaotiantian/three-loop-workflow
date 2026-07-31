# Escalation

A silent default is a decision nobody made and no later reviewer can challenge. Surface it instead.

## Stop and ask when

| Situation | What to say |
|---|---|
| The request admits more than one reading, and they lead to different work | The readings, with your recommendation |
| A breaking change to a published contract — schema, exit code, CLI, wire protocol, storage layout | The change, plus what migration costs |
| A threshold or magic number with no source | Cite an existing constant if one exists; otherwise ask |
| Legacy fields on a schema: keep, migrate, or drop | The options, plus the surface each one touches |
| Deleting a file listed under the project guide's _load-bearing-docs_ | Which contract it fulfills, what replaces it, and every file that references it — **ask before deleting** |
| The action exceeds your authority: pushing to main, deleting outside the workspace, sending anything externally | Ask for authorization first |
| Credentials, network, or permissions are missing | Verify the actual failure first, then report what you found |
| Another in-flight task overlaps this domain | The overlap, and whether to merge or serialize |

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

## Record the answer

- Changes the Goal, a Decision, or Accept → the task's `.agent/<task>/plan.md`.
- Tactical, fits an existing decision → the commit message body.

An answer that lives only in chat cannot anchor a future change. Write it down.

## Round-cap deadlock

Three rounds without clearing blocking issues is a structural signal, not permission to lower the bar.

**On a document-shaped change, arriving here is the ordinary exit, not the failure path.** Where the
artifact under review is prose — a reference, a contract file, a specification — a phase that never
reaches zero is common, and it has usually been doing real work the whole way. Measured on this
repository's own reference material — one document, a handful of runs — with the cap deliberately
lifted so that convergence above three could be seen at all; the figures and their limits are published
outside the skill. Two things follow.
Spend the report on *why* rather than on whether the cap should have been higher — the same measurement
found the confirmed count was not falling, and more rounds of a count that is not falling buy nothing.
And do not read reaching the cap as a verdict on the author.

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

**Before you recommend (a), check whether the fix step is what grew the change.** A fix round that adds a check, a
harness or a guard has started a second change inside the first, and the next round reviews *that*: the
confirmed count stops falling while the diff keeps growing, and every round is honest work on something
the plan never scoped. On the runs measured here it was the commonest way a document-shaped change
reached this section, and the runs that avoided it were the ones whose fix step added nothing. The remedy is not to remove a contradiction, because there may not be one — it is **(d)**.
Adding the gate can be right; deciding to add it mid-fix is not.

Look hardest at what the new check is trying to hold. A pattern can hold *prose* — the presence of a
sentence is the property you want. It cannot hold a *claim*: no pattern separates "the script detects X"
from "the script does not detect X" without also rejecting the true sentences a writer is entitled to
make about X. A fix round that sets out to write one will not finish, and the cap will fire on it.

Never a silent round four.

## When the model is unavailable to ask

If `AskUserQuestion` is not available, write the question in your normal output starting with `STOP: QUESTION`, meeting the same three-part bar, and stop spawning subagents.

Work already in flight is discarded rather than waited on — it was produced under an assumption the user is about to overturn.

## Excuses worth recognizing

Five that reliably precede a bad outcome, and what to do instead:

| The thought | Instead |
|---|---|
| "This decision has an obvious winner" | If you are arguing the point, it is a real decision. Name both options and pick with reasons. |
| "The dev summary says it's done" | Read the diff. The summary is the thing under review, not evidence about it. |
| "Quick patch now, find the cause later" | Name the cause first. A symptom fix spends a round and forces another one anyway. |
| "The first theory that fits is the cause" | Rank 3–5 falsifiable hypotheses and find the observation that separates them. |
| "The test only fails sometimes — I'll retry it" | That is a flake. Say so, leave the test alone, raise it separately. |

The pattern underneath all five: each converts a question into an assumption to save a step. The step was the point.
