export const meta = {
  name: 'exp-round-cap',
  description: 'Drives scripts/phase.js over a pre-seeded branch to measure rounds-to-zero',
  phases: [
    { title: 'Replicates' },
  ],
}

// The measurement arm of the round-cap experiment. Pre-registration:
// docs/measurements/2026-07-30-round-cap/preregistration.md
//
// This script is a DRIVER, not an instrument. It does no counting, no scoring and no judging: it
// dispatches the real `three-loop-workflow/scripts/phase.js` against a branch that
// `scripts/exp-setup.sh` has already created, seeded and asserted, and it returns whatever phase.js
// returned, untouched. Every number in the results document is computed later, by
// `scripts/exp-analyse.mjs`, from committed raw data — never from this script's summary and never from
// an agent's.
//
// THE ONE DEVIATION FROM THE SHIPPED SETTING IS `maxRounds`. The caller passes 6 where the shipped
// default is 3, because phase.js halts at `fixes >= maxRounds` and a convergence point above 3 is
// otherwise unobservable by construction. Nothing this script produces is evidence about how the
// shipped harness behaves.
//
// Each replicate is a branch of the repository the agents are standing in, run one at a time. An
// earlier design put each replicate in a scratch clone outside the repository and it does not work:
// phase.js builds its Fix and Triage prompts from a branch name and a sha and never a path, so an
// agent whose working directory is not the repository under test has nothing to locate it with. That
// clone builder is preserved in `preregistration.bundle` and deliberately not shipped here.

const cfg = (typeof args === 'string') ? JSON.parse(args) : (args || {})

if (!cfg.phaseScript) return { status: 'usage-error', reason: 'phaseScript (absolute path to phase.js) is required' }
if (!Array.isArray(cfg.replicates) || !cfg.replicates.length) {
  return { status: 'usage-error', reason: 'replicates must be a non-empty array of branch descriptors from exp-setup.sh' }
}
const maxRounds = cfg.maxRounds
if (!Number.isInteger(maxRounds)) return { status: 'usage-error', reason: 'maxRounds must be an integer, stated explicitly — the deviation under which this data was collected is not something to default' }

phase('Replicates')

// The implementer has nothing to implement: the seeded revision is already committed, because the
// material must be byte-identical across replicates (pre-registration §3.2). phase.js still requires a
// Write step, and requires HEAD to differ from the base — which it does. This keeps the instrument
// unmodified rather than special-casing it for the experiment.
function tasksFor(r) {
  return [
    `The revision described in the plan is ALREADY COMMITTED, on branch "${r.branch}", at HEAD of this`,
    `repository. It is not your job to write it and there is nothing missing.`,
    ``,
    `Do exactly this and nothing else:`,
    `  git rev-parse HEAD`,
    ``,
    `Report that value as headSha and "${r.branch}" as branch.`,
    `Do NOT edit, add, revert, amend or commit any file.`,
    `This is a normal, complete state: set conflict=false, blocked=false and concerns=[]. "The work was`,
    `already done" is not a blocked state and must not be reported as one.`,
  ].join('\n')
}

const runs = await parallel(cfg.replicates.map((r) => async () => {
  const out = await workflow({ scriptPath: cfg.phaseScript }, {
    phaseLabel: r.branch,
    planPath: r.planPath,
    tasks: tasksFor(r),
    // The real acceptance command, verbatim as pre-registered. Every agent's working directory is the
    // repository under test — which is the whole reason the replicate runs here rather than in a
    // scratch clone: phase.js's Fix and Triage prompts carry a branch and a sha and never a path, so an
    // agent standing anywhere else has nothing to locate the tree with.
    acceptCmds: ['bash scripts/accept-release.sh'],
    baseSha: r.baseSha,
    branch: r.branch,
    depth: 'deep',
    maxRounds,
  })
  return { replicate: r.branch, dir: r.dir, baseSha: r.baseSha, seededHead: r.headSha, result: out }
}))

// A replicate that returned nothing is void, and is reported as void rather than as a censored run.
// Collapsing "the harness died" into "it never converged" is the single easiest way to manufacture the
// result this experiment exists to test.
const observed = runs.filter(Boolean)
const voided = cfg.replicates.length - observed.length

return {
  maxRounds,
  requested: cfg.replicates.length,
  voidedByDeadDriver: voided,
  runs: observed,
}
