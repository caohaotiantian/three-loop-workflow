# Design: skill v1.3 — Protocol Fixes, Usability Additions, and New-Feature Guidance

```
Status: closed
Closing-commit: d2346ec
Closed-on: 2026-06-01
Deferred: F3 (Workflow tool as L3 engine), F5 (worktree isolation) — no issue IDs; deferred by design (see §4 Decision 1)
```

E2E gate: PASS — smoke test (structural checks on installed SKILL.md, 11/11 green). Full CLI subprocess E2E not triggered; skill is documentation-only with no executable entry points.

## 1. Background and Purpose

A multi-reviewer workflow audit of the three-loop-workflow skill (v1.2) produced 17
actionable findings: 3 major protocol bugs, 4 protocol gaps, 5 usability deficiencies,
and 5 new-feature adoption recommendations (F3 and F5 are in scope but deferred — see
§3 and §4 Decision 1). Without this work:

- An agent following only the SKILL.md routing table during an L3 impl-conflict rollback
  gets no pointer to `loop-2-implementation.md` and improvises, bypassing the L2 review
  cycle (C1).
- An agent reading only `loop-3-development.md` can record a vague E2E skip-reason that
  passes the F-step audit undetected (C2).
- An agent that triggers an L2 rollback after partial L3 commits has no instruction on
  commit disposition, producing either a polluted branch or silent drift (C3).
- Adoption of Claude Code features (structured output, TaskCreate, agentType) that
  directly strengthen the workflow's enforcement mechanisms remains undocumented.

## 2. Deliverables

### Phase 1 — Critical fixes and protocol gaps
- [ ] D1: `SKILL.md` routing table gains an L3→L2 impl-conflict rollback row (C1)
- [ ] D2: `references/loop-3-development.md` degraded-path paragraph gains a
      cross-reference pointer to `references/end-to-end-review.md` step 3, so that
      agents reading only `loop-3-development.md` are not left with `E2E skipped:
      <reason>` without the specificity constraint (C2)
- [ ] D3: `references/loop-2-implementation.md` Termination Conditions gains a
      commit-disposition rule (revert or note prior L3 commits with user authorization)
      and a dated Deprecated sub-entry convention; the literal phrase "dated sub-entry"
      must appear in the added text so AC-P1-3 can verify it mechanically (C3)
- [ ] D4: `references/loop-2-implementation.md` review prompt header annotates
      question (e) as a skill v1.2 addition (the "five questions" phrase is already
      present at line 77 from the prior task; only the annotation is new);
      `WORKFLOW-v3.md` section 3.4 updated from "four questions" to "five questions"
      (line 343 currently still reads "four"; this gap is the main remaining work);
      cross-file checklist in `references/claude-md-integration.md` notes the
      question count as a versioned item (P1)
- [ ] D5: `references/escalation-rules.md` Degraded mode section covers in-flight
      subagents; `SKILL.md` self-check section gains a pointer to the degraded-mode
      rule (P2)
- [ ] D6: `references/escalation-rules.md` escalation table gains a load-bearing-doc
      deletion row; `SKILL.md` applicability table gains a deletion row (P3)
- [ ] D7: `references/loop-1-design.md` main agent procedure step 1 prompts for
      parallel-task coordination; `references/escalation-rules.md` escalation table
      gains a concurrent-design-doc row (P4)

### Phase 2 — Usability additions and new-feature guidance
- [ ] D8: `SKILL.md` gains a "When this skill does NOT apply" negative trigger table
      immediately below the existing applicability table (U1)
- [ ] D9: `SKILL.md` gains a "Quick orientation" box before the principles section (U2)
- [ ] D10: `references/claude-md-integration.md` gains a copy-paste CLAUDE.md role
       vocabulary template (U3)
- [ ] D11: `SKILL.md` gains a "Common failure modes and recovery" quick-reference table (U4)
- [ ] D12: `SKILL.md` "Document creation convention" section gains a "Document naming"
       paragraph specifying: slug format `YYYY-MM-DD-<kebab-case-feature>`, the
       requirement that design and implementation docs for the same task share the same
       slug, and that this convention applies to all future tasks (prospective only;
       existing docs are not renamed) (U5)
