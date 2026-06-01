# Design: maintenance debt — zip, README, WORKFLOW-v3, CLAUDE.md, l3-phase fix

```
Status: closed
Closing-commit: f9b1d15
Closed-on: 2026-06-01
Deferred: none
```

E2E gate: PASS — 11/11 structural smoke-test checks. Full CLI subprocess E2E not triggered; skill is documentation/script-only.

## 1. Background and Purpose

Five maintenance items were explicitly deferred or excluded from the v1.3 and v1.3.1 tasks:

1. **Stale `.skill` zip**: the distributable `three-loop-workflow.skill` zip was last built at v1.2 and is missing `schemas.md`, `l3-phase.js`, and `loop-3-workflow.md`. Anyone downloading the zip gets a broken skill.
2. **README.md / README-cn.md out of date**: neither reflects v1.3 additions (agentType guidance, schemas, SKILL.md new sections) or v1.3.1 (Workflow-based L3). New users reading the README have an incorrect picture.
3. **WORKFLOW-v3.md spec gap**: the canonical spec still describes only prose-driven L3. The Workflow-based execution mode (F3) is implemented in the skill but invisible to users reading the spec.
4. **No project CLAUDE.md**: the repo has no CLAUDE.md, so the skill cannot resolve `<TEST-CMD>` or the five role anchors for this project. Future tasks on this repo hit the "no CLAUDE.md" branch in the skill's procedure.
5. **`l3-phase.js` accept-commands see wrong state**: dev and fix agents run in `isolation: 'worktree'`, committing their changes to a named branch. Accept agents run in the main working tree, which is still on the original branch — it does NOT have the dev changes. Accept commands therefore test the wrong state and may pass or fail for the wrong reasons. This silently defeats the accept step's purpose.

Without this work:
- Distributed `.skill` users get an incomplete skill (missing Workflow-based L3, schemas, invocation guide).
- The accept phase of `l3-phase.js` is broken for any project where ACCEPT-CMDs read files from the working tree.
- The spec (WORKFLOW-v3.md) diverges from the skill, confusing users who read both.
- This repo itself cannot be used as a reference for CLAUDE.md setup.

## 2. Deliverables

### Group A — Informational (no full L1→L2→L3 required; one independent review)
- [ ] D1: `three-loop-workflow.skill` zip rebuilt to include all current source files (schemas.md, l3-phase.js, loop-3-workflow.md, plus the existing v1.2 files)
- [ ] D2: `README.md` updated: (a) new "What's new in v1.3 / v1.3.1" section covering agentType column, schemas.md, Workflow-based L3 mode, and the new SKILL.md orientation/failure-mode sections; (b) fix stale packaging command on line 60 (`python -m scripts.package_skill` → `zip -r three-loop-workflow.skill three-loop-workflow/` run from the repo root) since the `scripts/` directory does not exist
- [ ] D3: `README-cn.md` updated in parallel with D2 (same content, Chinese translation)

### Group B — Load-bearing (full L1→L2→L3 cycle)
- [ ] D4: `WORKFLOW-v3.md` gains a new `####` (h4) subsection `#### 4.1.1 Workflow-based execution (recommended)` documenting the `l3-phase.js` invocation pattern, `args` shape, return values, and fallback note — placed immediately before the existing section `### 4.2 Additional Main Agent Constraints` (three hashes — confirmed by reading WORKFLOW-v3.md line 441). The `####` heading level matches the existing 4.3.1–4.3.3 subsections in the same document.
- [ ] D5: `CLAUDE.md` created at the repo root with all five required role anchors pointing to concrete headings, plus the standard anchor map block
- [ ] D6: `references/l3-phase.js` fixed: remove `isolation: 'worktree'` from all three lines (dev agent line ~62, review-loop fix agent line ~106, accept-loop fix agent line ~137). Dev, review-fix, and accept-fix agents all write directly to the main working tree (as the prose-driven fallback does). Accept agents therefore see the correct working tree state. F5 worktree isolation is deferred pending Workflow tool support for branch-specific worktree starting points. Also update: `meta.description` and `meta.phases[0].detail` must drop the "worktree isolation" wording; `references/schemas.md` DevResult preamble usage example must drop `isolation: 'worktree'` from the `agent()` call shown there.

