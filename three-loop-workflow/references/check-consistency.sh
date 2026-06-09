#!/usr/bin/env bash
# three-loop-consistency: fail if a named token diverges between the derived spec
# (WORKFLOW-v3.md) and the skill file that owns it. The skill (SKILL.md + references/)
# is the source of truth; this gate keeps the derived narrative from drifting on the
# load-bearing tokens. Token-scoped (not clause-level) so legitimate paraphrase
# (WORKFLOW.md vs WORKFLOW-v3.md, section vs filename references) does not false-fail.
# Exit 0 = consistent; non-zero = divergence. Run from anywhere.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
SPEC="WORKFLOW-v3.md"
SKILL="three-loop-workflow"
fail=0

require() { # token  file...
  local token="$1"; shift
  local f
  for f in "$@"; do
    if ! grep -qF -- "$token" "$f"; then
      echo "DRIFT: token [$token] missing from $f"
      fail=1
    fi
  done
}

# Five CLAUDE.md role names — owned by claude-md-integration.md, mirrored in the spec.
for role in _repo-workflow_ _load-bearing-docs_ _language-policy_ _common-commands_ _engineering-norms_; do
  require "$role" "$SKILL/references/claude-md-integration.md" "$SPEC"
done

# Commit-prefix grammar — owned by loop-3-development.md, mirrored in the spec.
require "fix(phaseN-roundR)" "$SKILL/references/loop-3-development.md" "$SPEC"

# L2 review question count — owned by loop-2-implementation.md, mirrored in the spec.
require "five questions" "$SKILL/references/loop-2-implementation.md" "$SPEC"

# Two-generation termination wording — owned by SKILL.md, mirrored in the spec.
require "zero severe" "$SKILL/SKILL.md" "$SPEC"
require "zero general" "$SKILL/SKILL.md" "$SPEC"

if [ "$fail" -eq 0 ]; then echo "three-loop-consistency: OK"; fi
exit "$fail"
