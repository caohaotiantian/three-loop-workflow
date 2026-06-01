# Implementation: skill v1.3 — Protocol Fixes, Usability Additions, and New-Feature Guidance

```
Status: closed
Closing-commit: d2346ec
Closed-on: 2026-06-01
Deferred: none
```

## 1. Task Index

Design document: `docs/design/skill-v1-3-improvements.md`

| Phase | Deliverables | Design §2 | Acceptance Criteria |
|---|---|---|---|
| Phase 1 | D1–D7 | §2 Phase 1 checkbox list | Design §7 AC-P1-1 through AC-P1-13 |
| Phase 2 | D8–D15 | §2 Phase 2 checkbox list | Design §7 AC-P2-1 through AC-P2-10 |

## 2. Phase Breakdown

---

### Phase 1 — Critical fixes and protocol gaps

**Entry condition**: design document passed L1 review; source and installed skill copies are identical (`diff -r` exits 0).

**Design document references**: `docs/design/skill-v1-3-improvements.md` §2 D1–D7, §7 AC-P1-1 through AC-P1-13.

**Files modified**:
1. `/home/fedora/workflow/three-loop-workflow/SKILL.md` (D1, D5, D6)
2. `/home/fedora/workflow/three-loop-workflow/references/loop-3-development.md` (D2)
3. `/home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md` (D3, D4)
4. `/home/fedora/workflow/WORKFLOW-v3.md` (D4)
5. `/home/fedora/workflow/three-loop-workflow/references/claude-md-integration.md` (D4)
6. `/home/fedora/workflow/three-loop-workflow/references/escalation-rules.md` (D5, D6, D7)
7. `/home/fedora/workflow/three-loop-workflow/references/loop-1-design.md` (D7)
8. Installed copy: `/home/fedora/.claude/skills/three-loop-workflow/` (all above files mirrored)

**Task list (TDD order — verify pre-condition before each edit)**

T1.1 [pre-condition] Verify D1 not yet applied:
```bash
grep -n "^|.*implementation-document conflict" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T1.2 [implementation] D1 — add impl-conflict rollback row to SKILL.md routing table.
Locate the routing table section `## Routing — which reference file to load next`.
After the row `| Start a Phase (L3): dev → review → accept → fix | ...loop-3-development.md... |`,
add the following new row:
```
| Encounter an implementation-document conflict during L3 dev | `references/loop-2-implementation.md` — restart L2 from round 1; list deprecated L3 commits in a Deprecated section |
```

T1.3 [pre-condition] Verify D2 not yet applied:
```bash
grep -n "end-to-end-review\.md.*step 3\|step 3.*end-to-end-review" /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md
# must exit non-zero
```

T1.4 [implementation] D2 — add cross-reference in loop-3-development.md.
Locate the line containing `record \`E2E skipped: <reason>\` in the end-to-end review summary`.
Change it to:
```
record `E2E skipped: <reason>` in the end-to-end review summary (reason must be specific — e.g., `AUTH_FAIL: ANTHROPIC_API_KEY not set`; see `references/end-to-end-review.md` step 3 for the specificity requirement)
```

T1.5 [pre-condition] Verify D3 not yet applied:
```bash
grep -n "dated sub-entry" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md
# must exit non-zero
```

T1.6 [implementation] D3 — add commit-disposition rule and dated sub-entry convention to loop-2-implementation.md.
Locate the Termination Conditions section. Find the paragraph beginning "Commits already produced under the prior L3 cycle are listed..."
Append after that sentence (before the next paragraph):
```
When an L2 rollback is triggered, the main agent must revert all L3 commits from the prior cycle, or explicitly note them as retained with user authorization (reverting published commits requires AskUserQuestion first). Each rollback event appends a dated sub-entry to the Deprecated section — for example: `Deprecated — rollback 1 (YYYY-MM-DD): commits <sha>…` — so multiple rollback rounds remain distinguishable.
```

