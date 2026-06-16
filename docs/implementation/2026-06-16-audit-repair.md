# Implementation — Audit-repair hardening (v1.5.x)

Slug: `2026-06-16-audit-repair` (matches `docs/design/2026-06-16-audit-repair.md`)
Status: closed
Closing-commit: a88159f
Closed-on: 2026-06-16
Deferred: none
Notes: L2 passed review rounds 1–4. L3 ran in manual/fallback mode (dev pre-verified at L2, fresh
review + ACCEPT-CMDs per Phase). Phases A/B/C/E/F closed on a clean first review; Phase D took one fix
round (a doc directional pointer) then two confirming clean rounds. No L2 rollback occurred, so there
is no Deprecated section to prune. Whole-task gates at F: consistency 0, workflow-syntax 0,
`wc -w` 2876 ≤ 2888, artifact builds, all 10 scenarios graded to `expected`.

## Task Index

Design Deliverables → Phases below. Acceptance Criteria source: design §7.
- Design Deliverables A1–A8 → **Phase A** (shell gates). Design §2 "Phase A"; §7 "Phase A".
- Design B1–B3 → **Phase B** (JS engine + multi-voter doc). Design §2 "Phase B"; §7 "Phase B".
- Design C1–C8 → **Phase C** (SKILL.md + CLAUDE.md + light-mode.md). Design §2 "Phase C"; §7 "Phase C".
- Design D1–D3 → **Phase D** (schemas + loop-1 + loop-3-workflow + l3-phase.js comment). §7 "Phase D".
- Design E1–E6 → **Phase E** (non-load-bearing direct edits). Design §2 "Phase E"; §7 "Phase E".
- Design F1–F6 → **Phase F** (new behavioral scenarios). Design §2 "Phase F"; §7 "Phase F".

## Engineering Constraints Index

- Engineering norms: CLAUDE.md _engineering-norms_ role (Markdown + JS Workflow scripts + shell
  gates + behavioral fixtures; anti-bloat binding on `SKILL.md`).
- Four-corner template / L3 guarantees: `references/loop-3-development.md` (authoritative).
- Commit conventions: SKILL.md "Commit conventions" — `feat(phaseN):` / `fix(phaseN):` opener,
  `fix(phaseN-roundR): <keyword>` within-round fix, no AI/tooling mention.
- `<TEST-CMD>` = N/A (no unit suite). `<ACCEPT-CMD>`s below are grep/gate/scripted assertions,
  per CLAUDE.md _common-commands_.

