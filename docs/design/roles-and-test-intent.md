# Design: Subagent Role Tightening and Test-Intent Check

```
Status: closed
Closing-commit: 5860b25
Closed-on: 2026-05-11
Deferred: none
```

E2E gate: skipped — skill source files are subagent-prompt scaffolding;
no external process to spawn. AC-D6 leakage check (run during Phase 1)
is the structural equivalent and was confirmed clean.

## 1. Background and Purpose

The three-loop-workflow skill (load-bearing doc) is being modified to absorb
four genuinely-additive rules drawn from an external 12-rule CLAUDE.md
template. Eight of the source template's rules duplicate the existing core
principles §0.1–0.4 (Think Before Coding, Simplicity First, Surgical Changes,
Goal-Driven Execution) and are skipped. The remaining four either cover gaps
in the subagent role contracts (dev, accept) or sharpen an existing principle.

Without this change:
- L3 dev subagents may write code without first reading callers / exports /
  shared utilities of the files they modify. Silent breakage in adjacent code
  is then discoverable only at L3 review or accept time, by which point the
  diff is harder to revise (Surgical Changes loses its preventive role).
- L2 review subagents do not check whether test tasks encode the WHY of the
  invariants they protect — only that TDD order is correct. Vague test tasks
  ("write a test for the rate limiter") license test code that passes
  regardless of whether the business logic is intact.
- L3 accept subagents currently report "pass / fail" without surfacing skipped
  or xfail counts. A run of `pytest tests/ -v` that exits 0 with 30 skipped
  tests looks identical to a clean 0-skipped run; silent test attrition is
  invisible.
- SKILL.md §0.3 Surgical Changes says "match existing style" but does not
  address the case where two existing patterns in the codebase contradict
  each other. The natural failure mode — a hybrid that satisfies neither —
  is not warned against.

## 2. Deliverables

Four source-template additions map to five deliverable hunks (one addition,
B / "read before write", is implemented in two hunks per KDD-2's
principle-vs-operational split):

| Addition | Deliverable hunks | Target file |
|---|---|---|
| A (pattern conflict) | D1 | SKILL.md |
| B (read before write) | D2 (principle) + D3 (operational hook) | SKILL.md + loop-3-development.md |
| C (test intent) | D4 | loop-2-implementation.md |
| D (accept mechanical + tally) | D5 (Output + Forbidden columns) | loop-3-development.md |

- [x] **D1**: `SKILL.md` §0.3 Surgical Changes contains a new bullet on
  resolving conflicts between two existing-but-contradictory patterns.
- [x] **D2**: `SKILL.md` §0.3 Surgical Changes contains a new bullet stating
  the orthogonality-assumption trap as a principle: "if you cannot
  articulate why surrounding code is structured a way, stop and ask".
  The concrete reading list (callers, exports, shared utilities) does
  **not** appear in this bullet — it belongs to D3 per KDD-2.
- [x] **D3**: `references/loop-3-development.md` Role responsibilities table:
  the **dev** row's Input column gains "exports, immediate callers, and
  shared utilities of files being modified" alongside its existing inputs.
  This is the operational hook for the D2 principle.
- [x] **D4**: `references/loop-2-implementation.md` L2 review subagent
  prompt template, step 2, gains a new substep (2.e) checking test-task
  descriptions for intent encoding. The introductory sentence "For each
  Phase, answer four questions" must be updated to "answer five questions"
  to match the new substep count.
- [x] **D5**: `references/loop-3-development.md` Role responsibilities table,
  **accept** row:
  - Output column: **appends** the requirement "passed/failed/skipped/xfail
    tally per command" to the existing cell. The existing "pass or fail"
    label is preserved and is derived mechanically from exit code per
    KDD-4; no replacement of existing wording.
  - Forbidden column: **appends** "interpret or judge output beyond the
    mechanical exit-code → pass/fail derivation; that is the review
    role's job" to the existing cell. The existing "Modify code or tests"
    clause is preserved.

## 3. Scope Boundary

**NOT in scope** (explicit non-goals to prevent L2/L3 scope creep):

- Modifying the L1 review subagent template, L3 review subagent template, or
  any subagent template beyond L2 review.
- Adding a new entry to the `references/claude-md-integration.md` cross-file
  consistency checklist. The four additions extend existing rows (Coding
  philosophy; Four-corner subagent template) which already point at the
  edited files. No new commitment-clause row is needed.