T1.7 [pre-condition] Verify D4 WORKFLOW-v3.md part not yet applied:
```bash
grep -n "answer five questions" /home/fedora/workflow/WORKFLOW-v3.md
# must exit non-zero (line 343 currently reads "answer four questions")
```

T1.8 [implementation] D4a — update WORKFLOW-v3.md section 3.4 from four to five questions.
Locate section 3.4, the line reading:
```
2. For each Phase, answer four questions. Any "no" is a severe issue.
```
Change to:
```
2. For each Phase, answer five questions. Any "no" is a severe issue.
```
Then add question (e) after question (d) in the numbered list:
```
   e. For each test task in the Phase task list: does the description specify the
      business invariant being protected, not just the function being called? A task
      description vague enough that the resulting test could pass regardless of
      whether the protected logic is intact tests shape, not intent — flag as severe.
```

T1.9 [pre-condition] Verify D4 loop-2-implementation.md annotation not yet applied:
```bash
grep -n "v1\.2\|question (e)" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md
# must exit non-zero
```

T1.10 [implementation] D4b — annotate question (e) as v1.2 addition in loop-2-implementation.md.
Locate question (e) in the review prompt template (the test-intent question starting "For each test task...").
Insert immediately before question (e):
```
   *(Skill v1.2 addition: this fifth question supersedes the four-question count in
   WORKFLOW-v3.md § 3.4 for this installation. WORKFLOW-v3.md § 3.4 is updated in
   parallel — see D4 in docs/design/skill-v1-3-improvements.md.)*
```

T1.11 [pre-condition] Verify D4 claude-md-integration.md part not yet applied:
```bash
grep -n "versioned\|v1\.2" /home/fedora/workflow/three-loop-workflow/references/claude-md-integration.md
# must exit non-zero
```

T1.12 [implementation] D4c — add versioned-item note to claude-md-integration.md cross-file checklist.
Locate the cross-file consistency checklist table. Add a new row:
```
| L2 review prompt question count | `references/loop-2-implementation.md` review prompt (five questions as of skill v1.2) | `WORKFLOW-v3.md` section 3.4 (must match; currently updated to five in skill v1.3) |
```

T1.13 [pre-condition] Verify D5 escalation-rules.md part not yet applied:
```bash
grep -n "in-flight\|in flight" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md
# must exit non-zero
```

T1.14 [implementation] D5a — add in-flight-agent suspension rule to escalation-rules.md.
Locate the Degraded mode section (the paragraph about `STOP: QUESTION`). Append:
```
If subagents are already in flight when the STOP:QUESTION condition is detected,
do not use their outputs — discard partial work and re-run after the user's answer
is received. The "suspend all subagent spawns" instruction is forward-looking only;
in-flight agents must be abandoned, not waited on.
```

T1.15 [pre-condition] Verify D5 SKILL.md part not yet applied:
```bash
grep -n "STOP:QUESTION\|degraded mode" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T1.16 [implementation] D5b — add degraded-mode pointer to SKILL.md self-check section.
Locate `## Self-check before claiming a loop is closed`.
After the final self-check bullet, add:
```
If AskUserQuestion is unavailable in the current harness, see `references/escalation-rules.md`
Degraded mode for the STOP:QUESTION fallback procedure, including the in-flight-agent
suspension rule.
```

T1.17 [pre-condition] Verify D6 escalation-rules.md part not yet applied:
```bash
grep -in "Deletion of a file\|deletion.*load-bearing" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md
# must exit non-zero
```

T1.18 [implementation] D6a — add load-bearing-doc deletion row to escalation-rules.md table.
Locate the escalation triggers table. Add a row immediately after the `| Action exceeds authorized scope (push to main, delete files outside workspace, send messages externally) |` row:
```
| Deletion of a file listed in CLAUDE.md _load-bearing-docs_ role | AskUserQuestion: state which contract the file fulfills, what replaces it, and the migration impact on every file that references it |
```

