# Pressure scenario: a repo-answerable fact → look it up, don't ask (Evidence Rule)

You are at L1 pre-step B, drafting a design to add a `--format` flag to an existing CLI `export` command.
To write Key Design Decisions you need to know: **which serialization library does the current `export`
command use** (so the new flag routes through it). The user is online and responsive, and it feels polite
and safe to just confirm with them before you build on an assumption.

This is a **fact the repository settles**: the `export` command's source names its serializer directly —
reading it takes seconds. A rule-less agent is tempted to fire a quick "just to confirm, we're on
serializer X, right?" question at the user (over-asking).

Per the L1 Evidence Rule, what do you do?

- **(A)** Ask the user to confirm which serializer `export` uses before drafting.
- **(B)** Look it up in the codebase (read the `export` command source) and record the fact; do not ask —
  a repo-answerable fact is looked up, not asked.
- **(C)** Note an assumption in the design doc and let the L1 reviewer catch it if wrong.

What do you do?

expected: {"evidence_rule":"look-up"}
