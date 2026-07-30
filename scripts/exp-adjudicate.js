export const meta = {
  name: 'exp-adjudicate',
  description: 'Blind adversarial re-judging of the round-cap experiment findings, plus seed matching',
  phases: [
    { title: 'Adjudicate' },
    { title: 'Match' },
  ],
}

// Pre-registration §5.4. This is a check ON phase.js's triage, not a repeat of it: termination was
// driven by a single `triage:` agent that saw the diff, and this project's own measurement puts
// reviewer precision well below 100%. What survived triage is re-judged here by three adjudicators
// per group, each instructed to REFUTE and to default to "not a defect" when torn.
//
// It does NOT re-drive termination. The runs already happened. It reports how much of what stopped
// them was real.
//
// Blinding: an adjudicator sees a finding's text and the diff it was raised against. It does not see
// which reviewer wrote it, which replicate it came from, its round number, or that triage confirmed
// it. Findings are presented under opaque indices in a deterministic shuffled order.

// Normally the groups arrive as `args`. For the run that produced the committed verdicts they were
// embedded instead: a Workflow script has no filesystem, and the payload — 67 findings, about 80,000
// characters of quoted review text — is larger than a practical argument. `scripts/exp-embed.py`
// substitutes the JSON for the `null` below and changes nothing else, so the committed script and the
// one that ran differ by exactly this line, and `docs/measurements/2026-07-30-round-cap/raw/adjudication-groups.json` is the payload it embeds.
const EMBEDDED_GROUPS = null

const cfg = EMBEDDED_GROUPS || ((typeof args === 'string') ? JSON.parse(args) : (args || {}))
if (!Array.isArray(cfg.groups) || !cfg.groups.length) {
  return { status: 'usage-error', reason: 'groups is required: [{key, dir, base, head, findings: [{id, text}]}]' }
}

// Deterministic shuffle. `Math.random()` throws in a Workflow script and is forbidden by this
// repository's norms regardless. The pre-registered permutation is i*7+3 mod n, which is only a
// permutation when gcd(7, n) = 1; the fallback and the stride actually used are both reported, so the
// shuffle can be reproduced exactly rather than taken on trust.
function shuffle(items) {
  const n = items.length
  let stride = 7
  if (n % 7 === 0) stride = 11
  if (n % stride === 0) stride = 1
  const out = new Array(n)
  for (let i = 0; i < n; i++) out[i] = items[(i * stride + 3) % n]
  const seen = new Set(out.map(x => x.id))
  return { order: seen.size === n ? out : items, stride: seen.size === n ? stride : 0 }
}

const ADJ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'refuted', 'why'],
        properties: {
          id: { type: 'string', description: 'The opaque index exactly as given' },
          refuted: { type: 'boolean', description: 'TRUE if the claim is not a real defect. Default TRUE when torn.' },
          why: { type: 'string', description: 'One line: what the artifact actually says or does' },
        },
      },
    },
  },
}

const MATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['assignments'],
  properties: {
    assignments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'edit_id', 'why'],
        properties: {
          id: { type: 'string' },
          edit_id: { type: 'string', description: 'One of S1..S6, C1..C3, or NONE' },
          why: { type: 'string' },
        },
      },
    },
  },
}

// The answer key. Safe here: adjudication runs only after every replicate has returned, so nothing
// under measurement can read it.
const EDITS = `
S1  Review section. Claims a second reviewer "adds 47% more confirmed findings than the first working
    alone" on diffs. An invented statistic — no such measurement exists.
S2  Workflow mode. Claims the script "resolves the reported value in the repository" and stops the
    phase on a fabricated sha. A claim the code does not support.
S3  Review section. Says each reviewer receives the diff, the plan, AND the implementer's own list of
    low-confidence areas. Contradicts SKILL.md, which says the diff and the plan and nothing else.
S4  Diagnosis section. Directs the reader to \`scripts/verify-plan.sh\`, a path that does not exist.
S5  Fix section. "Fix every reported blocking finding, then triage" — the triage-before-fix rule
    stated in the opposite sense.
S6  Round cap section. "Ten of the twenty-one confirmed findings in the last release…" — a figure whose
    numerator and denominator come from different populations.
C1  Gates section. "Record which commands you actually ran, not the ones the project guide lists."
    This edit is CORRECT and is not a defect.
C2  Round cap section. "Count the rounds in which you actually spent a fix, not the number of times you
    re-ran the gates…" This edit is CORRECT and is not a defect.
C3  Write section. "A phase that ends with uncommitted work has not ended…" This edit is CORRECT and is
    not a defect.
NONE  The finding refers to none of the above.
`.trim()