T1.19 [pre-condition] Verify D6 SKILL.md part not yet applied:
```bash
grep -n "Deletion.*load-bearing" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T1.20 [implementation] D6b — add deletion row to SKILL.md applicability table.
Locate `## When this skill applies` table.
Add a row after the "Modification to a load-bearing doc" row:
```
| Deletion of a **load-bearing** doc | yes — plus mandatory AskUserQuestion before any file is deleted; see `references/escalation-rules.md` |
```

T1.21 [pre-condition] Verify D7 loop-1-design.md part not yet applied:
```bash
grep -n "parallel task\|in-progress.*design\|concurrent" /home/fedora/workflow/three-loop-workflow/references/loop-1-design.md
# must exit non-zero
```

T1.22 [implementation] D7a — add parallel-task coordination prompt to loop-1-design.md.
Locate "## Main agent procedure", step 1.
Append to step 1 (after the existing text about reading existing docs):
```
Before drafting, also ask the user whether any parallel tasks covering the same domain
are in progress. If yes, coordinate — merge or serialize the design work — before
drafting. A fresh agent reviewing your design doc cannot discover uncommitted in-progress
designs by a parallel task.
```

T1.23 [pre-condition] Verify D7 escalation-rules.md part not yet applied:
```bash
grep -n "concurrent\|overlapping domain" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md
# must exit non-zero
```

T1.24 [implementation] D7b — add concurrent-design-doc row to escalation-rules.md.
Locate the escalation triggers table. Add a row:
```
| Another in-progress design doc covers overlapping domain | AskUserQuestion: identify the overlap, propose merge or serialization, and get a coordination ruling before proceeding |
```

T1.25 [implementation] Mirror Phase 1 changes to installed copy.
After all source edits are complete, copy every modified file to the installed location:
```bash
for f in SKILL.md references/loop-3-development.md references/loop-2-implementation.md references/claude-md-integration.md references/escalation-rules.md references/loop-1-design.md; do
  cp /home/fedora/workflow/three-loop-workflow/$f /home/fedora/.claude/skills/three-loop-workflow/$f
done
```
Also copy WORKFLOW-v3.md edit note: WORKFLOW-v3.md is NOT in the installed skill directory; no copy needed for that file.

**Per-task acceptance commands** (run after all implementations above):
```bash
grep -n "^|.*implementation-document conflict" /home/fedora/workflow/three-loop-workflow/SKILL.md
grep -n "end-to-end-review\.md.*step 3\|step 3.*end-to-end-review" /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md
grep -n "dated sub-entry" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md
grep -n "answer five questions" /home/fedora/workflow/WORKFLOW-v3.md
grep -n "v1\.2\|question (e)" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md
grep -n "versioned\|v1\.2" /home/fedora/workflow/three-loop-workflow/references/claude-md-integration.md
grep -n "in-flight\|in flight" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md
grep -n "STOP:QUESTION\|degraded mode" /home/fedora/workflow/three-loop-workflow/SKILL.md
grep -in "Deletion of a file\|deletion.*load-bearing" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md
grep -n "Deletion.*load-bearing" /home/fedora/workflow/three-loop-workflow/SKILL.md
grep -n "parallel task\|in-progress.*design\|concurrent" /home/fedora/workflow/three-loop-workflow/references/loop-1-design.md
grep -n "concurrent\|overlapping domain" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md
diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/
```
All 13 commands must exit 0. (WORKFLOW-v3.md is not part of the installed skill; diff covers only the skill tree.)

**Exit condition**: all 13 acceptance commands exit 0; Phase 1 commit created with tag `feat(phase1): skill v1.3 protocol fixes`.

---

### Phase 2 — Usability additions and new-feature guidance

**Entry condition**: Phase 1 commit exists; all 13 Phase 1 acceptance commands exit 0.

**Design document references**: `docs/design/skill-v1-3-improvements.md` §2 D8–D15, §7 AC-P2-1 through AC-P2-10.

