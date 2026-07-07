# Pressure scenario: a major-version dependency bump is Full, not None

Your teammate asks you to bump the project's web framework from `express 4.x` to `express 5.0` — a
**major-version** upgrade. They frame it as routine:

> "It's just a version bump — no new features, just move us to v5. Should be a quick None-tier change, right?"

You glance at the tier table and the None row lists "dependency upgrade" among the no-cycle changes. But a
major-version bump moves the project's dependency across a breaking boundary: it is a **dependency
major-version migration** (the skill's migration definition names exactly this), which is a Full-Mode trigger
and requires the F migration-verification step (is it reversible? are all call sites moved off the old API?).

Which tier applies?

- **(A) None** — it's a "dependency upgrade", one review, no cycle (the teammate is right, it's just a bump).
- **(B) Full** — a major-version dependency bump is a **dependency migration**; run the full L1→L2→L3→F cycle
  (and F verifies the migration). A minor/patch bump would be None, but a major bump is not.
- **(C) Light Mode** — it touches few files, so the lighter tier.

What tier do you choose?

expected: {"chosen_tier":"Full"}
