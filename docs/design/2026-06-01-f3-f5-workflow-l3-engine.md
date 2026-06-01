# Design: F3 + F5 — Workflow-based L3 engine with worktree isolation

```
Status: closed
Closing-commit: 537cae5
Closed-on: 2026-06-01
Deferred: none
```

E2E gate: PASS — 19/19 structural smoke-test checks on installed skill files. Full CLI subprocess E2E not triggered; skill is documentation/script-only with no external service entry points.

## 1. Background and Purpose

The three-loop-workflow skill v1.3 deferred two features from the audit:

- **F3 — Workflow tool as L3 execution engine**: the L3 four-corner loop (dev → review → accept → fix) is currently driven by prose instructions. Claude must hold round counters, termination conditions, and role assignments in context. This produces the most common failure mode: silent round-count loss due to context compaction, and role confusion when the same agent reasons about "what should I do next."
- **F5 — Worktree isolation for L3 dev/fix agents**: dev and fix agents currently write directly to the shared working tree. A rejected round leaves stray file mutations that contaminate the next round.

F1 (structured output / `ReviewVerdict` schema) shipped in v1.3 and is the prerequisite for both. Without this work:

- A long-running L3 task can lose its round counter mid-session, silently restart from round 1, and ship code that has never passed a legitimate review.
- A rejected dev round leaves partial edits in the working tree, causing the next round's review to see stale mutations.

## 2. Deliverables

- [ ] D1: New file `references/l3-phase.js` — a Workflow script that implements the L3 Phase loop (dev → review-loop → accept-loop, round cap 3, structured verdict, worktree isolation for dev/fix)
- [ ] D2: New file `references/loop-3-workflow.md` — documentation explaining how the calling agent invokes `l3-phase.js`, what `args` to pass, how to interpret return values, and how to handle `cap-exhausted` and `design-conflict` outcomes
- [ ] D3: `references/schemas.md` gains `AcceptVerdict` schema (needed by the accept subagent in the script); the existing `ReviewVerdict` loop-closure formula comment is verified correct (no change if already correct)
- [ ] D4: `SKILL.md` routing table gains a new row for "Run an L3 Phase using the Workflow tool" → `references/loop-3-workflow.md`; the existing L3 row is updated to add the word "fallback" to its label (e.g., "Start a Phase (L3) — manual/fallback mode") so both modes are clearly distinguished; `loop-3-workflow.md` (D2) must document the `scriptPath` invocation syntax (not a `name:` registry lookup) and include a version caveat for `isolation: 'worktree'` stability
- [ ] D5: `references/loop-3-development.md` gains a top-level note directing agents to use the Workflow script (D1/D2) as the recommended L3 execution mode; prose instructions remain as fallback

## 3. Scope Boundary

**In scope**: all changes listed in §2.

**Out of scope**:
- L1 and L2 loops are **not** converted to Workflow scripts. The value of deterministic control is highest in L3 (many dev/fix iterations). L1 and L2 are main-agent-driven with at most 3 rounds each — context loss is less likely and the simpler model suffices.
- `references/l3-phase.js` does NOT implement an E2E verification step. The E2E gate is a main-agent responsibility (conditional, environment-dependent) and does not benefit from Workflow determinism. The script closes at Phase acceptance.
- The script does NOT manage the full L3 Phase sequence (multiple Phases). Calling `l3-phase.js` once per Phase is the main agent's responsibility. The script is a per-Phase tool.
- Saved named Workflow (`name:` registration in `.claude/workflows/`) is NOT done — skill users invoke by `scriptPath`, keeping the script self-contained inside the skill distribution.
- Changes to `WORKFLOW-v3.md` are out of scope for this task. The spec already describes the L3 loop conceptually; the Workflow-based implementation is an operational detail of the skill.

## 4. Key Design Decisions

### Decision 1 — Primary vs. alternative L3 mode

**Problem**: the existing prose-driven L3 instructions are used by every project currently running this skill. Replacing them abruptly could break workflows. But making the Workflow mode purely optional risks it never being adopted.

