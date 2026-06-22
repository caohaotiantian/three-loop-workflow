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

# Per-round cleanliness predicate (the single-round pass tokens), NOT the two-generation
# termination rule (that is paired just below).
require "zero severe"  "$SKILL/SKILL.md"
require "zero general" "$SKILL/SKILL.md"

# Two-generation termination RULE — canonical token paired across the files that state it.
require "two-generation" "$SKILL/SKILL.md" "$SKILL/references/schemas.md" "$SKILL/references/loop-1-design.md" "$SKILL/references/loop-2-implementation.md" "$SKILL/references/escalation-rules.md"

# L3-only clean-first-round relaxation — source SKILL.md, reference site schemas.md.
require "clean-first-round" "$SKILL/SKILL.md" "$SKILL/references/schemas.md"

# L3 clean-first-round fixApplied flag (ReviewVerdict closure formula) — source schemas.md, reference site l3-phase.js control flow.
require "fixApplied" "$SKILL/references/schemas.md" "$SKILL/references/l3-phase.js"

# F closeout project-wide gates (B1-B5) — source end-to-end-review.md, reference site SKILL.md "Self-check"
# Task-closed bullet; B3 (change-orphan) and B5 (project-doc reconciliation) are also echoed in light-mode.md.
require "blast-radius"               "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md"
require "repo-wide validation gates" "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md"
require "change-orphan"              "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md" "$SKILL/references/light-mode.md"
require "migration verification"     "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md"
require "project-doc reconciliation" "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md" "$SKILL/references/light-mode.md"

# F closeout consolidation<->reconciliation cross-reference delimiter (AC7) — both directional literals
# live in end-to-end-review.md (the consolidation step points down, the D5 reconciliation step points up).
require "project-doc reconciliation step below" "$SKILL/references/end-to-end-review.md"
require "two-doc consolidation step above"      "$SKILL/references/end-to-end-review.md"

# Closeout document-consolidation clause — paired across its 3 sites (was table-registered only; now gated for parity).
require "consolidation" "$SKILL/references/end-to-end-review.md" "$SKILL/SKILL.md" "$SKILL/references/loop-2-implementation.md"

# F closeout behavioral fixtures — one per new closeout behavior (B1-B5); a dropped fixture must red-fail the gate.
# Guarded by the suite's presence: tests/scenarios/ lives at the repo root and is NOT shipped inside the
# skill package, so this check applies only when the gate runs in the repo (the installed copy / packaged
# .skill has no tests/ dir — there the loop below would otherwise false-fail).
if [ -d tests/scenarios ]; then
  for s in closeout-blast-radius-untouched-caller closeout-runs-all-declared-gates \
           closeout-orphan-sweep-not-scheduled closeout-migration-unverified-blocks \
           closeout-doc-reconcile-changed-surface; do
    if [ ! -f "tests/scenarios/$s.md" ]; then
      echo "DRIFT: missing F-closeout behavioral fixture tests/scenarios/$s.md"
      fail=1
    fi
  done
fi

# Closure-authority guard: L1/L2 closure is count-driven (two-generation), NOT the reviewer-emitted
# `verdict` string. A `verdict == "pass"` disjunct in a closure formula would let a single clean round
# close L1/L2 (round-2 audit finding A1). Forbid it from re-entering schemas.md.
if grep -qF 'verdict == "pass"' "$SKILL/references/schemas.md"; then
  echo "DRIFT: [verdict-not-a-closure-authority] schemas.md reintroduced 'verdict == \"pass\"' as a closure condition; L1/L2 closure must be count-driven"
  fail=1
fi

# Anti-bloat: the always-loaded SKILL.md surface has a hard word-count ceiling (v1.5 design).
SKILL_WORDS="$(wc -w < "$SKILL/SKILL.md" | tr -d '[:space:]')"
SKILL_WORD_CEILING=2888
if [ "$SKILL_WORDS" -gt "$SKILL_WORD_CEILING" ]; then
  echo "BLOAT: SKILL.md wc -w=$SKILL_WORDS exceeds ceiling $SKILL_WORD_CEILING"
  fail=1
fi

if [ "$fail" -eq 0 ]; then echo "three-loop-consistency: OK"; fi
exit "$fail"
