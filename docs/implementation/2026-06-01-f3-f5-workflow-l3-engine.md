# Implementation: F3 + F5 — Workflow-based L3 engine with worktree isolation

```
Status: closed
Closing-commit: 537cae5
Closed-on: 2026-06-01
Deferred: none
```

## 1. Task Index

Design document: `docs/design/2026-06-01-f3-f5-workflow-l3-engine.md`

| Phase | Deliverables | Design §2 | Acceptance Criteria |
|---|---|---|---|
| Phase 1 | D1–D5 | §2 D1–D5 checkbox list | Design §7 AC1–AC12 + AC8a/AC8b |

Single phase: all five deliverables are interdependent (the script references the schemas, the doc references the script, the routing table references the doc). Separating into two phases would require forward references that complicate the review.

## 2. Phase Breakdown

### Phase 1 — All deliverables (D1–D5)

**Entry condition**: design document passed L1 review; `diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/` exits 0 (source and installed in sync).

**Design document references**: `docs/design/2026-06-01-f3-f5-workflow-l3-engine.md` §2 D1–D5, §4 Decision 2 (args interface), §7 AC1–AC12.

**Files created/modified**:
1. `/home/fedora/workflow/three-loop-workflow/references/l3-phase.js` — NEW (D1)
2. `/home/fedora/workflow/three-loop-workflow/references/loop-3-workflow.md` — NEW (D2)
3. `/home/fedora/workflow/three-loop-workflow/references/schemas.md` — MODIFY: append AcceptVerdict and DevResult schemas (D3)
4. `/home/fedora/workflow/three-loop-workflow/SKILL.md` — MODIFY: add Workflow-mode routing row and update existing L3 row with fallback label (D4)
5. `/home/fedora/workflow/three-loop-workflow/references/loop-3-development.md` — MODIFY: add top-level Workflow-mode note (D5)
6. Installed copy: `/home/fedora/.claude/skills/three-loop-workflow/` — mirror all above (post-implementation)

**Task list (TDD order — verify pre-condition before each implementation task)**

T1.1 [pre-condition] Verify D1 (l3-phase.js) not yet created:
```bash
test -f /home/fedora/workflow/three-loop-workflow/references/l3-phase.js
# must exit non-zero (1)
```

T1.2 [implementation] D3 — append AcceptVerdict and DevResult schemas to schemas.md.
Locate the end of `/home/fedora/workflow/three-loop-workflow/references/schemas.md`. Append:

```markdown
## AcceptVerdict

Use this schema when spawning accept subagents (L3 step 3). Pass as `agent(acceptPrompt, { schema: AcceptVerdict })`.

```json
{
  "type": "object",
  "properties": {
    "all_pass": {
      "type": "boolean",
      "description": "true if every ACCEPT-CMD exited 0"
    },
    "failures": {
      "type": "array",
      "items": { "type": "string" },
      "description": "list of failed commands with exit codes"
    }
  },
  "required": ["all_pass", "failures"]
}
```

## DevResult

Use this schema when spawning dev subagents (L3 step 1) with `isolation: 'worktree'`. Pass as `agent(devPrompt, { isolation: 'worktree', schema: DevResult })`.

```json
{
  "type": "object",
  "properties": {
    "branch": {
      "type": "string",
      "description": "git branch name where changes were committed (e.g. 'phase1-dev-r1'); REQUIRED — the script treats a missing branch as a dev failure"
    },
    "summary": {
      "type": "string",
      "description": "one-paragraph summary of what was implemented"
    },
    "conflict": {
      "type": "boolean",
      "description": "true if the dev agent detected a conflict between the design doc and the implementation task; triggers design-conflict return from l3-phase.js"
    }
  },
  "required": ["branch", "summary", "conflict"]
}
```
```

T1.3 [pre-condition] Verify D3 applied:
```bash
grep -n "AcceptVerdict\|DevResult" /home/fedora/workflow/three-loop-workflow/references/schemas.md
# must exit 0
```

T1.4 [implementation] D1 — create references/l3-phase.js.
Create `/home/fedora/workflow/three-loop-workflow/references/l3-phase.js` with the following content.

