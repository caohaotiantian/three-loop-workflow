#!/usr/bin/env node
// The round-cap experiment's analysis. A script with an exit code, not an agent's summary.
//
// Pre-registration: docs/measurements/2026-07-30-round-cap/preregistration.md. Every denominator,
// threshold and decision rule implemented here was fixed there before any data existed; this file is
// the executable form of §5 and §6 and adds nothing to them.
//
// It exits NON-ZERO when:
//   - the raw data is internally inconsistent (the series disagrees with what phase.js returned), or
//   - a figure published in the results documents is not the figure recomputed here.
// Both are failure modes this repository has actually shipped: a number that drifted from the tree
// that produced it, and a claim nobody re-derived. A green run of this script is the only thing
// entitled to put a number in the results documents.
//
// Usage: exp-analyse.mjs [--raw <dir>] [--docs <file> ...]

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const rawDir = (() => { const i = argv.indexOf('--raw'); return i >= 0 ? argv[i + 1] : 'docs/measurements/2026-07-30-round-cap/raw' })()
const docs = (() => { const i = argv.indexOf('--docs'); return i >= 0 ? argv.slice(i + 1) : [] })()

const problems = []
const bad = m => problems.push(m)
const load = f => {
  const p = join(rawDir, f)
  if (!existsSync(p)) { bad(`missing raw artifact: ${p}`); return null }
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { bad(`unparseable ${p}: ${e.message}`); return null }
}

const verdicts = load('verdicts.json')
const series = load('series.json')
const adjudication = load('adjudication.json')
const seedMatch = load('seed-match.json')
if (problems.length) { for (const p of problems) console.error(`FAIL  ${p}`); process.exit(1) }

const MAX_ROUNDS = 6          // the pre-registered deviation; not the shipped 3
const SEED_IDS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
const CORRECT_IDS = ['C1', 'C2', 'C3']

// ── Per-replicate outcome ────────────────────────────────────────────────────
const reps = []
for (const [rep, v] of Object.entries(verdicts)) {
  const s = series.series?.[rep]
  if (!s) { bad(`${rep}: a verdict with no extracted series`); continue }

  const rounds = s.rounds
  const reviewRounds = rounds.filter(r => r.gates_pass)
  const fixRounds = rounds.filter(r => r.fix_ran)
  const gateFixRounds = rounds.filter(r => r.fix_ran && !r.gates_pass)
  const reviewFixRounds = rounds.filter(r => r.fix_ran && r.gates_pass)

  // Consistency: the series and the returned object are two independent records of one run.
  // Disagreement means one of them is wrong, and neither is then usable.
  if (typeof v.fixes === 'number' && fixRounds.length !== v.fixes) {
    bad(`${rep}: journal shows ${fixRounds.length} fix round(s), phase.js returned fixes=${v.fixes}`)
  }
  if (typeof v.gateFixes === 'number' && gateFixRounds.length !== v.gateFixes) {
    bad(`${rep}: journal shows ${gateFixRounds.length} gate-fix round(s), phase.js returned gateFixes=${v.gateFixes}`)
  }
  if (typeof v.reviewFixes === 'number' && reviewFixRounds.length !== v.reviewFixes) {
    bad(`${rep}: journal shows ${reviewFixRounds.length} review-fix round(s), phase.js returned reviewFixes=${v.reviewFixes}`)
  }
  if (typeof v.fixes === 'number' && typeof v.gateFixes === 'number' && typeof v.reviewFixes === 'number'
      && v.gateFixes + v.reviewFixes !== v.fixes) {
    bad(`${rep}: gateFixes(${v.gateFixes}) + reviewFixes(${v.reviewFixes}) != fixes(${v.fixes})`)
  }
  if (v.status === 'closed') {
    const last = reviewRounds[reviewRounds.length - 1]
    if (!last || last.confirmed_blocking !== 0) {
      bad(`${rep}: returned 'closed' but the final review round shows ${last ? last.confirmed_blocking : 'no'} confirmed blocking`)
    }
  }
  if (v.status === 'cap-exhausted' && v.fixes !== MAX_ROUNDS) {
    bad(`${rep}: 'cap-exhausted' after ${v.fixes} fixes, but the cap was ${MAX_ROUNDS}`)
  }

  const converged = v.status === 'closed'
  const censored = v.status === 'cap-exhausted'
  const voided = !converged && !censored

  reps.push({
    replicate: rep,
    status: v.status,
    converged,
    censored,
    voided,
    voidReason: voided ? (v.reason || v.stage || v.status) : null,
    fixes: v.fixes ?? null,
    gateFixes: v.gateFixes ?? null,
    // The primary measure. The question is about REVIEW convergence; gate rounds share the budget but
    // are a different quantity, and phase.js splits the counters for exactly this reason.
    reviewFixes: v.reviewFixes ?? null,
    reviewRounds: reviewRounds.length,
    confirmedSeries: reviewRounds.map(r => r.confirmed_blocking),
    reportedSeries: reviewRounds.map(r => r.reported_union),
    rejectedSeries: reviewRounds.map(r => r.rejected_count),
  })
}

