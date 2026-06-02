# Design: Self-contained subagent types (drop plugin agentType dependencies)

## 1. Background and Purpose

The three-loop-workflow skill points several of its subagent / Workflow nodes at
**plugin-provided `agentType` values**. These appear in five active files:

- `references/l3-phase.js` — the L3 Workflow runner — uses `agentType: 'feature-dev:feature-dev'`
  (dev + fix nodes) and `agentType: 'feature-dev:code-reviewer'` (review node).
- `references/loop-1-design.md` and `references/loop-2-implementation.md` — recommend the
  bare `agentType: 'code-reviewer'` for L1/L2 reviews.
- `references/loop-3-development.md` and `SKILL.md` (routing table + the paragraph at the
  bottom of "Routing") — recommend `feature-dev:feature-dev` and `feature-dev:code-reviewer`.

Two failure modes result:

1. **Plugin-dependency failure (the reported problem).** `feature-dev:code-reviewer` is
   supplied by the external `feature-dev` plugin. A user who installs **only this skill**
   has no such agent type in their registry. When `l3-phase.js` calls
   `agent({ agentType: 'feature-dev:code-reviewer' })`, the node cannot be created — the L3
   Workflow run aborts. The skill is therefore not self-contained.
2. **Invalid references that fail even with the plugin installed.**
   `feature-dev:feature-dev` is a **skill name, not an agent type**. The feature-dev
   plugin's agent types are `code-architect`, `code-explorer`, `code-reviewer` — there is
   no `feature-dev:feature-dev` agent. The dev/fix nodes (the most-used L3 nodes) thus
   cannot resolve their requested agent type under any installation. Likewise the **bare**
   `code-reviewer` is in no default registry; only the namespaced `feature-dev:code-reviewer`
   exists, and only with the plugin.

If we do nothing: the skill's recommended/encoded execution path is broken for the common
case (skill installed alone) and partially broken even in the intended case, undermining
the skill's core promise that it can drive a disciplined change end-to-end.

The goal: make the skill **self-contained** — every subagent / Workflow node runs on an
**always-available built-in subagent** — and remove all plugin `agentType` references so the
skill neither depends on nor conflicts with any other installed plugin or skill.

## 2. Deliverables

- [ ] D1: `references/l3-phase.js` — remove all four `agentType:` references; dev, review,
      and fix nodes run on the **default Workflow subagent** (the `agentType` key is omitted).
      Script remains valid JavaScript and structurally unchanged otherwise (round caps,
      schemas, two-generation termination, return contract all preserved).
- [ ] D2: `references/loop-1-design.md` — replace the `agentType: 'code-reviewer'` guidance
      line with guidance to spawn a **fresh default subagent** (no plugin agentType); the
      role-isolation intent is preserved in prose. **The replacement text must not contain
      the literal substring `code-reviewer` or `feature-dev`** (so AC2 holds).
- [ ] D3: `references/loop-2-implementation.md` — same change as D2, same substring constraint.
- [ ] D4: `references/loop-3-development.md` — replace the line recommending
      `feature-dev:feature-dev` / `feature-dev:code-reviewer` with guidance to spawn fresh
      default subagents for the dev and review roles. **Same substring constraint: the
      replacement text contains neither `code-reviewer` nor `feature-dev`.**
- [ ] D5: `SKILL.md` — remove the now-redundant "Recommended `agentType`" column from the
      Routing table, and remove the explanatory paragraph that distinguishes bare
      `code-reviewer` from namespaced `feature-dev:code-reviewer`. The routing table's
      "You are about to…" and "Read this reference" columns are unchanged.
- [ ] D6: `SKILL.md` — bump `metadata.version` from `"1.3.1"` to `"1.3.2"`.
- [ ] D7: `README.md` — add a short dependency note containing the phrase **"self-contained"**
      (no plugin dependencies) and append a `v1.3.2` row to the "What's new" table. Prior
      changelog rows (v1.3, v1.3.1) are **immutable history** and are not edited — only a new
      row is appended.
- [ ] D8: `README-cn.md` — Chinese translation of the D7 additions, terminology consistent
      with the existing translation. Append a `v1.3.2` row; prior rows immutable. The
      dependency note must include a stable, greppable Chinese phrase for AC9 (the term
      「自包含」, paired with the English token `self-contained` in parentheses on first use so
      both EN and CN content checks are mechanically satisfiable).
