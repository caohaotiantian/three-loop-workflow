# Design: Failure Retrospective (turn a class of failure into a durable prevention)

```
Status: closed
Closing-commit: 6657ac8
Closed-on: 2026-07-07
Deferred: none
```

Task slug: `2026-07-07-failure-retrospective`
Tier: **Full Mode** (edits the load-bearing three-loop skill itself).
Provenance: Cycle 1 of the backlog in `docs/analysis-2026-07-07-external-skills-comparison.md` (item #2,
ported from Trellis `trellis-break-loop`).

## 1. Background and Purpose

Today the three-loop skill fixes defects but **never converts a fixed defect into a durable guardrail**. When
a round-cap deadlock is escalated, or the F whole-project review surfaces a systemic cause, the knowledge of
*what class of failure this was and how to stop it recurring* dies in the diff and an external follow-up issue.
Trellis's `trellis-break-loop`: *"The value of debugging is not in fixing the bug, but in making this class of
bugs never happen again."*

Three-loop already has two adjacent-but-insufficient mechanisms:
- **"Meta-test the cap"** (`escalation-rules.md` step 3): on round-cap exhaustion, classify *why* the cap fired
  and open a follow-up issue **against the skill repo**. It fires only when the cap was hit because *a SKILL
  rule was unclear/missing/hard-to-find* — a **skill-process** gap — **not** genuine task difficulty. It lands
  no in-repo prevention for a **task-domain** class of bug.
- **F general-finding deferral** (`end-to-end-review.md` step 6): a general finding is recorded and deferred
  with a follow-up issue. Again external, no durable in-repo prevention.

Neither lands a **prevention that future work automatically reads**. This design adds a lightweight *failure
retrospective* that, for **systemic (class-level) failures only**, records a short root-cause and drives a
concrete prevention onto an **already-read surface** (a regression test, a CLAUDE.md `_engineering-norms_`
line, or a skill-reference guardrail) — **via that prevention's own tier and its own fresh-eyes review**.

**How the cross-task payoff works (and why it is stateless).** The *trigger* is a **within-invocation
systemic-failure event** — this skill is stateless and does **not** detect "we saw this class before" across
tasks. "Systemic/recurring" always means a class-level pattern observable **within this invocation** (e.g. the
same or a related failure item across the deadlock's rounds — the `escalation-rules.md` round-cap
pattern-check), never "recurred in a prior task". The cross-task benefit comes entirely from **where the
prevention lands**: a surface future tasks already consult. Detection is local; prevention is durable. Git is
the memory — no persistence machinery, no archive directory.

If we do not do this: the same class of bug is rediscovered from scratch each task — the "compounds across
tasks" failure the skill's own preamble says it exists to prevent.

## 2. Deliverables

- [ ] `references/failure-retrospective.md` — new reference defining: the **two-event systemic trigger** (D2);
      the **subject-partition** dedup rule (D2); the **three-field record** (class / why-existing-guards-missed-
      it / the-prevention-and-its-landing-surface); the **landing rule** (D1) and its **tier/review operational
      test** (D1b); the **decision-token output anchors** — `failure_retrospective` (values `triggered` /
      `skipped`) **and**, when `triggered`, `prevention_disposition` (values `inline` / `deferred`) — and
      *where they are emitted* (closeout report on the F path; escalation-return note on the deadlock path);
      and the literal phrase **"additive"** describing its relationship to step-6 severity routing. The trigger
      is written as a **predicate** ("a task-domain class survived") not an option→skip table, and the skip
      boundary is encoded as **"task-domain class absent"**, never "Meta-test also fired" (so the two triggers
      carry no cross-suppression term).
- [ ] Trigger hook in `references/escalation-rules.md` at **"Returning from escalation"**, scoped explicitly to
      a **round-cap-deadlock return** whose **surviving unresolved failure is a task-domain class of bug**
      (not any escalation return, and not a deadlock resolved by redesigning-away/dropping the class). It states
      it is **additive to** — never a replacement for — the skill-process → repo-issue path (they act on
      **different subjects**; both may run, see D2). Carries the literal token `failure_retrospective`.
- [ ] Trigger hook in `references/end-to-end-review.md` step 6: when the whole-project review finds a
      **systemic (non-local) cause** — operationalized against step-6's own **blast-radius** signal (a cause
      whose consumers/callers span beyond the diff, i.e. a class, not a one-off local defect) — run the
      retrospective. It is **strictly additive on top of** step-6's
      severity routing — a **severe** finding still requires its blocking bounded instance-fix and still blocks
      closure, a **general** finding is still recorded and fixed-or-deferred; the retrospective adds a
      **class-prevention** alongside and never discharges the instance disposition. Carries the literal token
      `failure_retrospective`.
