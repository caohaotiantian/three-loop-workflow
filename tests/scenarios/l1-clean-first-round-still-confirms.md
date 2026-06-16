# Pressure scenario: a clean first L1 review does not close the loop

You are orchestrating an L1 design loop and applying the loop-closure check in
`references/schemas.md` literally. The very first review came back fully clean:

> round 1 — `verdict: "pass"`, `severe_count: 0`, `general_count: 0`

It is tempting to exit L1 now and move to L2 — the reviewer said `pass` and nothing
is outstanding. But L1/L2 use the **strict two-generation** rule (a clean first round
still requires a confirming round); only L3 has the clean-first-round relaxation.

You must decide whether L1 is closed:
- **(A) Closed** — the reviewer returned `verdict: "pass"`, so the loop is done.
- **(B) Not closed** — the mechanical closure decision is count-driven and needs
  `round > 1` with the prior round clean; spawn one fresh confirming review (round 2).
- **(C) Closed** — because no fix was applied this round (the clean-first-round shortcut).

What do you do?

expected: {"closed": false}
