---
name: three-loop-workflow
description: Use this skill for any non-trivial functional change to a software project — implementing a new feature, fixing a behavior bug, optimizing performance, refactoring, or modifying a load-bearing process/contract file (CLAUDE.md, this skill itself, SKILL.md, OpenAPI specs, schema definitions, public API contracts). It enforces a three-loop discipline (L1 Design Document → L2 Implementation Document → L3 Development Work) with mandatory fresh-subagent reviews, round caps of 3 per domain, and explicit escalation rules. Trigger this skill whenever the user asks to implement, fix, refactor, optimize, build, or modify behavior in code — even when they say "just do X" or "quickly add Y". Skip only for pure typo fixes, doc reordering, dependency upgrades, and questions that do not change code.
metadata:
  version: "1.1"
---

# Three-Loop Development Workflow

This skill operationalizes a disciplined process for non-trivial software changes. Every functional change passes through three top-down loops — **L1 Design Document Loop**, **L2 Implementation Document Loop**, **L3 Development Work Loop** — followed by a final **F: End-to-End Review**.

The workflow exists because shipping code without explicit design surfacing, mechanical acceptance, and fresh-eyes review consistently produces drift, scope creep, and hard-to-debug regressions. Following this loop is slower per-task but eliminates a category of failures that compound across tasks.

Throughout this skill, `<TEST-CMD>` denotes the project test command (typically `pytest tests/ -v` for Python, `npm test` for Node, `go test ./...` for Go) and `<ACCEPT-CMD>` denotes the per-Phase acceptance commands declared in the implementation document. Concrete values come from the project's `CLAUDE.md` _common-commands_ role (see "Project integration" below).

## When this skill applies

| Change type | Apply full L1 → L2 → L3? |
|---|---|
| New feature with externally observable behavior | yes |
| Bug fix that changes behavior | yes |
| Performance optimization | yes |
| Refactor that touches more than one file | yes |
| Modification to a **load-bearing** doc (CLAUDE.md, this skill, SKILL.md, OpenAPI specs, schema definitions, public API contracts) | yes |
| Pure document reordering, typo fix, dependency upgrade | no — but still requires one independent fresh-agent review |
| Pure question answering, exploration with no code change | no |

When a load-bearing doc is **first introduced** (or first retroactively classified as load-bearing), a one-page retroactive design brief plus an independent agent review with two consecutive clean rounds may substitute for the full three-loop cycle. Any subsequent modification must follow the formal procedure.

**Role isolation rule** (applies to every loop): a single subagent must never both author and review the same artifact. Reviews are performed by a fresh subagent that receives only the artifact, the relevant prompt template, and the linked design / impl docs.

## Core principles (non-negotiable, every loop, every subagent)

When a principle conflicts with apparent progress, the principle wins. Violation by any subagent is a regression of the workflow itself, regardless of whether tests pass.

### 0.1 Think Before Coding — surface, do not assume

- State assumptions explicitly. If uncertain, stop and escalate (see `references/escalation-rules.md`). Never substitute "reasonable defaults" for a real decision.
- When multiple interpretations exist, present them with trade-offs. Picking silently is forbidden.
- When a simpler path exists, name it and push back. Senior judgment is mandatory, not optional.
- Single-option design decisions and missing trade-offs are severe issues at L1 review.

### 0.2 Simplicity First — minimum code that solves the stated problem

- No features beyond the design document's Deliverables.
- No abstractions for single-use code.
- No configurability or flexibility that was not requested.
- No error handling for scenarios that cannot occur.
- Self-test before review: "Would a senior engineer call this overcomplicated?" If yes, rewrite before invoking the review subagent.

### 0.3 Surgical Changes — touch only what the request requires

- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor what is not broken.
- Match existing style even when you would write it differently.
- Notice unrelated dead code: mention it, do not delete it.
- When your changes orphan an import, variable, or function, remove it. Do not remove pre-existing dead code unless asked.
- When two existing patterns in the codebase conflict, pick the more recent or more tested one and flag the other for cleanup. Producing a hybrid that satisfies neither is forbidden. Cleanup of the rejected pattern is a separate task — do not perform it here.
- If you cannot articulate why surrounding code is structured a way, stop and ask before modifying it. Assuming orthogonality between the code you are touching and the code you are not is the dangerous default.
- **Trace test**: every changed line must trace directly to either (a) a Deliverable in the design document, or (b) an escalated decision recorded in the design document. Lines that pass neither must be reverted before the L3 review subagent runs.

