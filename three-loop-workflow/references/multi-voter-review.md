# Multi-Voter Adversarial Review (optional escalation)

The default review is a single fresh reviewer per round. The two-generation termination rule
guards against a *noisy* reviewer (one that flags phantom issues), but it cannot catch a
*blind* reviewer (one that misses a real issue every round). For a load-bearing or high-risk
artifact, escalate to a **panel**: N independent fresh reviewers vote in parallel, and their
findings are unioned. This is the dynamic-workflows trustworthiness pattern — independent
agents adversarially cross-checking — applied to the review corner.

This is an **optional escalation**, not the default. Small, low-risk changes pay nothing.

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
satisfy (more severe findings to clear, and a harder "prior round zero general"). It can only
**add** findings — never remove one — so it strictly strengthens the gate and never lowers the
bar. A dedup step, if any, is **merge-only**: it may collapse byte-identical duplicate strings
for fix-prompt readability, but may never lower a count or demote a severe to a general.

> **Why there is no "dedup judge" agent.** A single agent that reduces the union would itself be
> an un-paneled solo reviewer — reintroducing the exact blind-single-reviewer failure the panel
> exists to remove, one stage later. So the counting is mechanical, not agentic.

The panel runs **inside one review round** and emits **one** aggregated `ReviewVerdict`, so
round counting and cap → escalation are unchanged: the N voters do **not** each consume a round.

## How to invoke

- **Inside L3 (Workflow mode):** pass `reviewMode: 'panel'` (and optionally `panelVoters: N`) in
  the `l3-phase.js` args. The review step then runs the panel instead of a single reviewer.
- **Standalone (e.g. an L1/L2 design or impl review):** run the `references/review-panel.js`
  Workflow with `{ reviewPrompt, voters, label }`; it returns the aggregated `ReviewVerdict`.

Both paths implement the identical mechanical-union logic. `panelVoters` / `voters` is an
overridable argument, never a project constant — portability is preserved.