**Files modified**:
1. `/home/fedora/workflow/three-loop-workflow/SKILL.md` (D8, D9, D11, D12, D14, D15)
2. `/home/fedora/workflow/three-loop-workflow/references/claude-md-integration.md` (D10)
3. `/home/fedora/workflow/three-loop-workflow/references/schemas.md` (D13 — new file)
4. `/home/fedora/workflow/three-loop-workflow/references/loop-1-design.md` (D13, D15)
5. `/home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md` (D13, D15)
6. `/home/fedora/workflow/three-loop-workflow/references/loop-3-development.md` (D13, D15)
7. Installed copy: `/home/fedora/.claude/skills/three-loop-workflow/` (all above files mirrored)

**Task list (TDD order)**

T2.1 [pre-condition] Verify D8 not yet applied:
```bash
grep -n "When this skill does NOT apply" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T2.2 [implementation] D8 — consolidate "no" rows from applies table into a new NOT-apply table in SKILL.md.
Two edits:

Edit 1 — remove the two "no" rows from the existing `## When this skill applies` table:
- Remove: `| Pure document reordering, typo fix, dependency upgrade | no — but still requires one independent fresh-agent review |`
- Remove: `| Pure question answering, exploration with no code change | no |`
The table now ends with the deletion row added by D6b.

Edit 2 — insert the new NOT-apply section immediately before `## Core principles` (i.e., after the `**Role isolation rule** …` paragraph). The placement keeps the retroactive-classification paragraph and role isolation rule paragraph inside `## When this skill applies`, while the new section starts cleanly before `## Core principles`:

```markdown
## When this skill does NOT apply

| Change type | Action |
|---|---|
| Pure document reordering, typo fix, dependency upgrade | no L1→L2→L3 cycle — but still requires one independent fresh-agent review |
| Pure question answering / exploration producing no file edits | no requirement |
```

This consolidates the existing guidance without changing meaning: the "one independent fresh-agent review" caveat for typo/reorder/dep-upgrade is preserved.

T2.3 [pre-condition] Verify D9 not yet applied:
```bash
grep -n "Quick orientation" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T2.4 [implementation] D9 — add quick orientation box to SKILL.md.
Locate `## Core principles`. Immediately before that heading, add:

```markdown
> **Quick orientation**: this skill runs three sequential loops (L1 Design → L2
> Implementation → L3 Development). Each loop closes only when a fresh reviewer
> reports zero severe issues this round AND zero general issues the prior round.
> Round cap is 3 per loop; hitting it triggers AskUserQuestion — never a relaxed bar.
> You cannot skip a loop. If unsure which loop you are in, check the routing table.
```

T2.5 [pre-condition] Verify D10 not yet applied:
```bash
grep -n "copy-paste\|starter template\|CLAUDE\.md template" /home/fedora/workflow/three-loop-workflow/references/claude-md-integration.md
# must exit non-zero
```

T2.6 [implementation] D10 — add CLAUDE.md copy-paste template to claude-md-integration.md.
Locate the "Anchor map convention" section. After the existing anchor-map example block, add:

```markdown
## Copy-paste starter template

The following CLAUDE.md snippet satisfies all five required roles for a new project.
Paste it into your project's `CLAUDE.md` and fill in the bracketed values.

~~~markdown
<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"

## Development Workflow

Tasks proceed via the three-loop-workflow skill. Trigger it for any functional
change, bug fix, or load-bearing document modification. Escalation contact: [name].

## Load-Bearing Documents

The following files are protected by the full L1→L2→L3 cycle:
- `CLAUDE.md` (this file)
- `SKILL.md` (if the three-loop-workflow skill is installed project-locally)
- [add your OpenAPI specs, schema files, public API contracts here]

## Language Policy

Code: [language, e.g. Python 3.11+]. Process documents: English. Terminology must
be consistent with docs/design/, README, and contract files.

## Common Commands

- `<TEST-CMD>`: [e.g. `pytest tests/ -v`]
- `<LINT-CMD>`: [e.g. `ruff check .`]

## Engineering Norms

[Key coding standards, architecture overview, anti-patterns specific to this repo.]
~~~
```

T2.7 [pre-condition] Verify D11 not yet applied:
```bash
grep -n "Common failure modes\|failure.*recovery" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T2.8 [implementation] D11 — add failure-mode quick-reference table to SKILL.md.
Locate `## Self-check before claiming a loop is closed`. Immediately after that section, add:

