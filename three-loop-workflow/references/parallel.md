# Parallel work

Read this before implementation in a concurrent writer assignment.
Use the assigned workspace. If none exists, request one from the coordinator before writing.
Without a coordinator, create the required workspace directly.

## Starting revision and inputs

For assignments, replace `HEAD` below with the assigned starting revision.
For standalone work, capture the current task commit before selecting the filesystem anchor.

```bash
start_commit=$(git rev-parse --verify 'HEAD^{commit}')
repo=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
git -C "$repo" worktree add -b slice-auth \
  "$repo/../.$(basename "$repo")-worktrees/slice-auth" "$start_commit"
```

Anchor absolute workspace paths on the main worktree, which `git worktree list` lists first.
Keep new trees outside existing checkouts. Relative paths can place them inside the current checkout or another linked tree.
The filesystem anchor does not select the implementation baseline.

New trees contain committed inputs only.
Transfer required uncommitted changes explicitly through commits, patches, or copies of required untracked files.
Verify those inputs before dependent implementation starts.

## Shared Git state

Worktrees isolate files and indexes. They share most refs, the stash, common repository configuration, and some metadata.
Assign one owner to each shared-state operation. Serialize conflicts.
With a coordinator, request ownership before affected operations. Without one, stop conflicting writers first.
Use separate clones if ownership cannot be coordinated.

Keep exclusive ownership through stash creation and object-ID capture.
Restore that recorded object ID instead of the latest stash.

## Workspace constraints

- Choose an unused branch and path for each writer.
- Install dependencies and create environments and caches separately for each tree.
- Preserve required work before cleanup. Do not force removal of a writer's uncommitted changes.
- If linked trees are unavailable, use a separate clone or copy with the required inputs.

Ignored or untracked plans do not appear in a new tree.
Supply the plan's absolute path or a copy when the writer cannot access that path.
