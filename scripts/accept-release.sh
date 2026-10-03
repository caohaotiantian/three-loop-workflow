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
# The second rule exists because an earlier version pinned a script's guards with `grep -q`, which passes
# on a guard disabled with `false &&` and — where the wording also appears in a nearby comment — passes
# on a guard deleted outright. Both were demonstrated. The shipped Build-loop script and its harness were
# retired in v3.0.0 (v2.7.0 has them); the execution rule now applies to scripts/lint-skill.sh and the
# syntax gate, through scripts/negative-test.sh, which proves each of them can fail.
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

echo "== the tags the recomputations read exist =="
# Without them `git archive <tag>` fails, every recomputed figure is EMPTY, and `want()` greps for the
# empty string, which matches every line: the figure checks print `ok` carrying nothing. Name the missing
# tag here, before any of that can happen. Checkouts need full history and tags (CI: fetch-depth 0).
# v3.0.0 is deliberately absent: until it is tagged the gate reads the working tree for it.
for _t in v1.14.0 v2.0.0 v2.7.0; do
  git rev-parse -q --verify "refs/tags/$_t^{commit}" >/dev/null \
    && ok "tag $_t resolves" || bad "tag $_t is missing — fetch tags, or every figure below is computed from nothing"
done
echo "== layout =="
[ -f three-loop-workflow/SKILL.md ] && ok "SKILL.md present" || bad "SKILL.md missing"
# The exact file set, not a count: swapping LICENSE for a stray file, or adding a script beside the
# skill, keeps every count right. Adding or removing a shipped file means editing this list, the
# archive check near the end, and .github/workflows/release.yml.
SHIPPED="three-loop-workflow/LICENSE
three-loop-workflow/SKILL.md
three-loop-workflow/references/deep.md
three-loop-workflow/references/parallel.md
three-loop-workflow/references/writing.md"
got=$(find three-loop-workflow -type f | LC_ALL=C sort)
[ "$got" = "$SHIPPED" ] && ok "the shipped file set is exactly the five expected files" \
  || bad "the shipped file set differs from the expected five: $(printf '%s' "$got" | tr '\n' ' ')"
[ ! -e three-loop-workflow/scripts ] && ok "no scripts directory in the shipped skill" \
  || bad "a scripts/ directory is back in the shipped skill"
echo "== version agrees with the changelog, in both languages =="
# Derived, not hardcoded: the old script carried a literal that had to be hand-edited every release,
# which is one more place for the version to drift.
v_skill=$(sed -n 's/^  version: "\(.*\)"/\1/p' three-loop-workflow/SKILL.md)
v_log=$(sed -n 's/^## v\([0-9][0-9.]*\).*/\1/p' CHANGELOG.md | head -1)
v_log_cn=$(sed -n 's/^## v\([0-9][0-9.]*\).*/\1/p' CHANGELOG-cn.md | head -1)
chk "SKILL.md frontmatter matches the newest CHANGELOG entry" "$v_skill" "$v_log"
chk "CHANGELOG-cn newest entry matches CHANGELOG"             "$v_log_cn" "$v_log"

echo "== the repository's Workflow script parses, declares meta, and avoids the forbidden primitives =="
for f in tests/probe.js; do
  if bash scripts/check-workflow-syntax.sh "$f" >/dev/null 2>&1; then
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
  if bash scripts/check-workflow-syntax.sh "$f" >/dev/null 2>&1; then
    bad "the syntax gate ACCEPTED $f, which it must reject"
  else
    ok "syntax gate rejects $(basename "$f")"
  fi
done
for f in tests/gate-fixtures/accept-*.js; do
  if bash scripts/check-workflow-syntax.sh "$f" >/dev/null 2>&1; then
    ok "syntax gate accepts $(basename "$f")"
  else
    bad "the syntax gate REJECTED $f, which is legal"
  fi
done

echo "== and those checks can actually fail =="
if bash scripts/negative-test.sh >/tmp/_neg.out 2>&1; then
  ok "every mutation detected ($(grep -c '^  detected' /tmp/_neg.out | tr -d ' '))"
else
  bad "a mutation SURVIVED — a check is not asserting what it claims:"
  grep 'SURVIVED\|ERROR' /tmp/_neg.out
fi
rm -f /tmp/_neg.out

