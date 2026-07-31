export const meta = {
  name: 'exp-review',
  description: 'k independent reviewers on one fixed diff, per-reviewer findings kept unmerged',
  phases: [
    { title: 'Reviewers' },
  ],
}

// The second question (pre-registration §7): does a third independent reviewer add materially less
// than the second?
//
// `phase.js` cannot measure it. Line 367 unions findings into a `Set` of strings, destroying
// per-reviewer attribution, and the returned object never exposes raw per-reviewer output. So this
// script exists to keep what phase.js throws away — and to keep nothing else. It runs ONE round on ONE
// fixed diff, dispatches k reviewers in parallel, and returns `{round, reviewer_index, findings}`
// untouched: **no dedupe, no union, no scoring**. Every comparison happens later, in the analysis.
//
// The review prompt below is phase.js's, verbatim. If it drifts, the arm is measuring a different
// instrument than the one the question is about, so it is built from the same pieces in the same order
// rather than paraphrased.
//
// What makes this arm stronger than the E2 measurement it follows up: the defects are SEEDED, so there
// is ground truth. E2 had to treat the union of what reviewers found as the population of real defects,
// which cannot distinguish "reviewer 3 found nothing new" from "there was nothing left to find".

const cfg = (typeof args === 'string') ? JSON.parse(args) : (args || {})
if (!cfg.base || !cfg.branch || !cfg.planPath) {
  return { status: 'usage-error', reason: 'base, branch and planPath are required' }
}
const k = cfg.reviewers
if (!Number.isInteger(k) || k < 1) return { status: 'usage-error', reason: 'reviewers must be a positive integer' }
const trials = Number.isInteger(cfg.trials) ? cfg.trials : 1

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['blocking', 'nonblocking', 'blocking_count', 'nonblocking_count'],
  properties: {
    blocking: { type: 'array', items: { type: 'string' } },
    nonblocking: { type: 'array', items: { type: 'string' } },
    blocking_count: { type: 'integer' },
    nonblocking_count: { type: 'integer' },
  },
}

// phase.js:333-344, reproduced exactly.
const reviewPrompt =
  `Review the diff at \`git diff ${cfg.base}..${cfg.branch}\` against the plan at ${cfg.planPath}. ` +
  `Your FIRST tool call must be that git diff — review the diff itself, not any summary of it.\n\n` +
  `Report everything you find, at any severity; the caller triages. Cite file:line from the diff for ` +
  `each finding. Mark a finding blocking only if it is wrong behavior, a broken contract, or work ` +
  `outside the plan's Goal.\n\n` +
  `Check specifically:\n` +
  `- Does every changed line trace to the Goal or a recorded Decision?\n` +
  `- Does anything land in the plan's Non-goals?\n` +
  `- Does new behavior have a test, and does \`git log ${cfg.base}..${cfg.branch}\` show it failing first?\n` +
  `- Any comment narrating process rather than explaining code?\n` +
  `\nDo not modify code.`

phase('Reviewers')

const out = []
for (let t = 1; t <= trials; t++) {
  // Reviewers within a trial run in parallel and independently, exactly as phase.js dispatches them.
  // They never see each other's output; that independence is the whole quantity under measurement.
  const verdicts = await parallel(Array.from({ length: k }, (_, i) => () =>
    agent(reviewPrompt, {
      label: `q2:t${t}:v${i + 1}`,
      phase: 'Reviewers',
      schema: REVIEW_SCHEMA,
      model: cfg.model,
    }).then(r => ({ trial: t, reviewer_index: i + 1, verdict: r }))
  ))

  for (const v of verdicts.filter(Boolean)) {
    out.push({
      trial: v.trial,
      round: 1,
      reviewer_index: v.reviewer_index,
      // Kept whole and unmerged. A reviewer that returned nothing is recorded as returning nothing,
      // which is a different fact from a reviewer that found nothing.
      findings: v.verdict ? (v.verdict.blocking || []) : null,
      nonblocking: v.verdict ? (v.verdict.nonblocking || []) : null,
      returned: Boolean(v.verdict),
    })
  }
}

return {
  base: cfg.base,
  branch: cfg.branch,
  reviewers: k,
  trials,
  observations: out,
  note: 'raw per-reviewer findings, no dedupe and no union — all matching and scoring happen in the analysis',
}
