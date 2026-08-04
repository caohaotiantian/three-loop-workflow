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

const base = { phaseLabel: 'P1', planPath: '.agent/t/plan.md', tasks: 'do the thing', acceptCmds: ['npm test'], baseSha: A, depth: 'standard' }
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

  // The Workflow tool passes args as a JSON string. Every scenario above uses the object form, so this
  // asserts the string form reaches the same place — otherwise the script works only under the harness.
  { name: 'args arriving as a JSON string behaves exactly like the object form',
    args: JSON.stringify(base),
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
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
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.n('review'), 2), eq(r.res.reviewers, 2),
      eq(r.res.depth, 'deep', 'the resolved depth is reported back')) },

  { name: 'depth and reviewers disagreeing is a caller bug, not resolved by precedence',
    args: { ...base, depth: 'standard', reviewers: 2 },
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
  // Finding names are deliberately distinctive. Single letters do not work: 'y' occurs in the static
  // triage prompt ("you", "really", "defensively"), so an assertion that the prompt contains 'y' passes
  // whether or not reviewer 2's finding survived — the assertion carried no information. The triage stub
  // also echoes only what it was actually handed, so a discarded finding cannot be masked by a
  // hardcoded confirmation.
  { name: 'two reviewers are unioned, never intersected',
    args: { ...base, depth: 'deep' },
    reply: (l, calls) => l.startsWith('write') ? write()
      : l.startsWith('gates') ? advancingGates(calls)
      : l.endsWith(':v1') ? { blocking: ['FINDING-ALPHA'], nonblocking: ['nit-1'], blocking_count: 1, nonblocking_count: 1 }
      : l.endsWith(':v2') ? { blocking: ['FINDING-BETA'], nonblocking: ['nit-1', 'nit-2'], blocking_count: 1, nonblocking_count: 2 }
      : l.startsWith('triage') ? {
          confirmed: ['FINDING-ALPHA', 'FINDING-BETA'].filter(f => calls[calls.length - 1].prompt.includes(f)),
          rejected: [],
        }
      : {},
    expect: r => all(
      has(r.promptsFor('triage')[0], 'FINDING-ALPHA', 'reviewer 1\'s finding must reach triage'),
      has(r.promptsFor('triage')[0], 'FINDING-BETA', 'reviewer 2\'s finding must reach triage'),
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
    args: { ...base, depth: 'deep' },
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

  // ── fail closed on unvalidated agent input ──────────────────
  // The write agent's headSha is a string it typed. The gates agent independently runs
  // `git rev-parse HEAD`, so the script holds a second, shell-sourced measurement of the same fact
  // and must reconcile them. Validating only the SHAPE of the self-report leaves the guard walkable
  // by any well-formed sha — stale, cross-branch, or invented.
  { name: 'a fabricated but well-formed headSha cannot close a phase on an empty diff',
    args: base,
    reply: l => l.startsWith('write') ? write({ headSha: 'd'.repeat(40) })
      : l.startsWith('gates') ? gates({ headSha: A })   // the real HEAD is still baseSha
      : review(0),
    expect: r => all(
      eq(r.res.status, 'agent-error'),
      ok(r.res.status !== 'closed', 'a phase that committed nothing must never return closed')) },

  { name: 'an unparseable gates headSha fails closed instead of disabling the no-op-fix guard',
    args: base,
    reply: l => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ headSha: 'HEAD' })
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? { confirmed: ['bug0'], rejected: [] }
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
      if (l.startsWith('triage')) return { confirmed: ['bug0'], rejected: [] }
      return {}
    },
    expect: r => all(
      eq(r.res.status, 'agent-error'),
      ok(r.res.status !== 'closed', 'an empty range must never close, on any round'),
      eq(r.n('review'), 1, 'the second review must not be dispatched against an empty diff')) },

  { name: 'a branch name that is not a plausible git ref is rejected',
    args: base,
    reply: l => l.startsWith('write') ? write({ branch: 'task; rm -rf /' }) : gates(),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.n('review'), 0)) },

  { name: 'a caller-supplied branch is authoritative over the write agent\'s self-report',
    args: { ...base, branch: 'task' },
    reply: l => l.startsWith('write') ? write({ branch: 'phase-1-side' }) : gates(),
    expect: r => all(eq(r.res.status, 'agent-error'), eq(r.n('review'), 0)) },

  { name: 'the validated baseSha, not the raw argument, is interpolated into the diff commands',
    args: { ...base, baseSha: '  ' + 'C'.repeat(40) + '\n' },
    reply: l => l.startsWith('write') ? write({ headSha: B })
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
    reply: l => l.startsWith('write') ? write({ concerns: ['the refill maths in bucket.js'] })
      : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(
      eq(r.res.status, 'closed'),
      ...r.promptsFor('review').map(p => ok(!p.includes('refill maths'), 'a reviewer prompt leaks the implementer\'s concerns')),
      ...r.promptsFor('review').map(p => ok(!/look there first/i.test(p), 'a reviewer prompt carries an attention directive')),
      deep(r.res.concerns, ['the refill maths in bucket.js'], 'the concerns are returned to the caller instead')) },

  { name: 'depth deep runs two reviewers without the caller restating the count',
    args: { ...base, depth: 'deep' },
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(
      eq(r.n('review'), 2, 'two reviewers'),
      eq(r.res.reviewers, 2, 'the return states how many reviewed, so a forgotten flag is visible')) },

  { name: 'depth standard runs one reviewer and says so',
    args: { ...base, depth: 'standard' },
    reply: l => l.startsWith('write') ? write() : l.startsWith('gates') ? gates() : review(0),
    expect: r => all(eq(r.n('review'), 1), eq(r.res.reviewers, 1)) },

  { name: 'an unknown depth is a usage-error rather than a silent Standard review',
    args: { ...base, depth: 'thorough' },
    reply: () => write(),
    expect: r => eq(r.res.status, 'usage-error') },

  // ── the triage record ───────────────────────────────────────
  { name: 'triage rejections are returned, not just logged',
    args: base,
    reply: l => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates()
      : l.startsWith('review') ? review(2)
      : l.startsWith('triage') ? { confirmed: [], rejected: ['bug0: cites a line that does not exist', 'bug1: describes a real property that is not a problem'] }
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
      if (l.startsWith('review')) return review(1)
      if (l.startsWith('triage')) return round === 1
        ? { confirmed: ['bug0'], rejected: ['ghost0: misreads the guard'] }
        : { confirmed: ['bug0'], rejected: [] }
      return {}
    },
    expect: r => {
      const later = r.promptsFor('triage')[1]
      return all(ok(!!later, 'a second triage must happen'),
        has(later || '', 'ghost0', 'the prior rejection must be carried into the next round\'s triage')) } },

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
      if (l.startsWith('triage')) return { confirmed: ['bug0'], rejected: [] }
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
      : l.startsWith('gates') ? advancingGates(calls, { all_pass: false, failures: ['npm test: 1 failed'] })
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
      : l.startsWith('triage') ? { confirmed: ['bug0'], rejected: [] }
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
      : l.startsWith('triage') ? { confirmed: ['bug0'], rejected: [] }
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
    reply: l => l.startsWith('write') ? write()
      : l.startsWith('gates') ? gates({ headSha: B })
      : l.startsWith('review') ? review(1)
      : l.startsWith('triage') ? { confirmed: ['bug0'], rejected: [] }
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
