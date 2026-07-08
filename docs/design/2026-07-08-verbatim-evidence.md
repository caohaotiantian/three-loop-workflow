# Design: Verbatim-Evidence Standard for External/Technical Claims in Design Docs (A2)

```
Status: closed
Closing-commit: <CLOSING_SHA>
Closed-on: 2026-07-08
Deferred: none  (Wave 3 A3 data-shape heuristic + B3 negative-space assessed separately — see scope note)
```

Task slug: `2026-07-08-verbatim-evidence`
Tier: **Full Mode** (edits the load-bearing L1 design authoring + review template: `loop-1-design.md`,
`escalation-rules.md`).
Provenance: Wave 3 of the approved audit backlog (`memory/improvement-waves-plan-2026-07-07`) — finding A2,
ported from Trellis `research.md` (the verbatim-snippet evidence rule + hedge-phrase blacklist).

## 1. Background and Purpose

The Evidence Rule governs *whether* to look up / escalate / spike a question; the spike governs *running* to
find out. Neither governs the **form of a stated fact** once it lands in the design doc. So a design doc can
assert an **external/technical claim** — "the vendor API returns results already sorted by created-at", "this
callback fires synchronously", "the client dedups on `id`" — **as settled fact with no source**, and that
unverified (often hallucinated) claim then propagates into L2 Phase plans and L3 code as if it were
established. The **most dangerous** form is not the hedge but the *confident* unevidenced assertion: a hedge
("*probably* retries") at least advertises its uncertainty (and if it drives a "so we don't need to X"
decision, the existing silent-default check already catches it), whereas a **confidently-stated** external
claim reads as known and sails through review unchallenged. A2's target is that: *any* external/technical
claim stated as fact must **show its source**. three-loop's whole culture is evidence-grounded (the L3
review reads the diff, not the summary; the closeout pastes real command output) — but the **design doc's own
factual claims** have no such grounding requirement.

Trellis `research.md:84` bans exactly this: *"Banned phrases when not followed by a verbatim snippet: 'it
basically does X', 'typically', 'it models X as Y', 'the architecture looks like', 'likely uses', 'seems to'."*
and `:56`: *"A link and a summary are not research… If the implement agent still has to go clone the repo
itself after reading your context file, you have failed this step."*

This composes with, and does not duplicate, the existing rules: the **Evidence Rule** decides you must find the
fact; the **spike** runs to get it; **section 6** already cites `docs/design/` line numbers for *design
relationships*. A2 adds the missing piece — an **external/technical claim** stated as fact must carry its
**verbatim source** (a `file:line` snippet, or a spike/command-derived value), and an unevidenced claim (confident or hedged) standing in for a
verified fact is a review finding.

## 2. Deliverables

- [ ] **Verbatim-evidence rule** added to `references/loop-1-design.md` — a short authoring rule (near the
      section-4 Key Design Decisions guidance / the self-review traps) and a matching **L1 review-template
      check**: an **external/technical claim** asserted as fact in the design doc (how a caller/library/API
      behaves, a contract shape, a value) must carry its **verbatim evidence**. The **load-bearing new form** is
      a copy-pasted **`file:line` snippet** from the codebase / vendor source for a claim asserted *without* a
      spike; (a spike-/command-derived value with its source is the *already-required* form, per `spike_answer`
      — restated, not new). A claim stated **as settled fact with no verbatim backing is a general issue at L1
      review — whether confidently asserted OR hedged** ("likely / seems to / typically / probably" are one
      *tell*, but a confident unevidenced claim is the more dangerous case). Positive rule: *state the claim,
      then paste its source*. **Reviewer-owned classification** (fresh-eyes, not the author): the L1 **reviewer**
      decides whether a claim is external/technical + load-bearing — mirroring how the tier and `evidence_rule`
      gates are fresh-eyes-enforced, so an author cannot dodge by recasting an API-behavior claim as "intent."
      Carry the paired token `verbatim_evidence` (underscore literal — not a substring of the hyphenated fixture
      path, so a bare cross-link cannot satisfy the gate).
