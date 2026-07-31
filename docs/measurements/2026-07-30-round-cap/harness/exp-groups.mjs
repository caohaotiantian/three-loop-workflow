#!/usr/bin/env node
// Build the adjudication input from the extracted per-round series.
//
// Findings are grouped by the diff they were raised against, because a claim made in round 2 and
// repaired in round 3 is not refuted by the round-3 tree — judging it against the final state would
// score every successful fix as a phantom. Each group therefore carries its own `head`, which is the
// commit that round's reviewers actually saw.
//
// What the adjudicator receives is the finding TEXT and a diff. What it does not receive: which
// replicate, which round, which reviewer, or whether phase.js's triage confirmed it. The opaque `id`
// is carried through so the verdicts can be joined back afterwards, and it is deliberately not
// human-readable in a way that reveals provenance — it is echoed, not read.
//
// Usage: exp-groups.mjs <series.json> <repo-dir> <base-sha> [--all|--confirmed]
//   --confirmed (default) adjudicates what triage confirmed — the findings that actually drove
//                         termination, which is the population the pre-registration names.
//   --all                 adjudicates every reported finding, confirmed or not.

import { readFileSync } from 'node:fs'

const [seriesPath, repoDir, base, mode = '--confirmed'] = process.argv.slice(2)
if (!seriesPath || !repoDir || !base) {
  console.error('usage: exp-groups.mjs <series.json> <repo-dir> <base-sha> [--all|--confirmed]')
  process.exit(2)
}

const series = JSON.parse(readFileSync(seriesPath, 'utf8'))
const groups = []
const problems = []
// Short opaque handles, and an explicit map back to the canonical id.
//
// The first version of this script used the canonical id — `<replicate>::<round>::<the whole finding
// text>` — as the handle the adjudicator had to echo. Findings here run to well over a thousand
// characters, so that asked an agent to reproduce a paragraph verbatim as a key, and most did not:
// 51 of 67 findings came back unjoinable and the analysis correctly refused to compute a survival
// rate from them. A handle an agent has to copy must be short enough to copy. `idmap` keeps the join
// exact without putting provenance in front of the adjudicator, which is what "opaque" was for.
const idmap = {}
let seq = 0

for (const [rep, s] of Object.entries(series.series || {})) {
  for (const round of s.rounds) {
    const texts = mode === '--all' ? (round.reported || []) : (round.confirmed || [])
    if (!texts.length) continue
    if (!round.head_sha) {
      problems.push(`${rep} round ${round.round}: ${texts.length} finding(s) but no head sha — cannot pin the diff they were raised against`)
      continue
    }
    groups.push({
      key: `${rep}-r${round.round}`,
      dir: repoDir,
      base,
      head: round.head_sha,
      findings: texts.map(t => {
        const handle = `F${String(++seq).padStart(3, '0')}`
        idmap[handle] = `${rep}::${round.round}::${t}`
        return { id: handle, text: t }
      }),
    })
  }
}

if (problems.length) {
  console.error('FAIL  cannot build adjudication groups:')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

const total = groups.reduce((a, g) => a + g.findings.length, 0)
console.error(`groups: ${groups.length}, findings: ${total}, mode: ${mode}`)
console.log(JSON.stringify({ groups, idmap }, null, 2))