## 3. Scope Boundary

**In scope**: D1–D6 as specified.

**Out of scope**:
- F5 re-implementation (worktree isolation for dev/fix agents): deferred. The `isolation: 'worktree'` feature as currently implemented cannot guarantee the accept phase sees the dev branch state without explicit checkout management, which is outside the Workflow script API. D6 deliberately reverts F5 to unblock the accept phase.
- New CLAUDE.md role for Workflow-based L3 (`_l3-workflow_`): the five required roles are sufficient; adding a sixth would require all downstream projects to update their anchor maps.
- Translating the new SKILL.md / reference file content into Chinese: only README-cn.md (which already exists) is updated. The skill files themselves remain English-only, as established by the v1.2 language policy.
- `scripts/` packaging directory: D1 is implemented as a direct `zip` command; no packaging script infrastructure is created.
- The existing `README.md` line 60 (`python -m scripts.package_skill three-loop-workflow`) is a stale command — the `scripts/` directory does not exist. This is addressed by D2(b) which fixes that line. It is not left as a known pre-existing inaccuracy.
- Updating `.gitignore` or releasing via GitHub: the zip rebuild is a local build artifact; distribution is a separate concern.

## 4. Key Design Decisions

### Decision 1 — l3-phase.js accept fix: remove worktree isolation vs add checkout step

**Problem**: accept commands check the wrong working tree state because dev agents commit to an isolated worktree branch, and the main working tree is not updated.

**Candidate options**:
- Option A — Remove `isolation: 'worktree'` from dev and fix agents: they write directly to the main working tree, no branch management. Accept agents see correct state. F5 worktree isolation is abandoned for now.
- Option B — Add a checkout step: before the accept loop, the script calls a lightweight agent to run `git checkout ${devBranch}` in the main working tree. Accept agents run without isolation and see correct state. After the script returns, the calling agent switches back to the original branch.
- Option C — Give accept agents `isolation: 'worktree'` with an in-agent merge: accept agents run in an isolated worktree and are instructed to merge devBranch first. Clean in principle, but isolated accept worktrees accumulate (they have the merge commit, so auto-cleanup is suppressed) and the Workflow script has no mechanism to prune them.

**Choice: Option A.**
Rationale: Option A is the simplest, most reliable fix. The prose-driven fallback has always written to the main working tree and accept commands have worked correctly. Reverting to the same model is safe and unambiguous. Option B cannot be implemented cleanly: the Workflow script API (`agent()`, `phase()`, `log()`, `parallel()`, `pipeline()`) has no mechanism to run arbitrary shell commands — a git checkout must be delegated to an agent call, which is expensive and introduces a new failure mode. Option C produces untracked worktree accumulation. The original F5 design assumed the Workflow tool would expose worktree path/branch metadata to the script; it does not (confirmed in v1.3.1 design §5). F5 should be redesigned once the Workflow API adds a `ref:` option to `isolation: 'worktree'` so a starting branch can be specified.
Rejected because: Option B requires Workflow shell-command capability that doesn't exist; Option C creates silent resource leaks.

**Consequence of Option A**: `l3-phase.js` no longer provides worktree isolation. Dev rounds that are rejected may leave partial file mutations in the main working tree. This is the same situation as the manual (prose-driven) mode; the risk is documented in `loop-3-workflow.md` and mitigated by the fix subagent using surgical-changes discipline. The `DevResult.branch` field remains in the schema (dev agents commit to a named branch) but its purpose shifts from "worktree management" to "audit trail / rollback reference."

### Decision 2 — WORKFLOW-v3.md placement of the Workflow-based L3 section

**Problem**: the spec needs to document the new execution mode without disrupting the existing section numbering (section 4.2 is cited in cross-references).

**Candidate options**:
- Option A — New section 4.1.1: insert as a subsection immediately before existing 4.2, so 4.2+ numbering is unchanged.
- Option B — New top-level section 4bis (or section 4.1 with re-numbering): cleaner hierarchy but requires updating all cross-references to 4.2+.
- Option C — Appendix: add as a non-numbered appendix after section 7. Avoids numbering disruption but feels disconnected from section 4.