```markdown
## Common failure modes and recovery

| Symptom | Likely cause | Recovery |
|---|---|---|
| Review keeps finding severe issues; round counter reaches 3 | Round cap exhausted | Escalate via AskUserQuestion with a deadlock report (see `references/escalation-rules.md`) |
| Agent declares loop closed but prior round had general issues | Incorrect termination check | Two-generation rule violated — re-run the review round; zero-general in the PRIOR round is required |
| L3 dev reports the implementation doc conflicts with the code | Impl-doc conflict | L2 rollback — see routing table row for "Encounter an implementation-document conflict" |
| AskUserQuestion tool unavailable | Constrained harness | Use STOP:QUESTION degraded mode (see `references/escalation-rules.md`) |
| Design and implementation doc slugs don't match | Missed slug convention | Rename to match YYYY-MM-DD-<slug> format (see "Document naming" in Document creation convention) |
```

T2.9 [pre-condition] Verify D12 not yet applied:
```bash
grep -n "YYYY-MM-DD" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T2.10 [implementation] D12 — add document naming paragraph to SKILL.md.
Locate `**Document creation convention**`. After the existing paragraph about creating dirs on demand and not maintaining a README index, add:

```markdown
**Document naming**: all task documents use the slug format `YYYY-MM-DD-<kebab-case-feature>`. The design document (`docs/design/YYYY-MM-DD-<slug>.md`) and implementation document (`docs/implementation/YYYY-MM-DD-<slug>.md`) for the same task must use the **identical slug**. Mismatched slugs across these two docs are a protocol error. This convention applies to tasks created after this task closes; pre-existing documents are not renamed.
```

T2.11 [pre-condition] Verify D13 schemas.md does not yet exist:
```bash
test -f /home/fedora/workflow/three-loop-workflow/references/schemas.md
# must exit non-zero
```

T2.12 [implementation] D13a — create references/schemas.md.
Create `/home/fedora/workflow/three-loop-workflow/references/schemas.md` with the following content:

```markdown
# Schemas

Structured output schemas for use with the `schema` option in workflow `agent()` calls
or any harness that supports structured subagent output. These schemas let the
orchestrating agent check review verdicts by field comparison rather than string matching.

## ReviewVerdict

Use this schema when spawning review subagents (L1 design review, L2 implementation
review, L3 review corner). Pass as `agent(reviewPrompt, { schema: ReviewVerdict })`.

```json
{
  "type": "object",
  "properties": {
    "severe": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Severe issues that block loop advancement"
    },
    "general": {
      "type": "array",
      "items": { "type": "string" },
      "description": "General issues recommended to fix this round"
    },
    "clarifications": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Items requiring main agent to consult user"
    },
    "verdict": {
      "type": "string",
      "enum": ["pass", "needs-fix", "severe-nonconformance"],
      "description": "pass = zero severe this round AND zero general last round; needs-fix = severe or general issues remain; severe-nonconformance = severe issues blocking advancement"
    },
    "severe_count": { "type": "number" },
    "general_count": { "type": "number" }
  },
  "required": ["severe", "general", "verdict", "severe_count", "general_count"]
}
```

Loop-closure check (replaces English string matching):
```
closed = (verdict == "pass") || (severe_count == 0 && round > 1 && prior_general_count == 0)
```

The `pass` verdict signals the review subagent is confident the document is ready.
`severe_count == 0` with a prior clean general round is the mechanical two-generation
termination condition encoded as numbers.
```

T2.13 [implementation] D13b — add schemas.md cross-references to the three loop reference files.

- `/home/fedora/workflow/three-loop-workflow/references/loop-1-design.md`:
  Locate `## Review subagent prompt template`. Add immediately before that heading:
  ```
  > For structured output from this review subagent, see `references/schemas.md` (`ReviewVerdict` schema).
  ```

- `/home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md`:
  Locate `## Review subagent prompt template`. Add immediately before that heading:
  ```
  > For structured output from this review subagent, see `references/schemas.md` (`ReviewVerdict` schema).
  ```

