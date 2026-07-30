#!/usr/bin/env node
// Executable model of tests/run-scenarios.js.
//
// The two-arm suite is the acceptance gate for any change to the discipline, so its own pass condition
// has to be checked. It used to be a boolean the scoring agent typed: an agent returning zero rows and
// `suite_pass: true` produced a green run, inside the suite whose whole purpose is refusing to be green
// while measuring nothing. The verdict is now computed in the script, and this harness drives that
// computation with canned agent replies — including replies an agent should not be able to make stick.
//
// Usage:  node scripts/sim-scenarios.js
// Exit 0 = the scoring arithmetic is correct. Non-zero = it is not.

'use strict'
const fs = require('fs')
const path = require('path')

const SRC = process.env.SCENARIOS_JS ||
  path.join(__dirname, '..', 'tests', 'run-scenarios.js')

function load() {
  const body = fs.readFileSync(SRC, 'utf8').replace(/^export\s+/gm, '')
  return new Function('agent', 'parallel', 'pipeline', 'log', 'phase', 'args', 'budget', 'workflow',
    `return(async()=>{${body}})()`)
}

// `answers` maps fixture -> {off, on}; `rows` is what the reading agent reports back.
// `drop` names arms that return null, modelling a dead agent.
async function drive({ fixtures, answers, rows, drop = [], stringifyArgs = false, repo }) {
  const logs = []
  const agent = async (prompt, opts) => {
    const label = (opts && opts.label) || '?'
    if (drop.includes(label)) return null
    if (label === 'read') return rows
    const [arm, name] = label.split(':')
    const a = answers[name + '.md'] || {}
    return {
      fixture: name + '.md',
      answer: arm === 'off' ? a.off : a.on,
      reasoning: 'x',
      rule_was_stated_in_prompt: false,
      giveaway: '',
    }
  }
  const parallel = async (thunks) => Promise.all(thunks.map(t => t().catch(() => null)))
  const a = { fixtures, repo: repo || '.' }
  return load()(agent, parallel, null, m => logs.push(m), () => {},
    stringifyArgs ? JSON.stringify(a) : a, null, null).then(res => ({ res, logs }))
}

// Two fixtures is enough to exercise every branch: one guard, one discriminating.
const F = ['s01.md', 's04.md']
const row = (fixture, kind, expected, off, on, o = {}) => ({
  fixture, kind, expected, skill_off_answer: off, skill_on_answer: on,
  both_arms_flagged_giveaway: false, note: '', ...o,
})

