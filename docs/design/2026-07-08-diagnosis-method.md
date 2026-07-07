# Design: A Diagnosis Method for the Fix Corner (ranked falsifiable hypotheses + discriminating evidence)

Task slug: `2026-07-08-diagnosis-method`
Tier: **Full Mode** (edits the load-bearing L3 fix-corner discipline: `loop-3-development.md`, `l3-phase.js`,
`escalation-rules.md`).
Provenance: Wave 2a of the approved audit backlog (`memory/improvement-waves-plan-2026-07-07`) — finding A1,
the one genuine capability gap on which BOTH external skills (mattpocock `diagnosing-bugs`, Trellis
`trellis-break-loop`) independently converged.

## 1. Background and Purpose

The fix corner **demands a root cause but prescribes no method for producing one**:
`loop-3-development.md:85` — *"Fix corner is debugging, not patching: name the root cause of each failing item
before editing … If a failing item has no identifiable cause after investigation, escalate."* It says *name
the cause* but not *how to find it*. `failure-retrospective.md` is explicitly **post-hoc** (turn a fixed class
into a prevention); nothing governs the in-the-moment diagnosis. So an agent under round-budget pressure
anchors on the first plausible theory and patches it — the exact "different item failed each round" churn the
deadlock report tries to detect *after* the cap is already blown (`escalation-rules.md:95`).

Both external skills supply the missing method:
- mattpocock `diagnosing-bugs`: *"Generate 3-5 ranked hypotheses before testing any of them. Single-hypothesis
  generation anchors on the first plausible idea. Each hypothesis must be falsifiable: state the prediction …
  If you cannot state the prediction, the hypothesis is a vibe."* — and the repro-first gate: *"jumping
  straight to a hypothesis is the exact failure this skill prevents. No red-capable command, no Phase 2."*
- Trellis `break-loop`: *"Find evidence that differs strongly between top hypotheses … 'What would I see if H1
  is true but not if H3 is true?'"* and *"Establish priors from current context, not yesterday's bug."*
  (This design keeps the first as the load-bearing **discriminating-evidence** rule and **subsumes** the second
  under it — discriminating evidence inherently reasons from the current failure's observations — rather than
  adding it as a separate, unpinned sub-rule.)

This is the highest-value remaining addition: it is **behavior-changing** (it changes what the fix subagent
*does*) and **testable**, and it directly attacks the round-budget churn the discipline already fears.

## 2. Deliverables

- [ ] **Diagnosis method in the fix corner** (`references/loop-3-development.md`, at the `:85` "Fix corner is
      debugging" paragraph): keep the existing red-repro-first rule (already present: a correctness/behavior
      finding gets a failing reproduction before the fix, `:83`), and add — **when the cause is not obvious
      after the repro** (and do not cheaply *declare* it obvious to skip this — the round-budget-pressured
      escape the method exists to block): the method's **two load-bearing rules**: (1) generate **3-5 ranked,
      falsifiable hypotheses** — each states a concrete prediction; *"if you cannot state the prediction, it is
      a vibe, not a hypothesis"*; (2) seek **discriminating evidence** — the observation that differs between
      the top hypotheses (*"what would I see if H1 is true but not H2?"*) and lets evidence pick the cause,
      rather than confirming the first plausible one. Only then name the cause and fix it. If no hypothesis
      survives its test, escalate (unchanged). Carry the paired token `diagnosis_method`.
- [ ] **Fix-prompt pointer** in `references/l3-phase.js`: the two fix-subagent prompts (review-fix and
      accept-fix) already say "state the root cause of each item before editing"; add a brief clause — "if the
      cause is not obvious, generate 3-5 ranked falsifiable hypotheses and seek discriminating evidence before
      editing (do not anchor on the first plausible theory)". **String literals only; no control-flow change.**
      Carry the paired token `diagnosis_method` in a **JS comment** adjacent to the two fix prompts (not in the
      prompt prose the subagent reads — a bare underscore token would pollute the natural-language prompt; the
      gate's `grep -qF` is satisfied by the comment, matching how other tokens are carried).
- [ ] **Rationalization row** in `references/escalation-rules.md` "Rationalizations": *"the first theory that
      fits is the cause"* → Reality: single-hypothesis anchoring is the top debugging failure; generate 3-5
      ranked **falsifiable** hypotheses and let **discriminating evidence** pick, not the first plausible fit
      (`diagnosis_method`, loop-3-development.md fix corner). **Distinct from** the existing "Quick patch now,
      investigate the cause later" row (that is *skip investigation entirely*; this is *stop at the first
      theory during investigation*) — corroboration; the behavior-bearing surface is the fix **prompt** clause.
