# Implementation: Subagent Role Tightening and Test-Intent Check

```
Status: closed
Closing-commit: 5860b25
Closed-on: 2026-05-11
Deferred: none
```

Phase 1 accept tally (recorded at Phase close): 13 ACs run, 13 passed, 0
failed, 0 skipped, 0 xfail. Main-agent personal rerun matched the accept
subagent's report. Commit trailer in 5860b25 records the per-AC values.

Design source: `docs/design/roles-and-test-intent.md`.

## 1. Task Index

This impl doc implements every Deliverable in the design doc. Mapping
uses section anchors rather than line numbers (anchors do not drift
when the design doc is edited):

| Design anchor | Implements |
|---|---|
| `docs/design/roles-and-test-intent.md` §2 Deliverables (D1–D5) | Five hunks across three skill files, one Phase per KDD-5 hint |
| §4 KDD-1 (anchor A in SKILL.md §0.3) | T1 |
| §4 KDD-2 (split B principle / operational hook) | T2 (principle bullet) + T3 (operational hook in role table) |
| §4 KDD-3 (test intent at L2) | T4 |
| §4 KDD-4 (accept append, not replace) | T5 + T6 |
| §4 KDD-5 (one-Phase hint, non-binding) | Single-Phase decision below |
| §7 Acceptance Criteria (AC-D1 through AC-no-regress) | Per-task `<ACCEPT-CMD>` lines |

## 2. Phase Breakdown

Per KDD-5 hint, **one Phase** covers all five deliverable hunks. The hunks
are small, share an identical acceptance pattern (grep/awk), and are
conceptually coupled (subagent-role tightening).

### Phase 1 — Apply five deliverables (six impl tasks) and pass all ACs

**Note on counts**: the design declares **five deliverables** (D1, D2, D3,
D4, D5). D5 is itself composed of two column-cell appends (Output column
and Forbidden column on the accept row). The impl splits D5 into two
tasks (T5 = Output append, T6 = Forbidden append) because each cell is a
distinct edit with its own per-task accept command. So: 5 deliverables,
8 tasks total (T0 pre-flight + 6 impl tasks T1–T6 + T7 leakage post-check
+ T8 no-regress post-check).

**Entry condition**: L1 design doc has passed review (verdict: pass, round 3,
zero severe + zero general). Commits ahead of HEAD: none required.

**Design document references** (by section anchor):
- §2 Deliverables (D1–D5)
- §7 Acceptance Criteria (AC-D1 through AC-no-regress)
- §4 KDD-1 through KDD-4 (placement and append-semantics decisions)

**Task list (TDD order — test tasks before implementation tasks)**:

The discipline here: every positive AC must be confirmed **red** (failing
against current source) before any edit lands, so the test is genuinely
gated on the implementation. Negative ACs and preserve ACs may already be
green; they assert continuity.

#### T0 — Pre-flight: confirm positive ACs start red

Prove the positive ACs do not pass against the unedited source. Without
this step, an AC that always returns the target value would silently
"pass" without the implementation actually doing anything.

**Per-task acceptance command** (each command must produce the value
shown):
```bash
# AC-D1 positive — must be 0 (no pattern-conflict bullet yet)
awk '/^### 0\.3 Surgical Changes/,/^### 0\.4/' three-loop-workflow/SKILL.md \
  | grep -cF "When two existing patterns"

# AC-D2 positive — must be 0 (no orthogonality bullet yet)
awk '/^### 0\.3 Surgical Changes/,/^### 0\.4/' three-loop-workflow/SKILL.md \
  | grep -cF "orthogonality"

# AC-D3 positive — must be 0 (dev row does not yet name exports/callers)
grep -F "**step 1: dev**" three-loop-workflow/references/loop-3-development.md \
  | grep -cF "exports, immediate callers"

# AC-D4 positive — must be 0 (no test-intent substep yet)
awk '/^\[Steps\]/,/^3\./' three-loop-workflow/references/loop-2-implementation.md \
  | grep -cF "tests shape, not intent"

# AC-D5a positive — must be 0 (no tally requirement yet)
grep -F "**step 3: accept**" three-loop-workflow/references/loop-3-development.md \
  | grep -cF "passed/failed/skipped/xfail"

# AC-D5b positive — must be 0 (no interpret-or-judge clause yet)
grep -F "**step 3: accept**" three-loop-workflow/references/loop-3-development.md \
  | grep -cF "interpret or judge"
```