- Editing `references/escalation-rules.md`, `references/end-to-end-review.md`,
  or `references/loop-1-design.md`.
- Restructuring §0.3 itself or any other §0.x principle. Only appending
  bullets.
- Editing the Mermaid diagrams in SKILL.md or the reference files.
- Renaming or relocating any role, principle, or section.
- Cleaning up or polishing prose unrelated to these four additions.
- Versioning bump (e.g., to skill v1.2). Version-bump policy is unrelated to
  the content of this change; raise separately if desired.
- Adding the source 12-rule template into the repo as a fixture.

## 4. Key Design Decisions

### KDD-1: Where to anchor addition A (pattern-conflict resolution)

- **Problem**: When two existing patterns in the same codebase conflict,
  authors today produce hybrids. Where should the prevention rule live so it
  reaches every author (L1 main agent, L2 main agent, L3 dev subagent)?
- **Options**:
  - (a) `SKILL.md` §0.3 Surgical Changes as a new bullet.
  - (b) New `SKILL.md` section (e.g., §0.5 Pattern Conflict).
  - (c) `references/escalation-rules.md` as a new escalation trigger.
- **Choice**: **(a)**.
- **Rationale**: §0.3 already governs "match existing style"; pattern-conflict
  resolution is the obvious next-bullet sharpening of that clause. Every
  subagent prompt already audits against §0.x principles, so reach is
  universal without further plumbing.
- **Rejected (b)**: A new §0.5 would dilute the core-principles set from 4 to
  5 without a distinct failure mode; the failure (drive-by hybrid) is
  already a Surgical Changes failure.
- **Rejected (c)**: Escalation rules are consulted only when an explicit
  trigger fires; pattern conflicts are routine, not exceptional. Putting the
  rule there hides it from authors who don't reach for escalation-rules.md.

### KDD-2: Where to anchor addition B (read-before-write / orthogonality)

- **Problem**: "Read callers / exports / shared utilities before modifying"
  is partly a principle (universal applicability) and partly an operational
  step (specific to authoring code). Where does it land?
- **Options**:
  - (a) `SKILL.md` §0.3 as a new bullet, principle level.
  - (b) `references/loop-3-development.md` dev role Input column, operational
    level only.
  - (c) Both files (duplicate the rule).
