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
  // A ceiling, so a control-flow defect that fails to terminate is reported as a runaway rather than
  // hanging the harness. No legitimate configuration here dispatches anywhere near this many agents.
  const CEILING = 60
  const agent = async (prompt, opts) => {
    const label = (opts && opts.label) || '?'
    calls.push({ label, prompt, opts })
    if (calls.length > CEILING) {
      throw new Error(`runaway: more than ${CEILING} agents dispatched — the verify loop is not terminating`)
    }
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

const base = { phaseLabel: 'P1', planPath: '.agent/t/plan.md', tasks: 'do the thing', acceptCmds: ['npm test'], baseSha: A, depth: 'standard', behaviorCheck: false }
const write = (o = {}) => ({ branch: 'task', headSha: B, conflict: false, blocked: false, concerns: [], ...o })
const gates = (o = {}) => ({ all_pass: true, headSha: B, branch: 'task', diffLines: 40, results: ['npm test: exit 0, 12 passed'], failures: [], tests: { counted: true, passed: 12, failed: 0, skipped: 0 }, ...o })
const review = (n, o = {}) => ({
  blocking: Array.from({ length: n }, (_, i) => `bug${i}`),
  nonblocking: [], blocking_count: n, nonblocking_count: 0, ...o,
})
// A gates agent that reports a fresh HEAD each round, so the no-op-fix guard does not fire and the
// scenario is genuinely exercising the round budget rather than tripping a different guard.
const advancingGates = (calls, o = {}) => gates({ headSha: hex(calls.filter(c => c.label.startsWith('gates')).length + 1), ...o })

// The verify round a reply is being made for. Gates run exactly once per round, so counting gates calls
// dates every other reply in the same round.
const roundOf = calls => calls.filter(c => c.label.startsWith('gates')).length
// A finding that MOVES between rounds. A confirmed set that comes back identical is now its own stop
// (no-progress), so a fixture whose subject is the ROUND BUDGET has to produce fresh findings — one
// that repeats is testing the other rule.
const movingReview = (calls, n = 1, o = {}) => review(n, {
  blocking: Array.from({ length: n }, (_, i) => `bug${i}-r${roundOf(calls)}`), ...o,
})
const movingGateFailures = calls => [`npm test: 1 failed (round ${roundOf(calls)})`]

// A triage stub that rules on the numbered list it was actually handed. The script confirms findings by
// NUMBER now, so a stub returning text could not model it — which is the point of that contract: an
// index cannot name a finding no reviewer raised. Anything not matched is rejected, so every fixture
// rules on every item and none of them reach the untriaged path by accident.
const triageFor = (calls, confirmIf) => {
  const prompt = calls[calls.length - 1].prompt
  const items = []
  prompt.split('\n').forEach(line => {
    const m = /^(\d+)\.\s+(.*)$/.exec(line)
    if (m) items.push({ n: Number(m[1]), text: m[2] })
  })
  const keep = typeof confirmIf === 'function' ? confirmIf : t => confirmIf.some(x => t.includes(x))
  return {
    confirmed: items.filter(i => keep(i.text)).map(i => i.n),
    rejected: items.filter(i => !keep(i.text)).map(i => ({ item: i.n, why: 'misreads the code' })),
  }
}

// ── invariants ────────────────────────────────────────────────
// Each: a name, the args, the scripted agent replies, and what must be true of the outcome.
const INVARIANTS = [

  // The Workflow tool passes args as a JSON string. Every scenario above uses the object form, so this
  // asserts the string form reaches the same place — otherwise the script works only under the harness.
  { name: 'args arriving as a JSON string behaves exactly like the object form',
    args: JSON.stringify(base),
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.res.status, 'closed'), eq(r.res.round, 1), eq(r.res.reviewers, 1)) },

  { name: 'a JSON string missing planPath still names planPath, not the args shape',
    args: JSON.stringify({ ...base, planPath: undefined }),
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'),
      ok(/planPath/.test(r.res.reason || ''), 'the reason must name the missing field')) },

  { name: 'args that is a string but not JSON says so, instead of blaming planPath',
    args: 'phaseLabel=P1 planPath=x',
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'),
      ok(/not JSON/.test(r.res.reason || ''), 'the reason must name the args shape'),
      ok(!/planPath is required/.test(r.res.reason || ''), 'it must not send the caller after planPath')) },

  { name: 'usage: planPath is required',
    args: { ...base, planPath: undefined },
    reply: () => write(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  { name: 'usage: baseSha is required',
    args: { ...base, baseSha: undefined },
    reply: () => write(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  { name: 'usage: passing neither depth nor reviewers is an error, not a Standard review',
    args: { ...base, depth: undefined },
    reply: () => write(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  { name: 'a caller written against the old contract still works: reviewers: 2 runs two',
    args: { ...base, depth: undefined, reviewers: 2 },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.n('review'), 2), eq(r.res.reviewers, 2),
      eq(r.res.depth, 'deep', 'the resolved depth is reported back')) },

  // What the guard here is for is an argument SILENTLY defaulting, not a caller who wrote both. An
  // explicit count wins and is reported; omitting both is still a usage-error, above.
  { name: 'an explicit reviewers count raises a Standard phase to two, and the result reports it',
    args: { ...base, depth: 'standard', reviewers: 2 },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('review:'), 2), eq(r.res.reviewers, 2),
      ok(r.logs.some(m => /explicit reviewers=2 wins/.test(m)), 'the override must be logged, not silent')) },

  { name: 'usage: acceptCmds is required',
    args: { ...base, acceptCmds: [] },
    reply: () => write(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  // A non-array acceptCmds used to pass the emptiness test and die later at `.map is not a function`,
  // after the Write agent had run and committed — the caller paid for an agent and got a stack trace
  // naming a line three steps from the cause. A string is the reported case; `{length: 1}` fails
  // identically, and `null` threw at the emptiness test itself because `.length` was read before
  // anything could reject it.
  //
  // Both halves are asserted deliberately. Status alone is not enough: a guard placed BELOW the Write
  // dispatch still ends the phase in `usage-error` and still bills you for the agent, which is the
  // whole harm. Same shape as the repoPath invariant below.
  // The last two are why the rejection cannot describe the value with JSON.stringify: it throws on a
  // circular object and on a BigInt, turning a clean usage-error back into the crash this guard exists
  // to remove. The message is asserted too — D1 rejected coercing a string because a rejection that
  // names the correction is cheaper than one that does not, and an unasserted message can be reverted
  // to "acceptCmds is required", which sends the caller hunting for an argument they did supply.
  ...[['a string', 'npm test'], ['a length-bearing object', { length: 1 }], ['null', null],
      ['a bigint', 10n], ['a circular object', (() => { const o = {}; o.self = o; return o })()]]
    .map(([label, value]) => ({
      name: `usage: ${label} acceptCmds is rejected before any agent is dispatched`,
      args: { ...base, acceptCmds: value },
      reply: () => write(),
      expect: r => all(
        eq(r.res && r.res.status, 'usage-error'),
        eq(r.n('write'), 0, 'nothing may be dispatched on an unusable acceptCmds'),
        has(String((r.res && r.res.reason) || ''), 'array',
          'the rejection must name the shape it wanted'),
        ok(!/is required/.test(String((r.res && r.res.reason) || '')),
          'the shape error must not reuse "acceptCmds is required" and send the caller after a missing argument')) })),

  { name: 'usage: a baseSha that is not a full 40-hex sha is rejected',
    args: { ...base, baseSha: 'abc1234' },
    reply: (l, calls) => l.startsWith('write') ? write() : gates(),
    expect: r => eq(r.res && r.res.status, 'usage-error') },

  { name: 'a clean first review closes at round 1 having spent no fix',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
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
      : l.startsWith('review') ? movingReview(calls)
      : l.startsWith('triage') ? triageFor(calls, ['bug'])
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
      : l.startsWith('triage') ? triageFor(calls, ['bug0'])
      : {},
    expect: r => all(eq(r.res.status, 'closed'), eq(r.res.fixes, 1), eq(r.n('fix:'), 1)) },

  // Reviewers miss different things; agreement would discard most of the real findings.
  // Finding names are deliberately distinctive. Single letters do not work: 'y' occurs in the static
  // triage prompt ("you", "really", "defensively"), so an assertion that the prompt contains 'y' passes
  // whether or not reviewer 2's finding survived — the assertion carried no information. The triage stub
  // also echoes only what it was actually handed, so a discarded finding cannot be masked by a
  // hardcoded confirmation.
  { name: 'two reviewers are unioned, never intersected',
    args: { ...base, depth: 'deep' },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.endsWith(':v1') ? { blocking: [`FINDING-ALPHA-r${roundOf(calls)}`], nonblocking: ['nit-1'], blocking_count: 1, nonblocking_count: 1 }
      : l.endsWith(':v2') ? { blocking: [`FINDING-BETA-r${roundOf(calls)}`], nonblocking: ['nit-1', 'nit-2'], blocking_count: 1, nonblocking_count: 2 }
      : l.startsWith('triage') ? triageFor(calls, ['FINDING-ALPHA', 'FINDING-BETA'])
      : {},
    expect: r => all(
      has(r.promptsFor('triage')[0], 'FINDING-ALPHA', 'reviewer 1\'s finding must reach triage'),
      has(r.promptsFor('triage')[0], 'FINDING-BETA', 'reviewer 2\'s finding must reach triage'),
      eq(r.res.status, 'cap-exhausted', 'two confirmed findings cannot close the phase')) },

  { name: 'triage runs before the closure count: rejecting every finding closes the phase',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(3)
      : l.startsWith('triage') ? triageFor(calls, [])
      : {},
    expect: r => all(
      eq(r.res.status, 'closed'), eq(r.res.fixes, 0),
      eq(r.n('triage:'), 1, 'triage must be consulted'),
      eq(r.n('fix:'), 0, 'a rejected finding must not burn a fix round')) },

  { name: 'closure ignores the reviewer prose: a confirmed finding blocks despite an upbeat verdict',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      // The prose is the subject here, so the reviewer supplies one: a pass verdict and a cheerful
      // summary beside a blocking finding. The finding MOVES between rounds because a set that repeats
      // is the no-progress stop's business, and the budget is what this invariant reads.
      : l.startsWith('review') ? movingReview(calls, 1, { verdict: 'pass', summary: 'looks good overall' })
      : l.startsWith('triage') ? triageFor(calls, ['bug'])
      : {},
    expect: r => eq(r.res.status, 'cap-exhausted') },

  { name: 'a reviewer that fails to return is an agent-error, never a pass',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : l.startsWith('review') ? null : {},
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'review')) },

  { name: 'a dead reviewer gets one retry, so infrastructure failure is not a review round',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? (calls.filter(c => c.label.startsWith('review')).length === 1 ? null : review(0)) : {},
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('review'), 2)) },

  { name: 'one of two reviewers dying is an agent-error, not a single-reviewer pass',
    args: { ...base, depth: 'deep' },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l === 'review:P1:r1:v2' ? null : l.startsWith('review') ? review(0) : {},
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'review')) },

  { name: 'an uncommitted phase is rejected rather than reviewed',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write({ headSha: A }) : gates(),
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'write'),
      eq(r.n('review'), 0, 'no reviewer may be spawned on an empty diff')) },

  { name: 'a headSha that is not a full 40-hex sha is an agent-error',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write({ headSha: 'b1c2d3' }) : gates(),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.n('review'), 0)) },

  { name: 'a fix round that commits nothing is caught, not ground to cap-exhausted',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ headSha: B })
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? triageFor(calls, ['bug0'])
      : {},
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'fix'),
      eq(r.res.fixes, 1, 'it is caught on the round after the no-op fix')) },

  { name: 'a gate failure naming nothing cannot dispatch a fix agent',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates({ all_pass: false, failures: [] }) : {},
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'gates'), eq(r.n('fix:'), 0)) },

  { name: 'a plan that contradicts the code stops the phase instead of being decided',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write({ conflict: true }) : gates(),
    expect: r => all(eq(r.res.status, 'plan-conflict'), eq(r.n('gates'), 0)) },

  { name: 'a blocked implementer gets exactly one re-dispatch, then escalates',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write({ blocked: true, concerns: ['no fixture exists'] }) : gates(),
    expect: r => all(
      eq(r.res.status, 'write-escalation'),
      eq(r.n('write'), 2, 'one re-dispatch, and only one'),
      deep(r.res.concerns, ['no fixture exists'], 'the concerns travel into the escalation')) },

  { name: 'gates run before any reviewer is spawned, every round',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => {
      const g = r.calls.findIndex(c => c.label.startsWith('gates'))
      const v = r.calls.findIndex(c => c.label.startsWith('review'))
      return all(ok(g >= 0 && v > g, 'a gates call must precede the first review call'))
    } },

  // ── fail closed on unvalidated agent input ──────────────────
  // The write agent's headSha is a string it typed. The gates agent independently runs
  // `git rev-parse HEAD`, so the script holds a second, shell-sourced measurement of the same fact
  // and must reconcile them. Validating only the SHAPE of the self-report leaves the guard walkable
  // by any well-formed sha — stale, cross-branch, or invented.
  { name: 'a fabricated but well-formed headSha cannot close a phase on an empty diff',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write({ headSha: 'd'.repeat(40) })
      : l.startsWith('gates') ? gates({ headSha: A })   // the real HEAD is still baseSha
      : review(0),
    expect: r => all(
      eq(r.res.status, 'agent-error'),
      ok(r.res.status !== 'closed', 'a phase that committed nothing must never return closed')) },

  { name: 'an unparseable gates headSha fails closed instead of disabling the no-op-fix guard',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ headSha: 'HEAD' })
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? triageFor(calls, ['bug0'])
      : {},
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'gates'),
      eq(r.n('fix:'), 0, 'no fix round may be spent while the head is unknown')) },

  { name: 'a fix round that resets HEAD back to the base is caught, not reviewed as empty',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      // round 1 commits normally; the fix round then drops the phase's work, landing HEAD on the base
      if (l.startsWith('gates')) return gates({ headSha: round === 1 ? B : A })
      if (l.startsWith('review')) return review(1)
      if (l.startsWith('triage')) return triageFor(calls, ['bug0'])
      return {}
    },
    expect: r => all(
      eq(r.res.status, 'agent-error'),
      ok(r.res.status !== 'closed', 'an empty range must never close, on any round'),
      eq(r.n('review'), 1, 'the second review must not be dispatched against an empty diff')) },

  { name: 'a branch name that is not a plausible git ref is rejected',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write({ branch: 'task; rm -rf /' }) : gates(),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.n('review'), 0)) },

  { name: 'a caller-supplied branch is authoritative over the write agent\'s self-report',
    args: { ...base, branch: 'task' },
    reply: (l, calls) => l.startsWith('write') ? write({ branch: 'phase-1-side' }) : gates(),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.n('review'), 0)) },

  { name: 'the validated baseSha, not the raw argument, is interpolated into the diff commands',
    args: { ...base, baseSha: '  ' + 'C'.repeat(40) + '\n' },
    reply: (l, calls) => l.startsWith('write') ? write({ headSha: B })
      : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(
      eq(r.res.status, 'closed'),
      has(r.promptsFor('review')[0], 'c'.repeat(40), 'the review prompt must carry the normalised sha'),
      ok(!r.promptsFor('review')[0].includes('C'.repeat(40)), 'the raw unnormalised sha must not reach the prompt'),
      ok(!/\n\.\./.test(r.promptsFor('review')[0]), 'a padded sha must not produce a broken git command')) },

  { name: 'a negative maxRounds is a usage-error, not a silent zero-fix run',
    args: { ...base, maxRounds: -1 },
    reply: () => write(),
    expect: r => eq(r.res.status, 'usage-error') },

  { name: 'tasks is required: an empty task list cannot be dispatched',
    args: { ...base, tasks: undefined },
    reply: () => write(),
    expect: r => eq(r.res.status, 'usage-error') },

  // ── reviewer independence ───────────────────────────────────
  // SKILL.md: reviewers receive the diff and the plan "and nothing else: not your summary of the
  // change, not your session, not the reasoning that produced it". The implementer's own
  // low-confidence list is that summary, and sending it to both reviewers correlates exactly the
  // independence the two-reviewer rule depends on.
  { name: 'no reviewer receives the implementer\'s self-assessment',
    args: { ...base, depth: 'deep' },
    reply: (l, calls) => l.startsWith('write') ? write({ concerns: ['the refill maths in bucket.js'] })
      : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(
      eq(r.res.status, 'closed'),
      ...r.promptsFor('review').map(p => ok(!p.includes('refill maths'), 'a reviewer prompt leaks the implementer\'s concerns')),
      ...r.promptsFor('review').map(p => ok(!/look there first/i.test(p), 'a reviewer prompt carries an attention directive')),
      deep(r.res.concerns, ['the refill maths in bucket.js'], 'the concerns are returned to the caller instead')) },

  { name: 'depth deep runs two reviewers without the caller restating the count',
    args: { ...base, depth: 'deep' },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(
      eq(r.n('review'), 2, 'two reviewers'),
      eq(r.res.reviewers, 2, 'the return states how many reviewed, so a forgotten flag is visible')) },

  { name: 'depth standard runs one reviewer and says so',
    args: { ...base, depth: 'standard' },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.n('review'), 1), eq(r.res.reviewers, 1)) },

  { name: 'an unknown depth is a usage-error rather than a silent Standard review',
    args: { ...base, depth: 'thorough' },
    reply: () => write(),
    expect: r => eq(r.res.status, 'usage-error') },

  // ── the triage record ───────────────────────────────────────
  { name: 'triage rejections are returned, not just logged',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(2)
      : l.startsWith('triage') ? triageFor(calls, [])
      : {},
    expect: r => all(
      eq(r.res.status, 'closed'),
      ok(Array.isArray(r.res.rejected) && r.res.rejected.length === 2,
        'the closed phase must carry the rejection record build.md requires')) },

  { name: 'a later round\'s triage is told what was already rejected',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls)
      if (l.startsWith('review')) return review(round === 1 ? 2 : 1)
      if (l.startsWith('triage')) return triageFor(calls, ['bug0'])
      return {}
    },
    expect: r => {
      const later = r.promptsFor('triage')[1]
      return all(ok(!!later, 'a second triage must happen'),
        has(later || '', 'bug1', 'the prior rejection must be carried into the next round\'s triage')) } },

  // ── accumulation and attribution ────────────────────────────
  { name: 'non-blocking findings accumulate across rounds instead of being overwritten',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls)
      if (l.startsWith('review')) return round === 1
        ? { blocking: ['bug0'], nonblocking: ['nit-from-round-1'], blocking_count: 1, nonblocking_count: 1 }
        : { blocking: [], nonblocking: ['nit-from-round-2'], blocking_count: 0, nonblocking_count: 1 }
      if (l.startsWith('triage')) return triageFor(calls, ['bug0'])
      return {}
    },
    expect: r => all(
      eq(r.res.status, 'closed'),
      ok((r.res.nonblocking || []).includes('nit-from-round-1'),
        'a round-1 nit not repeated at closure must not vanish'),
      ok((r.res.nonblocking || []).includes('nit-from-round-2'), 'the closing round\'s nits are kept too')) },

  { name: 'gate-driven and review-driven fix rounds are attributed separately',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls, { all_pass: false, failures: movingGateFailures(calls) })
      : {},
    expect: r => all(
      eq(r.res.status, 'cap-exhausted'),
      eq(r.res.gateFixes, 3, 'three rounds were spent on gate failures'),
      eq(r.res.reviewFixes, 0, 'and none on review findings'),
      eq(r.n('review'), 0, 'no reviewer ever ran, which the escalation must be able to say')) },

  { name: 'a fix agent that never returns is an agent-error, not a consumed round',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? triageFor(calls, ['bug0'])
      : l.startsWith('fix') ? null : {},
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'fix'),
      ok(r.res.status !== 'cap-exhausted',
        'an infrastructure failure must not be reported as a deadlock the plan should absorb')) },

  // ── locating the repository ─────────────────────────────────
  // Measured, not supposed. Driven against a repository that was not the agents' working directory,
  // a phase could not complete a fix round: the Fix and Triage prompts were built from a branch name
  // and a sha and never a path, so the fix agent had nothing to locate the tree with. It searched the
  // filesystem, committed nothing, and the phase died on this script's own no-op-fix guard — which
  // fired correctly. orchestration.md documents driving the script from an installed skill, which is
  // exactly that case, so this is the documented usage failing.
  //
  // EVERY stage is asserted, not just the two that were broken. The defect was that one prompt knew
  // where the repository was and another did not; pinning only the two that failed would leave the
  // next prompt free to be added without one.
  { name: 'repoPath reaches every agent, so a phase can run against a repository elsewhere',
    args: { ...base, repoPath: '/srv/checkouts/myrepo', depth: 'deep' },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? triageFor(calls, ['bug0'])
      : {},
    expect: r => all(
      ...['write', 'gates', 'review', 'triage', 'fix'].flatMap(stage =>
        (r.promptsFor(stage).length ? r.promptsFor(stage) : ['']).map(p =>
          has(p, '/srv/checkouts/myrepo',
            `the ${stage} prompt must say where the repository is, or the agent cannot find it`))),
      ok(r.promptsFor('fix').length > 0, 'this scenario must actually reach a fix round')) },

  { name: 'a repoPath that is not an absolute path is a usage-error, not a prompt to interpolate',
    args: { ...base, repoPath: 'relative/path' },
    reply: () => write(),
    expect: r => all(
      eq(r.res.status, 'usage-error'),
      eq(r.n('write'), 0, 'nothing may be dispatched on an unusable repoPath')) },

  // Omitting repoPath is legitimate, but it is also how the out-of-tree failure reappears, and the way
  // it surfaces is three steps from the cause: a fix round quietly lands nothing and the no-op guard
  // reports the symptom. The error has to name the likely cause, or the next person re-derives it.
  { name: 'a no-op fix round names repoPath as the likely cause when it was omitted',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ headSha: B })
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? triageFor(calls, ['bug0'])
      : {},
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'fix'),
      has(r.res.reason || '', 'repoPath', 'the error must name the likely cause, not only the symptom')) },

  { name: 'omitting repoPath leaves every prompt as it was',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls) : review(0),
    expect: r => all(
      eq(r.res.status, 'closed'),
      ...r.promptsFor('review').map(p => ok(!/^Work in the repository/m.test(p),
        'with no repoPath the prompts must not gain a location line')))},
  // ── holes found by mutation audit, 2026-08-11 ──────────────────────────────────────────
  // 88 mutations were driven through phase.js; 21 survived while this harness printed
  // "all 54 invariants hold". Each invariant below closes one demonstrated survivor: the mutation is
  // named, and negative-test.sh reproduces it. They assert behaviour the script already has — nothing
  // in phase.js changed for them — so a failure here means a real regression, not a new rule.

  // Mutant: delete `if (reviewers < 1) …`. A phase closed green with zero reviewers dispatched.
  { name: 'usage: a reviewer count below one is rejected before any agent is dispatched',
    args: { ...base, depth: undefined, reviewers: 0 },
    reply: () => write(),
    expect: r => all(
      eq(r.res.status, 'usage-error'),
      eq(r.n('write'), 0, 'no agent may be spent on an unusable reviewer count'),
      eq(r.n('review'), 0, 'a phase must never close having reviewed nothing')) },

  // Mutant: delete `lastHead = gateHead`. A genuine no-op fix after an advancing round stopped being
  // caught and ground to cap-exhausted instead — the exact defect the no-op guard exists to prevent.
  { name: 'a no-op fix is caught even when an earlier round did advance HEAD',
    args: base,
    reply: (l, calls) => {
      const g = calls.filter(c => c.label.startsWith('gates')).length
      return l.startsWith('write') ? write()
        : l.startsWith('gates') ? gates({ headSha: g === 1 ? B : hex(3) })
        : l.startsWith('review') ? movingReview(calls)
        : l.startsWith('triage') ? triageFor(calls, ['bug'])
        : {}
    },
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'fix'),
      eq(r.res.fixes, 2, 'the first fix advanced HEAD; the second did not')) },

  // Mutant: return the implementer's `writeHead` instead of `gateHead`. The closed phase handed the
  // next phase a base sha only one agent ever attested to.
  { name: 'the closed phase chains from the head the gates agent saw, not the one the writer claimed',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write({ headSha: hex(4) })
      : l.startsWith('gates') ? gates({ headSha: hex(3) })
      : review(0),
    expect: r => all(eq(r.res.status, 'closed'), eq(r.res.headSha, hex(3))) },

  // Mutant: delete `verifyRound++`. Termination survived via the fix cap, so every existing invariant
  // passed — while every agent label collided and the escalation reported round 1 of a 4-round run.
  { name: 'the verify round advances, so labels stay distinct and the escalation counts honestly',
    args: { ...base, maxRounds: 3 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? movingReview(calls)
      : l.startsWith('triage') ? triageFor(calls, ['bug'])
      : {},
    expect: r => all(
      eq(r.res.status, 'cap-exhausted'),
      eq(r.res.round, 4, 'three fixes are verified four times'),
      eq(new Set(r.calls.filter(c => c.label.startsWith('gates')).map(c => c.label)).size, 4,
        'each verify round needs its own label — colliding labels hide which round failed')) },

  // Mutant: delete each of the four dead-agent returns in turn. All four survived, and each turned a
  // clean agent-error into a TypeError three lines downstream. Four of six agent roles had no death
  // path asserted at all.
  { name: 'a write agent that never returns is an agent-error, not a crash',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? null : gates(),
    expect: r => all(eq(r.res && r.res.status, 'agent-error'), eq(r.res && r.res.stage, 'write'),
      ok(!r.err, `it must not throw (threw: ${r.err})`)) },

  { name: 'a gates agent that never returns is an agent-error, not a crash',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? null : review(0),
    expect: r => all(eq(r.res && r.res.status, 'agent-error'), eq(r.res && r.res.stage, 'gates'),
      ok(!r.err, `it must not throw (threw: ${r.err})`)) },

  { name: 'a triage agent that never returns is an agent-error, not a crash',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(1) : l.startsWith('triage') ? null : {},
    expect: r => all(eq(r.res && r.res.status, 'agent-error'), eq(r.res && r.res.stage, 'triage'),
      ok(!r.err, `it must not throw (threw: ${r.err})`)) },

  { name: 'a re-dispatched implementer that never returns is an agent-error, not a crash',
    args: base,
    reply: (l, calls) => {
      const w = calls.filter(c => c.label.startsWith('write')).length
      return l.startsWith('write') ? (w === 1 ? write({ blocked: true, concerns: ['no fixture exists'] }) : null)
        : gates()
    },
    expect: r => all(eq(r.res && r.res.status, 'agent-error'),
      ok(!r.err, `it must not throw (threw: ${r.err})`)) },

  // Mutant: blank `unresolved` and pin `exhaustedBy` to a constant. escalation.md tells the reader to
  // say which kind of failure spent the budget; these are the fields that say it.
  { name: 'a cap-exhausted phase reports what is unresolved and which stage spent the budget',
    args: { ...base, maxRounds: 1 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? movingReview(calls)
      : l.startsWith('triage') ? triageFor(calls, ['bug'])
      : {},
    expect: r => all(
      eq(r.res.status, 'cap-exhausted'),
      ok((r.res.unresolved || []).length > 0, 'the unresolved items must be reported verbatim'),
      eq(r.res.exhaustedBy, 'review', 'a review-driven cap must name review, not a constant')) },

  // The other direction, so no constant can satisfy both. `exhaustedBy: 'mixed'` passed the first
  // version of this pair, which asserted only that the field was truthy — an assertion weak enough to
  // be satisfied by the mutation it was written to catch.
  { name: 'a gate-driven cap names gates, so exhaustedBy cannot be a constant',
    args: { ...base, maxRounds: 1 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls, { all_pass: false, failures: movingGateFailures(calls) })
      : l.startsWith('review') ? review(0)
      : {},
    expect: r => all(
      eq(r.res.status, 'cap-exhausted'),
      eq(r.res.exhaustedBy, 'gates', 'a gate-driven cap must name gates')) },

  // ── the task list is a shape, not a truthy value ────────────
  // `!tasks || !String(tasks).trim()` passed anything with a stringification, and an array of task
  // objects — the shape orchestration.md's own driver snippet produces, since it spreads a plan phase —
  // stringifies to "[object Object]". The Write agent was dispatched with that as its entire task list.
  { name: 'usage: a task list of objects is rejected before any agent is dispatched',
    args: { ...base, tasks: [{ id: 1, text: 'do the thing' }] },
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'),
      eq(r.calls.length, 0, 'nothing may be dispatched on an unreadable task list'),
      ok(!/\[object Object\]/.test(JSON.stringify(r.calls)), 'no prompt may carry [object Object]')) },

  { name: 'usage: a task list that is a bare truthy value is rejected',
    args: { ...base, tasks: true },
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'), eq(r.calls.length, 0)) },

  { name: 'a task list given as an array of strings reaches the writer as a list',
    args: { ...base, tasks: ['add the header', 'cover the 429 path'] },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.res.status, 'closed'),
      has(r.promptsFor('write')[0], '- add the header', 'each task must reach the writer'),
      has(r.promptsFor('write')[0], '- cover the 429 path', 'each task must reach the writer')) },

  { name: 'usage: an acceptance command that is an empty string is rejected',
    args: { ...base, acceptCmds: [''] },
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'),
      eq(r.calls.length, 0, 'an unrunnable acceptance must not dispatch a writer')) },

  // ── triage selects from the list; it does not write one ─────
  // Whatever triage confirms becomes the Fix agent's work list, and the Fix agent has write access and
  // no output schema. Confirmation by index makes an invented finding unrepresentable.
  { name: 'triage cannot confirm a finding no reviewer raised',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? { confirmed: [99], rejected: [{ item: 1, why: 'misreads the code' }] }
      : {},
    expect: r => all(eq(r.res.status, 'closed', 'an out-of-range confirmation is not a finding'),
      eq(r.n('fix:'), 0, 'no fix round may run on a finding nobody reported')) },

  { name: 'a triage that rules on nothing is an agent-error, not a clean close',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(2)
      : l.startsWith('triage') ? { confirmed: [], rejected: [] }
      : {},
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'triage')) },

  // Closing on a finding nobody looked at would be a false green produced by the one step whose job is
  // to prevent them; confirming it by default would spend a fix round on a possible phantom. Neither.
  { name: 'a finding nobody ruled on stops the phase, named, rather than closing it or blocking on it',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(2)
      : l.startsWith('triage') ? { confirmed: [], rejected: [{ item: 1, why: 'misreads the code' }] }
      : {},
    expect: r => all(eq(r.res.status, 'triage-incomplete'),
      deep(r.res.untriaged, ['bug1'], 'the unruled finding must be named'),
      eq(r.n('fix:'), 0, 'an unexamined finding is not a defect to fix')) },

  { name: 'a behavior check that could not run still returns the review that ran beside it',
    args: { ...base, behaviorCheck: 'call the endpoint' },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('behavior') ? { ran: false, blockedReason: 'no credentials', observed: [], mismatches: [] }
      : l.startsWith('review') ? review(2)
      : {},
    expect: r => all(eq(r.res.status, 'behavior-unverified'),
      deep(r.res.reviewFindings, ['bug0', 'bug1'], 'the round was paid for; its findings must come back')) },

  { name: 'a fix round that strays onto another branch is caught in the round it happens',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls, round === 1 ? {} : { branch: 'somewhere-else' })
      if (l.startsWith('review')) return review(1)
      if (l.startsWith('triage')) return triageFor(calls, ['bug0'])
      return {}
    },
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'fix'),
      ok(/somewhere-else/.test(r.res.reason || ''), 'the error must name the branch that was actually checked out')) },

  { name: 'a gates reply missing its failures list is a clean error, not a crash',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? { all_pass: false, headSha: hex(2), branch: 'task', diffLines: 40, results: ['npm test: exit 1'], tests: { counted: true, passed: 11, failed: 1, skipped: 0 } }
      : {},
    expect: r => all(ok(!r.err, 'the script must not throw'), eq(r.res.status, 'agent-error'), eq(r.res.stage, 'gates')) },

  { name: 'usage: a newline in an acceptance command is rejected before any agent is dispatched',
    args: { ...base, acceptCmds: ['npm test\nrm -rf /'] },
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'), eq(r.calls.length, 0)) },

  { name: 'usage: an absurd reviewer count is rejected rather than dispatched',
    args: { ...base, depth: undefined, reviewers: 50 },
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'), eq(r.calls.length, 0)) },

  // ── the suite may not shrink its way to green ───────────────
  // Removing an assertion, skipping a case or narrowing a selector moves HEAD and exits 0, so every
  // other guard here is satisfied. Only the tally moves — and only if something remembers the last one.
  { name: 'a suite that collects fewer tests after a fix round raises a finding',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls, round === 1
        ? { all_pass: false, failures: ['npm test: 1 failed'], tests: { counted: true, passed: 11, failed: 1, skipped: 0 } }
        : { tests: { counted: true, passed: 11, failed: 0, skipped: 0 } })
      if (l.startsWith('review')) return review(0)
      if (l.startsWith('triage')) return triageFor(calls, [])
      return {}
    },
    expect: r => all(
      ok(r.n('triage:') === 1, 'the shrink must reach triage as a finding'),
      has(r.promptsFor('triage')[0] || '', 'fewer test', 'the finding must name the shrink')) },

  { name: 'a suite that starts skipping tests after a fix round raises a finding',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls, round === 1
        ? { all_pass: false, failures: ['npm test: 1 failed'], tests: { counted: true, passed: 11, failed: 1, skipped: 0 } }
        : { tests: { counted: true, passed: 11, failed: 0, skipped: 1 } })
      if (l.startsWith('review')) return review(0)
      if (l.startsWith('triage')) return triageFor(calls, [])
      return {}
    },
    expect: r => all(
      ok(r.n('triage:') === 1, 'the new skip must reach triage as a finding'),
      has(r.promptsFor('triage')[0] || '', 'being skipped', 'the finding must name the skip')) },

  { name: 'a tally that disappears between rounds raises a finding rather than silently disabling the check',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls, round === 1
        ? { all_pass: false, failures: ['npm test: 1 failed'], tests: { counted: true, passed: 11, failed: 1, skipped: 0 } }
        : { tests: { counted: false, passed: 0, failed: 0, skipped: 0 } })
      if (l.startsWith('review')) return review(0)
      if (l.startsWith('triage')) return triageFor(calls, [])
      return {}
    },
    expect: r => all(eq(r.n('triage:'), 1, 'a vanished tally must reach triage'),
      has(r.promptsFor('triage')[0] || '', 'no tally at all', 'the finding must name what disappeared')) },

  // A tally that arrives as strings must be counted, not concatenated. Both directions are asserted,
  // and the second is the discriminating one: "2"+"0" is "20" and "1"+"1" is "11", so a suite that did
  // not shrink at all looks to `<` as though it lost most of itself.
  { name: 'a real shrink is still seen when the tally arrives as strings',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls, round === 1
        ? { all_pass: false, failures: ['npm test: 1 failed'], tests: { counted: true, passed: '11', failed: '1', skipped: '0' } }
        : { tests: { counted: true, passed: '9', failed: '0', skipped: '0' } })
      if (l.startsWith('review')) return review(0)
      if (l.startsWith('triage')) return triageFor(calls, [])
      return {}
    },
    expect: r => all(eq(r.n('triage:'), 1, 'the shrink must still be seen through the wrong type'),
      has(r.promptsFor('triage')[0] || '', 'fewer test', 'the finding must name the shrink')) },

  // The tallies are chosen so the two readings disagree in the direction that matters: 12 collected
  // before and 12 after is no shrink, while concatenating the same strings gives "2010" then "1200",
  // which reads as a suite that lost most of itself. What forced the tallies to change was round 2:
  // its old `failed: '1'` sat beside a defaulted all_pass true, which is now its own stop.
  { name: 'a string tally that did not shrink raises nothing, so concatenation cannot invent one',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls, round === 1
        ? { all_pass: false, failures: ['npm run lint: exit 1'], tests: { counted: true, passed: '2', failed: '0', skipped: '10' } }
        : { tests: { counted: true, passed: '12', failed: '0', skipped: '0' } })
      if (l.startsWith('review')) return review(0)
      return {}
    },
    expect: r => all(eq(r.res.status, 'closed'),
      eq(r.n('triage:'), 0, '12 tests before and 12 after is not a shrink, whatever type they arrived as')) },

  { name: 'a phase whose gates never counted tests says the shrink check never ran',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ tests: { counted: false, passed: 0, failed: 0, skipped: 0 } })
      : review(0),
    expect: r => all(eq(r.res.status, 'closed'),
      ok(r.res.tests && r.res.tests.counted === false && /never ran/.test(r.res.tests.note || ''),
        'a guard that never had a baseline is off, not passed')) },

  { name: 'an unchanged tally raises nothing, so an honest fix round is not taxed',
    args: base,
    reply: (l, calls) => {
      const round = calls.filter(c => c.label.startsWith('gates')).length
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls, round === 1
        ? { all_pass: false, failures: ['npm test: 1 failed'], tests: { counted: true, passed: 11, failed: 1, skipped: 0 } }
        : { tests: { counted: true, passed: 12, failed: 0, skipped: 0 } })
      if (l.startsWith('review')) return review(0)
      return {}
    },
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('triage:'), 0, 'nothing to triage')) },

  // ── the behavior check ──────────────────────────────────────
  { name: 'no behaviorCheck means no behavior agent, so nothing changes for callers that do not use it',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('behavior:'), 0),
      ok(r.res.behavior && r.res.behavior.ran === false, 'no agent is spawned, but the omission is still recorded')) },

  { name: 'a behaviorCheck dispatches an agent that drives the path, beside the reviewers',
    args: { ...base, behaviorCheck: 'curl -i localhost:8080/v1/things and read the rate-limit headers' },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('behavior') ? { ran: true, blockedReason: '', observed: ['X-RateLimit-Remaining: 59'], mismatches: [] }
      : review(0),
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('behavior:'), 1),
      has(r.promptsFor('behavior')[0], 'curl -i localhost:8080', 'the path to drive must reach the agent'),
      ok(!/git diff/.test(r.promptsFor('behavior')[0]), 'the behavior agent reads the product, not the diff'),
      ok(r.res.behavior && r.res.behavior.ran === true, 'the observation must leave the phase')) },

  { name: 'observed behavior that contradicts the plan is a finding, and goes through triage',
    args: { ...base, behaviorCheck: 'call the endpoint' },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('behavior') ? { ran: true, blockedReason: '', observed: ['500'], mismatches: ['the endpoint returns 500, the plan says 429'] }
      : l.startsWith('review') ? review(0)
      : l.startsWith('triage') ? triageFor(calls, []) : {},
    expect: r => all(
      eq(r.n('triage:'), 1, 'a mismatch must be triaged like any other finding'),
      has(r.promptsFor('triage')[0] || '', 'the plan says 429', 'the mismatch must reach triage verbatim')) },

  { name: 'a behavior check that could not run stops the phase instead of closing it',
    args: { ...base, behaviorCheck: 'call the endpoint' },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('behavior') ? { ran: false, blockedReason: 'no service credentials', observed: [], mismatches: [] }
      : review(0),
    expect: r => all(eq(r.res.status, 'behavior-unverified'),
      has(r.res.reason || '', 'no service credentials', 'the reason must say what stopped it'),
      eq(r.n('fix:'), 0, 'an unverifiable acceptance is not a defect to fix')) },

  // Required, with `false` as the way to say "nothing observable here". Omitting it silently skips the
  // one check green gates cannot cover, and recording that in the result is one reader too late.
  { name: 'usage: omitting behaviorCheck is an error, not a silent skip',
    args: { ...base, behaviorCheck: undefined },
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'), eq(r.calls.length, 0),
      ok(/behaviorCheck is required/.test(r.res.reason || ''), 'the reason must name the argument')) },

  { name: 'behaviorCheck false is the explicit way to say nothing here is user-visible',
    args: { ...base, behaviorCheck: false },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('behavior:'), 0),
      ok(r.res.behavior && r.res.behavior.ran === false, 'the declared omission is recorded')) },

  { name: 'usage: a behaviorCheck that is not a usable description is rejected before any agent',
    args: { ...base, behaviorCheck: '   ' },
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'), eq(r.calls.length, 0)) },

  // ── what the reviewers are asked ────────────────────────────
  { name: 'a cap exhausted with no fixes spent says so, rather than reporting both kinds',
    args: { ...base, maxRounds: 0 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? triageFor(calls, ['bug0']) : {},
    expect: r => all(eq(r.res.status, 'cap-exhausted'), eq(r.res.fixes, 0),
      eq(r.res.exhaustedBy, 'none', "'mixed' reads as 'the budget went on both kinds' when nothing was spent")) },

  { name: 'an explicit reviewer count overrides what depth implies, and the result says so',
    args: { ...base, depth: 'deep', reviewers: 1 },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('review:'), 1, 'the explicit count wins'),
      eq(r.res.reviewers, 1), eq(r.res.depth, 'deep', 'the phase is still part of a Deep change')) },

  { name: 'a gates agent that reports the STRING "false" does not close the phase',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ all_pass: 'false', failures: ['npm test: 3 failing'], tests: { counted: true, passed: 9, failed: 3, skipped: 0 } })
      : l.startsWith('review') ? review(0) : {},
    expect: r => all(ok(r.res.status !== 'closed', 'a red build must not close, whatever shape the boolean arrived in'),
      eq(r.n('review:'), 0, 'no reviewer may be dispatched on a red build')) },

  // The tally is clean here on purpose: with a failing test in it, the cross-check above catches the
  // same mutation and this assertion stops saying anything about how the boolean is read. A red lint
  // command beside a green suite isolates the identity test.
  { name: 'a gates agent that reports the STRING "false" beside a clean tally still does not close',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls, { all_pass: 'false', failures: ['npm run lint: exit 1'], tests: { counted: true, passed: 12, failed: 0, skipped: 0 } })
      : l.startsWith('review') ? review(0) : {},
    expect: r => all(ok(r.res.status !== 'closed', 'a red build must not close, whatever shape the boolean arrived in'),
      eq(r.n('review:'), 0, 'no reviewer may be dispatched on a red build'),
      ok(r.n('fix:') > 0, 'the lint failure must reach a fix round')) },

  { name: 'a phase that declared no behavior check records that, and reports what it cost',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.res.status, 'closed'),
      ok(r.res.behavior && r.res.behavior.ran === false, 'the declared omission must be recorded, not absent'),
      ok(r.logs.some(m => /behaviorCheck false/.test(m)), 'and said at dispatch, before anything fails'),
      ok(Number.isInteger(r.res.agentsDispatched) && r.res.agentsDispatched > 0, 'the phase reports what it cost in agents')) },

  { name: 'a configuration that can run away says how many agents it may dispatch',
    args: { ...base, depth: undefined, reviewers: 4, maxRounds: 10 },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.res.status, 'closed'),
      ok(r.logs.some(m => /can dispatch up to \d+ agents/.test(m)), 'the bill must be stated where the caller can read it')) },

  { name: 'the review prompt asks about the classes most likely to be wrong',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => {
      const p = r.promptsFor('review')[0] || ''
      return all(
        has(p, 'inputs it does not expect', 'edge cases must be asked for'),
        has(p, 'hostile input', 'the security question must be asked'),
        has(p, 'weaken the existing tests', 'test integrity must be asked about'),
        has(p, 'Non-goals', 'scope must still be asked about'),
        has(p, 'Does the PLAN look wrong', 'a diff conforming to a wrong plan passes every other question'),
        ok(!/did that test ever fail/.test(p), 'a reviewer holding only the diff and the plan cannot answer whether a test was watched failing')) } },

  { name: 'two reviewers are sent decorrelated prompts that still carry every question',
    args: { ...base, depth: 'deep' },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => {
      const ps = r.promptsFor('review')
      return all(eq(ps.length, 2, 'a Deep phase runs two reviewers'),
        ok(ps[0] !== ps[1], 'identical prompts correlate the two readings a second reader is bought for'),
        ok(ps.every(p => p.includes('hostile input') && p.includes('weaken the existing tests')),
          'decorrelation may not cost either reviewer a directed question'),
        ok(ps.some(p => p.includes('git log -p -20')),
          'one reviewer reads the code\'s history, which is the decorrelation build.md documents')) } },

  // ── sha equality is not diff emptiness ──────────────────────
  // Every empty-diff guard here is an equality test on shas. A revert of the phase's own work, or a
  // reset plus an empty commit, MOVES head and leaves the tree identical to the base: both guards pass,
  // the reviewer gets an empty range, and reporting nothing is what a clean review looks like.
  { name: 'a fix round whose tree returns to the base is stopped, not reviewed',
    args: base,
    reply: (l, calls) => {
      const round = roundOf(calls)
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return round === 1 ? gates({ diffLines: 40 }) : gates({ headSha: hex(2), diffLines: 0 })
      if (l.startsWith('review')) return movingReview(calls)
      if (l.startsWith('triage')) return triageFor(calls, ['bug'])
      return {}
    },
    expect: r => all(
      eq(r.res.status, 'agent-error'), eq(r.res.stage, 'fix'),
      eq(r.n('review'), 1, 'the second review must not be dispatched against an empty range'),
      has(r.res.reason || '', 'identical to the base',
        'the error must name the tree, not the head — the head did move')) },

  { name: 'the gates step is asked to measure the diff, so emptiness is not inferred from shas',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates({ diffLines: 40 }) : review(0),
    expect: r => all(eq(r.res.status, 'closed'),
      has(r.promptsFor('gates')[0] || '', 'git diff --numstat', 'the gates prompt must ask for the diff size'),
      has(r.promptsFor('gates')[0] || '', 'diffLines', 'and name the field it wants it back in')) },

  // A guard whose input is unreadable is a guard that is OFF, and `Number(undefined)` is the quietest
  // way to switch one off: NaN fails every comparison below it and the phase carries on as though the
  // diff had been measured. Fail closed, the way the unparseable head above does.
  { name: 'a gates step that omits diffLines is an agent-error, not a guard quietly switched off',
    args: base,
    reply: (l, calls) => {
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) { const g = gates(); delete g.diffLines; return g }
      return review(0)
    },
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'gates'),
      has(r.res.reason || '', 'usable diffLines', 'the error must name the field it could not read'),
      eq(r.n('review'), 0, 'no reviewer may be spawned on a diff whose size was never measured')) },

  { name: 'a chatty diffLines is an agent-error, not a silently skipped empty-tree check',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates({ diffLines: '0 lines' }) : review(0),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'gates'),
      has(r.res.reason || '', 'usable diffLines', 'the error must name the field it could not read'),
      eq(r.n('review'), 0, '"0 lines" is the empty tree the guard exists for, read as NaN')) },

  // The empty tree is not only a fix-round shape: a write step that commits a revert, or an empty
  // commit, moves HEAD off the base and leaves nothing to review.
  { name: 'a write step whose tree is identical to the base is stopped at stage write',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates({ diffLines: 0 }) : review(0),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'write'),
      has(r.res.reason || '', 'identical to the base', 'the error must name the tree, not the head'),
      eq(r.n('review'), 0, 'no reviewer may be spawned on an empty range')) },

  // ── all_pass is a judgement; the tally beside it is data ────
  { name: 'all_pass beside failing tests in its own tally never reaches a reviewer',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ tests: { counted: true, passed: 0, failed: 3, skipped: 0 } })
      : review(0),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'gates'),
      eq(r.n('review'), 0, 'a red build must never be handed to a reviewer'),
      eq(r.n('fix:'), 0, 'and must not spend a fix round either')) },

  { name: 'all_pass with nothing executed and everything skipped is not a pass',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ tests: { counted: true, passed: 0, failed: 0, skipped: 214 } })
      : review(0),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.res.stage, 'gates'),
      eq(r.n('review'), 0, 'exit 0 with every test skipped must not buy a review')) },

  // ── a phase that has stopped converging ─────────────────────
  { name: 'a round that changed the code and not the findings stops as no-progress',
    args: { ...base, maxRounds: 3 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? triageFor(calls, ['bug0'])
      : {},
    expect: r => all(
      eq(r.res.status, 'no-progress'),
      eq(r.res.fixes, 1, 'it stops on the first fix that moved nothing, not at the cap'),
      eq(r.n('fix:'), 1, 'the rest of the budget is not spent'),
      ok((r.res.unresolved || []).length > 0, 'the deadlock report carries what is unresolved'),
      ok(Number.isInteger(r.res.agentsDispatched), 'and what the phase cost')) },

  { name: 'findings that move between rounds still spend the budget, so no-progress is not a cheaper cap',
    args: { ...base, maxRounds: 3 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? movingReview(calls)
      : l.startsWith('triage') ? triageFor(calls, ['bug'])
      : {},
    expect: r => all(eq(r.res.status, 'cap-exhausted'), eq(r.res.fixes, 3),
      eq(r.n('fix:'), 3, 'a phase that is still converging keeps its rounds')) },

  // The signature is built from whatever list drove the round, and on a red build that list is the
  // GATE failures — command-level strings like "npm test: 1 failed", which stay byte-identical while
  // the tally underneath them moves from 3 failures to 1. Stopping there cuts off a phase that is
  // converging. The stalled-review question is only answerable on the review path.
  { name: 'two red rounds with identical gate failure strings keep their budget',
    args: { ...base, maxRounds: 3 },
    reply: (l, calls) => {
      const round = roundOf(calls)
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return round <= 2
        ? advancingGates(calls, { all_pass: false, failures: ['npm test: 1 failed'], tests: { counted: true, passed: 9 + round, failed: 4 - round, skipped: 0 } })
        : advancingGates(calls, { tests: { counted: true, passed: 13, failed: 0, skipped: 0 } })
      if (l.startsWith('review')) return review(0)
      return {}
    },
    expect: r => all(eq(r.res.status, 'closed'), eq(r.res.fixes, 2),
      eq(r.n('fix:'), 2, 'a red build whose tally is improving has not stopped converging')) },

  // Both stops are true on the last round, and they say opposite things to the caller: no-progress
  // reports "remaining 0 round(s)" and carries no exhaustedBy, so an escalation reading it cannot tell
  // which stage spent the budget. The cap is the more informative verdict, and it wins.
  { name: 'the last round is cap-exhausted with exhaustedBy, not no-progress',
    args: { ...base, maxRounds: 1 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? triageFor(calls, ['bug0'])
      : {},
    expect: r => all(eq(r.res.status, 'cap-exhausted'), eq(r.res.fixes, 1),
      eq(r.res.exhaustedBy, 'review', 'the escalation needs to know which stage spent the budget')) },

  // ── triage is told how to weigh a finding, not only whether it is true ──
  { name: 'triage is given the scope test and the score bands, not a binary verdict',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(2) : l.startsWith('triage') ? triageFor(calls, []) : {},
    expect: r => {
      const p = r.promptsFor('triage')[0] || ''
      return all(eq(r.res.status, 'closed'),
        has(p, 'lists as a Non-goal', 'true is not the same as this change\'s problem'),
        has(p, 'verified and likely to be hit', 'the score bands must reach the agent that applies them'),
        has(p, 'Confirm 75 and above', 'and the threshold with them')) } },

  { name: 'a reappearing claim is re-checked against the code, not inherited from the earlier verdict',
    args: base,
    reply: (l, calls) => {
      const round = roundOf(calls)
      if (l.startsWith('write')) return write()
      if (l.startsWith('gates')) return advancingGates(calls)
      if (l.startsWith('review')) return round === 1 ? review(2) : movingReview(calls)
      if (l.startsWith('triage')) return triageFor(calls, t => /bug0/.test(t))
      return {}
    },
    expect: r => {
      const later = r.promptsFor('triage')[1] || ''
      return all(ok(!!r.promptsFor('triage')[1], 'a second triage must happen'),
        has(later, 're-check it against the code', 'the earlier verdict must be re-derived, not inherited'),
        ok(!/very likely the same phantom/.test(later),
          'a wrongly rejected finding looks identical from here, so the prompt may not pre-judge it')) } },

  // ── the fix round repairs; it does not build ────────────────
  { name: 'the fix prompt forbids new machinery and forbids editing the plan',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? movingReview(calls)
      : l.startsWith('triage') ? triageFor(calls, ['bug'])
      : {},
    expect: r => {
      const p = r.promptsFor('fix')[0] || ''
      return all(ok(!!r.promptsFor('fix')[0], 'this scenario must reach a fix round'),
        has(p, 'new machinery is new work', 'scope growth in the fix step is what exhausts the cap'),
        has(p, 'Do not edit .agent/t/plan.md',
          'the plan is gitignored, so an edit to it is invisible to every reviewer that follows')) } },

  // ── read mode: what is read rather than run ─────────────────
  { name: 'a read-mode behavior check dispatches a reader, not a driver',
    args: { ...base, behaviorCheck: { read: 'references/build.md, then SKILL.md' } },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l.startsWith('behavior') ? { ran: true, blockedReason: '', observed: ['the routing table names a file that is not there'], mismatches: [] }
      : review(0),
    expect: r => all(eq(r.res.status, 'closed'), eq(r.n('behavior:'), 1),
      has(r.promptsFor('behavior')[0] || '', 'no diff, no account of what changed',
        'a reader meets the finished files, not the edit'),
      has(r.promptsFor('behavior')[0] || '', 'references/build.md, then SKILL.md',
        'the files to read must reach the reader'),
      ok(r.res.behavior && r.res.behavior.ran === true, 'the observation must leave the phase')) },

  { name: 'a read-mode check that did not happen is as unverified as a driver that could not start',
    args: { ...base, behaviorCheck: { read: 'the four reference files' } },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l.startsWith('behavior') ? { ran: false, blockedReason: 'the files are not on disk', observed: [], mismatches: [] }
      : review(0),
    expect: r => all(eq(r.res.status, 'behavior-unverified'),
      has(r.res.reason || '', 'the files are not on disk', 'the reason must say what stopped it')) },

  { name: 'usage: an object behaviorCheck naming nothing to read is still rejected',
    args: { ...base, behaviorCheck: { read: '   ' } },
    reply: () => write(),
    expect: r => all(eq(r.res.status, 'usage-error'), eq(r.calls.length, 0)) },

  // ── guards that failed open, and payloads that went missing ──
  { name: 'an unparseable branch from the gates step fails closed, like the sha beside it',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates({ branch: 'not a ref!!' }) : review(0),
    expect: r => all(eq(r.res.status, 'agent-error'),
      eq(r.n('review'), 0, 'the wrong-branch check may not be disabled by an unusable string'),
      has(r.res.reason || '', 'not a usable git ref', 'the error must name what it could not read')) },

  { name: 'the closed phase returns its gate results normalised, like every other path',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ results: ['npm test: exit 0', { cmd: 'lint', code: 0 }] })
      : review(0),
    expect: r => all(eq(r.res.status, 'closed'),
      deep(r.res.gates, ['npm test: exit 0', '{"cmd":"lint","code":0}'],
        'a non-string entry must arrive as readable text, not as something the caller indexes into')) },

  // The phase that died at round 3 is the one whose cost the caller most needs.
  { name: 'a cap-exhausted phase reports what it cost in agents',
    args: { ...base, maxRounds: 1 },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.startsWith('review') ? movingReview(calls)
      : l.startsWith('triage') ? triageFor(calls, ['bug'])
      : {},
    expect: r => all(eq(r.res.status, 'cap-exhausted'),
      ok(Number.isInteger(r.res.agentsDispatched) && r.res.agentsDispatched > 0,
        'the cost must be reported on the paths that did not close, not only on the one that did')) },

  { name: 'a phase stopped by an incomplete triage reports what it cost in agents',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(2)
      : l.startsWith('triage') ? { confirmed: [], rejected: [{ item: 1, why: 'misreads the code' }] }
      : {},
    expect: r => all(eq(r.res.status, 'triage-incomplete'),
      ok(Number.isInteger(r.res.agentsDispatched) && r.res.agentsDispatched > 0, 'the cost must come back')) },

  { name: 'a phase stopped by an unverified behavior check reports what it cost in agents',
    args: { ...base, behaviorCheck: 'call the endpoint' },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates()
      : l.startsWith('behavior') ? { ran: false, blockedReason: 'no credentials', observed: [], mismatches: [] }
      : review(0),
    expect: r => all(eq(r.res.status, 'behavior-unverified'),
      ok(Number.isInteger(r.res.agentsDispatched) && r.res.agentsDispatched > 0, 'the cost must come back')) },

  { name: 'an agent-error reports what it cost in agents',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates({ headSha: 'HEAD' }) : review(0),
    expect: r => all(eq(r.res.status, 'agent-error'),
      ok(Number.isInteger(r.res.agentsDispatched) && r.res.agentsDispatched > 0, 'the cost must come back')) },

  { name: 'reviewers beyond the second are not sent a byte-identical copy of an earlier prompt',
    args: { ...base, depth: undefined, reviewers: 4 },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => {
      const ps = r.promptsFor('review')
      return all(eq(ps.length, 4, 'four reviewers were asked for'),
        eq(new Set(ps).size, 4, 'identical prompts correlate the readings the extra reviewers are bought for'),
        ok(ps.every(p => p.includes('hostile input') && p.includes('weaken the existing tests')),
          'decorrelation may not cost any reviewer a directed question')) } },

  // ── what the reviewers are asked, after B4 ──────────────────
  { name: 'the review prompt asks about failure paths and about facts assumed outside the diff',
    args: base,
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => {
      const p = r.promptsFor('review')[0] || ''
      return all(
        has(p, 'when something this change calls FAILS', 'the error-path question must be asked'),
        has(p, 'OUTSIDE this diff', 'the assumed-facts question must be asked'),
        has(p, 'generated or non-text artefacts', 'a diff you cannot read is not a diff you reviewed'),
        has(p, 'passes with the change reverted is testing nothing',
          'the test-integrity question is worth nothing without the standard it is judged against'),
        ok(!/narrating process/.test(p),
          'the process-comment question was cut to make room; two copies of a prompt drift')) } },

  // ── the cost of the second reviewer, said where the caller reads it ──
  { name: "depth 'deep' says what the second reviewer costs, without changing the count",
    args: { ...base, depth: 'deep' },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.n('review'), 2, 'the default is not flipped'),
      ok(r.logs.some(m => /reviewers: 1 on a reversible phase/.test(m)),
        'the cost of the default must be visible at the call site')) },

  { name: 'a caller who wrote the count themselves is not lectured about it',
    args: { ...base, depth: undefined, reviewers: 2 },
    reply: (l, calls) => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.n('review'), 2),
      ok(!r.logs.some(m => /reversible phase/.test(m)),
        'the note is about what depth implied, not about a count the caller chose')) },
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
  // Deliberately not "all N invariants hold". That sentence reads as coverage and is not: on
  // 2026-08-11 it printed `all 54 invariants hold` while 21 of 88 mutations of phase.js survived it.
  // A count of what is asserted is not a measure of what would be caught, and the only number that
  // moves when this harness gets worse is the survival rate — which lives in negative-test.sh.
  console.log(`sim-phase: ${INVARIANTS.length} invariants asserted, none broken`)
  console.log('  (a count of what is asserted, not a measure of what would be caught —' +
              ' run scripts/negative-test.sh for the kill rate)')
})()
