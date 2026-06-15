# Superpowers ↔ Three-Loop-Workflow — Comparison & Optimization Report

**Date:** 2026-06-15
**Status:** analysis (not an implementation design doc; no code/skill change is made by this file)
**Subject under study:** `three-loop-workflow/` skill vs. the `superpowers` skill collection (`../superpowers`)
**Goal of the study:** identify what three-loop-workflow can learn from superpowers **to sharpen its
own goal** — not to turn it into a general-purpose library and not to bloat it.

> Method note. This report was produced by a 43-agent analysis run: parallel deep-reads of both
> corpora, per-dimension mining of transferable lessons, then an adversarial filter that scored each
> candidate against three-loop's goal and its bloat budget. Every claim below was verified against
> actual file/line references in both skills. 32 candidate lessons survived; each carries a verdict
> (`adopt` / `adapt`) and a priority (`P0`–`P3`). None were structural imports — see §4.

---

## 1. The two skills in one paragraph each

**three-loop-workflow** is a *single, heavyweight orchestration skill*. It forces every non-trivial
change through L1 Design → L2 Implementation → L3 Development → F End-to-End Review. Its discipline is
enforced **structurally**: a numeric two-generation termination rule (zero severe this round AND zero
general the prior round), fresh-subagent **identity** isolation (the author may never review its own
artifact), round caps of 3 per domain that force escalation, a Light Mode for small changes, and
Workflow-script automation (`l3-phase.js`, `review-panel.js`). It is heavy on purpose.

**superpowers** is a *composable library* of ~14 small skills (brainstorming, writing-plans,
subagent-driven-development, test-driven-development, systematic-debugging,
verification-before-completion, requesting/receiving-code-review, writing-skills, …). Its discipline
is enforced **rhetorically**: iron laws (`NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST`),
spirit-over-letter clauses, rationalization/red-flag tables that name the exact excuse an agent
generates, and — uniquely — RED-GREEN-REFACTOR applied to *the skills themselves* (watch an agent
fail without the skill, then write the skill to close that specific failure). It is ruthless about
token efficiency.

---

## 2. The core finding

**three-loop-workflow is already more rigorous than superpowers on structure.** It encodes as numbers
and code what superpowers only urges in prose: termination is a field comparison, not a judgment call;
role isolation is identity-bound, not a reminder; the round cap is a hard counter, not "consider
stopping." Importing superpowers' *structure* would be a downgrade.

What three-loop is missing is superpowers' **craft and human-factors layer**:

1. **It does not name its rationalizations.** A grep across the entire skill finds exactly *one*
   rationalization rebuttal (`escalation-rules.md:27`). The skill's whole reason to exist is that
   agents shortcut discipline under pressure — yet it never models the excuse at the moment of
   temptation. This is the single biggest gap, and it recurs across five of the six analysis
   dimensions.

2. **It violates its own anti-summary thesis.** The skill teaches that summaries cause drift, but its
   always-loaded `description` *is* a workflow summary, and a second self-summary sits in the "Quick
   orientation" blockquote. superpowers documented empirically that a description summarizing the
   workflow makes the agent follow the summary and skip the body.

3. **It labels disciplines it never verifies.** TDD ("tests first") is asserted but unchecked —
   green-from-birth tests-after pass every gate. The main agent's closing re-run is honor-system. The
   F "End-to-End Review" checks document-consolidation fidelity, not whole-change correctness. And the
   skill itself has no behavioral test that would catch a future edit silently weakening the
   discipline.

The recommendation, therefore, is to **borrow superpowers' craft, not its architecture.**

---

## 3. Side-by-side comparison

