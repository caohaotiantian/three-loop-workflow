# F: End-to-End Review (Task Closeout)

Before closing the task, the main agent must complete this checklist. Skip none.

## Checklist

The checklist closes out the change against the **whole project**, not only the diff: it runs the
project's gates, verifies any migration, sweeps what the change orphaned, reviews the change's blast
radius, and reconciles the docs the change made stale.

1. **Tick every entry under the design document Deliverables.** Unfinished items require an explicit reason and a follow-up issue (link the issue ID in the design doc next to the unticked item). A deliverable cannot be silently dropped.
2. **Run the project's repo-wide validation gates** — not only `<TEST-CMD>`. Resolve the gate set from the CLAUDE.md `_common-commands_` role and run `<TEST-CMD>`, every `<ACCEPT-CMD>` declared in the impl doc, **and every other repo-wide validation gate the project declares** (lint / typecheck / a consistency or syntax gate). **Operational test for a "validation gate":** a declared command whose exit code is a pass/fail verdict on repo correctness/consistency; build / deploy / packaging actions (e.g. a zip-rebuild or an installed-copy sync) are **not** gates and are not run here. For an argument-driven gate, run it over each changed file. Paste the result summary into the closeout report (commit body or PR description) with exit codes and a short tally (e.g., "142 passed, 0 failed"). The summary must be captured in this closeout step; a prior run or the accept subagent's report is not sufficient.
3. **If the E2E / behavior gate was triggered** (a contract change or an externally observable behavior change), attach the evidence — not only exit-code tallies: key output snippets from the external-process smoke test, and/or the behavior-verification observation (what the fresh non-author subagent observed driving the app, checked against the design Acceptance Criteria). If skipped due to auth or environment, record `E2E skipped: <reason>` plus the `<TEST-CMD>` summary as substitute evidence. The reason must be specific (e.g., `AUTH_FAIL: ANTHROPIC_API_KEY not set`), not generic.
4. **Migration verification (conditional).** If the change involves a **migration** — it moves existing persisted state, configuration, consumers, or dependencies from an old form to a new one (concretely a **schema, data/backfill, config-format, storage-layout, API/protocol-version, or dependency major-version migration**) — run this migration verification checklist and record the evidence in the closeout report:
    - the migration script/step is committed (not a manual one-off);
    - it is **reversible**, or a rollback is documented in the design doc's Risks and Rollback section and realized;
    - it has been **applied and tested** forward (and the rollback tested, if reversible);
    - **no caller/consumer is left on the old contract** (ties to the blast-radius scan, step 6);
    - if the rollout is staged, backward-compatibility holds during the overlap.

   This is the **only** place the migration trigger is defined. It overlaps the breaking-change list (`references/escalation-rules.md`) but is its own concept — a breaking change is contract incompatibility caught at L1; a migration is moving existing state across the change, verified here. Because a migration (even a backward-compatible one) is a Full-Mode trigger (SKILL.md "Which tier applies"), this step only ever runs in Full Mode. If the change involves no migration, record `Migration: n/a` (an explicit skip, like the E2E skip-reason).
5. **Safe cleanup sweep.**
    - **E2E artifacts.** `git worktree list` → no `e2e/*` worktrees; `git branch --list 'e2e/*'` → empty; review `.e2e-artifacts/<task-slug>-*/`, keep only directories linked from the closeout report (as evidence) and delete the rest. **None of them should ever be staged for commit** (`.e2e-artifacts/` is gitignored on first use; verify the rule is in `.gitignore`). These git commands should produce empty output apart from the main worktree; leftover state from a crashed E2E run must be cleaned up, not committed.
    - **Change-orphan sweep (project-wide).** Remove every `change-orphan` — an artifact **this change** orphaned: now-unreferenced imports, files, config entries, feature flags, or scaffolding the change made dead anywhere in the project. "Safe" = orphaned **by this change only**; pre-existing dead code is **mentioned, never deleted** (Principle 0.3). When unsure whether something predates the change, leave it and note it.
