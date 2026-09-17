export const meta = {
  name: 'three-loop-phase',
  description: 'Runs one Build phase: write -> gates -> review (diff reviewers plus the behavior check) -> triage -> fix, with round counting as code',
  phases: [
    { title: 'Write' },
    { title: 'Gates' },
    { title: 'Review' },
    { title: 'Triage' },
    { title: 'Fix' },
  ],
}

// Invoke with args:
//   { phaseLabel?, planPath, tasks, acceptCmds: [...], baseSha, depth, behaviorCheck,
//     branch?, reviewers?, repoPath?, maxRounds?,
//     models?: {write,gates,review,behavior,triage,fix} }
//
//   phaseLabel  label for this phase, used in agent labels and logs.
//   planPath    path to the task's plan — `.agent/<task>/plan.md`. No default: a shared path would
//               let two tasks overwrite each other.
//   tasks       the phase's task list, verbatim from the plan — a string, or an array of strings.
//               Required, and checked for SHAPE: an array of task objects stringifies to
//               "[object Object]", which the old truthiness test accepted and the Write agent then
//               received as its entire task list.
//   acceptCmds  an ARRAY of non-empty command strings whose exit codes decide the phase. A bare
//               string is rejected, and so is an empty entry: `[""]` is an acceptance nobody can run.
//   behaviorCheck
//               REQUIRED, and `false` is the way to say "nothing here is observable". The user-visible
//               path this phase produces, described well enough for an agent that has not read the code
//               to drive it: "start the server, POST /v1/things twice, confirm the second response
//               carries X-RateLimit-Remaining: 0 and a 429". An exit code says the author's assertions
//               hold, not that the job can be done. A fresh agent runs that path beside the reviewers;
//               what it observes that contradicts the plan becomes a finding and goes through triage
//               like any other. Asked for and not runnable returns `behavior-unverified` rather than
//               closing. Required rather than optional for the reason `depth` is: a stage that silently
//               does not run is the defect, and a result that records the omission is one reader late.
//   baseSha     `git rev-parse HEAD` captured BEFORE editing. At Deep depth this is *this phase's*
//               base, not the base of the whole change.
//   depth       'standard' (one reviewer) or 'deep' (two, in parallel, unioned). Named in the skill's
//               own vocabulary rather than as a raw count. `reviewers: 1 | 2` is still accepted for
//               callers written against the earlier contract; what is rejected is passing NEITHER,
//               because a count that defaulted to 1 let a Deep phase silently run the Standard review.
//   phaseLabel  optional, defaults to 'phase'. It labels agents and logs, and it is named to the Write
//               and Fix agents in their prompts, so it should match what the plan calls this phase.
//   models      optional per-stage model overrides.
//   branch      optional, and authoritative when given. The review diffs baseSha..branch, so whoever
//               owns the branch should say which one rather than trusting the implementer's report.
//   repoPath    absolute path to the repository under test. Optional, and only omittable when the
//               agents already start there. Every prompt carries it: without it the Triage and Fix
//               prompts are a branch name and a sha and nothing else, so an agent standing anywhere
//               else cannot find the tree — measured, and it makes a fix round impossible to complete.
//   maxRounds   fix rounds allowed. Bounds FIXES SPENT, not verifications.
//
// Why this script exists: round counting, closure arithmetic, and role isolation become code
// instead of instructions an agent can rationalize past. The main agent cannot accidentally
// grant itself a fourth round, and cannot close a phase on a reviewer's encouraging prose.
//
// Every invariant below is asserted by execution, in the three-loop-workflow repository rather than in
// this folder: scripts/sim-phase.js drives this file with stub agents, and scripts/negative-test.sh
// breaks each invariant in turn and requires the harness to notice. Neither ships with the skill —
// if you are reading this from an install, they are at github.com/caohaotiantian/three-loop-workflow.
// Change the control flow here and re-run both.

// The Workflow tool has delivered `args` as a JSON **string** on one probe and as an object on a
// later one; the shape is not something to rely on, which is why both are accepted below.
// Destructuring a string yields all-undefined, so
// before this every invocation through the tool returned `usage-error: planPath is required` however
// complete the arguments were — which is why this script had never once run end to end. The nested
// `workflow(ref, args)` form may differ; both shapes are accepted so it does not matter which you use.
function inputs(v) {
  if (v == null) return {}
  if (typeof v === 'object') return v
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return { __argsError: 'args parsed to an array; this script takes named arguments, not positional ones — pass {planPath, tasks, ...}' }
      if (parsed && typeof parsed === 'object') return parsed
      return { __argsError: `args parsed to a ${typeof parsed}, not an object` }
    } catch (e) {
      return { __argsError: `args is a string that is not JSON: ${v.slice(0, 60)}` }
    }
  }
  return { __argsError: `args is a ${typeof v}, which cannot carry named arguments` }
}
const input = inputs(args)

const {
  phaseLabel = 'phase',
  planPath,
  tasks,
  acceptCmds = [],
  baseSha,
  depth,
  reviewers: legacyReviewers,
  branch: callerBranch,
  repoPath,
  maxRounds = 3,
  models = {},
  behaviorCheck,
} = input

// A sha reported by an agent is a string it typed, not a fact. Normalise before comparing: the
// empty-diff guard is an equality test, so an abbreviated sha or stray whitespace would slip past it
// and the phase would review nothing. Reject anything that is not a full 40-hex object id.
function sha(v) {
  const t = String(v == null ? '' : v).trim().toLowerCase()
  return /^[0-9a-f]{40}$/.test(t) ? t : null
}

// Branch names are interpolated into `git diff` commands that other agents run. Accept only what git
// itself would accept as a simple ref.
function ref(v) {
  const t = String(v == null ? '' : v).trim()
  return /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(t) && !t.includes('..') ? t : null
}

