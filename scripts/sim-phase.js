#!/usr/bin/env node
// Executable model of three-loop-workflow/scripts/phase.js.
//
// Why this exists: phase.js carries load-bearing control flow that has regressed twice — the round cap
// in v1 and again in v2's first cut, and the empty-diff guard once. Both regressions passed a gate that
// checked for the *presence of a token* naming the rule. A grep sees a deleted line and nothing else:
// it cannot see a guard disabled with `false &&`, and for a rule whose wording also appears in a nearby
// comment it cannot even see the deletion. So the invariants are asserted here by EXECUTION.
//
// phase.js is a Workflow script — it cannot be required. Its whole interface with the outside world is
// agent()/parallel()/phase()/log()/args, all injectable, so the real file is loaded verbatim and driven
// with stubs that script each agent's reply by label. What is asserted is the script's own arithmetic
// and control flow, which is exactly the part no agent can rationalize past.
//
// Usage:  node scripts/sim-phase.js            assert every invariant
//         PHASE_JS=/path/to/phase.js node ...  assert against a mutated copy (see negative-test.sh)
// Exit 0 = every invariant holds. Non-zero = at least one does not, and the failure is printed.

'use strict'
const fs = require('fs')
const path = require('path')

const PHASE_JS = process.env.PHASE_JS ||
  path.join(__dirname, '..', 'three-loop-workflow', 'scripts', 'phase.js')

// Same transformation check-workflow-syntax.sh uses: strip the `export` keyword so the file parses,
// then wrap the body — which ends in a top-level `return` — in an async IIFE.
function load() {
  const body = fs.readFileSync(PHASE_JS, 'utf8').replace(/^export\s+/gm, '')
  return new Function('agent', 'parallel', 'pipeline', 'log', 'phase', 'args', 'budget', 'workflow',
    `return(async()=>{${body}})()`)
}

// Drive one run. `script(label, calls)` returns what the agent with that label replies;
// returning null models a dead agent, which is what tryAgent's retry exists for.
async function drive(args, script) {
  const calls = []
  const logs = []
  const agent = async (prompt, opts) => {
    const label = (opts && opts.label) || '?'
    calls.push({ label, prompt, opts })
    const reply = script(label, calls)
    return reply === undefined ? {} : reply
  }
  const parallel = async (thunks) => Promise.all(thunks.map(t => t().catch(() => null)))
  let res = null
  let err = null
  try {
    res = await load()(agent, parallel, null, m => logs.push(m), () => {}, args, null, null)
  } catch (e) {
    err = String(e && e.message || e)
  }
  return {
    res, err, calls, logs,
    n: prefix => calls.filter(c => c.label.startsWith(prefix)).length,
    promptsFor: prefix => calls.filter(c => c.label.startsWith(prefix)).map(c => c.prompt),
  }
}

// ── fixtures ──────────────────────────────────────────────────
const A = 'a'.repeat(40)   // baseSha
const B = 'b'.repeat(40)   // the write commit
const hex = n => String(n).repeat(40).slice(0, 40).replace(/[^0-9a-f]/g, '1')

const base = { phaseLabel: 'P1', planPath: '.agent/t/plan.md', tasks: 'do the thing', acceptCmds: ['npm test'], baseSha: A }
const write = (o = {}) => ({ branch: 'task', headSha: B, conflict: false, blocked: false, concerns: [], ...o })
const gates = (o = {}) => ({ all_pass: true, headSha: B, results: ['npm test: exit 0, 12 passed'], failures: [], ...o })
const review = (n, o = {}) => ({
  blocking: Array.from({ length: n }, (_, i) => `bug${i}`),
  nonblocking: [], blocking_count: n, nonblocking_count: 0, ...o,
})
// A gates agent that reports a fresh HEAD each round, so the no-op-fix guard does not fire and the
// scenario is genuinely exercising the round budget rather than tripping a different guard.
const advancingGates = (calls, o = {}) => gates({ headSha: hex(calls.filter(c => c.label.startsWith('gates')).length + 1), ...o })

