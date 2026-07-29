# Close

Deep changes only. Standard changes are closed by green gates and a clean review.

The Build loop verified each phase in isolation. Close asks the question no phase asked: **is the repository coherent now that all of this has landed?**

Run these against the whole change (`git diff <baseSha>..HEAD`), not phase by phase.

## 1. Gates, repository-wide

Run every validation gate the project declares — full test suite, typecheck, lint, build, and any project-specific consistency check. Not the phase subsets: the whole thing, from a clean state.

Paste this run's output. A phase that passed in isolation can still break something three modules away.

## 2. Orphans

Your change may have stranded things:

- Imports, variables, helpers, or config keys whose only caller you deleted.
- Tests asserting behavior that no longer exists.
- Feature flags, env vars, or fixtures the change made permanent or dead.
- Generated files that no longer match their source.

Remove what your change orphaned. Leave pre-existing dead code alone — mention it, do not clean it up here.

## 3. Blast radius

Find the callers you did not touch. `grep` for the symbols whose behavior changed and read the call sites — including the ones you were confident were unaffected.

The failure this catches is a caller that still compiles and now does the wrong thing. Types will not find it; a compiler cannot know the semantics changed underneath a signature that stayed the same.

## 4. Migrations

If the change migrates persisted data, config, or storage layout, verify it against real data rather than reasoning about it:

- Run it forward on a realistic fixture.
- Run the rollback and confirm the original state comes back.
- Confirm old and new readers behave correctly during the window when both exist.

An unverified migration is a blocking issue. It does not close on "the code looks right".

## 5. Documentation

Reconcile only what this change actually made stale: the README if behavior it documents moved, the project guide if a command or norm changed, API docs if a contract changed.

Scope this tightly. A closeout pass is not an invitation to rewrite the docs.

## 6. Clean up

**Leave the task's `.agent/<task>/` directory.** It is gitignored, it costs nothing, and it is the only local record of what this task planned and decided once the branch is merged. Delete it when you no longer want that record, not as routine cleanup.

Remove scratch worktrees, spike directories, and temporary artifacts the work created — those are not the record.

## What Close does not do

It does not produce a document. The change is described by its commits and its PR; a closure record that restates them is exhaust, and the archive it accumulates into is read by nobody.

If something is worth saying to a future reader, put it in the commit message or the PR body, where it stays attached to the diff it explains.