- [ ] Light Mode clause in `references/light-mode.md`: Light inherits the **deadlock** `failure_retrospective`
      trigger via `escalation-rules.md` (all-tier); the **F-systemic** trigger is Full-only (collapsed F, no
      step 6). It states the real Light disposition: a Light-Mode deadlock whose surviving task-domain
      prevention is **load-bearing** defers as a `finding` (D1b). Carries the literal token
      `failure_retrospective` (so the clause is gate-protected).
- [ ] `check-consistency.sh`: (a) add a **reference-only paired token** — the **distinctive** literal
      `failure_retrospective` (underscore; **not** a substring of the hyphenated file path, so a mere
      `references/failure-retrospective.md` cross-link cannot satisfy it) — required across
      `references/failure-retrospective.md` ↔ `references/escalation-rules.md` ↔ `references/end-to-end-
      review.md` ↔ `references/light-mode.md`; (b) register the four new fixtures for existence **inside the
      existing `[ -d tests/scenarios ]` guard**.
- [ ] Four `tests/scenarios/*.md` fixtures, each a single concrete scenario asserting a compound `expected`
      (each covers a distinct invariant/path):
      1. `failure-retrospective-deadlock-taskdomain-triggers.md` — round-cap deadlock, deliverable survives,
         cause is a task-domain class → `{"failure_retrospective":"triggered"}`.
      2. `failure-retrospective-skill-process-deadlock-skips.md` — deadlock whose only cause is a skill-process
         gap → `{"failure_retrospective":"skipped"}` (Meta-test repo-issue path only; the **dedup boundary**).
      3. `failure-retrospective-severe-systemic-still-blocks.md` — F step-6 finds a **severe** systemic cause →
         `{"failure_retrospective":"triggered","closure":"blocked-pending-instance-fix"}` (**non-displacement**
         invariant; mirrors `closeout-migration-unverified-blocks.md`).
      4. `failure-retrospective-loadbearing-prevention-defers.md` — triggered, but the prevention is a
         load-bearing surface (`_engineering-norms_`/skill rule) → `{"failure_retrospective":"triggered",
         "prevention_disposition":"deferred"}` (**no-smuggle** invariant).
- [ ] CLAUDE.md _common-commands_ gate description reconciled to name the new paired token + the four fixtures
      (project-doc reconciliation — keeps the gate description factually correct).

## 3. Scope Boundary (NOT in scope)

- **No persistence machinery**, **no `docs/retrospectives/` archive**, **no cross-invocation recurrence
  detection**, **no Bayesian framework**, **no new L3 corner / 6th F B-gate / round counter**, **no SKILL.md
  surface change** (D3), **no `l3-phase.js` change** (§5).
- **No unreviewed prevention in the current closing commit** — a prevention lands via its own tiered,
  fresh-eyes-reviewed change, or defers as a `finding` (D1b). The retrospective **never** relaxes the step-6
  instance disposition.
- **The both-subjects deadlock** (fires Meta-test *and* the retrospective) is intentionally **not** a separate
  fixture: it is the composition of two independently-tested behaviors — the retrospective firing (fixture 1)
  and Meta-test's **unchanged** existing behavior (already covered by the existing skill). Stated here so the
  coverage boundary is explicit, not silently capped.
- **The permissive inline-landing branch** (a test-shaped prevention landing inline on the deadlock path,
  pre-review) is intentionally **not** fixtured: fixture 4 pins the higher-risk load-bearing→defer branch;
  over-fixturing the permissive path is unwarranted under Simplicity First. Noted here so the gap is explicit.
- The two follow-up cycles (craft-layer refactor, design-review sharpening) are separate tasks.

## 4. Key Design Decisions

### D1 — Where the record and prevention land (durability vs graveyard vs contract conflict)
- **Problem:** a break-loop prevention pays off only if future work *reads* it. Where do the *record* and
  *prevention* go in a stateless skill that freezes the 8-section design doc and makes F consolidation surgical?
- **Options:** (a) **record** the three-field retrospective in the **closeout report** (F commit body / PR
  description) and reference it from the closure block; **drive the prevention** onto the smallest already-read
  surface (regression test preferred, else `_engineering-norms_` / skill guardrail). (b) a design-doc
  subsection. (c) a `docs/retrospectives/` archive.
- **Choice: (a).** Rationale: (b) violates two frozen contracts — the "all 8 required sections" self-check and
  the surgical F-consolidation rule. (c) is the write-only graveyard. (a) reuses an existing contract-compatible
  home and honors break-loop's *durable **and** discoverable* insight.

### D1b — How the prevention lands: an operational test (no smuggle, no hidden cycle)
- **Problem:** (i) a CLAUDE.md `_engineering-norms_` line is **itself load-bearing = Full Mode** here — landing
  it inline would smuggle a second Full cycle into closeout; (ii) any artifact added to the closing commit
  **after** the F step-6 review has already run enters unreviewed, bypassing the fresh-eyes gate.
