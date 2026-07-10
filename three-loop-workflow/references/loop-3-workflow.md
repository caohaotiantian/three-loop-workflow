# L3: Workflow-Based Phase Execution (Recommended)

**Recommended** L3 execution mode: `references/l3-phase.js` enforces the round caps, structured
verdicts, and two-generation termination as code rather than prose. The four-corner template
and its guarantees are canonical in `references/loop-3-development.md`. Dev agents write to the
main working tree (no worktree isolation); review and accept audit via the `baseSha` diff (see
`references/schemas.md` `DevResult`).

## When to use this

Use for every L3 Phase; fall back to prose mode (`references/loop-3-development.md`) only when the Workflow tool is unavailable (headless CI, restricted harness).

Workflow mode is the **Claude-Code acceleration layer**. On runtimes without the Workflow tool (Codex, opencode) the manual/prose mode in `references/loop-3-development.md` is the **portable baseline** — same discipline, no orchestration automation. See `references/platforms.md`.

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

> **Before invoking, record your current branch name** (e.g. `git branch --show-current`). That is the
> **integration branch** the accepted work fast-forwards back into. It is **not** returned in `DevResult`, and
> the dev subagent's `git checkout -b` moves the shared working tree's HEAD onto the dev branch during the run —
> so capture the integration branch name now, or you cannot return to it for the merge below.

> **Arg delivery (why the script parses `args`).** Some Workflow runtimes hand the script its global
> `args` as a **JSON string** — a verbatim pass-through of the tool-call parameter — rather than a
> parsed object, even when the caller passes a real object as shown above. `l3-phase.js` therefore
> **normalizes `args`** (parses a string, validates the shape) before reading its fields. That
> `JSON.parse(args)` is **intentional and load-bearing — do not delete it as "dead code"**; without it
> the destructure yields all-`undefined` fields and the run dies with a cryptic
> `undefined is not an object (evaluating 'phaseLabel.replace')`. If instead the script throws an
> **arg-validation `Error`** (missing/malformed args), the *invocation* is wrong — fix the args you
> passed. A thrown arg error is **not** a sign the Workflow runner is unavailable, so do **not** fall
> back to prose mode (`loop-3-development.md`) on its account; the prose fallback is for when the
> Workflow *tool itself* cannot run (headless CI, restricted harness).

## Resumption

`l3-phase.js` holds Phase state in process memory (round counter, dev branch, diff base, `fixApplied`)
and persists nothing itself — but the **Workflow runtime journals every `agent()` result**, which is
what makes a run resumable, and the script is deterministic (no `Date.now()` / `Math.random()`)
precisely so that replay is exact. So resumption depends on *how* the run was interrupted:

- **Within the same session** (pause, kill, or a script edit): resume rather than restart — press `p`
  in the `/workflows` view, or relaunch via the Workflow tool's resume
  (`Workflow({ scriptPath, resumeFromRunId: <runId> })`, where `<runId>` is the id the run returned at
  launch). Completed corners return their **cached** results — the dev corner is **not** re-dispatched,
  the diff base and branch are recovered, and the Phase continues from where it stopped. **Do NOT
  delete the dev branch** here; it holds the cached, already-accepted work that resume relies on.
- **Across sessions** (Claude Code was exited while the run was in flight): per the Workflow docs the
  next session starts the workflow **fresh** (the in-session journal does not carry over). Only in this
  case does the round-stable branch name (`<phase>-dev-r1`) matter — before the fresh relaunch the main
  agent should delete the prior dev branch (`git branch -D <phase>-dev-r1`) so the fresh dev does not
  stack duplicate commits onto it.

For the `agent-error` and `dev-escalation` relaunch rows in the Return values table below: prefer
`resumeFromRunId` within the session; delete the branch first only on a cross-session fresh start.

## Return values