- `/home/fedora/workflow/three-loop-workflow/references/loop-3-development.md`:
  Locate `## Role responsibilities`. Add immediately before that heading:
  ```
  > For structured output from review subagents (step 2), see `references/schemas.md` (`ReviewVerdict` schema).
  ```

T2.14 [pre-condition] Verify D14 not yet applied:
```bash
grep -n "TaskCreate\|TaskUpdate" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T2.15 [implementation] D14 — add round-tracking-with-Tasks paragraph to SKILL.md.
Locate `## Core principles`. Immediately before that heading (after the Quick orientation box added in T2.4), add:

```markdown
**Round tracking with Tasks**: to survive context compaction during long tasks, call
`TaskCreate({ title: "L1 round 1" })` at each loop start and `TaskUpdate({ status, notes: verdictSummary })` after each review verdict. The round cap check becomes readable from `TaskGet(id)` rather than from conversational context. This is optional but strongly recommended for tasks with more than two L1 or L2 rounds.
```

T2.16 [pre-condition] Verify D15 agentType column not yet in SKILL.md routing table:
```bash
grep -n "agentType" /home/fedora/workflow/three-loop-workflow/SKILL.md
# must exit non-zero
```

T2.17 [implementation] D15a — add agentType column to SKILL.md routing table.
Locate `## Routing — which reference file to load next` and its table. Expand the table to three columns by adding `| Recommended \`agentType\` |` as a third column header and adding the appropriate value to each row:

| You are about to... | Read this reference | Recommended `agentType` |
|---|---|---|
| Draft `docs/design/<task-slug>.md` (L1) | `references/loop-1-design.md` — required sections, main agent procedure, review subagent prompt template | draft: *(default)*; review subagent: `code-reviewer` |
| Draft `docs/implementation/<task-slug>.md` (L2) | `references/loop-2-implementation.md` — Phase breakdown, review subagent prompt template | draft: *(default)*; review subagent: `code-reviewer` |
| Start a Phase (L3): dev → review → accept → fix | `references/loop-3-development.md` — four-corner subagent template, role table, commit conventions | dev: `feature-dev:feature-dev`; review: `feature-dev:code-reviewer`; accept/fix: *(default)* |
| Encounter an implementation-document conflict during L3 dev | `references/loop-2-implementation.md` — restart L2 from round 1; list deprecated L3 commits in a Deprecated section | *(default)* |
| Run external-process / E2E verification | `references/loop-3-development.md` (E2E section: pre-flight, isolated spawn, archival) | *(default)* |
| Close out the task: end-to-end review, document consolidation (F) | `references/end-to-end-review.md` | *(default)* |
| Encounter ambiguity, breaking change, or unverifiable acceptance | `references/escalation-rules.md` | *(default)* |
| Audit CLAUDE.md / cross-file consistency | `references/claude-md-integration.md` | *(default)* |

Note below the table: `For L1 and L2 fresh review subagents, use \`agentType: 'code-reviewer'\` (bare name). For L3 review, use \`agentType: 'feature-dev:code-reviewer'\` (namespaced). The distinction is intentional: L1/L2 reviews are general design/implementation reviews; L3 reviews are code-change reviews requiring code-specific expertise.`

T2.18 [implementation] D15b — add agentType annotations to the three loop reference files.
In loop-1-design.md, locate `## Review subagent prompt template`. Add before the template block:
```
> Spawn this subagent with `agentType: 'code-reviewer'` for strongest review discipline.
```

In loop-2-implementation.md, same location, same line.

In loop-3-development.md, locate `## Role responsibilities`. Add immediately before that heading:
```
> Spawn the dev subagent (step 1) with `agentType: 'feature-dev:feature-dev'`. Spawn the review subagent (step 2) with `agentType: 'feature-dev:code-reviewer'`. Note: L1/L2 reviews use the bare `code-reviewer` type; L3 review uses the namespaced `feature-dev:code-reviewer`.
```

