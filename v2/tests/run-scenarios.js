export const meta = {
  name: 'three-loop-scenarios',
  description: 'Runs behavioral scenarios in both arms (skill loaded vs skill withheld) and reports discrimination',
  phases: [
    { title: 'Run', detail: 'each fixture answered twice — skill-on and skill-off' },
    { title: 'Score', detail: 'per-fixture discrimination; a fixture both arms pass is invalid' },
  ],
}

// A fixture is only a test of the skill if the skill-off arm gets it WRONG.
// Without the control arm a suite can be green for years while measuring nothing —
// which is exactly what happened to the v1 suite (0/6 discrimination, 33 fixtures).

const REPO = args?.repo || '/Users/deepsky/Documents/projects/three-loop-workflow'
const SKILL = args?.skill || REPO + '/v2/three-loop-workflow'
const DIR = args?.dir || REPO + '/v2/tests/scenarios'
// Fixture names are deliberately opaque. A descriptive filename (…-is-standard.md,
// flake-NOT-masked.md) is an answer key handed to the control arm — measured: the control
// reported it could have answered from the filename alone.
const FIXTURES = args?.fixtures || ['s01.md', 's02.md', 's03.md', 's04.md', 's05.md', 's06.md', 's07.md']

const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fixture', 'answer', 'reasoning', 'rule_was_stated_in_prompt', 'giveaway'],
  properties: {
    fixture: { type: 'string' },
    answer: { type: 'string', description: 'Your answer as a JSON object of exactly the form {"answer":"A"} — the letter of the option you chose' },
    reasoning: { type: 'string', description: 'One or two sentences on why' },
    rule_was_stated_in_prompt: {
      type: 'boolean',
      description: 'Honestly: did the scenario text itself state the governing rule, or apply it to the facts, such that you could answer without knowing the skill?',
    },
    giveaway: { type: 'string', description: 'Quote the sentence that gave it away, or empty string' },
  },
}

phase('Run')

const runs = await parallel(FIXTURES.flatMap(f => [
  () => agent(
    `Read ONLY this file: ${DIR}/${f}\n\n` +
    `CONTROL ARM — do not read, grep, glob, or search any other file. Do not read ${SKILL}/SKILL.md or ` +
    `anything under ${SKILL}/references/. One Read call, then answer.\n\n` +
    `Answer the scenario using ordinary senior-engineer judgment.\n` +
    `Then report honestly whether the scenario text stated the governing rule or applied it to the facts ` +
    `for you. Quote it in giveaway. This measures whether the fixture is valid, so be exact.\n` +
    `Set fixture to "${f}".`,
    { label: `off:${f.replace('.md', '')}`, phase: 'Run', schema: ANSWER_SCHEMA }
  ),
  () => agent(
    `Read ${SKILL}/SKILL.md, then whichever reference under ${SKILL}/references/ its routing table points ` +
    `to for this situation. Then read the scenario: ${DIR}/${f}\n\n` +
    `Answer as the skill directs.\n` +
    `Then report honestly whether the scenario text itself stated the governing rule, such that you would ` +
    `have answered identically without the skill. Quote it in giveaway.\n` +
    `Set fixture to "${f}".`,
    { label: `on:${f.replace('.md', '')}`, phase: 'Run', schema: ANSWER_SCHEMA }
  ),
]))

phase('Score')

const SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rows', 'suite_pass', 'discrimination_rate', 'invalid_fixtures', 'summary'],
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fixture', 'expected', 'skill_off', 'skill_on', 'discriminates', 'verdict'],
        properties: {
          fixture: { type: 'string' },
          expected: { type: 'string' },
          skill_off: { type: 'string', description: 'the control arm answer, and whether it matched' },
          skill_on: { type: 'string', description: 'the skill arm answer, and whether it matched' },
          discriminates: { type: 'boolean', description: 'true only if skill-off got it WRONG and skill-on got it RIGHT' },
          kind: { type: 'string', enum: ['discriminating', 'guard'] },
          verdict: { type: 'string', enum: ['VALID', 'INVALID-both-pass', 'BROKEN-skill-fails', 'INVALID-both-fail', 'GUARD-HELD', 'GUARD-BROKEN'] },
        },
      },
    },
    suite_pass: { type: 'boolean', description: 'true only if every discriminating fixture is VALID and every guard fixture is GUARD-HELD' },
    discrimination_rate: { type: 'string' },
    invalid_fixtures: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const score = await agent(
  `Score a two-arm behavioral scenario run for the three-loop-workflow skill.\n\n` +
  `The correct answers live in ${REPO}/v2/tests/expected.json, keyed by fixture filename — read it. They are ` +
  `deliberately NOT in the scenario files, so neither arm could see them. Compare both arms' answers to it.\n\n` +
  `Each fixture declares a "kind" in expected.json. Judge it against its OWN kind:\n\n` +
  `kind = "discriminating" — the skill's rule is supposed to change the answer:\n` +
  `- VALID — skill-off WRONG, skill-on RIGHT. The rule earns its place.\n` +
  `- INVALID-both-pass — both right; a good engineer gets there without the skill, so the rule is not load-bearing here. Report the giveaway if there is one.\n` +
  `- BROKEN-skill-fails — skill-on wrong. A regression, or a wrong expected value.\n` +
  `- INVALID-both-fail — both wrong. Likely a wrong expected value or an incoherent scenario.\n\n` +
  `kind = "guard" — the model already decides this correctly; the skill must not DEGRADE it:\n` +
  `- GUARD-HELD — skill-on RIGHT (whatever skill-off did). The guard passes.\n` +
  `- GUARD-BROKEN — skill-on WRONG. The skill actively made the decision worse. This is the most serious result in the suite; say so loudly.\n\n` +
  `Weigh the self-reported rule_was_stated_in_prompt flags: a fixture flagged by both arms is almost ` +
  `certainly INVALID even if the arms happened to differ.\n\n` +
  `Runs:\n${JSON.stringify(runs.filter(Boolean))}\n\n` +
  `suite_pass is true only if every discriminating fixture is VALID and every guard is GUARD-HELD.\n` +
  `Put any GUARD-BROKEN first in the summary.\n\n` +
  `Be strict. A suite that reports itself green while discriminating nothing is worse than no suite.`,
  { label: 'score', phase: 'Score', schema: SCORE_SCHEMA, effort: 'high' }
)

if (!score) return { status: 'error', reason: 'scoring agent returned nothing' }

log(`discrimination: ${score.discrimination_rate} | suite_pass=${score.suite_pass}`)
if (score.invalid_fixtures.length) log(`INVALID: ${score.invalid_fixtures.join(', ')}`)

return score