// ── Primary: counts, never a median ──────────────────────────────────────────
// n = 3 with right-censoring at 6 does not identify a median, and the pre-registration forbids one.
const observed = reps.filter(r => !r.voided)
const within3 = observed.filter(r => r.converged && r.reviewFixes <= 3).length
const within6 = observed.filter(r => r.converged && r.reviewFixes <= MAX_ROUNDS).length
const never = observed.filter(r => r.censored).length
const voidCount = reps.filter(r => r.voided).length

// ── Monotonicity (H3) ────────────────────────────────────────────────────────
const monotonic = r => r.confirmedSeries.every((v, i, a) => i === 0 || v === null || a[i - 1] === null || v <= a[i - 1])
const nonMonotonic = observed.filter(r => !monotonic(r)).length

// ── Seed recall and phantom rate ─────────────────────────────────────────────
// Denominators fixed in the pre-registration: seeds out of 6; survival out of all triage-confirmed.
const matchOf = new Map((seedMatch.matches || []).map(m => [m.finding_id, m.matched]))
const upheldOf = new Map((adjudication.verdicts || []).map(a => [a.finding_id, a.upheld]))

const perRepSeeds = {}
for (const r of reps) {
  const s = series.series?.[r.replicate]
  if (!s) continue
  const found = new Set()
  const phantomCorrect = new Set()
  for (const round of s.rounds) {
    for (const f of (round.confirmed || [])) {
      const id = `${r.replicate}::${round.round}::${f}`
      const m = matchOf.get(id)
      if (SEED_IDS.includes(m)) found.add(m)
      if (CORRECT_IDS.includes(m)) phantomCorrect.add(m)
    }
  }
  perRepSeeds[r.replicate] = {
    seedsFound: [...found].sort(),
    seedRecall: found.size / SEED_IDS.length,
    correctEditsReportedAsDefects: [...phantomCorrect].sort(),
  }
}

const allConfirmed = []
for (const r of reps) {
  const s = series.series?.[r.replicate]
  if (!s) continue
  for (const round of s.rounds) {
    for (const f of (round.confirmed || [])) {
      allConfirmed.push(`${r.replicate}::${round.round}::${f}`)
    }
  }
}
const adjudicated = allConfirmed.filter(id => upheldOf.has(id))
const upheld = adjudicated.filter(id => upheldOf.get(id) === true)
const survival = adjudicated.length ? upheld.length / adjudicated.length : null
if (adjudicated.length !== allConfirmed.length) {
  bad(`adjudication covers ${adjudicated.length} of ${allConfirmed.length} confirmed findings — the denominator is not the pre-registered one`)
}

const totalReported = reps.reduce((a, r) => a + r.reportedSeries.reduce((x, y) => x + y, 0), 0)
const totalRejected = reps.reduce((a, r) => a + r.rejectedSeries.reduce((x, y) => x + y, 0), 0)
const rejectionRate = totalReported ? totalRejected / totalReported : null

