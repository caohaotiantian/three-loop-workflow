#!/usr/bin/env node
// Reconstruct the per-round series of a round-cap replicate from a Workflow transcript directory.
//
// `phase.js` returns a verdict, not a series: there is no way to see the confirmed-blocking count
// falling — or not falling — from what it returns. Modifying it to emit one would change the
// instrument mid-experiment, which is how a harness bug becomes a finding. So the series is read back
// out of what the runtime already recorded.
//
// The journal carries `{agentId, type, result}` and no label, so role and round are recovered from
// what is actually durable: each agent transcript's FIRST message is the verbatim prompt phase.js
// built, and phase.js's five prompts have distinct openings. Rounds are segmented on the `gates`
// agent, which phase.js runs exactly once at the top of every verify trip.
//
// THIS SCRIPT FAILS LOUDLY. A prompt it cannot classify, an agent with no recorded result, or a round
// whose shape contradicts phase.js's control flow is an error and a non-zero exit — never a zero
// quietly reported as data. Reporting an unparsed journal as "0 findings" would look exactly like
// convergence, which is the result this experiment is least entitled to manufacture.
//
// Usage: exp-extract.mjs [--replicate <branch>] <transcript-dir> [<transcript-dir> ...]
// Writes the merged series as JSON on stdout.
//
// `--replicate` names the replicate a transcript directory belongs to. It is needed because one of
// phase.js's five prompts — the gates prompt — is built only from `acceptCmds`, which for this
// experiment is `bash scripts/accept-release.sh` and so names neither a branch nor a path. Every other
// prompt carries the branch. Rather than distort `acceptCmds` to make the extractor's job easier, the
// caller states which replicate the directory is, and the extractor ASSERTS that no agent in that
// directory mentions a different replicate — so a mislabelled directory is an error rather than a
// silent misattribution of one run's findings to another.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const ROLES = [
  ['write-redispatch', p => p.startsWith('You are implementing') && p.includes('A previous attempt stopped')],
  ['write', p => p.startsWith('You are implementing')],
  ['gates', p => p.startsWith('Run each of these commands in order')],
  ['review', p => p.startsWith('Review the diff at')],
  ['triage', p => p.startsWith('Check each claimed defect below')],
  ['fix', p => p.startsWith('Fix these')],
]

const errors = []
const fail = m => { errors.push(m) }

function classify(prompt) {
  for (const [role, test] of ROLES) if (test(prompt)) return role
  return null
}

// A replicate is named two ways in phase.js's prompts and both have to be recognised: the review, fix
// and write prompts carry the branch (`exp-rep1`), while the gates prompt carries only the clone path
// (`.../exp/rep1`), because acceptCmds is the one field that names a directory rather than a ref.
// Normalise both to the branch spelling.
function replicateOf(prompt) {
  const m = prompt.match(/exp-rep(\d+)/) || prompt.match(/exp\/rep(\d+)/)
  return m ? `exp-rep${m[1]}` : null
}

