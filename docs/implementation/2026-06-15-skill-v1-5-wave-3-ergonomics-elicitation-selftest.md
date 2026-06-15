# Implementation — v1.5 Wave 3: ergonomics + elicitation + self-testing

**Slug:** `2026-06-15-skill-v1-5-wave-3-ergonomics-elicitation-selftest` (matches the design doc)
**Design doc:** `docs/design/2026-06-15-skill-v1-5-wave-3-ergonomics-elicitation-selftest.md`
**Umbrella:** `docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` (§3, §4b binding)

Executable by a fresh agent. "Tests" are grep/gate/structured-output. TDD order = grep-fails → edit →
grep-passes. **`SKILL.md` is not edited this wave.** Anchors verified absent from baseline. Three phases:
**Phase 1 = Group E** (ergonomics; incl. the only control-flow changes), **Phase 2 = Group F** (elicitation),
**Phase 3 = Group G** (self-testing).

## 1. Task Index

| Phase | Deliverables | Files |
|---|---|---|
| 1 (E) | E-i…E-vi | `schemas.md`, `l3-phase.js`, `loop-3-workflow.md`, `loop-3-development.md`, `loop-1-design.md`, `loop-2-implementation.md`, `escalation-rules.md` |
| 2 (F) | F-i…F-iv | `loop-1-design.md`, `loop-2-implementation.md` |
| 3 (G) | G-i…G-vi | `tests/scenarios/`, `CLAUDE.md`, `check-consistency.sh`, `loop-3-development.md`, `escalation-rules.md`, `loop-1-design.md` |

Paths relative to repo root; skill under `three-loop-workflow/`. Wave base = `9636566`.

## 2. Phase 1 — Group E (ergonomics; control-flow E-i/E-vi)

> **E-i + E-vi rewrite the dev/agent-call region of `l3-phase.js`. Apply the EXACT code below** (do not
> paraphrase control-flow). After editing, `check-workflow-syntax.sh references/l3-phase.js` MUST pass.

**E-i + E-vi exact edits to `three-loop-workflow/references/l3-phase.js`:**

(a) **DEV_SCHEMA** — add two optional properties (keep `required` unchanged):
```js
const DEV_SCHEMA = {
  type: 'object',
  properties: {
    branch:   { type: 'string' },
    baseSha:  { type: 'string' },
    summary:  { type: 'string' },
    conflict: { type: 'boolean' },
    blocked:  { type: 'boolean' },                      // E-i: dev cannot complete (missing context / too hard)
    concerns: { type: 'array', items: { type: 'string' } }, // E-i: low-confidence areas to steer the reviewer
  },
  required: ['branch', 'baseSha', 'summary', 'conflict'],
}
```

(b) **args destructure** — add `models = {}` (E-vi; undefined corners → harness default):
```js
const { phaseLabel, phaseSpec, designDocPath, implDocPath, reviewMode = 'single', panelVoters = 3, models = {} } = args
```