- [ ] D9: Rebuild `three-loop-workflow.skill` zip and sync the installed copy at
      `~/.claude/skills/three-loop-workflow/` (per CLAUDE.md _common-commands_).

## 3. Scope Boundary

**In scope**: exactly the changes in §2.

**Out of scope** (explicit non-goals):
- **No opt-in mechanism for plugin agents.** We are *dropping* plugin agentTypes entirely
  (per the user's decision), not making them configurable via `args` or feature-detected.
  A future task may re-introduce an optional enhancement; it is not done here.
- **No change to the L3 discipline.** Round caps (3), the four-corner role model, the
  two-generation termination formula, structured-output schemas, the dev→review→accept→fix
  routing, and `l3-phase.js`'s return contract (`closed` / `cap-exhausted` /
  `design-conflict`) are untouched.
- **No edits to closed historical docs.** `docs/design/*` and `docs/implementation/*` from
  prior tasks (f3-f5, maintenance-debt, skill-v1-3, roles-and-test-intent) are historical
  records and are not rewritten, even though they quote the old agentType strings.
- **No file renames, no restructuring, no new reference files.**
- **No change to `WORKFLOW-v3.md`** — it contains no agentType references (verified).
- **No change to `references/loop-3-workflow.md`** — the Workflow-mode invocation guide is a
  routing target (SKILL.md row "Start a Phase (L3) — Workflow mode") but carries no
  `agentType` / `feature-dev` / `code-reviewer` strings (verified: zero matches). It needs no
  edit; recorded here so the L2 author knows it was audited, not missed.
- **No worktree/isolation changes** — the current `l3-phase.js` does not set
  `isolation: 'worktree'`; this task does not add or remove it.

## 4. Key Design Decisions

### Decision 1 — What replaces the plugin agentTypes in `l3-phase.js`?

**Problem**: the dev/review/fix `agent()` calls must run on something always available.

**Options**:
- (a) **Omit the `agentType` key entirely** → the call uses the default Workflow subagent.
- (b) Hard-code `agentType: 'general-purpose'`.
- (c) Read an optional override from `args`, defaulting to omit.

**Choice: (a) omit the key.** The Workflow runtime's documented behaviour is that omitting
`agentType` uses "the default workflow subagent", which is always present regardless of
installed plugins — exactly the always-available baseline we need. It is also the smallest
possible diff (delete the property), satisfying Surgical Changes.

**Why not (b)**: hard-coding `general-purpose` over-specifies a particular built-in name and
is strictly more text than omitting; the default Workflow subagent is the intended baseline
for Workflow `agent()` calls. **Why not (c)**: the user explicitly chose to drop plugin
agents entirely; an args override re-introduces the optionality we were told to remove, and
adds a code path with no current caller (violates Simplicity First).

### Decision 2 — How to phrase the manual-mode (prose) review-spawn guidance?

**Problem**: `loop-1`, `loop-2`, and `loop-3-development` each carry a line telling the main
agent which `agentType` to spawn. After dropping plugin types, what do they say?

**Options**:
- (a) Delete the guidance line entirely.
- (b) Replace it with explicit guidance: spawn a **fresh default subagent** (omit
  `subagent_type` / use the built-in default), preserving the role-isolation message.

**Choice: (b).** The lines carry load-bearing intent beyond the agentType name — they
remind the reader that reviews use a *fresh* subagent (role isolation). Deleting outright
would drop that reminder. We keep one sentence that states the fresh-default-subagent rule
and removes the plugin name.

**Why not (a)**: loses the role-isolation reinforcement that the line currently provides;
the skill elsewhere treats self-review as a severe violation, so the reminder has value.

### Decision 3 — Keep or remove the SKILL.md "Recommended `agentType`" routing column?

**Problem**: once every recommended value is "the default subagent", the column's cells all
collapse to `*(default)*`.

**Options**:
- (a) Keep the column, set every cell to `*(default)*`.
- (b) Remove the column and the accompanying explanatory paragraph (current SKILL.md
  line 192) that contrasts bare `code-reviewer` with `feature-dev:code-reviewer`.