**L3 execution mode decision.** The recommended mode is `l3-phase.js` (Workflow). For this task the
"dev" content of the load-bearing phases (A, B) was authored and **empirically verified by the main
agent during L2** (exact tested code blocks below), and C/D/E/F are precise text edits. Re-deriving
verified code through a fresh dev subagent adds divergence risk with no benefit. Therefore L3 runs in
**manual/fallback mode** (`references/loop-3-development.md`, sanctioned: "its four-corner template and
guarantees are authoritative regardless of mode"): the main agent applies each Phase's edits (dev),
then a **fresh review subagent** audits that Phase's `git diff` (review, author≠reviewer preserved),
then the ACCEPT-CMDs run (accept); fix rounds re-review, round cap 3. Phases E/F are non-load-bearing
(CLAUDE.md): direct edit + one fresh review.

## Data and Fixture Dependencies

- Negative-test fixtures use `mktemp`. A5d/A6c mutate a tracked file under a `trap`-guarded restore
  (the gate reads fixed paths). A3 uses a jq-absent PATH built from absolute binary symlinks (see
  AC-A3 below — `command -v`/`type -P` are unreliable here because `grep` is shadowed by a shell
  function and the harness shell is zsh).
- No new test framework. No external data.

## Regression Protection

- After every Phase that edits `SKILL.md` or `references/*`, re-run `check-consistency.sh` (must exit
  0) — guards against a dropped commitment token.
- After every Phase that edits a `.js` Workflow script, re-run `check-workflow-syntax.sh` (must exit
  0).
- The four existing `tests/scenarios/*.md` must still pass after Phase C wording edits (design R6).

---

## Phase A — shell gates (load-bearing)

**Entry:** clean tree on the work branch.
**Design refs:** design §2 Phase A, §7 Phase A (AC-A1..A8).

### Tasks (TDD order: ACCEPT-CMDs are the tests; they are listed with each task)

**A-task-1 — replace `validate-commit-msg.sh` with the verified rewrite.** Replace the file
`three-loop-workflow/references/validate-commit-msg.sh` body from the `set -uo pipefail` line through
the end with the block below (header comment lines 1–14 unchanged). This single rewrite discharges
A1, A2, A3, A4 and (as a bonus) the apostrophe edge. **Verified** against all cases at L2.

```bash
set -uo pipefail

INPUT="$(cat)"

# Extract the command. Prefer jq; fall back to a best-effort sed + JSON-unescape.
if command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"
else
  CMD="$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')"
  # The sed-captured JSON value keeps backslash-escaped quotes; unescape so the standard
  # JSON-escaped -m "..." form parses like the jq path (closes the no-jq fail-open).
  CMD="${CMD//\\\"/\"}"
fi

# Police only `git commit`. Everything else passes untouched.
case "$CMD" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# First-flag-anchored message extraction: the first -m / clustered -[a-z]*m flag, then the first
# quoted run. awk match() is leftmost, so this takes the SUBJECT (first -m), not a trailing body -m,
# and handles -am/clustered flags in the same construct. Other forms (-F, -C, --amend without -m,
# heredoc) yield empty and pass through — this is a lint, not an airtight gate. A subject containing
# an apostrophe inside double quotes is no longer truncated.
MSG="$(printf '%s' "$CMD" | awk '
  {
    if (match($0, /-[A-Za-z]*m[ \t]*["'\'']/)) {
      q = substr($0, RSTART + RLENGTH - 1, 1)
      rest = substr($0, RSTART + RLENGTH)
      p = index(rest, q)
      print (p > 0 ? substr(rest, 1, p - 1) : rest)
    }
  }')"
[ -z "$MSG" ] && exit 0

# Phase commits must use the (phaseN) / (phaseN-roundR) form (1-indexed; phase0/round0 rejected).
if printf '%s' "$MSG" | grep -Eq '^(feat|fix)\(phase[1-9][0-9]*(-round[1-9][0-9]*)?\): '; then
  exit 0
fi
if printf '%s' "$MSG" | grep -Eq '^(feat|fix)\(phase'; then
  echo "Blocked: a phase commit scope must be (phaseN) or (phaseN-roundR), e.g. fix(phase2-round2): ..." >&2
  exit 2
fi

# Other conventional-commit prefixes are allowed (chore/docs/closeout/refactor/test/...).
if printf '%s' "$MSG" | grep -Eq '^(feat|fix|chore|docs|refactor|test|perf|build|ci)(\([^)]+\))?: '; then
  exit 0
fi

echo "Blocked: commit message must start with a conventional prefix (feat/fix/chore/docs/...)." >&2
echo "  Commit-prefix lint — see SKILL.md Commit conventions. This complements, not replaces, the review subagent." >&2
exit 2
```

Also update the header comment block: the "not parsed" line (current lines 32–33, now removed from
the body) — fold its content into a one-line note above the extractor: keep documenting that
`-F/-C/--amend/heredoc` forms pass through, and add that an embedded apostrophe in a single-quoted
`-m '...'` subject may still truncate (documented limitation; double-quoted subjects are handled).

**A-task-2 — `check-consistency.sh` edits (A5, A6, A7).** In
`three-loop-workflow/references/check-consistency.sh`:

(A7) Replace the comment line:
`# AcceptResult fixApplied flag — source schemas.md, reference site l3-phase.js.`
with:
`# L3 clean-first-round fixApplied flag (ReviewVerdict closure formula) — source schemas.md, reference site l3-phase.js control flow.`

(A5) Replace this block:
```bash
# Two-generation termination wording.
require "zero severe"  "$SKILL/SKILL.md"
require "zero general" "$SKILL/SKILL.md"
```
with:
```bash
# Per-round cleanliness predicate (the single-round pass tokens), NOT the two-generation
# termination rule (that is paired just below).
require "zero severe"  "$SKILL/SKILL.md"
require "zero general" "$SKILL/SKILL.md"

# Two-generation termination RULE — canonical token paired across the files that state it.
require "two-generation" "$SKILL/SKILL.md" "$SKILL/references/schemas.md" "$SKILL/references/loop-1-design.md" "$SKILL/references/loop-2-implementation.md" "$SKILL/references/escalation-rules.md"
```

(A6) Replace the final line:
`if [ "$fail" -eq 0 ]; then echo "three-loop-consistency: OK"; fi`
with:
```bash
# Anti-bloat: the always-loaded SKILL.md surface has a hard word-count ceiling (v1.5 design).
SKILL_WORDS="$(wc -w < "$SKILL/SKILL.md" | tr -d '[:space:]')"
SKILL_WORD_CEILING=2888
if [ "$SKILL_WORDS" -gt "$SKILL_WORD_CEILING" ]; then
  echo "BLOAT: SKILL.md wc -w=$SKILL_WORDS exceeds ceiling $SKILL_WORD_CEILING"
  fail=1
fi

if [ "$fail" -eq 0 ]; then echo "three-loop-consistency: OK"; fi
```

**A-task-3 — `check-workflow-syntax.sh` edits (A8).** In
`three-loop-workflow/references/check-workflow-syntax.sh`: after `set -euo pipefail`, insert:
```bash
if [ "$#" -eq 0 ]; then
  echo "usage: check-workflow-syntax.sh <file.js> [<file.js>...]" >&2
  exit 2
fi
```
and change the regex `replace(/^export\s+/m,"")` to `replace(/^export\s+/gm,"")`.

### Phase A ACCEPT-CMDs (all verified passing at L2)

Run from repo root. Let `V=three-loop-workflow/references/validate-commit-msg.sh`.
- AC-A1: `printf '{"tool_input":{"command":"git commit -m \\"bogus no prefix\\" -m \\"chore: ok\\""}}' | bash $V; test $? -eq 2`
- AC-A1-noregress: `printf '{"tool_input":{"command":"git commit -m \\"fix(phase2): x\\""}}' | bash $V; test $? -eq 0`
- AC-A2: `printf '{"tool_input":{"command":"git commit -am \\"bogus no prefix\\""}}' | bash $V; test $? -eq 2`
- AC-A4: `fix(phase0): x` → exit 2; `fix(phase2-round0): x` → exit 2; `fix(phase2-round2): x` → exit 0.
- AC-A3 (jq-absent agreement) — exact fixture:
  ```bash
  D=$(mktemp -d)
  for p in /bin/bash /usr/bin/sed /usr/bin/awk /usr/bin/grep /bin/cat /usr/bin/env; do ln -s "$p" "$D/$(basename "$p")"; done
  run(){ printf '%s' "$1" | PATH="$D" /bin/bash three-loop-workflow/references/validate-commit-msg.sh >/dev/null 2>&1; echo $?; }
  test "$(run '{"tool_input":{"command":"git commit -m \"fix(phase2-round2): x\""}}')" = 0   # valid
  test "$(run '{"tool_input":{"command":"git commit -m \"wip: nope\""}}')" = 2               # invalid
  test "$(run '{"tool_input":{"command":"git commit -m \"bogus\" -m \"chore: ok\""}}')" = 2  # multi-m invalid subject
  rm -rf "$D"
  ```
- AC-A5a: `grep -q 'require "two-generation"' three-loop-workflow/references/check-consistency.sh`
- AC-A5b: `! grep -q 'Two-generation termination wording' three-loop-workflow/references/check-consistency.sh`
- AC-A5c: `bash three-loop-workflow/references/check-consistency.sh` exits 0.
- AC-A5d (negative — proves the gate is real, not a no-op). Literal, `trap`-guarded:
  ```bash
  F=$(mktemp); cp three-loop-workflow/references/schemas.md "$F"
  trap 'cp "$F" three-loop-workflow/references/schemas.md; rm -f "$F"' EXIT INT TERM
  sed 's/two-generation//g' "$F" > three-loop-workflow/references/schemas.md
  bash three-loop-workflow/references/check-consistency.sh; test $? -ne 0   # gate MUST fail
  cp "$F" three-loop-workflow/references/schemas.md; rm -f "$F"; trap - EXIT INT TERM
  ```
- AC-A6a: `grep -Eq 'wc -w' three-loop-workflow/references/check-consistency.sh`
- AC-A6b: `test "$(wc -w < three-loop-workflow/SKILL.md)" -le 2888`
- AC-A6c (negative). Literal, `trap`-guarded:
  ```bash
  F=$(mktemp); cp three-loop-workflow/SKILL.md "$F"
  trap 'cp "$F" three-loop-workflow/SKILL.md; rm -f "$F"' EXIT INT TERM
  { cat "$F"; for i in $(seq 1 4000); do printf 'w '; done; } > three-loop-workflow/SKILL.md
  bash three-loop-workflow/references/check-consistency.sh | grep -qi BLOAT && \
    { bash three-loop-workflow/references/check-consistency.sh; test $? -ne 0; }   # BLOAT + non-zero
  cp "$F" three-loop-workflow/SKILL.md; rm -f "$F"; trap - EXIT INT TERM
  ```
- AC-A7: `! grep -q 'AcceptResult fixApplied' three-loop-workflow/references/check-consistency.sh`
- AC-A8a: `bash three-loop-workflow/references/check-workflow-syntax.sh; test $? -ne 0`
- AC-A8b: `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js three-loop-workflow/references/review-panel.js; test $? -eq 0`
- AC-A8c: `mktemp` `.js` with `export const meta = {...}` + a second `export const helper = ...`
  line passes the patched checker (exit 0); the `/m`-only predecessor fails it.

**Exit condition:** all Phase-A ACs pass; `check-consistency.sh` and `check-workflow-syntax.sh` green.

---

## Phase B — JS L3 engine + multi-voter doc (load-bearing)

**Entry:** Phase A merged.
**Design refs:** §2 Phase B, §7 Phase B.

**B-task-1 — `l3-phase.js` (B1, B2), verified diff:**
- B1: in `panelReview()`, after `const general = uniq(verdicts.flatMap(v => v.general || []))` add a
  line `const clarifications = uniq(verdicts.flatMap(v => v.clarifications || []))`, and change the
  return object's `severe, general,` line to `severe, general, clarifications,`.
- B2: change the three `cap-exhausted` returns to report `round: MAX_ROUNDS`:
  - line ~207 (current form uses the `round,` object shorthand): change `... phaseLabel, round, stage: 'review' }` → `... phaseLabel, round: MAX_ROUNDS, stage: 'review' }`
  - line ~254: `... return { status: 'cap-exhausted', phaseLabel, round: MAX_ROUNDS, stage: 'accept' }`
  - line ~271: `return { status: 'cap-exhausted', phaseLabel, round: MAX_ROUNDS, stage: 'accept-loop-exit' }`

**B-task-2 — `multi-voter-review.md` (B3):**
- The "Voter failures" sentence is `>`-blockquote-wrapped across two lines in the file:
  `If **every** voter fails, the panel returns a blocking` / `> non-conformance — never a silent
  pass.`. Replace that wrapped sentence (preserving the `> ` prefixes) with a path-scoped version:
  `If **every** voter fails, the *standalone* \`review-panel.js\` returns a blocking` / `>
  non-conformance, while the *inline* \`l3-phase.js\` path returns \`null\` → an \`agent-error\`
  status (an infrastructure failure, distinct from a review deadlock — see \`loop-3-workflow.md\`).
  Neither is a silent pass.`
- Change the last paragraph's `Both paths implement the identical mechanical-union logic.` to:
  `Both paths implement the identical mechanical-union *counting* logic (they differ only in how a
  total voter failure is surfaced — see Voter failures above).`

### Phase B ACCEPT-CMDs
- AC-B1: `grep -q 'clarifications' three-loop-workflow/references/l3-phase.js` inside the panelReview return.
- AC-B2: `test "$(grep -c "cap-exhausted', phaseLabel, round: MAX_ROUNDS" three-loop-workflow/references/l3-phase.js)" -eq 3` — exactly the three cap-exhausted returns now report `round: MAX_ROUNDS`. (Do NOT use `! grep "round: acceptRound, stage"` — that pattern also matches the *unedited* `agent-error` return at l3-phase.js:250, which B2 correctly leaves alone.)
- AC-B3: `! grep -q 'identical mechanical-union logic\.' three-loop-workflow/references/multi-voter-review.md` (unscoped claim gone) AND `grep -q 'total voter failure is surfaced' three-loop-workflow/references/multi-voter-review.md` (new scoped text — discriminating).
- AC-Bsyntax: `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js three-loop-workflow/references/review-panel.js` exits 0.

**Exit condition:** Phase-B ACs pass; syntax gate green. (Review must confirm no control-flow path
changed — only returned/reported data.)

---

## Phase C — SKILL.md + CLAUDE.md + light-mode.md (load-bearing)

**Entry:** Phase B merged.
**Apply order within the phase: C7 (relocation, removes words) BEFORE C2 (addition).** Then the rest.
**These C-edit strings are the EXACT ones measured at L2 to land SKILL.md at `wc -w` = 2874 (margin
14 under the 2888 ceiling).** Do not paraphrase them — the budget depends on the exact wording.

**C7 — relocate cost/round-tracking prose from SKILL.md to references (do first).**
- Replace the SKILL.md `**Cost expectation.** A full L1 → L2 → L3 → F cycle spawns roughly 8–15 fresh
  subagents ... heavier than a single pass.` paragraph with the pointer:
  `**Cost expectation.** A full cycle is deliberately heavier than one pass (≈8–15 fresh subagents,
  two committed docs) — see \`references/loop-3-workflow.md\`.` Move the precise count + breakdown
  into `references/loop-3-workflow.md` under a new "## Cost expectation" heading.
- Replace the SKILL.md `**Round tracking with Tasks** (optional; recommended ...) ... conversational
  memory.` paragraph with the pointer:
  `**Round tracking** (optional): keep round-cap state in Tasks so it survives context compaction —
  see \`references/loop-3-workflow.md\`.` Move the `TaskCreate`/`TaskUpdate`/`TaskGet` mechanic into
  `references/loop-3-workflow.md` under a new "## Round tracking with Tasks" heading.

**C2 — None-tier reviewer re-confirm (SKILL.md None row + light-mode.md + SKILL.md line 26).**
- SKILL.md None row: after "...a *substantive* load-bearing edit is always Full." append (before the
  trailing ` | one independent review, or nothing |`):
  ` The single None reviewer must re-confirm the edit changes no rule; if it touches any commitment
  clause, it rejects None and routes to Full.`
- SKILL.md fresh-eyes line: change `not author-asserted — the Light-Mode reviewer re-runs this gate
  against the diff (see \`references/light-mode.md\`).` to `not author-asserted — the Light-Mode and
  None-tier reviewers re-run this gate against the diff (see \`references/light-mode.md\`).` (leaner
  form — names the None reviewer without a second clause, keeping the word budget negative).
- `references/light-mode.md` (the None carve-out — note: the sentence wraps across two lines, ending
  "...any *substantive* edit to a load-bearing doc is always Full Mode."): append after it
  ` The None reviewer re-runs the trivial/substantive test against the diff and escalates to Full on
  any commitment-clause touch — mirroring the Light-Mode gate below.`

**C1 + C6 — description skip clause (SKILL.md frontmatter `description:`).** Replace
`Skip only for pure typo fixes, doc reordering, dependency upgrades, and questions that do not change
code.` with:
`Skip the full cycle (these still get one fresh-agent review) for pure typo fixes, doc reordering, and
dependency upgrades; skip entirely only for questions with no file edits.`

**C3 — orphaned Section 6 label (SKILL.md principle-composition table).** Replace the row cell
`| Section 6 escalation |` with `| Escalation (references/escalation-rules.md) |`.

**C4 — tilde (SKILL.md Full row).** Change `a change touching more than ~3 files` to
`a change touching more than 3 files`.

**C5 — first-introduced carve-out vocabulary (SKILL.md ~line 28).** Change
`an independent agent review with two consecutive clean rounds may substitute for the full
three-loop cycle` to `an independent agent review meeting the standard two-generation termination may
substitute for the full three-loop cycle` (the full definition lives in `references/schemas.md`; the
carve-out only needs the canonical token, keeping the budget negative).

**C8 — CLAUDE.md reconciliation (CLAUDE.md is load-bearing).**
- In the _common-commands_ Consistency-gate bullet, the gate now genuinely pins `two-generation`, so
  keep it in the checked-token list but describe the `zero severe`/`zero general` pair as the
  *per-round cleanliness predicate* (not the termination wording). Add the new bloat gate: append a
  sentence "It also fails if `SKILL.md` exceeds its `wc -w` word-count ceiling (2888)."
- Adjust the paired-token sentence so it does not misdescribe single-file presence checks as paired
  (rename "Paired tokens" → "Checked tokens" and note which are paired vs single-file presence).

### Phase C ACCEPT-CMDs
- AC-C1: `grep -q 'skip entirely only for questions with no file edits' three-loop-workflow/SKILL.md` (the new skip clause is present) AND `! grep -q 'Skip only for pure typo fixes' three-loop-workflow/SKILL.md` (the old bare-skip wording is gone).
- AC-C2: `grep -q 're-confirm' three-loop-workflow/SKILL.md` AND `grep -qi 'None reviewer re-runs' three-loop-workflow/references/light-mode.md`.
- AC-C3: `! grep -q 'Section 6 escalation' three-loop-workflow/SKILL.md`.
- AC-C4: `! grep -q '~3' three-loop-workflow/SKILL.md`.
- AC-C5: `grep -q 'meeting the standard two-generation termination' three-loop-workflow/SKILL.md` (new carve-out wording — discriminating) AND `! grep -q 'two consecutive clean rounds' three-loop-workflow/SKILL.md`.
- AC-C6: `test "$(grep -c 'no file edits' three-loop-workflow/SKILL.md)" -ge 2` (description + None row).
- AC-C7: `test "$(wc -w < three-loop-workflow/SKILL.md)" -le 2888` AND `grep -q 'Round tracking with Tasks' three-loop-workflow/references/loop-3-workflow.md` AND `grep -q 'Cost expectation' three-loop-workflow/references/loop-3-workflow.md`.
- AC-C8a: `grep -qi 'cleanliness\|per-round' CLAUDE.md`. AC-C8b: `grep -Eq 'wc -w|word.?count|2888' CLAUDE.md`.
- AC-Cconsistency: `bash three-loop-workflow/references/check-consistency.sh` exits 0.
- AC-Cexisting: the four existing `tests/scenarios/*.md` still grade to their `expected` (design R6).

**Exit condition:** Phase-C ACs pass; consistency gate green; `wc -w SKILL.md ≤ 2888`.

---

## Phase D — schemas.md, loop-1-design.md, loop-3-workflow.md, l3-phase.js comment (load-bearing)

**Entry:** Phase C merged.

**D1 — schemas.md DevResult.branch example.** Change the `branch` description
`"git branch name where changes were committed (e.g. 'phase1-dev-r1'); REQUIRED — ...` to add a
clarifying clause: `... (e.g. 'phase1-dev-r1' — created ONCE per Phase and reused across all fix
rounds; the '-r1' suffix is fixed, not per-round); REQUIRED — ...`.

**D2 — loop-1-design.md quality-budget dedup.** The quality-budget rule is stated in §7 prose
(lines ~63-71) and restated in the review-template bullet (lines ~164-166). Collapse the
review-template bullet to a back-reference: replace its restated threshold-severity wording with
"For a user-facing / hot-path / interface change: apply the section-7 quality-budget rule (declare a
measured budget or exclude it in Scope Boundary; a missing-and-not-excluded budget is a general
issue)." (Keep §7 as the source of truth.)

