# Implementation: Cross-runtime portability (Claude Code / Codex / opencode)

Slug: `2026-07-10-cross-runtime-portability` (identical to the design doc). Design:
`docs/design/2026-07-10-cross-runtime-portability.md`. Target version: **v1.13.0**.

## Task Index (Deliverable → design anchor)

| Deliverable | Design ref |
|---|---|
| SKILL.md frontmatter (top-level `license`, `compatibility`, `version` 1.13.0, move `license` out of `metadata`) | design §2 D-1, §4 D1/D2, §7 AC2 |
| `references/platforms.md` (install matrix, capability matrix incl. AskUserQuestion→STOP:QUESTION, isolation ladder, D8 restatement, `cross_runtime` token) | design §2 D-2, §4 D3/D6/D8, §7 AC3 |
| SKILL.md body (routing row → platforms.md + net-neutral reframe + `SKILL.md:179` reword) | design §2 D-3, §4 D4, §7 AC4 |
| `references/loop-3-workflow.md` reframe touch | design §2 D-4, §4 D4 |
| `references/check-consistency.sh` (`cross_runtime` paired token + register fixture) | design §2 D-5, §4 D7, §7 AC1 |
| `tests/scenarios/no-subagent-review-stays-fresh.md` fixture | design §2 D-6, §4 D6, §7 AC6 |
| README.md + README-cn.md (cross-platform install + changelog + "Claude skill"→"Agent Skill") | design §2 D-7, §7 AC7 |

**Decisions carried from L1 review (recorded here, not new scope):**
- **Token literal = `cross_runtime`** — a distinctive underscore literal (not a substring of the
  `platforms.md` path), placed in both SKILL.md and `platforms.md` (D7).
- **`claude-md-integration.md` consistency table is NOT edited.** Per the R7 clarification: the recent
  single-purpose paired tokens (`evidence_rule`, `spike_answer`, `verbatim_evidence`, `failure_retrospective`,
  `diagnosis_method`, `negation_positive`) are all gated in `check-consistency.sh` with an inline comment and
  **no** table row, and commit `4476a4f` made the script's inline comments "the authoritative per-check
  reference." `cross_runtime` follows that precedent: an inline-commented gate, documented there, no table row.
- **Packaging is not a committed Phase.** `*.skill` is gitignored and CI-built on the `v1.13.0` tag
  (`.github/workflows/release.yml`); the local `.skill` rebuild + installed-copy `rsync` are F-time
  verification steps (see F closeout), not L3 commits.
- **Behavioral gate (design AC6 + AC9)** is discharged by the **main agent** via fresh subagents as the
  skill-self behavioral GREEN check at the end of the Phase that edits discipline-adjacent prose
  (`references/loop-3-development.md:207`) and re-run at F — it is **not** a shell `<ACCEPT-CMD>` (the accept
  corner is mechanical and cannot judge behavioral output).

## Phase Breakdown

`<TEST-CMD>` for this repo = `bash three-loop-workflow/references/check-consistency.sh` (the authoritative
acceptance check; there is no unit-test suite — CLAUDE.md _common-commands_). It must exit 0 at the end of every
Phase.

### Phase 1 — Portability content (platforms.md + loop-3-workflow.md touch + README×2)

**Entry condition:** L1 closed (design doc committed).

**Design references:** design §2 D-2/D-4/D-7, §4 D3/D6/D8, §7 AC3/AC7.

**Task list (TDD order — for docs, the "test" is the runnable grep/gate assertion that must hold after the
edit; each acceptance command below is written before its edit and must pass after):**
1. Write `three-loop-workflow/references/platforms.md` containing, at minimum:
   - a per-runtime install/discovery table naming `Claude Code` (`.claude/skills`), `Codex` (`.agents/skills`),
     and `opencode` (reads both);
   - a capability matrix row-per-mechanism (Workflow scripts, subagent spawn, AskUserQuestion, Tasks,
     `.claude/agents`, StructuredOutput schema, `/run`+`/verify`) mapping each to its manual-mode realization,
     including **AskUserQuestion → STOP:QUESTION**;
   - the fresh-reviewer-isolation **ladder** (tier-1 subagent / tier-2 fresh-cleared context / tier-3 disclosed
     degradation with the positive-paired "request a fresh review session" instruction);
   - the **D8 termination restatement** (manual mode is L3 → keeps the L3 clean-first-round relaxation;
     pointer to `references/loop-3-development.md:63`; only L1/L2 strict);
   - the distinctive token `cross_runtime` (appears here and in SKILL.md — Phase 2 gates the pair).
