# Design: No process-narration comments in code

## 1. Background and Purpose

When this skill drives a coding task, the code it produces frequently carries
**process-narration comments** — comments that describe the *workflow* rather than the
*code*. Observed forms: `// Cycle A: ...`, `// added in review round 2`, `// per Decision 2`,
`// matches references/schemas.md`, `// per the four-corner diagram`. These leave a running
log of the dev→review→fix iteration and of design-doc decisions inside source files, which
is noisy, confusing to later readers, and quickly goes stale.

The skill never explicitly instructs this, and it actually contradicts the skill's own
**Surgical Changes** ("Do not 'improve' adjacent code, comments, or formatting") and
**Simplicity First** principles. Two skill properties induce the behavior anyway:

1. **The trace test is over-read.** SKILL.md §0.3 / WORKFLOW-v3.md §0.3: "every changed line
   must trace directly to a Deliverable … or an escalated decision recorded in the design
   document." This is a *provability* rule, but an agent readily "satisfies" it by literally
   annotating lines with their originating decision/round.
2. **The skill's own exemplar models the anti-pattern.** `references/l3-phase.js` — the one
   piece of real code shipped in the skill — is annotated with design-doc/section/decision
   cross-references and diagram references (`// Required args (see docs/design/…§4 Decision
   2):`, `// This formula matches references/schemas.md …`, `// Accept failures route back to
   ACCEPT (not review) per the four-corner diagram.`). Agents imitate the only code sample
   they are shown.

If we do nothing: every task run under the skill keeps emitting process-log comments,
degrading the codebases the skill is supposed to keep clean — a direct violation of the
skill's stated principles.

The goal: make the skill **explicitly forbid process-narration comments** in code (rationale
and iteration history live in the design doc and git history, not in source), reinforce it
at L3 review so reviewers flag it, and **remove the anti-pattern from the skill's own
exemplar** so it stops being modeled.

## 2. Deliverables

- [ ] D1: `SKILL.md` §0.3 (Surgical Changes) — add one bullet stating code comments must
      explain the code, not narrate the workflow; round/cycle history, design-doc/decision
      references, and review-iteration notes belong in the design doc and git history, never
      in code comments.
- [ ] D2: `WORKFLOW-v3.md` §0.3 (Surgical Changes) — add the **same** bullet (consistent
      wording) so the spec and the skill stay in lockstep (cross-file consistency requirement).
- [ ] D3: `references/loop-3-development.md` — add an L3 review-check note instructing the
      review subagent to flag process-narration comments in the diff as a Surgical-Changes
      issue.
- [ ] D4: `references/l3-phase.js` — remove the process-narration / external-reference
      comments that model the anti-pattern (the three identified in §4 Decision 3), keeping
      genuine algorithm-explaining comments. Script remains valid JS, structurally unchanged.
      **Do NOT touch the functional `references/schemas.md` string literal inside the review
      agent prompt (line ~85 `(see references/schemas.md)`) — it is executable code that the
      review subagent reads, not a comment.**
- [ ] D5: `SKILL.md` — bump `metadata.version` from `"1.3.2"` to `"1.3.3"`.
- [ ] D6: `README.md` and `README-cn.md` — append a `v1.3.3` row to the "What's new" /
      更新日志 table describing this change (prior rows immutable). EN + CN consistent.
- [ ] D7: Rebuild `three-loop-workflow.skill` zip and sync the installed copy at
      `~/.claude/skills/three-loop-workflow/`.

## 3. Scope Boundary

**In scope**: exactly the changes in §2.

**Out of scope** (explicit non-goals):
- **No new core principle.** The four principles (Think Before Coding, Simplicity First,
  Surgical Changes, Goal-Driven Execution) are canonical; this rule is added *under* Surgical
  Changes, not as a fifth principle.
- **No change to the trace test wording itself.** The trace test stays as-is (it is correct);
  we only add the comments rule alongside it. Re-litigating the trace test is a separate
  concern.
- **No edits to other exemplar code blocks.** The arg-annotation comments in WORKFLOW-v3.md
  §4 (`phaseLabel: 'Phase 1', // human-readable phase name`) and the `loop-3-workflow.md`
  invocation example are API/usage documentation, not process narration — verified, left
  untouched.
- **No edits to closed historical docs** (`docs/design/*`, `docs/implementation/*` from prior
  tasks), even though some quote process-style comments.
- **No removal of l3-phase.js comments that explain the code** (step markers, the
  two-generation formula explanation, variable-purpose notes) — only the external/process
  references are removed.
- **No file renames, no restructuring, no new reference files.**

## 4. Key Design Decisions

### Decision 1 — Where to state the rule

**Problem**: where does a "no process-narration comments" rule belong?