- **Choice**: **Hybrid (a) + (b) split**: the **principle** ("orthogonality
  is the dangerous default; stop and ask when you can't articulate why
  surrounding code is structured a way") goes in `SKILL.md` §0.3 alongside
  addition A. The **operational hook** ("dev subagent's input includes
  exports, immediate callers, shared utilities") goes in
  `references/loop-3-development.md` Role table dev row.
- **Rationale**: The principle applies to anyone authoring a change — L1
  agent referencing existing code, L2 agent declaring regression-protection
  tests, L3 dev modifying code. Anchoring only in loop-3 scopes it too
  narrowly. The operational hook in the role table is what makes the L3 dev
  subagent's input set explicitly cover "you read those files first" —
  needed because the role table is the dev subagent's contract.
- **Rejected pure (a)**: The role table's Input column is the dev
  subagent's contract; not updating it leaves the requirement unenforced at
  the four-corner template level.
- **Rejected pure (b)**: Scope too narrow. L1 authors don't routinely read
  loop-3-development.md; L2 authors do read it (via the impl doc
  Engineering Constraints Index), but the principle should still reach L1
  authors. Putting it only in loop-3-development.md misses that audience.
- **Rejected pure (c)** (duplicate full text in both): Cross-file drift
  risk. The split places the principle in one home (SKILL.md) and the
  operational hook in another (role table), each with distinct purposes.

### KDD-3: Placement of test-intent check (addition C)

- **Problem**: "Could this test still pass if the protected business logic
  changed silently?" — at what loop does this check fire?
- **Options**:
  - (a) L2 review only — checks task descriptions for intent encoding before
    any test code is written.
  - (b) L3 review only — checks actual test diffs.
  - (c) Both L2 and L3 review.
- **Choice**: **(a)**.
- **Rationale**: L2 reviews task descriptions in the impl doc. A task
  description like "write a test for the rate limiter" is too vague to
  guarantee an intent-encoding test will result; a task description like
  "write a test asserting that the 101st request in one second returns 429"
  specifies the invariant explicitly. Catching weakness at L2 prevents
  shape-only tests from being authored in L3 at all.
- **Known residual gap**: a task description that does encode intent but
  whose L3-authored implementation reduces to shape-only assertions is not
  caught by this design. The L3 review subagent's existing
  coding-philosophy check (Surgical Changes / Goal-Driven Execution against
  the diff) is the only line of defence for that case. We explicitly accept
  this residual because adding an L3-template check duplicates content
  across two templates that share the L1 format (drift risk), and because
  the L2 gate already catches the higher-frequency failure (vague task
  descriptions licensing weak tests).
- **Rejected (b)**: Catches too late — test code already exists when L3
  review fires, so rewriting it is more expensive than fixing the impl doc.
- **Rejected (c)**: Two prompt-template edits, two places to drift. The
  fence-post problem is real here because both templates share the L1
  format.

### KDD-4: Should addition D require accept subagent to never make ANY judgment?

- **Problem**: The accept subagent currently outputs "pass or fail" — a
  judgment call. The proposed change is to require fact-only output
  (exit code, tally) and forbid interpretation. But "pass" is itself a label.
- **Options**:
  - (a) Keep "pass/fail" label, but require it be derived mechanically from
    exit code (0 → pass, otherwise fail) and require the tally to be
    surfaced alongside.
  - (b) Remove the "pass/fail" label entirely; accept reports only exit
    codes and tallies; the main agent / fix subagent decides what action to
    take.
- **Choice**: **(a)**.
- **Rationale**: Downstream consumers of the accept report (the main agent
  deciding whether to advance the Phase, the fix subagent deciding whether
  it has work) currently key off "pass/fail". Removing that label cascades
  into changes at the four-corner template that this design doc explicitly
  excludes from scope (see §3). Keeping the label but anchoring it to
  exit-code-zero (mechanical) preserves callers while removing the
  interpretation latitude. The tally requirement surfaces silently-skipped
  tests as a first-class signal.
- **Rejected (b)**: Out-of-scope cascade; would require revising the four-
  corner template flow and the Phase termination conditions.

### KDD-5: Granularity of L2 Phases (non-binding hint)

- **Problem**: How many Phases should L2 declare for the five deliverable
  hunks? This decision is properly L2's; L1 surfaces only a hint.
- **Options**:
  - (a) One Phase covering all five hunks.
  - (b) One Phase per addition (A / B / C / D — four Phases).
  - (c) One Phase per deliverable hunk (five Phases).
- **Recommended hint**: **(a)** one Phase.
- **Rationale**: Each hunk is small (single bullet, table-cell addition, or
  prompt-template substep). All share an identical acceptance pattern
  (grep). Conceptually coupled (subagent-role tightening). One Phase keeps
  the round-cap signal informative — three rounds for an unbreakable Phase
  is meaningful evidence; three rounds across many trivially-different
  Phases is noise.
- **Rejected (b) and (c)**: Over-fragments grep-checkable doc edits.
  Multiple near-identical Phase blocks dilute the round-cap signal and
  multiply review-template instantiations without adding review surface.
- **Binding status**: non-binding. L2 may deviate if review surfaces hidden
  coupling between hunks, but should explain the split.

User-confirmed: this KDD stays non-binding (see §6 user-confirmed decisions).

## 5. Dependencies and Assumptions

- **Dependency**: All four edits target files inside the
  `three-loop-workflow/` source directory. The packaged `.skill` artifact
  (`three-loop-workflow.skill`) is gitignored per commit 207448b and is
  regenerated separately — not in scope.
- **Dependency**: The installed copy at
  `/home/fedora/.claude/skills/three-loop-workflow/` is independent from the
  source repo and refreshed via a separate mechanism (out of scope).
- **Assumption**: The skill is loaded by user invocation, so the in-progress
  three-loop-workflow session is operating against the loaded (older) copy
  of the skill. The new bullets and table entries take effect for the next
  session that loads from the updated source. This is acceptable because
  the new rules are tightenings that don't conflict with the current rules.
- **Assumption**: No CLAUDE.md is present in the repo. The skill's "Project
  integration: CLAUDE.md role vocabulary" section is the authoritative
  language-policy anchor for this task; English prose for all docs.
- **Assumption**: `<TEST-CMD>` is not applicable (no executable code is being
  written). `<ACCEPT-CMD>` for each Phase will be defined in L2 as grep-based
  consistency checks against the edited files.

## 6. Relationship with Existing Designs

No prior `docs/design/*.md` files exist (first design task in this repo).
Terminology anchors:

- `SKILL.md` (load-bearing): `Core principles`, `Project integration: CLAUDE.md
  role vocabulary`, `Commit conventions`.
- `references/loop-1-design.md` (load-bearing): "Required sections", review
  subagent prompt template format.
- `references/loop-2-implementation.md` (load-bearing): "Required sections",
  review subagent prompt template, step 2 substeps.
- `references/loop-3-development.md` (load-bearing): "Role responsibilities"
  table, four-corner template.
- `references/claude-md-integration.md` (load-bearing): cross-file
  consistency checklist — this design relies on existing rows (Coding
  philosophy, Four-corner subagent template) which already point at the
  edited files. No edit to `claude-md-integration.md` is needed; see §3
  Scope Boundary.

No conflicts identified. The four additions extend existing sections; none
contradict an existing clause.

### User-confirmed decisions (L1 round 2)

- **Cross-file consistency checklist**: no new row added; the test-intent
  check at L2 rides on the existing "Coding philosophy" row, which already
  names the L2 review prompt as a reference site. This was flagged borderline
  by L1 review round 1 and confirmed with the user.
- **KDD-5 binding status**: kept as non-binding hint with explicit rejected
  alternatives, per user direction (L1 review round 1 clarification).

## 7. Acceptance Criteria

Each criterion is verifiable by a deterministic shell command runnable from
the repo root. Commands are owned by L2 and will be embedded per Phase as
`<ACCEPT-CMD>` lines. The forms below are the canonical mechanical checks —
no human "line-range scan" is required for any AC.

**Notation**: `three-loop-workflow/` is the skill source directory inside
the repo. Commands assume `set -o pipefail`; a non-zero exit from any
pipeline stage fails the AC. "→ N" means the final pipeline stage must
output the integer N.

- **AC-D1** (pattern-conflict bullet in SKILL.md §0.3):
  - `awk '/^### 0\.3 Surgical Changes/,/^### 0\.4/' three-loop-workflow/SKILL.md
    | grep -cF "When two existing patterns"` → 1.
- **AC-D2** (orthogonality / read-before-write principle in SKILL.md §0.3):
  - `awk '/^### 0\.3 Surgical Changes/,/^### 0\.4/' three-loop-workflow/SKILL.md
    | grep -cF "orthogonality"` → ≥ 1.
  - The matched bullet must **not** contain any wording of the concrete
    reading list — that list belongs to D3 per KDD-2. Verify with a
    word-order-tolerant negative check:
    `awk '/^### 0\.3 Surgical Changes/,/^### 0\.4/' three-loop-workflow/SKILL.md
    | grep -ciE "(immediate callers|exports.{0,40}callers|callers.{0,40}exports|shared utilities)"`
    → 0.
- **AC-D3** (dev role Input column in loop-3-development.md):
  - `grep -F "**step 1: dev**"
    three-loop-workflow/references/loop-3-development.md
    | grep -cF "exports, immediate callers"` → 1.
- **AC-D4** (test-intent substep in L2 review template, inside step 2):
  - `awk '/^\[Steps\]/,/^3\./'
    three-loop-workflow/references/loop-2-implementation.md
    | grep -cF "tests shape, not intent"` → 1.
  - The introductory sentence count must agree with the new substep count:
    `grep -cF "answer five questions"
    three-loop-workflow/references/loop-2-implementation.md` → 1, and
    `grep -cF "answer four questions"
    three-loop-workflow/references/loop-2-implementation.md` → 0.
- **AC-D5a** (accept role Output column tally requirement):
  - `grep -F "**step 3: accept**"
    three-loop-workflow/references/loop-3-development.md
    | grep -cF "passed/failed/skipped/xfail"` → 1.
- **AC-D5b** (accept role Forbidden column forbids interpretation):
  - `grep -F "**step 3: accept**"
    three-loop-workflow/references/loop-3-development.md
    | grep -cF "interpret or judge"` → 1.
- **AC-D5-preserve** (append-not-replace semantics for D5):
  - `grep -F "**step 3: accept**"
    three-loop-workflow/references/loop-3-development.md
    | grep -cF "pass or fail"` → 1 (Output column's existing label
    retained, per KDD-4).
  - `grep -F "**step 3: accept**"
    three-loop-workflow/references/loop-3-development.md
    | grep -cF "Modify code or tests"` → 1 (Forbidden column's existing
    clause retained).
- **AC-D6** (no orphan / copy-paste leakage to unintended **text** files):
  - `grep -rlF "orthogonality" three-loop-workflow/` — output must equal
    `three-loop-workflow/SKILL.md` (exactly one path).
  - `grep -rlF "passed/failed/skipped/xfail" three-loop-workflow/` — output
    must equal `three-loop-workflow/references/loop-3-development.md`.
  - `grep -rlF "tests shape, not intent" three-loop-workflow/` — output
    must equal `three-loop-workflow/references/loop-2-implementation.md`.
  - Outside `three-loop-workflow/`, the same new phrases may legitimately
    appear in `docs/design/roles-and-test-intent.md` and
    `docs/implementation/roles-and-test-intent.md` (these discuss the
    phrases). They must not appear anywhere else under the repo root that
    `grep -r` treats as text content:
    `grep -rlF "passed/failed/skipped/xfail" .
    --exclude-dir=three-loop-workflow --exclude-dir=docs --exclude-dir=.git`
    → empty output. (Repeat for "orthogonality" and "tests shape, not
    intent".)
  - **Binary-archive exclusion**: the packaged `three-loop-workflow.skill`
    artifact is a ZIP archive and is gitignored per §5; `grep -r` (without
    `-a`) skips it, which is the intended behaviour. Stray phrases inside
    the archive are out of scope for this AC because regenerating the
    archive is a separate step outside this task.
- **AC-no-regress** (existing structural invariants preserved):
  - `grep -cE "^### 0\.[1-4] " three-loop-workflow/SKILL.md` → 4 (the
    four §0.x principle headings remain).
  - `grep -cE "^\| \*\*step [1-4]:"
    three-loop-workflow/references/loop-3-development.md` → 4 (the Role
    responsibilities table still has exactly 4 step rows).
  - `awk '/^\[Steps\]/,/^\[Output format\]/'
    three-loop-workflow/references/loop-2-implementation.md
    | grep -cE "^[1-5]\."` → 5 (the L2 review template still has top-level
    steps 1 through 5; the new substep is *under* step 2, not a new
    top-level step).

## 8. Risks and Rollback

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bullet additions in §0.3 alter the established 6-bullet pattern; subsequent reviewers cite "bullet bloat" | Low | Low (cosmetic) | The two new bullets address distinct named failure modes; rejecting them later requires identifying which failure mode is acceptable. Documented here for traceability. |
| L2 review template's new substep 2.e adds load to L2 review subagents; review-time inflation | Low | Low | The check is a single yes/no question on each test task; no new template-wide structural change. |
| Accept role tally requirement changes downstream consumers' expectations (Phase commit trailer format) | Low | Medium | The Phase commit-trailer convention in SKILL.md `Commit conventions` says "`<TEST-CMD>` exit code and key `<ACCEPT-CMD>` results"; this is unchanged. Tally is additive metadata in the accept report, not a new commit trailer key. |
| Authors of in-progress tasks against the prior skill version find the new bullets surprising | Low | Low | Tightening only — no prior-conforming behavior becomes non-conforming except for the silent-skipped-test pattern, which was always a hidden failure. |
| Drift between SKILL.md §0.3 orthogonality bullet and loop-3-development.md dev-role Input column (the §0.3 principle and the operational hook diverge over time) | Medium | Low | KDD-2 explicitly splits principle and operational hook so neither file owns both; cross-file consistency checklist's existing "Coding philosophy" row already covers the linkage. |
| Pattern-conflict bullet is read as a license to refactor "the other" conflicting pattern away ("flag for cleanup" → "do the cleanup") | Medium | Medium | The bullet wording explicitly says "flag the other for cleanup", not "clean up the other". Reinforced by existing §0.3 bullet "Notice unrelated dead code: mention it, do not delete it." Same template. |

### Rollback

Each addition is independently revertible because each occupies a single
diff hunk:

- **Per-deliverable revert**: `git revert <commit>` on the closing commit
  removes all four additions atomically. If only one deliverable proves
  problematic, the bullet / table-cell / substep can be removed with a
  single follow-up edit; no schema, no data migration, no dependencies.
- **Full task revert**: revert the closing commit; no docs/ files persist
  beyond this task (they are per-task per the document creation
  convention), but `docs/design/roles-and-test-intent.md` and
  `docs/implementation/roles-and-test-intent.md` remain for archival
  unless explicitly deleted.

No external systems, no data, no API surface depends on any of the four
additions. Rollback is purely textual.