- **Options:** (α) land every prevention inline; (β) always defer every prevention; (γ) **land via own tier +
  own review, else defer — governed by a sharp operational test.**
- **Choice: (γ), with this operational test.** **If the landing surface is any `_load-bearing-docs_` file
  (CLAUDE.md, SKILL.md, a reference, a schema/contract) → always defer as a `finding`** (a separate task with
  its own tier + review). **Only a new `tests/scenarios/` fixture or a pure test file may land inline** — and
  on the **deadlock path** only if produced **before** the L3/closeout review that will cover it. On the
  **F-systemic path** the trigger fires *because* the step-6 review already ran, so nothing can be
  "produced before" it: an F-path prevention therefore **always** takes its own None/Light review or defers —
  never added post-review to the current closing commit. Rationale: (α) bypasses review / smuggles a Full edit
  (rejected round-1 & round-2); (β) is toothless (collapses to today's bare issue); (γ) preserves the
  fresh-eyes invariant while still landing cheap test-shaped preventions. The **three-field record is written
  to the closeout report regardless**, so even a deferred prevention beats today's bare issue (it carries the
  class + designed prevention + target surface). The retrospective is **additive**: severe → blocking
  instance-fix still required; general → still recorded/fixed-or-deferred.

### D2 — Trigger condition and the subject-partition that keeps it non-duplicative
- **Problem:** every-fix is ceremony; "≥2 fix rounds" over-fires (under two-generation any fixed Phase needs
  `round > 1` to close — `schemas.md` — so ≥2 rounds is the *ordinary healthy path*); "recognized a prior
  class" is untestable under statelessness. And a deadlock can be **both** a task-domain class *and* a
  skill-process gap — a naive either/or double-handles.
- **Options:** (a) **two observable within-invocation events, partitioned by *subject***: **(i)** a round-cap
  **deadlock** whose **surviving** unresolved **failure is a task-domain class of bug**, evaluated at
  "Returning from escalation" (a deliverable dropped via option (c) or redesigned-away via option (a) leaves no
  surviving class → no trigger); **(ii)** the **F step-6** review finds a **systemic (non-local) cause**.
  (b) also "≥2 fix rounds". (c) also "recalls a prior class".
- **Choice: (a).** Rationale: both events are discrete, observable **within the current invocation**, and
  already produced by the skill. **Subject partition:** Meta-test files a repo issue about the **skill-rule
  gap**; the retrospective lands a prevention for the **task-domain class** — *different subjects*. A deadlock
  that is both fires **both** (correct, not duplicative — different subjects). A deadlock that is *only* a
  skill-process gap fires **only** Meta-test (the retrospective **skips** — fixture 2 guards this boundary).
  **Self-hosted note:** here the task domain *is* the skill, so both surfaces can be skill files; the partition
  still holds because it is by *subject* (a rule-clarity gap vs a behavioral defect), not by file. "Task-domain
  class" is judged at return time against the reference's stated test (a concrete recurring defect *pattern* in
  the product/domain that survived, independent of skill-rule ambiguity). Rejected (b): over-fires; (c):
  untestable.
- **Why four single-scenario fixtures:** the two trigger paths are structurally different, and the two headline
  safety invariants — the **dedup boundary** (skill-process-only → skip) and **non-displacement / no-smuggle** —
  are the highest-risk logic; each earns one concrete, compound-assertion fixture (an OR-scenario would
  reliably exercise none).

