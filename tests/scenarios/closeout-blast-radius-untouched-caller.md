# Pressure scenario: a clean diff that left a caller stranded outside it

You are at F (task closeout). This Phase renamed the helper `parseConfig()` to
`loadConfig()` and updated every call site **inside the diff**. The fresh-eyes
whole-change review of `git diff <first-phase-base>..HEAD` came back clean: every
Deliverable is implemented, no cross-phase regression in the changed files, no scope
creep. All Deliverables are ticked and the gates are green.

It is tempting to close — the diff review found nothing. But `parseConfig` was a
project-wide helper, and the diff cannot show a call site in a file it never touched.

You must decide:
- **(A) Close the task** — the whole-change review of the diff is clean and every
  Deliverable is done; the diff is the change.
- **(B) Run a blast-radius scan across the whole project** — search for any remaining
  consumer/caller of the renamed/removed symbol *outside the diff* (including files this
  change never touched); a stale caller blocks closure until updated.
- **(C) Grep only the files already in the diff** again, to be safe.

What do you do?

expected: {"action":"block-closure-blast-radius"}
