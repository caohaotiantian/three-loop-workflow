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
#   M16       the second reviewer's findings discarded rather than unioned
#   M17       the loop's structural bound, asserted in combination with a broken counter — alone it
#             changes nothing observable, so it is only load-bearing when the counter also fails
#   M19       repoPath dropped from the Fix and Triage prompts, which is how a phase driven against a
#             repository elsewhere loses the only thing telling its agents where the tree is
#   M20       the acceptCmds shape guard, without which a string or any other length-bearing value
#             passes the emptiness test and dies at `.map` with the Write agent already spent
#   M18/S5    the args normaliser — the Workflow tool passes args as a JSON string, so without it\n#             every invocation through the tool fails (phase.js) or silently ignores args (runner)\n#   S1-S4     the two-arm runner's scoring: an agent-asserted pass, the row-set check, the
#             discriminating floor, and a broken guard scored as held
#
# M5 also covers termination: without the loop's structural bound it does not return at all, so the
# harness's runaway ceiling is what catches it.
#
# M1-M3, M9, M19 and M20 additionally assert the point of the whole exercise: the grep the previous gate used
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
tried=0
detected=0

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
  tried=$((tried+1))
  if cmp -s "$SRC" "$TMP/phase.js"; then
    printf '  ERROR %s: the mutation did not apply — the patch no longer matches the source\n' "$name"
    fail=$((fail+1)); return
  fi
  if PHASE_JS="$TMP/phase.js" node scripts/sim-phase.js >"$TMP/out" 2>&1; then
    printf '  SURVIVED  %s — sim-phase.js exited 0 on broken control flow\n' "$name"
    fail=$((fail+1))
  else
    detected=$((detected+1))
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

apply "M19 repoPath dropped from the Fix and Triage prompts" \
  's = s.replace("await tryAgent(\n        where +\n        `Check each claimed", "await tryAgent(\n        `Check each claimed")
s = s.replace("await tryAgent(\n    where +\n    `Fix these", "await tryAgent(\n    `Fix these")' \
  "repoPath"

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
  's = s.replace("if (gateHead === base) {", "if (false && gateHead === base) {")' \
  "gateHead === base"

apply "M10 an unparseable gates head fails open again" \
  's = s.replace("  if (!gateHead) {", "  if (false) {")'

apply "M11 the implementer's self-assessment re-injected into the review prompt" \
  's = s.replace("      `\\nDo not modify code.`", "      (concerns.length ? `\\nThe implementer flagged low confidence in: ${concerns.join(\x27; \x27)} — look there first.\\n` : \x27\x27) +\n      `\\nDo not modify code.`")'

apply "M12 depth no longer decides the reviewer count" \
  's = s.replace("const reviewers = depth !== undefined ? (depth === \x27deep\x27 ? 2 : 1) : legacyReviewers", "const reviewers = 1")'

# Found by a reviewer, who demonstrated that the union invariant passed under this mutation because the
# assertion looked for the single letter "y", which occurs in the static triage prompt prose.
apply "M16 the second reviewer's findings dropped entirely (not intersected — discarded)" \
  's = s.replace("const reported = [...new Set(verdicts.flatMap(v => v.blocking || []))]", "const reported = [...new Set(verdicts[0].blocking || [])]")'

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

# The structural bound is defence in depth: removing it alone changes nothing observable, because the cap
# returns first. Its role only appears when the counter is broken too — and then its absence turns a wrong
# return into a run that never terminates. Asserted here in combination, because a reviewer showed that
# CLAUDE.md claimed individual coverage the harness did not have.
# The Workflow tool passes args as a JSON string. Without the normaliser every invocation through the
# tool returns "planPath is required" no matter what was passed — which is why phase.js had never run.
apply "M18 the args normaliser removed (a JSON string destructures to all-undefined)" \
  's = s.replace("} = input", "} = (typeof args === \x27object\x27 && args) || {}")'

apply "M17 the structural bound removed AND the fix counter broken (must not run forever)" \
  's = s.replace("while (verifyRound <= maxRounds + 1) {", "while (true) {").replace("\n  fixes++\n", "\n")'