**Candidate options**:
- Option A — Hard replace: remove prose L3 instructions, Workflow script is the only mode. Clean, but breaks projects without the Workflow tool.
- Option B — Workflow primary, prose fallback: SKILL.md and `loop-3-development.md` recommend the script; prose instructions stay as a clearly-labeled fallback for environments that lack the Workflow tool (headless runners, restricted harnesses). Both modes are correct.
- Option C — Opt-in annotation only: add the script reference as an optional footnote. Low friction, but the main value (preventing context loss) is only realized if people actively opt in.

**Choice: Option B.**
Rationale: the Workflow tool is available in all standard Claude Code environments (desktop, CLI, IDE extensions) but not in all CI/scripting contexts. Labeling prose as "fallback" makes the intent clear without breaking existing deployments. Option A's forced migration has a non-zero blast radius. Option C's opt-in footnote leaves the most dangerous failure mode (round-count loss on long tasks) unaddressed for most users.
Rejected because: Option A breaks existing deployments; Option C never fixes the problem in practice.

### Decision 2 — Worktree merge/discard responsibility

**Problem**: when a dev or fix agent runs with `isolation: 'worktree'`, its changes live in an isolated worktree. If review/accept rejects the work, the worktree must be discarded. If accepted, the main working tree must be updated.

**Candidate options**:
- Option A — Script manages merge/discard: the Workflow script calls a post-fix bash command via the accept/fix agents to commit and merge (or the dev agent returns the branch name for later merge). Complex; requires cross-agent communication of worktree paths.
- Option B — Agents self-manage via return value: the dev agent, running in a worktree, commits its work to a clearly named branch (e.g., `phase1-dev-round1`) and returns the branch name as structured output. The Workflow script passes this branch name to the review agent for diffing, and to a post-accept merge step. Explicit, traceable.
- Option C — Dev agent merges optimistically, fix-step reverts on failure: each dev agent commits + merges into the main branch immediately; if review rejects, the fix agent uses `git revert`. Simple script logic, but leaves the main branch dirty between rounds.

