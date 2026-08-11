export const meta = {
  name: 'probe',
  description: 'Control-arm probe: does a rule change what a model does, or does the model already do it?',
  phases: [{ title: 'Probe', detail: 'situations answered with the skill withheld, N replicates' }],
}

// An INSTRUMENT, not a gate. Nothing asserts it stays green, nothing runs it in CI, and it returns
// evidence rather than a verdict. That is deliberate: the question it answers — "does this prose change
// what a model does?" — is live when someone is deciding whether to write or keep a rule, not on every
// push. Everything that can be answered deterministically is answered by scripts/sim-phase.js,
// scripts/negative-test.sh and scripts/accept-release.sh, which cost no agents at all.
//
// It replaces an 11-fixture two-arm suite that cost 23 agents per run and returned one bit. That suite
// was deleted on 2026-08-11: four of its fixtures could not fail by construction, two restated
// invariants already proven by mutation, and it had not been run in fourteen commits.
//
// ── THE LEAK RULE ────────────────────────────────────────────────────────────────────────────
// A situation that names the rule measures reading comprehension, not behaviour. Before you run this,
// read each situation and ask: could a model answer correctly by quoting the prompt back?
//
// This is not hypothetical. Both of this project's behavioural suites died of it. v1's had 0%
// discrimination and every run self-reported that the scenario text stated the answer. And on
// 2026-08-11 the first run of THIS probe was discarded because a situation about refreshing a
// project's context named `CLAUDE.md` — which the skill's description already lists as a contract
// file — so both arms activated and the cell measured nothing.
//
// A situation is well formed when it describes a predicament and nothing else: no rule vocabulary, no
// option list containing the answer, no file the rule is about.
//
// ── READING THE RESULT ───────────────────────────────────────────────────────────────────────
// Replicates answer correctly  ->  the rule is REDUNDANT with the model's judgment. It costs tokens on
//                                  every read and changes nothing. Delete it, or keep it and say why.
// Replicates answer WRONG      ->  the rule is LOAD-BEARING. This is the only positive result here.
// Replicates answer BETTER     ->  the rule is WRONG. Fix the rule, not the probe.
//
// One bounded caveat, and it is the strongest argument against acting on a redundant verdict: a model
// ASKED a question directly answers better than a model DOING the work under budget pressure. So a
// correct answer here proves the model knows, not that it will act. Weigh that before deleting a rule
// whose failure is expensive.
//
// ── USAGE ────────────────────────────────────────────────────────────────────────────────────
//   Workflow({ scriptPath: "tests/probe.js" })                       the built-in situations
//   Workflow({ scriptPath: "tests/probe.js", args: {                 your own
//     situations: [{ id: "S1", text: "..." }], replicates: 3 } })

// The Workflow tool delivers `args` as a JSON STRING. Measured in this repository, not assumed —
// phase.js carries the same normaliser and the same comment, and the suite this file replaced had a
// mutation (S5) whose whole job was to catch its removal. Without this, a caller passing their own
// situations silently gets the built-in ones: a wrong answer, not an error.
const input = typeof args === 'string' ? (() => { try { return JSON.parse(args) } catch { return {} } })()
            : (args || {})

const SITUATIONS = input.situations || [
  // S1 carries over the one question the deleted suite ever measured a discrimination on: how much
  // process a change deserves when most of it is low-risk and one corner is not. Recorded caveat from
  // that measurement — its gap was partly an artefact of the wording of one multiple-choice option,
  // which is why it is posed here as an open question instead.
  { id: 'depth-tie-break', rule: 'One risky corner does not upgrade the whole change (SKILL.md §1)',
    text: `You are grading how much process a change deserves. The change is a four-file refactor of an internal helper module. One of the four files also fixes an off-by-one in a billing calculation that is user-visible and hard to reverse. How much process does the whole change get?` },

  { id: 'reviewer-inputs', rule: 'Reviewers get the diff and the plan and nothing else (SKILL.md §4)',
    text: `You are about to hand a diff to a fresh reviewer agent. You have the diff, the plan you wrote, your own summary of what you did, and a list of the three areas you are least confident about. What do you give the reviewer?` },

  { id: 'triage-first', rule: 'Triage before you count (SKILL.md §4)',
    text: `You wrote a change and a reviewer came back with nine findings, four of them marked as blocking. You have a limited budget for fix rounds. What is your next step, concretely, before you edit anything?` },

  { id: 'guide-is-wrong', rule: 'Correct a wrong guide line now in its own commit; file a broken command rather than fixing it here (references/maintenance.md)',
    text: `You have just spent an hour discovering that a documented command in your project's instructions file does not do what it says. You are three quarters of the way through an unrelated feature. What do you do?` },
]

const REPLICATES = input.replicates || 3

const ANSWER = {
  type: 'object',
  required: ['what_i_would_do'],
  properties: { what_i_would_do: { type: 'string' } },
}

phase('Probe')

// The arms are isolated by construction: each agent is given the situation and nothing else. It is not
// told a skill exists, so there is nothing to withhold and nothing to leak. There is no skill-on arm —
// the skill's own text is what you are holding it against, and you can read that yourself.
//
// WHAT THAT COSTS, stated because the suite this replaced did cover it. With only a control arm this
// instrument cannot detect the skill making a capable model WORSE — a rule that pushes it away from a
// correct default. The deleted suite called that GUARD-BROKEN and called it the most serious thing it
// could report; ten of its eleven fixtures existed for it. Nothing in this repository detects it now.
// To ask that question you have to run both arms by hand and compare, and no gate will remind you.
const cells = []
for (const s of SITUATIONS) {
  for (let r = 1; r <= REPLICATES; r++) cells.push({ s, r })
}

const answers = await parallel(cells.map(c => () =>
  agent(`You are a senior engineer working with an agentic coding harness. Answer with what you would
actually do, concretely and briefly — commands where commands apply. There is no process document to
consult; answer from your own judgment.

${c.s.text}

Do not read any files. (Reply ${c.r} of ${REPLICATES} — answer independently.)`,
    { label: `probe:${c.s.id}/${c.r}`, schema: ANSWER })
    .then(a => ({ id: c.s.id, rule: c.s.rule, rep: c.r, answer: a.what_i_would_do }))))

const bySituation = {}
for (const a of (answers || []).filter(Boolean)) {
  bySituation[a.id] = bySituation[a.id] || { rule: a.rule, replies: [] }
  bySituation[a.id].replies.push(a.answer)
}

log('Read each set against the rule it is paired with. Correct unprompted = redundant; wrong = ' +
    'load-bearing; better than the rule = the rule is wrong. Scoring is yours, not the harness\'s — ' +
    'an agent that scores its own probe is the defect this replaced.')

return bySituation
