#!/usr/bin/env bash
# Mutation test for scripts/sim-phase.js.
#
# A check that cannot fail when the behavior is wrong is worse than no check. This script breaks
# phase.js on purpose, one invariant at a time, and requires sim-phase.js to notice. If a mutation
# survives, the invariant it targets is not actually being asserted and this script exits non-zero.
#
# Each mutation reproduces a defect this project has really shipped or really found:
#   M1/M2/M3  the empty-diff and no-op-fix guards, which a token grep could not see disabled
#   M4        v2's first cut: cap fired on the round about to run, so a budget of 3 delivered 2
#   M5        v1's runner: the round counter incremented unconditionally
#   M6        findings intersected instead of unioned
#   M7        closure computed on the raw reported count, before triage
#   M8        a reviewer that died treated as a reviewer that passed
#   M9        the shell-sourced half of the empty-diff guard, which let a fabricated sha close a phase
#   M10       an unparseable gates head failing open, which disabled the no-op-fix guard downstream
#   M11       the implementer's self-assessment reaching the reviewers
#   M12       depth no longer deciding the reviewer count, so Deep runs the Standard review
#   M13       non-blocking findings recomputed per round, dropping anything not repeated at closure
#   M14       a dead fix agent consuming a round, reporting infrastructure failure as deadlock
#   M15       the triage rejection record dropped instead of returned
#
# M5 also covers termination: without the loop's structural bound it does not return at all, so the
# harness's runaway ceiling is what catches it.
#
# M1-M3 and M9 additionally assert the point of the whole exercise: the grep the previous gate used
# still passes on the mutated file. Deleting a guard is nearly the only mutation a grep can detect, and
# where the rule's wording also appears in a nearby comment it cannot detect even that.
#
# A patch that no longer matches the source is counted as a FAILURE, not skipped: a mutation test whose
# mutations silently stop applying is the same kind of false coverage it exists to prevent.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

SRC=three-loop-workflow/scripts/phase.js
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fail=0

# apply <name> <python-patch> [grep-token-that-must-still-be-present]
apply() {
  local name="$1" patch="$2" token="${3:-}"
  cp "$SRC" "$TMP/phase.js"
  python3 - "$TMP/phase.js" <<PY
import sys
p = sys.argv[1]
s = open(p).read()
$patch
open(p, 'w').write(s)
PY
  if cmp -s "$SRC" "$TMP/phase.js"; then
    printf '  ERROR %s: the mutation did not apply — the patch no longer matches the source\n' "$name"
    fail=$((fail+1)); return
  fi
  if PHASE_JS="$TMP/phase.js" node scripts/sim-phase.js >"$TMP/out" 2>&1; then
    printf '  SURVIVED  %s — sim-phase.js exited 0 on broken control flow\n' "$name"
    fail=$((fail+1))
  else
    printf '  detected  %s (%s)\n' "$name" "$(grep -c '^  FAIL' "$TMP/out" | tr -d ' ') invariant(s) broke"
  fi
  if [ -n "$token" ]; then
    if grep -qF "$token" "$TMP/phase.js"; then
      printf '            ...and the old token grep "%s" still passes on it\n' "$token"
    else
      printf '            NOTE the token "%s" is absent, so a grep would have caught this one too\n' "$token"
    fi
  fi
}

echo "== mutation test: each broken invariant must be detected by execution =="

apply "M1 empty-diff guard disabled (tokens intact)" \
  's = s.replace("if (writeHead === base) {", "if (false && writeHead === base) {")' \
  "writeHead === base"

apply "M2 no-op-fix guard deleted outright" \
  'import re
s = re.sub(r"\n  if \(fixes > 0 && gateHead === lastHead\) \{\n.*?\n  \}\n", "\n", s, flags=re.S)' \
  "committed nothing"

apply "M3 no-op-fix guard disabled (tokens intact)" \
  's = s.replace("if (fixes > 0 && gateHead === lastHead) {", "if (false && fixes > 0 && gateHead === lastHead) {")' \
  "committed nothing"

apply "M9 the shell-sourced half of the empty-diff guard disabled" \
  's = s.replace("if (fixes === 0 && gateHead === base) {", "if (false && fixes === 0 && gateHead === base) {")' \
  "gateHead === base"

apply "M10 an unparseable gates head fails open again" \
  's = s.replace("  if (!gateHead) {", "  if (false) {")'

apply "M11 the implementer's self-assessment re-injected into the review prompt" \
  's = s.replace("      `\\nDo not modify code.`", "      (concerns.length ? `\\nThe implementer flagged low confidence in: ${concerns.join(\x27; \x27)} — look there first.\\n` : \x27\x27) +\n      `\\nDo not modify code.`")'

apply "M12 depth no longer decides the reviewer count" \
  's = s.replace("const reviewers = depth === \x27deep\x27 ? 2 : 1", "const reviewers = 1")'

apply "M13 non-blocking findings recomputed per round instead of accumulated" \
  's = s.replace("    verdicts.flatMap(v => v.nonblocking || []).forEach(n => nonblockingSeen.add(n))", "    nonblockingSeen.clear(); verdicts.flatMap(v => v.nonblocking || []).forEach(n => nonblockingSeen.add(n))")'

apply "M14 a dead fix agent silently consumes a round" \
  's = s.replace("  if (!fixed) {", "  if (false) {")'

apply "M15 the triage record is dropped instead of returned" \
  's = s.replace("        rejected: rejectedSeen,\n        concerns,", "        rejected: [],\n        concerns,")'

apply "M4 cap fires on the round about to run, not on fixes spent" \
  's = s.replace("if (fixes >= maxRounds) {", "if (round === maxRounds) {")'

apply "M5 the fix counter never increments" \
  's = s.replace("\n  fixes++\n", "\n")'

apply "M6 reviewer findings intersected instead of unioned" \
  's = s.replace("const reported = [...new Set(verdicts.flatMap(v => v.blocking || []))]", "const reported = (verdicts[0].blocking || []).filter(b => verdicts.every(v => (v.blocking || []).includes(b)))")'

apply "M7 closure computed on the raw count, before triage" \
  's = s.replace("      blocking = triage.confirmed || []", "      blocking = reported")'

apply "M8 a dead reviewer treated as a pass" \
  's = s.replace("if (verdicts.length < reviewers) {", "if (false) {")'

echo
if [ "$fail" -eq 0 ]; then
  echo "negative-test: every mutation was detected"
else
  echo "negative-test: $fail mutation(s) SURVIVED — sim-phase.js is not asserting what it claims"
fi
exit "$fail"