- [ ] D13: New file `references/schemas.md` defines `ReviewVerdict` JSON schema;
       `references/loop-1-design.md`, `loop-2-implementation.md`, and
       `loop-3-development.md` each gain a one-line cross-reference to it (F1)
- [ ] D14: `SKILL.md` orchestration notes section gains a "Round tracking with Tasks"
       paragraph documenting the TaskCreate/TaskUpdate pattern for round state (F2)
- [ ] D15: `SKILL.md` routing table gains an `agentType` annotation column;
       `references/loop-1-design.md`, `loop-2-implementation.md`, and
       `loop-3-development.md` each gain per-role agentType annotations (F4)

## 3. Scope Boundary

**In scope**: all changes listed in §2. Every change is a prose edit to an existing
Markdown file or creation of one new Markdown file (`references/schemas.md`).

**Out of scope**:
- F3 (Workflow tool as L3 execution engine): converting SKILL.md's L3 from prose
  instructions to an actual JavaScript Workflow script is an architectural change
  requiring its own design task. It changes the skill's deployment model, introduces
  a code artifact alongside Markdown, and requires a concrete test harness. Deferred.
- F5 (worktree isolation for L3 dev agents): depends on F3. Deferred with F3.
- Packaging the `.skill` zip: the `.skill` file is not tracked by git
  (per commit 207448b). Both the `three-loop-workflow/` source tree and the installed
  copy at `~/.claude/skills/three-loop-workflow/` are updated. Repacking the zip is
  a separate maintenance step outside this task.
- Changes to `README.md` or `README-cn.md`: informational docs, not load-bearing.
- New CLAUDE.md for the workflow repo: a separate task if desired.

## 4. Key Design Decisions

### Decision 1 — Include or defer F3 + F5

**Problem**: F3 (Workflow as L3 engine) and F5 (worktree isolation) have high value
but fundamentally change the skill's execution model from prose-driven to code-driven.

**Candidate options**:
- Option A — Include in this task: write a reference L3 Workflow script and add it to
  the skill distribution alongside the Markdown files. Complete, but scope is large
  and the new artifact requires its own distribution and maintenance conventions.
- Option B — Defer to a dedicated task: implement only the documentation guidance for
  F1, F2, F4 now; tackle F3+F5 as a separate load-bearing doc modification after this
  task closes.

**Choice: Option B.**
Rationale: Option A conflates protocol-fix work (C1–C3) with a major architectural
change. If F3 is flawed, the entire PR is blocked. Separating concerns means the critical
fixes ship faster and the F3 design gets the full L1→L2→L3 attention it deserves.
Rejected because: Option A would produce a longer, harder-to-review change with more
rollback risk.

### Decision 2 — Single phase vs two phases for L3

**Problem**: the 15 deliverables span eight files; delivering them all in one phase
makes the review and acceptance commands unwieldy.

**Candidate options**:
- Option A — Single phase: all edits in one commit batch. Simpler to track but any
  review failure blocks everything.
- Option B — Two phases: Phase 1 covers the seven "fix what is broken" deliverables
  (D1–D7); Phase 2 covers the eight "add new content" deliverables (D8–D15).

**Choice: Option B.**
Rationale: Phase 1 changes are verifiable by grep (a keyword either exists or not).
Phase 2 adds net-new sections whose correctness is harder to grep-verify. Keeping
them separate allows the review subagent to focus on whether fixes are complete
without also auditing new content, and vice versa.
Rejected because: Option A has a higher review surface per round; any Phase 2 issue
blocks the Phase 1 fixes from being committed.

### Decision 3 — Inline schema vs dedicated schemas.md

**Problem**: F1 asks for a `ReviewVerdict` JSON schema to be referenced from three
reference files. Should the schema be reproduced inline in each file or centralised?

**Candidate options**:
- Option A — Inline in each reference file: each file carries the full schema JSON.
  Self-contained, but three copies to keep in sync.
- Option B — Single `references/schemas.md` file: one definition, three cross-references.
  Single source of truth; matches the existing six-file pattern of narrowly scoped files.

**Choice: Option B.**
Rationale: the existing skill architecture already uses narrow-scoped reference files.
A fourth copy of the schema would rot as soon as the first one is patched. One file
with three pointers is the correct pattern.
Rejected because: Option A multiplies maintenance burden with no benefit.

### Decision 4 — Whether to update the installed copy alongside the source tree

