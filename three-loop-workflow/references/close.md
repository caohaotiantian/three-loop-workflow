# Close

Deep changes only. Standard changes are closed by green gates and a clean review.

The Build loop verified each phase in isolation. Close asks the question no phase asked: **is the repository coherent now that all of this has landed?**

Run these against the whole change, not phase by phase — `git diff <baseSha>..HEAD` where `<baseSha>` is the base of **phase 1**, not the base of the phase you just finished. At Deep depth that value advanced with every phase (`build.md`), so use the one you captured first. If you did not keep it, do not guess at it: `git merge-base` gives the branch point, which is the wrong answer whenever the branch already carried earlier work, and gives `HEAD` itself when the change was committed on the base branch — and a range that resolves to nothing produces an empty diff, which reads exactly like a clean Close. Read the branch's `git log --oneline`, take the commit before this change's first one, and **confirm the range is non-empty and contains only this change's commits** before you trust anything below.

## Gates, repository-wide

Run every validation gate the project declares — full test suite, typecheck, lint, build, and any project-specific consistency check. Not the phase subsets: the whole thing, from a clean state.

Paste this run's output. A phase that passed in isolation can still break something three modules away.

## Orphans and blast radius

Remove what your change orphaned; read the call sites of every symbol whose behavior changed, including the ones you were sure were unaffected.

Two lines that are not obvious. **Leave pre-existing dead code alone** — mention it, do not clean it up here; a closeout that grows is the second change inside the first. And the caller you are hunting is the one that **still compiles and now does the wrong thing**: no type checker finds it, because the signature did not move.

## Migrations

If the change migrates persisted data, config, or storage layout, verify it against real data rather than reasoning about it:

- Run it forward on a realistic fixture.
- Run the rollback and confirm the original state comes back.
- Confirm old and new readers behave correctly during the window when both exist.

An unverified migration is a blocking issue. It does not close on "the code looks right".

## Documentation

Reconcile only what this change actually made stale: the README if behavior it documents moved, the project guide if a command or norm changed, API docs if a contract changed.

Scope this tightly. A closeout pass is not an invitation to rewrite the docs.

## Read the result as a product, not as a diff

If the change's output is something a person will read or run as a whole — a document set, a CLI's
help, a config schema, a public API surface — one reviewer reads the **finished files**, with no diff
and no change context, the way a new user meets them.

This catches a different class of defect from diff review, and it is not a nice-to-have: on this
skill's own release, round after round of diff review left the most serious defect in the release
standing, and readers handed the finished files with no change context found it at once. A diff
reviewer checks whether each line is justified. Only a reader of the whole thing notices that two
sections now contradict each other, that a documented step cannot actually be performed, or that a
claim survives in one file after being corrected in another.

Ask: does this read as one coherent thing? Is anything stated here that the code does not do? Could
someone follow these instructions and fail?

## Clean up

**Leave the task's `.agent/<task>/` directory.** It is gitignored, it costs nothing, and it is the only local record of what this task planned and decided once the branch is merged. Delete it when you no longer want that record, not as routine cleanup.

Its `journal.md`, if the task wrote one, is waiting for a reader: `references/maintenance.md` is the pass that folds it into the project guide and prunes what it promoted. That is a separate task, not a step here.

Remove scratch worktrees, spike directories, and temporary artifacts the work created — those are not the record.

## What Close does not do

It does not produce a document. The change is described by its commits and its PR; a closure record that restates them is exhaust, and the archive it accumulates into is read by nobody.

If something is worth saying to a future reader, put it in the commit message or the PR body, where it stays attached to the diff it explains.
