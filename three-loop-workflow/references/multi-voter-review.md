# Multi-Voter Adversarial Review (optional escalation)

The default review is a single fresh reviewer per round. The two-generation termination rule
guards against a *noisy* reviewer (one that flags phantom issues), but it cannot catch a
*blind* reviewer (one that misses a real issue every round). For a load-bearing or high-risk
artifact, escalate to a **panel**: N independent fresh reviewers vote in parallel and their
findings are unioned (the dynamic-workflows cross-checking pattern applied to the review corner).

## When to escalate to a panel

- The artifact under review is a **load-bearing** file (contract, schema, this skill, etc.).
- The change is **high-risk** (breaking change, security-sensitive, wide blast radius).
- A prior round produced a borderline verdict you want corroborated.

For everything else, the single reviewer is sufficient.

## How it works (and why it can only strengthen the gate)

Each of N voters (default 3) reviews the **same** diff but is given a **distinct adversarial
angle** — scope creep, unverifiable acceptance, missing alternatives, surgical-changes
violations, correctness — and is told to try to *refute* that the artifact is ready. Each
returns the standard `ReviewVerdict` (see `references/schemas.md`).

The aggregation is a **mechanical union computed in the script, with no agent in the counting
path**:

- an issue is **severe** for the round if **any** voter marks it severe;
- likewise **general**;
- `severe_count` / `general_count` are the sizes of the unioned sets, and those pre-dedup
  union counts are what feed the termination check.

Because both counts are unions, panel mode makes **both** termination fields strictly harder to
satisfy — it can only **add** findings, never remove one, so it strengthens the gate and never
lowers the bar. Any dedup is **merge-only** (collapse byte-identical duplicates for readability;
never lower a count or demote a severe to a general).

> **Why there is no "dedup judge" agent.** A single agent that reduces the union would itself be
> an un-paneled solo reviewer — reintroducing the exact blind-single-reviewer failure the panel
> exists to remove, one stage later. So the counting is mechanical, not agentic.

The panel runs **inside one review round** and emits **one** aggregated `ReviewVerdict`, so
round counting and cap → escalation are unchanged: the N voters do **not** each consume a round.

> **Voter failures.** A voter that soft-fails is dropped (the union is computed over the
> survivors) and logged; this can **narrow** the panel but never makes the gate weaker than a
> clean single reviewer. If **every** voter fails, the *standalone* `review-panel.js` returns a
> blocking non-conformance, while the *inline* `l3-phase.js` path returns `null` → an `agent-error`
> status (an infrastructure failure, distinct from a review deadlock — see `loop-3-workflow.md`).
> Neither is a silent pass.
>
> A clean **PASS** additionally requires a surviving **quorum** — a strict majority of the requested
> voters, `⌊N/2⌋+1`. Below quorum a *clean* panel does **not** pass; it is treated like a total
> failure (standalone → blocking; inline → `null` → `agent-error`) so the caller re-runs rather than
> advancing on coverage that has shrunk toward a single reviewer. A below-quorum panel that *found*
> severe/general issues still reports them — the quorum gates only the clean-pass boundary.

## How to invoke

- **Inside L3 (Workflow mode):** pass `reviewMode: 'panel'` (and optionally `panelVoters: N`) in
  the `l3-phase.js` args. The review step then runs the panel instead of a single reviewer.
- **Standalone (e.g. an L1/L2 design or impl review):** run the `references/review-panel.js`
  Workflow with `{ reviewPrompt, voters, label }`; it returns the aggregated `ReviewVerdict`.

Both paths implement the identical mechanical-union *counting* logic (they differ only in how a
total voter failure is surfaced — see Voter failures above). `panelVoters` / `voters` is an
overridable argument, never a project constant — portability is preserved.
