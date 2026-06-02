# Implementation: Self-contained subagent types (drop plugin agentType dependencies)

```
Status: closed
Closing-commit: bae80a1
Closed-on: 2026-06-02
Deferred: none
```

Closeout acceptance summary (main agent re-ran all gates): 19/19 acceptance checks PASS
(AC1–AC12 incl. AC7b), `<TEST-CMD>` = N/A (no test suite per CLAUDE.md). Phases 1 and 2
closed via the L3 four-corner engine; Phase 3 dev work (zip rebuild + installed-copy sync)
completed and committed, but its review loop hit the round cap on two non-blocking general
items (a transient workflow-engine file, since removed; and a conformant `code-reviewer`
mention in the README changelog) — no deliverable defect; all Phase-3 acceptance commands
(AC10, AC12) pass under main-agent re-run.

## Task Index

Design document: `docs/design/2026-06-02-self-contained-agent-types.md` (same slug).

| Deliverable | Design ref | Acceptance ref |
|---|---|---|
| D1 l3-phase.js — remove 4 agentType keys | design §2 D1, §4 Decision 1 | AC1, AC3, AC4, AC5 |
| D2/D3/D4 reference-file prose rewrites | design §2 D2-D4, §4 Decision 2 | AC1, AC2, AC11 |
| D5 SKILL.md routing column + paragraph removal | design §2 D5, §4 Decision 3 | AC2, AC6, AC7 |
| D6 SKILL.md version bump | design §2 D6, §4 Decision 4 | AC8 |
| D7/D8 README EN/CN dependency note + changelog | design §2 D7-D8, §4 Decision 4 | AC9 |
| D9 zip rebuild + installed-copy sync | design §2 D9 | AC10, AC12 |

`<TEST-CMD>` per CLAUDE.md _common-commands_ is **N/A** (no test suite); acceptance is
grep / `node --check` / `diff` / `unzip` exit codes over the modified files. All commands
below run from the repository root `/home/fedora/workflow`.

## Phase Breakdown

### Phase 1 — Skill source edits (load-bearing files)

**Entry condition**: L1 design closed (done).

**Design document references**: §2 D1-D6, §4 Decisions 1-3, §7 AC1-AC8, AC11.

**Task list (TDD order — each edit is preceded by a pre-condition grep that documents the
"before" state, then followed by the acceptance grep that proves the "after" state):**

1. **T1.1 (pre-condition)** Confirm the 4 agentType keys exist in l3-phase.js:
   `grep -n "agentType" three-loop-workflow/references/l3-phase.js` → 4 lines (61, 88, 106, 137).
2. **T1.2 (impl)** Edit `references/l3-phase.js`: delete the `agentType: 'feature-dev:feature-dev'`
   and `agentType: 'feature-dev:code-reviewer'` properties from all four `agent()` option
   objects (dev line ~61, review line ~88, review-fix line ~106, accept-fix line ~137).
   Remove only the `agentType` key (and fix the trailing comma / brace so the object stays
   valid); do **not** touch labels, phases, schemas, prompts, `MAX_ROUNDS`, loop structure,
   or the 5 `await agent(` calls.
3. **T1.3 (impl)** Edit `references/loop-1-design.md` line ~67: replace
   `> Spawn this subagent with `agentType: 'code-reviewer'` for strongest review discipline.`
   with a sentence that keeps the **fresh-subagent / role-isolation** reminder but names no
   plugin agent — e.g. "Spawn this review as a fresh default subagent (a new general-purpose
   subagent, distinct from the drafting agent); no special agent type is required." The
   replacement must contain neither the substring `code-reviewer` nor `feature-dev`.
4. **T1.4 (impl)** Edit `references/loop-2-implementation.md` line ~64: same replacement and
   same substring constraint as T1.3.
5. **T1.5 (impl)** Edit `references/loop-3-development.md` line ~68: replace the line that
   recommends `feature-dev:feature-dev` / `feature-dev:code-reviewer` with one that tells the
   main agent to spawn **fresh default subagents** for the dev (step 1) and review (step 2)
   roles, preserving the role-isolation note. No `code-reviewer` / `feature-dev` substring.