**Exit condition**: every command above outputs `0`. If any outputs ≥1
without the edits, the AC is either malformed or the source has drifted —
escalate before proceeding.

#### T1 — Implement D1: pattern-conflict bullet in SKILL.md §0.3

Add a new bullet inside the §0.3 Surgical Changes block (between
`### 0.3 Surgical Changes` and `### 0.4`). The bullet must contain the
exact phrase **"When two existing patterns"** (anchored by AC-D1) and
must say "pick the more recent or more tested one and flag the other for
cleanup" — without licensing the dev subagent to perform the cleanup
(per the Risk-Mitigation table in the design doc §8).

Suggested wording (L3 dev may refine but must preserve the AC-anchored
phrase):
> When two existing patterns in the codebase conflict, pick the more
> recent or more tested one and flag the other for cleanup. Producing a
> hybrid that satisfies neither is forbidden. Cleanup of the rejected
> pattern is a separate task — do not perform it here.

**Per-task acceptance command** (AC-D1):
```bash
awk '/^### 0\.3 Surgical Changes/,/^### 0\.4/' three-loop-workflow/SKILL.md \
  | grep -cF "When two existing patterns"
# expected: 1
```

#### T2 — Implement D2: orthogonality principle in SKILL.md §0.3

Add a second new bullet inside §0.3. The bullet must contain the word
**"orthogonality"** (AC-D2 positive) and must **not** contain any wording
of the concrete reading list (AC-D2 negative). Concrete list belongs to
T3 (D3) per KDD-2.

Suggested wording:
> If you cannot articulate why surrounding code is structured a way, stop
> and ask before modifying it. Assuming orthogonality between the code you
> are touching and the code you are not is the dangerous default.

**Per-task acceptance commands** (AC-D2 positive + negative):
```bash
# Positive: orthogonality appears in §0.3
awk '/^### 0\.3 Surgical Changes/,/^### 0\.4/' three-loop-workflow/SKILL.md \
  | grep -cF "orthogonality"
# expected: >= 1

# Negative: concrete reading list does NOT appear in §0.3
awk '/^### 0\.3 Surgical Changes/,/^### 0\.4/' three-loop-workflow/SKILL.md \
  | grep -ciE "(immediate callers|exports.{0,40}callers|callers.{0,40}exports|shared utilities)"
# expected: 0
```

#### T3 — Implement D3: dev row Input column

Modify the `| **step 1: dev** | … |` row of the "Role responsibilities"
table in `references/loop-3-development.md`. The Input column currently
reads `Phase task list in impl doc + design doc references`. Append (do
**not** replace) the concrete reading list. The phrase **"exports,
immediate callers"** must appear in the same row (AC-D3).

Suggested final Input cell content:
> Phase task list in impl doc + design doc references + exports, immediate
> callers, and shared utilities of files being modified

**Per-task acceptance command** (AC-D3):
```bash
grep -F "**step 1: dev**" three-loop-workflow/references/loop-3-development.md \
  | grep -cF "exports, immediate callers"
# expected: 1
```

#### T4 — Implement D4: test-intent substep in L2 review template

Two edits to `references/loop-2-implementation.md`, both inside the L2
review subagent prompt template's `[Steps]` block:

1. Add a new substep `e.` under step `2.` checking for test-intent
   encoding. The substep must contain the phrase **"tests shape, not
   intent"** (AC-D4 first clause).
2. Update the introductory sentence of step `2.` from "answer four
   questions" to "answer five questions" (AC-D4 second clause). After
   this edit, "answer four questions" must not appear anywhere in the
   file.

Suggested substep `e.` wording:
> e. For each test task in the Phase task list: does the description
>    specify the business invariant being protected, not just the function
>    being called? A task description vague enough that the resulting test
>    could be implemented as a shape-only assertion (passing regardless of
>    whether the protected logic is intact) tests shape, not intent —
>    flag as severe.