| Dimension | superpowers | three-loop-workflow | Transfer? |
|---|---|---|---|
| Packaging | Library of small composable skills | One heavyweight skill | No — keep three-loop monolithic |
| Discipline mechanism | Exhortation (iron laws, tables) | Structure (numeric termination, identity isolation, caps) | three-loop is stronger; keep |
| Token discipline | Ruthless (<200-word targets; description ≠ summary) | Prose-dense (SKILL.md 209 lines) | **Yes** — adopt the anti-summary craft |
| Rationalization defense | Per-skill Excuse→Reality + red-flag tables | One line total | **Yes** — biggest gap |
| Design elicitation | Socratic, one-question-at-a-time, approaches-first, HARD-GATE | Drafts spec from agent's own reading; reactive escalation only | **Adapt** — gated proactive elicitation |
| Plan authoring | "zero-context, poor-taste reader"; no-placeholder blacklist | Self-contained-doc bet asserted, not operationalized | **Adapt** — add reader-model calibration |
| Execution | Fresh subagent/task; status enum; model selection by tier | Four-corner dev/review/accept/fix; `conflict` boolean only | **Adapt** — status signal, verified TDD |
| Review | Severity calibration + acknowledge-strengths | Severe/general/clarification, no calibration | **Adapt** — calibration only (no praise) |
| Verification | "No claim without fresh evidence in this message"; verify vs diff | Honor-system main-agent re-run; consolidation-only F | **Adapt** — evidence gate + correctness F |
| Debugging | 4-phase root-cause; 3-fix architectural circuit-breaker | Surgical-Changes (size), no causal requirement | **Adapt** — root-cause kernel in fix corner |
| Skill self-maintenance | RED-GREEN-REFACTOR on the skill; pressure scenarios | grep consistency checks; no behavioral test | **Adapt** — small pressure-scenario suite |

---

## 4. The transfer principle

Every recommendation obeys three rules, derived from the adversarial filter:

- **Sharpen the goal, never dilute it.** No change may turn three-loop into a general-purpose library.
- **Anchor to an existing clause.** Each addition cites a rule three-loop already has, so it is a
  *refutation index*, not new doctrine. This also keeps `check-consistency.sh` honest.
- **Spend the bloat budget carefully.** three-loop is already prose-heavy. Most adopted lessons are
  1–3 lines; the headline lesson (P0) is *negative* bloat (it deletes text).

Explicitly **rejected as imports** (they break the goal — see §6): superpowers' unconditional
"every project needs a design" HARD-GATE, TDD-everywhere / delete-and-restart dogma, the full 4-phase
systematic-debugging scaffold, "acknowledge strengths" praise, and any new standalone reference file.

---

## 5. Recommendations — full catalog (32 lessons)

Format per lesson: **[Priority] (verdict) Title** — *files* · superpowers practice → three-loop today
→ the gap → **Do this** (the sharpest minimal change).

### P0 — do first (high leverage, negative bloat)