2. Edit `three-loop-workflow/references/loop-3-workflow.md`: ≤ a few lines naming Workflow mode the Claude-Code
   **acceleration layer** and pointing non-Claude runtimes to `references/platforms.md`. Existing vocabulary
   only; do not alter any invocation rule.
3. Edit `README.md`: add a "Cross-platform install (Claude Code / Codex / opencode)" subsection under
   "Installing the skill"; change the top-line "a Claude skill" framing to "a portable Agent Skill". (The
   v1.13.0 "What's new" row lands in Phase 2 with the version bump, so the changelog never claims a version the
   frontmatter has not yet reached.)
4. Edit `README-cn.md`: the same cross-platform install subsection + framing fix, in Chinese (the sanctioned
   exception).

**Per-task acceptance commands (run from repo root):**
- `test -f three-loop-workflow/references/platforms.md && echo OK`
- `grep -q "Claude Code" three-loop-workflow/references/platforms.md && grep -q "Codex" three-loop-workflow/references/platforms.md && grep -q "opencode" three-loop-workflow/references/platforms.md && echo OK`
- `grep -q "\.claude/skills" three-loop-workflow/references/platforms.md && grep -q "\.agents/skills" three-loop-workflow/references/platforms.md && echo OK`
- `grep -q "STOP:QUESTION" three-loop-workflow/references/platforms.md && grep -q "cross_runtime" three-loop-workflow/references/platforms.md && echo OK`
- `grep -q "loop-3-development.md:63" three-loop-workflow/references/platforms.md && echo OK`  (D8 pointer present)
- `grep -q "request a fresh review session" three-loop-workflow/references/platforms.md && echo OK`  (design AC3 — the fresh-reviewer-isolation ladder's tier-3 disclosure phrase is present; the D6 load-bearing invariant gets a mechanical check at the Phase that produces it)
- `grep -q "platforms.md" three-loop-workflow/references/loop-3-workflow.md && echo OK`
- `grep -qi "Codex" README.md && grep -qi "opencode" README.md && grep -qi "Codex" README-cn.md && grep -qi "opencode" README-cn.md && echo OK`  (design AC7)
- `w=$(wc -w < three-loop-workflow/references/platforms.md); [ "$w" -le 3000 ] && echo "OK ($w)"`  (per-file references ceiling)
- `bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"`  → prints `three-loop-consistency: OK` and `exit=0` (existing gate still green; the new token is not yet required)

**Exit condition:** all Phase-1 acceptance commands pass; `<TEST-CMD>` green.

### Phase 2 — SKILL.md surface + gate wiring + isolation fixture

**Entry condition:** Phase 1 committed (`platforms.md` exists and contains the `cross_runtime` token).

**Design references:** design §2 D-1/D-3/D-5/D-6, §4 D1/D2/D4/D6/D7, §7 AC1/AC2/AC4/AC6/AC8.

**Task list (TDD order):**
1. Add the isolation behavioral fixture `tests/scenarios/no-subagent-review-stays-fresh.md`, shaped like the
   existing fixtures (a pressure scenario + a concrete `expected`): the disciplined agent, on a runtime with no
   skill-callable subagent, must obtain a fresh/cleared reviewer context or disclose "isolation is not
   runtime-enforced — request a fresh review session", and must **not** emit a self-review verdict. (This file
   is the fixture the gate will require and the behavioral gate will run.)