**Choice: Option A.**
Rationale: inserting as 4.1.1 (a subsection of the existing "4.1 Four-Corner Subagent Template") preserves all existing cross-references while placing the Workflow mode logically adjacent to the template it implements. Option B's re-numbering would require changes to every cross-reference in the skill's reference files. Option C is disconnected from the relevant context.
Rejected because: Option B has high cross-reference blast radius; Option C creates poor discoverability.

### Decision 3 — CLAUDE.md scope: minimal 5-role vs extended

**Problem**: how much project-specific content should the first CLAUDE.md contain?

**Candidate options**:
- Option A — Minimal: only the required anchor map plus the five role sections, each with a short placeholder or accurate one-line value. No build instructions, no test commands (there are none), no engineering norms beyond "follow the skill's own principles."
- Option B — Extended: include project history, version table, contributor notes, a full engineering norms section, etc. More useful but more maintenance burden.

**Choice: Option A.**
Rationale: the primary purpose is to give the skill a concrete anchor map so `<TEST-CMD>` (or "N/A") and the five roles resolve cleanly. A minimal CLAUDE.md can be extended in future tasks. Option B front-loads scope that belongs in a separate documentation task.
Rejected because: Option B's larger surface area introduces more review rounds for content that is inherently uncertain (what are the right engineering norms for a skill-only repo?).

### Decision 4 — README update scope: summary table vs prose

**Problem**: v1.3 and v1.3.1 added several features. The README currently describes v1.2. How deep should the update be?

**Candidate options**:
- Option A — "What's new" summary table: add a two-column table (version × key additions) at the top of the README after the project description. Short, easy to scan.
- Option B — Full prose update: rewrite the existing feature description sections to incorporate new features inline. Complete but hard to diff and potentially breaks the existing flow.
- Option C — Changelog file: move version history to CHANGELOG.md and link from README. Separates concerns but adds a new file.

**Choice: Option A.**
Rationale: a summary table is additive (no existing prose touched), scannable, and leaves the existing installation and project-setup sections intact. Option B requires reviewing the entire README and risks unintentional changes to correct content. Option C is out of scope (new file, new maintenance obligation).
Rejected because: Option B has too high a review surface; Option C adds file maintenance overhead for an informational doc.

## 5. Dependencies and Assumptions

- The zip build command is run from the repo root: `cd /home/fedora/workflow && zip -r three-loop-workflow.skill three-loop-workflow/`. This preserves the `three-loop-workflow/` prefix in all archive entries, matching the existing zip format (verified by inspecting the current zip). Python zipfile is available for verification.
- `README-cn.md` is a Chinese translation of `README.md`. The "What's new" table added by D2 is also added to D3; the translation is exact for table structure (version numbers, file names stay ASCII) and uses equivalent Chinese for prose cells.
- `WORKFLOW-v3.md` section 4.1 ("Four-Corner Subagent Template") is the correct parent section for the new 4.1.1 subsection. Section numbering above 4.1 is unchanged.
- `<TEST-CMD>` for this project is `N/A` (no test suite). The `_common-commands_` role in CLAUDE.md documents this explicitly.
- The D6 fix removes `isolation: 'worktree'` from three lines in `l3-phase.js` (lines ~62, ~106, ~137 — all instances). Also updates: `meta.description` drops "worktree isolation" wording; `meta.phases[0].detail` drops "in isolated worktree"; `schemas.md` DevResult preamble drops `isolation: 'worktree'` from the agent() example. No other logic changes. `DevResult.branch` remains; its description is updated from "required for worktree management" to "commit audit trail / rollback reference."
- Source and installed copies are currently identical (verified in prior task).

## 6. Relationship with Existing Designs

Prior designs (all closed):
- `docs/design/roles-and-test-intent.md` (v1.2, 2026-05-11) — not relevant
- `docs/design/skill-v1-3-improvements.md` (v1.3, 2026-06-01) — D2/D3 must reflect its deliverables accurately
- `docs/design/2026-06-01-f3-f5-workflow-l3-engine.md` (v1.3.1, 2026-06-01) — D4, D6 directly reference its decisions; D6 partially reverts F5

