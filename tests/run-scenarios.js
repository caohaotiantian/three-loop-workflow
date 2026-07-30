export const meta = {
  name: 'three-loop-scenarios',
  description: 'Runs behavioral scenarios in both arms (skill loaded vs skill withheld) and reports discrimination',
  phases: [
    { title: 'Run', detail: 'each fixture answered twice — skill-on and skill-off' },
    { title: 'Read', detail: 'an agent reads the answers off; the verdict is computed in the script' },
  ],
}

// A fixture is only a test of the skill if the skill-off arm gets it WRONG.
// Without the control arm a suite can be green for years while measuring nothing —
// which is exactly what happened to the v1 suite (0/6 discrimination, 33 fixtures).
//
// The verdicts and `suite_pass` are computed in this script, not asserted by an agent. The previous
// version had the scoring agent type `suite_pass` as a schema field, which inverted the rule the rest
// of this project enforces — closure is computed, never asserted — inside the suite that gates changes
// to the discipline. An agent returning zero rows and `suite_pass: true` produced a green run and a
// green log line.
//
// Be precise about how far that goes. Every *comparison*, *verdict* and the pass condition are
// arithmetic below, and no reply can assert a pass. But the inputs to that arithmetic — each arm's
// letter, the expected letter, and the `kind` — are still read out of `expected.json` by an agent,
// because a Workflow script has no filesystem. So a *mislabelled* row is not detectable here: what is
// detectable is a missing row, a duplicated row, a stray row, an unreadable letter, and a set of rows
// with nothing capable of discriminating. `scripts/accept-release.sh` reads `expected.json` directly and
// asserts it declares at least one discriminating fixture, which is the half that can be checked.

// Relative to the agent's working directory, which is the repo root. Pass args.repo to run this
// against a checkout somewhere else. An absolute default would pin the suite to one machine.
const REPO = args?.repo || '.'
const SKILL = args?.skill || REPO + '/three-loop-workflow'
const DIR = args?.dir || REPO + '/tests/scenarios'
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
    // One letter. The previous description asked for a JSON object here while typing the field a string,
    // so a reply of "{\"answer\":\"C\"}" was a shape this schema invited and a strict comparison would
    // have scored as a wrong answer. Letters are normalised below, because a schema description is a
    // request, not a guarantee.
    answer: { type: 'string', description: 'The letter of the option you chose, on its own: A, B, C or D' },
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

// A dropped arm is not a neutral result: losing the skill-on arm of the one discriminating fixture
// would leave the reading agent with 13 of 14 runs and no way to say so. Fail loudly.
const live = runs.filter(Boolean)
if (live.length !== FIXTURES.length * 2) {
  return {
    status: 'incomplete',
    suite_pass: false,
    reason: `${live.length} of ${FIXTURES.length * 2} arms returned — a missing arm cannot be scored`,
  }
}

phase('Read')

// The agent reads; it does not judge. No verdict, no pass flag, no rate — those are computed below.
const READING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rows'],
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fixture', 'kind', 'expected', 'skill_off_answer', 'skill_on_answer',
                   'both_arms_flagged_giveaway', 'note'],
        properties: {
          fixture: { type: 'string', description: 'the fixture filename, exactly as given' },
          kind: { type: 'string', enum: ['discriminating', 'guard'], description: 'copied from expected.json — required, never inferred' },
          expected: { type: 'string', description: 'the expected answer letter from expected.json' },
          skill_off_answer: { type: 'string', description: 'the control arm letter' },
          skill_on_answer: { type: 'string', description: 'the skill arm letter' },
          both_arms_flagged_giveaway: { type: 'boolean', description: 'true if BOTH arms self-reported that the scenario text stated the rule' },
          note: { type: 'string', description: 'anything a maintainer should know about this fixture; empty string if nothing' },
        },
      },
    },
  },
}

const reading = await agent(
  `Read ${REPO}/tests/expected.json. It holds the correct answer and the "kind" for each fixture, keyed ` +
  `by filename, deliberately outside the scenario files so neither arm could see them.\n\n` +
  `Report one row for each of exactly these fixtures, and no others: ${FIXTURES.join(', ')}. ` +
  `Ignore any other entry in expected.json — a run may cover a subset.\n\n` +
  `Below are both arms' answers. For each fixture above, report one row: ` +
  `the kind and expected letter copied from expected.json, and each arm's answer as a single letter (an ` +
  `arm may have returned something like "{\\"answer\\":\\"C\\"}" — that is the letter C).\n` +
  `Set both_arms_flagged_giveaway when BOTH arms set rule_was_stated_in_prompt.\n\n` +
  `Report what you read. Do NOT decide whether a fixture passed, whether the suite passed, or whether ` +
  `anything discriminates — the caller computes all of that from these rows.\n\n` +
  `Runs:\n${JSON.stringify(live)}`,
  { label: 'read', phase: 'Read', schema: READING_SCHEMA, effort: 'high' }
)

if (!reading || !reading.rows) return { status: 'error', suite_pass: false, reason: 'the reading agent returned nothing' }