6. **Whole-project correctness review (default — always runs).** Spawn a fresh non-author subagent to perform two checks:
    - **(diff)** read `git diff <first-phase-base>..HEAD` (the first Phase's base sha, recoverable from `git log`) against the design Deliverables + Acceptance Criteria: (a) every Deliverable is actually implemented (not just ticked), (b) no cross-phase regression or interface mismatch between Phases, (c) no scope creep beyond the design.
    - **(blast-radius — outside the diff)** for every symbol, contract, file path, or behavior the change altered or removed, find its consumers/callers **across the whole project — including files the diff did not touch** — and confirm each is updated. The diff alone cannot reveal a caller it should have touched but did not; this `blast-radius` scan is what catches it.

   Emit `ReviewVerdict` (`references/schemas.md`). **Failure retrospective (F-systemic path):** if this review
   finds a **systemic (non-local) cause** — one whose consumers/callers span **beyond the diff** per the
   `blast-radius` check above, i.e. a class rather than a one-off local defect — run the failure retrospective
   (`references/failure-retrospective.md`) and emit `failure_retrospective: triggered`. It is **additive** to
   the severity routing that follows and never relaxes it: a severe finding still gets its blocking bounded
   fix and still blocks closure; the class-prevention lands separately per that reference's landing test (a
   `_load-bearing-docs_` prevention defers as a `finding`; only a test/fixture may land inline, and on this
   F path only via its own review). A severe finding routes to **one bounded fix round, then escalate** (there is no per-Phase round counter at closeout) and **blocks closure** — author confidence does not substitute. A **general** finding does not block closure but **does not silently vanish**: record it in the closeout report and either fix it in the same bounded round (if cheap) or file a follow-up issue and list it on the closure block `Deferred:` line as a deferred finding. This step **runs on the default single-agent path even when no panel/teams slot exists**; if the optional L3 panel or teams mode-2 already reviewed the assembled diff this task, that satisfies the diff check (folding in is an optimization, not a precondition). It is distinct from the conditional behavior-verification step (step 3): that checks observed app behavior; this checks the diff + blast radius against Deliverables.
7. **Consolidate task documents.** Run a single, focused consolidation pass over `docs/design/<task-slug>.md` and `docs/implementation/<task-slug>.md` — the **task's own two docs only**. The point is a clean, archive-quality record for future readers; **not** to refactor adjacent docs. Project-facing docs that the change made stale are handled separately by the **project-doc reconciliation step below** (step 8) — do not conflate the two. See "Document consolidation" below for the exact procedure.
8. **Reconcile project-facing documentation (project-doc reconciliation).** Update project-facing docs (README, CLAUDE.md, user/API docs, changelog) whose **described behavior this change altered or removed**, in the closing commit, so the docs do not outlive the behavior they describe. **Operational boundary test** (the doc-level analogue of the trace test): a doc passage is in scope **iff this change's diff made it factually wrong**; everything else — style, unrelated sections, neighboring typos, other tasks' docs — is **out** (drive-by, forbidden). This is a separate step from the **two-doc consolidation step above** (step 7), which touches only the task's own design/impl docs: reconciliation *completes the change*, consolidation *archives the task record*. If the change altered no documented surface, record `Docs: no project-facing doc affected`.
9. **Write the final commit** per the commit conventions:
    - Phase opener prefix: `feat(...)` or `fix(...)`.
    - Trailers: `<TEST-CMD>` exit code and key `<ACCEPT-CMD>` results.
    - The closing commit bundles the final code state, the reconciled project docs (step 8), and the consolidated task docs (step 7).
    - **Do not** mention AI involvement, model names, or agent tooling in commit messages or PR descriptions.

## Document consolidation (step 7 detail)

Surgical Changes governs this step: edit only the two files this task created, and only to remove obsolete scaffolding or add a closure marker. Do not "tidy up" prior tasks' docs, rename files for consistency, or rewrite prose for style. If a prior doc is genuinely wrong, that is a separate task with its own L1 cycle.

Run these substeps in order:

1. **Prune ephemeral content.**
    - Impl doc: delete the `Deprecated` section (commits / Phase plans rolled back during L1 → L2 round-trips). The git history preserves them; the doc no longer needs to.
    - Both docs: remove `TODO`, `DRAFT`, `?` placeholders, and strike-through markers that the closing commit resolved.
    - Do **not** touch Key Design Decisions, Acceptance Criteria, escalated-decision records, or rationale — those are load-bearing and must survive intact.