**Options**:
- (a) A new bullet under **Surgical Changes (§0.3)** in both SKILL.md and WORKFLOW-v3.md.
- (b) A new fifth core principle.
- (c) Only in the commit/output conventions section.

**Choice: (a).** The rule is squarely a Surgical-Changes concern — §0.3 already says "Do not
'improve' adjacent code, comments, or formatting", and the new bullet is the natural
specialization ("and do not add comments that narrate the process"). Co-locating it with the
trace test directly counters the over-reading that induces the behavior.

**Why not (b)**: the four principles are a fixed, load-bearing vocabulary referenced
throughout the skill and CLAUDE.md role maps; adding a fifth is disproportionate and would
ripple into many files. **Why not (c)**: conventions fire at commit time; the guidance must
reach the dev subagent *while writing code*, which is what §0.3 governs.

### Decision 2 — How to reinforce at review

**Problem**: a rule the dev ignores must be caught by the reviewer.

**Options**:
- (a) Add an explicit review-check note in `references/loop-3-development.md` (the L3 review
  home).
- (b) Modify the L1 design-review template's coding-philosophy check in `loop-1-design.md`.

**Choice: (a).** L3 review is where code diffs are inspected; `loop-3-development.md` already
hosts the four-corner template and review role. A check that says "flag process-narration
comments as a Surgical-Changes violation" lands exactly where a reviewer reads a code diff.

**Why not (b)**: `loop-1-design.md`'s template reviews *design documents*, not code diffs;
putting a code-comment check there is the wrong altitude (even though L3 reuses its output
format).

### Decision 3 — Which `l3-phase.js` comments to remove vs keep

**Problem**: the exemplar must stop modeling the anti-pattern without losing genuinely useful
code documentation.

**Options**:
- (a) Remove only the comments that reference external docs / decisions / diagrams (process
  narration); keep comments that explain the algorithm.
- (b) Strip nearly all comments.

**Choice: (a).** Precise classification of the current comments:

| Line | Comment | Verdict |
|---|---|---|
| ~11 | `// Required args (see docs/design/2026-06-01-…§4 Decision 2):` | **Remove the parenthetical** design-doc/decision reference; keep `// Required args:` + the arg list (useful API doc) |
| ~74 | `// This formula matches references/schemas.md ReviewVerdict loop-closure check.` | **Remove the line** (external-doc cross-reference; the line above it already explains the formula) |
| ~109 | `// Accept failures route back to ACCEPT (not review) per the four-corner diagram.` | **Reword** to keep the behavioral fact ("Accept failures route back to ACCEPT, not review") and drop "per the four-corner diagram" |
| ~52, ~71, ~108 | `// ── Step 1: Dev ──`, `// ── Review loop ──`, `// ── Accept loop ──` | **Keep** (structural markers) |
| ~67 | `// Explicit null-branch guard (defense-in-depth; …)` | **Keep** (explains code intent) |
| ~72, ~73 | `// round starts at 1 …`, `// Two-generation termination: round > 1 && …` | **Keep** (algorithm explanation) |
| ~94, ~110 | `// exit review loop, enter accept loop`, `// acceptRound shares the same cap pool` | **Keep** (code explanation) |

**Why not (b)**: over-stripping would itself violate the spirit — comments that explain
*what the code does* are good engineering; the rule targets comments that narrate *how the
process arrived at the code*.

### Decision 4 — Version bump + README, given the user listed only 4 files

**Problem**: the user's file list named SKILL.md, loop-3-development.md, l3-phase.js,
WORKFLOW-v3.md — not version/README.

**Options**: (a) bump version + add README changelog row (repo convention); (b) skip them.

**Choice: (a).** The repo invariant (set by the two prior tasks) is that every skill
behavioral change bumps `metadata.version` and appends a "What's new" row in both READMEs.
Skipping would leave the distributable's version indistinguishable and the changelog stale.
The version field lives in SKILL.md (already in scope); the README rows are a one-line
append each. This is consistency maintenance, not scope creep.

**Why not (b)**: violates the established versioning/changelog invariant and ships an
unversioned behavior change.

## 5. Dependencies and Assumptions

- **Assumption**: SKILL.md §0.3 and WORKFLOW-v3.md §0.3 are intended to mirror each other
  (verified: both currently carry the identical Surgical-Changes bullets and trace test).
  The new bullet must be added to both with consistent wording.
- **Dependency**: `node` available for `node --check` on `l3-phase.js`.
- **Assumption**: prior tasks' `docs/*` are closed and immutable.
- **External systems**: none. Documentation + one JS script.

## 6. Relationship with Existing Designs

- **`docs/design/2026-06-02-self-contained-agent-types.md`** (closed, this same day) last
  edited `l3-phase.js`, SKILL.md, WORKFLOW-v3 (no change), and the version/README. This task
  **strictly extends** that line of work (same files, next version `1.3.2 → 1.3.3`); it does
  not supersede any decision there. No conflict.