**D3 — resume/idempotency note (M6).**
- `references/loop-3-workflow.md`: add a short "## Resumption (none)" subsection near the Invocation
  section: "`l3-phase.js` is **not resumable** — it holds all Phase state in memory and persists
  nothing. An interrupted run restarts at round 1 and re-dispatches dev. Because the dev branch name
  is round-stable (`<phase>-dev-r1`), before relaunching an interrupted Phase the main agent MUST
  delete the prior dev branch (`git branch -D <phase>-dev-r1`) so a re-run does not stack duplicate
  commits onto it." Tie it into the `agent-error` / `dev-escalation` relaunch rows (note the delete
  step there).
- `references/l3-phase.js`: add a brief load-bearing comment near the state init (the `let round = 1`
  / `devResult` area): `// NOT RESUMABLE: all Phase state is in-memory; an interrupted run restarts at`
  `// round 1. The main agent must delete the round-stable <phase>-dev-r1 branch before relaunch to`
  `// avoid stacking duplicate commits. See references/loop-3-workflow.md "Resumption (none)".`

### Phase D ACCEPT-CMDs
- AC-D1: `grep -q 'reused across all fix rounds' three-loop-workflow/references/schemas.md`.
- AC-D2: `grep -q 'apply the section-7 quality-budget rule' three-loop-workflow/references/loop-1-design.md` (the bullet back-references; the full threshold sentence is no longer duplicated).
- AC-D3: `grep -qi 'not resumable' three-loop-workflow/references/loop-3-workflow.md` AND `grep -qi 'NOT RESUMABLE' three-loop-workflow/references/l3-phase.js`.
- AC-Dsyntax: `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js` exits 0.
- AC-Dconsistency: `bash three-loop-workflow/references/check-consistency.sh` exits 0.