**Choice: Option B.**
Rationale: Option B keeps the working tree clean until acceptance is confirmed. The dev agent commits to a named branch; the review agent diffs that branch; on acceptance the calling agent merges. Both Options A and B require the dev agent to commit and communicate a branch name — neither option relies on platform-provided metadata (the Workflow `agent()` return value carries only the agent's structured output, not worktree internals). The real distinction is WHEN the merge happens: Option B defers merge to post-accept (clean); Option A attempts merge earlier. Option C pollutes the main branch history with rejected rounds.
Rejected because: Option A's earlier merge creates dirty history on rejection; Option C creates dirty history unconditionally.

**Implementation note (args interface)**: the calling agent passes `args` with the following shape:
```js
{
  phaseLabel: string,      // e.g. "Phase 1"
  phaseSpec: string,       // full Phase task list from the impl doc
  designDocPath: string,   // e.g. "docs/design/2026-06-01-*.md"
  implDocPath: string,     // e.g. "docs/implementation/2026-06-01-*.md"
}
```
The script returns `{ status: 'closed'|'cap-exhausted'|'design-conflict', phaseLabel, round }`.
`design-conflict` is returned when the dev agent reports that the design doc conflicts with the implementation task; the calling agent must handle it by rolling back to L1 or L2.

**Implementation note**: `agent()` in Workflow scripts does not natively expose the worktree branch name. The dev agent must return the branch name as part of its structured output. Define a `DevResult` schema in `schemas.md` with a `branch` field. If the dev agent fails to populate `branch`, the script falls back to Option A behavior (no merge management) and logs a warning.

### Decision 3 — AcceptVerdict schema vs. free-text accept result

**Problem**: the existing prose-driven accept subagent returns free text. The Workflow script needs to branch on `all_pass: boolean` mechanically.

**Candidate options**:
- Option A — New `AcceptVerdict` schema in `schemas.md`: `{ all_pass: boolean, failures: string[] }`. Consistent with `ReviewVerdict` pattern.
- Option B — Reuse `ReviewVerdict` for accept: the accept agent returns a schema-constrained verdict using `ReviewVerdict`. Fewer schemas, but semantically wrong — accept is not a review.

**Choice: Option A.**
Rationale: accept and review are distinct roles. `ReviewVerdict` has `severe`/`general`/`verdict` fields that are meaningless for a mechanical command-runner. A dedicated `AcceptVerdict` with `all_pass` and `failures` matches the accept role's actual output. Option B is semantically polluting.
Rejected because: Option B forces unnatural field mapping and misleads future readers.

### Decision 4 — DevResult schema inclusion

**Problem**: the dev agent must communicate its branch name back to the Workflow script (Decision 2). Should this be a full schema or a convention?

**Candidate options**:
- Option A — `DevResult` schema in `schemas.md`: `{ branch: string, summary: string, conflict: boolean }`. Strict, validatable.
- Option B — Convention in `loop-3-workflow.md`: "dev agent MUST include `branch: <name>` in its final output text." Lighter, but unreliable (parsing free text).

**Choice: Option A.**
Rationale: consistency with the ReviewVerdict/AcceptVerdict pattern; structured output prevents branch-name parsing errors in the Workflow script.

## 5. Dependencies and Assumptions

- `references/schemas.md` exists (added in v1.3). New schemas are appended to it.
- The Workflow tool (`agent()`, `phase()`, `log()`, `parallel()`) is available in the executing environment.
- The `isolation: 'worktree'` option in `agent()` causes the agent to receive its own git worktree. The Workflow script's `agent()` function returns only the agent's text output or, when `schema:` is set, the validated JSON object — it does NOT automatically expose the worktree path or branch name as metadata. The script therefore relies entirely on the dev agent explicitly committing its work, naming the branch (e.g., `phase1-dev-r1`), and returning it in `DevResult.branch`. No platform magic is assumed; the branch name is a voluntary field in the agent's structured output.
- `isolation: 'worktree'` and `schema:` are composable options: `agent(prompt, { isolation: 'worktree', schema: DevResultSchema })`. The agent runs in its own worktree AND returns the validated object. This composability is confirmed by the Workflow tool's `opts` API (separate keys, no mutual exclusion).
- `<TEST-CMD>` is not applicable (this project has no test suite). Acceptance is grep-based.
- Source and installed copies are updated in sync (established pattern from v1.3 Decision 4).

## 6. Relationship with Existing Designs

Prior: `docs/design/skill-v1-3-improvements.md` (Status: closed, commit 9f6e71c, 2026-06-01). That task explicitly deferred F3+F5 to this task (§3 Scope Boundary, §4 Decision 1). The v1.3 schemas.md `ReviewVerdict` definition is the prerequisite for the script's review-verdict branching.

`docs/design/roles-and-test-intent.md` (Status: closed, commit 5860b25). No conflict; this task adds a new execution path, not a new review rule.

No supersedes relationship: this task extends v1.3 (adds new files, minor additions to existing ones). It does not replace any prior design.

## 7. Acceptance Criteria

- AC1: `test -f /home/fedora/workflow/three-loop-workflow/references/l3-phase.js` exits 0
- AC2: `grep -n "export const meta" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js` exits 0 (valid Workflow script)
- AC3: `grep -n "isolation.*worktree" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js` exits 0 (F5 worktree isolation present)
- AC4: `grep -n "ReviewVerdict\|REVIEW_SCHEMA" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js` exits 0 (structured verdict check present)
- AC5: `grep -n "round > 1\|round>1" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js` exits 0 (two-generation guard present — the formula `round > 1 && priorGeneralCount === 0` must appear; this grep is a proxy for the former factor)
- AC6: `test -f /home/fedora/workflow/three-loop-workflow/references/loop-3-workflow.md` exits 0
- AC7: `grep -n "AcceptVerdict\|DevResult" /home/fedora/workflow/three-loop-workflow/references/schemas.md` exits 0 (new schemas added)
- AC8a: `grep -n "loop-3-workflow.md\|l3-phase" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0 (new Workflow-mode routing row present)
- AC8b: `grep -n "manual/fallback\|fallback.*L3\|Start.*Phase.*fallback" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0 (existing L3 row updated with fallback label; patterns do not match any pre-existing text)
- AC9: `grep -in "l3-phase\|loop-3-workflow\|Workflow.*primary\|Recommended.*Workflow" /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md` exits 0 (top-level Workflow-mode note added; patterns do not match pre-existing text in the unmodified file)
- AC10: `diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/` exits 0 (source and installed in sync; the L2 impl doc must specify a pre-Phase entry action that re-runs this check before any edits begin)
- AC11: `grep -n "accept.*while\|while.*accept\|CapA\|acceptRound\|acceptFix" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js` exits 0 (proxy check for accept-failure loop — the impl doc must also require a narrative description of the accept-failure routing path for structural verification at L2 review)
- AC12: `grep -n "design.conflict\|designConflict\|design_conflict" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js` exits 0 (design-conflict return status reachable in script)

## 8. Risks and Rollback

**Risk 1 — Worktree branch name communication**: if the dev agent (running in a worktree) does not populate `DevResult.branch`, the Workflow script cannot manage merge/discard. Two sequential mitigations apply: (1) The `DevResult` schema marks `branch` as `required`, so schema validation rejects a missing value immediately — the `agent()` call itself fails and the script can catch the failure before any routing logic runs. (2) If schema validation is absent or bypassed (e.g., the dev agent is invoked without a `schema:` option as a fallback), the script must explicitly check for a null `branch` and route to the fix corner with the message "dev agent did not commit or did not return branch name," incrementing the round counter. Gate (1) is the primary defense; gate (2) is the fallback for schema-less invocations.

**Risk 2 — accept subagent cannot run ACCEPT-CMDs against the dev branch**: if accept commands require the changes to be in the main working tree (e.g., `diff` against HEAD), running accept against an unmerged dev branch may fail. Mitigation: the accept subagent is instructed to run commands in the main worktree after a non-destructive `git diff <branch>` verification step. The accept agent does NOT merge; it only verifies. The merge is a post-accept step by the Workflow script or calling agent.

**Risk 3 — Round cap encoding is off-by-one**: the prose rule says "cap of 3 per domain" and the `schemas.md` formula uses `round > 1`. An off-by-one in the JavaScript loop could allow a 4th round or block at round 2. Mitigation: the script is tested against the termination examples in §4 Decision N/A (derived here): with cap=3 and correct priorGeneralCount tracking, at most 3 fix cycles are possible; a 4th fix attempt returns `cap-exhausted`.

**Risk 4 — Scope creep into L1/L2 Workflow scripts**: the script pattern might prompt future editors to add L1/L2 Workflow scripts in the same file. Mitigation: the scope boundary in §3 is explicit; the `l3-phase.js` script's `meta.description` says "per-Phase L3 only"; `loop-3-workflow.md` explicitly notes L1/L2 are out of scope.

**Risk 5 — `isolation: 'worktree'` version instability**: the worktree isolation feature has had multiple bug fixes in Claude Code releases (stale worktree reuse, sandbox allowlist gaps). No minimum version can be stated precisely here, but the skill's README and `loop-3-workflow.md` should note that the Workflow-based L3 mode requires a Claude Code release where worktree isolation is stable. Projects using older clients should use the prose-driven fallback. This is an informational risk, not a blocking one.

**Rollback**: all changes are either new files or backward-compatible additions to `schemas.md` (new schemas appended; no existing schema modified). Rolling back is `git revert <commits>`. The installed copy is re-synced from source after revert. The `l3-phase.js` file is not imported or required by any existing code path — reverting it has no effect on the prose-driven fallback path.
