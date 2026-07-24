# Design: F-phase project-closeout expansion

## 1. Background and Purpose

The final **F: End-to-End Review** (`references/end-to-end-review.md`) is the skill's task-closeout
gate. Today it does six things: tick Deliverables; run `<TEST-CMD>`+`<ACCEPT-CMD>`; attach E2E
evidence when triggered; clean up `e2e/*` worktrees; run a fresh-eyes whole-*change* correctness
review (diff vs Deliverables); consolidate the task's own two docs.

The user asked for four closeout capabilities. They decompose into **five concrete new behaviors**
(B1–B5) — the "check the whole project" ask is two distinct behaviors (a scan and a gate run), which
is why the enumeration is five, not four:

| User ask | New behavior(s) | What's missing today |
|---|---|---|
| Check the whole project | **B1** whole-project blast-radius review; **B2** run all repo-wide gates | The fresh-eyes review reads only `git diff <base>..HEAD`, so a caller in an *untouched* file left stale is invisible; and step 2 runs only `<TEST-CMD>`/`<ACCEPT-CMD>`, not the project's lint/typecheck/consistency gates. |
| Do safe cleanups | **B3** change-orphan cleanup sweep | Cleanup covers only `e2e/*`; artifacts *this change* orphaned project-wide (dead imports, now-unreferenced files, leftover scaffolding) are never swept. |
| Check the migration work | **B4** conditional migration verification | A migration is referenced only as an L1 escalation *cost*; nothing at closeout verifies it is complete, reversible, applied, and free of callers on the old contract. |
| Update documents | **B5** scoped project-doc reconciliation | Closeout consolidates only the task's two docs and forbids touching others; a change that alters a documented surface leaves README/CLAUDE.md/user docs describing behavior that no longer exists. |

If we do not close these, the skill's own promise — "eliminates a category of failures that compound
across tasks" — leaks at the last mile: the per-change loops pass while the project drifts.

## 2. Deliverables

Each of B1–B5 maps to one Deliverable D1–D5; D6–D11 are the supporting surface, gate, fixtures,
Light-Mode echo, and dogfooded version/doc sync.

- [x] **D1 (B1) — Whole-project correctness review.** Extend the F fresh-eyes review (current step 4b)
  so it also runs a **blast-radius scan outside the diff**: identify consumers/callers of any
  symbol, contract, file, or behavior the change altered or removed, and confirm each is updated —
  in addition to the existing diff-vs-Deliverables review.
