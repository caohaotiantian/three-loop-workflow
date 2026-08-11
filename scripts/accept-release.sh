#!/usr/bin/env bash
# Acceptance for this repository.
#
# Tracked deliberately. Its predecessor lived in a gitignored `.agent/<task>/` directory, was cited as
# the `Gates:` evidence in six release commits, and the one before *that* — `.agent/accept.sh` — is
# already unrecoverable. Evidence quoted in permanent history has to be reproducible from the history.
#
# Two rules this script holds itself to:
#   Every published metric is RECOMPUTED here, never compared against a hardcoded copy.
#   Every behavioral invariant is asserted by EXECUTION, never by grepping for a word that names it.
# The second rule is new. The previous version pinned phase.js's guards with `grep -q`, which passes on
# a guard disabled with `false &&` and — where the wording also appears in a nearby comment — passes on
# a guard deleted outright. Both were demonstrated. Control flow now goes through scripts/sim-phase.js,
# and scripts/negative-test.sh proves that harness fails when the control flow is broken.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

# A UTF-8 locale is pinned for everything else this script greps and sorts. It used to be pinned for the
# word counts too, on the theory that locale was what made them differ — that was not enough: `wc -w`
# differs between BSD and glibc under the SAME UTF-8 locale, so the pin fixed a real bug and left a
# larger one standing. Word counts no longer go through `wc` at all; see `words()` below.
# Captured rather than piped into `grep -q`: under `set -o pipefail`, grep -q exits on the first match,
# `locale -a` dies of SIGPIPE, and the pipeline reports failure — so no locale ever matched and the
# script refused to run in exactly the case it was meant to repair. Measured, not reasoned about.
_avail=$(locale -a 2>/dev/null || true)
for _loc in C.UTF-8 en_US.UTF-8 C.utf8 en_US.utf8; do
  case "
$_avail
" in *"
$_loc
"*) export LC_ALL="$_loc"; break ;; esac
done
case "${LC_ALL:-}" in
  *UTF-8|*utf8) ;;
  *) echo "FAIL  no UTF-8 locale available — recomputed word counts would not match the published figures" >&2
     exit 1 ;;
esac

fail=0
# Thousands separators, computed rather than delegated to the locale. `printf "%'d"` emits no separator
# under LC_ALL=C / C.UTF-8 — the default on CI runners — so every published-figure check would look for
# "1307" in documents that correctly say "1,307". Measured: six spurious failures under C.UTF-8, which
# would have made this gate unreachable in the CI that runs it.
# python3 rather than sed: BSD sed reads `:a;s/…;ta` as one long label name, so the loop never runs and
# the function silently returns its input ungrouped. python3 is already required further down.
group() { python3 -c "import sys; print(f'{int(sys.argv[1]):,}')" "$1"; }