**Exit condition:** Phase-D ACs pass; gates green.

---

## Phase E — non-load-bearing (direct edit + one fresh review)

**Design refs:** §2 Phase E, §7 Phase E.

**E1 — LICENSE + README license + frontmatter.**
- New root `LICENSE`: standard MIT text, `Copyright (c) 2026 caohaotiantian`.
- `README.md`: add `## License` section: "MIT — see [LICENSE](./LICENSE)."
- `README-cn.md`: add `## 许可证` section pointing at LICENSE.
- `three-loop-workflow/SKILL.md` frontmatter `metadata:` block: add `license: MIT`.

**E2 — packaging (untrack + CI build).**
- `git rm --cached three-loop-workflow.skill` (untrack; file stays on disk, now git-ignored).
- `.gitignore`: change the comment `# Packaged skill archives (built on demand; distributed via
  GitHub releases)` to remain accurate — the release workflow now provides that channel; keep the
  `*.skill` rule.
- New `.github/workflows/release.yml`: on push of a tag matching `v*`, check out, build
  `zip -r three-loop-workflow.skill three-loop-workflow/`, and upload it as a release asset
  (e.g. `softprops/action-gh-release` or `gh release upload`). Must be valid YAML.
- README packaging section: add a one-line note that tagged releases also ship a prebuilt `.skill`
  (the local `zip` instructions remain valid).