// Where the repository is. Absolute only, and no command substitution or separator — `$( )`, backticks,
// `;`, `|`, `&`, redirects. It does NOT exclude glob characters, brace expansion, `~` or spaces: `/tmp/*`
// and `/tmp/a b` are both accepted and a shell expands both, which is why the prompt built from it tells
// the agent to quote the path. A guard against a malformed argument, not a security boundary —
// `acceptCmds` reaches an agent verbatim, so whoever sets these arguments already has execution.
// Optional: without it every agent works wherever it starts, which is right when that IS the repository.
function dir(v) {
  const t = String(v == null ? '' : v).trim()
  return /^\/[^\n\r`$"';|&<>]*$/.test(t) ? t.replace(/\/+$/, '') || '/' : null
}

if (input.__argsError) return { status: 'usage-error', reason: input.__argsError }
if (!planPath) return { status: 'usage-error', reason: 'planPath is required — plans live at .agent/<task>/plan.md, one directory per task, so there is no default to fall back to' }
// Every caller string below is interpolated into a prompt an agent will act on. A newline in one of
// them stops being an argument and becomes a paragraph of its own — an instruction the caller did not
// mean to give and the reader of the call cannot see. Single-line only, everywhere.
const oneLine = v => typeof v === 'string' && v.length <= 4096 && !/[\n\r]/.test(v)
if (!oneLine(planPath)) return { status: 'usage-error', reason: 'planPath must be a single-line path — a newline in it becomes a free-standing instruction in every prompt built below' }
if (!oneLine(phaseLabel)) return { status: 'usage-error', reason: 'phaseLabel must be a single-line string' }
if (!baseSha) return { status: 'usage-error', reason: 'baseSha is required and must be captured BEFORE editing' }
// Shape before presence here too, and for the same reason as `acceptCmds` below. `String(tasks)` on an
// array of task objects — the shape you get by spreading a phase straight out of a plan, which is why
// `orchestration.md`'s driver snippet names every argument instead — yields "[object Object]", which is
// truthy and non-blank. The old guard passed, the Write agent was dispatched with
// `Tasks:\n[object Object]`, and it improvised from the plan path and committed: exactly the "run that
// looks complete and implemented nothing" this message names.
function taskList(v) {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v)) {
    const items = v.map(x => (typeof x === 'string' ? x.trim() : ''))
    if (!items.length || items.some(t => !t)) return null
    return items.map(t => `- ${t}`).join('\n')
  }
  return null
}
const taskText = taskList(tasks)
if (!taskText) return { status: 'usage-error', reason: `tasks must be a non-empty string, or an array of non-empty strings (got ${Array.isArray(tasks) ? 'an array carrying something other than non-empty strings' : tasks === null ? 'null' : typeof tasks}) — a phase dispatched with an unreadable task list produces a run that looks complete and implemented nothing` }
// Shape before presence, because the presence test reads `.length` and that is the crash: a string or
// any other length-bearing value passes it and dies at the `.map` further down, once the Write agent has
// already run and committed. `null` never reached a check at all — the `= []` default only fires on
// `undefined`. The two messages stay separate: "acceptCmds is required" sends the caller looking for a
// missing argument, which is the wrong search when they passed one in the wrong shape.
// The type, not the value: JSON.stringify throws on a circular object and on a BigInt, which would put
// the crash back on the line that exists to remove it.
if (!Array.isArray(acceptCmds)) return { status: 'usage-error', reason: `acceptCmds must be an array of commands (got ${acceptCmds === null ? 'null' : typeof acceptCmds}) — pass ["npm test"], not "npm test"` }
if (!acceptCmds.length) return { status: 'usage-error', reason: 'acceptCmds is required — a phase with no runnable acceptance cannot close' }
// Element shape, for the same reason the argument's own shape is checked: `[""]` and `[null]` are arrays
// of length 1, so they satisfied "a phase with no runnable acceptance cannot close" while carrying no
// runnable acceptance at all.
if (acceptCmds.some(c => typeof c !== 'string' || !c.trim())) return { status: 'usage-error', reason: 'every entry in acceptCmds must be a non-empty command string — an empty entry is a phase closing on an acceptance nobody can run' }
if (acceptCmds.some(c => !oneLine(c))) return { status: 'usage-error', reason: 'an acceptance command must be a single line — the gates prompt lists them one per line, so a newline inside one becomes an extra instruction' }
if (!Number.isInteger(maxRounds) || maxRounds < 0) return { status: 'usage-error', reason: `maxRounds must be a non-negative integer (got ${JSON.stringify(maxRounds)})` }

// The user-visible path this phase is supposed to produce, in enough detail for someone who has not
// read the code to drive it. Optional, and it should be present whenever a person will click, type or
// call the thing being built: an exit code says the author's assertions hold, not that the job can be
// completed. Passing it makes an unrunnable check stop the phase, so pass it when you mean it.
// Required, and `false` is how you say "nothing here is observable". Omitting it is a usage-error for
// the same reason omitting `depth` is: a stage that silently does not run is the defect, and recording
// the omission in the RESULT is one reader too late — by then the phase has closed. A phase closing
// without a behavior check has asserted that nobody will click, type or call what it built; that
// assertion belongs in the call, where whoever reads the call can challenge it.
if (behaviorCheck === undefined) {
  return { status: 'usage-error', reason: 'behaviorCheck is required — pass the user-visible path for a fresh agent to drive, or `false` if this phase changes nothing a person can click, type or call. Omitted, it silently skips the one check green gates cannot cover' }
}
// `{ read: … }` is the variant build.md prescribes for something read rather than run — a reference,
// a CLI's help text, an error-message set. Same agent, same schema, same refusal to close on
// `ran: false`: a reader that could not open the files is as unverified as a driver that could not
// start the service. Without it the only expressible answer for a document change is
// `behaviorCheck: false`, which asserts nobody will read it.
const readMode = !!behaviorCheck && typeof behaviorCheck === 'object' && typeof behaviorCheck.read === 'string' && behaviorCheck.read.trim() !== ''
const behavior = behaviorCheck === false || behaviorCheck === null ? null
  : readMode ? String(behaviorCheck.read).trim()
  : String(behaviorCheck).trim()
if (behaviorCheck !== false && behaviorCheck !== null && !readMode && (typeof behaviorCheck !== 'string' || !behavior)) {
  return { status: 'usage-error', reason: 'behaviorCheck must be a non-empty string describing the path to drive — "POST /v1/things twice and confirm the second returns 429 with Retry-After", not "check it works" — or { read: "the files, in the order a new user meets them" } for something read rather than run' }
}

// `depth` is the preferred spelling because it is the skill's own vocabulary; a numeric `reviewers`
// is still accepted for callers written against the earlier contract. What is NOT accepted is omitting
// both, which is the actual defect: a count that defaulted to 1 let a Deep phase run the Standard
// review by being forgotten, silently and with nothing in the result to show it.
if (depth === undefined && legacyReviewers === undefined) {
  return { status: 'usage-error', reason: "one of depth ('standard' | 'deep') or reviewers (1 | 2) is required — with neither, a Deep phase would quietly run the Standard review" }
}
if (depth !== undefined && depth !== 'standard' && depth !== 'deep') {
  return { status: 'usage-error', reason: `depth must be 'standard' or 'deep' (got ${JSON.stringify(depth)})` }
}
if (legacyReviewers !== undefined && !Number.isInteger(legacyReviewers)) {
  return { status: 'usage-error', reason: `reviewers must be an integer (got ${JSON.stringify(legacyReviewers)})` }
}
// An explicit `reviewers` wins over what `depth` implies. That is not the defect the guard above was
// built for: the defect was an argument SILENTLY DEFAULTING to 1, so a Deep phase ran the Standard
// review with nothing in the result to show it. A caller who writes both has said what they mean, and
// the returned object reports both — which is what makes it reviewable. The case this exists for is a
// Deep change whose phases are not equally risky: the measurement behind "two" was taken on plans, and
// on a reversible phase diff the second reviewer is a choice rather than a result (`build.md`, Review).
const reviewers = legacyReviewers !== undefined ? legacyReviewers : (depth === 'deep' ? 2 : 1)
if (reviewers < 1) return { status: 'usage-error', reason: `reviewers must be at least 1 (got ${JSON.stringify(reviewers)})` }
// An upper bound because nothing else here has one: the skill's own answer is one or two, and a typo in
// the caller would otherwise dispatch that many agents per round with no warning.
if (reviewers > 4) return { status: 'usage-error', reason: `reviewers is capped at 4 (got ${reviewers}) — the measurement behind this skill stops at three, and beyond that you are paying for agents that mostly agree` }
if (maxRounds > 10) return { status: 'usage-error', reason: `maxRounds is capped at 10 (got ${maxRounds}) — the documented cap is three, and a budget this size is a plan problem rather than a fix-round problem` }
if (depth !== undefined && legacyReviewers !== undefined && legacyReviewers !== (depth === 'deep' ? 2 : 1)) {
  log(`${phaseLabel}: depth '${depth}' implies ${depth === 'deep' ? 2 : 1} reviewer(s); the explicit reviewers=${legacyReviewers} wins and is reported in the result`)
}
// Not a flip of the default: reducing verification for every existing caller is the unsafe direction,
// and SKILL.md §4's rule ("two where the phase is hard to undo, one elsewhere") is a judgement the caller
// makes, not one this script can make for them. Said at the call site so the bill is visible.
if (depth === 'deep' && legacyReviewers === undefined) {
  log(`${phaseLabel}: depth 'deep' is running ${reviewers} diff reviewers; SKILL.md §4 buys the second one where the phase is hard to undo — pass reviewers: 1 on a reversible phase`)
}
const resolvedDepth = depth !== undefined ? depth : (reviewers >= 2 ? 'deep' : 'standard')

const base = sha(baseSha)
if (!base) return { status: 'usage-error', reason: `baseSha is not a full 40-hex sha (${JSON.stringify(baseSha)}); pass the output of \`git rev-parse HEAD\`` }
if (callerBranch !== undefined && !ref(callerBranch)) {
  return { status: 'usage-error', reason: `branch is not a usable git ref (${JSON.stringify(callerBranch)})` }
}

// WHERE THE WORK IS. Every prompt below carries this when the caller gives it, and the reason is a
// failure that was measured rather than imagined: driven against a repository that was not the
// agents' working directory, a phase could not complete a fix round at all. The Write and Review
// prompts happen to name `planPath`, so an absolute plan gave those two agents something to find the
// tree with — but Triage and Fix are built from a branch name and a sha and nothing else. The fix
// agent searched the filesystem, committed nothing, and the phase died on the no-op-fix guard below,
// which fired correctly on a cause three steps upstream of it.
//
// `orchestration.md` documents driving this script from an installed skill against your own repository,
// which is exactly that case. Omitting it is still supported and still correct when the agents already
// start in the repository; passing it is what makes the documented usage work.
const repoRoot = repoPath === undefined ? null : dir(repoPath)
if (repoPath !== undefined && !repoRoot) {
  return { status: 'usage-error', reason: `repoPath must be an absolute path with no shell metacharacters (got ${JSON.stringify(repoPath)})` }
}
const where = repoRoot ? `Work in the repository at "${repoRoot}". \`cd\` there first — quote it, it may contain spaces — and every path and every git command below resolves there.\n\n` : ''
// Said once, at dispatch, so the choice is visible before anything fails rather than only after.
// Without repoPath every agent works wherever it happens to start, which is right when that is the
// repository and silently wrong when it is not — and the way it fails is three steps downstream.
const noRepoHint = repoRoot ? '' : ' No repoPath was given, so the agents worked in whatever directory they started in; if that is not this repository, that is the cause and not the symptom.'
if (!behavior) log(`${phaseLabel}: behaviorCheck false — this phase closes on gates and review alone, which asserts nothing here is user-visible`)
// The bill, where whoever reads the call can see it, since the caps above are typo-guards rather than
// the rule: SKILL.md's answer is two reviewers and three rounds, and the arithmetic runs away quietly.
const worst = 1 + (maxRounds + 1) * (1 + reviewers + (behavior ? 1 : 0) + 1) + maxRounds
if (worst > 20) log(`${phaseLabel}: this configuration can dispatch up to ${worst} agents before it returns`)
if (!repoRoot) log(`${phaseLabel}: no repoPath — agents will work in their own starting directory, which is only correct if that is the repository under test`)

const WRITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['branch', 'headSha', 'conflict', 'blocked', 'concerns'],
  properties: {
    branch: { type: 'string', description: 'The branch you committed on — report it, do not create one' },
    headSha: { type: 'string', description: 'Output of `git rev-parse HEAD` AFTER committing. The review diffs ref-to-ref, so uncommitted work is invisible to it.' },
    conflict: { type: 'boolean', description: 'True if the plan contradicts the code — do not decide, report it' },
    blocked: { type: 'boolean', description: 'True if you could not complete the task' },
    concerns: { type: 'array', items: { type: 'string' }, description: 'Parts you are least confident in' },
  },
}