**Per-task acceptance commands** (AC-D4 both clauses):
```bash
# Substep present, inside step 2
awk '/^\[Steps\]/,/^3\./' three-loop-workflow/references/loop-2-implementation.md \
  | grep -cF "tests shape, not intent"
# expected: 1

# Question count updated
grep -cF "answer five questions" three-loop-workflow/references/loop-2-implementation.md
# expected: 1
grep -cF "answer four questions" three-loop-workflow/references/loop-2-implementation.md
# expected: 0
```

#### T5 — Implement D5 Output column: accept tally requirement

Modify the `| **step 3: accept** | … |` row of the Role responsibilities
table. The Output column currently reads `Per-command exit code and key
output, marked pass or fail`. **Append** (do not replace) the tally
requirement. The phrase **"passed/failed/skipped/xfail"** must appear in
the same row (AC-D5a), and the existing phrase **"pass or fail"** must
remain (AC-D5-preserve first clause).

Suggested final Output cell content:
> Per-command exit code and key output, marked pass or fail; plus
> passed/failed/skipped/xfail tally per command (skipped tests are not
> passing tests)

**Per-task acceptance commands** (AC-D5a + AC-D5-preserve.pass-or-fail):
```bash
grep -F "**step 3: accept**" three-loop-workflow/references/loop-3-development.md \
  | grep -cF "passed/failed/skipped/xfail"
# expected: 1

grep -F "**step 3: accept**" three-loop-workflow/references/loop-3-development.md \
  | grep -cF "pass or fail"
# expected: 1 (preserved)
```

#### T6 — Implement D5 Forbidden column: append interpret/judge clause

Modify the same `**step 3: accept**` row, Forbidden column. The column
currently reads `Modify code or tests`. **Append** (do not replace) the
new clause. The phrase **"interpret or judge"** must appear in the same
row (AC-D5b), and the existing phrase **"Modify code or tests"** must
remain (AC-D5-preserve second clause).

Suggested final Forbidden cell content:
> Modify code or tests; interpret or judge output beyond the mechanical
> exit-code → pass/fail derivation (that is the review role's job)

**Per-task acceptance commands** (AC-D5b + AC-D5-preserve.modify-clause):
```bash
grep -F "**step 3: accept**" three-loop-workflow/references/loop-3-development.md \
  | grep -cF "interpret or judge"
# expected: 1

grep -F "**step 3: accept**" three-loop-workflow/references/loop-3-development.md \
  | grep -cF "Modify code or tests"
# expected: 1 (preserved)
```

#### T7 — Post-flight: leakage check (AC-D6)

After T1–T6 commits, verify the new phrases land only at the expected
sites (no copy-paste leakage to unrelated files in the skill source) and
do not leak outside `three-loop-workflow/` except for the two task
documents.

**Per-task acceptance commands** (AC-D6):
```bash
# Each phrase must appear exactly at the expected file inside the skill
[ "$(grep -rlF 'orthogonality' three-loop-workflow/)" = \
    "three-loop-workflow/SKILL.md" ] && echo OK1 || echo FAIL1
[ "$(grep -rlF 'passed/failed/skipped/xfail' three-loop-workflow/)" = \
    "three-loop-workflow/references/loop-3-development.md" ] && echo OK2 || echo FAIL2
[ "$(grep -rlF 'tests shape, not intent' three-loop-workflow/)" = \
    "three-loop-workflow/references/loop-2-implementation.md" ] && echo OK3 || echo FAIL3

# Outside three-loop-workflow/ and docs/, none of the new phrases appear
for phrase in "orthogonality" "passed/failed/skipped/xfail" "tests shape, not intent"; do
  hits="$(grep -rlF "$phrase" . \
            --exclude-dir=three-loop-workflow \
            --exclude-dir=docs \
            --exclude-dir=.git || true)"
  [ -z "$hits" ] && echo "OK leak-$phrase" || echo "FAIL leak-$phrase $hits"
done
```

Expected output: `OK1 OK2 OK3 OK leak-orthogonality OK leak-passed/failed/skipped/xfail OK leak-tests shape, not intent`. No `FAIL*` lines.

Note: the binary archive `three-loop-workflow.skill` (ZIP) is correctly
skipped by `grep -r` without `-a`; this is the intended behaviour per
AC-D6 binary-archive exclusion.

#### T8 — Post-flight: no-regress structural check

Verify the structural invariants the design promises to preserve are
still in place.

**Per-task acceptance commands** (AC-no-regress):
```bash
# Four §0.x principle headings remain in SKILL.md
[ "$(grep -cE '^### 0\.[1-4] ' three-loop-workflow/SKILL.md)" = "4" ] && echo OK-h || echo FAIL-h

# Four step rows remain in Role responsibilities table
[ "$(grep -cE '^\| \*\*step [1-4]:' three-loop-workflow/references/loop-3-development.md)" = "4" ] && echo OK-r || echo FAIL-r

# Five top-level steps remain in L2 review template
[ "$(awk '/^\[Steps\]/,/^\[Output format\]/' three-loop-workflow/references/loop-2-implementation.md | grep -cE '^[1-5]\.')" = "5" ] && echo OK-s || echo FAIL-s
```

Expected output: `OK-h OK-r OK-s`. Any `FAIL-*` blocks Phase exit.

**Phase 1 exit condition**:
- T1–T6 commits all landed; T0/T7/T8 verifications green.
- `<TEST-CMD>` is not applicable (no executable code).
- All AC commands listed under Phase 1 above return their expected
  values.
- The main agent's personal rerun (per `references/loop-3-development.md`
  "Main agent constraints") matches the accept subagent's report.
