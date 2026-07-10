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

# Closeout document-consolidation clause (F15) — the ubiquitous bare word "consolidation" (15 incidental
# occurrences across its old sites) gave near-zero drift protection, so it is strengthened to the distinctive
# references-only marker `consolidation_pass`, paired across its two reference sites. SKILL.md is excluded by
# design: its consolidation surface is covered by the always-loaded review + the SKILL.md word ceiling, not a
# near-worthless bare-word grep.
require "consolidation_pass" "$SKILL/references/end-to-end-review.md" "$SKILL/references/loop-2-implementation.md"

# Failure-retrospective trigger — reference-only paired token (underscore literal, NOT a substring of the
# hyphenated file path references/failure-retrospective.md, so a bare cross-link cannot satisfy it). Paired
# across the source reference and its two trigger sites plus the Light-Mode disposition clause, so a dropped
# trigger hook red-fails the gate. Zero SKILL.md cost (a conditional trigger does not earn always-loaded surface).
require "failure_retrospective" "$SKILL/references/failure-retrospective.md" "$SKILL/references/escalation-rules.md" "$SKILL/references/end-to-end-review.md" "$SKILL/references/light-mode.md"

# L1 Evidence Rule — reference-only paired token (underscore literal, NOT a substring of the hyphenated
# fixture filenames l1-evidence-rule-*, so a bare fixture/path mention cannot satisfy it). Paired across the
# rule's home (loop-1-design.md pre-step B) and its rationalization row (escalation-rules.md); dropping either
# red-fails the gate. Zero SKILL.md cost.
require "evidence_rule" "$SKILL/references/loop-1-design.md" "$SKILL/references/escalation-rules.md"

# Evidence Rule spike branch — paired token across the spike rule (loop-1-design.md) and its rationalization
# row (escalation-rules.md). Separate from evidence_rule (the throwaway-answer discipline).
require "spike_answer" "$SKILL/references/loop-1-design.md" "$SKILL/references/escalation-rules.md"

# Verbatim-evidence standard — paired token across the rule (loop-1-design.md) and its rationalization row
# (escalation-rules.md). An external/technical claim stated as fact needs its verbatim file:line source.
require "verbatim_evidence" "$SKILL/references/loop-1-design.md" "$SKILL/references/escalation-rules.md"

# Cross-runtime portability commitment — paired token across the SKILL.md portability routing pointer and
# references/platforms.md (the install / capability / isolation source). Distinctive underscore literal (NOT a
# substring of the hyphenated platforms.md path, so a bare cross-link cannot satisfy it); follows the
# underscore-token precedent (evidence_rule / spike_answer / verbatim_evidence) — documented here in this
# inline comment, NOT a claude-md-integration.md consistency-table row.
require "cross_runtime" "$SKILL/SKILL.md" "$SKILL/references/platforms.md"

# Adversarial panel-angles sync (F1) — the five voter angles exist twice (review-panel.js ANGLES, l3-phase.js
# PANEL_ANGLES). A registered commitment clause (claude-md-integration.md) but previously ungated → they drifted.
# Gate byte-identity of the two arrays (block-anchored extraction; ends on a bracket-only line). Runs OUTSIDE
# the tests/scenarios guard — the JS files ship in the package even where tests/ does not.
extract_angles() { sed -n "/const $2 = \[/,/^]/p" "$1" | sed '1d;$d'; }
if ! diff <(extract_angles "$SKILL/references/review-panel.js" ANGLES) \
          <(extract_angles "$SKILL/references/l3-phase.js" PANEL_ANGLES) >/dev/null 2>&1; then
  echo "DRIFT: panel-angles — review-panel.js ANGLES != l3-phase.js PANEL_ANGLES (must be byte-identical)"
  fail=1
fi

# Calibration/grounding review-prompt sync (F6) — the [Calibration] and [Grounding] lines are byte-identical
# between the L1 and L2 review templates (loop-1-design.md, loop-2-implementation.md) and can drift silently.
# Gate byte-identity of each line (prefix-anchored single-line extraction). The [Trip-wires] line legitimately
# differs ("close L1" vs "close L2") and is excluded; l3-phase.js's panel-context copy is deliberately reworded
# and also excluded. Like panel-angles, this runs OUTSIDE the tests/scenarios guard (the templates ship in the package).
for pat in '^\[Calibration\]' '^\[Grounding\]'; do
  if ! diff <(grep -m1 -- "$pat" "$SKILL/references/loop-1-design.md") \
            <(grep -m1 -- "$pat" "$SKILL/references/loop-2-implementation.md") >/dev/null 2>&1; then
    echo "DRIFT: calibration/grounding — loop-1-design.md != loop-2-implementation.md ('$pat' line must be byte-identical)"
    fail=1
  fi
done

# Negation->positive check (skill-self-edit review branch) — single-file presence token (the check has one
# home, like the role names / "five questions"); the behavioral fixture is the real protection.
require "negation_positive" "$SKILL/references/loop-1-design.md"