- [x] **D2 (B2) — Repo-wide validation gates.** Extend the F run-commands step (current step 2) so it
  runs **whatever repo-wide validation gates the project declares under CLAUDE.md `_common-commands_`**
  — resolved dynamically from that role, not a hard-coded command list (test / lint / typecheck /
  consistency / syntax are *illustrative* examples, not the contract) — instead of only `<TEST-CMD>`.
  **Operational test for "validation gate"** (parallel to KD4's doc-scope test, so resolution is
  rule-bound not per-agent-judgment): a declared command is a validation gate **iff its exit code is a
  pass/fail verdict on repo correctness/consistency**; build/deploy/packaging actions (e.g. this
  repo's zip-rebuild and rsync installed-copy-sync) are **not** gates and are not run as closeout
  checks. Generic across projects (portability contract, §5); this repo's declared gates are
  `check-consistency.sh` and `check-workflow-syntax.sh`.
- [x] **D3 (B3) — Safe cleanup sweep.** Extend the F cleanup step (current step 4) with a
  **change-orphan sweep**: remove artifacts *this change* orphaned project-wide. "Safe" = orphaned by
  this change only; pre-existing dead code is mentioned, never deleted (Principle 0.3 preserved).
- [x] **D4 (B4) — Conditional migration verification.** Add a new conditional F step: when the change
  matches the **migration trigger defined in KD3**, run a migration-verification checklist (script
  committed; reversible or a documented rollback realized; applied + tested forward and back; no
  caller on the old contract; staged-rollout backward-compat holds). Non-matching tasks record
  `Migration: n/a` and skip it. **Also add `migration` to the Full-Mode trigger list** (SKILL.md tier
  table + `light-mode.md` Full-Mode gate) so any migration — even a non-breaking one — runs the full
  cycle and never lands in Light Mode unverified (KD3; resolves the round-3 KD3↔D9 contradiction).
- [x] **D5 (B5) — Scoped project-doc reconciliation.** Add a new F step: update project-facing docs
  whose described behavior the change altered (README, CLAUDE.md, user/API docs, changelog), in the
  closing commit. Apply the **operational boundary test in KD4**; unrelated docs stay off-limits.
  The new step and the step-5 consolidation rule carry mutual cross-reference tokens so they cannot
  read as contradictory.
- [x] **D6 — SKILL.md surface sync (net-neutral).** Bind the new closeout gates into the **Task-closed
  bullet of the "Self-check" section** (the anchor chosen in KD5) so they are discoverable, staying
  within the `wc -w` ceiling per the budget plan in KD7.
- [x] **D7 — Consistency-gate parity.** Register each new commitment clause in the
  `claude-md-integration.md` cross-file table with its full reference-site set (KD5); add a `require`
  token check to `check-consistency.sh` per clause so a future silent drop fails the gate. This
  includes: (i) the five B1–B5 step-presence tokens, each `require`d across its **full** file list —
  `change-orphan` and `project-doc reconciliation` list `light-mode.md` as a third file (so AC1
  subsumes the AC2 light-mode sites); (ii) the **two AC7 cross-reference tokens** as a `require` pair
  (the consolidation step and the D5 step each carry a literal pointer to the other — KD4), giving the
  contradiction-delimiter the same gate parity; (iii) a **fixture-existence** check that all five
  `tests/scenarios/<B-slug>.md` files exist, so dropping a fixture red-fails the standing gate (not
  only the human-run behavioral suite); (iv) a `require` line for the **existing consolidation clause**
  (today table-registered only — `claude-md-integration.md:87` — but not gate-required), closing that
  pre-existing gap for true parity (KD5).
- [x] **D8 — Behavioral fixtures, one per new behavior.** Add a `tests/scenarios/*.md` fixture for
  **each** of B1–B5, each encoding the before→after delta and `expected` outcome fixed in the
  **Behavioral demonstration matrix** below. No "at minimum" floor: every new behavior has its own
  observation.
- [x] **D9 — Light-Mode echo (one line).** Light Mode keeps its collapsed F, but add a single line
  that **literally contains both the `change-orphan` and `project-doc reconciliation` gate tokens**
  (so the KD5 `require` lines for those two tokens — which list `light-mode.md` — stay green): if the
  small change orphaned an artifact (B3) or made a project-facing doc stale (B5), sweep/sync it.
  (B1/B2/B4 do not echo: blast-radius is trivial at ≤3 files; **B4 is now Full-Mode-only by rule** —
  `migration` is a Full-Mode trigger (D4/KD3), so it never reaches Light Mode; B2's gates are already
  implied by Light Mode's acceptance command.)
- [x] **D10 — Dogfooded version bump + README history row.** Two independently-verified
  sub-deliverables (each gated per-file by AC8, so neither can be silently skipped): (a) bump
  `SKILL.md metadata.version` to **1.6.0** (KD6); (b) add a **new v1.6.0 row** containing the literal
  phrase `project-wide closeout` to the version-history table in **both** `README.md` and
  `README-cn.md`. (The F label cell at README.md:35 and the tree comment at :131 need no behavioral
  edit; D10 does not touch them — confirmed no-ops.)
- [x] **D11 — Risks/§8 sync.** Once KD3 fixes the migration trigger, the migration-trigger-ambiguity
  failure path is recorded in §8 (done below).

### D8 detail — Behavioral demonstration matrix (the design-fixed `expected` for each fixture)

Each fixture is a `tests/scenarios/*.md` file in the existing harness format (a prose pressure
scenario + a single-line `expected: {"key":"value"}` JSON field a fresh subagent asserts against the
**edited** skill — matching e.g. `quickly-add-is-full.md` `expected: {"chosen_tier":"Full"}`). The
"before" column is what the **current** skill makes an agent do (the bug); the `expected` column is
the literal JSON the harness asserts, and is reached only under the **edited** skill. Each delta is
real (before ≠ after), so none is a no-op the unedited skill already passes — that is the
discipline-rule-edit demonstration. Compound judgments are folded into one labeled value (as
`tier-downgrade-light-stays-light.md` already does).

| Fixture slug | Pressure scenario | Before (current skill) | `expected:` (literal, edited skill) |
|---|---|---|---|
| `closeout-blast-radius-untouched-caller` (B1) | Change removes/renames a symbol; a caller in a file the diff did **not** touch still uses the old form; the diff-vs-Deliverables review is clean. | Step 4b reads only the diff → stale caller invisible → task closes broken. | `{"action":"block-closure-blast-radius"}` — F scans outside the diff for consumers of changed/removed symbols, finds the stale caller, blocks closure. |
| `closeout-runs-all-declared-gates` (B2) | `<TEST-CMD>` passes, but the project declares a consistency gate under `_common-commands_` that was never run **and that gate is the deciding red signal** (the scenario forces it: tests green, the unrun gate would fail). | Step 2 mandates only `<TEST-CMD>`/`<ACCEPT-CMD>` → agent closes on green tests, never runs the declared gate. | `{"action":"run-all-declared-gates"}` — F resolves and runs every `_common-commands_`-declared gate; the red consistency gate blocks closure. |
| `closeout-orphan-sweep-not-scheduled` (B3) | The change removed the last caller of a helper in a file the final pass does **not** revisit (a change-orphan); the per-step L3 work already closed those Phases. | The F cleanup step covers only `e2e/*` and **schedules no project-wide orphan check**, so the change-orphan in the un-revisited file lingers through closeout. | `{"action":"run-change-orphan-sweep"}` — F's closeout sweep prompts a project-wide change-orphan check that finds and removes this change's orphan, while leaving pre-existing dead code (0.3). |
| `closeout-migration-unverified-blocks` (B4) | Change includes a schema migration with no down-migration/rollback, never applied or tested. | Nothing verifies migrations → task closes with an unreversible, untested migration. | `{"action":"block-closure-verify-migration"}` — F's conditional migration step blocks closure until rollback is documented and the migration is applied+tested with no caller on the old contract. |
| `closeout-doc-reconcile-changed-surface` (B5) | The change alters a CLI flag's behavior that README documents; README now describes the old behavior. An unrelated typo sits elsewhere in README. | Step 5 consolidates only the task's two docs and forbids touching README → README left lying. | `{"action":"reconcile-changed-surface-only"}` — F updates the README passage describing the changed surface and does **not** fix the unrelated typo (drive-by). |

## 3. Scope Boundary

**NOT in scope:**

- A **full repo health audit** at every closeout (KD1 rejected). The whole-project check is bounded
  to the change's blast radius + the project's *already-declared* gates, not a re-review of every
  module.
- **Drive-by tidying** of docs or code unrelated to the change. D5 syncs only docs whose described
  behavior the change altered (KD4 test); D3 removes only *this change's* orphans. Pre-existing dead
  code and unrelated stale docs remain a separate task with their own L1.
- **Renaming the F phase** or restructuring the three loops. The heading stays "F: End-to-End Review
  (Task Closeout)"; only its checklist grows.
- **New Workflow-script (`.js`) control flow.** The F phase is main-agent-run from
  `end-to-end-review.md`; `l3-phase.js` (L3) is not touched.
- **Auto-migration / auto-cleanup tooling.** D4 *verifies* a migration the change already produced;
  D3 *removes* this change's orphans — neither generates migrations nor refactors.
- **Broad Light-Mode tier-gate changes.** The *only* tier-gate touch is the one-line addition of
  `migration` to the Full-Mode trigger list (D4/KD3) — a deliberate, safety-justified change so a
  non-breaking migration cannot land in Light Mode unverified. No other tier rule, threshold, or
  file-count boundary is altered; D9's Light-Mode echo therefore covers only B3/B5 (B4 is now
  Full-Mode-only by rule, not by the earlier false "breaking-change-by-construction" claim).

## 4. Key Design Decisions

### KD1 — Whole-project scope: blast-radius + declared gates (not full audit)

- **Problem:** "Check the whole project" could mean a bounded blast-radius check or a full-repo audit.
- **Options:** (a) blast-radius scan outside the diff + run the project's *declared* repo-wide gates;
  (b) comprehensive whole-repo health review every closeout.
- **Choice:** (a). **Rejected (b):** a full audit at every closeout violates Simplicity First and
  Surgical Changes — closeout is not the place to re-review untouched modules; that is a separate
  audit task. (a) closes the actual gap (the diff is blind to what it should have touched) at bounded
  cost. *(User-confirmed, 2026-06-22.)*

### KD2 — Stale project docs: edit the changed surface (not flag-only)

- **Problem:** When a change makes a project-facing doc stale, does F edit it or only flag it?
- **Options:** (a) F edits docs whose described behavior the change altered, scoped; (b) F flags them
  as Deferred / follow-up issues only.
- **Choice:** (a). **Rejected (b):** a doc that *describes the surface the change altered* is part of
  completing the change; flag-only guarantees a window where the docs lie. Surgical Changes is
  preserved for everything else by the KD4 boundary test. **Risk accepted:** the boundary is
  judgment; mitigated by the explicit test (KD4) and the B5 fixture observing over-reach.
  *(User-confirmed, 2026-06-22.)*

### KD3 — Migration: a dedicated conditional step **with its own trigger definition**

- **Problem:** Where does migration verification live, and *what counts as a migration*? The round-1
  panel correctly caught that an earlier draft falsely claimed the trigger "reuses the breaking-change
  list (no new vocabulary)" — but the canonical breaking-change list
  (`escalation-rules.md`: schema, exit code, CLI arg, storage layout, external protocol; +`directory`
  in `light-mode.md`) neither covers all migrations nor is limited to them.
- **Options:** (a) own conditional F step **with a dedicated migration trigger list** that cites its
  overlap with the breaking-change list; (b) reuse the breaking-change list verbatim; (c) fold a few
  migration bullets under the existing contract/E2E gate (step 3).
- **Choice:** (a). **Rejected (b):** the breaking-change list both *over-* and *under-*covers
  migrations — a backward-compatible additive column with a backfill is a migration but **not** a
  breaking change; a CLI-flag rename is a breaking change but needs **no** state migration. Reusing it
  verbatim would silently miss data/config/dependency migrations. **Rejected (c):** migrations are a
  distinct, high-consequence failure mode (silent data loss, irreversibility) deserving an explicit,
  greppable gate and an explicit `Migration: n/a` skip record (same shape as the E2E skip-reason);
  folding buries it.
- **The migration trigger (canonical, to be defined in `end-to-end-review.md`):** the change *moves
  existing persisted state, configuration, consumers, or dependencies from an old form to a new one* —
  concretely a **schema, data/backfill, config-format, storage-layout, API/protocol-version, or
  dependency (major-version) migration**. This overlaps the breaking-change list (schema, storage
  layout, protocol appear on both) but is its own concept: a breaking change is about *contract
  incompatibility* (caught at L1 escalation); a migration is about *moving existing state/consumers
  across the change* (verified at F closeout). The trigger is defined in exactly one canonical place
  to satisfy language-consistency. *(Step-existence user-confirmed, 2026-06-22; trigger definition is
  this decision.)*
- **Tier consequence (resolves the round-3 KD3↔D9 contradiction):** because a migration is *not*
  necessarily a breaking change, it would otherwise be able to land in Light Mode (≤3 non-load-bearing
  files, no breaking change) — exactly the tier where the collapsed F would skip B4 and a data
  migration goes unverified. Therefore **`migration` is added to the Full-Mode trigger list** so every
  migration runs the full cycle and B4 always fires. This is the single deliberate tier-gate touch
  (Scope Boundary); the alternative — a lightweight Light-Mode migration echo — was rejected because
  migrations are the highest-consequence case and least tolerant of the lighter tier's reduced rigor.

### KD4 — Project-doc reconciliation vs. Surgical-Changes consolidation (the one genuine contradiction)

- **Problem:** D5 edits files *other than* the task's two docs; the consolidation sub-procedure
  (step 5) says "edit only the two files this task created." Read naively, D5 contradicts it.
- **Options:** (a) keep both steps, separated by an explicit **operational boundary test** + mutual
  cross-reference tokens; (b) drop D5 (flag-only); (c) loosen step 5 to allow broader doc edits.
- **Choice:** (a). **Rejected (b):** abandons the user's request and leaves docs lying (= KD2(b)).
  **Rejected (c):** loosening the consolidation rule invites the doc-graveyard the skill exists to
  prevent. (a) keeps consolidation strictly two-files-only while D5 is a *separate* step with a sharp
  scope.
- **Operational boundary test (the load-bearing predicate, stated in `end-to-end-review.md`):** a
  project doc is *in scope for D5* **iff it contains a passage whose described behavior this change's
  diff altered or removed** (the doc would now be factually wrong). Everything else — style,
  unrelated sections, neighboring typos, other tasks' docs — is **out** (drive-by, forbidden). This is
  the doc-level analogue of the trace test (a changed line must trace to a Deliverable): a reconciled
  doc passage must trace to a behavior the diff changed. The B5 fixture observes both sides (updates
  the changed-surface passage, spares the unrelated typo).

### KD5 — Gate parity: pairing granularity, reference-site cardinality, and the bound anchor

- **Problem:** New commitment clauses can be silently dropped from a paired site later. Three
  sub-decisions must be made deliberately: (i) **pairing granularity** — one combined token for all
  five clauses, or one token per clause; (ii) **reference-site cardinality** — how many files each
  token is pinned across (the existing closeout-consolidation clause is paired across **three** sites:
  `end-to-end-review.md` ↔ SKILL.md closure convention ↔ `loop-2-implementation.md`); (iii) the exact
  **SKILL.md anchor** the tokens live in.
- **Options:**
  - (a) **per-clause `require` token, each pinned across its full reference-site set** [chosen].
  - (b) **two-site pairing** (source `end-to-end-review.md` ↔ SKILL.md only) for every clause.
  - (c) **one combined gate token** covering all five clauses at once.
- **Choice:** (a). **Rejected (b):** `change-orphan` and `project-doc reconciliation` also live in
  `light-mode.md` (D9 echo); a two-site pairing would not fail the gate if a future edit dropped them
  there — the under-coverage the existing 3-site closure clause is *table-registered* to avoid
  (`claude-md-integration.md:87`). **Rejected (c):** a combined token cannot localize *which* clause
  regressed and cannot enforce per-clause reference-site sets (one clause's drop would still leave the
  combined token present via the others). Per-clause tokens give precise, localized drift detection.
- **Reference-site set (registered in the `claude-md-integration.md` table before any file edit):**

| New clause | Source of truth | Reference site(s) | Gate token (literal) |
|---|---|---|---|
| Whole-project blast-radius review (B1) | `end-to-end-review.md` | SKILL.md Task-closed bullet | `blast-radius` |
| Repo-wide gates at closeout (B2) | `end-to-end-review.md` | SKILL.md Task-closed bullet | `repo-wide validation gates` |
| Change-orphan cleanup sweep (B3) | `end-to-end-review.md` | SKILL.md Task-closed bullet; `light-mode.md` (D9) | `change-orphan` |
| Migration verification (B4) | `end-to-end-review.md` | SKILL.md Task-closed bullet | `migration verification` |
| Project-doc reconciliation (B5) | `end-to-end-review.md` | SKILL.md Task-closed bullet; `light-mode.md` (D9) | `project-doc reconciliation` |

- **Bound SKILL.md anchor:** all five tokens live in the **"Self-check before claiming a loop is
  closed" → Task-closed bullet** (mirroring how "document consolidation" already lives there), **not**
  the closure-convention paragraph at SKILL.md:151. The `require` file list for `change-orphan` and
  `project-doc reconciliation` includes `light-mode.md` so AC1 subsumes the AC2 light-mode sites.
- **Cross-reference-token gate (the AC7 delimiter, gated for parity):** the consolidation step and the
  D5 step each carry a literal pointer to the other; both literals are `require`d present in
  `end-to-end-review.md`, so the KD4 contradiction-delimiter cannot regress unnoticed — the same
  per-clause gate-protection KD5(a) gives the step-presence clauses. (Today `check-consistency.sh` has
  **no** `require` line for the existing consolidation clause — it is table-registered only,
  `claude-md-integration.md:87`. So D7's per-clause tokens are a *new* protection, not a copy of an
  existing one; the round-2 audit precedent in `docs/audit-2026-06-16.md` is precisely a case of a
  table-only clause that drifted because it was unprotected. D7 therefore **also adds the consolidation
  clause's own `require` line** in the same commit, closing that pre-existing table-only gap for true
  parity.)
- Tokens are distinctive multi-word phrases (paraphrase-robust, matching existing gate style). Per the
  table's registration-order rule, the table rows are added **before** editing any file.

### KD6 — Version bump to a minor (1.6.0)

- **Problem:** Patch (1.5.3) or minor (1.6.0)?
- **Options:** (a) 1.6.0; (b) 1.5.3.
- **Choice:** (a). **Rejected (b):** a conservative patch framing is *defensible* — the change is
  documentation/process only, ships no runtime code, and 1.5.x already absorbed multi-file hardening
  waves under patch numbers. It loses because semver-for-process tracks *capability surface*, not
  binary risk: 1.5.x rows were corrections to existing behavior, whereas this adds five new closeout
  behaviors a user can now rely on — a minor is the honest signal of "new capability, backward
  compatible." *(Reversible single frontmatter field.)*

### KD7 — Net-neutral SKILL.md budget: named trim, ceiling held at 2888

- **Problem:** SKILL.md is at 2860/2888 `wc -w` (28-word headroom, verified). D6 adds new gate tokens
  to the always-loaded surface; D7 requires those tokens present in SKILL.md. Will it fit?
- **Options:** (a) hold the ceiling at 2888, fund the new Task-closed-bullet tokens by trimming
  existing SKILL.md verbosity (net-neutral); (b) deliberately raise the ceiling to N with a
  justification line in `check-consistency.sh`.
- **Choice:** (a). The five gate tokens are added as one compact clause appended to the existing
  Task-closed bullet (≈ the five phrases + connectives, ~20–25 words against 28 headroom — a 3–8 word
  margin *before* any trim, so the trim is the load-bearing risk, not optional padding). **Named trim
  source (with the measured recovery to confirm at L3):** the Self-check section's L1/L2/Phase bullets
  repeat "review subagent reports zero severe + one prior round zero general" and restate long command
  names; compressing the L1+L2 bullets' shared termination phrasing into a single shared clause
  recovers an estimated ~12–18 words (to be *measured* at L3, not assumed). **Token-preservation
  guard:** the literals `zero severe` and `zero general` are gate-required (`check-consistency.sh`
  pins them to SKILL.md) — they must survive the trim; they already also live at SKILL.md:154-155, so
  the gate stays green, but the compression must not be the *only* remaining home of either token. If,
  *after the measured trim*, the delta still exceeds headroom, fall back to (b) as an explicit,
  justified line-item — never a silent incidental raise. AC6 gates the result either way. **Rejected
  (b) as default:** anti-bloat is binding on the always-loaded surface; the raise must be deliberate.

## 5. Dependencies and Assumptions

- **Depends on** the existing F structure in `references/end-to-end-review.md` and its references in
  `SKILL.md` (closure convention §, Self-check §), `schemas.md` (`ReviewVerdict` reuse — confirmed
  `schemas.md:69`), `claude-md-integration.md` (cross-file table + registration-order rule, line 94),
  `check-consistency.sh`, `light-mode.md`, `loop-3-teams.md` (mode-2 F lenses — illustrative, not a
  gate obligation, line 39-41).
- **Assumes** the project's repo-wide gates are discoverable via CLAUDE.md `_common-commands_` — the
  skill's portability contract. D2 is therefore generic: on any project, "run every declared gate"
  resolves to that project's gate set (this repo: consistency + workflow-syntax). The behavior change
  is observed on the dogfood case (B2 fixture); its generality rests on the portability contract, not
  on per-project fixtures.
- **Assumes** migration is its own trigger concept (KD3), overlapping but not equal to the
  breaking-change list.
- **Constraint:** `SKILL.md` `wc -w` ≤ 2888, held net-neutral per KD7.
- **Language:** English (CLAUDE.md `_language-policy_`); the migration-trigger term set is defined in
  exactly one canonical place (`end-to-end-review.md`) for terminology consistency.

## 6. Relationship with Existing Designs

No prior `docs/design/*.md` exists (per-task archives were pruned in PR #3; git history is the
record). Terminology anchors: `three-loop-workflow/SKILL.md` (F-phase vocabulary — "closeout",
"whole-change correctness review", "consolidation", "Deferred"), `references/end-to-end-review.md`
(canonical F procedure), `references/escalation-rules.md` (breaking-change trigger list, distinguished
from the new migration trigger in KD3), and `docs/audit-2026-06-16.md` (the gate-parity precedent
cited in KD5). No conflict: this strictly extends the F checklist; it removes no existing F step.

## 7. Acceptance Criteria

All criteria are mechanically checkable:

- **AC1 (gate green):** `bash three-loop-workflow/references/check-consistency.sh` exits 0 — including
  the `wc -w` ceiling check and every newly added `require` token pair (D7/KD5).
- **AC2 (new clauses paired):** for each KD5 gate token, `grep -F "<token>"` succeeds in its source
  (`end-to-end-review.md`) and in **every** listed reference site (SKILL.md Task-closed bullet; plus
  `light-mode.md` for `change-orphan` and `project-doc reconciliation`). (Subsumed by AC1 once the
  `require` lines exist; independently grep-checkable.)
- **AC3 (no JS regression):** `git diff --name-only main..HEAD` shows no `references/*.js`; if any is
  edited, `check-workflow-syntax.sh <file>` exits 0 for each.
- **AC4 (behavioral — every new behavior observed):** for **each** of B1–B5, the corresponding
  `tests/scenarios/*.md` fixture (slug + literal `expected:` JSON fixed in the D8 matrix), run via a
  fresh subagent against the edited skill, yields its `expected` outcome. The before→after column of
  the D8 matrix establishes that each fixture observes a *real* change (before ≠ after), so none is a
  no-op the unedited skill already passes. **Coverage is mechanically enforced, not prose-only:**
  `check-consistency.sh` asserts all five fixture files exist, using the gate's accumulate-then-exit
  contract (set `fail=1`, do **not** short-circuit with `exit 1` — that would skip later `require`
  checks), **guarded by `if [ -d tests/scenarios ]`** so it stays repo-only and does not false-fail
  from the installed copy / packaged `.skill` (which ship no `tests/`): `if [ -d tests/scenarios ];
  then for s in closeout-blast-radius-untouched-caller closeout-runs-all-declared-gates
  closeout-orphan-sweep-not-scheduled closeout-migration-unverified-blocks
  closeout-doc-reconcile-changed-surface; do test -f "tests/scenarios/$s.md" || { echo "DRIFT:
  missing fixture $s"; fail=1; }; done; fi`. Dropping a fixture red-fails the standing gate. There is
  **no "at minimum" floor**.
- **AC5 (behavioral — no regression):** every pre-existing `tests/scenarios/*.md`, run via a fresh
  subagent against the edited skill, still yields its `expected` outcome.
- **AC6 (anti-bloat):** `wc -w < three-loop-workflow/SKILL.md` ≤ the ceiling recorded in
  `check-consistency.sh` (2888 unless deliberately raised per KD7 with its justification line).
- **AC7 (no internal contradiction — greppable with named literals):** the two cross-reference tokens
  are fixed literals (not "some token"): the consolidation step body contains
  `project-doc reconciliation step below` and the D5 step body contains
  `two-doc consolidation step above`. Both are `require`d present in `end-to-end-review.md` (D7), and
  `grep -F` confirms each — so the two-files-only consolidation and the changed-surface reconciliation
  are explicitly, durably delimited. Behaviorally corroborated by the B5 fixture (AC4), which observes
  the boundary (updates the changed-surface passage, spares the unrelated typo) — not by a reviewer
  "reading it as fine."
- **AC8 (doc sync, D10) — per-file (a bare `grep -q t f1 f2` passes on *any* file, so it cannot
  enforce "in both"):**
  `for f in three-loop-workflow/SKILL.md README.md README-cn.md; do grep -q '1.6.0' "$f" || exit 1; done`
  (version bumped in the skill frontmatter **and** a v1.6.0 row in **each** README), and
  `for f in README.md README-cn.md; do grep -q 'project-wide closeout' "$f" || exit 1; done`
  (the distinctive expanded-closeout phrase in **each** README history row).

**Quality budget:** this change has no hot path or latency surface (process documentation); the
relevant quality attribute is *reviewer-observable behavior change*, captured as a measured criterion
by AC4 (the L1 review template's "demonstrate the rule changes agent behavior" requirement) and the
D8 before→after matrix. No latency/throughput/bundle budget applies — explicitly excluded here.

## 8. Risks and Rollback

| Risk | Likelihood | Mitigation / Rollback |
|---|---|---|
| Migration trigger ambiguity → D4 fires on the wrong changes (or misses real migrations) | Medium | KD3 defines a dedicated trigger in one canonical place, citing the overlap with (and difference from) the breaking-change list; `Migration: n/a` is the cheap explicit default. Rollback: refine the trigger list (single doc edit). |
| D5 over-reads as license for drive-by doc edits | Medium | KD4 operational boundary test (a passage whose described behavior the diff changed) + mutual cross-reference tokens; the B5 fixture observes over-reach; D1 blast-radius/fresh-eyes review flags scope creep. Rollback: tighten the clause; `git` revert the doc edits. |
| F checklist grows so long agents skip steps | Medium | Net-new top-level steps held to **two** (migration, doc-reconciliation); B1/B2 extend existing steps; B3 extends the cleanup step. SKILL.md surface stays net-neutral (KD7). |
| SKILL.md exceeds the word ceiling | Medium | KD7 named-trim plan; AC6 gates it; deliberate ceiling raise is the explicit fallback, never silent. |
| New gate tokens too narrow → false-fail on paraphrase | Low | Tokens are distinctive multi-word phrases matching existing gate style; AC1 verifies on the post-edit tree. |
| Behavioral fixtures encode a weak `expected` the unedited skill already passes (observing nothing) | Low | The D8 matrix fixes each fixture's before→after delta and `expected` at design time; AC4 requires before≠after; each new fixture is fresh-agent reviewed (tests/scenarios is non-load-bearing, one-review tier). |

**Whole-task rollback:** every edit is to versioned Markdown / one shell gate on a feature branch;
`git checkout main -- <files>` or branch abandonment reverts cleanly. No data, no runtime state.

---
Status: closed
Closing-commit: de31926
Closed-on: 2026-06-22
Deferred: none