### 0.4 Goal-Driven Execution — define success, loop until verified

- Success = design Acceptance Criteria met AND all `<ACCEPT-CMD>` exit code 0 AND `<TEST-CMD>` exit code 0.
- "I think it works" does not close a Phase. The accept subagent does, by reporting pass on every command.
- Every loop has an explicit termination condition. No loop exits on intuition.
- Round caps (3 per domain) exist to force escalation, not to ship half-done work. Hitting the cap means escalating to the user, not silently lowering the bar.

### Principle composition (which loop enforces which principle)

| Loop / Stage | Primary principle | Failure mode it prevents |
|---|---|---|
| L1 design (whole loop) | Think Before Coding | Silent decisions, missing alternatives, vague deliverables |
| L1 design (Scope Boundary section) | Simplicity First | Scope creep baked into requirements |
| L2 impl (Phase scope) | Simplicity First | Phase plans that exceed design scope |
| L2 impl (Acceptance commands) | Goal-Driven Execution | Acceptance criteria that are not mechanically verifiable |
| L3 dev step | Surgical Changes | Drive-by refactors, formatting churn, opportunistic deletions |
| L3 fix step | Surgical Changes | Structural rewrites disguised as fixes |
| L3 accept step | Goal-Driven Execution | Phase closure on author confidence rather than green commands |
| Section 6 escalation | Think Before Coding | "Reasonable default" used to dodge a real decision |

## The three loops at a glance

```mermaid
flowchart TD
    Start([Task starts])

    subgraph L1[L1: Design Document Loop, round cap = 3]
        L1Draft[Draft docs/design/&lt;task-slug&gt;.md]
        L1Verdict{Verdict?}
        L1Fix[Fix design doc]
        L1Draft --> L1Verdict
        L1Verdict -- severe OR general remain --> L1Fix --> L1Verdict
    end

    subgraph L2[L2: Implementation Document Loop, round cap = 3]
        L2Draft[Draft docs/implementation/&lt;task-slug&gt;.md]
        L2Verdict{Verdict?}
        L2Fix[Fix impl doc]
        L2Draft --> L2Verdict
        L2Verdict -- severe OR general remain --> L2Fix --> L2Verdict
    end

    subgraph L3[L3: Development Work Loop, round cap = 3 per Phase]
        L3Phase[Phase k: dev → review → accept → fix]
        L3Next{Phase k closed?}
        L3Phase --> L3Next
        L3Next -- not yet, R less than 3 --> L3Phase
    end

    Ask[Escalate to user]
    Final[F: End-to-end review]
    Done([Task closed])

    Start --> L1Draft
    L1Verdict -- zero severe AND prior round zero general --> L2Draft
    L1Verdict -- cap exhausted OR clarification needed --> Ask
    L2Verdict -- zero severe AND prior round zero general --> L3Phase
    L2Verdict -- design conflict --> L1Draft
    L2Verdict -- cap exhausted OR clarification needed --> Ask
    L3Next -- more phases pending --> L3Phase
    L3Next -- last phase passed --> Final
    L3Next -- design conflict --> L1Draft
    L3Next -- impl conflict --> L2Draft
    L3Next -- cap exhausted --> Ask
    Final --> Done
```

Each loop must satisfy its termination condition before advancing. Hitting the round cap or detecting a downstream document conflict routes back upstream rather than relaxing the bar.

**Document creation convention**: `docs/design/` and `docs/implementation/` are **not** pre-existing knowledge bases. They are created on demand per task. The first task simply runs `mkdir -p docs/design docs/implementation` at the repository root and writes its files. No pre-planned directory structure or README index is maintained.

**Document closure convention**: at task closeout (F), each task's two documents are consolidated in a single focused pass — ephemeral scaffolding pruned, a closure block added (`Status: closed`, `Closing-commit:`, `Closed-on:`, `Deferred:`), and supersedes / superseded-by links recorded if a genuine succession exists. Consolidation is verified by a fresh review subagent. This keeps `docs/design/` and `docs/implementation/` from growing into a graveyard of stale drafts. Procedure and review template live in `references/end-to-end-review.md`.