**Choice: (b) remove.** A column whose every cell is identical conveys no routing
information and, worse, its mere presence implies the skill selects among external agent
types — the exact dependency we are removing. The explanatory paragraph becomes false once
the distinction it describes is gone. Removal is the honest end-state and aligns with
Simplicity First. This is in-scope because the column existed *solely* to recommend
agentTypes (added in v1.3 as D15; see §6).

**Why not (a)**: keeps dead, misleading scaffolding; an all-`*(default)*` column invites a
future reader to "fill it back in" with plugin names, reopening the bug.

### Decision 4 — Version bump and changelog?

**Problem**: this is a user-facing behavioural correction; the skill carries a semantic
version and a README "What's new" table.

**Options**: (a) no bump; (b) patch bump `1.3.1` → `1.3.2`; (c) minor bump `1.4.0`.

**Choice: (b) patch bump to `1.3.2`.** The change is a backward-compatible correctness fix
(removing a broken external dependency); it adds no new user-facing feature, so a patch
bump is the correct semver signal. A `v1.3.2` row in the "What's new" table records it.

**Why not (a)**: shipping a behavioural fix without a version signal makes the installed
copy indistinguishable from the broken one. **Why not (c)**: no new capability is added.

## 5. Dependencies and Assumptions

- **Assumption (sourced from the Workflow/Agent tool contract, not inferred)**: the Workflow
  tool's documented behaviour is that `opts.agentType` "uses a custom subagent type … instead
  of the default workflow subagent" — i.e., omitting the key selects that default Workflow
  subagent, which is always present regardless of installed plugins. Symmetrically, the Agent
  tool documents that when `subagent_type` is omitted "the general-purpose agent is used".
  Both defaults exist with zero plugins installed. If this contract were ever to change such
  that omitting the key errored or inherited the parent's type, Decision 1 would fall back to
  option (b) (`general-purpose`); this is noted so the fallback is explicit, not silent.
- **Assumption**: the four built-in always-available agent types referenced by the skill's
  fallback posture (`general-purpose`, `Explore`, `Plan`, default Workflow subagent) require
  no plugin. (The skill body only needs the default subagent after this change.)
