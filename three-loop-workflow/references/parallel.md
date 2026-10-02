# Parallel work

Read this when more than one writer runs at once: a change split into slices, or a phase handed to its own
agent. `SKILL.md` §3 states the rule and why; this file is the mechanism it needs: a linked working tree
per writer, on its own branch.

```bash
repo=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
git -C "$repo" worktree add -b slice-auth \
  "$repo/../.$(basename "$repo")-worktrees/slice-auth"
```

**Anchor on the main tree, not the one you are standing in.** `git worktree list` names the main worktree
first; `git rev-parse --show-toplevel` answers with the tree you are in, so from inside a linked tree it
groups the new tree inside the old one instead of beside it. Keep the trees outside the checkout, grouped
under one hidden sibling.

**A relative path is worse still.** It resolves against the current directory, not the repository: run from
a subdirectory it creates the tree *inside* the checkout, and run from another tree it nests one tree
inside another. Both exit 0 and nothing warns.

**What bites:**

- One branch per tree. A branch checked out elsewhere is refused, and so is one that merely exists — which
  is what a tree removed earlier leaves behind.
- Dependencies, virtual environments and build caches are per tree and want reinstalling. On a large
  project that can cost more than the parallelism saves, so measure before splitting the work.
- Removal refuses a tree holding uncommitted work, a writer's ordinary state before integration: commit
  first, and read `--force` as discarding that work rather than tidying up. `git worktree prune` clears
  the metadata of a directory deleted by hand.
- Where the project's version control has no linked trees, a clone or a second copy serves the same
  purpose.

**The plan may not travel.** A task directory that is untracked or ignored is absent from a new tree, so
the writer starts without it. Give the writer the plan's absolute path in the main tree; copy it in only
where the writer cannot see the main tree at all.