// ── invariants ────────────────────────────────────────────────
// Each: a name, the args, the scripted agent replies, and what must be true of the outcome.
const INVARIANTS = [

  { name: 'usage: planPath is required',
    args: { ...base, planPath: undefined },
    reply: () => write(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  { name: 'usage: baseSha is required',
    args: { ...base, baseSha: undefined },
    reply: () => write(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  { name: 'usage: acceptCmds is required',
    args: { ...base, acceptCmds: [] },
    reply: () => write(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  { name: 'usage: a baseSha that is not a full 40-hex sha is rejected',
    args: { ...base, baseSha: 'abc1234' },
    reply: l => l.startsWith('write') ? write() : gates(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  { name: 'a clean first review closes at round 1 having spent no fix',
    args: base,
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(
      eq(r.res.status, 'closed'), eq(r.res.round, 1), eq(r.res.fixes, 0),
      eq(r.n('fix:'), 0, 'no fix agent may run'),
      eq(r.res.headSha, B, 'the closed phase returns a chainable head')) },

  // The regression that shipped twice. The cap bounds FIXES SPENT, so a documented budget of N must
  // dispatch exactly N fix agents and verify N+1 times — the last fix still has to be checked.
  ...[1, 2, 3].map(mx => ({
    name: `round cap: maxRounds=${mx} spends exactly ${mx} fixes and verifies ${mx + 1} times`,
    args: { ...base, maxRounds: mx },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? { confirmed: ['bug0'], rejected: [] }
      : {},
    expect: r => all(
      eq(r.res.status, 'cap-exhausted'), eq(r.res.fixes, mx),
      eq(r.n('fix:'), mx, `exactly ${mx} fix agents`),
      eq(r.n('gates:'), mx + 1, `${mx + 1} verifications`)),
  })),

  { name: 'round increments only on a fix: a closing round does not consume budget',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? (calls.filter(c => c.label.startsWith('review')).length === 1 ? review(1) : review(0))
      : l.startsWith('triage') ? { confirmed: ['bug0'], rejected: [] }
      : {},
    expect: r => all(eq(r.res.status, 'closed'), eq(r.res.fixes, 1), eq(r.n('fix:'), 1)) },

  // Reviewers miss different things; agreement would discard most of the real findings.
  { name: 'two reviewers are unioned, never intersected',
    args: { ...base, reviewers: 2 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.endsWith(':v1') ? { blocking: ['x'], nonblocking: ['n1'], blocking_count: 1, nonblocking_count: 1 }
      : l.endsWith(':v2') ? { blocking: ['y'], nonblocking: ['n1', 'n2'], blocking_count: 1, nonblocking_count: 2 }
      : l.startsWith('triage') ? { confirmed: ['x', 'y'], rejected: [] }
      : {},
    expect: r => all(
      has(r.promptsFor('triage')[0], 'x', 'the disjoint finding from reviewer 1 reaches triage'),
      has(r.promptsFor('triage')[0], 'y', 'the disjoint finding from reviewer 2 reaches triage'),
      eq(r.res.status, 'cap-exhausted', 'two confirmed findings cannot close the phase')) },

  { name: 'triage runs before the closure count: rejecting every finding closes the phase',
    args: base,
    reply: l => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(3)
      : l.startsWith('triage') ? { confirmed: [], rejected: ['bug0: misreads the code', 'bug1: n/a', 'bug2: n/a'] }
      : {},
    expect: r => all(
      eq(r.res.status, 'closed'), eq(r.res.fixes, 0),
      eq(r.n('triage:'), 1, 'triage must be consulted'),
      eq(r.n('fix:'), 0, 'a rejected finding must not burn a fix round')) },

  { name: 'closure ignores the reviewer prose: a confirmed finding blocks despite an upbeat verdict',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? review(1, { verdict: 'pass', summary: 'looks good overall' })
      : l.startsWith('triage') ? { confirmed: ['bug0'], rejected: [] }
      : {},
    expect: r => eq(r.res.status, 'cap-exhausted') },

  { name: 'a reviewer that fails to return is an agent-error, never a pass',
    args: base,
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : l.startsWith('review') ? null : {},
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'review')) },

  { name: 'a dead reviewer gets one retry, so infrastructure failure is not a review round',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? (calls.filter(c => c.label.startsWith('review')).length === 1 ? null : review(0)) : {},
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('review'), 2)) },

  { name: 'one of two reviewers dying is an agent-error, not a single-reviewer pass',
    args: { ...base, reviewers: 2 },
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l === 'review:P1:r1:v2' ? null : l.startsWith('review') ? review(0) : {},
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'review')) },

  { name: 'an uncommitted phase is rejected rather than reviewed',
    args: base,
    reply: l => l.startsWith('write') ? write({ headSha: A }) : gates(),
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'write'),
      eq(r.n('review'), 0, 'no reviewer may be spawned on an empty diff')) },

  { name: 'a headSha that is not a full 40-hex sha is an agent-error',
    args: base,
    reply: l => l.startsWith('write') ? write({ headSha: 'b1c2d3' }) : gates(),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.n('review'), 0)) },

  { name: 'a fix round that commits nothing is caught, not ground to cap-exhausted',
    args: base,
    reply: l => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ headSha: B })
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? { confirmed: ['bug0'], rejected: [] }
      : {},
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'fix'),
      eq(r.res.fixes, 1, 'it is caught on the round after the no-op fix')) },

  { name: 'a gate failure naming nothing cannot dispatch a fix agent',
    args: base,
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates({ all_pass: false, failures: [] }) : {},
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'gates'), eq(r.n('fix:'), 0)) },

  { name: 'a plan that contradicts the code stops the phase instead of being decided',
    args: base,
    reply: l => l.startsWith('write') ? write({ conflict: true }) : gates(),
    expect: r => all(eq(r.res.status, 'plan-conflict'), eq(r.n('gates'), 0)) },

  { name: 'a blocked implementer gets exactly one re-dispatch, then escalates',
    args: base,
    reply: l => l.startsWith('write') ? write({ blocked: true, concerns: ['no fixture exists'] }) : gates(),
    expect: r => all(
      eq(r.res.status, 'write-escalation'),
      eq(r.n('write'), 2, 'one re-dispatch, and only one'),
      deep(r.res.concerns, ['no fixture exists'], 'the concerns travel into the escalation')) },

  { name: 'gates run before any reviewer is spawned, every round',
    args: base,
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => {
      const g = r.calls.findIndex(c => c.label.startsWith('gates'))
      const v = r.calls.findIndex(c => c.label.startsWith('review'))
      return all(ok(g >= 0 && v > g, 'a gates call must precede the first review call'))
    } },
]