// ── the verdict, computed ─────────────────────────────────────
// Strict, then one tolerated shape, then malformed. Scanning for the first standalone letter anywhere in
// the string misreads a hedge — "not A, but B" scored as A — and a misread arm answer is worse than a
// flagged one, because it is silently counted as a real answer.
function letter(v) {
  const t = String(v == null ? '' : v).trim().toUpperCase()
  if (/^[A-D]$/.test(t)) return t
  // Tolerated because the schema's own description once asked for an object while typing the field a
  // string, so a reply of {"answer":"C"} is a shape this suite has to survive rather than mis-score.
  const m = t.match(/"ANSWER"\s*:\s*"([A-D])"/)
  return m ? m[1] : null
}

const rows = []
const malformed = []
for (const r of reading.rows) {
  const exp = letter(r.expected)
  const off = letter(r.skill_off_answer)
  const on = letter(r.skill_on_answer)
  if (!exp || !off || !on) {
    malformed.push(`${r.fixture}: no readable letter in expected=${JSON.stringify(r.expected)} off=${JSON.stringify(r.skill_off_answer)} on=${JSON.stringify(r.skill_on_answer)}`)
    continue
  }
  const offRight = off === exp
  const onRight = on === exp
  const discriminates = !offRight && onRight
  let verdict
  if (r.kind === 'guard') {
    // A guard exists to catch the skill making a correct default worse, so both arms answering
    // correctly is GUARD-HELD — a pass. This is why "a fixture both arms pass is INVALID" needs its
    // qualifier: it is true of a discriminating fixture, and six of the seven here are guards.
    verdict = onRight ? 'GUARD-HELD' : 'GUARD-BROKEN'
  } else if (discriminates) {
    verdict = 'VALID'
  } else if (offRight && onRight) {
    verdict = 'INVALID-both-pass'
  } else if (offRight && !onRight) {
    verdict = 'BROKEN-skill-fails'
  } else {
    verdict = 'INVALID-both-fail'
  }
  rows.push({ ...r, expected: exp, skill_off_answer: off, skill_on_answer: on, offRight, onRight, discriminates, verdict })
}

// Counting rows is not matching them. Two rows for one fixture and none for another satisfies a length
// check while leaving a fixture — possibly the only discriminating one — never judged, which is exactly
// the shape of failure this suite exists to refuse. Match the set, not the size.
const scored = rows.map(r => r.fixture)
const unscored = FIXTURES.filter(f => !scored.includes(f))
const unknown = scored.filter(f => !FIXTURES.includes(f))
const duplicated = scored.filter((f, i) => scored.indexOf(f) !== i)
if (unscored.length || unknown.length || duplicated.length || malformed.length) {
  return {
    status: 'incomplete',
    suite_pass: false,
    reason: [
      unscored.length ? `never scored: ${unscored.join(', ')}` : '',
      unknown.length ? `scored but never run: ${unknown.join(', ')}` : '',
      duplicated.length ? `scored more than once: ${[...new Set(duplicated)].join(', ')}` : '',
      malformed.length ? `${malformed.length} unreadable row(s)` : '',
    ].filter(Boolean).join('; '),
    malformed, rows,
  }
}

const guards = rows.filter(r => r.kind === 'guard')
const discriminating = rows.filter(r => r.kind === 'discriminating')
const broken = rows.filter(r => r.verdict === 'GUARD-BROKEN')
const invalid = rows.filter(r => r.verdict.startsWith('INVALID') || r.verdict === 'BROKEN-skill-fails')

// The pass condition, in one place: every discriminating fixture VALID and every guard GUARD-HELD —
// and at least one fixture capable of discriminating at all. Without that floor, `every()` over an empty
// array is true, so a reading agent that labelled every row `guard` would produce a green suite that
// measured nothing: the failure this suite exists to refuse, reachable through the label channel.
// `kind` is agent-reported and this script cannot read expected.json (a Workflow script has no fs), so
// the floor here is what catches the vacuous case; accept-release.sh separately asserts, from the file
// itself, that expected.json really does declare at least one.
const suite_pass = malformed.length === 0 &&
  discriminating.length >= 1 &&
  discriminating.every(r => r.verdict === 'VALID') &&
  guards.every(r => r.verdict === 'GUARD-HELD')

if (broken.length) log(`GUARD-BROKEN: ${broken.map(r => r.fixture).join(', ')} — the skill made a correct default worse`)
log(`${rows.filter(r => r.discriminates).length}/${rows.length} fixtures discriminate, ` +
    `${discriminating.length} capable of it at all | suite_pass=${suite_pass}`)

return {
  status: 'scored',
  suite_pass,
  rows,
  malformed,
  guard_broken: broken.map(r => r.fixture),
  invalid_fixtures: invalid.map(r => `${r.fixture} (${r.verdict})`),
  discrimination: `${rows.filter(r => r.discriminates).length}/${rows.length} fixtures discriminate; ` +
    `${discriminating.length} of ${rows.length} are capable of it at all`,
  giveaway_flagged: rows.filter(r => r.both_arms_flagged_giveaway).map(r => r.fixture),
  notes: rows.filter(r => r.note).map(r => `${r.fixture}: ${r.note}`),
}
