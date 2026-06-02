# Implementation: No process-narration comments in code

```
Status: closed
Closing-commit: 470f863
Closed-on: 2026-06-02
Deferred: none
```

Closeout acceptance summary (main agent re-ran all gates): 17/17 acceptance checks PASS
(AC1–AC11), `<TEST-CMD>` = N/A (no test suite per CLAUDE.md). All three L3 phases closed via
the four-corner engine on the first dev round each (diff-scoped review prompt; no cap stalls).

## Task Index

Design document: `docs/design/2026-06-02-no-process-comments.md` (same slug).

| Deliverable | Design ref | Acceptance ref |
|---|---|---|
| D1 SKILL.md §0.3 rule bullet | §2 D1, §4 Decision 1 | AC1 |
| D2 WORKFLOW-v3.md §0.3 rule | §2 D2, §4 Decision 1 | AC2 |
| D3 loop-3-development.md review check | §2 D3, §4 Decision 2 | AC3 |
| D4 l3-phase.js comment scrub | §2 D4, §4 Decision 3 | AC4, AC5, AC6, AC7 |
| D5 SKILL.md version bump | §2 D5, §4 Decision 4 | AC8 |
| D6 README EN/CN changelog | §2 D6, §4 Decision 4 | AC9 |
| D7 zip rebuild + installed-copy sync | §2 D7 | AC10, AC11 |

`<TEST-CMD>` per CLAUDE.md _common-commands_ = **N/A** (no test suite); acceptance is
grep / awk / `node --check` / `diff` / `unzip` exit codes. All commands run from
`/home/fedora/workflow`.

**Canonical rule phrase (verbatim in D1 and D2)**: `explain the code, not the workflow`.

## Phase Breakdown

### Phase 1 — Rule additions + exemplar scrub (load-bearing skill source)

**Entry condition**: L1 design closed (done).

**Design references**: §2 D1-D5, §4 Decisions 1-3, §7 AC1-AC8.

**Task list (each impl edit followed by its acceptance check):**

1. **T1.1 (impl, D1)** In `three-loop-workflow/SKILL.md`, in the `### 0.3 Surgical Changes`
   section, add a new bullet **immediately after the `- **Trace test**: …` bullet** (the last
   bullet before `### 0.4`). The bullet, matching the section's bullet style:
   ```
   - **Comments explain the code, not the workflow.** A comment must explain what the code does or why — never narrate the process that produced it. Do not leave round/cycle history, review-iteration notes, or design-document/decision references in source comments (e.g. `// Cycle A`, `// added in review round 2`, `// per Decision 2`, `// see docs/design/…`). That provenance lives in the design document and git history; in code it is stale-prone noise. This is the most common over-reading of the trace test above: trace a line to its Deliverable in your reasoning, not in a comment.
   ```
2. **T1.2 (impl, D2)** In `WORKFLOW-v3.md`, in the `### 0.3 Surgical Changes` section, add the
   **same rule** immediately after the `**The trace test**: …` paragraph and **before** the
   `**Enforcement points**:` paragraph. Match WORKFLOW-v3.md's local style — write it as a
   bold-led paragraph (not a bullet), keeping the canonical phrase verbatim:
   ```
   **Comments explain the code, not the workflow.** A comment must explain what the code does or why — never narrate the process that produced it. Round/cycle history, review-iteration notes, and design-document/decision references (e.g. `// Cycle A`, `// added in review round 2`, `// per Decision 2`, `// see docs/design/…`) belong in the design document and git history, not in source comments. This is the most common over-reading of the trace test: trace a line to its Deliverable in your reasoning, not in a comment.
   ```
3. **T1.3 (impl, D3)** In `three-loop-workflow/references/loop-3-development.md`, add a review
   check. Place it immediately after the `**Role isolation hard constraint**: …` line (~line
   79). Must contain the literal token `process-narration comment`:
   ```
   > **Review check — process-narration comments.** The review subagent must flag any comment in the diff that narrates the workflow — round/cycle history, review-iteration notes, design-doc/decision references — rather than explaining the code, as a Surgical-Changes issue (see SKILL.md §0.3 "Comments explain the code, not the workflow").
   ```
4. **T1.4 (impl, D4)** In `three-loop-workflow/references/l3-phase.js`, scrub the three
   process-narration comments, keeping all algorithm-explaining comments:
   - Line 11: change `// Required args (see docs/design/2026-06-01-f3-f5-workflow-l3-engine.md §4 Decision 2):`
     to `// Required args:` (drop the parenthetical only; keep the arg-list lines 12-15 intact,
     including line 14 which legitimately contains `docs/design/<slug>.md`).
   - Line 74: delete the whole line `// This formula matches references/schemas.md ReviewVerdict loop-closure check.`
     (the preceding line 73 already explains the two-generation formula).
   - Line 109: reword `// Accept failures route back to ACCEPT (not review) per the four-corner diagram.`
     to `// Accept failures route back to ACCEPT, not review.` (keep the behavioral fact; drop
     the diagram reference).
   - **Do NOT** touch line 85 `` `Return a ReviewVerdict (see references/schemas.md).` `` — it is
     a functional prompt string the review subagent reads, not a comment.
   - **Do NOT** remove the kept comments (step markers ~52/71/108, null-branch guard ~67,
     two-generation explanation ~73, `Required args` label ~11, exit/cap notes ~94/110).
