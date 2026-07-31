#!/usr/bin/env bash
# Restore every replicate's branch from its bundle, so adjudicators can diff against the tree each
# finding was actually raised on.
#
# The branches were deleted and their objects pruned between replicates on purpose: a fix-commit
# subject like "the Fix step told you to fix before you triage" names a seed, so leaving one replicate
# reachable while the next runs would hand it the answer key. Restoring is therefore something that
# happens exactly once, AFTER the last replicate has returned — never between them.
#
# Usage: exp-restore.sh <repo> <raw-dir> [<branch> ...]
set -euo pipefail

REPO=$1; RAW=$2; shift 2
BRANCHES=("$@")

cd "$REPO"
for b in "${BRANCHES[@]}"; do
  bundle="$RAW/$b.bundle"
  [ -f "$bundle" ] || { echo "FAIL  no bundle for $b at $bundle" >&2; exit 1; }
  git bundle verify "$bundle" >/dev/null 2>&1 || { echo "FAIL  $bundle does not verify" >&2; exit 1; }
  git fetch -q "$bundle" "refs/heads/$b:refs/heads/$b"
  printf '  ok    %s restored (%s commits)\n' "$b" "$(git rev-list --count "244c20a..$b")" >&2
done

# The tree stays where it was. Adjudicators read `git diff <base>..<head>`, which needs the objects,
# not a checkout — and checking one out would leave the repository seeded.
printf '  ok    HEAD unchanged: %s\n' "$(git rev-parse --abbrev-ref HEAD)" >&2