**Problem**: the source files live in `/home/fedora/workflow/three-loop-workflow/` and
the installed skill lives in `~/.claude/skills/three-loop-workflow/`. They are currently
identical. If only the source is updated, the running skill lags.

**Candidate options**:
- Option A — Update source only, let the user repackage manually.
- Option B — Update both source and installed copy in L3; document the sync in the
  Phase commit trailer.

**Choice: Option B.**
Rationale: the installed copy is what Claude uses when invoked. If it lags, the task
cannot validate itself using the very skill it is improving. The `.skill` zip is not
tracked by git, so updating the installed copy is the minimal viable deployment step.
Rejected because: Option A leaves the running environment stale, which breaks acceptance.

## 5. Dependencies and Assumptions

- No CLAUDE.md exists for this project. Terminology anchors are the project README,
  the existing closed design doc (`docs/design/roles-and-test-intent.md`), and the
  skill files themselves.
- No test suite exists (`<TEST-CMD>` is not applicable). Acceptance is verified by
  grep-based checks over the modified files.
- The source and installed copies of the skill are currently identical (verified by
  `diff -r` at task start; output was empty). This assumption must hold at Phase 1
  start. If drift is detected at Phase 1 start, the L3 dev subagent must sync the
  installed copy from source (`cp -r /home/fedora/workflow/three-loop-workflow/. /home/fedora/.claude/skills/three-loop-workflow/`) and record the sync as a pre-Phase commit before making any other edits.
- `WORKFLOW-v3.md` is a load-bearing spec document. Any edit to it follows the same
  surgical-changes rule as edits to the skill files.
- The `three-loop-workflow.skill` zip file is not tracked by git and is not
  regenerated in this task (see §3 Scope Boundary).

## 6. Relationship with Existing Designs

Prior design: `docs/design/roles-and-test-intent.md` (Status: closed, commit 5860b25,
2026-05-11). That task added four rules to the skill (subagent role tightening, test-intent
check). This task does not modify those rules; it adds to and around them.

No blocking conflict. Terminology anchors from the prior task that remain in force:
"severe issue", "general issue", "round cap", "role isolation", "load-bearing doc",
"fresh subagent", "trace test", "four-corner template".

⚠ Boundary note (D4, D10): The closed `roles-and-test-intent.md` §3 Scope Boundary
explicitly excluded "adding a new entry to `references/claude-md-integration.md`
cross-file consistency checklist." D4 and D10 both add content to that file. This is
not a conflict — the prior task's exclusion was task-scoped and does not bind future
work. Stated here to satisfy the "conflicts must carry a warning marker" rule.

⚠ Boundary note (D12): The D12 slug convention (`YYYY-MM-DD-<kebab-case-feature>`)
is prospective. The existing task documents (`roles-and-test-intent.md`,
`skill-v1-3-improvements.md`) predate the convention and are not renamed. The
convention applies to docs created after this task closes. D12 will say so explicitly.
D12 also moves slug guidance into SKILL.md's "Document creation convention" section
(not "Commit conventions"), to avoid placement mismatch.

## 7. Acceptance Criteria

### Phase 1