# Fix-corner diagnosis method — paired token across the method (loop-3-development.md), the fix prompts'
# JS comment (l3-phase.js), and the rationalization row (escalation-rules.md). Distinctive underscore literal.
require "diagnosis_method" "$SKILL/references/loop-3-development.md" "$SKILL/references/l3-phase.js" "$SKILL/references/escalation-rules.md"

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

  # Failure-retrospective behavioral fixtures — one per trigger/invariant (trigger, dedup boundary,
  # non-displacement, no-smuggle); a dropped fixture must red-fail the gate. Separate loop + DRIFT
  # message so a miss is not mislabeled as an F-closeout fixture.
  for s in failure-retrospective-deadlock-taskdomain-triggers failure-retrospective-skill-process-deadlock-skips \
           failure-retrospective-severe-systemic-still-blocks failure-retrospective-loadbearing-prevention-defers; do
    if [ ! -f "tests/scenarios/$s.md" ]; then
      echo "DRIFT: missing failure-retrospective behavioral fixture tests/scenarios/$s.md"
      fail=1
    fi
  done

  # L1 Evidence Rule behavioral fixtures — one per failure direction (over-ask vs under-ask); separate loop +
  # DRIFT message so a miss is not mislabeled.
  for s in l1-evidence-rule-lookup-not-ask l1-evidence-rule-decision-still-escalates \
           l1-evidence-rule-spike-runs-experiment; do
    if [ ! -f "tests/scenarios/$s.md" ]; then
      echo "DRIFT: missing L1 evidence-rule behavioral fixture tests/scenarios/$s.md"
      fail=1
    fi
  done

  # Authoring-craft (negation->positive) behavioral fixture; separate block + DRIFT message.
  if [ ! -f "tests/scenarios/skill-edit-bare-prohibition-flagged.md" ]; then
    echo "DRIFT: missing authoring-craft behavioral fixture tests/scenarios/skill-edit-bare-prohibition-flagged.md"
    fail=1
  fi

  # L3 termination-mechanic fixtures — round-cap->deadlock escalation + clean-first-round positive close;
  # separate block + DRIFT message so a miss is not mislabeled.
  for s in l3-round-cap-deadlock-escalates l3-clean-first-round-closes-in-one; do
    if [ ! -f "tests/scenarios/$s.md" ]; then
      echo "DRIFT: missing L3 termination behavioral fixture tests/scenarios/$s.md"
      fail=1
    fi
  done

  # Fix-corner diagnosis-method behavioral fixture; separate block + DRIFT message.
  if [ ! -f "tests/scenarios/fix-corner-ranks-hypotheses-not-first-theory.md" ]; then
    echo "DRIFT: missing diagnosis-method behavioral fixture tests/scenarios/fix-corner-ranks-hypotheses-not-first-theory.md"
    fail=1
  fi

  # Verbatim-evidence behavioral fixture; separate block + DRIFT message.
  if [ ! -f "tests/scenarios/l1-unevidenced-external-claim-needs-source.md" ]; then
    echo "DRIFT: missing verbatim-evidence behavioral fixture tests/scenarios/l1-unevidenced-external-claim-needs-source.md"
    fail=1
  fi

  # Cross-runtime isolation behavioral fixture — on a subagent-less runtime the review stays fresh (tier-2
  # fresh/cleared context or tier-3 disclosed degradation), never a self-review; separate block + DRIFT
  # message so a miss is not mislabeled.
  if [ ! -f "tests/scenarios/no-subagent-review-stays-fresh.md" ]; then
    echo "DRIFT: missing cross-runtime isolation behavioral fixture tests/scenarios/no-subagent-review-stays-fresh.md"
    fail=1
  fi
fi

# Closure-authority guard: L1/L2 closure is count-driven (two-generation), NOT the reviewer-emitted
# `verdict` string. A `verdict == "pass"` disjunct in a closure formula would let a single clean round
# close L1/L2 (round-2 audit finding A1). Forbid it from re-entering schemas.md.
if grep -qF 'verdict == "pass"' "$SKILL/references/schemas.md"; then
  echo "DRIFT: [verdict-not-a-closure-authority] schemas.md reintroduced 'verdict == \"pass\"' as a closure condition; L1/L2 closure must be count-driven"
  fail=1
fi

# Anti-bloat: the always-loaded SKILL.md surface has a hard word-count ceiling (v1.5 design). Raised 2888 -> 2920
# as a bounded one-time allowance for the v1.13.0 cross-runtime `compatibility` frontmatter field + the
# platforms.md routing row (user-authorized R1 resolution) — a genuine new always-loaded capability, not a
# licence for drift; the ceiling still blocks bloat.
SKILL_WORDS="$(wc -w < "$SKILL/SKILL.md" | tr -d '[:space:]')"
SKILL_WORD_CEILING=2920
if [ "$SKILL_WORDS" -gt "$SKILL_WORD_CEILING" ]; then
  echo "BLOAT: SKILL.md wc -w=$SKILL_WORDS exceeds ceiling $SKILL_WORD_CEILING"
  fail=1
fi

# Anti-bloat: per-file word budget for references/*.md (F4). references/ is where detail is deliberately pushed
# out of the always-loaded SKILL.md, so a global references/ ceiling would fight that design; a uniform per-file
# cap instead catches a single reference file ballooning without penalizing healthy redistribution. Env-overridable
# (default 3000) so a red demo can trigger it without editing this script.
REFS_WORD_CEILING="${REFS_WORD_CEILING:-3000}"
for f in "$SKILL"/references/*.md; do
  w="$(wc -w < "$f" | tr -d '[:space:]')"
  if [ "$w" -gt "$REFS_WORD_CEILING" ]; then
    echo "BLOAT: $f wc -w=$w exceeds references ceiling $REFS_WORD_CEILING"
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then echo "three-loop-consistency: OK"; fi
exit "$fail"
