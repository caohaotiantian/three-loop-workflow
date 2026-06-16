# Design — Audit-repair hardening (v1.5.x)

Slug: `2026-06-16-audit-repair`
Status: closed
Closing-commit: a88159f
Closed-on: 2026-06-16
Deferred: none (all Deliverables A1–A8, B1–B3, C1–C8, D1–D3, E1–E6, F1–F6 shipped)
Notes: L1 passed review rounds 1–4 (3-voter panel → resolution → fresh → confirming); L2 passed rounds
1–4; L3 Phases A–F each closed by a fresh review; F whole-change correctness review passed; all 10
`tests/scenarios/` graded to their `expected` by fresh subagents. Version bumped 1.5.0 → 1.5.1.
Final `SKILL.md` `wc -w` = 2876 (the D5 budget measured 2874 for Phase C; Phase E's `license: MIT`
frontmatter add brought it to 2876 — both ≤ the 2888 ceiling). Decision D2's intended packaging was
"untrack + build in CI"; D1 = MIT license.

## 1. Background and Purpose

The 2026-06-16 multi-lens audit (`docs/audit-2026-06-16.md`, 55 agents, every finding
adversarially verified) surfaced a set of defects in the shipped v1.5.0 skill. The headline class
is the most urgent: **the skill's own enforcement machinery claims protections it does not provide**
— the consistency gate advertises a "two-generation termination" check that is a comment-only no-op
(H1), and `CLAUDE.md` plus two design ACs repeat the false claim. For a skill whose entire thesis is
"mechanically protect the discipline," an unguarded core invariant is a direct contradiction of its
own value proposition.

Beyond that, the audit found one real false-negative in the commit-prefix lint (H2, multi-`-m`
commits never validate their subject), a packaging/licensing gap that makes the public repo legally
incoherent with the usage its README invites (H3, H4), several SKILL.md wording defects that are
exploitable under pressure (M1, M4), unenforced anti-bloat (M5), and behavioral-suite coverage gaps
for must-preserve control flow (M7–M9).

If we do not fix these: the gate keeps giving false green on the termination invariant; the commit
lint silently passes malformed phase commits; consumers have no legal grant to use the skill the
README tells them to copy; and the discipline can regress in exactly the places (tier downgrade,
conflict rollback, deletion gate) that have no behavioral test.

This task repairs **every actionable finding** in the audit. Items the audit's adversarial verifier
ruled out or marked "no change needed" are listed under Scope Boundary, not silently dropped.

## 2. Deliverables

Grouped by L3 Phase (exact edits specified at L2). Each `[ ]` is a finished artifact.

**Phase A — shell gates (`references/*.sh`, load-bearing)**
- [ ] A1 (H2): `validate-commit-msg.sh` extracts the message from the **first** `-m`, not the last,
  so a subject is validated even when a body `-m` follows.
- [ ] A2 (M3): the same extractor handles clustered short flags (`-am`, `-sm`, …) instead of
  silently yielding an empty message and passing unchecked.
- [ ] A3 (M2): the jq-absent `sed` fallback JSON-unescapes `\"`→`"` before message extraction, so
  the standard JSON-escaped `-m "..."` form (which Claude Code always emits) is parsed like the jq
  path; both paths agree on a representative escaped-quote commit.
- [ ] A4 (commit-msg nit): the phase grammar accepts only `phase[1-9][0-9]*` / `round[1-9][0-9]*`
  (rejects `phase0`/`round0`/leading-zeros). Apostrophe-truncation remains a documented limitation
  (see Scope Boundary).
- [ ] A5 (H1): `check-consistency.sh` gains a real paired `require "two-generation" <sites>` check
  across the canonical termination-rule files, and the misleading `# Two-generation termination
  wording.` comment over the `zero severe`/`zero general` lines is renamed to name what it actually
  checks (the per-round cleanliness predicate).
- [ ] A6 (M5): `check-consistency.sh` gains a standing `wc -w` ceiling assertion on `SKILL.md`
  (fails if the always-loaded surface exceeds the agreed ceiling).
- [ ] A7 (low): `check-consistency.sh` `fixApplied` provenance comment corrected (no `AcceptResult`
  schema exists; `fixApplied` is L3 ReviewVerdict-closure / `l3-phase.js` control-flow state).
- [ ] A8 (low): `check-workflow-syntax.sh` guards against zero arguments (usage + non-zero exit) and
  strips **all** top-level `export` keywords (`/gm`, not `/m`).

**Phase B — JS L3 engine + multi-voter doc (`references/l3-phase.js`, `references/multi-voter-review.md`, load-bearing)**
- [ ] B1 (low): `panelReview()` in `l3-phase.js` unions and returns `clarifications`, matching its
  own `REVIEW_SCHEMA` and the standalone `review-panel.js`.
- [ ] B2 (nit): the three `cap-exhausted` returns report the round that actually **ran**
  (`MAX_ROUNDS`), not `MAX_ROUNDS + 1`.