2. **Mark closure status.** At the top of each of the two files, add (or update) a frontmatter-style block:
    ```
    Status: closed
    Closing-commit: <short-sha>
    Closed-on: <UTC date, YYYY-MM-DD>
    Deferred: <class> — <desc> (<issue-id>), ...   # class = deliverable | finding; or "none"
    ```
    `Deferred` lists each deferred item with its class and follow-up issue ID. Two classes: a **deferred deliverable** (a Deliverable left unticked at closeout) or a **deferred finding** (a correctness finding left unfixed — e.g. a general from the step 6 whole-project review). If none, write `none`.
3. **Cross-link supersedes / superseded-by.** If this task's design extended or replaced a prior `docs/design/*.md`:
    - In the new doc, add `Supersedes: <prior-task-slug>` to the closure block.
    - In the prior doc, add `Superseded-by: <this-task-slug>` to its closure block.
    Cross-link only when there is a genuine succession relationship (the new design replaces or strictly extends the prior). Loose topical overlap is not enough — over-cross-linking turns the doc graph into noise.
4. **Optional merge.** If this task's design is a small follow-up that adds at most one or two Deliverables / Acceptance Criteria to an immediately prior, still-active design, the main agent **may** fold the additions into the prior doc and delete the new file in the closing commit. Conditions:
    - The prior design's `Status` is not `closed`, or it is closed but is the canonical reference for this area.
    - The merged additions are clearly attributable (annotate them with `(added by <task-slug>)` to preserve provenance).
    - The impl doc stays as a separate file (impl docs are per-task by construction; do not merge them).

    Larger designs stay as standalone files. When in doubt, do not merge.
5. **Spawn a fresh review subagent** with the prompt template below (one round only). Severe findings escalate to the user — do not roll a second consolidation round, which silently invites information loss.

> For structured output from this review subagent, see `references/schemas.md` (`ReviewVerdict` schema) — the Consolidation Review Report maps onto its severe / general / verdict fields.

### Consolidation review subagent prompt template

```plaintext
You are the closeout review engineer for the {{project-name}} project.

[Task] Compare the consolidated forms of {{design-doc-path}} and
{{impl-doc-path}} against the immediately prior versions on disk before
this consolidation pass. Confirm that consolidation removed only
ephemeral content and preserved every load-bearing claim.

[Inputs]
- Pre-consolidation version: `git show HEAD:{{design-doc-path}}`,
  `git show HEAD:{{impl-doc-path}}` (last committed state before the
  closing commit's working tree).
- Post-consolidation version: the current working-tree files.
- Closure block, Deferred list, Supersedes / Superseded-by links.

[Steps]
1. Diff pre vs post for each file.
2. For each removed line, classify as: ephemeral (Deprecated, TODO,
   DRAFT, resolved strike-through, expired placeholder) — OR — load-
   bearing (Deliverable, Acceptance Criterion, Key Design Decision,
   rationale, risk, rollback, escalated-decision record, Phase task,
   acceptance command, regression-protection entry).
3. Any load-bearing line removed without a redirect (Supersedes link,
   merged-into target) is a severe issue.
4. Confirm the closure block is present, the Closing-commit SHA exists
   in `git log`, and every Deferred item (deliverable or finding) has a
   follow-up issue ID.
5. Confirm Supersedes / Superseded-by links, if present, point to real
   files. No dangling links.
6. Do not modify any document. Output only the review report.

[Output format]
## Consolidation Review Report

### Severe issues (block closure)
- [file:line] description

### General issues (recommend fixing before commit)
- …

### Verdict
pass / needs fix / severe non-conformance
```

## Closure rule

> **Rationalizations — recognize and stop**: closeout excuse trip-wires live in `references/escalation-rules.md`.

The task is closed only after every checklist item completes. Author confidence is not a substitute — the deliverable checkbox state, the green command exit codes, and the consolidation-review verdict are.

If an item — a Deliverable left unticked, or a correctness finding from step 6 left unfixed — cannot be closed/fixed in this task and a follow-up issue is filed instead, the closeout report must:

- Name the item and its class (deliverable or finding).
- State why it could not be closed/fixed in this task.
- Link the follow-up issue ID (also recorded in the closure block's `Deferred:` line).
- Confirm that the deferred work does not break the items that *were* closed (otherwise the entire task is not yet ready for closeout).
