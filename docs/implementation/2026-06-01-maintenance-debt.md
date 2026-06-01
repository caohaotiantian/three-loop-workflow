# Implementation: maintenance debt — zip, README, WORKFLOW-v3, CLAUDE.md, l3-phase fix

## 1. Task Index

Design document: `docs/design/2026-06-01-maintenance-debt.md`

| Phase | Deliverables | Design §2 | Acceptance Criteria |
|---|---|---|---|
| Phase 1 | D4, D5, D6 | §2 Group B | Design §7 AC-B1 through AC-B6 |
| Phase 2 | D1, D2, D3 | §2 Group A | Design §7 AC-A1 through AC-A3 |

Phase 1 contains all load-bearing changes and drives the L3 review/accept cycle. Phase 2 contains informational updates bundled after Phase 1 closes.

## 2. Phase Breakdown

---

### Phase 1 — Load-bearing changes (D4, D5, D6)

**Entry condition**: design document passed L1; `diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/` exits 0.

**Design document references**: `docs/design/2026-06-01-maintenance-debt.md` §2 D4–D6, §7 AC-B1 through AC-B6.

**Files modified/created**:
1. `/home/fedora/workflow/WORKFLOW-v3.md` — D4
2. `/home/fedora/workflow/CLAUDE.md` — D5 (NEW)
3. `/home/fedora/workflow/three-loop-workflow/references/l3-phase.js` — D6
4. `/home/fedora/workflow/three-loop-workflow/references/schemas.md` — D6
5. Installed copy: `/home/fedora/.claude/skills/three-loop-workflow/` — D6 mirror

**Task list (TDD order)**

T1.1 [pre-condition] Verify D4 not yet applied:
```bash
grep -n "4\.1\.1\|Workflow.based\|l3-phase" /home/fedora/workflow/WORKFLOW-v3.md
# must exit non-zero
```

T1.2 [implementation] D4 — add section 4.1.1 to WORKFLOW-v3.md.

Use the Edit tool. The `old_string` is the final line of the role-isolation paragraph
plus the following blank line and the `### 4.2` heading (lines 439–441 of WORKFLOW-v3.md).
The `new_string` inserts the full 4.1.1 section between them.

old_string (verbatim):
    **Role isolation hard constraint**: within a single Phase, a single subagent may take only one role. The main agent spawns a fresh subagent per role per round. Self-review is forbidden.

    ### 4.2 Additional Main Agent Constraints

new_string (the role-isolation line unchanged, then the new subsection, then 4.2):
    **Role isolation hard constraint**: within a single Phase, a single subagent may take only one role. The main agent spawns a fresh subagent per role per round. Self-review is forbidden.

    #### 4.1.1 Workflow-based execution (recommended)

    The four-corner loop can be driven by the `references/l3-phase.js` Workflow script
    instead of manual Agent-tool orchestration. The Workflow-based mode enforces round
    caps, structured verdicts, and the two-generation termination condition as
    deterministic code rather than prose instructions. Dev agents write directly to the
    main working tree (no `isolation: 'worktree'`), so accept commands see the correct
    state.

    **Invocation** (once per Phase, from the main agent):

    ```javascript
    const result = await Workflow({
      scriptPath: '~/.claude/skills/three-loop-workflow/references/l3-phase.js',
      args: {
        phaseLabel:    'Phase 1',          // human-readable phase name
        phaseSpec:     '<task list>',      // full Phase task list from the impl doc
        designDocPath: 'docs/design/<slug>.md',
        implDocPath:   'docs/implementation/<slug>.md',
      }
    })
    ```

    **Return values**: `{ status: 'closed'|'cap-exhausted'|'design-conflict', phaseLabel, round, branch? }`.
    - `'closed'`: Phase accepted. `result.branch` is the dev branch; merge it: `git merge --ff-only result.branch` then `git branch -d result.branch`.
    - `'cap-exhausted'`: round cap (3) exhausted. Escalate per section 6.
    - `'design-conflict'`: dev agent detected a conflict. Roll back to L1 or L2. Clean up: `git branch -d result.branch`.

    **Fallback**: if the Workflow tool is unavailable, use the manual prose-driven
    procedure in section 4.1 and `references/loop-3-development.md` instead.

    **Schema reference**: structured verdict and dev result schemas are in
    `references/schemas.md` (`ReviewVerdict`, `AcceptVerdict`, `DevResult`).

    ### 4.2 Additional Main Agent Constraints

