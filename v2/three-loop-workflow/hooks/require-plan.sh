#!/usr/bin/env bash
# PreToolUse hook (Edit|Write|NotebookEdit): a contract file is not edited without a plan.
#
# In prose this rule is a request. As a hook it is a guarantee — which is the whole point:
# "Claude might skip it" and "Claude cannot do it" are different properties.
#
# Contract files are read from the CLAUDE.md _load-bearing-docs_ section as glob patterns.
# No CLAUDE.md, or no such section -> nothing is protected and the hook allows everything.
#
# Exit 0 = allow. Exit 2 = block, with stderr fed back to the agent.

set -uo pipefail

PLAN="${THREE_LOOP_PLAN:-.agent/plan.md}"
CLAUDE_MD="${THREE_LOOP_CLAUDE_MD:-CLAUDE.md}"

payload="$(cat)"

extract_path() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null
  else
    printf '%s' "$payload" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
  fi
}

target="$(extract_path)"
[ -n "$target" ] || exit 0
[ -f "$CLAUDE_MD" ] || exit 0

# CLAUDE.md names sections by ROLE, not by literal heading: an anchor map at the top maps
# _load-bearing-docs_ to whatever this project calls that heading. So resolve the role to its
# heading first, then read that section's body. Falls back to a heading match when there is
# no anchor map.
heading="$(grep -m1 '_load-bearing-docs_' "$CLAUDE_MD" 2>/dev/null \
  | sed -n 's/.*"\(#\{1,6\}[[:space:]][^"]*\)".*/\1/p')"

if [ -z "$heading" ]; then
  heading="$(grep -m1 -i '^#\{1,6\}[[:space:]].*load-bearing' "$CLAUDE_MD" 2>/dev/null)"
fi
[ -n "$heading" ] || exit 0

# Body of that heading, up to the next heading of the same or shallower depth — and stopping at an
# exclusion paragraph. Sections conventionally list what IS protected, then a "**Not** load-bearing"
# paragraph listing what is not; collecting past that marker would protect the exclusions too.
patterns="$(awk -v want="$heading" '
  function depth(s,  n) { n = match(s, /[^#]/); return n - 1 }
  $0 == want { inseg = 1; want_depth = depth($0); next }
  inseg && /^#{1,6}[[:space:]]/ { if (depth($0) <= want_depth) exit }
  inseg && tolower($0) ~ /not[^a-z]*(\*\*)?[[:space:]]*load-bearing|\*\*not\*\*/ { exit }
  inseg { print }
' "$CLAUDE_MD" 2>/dev/null | grep -o '`[^`]*`' | tr -d '`' | grep '[/.]' || true)"

[ -n "$patterns" ] || exit 0

rel="${target#./}"
rel="${rel#"$PWD"/}"

matched=""
while IFS= read -r pat; do
  [ -n "$pat" ] || continue
  # shellcheck disable=SC2254
  case "$rel" in
    $pat) matched="$pat"; break ;;
  esac
done <<EOF
$patterns
EOF

[ -n "$matched" ] || exit 0
[ -f "$PLAN" ] && exit 0

cat >&2 <<EOF
Blocked: $rel matches the contract-file pattern '$matched' from $CLAUDE_MD (_load-bearing-docs_),
and $PLAN does not exist.

This is a Deep change. Write the plan first — Goal, Non-goals, Decisions (each with the
alternatives you rejected), Accept command, and Rollback — then make this edit.

To edit without a plan on purpose, unset the hook or set THREE_LOOP_PLAN to a plan you have written.
EOF
exit 2