echo "== the shipped skill's prose properties (scripts/lint-skill.sh) =="
# One check: statistics, the retired third-reviewer claim, routing, runtime mechanism names, retired v2
# file names and plan-only provenance forms. The regexes live only in lint-skill.sh, and
# negative-test.sh proves each alternative can fail.
lint_out=$(bash scripts/lint-skill.sh three-loop-workflow 2>&1); lint_rc=$?
if [ "$lint_rc" -eq 0 ]; then
  ok "lint-skill.sh passes on the shipped skill"
else
  bad "lint-skill.sh reports $lint_rc failing check(s) on the shipped skill:"; printf '%s\n' "$lint_out"
fi
grep -qF '56.5%' docs/why-v2.md && grep -qF '56.5%' docs/why-v2-cn.md \
  && ok "the measurement is preserved in both articles" || bad "the measurement was lost, not relocated"

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
# The retired v2 surface. check-workflow-syntax and gate-fixtures are NOT in this pattern: they are live
# repository tooling now. README, CLAUDE.md and CHANGELOG are out of scope, because they name the v2
# files in the past tense.
V2='phase\.js|sim-phase|three-loop-workflow/scripts|references/(plan|build|close|escalation|orchestration|maintenance|platforms)\.md'
hits=$(grep -rnE "$V2" --include='*.md' --include='*.js' --include='*.sh' --include='*.yml' tests .github 2>/dev/null)
[ -z "$hits" ] && ok "no retired v2 files named in tests or .github" || bad "retired v2 files named in tests/.github: $hits"
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

