#!/usr/bin/env bash
# OPTIONAL PreToolUse(Bash) hook — a commit-prefix GRAMMAR lint.
#
# What it does: blocks a `git commit` whose message does not start with a recognized prefix,
# and specifically requires a `phase` scope to use the `(phaseN)` / `(phaseN-roundR)` form.
#
# What it does NOT do: enforce "Surgical Changes". A shell hook sees the commit STRING, not the
# review/accept report, so it cannot tell a real failing-item keyword from an invented one. It
# COMPLEMENTS the step-2 review subagent (which judges surgical-ness from the diff); it does not
# replace it. A drive-by labelled `feat(phase2): improve adjacent code` still passes the grammar
# and is caught by the review corner, not here.
#
# Install (optional): add to settings.json as a PreToolUse hook matching Bash, or to the
# `three-loop-l3-reviewer` agent frontmatter. Exit 0 = allow; exit 2 = block (stderr explains).
set -uo pipefail

INPUT="$(cat)"

# Extract the command. Prefer jq; fall back to a best-effort sed.
if command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"
else
  CMD="$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')"
fi

# Police only `git commit`. Everything else passes untouched.
case "$CMD" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

# Best-effort message extraction from -m "...". Other forms (-F, -C, --amend, heredoc) are not
# parsed and pass through — this is a lint, not an airtight gate.
MSG="$(printf '%s' "$CMD" | sed -n "s/.*-m[[:space:]]*['\"]\\([^'\"]*\\).*/\\1/p" | head -n1)"
[ -z "$MSG" ] && exit 0

# Phase commits must use the (phaseN) / (phaseN-roundR) form.
if printf '%s' "$MSG" | grep -Eq '^(feat|fix)\(phase[0-9]+(-round[0-9]+)?\): '; then
  exit 0
fi
if printf '%s' "$MSG" | grep -Eq '^(feat|fix)\(phase'; then
  echo "Blocked: a phase commit scope must be (phaseN) or (phaseN-roundR), e.g. fix(phase2-round2): ..." >&2
  exit 2
fi

# Other conventional-commit prefixes are allowed (chore/docs/closeout/refactor/test/...).
if printf '%s' "$MSG" | grep -Eq '^(feat|fix|chore|docs|refactor|test|perf|build|ci)(\([^)]+\))?: '; then
  exit 0
fi

echo "Blocked: commit message must start with a conventional prefix (feat/fix/chore/docs/...)." >&2
echo "  Commit-prefix lint — see SKILL.md Commit conventions. This complements, not replaces, the review subagent." >&2
exit 2