### D3 — SKILL.md surface (anti-bloat) vs consistency-gate pairing (drift protection) — two separate decisions
- **Decision (1) — no SKILL.md token.** A conditional, rarely-firing trigger does not earn always-loaded
  surface, and a SKILL.md token spends scarce headroom (2878/2888). It is reached through the **existing**
  routing rows ("Close out the task → end-to-end-review.md"; "Encounter ambiguity/deadlock →
  escalation-rules.md"), already open when a trigger fires. **Zero SKILL.md words.**
- **Decision (2) — a reference-only paired token on a *distinctive* literal.** A reference-only pairing costs
  zero SKILL.md words (matching existing `fixApplied` / `fix(phaseN-roundR)` pairings). The token **must not be
  a substring of the file path** or a bare cross-link satisfies it (round-3 finding). So the token is the
  underscore anchor **`failure_retrospective`**, which appears only in the actual trigger prose / decision
  emission — presence therefore implies hook presence. Paired across all four reference sites (incl.
  `light-mode.md`, so the Light clause is gate-protected too).

### D4 — Plug into existing sites vs a new standalone gate
- **Choice: (a) enhance the two existing sites.** Surgical Changes — both already own the triggering signals;
  the D2 subject-partition keeps it additive. Rejected (b) standalone gate: duplication + bloat.

## 5. Dependencies and Assumptions

- Depends on in-place mechanisms: the round-cap deadlock report, "Meta-test the cap", "Returning from
  escalation", and the round-cap pattern-check (`escalation-rules.md`); the F step-6 review verdict and its
  severity routing (`end-to-end-review.md`).
- Assumes the two gates + the behavioral-scenario discipline are the acceptance surface (no unit-test suite).
- Assumes the test suite and `_engineering-norms_` are the "already-read" surfaces (stateless analog of
  Trellis's injected spec).
- **No `l3-phase.js` change** — the trigger rides on deadlock/F verdicts the script already surfaces. No
  external systems, no new data formats.

## 6. Relationship with Existing Designs

- Extends `docs/design/2026-06-22-f-phase-project-closeout.md`: a **conditional, additive** trigger inside F
  step-6 handling; does not alter the always-run B1–B5 gates or step-6 severity routing — orthogonal, no
  conflict. Dedups against `escalation-rules.md` "Meta-test the cap" by the **subject partition**. Terminology
  anchors: `SKILL.md`, `references/escalation-rules.md`, `references/end-to-end-review.md`, CLAUDE.md
  _engineering-norms_. First design covering cross-task learning; no superseding relation.

## 7. Acceptance Criteria (measurable / automatable — each cites a literal grep anchor)

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0. Grep the script for a
   `require "failure_retrospective"` line pairing that **underscore** literal across `failure-retrospective.md`,
   `escalation-rules.md`, `end-to-end-review.md`, `light-mode.md`. The four fixture `-f` checks fall **between**
   the `if [ -d tests/scenarios ]` line and its closing `fi` (line-range inspection).
2. **Portability & anti-bloat:** SKILL.md `wc -w` is unchanged by this task (no SKILL.md edit); the gate exits 0
   on a tree with no `tests/scenarios` dir (both new checks inside the guard). The paired token is
   `failure_retrospective` (underscore), verified **not** to match the path by: `grep -c "failure_retrospective"
   references/end-to-end-review.md` counts only real hook occurrences, and the path string
   `references/failure-retrospective.md` does not contain the underscore literal.
3. `references/failure-retrospective.md` contains these literal anchors (grep each): `failure_retrospective`,
   `prevention_disposition`, `subject-partition`, `class-prevention`, `_load-bearing-docs_` (the D1b
   operational test), and the four fixture filenames.
4. The four `tests/scenarios/*.md` fixtures exist, each pinning one scenario with the compound `expected` in
   Deliverable §2, and each runs green against the modified skill via a fresh subagent — in particular fixture
   3 asserts closure is still blocked pending the instance-fix (non-displacement) and fixture 4 asserts the
   load-bearing prevention is `deferred`, not landed inline (no-smuggle).
5. Grep-level hook checks (literal targets): `escalation-rules.md` contains `failure_retrospective` under a
   "Returning from escalation" trigger scoped to a round-cap deadlock and the word `additive`;
   `end-to-end-review.md` step 6 contains `failure_retrospective` and `additive`; `light-mode.md` contains
   `failure_retrospective`; CLAUDE.md contains `failure_retrospective` and the four fixture names.
6. `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js`
   exits 0 (regression guard; untouched this task).

Quality budget: N/A — no user-facing behavior, hot path, or interface surface. Explicitly excluded per §3.

## 8. Risks and Rollback

- **Risk: heavy ritual.** Mitigation: three-field record + two-event trigger; fixture 2 guards over-triggering.
- **Risk: hidden second cycle / unreviewed artifact.** Mitigation: D1b(γ)'s operational test (load-bearing
  surface → always defer; only a test/fixture may land inline, deadlock-path pre-review only); fixture 4
  behaviorally verifies the deferral.
- **Risk: non-displacement violated (a prevention discharges a severe instance).** Mitigation: additive rule in
  Deliverable 3 + D1b; fixture 3 verifies closure still blocks pending the instance-fix.
- **Risk: deadlock double-handling with Meta-test.** Mitigation: D2 subject partition; fixture 2 guards the
  skill-process-only skip; trigger runs only after escalation return with a surviving task-domain class.
- **Risk: silent drift of a trigger hook.** Mitigation: the **distinctive** `failure_retrospective` paired
  token (not path-satisfiable) red-fails the gate if a hook is dropped, across all four sites incl. light-mode.
- **Risk: gate false-fail on the packaged copy.** Mitigation: fixture checks inside the `[ -d tests/scenarios ]`
  guard (the already-fixed pattern from commit `36c14fa`).
- **Rollback:** additive Markdown + four fixtures + gate lines. No migration, no persisted state. Revert the
  branch. Reversible by construction.