6. **T1.6 (impl)** Edit `SKILL.md` Routing table (lines ~180-190): remove the third column
   "Recommended `agentType`" — delete it from the header row, the separator row, and every
   data row, leaving the two columns "You are about to…" and "Read this reference" intact and
   correctly formatted (each remaining row ends with the reference cell, no trailing `|`
   artifacts beyond the standard table close).
7. **T1.7 (impl)** Edit `SKILL.md`: delete the paragraph at line ~192 beginning "For L1 and
   L2 fresh review subagents, use `agentType: 'code-reviewer'`…" in full.
8. **T1.8 (impl)** Edit `SKILL.md` frontmatter line 5: `version: "1.3.1"` → `version: "1.3.2"`.

**Per-task acceptance commands (Phase 1 exit gate):**
```bash
# AC1 — no plugin agent strings in the skill tree
grep -rn "feature-dev:feature-dev\|feature-dev:code-reviewer" three-loop-workflow/; test $? -eq 1
# AC2 — no code-reviewer substring anywhere in the skill tree
grep -rn "code-reviewer" three-loop-workflow/; test $? -eq 1
# AC3 — l3-phase.js has no agentType key
grep -n "agentType" three-loop-workflow/references/l3-phase.js; test $? -eq 1
# AC4 — l3-phase.js still parses
node --check three-loop-workflow/references/l3-phase.js
# AC5 — structure preserved
test "$(grep -c 'await agent(' three-loop-workflow/references/l3-phase.js)" = "5"
grep -n "MAX_ROUNDS = 3" three-loop-workflow/references/l3-phase.js
# AC6 — routing column + paragraph removed
grep -n "Recommended .agentType." three-loop-workflow/SKILL.md; test $? -eq 1
grep -n "bare name" three-loop-workflow/SKILL.md; test $? -eq 1
# AC7 — reference links intact (exact count)
test "$(grep -c 'references/' three-loop-workflow/SKILL.md)" = "18"
# AC7b — routing table header collapsed cleanly to exactly two columns (well-formed table).
# This specific anchored match proves the third "Recommended agentType" column is gone AND
# the header row is well-formed 2-column Markdown (addresses the malformed-table residual gap).
grep -nE '^\| You are about to\.\.\. \| Read this reference \|$' three-loop-workflow/SKILL.md
# And the routing separator immediately under it is exactly 2-column (line N+1 of the header).
# The `.` after the digits is delimiter-agnostic: grep -nA1 joins the context line with ":"
# (same group as the match), so a "-" literal there would false-fail under GNU grep.
grep -nA1 '^\| You are about to\.\.\. \| Read this reference \|$' three-loop-workflow/SKILL.md | grep -qE '^[0-9]+.\|-+\|-+\|$'
# AC8 — version bumped
grep -n 'version: "1.3.2"' three-loop-workflow/SKILL.md
# AC11 — edited reference files carry no leftover agentType: code claim
test "$(grep -lc 'agentType:' three-loop-workflow/references/loop-1-design.md three-loop-workflow/references/loop-2-implementation.md three-loop-workflow/references/loop-3-development.md three-loop-workflow/references/l3-phase.js | wc -l)" = "0"
```
(AC11 note: `grep -l` lists files *with* a match; expecting zero such files is equivalent to
the design's `grep -L` listing all four. Either form is acceptable — the gate is "no edited
file contains the substring `agentType:`".)

**Exit condition**: every Phase-1 command above exits as specified; commit
`feat(phase1): drop plugin agentTypes from skill source` (or `fix(...)`).

### Phase 2 — README EN/CN dependency note + changelog

**Entry condition**: Phase 1 committed.

**Design document references**: §2 D7-D8, §4 Decision 4, §7 AC9.

**Task list:**
1. **T2.1 (pre-condition)** Confirm baseline: `grep -n "v1.3.2\|self-contained" README.md` → exit 1.
2. **T2.2 (impl)** `README.md`: append a `v1.3.2` row to the "What's new" table describing the
   self-contained-agents fix; prior rows untouched. Add a short note (in an appropriate
   existing section, e.g. near "Installing the skill") stating the skill is **self-contained**
   — it depends on no external plugin; all subagent/Workflow nodes run on the built-in default
   subagent.
3. **T2.3 (impl)** `README-cn.md`: mirror T2.2 — append a `v1.3.2` 更新日志 row and a
   self-contained note using 「自包含」 paired with the English token `self-contained` on first
   use. Terminology consistent with the existing translation.

**Per-task acceptance commands (Phase 2 exit gate):**
```bash
grep -ni "self-contained" README.md            # AC9 EN note  → exit 0
grep -n  "v1.3.2" README.md                     # AC9 EN row   → exit 0
grep -n  "自包含" README-cn.md                   # AC9 CN note  → exit 0
grep -n  "v1.3.2" README-cn.md                   # AC9 CN row   → exit 0
```

**Exit condition**: all four commands exit 0; commit `feat(phase2): self-contained note in README EN/CN`.

### Phase 3 — Rebuild distributable + sync installed copy

**Entry condition**: Phases 1 and 2 committed (all source + README edits final).

**Design document references**: §2 D9, §7 AC10, AC12.

**Task list:**
1. **T3.1 (impl)** Rebuild the zip:
   `cd /home/fedora/workflow && rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/`
   (remove the stale zip first so no deleted file lingers inside the archive).
2. **T3.2 (impl)** Sync the installed copy. To guarantee a byte-identical tree (AC10 uses
   `diff -r`), mirror rather than overlay:
   `rm -rf ~/.claude/skills/three-loop-workflow && cp -r three-loop-workflow ~/.claude/skills/three-loop-workflow`
   (a plain `cp -r .../. dest` overlay would leave orphaned files if any source file were ever
   renamed/removed; a clean mirror avoids drift. No source files are renamed in this task, but
   the mirror is the safe form and CLAUDE.md's overlay command is its functional equivalent
   here.)

**Per-task acceptance commands (Phase 3 exit gate):**
```bash
# AC12 — zip rebuilt and contains the skill
unzip -l three-loop-workflow.skill | grep -q "three-loop-workflow/SKILL.md"
# AC10 — installed copy is byte-identical to the repo skill tree
diff -r three-loop-workflow/ ~/.claude/skills/three-loop-workflow/
```

**Exit condition**: AC12 exit 0 and AC10 prints nothing (exit 0); commit
`feat(phase3): rebuild skill zip and sync installed copy` (the documented Phase-opener
prefix is `feat(phaseN):` / `fix(phaseN):` per SKILL.md "Commit conventions"; `chore` is not
a sanctioned Phase prefix, so this build-artifact Phase uses `feat`).

## Engineering Constraints Index

- **Project engineering norms**: CLAUDE.md _engineering-norms_ role — Markdown + one JS
  Workflow script; follow the skill's four core principles; `l3-phase.js` is plain JS (no
  TypeScript, no `Date.now()`, no `Math.random()`); do not add CLAUDE.md roles.