echo "== recomputed metrics: v2.7.0 and v3.0.0, the pair docs/why-v3.md compares =="
t27=$(mktemp -d); git archive v2.7.0 three-loop-workflow | tar -x -C "$t27"
s_v27=$(words "$t27/three-loop-workflow/SKILL.md")
p_v27=$(words "$t27/three-loop-workflow/SKILL.md" "$t27/three-loop-workflow/references"/*.md)
# The Standard route: what a Standard task read in v2.7.0, SKILL.md plus the plan and build references.
r_v27=$(words "$t27/three-loop-workflow/SKILL.md" "$t27/three-loop-workflow/references/plan.md" \
              "$t27/three-loop-workflow/references/build.md")
rm -rf "$t27"
# v3 from its tag once the tag exists, from the working tree until then. Before tagging, the tree IS what
# will be tagged; after tagging, the published v3.0.0 figures are pinned to the tag, so a later release
# that edits the skill does not silently turn them into claims about a different version.
if git rev-parse -q --verify refs/tags/v3.0.0 >/dev/null; then
  t3=$(mktemp -d); git archive v3.0.0 three-loop-workflow | tar -x -C "$t3"; b3="$t3"; v3src="tag v3.0.0"
else
  t3=""; b3=.; v3src="working tree, v3.0.0 not tagged yet"
fi
s_v3=$(words "$b3/three-loop-workflow/SKILL.md")
p_v3=$(words "$b3/three-loop-workflow/SKILL.md" "$b3/three-loop-workflow/references"/*.md)
[ -n "$t3" ] && rm -rf "$t3"
echo "     v2.7.0: SKILL.md=$s_v27 prose=$p_v27 standard-route=$r_v27"
echo "     v3.0.0 ($v3src): SKILL.md=$s_v3 prose=$p_v3"

echo "== the prose surface has not bloated =="
# Anti-bloat is held by review, not by a ceiling — v1 reached 2,915 words under a numeric cap, which is
# why the cap is not the mechanism. These are backstops against silent drift, set above the reviewed
# size, never a budget to spend: the slack under each is not an allowance, and an addition that
# displaces nothing has to argue for itself in review. Two things are NOT answers to a red backstop:
# shaving synonyms to land under it, and raising it in the same commit as the growth. Re-review, then
# move the number in its own commit, with the reason written here.
budget() {
  local f="$1" cap="$2" n
  n=$(words "$f")
  [ "$n" -le "$cap" ] && ok "$f is $n words (backstop $cap)" \
                      || bad "$f has drifted to $n words (backstop $cap) — re-review before raising it"
}
# 2026-09-30 (v3.0.0): every earlier cap was REMOVED together with the file it held — the seven v2
# references are gone — not relaxed. Then the v3 word AIMS were dropped, by the owner's decision: word
# counts are a drift guard, not a design target, and the skill is built for its goal rather than for a
# number. Backstops kept, numbers moved in this commit on that decision. Reviewed sizes at the time
# (after the reviewed gap fixes): SKILL.md 1495, deep.md 581, total 2076. Each number below is that size
# plus modest headroom (about 7%, 12% and 8%, rounded), so it trips on drift nobody reviewed and on
# nothing else. Growth up to it is NOT an allowance: an addition that displaces nothing still has to
# argue for itself in review, and a number is raised only by re-review in its own commit.
# 2026-10-01: the owner asked for the bounded-domain sub-agent rule and for the lint to allow that word.
# Reviewed sizes after that rule: SKILL.md 1680, deep.md 611, total 2291. The same day the plan moved
# to a committed `.agent/<task>/plan.md`; reviewed sizes after that sentence: SKILL.md 1711, deep.md 611,
# total 2322. Headroom stays the same proportion. The slack is still not an allowance.
# 2026-10-02: the owner asked for the delegation rules. Reviewed sizes after that change, once its two
# readers and the blind cold read had re-checked it: SKILL.md 1867, deep.md 617, total 2484. SKILL.md and
# the surface take the proportions this block already names (about 7% and 8%); deep.md keeps 650, still
# above 617. Raised in its own commit, after the re-review the paragraph above requires.
# 2026-10-02, later: the same day, the owner asked for the tree a second writer works in. That added a
# third shipped file, so the surface guard moves with it, and the third reference takes a line of its own:
# reviewed sizes SKILL.md 1887, deep.md 617, references/parallel.md 345, total 2849. Each cap is its file
# plus the proportion above; the per-file numbers were reviewed with the file, and the surface in its own
# commit as before.
# 2026-10-03: the owner asked for the ASD-STE100 writing rule in the shipped skill. That adds a fourth
# shipped file and one sentence to SKILL.md. Reviewed sizes: SKILL.md 1899, deep.md 617,
# references/parallel.md 345, references/writing.md 629, total 3490. The new reference takes its own line
# below — setting a cap, not raising one, so it ships with the file — and the surface line moves in its
# own step after the re-review, as before.
# 2026-10-03, later: the owner asked for two more things in the same reference — the rule now covers
# everyday conversation, not only a change's artifacts, and the file carries the diagram, table, list and
# HTML guidance. Reviewed sizes after that: SKILL.md 1913, deep.md 617, references/parallel.md 345,
# references/writing.md 816, total 3691. The reference's own line crosses its cap here, so it moves in its
# own step after the re-review; the surface at 3691 stays under its backstop.
budget three-loop-workflow/SKILL.md                    2000
budget three-loop-workflow/references/deep.md           650
budget three-loop-workflow/references/parallel.md       375
budget three-loop-workflow/references/writing.md        700
prose_now=$(words three-loop-workflow/SKILL.md three-loop-workflow/references/*.md)
[ "$prose_now" -le 3100 ] && ok "the whole prose surface is $prose_now words (backstop 3100)" \
                          || bad "the prose surface has grown to $prose_now words — the per-file budgets can both pass while the set still grows"

echo "== published numbers match the recomputation =="
DOCS="README.md README-cn.md CHANGELOG.md CHANGELOG-cn.md docs/announcement-v2.0.0.md docs/announcement-v2.0.0-cn.md docs/why-v2.md docs/why-v2-cn.md docs/why-v3.md docs/why-v3-cn.md"
want() {
  # An empty figure (a tag that would not resolve) makes grep -F match every line. Fail it by name;
  # never print an `ok` that carries nothing.
  if [ -z "$1" ]; then bad "$2 is EMPTY — its source could not be read, so nothing was compared"; return; fi
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
want "$s_v27" "v2.7.0 SKILL.md words"; want "$p_v27" "v2.7.0 prose words"
want "$r_v27" "v2.7.0 Standard-route words"
want "$s_v3" "v3.0.0 SKILL.md words"; want "$p_v3" "v3.0.0 prose words"

# The error that matters more: a number published that the tree contradicts. Enumerate EVERY
# comma-formatted figure and every "<n> words" figure across every file in DOCS and require each to be
# a recomputed value or a named historical constant.
# 6,047 and 43,822 are the same two measurements taken with BSD `wc -w`, which splits on U+2260.
# They are published in the v2.0.0 documents and stay there; the portable values are published
# beside them. Allowed as historical constants because that is exactly what they now are.
ALLOW_HIST="2,920 2,888 1,000 90 6,047 43,822"
for n in $(grep -ohE '[0-9]+,[0-9]{3}' $DOCS | sort -u; \
           grep -ohE '[0-9][0-9,]*[[:space:]]*(words|词)' $DOCS | grep -oE '^[0-9][0-9,]*' | sort -u); do
  raw=${n//,/}
  case "$raw" in
    "$s_v1"|"$s_v2"|"$p_v1"|"$p_v2"|"$arch_v1"|"$pkg_v1"|"$s_v27"|"$p_v27"|"$r_v27"|"$s_v3"|"$p_v3")
       ok "published $n is a recomputed value" ;;
    *) if printf '%s\n' $ALLOW_HIST | grep -qx "$n"; then ok "published $n is an allowed historical constant"
       else bad "published $n matches nothing recomputed and is not an allowed constant"; fi ;;
  esac
done
for lit in "$pr_v1" "$pr_v2" "$d_v1" "$d_v2"; do
  if [ -z "$lit" ]; then bad "a prohibition figure is EMPTY — its source could not be read"; continue; fi
  grep -qF "$lit" docs/why-v2.md    && ok "prohibition figure $lit in why-v2.md"    || bad "prohibition figure $lit is NOT what why-v2.md publishes"
  grep -qF "$lit" docs/why-v2-cn.md && ok "prohibition figure $lit in why-v2-cn.md" || bad "prohibition figure $lit is NOT what why-v2-cn.md publishes"
done

echo "== cross-file claim consistency =="
ALLMD="README.md README-cn.md CLAUDE.md CHANGELOG.md CHANGELOG-cn.md docs/announcement-v2.0.0.md docs/announcement-v2.0.0-cn.md docs/why-v2.md docs/why-v2-cn.md docs/why-v3.md docs/why-v3-cn.md tests/README.md"
h=$(grep -n 'all 20 v1\|20 v1 files\|20 个 v1 文件' $ALLMD 2>/dev/null)
[ -z "$h" ] && ok "leftover-file count is 18 everywhere" || bad "stale '20 v1 files' claim: $h"
h=$(grep -rn '\.agent/accept\.sh' $ALLMD three-loop-workflow tests 2>/dev/null)
[ -z "$h" ] && ok "no reference to the abolished shared .agent/accept.sh path" || bad "abolished path referenced: $h"
chk "v1 Markdown + script split sums to the file count" "$((md1+sc1))" "$f_v1"
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
echo "== the skill mentions two rules (presence only, not verification) =="
grep -qiE 'derive them from the repository' three-loop-workflow/SKILL.md \
  && ok "SKILL.md mentions deriving check commands when the guide names none" \
  || bad "SKILL.md no longer mentions what to do when the project guide names no check commands"
grep -qiE 'as a product, not as a diff' three-loop-workflow/SKILL.md \
  && ok "SKILL.md mentions the whole-artifact read" \
  || bad "SKILL.md no longer mentions the whole-artifact read"

echo "== README paths exist =="
for p in $(grep -oE '\(\./[A-Za-z0-9_./-]+\)' README.md | tr -d '()'); do
  [ -e "$p" ] && ok "README path $p" || bad "README path missing: $p"
done

echo "== bilingual pairs quote the same figures =="
for pair in "README.md:README-cn.md" "CHANGELOG.md:CHANGELOG-cn.md" \
            "docs/why-v2.md:docs/why-v2-cn.md" \
            "docs/announcement-v2.0.0.md:docs/announcement-v2.0.0-cn.md" \
            "docs/why-v3.md:docs/why-v3-cn.md"; do
  a=${pair%%:*}; b=${pair##*:}
  { [ -f "$a" ] && [ -f "$b" ]; } || { bad "missing half of pair $pair"; continue; }
  for val in "$s_v1" "$s_v2" "$p_v1" "$p_v2" "$pkg_v1" "$arch_v1" "$s_v27" "$p_v27" "$r_v27" "$s_v3" "$p_v3"; do
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
# journal has to agree with what the Build-loop script returned during the runs, or neither is usable.
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
chk "archive entry count" "$(unzip -Z1 "$pkg" | grep -vc '/$')" "5"
[ "$(unzip -Z1 "$pkg" | grep -v '/$' | LC_ALL=C sort)" = "$SHIPPED" ] \
  && ok "the archive holds exactly the expected five files" || bad "the archive's file set differs from the expected five"
unzip -Z1 "$pkg" | grep -qE "$V1" && bad "a v1 file is inside the .skill" || ok "no v1 file in .skill"
unzip -Z1 "$pkg" | grep -q 'three-loop-workflow/SKILL.md' && ok "SKILL.md in .skill" || bad "SKILL.md not in .skill"
rm -rf "$(dirname "$pkg")"

echo
if [ "$fail" -eq 0 ]; then echo "ACCEPT: all checks passed"; else echo "ACCEPT: $fail check(s) FAILED"; fi
exit "$fail"