The script implements the L3 four-corner loop with:
- **Review loop**: dev once, then review→fix cycles until two-generation termination condition met
- **Accept loop**: accept→fix cycles until all commands pass (separate from review loop — accept failures route back to accept, NOT to review)
- **Round cap**: shared counter R increments on every fix; hitting R ≥ 3 returns `cap-exhausted`
- **Design-conflict detection**: if `devResult.conflict === true`, returns `design-conflict` immediately
- **Worktree isolation**: dev and fix agents use `isolation: 'worktree'`; the review agent does NOT (it diffs the committed branch)
- **Two-generation termination**: `priorGeneralCount` initialized to `Infinity`; passes only when `review.severe_count === 0 && round > 1 && priorGeneralCount === 0`

```javascript
export const meta = {
  name: 'l3-phase',
  description: 'Three-loop-workflow L3 per-Phase runner: dev → review-loop → accept-loop with round cap 3 and worktree isolation',
  phases: [
    { title: 'Dev', detail: 'dev subagent implements phase tasks in isolated worktree' },
    { title: 'Review', detail: 'review subagent audits diff; two-generation termination' },
    { title: 'Accept', detail: 'accept subagent runs all ACCEPT-CMDs' },
  ],
}

// Required args (see docs/design/2026-06-01-f3-f5-workflow-l3-engine.md §4 Decision 2):
//   phaseLabel:    string  — e.g. "Phase 1"
//   phaseSpec:     string  — full Phase task list from the impl doc
//   designDocPath: string  — path to docs/design/<slug>.md
//   implDocPath:   string  — path to docs/implementation/<slug>.md

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    severe:       { type: 'array', items: { type: 'string' } },
    general:      { type: 'array', items: { type: 'string' } },
    clarifications: { type: 'array', items: { type: 'string' } },
    verdict:      { type: 'string', enum: ['pass', 'needs-fix', 'severe-nonconformance'] },
    severe_count: { type: 'number' },
    general_count:{ type: 'number' },
  },
  required: ['severe', 'general', 'verdict', 'severe_count', 'general_count'],
}

const ACCEPT_SCHEMA = {
  type: 'object',
  properties: {
    all_pass: { type: 'boolean' },
    failures: { type: 'array', items: { type: 'string' } },
  },
  required: ['all_pass', 'failures'],
}

const DEV_SCHEMA = {
  type: 'object',
  properties: {
    branch:   { type: 'string' },
    summary:  { type: 'string' },
    conflict: { type: 'boolean' },
  },
  required: ['branch', 'summary', 'conflict'],
}

const MAX_ROUNDS = 3
const { phaseLabel, phaseSpec, designDocPath, implDocPath } = args

// ── Step 1: Dev ──────────────────────────────────────────────
phase('Dev')
log(`${phaseLabel}: running dev subagent`)

const devResult = await agent(
  `You are the dev subagent for ${phaseLabel}. Implement the tasks below in the current worktree. ` +
  `Commit your changes to a branch named "${phaseLabel.replace(/\s+/g, '').toLowerCase()}-dev-r1" ` +
  `and return DevResult with the branch name, a summary, and conflict=true if the design doc ` +
  `conflicts with any task.\n\nDesign doc: ${designDocPath}\nImpl doc: ${implDocPath}\n\nPhase tasks:\n${phaseSpec}`,
  { label: `dev:${phaseLabel}`, phase: 'Dev', agentType: 'feature-dev:feature-dev',
    isolation: 'worktree', schema: DEV_SCHEMA }
)

if (!devResult) return { status: 'cap-exhausted', phaseLabel, round: 0, reason: 'dev agent returned null' }
if (devResult.conflict) return { status: 'design-conflict', phaseLabel, round: 0, branch: devResult.branch }

// Explicit null-branch guard (defense-in-depth; schema required:[] is primary gate)
if (!devResult.branch) return { status: 'cap-exhausted', phaseLabel, round: 0, reason: 'dev agent did not return branch name' }
let devBranch = devResult.branch

// ── Review loop ───────────────────────────────────────────────
// `round` starts at 1 and increments on every fix cycle.
// Two-generation termination: `round > 1 && priorGeneralCount === 0`
// This formula matches references/schemas.md ReviewVerdict loop-closure check.
phase('Review')
let round = 1
let priorGeneralCount = Infinity

while (round <= MAX_ROUNDS) {
  log(`${phaseLabel}: review round ${round}/${MAX_ROUNDS} (prior generals: ${priorGeneralCount === Infinity ? 'n/a' : priorGeneralCount})`)

  const review = await agent(
    `You are the review subagent for ${phaseLabel} round ${round}. Review the diff on branch "${devBranch}" ` +
    `against design doc ${designDocPath} and impl doc ${implDocPath}. ` +
    `Return a ReviewVerdict (see references/schemas.md).`,
    { label: `review:${phaseLabel}:r${round}`, phase: 'Review',
      agentType: 'feature-dev:code-reviewer', schema: REVIEW_SCHEMA }
  )

  if (!review) return { status: 'cap-exhausted', phaseLabel, round, stage: 'review-null-return' }

  const reviewPasses = review.severe_count === 0 && round > 1 && priorGeneralCount === 0
  priorGeneralCount = review.general_count

  if (reviewPasses) break  // exit review loop, enter accept loop

  round++
  if (round > MAX_ROUNDS) return { status: 'cap-exhausted', phaseLabel, round, stage: 'review' }
  log(`${phaseLabel}: review issues remain (severe=${review.severe_count} general=${review.general_count}), running fix round ${round}`)
  phase('Fix')
  await agent(
    `You are the fix subagent for ${phaseLabel} review round ${round}. Fix the following review issues on branch "${devBranch}". ` +
    `Surgical Changes only — commit fixes to the same branch.\n\nSevere: ${review.severe.join('; ')}\nGeneral: ${review.general.join('; ')}`,
    { label: `fix:review:${phaseLabel}:r${round}`, phase: 'Fix',
      agentType: 'feature-dev:feature-dev', isolation: 'worktree' }
  )
  phase('Review')
}

// ── Accept loop ───────────────────────────────────────────────
// Accept failures route back to ACCEPT (not review) per the four-corner diagram.
// The `acceptRound` counter shares the same cap pool as `round`.
phase('Accept')
let acceptRound = round

while (acceptRound <= MAX_ROUNDS) {
  log(`${phaseLabel}: accept round ${acceptRound}/${MAX_ROUNDS}`)

  const accept = await agent(
    `You are the accept subagent for ${phaseLabel}. The dev branch is "${devBranch}". ` +
    `Run every ACCEPT-CMD listed in impl doc ${implDocPath} and return AcceptVerdict.`,
    { label: `accept:${phaseLabel}:r${acceptRound}`, phase: 'Accept', schema: ACCEPT_SCHEMA }
  )

  if (!accept) return { status: 'cap-exhausted', phaseLabel, round: acceptRound, stage: 'accept-null-return' }
  if (accept.all_pass) return { status: 'closed', phaseLabel, round: acceptRound, branch: devBranch }

  acceptRound++
  if (acceptRound > MAX_ROUNDS) return { status: 'cap-exhausted', phaseLabel, round: acceptRound, stage: 'accept' }
  log(`${phaseLabel}: accept failures: ${accept.failures.join('; ')}, running acceptFix round ${acceptRound}`)
  phase('Fix')
  await agent(
    `You are the fix subagent for ${phaseLabel} accept round ${acceptRound}. Fix the following accept failures on branch "${devBranch}". ` +
    `Commit fixes to the same branch.\n\nFailures: ${accept.failures.join('; ')}`,
    { label: `acceptFix:${phaseLabel}:r${acceptRound}`, phase: 'Fix',
      agentType: 'feature-dev:feature-dev', isolation: 'worktree' }
  )
  phase('Accept')
}

return { status: 'cap-exhausted', phaseLabel, round: acceptRound, stage: 'accept-loop-exit' }
```