const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['all_pass', 'results', 'failures', 'headSha', 'branch', 'tests', 'diffLines'],
  properties: {
    all_pass: { type: 'boolean' },
    headSha: { type: 'string', description: 'Output of `git rev-parse HEAD`, exactly 40 hex characters. Captured here because gates run immediately before review, so this is the commit the reviewer will actually see.' },
    branch: { type: 'string', description: 'Output of `git rev-parse --abbrev-ref HEAD`. Reported here every round because the review diffs against a named branch, and work committed somewhere else is invisible to it.' },
    diffLines: { type: 'integer', description: 'The number `git diff --numstat <base>..HEAD | wc -l` prints. 0 means the tree is identical to the base commit, however many commits sit between them.' },
    results: { type: 'array', items: { type: 'string' }, description: 'One line per command: the command, its exit code, and the pass/fail/skip tally' },
    failures: { type: 'array', items: { type: 'string' } },
    // Counted, not narrated. `results` already carries the tally in prose, and prose cannot be compared
    // across rounds — which is what a shrinking suite requires. See the suite-shrink check below.
    tests: {
      type: 'object',
      additionalProperties: false,
      required: ['counted', 'passed', 'failed', 'skipped'],
      properties: {
        counted: { type: 'boolean', description: 'False if no command reported a test tally at all. Set the three numbers to 0 in that case; do not estimate them.' },
        passed: { type: 'integer' },
        failed: { type: 'integer' },
        skipped: { type: 'integer', description: 'Includes skipped, xfailed, deselected and filtered-out tests.' },
      },
    },
  },
}

// Findings are confirmed by NUMBER, not by repeating the text. A triage agent asked to echo strings
// verbatim can paraphrase, merge, or add one no reviewer raised — and whatever it returns becomes the
// Fix agent's work list, and the Fix agent has write access and no schema. Indices make an invented
// finding unrepresentable rather than merely discouraged.
const TRIAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['confirmed', 'rejected'],
  properties: {
    confirmed: { type: 'array', items: { type: 'integer' }, description: 'The numbers of the claims you checked and found real. Numbers from the list given, nothing else.' },
    rejected: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'why'],
        properties: {
          item: { type: 'integer', description: 'The number of the claim you are rejecting' },
          why: { type: 'string', description: 'One line on what the code actually does' },
        },
      },
    },
  },
}

const BEHAVIOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ran', 'blockedReason', 'observed', 'mismatches'],
  properties: {
    ran: { type: 'boolean', description: 'True only if you actually executed the path and watched what it did.' },
    blockedReason: { type: 'string', description: 'Empty when ran is true. Otherwise what stopped you — a missing service, no credentials, no way to reach the surface.' },
    observed: { type: 'array', items: { type: 'string' }, description: 'What you did and what you saw, step by step. Actual output, not a summary of it.' },
    mismatches: { type: 'array', items: { type: 'string' }, description: 'Each place the observed behavior differs from what the plan says should happen.' },
  },
}

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

// A schema is a request, not a guarantee: what comes back is JSON a model typed. Every list this script
// reads goes through here first, so a missing one becomes empty and a wrong-typed entry becomes readable
// text instead of something the script indexes into. The script already hedges most of these with
// `|| []`; the two that were not hedged — `gates.failures` and `review.blocking` — both crash the run
// with a TypeError after every agent has already been paid for.
// Findings are agent-written text of unbounded length, pasted whole into the next agent's prompt. One
// runaway entry would push the instructions around it out of attention, which is the failure this
// truncation exists to prevent — not a size limit for its own sake.
const clip = t => (t.length > 1200 ? t.slice(0, 1200) + ' […truncated]' : t)

function list(v) {
  if (!Array.isArray(v)) return []
  return v.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).filter(x => x && x.trim())
}

// One retry on a dead agent, so an infrastructure failure is not counted as a review round.
let agentsDispatched = 0

async function tryAgent(prompt, opts) {
  agentsDispatched++
  const r = await agent(prompt, opts)
  if (r !== null && r !== undefined) return r
  log(`${phaseLabel}: ${opts.label} returned nothing; retrying once`)
  agentsDispatched++
  return await agent(prompt, opts)
}

// ── Write ─────────────────────────────────────────────────────
phase('Write')

const branchInstruction = callerBranch
  ? `You are already on branch "${callerBranch}". Commit there and report it as branch. Do NOT create another one: `
  : `Implement the tasks on the branch you are already on. Do NOT create a per-phase branch: `

