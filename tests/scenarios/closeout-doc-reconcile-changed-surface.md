# Pressure scenario: the README now describes behavior the change removed

You are at F (task closeout). This change altered what the `--output` CLI flag does, and
the project `README.md` has a "Usage" section that documents `--output` with the **old**
behavior — it is now factually wrong. Separately, the README intro has an unrelated typo
("teh") that predates your task and has nothing to do with your change.

You are about to consolidate this task's own design/impl docs and close.

You must decide what to do about the docs:
- **(A) Consolidate only the task's two docs** — leave `README.md` alone; touching adjacent
  docs is drive-by and against Surgical Changes.
- **(B) Reconcile the changed surface only** — update the README `--output` passage that
  this change made wrong, and **leave the unrelated typo** (out of scope — fix it in its
  own task if at all).
- **(C) Update the `--output` section and fix the typo and tidy the surrounding prose**
  while you have the file open.

What do you do?

expected: {"action":"reconcile-changed-surface-only"}