5. **T1.5 (impl, D5)** In `three-loop-workflow/SKILL.md` frontmatter line 5, change
   `version: "1.3.2"` → `version: "1.3.3"`.

**Per-task acceptance commands (Phase 1 exit gate):**
```bash
# AC1 — rule present within SKILL.md §0.3
awk '/^### 0\.3 /{f=1} /^### 0\.4 /{f=0} f' three-loop-workflow/SKILL.md | grep -q "explain the code, not the workflow"
# AC2 — same rule within WORKFLOW-v3.md §0.3
awk '/^### 0\.3 /{f=1} /^### 0\.4 /{f=0} f' WORKFLOW-v3.md | grep -q "explain the code, not the workflow"
# AC3 — L3 review reinforcement
grep -ni "process-narration comment" three-loop-workflow/references/loop-3-development.md
# AC4 — exemplar scrubbed (process-narration fragments gone; kept substrings survive)
grep -n "see docs/design" three-loop-workflow/references/l3-phase.js; test $? -eq 1
grep -n "four-corner diagram" three-loop-workflow/references/l3-phase.js; test $? -eq 1
grep -n "matches references/schemas.md" three-loop-workflow/references/l3-phase.js; test $? -eq 1
# AC5 — still parses
node --check three-loop-workflow/references/l3-phase.js
# AC6 — structure preserved
test "$(grep -c 'await agent(' three-loop-workflow/references/l3-phase.js)" = "5"
grep -n "MAX_ROUNDS = 3" three-loop-workflow/references/l3-phase.js
# AC7 — kept comments survive (guard against over-stripping)
grep -n "Two-generation termination" three-loop-workflow/references/l3-phase.js
grep -n "Required args" three-loop-workflow/references/l3-phase.js
# also confirm the line-85 functional literal is intact:
grep -n "Return a ReviewVerdict (see references/schemas.md)" three-loop-workflow/references/l3-phase.js
# AC8 — version bumped
grep -n 'version: "1.3.3"' three-loop-workflow/SKILL.md
```

**Exit condition**: every command above exits as specified; commit
`feat(phase1): forbid process-narration comments and scrub the l3-phase.js exemplar`.

### Phase 2 — README EN/CN changelog

**Entry condition**: Phase 1 committed.

**Design references**: §2 D6, §4 Decision 4, §7 AC9.