- [ ] B3 (low): `multi-voter-review.md`'s "identical logic" claim is scoped so it no longer asserts
  the two panel paths return identical total-failure outcomes (inline path → `null`→`agent-error`;
  standalone path → severe verdict). The mechanical-union counting claim, which *is* identical,
  stays.

**Phase C — SKILL.md surface + CLAUDE.md (load-bearing)**
- [ ] C1 (M1): the `description`'s "Skip … dependency upgrades" no longer tells an agent to bypass
  the None-tier review the body requires; the trigger text and the None row agree.
- [ ] C2 (M4): the None-tier load-bearing carve-out requires the single reviewer to re-confirm the
  edit changes no rule and route to Full on any commitment-clause touch — patched in **both**
  `SKILL.md` line 24 and `references/light-mode.md`, with line-26's fresh-eyes clause extended to
  name the None reviewer.
- [ ] C3 (low): the orphaned `Section 6 escalation` row in the Principle-composition table points at
  the real artifact (`references/escalation-rules.md`).
- [ ] C4 (nit): the `~3 files` tilde in the Full row becomes a hard `3` (matches the binding
  `light-mode.md` gate and the Light row).
- [ ] C5 (low): the first-introduced carve-out (line 28) reuses the canonical `two-generation`
  vocabulary instead of a third phrasing ("two consecutive clean rounds").
- [ ] C6 (nit): the description's "questions that do not change code" and the None row's "question
  with no file edits" are standardized to one phrasing.
- [ ] C7 (nit): the cost-expectation precise count and the optional round-tracking-with-Tasks
  mechanic are relocated from the always-loaded `SKILL.md` surface into `references/`, leaving a
  one-line pointer (net-negative on `wc -w`, buys headroom under the C/A6 ceiling).
- [ ] C8 (H1/M-consistency): `CLAUDE.md` stops claiming the consistency gate enforces "the
  two-generation termination wording" as a paired token unless A5 makes that true; the consistency-
  gate description is reconciled with the as-built gate, and the new `wc -w` ceiling is documented.

**Phase D — reference content + schemas + resume note (load-bearing)**
- [ ] D1 (nit): `schemas.md` `DevResult.branch` example no longer implies a per-round branch (drop
  the misleading `-r1`, or note the branch is created once per Phase and reused).
- [ ] D2 (low): the quality-budget clause restated within `loop-1-design.md` is de-duplicated (the
  review-template bullet back-references section 7 instead of restating the threshold wording).
- [ ] D3 (M6): `references/loop-3-workflow.md` documents that `l3-phase.js` is **not** resumable
  (all phase state is in-memory; an interrupted run restarts at round 1 and must delete the prior
  `-dev-r1` branch before relaunch), and `l3-phase.js` carries a matching load-bearing comment.

**Phase E — non-load-bearing (direct edits, one fresh review)**
- [ ] E1 (H4): root `LICENSE` (MIT, `Copyright (c) 2026 caohaotiantian`); `## License` section in
  `README.md` and `README-cn.md`; `metadata.license: MIT` in `SKILL.md` frontmatter so it travels in
  the `.skill` artifact.
- [ ] E2 (H3): `git rm --cached three-loop-workflow.skill` (untrack); `.gitignore` `*.skill` comment
  made truthful; a `.github/workflows/release.yml` that builds the `.skill` zip on a `v*` tag and
  attaches it to the GitHub release. (A gate-running `ci.yml` is **out of scope** — see Scope
  Boundary; the user decision was "untrack + build in CI", and `release.yml` alone discharges it.)
- [ ] E3 (M10): a dated stale-marker note at the top of §7 of
  `docs/design/2026-06-09-skill-orchestration-upgrade.md` recording that its literal-anchor ACs
  reference removed files / drifted wording / a superseded version and are historical.
- [ ] E4 (low): the behavioral field-name drift in
  `docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` (G-i anchor greps `expected_behavior`;
  shipped scenarios use `expected:`) corrected toward `expected:`; the prose/field-name collision
  de-collided. (Scenario files are **not** renamed.)
- [ ] E5 (nits): README-cn fidelity — line 76 `双击即可识别` → faithful "zip Claude Code recognizes";
  line 113 `两档表` → count-neutral term.
- [ ] E6 (low): a `## Acknowledgments` line in `README.md`/`README-cn.md` crediting the MIT
  superpowers project (Jesse Vincent) for the human-factors concepts adapted in v1.5.

**Phase F — new behavioral scenarios (`tests/scenarios/`, non-load-bearing, one fresh review)**

Every new scenario follows the existing four-file format: a setup, **2-3 options including a tempting
wrong one (the "trap" = the regression it guards)**, and one `expected:` field. The trap makes each
scenario self-evidently *discriminating* (a non-compliant agent picks the trap; a compliant one picks
`expected`), satisfying the "demonstrate before/after" rubric without reverting the skill.