2. Edit `three-loop-workflow/references/check-consistency.sh`:
   - add `require "cross_runtime" "$SKILL/SKILL.md" "$SKILL/references/platforms.md"` with an inline comment
     (following the `evidence_rule`/`spike_answer` precedent);
   - register `no-subagent-review-stays-fresh` in the `tests/scenarios/` required-fixture set (inside the
     existing `if [ -d tests/scenarios ]` guard), with its own DRIFT message.
3. Edit `three-loop-workflow/SKILL.md` **frontmatter**: promote `license: MIT` to top-level (remove it from
   `metadata`); add `compatibility:` (1–500 chars) declaring Claude-Code-optimized + Codex/opencode manual
   mode, honest about the isolation caveat, pointing to `references/platforms.md`; set `metadata.version` to
   `"1.13.0"`. **Write the `compatibility` value as a single-line plain YAML scalar** — no leading YAML
   indicator char (`{ [ # & * ! | > @ " '`) and no bare `": "` (colon-space) inside it — so the real YAML
   parsers on Codex/opencode (the readers this change serves) accept it; the stdlib acceptance check validates
   fields, not YAML well-formedness, so this is an authoring constraint, not a gated one.
4. Edit `three-loop-workflow/SKILL.md` **body**: add one routing-table row → `references/platforms.md`
   (carrying the `cross_runtime` token); reword the `SKILL.md:179` "manual/fallback mode" routing label to
   runtime-neutral phrasing; add the minimal reframe (manual mode = portable baseline; Workflow = Claude-Code
   acceleration layer) in existing vocabulary. Keep `wc -w` **≤ 2880** by tightening wording only within the
   reframed routing/orchestration region.
