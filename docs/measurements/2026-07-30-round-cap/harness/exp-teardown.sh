#!/usr/bin/env bash
# Tear one replicate down: bundle everything it produced, then restore the repository.
#
# The bundle is the point. This project has three measurements it cannot reproduce because the
# artifacts were never kept, and a branch deleted after a run is a fourth. `git bundle` of
# <base>..<branch> preserves every round's commits — the seeded state, each fix, the final tree — in a
# single file that is committed with the results, so anyone can restore the exact material later.
#
# Usage: exp-teardown.sh <repo> <branch> <base-sha> <out-dir> <restore-branch>
set -euo pipefail

REPO=$1; BRANCH=$2; BASE=$3; OUT=$4; RESTORE=$5

die() { printf 'FAIL  %s\n' "$1" >&2; exit 1; }
say() { printf '  ok    %s\n' "$1" >&2; }

cd "$REPO"
mkdir -p "$OUT"

git rev-parse --verify "$BRANCH" >/dev/null 2>&1 || die "branch $BRANCH does not exist"

# Uncommitted work is part of what happened and would otherwise vanish at checkout. Record it rather
# than discard it: a fix round that edited without committing is exactly the state phase.js's no-op
# guard exists to catch, and the evidence for that belongs in the record.
if [ -n "$(git status --porcelain)" ]; then
  git status --porcelain > "$OUT/$BRANCH.uncommitted.txt"
  git diff > "$OUT/$BRANCH.uncommitted.diff"
  printf 'NOTE  %s left uncommitted changes; recorded in %s.uncommitted.diff\n' "$BRANCH" "$BRANCH" >&2
fi

git bundle create "$OUT/$BRANCH.bundle" "$BASE..$BRANCH" 2>/dev/null || die "bundling $BRANCH failed"
git log --format='%H%x09%cI%x09%s' "$BASE..$BRANCH" > "$OUT/$BRANCH.commits.tsv"
git diff "$BASE..$BRANCH" -- three-loop-workflow/references/build.md > "$OUT/$BRANCH.final.diff"
say "$BRANCH bundled ($(git rev-list --count "$BASE..$BRANCH") commit(s))"

git checkout -q -f "$RESTORE"
rm -rf .agent/revise-build-md
git branch -qD "$BRANCH"

[ -z "$(git status --porcelain)" ] || die "the repository is dirty after restore — inspect before continuing"
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$RESTORE")" ] || die "HEAD is not $RESTORE after restore"
say "repository restored to $RESTORE, clean"