- [ ] Behavioral fixture `tests/scenarios/fix-corner-ranks-hypotheses-not-first-theory.md` — constructed so the
      **first plausible theory is the WRONG one**: a non-obvious bug where the immediately-tempting theory (H1)
      would be *refuted* by one cheap discriminating observation, and the real cause (H2) only surfaces if you
      seek that observation. Under deadline pressure the tempting move is to **declare the cause obvious, patch
      H1, and move on** — which produces an **observably-wrong fix** (H1's prediction fails). The correct move
      is to rank falsifiable hypotheses and run the discriminating check, which points at H2. Forced discrete
      choice → `expected: {"diagnosis":"discriminate"}` (vs the wrong `"patch-first-theory"`). This makes the
      fixture a **non-gameable-conformance** proof (the *delta* being the rationale): a rule-less agent following only the pre-edit "state the root cause /
      make the smallest change" prompt plausibly patches H1; the added method is what routes to the
      discriminating check. It also targets the *skip* escape (the pressure is to call it obvious), not an
      agent already listing hypotheses, and pins **falsifiability + discrimination** (H1 must be *refutable* by
      the observation), not a bare count of 3 "vibe" hypotheses.
- [ ] `check-consistency.sh`: add the paired token `diagnosis_method` (across `loop-3-development.md` ↔
      `l3-phase.js` ↔ `escalation-rules.md`) + register the fixture (guarded block).
- [ ] CLAUDE.md _common-commands_ gate description reconciled to name the token + fixture.

## 3. Scope Boundary (NOT in scope)

- **No change to the red→green repro rule** (already present) — the method *builds on* it (repro first, then
  hypotheses if the cause isn't obvious), it does not replace it.
- **No change to the round caps, two-generation, or escalation routing** — the method operates *within* the
  existing fix corner; a surviving-hypothesis-less item still escalates.
- **No control-flow change to `l3-phase.js`** — only the two fix-prompt string literals gain a clause.
- **No new debug-instrumentation tooling** (the audit's "tagged debug logs" B4 idea is a separate, lower-value
  item, not bundled here).
- **No SKILL.md surface change** — the method lives in `references/`. `wc -w` unchanged.
- **No persistence/state.** Stateless. Wave 2b (spike branch) and Waves 3-4 are separate.

## 4. Key Design Decisions

### D1 — Method placement: the fix corner (vs a standalone diagnosing-bugs skill/reference)
- **Problem:** where does the diagnosis method live so it actually changes the fix subagent's behavior?
- **Options:** (a) inline in the fix-corner discipline (`loop-3-development.md`) + the fix prompts; (b) a new
  standalone `references/diagnosing-bugs.md` reference the fix corner points to; (c) a separate user-invoked
  skill (mattpocock's shape).
- **Choice: (a).** Rationale: the fix corner is exactly where "name the root cause" already lives and is
  already under-specified; adding the method *there* (and in the fix prompts the runner actually sends) is what
  changes behavior. (b) is a doc the fix subagent may never open (the reads-well-changes-nothing risk that
  killed earlier standalone references); the method is short enough to inline. (c) is a whole separate skill,
  out of scope for a three-loop discipline rule. Rejected (b)/(c).

### D2 — Gate on "not obvious" (proportionality — don't ritualize simple fixes)
- **Problem:** requiring 3-5 hypotheses for *every* fix is ceremony (a typo fix has an obvious cause).
- **Choice:** the method is gated on **"when the cause is not obvious after the repro"** — an obvious cause is
  named and fixed directly (the existing behavior); the ranked-hypotheses discipline engages only when the
  first theory is *not* clearly right. This matches the existing "name the root cause … one at a time" and
  keeps proportionality (Simplicity First). Rejected alternative (always 3-5): ceremony that gets skipped.

### D3 — Falsifiability + discrimination are the load-bearing parts (proven by a refutation-constructed fixture)
- **Choice:** the count "3-5" is a guardrail against single-hypothesis anchoring, but the *load-bearing* rules
  are **falsifiable** (each hypothesis states a testable prediction — "if you can't predict, it's a vibe") and
  **discriminating** (seek the observation that *separates* the top hypotheses). The fixture proves these — not
  a bare count — by **construction**: the tempting first theory (H1) is made *refutable* by one cheap
  observation and is *wrong*, so the only path to the correct discrete decision (`"discriminate"`) runs through
  genuinely running that discriminating check; an agent that lists three vibe-hypotheses and patches H1 emits
  the wrong decision (`"patch-first-theory"`) and its fix fails H1's prediction. This resolves the
  discrete-field-vs-judgment tension (the discrete decision is forced by a right/wrong outcome, not graded by
  taste) and establishes the behavior **delta** (the pre-edit prompt plausibly patches H1). Rejected:
  a post-edit-only "did it rank hypotheses" assertion (a strong model may rank anyway → no delta proof).

## 5. Dependencies and Assumptions

- Depends on the existing fix corner (`loop-3-development.md:83-85`), the two `l3-phase.js` fix prompts, and the
  Rationalizations table. Builds on the existing red→green repro rule.
- Acceptance surface: the two gates + the behavioral-scenario discipline.
- No external systems; no control-flow change; `review-panel.js`, schemas unaffected.

## 6. Relationship with Existing Designs

- Extends the L3 fix corner (`loop-3-development.md`), the `l3-phase.js` fix prompts, and the Rationalizations
  table (`escalation-rules.md`). Complements — does not duplicate — `failure-retrospective.md` (post-hoc class
  prevention; this is in-the-moment diagnosis) and the red→green repro rule (this adds the hypothesis method
  *after* the repro). Terminology anchors: `loop-3-development.md` fix corner, `escalation-rules.md`
  Rationalizations, SKILL.md §0.4 Goal-Driven Execution. First design to supply a diagnosis *method*.

## 7. Acceptance Criteria (measurable / automatable)

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0 with `require "diagnosis_method"` pairing
   `loop-3-development.md` ↔ `l3-phase.js` ↔ `escalation-rules.md`, and the fixture existence-checked inside the
   `[ -d tests/scenarios ]` guard. SKILL.md `wc -w` unchanged (no SKILL.md edit).
2. `check-workflow-syntax.sh` on `l3-phase.js` exits 0 (the fix-prompt string edits parse; `git diff` shows the
   review/accept loops + counters unchanged — only the two fix-prompt strings + the adjacent `diagnosis_method`
   comment changed). The `diagnosis_method` token is in a JS comment, not the prompt prose (grep confirms).
3. `references/loop-3-development.md` fix corner contains the method with the literal anchors `diagnosis_method`,
   `falsifiable`, and `discriminating` (grep each); it is gated on "not obvious" (grep).
4. `references/escalation-rules.md` Rationalizations table contains the new "first theory that fits" row
   carrying `diagnosis_method` (grep).
5. `tests/scenarios/fix-corner-ranks-hypotheses-not-first-theory.md` exists with the discrete
   `expected: {"diagnosis":"discriminate"}` and runs green via a fresh subagent. It is **constructed so the
   tempting first theory (H1) is refutable and wrong**: patching H1 (`"patch-first-theory"`) yields an
   observably-wrong fix, so the correct decision is reachable only by ranking falsifiable hypotheses and
   running the discriminating check → H2. This makes conformance **non-gameable** — an agent must actually
   discriminate to answer `discriminate` — and pins falsifiability + discrimination, not a bare count. (The
   behavior *delta* — the pre-edit "state the root cause / smallest change" prompt plausibly patches H1 — is the
   design rationale for why this matters; the fixture verifies non-gameable conformance, not an A/B run.) The
   token `diagnosis_method` is not a substring of the fixture filename (underscore vs hyphens).
6. CLAUDE.md names the token + fixture (grep).
7. `check-workflow-syntax.sh` on `review-panel.js` exits 0 (regression guard; untouched).

Quality budget: N/A — process change to a skill.

## 8. Risks and Rollback

- **Risk: the method ritualizes simple fixes (bloat / friction).** Mitigation: D2 gates it on "not obvious"; an
  obvious cause is fixed directly, unchanged.
- **Risk: it reads-well but changes nothing (the earlier failure).** Mitigation: it is wired into the fix
  prompts the runner *actually sends* (not just a doc), and the fixture pins the behavior delta (rank vs
  first-theory) with falsifiability + discrimination as the assertions, per D3.
- **Risk: overlaps the existing red→green repro rule.** Mitigation: §3 — the method *builds on* the repro
  (repro first, hypotheses only if the cause isn't obvious after it); it adds the missing find-the-cause step,
  not a second repro rule.
- **Rollback:** revert the branch. Doc + two fix-prompt strings + one rationalization row + one fixture + gate
  lines. No control-flow change, no migration, no state. Reversible.