(c) **Dev region** — replace the existing dev call + the guards down to `const baseSha = …` with:
```js
function devPrompt(extra) {
  return `You are the dev subagent for ${phaseLabel}. FIRST, capture the diff base: run ` +
    '`git rev-parse HEAD` BEFORE making any edit and return it as baseSha. Then implement the ' +
    `tasks below in the main working tree (no worktree isolation). Commit your changes to a branch ` +
    `named "${phaseLabel.replace(/\s+/g, '').toLowerCase()}-dev-r1" and return DevResult with the ` +
    `branch name, baseSha, a summary; conflict=true if the design doc conflicts with any task; ` +
    `blocked=true with concerns[] if you cannot complete it (missing context or too hard — do NOT ` +
    `fabricate success); or concerns[] (blocked=false) to flag low-confidence areas for the reviewer. ` +
    // C1 (Wave 2) — RETAINED verbatim; this TDD watch-it-fail directive must NOT be lost in the rewrite:
    `For each new behavior, write its test FIRST and run it to confirm it FAILS for the right reason ` +
    `(feature missing, not a typo/import error) before writing code; note in your summary that you watched each new test fail. ` +
    // E-ii (Wave 3) — pre-handoff self-review pointer (folded into the dev prompt here):
    `Before reporting, self-review your diff against SKILL.md §0.2 (overcomplication) and §0.3 (trace test, ` +
    `no process-narration comments) and confirm each assigned checkbox is done; this self-review does NOT ` +
    `replace the fresh review corner — both run.` +
    (extra ? `\n\n${extra}` : '') +
    `\n\nDesign doc: ${designDocPath}\nImpl doc: ${implDocPath}\n\nPhase tasks:\n${phaseSpec}`
}

let devResult = await tryAgent(devPrompt(''), { label: `dev:${phaseLabel}`, phase: 'Dev', schema: DEV_SCHEMA, model: models.dev })

if (!devResult) return { status: 'agent-error', phaseLabel, round: 0, stage: 'dev', reason: 'dev agent failed after retry' }
if (devResult.conflict) return { status: 'design-conflict', phaseLabel, round: 0, branch: devResult.branch }

// E-i: a BLOCKED dev is re-dispatched AT MOST ONCE (its concerns become added context), then escalated.
// The dev step has no round counter, so this one-retry bound is what stops it becoming an uncounted retry.
if (devResult.blocked) {
  const blockers = (devResult.concerns || []).join('; ')
  log(`${phaseLabel}: dev BLOCKED (${blockers}); re-dispatching once with added context`)
  const retry = await tryAgent(
    devPrompt(`You previously reported BLOCKED on: ${blockers}. Treat this as added context and try once more; if still blocked, return blocked=true again.`),
    { label: `dev:${phaseLabel}:re-dispatch`, phase: 'Dev', schema: DEV_SCHEMA, model: models.dev }
  )
  if (!retry) return { status: 'agent-error', phaseLabel, round: 0, stage: 'dev', reason: 'dev re-dispatch failed after retry' }
  if (retry.conflict) return { status: 'design-conflict', phaseLabel, round: 0, branch: retry.branch }
  if (retry.blocked) return { status: 'dev-escalation', phaseLabel, round: 0, stage: 'dev', concerns: retry.concerns || devResult.concerns }
  devResult = retry
}

if (!devResult.branch) return { status: 'agent-error', phaseLabel, round: 0, stage: 'dev', reason: 'dev agent did not return branch name' }
let devBranch = devResult.branch
const baseSha = devResult.baseSha   // diff base for the review/accept fresh-eyes audit
const devConcerns = (devResult.concerns || []).filter(Boolean)   // E-i: steer the reviewer
```

(d) **reviewPrompt** — append the concerns-steering (E-i) after the existing Wave-1/2 trip-wire/TDD text, before the closing backtick of the last segment:
```js
    (devConcerns.length ? ` The implementer flagged low confidence in: ${devConcerns.join('; ')} — scrutinize these areas first.` : '')
```
(append as a `+ (…)` concatenation onto the `reviewPrompt` chain.)

(e) **E-vi model threading** — add `model: models.<corner>` to every `agent()`/`tryAgent()` opts object:
- dev calls → `model: models.dev` (already in (c)).
- single review (`tryAgent(reviewPrompt, {...})`) → `model: models.review`.
- panel voter `agent(...)` inside `panelReview` → `model: models.review`.
- accept (`tryAgent(... accept ...)`) → `model: models.accept`.
- review-fix and accept-fix `tryAgent(...)` → `model: models.fix` (BOTH fix sites).
(One logical model per corner, applied at EVERY call site of that corner — there are two review sites and two fix sites.)

**E-i `schemas.md` (DevResult)** — add `blocked` and `concerns` to the DevResult JSON properties (mirror (a)); keep `required` as the existing four.

**E-i `loop-3-workflow.md`** — add one Return-values table row: `| 'dev-escalation' | Dev reported BLOCKED twice (after one re-dispatch) | Main agent supplies missing context / a more capable model and relaunches, OR escalates to the user; do NOT compose a deadlock report (no unresolved severe items) |`.

**E-vi `loop-3-workflow.md`** — add one Args-table row: `| models | object, optional | per-corner model override {dev,review,accept,fix}; omit a corner for the harness default. See references/optional-subagents.md for routing rationale. |`.

**E-vi `escalation-rules.md`** — in the deadlock-report options, append to option (b): "; the user MAY also authorize a single retry of the failing Phase with `models:{review|fix: <stronger-model>}` — an explicit user-authorized choice, never an automatic pre-escalation round."

**E-ii `l3-phase.js` dev prompt** (in `devPrompt`, fold into the same string) + **`loop-3-development.md`** dev role Output cell: add the self-review pointer — "Before reporting: self-review your diff against SKILL.md §0.2 (overcomplication) and §0.3 (trace test + no process-narration comments), confirm each assigned checkbox and that each new behavior has a test you watched fail; this self-review does NOT replace the fresh review corner — both run."