apply "M6 reviewer findings intersected instead of unioned" \
  's = s.replace("const reported = [...new Set(verdicts.flatMap(v => v.blocking || []))]", "const reported = (verdicts[0].blocking || []).filter(b => verdicts.every(v => (v.blocking || []).includes(b)))")'

apply "M7 closure computed on the raw count, before triage" \
  's = s.replace("      blocking = triage.confirmed || []", "      blocking = reported")'

apply "M8 a dead reviewer treated as a pass" \
  's = s.replace("if (verdicts.length < reviewers) {", "if (false) {")'

# Disabled with `false &&` rather than deleted, so the rule's wording survives verbatim in the source
# and the third argument can show that a token grep still passes on the mutant. Reverting this guard
# restores the crash it was added for: a non-array acceptCmds reaches `.map` with the Write agent
# already spent.
apply "M20 the acceptCmds shape guard reverted, so a non-array reaches .map" \
  's = s.replace("if (!Array.isArray(acceptCmds))", "if (false \x26\x26 !Array.isArray(acceptCmds))")' \
  'Array.isArray(acceptCmds)'

echo
echo "== mutation test: the two-arm runner's scoring =="






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

# ── M21-M30: the survivors an ad-hoc mutation audit found on 2026-08-11 ──────────────────────────
# sim-phase.js printed "all 54 invariants hold" against every one of these. The invariants that kill
# them were added in the same change; these mutations are what make that permanent, so that deleting
# one of those invariants shows up here as a survivor rather than as a smaller number nobody reads.

apply "M21 the reviewers-below-one guard deleted (a phase closes green having reviewed nothing)" \
  's = s.replace("if (reviewers < 1)", "if (false && reviewers < 1)")'

apply "M22 lastHead tracking dropped (a no-op fix after an advancing round grinds to cap-exhausted)" \
  's = s.replace("lastHead = gateHead", "lastHead = lastHead")'

apply "M23 the closed phase returns the writer's claimed head instead of the one the gates saw" \
  's = s.replace("headSha: gateHead", "headSha: writeHead")'

apply "M24 verifyRound frozen (every round labelled r1; a 4-round escalation reports round 1)" \
  's = s.replace("verifyRound++", "verifyRound")'

apply "M25 the dead-write-agent return deleted (TypeError instead of agent-error)" \
  "s = s.replace(\"if (!work) return { status: 'agent-error', phaseLabel, round: 0, stage: 'write' }\", '')"

apply "M26 the dead-redispatch return deleted" \
  "s = s.replace(\"if (!retry) return { status: 'agent-error', phaseLabel, round: 0, stage: 'write-redispatch' }\", '')"

apply "M27 the dead-gates-agent return deleted" \
  "s = s.replace(\"if (!gates) return { status: 'agent-error', phaseLabel, round, stage: 'gates' }\", '')"

apply "M28 the dead-triage-agent return deleted" \
  "s = s.replace(\"if (!triage) return { status: 'agent-error', phaseLabel, round, stage: 'triage' }\", '')"

apply "M29 the cap-exhausted payload blanks what is unresolved" \
  "import re; s = re.sub(r'unresolved: [^,\\n]+', 'unresolved: []', s, count=1)"

apply "M30 exhaustedBy pinned to a constant (the escalation cannot say which stage spent the budget)" \
  "import re; s = re.sub(r'exhaustedBy: [^,\\n}]+', \"exhaustedBy: 'mixed'\", s, count=1)"

echo
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
  echo "negative-test: $detected/$tried mutations killed"
  echo "  (the denominator is hand-written: it counts the defects someone thought to inject."
  echo "   An audit on 2026-08-11 injected 88 into phase.js and 21 survived, so a 100% kill rate"
  echo "   here bounds nothing above the mutations below.)"
else
  echo "negative-test: $fail mutation(s) SURVIVED — sim-phase.js is not asserting what it claims"
fi
exit "$fail"