phase('Adjudicate')

const results = await pipeline(
  cfg.groups.filter(g => g.findings && g.findings.length),

  // Stage A — three independent refuters per group.
  async (g) => {
    const { order, stride } = shuffle(g.findings)
    const listing = order.map(f => `[${f.id}] ${f.text}`).join('\n\n')
    const votes = await parallel([1, 2, 3].map(k => () => agent(
      `Below are claims someone made about a documentation change. Check each one against the change ` +
      `itself.\n\n` +
      `The change is \`git diff ${g.base}..${g.head}\` in the repository at ${g.dir}. ` +
      `\`cd ${g.dir}\` first; that repository is the whole task and nothing outside it is relevant.\n\n` +
      `**Your job is to REFUTE these claims, not to confirm them.** For each one, look at the code or ` +
      `prose it is about and try to show it is wrong: that it misreads the text, attacks something the ` +
      `change does not do, describes a real property that is not a problem, or dissolves once you read ` +
      `the surrounding lines.\n\n` +
      `Set refuted=true when the claim is NOT a real defect. **When you are torn, set refuted=true.** ` +
      `Only set refuted=false when you have looked at the thing cited and the defect is really there.\n\n` +
      `Judge each claim on its own. They come from no particular source and being listed together ` +
      `implies nothing about any of them.\n\n${listing}\n\nDo not modify anything.`,
      { label: `adjudicate:${g.key}:v${k}`, phase: 'Adjudicate', schema: ADJ_SCHEMA, model: cfg.model }
    )))
    return { g, stride, votes: votes.filter(Boolean) }
  },

  // Stage B — three independent matchers per group, run only where Stage A produced verdicts.
  async (stageA, g) => {
    const { order } = shuffle(g.findings)
    const listing = order.map(f => `[${f.id}] ${f.text}`).join('\n\n')
    const assigns = await parallel([1, 2, 3].map(k => () => agent(
      `A documentation change was made up of nine identifiable edits, listed below with an ID. ` +
      `Separately, some claims were written about that change. Your only task is to say which edit ` +
      `each claim is about.\n\n` +
      `The change is \`git diff ${g.base}..${g.head}\` in the repository at ${g.dir}; \`cd\` there if ` +
      `you need to look.\n\nThe edits:\n\n${EDITS}\n\nThe claims:\n\n${listing}\n\n` +
      `For each claim return exactly one edit_id. Use NONE when the claim is about something other ` +
      `than these nine edits — that is a normal answer, not a failure. Do not judge whether the claim ` +
      `is correct; only say what it is about. Do not modify anything.`,
      { label: `match:${g.key}:v${k}`, phase: 'Match', schema: MATCH_SCHEMA, model: cfg.model }
    )))
    return { ...stageA, assigns: assigns.filter(Boolean) }
  }
)

// ── Tally. Thresholds are the pre-registered ones: >= 2 of 3, both stages. ────
const verdicts = []
const matches = []
const incomplete = []

for (const r of results.filter(Boolean)) {
  const { g, votes, assigns, stride } = r
  for (const f of g.findings) {
    const vs = votes.map(v => (v.verdicts || []).find(x => x.id === f.id)).filter(Boolean)
    if (vs.length < 2) {
      incomplete.push({ finding_id: f.id, reason: `only ${vs.length} adjudicator verdict(s)` })
    } else {
      // Upheld requires a majority that did NOT refute. A tie under three voters cannot happen; if a
      // voter dropped out, two agreeing voters are still required, so absence never becomes assent.
      const notRefuted = vs.filter(v => v.refuted === false).length
      verdicts.push({
        finding_id: f.id,
        upheld: notRefuted >= 2,
        votes: vs.map(v => ({ refuted: v.refuted, why: v.why })),
        shuffleStride: stride,
      })
    }

    const as = assigns.map(a => (a.assignments || []).find(x => x.id === f.id)).filter(Boolean)
    const tally = {}
    for (const a of as) tally[a.edit_id] = (tally[a.edit_id] || 0) + 1
    const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
    matches.push({
      finding_id: f.id,
      matched: winner && winner[1] >= 2 && winner[0] !== 'NONE' ? winner[0] : null,
      tally,
    })
  }
}

return {
  verdicts,
  matches,
  incomplete,
  groups: results.filter(Boolean).length,
  note: 'refuted=true means NOT a real defect; upheld requires >=2 of 3 adjudicators declining to refute',
}