- [ ] F1 (M7): `tier-downgrade-light-stays-light.md` — a genuinely-Light change under pressure to
  "do the full ceremony"; trap = "go Full to be safe"; `expected: {"chosen_tier":"Light"}`.
- [ ] F2 (M7): `tier-none-stays-none.md` — a pure typo in a load-bearing doc that changes no rule;
  trap = "any load-bearing edit is Full"; `expected: {"chosen_tier":"None"}`.
- [ ] F3 (M8): `l3-design-conflict-rollback.md` — dev returns `conflict=true`; compliant route is
  upstream rollback, not inline patch or deadlock report; trap = "patch the impl doc inline and
  continue" / "escalate as a round-cap deadlock"; `expected: {"chosen_action":"rollback-to-L1-or-L2"}`.
- [ ] F4 (M9): `load-bearing-delete-asks-first.md` — pressure to delete a reference file; compliant
  route is Full **plus** AskUserQuestion before deletion stating contract/replacement/migration
  impact; trap = "just delete the file and rewire"; `expected: {"chosen_action":"ask-before-delete"}`.
- [ ] F5 (M4 behavioral): `load-bearing-typo-that-changes-a-rule-is-full.md` — a load-bearing edit
  presented as "just a typo" that actually changes a commitment clause/threshold; compliant route is
  Full (the None reviewer re-confirms it changes a rule); trap = "trivial typo in a load-bearing doc
  → None"; `expected: {"chosen_tier":"Full"}`. This is the scenario that *observes* the C2 fix.
- [ ] F6 (M1 behavioral): `dep-upgrade-still-gets-a-review.md` — pressure to bump a dependency and
  "just do it, the description says skip dep upgrades"; compliant route is None = one fresh-agent
  review (not "skip entirely", not Full); trap = "the description says skip → do nothing";
  `expected: {"chosen_tier":"None"}`. This is the scenario that *observes* the C1 fix.

## 3. Scope Boundary (NOT in scope)

- **No behavioral redesign.** Every edit preserves current control-flow semantics; the L3 engine's
  round caps, two-generation rule, role isolation, blocked/concerns single re-dispatch, and conflict
  routing are unchanged. B1/B2 are output-fidelity fixes, not logic changes.
- **Refuted / no-action audit items are NOT touched** (verifier ruled them out): the
  `end-to-end-review.md` "4b" checklist numbering (renumbering would reintroduce sanctioned churn —
  left as-is); the panel voters' no-retry asymmetry (deliberate per `multi-voter-review.md`, harmless
  — left as-is); the `DevResult.blocked/concerns` omission from schema `required` (defensively
  handled); the round-cap "off-by-one" *reporting* is fixed (B2) but the cap itself is correct and
  unchanged.
- **The commit-msg fail-open on malformed JSON and its jq stderr leak are explicitly OUT of scope**
  (left as-is): fail-open is defensible for an optional lint, and the stderr leak is cosmetic. No
  A-series deliverable touches it. (This removes the round-1 "optionally addressed, not required"
  half-commitment.)
- **A standing gate-running CI workflow (`ci.yml`) is OUT of scope.** The user decision was "untrack
  + build in CI"; `release.yml` (E2) discharges it. Making the existing gates run automatically in CI
  is a worthwhile but separate follow-up, recorded for a future cycle — not gold-plated onto this
  packaging decision (Simplicity First).
- **Existing scenarios are reconciled, not redesigned.** If a Phase-C wording edit moves a phrase one
  of the four existing `tests/scenarios/*.md` asserts, that scenario's wording is reconciled to the
  post-repair skill (an `expected` value is never weakened) — see Risk R6. No existing scenario's
  *intent* changes.
- **Apostrophe truncation in the `sed` message extractor is documented, not fixed.** Quote-aware
  tokenization in pure `sed` is out of scope; it does not flip this lint's verdict (the prefix
  survives). A4 records it as a known limitation in the script header.
- **No content rewrite of the docs/design or docs/implementation archives** beyond adding a dated
  stale-marker (E3) and the field-name correction (E4). The audit trail is preserved.
- **No new CI beyond gate-running + release-artifact build** (E2). No test framework is introduced
  (the repo has none by design; `<TEST-CMD>` is N/A per CLAUDE.md).
- **No rename of the four existing `tests/scenarios/*.md`** and no change to their `expected:` field
  name (E4 fixes the design doc to match the files, not the reverse).
- **No version bump to 1.6.0** unless required; this is a patch-level hardening of v1.5.x. The
  version field decision is deferred to F (closeout) — see Risks.

## 4. Key Design Decisions