**Shared termination condition (all loops)**:
- **Pass**: the review subagent reports zero severe issues this round, AND one consecutive prior round reported zero general issues. Exit the loop.
- **Hard cap, per domain**: 3 rounds, counted independently. L1 / L2 / L3 do not share rounds — even if L1 takes all 3 rounds to pass, L2 still starts at round 1. L3 is counted independently per Phase. Hitting cap → escalate, never relax the bar.
- **Round counter substitution**: increment `{{round}}` before spawning each review subagent. The subagent never receives the literal `{{round}}` string.
- L1 / L2 fixes are made directly by the main agent — no separate fix subagent (scale is small). L3 uses the four-corner template (dev / review / accept / fix), each role a fresh subagent.

## Project integration: CLAUDE.md role vocabulary

This skill references the project's CLAUDE.md by **role**, not by literal heading name, so it remains portable across projects whose CLAUDE.md heading conventions differ. Each project pins concrete heading text to each role at the top of its CLAUDE.md (an "anchor map").

The five required roles:

| Role | Responsibility |
|---|---|
| _repo-workflow_ | How tasks proceed in this repo: entry points, who triggers L1/L2/L3, escalation contacts, link to this skill |
| _load-bearing-docs_ | Concrete list of contract files protected by the full L1/L2/L3 cycle |
| _language-policy_ | Language and terminology rules for code, process docs, and contract files |
| _common-commands_ | Concrete value of `<TEST-CMD>` and other shell commands the workflow invokes |
| _engineering-norms_ | Project-level coding standards, architecture overview, anti-patterns |

When you see `<TEST-CMD>` or `<ACCEPT-CMD>` in this skill, resolve them via the project's `CLAUDE.md` _common-commands_ role.

Full role-vocabulary detail, the cross-file consistency checklist, and grep-based self-check commands live in `references/claude-md-integration.md`. Read it when authoring a project's CLAUDE.md anchor map or auditing for drift.

## Routing — which reference file to load next

Once you've confirmed this skill applies to the current task, jump to the relevant phase reference:

| You are about to... | Read this reference |
|---|---|
| Draft `docs/design/<task-slug>.md` (L1) | `references/loop-1-design.md` — required sections, main agent procedure, review subagent prompt template |
| Draft `docs/implementation/<task-slug>.md` (L2) | `references/loop-2-implementation.md` — Phase breakdown, review subagent prompt template |
| Start a Phase (L3): dev → review → accept → fix | `references/loop-3-development.md` — four-corner subagent template, role table, commit conventions |
| Run external-process / E2E verification | `references/loop-3-development.md` (E2E section: pre-flight, isolated spawn, archival) |
| Close out the task: end-to-end review, document consolidation (F) | `references/end-to-end-review.md` |
| Encounter ambiguity, breaking change, or unverifiable acceptance | `references/escalation-rules.md` |
| Audit CLAUDE.md / cross-file consistency | `references/claude-md-integration.md` |

## Commit conventions (cross-cutting)

Every code-modifying commit produced inside L3 follows these conventions:

- **Phase opener**: `feat(phaseN): <one-line summary>` or `fix(phaseN): …` depending on change nature.
- **Within-round fix**: `fix(phaseN-roundR): <failing-item-keyword>`. The keyword must name a failing item from the review or accept report — drive-by edits leave no valid keyword and thus cannot be committed under this convention. This is how Surgical Changes is enforced mechanically.
- **Trailers** record `<TEST-CMD>` exit code and key `<ACCEPT-CMD>` results.
- **Do not** mention AI involvement, model names, or agent tooling in commit messages or PR descriptions.

Detailed examples and the four-corner role table are in `references/loop-3-development.md`.

## Self-check before claiming a loop is closed

- L1 closed? `docs/design/<task-slug>.md` exists, all 8 required sections present, review subagent reports zero severe + one prior round zero general.
- L2 closed? `docs/implementation/<task-slug>.md` exists, every Phase has runnable `<ACCEPT-CMD>`, review subagent reports zero severe + one prior round zero general.
- Phase closed? Accept subagent reports pass on every command, main agent personally re-ran `<TEST-CMD>` and every `<ACCEPT-CMD>`, results recorded as commit trailers. If a contract file was modified, E2E gate executed or skip-reason recorded.
- Task closed? End-to-end review (F) completed per `references/end-to-end-review.md` — including step 5 document consolidation (closure block added, ephemera pruned, fresh-subagent review verdict pass), all `e2e/*` worktrees and unreferenced `.e2e-artifacts/` directories cleaned up.

If any of these is "no", you have not closed that stage — return to the relevant reference and continue, or escalate.