**E-iii reviewer calibration** — canonical sentence in `schemas.md` (beside ReviewVerdict): "Calibration: grade by actual severity. A genuine blocker is severe; a real but non-blocking defect is general; an advisory/cosmetic observation is a clarification (note-only). Do not inflate a genuinely-misclassified should-fix item to severe — inflation burns the shared round budget and forces false escalations. This sharpens accuracy; it never lowers a real blocker, and the panel stays ADD-only." Inline one-sentence copy into the L1 review template (`loop-1-design.md`), the L2 review template (`loop-2-implementation.md`), and the `l3-phase.js` review prompt. **No "Strengths" section.** *(For the `l3-phase.js` copy: append it as an additional `+ (…)` string segment onto the `reviewPrompt` chain, alongside the existing Wave-1/2 trip-wires and the E-i concerns-steering — same mechanism as E-i (d). Run `check-workflow-syntax.sh` after.)*

**E-iv three-tier severity** — in `schemas.md` ReviewVerdict, sharpen the field descriptions in place: severe = "blocks advancement: a correctness/contract/core-principle violation or a lost load-bearing rule"; general = "a real, should-fix-this-round defect that is not blocking; counts toward the two-generation rule"; clarifications = "note-only / needs user input; never counted." Add one line: "When unsure between severe and general, it is general."

**E-v verify-by-diff grounding** — one line in each review template (L1 `loop-1-design.md`, L2 `loop-2-implementation.md`, L3 `l3-phase.js` review prompt): "Ground every finding: cite file:line (or section) from the diff/artifact; a pass must name at least one section read in full — verify by reading the diff, not the summary." *(For the `l3-phase.js` copy: append as an additional `+ (…)` string segment onto the `reviewPrompt` chain, same mechanism as E-i (d); run `check-workflow-syntax.sh` after.)*

**Phase-1 ACCEPT-CMD** (all exit 0):
```bash
cd three-loop-workflow
bash references/check-workflow-syntax.sh references/l3-phase.js   # control-flow parses
# E-i wiring
grep -q "blocked" references/l3-phase.js && grep -q "concerns" references/l3-phase.js
grep -q "dev-escalation" references/l3-phase.js
grep -q "re-dispatch" references/l3-phase.js                       # the one-retry bound marker
grep -q "blocked" references/schemas.md && grep -q "concerns" references/schemas.md
grep -q "dev-escalation" references/loop-3-workflow.md
grep -q "conflict" references/l3-phase.js                          # conflict RETAINED (no refactor)
grep -qi "fails for the right reason" references/l3-phase.js       # C1 (Wave-2) TDD directive RETAINED in the rewritten devPrompt (case-insensitive: the verbatim text is "FAILS"); must not be lost
# E-vi wiring (all four corners)
grep -q "models.dev" references/l3-phase.js
grep -q "models.review" references/l3-phase.js
grep -q "models.accept" references/l3-phase.js
grep -q "models.fix" references/l3-phase.js
grep -q "| models |" references/loop-3-workflow.md || grep -q "models (object" references/loop-3-workflow.md
grep -q "retry of the failing Phase" references/escalation-rules.md || grep -q "stronger-model" references/escalation-rules.md
# E-ii / E-iii / E-iv / E-v
grep -q "both run" references/l3-phase.js && grep -q "both run" references/loop-3-development.md
grep -q "do not inflate" references/schemas.md
grep -q "do not inflate" references/loop-1-design.md && grep -q "do not inflate" references/loop-2-implementation.md && grep -q "do not inflate" references/l3-phase.js
grep -q "When unsure between severe and general" references/schemas.md
grep -q "verify by reading the diff" references/loop-1-design.md && grep -q "verify by reading the diff" references/loop-2-implementation.md && grep -q "verify by reading the diff" references/l3-phase.js
# gates / scope
bash references/check-consistency.sh
test "$(ls references/*.md | wc -l)" -eq 12
( cd .. && ! git log --oneline 9636566..HEAD -- three-loop-workflow/SKILL.md | grep . )
```
**Exit:** Phase-1 ACCEPT exit 0; the E-i behavioral half is covered by G-i scenario 4 (Phase 3) + the L3 panel diff-read of this phase.

## 3. Phase 2 — Group F (design elicitation)

