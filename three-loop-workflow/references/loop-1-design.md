# L1: Design Document Loop

## Goal

Produce a **self-contained** `docs/design/<task-slug>.md` such that any fresh agent can complete subsequent work using only that file plus the upstream design documents it explicitly references. No context from the current session is required.

If `docs/design/` does not yet exist, the first task simply runs `mkdir -p docs/design docs/implementation` at the repository root. No pre-planned directory structure or README index is maintained.

## L1 pre-step: Understand before designing

Design quality is bounded by understanding quality. Before drafting, when the task **touches
existing code**, the main agent runs a read-only codebase-understanding sweep. This is a
**pre-step, not a loop**: no review subagent, no round counter, no termination condition — it
only gathers inputs for the design.

- **Trigger**: any task that modifies existing code. Required when the change spans more than
  one module or touches a load-bearing doc; optional for a trivial single-file change.
  **No-op on first-design / greenfield work** (there is nothing to map — mirrors the "the very
  first design task may skip this step" rule below).
- **How**: spawn one or more read-only **Explore** subagents (the built-in read-only agent; on
  a harness without it, a default subagent in read-only/plan mode is the zero-install fallback)
  to map the touched modules, their current invariants, the immediate callers of code you will
  change, and the closest existing patterns. For a large or unfamiliar surface the **main
  agent** (subagents cannot nest) may fan out across angles with `parallel()` and merge the
  results into a short "Codebase Context Brief" — keeping the heavy reading out of the main
  context window.
- **Footgun (load-bearing)**: the built-in **Explore and Plan agents skip CLAUDE.md and git
  status**. If the sweep must honor an `_engineering-norms_` or `_language-policy_` constraint,
  the main agent MUST restate that constraint in the delegation prompt — the subagent will not
  see it otherwise.
- **Output**: feeds the design's "Relationship with Existing Designs" (section 6) and "Key
  Design Decisions" (section 4), and is how you acquire the articulation principle 0.3 demands
  ("if you cannot articulate why surrounding code is structured a way, stop and ask"). It does
  **not** replace procedure step 1 (reading existing `docs/design/*.md`) — that still runs.

## Required sections (all 8 must be present)

1. **Background and Purpose**: why we are doing this, what happens if we do not.
2. **Deliverables**: a checkbox list of finished artifacts.
3. **Scope Boundary**: explicitly state what is **NOT** in scope, to prevent scope creep at L2 and L3.
4. **Key Design Decisions**: each decision lists "problem, candidate options, choice and rationale", **including the reasons rejected alternatives were rejected**. Single-option decisions are a severe issue.
5. **Dependencies and Assumptions**: prerequisites, external systems, data formats.
6. **Relationship with Existing Designs**: cite chapter and line numbers in existing `docs/design/*.md` files. If this is the first design document, note "no prior design; terminology anchors are CLAUDE.md _language-policy_ role and the project README". Mark conflicts with a warning marker; when source of truth cannot be determined, escalate.
7. **Acceptance Criteria**: each criterion must be **measurable and automatable**. Statements like "code quality is good" or "performance is improved" are forbidden — write the measurement instead.
   - **Quality budgets — declare or exclude.** If the change has user-facing behavior, a hot
     path, or an interface surface, declare the relevant quality budget *as a measured
     criterion* — e.g. a p99 latency threshold, a throughput floor, a bundle-size ceiling, an
     accessibility score (axe / Lighthouse), or a scripted UX-flow assertion. Realize declared
     budgets at L2 as a runnable `<ACCEPT-CMD>`. If a quality attribute is intentionally out of
     scope, say so explicitly in the Scope Boundary (section 3). Omission is not the same as a
     decision: a missing-and-not-excluded budget for a user-facing change is a **general** issue
     at review (see the review template below). This forces the quality-attribute decision that
     is otherwise made by silent omission — it does not require a budget on every task.
8. **Risks and Rollback**: identified failure modes plus rollback mechanisms.

## Main agent procedure

1. If existing `docs/design/*.md` files are present, read them all first to build a design map and avoid conflicts or duplicate modeling. The very first design task may skip this step.
   Before drafting, also ask the user whether any parallel tasks covering the same domain
   are in progress. If yes, coordinate — merge or serialize the design work — before
   drafting. A fresh agent reviewing your design doc cannot discover uncommitted in-progress
   designs by a parallel task.
2. Read CLAUDE.md _language-policy_ and _load-bearing-docs_ roles to confirm project requirements on language, terminology consistency, and contract file scope.
3. On encountering ANY of the following signals, **stop and escalate** (see `references/escalation-rules.md`). Do not silently assume:
    - Vague deliverables (e.g., "improve performance", "make it more readable")
    - Multiple candidate options whose trade-offs have no clear winner
    - Possible conflict with an existing design where it is unclear whether to follow the design or the patch
    - Breaking changes: schema, exit codes, CLI arguments, storage layout, external protocol, directory structure
4. After the first draft, spawn the review subagent (template below). Increment `{{round}}` first.

## Loop dynamic

```mermaid
flowchart LR
    Draft[Main agent drafts design doc]
    Spawn[Spawn fresh review subagent<br/>round counter += 1]
    Report[Review report:<br/>severe / general / clarification]
    Decide{Verdict?}
    Fix[Main agent edits doc]
    Ask[Escalate]
    Cap{Round > 3?}
    Exit([Exit L1, enter L2])

    Draft --> Spawn --> Report --> Decide
    Decide -- severe issues --> Fix --> Cap
    Decide -- clarification needed --> Ask --> Fix
    Decide -- zero severe AND prior round zero general --> Exit
    Decide -- zero severe but general remain --> Fix
    Cap -- no --> Spawn
    Cap -- yes --> Ask
```

The main agent edits the doc directly — no separate fix subagent at L1 (scale is small).

## Termination conditions

- **Pass**: review subagent reports zero severe issues this round, AND one prior round reported zero general issues.
- **Hard cap**: 3 rounds. Hitting cap with severe issues unresolved → escalate, do not relax the bar. Compose a deadlock report (see `references/escalation-rules.md` "Round-cap exhaustion").
- If a new user-decision point is identified mid-loop, return to procedure step 3 to ask the user. Do not decide unilaterally.

> For structured output from this review subagent, see `references/schemas.md` (`ReviewVerdict` schema).

> Spawn this review as a fresh default subagent (a new general-purpose subagent, separate from the agent that drafted the document); no special agent type is required — role isolation, not a particular agent type, is what matters.

> **Optional escalation**: for a load-bearing or high-risk design, escalate to an adversarial **panel** review (N fresh voters, mechanical union of findings) — see `references/multi-voter-review.md`.

## Review subagent prompt template

Substitute the bracketed values, increment the round counter, and spawn a fresh subagent per round. The subagent must never receive the literal `{{round}}` string.

```plaintext
You are the design review engineer for the {{project-name}} project.

[Task] Review the draft at {{design-doc-path}} and surface issues and
improvements.

[Language constraint]
If the artifact under review falls within the project core contract scope
listed under the CLAUDE.md *language-policy* role (such as SKILL.md,
source directories, references, public API contracts), any violation of
the language policy (such as mixing in non-designated languages,
terminology drift) is logged as a severe issue. The language of the
design document itself is governed by CLAUDE.md, but its terminology
must be consistent with existing docs/design/, project README, and core
contract files.

[Steps]
1. Read {{design-doc-path}} in full.
2. Read every docs/design/*.md section it cites under "Relationship with
   Existing Designs". If this is the first design document, read instead
   the contract files referenced by CLAUDE.md as terminology anchors.
3. Read CLAUDE.md and the three-loop-workflow skill (SKILL.md plus the
   relevant references files).
4. Audit each of the eight required sections against these checks:
   - Are there acceptance criteria that cannot be automated?
   - Are deliverables in checkbox form?
   - Are there conflicts with existing designs that lack a warning marker?
   - Are there decisions that present only one option, with no trade-off
     comparison?
   - Is the scope boundary tight enough, with no smuggled-in extensions?
   - Do risks and rollback cover the most likely failure paths?
   - For a user-facing / hot-path / interface change: is a quality budget
     declared as a measured criterion, or explicitly excluded in the Scope
     Boundary? A missing-and-not-excluded budget is a general issue.
   - Coding philosophy (Think Before Coding, Simplicity First, Surgical
     Changes, Goal-Driven Execution): any violation (silent defaults,
     speculative scope, missing trade-offs) is a severe issue.
5. Do not modify the document. Output only the review report.

[Output format]
## Design Document Review Report (round {{round}})

### Severe issues (block entry to L2)
- [section] description and suggested fix direction

### General issues (recommend fixing this round)
- …

### Clarification items (require main agent to consult user)
- …

### Verdict
pass / needs fix / severe non-conformance
```

## Common L1 traps

- Writing acceptance criteria like "code is clean" or "performance is good" — these are not mechanically verifiable, so they will be rejected at L2 anyway. Write the measurement (a benchmark threshold, a regex over output, a specific test that must pass).
- Listing only one design option without alternatives — violates Think Before Coding and is automatically a severe issue at review.
- Smuggling implementation details into the design doc — keep design at "what and why"; "how" belongs in L2.
- Skipping Scope Boundary because "everything is in scope" — explicit non-goals are how Simplicity First gets enforced downstream.
- Assuming "we'll figure it out" for risks and rollback — if you cannot describe rollback, you cannot ship the change.