function readAgents(dir, declared) {
  const journalPath = join(dir, 'journal.jsonl')
  if (!existsSync(journalPath)) { fail(`${dir}: no journal.jsonl`); return [] }

  const results = new Map()
  for (const line of readFileSync(journalPath, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let rec
    try { rec = JSON.parse(line) } catch { fail(`${dir}: unparseable journal line`); continue }
    if (rec.type === 'result') results.set(rec.agentId, rec.result)
  }

  const agents = []
  for (const f of readdirSync(dir)) {
    if (!f.startsWith('agent-') || !f.endsWith('.jsonl')) continue
    const id = basename(f).replace(/^agent-/, '').replace(/\.jsonl$/, '')
    const lines = readFileSync(join(dir, f), 'utf8').split('\n').filter(l => l.trim())
    if (!lines.length) { fail(`agent ${id}: empty transcript`); continue }
    let first
    try { first = JSON.parse(lines[0]) } catch { fail(`agent ${id}: unparseable first record`); continue }
    const content = first?.message?.content
    const prompt = typeof content === 'string'
      ? content
      : Array.isArray(content) ? content.map(c => c?.text || '').join('') : ''
    if (!prompt) { fail(`agent ${id}: first record carries no prompt text`); continue }

    const role = classify(prompt)
    if (!role) { fail(`agent ${id}: prompt matches none of phase.js's five prompts — starts "${prompt.slice(0, 70)}"`); continue }
    if (!results.has(id)) { fail(`agent ${id} (${role}): no result recorded in the journal`); continue }

    // A prompt that names a replicate other than the declared one means this directory holds more
    // than one run, and every count below would mix them. Fail rather than guess.
    const named = replicateOf(prompt)
    if (declared && named && named !== declared) {
      fail(`agent ${id} (${role}) names ${named}, but this directory was declared ${declared}`)
      continue
    }
    agents.push({
      id,
      role,
      replicate: named || declared || null,
      timestamp: first.timestamp,
      result: results.get(id),
    })
  }
  return agents
}

// phase.js dedupes reviewer findings by exact string equality before triage (`[...new Set(...)]`).
// That is the shipped behaviour and it is inherited unchanged, not improved on here: near-duplicates
// from two reviewers therefore both reach triage and both count.
function unionExact(lists) {
  return [...new Set(lists.flat())]
}

function buildSeries(agents) {
  const byReplicate = new Map()
  for (const a of agents) {
    const key = a.replicate || 'UNATTRIBUTED'
    if (!byReplicate.has(key)) byReplicate.set(key, [])
    byReplicate.get(key).push(a)
  }
  if (byReplicate.has('UNATTRIBUTED')) {
    fail(`${byReplicate.get('UNATTRIBUTED').length} agent(s) could not be attributed to a replicate`)
  }

  const out = {}
  for (const [rep, list] of byReplicate) {
    list.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))

    const rounds = []
    let cur = null
    const preamble = []
    for (const a of list) {
      if (a.role === 'gates') {
        if (cur) rounds.push(cur)
        cur = { round: rounds.length + 1, gates: null, reviews: [], triage: null, fix: false }
      }
      if (!cur) { preamble.push(a); continue }
      if (a.role === 'gates') cur.gates = a.result
      else if (a.role === 'review') cur.reviews.push(a.result)
      else if (a.role === 'triage') cur.triage = a.result
      else if (a.role === 'fix') cur.fix = true
      else preamble.push(a)
    }
    if (cur) rounds.push(cur)

    const series = rounds.map(r => {
      const gatesPass = r.gates?.all_pass === true
      const perReviewer = r.reviews.map(v => (v?.blocking || []).length)
      const reported = unionExact(r.reviews.map(v => v?.blocking || []))
      const confirmed = r.triage ? (r.triage.confirmed || []) : (gatesPass ? [] : null)
      const rejected = r.triage ? (r.triage.rejected || []) : []

      if (gatesPass && r.reviews.length !== 2) {
        fail(`${rep} round ${r.round}: gates passed but ${r.reviews.length} reviewer(s) recorded — a Deep phase runs 2`)
      }
      if (gatesPass && reported.length && !r.triage) {
        fail(`${rep} round ${r.round}: ${reported.length} blocking reported and no triage agent ran — closure would have counted the raw report`)
      }
      return {
        round: r.round,
        // The commit the reviewers of THIS round actually saw. Captured so that a later adjudicator can
        // judge a finding against the tree it was made against rather than against the final one — a
        // finding raised in round 2 and fixed in round 3 is not refuted by the round-3 tree.
        head_sha: r.gates?.headSha || null,
        gates_pass: gatesPass,
        gate_failures: gatesPass ? [] : (r.gates?.failures || []),
        reviewers: r.reviews.length,
        per_reviewer_blocking: perReviewer,
        reported_union: reported.length,
        reported: reported,
        confirmed_blocking: confirmed === null ? null : confirmed.length,
        confirmed: confirmed === null ? [] : confirmed,
        rejected_count: rejected.length,
        rejected,
        nonblocking_union: unionExact(r.reviews.map(v => v?.nonblocking || [])).length,
        fix_ran: r.fix,
      }
    })

    out[rep] = { rounds: series, preamble: preamble.map(a => ({ role: a.role, result: a.result })) }
  }
  return out
}

const argv = process.argv.slice(2)
let declared = null
const ri = argv.indexOf('--replicate')
if (ri >= 0) { declared = argv[ri + 1]; argv.splice(ri, 2) }
const dirs = argv
if (!dirs.length) {
  console.error('usage: exp-extract.mjs [--replicate <branch>] <transcript-dir> [<transcript-dir> ...]')
  process.exit(2)
}
if (declared && dirs.length > 1) {
  console.error('FAIL  --replicate names one run; pass one transcript directory with it')
  process.exit(2)
}

const allAgents = dirs.flatMap(d => readAgents(d, declared))
const series = buildSeries(allAgents)

if (errors.length) {
  console.error('FAIL  the journal does not have the shape this extractor requires:')
  for (const e of errors) console.error(`  ${e}`)
  console.error('\nRefusing to emit a series. An unparsed journal reported as zeros looks exactly like convergence.')
  process.exit(1)
}

console.log(JSON.stringify({ transcriptDirs: dirs, agents: allAgents.length, series }, null, 2))
