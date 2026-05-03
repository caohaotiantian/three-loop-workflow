# F: End-to-End Review (Task Closeout)

Before closing the task, the main agent must complete this checklist. Skip none.

## Checklist

1. **Tick every entry under the design document Deliverables.** Unfinished items require an explicit reason and a follow-up issue (link the issue ID in the design doc next to the unticked item). A deliverable cannot be silently dropped.
2. **Run `<TEST-CMD>` plus every `<ACCEPT-CMD>` declared in the impl doc** and paste the result summary into the closeout report (commit message body or PR description). The summary must include exit codes and a short tally (e.g., "142 passed, 0 failed").
3. **If E2E (external-process verification) was triggered**, attach key output snippets from the external-process smoke test. If skipped due to auth or environment, record `E2E skipped: <reason>` plus the `<TEST-CMD>` summary as substitute evidence. The reason must be specific (e.g., `AUTH_FAIL: ANTHROPIC_API_KEY not set`), not generic.
4. **Confirm no leftover temporary worktrees, branches, or artifacts remain**:
    - `git worktree list` — no `e2e/*` worktrees.
    - `git branch --list 'e2e/*'` — empty.
    - `.e2e-artifacts/<task-slug>-*/` — review the directories produced by this task. Keep only those linked from the closeout report (as evidence). Delete the rest. None of them should ever be staged for commit (`.e2e-artifacts/` is gitignored on first use; verify the rule is in `.gitignore`).

   The git commands should produce empty output (apart from the main worktree). Leftover state from a crashed E2E run must be cleaned up, not committed.
5. **Consolidate task documents.** Run a single, focused consolidation pass over `docs/design/<task-slug>.md` and `docs/implementation/<task-slug>.md`. The point is to leave a clean, archive-quality record for future readers; **not** to refactor adjacent docs. See "Document consolidation" below for the exact procedure.
6. **Write the final commit** per the commit conventions:
    - Phase opener prefix: `feat(...)` or `fix(...)`.
    - Trailers: `<TEST-CMD>` exit code and key `<ACCEPT-CMD>` results.
    - The closing commit bundles both the final code state and the consolidated docs from step 5.
    - **Do not** mention AI involvement, model names, or agent tooling in commit messages or PR descriptions.

## Document consolidation (step 5 detail)

Surgical Changes governs this step: edit only the two files this task created, and only to remove obsolete scaffolding or add a closure marker. Do not "tidy up" prior tasks' docs, rename files for consistency, or rewrite prose for style. If a prior doc is genuinely wrong, that is a separate task with its own L1 cycle.

Run these substeps in order:

1. **Prune ephemeral content.**
    - Impl doc: delete the `Deprecated` section (commits / Phase plans rolled back during L1 → L2 round-trips). The git history preserves them; the doc no longer needs to.
    - Both docs: remove `TODO`, `DRAFT`, `?` placeholders, and strike-through markers that the closing commit resolved.
    - Do **not** touch Key Design Decisions, Acceptance Criteria, escalated-decision records, or rationale — those are load-bearing and must survive intact.
2. **Mark closure status.** At the top of each of the two files, add (or update) a frontmatter-style block:
    ```
    Status: closed
    Closing-commit: <short-sha>
    Closed-on: <UTC date, YYYY-MM-DD>
    Deferred: <issue-id>, <issue-id>   # or "none"
    ```
    `Deferred` lists every Deliverable that was unticked at closeout, with its follow-up issue ID. If none, write `none`.
3. **Cross-link supersedes / superseded-by.** If this task's design extended or replaced a prior `docs/design/*.md`:
    - In the new doc, add `Supersedes: <prior-task-slug>` to the closure block.
    - In the prior doc, add `Superseded-by: <this-task-slug>` to its closure block.
    Cross-link only when there is a genuine succession relationship (the new design replaces or strictly extends the prior). Loose topical overlap is not enough — over-cross-linking turns the doc graph into noise.
4. **Optional merge.** If this task's design is a small follow-up that adds at most one or two Deliverables / Acceptance Criteria to an immediately prior, still-active design, the main agent **may** fold the additions into the prior doc and delete the new file in the closing commit. Conditions:
    - The prior design's `Status` is not `closed`, or it is closed but is the canonical reference for this area.
    - The merged additions are clearly attributable (annotate them with `(added by <task-slug>)` to preserve provenance).
    - The impl doc stays as a separate file (impl docs are per-task by construction; do not merge them).

    Larger designs stay as standalone files. When in doubt, do not merge.
5. **Spawn a fresh review subagent** with the prompt template below. One round only. The subagent's sole job is to confirm the consolidation removed only ephemeral content and preserved every load-bearing claim. Severe findings here escalate to the user — do not roll a second round of consolidation, because that pattern silently invites information loss.

### Consolidation review subagent prompt template

```plaintext
You are the closeout review engineer for the {{project-name}} project.

[Task] Compare the consolidated forms of {{design-doc-path}} and
{{impl-doc-path}} against the immediately prior versions on disk before
this consolidation pass. Confirm that consolidation removed only
ephemeral content and preserved every load-bearing claim.

[Inputs]
- Pre-consolidation version: `git show HEAD:{{design-doc-path}}`,
  `git show HEAD:{{impl-doc-path}}` (last committed state before the
  closing commit's working tree).
- Post-consolidation version: the current working-tree files.
- Closure block, Deferred list, Supersedes / Superseded-by links.

[Steps]
1. Diff pre vs post for each file.
2. For each removed line, classify as: ephemeral (Deprecated, TODO,
   DRAFT, resolved strike-through, expired placeholder) — OR — load-
   bearing (Deliverable, Acceptance Criterion, Key Design Decision,
   rationale, risk, rollback, escalated-decision record, Phase task,
   acceptance command, regression-protection entry).
3. Any load-bearing line removed without a redirect (Supersedes link,
   merged-into target) is a severe issue.
4. Confirm the closure block is present, the Closing-commit SHA exists
   in `git log`, and every Deferred deliverable has a follow-up issue
   ID.
5. Confirm Supersedes / Superseded-by links, if present, point to real
   files. No dangling links.
6. Do not modify any document. Output only the review report.

[Output format]
## Consolidation Review Report

### Severe issues (block closure)
- [file:line] description

### General issues (recommend fixing before commit)
- …

### Verdict
pass / needs fix / severe non-conformance
```

## Closure rule

The task is closed only after every checklist item completes. Author confidence is not a substitute — the deliverable checkbox state, the green command exit codes, and the consolidation-review verdict are.

If a deliverable cannot be closed and a follow-up issue is filed instead, the closeout report must:

- Name the deliverable.
- State why it could not be closed in this task.
- Link the follow-up issue ID (also recorded in the closure block's `Deferred:` line).
- Confirm that the unfinished work does not break the items that *were* closed (otherwise the entire task is not yet ready for closeout).