- **`docs/design/skill-v1-3-improvements.md`** introduced the trace test phrasing; this task
  does **not** alter the trace test, only adds a comments rule beside it. No conflict.
- Terminology anchors: CLAUDE.md _language-policy_ (English; README-cn.md the sole Chinese
  file) and the existing §0.3 vocabulary ("Surgical Changes", "trace test"). No new terms.

## 7. Acceptance Criteria

All mechanical (`<TEST-CMD>` = N/A per CLAUDE.md; acceptance is grep / `node --check` /
`diff` / `unzip` exit codes). Paths relative to `/home/fedora/workflow`. The rule's canonical
greppable phrase is **"explain the code, not the workflow"** (used verbatim in D1 and D2).

- **AC1** (rule in SKILL.md §0.3 — single runnable command that extracts the §0.3 section and
  greps within it, so "located in §0.3" is mechanically checked, not eyeballed):
  `awk '/^### 0\.3 /{f=1} /^### 0\.4 /{f=0} f' three-loop-workflow/SKILL.md | grep -q "explain the code, not the workflow"`
  → exit 0.
- **AC2** (same rule in WORKFLOW-v3.md §0.3, same awk-range form):
  `awk '/^### 0\.3 /{f=1} /^### 0\.4 /{f=0} f' WORKFLOW-v3.md | grep -q "explain the code, not the workflow"`
  → exit 0.
- **AC3** (L3 review reinforcement): `grep -ni "process-narration comment" three-loop-workflow/references/loop-3-development.md`
  → exit 0.
- **AC4** (exemplar scrubbed — no external/process references remain in l3-phase.js comments).
  NOTE: the grep targets the removable *process-narration* fragments only — NOT the bare
  `docs/design` / `references/schemas.md` substrings, which legitimately survive in the kept
  arg-list comment (line ~14 `designDocPath … docs/design/<slug>.md`) and the kept functional
  prompt literal (line ~85 `(see references/schemas.md)`):
  - `grep -n "see docs/design" three-loop-workflow/references/l3-phase.js` → exit 1
    (removes only the line-11 parenthetical; line 14 has no "see").
  - `grep -n "four-corner diagram" three-loop-workflow/references/l3-phase.js` → exit 1.
  - `grep -n "matches references/schemas.md" three-loop-workflow/references/l3-phase.js` → exit 1
    (hits only the line-74 comment; the line-85 prompt literal `(see references/schemas.md)`
    is a different string and is preserved).
- **AC5** (l3-phase.js still parses): `node --check three-loop-workflow/references/l3-phase.js` → exit 0.
- **AC6** (l3-phase.js structure preserved): `grep -c "await agent(" three-loop-workflow/references/l3-phase.js`
  → prints `5`; `grep -n "MAX_ROUNDS = 3" three-loop-workflow/references/l3-phase.js` → exit 0.
- **AC7** (kept comments survive — guard against over-stripping):
  `grep -n "Two-generation termination" three-loop-workflow/references/l3-phase.js` → exit 0, and
  `grep -n "Required args" three-loop-workflow/references/l3-phase.js` → exit 0.
- **AC8** (version bumped): `grep -n 'version: "1.3.3"' three-loop-workflow/SKILL.md` → exit 0.
- **AC9** (README changelog EN + CN): `grep -n "v1.3.3" README.md` → exit 0 and
  `grep -n "v1.3.3" README-cn.md` → exit 0.
- **AC10** (installed copy synced): `diff -r three-loop-workflow/ ~/.claude/skills/three-loop-workflow/`
  → exit 0.
- **AC11** (zip rebuilt): `unzip -l three-loop-workflow.skill | grep -q "three-loop-workflow/SKILL.md"`
  → exit 0, rebuilt in the same Phase as the source edits.

## 8. Risks and Rollback

- **R1 — Agents over-apply the rule and strip useful explanatory comments.** *Severity:
  medium.* Mitigated by the rule's explicit "explain the code, not the workflow" framing
  (keep what explains the code) and by AC7, which fails if the exemplar's genuine algorithm
  comments are removed. The rule text includes a keep/remove contrast.
- **R2 — SKILL.md and WORKFLOW-v3.md wording drifts apart.** *Severity: low.* Mitigated by
  AC1/AC2 asserting the identical canonical phrase in both, and by D1/D2 requiring consistent
  wording.
- **R3 — README changelog contradiction.** *Severity: low.* Append-only; prior rows immutable.
- **R4 — Installed-copy / zip drift.** *Severity: low.* Gated by AC10 (`diff -r`) and AC11.
- **Rollback**: `git revert` the Phase commit(s); regenerate the `.skill` zip and re-sync the
  installed copy from the reverted tree. No external state.
