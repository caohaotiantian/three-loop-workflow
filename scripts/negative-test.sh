#!/usr/bin/env bash
# Mutation tests for this repository's deterministic checks.
#
# A check that cannot fail when the behavior is wrong is worse than no check. This script breaks the
# things the gate relies on, on COPIES under a temp directory, one defect at a time, and requires the
# check that owns each one to notice. A mutation that survives means the check is not asserting what it
# claims, and the script exits non-zero.
#
# Three groups remain:
#   the shipped-skill lint   scripts/lint-skill.sh, with one sample per regex alternative of R1, R2, R5
#                            and R6, one for R3, and two routing cases for R4. A control runs first: the
#                            unmutated copy must pass, or every "detected" after it would mean nothing.
#   the syntax gate          scripts/check-workflow-syntax.sh with one forbidden-primitive row deleted;
#                            the reject fixtures under tests/gate-fixtures/ must then let something through.
#   E1-E3                    the round-cap experiment's published figures (scripts/exp-analyse.mjs).
#
# The Build-loop script these tests once covered, and its mutations, were retired in v3.0.0 with the
# script (v2.7.0 has them).
#
# A mutation that fails to apply is counted as a FAILURE, not skipped: a mutation test whose mutations
# silently stop applying is the same kind of false coverage it exists to prevent.
#
# SKILL_DIR overrides the skill tree the lint cases copy (default: three-loop-workflow).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fail=0
tried=0
detected=0
SKILL_DIR=${SKILL_DIR:-three-loop-workflow}
LINT=scripts/lint-skill.sh

echo "== mutation test: the shipped-skill lint =="

fresh_copy() { rm -rf "$TMP/skill"; cp -R "$SKILL_DIR" "$TMP/skill"; }

# Control first. If the unmutated copy does not pass, every "detected" below would be meaningless.
fresh_copy
if bash "$LINT" "$TMP/skill" >"$TMP/out" 2>&1; then
  printf '  control   the unmutated copy passes %s (reported apart: it is not a mutation)\n' "$LINT"
  control_ok=1
else
  printf '  ERROR control: %s fails on the UNMUTATED copy of %s, so no mutation below can be judged:\n' "$LINT" "$SKILL_DIR"
  grep -a 'FAIL\|No such file' "$TMP/out" | sed 's/^/            /'
  fail=$((fail+1)); control_ok=0
fi

# lint_expect <case> <check> — $TMP/skill is already mutated. The named check, not merely some check,
# must be the one that fails: a sample caught by the wrong check would leave its own check untested.
lint_expect() {
  local name="$1" check="$2"
  tried=$((tried+1))
  if bash "$LINT" "$TMP/skill" >"$TMP/out" 2>&1; then
    printf '  SURVIVED  %s — %s exited 0 on a tree it must reject\n' "$name" "$LINT"
    fail=$((fail+1))
  elif grep -aq "^  FAIL  $check" "$TMP/out"; then
    detected=$((detected+1)); printf '  detected  %s\n' "$name"
  else
    printf '  SURVIVED  %s — %s failed, but not on %s\n' "$name" "$LINT" "$check"
    fail=$((fail+1))
  fi
}

# lint_sample <check> <sample> — append a line holding the sample to the copy's SKILL.md. The samples are
# test data, one per regex alternative; the regexes themselves live only in lint-skill.sh.
lint_sample() {
  local check="$1" sample="$2"
  fresh_copy
  printf '\n%s\n' "$sample" >> "$TMP/skill/SKILL.md"
  if cmp -s "$SKILL_DIR/SKILL.md" "$TMP/skill/SKILL.md"; then
    printf '  ERROR %s %s: the mutation did not apply\n' "$check" "$sample"
    tried=$((tried+1)); fail=$((fail+1)); return
  fi
  lint_expect "$check sample: $sample" "$check"
}

# lint_benign <sentence> — append an ordinary sentence; the lint must still pass.
guards=0; guards_ok=0
lint_benign() {
  fresh_copy
  printf '\n%s\n' "$1" >> "$TMP/skill/SKILL.md"
  guards=$((guards+1))
  if bash "$LINT" "$TMP/skill" >"$TMP/out" 2>&1; then
    guards_ok=$((guards_ok+1)); printf '  guard     benign sentence passes: %s\n' "$1"
  else
    printf '  FALSE-POSITIVE  %s — rejected by %s:\n' "$1" "$LINT"
    grep -a '^  FAIL' "$TMP/out" | sed 's/^/            /'
    fail=$((fail+1))
  fi
}

if [ "$control_ok" = 1 ]; then
  while IFS= read -r s; do [ -n "$s" ] && lint_sample R1 "$s"; done <<'SAMPLES'
