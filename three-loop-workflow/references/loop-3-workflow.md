# L3: Workflow-Based Phase Execution (Recommended)

This file describes how to invoke `references/l3-phase.js` to run an L3 Phase
deterministically. The Workflow-based mode is **recommended** over the manual
prose-driven mode (`references/loop-3-development.md`) because it enforces round caps,
structured verdicts, and the two-generation termination condition as deterministic code
rather than prose instructions. Dev agents write directly to the main working tree
(no git worktree isolation), so accept commands see the correct state; the review and
accept subagents audit the dev changes via `git diff <baseSha>..<devBranch>` (the dev
agent returns `baseSha` in `DevResult`).

## When to use this

Use for every L3 Phase in normal operation. Fall back to the prose-driven mode only when:
- The Workflow tool is unavailable (headless CI, restricted harness).

## Invocation

From the main agent (after L1 and L2 docs are complete), invoke once per Phase:

```javascript
const result = await Workflow({
  scriptPath: '/path/to/.claude/skills/three-loop-workflow/references/l3-phase.js',
  args: {
    phaseLabel:    'Phase 1',
    phaseSpec:     '<paste full Phase task list from docs/implementation/<slug>.md>',
    designDocPath: 'docs/design/<slug>.md',
    implDocPath:   'docs/implementation/<slug>.md',
  }
})
```

The `scriptPath` must point to the installed skill copy. If the skill is installed
user-globally: `~/.claude/skills/three-loop-workflow/references/l3-phase.js`.
Do NOT use a `name:` registry lookup — this script is not registered as a named workflow.

## Return values

| `result.status` | Meaning | Main agent action |
|---|---|---|
| `'closed'` | Phase accepted | Record `result.branch` commit in trailer; advance to next Phase |
| `'cap-exhausted'` | Round cap (3) hit without closure | Escalate to user with a deadlock report (see `references/escalation-rules.md`) |
| `'agent-error'` | A dev/review/accept subagent failed (threw or returned null) twice in a row — infrastructure failure, **not** a review deadlock | Report the infrastructure failure; do **not** compose a deadlock report (there are no unresolved severe items to adjudicate); offer to relaunch the Workflow for this Phase. `result.stage` names the failing corner. |
| `'design-conflict'` | Dev agent detected conflict | Rollback to L1 or L2 to fix the source document; `result.branch` contains the partial dev branch (clean up with `git branch -d result.branch`) |

When `status === 'closed'`, `result.branch` contains the git branch with the accepted
changes. The **main agent** (not the Workflow script) is responsible for merging:
```bash
git merge --ff-only <result.branch>
git branch -d <result.branch>
```

## Args reference

| Field | Type | Description |
|---|---|---|
| `phaseLabel` | string | Human-readable phase name, e.g. `"Phase 1"` |
| `phaseSpec` | string | Full Phase task list verbatim from the impl doc |
| `designDocPath` | string | Relative path to the design doc |
| `implDocPath` | string | Relative path to the impl doc |

## Structured output schemas

The script uses three schemas from `references/schemas.md`:
- `ReviewVerdict` — for the review subagent (step 2)
- `AcceptVerdict` — for the accept subagent (step 3)
- `DevResult` — for the dev subagent (step 1); `branch` field is **required**

## Prose-driven fallback

If this script cannot be used, follow `references/loop-3-development.md` (manual/fallback mode).
The four-corner template, role responsibilities, commit conventions, and E2E gate described
there remain authoritative regardless of which mode is used.