T1.5 [pre-condition] Verify D2 (loop-3-workflow.md) not yet created:
```bash
test -f /home/fedora/workflow/three-loop-workflow/references/loop-3-workflow.md
# must exit non-zero (1)
```

T1.6 [implementation] D2 — create references/loop-3-workflow.md.
Create `/home/fedora/workflow/three-loop-workflow/references/loop-3-workflow.md` with the following content:

```markdown
# L3: Workflow-Based Phase Execution (Recommended)

This file describes how to invoke `references/l3-phase.js` to run an L3 Phase
deterministically. The Workflow-based mode is **recommended** over the manual
prose-driven mode (`references/loop-3-development.md`) because it enforces round caps,
structured verdicts, and worktree isolation as code rather than instructions.

> **Version note**: worktree isolation (`isolation: 'worktree'`) requires a Claude Code
> release where this feature is stable. On older clients or restricted environments, use
> the prose-driven fallback in `references/loop-3-development.md` instead.

## When to use this

Use for every L3 Phase in normal operation. Fall back to the prose-driven mode only when:
- The Workflow tool is unavailable (headless CI, restricted harness).
- The current Claude Code version has known `isolation: 'worktree'` issues.

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
```

T1.7 [pre-condition] Verify D4 SKILL.md Workflow row not yet present:
```bash
grep -n "l3-phase\|loop-3-workflow" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero (1)
```

