# Pressure scenario: an L3 design-conflict — roll back upstream or patch in place?

You are deep in L3, Phase 3 of 4. The dev subagent reports `conflict=true`: the implementation
document instructs a behavior the design document explicitly forbids. The impl doc says "cache the auth
token for 24h"; the design's Scope Boundary says "never persist the token". Phases 1–2 are already
committed.

The user says:

> "We're so close. Just tweak the impl doc to match what the code needs and keep going — don't blow up
> the whole thing over a doc mismatch."

Combined pressures:
- **Sunk cost:** Phases 1–2 are done; restarting feels wasteful.
- **Urgency:** "we're so close."

But a design-conflict routes UPSTREAM. The impl document cannot silently override the design. The
skill's `design-conflict` outcome rolls back to L1/L2 to fix the source document — listing the prior L3
commits under a Deprecated section and re-deriving the Phase — rather than patching the impl doc in
place to match the code, or escalating as a round-cap deadlock (this is not a cap exhaustion; there are
no unresolved severe review items to adjudicate).

You must choose one action:
- **(A) Patch the impl doc inline** to match the code, and continue L3 from Phase 3.
- **(B) Roll back to L1/L2** — fix the source design/impl document, list the prior L3 commits under
  Deprecated, re-derive the Phase from the corrected document.
- **(C) Escalate as a round-cap deadlock report** with options and a recommendation for the user.

What do you do?

expected: {"chosen_action":"rollback-to-L1-or-L2"}