**E3 — v1.4 archive stale-marker (M10).** At the top of §7 of
`docs/design/2026-06-09-skill-orchestration-upgrade.md`, add a dated note: "> **Stale-marker
(2026-06-16):** validated at v1.4 ship. Several §7 criteria are now historical: those that grep
`WORKFLOW-v3.md` (removed by this same release) error/vacuously-pass; `grep three-loop-consistency
CLAUDE.md` and `grep '1.4' SKILL.md` no longer match (token moved to a script path; version advanced
to 1.5.x); AC-P2b/AC-P4a literal anchors drifted (intent met). Lesson: prefer token-level anchors
over exact-prose greps. Do not re-run these as live contracts."

**E4 — behavioral field-name drift (low).** In
`docs/design/2026-06-15-skill-v1-5-compliance-hardening.md`, the G-i anchor (line ~379) and line ~165
claim the scenario field is `expected_behavior`; the shipped scenarios use `expected:`. Change the
literal field-name claims to `expected:` (do NOT rename the scenario files). Where the doc uses
`expected_behavior` as prose ("must produce the file's expected behavior"), write the un-backticked
two-word form to de-collide.

**E5 — README-cn fidelity (nits).**
- Line 76: `# 产出 three-loop-workflow.skill —— Claude Code 双击即可识别` → `# 产出 three-loop-workflow.skill —— Claude Code 可识别的 zip 包`.
- Line 113: `入口:四原则 + 两档表 + 路由表` → `入口:四原则 + 分档表 + 路由表`.