**Task list:**
1. **T2.1 (pre-condition)** `grep -n "v1.3.3" README.md` → exit 1 (baseline).
2. **T2.2 (impl)** `README.md`: append a `v1.3.3` row to the "What's new" table describing the
   change (e.g. "Skill no longer induces process-narration comments in code: explicit
   Surgical-Changes rule + L3 review check; the `l3-phase.js` exemplar scrubbed of
   decision/diagram references"). Prior rows untouched.
3. **T2.3 (impl)** `README-cn.md`: append a matching `v1.3.3` 更新日志 row, terminology
   consistent with the existing translation. Prior rows untouched.

**Per-task acceptance commands (Phase 2 exit gate):**
```bash
grep -n "v1.3.3" README.md       # AC9 EN → exit 0
grep -n "v1.3.3" README-cn.md    # AC9 CN → exit 0
```

**Exit condition**: both exit 0; commit `feat(phase2): record v1.3.3 in README EN/CN changelog`.

### Phase 3 — Rebuild distributable + sync installed copy

**Entry condition**: Phases 1 and 2 committed.

**Design references**: §2 D7, §7 AC10, AC11.

**Task list:**
1. **T3.1 (impl)** `rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/`
2. **T3.2 (impl)** `rm -rf ~/.claude/skills/three-loop-workflow && cp -r three-loop-workflow ~/.claude/skills/three-loop-workflow`
   (clean mirror, so AC10's `diff -r` is byte-exact; functionally equivalent to CLAUDE.md's
   overlay sync command, with no orphan risk).
3. **T3.3 (impl)** Commit the rebuilt zip: `git add three-loop-workflow.skill && git commit -m "feat(phase3): rebuild skill zip and sync installed copy"`.
   (The `~/.claude` copy is outside the repo and is not committed.)

**Per-task acceptance commands (Phase 3 exit gate):**
```bash
unzip -l three-loop-workflow.skill | grep -q "three-loop-workflow/SKILL.md"   # AC11 → exit 0
diff -r three-loop-workflow/ ~/.claude/skills/three-loop-workflow/             # AC10 → exit 0
```

**Exit condition**: AC11 exit 0 and AC10 prints nothing (exit 0); commit as in T3.3.

## Engineering Constraints Index

- **Project engineering norms**: CLAUDE.md _engineering-norms_ — Markdown + one JS Workflow
  script; follow the four core principles; `l3-phase.js` is plain JS (no TypeScript, no
  `Date.now()`/`Math.random()`); do not add CLAUDE.md roles.
- **Four-corner subagent template**: `references/loop-3-development.md`.
- **Commit conventions**: SKILL.md "Commit conventions" — `feat(phaseN):` / `fix(phaseN-roundR):`;
  no AI/model/agent-tooling mentions.
- **Language policy**: CLAUDE.md _language-policy_ — all skill/process files English;
  README-cn.md the sole Chinese file. The new rule's canonical English phrase must appear
  verbatim in both SKILL.md and WORKFLOW-v3.md; only the README-cn.md changelog row is Chinese.
- **Per-file §0.3 style** (from L1 review): SKILL.md §0.3 uses bullets (add a bullet);
  WORKFLOW-v3.md §0.3 uses bold-led paragraphs around the trace test (add a bold paragraph).
  The canonical phrase is identical in both; only the surrounding formatting differs.

## Data and Fixture Dependencies

None. Acceptance uses `node` (confirmed v24.x), `awk`, `grep`, `diff`, `unzip`, `zip`.

## Regression Protection

- No prior test suite. Structural guards:
  - AC5 (`node --check`) and AC6 (`await agent(` count = 5, `MAX_ROUNDS = 3`) ensure the
    l3-phase.js scrub removes only comments and preserves the L3 engine structure.
  - AC7 (kept-comment anchors + line-85 literal present) guards against over-stripping (R1).
  - AC1/AC2 awk-range checks ensure the rule lands inside §0.3 of each file.
  - AC10 (`diff -r` exit 0) ensures the installed copy never diverges from the repo tree.
- Phase ordering is the regression boundary: Phase 3 (zip/sync) runs only after Phases 1-2
  are final.
