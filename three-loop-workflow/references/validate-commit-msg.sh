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

# Extract the command. Prefer jq; fall back to a best-effort sed + JSON-unescape.
if command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"
else
  CMD="$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"\\]*\(\\.[^"\\]*\)*\)".*/\1/p')"
  # The sed-captured JSON value keeps backslash-escaped quotes; unescape so the standard
  # JSON-escaped -m "..." form parses like the jq path (closes the no-jq fail-open).
  CMD="${CMD//\\\"/\"}"
fi

# Police a `git commit`, tolerating global options between `git` and the subcommand
# (`git -C <path> commit`, `git -c k=v commit`, `git --no-pager commit`). Each intervening unit is
# an option flag (`-x` / `--x`) optionally followed by ONE bare argument (its value, e.g. the path
# after `-C` or the `k=v` after `-c`); `commit` is matched only at a token boundary. So
# `git commit-graph`, `git status`, `git diff main commit -m ...` (a ref named "commit"), and a
# path containing "commit" do NOT match — only an actual `commit` subcommand does.
if ! printf '%s' "$CMD" | grep -Eq '(^|[^[:alnum:]_-])git[[:space:]]+(-[^[:space:]]+[[:space:]]+([^-[:space:]][^[:space:]]*[[:space:]]+)?)*commit([[:space:]]|$)'; then
  exit 0
fi

# First-flag-anchored message extraction: the first -m / clustered -[a-z]*m flag, then the first
# quoted run. awk match() is leftmost, so this takes the SUBJECT (first -m), not a trailing body -m,
# and handles -am/clustered flags in the same construct. Other forms (-F, -C, --amend without -m,
# heredoc) yield empty and pass through — this is a lint, not an airtight gate. A double-quoted
# subject containing an apostrophe is handled; a single-quoted -m '...' subject with an embedded
# apostrophe may still truncate (a documented limitation, not worth quote-aware parsing here).
MSG="$(printf '%s' "$CMD" | awk '
  {
    if (match($0, /-[A-Za-z]*m[ \t]*["'\'']/)) {
      q = substr($0, RSTART + RLENGTH - 1, 1)
      rest = substr($0, RSTART + RLENGTH)
      p = index(rest, q)
      print (p > 0 ? substr(rest, 1, p - 1) : rest)
    }
  }')"
[ -z "$MSG" ] && exit 0

# Phase commits must use the (phaseN) / (phaseN-roundR) form (1-indexed; phase0/round0 rejected).
if printf '%s' "$MSG" | grep -Eq '^(feat|fix)\(phase[1-9][0-9]*(-round[1-9][0-9]*)?\): '; then
  exit 0
fi
if printf '%s' "$MSG" | grep -Eq '^(feat|fix)\(phase'; then
  echo "Blocked: a phase commit scope must be (phaseN) or (phaseN-roundR), e.g. fix(phase2-round2): ..." >&2
  exit 2
fi

# Other conventional-commit prefixes are allowed (chore/docs/refactor/test/...).
if printf '%s' "$MSG" | grep -Eq '^(feat|fix|chore|docs|refactor|test|perf|build|ci)(\([^)]+\))?: '; then
  exit 0
fi

echo "Blocked: commit message must start with a conventional prefix (feat/fix/chore/docs/...)." >&2
echo "  Commit-prefix lint — see SKILL.md Commit conventions. This complements, not replaces, the review subagent." >&2
exit 2