5. Edit `README.md` and `README-cn.md`: add the v1.13.0 row to the "What's new" changelog table (paired with
   this Phase's version bump so the changelog and frontmatter agree).

**Per-task acceptance commands (run from repo root):**
- `test -f tests/scenarios/no-subagent-review-stays-fresh.md && echo OK`  (fixture exists)
- `grep -q "no-subagent-review-stays-fresh" three-loop-workflow/references/check-consistency.sh && echo OK`  (design AC6 — the fixture is *registered* in the gate's required-fixture set, not merely present on disk)
- Frontmatter validity + field checks (design AC2 + AC8), via a **stdlib-only** heredoc python3 check (PyYAML
  is not installed in this MD/JS/shell repo — verified `import yaml` → ModuleNotFoundError; the frontmatter is
  a controlled single-line-value format, so a line parser suffices and adds no dependency). The frontmatter
  MUST keep `description` and `compatibility` on a single line each for this parser:
  ```
  python3 - <<'PY'
  import re
  t=open('three-loop-workflow/SKILL.md').read()
  m=re.match(r'^---\n(.*?)\n---\n', t, re.S); assert m, 'no frontmatter'
  top={}; meta={}; cur=None
  for ln in m.group(1).split('\n'):
      if re.match(r'^[A-Za-z0-9_]+:', ln):                       # top-level key
          k,v=ln.split(':',1); top[k]=v.strip(); cur=k
      elif cur=='metadata' and re.match(r'^  [A-Za-z0-9_]+:', ln):  # metadata child
          k,v=ln.strip().split(':',1); meta[k]=v.strip()
  assert top.get('license')=='MIT', ('license', top.get('license'))
  c=top.get('compatibility',''); assert 1<=len(c)<=500, ('compatibility len', len(c))
  assert meta.get('version','').strip('"')=='1.13.0', ('version', meta.get('version'))
  assert 'license' not in meta, 'metadata still has a license key (must be a move, not a copy)'
  assert len(top.get('description',''))<=1024, ('description len', len(top.get('description','')))
  print('OK frontmatter')
  PY
  ```
- `w=$(wc -w < three-loop-workflow/SKILL.md); [ "$w" -le 2880 ] && echo "OK ($w)"`  (design AC4)
- `grep -q "platforms.md" three-loop-workflow/SKILL.md && grep -q "cross_runtime" three-loop-workflow/SKILL.md && echo OK`
- `grep -q "1.13.0" README.md && grep -q "1.13.0" README-cn.md && echo OK`  (changelog row paired with the bump)
- `bash three-loop-workflow/references/check-consistency.sh; echo "exit=$?"`  → `three-loop-consistency: OK`, `exit=0` (design AC1)
- **Negative gate test** (proves the new token gates — design R4/D7): temporarily blank the `cross_runtime`
  token in `platforms.md`, confirm the gate fails, then restore:
  ```
  cp three-loop-workflow/references/platforms.md /tmp/platforms.bak
  sed -i.orig 's/cross_runtime/CROSS__PERTURBED/g' three-loop-workflow/references/platforms.md
  bash three-loop-workflow/references/check-consistency.sh >/dev/null 2>&1; echo "perturbed_exit=$? (expect non-zero)"
  cp /tmp/platforms.bak three-loop-workflow/references/platforms.md
  bash three-loop-workflow/references/check-consistency.sh >/dev/null 2>&1; echo "restored_exit=$? (expect 0)"
  rm -f three-loop-workflow/references/platforms.md.orig /tmp/platforms.bak   # clean up the probe's stray files
  ```
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js && bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/review-panel.js && echo OK`  (design AC5 — regression: JS unchanged)

**Skill-self behavioral GREEN check (main-agent discharge, after accept passes):** because Phase 2 reframes
discipline-adjacent SKILL.md prose and adds the isolation fixture, the main agent runs the **full**
`tests/scenarios/*.md` suite (existing + the new fixture) via fresh subagents and confirms each `expected`
holds (design AC6 + AC9; CLAUDE.md behavioral gate). Record `Behavioral-check: complied` as a Phase-2 commit
trailer.

**Exit condition:** all Phase-2 acceptance commands pass; the negative gate test shows non-zero-then-zero;
`<TEST-CMD>` green; behavioral suite green.

## Engineering Constraints Index

- Project engineering norms: CLAUDE.md _engineering-norms_ role (Markdown skill; anti-bloat binding on the
  always-loaded SKILL.md; do not add new CLAUDE.md roles).
- Language policy: CLAUDE.md _language-policy_ role — English for all skill files; `README-cn.md` is the
  Chinese exception; terminology consistent with `docs/design/`, `docs/analysis-*`, SKILL.md.
- Four-corner subagent template: `references/loop-3-development.md`.
- Commit conventions: SKILL.md "Commit conventions" (`feat(phaseN):` / `fix(phaseN-roundR):`); no AI mention in
  the narrative; `Claude-Session:` trailer per repo practice; `<TEST-CMD>` result as a trailer.
- Anti-bloat: SKILL.md `wc -w` ≤ 2888 (gate); each `references/*.md` ≤ 3000 (gate). This change targets SKILL.md
  net-neutral vs the 2880 baseline (AC4).

## Data and Fixture Dependencies

- **New fixture:** `tests/scenarios/no-subagent-review-stays-fresh.md` (created in Phase 2; registered in
  `check-consistency.sh`). Reuses the existing `tests/scenarios/*.md` format (scenario + `expected`); no new
  test infrastructure.
- No other test resources needed. There is no unit-test suite; acceptance is the consistency gate + grep/YAML
  assertions above + the behavioral suite.

## Regression Protection

- **`check-consistency.sh` must stay green** at every Phase end — this protects all existing commitment-clause
  tokens, byte-identity pairs (panel-angles, calibration/grounding), the SKILL.md word ceiling, and the
  required-fixture set. Any dropped existing token red-fails it.
- **`check-workflow-syntax.sh`** on both JS scripts (AC5) — regression guard that the untouched `l3-phase.js` /
  `review-panel.js` still parse (they are not edited this task).
- **Full `tests/scenarios/*.md` behavioral suite** (the existing fixtures + the new one; the suite is globbed,
  not counted) must each yield its `expected` verdict at the Phase-2 behavioral check and again at F — protects
  every discipline rule the reframe sits next to (termination, tier, escalation).
- **SKILL.md `wc -w` ≤ 2880** (AC4) — protects the always-loaded surface from bloat.