- [ ] **Rationalization row** in `references/escalation-rules.md`: *"the API returns X / the callback is
      synchronous — I'll just state it"* → Reality: a confidently-stated external/technical fact is not evidence;
      paste the verbatim `file:line` source, or **spike** it to get the real value, before stating it as a
      design fact (`verbatim_evidence`, loop-1-design.md). The positive rule (paste the source / spike it) stays
      dominant (negation→positive check). Distinct from the `evidence_rule` row (whether to ask) and the
      `spike_answer` row (don't build the real thing) — this is the *form a stated fact must take*.
- [ ] Behavioral fixture `tests/scenarios/l1-unevidenced-external-claim-needs-source.md` — a design doc's
      Dependencies section states, **as confident settled fact with no source**, a plausible external/technical
      claim that a decision rests on: e.g. *"The `PaymentClient.charge()` callback fires synchronously on the
      calling thread, so our retry wrapper is safe."* It is **not** hedged (so it is not a silent-default
      dodge), and it reads as known — a **rule-less reviewer accepts it** and moves on (the delta). Under A2 the
      L1 review must flag it (general) and **demand the verbatim source** — the SDK signature/docs `file:line`,
      or a spike — because if the callback is actually async the design is wrong. `expected:
      {"verbatim_evidence":"demand-source"}`. Constructed so the flag is attributable to A2 (a confident,
      **not-hedged** technical assertion — load-bearing, but stated as *settled fact*, not a hedged
      decision-dodge, which is what the silent-default check catches). The discriminator is confident-vs-hedged,
      not decisional-vs-non-decisional.
- [ ] `check-consistency.sh`: add the paired token `verbatim_evidence` (across `loop-1-design.md` ↔
      `escalation-rules.md`) + register the fixture (guarded block).
- [ ] CLAUDE.md _common-commands_ gate description reconciled to name the token + fixture.

## 3. Scope Boundary (NOT in scope)

- **No change to the Evidence Rule, the spike branch, or section-6 relationship citations** — A2 is the
  *form-of-a-stated-fact* rule; it composes with (does not replace) whether-to-ask / run-to-find-out /
  cite-design-relationships.
- **Not a gate grep for hedge phrases** — hedge words appear legitimately in non-factual prose; the check is a
  **reviewer lens** (scan the design's *factual claims*), pinned by the fixture, not a mechanical `check-consistency.sh`
  grep over the design doc.
- **No new severity class** — an un-evidenced load-bearing claim is a general (or, if it's a decision-blocking
  contradiction, the existing severe rules already apply); A2 maps to existing calibration.
- **No SKILL.md surface change** — the rule lives in `references/`. `wc -w` unchanged.
- **No A3 (data-shape heuristic) or B3 (negative-space) this cycle** — assessed separately; A2 is the
  clearly-testable, non-duplicative win.

## 4. Key Design Decisions

### D1 — A verbatim-evidence rule for stated facts (vs relying on the Evidence Rule)
- **Problem:** the Evidence Rule ensures you *find* a fact; nothing ensures a *stated* fact in the doc is
  *shown* to be true, so a hallucinated external claim propagates.
- **Options:** (a) add a verbatim-evidence rule + hedge-awareness to L1 authoring + review; (b) rely on the
  Evidence Rule + L2/L3 to catch it later; (c) require verbatim evidence for *every* sentence.
- **Choice: (a).** Rationale: the failure is specifically an *external/technical claim asserted without
  showing its source*, which the Evidence Rule (whether-to-ask) does not cover and which is cheapest to catch
  at L1 (before it seeds L2/L3). (b) defers the catch to where it's expensive (a wrong "fact" already drove a
  Phase plan / code). (c) is ceremony — the rule targets **load-bearing external/technical claims**, not every
  sentence (design intent, rationale, and product decisions are not "facts to evidence"). Rejected (b)/(c).

### D2 — Reviewer lens + fixture, not a gate grep (hedge words are legitimate in prose)
- **Choice:** the hedge-phrase awareness is a **reviewer** signal (scan factual claims), not a mechanical grep,
  because "likely/should/typically" appear legitimately in risk sections, rationale, and non-factual prose — a
  grep would false-flag. The fixture pins the behavior (flag an un-evidenced *load-bearing external claim*
  carried by a hedge). The paired **token** `verbatim_evidence` gates the *rule's presence*, the fixture gates
  its *behavior*. Rejected: a gate grep for hedge words (false-positive storm).

