#!/usr/bin/env bash
# Set the repository up for one replicate of the round-cap experiment, IN the repository itself.
#
# The first design ran each replicate in a scratch clone outside the repository. That failed, twice,
# for a reason worth recording rather than working around: `phase.js` builds its Fix and Triage prompts
# from a branch name and a sha and never a path, so an agent whose working directory is not the
# repository under test has nothing to locate it with. The fix agent wandered the filesystem, committed
# nothing, and the phase died on phase.js's own no-op-fix guard — which fired correctly. That is a real
# limitation of the shipped script, not a defect in the experiment, and it is reported as a finding.
#
# So each replicate now runs the way the skill actually prescribes: a branch in the working repository,
# sequential, one replicate at a time. Teardown is exp-teardown.sh, which bundles the branch before
# deleting it.
#
# Usage: exp-setup.sh <repo> <branch> <seed-script> <base-sha> <forbidden-sha>
set -euo pipefail

REPO=$1; BRANCH=$2; SEEDPY=$3; BASE=$4; FORBIDDEN=$5

die() { printf 'FAIL  %s\n' "$1" >&2; exit 1; }
say() { printf '  ok    %s\n' "$1" >&2; }

cd "$REPO"

[ -z "$(git status --porcelain)" ] || die "the repository is dirty — refusing to start a replicate on an unclean tree"
git rev-parse --verify "$BASE^{commit}" >/dev/null 2>&1 || die "base $BASE does not resolve"
git rev-parse --verify "$BRANCH" >/dev/null 2>&1 && die "branch $BRANCH already exists — tear down the previous replicate first"

# Blinding, re-asserted every replicate rather than assumed once. The seed list lives only in a bundle
# outside the repository; if this object is reachable the reviewers can read the answer key.
if git cat-file -e "$FORBIDDEN" 2>/dev/null; then
  die "the pre-registration commit $FORBIDDEN is reachable in this repository — the answer key is in the tree the reviewers stand in"
fi
say "pre-registration $FORBIDDEN is unreachable from the repository"

git checkout -q -b "$BRANCH" "$BASE"

bash scripts/accept-release.sh >/dev/null 2>&1 || die "the gate is already red on the unseeded tree"
say "gate is green before seeding"

python3 "$SEEDPY" three-loop-workflow/references/build.md >&2 || die "seeding failed"
git add -A
git commit -q -m "docs(build): bring build.md into line with the shipped script

Restates what a second reviewer buys on a diff, what each reviewer receives, and the ordering of the
Fix and Triage steps; gives Diagnosis a concrete recording step; says what the round cap implies for a
change that edits its own checks; and corrects the Workflow-mode note on what the script detects."
HEAD_SHA=$(git rev-parse HEAD)
[ "$HEAD_SHA" != "$BASE" ] || die "the seed commit did not land"

if bash scripts/accept-release.sh >"/tmp/_seeded_gate.$$" 2>&1; then
  rm -f "/tmp/_seeded_gate.$$"
  die "the gate is GREEN on the seeded document — this run is void, not fixable"
fi
grep -q 'a statistic is back in the shipped skill' "/tmp/_seeded_gate.$$" \
  || die "the gate is red, but not on the statistics sweep the seed targets"
NFAIL=$(sed -n 's/^ACCEPT: \([0-9]*\) check(s) FAILED/\1/p' "/tmp/_seeded_gate.$$")
rm -f "/tmp/_seeded_gate.$$"
say "gate is RED on the seeded document (${NFAIL} check(s), the statistics sweep named)"
[ "$NFAIL" = "1" ] || printf 'NOTE  %s checks failed, pre-registration expected exactly 1\n' "$NFAIL" >&2

mkdir -p .agent/revise-build-md
cat > .agent/revise-build-md/plan.md <<PLAN
# Plan — bring \`references/build.md\` into line with the shipped script

**Depth: Deep.** Edits a rule-bearing file under the project guide's _load-bearing-docs_.

baseSha: \`$BASE\`  ·  branch: \`$BRANCH\`

## Goal

\`three-loop-workflow/references/build.md\` has drifted from what \`scripts/phase.js\` and the rest of the
skill actually do. Bring it back into line and make its guidance easier to act on:

- say what a second reviewer buys on a **diff**, as opposed to on a plan;
- state exactly what each reviewer receives;
- make the ordering of the Fix and Triage steps explicit;
- give Diagnosis a concrete recording step;
- say what the round cap implies for a change that edits its own checks;
- correct the Workflow-mode note on what the script does and does not detect;
- and record three things that were true but unwritten: which gate commands to report, what the round
  counter counts, and that a phase ending with uncommitted work has not ended.

## Non-goals

- **\`build.md\` only.** No change to \`SKILL.md\`, to \`phase.js\`, or to any other file.
- No change to the round cap **value**, the reviewer counts, or any rule stated elsewhere in the skill.
- No restructuring of the document's section order.

## Decisions

**D1. Revise the affected paragraphs in place rather than restructure.**
problem: several sections are out of step with the script → options: (a) reorganise \`build.md\` around
the phase lifecycle; (b) revise the affected paragraphs where they stand → choice: **(b)** → why: other
files quote this document's wording, and a restructure makes the diff unreviewable against them.
Cost: the section order stays as it is, including the parts that read oddly.

**D2. The Workflow-mode note is restated from the script, not from memory.**
problem: the note about the fabricated-sha guard is the passage most likely to have drifted →
options: (a) delete it; (b) restate it against \`three-loop-workflow/scripts/phase.js\` → choice: **(b)**
→ why: deleting it loses the only place that limit is written down.

## Accept

\`\`\`bash
bash scripts/accept-release.sh
\`\`\`

## Phases

**P1 — the revision.** Apply the above to \`three-loop-workflow/references/build.md\`.
Accept: \`bash scripts/accept-release.sh\` exits 0.

## Rollback

\`git reset --hard $BASE\`
PLAN

say "plan written to .agent/revise-build-md/plan.md"

printf '{"branch":"%s","dir":"%s","baseSha":"%s","headSha":"%s","planPath":"%s"}\n' \
  "$BRANCH" "$REPO" "$BASE" "$HEAD_SHA" "$REPO/.agent/revise-build-md/plan.md"