⚠ Boundary note (D6): the v1.3.1 design §4 Decision 1 chose Option B ("Workflow primary, prose fallback") to keep both modes. D6 keeps both modes but changes Workflow mode's dev/fix agents: no worktree isolation. The fallback prose mode is unchanged. This is a narrowing correction to the Workflow mode, not a reversion of the overall dual-mode architecture.

⚠ Boundary note (D4): `WORKFLOW-v3.md` is a load-bearing spec document (v1.3 §5 Dependencies). Any edit follows surgical-changes rules.

## 7. Acceptance Criteria

### Group A — checked by one-pass review, no acceptance commands
- AC-A1: `python3 -c "import zipfile,sys; z=zipfile.ZipFile('three-loop-workflow.skill'); names=z.namelist(); checks=['three-loop-workflow/references/schemas.md','three-loop-workflow/references/l3-phase.js','three-loop-workflow/references/loop-3-workflow.md']; missing=[c for c in checks if c not in names]; sys.exit(1) if missing else print('OK:', checks)"` — exits 0 (all three files present with correct `three-loop-workflow/` prefix)
- AC-A2: `grep -n "v1\.3\|Workflow.*L3\|agentType\|schemas" README.md` exits 0 (v1.3/v1.3.1 content present)
- AC-A3: `grep -n "v1\.3\|Workflow.*L3\|agentType\|schemas" README-cn.md` exits 0

### Group B — mechanically verifiable
- AC-B1: `grep -n "4\.1\.1\|Workflow.based\|l3-phase" /home/fedora/workflow/WORKFLOW-v3.md` exits 0 (new section present)
- AC-B2: `test -f /home/fedora/workflow/CLAUDE.md` exits 0
- AC-B3: All five role anchors present — five separate checks, each must exit 0:
  ```bash
  grep -n "_repo-workflow_"     /home/fedora/workflow/CLAUDE.md
  grep -n "_load-bearing-docs_" /home/fedora/workflow/CLAUDE.md
  grep -n "_language-policy_"   /home/fedora/workflow/CLAUDE.md
  grep -n "_common-commands_"   /home/fedora/workflow/CLAUDE.md
  grep -n "_engineering-norms_" /home/fedora/workflow/CLAUDE.md
  ```
- AC-B4: `grep -n "isolation.*worktree" /home/fedora/workflow/three-loop-workflow/references/l3-phase.js | wc -l` prints `0` (all three worktree-isolation lines removed). Pre-D6 value is `3` (verified).
- AC-B5: `diff -r /home/fedora/workflow/three-loop-workflow/ /home/fedora/.claude/skills/three-loop-workflow/` exits 0
- AC-B6: `grep -n "isolation.*worktree" /home/fedora/workflow/three-loop-workflow/references/schemas.md` exits non-zero (DevResult preamble updated; currently exits 0 — confirms this AC tests a real change).

## 8. Risks and Rollback

**Risk 1 — D6 breaks existing l3-phase.js users**: removing worktree isolation changes the behavior for anyone currently using the script. Mitigation: the script is brand-new (v1.3.1 just shipped); no downstream users in production. The installed copy is also updated (AC-B5), so the behavior change is consistent.

**Risk 2 — README-cn.md translation accuracy**: the translation of the "What's new" summary table must be accurate. Mitigation: table structure uses version numbers and file names (no translation needed for these); only the descriptive cells need translation. The review subagent is instructed to check that all file names and version numbers match exactly between D2 and D3.

**Risk 3 — WORKFLOW-v3.md adjacent damage**: inserting section 4.1.1 is a targeted addition; the surrounding section 4.1 prose must not change. Mitigation: Surgical Changes principle; review subagent checks section 4.1 for any alterations beyond the new subsection.

**Risk 4 — CLAUDE.md _common-commands_ role is wrong**: if the CLAUDE.md declares a `<TEST-CMD>` that doesn't exist, future tasks will fail trying to run it. Mitigation: the `_common-commands_` section explicitly says `<TEST-CMD>: N/A — no test suite; acceptance verified by grep-based checks` so there's no runnable command to fail.

**Rollback**: all changes are file edits or a new file. Rolling back is `git revert <commit>`. The zip rebuild is a build artifact (not git-tracked); re-running the zip command with the prior source tree recreates the v1.2 zip. The installed copy is re-synced from source after any revert.
