# tests/

Two things live here, and they answer different questions at wildly different prices.

## `gate-fixtures/` — deterministic, free

Eight files that assert `three-loop-workflow/scripts/check-workflow-syntax.sh` rejects what it claims to
reject and accepts what is legal. `scripts/accept-release.sh` runs them in both directions on every
push. No agents, no tokens, a few milliseconds.

Every other deterministic check lives outside this directory: `scripts/sim-phase.js` drives the real
`phase.js` with stub agents, `scripts/negative-test.sh` breaks it and requires the harness to notice,
and `scripts/accept-release.sh` recomputes every published figure. Together they cost about two seconds
of CPU and zero tokens, and they are the only things in this repository that have ever caught a
regression.

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
asked, and a fixture's whole form is asking it. Two restated invariants that `sim-phase.js` already
proves by execution and `negative-test.sh` already proves can fail. It had not been run in the fourteen
commits before it was deleted, and it was not in CI, because CI cannot spawn agents.

Keeping it green cost more than running it ever did: a claim about the fixture tally had propagated to
eight places across the repository, and a recomputation check, two exemption markers and a cross-file
sweep existed to keep those eight in agreement. All of that went with the suite.

The question it existed to ask survives in `probe.js`, where it is asked when someone needs the answer.
