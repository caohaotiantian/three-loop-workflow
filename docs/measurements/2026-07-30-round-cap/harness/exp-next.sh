#!/usr/bin/env bash
# Hand off from one replicate to the next, without destroying the finished one.
#
# The branch is KEPT. Adjudication has to diff against the tree each finding was raised on, and every
# agent's working directory is this repository — so the branches must still resolve here when the
# adjudicators run. Bundling and deletion happen once, at the end, in exp-teardown.sh.
#
# Usage: exp-next.sh <repo> <finished-branch|none> <next-branch|none> <seed-script> <base> <forbidden> <restore-branch>
set -euo pipefail

REPO=$1; DONE_BRANCH=$2; NEXT=$3; SEEDPY=$4; BASE=$5; FORBIDDEN=$6; RESTORE=$7
PRIV="$HOME/.cache/tlw-exp"

cd "$REPO"

if [ "$DONE_BRANCH" != "none" ]; then
  # Record anything the last round left uncommitted before checkout discards it. A fix round that
  # edited without committing is exactly the state phase.js's no-op guard exists to catch, and the
  # evidence for that belongs in the record rather than in the reflog.
  if [ -n "$(git status --porcelain)" ]; then
    mkdir -p "$PRIV/raw"
    git status --porcelain > "$PRIV/raw/$DONE_BRANCH.uncommitted.txt"
    git diff > "$PRIV/raw/$DONE_BRANCH.uncommitted.diff"
    printf 'NOTE  %s left uncommitted changes; recorded\n' "$DONE_BRANCH" >&2
  fi
  git checkout -q -f "$RESTORE"
  rm -rf .agent/revise-build-md
  printf '  ok    %s finished and kept; repository restored to %s\n' "$DONE_BRANCH" "$RESTORE" >&2
fi

[ -z "$(git status --porcelain)" ] || { echo "FAIL  repository dirty after restore" >&2; exit 1; }

if [ "$NEXT" != "none" ]; then
  bash "$PRIV/harness/exp-setup.sh" "$REPO" "$NEXT" "$SEEDPY" "$BASE" "$FORBIDDEN"
fi
