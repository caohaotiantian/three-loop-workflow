# Design: A Spike/Experiment Branch of the Evidence Rule (measurable-by-running questions)

```
Status: closed
Closing-commit: 3506c5e
Closed-on: 2026-07-08
Deferred: none
```

Task slug: `2026-07-08-spike-branch`
Tier: **Full Mode** (edits the load-bearing L1 Evidence Rule: `loop-1-design.md`, `escalation-rules.md`).
Provenance: Wave 2b of the approved audit backlog (`memory/improvement-waves-plan-2026-07-07`) — finding B2,
ported from mattpocock `prototype`.

## 1. Background and Purpose

The Evidence Rule (`loop-1-design.md:44`, Wave 2's L1 addition) is **binary**: a **repo-answerable fact** is
looked up; a **product/scope/risk decision** is escalated to the user. But some L1 design-input questions are
**neither** — they are answerable *only by running a quick experiment*: "does the vendor SDK actually support
the streaming mode we need?", "what shape does this third-party payload really take?" (both answered by a tiny
throwaway probe that is obviously not the deliverable — the clean cases), or "can approach X clear the declared
p99 budget?" (the *hard* case, handled by D2's throwaway bound + D1's quality-budget alternative). These are
**measurable facts, not preferences** — the user cannot answer them by judgment any better than the agent can,
and the repo does not yet contain the answer.