- AC-P1-1: `grep -n "^|.*implementation-document conflict" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0 (anchored to table-row format; the Mermaid diagram line `L3Next -- impl conflict --> L2Draft` does not contain "implementation-document conflict" so this cannot false-positive on the unmodified file).
- AC-P1-2: `grep -n "end-to-end-review\.md.*step 3\|step 3.*end-to-end-review" /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md` exits 0 (verifies that the cross-reference pointer was added; the phrase does not exist in the unmodified file).
- AC-P1-3: `grep -n "dated sub-entry" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md` exits 0 (phrase is absent from the unmodified file; D3 specifies it must appear in the added text).
- AC-P1-4: `grep -n "v1\.2\|question (e)" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md` exits 0 (both phrases are absent from the unmodified file; "five questions" is already present and is not re-added by D4).
- AC-P1-5: `grep -n "answer five questions" /home/fedora/workflow/WORKFLOW-v3.md` exits 0 (phrase does not exist in the unmodified file; it will be the exact text added to section 3.4).
- AC-P1-6: `grep -n "versioned\|v1\.2" /home/fedora/workflow/three-loop-workflow/references/claude-md-integration.md` exits 0.
- AC-P1-7: `grep -n "in-flight\|in flight" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md` exits 0.
- AC-P1-8: `grep -n "STOP:QUESTION\|degraded mode" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0.
- AC-P1-9: `grep -in "Deletion of a file\|deletion.*load-bearing" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md` exits 0 (case-insensitive flag `-i` included).
- AC-P1-10: `grep -n "Deletion.*load-bearing" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0 (matches `Deletion of a **load-bearing** doc` in the new table row; the `.*` handles the markdown bold markers).
- AC-P1-11: `grep -n "parallel task\|in-progress.*design\|concurrent" /home/fedora/workflow/three-loop-workflow/references/loop-1-design.md` exits 0.
- AC-P1-12: `grep -n "concurrent\|overlapping domain" /home/fedora/workflow/three-loop-workflow/references/escalation-rules.md` exits 0.
- AC-P1-13: All Phase 1 changes are mirrored in the installed copy: `diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/` exits 0.

### Phase 2

- AC-P2-1: `grep -n "When this skill does NOT apply" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0.
- AC-P2-2: `grep -n "Quick orientation" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0.
- AC-P2-3: `test -f /home/fedora/workflow/three-loop-workflow/references/schemas.md` exits 0.
- AC-P2-4: `grep -n "schemas.md" /home/fedora/workflow/three-loop-workflow/references/loop-1-design.md && grep -n "schemas.md" /home/fedora/workflow/three-loop-workflow/references/loop-2-implementation.md && grep -n "schemas.md" /home/fedora/workflow/three-loop-workflow/references/loop-3-development.md` exits 0.
- AC-P2-5: `grep -n "copy-paste\|anchor map.*template\|CLAUDE\.md template" /home/fedora/workflow/three-loop-workflow/references/claude-md-integration.md` exits 0.
- AC-P2-6: `grep -n "Common failure modes\|failure.*recovery" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0.
- AC-P2-7: `grep -n "YYYY-MM-DD" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0.
- AC-P2-8: `grep -n "TaskCreate\|TaskUpdate" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0.
- AC-P2-9: `grep -n "agentType" /home/fedora/workflow/three-loop-workflow/SKILL.md` exits 0.
- AC-P2-10: All Phase 2 changes are mirrored in the installed copy: `diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/` exits 0.

## 8. Risks and Rollback

**Risk 1 — Surgical-changes violation**: an editor subagent "tidies up" adjacent prose
while making targeted additions. Mitigation: the review subagent checks every changed
paragraph against the trace test; any change not traceable to a deliverable in §2 is
flagged as severe.

**Risk 2 — Spec/skill version skew post-P1**: updating `WORKFLOW-v3.md` section 3.4
to five questions (D4) and not mirroring that in the cross-file checklist would
re-introduce the same drift we are fixing. Mitigation: AC-P1-5, AC-P1-6 both grep
for the updated content; the review subagent is instructed to verify both files in one
pass.

**Risk 3 — Installed-copy sync failure**: if the installed copy is not updated, the
skill is immediately inconsistent with the source. Mitigation: AC-P1-13 and AC-P2-10
run `diff -r` to confirm parity; Phase cannot close until these pass.

**Risk 4 — schemas.md incompleteness**: a schema definition that does not match the
prose description in SKILL.md's new feature guidance would mislead agents. Mitigation:
the Phase 2 review subagent is given both `schemas.md` and the SKILL.md paragraph it
supports, and checks them for consistency.

**Risk 5 — WORKFLOW-v3.md adjacent damage**: D4 edits `WORKFLOW-v3.md` section 3.4,
a large load-bearing spec document. An overzealous editor subagent could inadvertently
alter adjacent content (other section numbers, surrounding prose). Mitigation: the
Phase 1 dev subagent is instructed to touch only the literal "answer four questions"
phrase and the question list in section 3.4; the review subagent is given the specific
line range and checks only the edited region. AC-P1-5 (`grep -n "answer five questions"`)
confirms the target phrase was updated; any adjacent damage would be caught as a
Surgical-Changes violation at review.

**Rollback**: all changes are prose edits to tracked Markdown files. Rolling back is
`git revert <commit>` for each Phase commit. The installed copy would need to be
manually re-synced to the reverted source; the procedure mirrors the forward update
in §4 Decision 4.