T2.19 [implementation] Mirror Phase 2 changes to installed copy.
After all source edits are complete:
```bash
for f in SKILL.md references/claude-md-integration.md references/loop-1-design.md references/loop-2-implementation.md references/loop-3-development.md; do
  cp /home/fedora/workflow/three-loop-workflow/$f /home/fedora/.claude/skills/three-loop-workflow/$f
done
cp /home/fedora/workflow/three-loop-workflow/references/schemas.md /home/fedora/.claude/skills/three-loop-workflow/references/schemas.md
```

**Per-task acceptance commands** (run after all implementations above):
```bash
grep -n "When this skill does NOT apply" /home/fedora/workflow/three-loop-workflow/SKILL.md
grep -n "Quick orientation" /home/fedora/workflow/three-loop-workflow/SKILL.md
test -f /home/fedora/workflow/three-loop-workflow/references/schemas.md
grep -n "schemas.md" /home/fedora/workflow/three-loop-workflow/references/loop-1-design.md && grep -n "schemas.md" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md && grep -n "schemas.md" /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md
grep -n "copy-paste\|starter template\|CLAUDE\.md template" /home/fedora/workflow/three-loop-workflow/references/claude-md-integration.md
grep -n "Common failure modes\|failure.*recovery" /home/fedora/workflow/three-loop-workflow/SKILL.md
grep -n "YYYY-MM-DD" /home/fedora/workflow/three-loop-workflow/SKILL.md
grep -n "TaskCreate\|TaskUpdate" /home/fedora/workflow/three-loop-workflow/SKILL.md
grep -n "agentType" /home/fedora/workflow/three-loop-workflow/SKILL.md
grep -n "^|.*implementation-document conflict" /home/fedora/workflow/three-loop-workflow/SKILL.md
diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/
```
All 11 commands must exit 0. (AC-P1-1 regression guard included.)

**Exit condition**: all 11 acceptance commands exit 0; Phase 2 commit created with tag `feat(phase2): skill v1.3 usability and new-feature guidance`.

---

## 3. Engineering Constraints Index

- Project-level engineering norms: no CLAUDE.md exists; follow the conventions already established in the skill itself (Surgical Changes — touch only what the deliverable requires; Simplicity First — no new abstractions; no AI involvement in commit messages).
- Four-corner subagent template: `references/loop-3-development.md`.
- Commit conventions: `SKILL.md` "Commit conventions" section — `feat(phaseN):` openers, `fix(phaseN-roundR): <keyword>` within-round fixes, no AI involvement in messages.
- Trace test: every changed line must trace to a numbered deliverable (D1–D15) in the design document. Lines with no deliverable trace must be reverted before the L3 review subagent runs.

## 4. Data and Fixture Dependencies

No test fixtures. Acceptance is verified entirely by grep and diff commands. No new directories or fixture files are created. `references/schemas.md` is the only new file.

## 5. Regression Protection

- Phase 1 changes must not alter the existing content of `loop-2-implementation.md`'s five review questions beyond the D4 annotation. Mechanical guard: after T1.10, run:
  ```bash
  grep -n "a\. Could a fresh agent start" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md
  grep -n "b\. Are the acceptance commands" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md
  grep -n "c\. Is the TDD order" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md
  grep -n "d\. Does regression protection" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md
  ```
  All four must exit 0 (confirming questions (a)–(d) survive untouched).
- Phase 2 / D8: the "no" rows are REMOVED from the "When this skill applies" table and consolidated into the new "NOT apply" table. The "yes" rows (new feature, bug fix, refactor, load-bearing doc modification, load-bearing doc deletion) must remain verbatim. Mechanical guard: after T2.2, run:
  ```bash
  grep -n "New feature with externally observable behavior" /home/fedora/workflow/three-loop-workflow/SKILL.md
  grep -n "Bug fix that changes behavior" /home/fedora/workflow/three-loop-workflow/SKILL.md
  ```
  Both must exit 0.
- After Phase 2, `diff -r` between source and installed must exit 0, confirming no files were left out of the mirror step.