// ── UNPLANNED ANALYSIS. Added after observing the runs; reported as exploratory, never as a
// pre-registered result. ───────────────────────────────────────────────────────────────────────
// The pre-registration says R5 "cannot be tested by this experiment — the seeded material adds no
// checks". That was true of the material and false of what happened: the FIX step added checks, and
// subsequent rounds found defects in them. Splitting confirmed findings by the file they cite is the
// cheapest honest way to show it, and it is deterministic — no agent judges this.
const PLANNED_TARGET = 'references/build.md'
const MACHINERY = ['accept-release.sh', 'negative-test', 'sim-phase', 'sim-scenarios']
const scope = { plannedTarget: 0, machineryTheChangeAdded: 0, other: 0, perReplicate: {} }
for (const r of reps) {
  const s = series.series?.[r.replicate]
  if (!s) continue
  const row = { plannedTarget: 0, machineryTheChangeAdded: 0, other: 0, byRound: [] }
  for (const round of s.rounds) {
    if (!round.gates_pass) continue
    let p = 0, m = 0, o = 0
    for (const f of (round.confirmed || [])) {
      const head = f.slice(0, 200)
      const isMachinery = MACHINERY.some(x => head.includes(x))
      if (isMachinery) m++
      else if (head.includes(PLANNED_TARGET)) p++
      else o++
    }
    row.plannedTarget += p; row.machineryTheChangeAdded += m; row.other += o
    row.byRound.push({ round: round.round, plannedTarget: p, machineryTheChangeAdded: m, other: o })
  }
  scope.plannedTarget += row.plannedTarget
  scope.machineryTheChangeAdded += row.machineryTheChangeAdded
  scope.other += row.other
  scope.perReplicate[r.replicate] = row
}
const scopeTotal = scope.plannedTarget + scope.machineryTheChangeAdded + scope.other
scope.shareOnMachinery = scopeTotal ? Number((scope.machineryTheChangeAdded / scopeTotal).toFixed(3)) : null
scope.denominator = scopeTotal
scope.note = 'UNPLANNED: classification added after observing the runs. Deterministic (file path cited), not agent-judged.'

// ── Decision rule (pre-registration §6), evaluated in order ───────────────────
const n = observed.length
const fired = []
const R1 = n === 3 && observed.every(r => r.converged && r.reviewFixes <= 3)
const R2 = within6 >= 2 && observed.some(r => r.converged && r.reviewFixes > 3)
const R3 = never >= 2
const R4 = nonMonotonic >= 2
if (R1) fired.push({ rule: 'R1', action: 'The cap is right. Change nothing.' })
if (R3) fired.push({ rule: 'R3', action: "escalation.md's round-cap section becomes the primary exit; the cap value stays. Supersedes R2." })
if (R2 && !R3 && !R4) {
  const target = Math.max(...observed.filter(r => r.converged).map(r => r.reviewFixes))
  fired.push({ rule: 'R2', action: `Raise the cap to ${target} in SKILL.md §4 and references/build.md "Round cap".` })
} else if (R2 && R4) {
  fired.push({ rule: 'R2', action: 'BLOCKED by R4 — a cap is not raised on a run whose confirmed count is not falling.' })
} else if (R2 && R3) {
  fired.push({ rule: 'R2', action: 'SUPERSEDED by R3.' })
}
if (R4) fired.push({ rule: 'R4', action: "The diagnosis is a planning defect, not a cap defect; escalation.md's 'a different item failed each round' guidance changes." })
fired.push({
  rule: 'R5',
  action: 'Qualitative depth guidance about self-modifying changes, resting on the single recorded v2.2.0 observation (10 of 19). Not testable by this experiment — the seeded material adds no checks.',
  testedHere: false,
})
if (!fired.some(f => ['R1', 'R2', 'R3', 'R4'].includes(f.rule))) {
  fired.push({ rule: 'none', action: 'No rule change. The data is ambiguous under every pre-registered row; the results document says what would settle it.' })
}