- Commit trailers record the consolidated AC tally (e.g., `Accept:
  AC-D1=1 AC-D2.pos>=1 AC-D2.neg=0 … AC-no-regress=OK`).

## 3. Engineering Constraints Index

- **Project engineering norms**: No project CLAUDE.md exists in this
  repo; `three-loop-workflow/SKILL.md` "Core principles" §0.1–§0.4 act as
  the engineering-norms anchor for this task.
- **Four-corner subagent template**:
  `three-loop-workflow/references/loop-3-development.md` "Role
  responsibilities" table and "Four-corner subagent template" Mermaid.
- **Commit conventions**: `three-loop-workflow/SKILL.md` "Commit
  conventions" section. In particular:
  - Phase opener: `feat(phase1): subagent role tightening and test-intent
    check`.
  - Within-round fix: `fix(phase1-roundR): <failing-AC-keyword>`. The
    `<failing-AC-keyword>` must name one of the AC labels from §7 of the
    design doc (e.g., `AC-D2.negative`, `AC-D4.question-count`).
  - Trailers: record the exit-code and key AC values per command.
  - Forbidden: any mention of AI involvement, model names, or agent
    tooling.
- **L1/L2 review subagent prompt templates** for cross-checking:
  - `three-loop-workflow/references/loop-1-design.md` (L1 template)
  - `three-loop-workflow/references/loop-2-implementation.md` (L2 template)

## 4. Data and Fixture Dependencies

None. This task only edits text files inside `three-loop-workflow/`. No
existing test fixtures are referenced, and none are added. The acceptance
commands are pure shell `grep`/`awk` pipelines over those text files.

The packaged artifact `three-loop-workflow.skill` (ZIP) is gitignored per
commit `207448b`. Regenerating it is a separate task — out of scope per
the design doc §5.

## 5. Regression Protection

The only Phase in this task is Phase 1, so there are no prior-Phase tests
to keep green. Regression risk is bounded by AC-no-regress (T8), which
asserts three structural invariants:

- `SKILL.md` retains four `### 0.[1-4]` principle headings.
- `references/loop-3-development.md` retains four step rows in the Role
  responsibilities table.
- `references/loop-2-implementation.md` retains five top-level steps in
  the L2 review template (the new substep is *inside* step 2, not a new
  top-level step).

These are the load-bearing structural commitments other parts of the
skill assume. Any future edit that violates them must reopen this design
or its successor.