### D3 — Scope to load-bearing external/technical claims (proportionality), reviewer-owned
- **Problem:** how wide should the rule fire without ritualizing every sentence?
- **Options:** (a) **(i) external/technical AND (ii) load-bearing** (a decision or Phase depends on it);
  (b) every external/technical claim regardless of whether a decision hangs on it; (c) every hedge anywhere
  (D1(c)).
- **Choice: (a).** Rationale: (b) fires on incidental technical asides that drive nothing (a background remark
  about how an unrelated module works) — ceremony for no decision risk; (a) targets exactly the claims whose
  wrongness would break a decision or Phase, which is where a hallucinated fact does damage. (c) false-flags
  legitimate hedges in Risk/rationale prose. The **classification is reviewer-owned** (fresh-eyes): the L1
  reviewer, not the author, decides external/technical + load-bearing — so an author cannot dodge by recasting
  an API-behavior claim as "product intent." (The (ii) load-bearing hatch is *acceptable* by design — if
  nothing depends on it, proportionality says don't care.) Rejected (b): over-fires; (c): false-positive storm.

## 5. Dependencies and Assumptions

- Depends on the existing L1 authoring guidance, the L1 review template, and the Rationalizations table.
  Composes with the Evidence Rule + spike branch (Waves 2-3).
- Acceptance surface: the two gates + the behavioral-scenario discipline.
- No external systems; no control-flow change; stateless.

## 6. Relationship with Existing Designs

- Extends `references/loop-1-design.md` (authoring + review template) and the Rationalizations table
  (`escalation-rules.md`). Complements — does not duplicate — the Evidence Rule (`evidence_rule`, whether to
  ask), the spike branch (`spike_answer`, run to find out), and section-6 design-relationship citations.
  Terminology anchors: `loop-1-design.md` Evidence Rule + section 6, SKILL.md §0.1 Think Before Coding. First
  design to require verbatim evidence for a stated external/technical fact.

## 7. Acceptance Criteria (measurable / automatable)

1. `bash three-loop-workflow/references/check-consistency.sh` exits 0 with `require "verbatim_evidence"` pairing
   `loop-1-design.md` ↔ `escalation-rules.md`, and the fixture existence-checked inside the `[ -d tests/scenarios ]`
   guard. SKILL.md `wc -w` unchanged (no SKILL.md edit).
2. `references/loop-1-design.md` contains the verbatim-evidence rule with the literal `verbatim_evidence`, the
   authoring rule (state the claim, then paste its source), and the L1 review-template check; scoped to
   load-bearing external/technical claims (grep `verbatim_evidence` + a "verbatim"/"file:line" phrase +
   "external"/"technical claim").
3. `references/escalation-rules.md` Rationalizations contains the "it probably works like X" row carrying
   `verbatim_evidence`, positive-dominant (grep).
4. `tests/scenarios/l1-unevidenced-external-claim-needs-source.md` exists with `expected:
   {"verbatim_evidence":"demand-source"}` and runs green via a fresh subagent. It is constructed as a
   **confident, not-hedged** external/technical assertion stated as settled fact with no source (load-bearing,
   but confident rather than a hedged decision-dodge — the discriminator vs the silent-default check is
   confident-vs-hedged, not decisional-vs-non-decisional; so the flag is **attributable to A2** — a rule-less
   reviewer accepts the plausible confident claim; only A2 demands the verbatim `file:line` source or a spike).
5. CLAUDE.md names the token + fixture (grep).
6. `check-workflow-syntax.sh` on `l3-phase.js` exits 0 (regression guard; untouched).

Quality budget: N/A — process change to a skill.

## 8. Risks and Rollback

- **Risk: it reads-well but changes nothing.** Mitigation: wired into the L1 review-template check (which the
  reviewer executes) + the fixture pins the demand-source behavior on a confident unevidenced load-bearing claim.
- **Risk: duplicates the Evidence Rule.** Mitigation: §3/D1 — the Evidence Rule is *whether to ask*; A2 is *the
  form a stated fact must take*. Different point in the flow.
- **Risk: over-fires on legitimate hedges (Risk sections, rationale).** Mitigation: D2 (reviewer lens, not a
  grep) + D3 (scoped to load-bearing external/technical claims).
- **Rollback:** revert the branch. Doc rule + one rationalization row + one fixture + gate lines. No control
  flow, no state. Reversible.