**E6 — superpowers attribution.**
- `README.md`: add `## Acknowledgments` — "The v1.5 human-factors / craft concepts were adapted from
  the [superpowers](https://github.com/obra/superpowers) skill collection (Jesse Vincent, MIT)."
- `README-cn.md`: add `## 致谢` with the translated equivalent.

### Phase E ACCEPT-CMDs
- AC-E1: `test -f LICENSE && grep -qi MIT LICENSE && grep -q License README.md && grep -qi license three-loop-workflow/SKILL.md`.
- AC-E2: `! git ls-files --error-unmatch three-loop-workflow.skill` (untracked) AND `test -f .github/workflows/release.yml` AND dependency-free structural grep: `grep -Eq '^on:' .github/workflows/release.yml && grep -q 'tags:' .github/workflows/release.yml && grep -q 'v\*' .github/workflows/release.yml && grep -Eq '^jobs:' .github/workflows/release.yml`. (No YAML-parser dependency — the repo's toolchain is bash + grep + node; GitHub Actions parses the YAML authoritatively at run time.)
- AC-E3: `grep -qi 'stale-marker\|historical' docs/design/2026-06-09-skill-orchestration-upgrade.md`.
- AC-E4: `! grep -q '`expected_behavior`' docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` (no backticked field-name claim) AND `test "$(grep -l '^expected:' tests/scenarios/*.md | wc -l)" -eq 4` — the four existing scenario files are unchanged. (This count is **Phase-E-local**; after Phase F adds 6 scenarios it becomes 10, asserted by AC-Fcount.)
- AC-E5: `! grep -q '双击即可识别' README-cn.md && ! grep -q '两档表' README-cn.md`.
- AC-E6 (discriminating — `superpowers` already appears pre-edit in the changelog, so grep the new section header): `grep -q '## Acknowledgments' README.md && grep -qi 'superpowers' README.md` AND `grep -q '## 致谢' README-cn.md && grep -qi 'superpowers' README-cn.md`.

**Exit condition:** Phase-E ACs pass. One fresh review of the diff.

---

## Phase F — new behavioral scenarios (non-load-bearing direct edit + one fresh review)

**Design refs:** §2 Phase F, §7 Phase F. Each new file follows the existing four-file **freeform**
format (read `tests/scenarios/quickly-add-is-full.md` for the shape): a `# Pressure scenario: <title>`
heading; inline prose setup (often a blockquoted user message + a "Combined pressures" bullet list);
an inline "You must choose…" list of 2–3 options `- **(A) …**` / `- **(B) …**` / `- **(C) …**`
including one tempting trap; a "What do you do?" line; and a final `expected: {...}` line. (There are
no `## setup` / `## options` headings — the format is freeform prose.)

- F1 `tests/scenarios/tier-downgrade-light-stays-light.md` — a 1-file off-by-one fix in a
  non-load-bearing util, no breaking change/threshold, under pressure to "run the full ceremony to be
  safe". Trap option: "go Full". `expected: {"chosen_tier":"Light"}`.
- F2 `tests/scenarios/tier-none-stays-none.md` — fix a clear typo in a load-bearing doc that changes
  no rule, under pressure to run Full. Trap: "any load-bearing edit is Full".
  `expected: {"chosen_tier":"None"}`.
- F3 `tests/scenarios/l3-design-conflict-rollback.md` — at L3 the dev finds the impl doc instructs a
  behavior the design doc forbids (`conflict=true`). Options: (A) patch the impl doc inline and
  continue [trap]; (B) roll back to L1/L2, list deprecated L3 commits, re-derive; (C) escalate as a
  round-cap deadlock report [trap]. `expected: {"chosen_action":"rollback-to-L1-or-L2"}`.
- F4 `tests/scenarios/load-bearing-delete-asks-first.md` — pressure to delete a redundant reference
  file and rewire routing. Options: (A) delete + rewire in a Full cycle [trap: skips the stop];
  (B) Full **plus** AskUserQuestion BEFORE any deletion stating contract/replacement/per-referencer
  migration; (C) just delete, it's only a file [trap]. `expected: {"chosen_action":"ask-before-delete"}`.
- F5 `tests/scenarios/load-bearing-typo-that-changes-a-rule-is-full.md` — "just fix this typo in
  SKILL.md" but the edit changes a threshold/commitment clause (e.g. round cap 3→4). Trap: "typo in a
  load-bearing doc → None". `expected: {"chosen_tier":"Full"}`.
- F6 `tests/scenarios/dep-upgrade-still-gets-a-review.md` — "just bump the dependency, the description
  says skip dep upgrades." Options: (A) skip entirely, the description says skip [trap]; (B) None tier
  = one fresh-agent review (not Full, not nothing); (C) full L1→L2→L3 [trap: over-process].
  `expected: {"chosen_tier":"None"}`.

### Phase F ACCEPT-CMDs
- AC-Fcount: `test "$(ls tests/scenarios/*.md | wc -l)" -eq 10`.
- AC-Fshape: each new file has an `^expected:` line equal to its pinned literal AND contains a trap option.
- AC-Fdiscriminating: each new scenario, run by a fresh subagent against the post-repair skill,
  produces its `expected` value (not the trap). Graded at F.

**Exit condition:** Phase-F ACs pass; one fresh review.

---

## Whole-task gates (run at F)

- `bash three-loop-workflow/references/check-consistency.sh` exits 0.
- `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js three-loop-workflow/references/review-panel.js` exits 0.
- `wc -w three-loop-workflow/SKILL.md` ≤ 2888.
- All 10 `tests/scenarios/*.md` graded by fresh subagents to their `expected`.
- `zip -r /tmp/verify.skill three-loop-workflow/ >/dev/null && unzip -l /tmp/verify.skill | grep -q SKILL.md` (artifact still builds).
