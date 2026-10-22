# Parallel work

Before concurrent writes, obtain a workspace from the coordinator, or create one without a coordinator.

## Starting revision and inputs

Replace `HEAD` with the assigned revision when applicable.
Verify the absolute outermost checkout and relative module path before substituting the example values.
For linked trees, resolve the original checkout first. Do not use Git metadata directories as checkout anchors.

```bash
start_commit=$(git rev-parse --verify 'HEAD^{commit}')
checkout=/projects/app
module_path=modules/auth # Use an empty value for a standalone repository.
destination="$(dirname "$checkout")/.worktree/$(basename "$checkout")"
if [ -n "$module_path" ]; then
  destination="$destination/$module_path"
fi
git worktree add -b slice-auth "$destination/slice-auth" "$start_commit"
```

Run this from the repository or module that needs the new tree.
The default is `<outermost-checkout-parent>/.worktree/<outermost-repository>/<module-path>/<task>`.
Omit the module path for standalone repositories. Preserve nested module paths beneath the outermost repository namespace.
Keep new trees outside existing checkouts. The location does not select the implementation baseline.

Check project rules, path ownership, and branch occupancy before creation.
If the anchor is ambiguous or the default unavailable, stop before creation.
Before any deviation, explain the reason, proposed absolute path, scope, and effects.
Obtain explicit user confirmation unless an applicable confirmed exception exists.
Record durable rules in AGENTS.md and confirmed exceptions in MEMORY.md, with scope, reason, and source.

New trees contain committed inputs only. Transfer required uncommitted inputs explicitly through commits, patches, or untracked-file copies.
Verify inputs before implementation.

## Shared Git state

Worktrees isolate files and indexes but share most refs, stash, common configuration, and some metadata.
Assign one owner per shared-state operation. Serialize conflicts, or use separate clones when coordination is unavailable.
With a coordinator, request ownership before affected operations. Without one, stop conflicting writers first.

Keep exclusive ownership through stash creation and object-ID capture. Restore that object ID, not the latest stash.

## Workspace constraints

- Choose an unused branch and path for each writer.
- Install dependencies separately. Create separate environments and caches per tree.
- Preserve required work before cleanup. Never force removal of uncommitted changes.
- If linked trees are unavailable, use a separate clone or copy with required inputs.

Ignored or untracked plans do not travel. Supply an accessible absolute plan path or a copy.
