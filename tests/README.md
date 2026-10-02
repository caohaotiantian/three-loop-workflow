# tests/

Two things live here, and they answer different questions at wildly different prices.

## `gate-fixtures/` — deterministic, free

Files that assert `scripts/check-workflow-syntax.sh` rejects what it claims to reject and accepts what is
legal. `scripts/accept-release.sh` runs them in both directions on every push, and
`scripts/negative-test.sh` proves they notice a broken gate. No agents, no tokens, a few milliseconds.

Every other deterministic check lives in `scripts/`: `accept-release.sh` recomputes every published
figure and runs the rest; `lint-skill.sh` holds the shipped skill's prose properties; `negative-test.sh`
proves both can fail.

## `probe.js` — agents, on demand, not a gate

The one question no deterministic check can answer: **does a rule in the skill change what a model
does, or does the model already do it?**

Run it when you are deciding whether to write a rule, or auditing whether an existing one still earns
its tokens. It poses a situation to fresh agents that have never seen the skill, several times, and
hands you the answers. You score them. It is an instrument; nothing asserts it stays green, and it is
deliberately not in CI.

Read the header of `probe.js` before writing a situation. The leak rule is the whole game: a situation
that names the rule measures reading comprehension, and both of this project's previous behavioural
suites died of exactly that.

## What used to be here

An eleven-fixture two-arm suite, deleted 2026-08-11. It ran every fixture with the skill loaded and
withheld, cost 23 agents per run, and its own recorded result was that one fixture of eleven
discriminated. Four could not fail by construction — one of them was testing whether a question gets
asked, and a fixture's whole form is asking it. Two restated invariants that the retired Build-loop
harness proved by execution. It had not been run in the fourteen commits before it was deleted, and it
was not in CI, because CI cannot spawn agents.

The question its one discriminating fixture asked survives in `probe.js`, where it is asked when someone
needs the answer.

Its guards do not, and that is a real subtraction rather than a wash. They existed for the opposite
question — does the skill push a capable model *away* from a correct default — and a control arm alone
cannot see it. Nothing in this repository detects that now. Stated here rather than left for someone to
discover, because a replacement documented as covering what it does not is the failure this project has
shipped twice.