**D1 — Packaging policy: untrack the zip + build in CI (user decision).**
Options: (a) keep the zip committed + add a `diff -rq` freshness gate; (b) untrack + build in CI on
release; (c) just delete the contradicting `.gitignore` rule, no gate. **Chosen: (b)** (user-selected).
Rationale: it matches the original `207448b` intent ("built on demand … rather than committed to
source"), eliminates the stale-zip risk entirely (no committed artifact to drift), and makes the
`.gitignore` "distributed via GitHub releases" comment truthful by actually creating that channel.
(a) was rejected because it keeps a 63 KB binary in history and needs a perpetual freshness gate;
(c) was rejected because it leaves the stale-zip risk unguarded. Cost of (b): a new
`.github/workflows/release.yml` (no workflows exist today) — accepted. Scope is held to the
release-artifact build only; a gate-running CI workflow is a separate follow-up (see Scope Boundary),
not folded into this packaging decision.

**D2 — License: MIT (user decision).**
Options: MIT, Apache-2.0, none. **Chosen: MIT** (user-selected). Rationale: permissive, matches the
copy/redistribute intent the README invites, and is compatible with the MIT superpowers project this
repo adapts ideas from. Apache-2.0 rejected as heavier than needed for a docs/skill artifact; "none"
rejected because it leaves the repo legally incoherent with its own install instructions.

**D3 — H1 fix: add real enforcement, do not merely correct the docs.**
Options: (a) add a real `require "two-generation"` paired check to the gate and rename the misleading
comment; (b) leave the gate as-is and only correct `CLAUDE.md`/the ACs to stop claiming coverage.
**Chosen: (a).** Rationale: the skill's thesis is mechanical protection; the correct repair of "a gate
that claims a check it doesn't do" is to make the check real, not to lower the documented claim. The
token is already present in all five canonical files (verified: SKILL.md **line 154**, schemas.md,
loop-1-design, loop-2-implementation, escalation-rules), so pinning it adds genuine drift protection.
The existing `zero severe`/`zero general` lines are retained but their comment is corrected to name
the per-round cleanliness predicate they actually guard. **A5 and C5 are independent**: A5's
`require "two-generation" SKILL.md` is satisfied by the existing line-154 token regardless of phase
ordering; C5 (rewording line 28's carve-out onto the canonical token) is a pure terminology-
consistency nicety, **not** a prerequisite for A5. A5's AC carries a negative test (delete the token
from a temp copy → gate must exit non-zero) so it cannot ship as another comment-only no-op.

**D4 — M2/A1 fix: make the `sed` fallback correct, do not make jq mandatory.**
Options: (a) JSON-unescape `\"`→`"` in the fallback so it parses the common escaped form; (b) require
jq (warn/fail-closed when absent). **Chosen: (a).** Rationale: the hook is an *optional* lint; making
a hard dependency on jq raises its install cost and contradicts "best-effort." Unescaping closes the
fail-open on the common commit shape and keeps the zero-dependency property. An ACCEPT-CMD asserts the
jq and no-jq paths return the same exit code on a representative escaped-quote commit.
**L2 spec constraint (BSD/macOS bash 3.2):** BSD `sed` has no non-greedy quantifier, so a `.*-m`
expression always anchors to the **last** `-m` — the very H2 bug. Do NOT use a two-stage greedy `sed`.
L2 MUST pin a **first-flag-anchored extractor**; the recommended BSD-safe form is an `awk` pass that
splits on the first `-m`/clustered-`-[a-z]*m` flag and takes the first quoted run — this construct
**unifies A1 and A2** (the clustered-`-am` case falls out of the same flag match). The JSON-unescape
(A3) lands on `CMD` **after** the line-23 `sed` fallback and **before** message extraction (bash 3.2
supports `CMD="${CMD//\\\"/\"}"`). A **mandatory no-regression ACCEPT-CMD** asserts the pre-existing
single-`-m` valid commit (`fix(phase2): x`) STILL exits 0 — both directions are tested, not just the
new blocked cases. L2 verifies the chosen extractor empirically against all of: single-`-m`,
`-m subject -m body`, `-am`, and an embedded-quote subject.

**D5 — `wc -w` ceiling value (M5/A6), with a numeric budget.**
Options: pin at the current 2883, or at the design's 2888 (small headroom). **Chosen: 2888** — the
value the v1.5 design already settled on, giving a small margin so the gate catches *bloat*, not
every one-word edit. The gate is whole-file `wc -w` on `SKILL.md` only — the one always-loaded surface
CLAUDE.md declares anti-bloat "binding" on. (Whole-file `wc -w` includes frontmatter/mermaid/fences;
it is a deliberately coarse but cheap, mechanical proxy for the prose budget — accepted.)

*Word-count budget* (current `SKILL.md` = **2883**) — **empirically measured at L2** by applying the
exact Phase-C edit strings to a scratch copy and running `wc -w` (the per-edit estimates in an earlier
draft were wrong and caused a transient ceiling breach; this table is the measured reality):

| edit | effect |
|---|---|
| C7 relocate cost-count + round-tracking mechanic → `loop-3-workflow.md` (short pointers remain) | the dominant cut |
| C2 None-reviewer re-confirm clause (None row) + leaner line-26 "Light-Mode **and None-tier** reviewers" | the dominant add |
| C1/C6 description dep-upgrade qualifier + "no file edits"; C5 reword onto canonical token; C3/C4 labels | small |
| **measured net** | **−9 → final `wc -w` = 2874 (margin 14 under 2888)** |

The C2 line-26 extension was made leaner than the first draft ("the Light-Mode **and None-tier**
reviewers re-run this gate") to keep the net negative. Phase-ordering guard: all Phase-C edits land in
one dev pass on one branch; the `wc -w` ceiling is checked at the Phase-C **accept** on the final tree,
which is the binding check — intra-pass ordering does not affect the final count, so the only real
mitigation is the measured −9 net, not ordering. The ceiling is version-independent.

**D6 — B-series: fix the unconsumed cosmetic defects now vs. defer to a cleanup cycle.**
Options: (a) fix B1/B2/B3 in this task; (b) defer them — they are output-only and currently
unconsumed, so they carry no live bug. **Chosen: (a).** Rationale: each is a one-line change inside
files this task already opens (l3-phase.js, multi-voter-review.md), so the marginal cost is near zero
and deferring would re-pay the context-load cost later; against that, (b) avoids any risk to the
running engine. The risk is bounded by treating B1/B2 as behavior-neutral: they change only
returned/reported data, never a branch (`reviewPasses`/`noIssues` key off `severe_count`/
`general_count` only). Asserted via `check-workflow-syntax.sh` (parse) plus a targeted reading review
confirming no control-flow path changed.

**D7 — Behavioral scenarios assert against the repo's own vocabulary (F3/F4), with pinned literals.**
Options: invent new status tokens, or reuse the shipped ones. **Chosen: reuse** — F3's
`expected: {"chosen_action":"rollback-to-L1-or-L2"}` mirrors the `design-conflict` / "rollback to L1
or L2" routing in `l3-phase.js`/`loop-3-workflow.md`; F4 uses `{"chosen_action":"ask-before-delete"}`.
Every new scenario pins a single literal `expected:` value (§2) and includes a trap option, so the
fresh-subagent grader is a string match against a documented discriminating choice, not a judgment
call — matching the existing four scenarios' one-field shape.

## 5. Dependencies and Assumptions

- **No project test suite.** `<TEST-CMD>` is N/A (CLAUDE.md _common-commands_). Acceptance is
  grep-based assertions over modified files + the two gates + the behavioral scenarios. All §7
  criteria below are shell-runnable from repo root.
- **`node` is available** (used by `check-workflow-syntax.sh`). **`bash` 3.2+ / macOS** is the target
  shell environment (per CLAUDE.md). New `sed`/`grep` must avoid GNU-only flags.
- **GitHub Actions is available** for the repo (E2). The release workflow assumes tag pushes of the
  form `v*` and the presence of `zip` on the runner (Ubuntu default has it).
- **The installed copy** (`~/.claude/skills/three-loop-workflow/`) is in sync today (audit AC-G5);
  after merge the main agent re-syncs it per CLAUDE.md, but that is an operational step, not a
  deliverable.
- Assumption: the `two-generation` token wording in the five canonical files will not be paraphrased
  away by this task (C5 only *adds* the token at line 28; it does not remove it elsewhere).
- **Phase sequencing (explicit):** Phase A precedes Phase C. Two cross-phase dependencies follow:
  (1) C8's claim that CLAUDE.md accurately describes the gate is only honest once A5 has made the
  `require "two-generation"` real — so A5 (Phase A) lands before C8 (Phase C). (2) The `wc -w` ceiling
  gate is *added* in Phase A (A6) but the always-loaded surface is only trimmed in Phase C (C7); on
  the real tree the ceiling holds throughout (2883 ≤ 2888), so the Phase-A gate is green immediately,
  and the **binding** headroom check is the Phase-C accept on the final tree (measured `wc -w` = 2874,
  margin 14 — see D5). No Phase-A/B edit adds words to SKILL.md, so the Phase-A margin holds until C7.

## 6. Relationship with Existing Designs

- `docs/audit-2026-06-16.md` — the source of every finding; this design's deliverable IDs map to its
  H/M/low/nit IDs.
- `docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` — AC-G1/AC-G3 (lines 323-333) are the
  documents that overclaim the two-generation gate coverage; D3/C8/E4 reconcile them. The `wc -w`
  metric decision (lines 76-79) is the source of the A6/D5 ceiling. **No conflict** — this task
  *implements* a gate that doc already assumed existed.
- `docs/design/2026-06-09-skill-orchestration-upgrade.md` §7 — E3 marks it stale; this design does
  not alter its content, only annotates it.
- `references/multi-voter-review.md` (line ~56 "identical mechanical-union logic") — B3 scopes it.
- Terminology anchors: CLAUDE.md _language-policy_ role; all skill terminology (role names,
  `two-generation`, `fix(phaseN-roundR)`, `clean-first-round`, `fixApplied`) must remain consistent
  with `SKILL.md` and the existing `docs/design/`. No conflicts requiring escalation were found.

## 7. Acceptance Criteria (measurable, shell-runnable from repo root)

PASS = each command exits/greps as stated, against the post-repair tree.

Two fixture styles: A3/A8 negative tests build a self-contained `mktemp` fixture (no tracked file
touched). A5d/A6c MUST mutate a tracked file to exercise the gate (which reads fixed paths under
`three-loop-workflow/`) — they do so under a `trap '...' EXIT INT TERM` that restores the file from a
`mktemp` backup, so an interrupted run cannot leave the tree mutated. The impl doc carries these as
literal `<ACCEPT-CMD>` scripts with the `trap`; the shapes are pinned here so the criteria are
measurable at L1.

- AC-A1 (block multi-`-m` invalid subject): `printf '{"tool_input":{"command":"git commit -m \\"bogus no prefix\\" -m \\"chore: ok\\""}}' | bash three-loop-workflow/references/validate-commit-msg.sh; test $? -eq 2`.
- AC-A1-noregress (**mandatory** both-direction): `printf '{"tool_input":{"command":"git commit -m \\"fix(phase2): x\\""}}' | bash …/validate-commit-msg.sh; test $? -eq 0` — the pre-existing single-`-m` valid commit STILL passes.
- AC-A2 (`-am` invalid subject blocked): `printf '{"tool_input":{"command":"git commit -am \\"bogus no prefix\\""}}' | bash …/validate-commit-msg.sh; test $? -eq 2`.
- AC-A3 (jq and no-jq paths agree): run twice in a jq-stripped PATH — `D=$(mktemp -d); ln -s "$(command -v bash)" "$D/bash"; PATH="$D" bash …/validate-commit-msg.sh` (no jq on PATH) — assert the valid `fix(phase2-round2): x` JSON exits 0 and an invalid `wip: x` JSON exits 2, matching the jq-present path; `rm -rf "$D"`. (Impl doc pins the exact two-invocation script.)
- AC-A4 (`phase0`/`round0`/leading-zero rejected): `fix(phase0): x` → exit 2 AND `fix(phase2-round0): x` → exit 2 AND the valid `fix(phase2-round2): x` still exits 0.
- AC-A5a (token pinned): `grep -q 'require "two-generation"' three-loop-workflow/references/check-consistency.sh`.
- AC-A5b (comment corrected): `! grep -q 'Two-generation termination wording' three-loop-workflow/references/check-consistency.sh`.
- AC-A5c (gate green on real tree): `bash three-loop-workflow/references/check-consistency.sh` exits 0.
- AC-A5d (**negative test — proves the gate is real, not a no-op**): `F=$(mktemp); cp three-loop-workflow/references/schemas.md "$F"; sed 's/two-generation//g' "$F" > three-loop-workflow/references/schemas.md; bash three-loop-workflow/references/check-consistency.sh; test $? -ne 0; cp "$F" three-loop-workflow/references/schemas.md; rm "$F"` — removing the token from a canonical file makes the gate FAIL (then restored). The impl doc encodes this with a `trap`-based restore so an interrupted run cannot leave the tree mutated.
- AC-A6a (ceiling present): `grep -Eq 'wc -w' three-loop-workflow/references/check-consistency.sh`.
- AC-A6b (real tree under ceiling): `test "$(wc -w < three-loop-workflow/SKILL.md)" -le 2888`.
- AC-A6c (**negative test**): `F=$(mktemp); cp three-loop-workflow/SKILL.md "$F"; for i in $(seq 1 4000); do printf 'w '; done >> three-loop-workflow/SKILL.md; bash three-loop-workflow/references/check-consistency.sh; test $? -ne 0; cp "$F" three-loop-workflow/SKILL.md; rm "$F"` — a bloated SKILL.md trips the gate (then restored via `trap`).
- AC-A7 (provenance comment fixed): `! grep -q 'AcceptResult fixApplied' three-loop-workflow/references/check-consistency.sh`.
- AC-A8a (zero-arg guard): `bash three-loop-workflow/references/check-workflow-syntax.sh; test $? -ne 0` (prints a usage message to stderr).
- AC-A8b (real scripts still parse): `bash …/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js three-loop-workflow/references/review-panel.js; test $? -eq 0`.
- AC-A8c (`/gm` strip — **negative-direction**): a `mktemp` `.js` fixture with a first `export const meta = {...}` line AND a **second top-level `export const ...`** line passes the patched checker (exit 0); the impl doc also confirms the **`/m`-only** predecessor FAILS this same fixture (it strips only the first `export`, leaving the second `export` as a parse error inside `new Function`), proving the fixture discriminates. (`export default` is NOT used — stripping `export ` from it leaves invalid `default ...`; verified at L2.) Fixture removed after.

**Phase B**
- AC-B1: `grep -q 'clarifications' three-loop-workflow/references/l3-phase.js` within `panelReview`'s return object (impl doc pins the line range).
- AC-B2: `! grep -q 'round: acceptRound++' …` and the three `cap-exhausted` returns report `MAX_ROUNDS`/the ran round — verified by reading + `check-workflow-syntax.sh` exit 0.
- AC-B3: `multi-voter-review.md` no longer asserts the two paths return identical total-failure outcomes; `grep` for the scoped wording.
- AC-Bsyntax: `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js three-loop-workflow/references/review-panel.js` exits 0.

**Phase C**
- AC-C1: the SKILL.md `description` no longer lists "dependency upgrades" in a bare "Skip" without the None-review qualifier (grep the description line).
- AC-C2: both `SKILL.md` and `references/light-mode.md` contain the None-reviewer re-confirm clause (grep a shared phrase).
- AC-C3: `! grep -q 'Section 6 escalation' three-loop-workflow/SKILL.md`.
- AC-C4: `! grep -q '~3' three-loop-workflow/SKILL.md` (the tier-count tilde is gone).
- AC-C5: `grep -q 'two-generation' three-loop-workflow/SKILL.md` at the line-28 carve-out (impl doc pins the phrase) AND `! grep -q 'two consecutive clean rounds' SKILL.md`.
- AC-C6: the standardized exclusion phrasing appears in both the description and the None row — `grep` the chosen single phrase (e.g. `no file edits`) at both sites in `three-loop-workflow/SKILL.md`.
- AC-C7: `wc -w three-loop-workflow/SKILL.md` ≤ 2888 AND the round-tracking mechanic now appears in a `references/*.md` file.
- AC-C8a (CLAUDE.md no longer overclaims): after A5 lands, `CLAUDE.md`'s consistency-gate paragraph describes the two-generation check truthfully — `grep -q 'require "two-generation"' three-loop-workflow/references/check-consistency.sh` (the gate now genuinely pins it) so CLAUDE.md listing it as a checked token is now accurate; AND the `zero severe`/`zero general` entry is described as the per-round cleanliness predicate, not the termination wording — `grep -qi 'cleanliness\|per-round' CLAUDE.md`.
- AC-C8b (ceiling documented): `grep -Eq 'wc -w|word.?count|2888' CLAUDE.md` — the new standing bloat gate is named in CLAUDE.md _common-commands_.
- AC-Cconsistency: `bash three-loop-workflow/references/check-consistency.sh` exits 0 (no token dropped by any SKILL.md edit).

**Phase D**
- AC-D1: `! grep -q "phase1-dev-r1'" three-loop-workflow/references/schemas.md` OR a clarifying note is present (impl doc pins exact form).
- AC-D2: `loop-1-design.md` review-template bullet back-references section 7 (grep) and does not restate the full threshold-severity sentence twice.
- AC-D3: `grep -qi 'not resumable\|restart' three-loop-workflow/references/loop-3-workflow.md` AND `l3-phase.js` carries a matching comment (grep).

**Phase E**
- AC-E1: `test -f LICENSE` AND `grep -qi 'MIT' LICENSE` AND `grep -q 'License' README.md` AND `grep -qi 'license' three-loop-workflow/SKILL.md`.
- AC-E2: `! git ls-files --error-unmatch three-loop-workflow.skill` (untracked) AND `test -f .github/workflows/release.yml` AND `release.yml` has the expected structure via dependency-free grep (`grep -Eq '^on:' .github/workflows/release.yml` AND `grep -q 'tags:' .github/workflows/release.yml` AND `grep -q "v\*" .github/workflows/release.yml` AND `grep -Eq '^jobs:' .github/workflows/release.yml`) — GitHub Actions does the authoritative YAML parse at run time; no extra parser dependency is introduced. The `.gitignore` `*.skill` comment references the release workflow (the channel now exists).
- AC-E3: `grep -qi 'historical\|stale\|superseded' docs/design/2026-06-09-skill-orchestration-upgrade.md` near §7.
- AC-E4: `! grep -q 'expected_behavior' docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` (the literal field-name claim) — or it is clearly marked as prose; `grep -l '^expected:' tests/scenarios/*.md` still returns all four.
- AC-E5: `! grep -q '双击即可识别' README-cn.md` AND `! grep -q '两档表' README-cn.md`.
- AC-E6: `grep -qi 'superpowers' README.md` in an acknowledgments context.

**Phase F**
- AC-Fcount: `ls tests/scenarios/*.md | wc -l` == 10 (4 existing + 6 new: F1–F6).
- AC-Fshape: each new file has an `^expected:` line whose value is the literal pinned in §2 (F1 `{"chosen_tier":"Light"}`, F2 `{"chosen_tier":"None"}`, F3 `{"chosen_action":"rollback-to-L1-or-L2"}`, F4 `{"chosen_action":"ask-before-delete"}`, F5 `{"chosen_tier":"Full"}`, F6 `{"chosen_tier":"None"}`) AND each file presents 2-3 options including a documented trap (`grep`-checkable: the file contains a tempting wrong option).
- AC-Fdiscriminating: each new scenario is run by **one fresh subagent** against the post-repair skill and MUST produce the file's `expected` value (not the trap). Because each file embeds the trap a non-compliant agent would pick, a pass demonstrates the scenario discriminates compliant from non-compliant behavior — this is the before/after observation for the C1 (via F6) and C2 (via F5) wording fixes.

**Whole-task gates (run at F)**
- AC-G-consistency: `bash three-loop-workflow/references/check-consistency.sh` exits 0.
- AC-G-syntax: `bash three-loop-workflow/references/check-workflow-syntax.sh three-loop-workflow/references/l3-phase.js three-loop-workflow/references/review-panel.js` exits 0.
- AC-G-behavioral: all 10 `tests/scenarios/*.md` (4 existing + 6 new) re-run via fresh subagents assert their `expected` field (required because this task edits the tier table, escalation rules, and termination wording). The 4 **existing** scenarios must still pass after the Phase-C wording edits; if a C-edit moved a phrase one of them asserts, that scenario is reconciled to the post-repair wording (R6) — an `expected` value is never weakened.
- AC-G-bloat: `wc -w three-loop-workflow/SKILL.md` ≤ 2888.
- AC-G-build: `zip -r /tmp/verify.skill three-loop-workflow/ >/dev/null && unzip -l /tmp/verify.skill | grep -q SKILL.md` (the artifact still builds).

**Quality budget.** This change has no hot path, latency, or UI surface; the relevant quality
attribute is the always-loaded token budget, declared as the measured `wc -w ≤ 2888` criterion
(AC-G-bloat). No other quality budget applies; performance/latency are explicitly out of scope.

## 8. Risks and Rollback

- **R1 — Phase B edits the running L3 engine.** If a Phase-B edit breaks `l3-phase.js`, later phases
  that invoke it fail. *Mitigation:* run `check-workflow-syntax.sh` as a Phase-B ACCEPT-CMD before
  merging; order Phase B after the shell-gate phase so the engine is touched on a known-good base;
  each phase is a separate branch merged `--ff-only`, so a bad phase is revertable in isolation.
- **R2 — A5/A6 gate edits could false-fail the gate itself.** *Mitigation:* AC-A5/AC-A6 require
  `check-consistency.sh` to exit 0 on the real tree and to exit non-zero only on a crafted negative;
  the gate is run at every phase accept and at F.
- **R3 — SKILL.md edits drop a commitment token** (e.g. relocating prose removes a paired token).
  *Mitigation:* AC-Cconsistency runs the consistency gate after every SKILL.md edit; the gate now
  also pins `two-generation` (A5).
- **R4 — `wc -w` ceiling too tight** for legitimate future edits. *Mitigation:* ceiling is 2888 with
  the C7 relocations creating headroom; the value is a single constant, trivially raised by a future
  cycle with rationale.
- **R5 — CI workflow YAML errors** ship a broken Action. *Mitigation:* AC-E2 parses `release.yml`;
  the release workflow is gated to `v*` tags and does not run on normal pushes.
- **R6 — a Phase-C wording edit breaks an existing scenario** that greps the old phrasing.
  *Mitigation:* AC-G-behavioral re-runs all 4 existing scenarios against the post-repair skill; any
  that drift are reconciled to the new wording (intent unchanged, `expected` never weakened). The four
  existing `expected:` values key on tier/action tokens (`Full`, `escalate`, `closes_this_round`,
  `bounded-redispatch-then-escalate`) that the C-edits do **not** touch, so a break is unlikely but
  checked.
- **R7 — `wc -w` ceiling false-fails at F.** *Mitigation:* the D5 budget is **empirically measured**
  (not estimated): the Phase-C net is −9 words → final `wc -w` = 2874, a 14-word margin under 2888.
  The ceiling is checked at the Phase-C accept on the final tree (AC-A6b/AC-C7), giving a per-phase
  early warning rather than a surprise at F. If a later phase incidentally adds words to SKILL.md, the
  gate catches it and forces a deliberate trim-or-justify — which is the gate working as intended.
- **Rollback:** every L3 phase is an isolated branch; revert the merge commit to undo a phase. The two
  task documents and this design are the recovery record. No data migration or external state is
  touched, so rollback is `git revert` of the relevant merge(s). `git rm --cached` of the zip (E2) is
  reversed by `git add three-loop-workflow.skill` if the packaging decision is later changed.
- **Version field (F):** whether to bump `metadata.version` (1.5.0 → 1.5.1 or 1.6.0) is decided at
  closeout; default is a patch bump (1.5.1) since this is hardening, not new capability. Recorded here
  so the choice is explicit, not silent.
