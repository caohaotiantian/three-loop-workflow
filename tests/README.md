# Behavioral scenarios

A scenario tests whether **the skill** changes what an agent decides. It is only a test if an agent *without* the skill gets it **wrong**.

That is not a style preference. The v1 suite was measured: 6 fixtures, both arms, 12 runs. Skill-off passed 6/6, skill-on passed 6/6 — **0% discrimination**. All 12 runs self-reported that the answer was stated in the prompt, and 9 of 9 files inspected had the same defect. The suite had been green for 16 releases while carrying zero information.

## Run it

```bash
# From the repo root, in Claude Code:
Workflow({ scriptPath: "tests/run-scenarios.js" })
```

Every fixture runs twice — once with the skill loaded, once with an agent forbidden to read it. The runner reports per-fixture discrimination and fails on any fixture where both arms agree.

## Writing one that works

The scenario supplies **facts**. The skill supplies the **rule**. If the fixture contains the rule, it is testing reading comprehension.

**Do not:**

- State the governing rule. *"But L1/L2 use the strict two-generation rule…"* — the fixture just answered itself.
- Label the pressures. A `Combined pressures: sunk cost, authority, minimization` list tells the reader the trap is a trap.
- Apply the rule to the facts for the reader. *"But this touches an authentication contract"* is the whole decision.
- Write self-incriminating distractors. *"(A) Run a silent round 4 — the cap is 'just a guideline'"* is not a choice anyone picks.
- Let the correct option be the only one written in complete, procedural prose.

**Do:**

- Give the situation flatly, the way a real user would phrase it.
- Write every option in the same register and at the same length. A reader who does not know the rule should find them genuinely comparable.
- Include the facts the rule keys on — a cookie's `maxAge` is persisted, the endpoint is public — without naming which fact matters or why.
- Put the pressure in the *situation* ("we need this in an hour"), never in a meta-commentary about the situation.

**Test both directions.** A suite where the answer is always "escalate" or "go deeper" trains and measures nothing but caution — and caution is what makes a workflow too expensive to use. Roughly a third of fixtures should have "proceed directly" or "do not escalate" as the correct answer.

## Two kinds of fixture

Measuring the first v2 suite produced an uncomfortable result: 5 of 6 fixtures were answered correctly by the control arm. Not because they leaked — because a competent engineer reaches the right answer without any skill at all. "Run the gates before spending a reviewer", "don't mask a flake", "look up a value the repo already has" are baseline senior behavior in 2026, and writing them down changes nothing.

Rather than pretend otherwise, each fixture declares what it is for, in `expected.json`:

- **`discriminating`** — the skill's rule is supposed to change the decision. It passes only when skill-off is **wrong** and skill-on is **right**. These are the fixtures that justify a rule's existence. A `discriminating` fixture that both arms pass is telling you the rule is not carrying weight; delete the rule or delete the fixture.
- **`guard`** — the model already gets this right. The fixture exists to catch the skill making it **worse**. It passes when skill-on is right, whatever the control did. A `GUARD-BROKEN` result — the skill flipping a correct default into a wrong answer — is the most serious thing this suite can report.

Guards are not filler. A rule-heavy skill's characteristic failure is pushing a capable model *away* from good judgment — over-escalating, over-tiering, spawning reviewers nobody needed. Guards are how that gets caught.

Expect the discriminating set to be small. Rules survive here by being **specific and counter-intuitive** — an exact reviewer count, a tie-break between two defensible tiers, "one risky corner does not upgrade the whole change". If you cannot say what a good engineer would plausibly do *differently* without the rule, you have learned something about the rule.

## Format

Fixture files are named `s01.md`, `s02.md`, … — **deliberately opaque**.

A descriptive filename is an answer key. In the first measured run, files named `…-is-standard.md` and `flake-not-masked.md` were passed to both arms, and the control arm volunteered that it "could have produced 'Standard' from the filename alone without reading anything." Name them nothing.

Correct answers live in `expected.json`, keyed by filename, in the form `{"answer": "B"}`. They are kept out of the scenario files so that neither arm can see them — an instruction to "ignore the expected line" is not a control.

Each fixture: the situation, then lettered options. Distribute correct answers across A/B/C — five answers of "B" means a coin-flipper scores well.

## When a fixture fails its control arm

Fix the fixture or delete it. A scenario both arms answer correctly is not evidence about the skill, and keeping it green is worse than having no suite — it reads as coverage that does not exist.