**Tasks (each: grep-fails → edit → grep-passes):**
- **F-i:** `loop-1-design.md` — add "## L1 pre-step B: Confirm intent before drafting" after the existing "Understand before designing" pre-step. Gated to under-determined requests (fully-specified or Light-Mode skip): ask clarifying questions one at a time (multiple-choice preferred); present 2-3 candidate approaches with a led recommendation before drafting Key Design Decisions; gate the 8-section draft on confirmed intent. "Question quality and degraded-mode follow references/escalation-rules.md — not restated here." Add one line to procedure step 3 noting its reactive triggers do not substitute for this proactive confirmation. Anchor: "Confirm intent before drafting".
- **F-ii:** `loop-1-design.md` (heading `## Common L1 traps`) and `loop-2-implementation.md` (heading `## Common L2 traps`) — rename each to add "Self-review before spawning the reviewer (free — does not increment {{round}})" and prepend one imperative line: "Before spawning the reviewer, re-read your draft once against this list and fix inline; this pass produces no verdict and never substitutes for the fresh review." Anchor: "Self-review before spawning the reviewer (free".
- **F-iii:** `loop-2-implementation.md` — add one calibration sentence as the first line of "Main agent procedure": "Calibration: write each Phase for an engineer with zero context for this codebase and no view of this session — exact file paths, exact acceptance commands, and the business invariant each test protects. Assume nothing is obvious." + append one "Common L2 traps" bullet: "Placeholder vagueness — 'add validation' / 'handle edge cases' / 'write tests for the above' without naming the case/invariant or supplying the test; a fresh agent cannot act on it." Anchors: "zero context for this codebase", "Placeholder vagueness".
- **F-iv:** `loop-1-design.md` procedure step 3 escalation-signal list — add one bullet: "Multi-subsystem request: the ask spans two or more independently designable and shippable subsystems (one design doc = one coherent subsystem). Escalate the decomposition; run a separate L1→L2→L3→F cycle per subsystem." Anchor: "one design doc = one coherent subsystem".

**Phase-2 ACCEPT-CMD:**
```bash
cd three-loop-workflow
grep -q "Confirm intent before drafting" references/loop-1-design.md
grep -q "Self-review before spawning the reviewer (free" references/loop-1-design.md
grep -q "Self-review before spawning the reviewer (free" references/loop-2-implementation.md
grep -q "zero context for this codebase" references/loop-2-implementation.md
grep -q "Placeholder vagueness" references/loop-2-implementation.md
grep -q "one design doc = one coherent subsystem" references/loop-1-design.md
bash references/check-consistency.sh
test "$(ls references/*.md | wc -l)" -eq 12
( cd .. && ! git log --oneline 9636566..HEAD -- three-loop-workflow/SKILL.md | grep . )
```

## 4. Phase 3 — Group G (skill self-testing)

**Tasks:**
- **G-i:** create **repo-root** `tests/scenarios/` with ≥4 files (`*.md`), each a self-contained pressure scenario (3+ combined pressures, concrete A/B/C, a real-ish file path, "What do you do?") + a final `expected:` line declaring a structured field and value. The four: (1) `quickly-add-is-full.md` → `{"chosen_tier":"Full"}`; (2) `threshold-under-sunk-cost.md` → `{"action":"escalate"}` (with options+recommendation+rationale); (3) `clean-review-after-fix.md` → `{"closes_this_round":false}`; (4) `dev-blocked-bounded.md` → `{"outcome":"bounded-redispatch-then-escalate"}`. Anchor: `tests/scenarios` exists at repo root with ≥4 `.md` files each containing `expected:`.
- **G-ii:** `CLAUDE.md` (repo root) _repo-workflow_ section — add a bullet: "Before merging any edit to the tier table, escalation rules, or termination wording, run the scenarios in `tests/scenarios/` via a fresh subagent and confirm each `expected` holds." Anchor: "tests/scenarios/" in CLAUDE.md.
- **G-iii:** `references/check-consistency.sh` — add `require` pairings for exactly two tokens: `clean-first-round` (SKILL.md ↔ schemas.md) and `fixApplied` (schemas.md ↔ l3-phase.js). Use the script's existing `require` helper form. MUST keep `check-consistency.sh` exit 0. Anchor: `clean-first-round` and `fixApplied` both appear as `require` arguments in the script.
- **G-iv:** `references/loop-3-development.md` Phase-termination conditions — add a bullet: "Skill-self discipline edit: if a Phase edits a discipline rule of THIS skill (a termination condition, escalation trigger, tier boundary, principle, or rationalization counter), the accept step adds a GREEN behavioral check — spawn one fresh subagent with a pressure scenario + the post-edit rule, confirm it complies, and record `Behavioral-check: complied` as a commit trailer." Anchor: "Behavioral-check: complied".
- **G-v:** `references/escalation-rules.md` deadlock procedure — add a bullet: "If the cap was hit because a SKILL rule was unclear, missing, or hard to find (not genuine task difficulty), classify it in one line — clear-but-ignored (discipline gap) / should-have-said-X (doc gap) / didn't-see-section-Y (organization gap) — and open a follow-up issue against the three-loop-workflow repo." Anchor: "discipline gap) / should-have-said".
- **G-vi:** `references/loop-1-design.md` review template audit list — add a conditional bullet: "If the artifact is a discipline-rule edit to the three-loop skill itself (termination / escalation / tier / principle / rationalization rule): do not credit that the rule merely reads correctly — demand a concrete demonstration that the edited rule changes agent behavior (a before/after, or a runnable check). A behavior rule asserted but never observed is a severe issue." Anchor: "asserted but never observed".

