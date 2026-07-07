# Failure Retrospective (turn a class of failure into a durable prevention)

A fixed defect that leaves no guardrail is rediscovered from scratch next task — the "compounds across tasks"
failure this skill exists to prevent. When a **systemic** (class-level) failure surfaces, this step records a
short root-cause and drives a concrete **class-prevention** onto a surface future work already reads. It is
**lightweight and conditional** — a capability, not a ceremony; it does not fire on every bug fix.

**Stateless by construction.** The trigger is a *within-invocation* event; this skill does **not** detect "we
saw this class before" across tasks. "Systemic/recurring" always means a class-level pattern observable
*within this invocation*. The cross-task payoff comes entirely from **where the prevention lands** — the test
suite, `_engineering-norms_`, or a skill guardrail — not from cross-task detection. Git is the memory; no
persistence machinery, no archive directory.

## When it triggers (two observable events)

1. **Deadlock path** — a round-cap **deadlock** whose **surviving unresolved failure is a task-domain class of
   bug** (a concrete recurring defect *pattern* in the product/domain, independent of any skill-rule
   ambiguity). Evaluated at `escalation-rules.md` **"Returning from escalation"** — *after* the user resolves
   the deadlock and *only if* the class survives. A deliverable **dropped** (option c) or **redesigned away**
   (option a leaves no surviving class) → **no trigger**; the resolution *is* the prevention. The operative
   gate is the surviving-class predicate, not an option→skip table.
2. **F-systemic path** — the F step-6 whole-project review finds a **systemic (non-local) cause**,
   operationalized against step-6's own **blast-radius** signal: a cause whose consumers/callers span **beyond
   the diff** (a class), not a one-off local defect.

Emit the decision as `failure_retrospective: triggered | skipped` — in the closeout report on the F path, or
the escalation-return note on the deadlock path.

## The subject-partition (why it does not double-handle "Meta-test the cap")

`escalation-rules.md` "Meta-test the cap" acts on a **different subject**: a *skill-process* gap (a SKILL rule
that was unclear / missing / hard to find), which it routes to a skill-repo issue. The failure retrospective
acts on the **task-domain class**. Because the two address different subjects, a deadlock that is **both**
fires **both** paths — correct, not duplicative. The retrospective **skips** only when the deadlock's cause is
a skill-process gap and **no task-domain class survives**. Encode the skip as **"task-domain class absent"** —
never as "Meta-test also fired"; the two triggers carry no cross-suppression term. (Self-hosted note: in this
repo the task domain *is* the skill, so both surfaces can be skill files; the `subject-partition` still holds
because it is by *subject* — a rule-clarity gap vs a behavioral defect — not by file.)

## The record (three fields, in the closeout report / escalation-return note)

- **Class** — the class of failure, not the single instance ("cross-file rule stated in one site but consumed
  in another, drifting silently", not "line 42 was wrong").
- **Why existing guards missed it** — which already-read surface *should* have caught it and did not (this is
  what selects the landing surface below).
- **The prevention and its landing surface** — the smallest durable guardrail, and where it lands.

## How the prevention lands (the operational test — no smuggle, no hidden cycle)

The retrospective is **additive**: it never relaxes step-6's severity routing (a **severe** systemic finding
still requires its blocking bounded instance-fix and still blocks closure; a **general** finding is still
recorded and fixed-or-deferred). The class-prevention lands **separately**, governed by this test:

- **If the landing surface is any `_load-bearing-docs_` file** (CLAUDE.md, SKILL.md, a reference, a
  schema/contract) → **always defer** it as a `finding`: a separate task with its own tier + its own fresh-eyes
  review (emit `prevention_disposition: deferred`). Landing it inline would smuggle a second Full cycle into
  closeout.
- **Only a new `tests/scenarios/` fixture or a pure test file may land inline** (emit `prevention_disposition:
  inline`) — and on the **deadlock path** only if produced *before* the review that will cover it. On the
  **F-systemic path** the trigger fires *because* the step-6 review already ran, so nothing can be produced
  "before" it: an F-path prevention therefore **always** takes its own None/Light review or defers — it is
  never added post-review to the current closing commit.

The **three-field record is written regardless** — so even a deferred prevention beats a bare follow-up issue:
it carries the class + the designed prevention + its target surface, ready for the follow-up task to execute.

## Behavioral fixtures (the drift protection for this capability)

These `tests/scenarios/*.md` fixtures assert the decision by **subset-match** (assert only the field(s) named
in `expected`, not exact-JSON equality):

- `failure-retrospective-deadlock-taskdomain-triggers.md` — deadlock, deliverable survives, task-domain class
  → `{"failure_retrospective":"triggered"}`.
- `failure-retrospective-skill-process-deadlock-skips.md` — deadlock whose only cause is a skill-process gap,
  no surviving class → `{"failure_retrospective":"skipped"}` (the dedup boundary).
- `failure-retrospective-severe-systemic-still-blocks.md` — F step-6 severe systemic cause →
  `{"failure_retrospective":"triggered","closure":"blocked-pending-instance-fix"}` (non-displacement).
- `failure-retrospective-loadbearing-prevention-defers.md` — triggered, prevention targets a load-bearing
  surface → `{"failure_retrospective":"triggered","prevention_disposition":"deferred"}` (no-smuggle).