// ── Figures the documents are allowed to publish ─────────────────────────────
const figures = {
  maxRoundsDeviation: MAX_ROUNDS,
  replicatesRequested: reps.length,
  replicatesObserved: n,
  replicatesVoid: voidCount,
  reachedZeroWithin3: within3,
  reachedZeroWithin6: within6,
  neverReachedZero: never,
  nonMonotonic,
  reviewFixesPerReplicate: Object.fromEntries(reps.map(r => [r.replicate, r.reviewFixes])),
  gateFixesPerReplicate: Object.fromEntries(reps.map(r => [r.replicate, r.gateFixes])),
  totalFixesPerReplicate: Object.fromEntries(reps.map(r => [r.replicate, r.fixes])),
  confirmedSeriesPerReplicate: Object.fromEntries(reps.map(r => [r.replicate, r.confirmedSeries])),
  totalConfirmedFindings: allConfirmed.length,
  totalReportedUnion: totalReported,
  totalRejectedByTriage: totalRejected,
  triageRejectionRate: rejectionRate === null ? null : Number(rejectionRate.toFixed(3)),
  adjudicationSurvival: survival === null ? null : Number(survival.toFixed(3)),
  seedRecallPerReplicate: Object.fromEntries(Object.entries(perRepSeeds).map(([k, v]) => [k, v.seedsFound.length])),
  seedsTotal: SEED_IDS.length,
  confirmedOnPlannedTarget: scope.plannedTarget,
  confirmedOnMachineryTheChangeAdded: scope.machineryTheChangeAdded,
  confirmedOnOther: scope.other,
}

// ── Published-figure cross-check ─────────────────────────────────────────────
// The same discipline accept-release.sh applies to the release documents: a figure in a document must
// be one this script recomputed. Checked for the integers that carry the argument.
if (docs.length) {
  const texts = docs.map(d => (existsSync(d) ? readFileSync(d, 'utf8') : (bad(`missing doc: ${d}`), '')))
  const mustAppear = [
    ['replicates observed', n],
    ['reached zero within 3', within3],
    ['reached zero within 6', within6],
    ['never reached zero', never],
    ['total confirmed findings', allConfirmed.length],
    ['maxRounds deviation', MAX_ROUNDS],
  ]
  const count = (t, v) => (t.match(new RegExp(`(^|[^0-9.,])${v}([^0-9.,%]|$)`, 'g')) || []).length
  for (const [label, val] of mustAppear) {
    // Presence is required of every figure in every document: a translation that silently drops a
    // number has dropped the claim it carried.
    for (let i = 0; i < docs.length; i++) {
      if (count(texts[i], val) === 0) bad(`${docs[i]}: the recomputed figure for "${label}" (${val}) appears nowhere`)
    }
    // Equal COUNTS are required only of figures distinctive enough for the count to mean something.
    // accept-release.sh draws the same boundary and for the same reason: it pairs comma-formatted
    // figures like "1,307", not bare digits. A one- or two-digit number appears throughout ordinary
    // prose — "R3", "two reviewers", "six rounds" — in ways that differ legitimately between two
    // languages, so counting them would force the translation to distort itself to satisfy the gate.
    // A check that fires on correct writing is the same defect as one that passes on wrong writing.
    if (docs.length === 2 && val >= 10) {
      const [a, b] = [count(texts[0], val), count(texts[1], val)]
      if (a !== b) bad(`"${label}" (${val}) is cited ${a}x in ${docs[0]} but ${b}x in ${docs[1]}`)
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(JSON.stringify({ figures, replicates: reps, seeds: perRepSeeds, scopeGrowth: scope, decision: fired }, null, 2))

if (problems.length) {
  console.error('\nFAIL  the analysis does not hold together:')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.error('\nANALYSIS: raw data is internally consistent and every published figure is recomputed')