const CASES = [
  { name: 'a clean run passes: the guard holds and the discriminating fixture discriminates',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s04.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.suite_pass, true), eq(r.res.status, 'scored'),
      eq(r.res.rows[0].verdict, 'GUARD-HELD'), eq(r.res.rows[1].verdict, 'VALID'),
      eq(r.res.rows[1].discriminates, true)) },

  { name: 'a broken guard fails the suite — the skill made a correct default worse',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'C' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'C'), row('s04.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.rows[0].verdict, 'GUARD-BROKEN'),
      deep(r.res.guard_broken, ['s01.md']),
      ok(r.logs.some(l => /GUARD-BROKEN/.test(l)), 'a broken guard must be logged loudly')) },

  { name: 'a guard both arms answer correctly is a PASS, not INVALID',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s04.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.rows[0].verdict, 'GUARD-HELD'), eq(r.res.rows[0].discriminates, false),
      eq(r.res.suite_pass, true, 'six of seven fixtures are guards; both arms passing one is the expected result')) },

  { name: 'a DISCRIMINATING fixture both arms answer correctly fails the suite',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'B', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s04.md', 'discriminating', 'B', 'B', 'B')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.rows[1].verdict, 'INVALID-both-pass')) },

  { name: 'the skill getting a discriminating fixture wrong fails the suite',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'B', on: 'C' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s04.md', 'discriminating', 'B', 'B', 'C')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.rows[1].verdict, 'BROKEN-skill-fails')) },

  { name: 'both arms wrong on a discriminating fixture is invalid, not a pass',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'C', on: 'C' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s04.md', 'discriminating', 'B', 'C', 'C')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.rows[1].verdict, 'INVALID-both-fail')) },

  // The defect that motivated the rewrite: no reply an agent can produce should be able to assert a pass.
  { name: 'an agent reporting zero rows cannot produce a green run',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.status, 'incomplete')) },

  { name: 'an agent scoring only some fixtures cannot produce a green run',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.status, 'incomplete')) },

  { name: 'an unreadable answer letter is surfaced, not scored as a wrong answer',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'yes'), row('s04.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.status, 'incomplete'),
      ok((r.res.malformed || []).length === 1, 'the unreadable row must be named')) },

  // A shape the old schema invited: its description asked for an object while typing the field a string.
  { name: 'a double-encoded answer is normalised to its letter',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', '{"answer":"A"}', 'A'),
                            row('s04.md', 'discriminating', 'B', '{"answer":"A"}', '{"answer":"B"}')] } },
    expect: r => all(eq(r.res.suite_pass, true), eq(r.res.rows[1].skill_on_answer, 'B'),
      eq(r.res.rows[1].verdict, 'VALID')) },

  // Found by a reviewer: counting rows is not matching them. Two rows for one fixture and none for the
  // other satisfied `rows.length === FIXTURES.length` and scored green with the discriminating fixture
  // never judged.
  { name: 'duplicate rows for one fixture cannot stand in for a fixture never scored',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s01.md', 'guard', 'A', 'A', 'A')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.status, 'incomplete'),
      ok(/s04\.md/.test(JSON.stringify(r.res)), 'the unscored fixture must be named')) },

  { name: 'a row for a fixture that was never run cannot be scored',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s99.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.status, 'incomplete')) },

  // The P3 Accept criterion, and the one channel no case exercised: a reading agent that tries to assert
  // the verdict. A reviewer mutated the script to honour `reading.suite_pass` when present and all twelve
  // cases stayed green, because no canned reply ever set it.
  { name: 'a reading agent cannot assert suite_pass alongside a broken guard',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'C' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { suite_pass: true, discrimination_rate: '2/2', verdict: 'VALID',
                     rows: [row('s01.md', 'guard', 'A', 'A', 'C'), row('s04.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.suite_pass, false, 'the script must override an asserted pass'),
      deep(r.res.guard_broken, ['s01.md'])) },

  { name: 'a reply that labels every fixture a guard cannot pass vacuously',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s04.md', 'guard', 'B', 'A', 'B')] } },
    expect: r => eq(r.res.suite_pass, false, 'no fixture capable of discriminating means the suite measured nothing') },

  { name: 'a hedged answer is flagged, not read as its first letter',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'not A, but B'), row('s04.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.suite_pass, false), eq(r.res.status, 'incomplete'),
      ok((r.res.malformed || []).length === 1, 'the hedged row must be flagged as unreadable')) },

  { name: 'a subset run scores only the fixtures it was given',
    input: { fixtures: ['s01.md'], answers: { 's01.md': { off: 'A', on: 'A' } },
             rows: { rows: [row('s01.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.status, 'scored'), eq(r.res.suite_pass, true),
      ok(r.res.rows.length === 1, 'exactly the requested fixture is scored')) },

  // The Workflow tool passes args as a JSON string, so `args?.repo` on it was silently undefined and the
  // documented `args: {repo: "<path>"}` ran against the default tree without saying so — a wrong answer
  // rather than an error, which is worse.
  { name: 'args as a JSON string is honoured, not silently ignored',
    input: { fixtures: F, stringifyArgs: true,
             answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'guard', 'A', 'A', 'A'), row('s04.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.status, 'scored'), eq(r.res.suite_pass, true),
      ok(r.res.rows.length === 2, 'the fixtures from the string args must be the ones scored')) },

  { name: 'a subset passed as a JSON string is honoured',
    input: { fixtures: ['s01.md'], stringifyArgs: true,
             answers: { 's01.md': { off: 'A', on: 'B' } },
             rows: { rows: [row('s01.md', 'discriminating', 'B', 'A', 'B')] } },
    expect: r => all(eq(r.res.status, 'scored'),
      ok(r.res.rows.length === 1, 'exactly the one requested fixture is scored')) },

  { name: 'a dropped arm is incomplete, not a scored result',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: { rows: [] }, drop: ['on:s04'] },
    expect: r => all(eq(r.res.status, 'incomplete'), eq(r.res.suite_pass, false),
      ok(/3 of 4/.test(r.res.reason || ''), 'the reason must name how many arms returned')) },

  { name: 'a reading agent that returns nothing is an error, not a pass',
    input: { fixtures: F, answers: { 's01.md': { off: 'A', on: 'A' }, 's04.md': { off: 'A', on: 'B' } },
             rows: null, drop: ['read'] },
    expect: r => all(eq(r.res.status, 'error'), eq(r.res.suite_pass, false)) },
]

const problems = []
function ok(cond, msg) { return cond ? null : (msg || 'assertion failed') }
function eq(a, b, msg) { return a === b ? null : `${msg ? msg + ': ' : ''}expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}` }
function deep(a, b, msg) { return eq(JSON.stringify(a), JSON.stringify(b), msg) }
function all(...rs) { const bad = rs.filter(Boolean); return bad.length ? bad.join('; ') : null }

;(async () => {
  console.log(`sim-scenarios: driving ${path.relative(process.cwd(), SRC)}\n`)
  for (const c of CASES) {
    let verdict
    try {
      const r = await drive(c.input)
      verdict = r.res ? c.expect(r) : 'returned nothing'
    } catch (e) {
      verdict = `harness error: ${e && e.message || e}`
    }
    if (verdict) { problems.push(c.name); console.log(`  FAIL  ${c.name}\n          ${verdict}`) }
    else console.log(`  ok    ${c.name}`)
  }
  console.log()
  if (problems.length) {
    console.log(`sim-scenarios: ${problems.length} of ${CASES.length} scoring rules BROKEN`)
    process.exit(1)
  }
  console.log(`sim-scenarios: all ${CASES.length} scoring rules hold`)
})()