AskUserQuestion
Workflow(
Workflow tool
workflow script
phase.js
Explore
Agent tool
Task tool
Skill tool
SendMessage
ScheduleWakeup
TodoWrite
WebFetch
WebSearch
Slash command
security-review
code-review
/simplify
.claude/
Claude Code
Plan mode
Research tool
EnterWorktree
ExitPlanMode
Agent(
/review
claude -p
PreToolUse
SubagentStop
MCP server
Use the Bash tool.
Run the Grep tool over it
Glob
NotebookEdit
MultiEdit
BashOutput
KillShell
SlashCommand
via bash tool
the grep tool
SAMPLES
  while IFS= read -r s; do [ -n "$s" ] && lint_sample R2 "$s"; done <<'SAMPLES'
a gain of 12%
a gain of 12.5%
percentage points
116 findings
40 percent
3 out of 4
Nine out of 10
a score of 0.86
a 3x speedup
SAMPLES
  lint_sample R3 "the third mostly repeat the second"
  while IFS= read -r s; do [ -n "$s" ] && lint_sample R5 "$s"; done <<'SAMPLES'
sim-phase
check-workflow-syntax
gate-fixtures
negative-test
accept-release
run scripts/check.sh
`scripts/phase.js`
references/plan.md
references/build.md
references/close.md
references/escalation.md
references/orchestration.md
references/maintenance.md
references/platforms.md
SAMPLES
  while IFS= read -r s; do [ -n "$s" ] && lint_sample R6 "$s"; done <<'SAMPLES'
Opus
Sonnet
Haiku
Gemini
Claude
claude-sonnet-4-5
gpt-4o
opus
o3-mini
o1 model
an o3 run
Llama
mistral
gemini
GPT-5
build.md:12
memory:
3 of 5
two-thirds
roughly half
SAMPLES

  # False-positive guards: ordinary prose that must PASS. A pattern broad enough to catch every tool
  # name is broad enough to reject a sentence a writer is entitled to, and a lint that rejects true
  # sentences does not converge. Reported apart from the mutations, like the control.
  while IFS= read -r s; do [ -n "$s" ] && lint_benign "$s"; done <<'SAMPLES'
Dispatch a sub-agent for that domain.
A Subagent keeps to its own files.
One sub agent per domain.
No tool replaces reading the diff.
The tool output is evidence.
Each tool the project uses is a check.
A tool that cannot run is not a check that passed.
Upgrading from 0.9 to 1.0 is supported.
It waits 0.5 seconds before retrying.
See api/review for the handler.
Read the project's guide before you start.
Plan the fix before you edit.
Write the Goal first.
Edit the file, then read the result.
A check tool is fine.
A build tool is the project's choice.
Compare o1 against the old path.
Test tool output is evidence.
Build tool choice belongs to the project.
The project's scripts are its checks.
The project's scripts/ directory (build config, CI) names its checks.
Run it in the Bash shell.
A Bash one-liner is fine.
Grep the callers before renaming.
SAMPLES

  # R4 fails in either direction: a cited reference that does not exist, and a reference nothing cites.
  fresh_copy
  printf '\nSee references/missing.md.\n' >> "$TMP/skill/SKILL.md"
  lint_expect "R4a a cited reference does not exist" R4
  fresh_copy
  mkdir -p "$TMP/skill/references"
  printf 'An orphan.\n' > "$TMP/skill/references/orphan.md"
  if [ -f "$TMP/skill/references/orphan.md" ]; then
    lint_expect "R4b a reference nothing cites" R4
  else
    printf '  ERROR R4b: the mutation did not apply\n'; tried=$((tried+1)); fail=$((fail+1))
  fi
fi

echo
echo "== mutation test: the syntax gate's fixtures notice a broken gate =="
# Delete the Date.now row from a COPY of the gate; reject-date-now.js exists for exactly this, so at
# least one reject fixture must now be accepted. The unmutated gate must reject all of them first.
GATE=scripts/check-workflow-syntax.sh
tried=$((tried+1))
cp "$GATE" "$TMP/csg.sh"
grep -vF '[/\bDate\s*\.\s*now\b/, "Date.now"]' "$GATE" > "$TMP/csg-mut.sh"
ctl_bad=0
for f in tests/gate-fixtures/reject-*.js; do
  bash "$TMP/csg.sh" "$f" >/dev/null 2>&1 && ctl_bad=$((ctl_bad+1))
done
# A gate that does not parse exits non-zero on every fixture, mutated or not, and the branch below
# would call that "still rejected". That is the false coverage this file exists to prevent.
if ! bash -n "$TMP/csg.sh" 2>"$TMP/csg-parse"; then
  printf '  ERROR syntax-gate: the unmutated gate does not parse, so the case cannot be judged\n'
  sed 's/^/            /' "$TMP/csg-parse"
  fail=$((fail+1))
elif ! bash -n "$TMP/csg-mut.sh" 2>"$TMP/csg-parse"; then
  printf '  ERROR syntax-gate: the mutated gate does not parse, so the case cannot be judged\n'
  sed 's/^/            /' "$TMP/csg-parse"
  fail=$((fail+1))
elif cmp -s "$GATE" "$TMP/csg-mut.sh"; then
  printf '  ERROR syntax-gate: the mutation did not apply — the Date.now row is not where the patch looks\n'
  fail=$((fail+1))
elif [ "$ctl_bad" -ne 0 ]; then
  printf '  ERROR syntax-gate: the UNMUTATED gate accepts %s reject fixture(s), so the case cannot be judged\n' "$ctl_bad"
  fail=$((fail+1))
else
  accepted=0
  for f in tests/gate-fixtures/reject-*.js; do
    bash "$TMP/csg-mut.sh" "$f" >/dev/null 2>&1 && accepted=$((accepted+1))
  done
  if [ "$accepted" -ge 1 ]; then
    detected=$((detected+1))
    printf '  detected  syntax-gate: with the Date.now row deleted, %s reject fixture(s) are accepted\n' "$accepted"
  else
    printf '  SURVIVED  syntax-gate: every reject fixture still rejected on a gate that lost its Date.now row\n'
    fail=$((fail+1))
  fi
fi

echo
# The round-cap experiment's analysis has the same contract as everything above: it must fail when the
# thing it checks is wrong. It is what entitles a number to appear in the results documents, so a
# version that could not reject a drifted figure would be the false coverage this file exists to
# prevent. Demonstrated on 2026-07-31 that the gate was blind to E1 before `exp-analyse.mjs` was wired
# into accept-release.sh; these keep it from going blind again.
#
# Everything happens on copies under $TMP — a mutation test that edited the real documents would leave
# the tree wrong if it were interrupted.
apply_exp() {
  local name="$1" script="$2"
  rm -rf "$TMP/exp"; mkdir -p "$TMP/exp"
  cp -r docs/measurements/2026-07-30-round-cap/raw "$TMP/exp/raw"
  cp docs/2026-07-31-round-cap-experiment.md    "$TMP/exp/en.md"
  cp docs/2026-07-31-round-cap-experiment-cn.md "$TMP/exp/cn.md"
  tried=$((tried+1))
  if ! EXP_DIR="$TMP/exp" python3 -c "$script"; then
    printf '  ERROR %s: the mutation did not apply\n' "$name"; fail=$((fail+1)); return
  fi
  if node scripts/exp-analyse.mjs --raw "$TMP/exp/raw" --docs "$TMP/exp/en.md" "$TMP/exp/cn.md" >/dev/null 2>&1; then
    printf '  SURVIVED  %s — exp-analyse.mjs exited 0 on data it must reject\n' "$name"
    fail=$((fail+1))
  else
    detected=$((detected+1))
    printf '  detected  %s\n' "$name"
  fi
}

echo "== mutation test: the round-cap experiment's published figures =="

apply_exp "E1 a published figure in the English results document drifts from the raw data" \
'import os,re,sys
p=os.environ["EXP_DIR"]+"/en.md"; s=open(p).read()
n,k=re.subn(r"(?<![0-9])67(?![0-9])","68",s,count=1)
if k==0: sys.exit(1)
open(p,"w").write(n)'

apply_exp "E2 the raw verdict disagrees with the per-round series reconstructed from the journal" \
'import os,json
p=os.environ["EXP_DIR"]+"/raw/verdicts.json"; v=json.load(open(p))
k=sorted(v)[0]; v[k]["fixes"]=v[k]["fixes"]+1
json.dump(v,open(p,"w"),indent=1)'

apply_exp "E3 the Chinese translation drops a figure the English one quotes" \
'import os,re,sys
p=os.environ["EXP_DIR"]+"/cn.md"; s=open(p).read()
n,k=re.subn(r"(?<![0-9])67(?![0-9])","若干",s,count=1)
if k==0: sys.exit(1)
open(p,"w").write(n)'

echo
if [ "$fail" -eq 0 ]; then
  echo "negative-test: $detected/$tried mutations killed; control passes; $guards_ok/$guards false-positive guards hold"
  echo "  (the denominator counts the defects someone thought to inject, and a full kill rate"
  echo "   bounds nothing beyond them: a defect nobody injected is one this run says nothing about.)"
else
  echo "negative-test: $fail mutation(s) SURVIVED or could not be judged — a check is not asserting what it claims"
fi
exit "$fail"