- **Four-corner subagent template**: `references/loop-3-development.md`.
- **Commit conventions**: SKILL.md "Commit conventions" — `feat(phaseN):` / `fix(phaseN-roundR):`;
  no mention of AI/model/agent tooling in commit messages.
- **Language policy**: CLAUDE.md _language-policy_ — all skill/process files English;
  README-cn.md is the sole Chinese file.

## Data and Fixture Dependencies

None. No test fixtures. The only external tool invoked by acceptance is `node` (for
`node --check`), confirmed present (v24.x), plus `zip`/`unzip`/`grep`/`diff` (coreutils).

## Regression Protection

- No prior-Phase test suite exists. Regression is guarded structurally:
  - AC5 (`await agent(` count = 5, `MAX_ROUNDS = 3` present) ensures the l3-phase.js edit
    removes only `agentType` keys and preserves the L3 loop structure introduced by the
    closed f3-f5 task.
  - AC4 (`node --check`) ensures the JS edit does not break parsing.
  - AC7 (`references/` count = 18) ensures the SKILL.md column removal does not drop any
    routing row.
  - AC10 (`diff -r` exit 0) ensures the installed copy never diverges from the repo tree.
- Phase ordering is the regression boundary: Phase 3 (zip/sync) must run only after Phases 1
  and 2 are final, so the distributable reflects every edit.