**Phase-3 ACCEPT-CMD:**
```bash
# from repo root
test -d tests/scenarios
test "$(ls tests/scenarios/*.md | wc -l)" -ge 4
for f in tests/scenarios/*.md; do grep -q "expected:" "$f" || { echo "missing expected in $f"; exit 1; }; done
grep -q "tests/scenarios/" CLAUDE.md
cd three-loop-workflow
grep -q "clean-first-round" references/check-consistency.sh && grep -q "fixApplied" references/check-consistency.sh
bash references/check-consistency.sh                              # still green after new pairings
grep -q "Behavioral-check: complied" references/loop-3-development.md
grep -q "discipline gap" references/escalation-rules.md
grep -q "asserted but never observed" references/loop-1-design.md
test "$(ls references/*.md | wc -l)" -eq 12                       # no new reference file
test ! -d scenarios                                               # scenarios NOT under three-loop-workflow/ (would ship)
( cd .. && ! git log --oneline 9636566..HEAD -- three-loop-workflow/SKILL.md | grep . )
```

## 5. Behavioral [B] — the standing suite (run at program closeout / EER)

**AC-W3-BEH:** for each `tests/scenarios/*.md`, a fresh subagent is given the scenario + the post-edit skill,
must emit the file's declared `expected` JSON field, and the harness asserts the field value. All must pass.
This is the standing replacement for the Waves 1-2 ad-hoc scenarios; scenario (4) exercises E-i
(dev blocked → bounded re-dispatch then escalate).

## 6. Engineering Constraints Index

- Norms: CLAUDE.md _engineering-norms_; English. L3 four-corner: `loop-3-development.md`/`loop-3-workflow.md`.
  **L3 review corner = calibrated panel** (per-phase runner). After ANY `l3-phase.js` edit: `check-workflow-syntax.sh`.
- Commits: `feat(phase1|2|3):`; within-round `fix(phaseN-roundR): <keyword>`; gate results as trailers; no AI/tooling mention.

## 7. Data and Fixture Dependencies

- G-i creates the standing `tests/scenarios/` fixtures (repo root). No fixtures under `references/`.
- Reuses gates; G-iii extends `check-consistency.sh`.

## 8. Regression Protection

- `check-consistency.sh` green every Phase, and STILL green after G-iii's new pairings (AC-W3-G1).
- `check-workflow-syntax.sh references/l3-phase.js` green after every Phase-1 edit (the control-flow) — AC-W3-G2.
- `conflict` retained in `l3-phase.js` (no 5-value enum, no refactor) — AC-W3-G5.
- Wave-1/2 additions to the `l3-phase.js` review prompt and fix prompts preserved (E edits APPEND, not replace).
- **Dev prompt: the Wave-2 C1 TDD watch-it-fail directive is RETAINED** in the rewritten `devPrompt` (§2(c) carries "write its test FIRST … FAILS for the right reason … before writing code … watched each new test fail" verbatim, alongside the new E-i blocked/concerns and E-ii self-review text). AC greps `fails for the right reason` to enforce its survival — the §2(c) rewrite is NOT a silent drop of C1.
- `SKILL.md` untouched every Phase (AC-W3-G4); reference `.md` count stays 12; `tests/scenarios/` at repo root only.
