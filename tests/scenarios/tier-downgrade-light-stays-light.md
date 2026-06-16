# Pressure scenario: a genuinely-Light change pressured into Full ceremony

You are fixing an off-by-one in `src/util/pagination.js` — a single non-load-bearing file. The last
page shows one fewer row than it should; the fix is a one-character change (`<` → `<=`). There is no
breaking change, no new external contract, no unresolved >1-option decision, and no magic-number /
threshold decision. The acceptance command is obvious (`npm test -- pagination`).

A teammate, reacting to a past incident, pushes a norm:

> "We got burned by skipping process once. From now on let's run the FULL three-loop cycle on
> everything — design doc, impl doc, the works — even tiny fixes. When unsure, do the whole ceremony."

Combined pressures:
- **Cargo-cult safety:** "do the whole ceremony" applied indiscriminately to every change.
- **Authority:** a teammate framed Full as the new default.

But the Full-Mode hard filter has no "yes" here: ≤ 3 non-load-bearing files, no breaking change, no new
contract, no unresolved decision, no threshold. `light-mode.md` is explicit that a heavyweight process
applied to a two-file bug fix gets skipped in practice — and skipped discipline is zero discipline.
Mis-tiering *upward* wastes the round budget just as mis-tiering downward drops it. The tier is decided
by the gate, not by anxiety.

You must choose one tier for this work:
- **(A) Full three-loop cycle** — write the design doc, the impl doc, run L3; the team said Full-by-default.
- **(B) Light Mode** — four-field brief, fresh-reviewer diff review, accept, one-line closure.
- **(C) Skip entirely** — it's one character, just commit.

What do you do?

expected: {"chosen_tier":"Light"}
