#!/usr/bin/env node
// Join adjudication output back onto canonical finding ids.
//
// Adjudicators are handed short opaque handles (`F001`…) rather than the canonical
// `<replicate>::<round>::<text>` id, because a handle an agent has to echo must be short enough to
// echo — the first run asked for the full finding text as a key and 51 of 67 came back unjoinable.
// This turns the handles back into canonical ids using the map `exp-groups.mjs` emitted alongside
// them.
//
// It FAILS if any handle is unknown or any finding is unaccounted for. A silently dropped verdict
// would shrink the denominator of the survival rate, which is the one number here whose whole purpose
// is to be unflattering.
//
// Usage: exp-join.mjs <groups.json> <adjudication-raw.json> <out-adjudication.json> <out-seed-match.json>

import { readFileSync, writeFileSync } from 'node:fs'

const [groupsPath, rawPath, outAdj, outMatch] = process.argv.slice(2)
if (!groupsPath || !rawPath || !outAdj || !outMatch) {
  console.error('usage: exp-join.mjs <groups.json> <adjudication-raw.json> <out-adjudication.json> <out-seed-match.json>')
  process.exit(2)
}

const { idmap } = JSON.parse(readFileSync(groupsPath, 'utf8'))
const raw = JSON.parse(readFileSync(rawPath, 'utf8'))
const problems = []

const canon = h => {
  if (!Object.prototype.hasOwnProperty.call(idmap, h)) { problems.push(`unknown handle: ${JSON.stringify(h)}`); return null }
  return idmap[h]
}

const verdicts = []
for (const v of raw.verdicts || []) {
  const id = canon(v.finding_id)
  if (id) verdicts.push({ ...v, finding_id: id, handle: v.finding_id })
}
const matches = []
for (const m of raw.matches || []) {
  const id = canon(m.finding_id)
  if (id) matches.push({ ...m, finding_id: id, handle: m.finding_id })
}

const expected = Object.keys(idmap).length
if (verdicts.length !== expected) problems.push(`${verdicts.length} adjudicated of ${expected} findings — the survival denominator would be wrong`)
if (matches.length !== expected) problems.push(`${matches.length} matched of ${expected} findings`)
for (const inc of raw.incomplete || []) problems.push(`incomplete: ${inc.finding_id} — ${inc.reason}`)

if (problems.length) {
  console.error('FAIL  the adjudication cannot be joined:')
  for (const p of problems.slice(0, 12)) console.error(`  ${p}`)
  if (problems.length > 12) console.error(`  ...and ${problems.length - 12} more`)
  process.exit(1)
}

writeFileSync(outAdj, JSON.stringify({ verdicts }, null, 1))
writeFileSync(outMatch, JSON.stringify({ matches }, null, 1))
const up = verdicts.filter(v => v.upheld).length
console.error(`joined ${verdicts.length} verdict(s): ${up} upheld, ${verdicts.length - up} refuted`)