let work = await tryAgent(
  where +
  `You are implementing ${phaseLabel}. Read the plan at ${planPath}.\n\n` +
  `Tasks:\n${taskText}\n\n` +
  branchInstruction +
  `phases are sequential commits on one branch, and branching per phase makes the next phase's review ` +
  `show this phase's work again. Where the project practises test-first — check its history and the ` +
  `existing suite rather than assuming — write the test first and watch it fail before making it pass. ` +
  `Either way, new behavior needs a test that fails without your change.\n` +
  `**Commit your work before returning**, matching the convention in \`git log --oneline -20\`, then ` +
  `report \`git rev-parse HEAD\` as headSha. Review diffs ref-to-ref: anything left uncommitted is ` +
  `invisible to it and will be reviewed as though you had changed nothing.\n` +
  `Before returning, read your own diff and remove anything that does not trace to the plan's Goal or a ` +
  `recorded Decision.\n` +
  `If the plan contradicts what you find in the code, set conflict=true and stop — do not decide it yourself.\n` +
  `Report honestly: set blocked=true if you could not finish, and list anything you are unsure about in concerns.`,
  { label: `write:${phaseLabel}`, phase: 'Write', schema: WRITE_SCHEMA, model: models.write }
)

if (!work) return { agentsDispatched, status: 'agent-error', phaseLabel, round: 0, stage: 'write' }
if (work.conflict) return { agentsDispatched, status: 'plan-conflict', phaseLabel, round: 0 }

// A blocked implementer gets exactly one re-dispatch carrying its own concerns forward.
// Bounded so it cannot become an uncounted retry loop.
if (work.blocked) {
  log(`${phaseLabel}: implementer blocked — one re-dispatch with its concerns surfaced`)
  const retry = await tryAgent(
    where +
    `You are implementing ${phaseLabel}. A previous attempt stopped, reporting:\n` +
    `${(work.concerns || []).join('; ') || 'no detail given'}\n\n` +
    `Read the plan at ${planPath} and the tasks below, resolve what blocked the previous attempt if you can, ` +
    `and implement.\n\nTasks:\n${taskText}\n\n` +
    `If you are blocked for the same reason, set blocked=true again with a specific explanation — do not guess.`,
    { label: `write:${phaseLabel}:redispatch`, phase: 'Write', schema: WRITE_SCHEMA, model: models.write }
  )
  if (!retry) return { agentsDispatched, status: 'agent-error', phaseLabel, round: 0, stage: 'write-redispatch' }
  if (retry.conflict) return { agentsDispatched, status: 'plan-conflict', phaseLabel, round: 0 }
  if (retry.blocked) {
    return {
      status: 'write-escalation',
      agentsDispatched,
      phaseLabel,
      round: 0,
      concerns: (retry.concerns && retry.concerns.length) ? retry.concerns : (work.concerns || []),
    }
  }
  work = retry
}

// The review diffs baseSha..branch. If the implementer never committed, that range is empty and the
// phase would close green having reviewed nothing — gates pass, because they run against the working
// tree, and an empty diff is indistinguishable from a clean one. Fail loudly instead.
//
// Shape is not existence, and this check does not establish existence. What the gates step's own
// `git rev-parse HEAD` adds below is that the range is not EMPTY — the reported sha is then discarded
// in favour of that real head. So a fabricated sha does not survive into the returned `headSha`, but it
// is not itself detected: if the branch has commits, a phase whose implementer reported a sha it never
// created still reviews the real diff and closes on it. Detecting the fabrication would need the sha
// resolved in the repository, which this script cannot do — it has no shell.
const writeHead = sha(work.headSha)
if (!writeHead) {
  return { agentsDispatched, status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: `headSha is not a full 40-hex sha (${JSON.stringify(work.headSha)}) — cannot confirm the work was committed` }
}
if (writeHead === base) {
  return { agentsDispatched, status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: `nothing committed on ${work.branch}: HEAD is still baseSha, so the review would see an empty diff.${noRepoHint}` }
}

const reportedBranch = ref(work.branch)
if (!reportedBranch) {
  return { agentsDispatched, status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: `the reported branch is not a usable git ref (${JSON.stringify(work.branch)})` }
}
if (callerBranch && reportedBranch !== callerBranch) {
  return { agentsDispatched, status: 'agent-error', phaseLabel, round: 0, stage: 'write', reason: `the implementer committed to "${reportedBranch}" but this phase runs on "${callerBranch}" — phases are sequential commits on one branch, and a side branch makes the next phase's review show this phase's work again` }
}
const branch = callerBranch || reportedBranch
const concerns = work.concerns || []

// ── Verify loop ───────────────────────────────────────────────
// Two counters, deliberately separate. `verifyRound` counts trips through gates+review; `fixes`
// counts fix rounds actually run, and only a fix increments it. Conflating them is how a cap of
// N silently delivers N-1 fixes: the budget check fires on the round about to be verified rather
// than on the fixes already spent. `maxRounds` bounds FIXES, matching SKILL.md and build.md.
// Verifying N+1 times to spend N fixes is correct — the last fix still has to be checked.
let verifyRound = 1
let fixes = 0
let gateFixes = 0
let reviewFixes = 0
let lastHead = writeHead
// Accumulated across rounds. A non-blocking finding reported in round 1 and not repeated at closure
// is still a real finding; recomputing the list each round silently drops it. Rejections accumulate
// for the same reason, and because build.md requires the record to survive the phase.
const nonblockingSeen = new Set()
const rejectedSeen = []
const untriaged = []
// The largest suite this phase has seen run, and the fewest tests it has seen skipped. Reaching green
// by deleting an assertion, skipping a case or filtering one out is the best-documented way an agent
// forces a fix round to close, and it is invisible to every guard above: the tree changed, HEAD moved,
// the gates exit 0. Only the tally moves, and only if something remembers the previous one.
let peakExecuted = -1
let leastSkipped = -1
let tallyEverCounted = true
// The last round's unresolved list, so the structural-bound return at the very bottom is not
// empty-handed about work that was real either way.
let lastFailures = []
// The previous round's confirmed set, as a signature. Two rounds that confirm exactly the same findings
// is a phase that has stopped converging, and escalation.md's own test for a deadlock.
let lastConfirmed = null