# Word counts, computed identically on every platform. `wc -w` is NOT portable for this: BSD's splits
# on characters glibc's does not. `author-\u2260-reviewer` in references/platforms.md counts as two words
# on macOS and one on Linux, and three more lines in the v1 archive do the same — so the same tree gave
# 6,047/43,822 on the machine that published those figures and 6,046/43,819 in CI, and this gate could
# never pass on both. It never did: CI failed on every run from the day it was added.
# python3 splits on Unicode whitespace and nothing else, which is what the figures always meant.
words() { python3 -c '
import sys, io
print(sum(len(io.open(f, encoding="utf-8", errors="replace").read().split()) for f in sys.argv[1:]))' "$@"; }

ok()  { printf '  ok    %s\n' "$1"; }
bad() { printf '  FAIL  %s\n' "$1"; fail=$((fail+1)); }
chk() { if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1: expected '$3', got '$2'"; fi; }

echo "== layout =="
[ -f three-loop-workflow/SKILL.md ] && ok "SKILL.md present" || bad "SKILL.md missing"
chk "shipped skill file count" "$(find three-loop-workflow -type f | wc -l | tr -d ' ')" "10"
chk "reference count"          "$(find three-loop-workflow/references -name '*.md' | wc -l | tr -d ' ')" "7"
chk "shipped script count"     "$(find three-loop-workflow/scripts -type f | wc -l | tr -d ' ')" "2"
chk "fixture count"            "$(find tests/scenarios -name 's*.md' | wc -l | tr -d ' ')" "11"
# Every fixture must be declared in expected.json, and every declaration must have a fixture. The
# answers live outside the scenario text on purpose; a fixture with no expected answer is never scored
# and a declaration with no fixture is never run, and neither shows up as a failure on its own.
_fx=$(find tests/scenarios -name 's*.md' -exec basename {} \; | sort | tr '\n' ' ')
_ex=$(python3 -c "import json;print(' '.join(sorted(json.load(open('tests/expected.json')))) + ' ')")
chk "every fixture is declared in expected.json" "$_fx" "$_ex"
# ...and that the RUNNER will actually run them. tests/run-scenarios.js is a Workflow script and has no
# filesystem, so its fixture list is a literal. Adding a scenario file therefore does not add it to the
# run, and the suite reports green over whatever subset the literal happens to name — which is how two
# fixtures added on 2026-07-31 were silently not run while the suite still passed. Only the gate can see
# both sides, so the gate is where they are compared.
_rf=$(python3 -c "
import re
s = open('tests/run-scenarios.js').read()
m = re.search(r\"input\.fixtures \|\| \[(.*?)\]\", s, re.S)
print(' '.join(sorted(re.findall(r\"'([^']+)'\", m.group(1)))) + ' ' if m else 'UNPARSEABLE')")
chk "the runner's fixture list matches the fixtures on disk" "$_rf" "$_ex"

echo "== version agrees with the changelog, in both languages =="
# Derived, not hardcoded: the old script carried a literal that had to be hand-edited every release,
# which is one more place for the version to drift.
v_skill=$(sed -n 's/^  version: "\(.*\)"/\1/p' three-loop-workflow/SKILL.md)
v_log=$(sed -n 's/^## v\([0-9][0-9.]*\).*/\1/p' CHANGELOG.md | head -1)
v_log_cn=$(sed -n 's/^## v\([0-9][0-9.]*\).*/\1/p' CHANGELOG-cn.md | head -1)
chk "SKILL.md frontmatter matches the newest CHANGELOG entry" "$v_skill" "$v_log"
chk "CHANGELOG-cn newest entry matches CHANGELOG"             "$v_log_cn" "$v_log"

echo "== the shipped scripts parse, declare meta, and avoid the forbidden primitives =="
for f in three-loop-workflow/scripts/phase.js tests/run-scenarios.js; do
  if bash three-loop-workflow/scripts/check-workflow-syntax.sh "$f" >/dev/null 2>&1; then
    ok "workflow-syntax $f"
  else
    bad "workflow-syntax $f"
  fi
done

echo "== the syntax gate fails on what it claims to catch ==" 
# Committed fixtures, so the two new behaviours have a reproducible failing case. Without this the gate
# was only ever exercised in the passing direction, and a regression to a no-op would go unnoticed —
# the same asymmetry the execution harnesses exist to remove.
for f in tests/gate-fixtures/reject-*.js; do
  if bash three-loop-workflow/scripts/check-workflow-syntax.sh "$f" >/dev/null 2>&1; then
    bad "the syntax gate ACCEPTED $f, which it must reject"
  else
    ok "syntax gate rejects $(basename "$f")"
  fi
done
for f in tests/gate-fixtures/accept-*.js; do
  if bash three-loop-workflow/scripts/check-workflow-syntax.sh "$f" >/dev/null 2>&1; then
    ok "syntax gate accepts $(basename "$f")"
  else
    bad "the syntax gate REJECTED $f, which is legal"
  fi
done

echo "== phase.js control flow, asserted by execution =="
if node scripts/sim-phase.js >/tmp/_sim.out 2>&1; then
  ok "every phase.js invariant holds ($(grep -c '^  ok' /tmp/_sim.out | tr -d ' ') asserted)"
else
  bad "a phase.js invariant is broken:"; grep -A1 '^  FAIL' /tmp/_sim.out
fi
rm -f /tmp/_sim.out

echo "== the two-arm suite computes its own verdict =="
if node scripts/sim-scenarios.js >/tmp/_scen.out 2>&1; then
  ok "the scoring arithmetic is correct ($(grep -c '^  ok' /tmp/_scen.out | tr -d ' ') rules asserted)"
else
  bad "a scenario-scoring rule is broken:"; grep -A1 '^  FAIL' /tmp/_scen.out
fi
rm -f /tmp/_scen.out
# Two token greps used to sit here, asserting that `suite_pass` is computed and absent from any agent
# schema. Both were bypassable — `const suite_pass = reading.suite_pass && false &&` satisfies the first,
# and a double-quoted schema entry evades the second — so they claimed more than they checked, against
# this file's own rule at the top. Deleted rather than patched: sim-scenarios.js above catches the
# semantic version of both, by execution, and negative-test.sh proves it can.

# The runner's floor catches a reply that labels everything `guard`, but `kind` is agent-reported and a
# Workflow script cannot read expected.json. This reads it here, deterministically.
n_disc=$(python3 -c "import json;print(sum(1 for v in json.load(open('tests/expected.json')).values() if v.get('kind')=='discriminating'))")
if [ "$n_disc" -ge 1 ]; then
  ok "expected.json declares $n_disc discriminating fixture(s)"
else
  bad "expected.json declares no discriminating fixture — the suite could only measure regressions"
fi

echo "== and that harness can actually fail =="
if bash scripts/negative-test.sh >/tmp/_neg.out 2>&1; then
  ok "every mutation detected ($(grep -c '^  detected' /tmp/_neg.out | tr -d ' ') of them)"
else
  bad "a mutation SURVIVED — the invariant harness is not asserting what it claims:"
  grep 'SURVIVED\|ERROR' /tmp/_neg.out
fi
rm -f /tmp/_neg.out

echo "== one plan directory per task =="
for f in SKILL.md references/plan.md references/build.md references/close.md references/escalation.md \
         references/orchestration.md references/maintenance.md; do
  grep -qF '.agent/<task>' "three-loop-workflow/$f" \
    && ok "per-task plan path in $f" || bad "$f prescribes a shared plan path"
done
grep -qE "^  planPath,\s*$" three-loop-workflow/scripts/phase.js \
  && ok "phase.js planPath has no default" || bad "phase.js defaults planPath"
grep -qi 'Leave the task' three-loop-workflow/references/close.md \
  && ok "close.md keeps the task directory" || bad "close.md deletes the plan"

echo "== the shipped skill states rules, not statistics =="
if grep -rqE '[0-9]+(\.[0-9]+)?%|percentage points|116 findings' three-loop-workflow/; then
  bad "a statistic is back in the shipped skill:"
  grep -rnE '[0-9]+(\.[0-9]+)?%|percentage points|116 findings' three-loop-workflow/
else
  ok "no statistics anywhere in the shipped skill"
fi
grep -qF '56.5%' docs/why-v2.md && grep -qF '56.5%' docs/why-v2-cn.md \
  && ok "the measurement is preserved in both articles" || bad "the measurement was lost, not relocated"
# Repointed 2026-07-30. The old wording ("a third mostly repeated the second") was a coverage claim that
# re-analysis of the same data contradicted depending on the denominator, and the artifacts were never
# kept. The rationale it protected still has to survive — as the cost decision it actually is.
grep -qi 'stopping at two is a \*\*cost\*\* decision' three-loop-workflow/references/plan.md \
  && ok "stop-at-two rationale survives as prose" || bad "stop-at-two rationale lost with the numbers"
grep -qi 'clean first review is weak evidence' three-loop-workflow/references/plan.md \
  && ok "clean-first-review corollary survives" || bad "clean-first-review corollary lost"
# The coverage claim about a third reviewer is retired: re-analysis of the same data contradicted it
# depending on the denominator, and the artifacts were never kept. plan.md carries the cost framing.
# This check exists because the claim was corrected in plan.md and left standing in SKILL.md — the
# fix-at-the-cited-line failure this repo has already paid for once, committed again while retiring it.
if grep -rq 'third mostly repeat' three-loop-workflow/; then
  bad "the retired third-reviewer coverage claim is back in the shipped skill:"
  grep -rn 'third mostly repeat' three-loop-workflow/
else
  ok "the third-reviewer coverage claim stays retired across the whole shipped skill"
fi

# Scope note: the sweeps below run over the SHIPPED surface — the skill, the tests, the release
# workflow — where a stale reference misroutes a reader or a script. Deliberately out of scope:
#   .agent/                             gitignored working state
#   docs/design/, docs/implementation/, CHANGELOG*   frozen history; retro-editing is forbidden
#   README*, docs/why-v2*, docs/announcement*, CLAUDE.md   describe v1 in the past tense on purpose
# The last group is re-checked positively below, so the exclusion cannot hide a live reference.
V1='loop-1-design|loop-2-implementation|loop-3-|l3-phase|check-consistency|review-panel|multi-voter|optional-subagents|light-mode|end-to-end-review|escalation-rules|failure-retrospective|claude-md-integration|validate-commit-msg|require-plan'

echo "== no stale v1 or v2/ paths on the shipped surface =="
hits=$(grep -rlE "$V1" --include='*.md' --include='*.js' --include='*.sh' --include='*.yml' \
  three-loop-workflow tests .github 2>/dev/null)
[ -z "$hits" ] && ok "no stale v1 path references" || bad "stale v1 paths in: $hits"
hits=$(grep -rn 'v2/' --include='*.md' --include='*.js' --include='*.sh' --include='*.json' --include='*.yml' \
  three-loop-workflow tests .github CLAUDE.md 2>/dev/null)
[ -z "$hits" ] && ok "no v2/ path references" || bad "v2/ paths remain: $hits"
hits=$(grep -rlE '\b(L1|L2|L3)\b|Full Mode|Light Mode|two-generation' \
  --include='*.md' three-loop-workflow tests 2>/dev/null)
[ -z "$hits" ] && ok "no v1 vocabulary in skill or tests" || bad "v1 vocabulary in: $hits"

echo "== CLAUDE.md names v1 only to retire it =="
grep -qE "v1.s vocabulary .*is \*\*retired" CLAUDE.md \
  && ok "Language Policy declares v1 vocabulary retired" || bad "CLAUDE.md no longer retires v1 vocabulary"
if grep -nE "$V1" CLAUDE.md | grep -qvE 'was|were|had been|are all gone|deleted|retired|bypassable'; then
  bad "CLAUDE.md references a v1 path outside a retirement sentence:"
  grep -nE "$V1" CLAUDE.md | grep -vE 'was|were|had been|are all gone|deleted|retired|bypassable'
else
  ok "every v1 path mention in CLAUDE.md is past-tense"
fi

echo "== CLAUDE.md anchor map resolves =="
for r in "Development Workflow" "Load-Bearing Documents" "Language Policy" "Common Commands" "Engineering Norms"; do
  grep -qF "## $r" CLAUDE.md && ok "role heading: $r" || bad "role heading missing: $r"
done

echo "== recomputed metrics: v2.0.0, the release the published docs describe =="
# Recompute from the TAG, not from HEAD. Every published figure sits in a document about the v2.0.0
# release; syncing them to the working tree retro-edits history.
t0=$(mktemp -d); git archive v2.0.0 three-loop-workflow | tar -x -C "$t0"
s_v2=$(words "$t0/three-loop-workflow/SKILL.md")
p_v2=$(words "$t0/three-loop-workflow/SKILL.md" "$t0/three-loop-workflow/references"/*.md)
pr_v2=$(cat "$t0/three-loop-workflow/SKILL.md" "$t0/three-loop-workflow/references"/*.md \
  | grep -oiE '\bnever\b|\bdo not\b|\bdon'"'"'t\b|\bforbidden\b|\bmust not\b' | wc -l | tr -d ' ')
rm -rf "$t0"
tmp=$(mktemp -d); git archive v1.14.0 three-loop-workflow docs | tar -x -C "$tmp"
s_v1=$(words "$tmp/three-loop-workflow/SKILL.md")
p_v1=$(words "$tmp/three-loop-workflow/SKILL.md" "$tmp/three-loop-workflow/references"/*.md)
f_v1=$(find "$tmp/three-loop-workflow" -type f | wc -l | tr -d ' ')
pkg_v1=$(words "$tmp/three-loop-workflow/SKILL.md" "$tmp/three-loop-workflow/references"/*)
arch_v1=$(words "$tmp/docs/design"/*.md "$tmp/docs/implementation"/*.md)
pr_v1=$(cat "$tmp/three-loop-workflow/SKILL.md" "$tmp/three-loop-workflow/references"/*.md \
  | grep -oiE '\bnever\b|\bdo not\b|\bdon'"'"'t\b|\bforbidden\b|\bmust not\b' | wc -l | tr -d ' ')
md1=$(git ls-tree -r --name-only v1.14.0 -- three-loop-workflow | grep -cE '\.md$')
sc1=$(git ls-tree -r --name-only v1.14.0 -- three-loop-workflow | grep -cE '\.(sh|js)$')
rm -rf "$tmp"
d_v1=$(python3 -c "print(f'{1000*$pr_v1/$p_v1:.2f}')")
d_v2=$(python3 -c "print(f'{1000*$pr_v2/$p_v2:.2f}')")
echo "     v2.0.0: SKILL.md=$s_v2 prose=$p_v2 prohibitions=$pr_v2 ($d_v2/1k)"
echo "     v1.14.0: SKILL.md=$s_v1 prose=$p_v1 files=$f_v1 package=$pkg_v1 archive=$arch_v1 prohibitions=$pr_v1 ($d_v1/1k)"

echo "== the always-loaded surface has not bloated =="
# Anti-bloat is held by review, not by a ceiling — v1 reached 2,915 words under a numeric cap, which is
# why the cap is not the mechanism. This is a backstop against silent drift, set well above the
# reviewed size, not the thing that keeps the file short.
s_now=$(words three-loop-workflow/SKILL.md)
[ "$s_now" -le 1500 ] && ok "SKILL.md is $s_now words (backstop 1500)" \
                      || bad "SKILL.md has drifted to $s_now words — re-review before raising the backstop"

echo "== published numbers match the recomputation =="
DOCS="README.md README-cn.md CHANGELOG.md CHANGELOG-cn.md docs/announcement-v2.0.0.md docs/announcement-v2.0.0-cn.md docs/why-v2.md docs/why-v2-cn.md"
want() {
  n=$(group "$1")
  if grep -qF "$n" $DOCS 2>/dev/null || grep -qF "$1" $DOCS 2>/dev/null; then
    ok "$2 = $n appears in published docs"
  else
    bad "$2 = $n appears in NO published doc (stale number?)"
  fi
}
want "$s_v2" "v2 SKILL.md words"; want "$p_v2" "v2 prose words"
want "$s_v1" "v1 SKILL.md words"; want "$p_v1" "v1 prose words"
want "$pkg_v1" "v1 package words"; want "$arch_v1" "v1 per-task archive words"

# The error that matters more: a number published that the tree contradicts. Enumerate EVERY
# comma-formatted figure and every "<n> words" figure across all eight docs and require each to be a
# recomputed value or a named historical constant.
# 6,047 and 43,822 are the same two measurements taken with BSD `wc -w`, which splits on U+2260.
# They are published in the v2.0.0 documents and stay there; the portable values are published
# beside them. Allowed as historical constants because that is exactly what they now are.
ALLOW_HIST="2,920 2,888 1,000 90 6,047 43,822"
for n in $(grep -ohE '[0-9]+,[0-9]{3}' $DOCS | sort -u; \
           grep -ohE '[0-9][0-9,]*[[:space:]]*(words|词)' $DOCS | grep -oE '^[0-9][0-9,]*' | sort -u); do
  raw=${n//,/}
  case "$raw" in
    "$s_v1"|"$s_v2"|"$p_v1"|"$p_v2"|"$arch_v1"|"$pkg_v1") ok "published $n is a recomputed value" ;;
    *) if printf '%s\n' $ALLOW_HIST | grep -qx "$n"; then ok "published $n is an allowed historical constant"
       else bad "published $n matches nothing recomputed and is not an allowed constant"; fi ;;
  esac
done
for lit in "$pr_v1" "$pr_v2" "$d_v1" "$d_v2"; do
  grep -qF "$lit" docs/why-v2.md    && ok "prohibition figure $lit in why-v2.md"    || bad "prohibition figure $lit is NOT what why-v2.md publishes"
  grep -qF "$lit" docs/why-v2-cn.md && ok "prohibition figure $lit in why-v2-cn.md" || bad "prohibition figure $lit is NOT what why-v2-cn.md publishes"
done

echo "== cross-file claim consistency =="
ALLMD="README.md README-cn.md CLAUDE.md CHANGELOG.md CHANGELOG-cn.md docs/announcement-v2.0.0.md docs/announcement-v2.0.0-cn.md docs/why-v2.md docs/why-v2-cn.md tests/README.md"
h=$(grep -n 'all 20 v1\|20 v1 files\|20 个 v1 文件' $ALLMD 2>/dev/null)
[ -z "$h" ] && ok "leftover-file count is 18 everywhere" || bad "stale '20 v1 files' claim: $h"
h=$(grep -rn '\.agent/accept\.sh' $ALLMD three-loop-workflow tests 2>/dev/null)
[ -z "$h" ] && ok "no reference to the abolished shared .agent/accept.sh path" || bad "abolished path referenced: $h"
chk "v1 Markdown + script split sums to the file count" "$((md1+sc1))" "$f_v1"
# The Chinese alternatives here used to be written with Arabic numerals (`5 个 fixture`,
# `7 个 fixture 里有 5`) while every Chinese document in this repo writes the claim with Chinese
# numerals — so neither could ever match the text it guarded. Both were demonstrated dead and are
# rewritten below; each new pattern was watched to fire on a planted sentence before this shipped.
h=$(grep -n '5 of 6\|5 of 7\|七个 fixture 里有五个\|六个 fixture 里有五个' $ALLMD 2>/dev/null)  # tally-exempt: matcher
[ -z "$h" ] && ok "no '5 of 6'/'5 of 7' misstatement of the control-arm result, in either language" || bad "inconsistent fixture result: $h"

# The guards inventory, RECOMPUTED from expected.json rather than compared against a literal. It went
# stale twice and silently: the suite grew on 2026-07-30 and again on 2026-07-31, and "six of the
# seven" survived in eight places until 2026-08-11, three of them inside scripts/ and tests/. The deny-list above could not see
# it, because it guards a different claim that happens to share a phrasing — the CONTROL-ARM result,
# which is a dated measurement and must not be swept with this one.
# Spelled out because that is how the documents say it; the lookup covers the range a fixture suite
# plausibly reaches, and the check fails loudly rather than silently if it is ever exceeded.
_num() { case "$1" in
  1) echo one;; 2) echo two;; 3) echo three;; 4) echo four;; 5) echo five;; 6) echo six;;
  7) echo seven;; 8) echo eight;; 9) echo nine;; 10) echo ten;; 11) echo eleven;; 12) echo twelve;;
  13) echo thirteen;; 14) echo fourteen;; 15) echo fifteen;; 16) echo sixteen;; 17) echo seventeen;;
  18) echo eighteen;; 19) echo nineteen;; 20) echo twenty;; *) echo "OUT-OF-RANGE";; esac; }
_cnum() { case "$1" in
  1) echo 一;; 2) echo 二;; 3) echo 三;; 4) echo 四;; 5) echo 五;; 6) echo 六;; 7) echo 七;;
  8) echo 八;; 9) echo 九;; 10) echo 十;; 11) echo 十一;; 12) echo 十二;; 13) echo 十三;;
  14) echo 十四;; 15) echo 十五;; 16) echo 十六;; 17) echo 十七;; 18) echo 十八;; 19) echo 十九;;
  20) echo 二十;; *) echo "OUT-OF-RANGE";; esac; }
_tot=$(python3 -c "import json;print(len(json.load(open('tests/expected.json'))))")
_grd=$(python3 -c "import json;print(sum(1 for v in json.load(open('tests/expected.json')).values() if v['kind']=='guard'))")
_en_g=$(_num "$_grd"); _en_t=$(_num "$_tot"); _cn_g=$(_cnum "$_grd"); _cn_t=$(_cnum "$_tot")
case "$_en_g$_en_t$_cn_g$_cn_t" in
  *OUT-OF-RANGE*) bad "the fixture tally ($_grd of $_tot) is outside the number lookup — extend _num/_cnum" ;;
  *)
    # Every site the 2026-08-11 sweep corrected, not just the prose ones. The first version of this
    # check covered three of eight; the other five — both README directory-tree lines, the comment in
    # tests/run-scenarios.js, the assertion label in scripts/sim-scenarios.js and this script's own
    # comment below — were each demonstrated to go stale again with the gate still green.
    # Loose on the article so "ten of eleven" and "ten of the eleven" both satisfy it; the tally itself
    # is what is pinned.
    # Scans EVERY occurrence rather than asking whether the file mentions the tally somewhere. A
    # presence check is satisfied by one correct sentence while a second one in the same file says
    # something else — demonstrated on both READMEs, which carry the claim twice each, and it is the
    # "check that cannot fail" shape this repo has shipped twice.
    _bad=$(EN_G="$_en_g" EN_T="$_en_t" CN_G="$_cn_g" CN_T="$_cn_t" python3 - <<'PYEOF'
import io, os, re
en_g, en_t = os.environ["EN_G"], os.environ["EN_T"]
cn_g, cn_t = os.environ["CN_G"], os.environ["CN_T"]
WORD = r"(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)"
EN = re.compile(rf"\b({WORD}) of (?:the )?({WORD})\b", re.I)
CN = re.compile(r"([〇零一二三四五六七八九十]+)个 fixture 里有([〇零一二三四五六七八九十]+)个")
FILES = ["CLAUDE.md", "README.md", "README-cn.md", "tests/README.md",
         "tests/run-scenarios.js", "scripts/sim-scenarios.js", "scripts/accept-release.sh"]
DATED = {"tests/README.md"}   # records a measurement, not the inventory; must NOT track the tally
out = []
for f in FILES:
    try: lines = io.open(f, encoding="utf-8").read().splitlines()
    except FileNotFoundError: out.append(f"{f}: missing"); continue
    for i, ln in enumerate(lines, 1):
        if not re.search(r"fixture|guard", ln, re.I): continue
        if "tally-exempt" in ln: continue   # a matcher quoting the wrong forms on purpose
        for m in EN.finditer(ln):
            a, b = m.group(1).lower(), m.group(2).lower()
            if (a, b) == (en_g, en_t): continue
            if f in DATED: continue
            out.append(f"{f}:{i}: '{m.group(0)}' is not the recomputed {en_g} of {en_t}")
        for m in CN.finditer(ln):
            if (m.group(1), m.group(2)) == (cn_t, cn_g): continue
            out.append(f"{f}:{i}: '{m.group(0)}' is not the recomputed {cn_t}/{cn_g}")
print("\n".join(out))
PYEOF
)
    if [ -z "$_bad" ]; then
      ok "every stated guards inventory matches the recomputed tally ($_grd of $_tot)"
    else
      bad "a stated guards inventory disagrees with expected.json:"; printf '%s\n' "$_bad" | sed 's/^/        /'
    fi
    # The control-arm measurement is a different claim and is deliberately NOT recomputed: it records
    # what one dated run observed on the suite as it stood, and rewriting it would publish a result
    # nobody has measured.
    grep -qF "6 of its 7 fixtures are answered correctly by the control arm" tests/README.md \
      && ok "the dated control-arm measurement is left as written" \
      || bad "tests/README.md's control-arm measurement was edited — it is a dated result, not an inventory"
    ;;
esac

echo "== the suite's headline claim is stated accurately =="
# Ten of the eleven fixtures are guards, for which both arms answering correctly is GUARD-HELD — a pass.
# An unqualified "a fixture both arms pass is INVALID" describes the suite that is not running.
# Paragraph-scoped and bilingual. A line-scoped grep missed docs/why-v2.md, whose claim wraps across two
# lines so that "both arms" and "INVALID" never share one, and it never inspected the four Chinese
# documents at all. Demonstrated: reverting why-v2.md alone left the old check silent.
if python3 - <<'PYCHK'
import io, re, sys
DOCS = ["README.md","README-cn.md","CLAUDE.md","tests/README.md",
        "CHANGELOG.md","CHANGELOG-cn.md","docs/why-v2.md","docs/why-v2-cn.md",
        "docs/announcement-v2.0.0.md","docs/announcement-v2.0.0-cn.md"]
CLAIM = re.compile(r"both arms|两臂都答对|两条臂都答对")
VERDICT = re.compile(r"INVALID|not evidence about the skill|fails on any fixture")
QUALIFIER = re.compile(r"discriminating|区分性|guard|6 of 7|six of seven|七个 fixture 里有六个|六个是")  # tally-exempt: matcher
bad = []
for d in DOCS:
    try: text = io.open(d, encoding="utf-8").read()
    except FileNotFoundError: continue
    for para in re.split(r"\n\s*\n", text):
        flat = " ".join(para.split())
        if CLAIM.search(flat) and VERDICT.search(flat) and not QUALIFIER.search(flat):
            bad.append(f"{d}: {flat[:150]}")
for b in bad: print(b)
sys.exit(1 if bad else 0)
PYCHK
then
  ok "every both-arms claim carries its qualifier, in both languages"
else
  bad "an unqualified both-arms-pass claim survives (listed above)"
fi

echo "== the install commands actually install =="
for r in README.md README-cn.md; do
  line=$(grep -n 'cp -r three-loop-workflow' "$r" | head -1)
  if grep -qE 'mkdir -p .*\.claude/skills' "$r"; then ok "$r creates the target directory first"
  else bad "$r:$line copies into a possibly-absent directory — cp lands the contents one level too high"; fi
done
# Run the README's OWN commands, extracted from it. The previous version of this check hand-wrote its
# own `mkdir -p` and so passed whatever the README said — demonstrably: it printed ok on a tree where
# the two checks above correctly reported the mkdir missing.
root=$(pwd)
t=$(mktemp -d)
mkdir -p "$t/repo/.claude"   # Claude Code has run here; no skill was ever installed
sed -n '/^# Project-level/,/^$/p' README.md | grep -E '^(mkdir|cp) ' \
  | sed "s|<your-repo>|$t/repo|g" > "$t/install.sh"
if [ -s "$t/install.sh" ]; then
  ( cd "$root" && bash "$t/install.sh" ) >/dev/null
  if [ -f "$t/repo/.claude/skills/three-loop-workflow/SKILL.md" ]; then
    ok "the README's own install commands land SKILL.md at .claude/skills/three-loop-workflow/"
  else
    bad "the README's own install commands misplace SKILL.md (landed at: $(find "$t/repo/.claude" -name SKILL.md | head -1))"
  fi
else
  bad "no install command could be extracted from README.md"
fi
rm -rf "$t"

# PROSE-PRESENCE ONLY, and deliberately labelled as such. These two rules live in prose and have no
# executable consequence, so no check here can distinguish "the rule is stated" from "the rule is
# stated correctly" — text saying the opposite would also match. That is the check-consistency.sh
# failure mode, and the honest response is to name the limit rather than to dress presence up as
# verification. Behavioural coverage for these two rules needs two-arm fixtures; see the Close notes.
echo "== the skill mentions the two rules P5 added (presence only, not verification) =="
grep -qiE 'if no guide exists, or a role is missing' three-loop-workflow/SKILL.md \
  && ok "SKILL.md mentions the missing-guide fallback" \
  || bad "SKILL.md no longer mentions what to do when the project guide or a role is missing"
grep -qiE 'read the result as a product, not as a diff' three-loop-workflow/references/close.md \
  && ok "close.md mentions the whole-artifact read" \
  || bad "close.md no longer mentions the whole-artifact read"

echo "== README paths exist =="
for p in $(grep -oE '\(\./[A-Za-z0-9_./-]+\)' README.md | tr -d '()'); do
  [ -e "$p" ] && ok "README path $p" || bad "README path missing: $p"
done

echo "== bilingual pairs quote the same figures =="
for pair in "README.md:README-cn.md" "CHANGELOG.md:CHANGELOG-cn.md" \
            "docs/why-v2.md:docs/why-v2-cn.md" \
            "docs/announcement-v2.0.0.md:docs/announcement-v2.0.0-cn.md"; do
  a=${pair%%:*}; b=${pair##*:}
  { [ -f "$a" ] && [ -f "$b" ]; } || { bad "missing half of pair $pair"; continue; }
  for val in "$s_v1" "$s_v2" "$p_v1" "$p_v2" "$pkg_v1" "$arch_v1"; do
    fv=$(group "$val")
    ca=$(grep -oF "$fv" "$a" 2>/dev/null | wc -l | tr -d ' ')
    cb=$(grep -oF "$fv" "$b" 2>/dev/null | wc -l | tr -d ' ')
    # 0 in both is agreement, not coverage — only report the disagreement.
    [ "$ca" = "$cb" ] || bad "$fv cited ${ca}x in $a but ${cb}x in $b"
  done
  ok "pair $a / $b quotes every recomputed figure the same number of times"
done

echo "== the round-cap experiment's published figures are recomputed from its raw data =="
# Same discipline as the release figures above, applied to the experiment: a number in either results
# document must be one `exp-analyse.mjs` recomputes from the committed raw artifacts, and the two
# language versions must quote each distinctive figure the same number of times.
#
# Watched to fail before being trusted, on 2026-07-31: with `67 confirmed findings` altered to `68` in
# the English document, this script exited 0 — the hole — while `exp-analyse.mjs` exited 1. It is the
# wiring that was missing, not the check. `scripts/negative-test.sh` now keeps that demonstration.
#
# The analysis also asserts the raw data against itself: the per-round series reconstructed from the
# journal has to agree with what phase.js returned, or neither is usable.
EXP_RAW=docs/measurements/2026-07-30-round-cap/raw
EXP_DOCS="docs/2026-07-31-round-cap-experiment.md docs/2026-07-31-round-cap-experiment-cn.md"
if [ -d "$EXP_RAW" ]; then
  if node scripts/exp-analyse.mjs --raw "$EXP_RAW" --docs $EXP_DOCS >/dev/null 2>/tmp/_exp.out; then
    ok "every experiment figure is recomputed and the two languages agree"
  else
    bad "an experiment figure disagrees with the raw data:"; sed -n '1,12p' /tmp/_exp.out
  fi
  rm -f /tmp/_exp.out
else
  bad "the round-cap experiment's raw artifacts are missing — the results documents cannot be checked"
fi

echo "== packaged .skill carries the skill and nothing else =="
pkg=$(mktemp -d)/x.skill
zip -qr "$pkg" three-loop-workflow/
chk "archive entry count" "$(unzip -Z1 "$pkg" | grep -vc '/$')" "10"
unzip -Z1 "$pkg" | grep -qE "$V1" && bad "a v1 file is inside the .skill" || ok "no v1 file in .skill"
unzip -Z1 "$pkg" | grep -q 'three-loop-workflow/SKILL.md' && ok "SKILL.md in .skill" || bad "SKILL.md not in .skill"
rm -rf "$(dirname "$pkg")"

echo
if [ "$fail" -eq 0 ]; then echo "ACCEPT: all checks passed"; else echo "ACCEPT: $fail check(s) FAILED"; fi
exit "$fail"