// ── assertion helpers ─────────────────────────────────────────
const problems = []
function ok(cond, msg) { return cond ? null : (msg || 'assertion failed') }
function eq(actual, expected, msg) {
  return actual === expected ? null
    : `${msg ? msg + ': ' : ''}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
}
function deep(actual, expected, msg) { return eq(JSON.stringify(actual), JSON.stringify(expected), msg) }
function has(haystack, needle, msg) {
  return typeof haystack === 'string' && haystack.includes(needle) ? null : `${msg}: not found in the prompt`
}
function all(...results) { const bad = results.filter(Boolean); return bad.length ? bad.join('; ') : null }

;(async () => {
  console.log(`sim-phase: driving ${path.relative(process.cwd(), PHASE_JS)}\n`)
  for (const inv of INVARIANTS) {
    let verdict
    try {
      const r = await drive(inv.args, inv.reply)
      if (r.err) verdict = `threw: ${r.err}`
      else if (!r.res) verdict = 'returned nothing'
      else verdict = inv.expect(r)
    } catch (e) {
      verdict = `harness error: ${e && e.message || e}`
    }
    if (verdict) { problems.push([inv.name, verdict]); console.log(`  FAIL  ${inv.name}\n          ${verdict}`) }
    else console.log(`  ok    ${inv.name}`)
  }
  console.log()
  if (problems.length) {
    console.log(`sim-phase: ${problems.length} of ${INVARIANTS.length} invariants BROKEN`)
    process.exit(1)
  }
  console.log(`sim-phase: all ${INVARIANTS.length} invariants hold`)
})()