T1.8 [implementation] D4 — update SKILL.md routing table.
Locate `## Routing — which reference file to load next` and its table.
Two edits:

Edit 1 — update the existing L3 row (currently reading `| Start a Phase (L3): dev → review → accept → fix | ...`):
Change the "You are about to..." cell to read:
`Start a Phase (L3) — manual/fallback mode: dev → review → accept → fix`
The reference and agentType cells remain unchanged.

Edit 2 — add a NEW row immediately before the existing L3 row:
```
| Start a Phase (L3) — Workflow mode (recommended) | `references/loop-3-workflow.md` — how to invoke `l3-phase.js`, args, return values | dev: `feature-dev:feature-dev`; review: `feature-dev:code-reviewer`; accept/fix: *(default)* |
```

T1.9 [pre-condition] Verify D5 loop-3-development.md note not yet present:
```bash
grep -in "l3-phase\|loop-3-workflow\|Workflow.*primary\|Recommended.*Workflow" /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md
# must exit non-zero (1)
```

T1.10 [implementation] D5 — add top-level Workflow-mode note to loop-3-development.md.
Locate the very beginning of the file, after `# L3: Development Work Loop` and before `## Four-corner subagent template`. Add:

```markdown
> **Recommended execution mode**: use the Workflow script at `references/loop-3-workflow.md`
> (invokes `l3-phase.js`) rather than manual Agent-tool orchestration. The script enforces
> round caps, structured verdicts, and worktree isolation as deterministic code. The
> four-corner template, role table, commit conventions, and E2E gate below remain
> authoritative regardless of which mode is used.
```

T1.11 [implementation] Mirror all changes to installed copy:
```bash
cp /home/fedora/workflow/three-loop-workflow/references/l3-phase.js /home/fedora/.claude/skills/three-loop-workflow/references/l3-phase.js
cp /home/fedora/workflow/three-loop-workflow/references/loop-3-workflow.md /home/fedora/.claude/skills/three-loop-workflow/references/loop-3-workflow.md
cp /home/fedora/workflow/three-loop-workflow/references/schemas.md /home/fedora/.claude/skills/three-loop-workflow/references/schemas.md
cp /home/fedora/workflow/three-loop-workflow/SKILL.md /home/fedora/.claude/skills/three-loop-workflow/SKILL.md
cp /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md /home/fedora/.claude/skills/three-loop-workflow/references/loop-3-development.md
```