Today an agent facing such a question has only two bad options: **assume** feasibility (a silent default that
violates Think Before Coding), or **escalate** it to the user (who would have to run the same experiment). The
right tool — a **spike**: throwaway code that answers the question, whose *only durable output is the answer*
(mattpocock `prototype`: *"A prototype is throwaway code that answers a question… The answer is the only thing
worth keeping… Capture it somewhere durable along with the question it was answering."*) — has no home in the
skill.

This fits three-loop's shape **unusually** well: *delete the code, keep the answer in the design doc, git is
the memory* is exactly the stateless model. The risk to manage (and the reason it is tightly bounded below) is
that a spike must **not** be over-read as license to code before design.

## 2. Deliverables

- [ ] **Spike branch** added to the Evidence Rule (`references/loop-1-design.md` pre-step B): a **third
      category** — a question answerable only by *running* (feasibility / performance / a real external
      payload's shape), which is *neither* a repo-answerable fact *nor* a product/scope decision. For such a
      question, run a **spike**, under these **tight bounds** (all load-bearing): (a) the spike is **throwaway
      and marked so from the first line**, and is **run in an ephemeral isolated worktree and deleted after** —
      reusing the existing E2E isolated-spawn machinery (`loop-3-development.md` "Isolated spawn procedure":
      `git worktree add` … `git worktree remove --force` + `rm -rf`), so deletion is *mechanical*, not agent
      self-discipline in the main tree; (b) its **only durable output is the answer + the question it
      answered**, recorded in the design doc's **Key Design Decisions (§4)** (the decision the spike informs) or
      **Dependencies and Assumptions (§5)** — git is the memory; (c) it stays **bounded to the specific
      measurable question** — the positive rule is *record the answer, then design*; a spike does not authorize
      starting the deliverable, and design still gates L3 (the 8-section doc is written *after* the spike
      answers, using the real number). **Zero-install fallback:** where no *runner* (SDK/harness) exists, the
      experiment degrades to a manual one-shot, **but the worktree isolation + mechanical delete of bound (a)
      still hold** (git is always available — only the runner degrades, not the containment); the spike is never
      skipped back to assume/escalate. Carry the paired token `spike_answer`.
- [ ] **Rationalization row** in `references/escalation-rules.md` "Rationalizations": *"I'll just build the
      real thing to see if it works"* → Reality: a spike is **throwaway** — its *answer* (not its code) is the
      durable output, recorded in the design doc; building the deliverable is L3, *after* the design closes.
      Coding the real thing to answer a feasibility question is the design-before-code violation the spike's
      throwaway bound prevents (`spike_answer`, loop-1-design.md Evidence Rule).
- [ ] Behavioral fixture `tests/scenarios/l1-evidence-rule-spike-runs-experiment.md` (the **family** prefix —
      the spike is the third value of the same routing key) — an L1 feasibility question that is neither a repo
      fact nor a product decision (e.g. "does the vendor SDK support the streaming mode we need?"). Four-way
      discrimination: the wrong options are **assume it works** (silent default), **escalate to the user** (who
      cannot answer a measurable question by judgment), and the over-reach **start building the real
      implementation**. Correct = run a **marked-throwaway spike** (ephemeral worktree), record the answer in
      the doc, delete the spike code, then design. `expected: {"evidence_rule":"spike"}` — the same routing key
      as its siblings (`look-up` / `escalate`), not a new key.
- [ ] `check-consistency.sh`: add the paired token `spike_answer` (across `loop-1-design.md` ↔
      `escalation-rules.md`) + register the fixture by **adding it to the existing `l1-evidence-rule-*` fixture
      loop** (family-consistent), not a new block.
- [ ] CLAUDE.md _common-commands_ gate description reconciled to name the `spike_answer` token and update the
      stale "**two** `tests/scenarios/l1-evidence-rule-*.md` fixtures" count to **three**.

## 3. Scope Boundary (NOT in scope)

- **No change to the fact/decision branches** of the Evidence Rule — the spike is an *additional* third
  category for measurable-by-running questions; facts still get looked up, decisions still escalate.
- **No new L3 activity / no relaxation of "design before code"** — the spike is an L1 *design-input* activity;
  its throwaway bound + the "design gates L3" clause keep it from becoming implementation. The 8-section doc is
  still written before L3.
- **No spike-artifact management, no `spikes/` directory, no persistence** — the code is deleted; only the
  answer (in the doc) survives (git = memory). No new infra.
- **No SKILL.md surface change** — the branch lives in `references/`. `wc -w` unchanged.
- Waves 3-4 are separate.

## 4. Key Design Decisions

### D1 — A third Evidence-Rule category vs forcing spikes into fact/decision
- **Problem:** a feasibility question is neither a repo fact nor a preference; the binary rule mis-routes it
  (assume, or escalate-to-a-user-who-must-run-it).
- **Options:** (a) add an explicit **third category** (measurable-by-running → spike); (b) stretch "fact" to
  include "run to find out" (a fact you produce); (c) leave it — escalate all such questions; (d) **do not run
  code at L1 at all** — declare the feasibility target as a measured quality-budget Acceptance Criterion
  (`loop-1-design.md:74-82` already mandates this for hot-path changes) and let the existing L3 E2E behavior
  gate + design-conflict rollback (`loop-3-development.md:132`, main-agent "return to L1/L2" :98) measure it and
  roll back on a miss.
- **Choice: (a).** Rationale: the routing is genuinely three-way, and naming the third category is what makes
  the spike tool reachable and its bounds statable. (b) muddies the clean "look up an *existing* fact" rule and
  hides the throwaway/answer-only discipline a spike needs. (c) is the current bad state (escalating a
  measurable question wastes the user and often just bounces back). (d) is the closest real alternative and is
  **right for a *known* target you can already name as a budget** — but it is the wrong tool for an *unknown-
  feasibility* question: deferring the measurement to L3 means designing (§4 decisions) and building (L2→L3)
  around approach X, then discovering at L3 that X can't clear the budget → an expensive full-cycle rollback. A
  spike fails **cheaply, before** the design commits to X; the quality budget then *records* the spike's answer
  as the AC. So (a) and (d) compose — the spike answers "can X work?", the budget AC then guards it. Rejected
  (b)/(c); (d) subsumed as the downstream half.

### D2 — The throwaway + answer-only bounds are load-bearing (the over-reading guard)
- **Problem:** the real risk is a spike read as "code the real thing before designing", undercutting the
  skill's core discipline.
- **Choice:** three bounds are stated as load-bearing, not advisory — throwaway-and-marked, answer-only-durable
  (in the doc), and bounded-to-the-question (design still gates L3). The rationalization row and the fixture's
  "start building the real implementation" wrong-option pin the guard. Rejected: a soft "prefer to keep it
  small" note (the audit explicitly warned this must be tight).

### D3 — Fixture discriminates on THREE wrong options, not one
- **Choice:** the fixture must separate the spike from *both* mis-routings (assume; escalate) *and* the
  over-reach (build the real thing). The correct `{"evidence_rule":"spike"}` is reachable only by recognizing the
  question is measurable (not a fact to look up, not a decision to escalate) *and* honoring the throwaway bound
  (not starting the implementation). Rejected: a two-option fixture (would not test the over-reach guard, the
  whole risk of this feature).

## 5. Dependencies and Assumptions

- Depends on the existing Evidence Rule (`loop-1-design.md:44`) and the Rationalizations table.
- Assumes the E2E/spike tooling to *run* an experiment exists per project (the skill states the discipline, not
  a runner — consistent with how the E2E gate bakes in no project launch constants).
- No external systems; no control-flow change; stateless.

## 6. Relationship with Existing Designs

- Extends the Evidence Rule (`loop-1-design.md`, `2026-07-07-l1-review-sharpening`) with a third category, and
  the Rationalizations table (`escalation-rules.md`). Complements — does not alter — the fact/decision branches
  and the "design before code" discipline (the throwaway bound preserves it). Terminology anchors:
  `loop-1-design.md` Evidence Rule, `escalation-rules.md` Rationalizations, SKILL.md §0.1 Think Before Coding.

## 7. Acceptance Criteria (measurable / automatable)

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0 with `require "spike_answer"` pairing
   `loop-1-design.md` ↔ `escalation-rules.md`, and the fixture existence-checked inside the `[ -d tests/scenarios ]`
   guard. SKILL.md `wc -w` unchanged (no SKILL.md edit).
2. `references/loop-1-design.md` Evidence Rule contains the spike branch with the literal `spike_answer` and the
   three bounds — grep `spike_answer`, `throwaway`, a **delete** clause (`git worktree remove` / "deleted
   after"), and a design-gates-L3 / "not the implementation" phrase; the answer's home section (§4/§5) is named.
3. `references/escalation-rules.md` Rationalizations contains the "build the real thing" row carrying
   `spike_answer`, stated with the positive rule dominant (record-the-answer-then-design), per the
   negation→positive check (grep).
4. `tests/scenarios/l1-evidence-rule-spike-runs-experiment.md` exists with `expected: {"evidence_rule":"spike"}`
   (the sibling routing key, not a new key) and runs green via a fresh subagent, constructed so it discriminates
   the spike from **all three** wrong options (assume / escalate / build-the-real-thing), per D3. It is
   registered in the existing `l1-evidence-rule-*` gate loop.
5. CLAUDE.md names the `spike_answer` token and updates the `l1-evidence-rule-*` fixture count from two to
   three (grep).
6. `check-workflow-syntax.sh` on `l3-phase.js` exits 0 (regression guard; untouched).

Quality budget: N/A — process change to a skill.

## 8. Risks and Rollback

- **Risk: over-read as license to code before design (the core risk).** Mitigation: D2 — the throwaway +
  answer-only + bounded-to-the-question bounds are load-bearing; the rationalization row and the fixture's
  "build the real thing = wrong" option pin the guard.
- **Risk: it reads-well but changes nothing.** Mitigation: the fixture forces the three-way discrimination
  (measurable question → spike, not assume/escalate/build), a decision a rule-less agent plausibly gets wrong.
- **Risk: spike scope creep (a "spike" that quietly becomes the implementation).** Mitigation: the
  answer-only-durable + delete-the-code bounds; design still gates L3.
- **Rollback:** revert the branch. Doc branch + one rationalization row + one fixture + gate lines. No control
  flow, no state. Reversible.
