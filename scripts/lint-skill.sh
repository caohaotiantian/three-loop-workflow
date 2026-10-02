#!/usr/bin/env bash
# Prose properties of the shipped skill. Usage: lint-skill.sh <skill-dir>
#
# Takes the directory as its only argument and assumes no path, so scripts/negative-test.sh can point it
# at a mutated COPY. Prints one `ok` or `FAIL` line per check and exits with the number of failures.
#
# Grep is the right instrument here, and only here: these are properties of prose, where the presence or
# absence of a form IS the property. Control flow is never checked this way in this repository (see
# CLAUDE.md, "On gating"). This script is the one home of every regex below; negative-test.sh holds
# samples, one per alternative, and requires each to fail the check that owns it.
set -uo pipefail
if [ "$#" -ne 1 ] || [ ! -d "$1" ]; then
  echo "usage: lint-skill.sh <skill-dir>" >&2
  exit 255
fi
D=${1%/}
fail=0
ok()  { printf '  ok    %s\n' "$1"; }
bad() { printf '  FAIL  %s\n' "$1"; fail=$((fail+1)); }

# scan <id> <regex> <what> [grep-flags]: fail, with the hits, when the regex matches anywhere under the
# skill dir. Extra grep flags (for example -i) apply to this one regex only.
scan() {
  local id="$1" re="$2" what="$3" flags="${4:-}" hits
  hits=$(grep -rnaE $flags -e "$re" "$D" 2>/dev/null)
  if [ -n "$hits" ]; then
    bad "$id $what:"; printf '%s\n' "$hits" | sed 's/^/          /'
  else
    ok "$id no $what"
  fi
}

# R1. A runtime mechanism name: a vendor's tool, hook, mode, or product command. Case-sensitive, so
# `CLAUDE.md` and `AGENTS.md` (project-guide file names) do not match. `\bExplore\b` and the generic
# `<Capitalised> tool` also match ordinary capitalised prose; rephrase the prose, never the regex.
# `sub-agent` is not in this list. It is the skill's own word for a bounded domain handed to its own
# context (SKILL.md, Build). `SubagentStop` stays: that is a hook name, not the word.
scan R1 'AskUserQuestion|EnterWorktree|ExitWorktree|EnterPlanMode|ExitPlanMode|Workflow\(|Agent\(|[Ww]orkflow (tool|script)|phase\.js|\bExplore\b|Agent tool|Task tool|Skill tool|SendMessage|ScheduleWakeup|TodoWrite|WebFetch|WebSearch|[Ss]lash command|security-review|code-review|/simplify|(^|[[:space:]`("])/review\b|claude -p|\.claude/|Claude Code|[Pp]lan mode|\b(Glob|NotebookEdit|MultiEdit|BashOutput|KillShell|SlashCommand)\b|\b(bash|grep|glob) tool\b|PreToolUse|PostToolUse|SessionStart|UserPromptSubmit|SubagentStop|MCP (server|tool)' \
  "runtime mechanism name"

# R1b. The generic `<Capitalised> tool` (a named tool: "Bash tool", "Research tool"). It also matches
# ordinary prose where a determiner or sentence-initial word precedes "tool", and ERE has no lookahead, so
# the matches are extracted with -o and the common words filtered out here. Extend the list when prose
# trips it; never widen the regex. A word on the list is EXEMPT: `Test tool` and `Build tool` pass by design
# (guarded in negative-test.sh), so adding a word there also lets a real tool of that name through.
r1b=$(grep -rnaoE -e '\b[A-Z][A-Za-z]+ tool\b' "$D" 2>/dev/null \
  | grep -avE ':(The|An|No|Each|Any|Every|This|That|These|Those|Your|One|Its|Their|Which|What|Some|Use|Run|Our|His|Her|Whose|Another|Either|Neither|Both|All|Such|Only|Whether|When|Then|Not|Once|Does|Do|Is|Are|Was|Were|Can|Could|Should|Would|Will|May|Must|If|For|With|Without|Choose|Pick|Name|Prefer|Where|Whichever|Whatever|Other|Same|Single|Good|Real|Right|Wrong|Project|Test|Build|Check) tool$')
if [ -n "$r1b" ]; then bad "R1 named tool:"; printf '%s\n' "$r1b" | sed 's/^/          /'
else ok "R1 no named tool"; fi

# R2. A statistic, in digits or in words: percentages, "N out of N", decimal ratios, "3x" multipliers.
scan R2 '[0-9]+(\.[0-9]+)?%|percentage points|116 findings|[0-9]+ ?per ?cent|\b([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|half|most) out of (every )?([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|hundred)\b|(rate|recall|precision|accuracy|correlation|agreement|kappa|score|ratio)( of| was| is|:|=)? ?(^|[^0-9.])0\.[0-9]+\b|(^|[^0-9.])0\.[0-9]+ (of|rate|recall|precision|accuracy)\b|\b[0-9]+(\.[0-9]+)?x\b' \
  "statistic" -i

# R3. The retired third-reviewer coverage claim.
scan R3 'third mostly repeat' "retired third-reviewer claim"

# R4. Routing, in both directions: every cited reference exists, and every reference is cited by SKILL.md.
l4=""
for cited in $(grep -rhoaE 'references/[A-Za-z0-9_.-]+\.md' "$D" 2>/dev/null | sort -u); do
  [ -f "$D/$cited" ] || l4="$l4
          cited but missing: $cited"
done
if [ -d "$D/references" ]; then
  for f in "$D"/references/*.md; do
    [ -e "$f" ] || continue
    grep -qaF "references/$(basename "$f")" "$D/SKILL.md" 2>/dev/null \
      || l4="$l4
          not cited from SKILL.md: references/$(basename "$f")"
  done
fi
if [ -n "$l4" ]; then bad "R4 routing is broken:$l4"; else ok "R4 every cited reference exists and every reference is cited"; fi

# R5. A retired v2 file name, repo tooling, or a cited `scripts/<name>.<ext>` file: the skill ships no scripts. A bare mention of a `scripts/`
# directory is prose and passes; Bash and Grep are common words and are caught only as `<name> tool`.
scan R5 'sim-phase|check-workflow-syntax|gate-fixtures|negative-test|accept-release|(^|[^A-Za-z0-9_-])scripts/[A-Za-z0-9_.-]+\.[A-Za-z0-9]+|references/(plan|build|close|escalation|orchestration|maintenance|platforms)\.md' \
  "retired v2 file name or repo tooling"

# R6. A plan-only provenance form: model names and IDs (case-insensitive: claude-*, gpt-*, o-series
# tokens, the open-weight families), a capitalised "Claude", file:line citations, memory citations and
# ratio phrasings. A bare lowercase "claude" is not matched, because it would match CLAUDE.md.
r6=$( { grep -rnaiE -e '\b(opus|sonnet|haiku|gemini|gemma|llama|mistral|mixtral|deepseek|qwen|chatgpt)\b|\bgpt-?[0-9a-z]|\bclaude-[a-z0-9]|\bo[0-9]-(mini|pro|preview|high|low)\b|\bo[0-9] (model|run|series|mini|pro)\b' "$D"
        grep -rnaE -e '\bClaude\b|\.md:[0-9]|memory:|\b[0-9]+ of [0-9]+\b|two-thirds|roughly half' "$D"; } 2>/dev/null )
if [ -n "$r6" ]; then bad "R6 plan-only provenance form:"; printf '%s\n' "$r6" | sed 's/^/          /'
else ok "R6 no plan-only provenance form"; fi

exit "$fail"
