#!/usr/bin/env node
// Q2: does a third independent reviewer add materially less than the second?
//
// The E2 measurement this follows up had no ground truth. It treated the union of what the reviewers
// found as the population of real defects, which makes "reviewer 3 added 14% of the union" a statement
// partly about reviewer 3 and partly about how the denominator was built — and re-analysis of that
// data disagreed with itself for exactly that reason, which is why the coverage claim was retired.
//
// Here the defects are SEEDED, so the denominator is fixed before any reviewer runs: six known
// defects. Coverage is the fraction of those six a set of reviewers found between them. That
// distinguishes "reviewer 3 found nothing new" from "there was nothing left to find" — which is the
// distinction the retired claim could not make.
//
// Coverage is averaged over EVERY ordering of the reviewers, not one arbitrary "reviewer 1". With k=3
// that is 6 orderings per trial. Picking an order and calling the first one "reviewer 1" is the
// artefact the E2 validation had to correct for afterwards; doing it up front costs nothing.
//
// Usage: exp-q2-analyse.mjs <observations.json> <seed-match.json>

import { readFileSync } from 'node:fs'

const [obsPath, matchPath] = process.argv.slice(2)
if (!obsPath || !matchPath) {
  console.error('usage: exp-q2-analyse.mjs <observations.json> <seed-match.json>')
  process.exit(2)
}

const problems = []
const notes = []
const obs = JSON.parse(readFileSync(obsPath, 'utf8'))
const matchFile = JSON.parse(readFileSync(matchPath, 'utf8'))
const matched = new Map((matchFile.matches || []).map(m => [m.finding_id, m.matched]))

const SEEDS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
const CORRECT = ['C1', 'C2', 'C3']

// permutations of [0..k-1]
function perms(a) {
  if (a.length <= 1) return [a]
  const out = []
  for (let i = 0; i < a.length; i++) {
    const rest = [...a.slice(0, i), ...a.slice(i + 1)]
    for (const p of perms(rest)) out.push([a[i], ...p])
  }
  return out
}

const trials = new Map()
for (const o of obs.observations || []) {
  if (!trials.has(o.trial)) trials.set(o.trial, [])
  // A reviewer that did not return is recorded, not treated as a reviewer that found nothing. Its
  // trial is excluded from the curve below; that is a gap in the sample, not an inconsistency in it.
  if (!o.returned) { notes.push(`trial ${o.trial} reviewer ${o.reviewer_index} did not return`); continue }
  const seeds = new Set()
  const phantoms = new Set()
  for (let i = 0; i < (o.findings || []).length; i++) {
    const id = `q2::t${o.trial}::v${o.reviewer_index}::${i}`
    const m = matched.get(id)
    if (SEEDS.includes(m)) seeds.add(m)
    if (CORRECT.includes(m)) phantoms.add(m)
  }
  trials.get(o.trial).push({
    reviewer: o.reviewer_index,
    seeds,
    reported: (o.findings || []).length,
    correctEditsFlagged: phantoms.size,
  })
}

const kMax = Math.max(...[...trials.values()].map(v => v.length))
const curve = Array.from({ length: kMax }, () => [])
const perTrial = []

const incomplete = []
for (const [t, reviewers] of trials) {
  // A trial with a missing reviewer is EXCLUDED from the coverage curve and named, not quietly
  // averaged in. Coverage at k=3 needs three reviewers; computing it from two would silently answer a
  // different question — and it is the k=3 point that this arm exists to measure.
  if (reviewers.length !== kMax) {
    incomplete.push({ trial: t, returned: reviewers.length, expected: kMax })
    continue
  }
  const idx = reviewers.map((_, i) => i)
  const rows = []
  for (const order of perms(idx)) {
    const acc = new Set()
    for (let k = 0; k < order.length; k++) {
      for (const s of reviewers[order[k]].seeds) acc.add(s)
      rows[k] = (rows[k] || 0) + acc.size / SEEDS.length
    }
  }
  const nOrders = perms(idx).length
  const meanByK = rows.map(v => v / nOrders)
  meanByK.forEach((v, i) => curve[i].push(v))
  perTrial.push({
    trial: t,
    perReviewerSeeds: reviewers.map(r => ({ reviewer: r.reviewer, found: [...r.seeds].sort(), reported: r.reported, correctEditsFlagged: r.correctEditsFlagged })),
    unionSeeds: [...new Set(reviewers.flatMap(r => [...r.seeds]))].sort(),
    meanCoverageByK: meanByK.map(v => Number(v.toFixed(4))),
  })
}

const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const coverage = curve.map(c => (c.length ? Number(mean(c).toFixed(4)) : null))
const marginal = coverage.map((v, i) => (i === 0 || v === null || coverage[i - 1] === null ? null : Number((v - coverage[i - 1]).toFixed(4))))

console.log(JSON.stringify({
  seedsInDenominator: SEEDS.length,
  trialsAnalysed: perTrial.length,
  trialsIncomplete: incomplete,
  reviewersPerTrial: kMax,
  orderingsAveraged: perms(Array.from({ length: kMax }, (_, i) => i)).length,
  meanCoverageByReviewerCount: coverage,
  marginalGain: marginal,
  perTrial,
  note: 'coverage = share of the six seeded defects found, averaged over every reviewer ordering',
}, null, 2))

if (!perTrial.length) problems.push('no trial had a full reviewer set — nothing to average')
if (problems.length) {
  console.error('\nFAIL  the Q2 arm is not analysable as collected:')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
for (const n of notes) console.error(`NOTE  ${n}`)
if (incomplete.length) {
  console.error(`NOTE  ${incomplete.length} trial(s) excluded for a missing reviewer: ` +
    incomplete.map(x => `t${x.trial} (${x.returned}/${x.expected})`).join(', '))
}
// A ceiling is worth saying out loud. If one reviewer already covers everything, k=2 and k=3 cannot
// add anything, and a marginal-value figure computed here would be a fact about the material rather
// than about reviewers.
if (coverage[0] === 1) {
  console.error('NOTE  coverage is complete at k=1 — this arm is at its ceiling and cannot discriminate reviewer counts')
}
console.error(`Q2: ${perTrial.length} complete trial(s); coverage averaged over all orderings`)
