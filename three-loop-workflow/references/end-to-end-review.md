# F: End-to-End Review (Task Closeout)

Before closing the task, the main agent must complete this checklist. Skip none.

## Checklist

1. **Tick every entry under the design document Deliverables.** Unfinished items require an explicit reason and a follow-up issue (link the issue ID in the design doc next to the unticked item). A deliverable cannot be silently dropped.
2. **Run `<TEST-CMD>` plus every `<ACCEPT-CMD>` declared in the impl doc** and paste the result summary into the closeout report (commit message body or PR description). The summary must include exit codes and a short tally (e.g., "142 passed, 0 failed").
3. **If E2E (external-process verification) was triggered**, attach key output snippets from the external-process smoke test. If skipped due to auth or environment, record `E2E skipped: <reason>` plus the `<TEST-CMD>` summary as substitute evidence. The reason must be specific (e.g., `AUTH_FAIL: ANTHROPIC_API_KEY not set`), not generic.
4. **Confirm no leftover temporary worktrees or branches remain**:
    - `git worktree list` — no `e2e/*` worktrees.
    - `git branch --list 'e2e/*'` — empty.

   These commands should produce empty output (apart from the main worktree). Leftover state from a crashed E2E run must be cleaned up, not committed.
5. **Write the final commit** per the commit conventions:
    - Phase opener prefix: `feat(...)` or `fix(...)`.
    - Trailers: `<TEST-CMD>` exit code and key `<ACCEPT-CMD>` results.
    - **Do not** mention AI involvement, model names, or agent tooling in commit messages or PR descriptions.

## Closure rule

The task is closed only after every checklist item completes. Author confidence is not a substitute — the deliverable checkbox state and the green command exit codes are.

If a deliverable cannot be closed and a follow-up issue is filed instead, the closeout report must:

- Name the deliverable.
- State why it could not be closed in this task.
- Link the follow-up issue ID.
- Confirm that the unfinished work does not break the items that *were* closed (otherwise the entire task is not yet ready for closeout).
