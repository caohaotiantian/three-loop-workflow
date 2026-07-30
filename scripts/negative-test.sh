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
#
# M1-M3 additionally assert the point of the whole exercise: the grep the previous gate used still
# passes on the mutated file. Deleting a guard is nearly the only mutation a grep can detect, and where
# the rule's wording also appears in a nearby comment it cannot detect even that.
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
s = re.sub(r"\n  if \(fixes > 0 && gateHead && gateHead === lastHead\) \{\n.*?\n  \}\n", "\n", s, flags=re.S)' \
  "committed nothing"

apply "M3 no-op-fix guard disabled (tokens intact)" \
  's = s.replace("if (fixes > 0 && gateHead && gateHead === lastHead) {", "if (false && fixes > 0 && gateHead && gateHead === lastHead) {")' \
  "committed nothing"

apply "M4 cap fires on the round about to run, not on fixes spent" \
  's = s.replace("if (fixes >= maxRounds) {", "if (round === maxRounds) {")'

apply "M5 the fix counter never increments" \
  's = s.replace("\n  fixes++\n", "\n")'

apply "M6 reviewer findings intersected instead of unioned" \
  's = s.replace("const reported = [...new Set(verdicts.flatMap(v => v.blocking || []))]", "const reported = (verdicts[0].blocking || []).filter(b => verdicts.every(v => (v.blocking || []).includes(b)))")'

apply "M7 closure computed on the raw count, before triage" \
  's = s.replace("      blocking = triage.confirmed || []", "      blocking = reported")'

apply "M8 a dead reviewer treated as a pass" \
  's = s.replace("if (verdicts.length < Math.max(1, reviewers)) {", "if (false) {")'

echo
if [ "$fail" -eq 0 ]; then
  echo "negative-test: every mutation was detected"
else
  echo "negative-test: $fail mutation(s) SURVIVED — sim-phase.js is not asserting what it claims"
fi
exit "$fail"
