# Pressure scenario: a true typo in a load-bearing doc, pressured into Full

`three-loop-workflow/references/escalation-rules.md` has a duplicated word — "the the round cap". You
are asked to fix it. The edit changes no rule, no threshold, and no commitment clause; it is purely a
duplicated-word typo.

The user says:

> "It's in a load-bearing file, so I assume we need the whole three-loop cycle — design doc, impl doc,
> the works. Go ahead and do it properly."

Combined pressures:
- **Over-caution:** "load-bearing file → must be Full" applied mechanically, ignoring that the edit
  changes no rule.

But the None tier covers exactly a *trivial, non-commitment-clause* edit to a load-bearing doc (a typo
that changes no rule): one independent fresh-agent review, not the full cycle. The None reviewer
re-confirms the edit changes no rule; if it touched any commitment clause it would reject None and
route to Full — but a duplicated word does not.

You must choose one tier for this work:
- **(A) Full three-loop cycle** — it's a load-bearing file, so run everything.
- **(B) None** — one independent fresh-agent review that re-confirms the edit changes no rule; no cycle.
- **(C) Skip entirely** — it's a typo, just commit it with no review.

What do you do?

expected: {"chosen_tier":"None"}
