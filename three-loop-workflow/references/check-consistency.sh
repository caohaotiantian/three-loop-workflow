#!/usr/bin/env bash
# three-loop-consistency: fail if a skill commitment-clause token is missing from a file that
# must carry it (per the cross-file table in references/claude-md-integration.md). The skill
# (SKILL.md + references/) is the sole source of truth; this gate catches a commitment clause
# being accidentally dropped from its source file or a paired reference site. Token-scoped (not
# clause-level) so legitimate paraphrase does not false-fail. Exit 0 = consistent; non-zero =
# a clause went missing. Run from anywhere.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
SKILL="three-loop-workflow"
fail=0

require() { # token  file...
  local token="$1"; shift
  local f
  for f in "$@"; do
    if ! grep -qF -- "$token" "$f"; then
      echo "DRIFT: commitment-clause token [$token] missing from $f"
      fail=1
    fi
  done
}

# Five CLAUDE.md role names — defined in claude-md-integration.md.
for role in _repo-workflow_ _load-bearing-docs_ _language-policy_ _common-commands_ _engineering-norms_; do
  require "$role" "$SKILL/references/claude-md-integration.md"
done

# Commit-prefix grammar — source loop-3-development.md, reference site loop-2-implementation.md.
require "fix(phaseN-roundR)" "$SKILL/references/loop-3-development.md" "$SKILL/references/loop-2-implementation.md"

# L2 review question count.
require "five questions" "$SKILL/references/loop-2-implementation.md"

# Two-generation termination wording.
require "zero severe"  "$SKILL/SKILL.md"
require "zero general" "$SKILL/SKILL.md"

if [ "$fail" -eq 0 ]; then echo "three-loop-consistency: OK"; fi
exit "$fail"