**[P0] (adopt) Strip the description to trigger + route** — `SKILL.md`
superpowers' CSO is empirical: a description that summarized "code review between tasks" made Claude do
*one* review when the flowchart required two ("the skill body becomes documentation Claude skips"). →
three-loop's `description` (816 chars) names the three loops, "mandatory fresh-subagent reviews," "round
caps," and "escalation rules" — a paraphrasable spec of the procedure. → An agent can hold the gist and
believe it complies without reading the termination rule, identity isolation, or escalation bar. →
**Do this:** delete the middle sentence of `SKILL.md:3` ("It enforces a three-loop discipline … explicit
escalation rules."); keep the trigger/skip keywords verbatim. Regenerate the registered description so
the always-loaded surface actually changes. Confirm via `check-consistency.sh` that no commitment-clause
token lived only in that sentence (it does not).

### P1 — high value, well-scoped

#### Skill craft (how three-loop is written)

**[P1] (adapt) Add ONE rationalization / red-flag table** — `SKILL.md` (+ cross-ref `escalation-rules.md`)
superpowers ships an Excuse→Reality + red-flags trip-wire list in every discipline skill; the
exact-phrase counter ("Confidence ≠ evidence") is what works, vague "don't cheat" does not. → three-loop
organizes defenses by *mechanism* (principle-composition table, common-failure-modes table), never by
the agent's *excuse*. → A smart agent under pressure searches the loophole space the bare rules leave
open. → **Do this:** add one compact table (hard cap ~5 rows, `You catch yourself thinking | Reality →
what to do`) after the "Principle composition" table; each Reality cell points to an existing clause
(≤3-files gate, single-option-severe, clean-first-round, comment-the-default, "I think it works"). No
separate red-flag bullet list (the table *is* the list). *(This is the same gap the review-verify,
debug-escalate, and testing-skills dimensions each surface from their own angle — see those P1 rows;
implement as one curated table, not several.)*

**[P1] (adapt) Replace the "Quick orientation" self-summary with a read-in-full directive** — `SKILL.md`
The blockquote at `SKILL.md:34-38` restates the loops, termination rule, and round cap — a *third*
summary surface (after the description and "The three loops at a glance"), and the most redundant. There
is no "read the reference in full before acting" directive anywhere. → **Do this:** replace lines 34-38
with: *"Operating rule: execute this skill from the reference files, not from this page. Once the routing
table points you to a reference, read it in full before acting — operating from a gist is precisely the
drift this skill exists to prevent."* Net prose reduction. Do **not** relocate the routing table.

**[P1] (adapt) Add a tiny "looks Light, is actually Full" calibration table** — `light-mode.md`
brainstorming's anti-pattern inoculation gives BAD/GOOD pairs. → three-loop's tier boundary is fuzzy
("≤3 non-load-bearing files," "no threshold decision") and its only defense is a reviewer re-running the
*same* fuzzy checklist. → **Do this:** add a 4-row `Looks Light | Trigger fired → Full` table after the
"When in doubt → Full" line, reusing `escalation-rules.md` trigger vocabulary verbatim (config-flag
default → threshold decision; rename stored JSON field → breaking change; 4th tiny file → >3 files,
splitting to dodge is still Full; tweak existing constant → threshold unless a source-of-truth constant
is cited).

#### Design & spec (L1/L2)

**[P1] (adapt) Add a gated pre-draft elicitation step to L1** — `loop-1-design.md`
brainstorming front-loads a Socratic dialogue (one question at a time, multiple-choice; present 2-3
approaches with a led recommendation) before any spec is written. → L1 has no user-facing elicitation;
the happy path drafts all 8 sections from the agent's own reading and the fresh reviewer audits the
*doc*, not the user's intent. → A confident-but-wrong reading of the request sails through L1. → **Do
this:** add "L1 pre-step B: Confirm intent before drafting," *gated to under-determined requests only*
(fully-specified or Light-Mode requests skip): ask clarifying questions one at a time, present
approaches before drafting Key Design Decisions, gate the 8-section draft on confirmed intent. Defer
question-quality + degraded-mode to `escalation-rules.md` (don't restate). **Reject** the unconditional
HARD-GATE (collides with Light Mode), the per-section approval loop, and the visual companion.

**[P1] (adapt) Insert a free author self-review before the fresh-reviewer spawn** — `loop-1-design.md`, `loop-2-implementation.md`
superpowers splits review into two cost tiers: a cheap same-agent self-pass (placeholders, consistency,
ambiguity) then a dispatched fresh reviewer for blind spots. → three-loop goes straight from draft to
round-counting reviewer; trivial self-catchable defects burn scarce rounds (cap = 3; at L3 review+accept
*share* one budget). → **Do this:** reframe the existing "Common L1/L2 traps" headings into an executed
gate — "Self-review before spawning the reviewer (free — does not increment {{round}})" + one imperative
line that it produces no verdict and never substitutes for the fresh review. Reuse the existing trap
bullets; add no new checklist content.

**[P1] (adapt) Adopt the "zero-context reader" calibration + placeholder blacklist for L2** — `loop-2-implementation.md` *(partially already covered)*
writing-plans calibrates verbosity to "an engineer with zero context and questionable taste" and names
vague content (`TBD`, "add appropriate error handling," "write tests for the above") as *defects, not
style*. → three-loop asserts the self-contained-doc bet but never operationalizes "write at THIS level
of explicitness." → **Do this:** add one calibration sentence as the first line of "Main agent
procedure," and append the single novel item — *placeholder vagueness* — to "Common L2 traps." Reject the
rest of a "Forbidden in a Phase" block; it duplicates existing rules (lines 14, 25, 99-102, 119, 121).

**[P1] (adapt) Add a multi-subsystem decomposition signal to L1** — `loop-1-design.md`
brainstorming/writing-plans flag "multiple independent subsystems" up front: one spec per subsystem. →
L1 step 1 only asks about *parallel* tasks by others, never whether *this* request is several subsystems
that each deserve their own cycle. → A mega-cycle dilutes Scope Boundary and overloads the round caps
with unrelated risk. → **Do this:** add ONE bullet to L1 procedure step 3's escalation-signal list:
"Multi-subsystem request → escalate the decomposition; one design doc = one coherent subsystem; run a
separate cycle per subsystem." Reuse the existing AskUserQuestion machinery.

#### Execution (L3)

**[P1] (adapt) Make L3 TDD a verified discipline (watch-it-fail)** — `l3-phase.js`, `loop-3-development.md`
TDD's value is the *Verify RED* step ("if you didn't watch it fail, you don't know it tests the right
thing"). → three-loop says "tests first" 6 times but never verifies it; the dev prompt in `l3-phase.js`
never mentions TDD; AcceptVerdict only checks final exit codes. → Code-first + green-from-birth
tests-after passes every gate. → **Do this:** (1) one sentence in the `l3-phase.js` dev prompt — write
each new behavior's test first, run it, confirm it fails for the right reason, note it in the summary;
(2) extend the step-2 review Input cell — *new production code with no corresponding new test is a severe
Goal-Driven Execution issue* (checkable from the `git log` the reviewer already runs). **Drop** the
PANEL_ANGLES edit (panel is optional; CORRECTNESS already covers it) and the "delete and restart"
wording (three-loop fixes via step-4).

**[P1] (adapt) Give the dev corner an honest status signal** — `schemas.md`, `l3-phase.js`, `loop-3-workflow.md`, `loop-3-development.md`
subagent-driven-development's implementer reports DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED. →
three-loop's DevResult carries only `conflict: boolean`; a doubtful dev agent must return success it
distrusts or throw (mislabeled agent-error). → The fresh-eyes corner gets no signal and burns rounds on
work the author already distrusts. → **Do this:** add `concerns: string[]` and a `blocked` boolean (keep
`conflict` as-is). If blocked → return a `dev-escalation` status so the main agent supplies
context/stronger model and re-dispatches (not a deadlock report). If concerns present → interpolate them
into the review prompt ("scrutinize these areas first"). **Reject** the full 5-value enum and refactoring
`conflict` out.

**[P1] (adapt) Require a pre-handoff dev self-review (pointer, not new criteria)** — `l3-phase.js`, `loop-3-development.md`
implementer-prompt's 4-lens self-review with the guard "self-review supplements, never replaces, the
fresh reviewer." → three-loop's dev corner hands straight to review; §0.2 has one generic self-test the
dev prompt never invokes. → **Do this:** one sentence in the dev prompt — self-review the diff against
SKILL.md §0.2 (overcomplication) and §0.3 (trace test, no process-narration comments), confirm checkboxes
and watched-fail tests, fix now; *"this does NOT replace the fresh review corner — both run."* Reuse
existing anchors; do not introduce new lens vocabulary.

#### Review & verification

**[P1] (adapt) Add a reviewer severity-calibration clause (no praise section)** — `schemas.md` + the three review templates
code-reviewer.md: "Not everything is Critical. Categorize by actual severity." → three-loop's templates
have no calibration; the whole apparatus is tuned to *raise* the bar ("panel can only ADD findings"). →
An over-blocking reviewer exhausts the shared L3 budget and forces false escalations (escalation
fatigue → rubber-stamping). → **Do this:** one canonical calibration sentence in `schemas.md` beside the
ReviewVerdict tiers ("grade by actual severity … do not inflate to severe to be safe — inflation burns
the shared budget and forces false escalations"), plus one inline copy per template (subagents never see
`schemas.md`). **Drop** the strengths/praise section — it conflicts with three-loop's no-praise stance.

**[P1] (adapt) Add a review/accept trip-wire table** — `schemas.md` (+ pointers from `loop-3-development.md`, `end-to-end-review.md`)
verification-before-completion's review-specific Excuse→Reality table ("Agent said success → verify
independently"). → three-loop's review/accept stages have predictable unguarded evasions, the worst being
gaming the clean-first-round relaxation (its own framing "removes the tax on correct-first-time work"
rewards a lenient first review). → **Do this:** one 5-row table after the clean-first-round paragraph:
"first review clean, I'm done" (clean = zero severe AND zero general AND no fix), "the dev summary says
done" (read the diff, not the summary), "general issues are advisory" (they block two-generation
closure), "I'll note the default in a comment" (escalate; violates §0.3), "I re-ran last phase" (PhaseEnd
needs a *fresh* run). Pointer-link from L3 and F; do not duplicate.

**[P1] (adapt) Make PhaseEnd / F closeout evidence-gated, not self-attested** — `loop-3-development.md`, `end-to-end-review.md`, `SKILL.md`
verification-before-completion's iron law: "if you haven't run the verification in this message, you
cannot claim it passes." → three-loop already requires the main agent to "personally run" and record
trailers, but nothing forbids a *stale* paste, and the main agent is the one node never fresh-reviewed.
→ **Do this:** append a freshness qualifier in three places — PhaseEnd ("must come from THIS closing run;
a recalled tally / the accept subagent's earlier report is not sufficient"), F step 2 ("captured in this
closeout step"), and §0.4 ("a completion claim without fresh command output captured in the same step is
invalid"). **Reject** the optional F cross-check (both artifacts come from the same un-reviewed run).

**[P1] (adapt) Add a fresh-eyes whole-change correctness review to the default F** — `end-to-end-review.md`, `schemas.md`
requesting-code-review mandates a fresh-context review of the *assembled* work before merge. → Despite
its name, F's fresh subagent reviews only document-consolidation fidelity; whole-change correctness
review exists only as optional team/panel modes. Per-Phase reviews each see one phase. → Integration
defects (Phase A + B wrong together, cross-phase regressions) fall through the headline mechanism. →
**Do this:** add ONE gated step before consolidation — spawn a fresh non-author subagent to read
`git diff <first-phase-base>..HEAD` against Deliverables + Acceptance Criteria for (a) every Deliverable
actually implemented, (b) no cross-phase regression, (c) no scope creep. Emit ReviewVerdict; severe →
existing fix/round-cap routing; blocks closure. Fold into the panel/teams-mode-2 slot when one already
ran. No new prompt template.

#### Debugging & failure-handling

**[P1] (adapt) Add a root-cause gate to the L3 fix corner** — `loop-3-development.md`, `l3-phase.js`
systematic-debugging: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST; symptom fixes are failure." →
three-loop's fix prompts say only "Surgical Changes only"; Surgical constrains fix *size*, not *causal
correctness*. → A symptom-patch passes the literal review item, the defect re-surfaces next round, and
the 3-round cap burns on whack-a-mole. → **Do this:** ~3 sentences — fix-role Input gains "each item
prefixed by a one-line root cause"; both `l3-phase.js` fix prompts gain "state the root cause, make the
smallest change that addresses the cause not the symptom, one cause at a time; if no cause is
identifiable, escalate — do not ship a guess." **Reject** the 4-phase scaffold and any new verdict state.

**[P1] (adapt) Require a failing reproduction test for behavior-bug fixes** — `loop-3-development.md`, `l3-phase.js`
TDD: "Bug found? Write a failing test reproducing it. Never fix bugs without a test." → three-loop's
*dev* step is TDD but the *fix* step has no test requirement; a regression with no test for it passes
accept (accept only runs declared ACCEPT-CMDs). → **Do this:** scope to correctness/behavior findings
only — fix-role Output gains "for a correctness/behavior finding: add a failing test that reproduces it
first, then fix to green"; both fix prompts gain the same conditional. Style/scope/comment findings need
no test. No new consistency token.

**[P1] (adapt) Reframe round-cap exhaustion as a possible design defect** — `escalation-rules.md`
systematic-debugging's 3-fix architectural circuit-breaker: ">=3 fixes → question the architecture, not
attempt fix #4." → three-loop's cap already fires into a deadlock report with three flat options, but
never reads the *pattern* of mutating failures as a signal that L1/L2 is wrong — even though the
L3→L1/L2 rollback routing already exists. → **Do this:** one clause in the deadlock procedure — "if a
different item failed each round, or fix scope grew each round, the cap is firing on an
architectural/decomposition defect; name the likely source (L1 or L2) and make rollback option (a) the
recommended default." Leave the flat options for stable/local failures.

**[P1] (adapt) Upgrade the deadlock report from narrative to evidence** — `escalation-rules.md`
systematic-debugging: localize the failing boundary with evidence before concluding. → three-loop's
deadlock report asks "why each fix failed" with no method — it becomes the agent's possibly-wrong story,
and the user adjudicates with no evidence of *where* it breaks. → **Do this:** add one bullet —
"Evidence of where it breaks: for each unresolved item, the failing acceptance command or reviewer-cited
symptom (with actual output) and the file/layer/value where expected and actual diverge. 'It keeps
failing' is a story, not evidence." 2 lines, no debugging subsection.

**[P1] (adapt) Add a fix/round-cap-corner red-flag block** — `escalation-rules.md`
systematic-debugging's Red Flags + Rationalization table at the exact failure-handling moments. →
`escalation-rules.md:27` is the *only* rationalization line in the skill, and there is none for the fix
corner or the cap — the moments of peak pressure. → **Do this:** one 4-row `Excuse | What it actually
means` table after line 27 ("just try changing X" → name the root cause; "quick patch now" → symptom
fixes cost more, not less; "one more attempt" at R=3 → R=3 escalates, never a silent round 4; "basically
passing, close it" → accept closes on exit codes + two-generation, not confidence). *(Consolidate with
the SKILL.md rationalization table above — one curated home, cross-referenced.)*

#### Skill self-testing

**[P1] (adapt) Add a harvested rationalization table to the maintenance surface** — `escalation-rules.md` (+ one routing cross-ref)
This is the testing-skills-dimension view of the same #1 gap: superpowers' RED phase exists to *produce*
the rationalization table from observed baseline failures. → **Do this:** the same curated table as the
skill-craft P1, homed where the lone existing rationalization lives (after "Forbidden"), capped and
non-append-only. Highest-value net-new row: *"they said do it quickly / just add Y" → instructions say
WHAT not HOW; terse phrasing is not a tier downgrade* — the description flags this excuse but no body
text counters it. **Reject** a new standalone `references/rationalizations.md` file.

**[P1] (adapt) Ship a small pressure-scenario suite as the skill's behavioral acceptance fixture** — `scenarios/`, `CLAUDE.md`
superpowers tests skills by watching agents fail under combined pressure (time, sunk cost, authority). →
three-loop verifies its *static content* (grep, syntax) but nothing checks its *behavioral* claims; a
future edit that quietly weakens the tier table or termination wording flips no check from green to red.
→ **Do this:** add ~3 terse pressure scenarios under `scenarios/` (*kept out of the load-bearing set* so
they don't inflate the cycle): (1) "quickly add Y" that is actually Full → expects Full; (2) a
threshold decision under sunk-cost → expects escalation with options+recommendation+rationale, not a
default; (3) clean review after a fix → expects no one-round close. Wire with one CLAUDE.md
_repo-workflow_ bullet: run them via a fresh subagent before merging any tier/escalation/termination
edit. **Reject** the full testing-skills methodology doc and per-scenario RED transcripts.

### P2 — worthwhile, lower leverage

- **(adapt) Tie model selection to task fragility** — `l3-phase.js`, `loop-3-workflow.md`: accept an
  optional `models = {dev,review,accept,fix}` override (undefined → harness default = zero behavior
  change); document one Args row pointing at `optional-subagents.md`. Optionally offer "retry once with
  a stronger review/fix model" as an explicit user-authorized deadlock option — never an automatic
  pre-escalation round.
- **(adapt) Three-tier severity, in place** — `schemas.md`: sharpen the *existing* severe/general/
  clarification descriptions (severe = blocker only; general = should-fix-this-round, counts toward
  two-generation; clarification = note-only) + one "when unsure, it's general" line. **Reject** a new
  `minor` array.
- **(adapt) "Verify by reading the diff" grounding** — review templates: each finding cites
  section/file:line; a pass names what was read in full. One line per template; not a header.
- **(adapt) Consistency-check the termination invariant** — `check-consistency.sh`: add `require`
  pairings for `clean-first-round` (SKILL.md ↔ schemas.md) and `fixApplied` (schemas.md ↔ l3-phase.js).
  ~2 lines, zero prose. Leave the inline prose alone (already canonicalized).
- **(adapt) TDD/dev rationalization rows** — `loop-3-development.md`: 3 rows scoped to the dev corner,
  each ending in the downstream corner that catches the excuse. *(Fold into the consolidated table.)*
- **(adapt) Skip-clarifying rebuttal** — `escalation-rules.md`: one bullet in "Forbidden" — "deferring
  the decision to the L1 reviewer ('I'll note my assumption and the reviewer will catch it'): the
  reviewer reads only the doc, it cannot know the user's intent."
- **(adapt) Watch-it-fail gate for the skill's own discipline edits** — `loop-3-development.md`: for a
  Phase that edits a discipline rule of this skill, the accept step adds a GREEN behavioral check (one
  fresh subagent + a pressure scenario), recorded as a trailer. RED baseline optional.
- **(adapt) Meta-test the deadlock** — `escalation-rules.md`: one bullet — if the cap was hit because a
  skill rule was unclear/missing/hard-to-find, classify it (discipline gap / doc gap / organization
  gap) and open a follow-up issue against the skill repo.
- **(adapt) Distrust framing for skill-edit reviews** — `loop-1-design.md`: one conditional bullet — a
  discipline-rule edit demands a concrete before/after demonstration that the rule changes behavior; an
  asserted-but-unobserved behavior rule is a severe issue.

### P3 — marginal

- **(adapt) One-line Iron Law for the cap** — `SKILL.md`: a single code-fenced line above the Quick-
  orientation block: `HITTING THE ROUND CAP ESCALATES — IT NEVER LOWERS THE BAR.` Keep all point-of-use
  reminders. Drop if it feels redundant with the blockquote.

---

## 6. What to deliberately NOT import (guardrails)

| superpowers practice | Why it must be rejected here |
|---|---|
| Unconditional "every project needs a design" HARD-GATE | Directly collides with three-loop's Light Mode + Simplicity First. |
| TDD-everywhere / "delete the code and restart" | three-loop fixes via the step-4 corner, not delete-and-restart; would tax style/scope fixes. |
| Full 4-phase systematic-debugging scaffold | Heavy bloat for a single skill; only the root-cause *kernel* transfers. |
| "Acknowledge strengths / praise" in reviews | three-loop bans praise theater (`loop-3-development.md:99`). |
| New standalone `references/rationalizations.md` | Adds a routing row, a consistency surface, and a 6th file; ~80% would duplicate existing scattered rebuttals. Co-locate instead. |
| PANEL_ANGLES / panel-anchored checks | Panel is an *optional* escalation path; anchoring a default check there leaves the common path uncovered. |
| Append-the-table-forever instructions | Invites the table to grow into a catch-all; keep it fixed-size and curated. |
| Per-section design approval loop, visual companion | Ceremony three-loop's structural gates already cover. |

---

## 7. Suggested sequencing

All of these touch load-bearing files (`SKILL.md`, `references/*`), so per this repo's CLAUDE.md each
batch runs through the skill's own **L1 → L2 → L3 → F** cycle. The lessons cluster naturally into a
single coherent task — *"v1.5: compliance-hardening from superpowers"* — with these L2 phases:

1. **Anti-summary + rationalization table** (P0 + the consolidated table + quick-orientation directive
   + tier calibration table). One design decision: where the single rationalization table lives
   (recommended: `escalation-rules.md`, cross-referenced from SKILL.md). Highest leverage, mostly
   prose-neutral-or-negative.
2. **Verify-don't-label** (TDD watch-it-fail, evidence-gated PhaseEnd/F, fresh-eyes correctness F).
   Touches `l3-phase.js` + `schemas.md` — needs the Workflow-script syntax gate.
3. **Failure-handling depth** (root-cause gate, reproduction test, architectural reframe, evidence
   deadlock report, fix-corner red flags). All in `loop-3-development.md` + `escalation-rules.md` +
   `l3-phase.js`.
4. **Dev/review ergonomics** (status signal, dev self-review pointer, reviewer calibration, severity
   in-place, elicitation/self-review/decomposition for L1/L2).
5. **Skill self-testing** (pressure-scenario suite + CLAUDE.md wiring + consistency-check pairings).
   This one is partly a repo-process change (`scenarios/` is intentionally non-load-bearing).

Phases 1 and 2 are the recommended first cut: they deliver the bulk of the goal-sharpening value while
the skill's net size stays flat or shrinks.

---

## Appendix: lesson-ID index (greppable)

The body above titles each lesson by `[Priority] (verdict) Title`. The stable IDs below are the
canonical handles used by downstream design/implementation docs (e.g.
`2026-06-15-skill-v1-5-compliance-hardening.md`) so a deliverable can cite a lesson and a reviewer can
`grep` it back to source. **Authoritative count: 32** (1×P0 + 21×P1 + 9×P2 + 1×P3).

| Lesson ID | Pri | Dimension | Title |
|---|---|---|---|
| `description-no-workflow-summary` | P0 | skill-craft | Strip the description down to trigger+route — stop giving the agent a paraphrasable spec |
| `root-cause-gate-fix-corner` | P1 | debug-escalate | Add a root-cause gate to the L3 fix corner (no symptom-patching when review keeps finding bugs) |
| `architectural-reframe-on-cap` | P1 | debug-escalate | Reframe round-cap exhaustion as a possible design defect, not only a user-decision deadlock |
| `reproduction-test-for-fixes` | P1 | debug-escalate | Require a failing reproduction test for behavior-bug fixes in the fix corner |
| `diagnostic-deadlock-report` | P1 | debug-escalate | Give the deadlock report a real diagnostic method instead of a narrative of attempts |
| `fix-corner-red-flags` | P1 | debug-escalate | Add a compact rationalization/red-flag block for the fix-and-escalate path |
| `l1-elicitation-dialogue` | P1 | design-spec | Add a pre-draft elicitation gate to L1 (one-question-at-a-time, present approaches before drafting) |
| `l1-cheap-self-review-before-fresh-reviewer` | P1 | design-spec | Insert a cheap L1/L2 author self-review pass before the expensive fresh-reviewer spawn |
| `l2-zero-context-reader-model` | P1 | design-spec | Adopt writing-plans' zero-context reader framing + no-placeholders blacklist as the L2 authoring contract |
| `l1-scope-decomposition-precheck` | P1 | design-spec | Add a scope-decomposition pre-check to L1 (is this actually multiple subsystems?) |
| `tdd-iron-law-l3` | P1 | execution | Make L3 TDD a verified discipline (watch-it-fail), not a label |
| `dev-status-enum` | P1 | execution | Replace the dev `conflict` boolean with an honest status signal (concerns / blocked) |
| `dev-self-review-before-handoff` | P1 | execution | Require a dev self-review (vs §0.2/§0.3) before the dev corner hands off to review |
| `reviewer-calibration-clause` | P1 | review-verify | Add a severity-calibration clause to review templates so fresh-eyes reviewing does not over-block |
| `review-stage-rationalization-table` | P1 | review-verify | Add a rationalization / red-flag table targeting the review-and-accept stage's evasions |
| `evidence-over-claims-phaseend` | P1 | review-verify | Make PhaseEnd / F closeout an evidence-gated check (fresh command output), not a self-attested re-run |
| `f-correctness-review` | P1 | review-verify | Make the default F include a fresh-eyes correctness review of the integrated change |
| `rationalization-table` | P1 | skill-craft | Add a rationalization / red-flag table — the single biggest gap against the goal |
| `demote-quick-orientation` | P1 | skill-craft | Replace the 'Quick orientation' self-summary with a read-in-full directive |
| `tier-worked-examples` | P1 | skill-craft | Add a tiny 'looked Light, was actually Full' calibration table to close the fuzzy-tier loophole |
| `rationalization-table-harvested-from-baseline` | P1 | testing-skills | Add a harvested rationalization / red-flag table (the artifact the RED phase produces) |
| `pressure-scenario-suite-for-tier-and-escalation` | P1 | testing-skills | Ship a small pressure-scenario suite as the skill's behavioral acceptance fixture |
| `design-elicitation-rationalization-row` | P2 | design-spec | Pre-empt the 'I understood the request well enough to skip clarifying' rationalization |
| `tdd-rationalization-table` | P2 | execution | Add a compact TDD/implementation rationalization table (dev-corner rows) to the L3 reference |
| `model-selection-by-fragility` | P2 | execution | Tie model selection to task fragility; make it the BLOCKED/cap-recovery lever |
| `three-tier-severity` | P2 | review-verify | Sharpen the severe/general/clarification descriptions in place (anti-inflation) |
| `do-not-trust-report` | P2 | review-verify | Add a 'verify by reading the diff' grounding line to every review prompt template |
| `consolidate-termination-canonical` | P2 | skill-craft | Make the termination invariant single-source and consistency-checked (clean-first-round, fixApplied) |
| `watch-it-fail-gate-for-skill-edits` | P2 | testing-skills | Add a watch-it-fail behavioral check to the skill's own maintenance cycle for discipline edits |
| `meta-test-on-cap-exhaustion-deadlock` | P2 | testing-skills | Add meta-testing (classify why the cap was hit) to the deadlock-report procedure |
| `adversarial-distrust-framing-in-maintenance-review` | P2 | testing-skills | Apply 'demand a behavior demonstration' framing to the reviewer that validates skill edits |
| `imperative-iron-law-framing` | P3 | skill-craft | Compress the cap non-negotiable into one code-fenced Iron-Law line |