Note: the indentation above is for readability in this document. In WORKFLOW-v3.md the
section content is flush with the left margin (no leading spaces), matching the existing
4.1 prose style.

T1.3 [pre-condition] Verify D5 not yet applied:
```bash
test -f /home/fedora/workflow/CLAUDE.md
# must exit non-zero
```

T1.4 [implementation] D5 — create CLAUDE.md at the repo root.
Create `/home/fedora/workflow/CLAUDE.md` with the following content:

```markdown
# CLAUDE.md — three-loop-workflow skill repo

<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"

## Development Workflow

All non-trivial changes use the three-loop-workflow skill. Entry point: `SKILL.md`.
Load-bearing documents require the full L1 → L2 → L3 cycle. Escalation: open an
issue or comment in the PR.

## Load-Bearing Documents

The following files are protected by the full L1 → L2 → L3 cycle:

- `three-loop-workflow/SKILL.md`
- `three-loop-workflow/references/*.md` (all reference files)
- `three-loop-workflow/references/l3-phase.js`
- `WORKFLOW-v3.md`

## Language Policy

All skill files and process documents: English. Terminology must be consistent with
existing `docs/design/`, `docs/implementation/`, the skill's `SKILL.md`, and
`WORKFLOW-v3.md`. The only exception is `README-cn.md`, which is a Chinese translation
of `README.md`.

## Common Commands

- `<TEST-CMD>`: N/A — this repo has no test suite; acceptance is verified by
  grep-based checks over the modified files.
- Zip rebuild: `cd /home/fedora/workflow && zip -r three-loop-workflow.skill three-loop-workflow/`
- Installed-copy sync: `cp -r /home/fedora/workflow/three-loop-workflow/. /home/fedora/.claude/skills/three-loop-workflow/`

## Engineering Norms

- This repo distributes a Claude skill, not application code. The primary artifacts
  are Markdown files and one JavaScript Workflow script (`references/l3-phase.js`).
- Follow the skill's own four core principles: Think Before Coding, Simplicity First,
  Surgical Changes, Goal-Driven Execution.
- `l3-phase.js` is plain JavaScript (no TypeScript, no `Date.now()`, no `Math.random()`).
- Do not add new CLAUDE.md roles without updating the anchor map above and all
  downstream reference files that read those roles.
```

T1.5 [pre-condition] Verify D6 l3-phase.js not yet patched:
```bash
grep -n "isolation.*worktree" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js | wc -l
# must print 3 (three lines to remove)
```

T1.6 [implementation] D6a — remove `isolation: 'worktree'` from l3-phase.js.
**Business invariant**: after this fix, dev, review-fix, and accept-fix agents all write
directly to the main working tree. The accept agent therefore reads the correct
working tree state when running ACCEPT-CMDs. Three targeted edits (each removes one
`isolation: 'worktree',` or `isolation: 'worktree'` key from an agent call options object):

Edit 1 — dev agent call (around line 62). Change:
```
  { label: `dev:${phaseLabel}`, phase: 'Dev', agentType: 'feature-dev:feature-dev',
    isolation: 'worktree', schema: DEV_SCHEMA }
```
to:
```
  { label: `dev:${phaseLabel}`, phase: 'Dev', agentType: 'feature-dev:feature-dev',
    schema: DEV_SCHEMA }
```

Edit 2 — review-loop fix agent call (around line 106). Change:
```
      { label: `fix:review:${phaseLabel}:r${round}`, phase: 'Fix',
        agentType: 'feature-dev:feature-dev', isolation: 'worktree' }
```
to:
```
      { label: `fix:review:${phaseLabel}:r${round}`, phase: 'Fix',
        agentType: 'feature-dev:feature-dev' }
```

Edit 3 — accept-loop fix agent call (around line 137). Change:
```
    { label: `acceptFix:${phaseLabel}:r${acceptRound}`, phase: 'Fix',
      agentType: 'feature-dev:feature-dev', isolation: 'worktree' }
```
to:
```
    { label: `acceptFix:${phaseLabel}:r${acceptRound}`, phase: 'Fix',
      agentType: 'feature-dev:feature-dev' }
```

T1.7 [implementation] D6b — update meta.description and meta.phases in l3-phase.js.
Locate the `meta` object (lines 1–10). Change:
- `description: '…with round cap 3 and worktree isolation'` → `'…with round cap 3'`
- `{ title: 'Dev', detail: 'dev subagent implements phase tasks in isolated worktree' }` → `{ title: 'Dev', detail: 'dev subagent implements phase tasks' }`

T1.8 [implementation] D6c — update schemas.md DevResult preamble.
Locate the `## DevResult` section (around line 74–76). Change the usage line from:
```
Use this schema when spawning dev subagents (L3 step 1) with `isolation: 'worktree'`. Pass as `agent(devPrompt, { isolation: 'worktree', schema: DevResult })`.
```
to:
```
Use this schema when spawning dev subagents (L3 step 1). Pass as `agent(devPrompt, { schema: DevResult })`. The `branch` field is the commit audit trail / rollback reference — dev agents should commit their changes to a named branch and return it here.
```

T1.9 [implementation] Mirror D6 changes to installed copy:
```bash
cp /home/fedora/workflow/three-loop-workflow/references/l3-phase.js /home/fedora/.claude/skills/three-loop-workflow/references/l3-phase.js
cp /home/fedora/workflow/three-loop-workflow/references/schemas.md /home/fedora/.claude/skills/three-loop-workflow/references/schemas.md
```

**Per-task acceptance commands** (all must exit 0):
```bash
grep -n "4\.1\.1\|Workflow.based\|l3-phase" /home/fedora/workflow/WORKFLOW-v3.md          # AC-B1
test -f /home/fedora/workflow/CLAUDE.md                                                     # AC-B2
grep -n "_repo-workflow_"     /home/fedora/workflow/CLAUDE.md                              # AC-B3a
grep -n "_load-bearing-docs_" /home/fedora/workflow/CLAUDE.md                              # AC-B3b
grep -n "_language-policy_"   /home/fedora/workflow/CLAUDE.md                              # AC-B3c
grep -n "_common-commands_"   /home/fedora/workflow/CLAUDE.md                              # AC-B3d
grep -n "_engineering-norms_" /home/fedora/workflow/CLAUDE.md                              # AC-B3e
grep -n "isolation.*worktree" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js | wc -l  # AC-B4 → must print 0
diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/     # AC-B5
grep -n "isolation.*worktree" /home/fedora/workflow/three-loop-workflow/references/schemas.md           # AC-B6 → must exit non-zero
```
Note: AC-B4 (`wc -l`) must print `0`; AC-B6 (`grep`) must exit non-zero (return code 1). All others exit 0.

**Exit condition**: all 10 acceptance checks pass; Phase 1 commit `feat(phase1): maintenance debt — WORKFLOW-v3 s4.1.1, CLAUDE.md, l3-phase.js accept fix`.

---

### Phase 2 — Informational updates (D1, D2, D3)

**Entry condition**: Phase 1 commit exists; all Phase 1 acceptance checks pass.

**Design document references**: `docs/design/2026-06-01-maintenance-debt.md` §2 D1–D3, §7 AC-A1 through AC-A3.

**Files modified**:
1. `three-loop-workflow.skill` — D1 (NOT git-tracked; rebuilt in place)
2. `/home/fedora/workflow/README.md` — D2
3. `/home/fedora/workflow/README-cn.md` — D3

**Task list**

T2.1 [pre-condition] Verify D2 README not yet updated:
```bash
grep -n "v1\.3\|What.s new\|agentType.*column\|schemas\.md" /home/fedora/workflow/README.md
# must exit non-zero
```

T2.2 [implementation] D2 — update README.md.
Two edits:

Edit 1 — fix stale packaging command. Use the Edit tool with:
  old_string: `python -m scripts.package_skill three-loop-workflow`
  new_string: `cd /home/fedora/workflow && zip -r three-loop-workflow.skill three-loop-workflow/`
(The surrounding prose "Or package it as a single distributable" and the comment line remain unchanged.)

Edit 2 — add "What's new" table. Locate the first `##` heading (`## What is the three-loop workflow?`, around line 14). Insert immediately before it:

```markdown
## What's new

| Version | Key additions |
|---|---|
| **v1.3** | `agentType` recommendation column in routing table; `references/schemas.md` (ReviewVerdict schema); `## When this skill does NOT apply` table; Quick orientation box; Common failure modes table; Document naming convention; TaskCreate round-tracking guidance |
| **v1.3.1** | `references/l3-phase.js` — Workflow-based L3 Phase runner (recommended mode); `references/loop-3-workflow.md` — invocation guide; `references/schemas.md` gains AcceptVerdict and DevResult schemas; SKILL.md routing table gains Workflow-mode row |

```

T2.3 [pre-condition] Verify D3 README-cn.md not yet updated:
```bash
grep -n "v1\.3\|What.s new\|agentType\|schemas\.md" /home/fedora/workflow/README-cn.md
# must exit non-zero
```

T2.4 [implementation] D3 — update README-cn.md with the same two edits as D2.
Edit 1 — fix same stale packaging command (identical bash command, no translation needed for code).
Edit 2 — add parallel Chinese "What's new" table immediately before `## 什么是三循环工作流` (line 14 of README-cn.md — the Chinese equivalent of `## What is the three-loop workflow?`):

```markdown
## 更新日志

| 版本 | 主要新增内容 |
|---|---|
| **v1.3** | 路由表新增 `agentType` 推荐列；`references/schemas.md`（ReviewVerdict 结构化输出 schema）；新增"本技能不适用的情形"说明表；快速导览区块；常见错误模式速查表；文档命名规范；TaskCreate 轮次追踪指引 |
| **v1.3.1** | `references/l3-phase.js` — 基于 Workflow 工具的 L3 阶段执行器（推荐模式）；`references/loop-3-workflow.md` — 调用指南；`references/schemas.md` 新增 AcceptVerdict 和 DevResult schema；SKILL.md 路由表新增 Workflow 模式行 |

```

T2.5 [implementation] D1 — rebuild three-loop-workflow.skill zip.
```bash
cd /home/fedora/workflow && zip -r three-loop-workflow.skill three-loop-workflow/
```

**Per-task acceptance commands**:
```bash
# AC-A1: verify new files present with correct prefix
python3 -c "
import zipfile, sys
z = zipfile.ZipFile('three-loop-workflow.skill')
names = z.namelist()
checks = [
    'three-loop-workflow/references/schemas.md',
    'three-loop-workflow/references/l3-phase.js',
    'three-loop-workflow/references/loop-3-workflow.md',
]
missing = [c for c in checks if c not in names]
sys.exit(1) if missing else print('OK:', checks)
"
grep -n "v1\.3\|What.s new\|agentType\|schemas\.md" /home/fedora/workflow/README.md             # AC-A2
grep -n "v1\.3\|更新日志\|agentType\|schemas\.md" /home/fedora/workflow/README-cn.md             # AC-A3
```
All three must exit 0.

**Exit condition**: all 3 Phase 2 acceptance checks pass; Phase 2 commit `feat(phase2): maintenance debt — README, README-cn, skill zip rebuild`.

---

## 3. Engineering Constraints Index

- No CLAUDE.md role anchors currently exist — this task creates them. D5 is self-referential: the CLAUDE.md being created references this skill which references CLAUDE.md. That's fine; the skill only reads CLAUDE.md at task execution time, not at file-creation time.
- Four-corner subagent template: `references/loop-3-development.md`.
- Commit conventions: SKILL.md "Commit conventions" section — `feat(phaseN):` openers, no AI involvement in messages.
- Trace test: every changed line must trace to D4, D5, or D6 (Phase 1) or D1, D2, D3 (Phase 2). No drive-by edits.
- `l3-phase.js` is plain JavaScript: no TypeScript, no `Date.now()`.

## 4. Data and Fixture Dependencies

No test fixtures. Acceptance is grep/test/diff/python3-based. No new directories created.

## 5. Regression Protection

- `WORKFLOW-v3.md`: after T1.2, confirm that sections 4.1 and 4.2+ prose are unchanged except for the inserted 4.1.1 block. Mechanical guard: `grep -n "^### 4\." /home/fedora/workflow/WORKFLOW-v3.md` must still show `4.1`, `4.2`, `4.3`, `4.4` at their original line numbers ±15 (the insertion adds ~25 lines before 4.2).
- `l3-phase.js`: after T1.6, confirm the script structure is intact except the three removed `isolation: 'worktree'` options. The total line count must decrease by exactly 3 (one line each for the three option lines removed). Mechanical guard: `wc -l /home/fedora/workflow/three-loop-workflow/references/l3-phase.js` must print `139` (currently 142; minus 3 lines = 139).
- `README.md` existing content: after T2.2, `grep -n "## What is the three-loop workflow" /home/fedora/workflow/README.md` must still exit 0 (section not removed by the table insertion).
- Installed copy: `diff -r` after T1.9 must exit 0. Phase 2 does NOT require re-syncing the installed copy (README and CLAUDE.md are not in the installed skill tree; the zip is not tracked).
