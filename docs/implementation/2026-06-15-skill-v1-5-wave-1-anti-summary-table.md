# Implementation — v1.5 Wave 1: anti-summary surface + one consolidated rationalization table

**Slug:** `2026-06-15-skill-v1-5-wave-1-anti-summary-table` (matches the design doc)
**Design doc:** `docs/design/2026-06-15-skill-v1-5-wave-1-anti-summary-table.md`
**Umbrella:** `docs/design/2026-06-15-skill-v1-5-compliance-hardening.md` (§3, §4b binding)

A fresh agent can execute this without the session. "Tests" here are **grep/gate assertions**: the TDD
order is *write the acceptance grep, confirm it FAILS on the current file (watch-it-fail), make the edit,
confirm it PASSES.* Anchor strings were verified absent from the baseline (SKILL.md `wc -w` baseline = **2888**).

**Anti-bloat arithmetic (verified by word-count of the exact edit blocks):** the Group-A/B edits net
**−10 words** on `SKILL.md` — removed A1 sentence (30) + Quick-orientation blockquote (73) = 103; added
A4 line + A2 directive (73) + B3 pointer (20) = 93 → post-edit ≈ **2878 ≤ 2888**. **Recovery if the
`wc -w ≤ 2888` gate ever fails at accept:** the A2 Operating-rule directive and the B3 SKILL.md pointer
carry no load-bearing content beyond their AC anchor strings ("Operating rule", "read it in full before
acting", "Rationalizations — recognize and stop") — tighten their prose, preserving those anchors, until
the budget holds; never touch A1/A4/B1 content to make budget.

## 1. Task Index

| Phase | Design Deliverables | Design Acceptance |
|---|---|---|
| Phase 1 (Group A) | A1, A2, A4 (`SKILL.md`); A3 (`light-mode.md`) | AC-A1, AC-A2, AC-A4, AC-A3, AC-W1-G4, AC-W1-G5 |
| Phase 2 (Group B) | B1 (`escalation-rules.md`); B2 (`l3-phase.js`, `loop-1-design.md`, `loop-2-implementation.md`); B3 (`SKILL.md`, `loop-3-development.md`, `end-to-end-review.md`) | AC-B1, AC-B2, AC-B3, AC-W1-BEH |
| Both | global | AC-W1-G1 (consistency), AC-W1-G2 (workflow-syntax), AC-W1-G3 (token regression), AC-W1-G6 (banned-import) |

All file paths below are relative to the repo root; the skill lives under `three-loop-workflow/`.

## 2. Phase Breakdown

### Phase 1 — Group A (anti-summary surface + tier calibration)

**Entry condition:** L1 closed (it is). Baseline gates green.
**Design refs:** design doc §2 Group A; umbrella §4b-2 (naming), §4b-5 (anti-bloat), §4b-6 (no praise guard).

**Task list (TDD order — grep first, watch it fail, then edit):**

- **T1 (test):** confirm `grep -c "It enforces a three-loop discipline" three-loop-workflow/SKILL.md` = 1 now and must become 0; `grep "version: \"1.5.0\""` must go 0→1.
- **I1 (A1):** In `three-loop-workflow/SKILL.md` frontmatter, (a) delete the sentence *"It enforces a three-loop discipline (L1 Design Document → L2 Implementation Document → L3 Development Work) with mandatory fresh-subagent reviews, round caps of 3 per domain, and explicit escalation rules. "* from the `description:` (leave the surrounding sentences and the two spaces collapsed to one); (b) change `version: "1.4.0"` → `version: "1.5.0"`. Do not touch any other description text.
- **T2 (test):** `grep -c "Quick orientation" SKILL.md` must go 1→0; `grep "Operating rule"` and `grep "read it in full before acting"` 0→1; `grep "ESCALATES — IT NEVER LOWERS THE BAR"` 0→1.
- **I2 (A4+A2):** In `three-loop-workflow/SKILL.md`, replace the entire "Quick orientation" blockquote (the 5 lines beginning `> **Quick orientation**:` … ending `…check the routing table.`) with **exactly** this block (A4 code-fence line above the A2 Operating-rule directive):

  ````markdown
  ```
  HITTING THE ROUND CAP ESCALATES — IT NEVER LOWERS THE BAR.
  ```

  > **Operating rule**: execute this skill from the reference files, not from this page. Once routed to a
  > reference, read it in full before acting — do not paraphrase the procedure from a summary here. Operating
  > from a gist is the drift this skill exists to prevent. You cannot skip a loop. If unsure which loop you are in, check the routing table.
  ````

  > **L3-review fix — MUST retain "You cannot skip a loop."** That rule lived only in the removed
  > Quick-orientation blockquote; dropping it was the one real general from the Phase-1 panel. The clause
  > adds ~5 words; SKILL.md `wc -w ≤ 2888` still holds (Phase-1 net ≈ 2863). Add a grep to AC: `grep -q "You cannot skip a loop" SKILL.md`.
- **T3 (test):** `grep "Looks Light, is actually Full"` and `grep "splitting to dodge the line is still Full"` in `light-mode.md` 0→1.
- **I3 (A3):** In `three-loop-workflow/references/light-mode.md`, insert the table directly **before the `## What Light Mode keeps` heading** (i.e. immediately after the "When Light Mode is allowed" paragraph that ends "…is always Full Mode." — the `## What Light Mode keeps` heading is the decisive anchor; do not split a paragraph):

  ```markdown
  ### Looks Light, is actually Full

  | Looks Light | Trigger fired → Full |
  |---|---|
  | "Just add a config flag defaulting to 30s" | default-threshold decision (no source-of-truth constant cited) |
  | "Rename a field in a stored JSON shape" | breaking change: storage layout |
  | "Split this one change into a 4th tiny file" | >3 files — splitting to dodge the line is still Full |
  | "Tweak a constant the algorithm already had" | still a threshold decision unless you cite an existing constant in docs/design/ or source |
  ```

**Per-task / Phase-1 ACCEPT-CMD** (runnable from repo root; all must exit 0):
```bash
cd three-loop-workflow
# A1
! grep -q "It enforces a three-loop discipline" SKILL.md
grep -q "quickly add Y" SKILL.md && grep -q "Skip only for" SKILL.md
grep -q 'version: "1.5.0"' SKILL.md
# A2 / A4
! grep -q "Quick orientation" SKILL.md
grep -q "Operating rule" SKILL.md && grep -q "read it in full before acting" SKILL.md
grep -q "ESCALATES — IT NEVER LOWERS THE BAR" SKILL.md
grep -q "You cannot skip a loop" SKILL.md   # preserve the no-skip rule (L3-review fix)
# A3
grep -q "Looks Light, is actually Full" references/light-mode.md
grep -q "splitting to dodge the line is still Full" references/light-mode.md
# anti-bloat (AC-W1-G5): always-loaded SKILL.md word count must not grow vs pre-wave baseline
test "$(wc -w < SKILL.md)" -le 2888
# gate
bash references/check-consistency.sh
```
**Exit condition:** all Phase-1 ACCEPT-CMDs exit 0; `<TEST-CMD>` N/A (no suite); `check-consistency.sh` green.

### Phase 2 — Group B (one consolidated rationalization table + inline subset + pointers)

**Entry condition:** Phase 1 committed and green.
**Design refs:** design doc §2 Group B, Decision W1-1/W1-2; umbrella §4b-1 (reviewer-read basis), §4b-3, §9 crosswalk (lessons 5-10).

**Task list (TDD order):**

- **T4 (test):** `grep "Rationalizations — recognize and stop"`, `grep "WHAT, not HOW"`, `grep "reviewer reads only the doc"` in `escalation-rules.md` 0→1.
- **I4 (B1):** In `three-loop-workflow/references/escalation-rules.md`:
  - (a) Append to the `## Forbidden` section, after the existing "*…the exact failure mode this rule prevents.*" paragraph, this bullet:
    > Also forbidden: **deferring an interpretation decision to the L1 reviewer** ("I'll note my assumption in the doc and the reviewer will catch it"). The L1 review subagent reads only the doc — it can challenge a contradiction or a single-option decision, but it cannot know the user's intent. Only the user can resolve an interpretation; a silently-resolved interpretation surfaced as a doc "assumption" was never decided, just hidden.
  - (b) Immediately after the Forbidden section (before `## Question quality requirements`), insert this section (the ONE consolidated table — exactly 9 data rows, grouped tier→escalation→review/accept→fix):

    ```markdown
    ## Rationalizations — recognize and stop

    The excuses agents generate under pressure, each with the rule it violates. Catching yourself
    thinking one of these means: re-run the relevant gate or escalate — do not proceed.

    | You catch yourself thinking | Reality → what to do |
    |---|---|
    | "It's only ~3 files / I'll split it into two tasks" | Still Full if any Full-Mode gate trips; splitting to game the ≤3 line is forbidden (light-mode.md Full-Mode gate). |
    | "The decision has an obvious winner" | If it truly has a clear winner it is not a >1-option decision; if you are arguing the point, it is one — surface it (§0.1; Question quality below). |
    | "They said do it quickly / just add Y" | Instructions say WHAT, not HOW; terse phrasing is not a tier downgrade (SKILL.md "Which tier applies"). |
    | "I'll just note the default/assumption in a comment" | A silent default is Forbidden (above) and violates comments-explain-code-not-workflow (§0.3); escalate instead. |
    | "First review came back clean, so I'm done" | A clean first round closes a Phase only under the L3 clean-first-round relaxation AND only if no fix was applied; L1/L2 always need the confirming generation; any fix re-engages two-generation (SKILL.md shared termination). |
    | "The dev summary says it's done" | Review and accept read the diff (`git diff <baseSha>..<branch>`), never the dev summary — the summary is not evidence. |
    | "An unresolved general issue is just advisory, ship it" | An unresolved general issue blocks two-generation closure; it is corroboration, not advice. |
    | "Quick patch now, investigate the cause later" | A symptom fix spends the shared round budget and forces a later clean round anyway; name the root cause first (loop-3-development.md fix corner). |
    | "One more fix attempt" (at round 3) | Round 3 escalates with a deadlock report, never a silent round 4 — the cap is the trigger, not a bug (Round-cap exhaustion below). |
    ```
- **T5 (test):** `grep "read the diff, not the dev summary" l3-phase.js` 0→1; `grep "two-generation rule needs a confirming clean round"` in `loop-1-design.md` and `loop-2-implementation.md` 0→1 each.
- **I5 (B2 — inline reviewer subset, where the reviewer actually reads):**
  - In `three-loop-workflow/references/l3-phase.js`, extend the `reviewPrompt` string by turning its final segment into a `+`-concatenation. Change the last line `` `Return a ReviewVerdict (see references/schemas.md).` `` to **exactly** these two concatenated string lines:
    ```js
        `Return a ReviewVerdict (see references/schemas.md). ` +
        `Trip-wires (do not rationalize past these): read the diff, not the dev summary — the summary is not evidence; an unresolved general issue blocks closure.`
    ```
    (Run `check-workflow-syntax.sh references/l3-phase.js` after — AC-W1-G2.)
  - In `three-loop-workflow/references/loop-1-design.md` review template, add a `[Trip-wires]` line in the `[Steps]` block: `A clean first round does not close L1 — the two-generation rule needs a confirming clean round; an unresolved general issue blocks closure.`
  - In `three-loop-workflow/references/loop-2-implementation.md` review template `[Steps]`, add the identical line: `A clean first round does not close L2 — the two-generation rule needs a confirming clean round; an unresolved general issue blocks closure.`
- **T6 (test):** `grep "Rationalizations — recognize and stop"` in `SKILL.md`, `loop-3-development.md`, `end-to-end-review.md` 0→1 each (pointers).
- **I6 (B3 — pointers, no table duplication):**
  - `three-loop-workflow/SKILL.md`, immediately after the "Principle composition" table, add:
    `> **Rationalizations** (the excuses for dodging these principles, and the rule each breaks): see \`references/escalation-rules.md\` "Rationalizations — recognize and stop".`
  - `three-loop-workflow/references/loop-3-development.md`, after the role-responsibilities table, add:
    `> **Rationalizations — recognize and stop**: the review/accept/fix excuse trip-wires live in \`references/escalation-rules.md\`.`
  - `three-loop-workflow/references/end-to-end-review.md`, near `## Closure rule`, add:
    `> **Rationalizations — recognize and stop**: closeout excuse trip-wires live in \`references/escalation-rules.md\`.`

**Phase-2 ACCEPT-CMD** (all exit 0):
```bash
cd three-loop-workflow
# B1
grep -q "Rationalizations — recognize and stop" references/escalation-rules.md
grep -q "WHAT, not HOW" references/escalation-rules.md
grep -q "reviewer reads only the doc" references/escalation-rules.md
# B2 (inline where the reviewer reads)
grep -q "read the diff, not the dev summary" references/l3-phase.js
grep -q "two-generation rule needs a confirming clean round" references/loop-1-design.md
grep -q "two-generation rule needs a confirming clean round" references/loop-2-implementation.md
# B3 pointers
grep -q "Rationalizations — recognize and stop" SKILL.md
grep -q "Rationalizations — recognize and stop" references/loop-3-development.md
grep -q "Rationalizations — recognize and stop" references/end-to-end-review.md
# anti-bloat re-check after B3 pointer added to SKILL.md
test "$(wc -w < SKILL.md)" -le 2888
# gates
bash references/check-consistency.sh
bash references/check-workflow-syntax.sh references/l3-phase.js
# banned-import guard (must find none; each returns non-zero => the ! makes exit 0)
! grep -rqi "regardless of perceived simplicity" .
! grep -rq "delete the implementation and restart" .
# no new reference .md file (count unchanged: pin to baseline 12)
test "$(ls references/*.md | wc -l)" -eq 12
```
**Exit condition:** all Phase-2 ACCEPT-CMDs exit 0; B1 table has ≤9 data rows (L3 review-corner check); the [B] scenario (below) passes at EER closeout.

> **B1 row-count (≤9):** the L3 review corner verifies the table has exactly the 9 rows above and no overlap with the inline B2 subset beyond the canonical-plus-inline pattern (B2 is a ~1-line subset, not a copy of the table).
> **`ls references/*.md` baseline = 12** (verified at L2 authoring: claude-md-integration, end-to-end-review, escalation-rules, light-mode, loop-1-design, loop-2-implementation, loop-3-development, loop-3-teams, loop-3-workflow, multi-voter-review, optional-subagents, schemas — none added by this wave). Confirm the count at L3 if a file was added/removed since.

### Behavioral [B] — at this wave's EER closeout (umbrella §4b-3, structured output)

**AC-W1-BEH:** spawn one fresh subagent. Give it (i) the post-edit `l3-phase.js` `reviewPrompt` text, and
(ii) a tiny synthetic diff whose dev summary says "all done, looks good" but which contains a planted
unhandled-error/off-by-one defect. The subagent must emit JSON `{"read_diff": <bool>, "flagged_defect": <bool>}`.
**Pass = `read_diff == true AND flagged_defect == true`** (field comparison; no free-text judgment). This
verifies the B2 "read the diff, not the dev summary" trip-wire actually steers behavior. Record the JSON in
the closeout report.

## 3. Engineering Constraints Index

- **Engineering norms:** CLAUDE.md _engineering-norms_ (this repo distributes a skill; primary artifacts are
  Markdown + the JS workflow scripts + shell gates). English only (CLAUDE.md _language-policy_; the em-dash
  style matches existing files).
- **Four-corner template + L3 execution:** `references/loop-3-development.md` / `references/loop-3-workflow.md`.
  **L3 review corner runs in panel mode** for these load-bearing edits (user-chosen posture): invoke
  `l3-phase.js` with `reviewMode: 'panel'`.
- **Commit conventions:** SKILL.md "Commit conventions" — `feat(phase1):` / `feat(phase2):` openers,
  `fix(phaseN-roundR): <failing-item-keyword>` for within-round fixes, gate results as trailers, no AI/tooling
  mention. Anti-bloat: record `SKILL.md wc -w` (before/after) in the Phase commit trailer (AC-W1-G5).
- **Workflow-script rule:** after any `l3-phase.js` edit, validate with `check-workflow-syntax.sh`, never `node --check`.

## 4. Data and Fixture Dependencies

- No new test fixtures. The only behavioral fixture is the inline synthetic diff in AC-W1-BEH, constructed
  ad hoc by the closeout subagent (not committed; the standing `tests/scenarios/` suite is Wave 3).
- Reuses existing gates `check-consistency.sh`, `check-workflow-syntax.sh`.

## 5. Regression Protection

- `check-consistency.sh` must stay green every Phase (guards the five role names, `fix(phaseN-roundR)`, five
  questions, two-generation wording across paired sites) — this is AC-W1-G1/G3.
- `check-workflow-syntax.sh references/l3-phase.js` must stay green after the B2 edit (AC-W1-G2).
- The retained description trigger keywords (`quickly add Y`, `Skip only for`) and the routing table must
  remain intact (A1 only deletes one sentence).
- The two-generation termination wording survives A2's blockquote removal because it lives at 6+ other
  `SKILL.md` sites (verified) — `check-consistency.sh` is the authority.
