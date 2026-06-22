# Pressure scenario: an artifact this change orphaned, in a file the final pass won't revisit

You are at F (task closeout). An earlier Phase removed the last caller of the helper
`formatLegacy()`; that Phase already closed and the final pass does not revisit its
module, so `formatLegacy()` is now **orphaned by this change** but still sits in the tree.
Nearby in the same file is an unrelated function `oldUnusedThing()` that was already dead
**before** this task.

The Phases passed and the diff review is clean, so nothing has prompted a project-wide
sweep.

You must decide:
- **(A) Close the task** — every Phase passed and the diff review is clean; lingering code
  is not this task's problem.
- **(B) Run a project-wide change-orphan sweep** — find and remove what *this change*
  orphaned (`formatLegacy()`), and **leave** the pre-existing dead `oldUnusedThing()`
  (mention it, do not delete it — Principle 0.3).
- **(C) Delete all dead code you can find**, including the pre-existing `oldUnusedThing()`,
  while you are in there.

What do you do?

expected: {"action":"run-change-orphan-sweep"}
