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

fail=0
ok()  { printf '  ok    %s\n' "$1"; }
bad() { printf '  FAIL  %s\n' "$1"; fail=$((fail+1)); }
chk() { if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1: expected '$3', got '$2'"; fi; }

echo "== layout =="
[ -f three-loop-workflow/SKILL.md ] && ok "SKILL.md present" || bad "SKILL.md missing"
chk "shipped skill file count" "$(find three-loop-workflow -type f | wc -l | tr -d ' ')" "8"
chk "reference count"          "$(find three-loop-workflow/references -name '*.md' | wc -l | tr -d ' ')" "5"
chk "shipped script count"     "$(find three-loop-workflow/scripts -type f | wc -l | tr -d ' ')" "2"
chk "fixture count"            "$(find tests/scenarios -name 's*.md' | wc -l | tr -d ' ')" "7"

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

echo "== phase.js control flow, asserted by execution =="
if node scripts/sim-phase.js >/tmp/_sim.out 2>&1; then
  ok "every phase.js invariant holds ($(grep -c '^  ok' /tmp/_sim.out | tr -d ' ') asserted)"
else
  bad "a phase.js invariant is broken:"; grep -A1 '^  FAIL' /tmp/_sim.out
fi
rm -f /tmp/_sim.out

echo "== and that harness can actually fail =="
if bash scripts/negative-test.sh >/tmp/_neg.out 2>&1; then
  ok "every mutation detected ($(grep -c '^  detected' /tmp/_neg.out | tr -d ' ') of them)"
else
  bad "a mutation SURVIVED — the invariant harness is not asserting what it claims:"
  grep 'SURVIVED\|ERROR' /tmp/_neg.out
fi
rm -f /tmp/_neg.out

echo "== one plan directory per task =="
for f in SKILL.md references/plan.md references/build.md references/close.md references/escalation.md; do
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
grep -qi 'a third mostly repeat' three-loop-workflow/references/plan.md \
  && ok "stop-at-two rationale survives as prose" || bad "stop-at-two rationale lost with the numbers"
grep -qi 'clean first review is weak evidence' three-loop-workflow/references/plan.md \
  && ok "clean-first-review corollary survives" || bad "clean-first-review corollary lost"

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
s_v2=$(wc -w < "$t0/three-loop-workflow/SKILL.md" | tr -d ' ')
p_v2=$(cat "$t0/three-loop-workflow/SKILL.md" "$t0/three-loop-workflow/references"/*.md | wc -w | tr -d ' ')
pr_v2=$(cat "$t0/three-loop-workflow/SKILL.md" "$t0/three-loop-workflow/references"/*.md \
  | grep -oiE '\bnever\b|\bdo not\b|\bdon'"'"'t\b|\bforbidden\b|\bmust not\b' | wc -l | tr -d ' ')
rm -rf "$t0"
tmp=$(mktemp -d); git archive v1.14.0 three-loop-workflow docs | tar -x -C "$tmp"
s_v1=$(wc -w < "$tmp/three-loop-workflow/SKILL.md" | tr -d ' ')
p_v1=$(cat "$tmp/three-loop-workflow/SKILL.md" "$tmp/three-loop-workflow/references"/*.md | wc -w | tr -d ' ')
f_v1=$(find "$tmp/three-loop-workflow" -type f | wc -l | tr -d ' ')
pkg_v1=$(cat "$tmp/three-loop-workflow/SKILL.md" "$tmp/three-loop-workflow/references"/* | wc -w | tr -d ' ')
arch_v1=$(cat "$tmp/docs/design"/*.md "$tmp/docs/implementation"/*.md | wc -w | tr -d ' ')
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
s_now=$(wc -w < three-loop-workflow/SKILL.md | tr -d ' ')
[ "$s_now" -le 1500 ] && ok "SKILL.md is $s_now words (backstop 1500)" \
                      || bad "SKILL.md has drifted to $s_now words — re-review before raising the backstop"

echo "== published numbers match the recomputation =="
DOCS="README.md README-cn.md CHANGELOG.md CHANGELOG-cn.md docs/announcement-v2.0.0.md docs/announcement-v2.0.0-cn.md docs/why-v2.md docs/why-v2-cn.md"
want() {
  n=$(printf "%'d" "$1")
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
ALLOW_HIST="2,920 2,888 1,000 90"
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
h=$(grep -n '5 of 6\|5 of 7\|5 个 fixture\|7 个 fixture 里有 5' $ALLMD 2>/dev/null)
[ -z "$h" ] && ok "control-arm result stated as 6 of 7 everywhere" || bad "inconsistent fixture result: $h"

echo "== the suite's headline claim is stated accurately =="
# Six of seven fixtures are guards, for which both arms answering correctly is GUARD-HELD — a pass.
# An unqualified "a fixture both arms pass is INVALID" describes the suite that is not running.
h=$(grep -rn 'both arms' $ALLMD tests/README.md 2>/dev/null \
      | grep -iE 'INVALID|not evidence|fails on any' \
      | grep -viE 'discriminating|guard|6 of 7|six of seven')
[ -z "$h" ] && ok "every both-arms claim carries the discriminating qualifier" \
            || bad "unqualified both-arms-pass claim:
$h"

echo "== the install commands actually install =="
for r in README.md README-cn.md; do
  line=$(grep -n 'cp -r three-loop-workflow' "$r" | head -1)
  if grep -qE 'mkdir -p .*\.claude/skills' "$r"; then ok "$r creates the target directory first"
  else bad "$r:$line copies into a possibly-absent directory — cp lands the contents one level too high"; fi
done
t=$(mktemp -d); mkdir -p "$t/repo/.claude"
(cd "$t/repo" && mkdir -p .claude/skills && cp -r "$(git -C "$OLDPWD" rev-parse --show-toplevel)/three-loop-workflow" .claude/skills/ 2>/dev/null)
[ -f "$t/repo/.claude/skills/three-loop-workflow/SKILL.md" ] \
  && ok "the documented install lands SKILL.md at .claude/skills/three-loop-workflow/SKILL.md" \
  || bad "the documented install misplaces SKILL.md"
rm -rf "$t"

echo "== the skill handles a repo it was not written for =="
grep -qiE 'no (project )?guide|neither exists|if none exists|absent' three-loop-workflow/SKILL.md \
  && ok "SKILL.md says what to do when the project guide is missing" \
  || bad "SKILL.md dereferences roles with no fallback for a repo that has no guide or anchor map"
grep -qiE 'as a product|whole artifact|no diff' three-loop-workflow/references/close.md \
  && ok "close.md carries the whole-artifact read" \
  || bad "close.md is missing the whole-artifact read"

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
    fv=$(printf "%'d" "$val")
    ca=$(grep -oF "$fv" "$a" 2>/dev/null | wc -l | tr -d ' ')
    cb=$(grep -oF "$fv" "$b" 2>/dev/null | wc -l | tr -d ' ')
    # 0 in both is agreement, not coverage — only report the disagreement.
    [ "$ca" = "$cb" ] || bad "$fv cited ${ca}x in $a but ${cb}x in $b"
  done
  ok "pair $a / $b quotes every recomputed figure the same number of times"
done

echo "== packaged .skill carries the skill and nothing else =="
pkg=$(mktemp -d)/x.skill
zip -qr "$pkg" three-loop-workflow/
chk "archive entry count" "$(unzip -Z1 "$pkg" | grep -vc '/$')" "8"
unzip -Z1 "$pkg" | grep -qE "$V1" && bad "a v1 file is inside the .skill" || ok "no v1 file in .skill"
unzip -Z1 "$pkg" | grep -q 'three-loop-workflow/SKILL.md' && ok "SKILL.md in .skill" || bad "SKILL.md not in .skill"
rm -rf "$(dirname "$pkg")"

echo
if [ "$fail" -eq 0 ]; then echo "ACCEPT: all checks passed"; else echo "ACCEPT: $fail check(s) FAILED"; fi
exit "$fail"
