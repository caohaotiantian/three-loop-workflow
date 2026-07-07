# Design: L1 Evidence Rule (exhaust repo evidence before escalating a question)

```
Status: closed
Closing-commit: <CLOSING_SHA>
Closed-on: 2026-07-07
Deferred: none  (Red-Flags checklist was descoped in L1 — see the scope note below, not a deferred item)
```

Task slug: `2026-07-07-l1-review-sharpening`
Tier: **Full Mode** (edits the load-bearing three-loop skill: `references/loop-1-design.md` + `escalation-rules.md`).
Provenance: Cycle 3 of `docs/analysis-2026-07-07-external-skills-comparison.md` (backlog item #6). Ported from
Trellis `trellis-brainstorm`'s Evidence Rule.

> **Scope note (post-L1-round-1).** The initial draft also imported a "Red-Flags checklist" (backlog #7). L1
> review found it duplicated the existing review-template step-4 audit checks and could not be cleanly
> instrumented as a behavior change. Per Simplicity First it is **dropped** from this cycle (recorded as a
> deferred backlog item). This design now covers the **Evidence Rule only** — a coherent, fully-testable
> subsystem.

## 1. Background and Purpose

The L1 loop is the highest-leverage gate (a design defect propagates to L2/L3). L1 pre-step B ("Confirm intent
before drafting") tells the agent to ask clarifying questions and present candidate approaches, but it does
**not** tell it to *exhaust repo evidence first*. Trellis's brainstorm makes this non-negotiable: *"If a
question can be answered by exploring the codebase, explore the codebase instead… Do not ask the user to
confirm facts the repository can answer."*

Two failure directions result from the gap, and this design guards **both**:
- **Over-asking** — the agent escalates a question the codebase already answers, wasting the user's attention
  and inviting a rubber-stamp "confirmation" of a fact that was never a real decision.
- **Under-asking** — the inverse, and the more dangerous one: an agent rationalizes a genuine product / scope /
  risk **decision** as "a fact the repo answers", then silently resolves it — the exact silent-default failure
  `escalation-rules.md` already forbids ("deferring an interpretation decision… is forbidden").

If we do not do this: L1 produces false escalations *and* opens a new rationalization surface ("the repo can
answer this") for silent decisions — both first-order quality losses at the highest-leverage loop.

## 2. Deliverables

- [ ] **Evidence Rule** added to `references/loop-1-design.md` "L1 pre-step B": before escalating any clarifying
      question, the agent first tries to answer it from the codebase + existing `docs/design/` + CLAUDE.md. A
      **repo-answerable fact** is looked up, not asked; only a genuine **product-intent / preference / scope /
      risk-tolerance decision the repo cannot answer** is put to the user. Carries the distinctive literal
      token `evidence_rule` (underscore — not a substring of any fixture filename). Cross-links to **both**
      `escalation-rules.md` clauses it abuts: "Question quality requirements" (*how* to ask) **and** the
      forbidden-deferral clause "deferring an interpretation decision to the L1 reviewer… is forbidden" (the
      existing rule that decisions must reach the user), which is what makes the fact/decision boundary crisp.
- [ ] **Rationalization-table row** added to `references/escalation-rules.md` "Rationalizations — recognize and
      stop": *"I'll just look this up / the repo can answer this"* → Reality: a genuine product/scope/risk
      **decision** is not a repo-answerable fact; look up facts, **escalate decisions** (`evidence_rule`,
      loop-1-design.md pre-step B). This guards the under-asking direction.
- [ ] Two behavioral fixtures, each forcing a discrete look-up-vs-escalate choice from an explicit menu
      (mirroring `quickly-add-is-full.md`'s forced pick):
      1. `tests/scenarios/l1-evidence-rule-lookup-not-ask.md` — an **escalation-tempting** question that is
         actually a repo-answerable fact → `expected: {"evidence_rule":"look-up"}`.
      2. `tests/scenarios/l1-evidence-rule-decision-still-escalates.md` — a question dressed as a "fact" that is
         really a genuine product/scope decision the repo cannot answer → `expected: {"evidence_rule":"escalate"}`
         (guards under-asking).
- [ ] `check-consistency.sh`: pair the token `evidence_rule` across `references/loop-1-design.md` ↔
      `references/escalation-rules.md` (both must carry it — a dropped clause on either side red-fails the
      gate); register the two fixtures for existence **inside the `[ -d tests/scenarios ]` guard**.
- [ ] CLAUDE.md _common-commands_ gate description reconciled to name the new paired token + the two fixtures.

## 3. Scope Boundary (NOT in scope)

- **No SKILL.md surface change** — additions live in `references/loop-1-design.md` + `escalation-rules.md`,
  reached via existing routing rows. SKILL.md `wc -w` unchanged.
- **No Red-Flags checklist** (dropped, see scope note; deferred backlog).
- **No change to pre-step A** (the Explore sweep), the 8 required sections, or the ReviewVerdict schema /
  severity classes.
- **No new persistence/state.** Stateless as ever.
- Cycle 2 (craft-layer meta-model / `_Avoid_` synonym guards) is a separate deferred backlog item.

## 4. Key Design Decisions

### D1 — Evidence Rule placement: pre-step B, cross-linked to two escalation clauses
- **Problem:** the rule governs *whether* a question is escalation-worthy; where does it live to fire at
  question-formation time without duplicating escalation-rules?
- **Options:** (a) in `loop-1-design.md` pre-step B (where clarifying questions are formed), cross-linked to
  escalation-rules; (b) in `escalation-rules.md`; (c) both, duplicated.
- **Choice: (a).** Rationale: the rule must fire *before* a question is formed — pre-step B's moment.
  escalation-rules governs *how* to ask and forbids silent deferral once you've decided a decision exists; the
  Evidence Rule decides *whether* the thing is a fact (look up) or a decision (escalate). Placing it at
  question-formation (a) with cross-links to both abutting escalation clauses keeps each home single-purpose.
  (b) fires too late; (c) duplicates. Rejected (b)/(c).

### D2 — Instrument BOTH failure directions (not just over-asking)
- **Problem:** the risky direction is *under-asking* (guessing a real decision, calling it a fact). A single
  "look-up-not-ask" fixture would leave that untested and would half-verify the rule.
- **Options:** (a) one fixture (lookup case only); (b) **two fixtures** (lookup case + the inverse
  decision-still-escalates case) **plus** a rationalization-table row guarding the under-asking surface.
- **Choice: (b).** Rationale: the Evidence Rule opens a new rationalization ("the repo can answer this"); the
  discipline requires that new surface be guarded (a rationalization row) and behaviorally tested in the
  direction that matters (the inverse fixture). Rejected (a): leaves the dangerous direction unverified.

### D3 — Gate token distinct from any filename (Cycle-1 lesson)
- **Choice:** the paired token is `evidence_rule` (underscore). It is **not** a substring of either fixture
  filename (`l1-evidence-rule-*`, hyphenated) or any path, so a bare fixture/path mention cannot satisfy
  `grep -qF evidence_rule` — presence implies the real clause. Paired across `loop-1-design.md` ↔
  `escalation-rules.md` (both a source and a real second site — genuine two-site protection, not a single-file
  token). Rejected: `evidence-rule` (hyphen) — a substring of the fixture filename, reintroducing the Cycle-1
  false-satisfaction bug.

## 5. Dependencies and Assumptions

- Depends on the existing L1 pre-step B, `escalation-rules.md` "Question quality requirements", the
  forbidden-deferral clause, and the Rationalizations table — all in place.
- Acceptance surface: the two gates + the behavioral-scenario discipline (no unit suite).
- No `l3-phase.js` change; no external systems.

## 6. Relationship with Existing Designs

- Extends `references/loop-1-design.md` (pre-step B) and `references/escalation-rules.md` (Rationalizations
  table). Complements, does not conflict with, the existing "Question quality" and forbidden-deferral clauses
  (Evidence Rule = whether to ask; those = how / that decisions must reach the user). The magic-number
  escalation row ("cite an existing constant… if none exists, AskUserQuestion") already sets the same
  fact-first precedent, so this generalizes an established pattern. First design covering an Evidence Rule.
  Terminology anchors: `loop-1-design.md`, `escalation-rules.md`, SKILL.md §0.1 (Think Before Coding).

## 7. Acceptance Criteria (measurable / automatable)

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0 with a `require "evidence_rule"` line
   pairing the token across `loop-1-design.md` and `escalation-rules.md` (grep the script), and the two
   fixtures existence-checked **inside** the `[ -d tests/scenarios ]` guard (line-range inspection). SKILL.md
   `wc -w` unchanged (no SKILL.md edit).
2. `references/loop-1-design.md` pre-step B contains the literal `evidence_rule` clause stating a repo-answerable
   fact is looked up (not asked) while a genuine decision is still escalated, with cross-links to both named
   escalation clauses (grep for `evidence_rule` and the two clause names).
3. `references/escalation-rules.md` Rationalizations table contains the new row keyed on the "repo can answer
   this" excuse and carries the `evidence_rule` token (grep).
4. Both fixtures exist, each forcing a discrete choice from an explicit menu with `expected:` tokens
   `{"evidence_rule":"look-up"}` and `{"evidence_rule":"escalate"}` respectively, and each runs green via a
   fresh subagent. The lookup fixture is escalation-tempting (a rule-less agent would plausibly ask); the
   escalate fixture is fact-dressed (a rule-less agent might wrongly look it up).
5. CLAUDE.md names the new paired token + the two fixtures (grep).
6. `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js`
   exits 0 (regression guard; untouched).

Quality budget: N/A — process/docs change to a skill; no user-facing behavior/hot-path/interface. Excluded.

## 8. Risks and Rollback

- **Risk: Evidence Rule mis-read as "never ask the user" (over-suppression).** Mitigation: the clause keeps
  asking for genuine product-intent/preference/scope/risk decisions; the `decision-still-escalates` fixture
  pins that behavior.
- **Risk: under-asking (guess a decision, call it a fact).** Mitigation: the rationalization-table row + the
  `decision-still-escalates` fixture guard exactly this direction.
- **Rollback:** additive prose + two fixtures + gate lines. Revert the branch. Reversible.