- **Dependency**: `node` is available to run `node --check` on `l3-phase.js` as an
  acceptance command (the repo's only mechanical check for the JS file).
- **Assumption**: `docs/*` from prior tasks are closed and treated as immutable history.
- **External systems**: none. This is a documentation + single-JS-script change.

## 6. Relationship with Existing Designs

- **`docs/design/2026-06-01-f3-f5-workflow-l3-engine.md`** (closed) introduced
  `references/l3-phase.js` with the `feature-dev:*` agentTypes (its §2 D1 and the impl doc
  lines 174/201/219/250). This task **supersedes the agentType choices** made there; the
  Workflow structure it defined is otherwise retained. ⚠ Conflict marker: the closed f3-f5
  impl doc still shows the old agentType strings — those are historical and intentionally
  not edited; this design is the current source of truth for agentType selection.
- **`docs/design/skill-v1-3-improvements.md`** (closed) D15 added the SKILL.md "Recommended
  `agentType`" column and the bare-vs-namespaced paragraph (impl doc T2.17/T2.18). This task
  **supersedes D15**: the column and paragraph are removed. ⚠ Conflict marker recorded here;
  the closed v1.3 docs are not rewritten.
- No conflict with `docs/design/2026-06-01-maintenance-debt.md` (README/changelog task);
  this task adds a further `v1.3.2` changelog row on top of its v1.3/v1.3.1 rows.
- Terminology anchors: CLAUDE.md _language-policy_ role (English for all skill/process
  files; README-cn.md is the sole Chinese file) and the existing `SKILL.md` vocabulary
  ("subagent", "node", "round cap", "four-corner"). No new terms introduced.

## 7. Acceptance Criteria

All mechanical (this repo has no test suite; `<TEST-CMD>` is N/A per CLAUDE.md). Each is a
shell command with a defined pass condition. Paths are relative to `/home/fedora/workflow`.

- **AC1** (no plugin agent strings anywhere in the skill):
  `grep -rn "feature-dev:feature-dev\|feature-dev:code-reviewer" three-loop-workflow/`
  → exit 1 (no matches).
- **AC2** (no `code-reviewer` substring anywhere in the skill — bare or namespaced):
  `grep -rn "code-reviewer" three-loop-workflow/` → exit 1 (no matches). NOTE: this requires
  the D2/D3/D4 replacement prose to avoid the literal substring `code-reviewer`; verified
  current matches span 9 lines (12 raw occurrences) across 5 files, all of which the
  deliverables remove. AC2 itself is count-independent (it asserts zero matches).
- **AC3** (l3-phase.js has no `agentType` key at all):
  `grep -n "agentType" three-loop-workflow/references/l3-phase.js` → exit 1.
- **AC4** (l3-phase.js still parses): `node --check three-loop-workflow/references/l3-phase.js`
  → exit 0.
- **AC5** (l3-phase.js structure preserved): `grep -c "await agent(" three-loop-workflow/references/l3-phase.js`
  → prints `5` (dev, review, review-fix, accept, accept-fix nodes — unchanged in count); and
  `grep -n "MAX_ROUNDS = 3" three-loop-workflow/references/l3-phase.js` → exit 0.
- **AC6** (routing column removed): `grep -n "Recommended .agentType." three-loop-workflow/SKILL.md`
  → exit 1; and `grep -n "bare name" three-loop-workflow/SKILL.md` → exit 1.
- **AC7** (routing table reference links intact): `grep -c "references/" three-loop-workflow/SKILL.md`
  → prints `18` (exact current count; removing the agentType column touches no `references/`
  link, so a drop below 18 means a routing row was lost).
- **AC8** (version bumped): `grep -n 'version: "1.3.2"' three-loop-workflow/SKILL.md` → exit 0.
- **AC9** (README dependency note present, EN + CN):
  `grep -ni "self-contained" README.md` → exit 0 and `grep -n "v1.3.2" README.md` → exit 0;
  on the CN side `grep -n "自包含" README-cn.md` → exit 0 and `grep -n "v1.3.2" README-cn.md`
  → exit 0 (so both the translated note and the version row are mechanically checked).
- **AC10** (installed copy synced): `diff -r three-loop-workflow/ ~/.claude/skills/three-loop-workflow/`
  → exit 0 (no differences).
- **AC11** (the four edited reference files carry no leftover agentType code claim):
  `grep -L "agentType:" three-loop-workflow/references/loop-1-design.md
  three-loop-workflow/references/loop-2-implementation.md
  three-loop-workflow/references/loop-3-development.md
  three-loop-workflow/references/l3-phase.js` → lists all four files (each has zero
  `agentType:` matches). Fully mechanical; no manual judgement.
- **AC12** (the `.skill` zip is rebuilt and current): `unzip -l three-loop-workflow.skill | grep -q "three-loop-workflow/SKILL.md"`
  → exit 0, and the zip is regenerated in the same Phase as the source edits (D9) so its
  contents match the edited tree.

## 8. Risks and Rollback

- **R1 — Default subagent is less specialized than `feature-dev:code-reviewer`.** The dev /
  review nodes lose plugin-specific prompting. *Severity: low.* The skill injects its own
  role prompts and schemas into every `agent()` call, so role behaviour is driven by the
  prompt, not the agent type. This is strictly more reliable than the prior state, where
  `feature-dev:feature-dev` never resolved to the intended agent at all.
- **R2 — README changelog appears to contradict v1.3 (which "added the agentType column").**
  *Severity: low.* Mitigated by the `v1.3.2` row explicitly recording the column's removal;
  changelogs are append-only history.
- **R3 — Installed copy / zip drift.** If D9 is skipped, users still get the broken version.
  *Mitigated*: the installed copy is gated by AC10 (`diff -r` exit 0) and the `.skill` zip by
  AC12 (rebuilt in the same Phase as the source edits).
- **R4 — A future reader re-adds plugin agentTypes.** *Mitigated*: removing the column and
  paragraph (Decision 3) removes the scaffolding that invited it; AC1/AC2 guard against
  regression.
- **Rollback**: `git revert` the Phase commit(s); regenerate the `.skill` zip and re-sync
  the installed copy from the reverted tree. No data migration, no external state.