// Bounded by the verifications a full budget needs: maxRounds fixes plus one final check. The bound is
// deliberately structural and independent of `fixes`, so the loop terminates even if the fix counter
// stops advancing — which is precisely how v1's runner failed. The return after the loop is therefore
// a live path, not dead code: negative-test.sh reaches it by breaking the counter, and without the
// bound that mutation spins forever instead of returning.
while (verifyRound <= maxRounds + 1) {
  const round = verifyRound
  // Gates run before review, every round: an agent's opinion about code that does not compile
  // is worthless, and gate output is far cheaper than a review pass.
  //
  // This corner needs an agent only because a Workflow script cannot shell out — it has
  // agent()/parallel()/phase()/log() and nothing else. The agent is a shell proxy here, not a
  // reviewer: it runs commands and reports exit codes, and it judges nothing.
  phase('Gates')
  const gates = await tryAgent(
    where +
    `Run each of these commands in order and report its exit code and result tally. Run them; do not ` +
    `evaluate the code and do not fix anything.\n\n${acceptCmds.map(c => `- ${c}`).join('\n')}\n\n` +
    `For each: the command, its exit code, and the pass/fail/skip counts if it is a test command. ` +
    `A command that exits 0 with every test skipped is NOT a pass — report the tally so that is visible. ` +
    `Set all_pass only if every command exited 0 and none of them skipped everything.\n` +
    `Fill \`tests\` with the totals summed across every test command: how many passed, how many failed, ` +
    `and how many were skipped, xfailed, deselected or filtered out. Copy the numbers the runner printed. ` +
    `If no command reported a tally, set counted=false and leave the three at 0 rather than estimating.\n` +
    `Also run \`git rev-parse HEAD\` and report it as headSha, all 40 characters, exactly as printed, ` +
    `and \`git rev-parse --abbrev-ref HEAD\` as branch.\n` +
    `Finally run \`git diff --numstat ${base}..HEAD | wc -l\` and report the number as diffLines.`,
    { label: `gates:${phaseLabel}:r${round}`, phase: 'Gates', schema: GATE_SCHEMA, model: models.gates }
  )
  if (!gates) return { agentsDispatched, status: 'agent-error', phaseLabel, round, stage: 'gates' }

  // Fail closed. An unparseable head means the script cannot tell whether anything was committed, and
  // every guard below is an equality test against it. Treating it as "unknown, carry on" is what let a
  // no-op fix round grind to cap-exhausted against an unchanged tree.
  const gateHead = sha(gates.headSha)
  if (!gateHead) {
    return { agentsDispatched, status: 'agent-error', phaseLabel, round, fixes, stage: 'gates', branch, reason: `the gates step did not report a usable HEAD (${JSON.stringify(gates.headSha)}), so neither the empty-diff nor the no-op-fix guard can be evaluated` }
  }
  // The other half of the empty-diff guard: this is the real HEAD, not a self-report. If it is the
  // base, nothing from this phase is committed, however well-formed the implementer's claim looked.
  // Checked every round, not only before the first fix: a fix round that resets or drops the phase's
  // commits also lands HEAD back on the base, and `gateHead === lastHead` does not catch that because
  // lastHead is the previous round's non-base head. HEAD equal to the base is never legitimate here.
  if (gateHead === base) {
    return { agentsDispatched, status: 'agent-error', phaseLabel, round, fixes, stage: fixes === 0 ? 'write' : 'fix', branch, reason: `HEAD is baseSha on ${branch}: nothing from this phase is committed, so the review would see an empty diff` }
  }
  // Sha equality is not diff emptiness: a revert, or a reset plus an empty commit, moves HEAD and
  // leaves the tree identical to the base. The reviewer would get an empty range and report nothing,
  // which reads exactly like a clean review.
  // Parsed strictly, and unreadable is an error rather than a skip. `Number()` maps an omitted field
  // and a chatty one ("0 lines") to NaN, which fails the comparison below and switches the guard off
  // silently — and maps null, "", [] and false to 0, which fires it on a phase that is fine. An
  // integer or a string of digits is the only thing this can be read from; anything else fails closed,
  // as the unparseable head above does.
  const diffLines = Number.isInteger(gates.diffLines) ? gates.diffLines
    : (typeof gates.diffLines === 'string' && /^\s*\d+\s*$/.test(gates.diffLines)) ? Number(gates.diffLines)
    : null
  if (diffLines === null) {
    return { agentsDispatched, status: 'agent-error', phaseLabel, round, fixes, stage: 'gates', branch, reason: `the gates step did not report a usable diffLines (${JSON.stringify(gates.diffLines)}), so the empty-tree check cannot be evaluated` }
  }
  if (diffLines === 0) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage: fixes === 0 ? 'write' : 'fix', branch, agentsDispatched, reason: `\`git diff ${base}..HEAD\` is empty on ${branch} though HEAD has moved — the tree is identical to the base, so the review would see nothing. A fix round that reverted or reset the phase's own commits looks exactly like this.` }
  }
  // A fix round that committed nothing leaves the tree identical: the reviewer will report the same
  // findings, and the phase grinds to cap-exhausted without anyone noticing the fix never landed.
  if (fixes > 0 && gateHead === lastHead) {
    return { agentsDispatched, status: 'agent-error', phaseLabel, round, fixes, stage: 'fix', branch, reason: `the last fix round committed nothing — HEAD is unchanged, so the next review would be identical.${noRepoHint}` }
  }
  lastHead = gateHead

  // Checked every round, not only at the write step. A fix agent that strays onto another branch leaves
  // this one unchanged, so the review sees the same diff, the same findings come back, and the phase
  // grinds to cap-exhausted with nothing in the result to say why.
  const gateBranch = ref(gates.branch)
  // Fail closed, for the reason the sha above does: `&& gateBranch` silently disabled the wrong-branch
  // check on any string git would not accept, which is a guard that is off rather than one that passed.
  if (gates.branch !== undefined && !gateBranch) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage: fixes === 0 ? 'write' : 'fix', branch, agentsDispatched, reason: `the gates step reported a branch that is not a usable git ref (${JSON.stringify(gates.branch)}), so the wrong-branch check cannot be evaluated` }
  }
  if (gates.branch !== undefined && gateBranch && gateBranch !== branch) {
    return { agentsDispatched, status: 'agent-error', phaseLabel, round, fixes, stage: fixes === 0 ? 'write' : 'fix', branch, reason: `the working tree is on "${gateBranch}" but this phase runs on "${branch}" — the review diffs ${base}..${branch}, so anything committed elsewhere is invisible to it` }
  }

  // ── Did the suite shrink? ───────────────────────────────────
  // Arithmetic on the tally, by the same reasoning that makes closure arithmetic on the finding count:
  // the script already stores the previous HEAD to catch a fix round that committed nothing, and storing
  // the previous tally catches a fix round that reached green by removing a test, at no extra agent.
  //
  // Deliberately a FINDING and not an error. Deleting an obsolete test is legitimate work, and a phase
  // that hard-failed on it would be unusable. Routing it through triage is the point: if the deletion
  // was right, triage rejects the finding and it costs one paragraph; if it was a fix round buying green,
  // triage confirms it and the fix round is spent putting the test back.
  const suiteFindings = []
  let behaviorFindings = []
  let behaviorObserved = []
  // Coerced, because a model asked for an integer can return "11": `"11" + "1"` is "111", which is
  // larger than any real suite and so never trips the shrink test. The same schema-is-a-request
  // reasoning as `list()` and the `all_pass === true` identity test above.
  const num = v => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.floor(Number(v)) : null)
  const rawTally = gates.tests && gates.tests.counted === true ? gates.tests : null
  const tally = rawTally && [rawTally.passed, rawTally.failed, rawTally.skipped].every(v => num(v) !== null)
    ? { passed: num(rawTally.passed), failed: num(rawTally.failed), skipped: num(rawTally.skipped) }
    : null
  // A tally that stops being reported between rounds is indistinguishable from a suite that was
  // deleted, and it silently disables every comparison below. Say so rather than skipping it.
  if (!tally && peakExecuted >= 0) {
    suiteFindings.push(`An earlier round in this phase counted ${peakExecuted} test(s); this round reported no tally at all. A suite that stops being countable between rounds cannot be told apart from one that was deleted — name the command whose tally disappeared and say what it collects now.`)
  }
  // Never counted, on any round. The shrink test then has no baseline and can never fire, which is a
  // guard that is off rather than a guard that passed — so say it once, in the result, rather than
  // letting a silent absence read as a clean check.
  if (!tally && peakExecuted < 0) tallyEverCounted = false
  if (tally) {
    const executed = (tally.passed || 0) + (tally.failed || 0)
    const skipped = tally.skipped || 0
    const total = executed + skipped
    if (peakExecuted >= 0 && total < peakExecuted) {
      suiteFindings.push(`The test suite collected ${peakExecuted - total} fewer test(s) this round than earlier in this phase (${peakExecuted} then, ${total} now). Reaching green by deleting a test or narrowing a selector is not a fix — identify which tests disappeared from the diff and say whether removing them was the planned work or a way past a failure.`)
    }
    if (leastSkipped >= 0 && skipped > leastSkipped) {
      suiteFindings.push(`${skipped - leastSkipped} more test(s) are being skipped than earlier in this phase (${leastSkipped} then, ${skipped} now). A skip added during a fix round is a defect hidden, not fixed — name the tests and say why each is skipped.`)
    }
    peakExecuted = peakExecuted < 0 ? total : Math.max(peakExecuted, total)
    leastSkipped = leastSkipped < 0 ? skipped : Math.min(leastSkipped, skipped)
  }

  let review = null
  // Read as an identity, never for truthiness. A model asked for a boolean can return the STRING
  // "false", which is truthy — and read that way this line closes the phase on a red build, which is
  // precisely the rationalisation the script exists to make impossible. Every other reply field here is
  // shape-checked; this is the one the control flow actually branches on.
  const green = gates.all_pass === true
  // all_pass is a judgement; the tally beside it is data. Where they disagree, believe the data — the
  // same reasoning that makes closure arithmetic rather than a reviewer's verdict.
  if (green && tally && tally.failed > 0) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage: 'gates', branch, agentsDispatched, reason: `the gates step reported all_pass with ${tally.failed} failing test(s) in its own tally — a red build was about to be handed to a reviewer` }
  }
  if (green && tally && tally.passed === 0 && tally.skipped > 0) {
    return { status: 'agent-error', phaseLabel, round, fixes, stage: 'gates', branch, agentsDispatched, reason: `the gates step reported all_pass with 0 tests passed and ${tally.skipped} skipped — exit 0 with everything skipped is not a pass` }
  }
  if (green) {
    phase('Review')
    // The diff and the plan, and nothing else. Not the implementer's summary, not its list of
    // low-confidence areas, not an instruction about where to look: the value of a second reviewer is
    // that it never saw the reasoning that produced the change, and a shared attention directive
    // correlates the two readings it is there to keep independent. The concerns are returned to the
    // caller instead, where they inform the human without steering the review.
    // The directed questions are ordered by consequence, because a directed question dominates a
    // reviewer's attention and the ones at the top get the most of it. The first three ask whether the
    // code is WRONG; the last three are scope bookkeeping. The earlier set was bookkeeping only, which
    // aimed the one mechanism that catches defects at the class least likely to contain them.
    const questions =
      `Check specifically, in this order:\n` +
      `- What does this do on the inputs it does not expect — absent, empty, malformed, at the boundary, ` +
      `out of order, concurrent, or far larger than the happy path? Name the case and what happens.\n` +
      `- What happens when something this change calls FAILS — a raised exception, a non-2xx, a ` +
      `timeout, a null return? Name each error path and say what the caller observes. Flag any error ` +
      `swallowed, logged-and-continued, or returned as a success shape.\n` +
      `- Which facts about code OUTSIDE this diff does the change assume — a method that exists, a ` +
      `config key, a parameter's meaning, a return shape, an ordering guarantee? Name each and say ` +
      `whether you confirmed it in the repository or could not.\n` +
      `- If the diff touches untrusted input, authentication, authorization, secrets, file paths, ` +
      `subprocess or shell invocation, query construction, deserialization, or anything sent to a third ` +
      `party: what is the worst a hostile input can make it do? Skip this line if it touches none of them.\n` +
      `- Does the diff weaken the existing tests — an assertion removed or loosened, a case skipped or ` +
      `marked expected-to-fail, a selector narrowed, a timeout raised, a retry added? Quote the removed ` +
      `lines. Deleting a test can be correct; doing it in the same change that had to pass is the case to flag.\n` +
      `- Does new behavior have a test that would fail without this change? Name the line ` +
      `of the diff that makes it pass. A test that passes with the change reverted is testing nothing.\n` +
      `- Does every changed line trace to the Goal or a recorded Decision, and does anything land in the ` +
      `Non-goals?\n` +
      `- Does the PLAN look wrong — an Accept that cannot fail, a Goal that does not match what was ` +
      `asked, a Decision with one option? A diff that conforms to a wrong plan passes every ` +
      `other question here.\n` +
      `\nIf the diff contains generated or non-text artefacts — notebooks, lockfiles, snapshots, ` +
      `minified output — say so and read the source form instead (a notebook's cells, the manifest the ` +
      `lockfile was generated from). A diff you cannot read is not a diff you reviewed.\n`

    const reviewPrompt =
      where +
      `Review the diff at \`git diff ${base}..${branch}\` against the plan at ${planPath}. ` +
      `Your FIRST tool call must be that git diff — review the diff itself, not any summary of it.\n\n` +
      `Report everything you find, at any severity; the caller triages. Cite file:line from the diff for ` +
      `each finding. Mark a finding blocking only if it is wrong behavior, a broken contract, or work ` +
      `outside the plan's Goal.\n\n` +
      questions +
      `\nDo not modify code.`

    // Reviewers run independently and in parallel, and their findings are UNIONed.
    // Measured on the design docs of the project that produced this skill, every finding re-checked
    // adversarially: a second
    // reviewer finds much of what the first missed, and the three overlap little. Low overlap is the
    // reason a second reviewer pays; it is also why the union must never be filtered down to
    // what they agree on — agreement would discard most of the real findings.
    //
    // That measurement used byte-identical prompts, so the low overlap it recorded came from sampling
    // noise alone. The closing line below adds a second, structural source of it: both reviewers still
    // answer every question above, so nothing the measurement relied on is given up, but each is sent in
    // with a different first instinct about where to look hardest. Decorrelation is what a second reader
    // is bought for, and two different closing sentences cost exactly what two identical ones cost.
    // Reviewer 2's extra read is the REPOSITORY, not the author: the isolation rule bars the
    // implementer's summary and its session, not the code's own history. It buys a class a diff cannot
    // show — an approach that was already tried here and reverted.
    const emphasis = [
      `\nRead as an adversary hunting a case that breaks it: assume the change is wrong somewhere and find where.`,
      `\nAfter that diff, run \`git log -p -20\` on the paths it touches and read how the code got here. ` +
      `Then read as the person who maintains it next year: assume the change works today, and find what it will cost.`,
    ]
    // The behavior check runs beside the reviewers, not after them: it reads the running product where
    // they read the diff, so it costs no wall-clock and it catches the class no diff review can. Green
    // gates say the code the author wrote does what the author's tests assert. Only driving the path
    // says the user can complete the job.
    // Tagged, not positional. `parallel()` is documented to return results for the thunks it was given;
    // nothing in its contract promises the order survives, and telling a reviewer's verdict from a
    // behavior observation by array index would fail silently and in the worst possible way if it did not.
    // Reviewers 3 and 4 were byte-identical copies of 1 and 2, which is the correlation the closing
    // lines exist to break. Give them a third starting point rather than a second copy of one.
    const closing = i => reviewers < 2 ? '' : i < emphasis.length ? emphasis[i]
      : `\nYou are reviewer ${i + 1} of ${reviewers}; where the others start from the diff, start from ` +
        `the file the diff touches most and read it whole.`
    const jobs = Array.from({ length: reviewers }, (_, i) => () =>
      tryAgent(reviewPrompt + closing(i), {
        label: reviewers > 1 ? `review:${phaseLabel}:r${round}:v${i + 1}` : `review:${phaseLabel}:r${round}`,
        phase: 'Review',
        schema: REVIEW_SCHEMA,
        model: models.review,
      }).then(r => ({ kind: 'review', r }))
    )
    if (behavior) {
      jobs.push(() => tryAgent(
        where +
        (readMode
          ? `Read these finished files the way a new user meets them — no diff, no account of what ` +
            `changed:\n${behavior}\n\n` +
            `The plan at ${planPath} states what should happen; read its Goal and Accept.\n` +
            `You are not reviewing an edit. Answer: can every step described here actually be performed ` +
            `as written? Do any two sections now contradict each other? Is anything named that does not ` +
            `exist, or does anything exist that is never named? Quote the text and say what it made you ` +
            `expect.\n` +
            `Record what you read and what it told you, verbatim, not a summary.\n` +
            `List every place what you read differs from what the plan says should happen.\n` +
            `If you genuinely cannot read them, set ran=false and say exactly what stopped you.\n`
          : `Drive this change the way a user meets it and report what you observe. Do not read the diff, ` +
            `and do not read the implementer's account of the work — you are here to find out what the ` +
            `software actually does.\n\n` +
            `The path to exercise:\n${behavior}\n\n` +
            `The plan at ${planPath} states what should happen; read its Goal and Accept. Then run the path ` +
            `for real — start the service, call the endpoint, run the command, load the page. Record the ` +
            `actual output, not a summary of it.\n` +
            `Try the edges as well as the happy path: the empty case, the error case, the unauthorized case, ` +
            `and whatever a user would plausibly do wrong.\n` +
            `List every place what you saw differs from what the plan says should happen. If the plan is ` +
            `silent on something you observed and it looks wrong, say so — silence is not permission.\n` +
            `If you genuinely cannot run it, set ran=false and say exactly what stopped you. Do not report ` +
            `an inspection of the source as though it were a run.\n`) +
        `Do not modify code.`,
        { label: `behavior:${phaseLabel}:r${round}`, phase: 'Review', schema: BEHAVIOR_SCHEMA, model: models.behavior }
      ).then(r => ({ kind: 'behavior', r })))
    }
    const results = (await parallel(jobs)).filter(x => x && x.r)
    const verdicts = results.filter(x => x.kind === 'review').map(x => x.r)
    const observation = results.filter(x => x.kind === 'behavior').map(x => x.r)[0] || null

    // A reviewer that dies is not a reviewer that passed.
    if (verdicts.length < reviewers) {
      return { agentsDispatched, status: 'agent-error', phaseLabel, round, stage: 'review', reason: `${verdicts.length}/${reviewers} reviewers returned` }
    }

    // A behavior check that was asked for and did not happen is not a behavior check that passed. This
    // stops the phase rather than recording a note, because the note is exactly what gets skimmed past:
    // the caller passed `behaviorCheck` to say the acceptance is not fully expressible as an exit code,
    // and closing green without it would put back the gap the argument exists to close.
    if (behavior) {
      if (!observation) return { agentsDispatched, status: 'agent-error', phaseLabel, round, stage: 'behavior', reason: 'the behavior check did not return' }
      if (!observation.ran) {
        // The reviewers ran, and their findings are the expensive part of this round. Returning without
        // them would make the caller pay for the round twice.
        return {
          status: 'behavior-unverified',
          agentsDispatched,
          phaseLabel, round, fixes, gateFixes, reviewFixes, branch, depth: resolvedDepth, reviewers,
          headSha: gateHead,
          reason: `the behavior check could not be run: ${observation.blockedReason || 'no reason given'}`,
          gates: list(gates.results),
          reviewFindings: [...new Set(verdicts.flatMap(v => list(v.blocking)))],
          nonblocking: [...new Set([...nonblockingSeen, ...verdicts.flatMap(v => list(v.nonblocking))])],
          rejected: rejectedSeen,
          concerns,
        }
      }
      behaviorObserved = list(observation.observed)
      behaviorFindings = list(observation.mismatches).map(m => `Observed behavior does not match the plan: ${m}`)
    }

    const reported = [...new Set([
      ...suiteFindings,
      ...verdicts.flatMap(v => list(v.blocking)),
      ...behaviorFindings,
    ])]
    verdicts.flatMap(v => list(v.nonblocking)).forEach(n => nonblockingSeen.add(n))

    // Triage before counting. Measured on that project's own review output, blind adversarial
    // checking rejected a large share of blocking-graded findings. Closing on the RAW count lets a
    // phantom defect consume a fix round and exhaust the cap on already-correct code, so the
    // arithmetic below runs on confirmed findings only.
    let blocking = reported
    if (reported.length) {
      phase('Triage')
      const triage = await tryAgent(
        where +
        `Check each claimed defect below against the actual code in \`git diff ${base}..${branch}\`. ` +
        `Decide which are real.\n\n${reported.map((f, i) => `${i + 1}. ${clip(f)}`).join('\n')}\n\n` +
        (rejectedSeen.length
          ? `An earlier round checked these claims and rejected them, with the reason given. A claim ` +
            `that reappears is EITHER the same phantom OR a real defect the earlier rejection got ` +
            `wrong — the two look identical from here, so re-check it against the code rather than ` +
            `inheriting the verdict, and say which it is:\n${rejectedSeen.map(x => `- ${x}`).join('\n')}\n\n`
          : '') +
        `Reject a claim when it misreads the code, attacks something the code does not do, describes a ` +
        `real property that is not a problem, or dissolves once you read the surrounding lines. ` +
        `Confirm one only after you have looked at the cited code and the defect is really there. ` +
        `When torn, look again rather than confirming defensively.\n` +
        `First: if a claim names something the plan lists as a Non-goal, or something this diff did ` +
        `not create, REJECT it and say which Non-goal — true is not the same as this change's problem.\n` +
        `Otherwise score it: 0 false · 25 unverifiable against the code · 50 real but a nitpick or too ` +
        `rare to matter here · 75 verified and likely to be hit · 100 confirmed and it will happen. ` +
        `Confirm 75 and above; reject below it, and let the reason say what the code actually does ` +
        `rather than implying the claim was false.\n` +
        `Rule on every claim: put its NUMBER in confirmed or in rejected. Do not restate the claims, ` +
        `do not merge two into one, and do not add a claim of your own — anything you confirm becomes ` +
        `an instruction to an agent with write access, so the list has to be theirs and not yours.\n` +
        `Do not modify code.`,
        { label: `triage:${phaseLabel}:r${round}`, phase: 'Triage', schema: TRIAGE_SCHEMA, model: models.triage }
      )
      if (!triage) return { agentsDispatched, status: 'agent-error', phaseLabel, round, stage: 'triage' }

      // Confirmation is a selection from the list, not a list the triage agent writes. The previous
      // contract asked for the strings back "verbatim, as given" and then used whatever came back: an
      // agent that paraphrased, merged two findings, or added one no reviewer raised set the Fix
      // agent's work list to it. Indices make that unrepresentable rather than merely discouraged, and
      // the arithmetic below is the whole reason this script exists.
      const inRange = n => Number.isInteger(n) && n >= 1 && n <= reported.length
      const confirmedIdx = new Set((triage.confirmed || []).filter(inRange))
      const rejectedIdx = (triage.rejected || []).filter(r => r && inRange(r.item) && !confirmedIdx.has(r.item))
      const ruled = new Set([...confirmedIdx, ...rejectedIdx.map(r => r.item)])
      // Ruling on NOTHING and ruling on SOME are both stops, and they are deliberately different ones.
      // Nothing at all is an agent that did not do its job — retry it. A partial ruling below is a real
      // result that is merely incomplete, and the caller needs the part that was ruled on.
      if (!ruled.size) {
        return { agentsDispatched, status: 'agent-error', phaseLabel, round, fixes, stage: 'triage', branch, reason: `triage ruled on none of the ${reported.length} finding(s) — nothing confirmed and nothing rejected is an agent that did not run, not a review that came back clean` }
      }
      blocking = reported.filter((_, i) => confirmedIdx.has(i + 1))
      rejectedIdx.forEach(r => {
        const line = `${reported[r.item - 1]} — rejected: ${r.why}`
        if (!rejectedSeen.includes(line)) rejectedSeen.push(line)
      })
      // Neither confirmed nor rejected. Not counted as blocking — confirming by default is how a phantom
      // spends a fix round — but not dropped either: a phase that closed on findings nobody looked at
      // would be a false green produced by the one step whose job is to prevent them.
      const unruled = reported.filter((_, i) => !ruled.has(i + 1))
      unruled.forEach(f => { if (!untriaged.includes(f)) untriaged.push(f) })
      if (unruled.length) {
        return {
          status: 'triage-incomplete',
          agentsDispatched,
          phaseLabel, round, fixes, gateFixes, reviewFixes, branch, depth: resolvedDepth, reviewers,
          headSha: gateHead,
          reason: `triage ruled on ${ruled.size} of ${reported.length} findings; the rest are neither confirmed nor rejected, so the phase cannot close and cannot honestly spend a fix round on them`,
          untriaged: unruled,
          blocking,
          rejected: rejectedSeen,
          nonblocking: [...nonblockingSeen],
          gates: list(gates.results),
          concerns,
        }
      }
      if (rejectedIdx.length) log(`${phaseLabel}: triage rejected ${rejectedIdx.length}/${reported.length} blocking findings`)
      if (ruled.size < reported.length) log(`${phaseLabel}: triage did not rule on ${reported.length - ruled.size}/${reported.length} findings — treated as unconfirmed and returned as untriaged`)
      phase('Review')
    }

    review = { blocking, blocking_count: blocking.length, reported_count: reported.length }

    // Closure is arithmetic on the counts. The reviewer's prose verdict is deliberately not read:
    // "looks good overall" alongside a listed blocking item is not a pass.
    if (review.blocking_count === 0) {
      return {
        status: 'closed',
        phaseLabel,
        round,
        fixes,
        gateFixes,
        reviewFixes,
        branch,
        depth: resolvedDepth,
        reviewers,
        // Pass this back in as the NEXT phase's baseSha. Without it a multi-phase run reviews every
        // earlier phase again, and phase N's reviewer flags phases 1..N-1 as work outside the Goal.
        headSha: gateHead,
        gates: list(gates.results),
        nonblocking: [...nonblockingSeen],
        // The rejection record build.md asks for, carried out of the phase rather than left in a log
        // line: it is what stops the same phantom coming back, and what a reader needs to see whether
        // triage was doing its job or waving findings through.
        rejected: rejectedSeen,
        untriaged,
        // The only cost this script can honestly report. Tokens and dollars are not observable from
        // inside a Workflow script, so a budget stated in those units would be a rule with no mechanism.
        agentsDispatched,
        // What the behavior check saw, when one was asked for. The phase cannot close without it
        // having run, so this is a record of the observation the closure rests on, not a note.
        behavior: behavior ? { ran: true, observed: behaviorObserved } : { ran: false, reason: 'behaviorCheck was false: this phase closed on gates and review alone' },
        tests: tallyEverCounted ? gates.tests : { counted: false, note: 'no round of this phase reported a test tally, so the suite-shrink check never had a baseline and never ran' },
        concerns,
      }
    }
  }

  const failures = green ? review.blocking : list(gates.failures)
  lastFailures = failures
  const stage = green ? 'review' : 'gates'

  // A gate run that fails without naming what failed cannot be fixed: the Fix agent would get an
  // empty list, edit something arbitrary, and spend a round on a null instruction.
  if (!failures.length) {
    return { agentsDispatched, status: 'agent-error', phaseLabel, round, fixes, stage, branch, reason: `${stage} reported failure with nothing listed` }
  }

  // Two rounds that confirm exactly the same findings is a phase that has stopped converging. Spending
  // the rest of the budget buys nothing the escalation does not already have — escalation.md's own test.
  //
  // The review path only. On a red build `failures` is the GATE failure list, whose entries are
  // command-level strings — "npm test: 1 failed" is byte-identical whether three tests fail or one, so
  // a phase converging through its build errors looked like a deadlock and lost the rest of its budget.
  // A gate failure that really is stuck still hits the cap one round later; a review finding that comes
  // back word for word is the case this stop was measured on.
  //
  // Behind the cap, not in front of it. On the last round both are true and they say opposite things:
  // this one reports "remaining 0 round(s)" and carries no exhaustedBy, so the escalation cannot tell
  // which stage spent the budget. Whichever is more informative should be the one that returns.
  const signature = failures.slice().sort().join(' ')
  if (green && fixes > 0 && fixes < maxRounds && signature === lastConfirmed) {
    return {
      status: 'no-progress',
      phaseLabel, round, fixes, gateFixes, reviewFixes, stage, branch, depth: resolvedDepth, reviewers,
      unresolved: failures, nonblocking: [...nonblockingSeen], rejected: rejectedSeen, untriaged, agentsDispatched,
      reason: `fix round ${fixes} changed the code but not the findings: ${failures.length} confirmed finding(s) came back identical. Escalate with the deadlock report rather than spending the remaining ${maxRounds - fixes} round(s).`,
    }
  }
  lastConfirmed = signature

  // Cap on fixes SPENT, not on the round about to start: the Nth fix is allowed to run, and its
  // result is verified on the next trip. Only then is the budget genuinely exhausted.
  if (fixes >= maxRounds) {
    return {
      status: 'cap-exhausted',
      phaseLabel, round, fixes, gateFixes, reviewFixes, stage, branch, depth: resolvedDepth, reviewers,
      unresolved: failures,
      nonblocking: [...nonblockingSeen],
      rejected: rejectedSeen,
      untriaged,
      agentsDispatched,
      // Which kind of failure consumed the budget changes what the escalation should say: three
      // rounds lost to a red build is not the planning deadlock escalation.md describes.
      // 'none' is a distinct state from 'mixed' and reads oppositely: with maxRounds 0 the phase is
      // exhausted having spent nothing, and an escalation told the budget went on 'both kinds' would
      // send its reader looking for rounds that never ran.
      exhaustedBy: fixes === 0 ? 'none' : gateFixes > 0 && reviewFixes === 0 ? 'gates' : reviewFixes > 0 && gateFixes === 0 ? 'review' : 'mixed',
    }
  }

  phase('Fix')
  log(`${phaseLabel}: ${stage} failures (${failures.length}), running fix round ${fixes + 1} of ${maxRounds}`)
  const fixed = await tryAgent(
    where +
    `Fix these ${stage} failures on branch "${branch}". Inspect the diff with ` +
    `\`git diff ${base}..${branch}\`.\n\n${failures.map(f => `- ${clip(f)}`).join('\n')}\n\n` +
    `State the root cause of each item ("X is caused by Y") before editing, and change that cause — ` +
    `one at a time, smallest change that addresses it.\n` +
    `Repair only. A fix round repairs what the review found; new machinery is new work. If the repair ` +
    `suggests a check, a harness, a helper module or a guard that does not exist yet, NAME it in your ` +
    `summary and do not build it — machinery added here arrives unreviewed, so the next round reviews ` +
    `it instead of the change and the cap fires on scaffolding nobody planned.\n` +
    `Do not edit ${planPath}. A finding that the diff does not match the plan is answered in the code ` +
    `or escalated, never by rewriting the plan.\n` +
    `If a cause is not obvious, rank 3-5 falsifiable hypotheses and find the observation that ` +
    `discriminates between the top two. Do not anchor on the first theory that fits.\n` +
    `If an item is a correctness bug, write a failing test that reproduces it first, then fix to green.\n` +
    `If an item passes on re-run with no code change it is a flake, not a regression in this diff: do not ` +
    `disable the test, loosen an assertion, add a retry, or raise a timeout to force green. Leave it and ` +
    `report it as a separate concern.\n` +
    `Commit to the same branch, matching the convention in \`git log --oneline -20\`, and name both the ` +
    `phase and the item you fixed.`,
    { label: `fix:${phaseLabel}:r${round}`, phase: 'Fix', model: models.fix }
  )
  // A fix agent that never returned did not fix anything. Spending the round anyway reports an
  // infrastructure failure as a deadlock, which escalation.md tells the reader to treat as a defect
  // in the plan.
  if (!fixed) {
    return { agentsDispatched, status: 'agent-error', phaseLabel, round, fixes, stage: 'fix', branch, reason: 'the fix agent did not return, so this round changed nothing' }
  }

  fixes++
  if (stage === 'gates') gateFixes++
  else reviewFixes++
  verifyRound++
}

// Reached only if the counters above stopped advancing — the loop's structural bound firing before any
// verdict was returned. That is a defect in this script, not a result about the change, so it is an
// agent-error rather than a cap-exhaustion the caller might try to absorb.
return {
  status: 'agent-error',
  phaseLabel, round: verifyRound, fixes, gateFixes, reviewFixes, branch, depth: resolvedDepth, reviewers,
  agentsDispatched,
  stage: 'loop-exit',
  // Deliberately not a diagnosis. The earlier wording asserted the fix counter had not advanced, which
  // is only one way to arrive here: changing the cap test to `fixes > maxRounds` reaches it with the
  // counter working perfectly and sends the reader to the wrong place. State what was observed.
  reason: `the verify loop hit its structural bound after ${verifyRound - 1} verification(s) and ${fixes} fix(es) against a budget of ${maxRounds}, without returning a verdict — the loop and its counters disagree`,
  unresolved: lastFailures,
  nonblocking: [...nonblockingSeen],
  rejected: rejectedSeen,
  untriaged,
  concerns,
}