| `result.status` | Meaning | Main agent action |
|---|---|---|
| `'closed'` | Phase accepted | Record `result.branch` commit in trailer; advance to next Phase |
| `'cap-exhausted'` | Round cap (3) hit without closure | Escalate to user with a deadlock report (see `references/escalation-rules.md`) |
| `'agent-error'` | A dev/review/accept subagent failed (threw or returned null) twice in a row — infrastructure failure, **not** a review deadlock. In panel mode, an insufficient surviving voter **quorum** (a single `null` from the panel) on an otherwise-clean panel also returns this — degraded coverage, not a deadlock | Report the infrastructure failure; do **not** compose a deadlock report (there are no unresolved severe items to adjudicate); offer to relaunch the Workflow for this Phase (in the panel-quorum case, re-run the panel). `result.stage` names the failing corner. |
| `'design-conflict'` | Dev agent detected conflict | Rollback to L1 or L2 to fix the source document; `result.branch` contains the partial dev branch (clean up with `git branch -D <result.branch>` — the partial branch is unmerged, so safe-delete `-d` would refuse it) |
| `'dev-escalation'` | Dev reported BLOCKED twice (after one re-dispatch) | Main agent supplies missing context / a more capable model and relaunches, OR escalates to the user; do NOT compose a deadlock report (no unresolved severe items) |

When `status === 'closed'`, `result.branch` contains the git branch with the accepted
changes. The **main agent** (not the Workflow script) is responsible for merging. HEAD is on the dev branch
after the run, so **first check out the integration branch you recorded at invocation** (not a positional
`git checkout -`, which is fragile across a cross-session restart), then fast-forward it:
```bash
git checkout <recorded-integration-branch>   # return from the dev branch first
git merge --ff-only <result.branch>
git branch -d <result.branch>
```

> **`status === 'closed'` is not a complete Phase close.** The Workflow script performs
> dev → review → accept only. It does **not** run the main-agent PhaseEnd verification
> (personally re-running `<TEST-CMD>` and every `<ACCEPT-CMD>`, recorded as commit trailers —
> see `references/loop-3-development.md` "Main agent constraints"), the conditional E2E gate
> (`loop-3-development.md` "External-process / End-to-End verification"), or — when the Phase edited
> a discipline rule of THIS skill — the skill-self behavioral check (`loop-3-development.md` "Phase
> termination conditions"; the mechanical accept corner cannot run it). After merging, the main
> agent must still discharge these before advancing to the next Phase.

## Args reference

| Field | Type | Description |
|---|---|---|
| `phaseLabel` | string | Human-readable phase name, e.g. `"Phase 1"` |
| `phaseSpec` | string | Full Phase task list verbatim from the impl doc |
| `designDocPath` | string | Relative path to the design doc |
| `implDocPath` | string | Relative path to the impl doc |
| models | object, optional | per-corner model override {dev,review,accept,fix}; omit a corner for the harness default. See references/optional-subagents.md for routing rationale. |

## Agent budgeting

The dynamic-workflow runtime caps a run at **16 concurrent / 1000 total** agents (per the
Claude Code workflows docs). `l3-phase.js` spawns agents **sequentially** (~1 live at a time),
so it never approaches either cap — they matter only if you add a fan-out mode (e.g. the
optional review panel, `references/multi-voter-review.md`). These caps govern the *workflow
runtime* only: L1/L2/F reviews are **main-agent-spawned subagents**, not bounded by 16/1000. To
gauge spend, run a small slice first and watch `/workflows`.

## Structured output schemas

The script uses three schemas from `references/schemas.md`:
- `ReviewVerdict` — for the review subagent (step 2)
- `AcceptVerdict` — for the accept subagent (step 3)
- `DevResult` — for the dev subagent (step 1)

## Prose-driven fallback

If this script cannot be used, follow `references/loop-3-development.md` (manual/fallback mode) — its four-corner template and guarantees are authoritative regardless of mode.

## Cost expectation

A full L1 → L2 → L3 → F cycle spawns roughly 8–15 fresh subagents (L1/L2 reviews + per-Phase
dev/review/accept/fix + one F review) and produces two committed documents before merge. Apply it
deliberately; it is heavier than a single pass.

## Round tracking with Tasks

Optional; recommended for tasks with >2 L1/L2 rounds: call `TaskCreate` at each loop start and
`TaskUpdate` after each verdict, so the round-cap check survives context compaction — readable via
`TaskGet` instead of conversational memory.