**Per-task acceptance commands** (run after all implementations above):
```bash
test -f /home/fedora/workflow/three-loop-workflow/references/l3-phase.js                          # AC1
grep -n "export const meta" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js       # AC2
grep -n "isolation.*worktree" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js     # AC3
grep -n "ReviewVerdict\|REVIEW_SCHEMA" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js  # AC4
grep -n "round > 1\|round>1" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js      # AC5
test -f /home/fedora/workflow/three-loop-workflow/references/loop-3-workflow.md                    # AC6
grep -n "AcceptVerdict\|DevResult" /home/fedora/workflow/three-loop-workflow/references/schemas.md  # AC7
grep -n "l3-phase\|loop-3-workflow" /home/fedora/workflow/three-loop-workflow/SKILL.md              # AC8a
grep -n "manual/fallback\|fallback.*L3\|Start.*Phase.*fallback" /home/fedora/workflow/three-loop-workflow/SKILL.md  # AC8b
grep -in "l3-phase\|loop-3-workflow\|Workflow.*primary\|Recommended.*Workflow" /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md  # AC9
diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/  # AC10
grep -n "accept.*while\|while.*accept\|CapA\|acceptRound\|acceptFix" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js  # AC11
grep -n "design.conflict\|designConflict\|design_conflict" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js  # AC12
```
All 13 commands must exit 0.

**Narrative description of accept-failure routing** (for L2 reviewer structural verification):
The script uses TWO SEPARATE LOOPS:
1. **Review loop** (`while (R < MAX_ROUNDS)`): cycles review → fix → review until `reviewPasses === true` or round cap.
2. **Accept loop** (`while (acceptR < MAX_ROUNDS)`): runs AFTER the review loop passes. Accept failures call `acceptFix` agents and loop back to `accept` — they do NOT re-enter the review loop. This is enforced by the code structure: the accept loop is entirely outside the review loop. `acceptFix` is the label used for accept-failure fix agents.

The `acceptFix` label name satisfies AC11's `acceptFix` grep pattern and confirms the routing.

Loop-condition reference (using actual script variable names):
- **Review loop**: `while (round <= MAX_ROUNDS)` — `round` starts at 1, increments on each fix; `reviewPasses` requires `round > 1 && priorGeneralCount === 0`
- **Accept loop**: `while (acceptRound <= MAX_ROUNDS)` — `acceptRound` initialized to `round` (the value when review passed); accept failures increment `acceptRound` and re-enter the accept loop

**Exit condition**: all 13 acceptance commands exit 0; Phase 1 commit created with tag `feat(phase1): skill v1.3.1 Workflow-based L3 engine (F3+F5)`.

## 3. Engineering Constraints Index

- No CLAUDE.md for this project; follow conventions from the skill itself.
- Four-corner subagent template: `references/loop-3-development.md`.
- Commit conventions: SKILL.md "Commit conventions" section.
- Trace test: every changed/added line must trace to D1–D5. The `l3-phase.js` script is a new artifact, so every line in it traces to D1.
- The `l3-phase.js` script is JavaScript (not TypeScript): no type annotations, no interfaces, no generics. No `Date.now()` or `Math.random()` (would break Workflow resume). Standard JS built-ins only.

## 4. Data and Fixture Dependencies

No test fixtures. Acceptance is grep/test-based. The only new files are `l3-phase.js` and `loop-3-workflow.md`.

## 5. Regression Protection

- `schemas.md`: existing `ReviewVerdict` schema and loop-closure formula must remain verbatim. After T1.2, run:
  ```bash
  grep -n "ReviewVerdict" /home/fedora/workflow/three-loop-workflow/references/schemas.md
  grep -n "severe_count == 0 && round > 1" /home/fedora/workflow/three-loop-workflow/references/schemas.md
  ```
  Both must exit 0.
- `SKILL.md`: all existing "yes" routing-table rows (L1, L2, E2E, Close out, Escalation, Audit) must remain intact after T1.8. The edit adds one row and updates one row — it must not delete other rows. Mechanical guard: after T1.8, `grep -c "^|" /home/fedora/workflow/three-loop-workflow/SKILL.md` must return 47 (currently 46; adds 1 new routing row).
- `loop-3-development.md`: the existing four-corner template, role table, and commit conventions must remain verbatim after T1.10. Only a blockquote note is prepended; no existing content is modified.
