# Plan — promote v2 to shipped, release v2.0.0

**Depth: Deep.** Three triggers fire from SKILL.md §1: a breaking change to a published contract
(the installed skill folder — every rule name, file path and tier vocabulary changes); a migration
(users with v1 installed); and an edit to rules in files listed under the project guide's
_load-bearing-docs_ (`SKILL.md`, `references/*`, `CLAUDE.md`).

This task is also the **dogfood run** v2 needs. `v2/README.md` ("Known-incomplete") states nothing in
v2 has been run on a real task, and `CLAUDE.md` names dogfooding as how v2 earns promotion. Running
the promotion under v2's own discipline discharges that only partially: it exercises Plan → Build →
Close on a docs-and-layout change, not on application code.

## Goal

Merge PR #21, make v2 the shipped skill at `three-loop-workflow/`, retire v1 to git history, and
publish v2.0.0 — with a user-facing announcement and a long-form article explaining the change, both
in English and Chinese.

## Non-goals

- **No change to v2's discipline, rules, or wording.** The content was reviewed in PR #21. This task
  relocates it and reconciles the docs that describe it. Any rule edit discovered as necessary gets
  recorded here as a Decision, not slipped in.
- **Not deleting `docs/design/` and `docs/implementation/`.** 43,822 words of v1 per-task archive.
  v2 stops *producing* them; that is not a reason to destroy the record of how v1 was built.
- **No new gate.** `check-consistency.sh` dies with v1 (measured as bypassable). Nothing replaces it.
  Writing a fresh gate under release pressure is exactly the failure `build.md` warns about.
- **No rewrite of the v1 CHANGELOG history.** v2.0.0 is appended; the v1 table stays as shipped.
- **Not migrating users automatically.** No install-side script. The announcement tells them what to do.

## Decisions

**D1. What happens to v1's files.**
problem: v2 must live at `three-loop-workflow/` (README install commands and `release.yml` both
hard-code that path) → options: (a) delete v1, recover via tag `v1.14.0`; (b) move v1 to `legacy/`;
(c) ship both → choice: **(a)** → why: user chose full replacement. `v1.14.0` is tagged and pushed,
so v1 is recoverable in one `git checkout`. (b) invites installing the wrong folder; (c) is the
current state and defers the upgrade. Cost: `git log` on the new files starts at the promotion commit
unless the move is done as a rename — mitigated by using `git mv` so rename detection holds.

**D2. v1's `tests/scenarios/` is deleted, not kept alongside.**
problem: two suites, one measured worthless → options: (a) keep both; (b) delete v1's; (c) port its
33 fixtures to the two-arm runner → choice: **(b)** → why: measured at 0% discrimination (6/6 pass
with the skill withheld, 2026-07-28) and it tests v1 vocabulary that no longer exists. (c) is a real
project, not a release step, and the two-arm README explains how to write fixtures for anyone who
wants it. Keeping a suite that cannot fail contradicts the norm this release ships.

**D3. `v2/README.md` is not carried over as a file.**
problem: it is the best account of the rebuild but its title and framing ("staged here", "until you
decide") are false once promoted → options: (a) move to repo root; (b) fold into the article +
CHANGELOG and delete; (c) leave a stale `v2/` directory → choice: **(b)** → why: its content is the
raw material for the article the user asked for, and two overlapping accounts drift. The article
supersedes it and the known-incomplete list travels into the article intact.

**D4. Article and announcement are separate documents.**
problem: one artifact or two → options: (a) one long release note; (b) short announcement + long
article → choice: **(b)** → why: the audiences differ. A user upgrading needs the breaking changes and
the migration path in under a page; the argument for *why* — measured reviewer coverage, the gate that
was theater, the reversal — is a different read and should not gate the upgrade instructions.

**D5. Announcement claims are restricted to what was measured.**
problem: the honest results include one that undercuts the product — 6 of 7 fixtures showed the skill
was redundant with Opus 5's own judgment → options: (a) omit it; (b) publish it → choice: **(b)** →
why: `CLAUDE.md`'s engineering norms forbid claiming a behavior that was not tested, and the article
loses its credibility the moment a reader finds the suppressed result in `expected.json`, which ships.

**D6. Version string.** `2.0.0-draft` → `2.0.0`. Tag `v2.0.0`. Major, because every rule name, tier
name, file path and script name changed — a v1 install is not forward-compatible.

**D7. Per-task directories under `.agent/`, replacing the single `.agent/plan.md`.** *(Owner request,
mid-task. Supersedes the first Non-goal above, which forbade rule changes — recorded here rather than
slipped in.)*
problem: `.agent/plan.md` is a fixed path. Two tasks in one checkout overwrite each other's plan, and a
finished task leaves no record of what it decided → options: (a) `.agent/<task-slug>/plan.md`, a
directory per task; (b) `.agent/plans/<task-slug>.md`, a flat file per task; (c) keep the single file
and rely on worktrees for isolation → choice: **(a)** → why: this very task wrote *two* task-scoped
files, `plan.md` and `accept.sh`, both at fixed paths — (b) isolates the plan and still collides on
everything else. (c) fails on the traceability half of the request, and worktrees only isolate
concurrent *checkouts*, not two tasks sharing one. Cost: this partially re-introduces the per-task slug
v2 deleted. The justification differs — isolation and local traceability, not a committed archive —
and the changelog says so rather than pretending it is new.

Consequences: `close.md` flips from "delete the plan" to **keep the task directory**, since it is now
the record the owner asked for; `phase.js` loses its `planPath` default, because no default can know
the task slug, and joins `baseSha`/`acceptCmds` as a required arg with a `usage-error`; the
compaction re-entry instruction becomes `ls -t .agent/*/plan.md | head -1`.

**D8. The shipped skill's coverage figures move to the validated numbers** (54%/86% → 56.5%/85.5%) in
`SKILL.md` and `references/plan.md`. Both reviewers flagged that the skill quoted the pre-validation
figures while every release document quoted the post-validation ones. Same measurement, better
estimate; the release documents explain both.

## Accept

Per phase, below. Whole-task acceptance:

```bash
bash .agent/promote-v2-release/accept.sh
```

Asserting: v2 files present at `three-loop-workflow/` with matching content; no `v2/` directory; no v1
reference file remains; version is `2.0.0` in frontmatter; no doc references a deleted path; the
workflow-syntax gate passes on the shipped script; the packaged `.skill` contains the v2 payload and
no v1 file.

## Phases

**P1 — Merge PR #21.** Accept: `gh pr view 21 --json state -q .state` = `MERGED`, and
`git log origin/main --oneline -1` contains the merge.

**P2 — Promote.** `git mv` v2 payload to `three-loop-workflow/`, delete v1 skill files and v1
`tests/scenarios/`, move `v2/tests/` to `tests/`, bump version, remove `v2/`.
Accept: `bash three-loop-workflow/scripts/check-workflow-syntax.sh three-loop-workflow/scripts/phase.js`
exits 0; `test ! -d v2`; no `.md` outside CHANGELOG history references a deleted v1 path.

**P3 — Reconcile docs.** README.md, README-cn.md, CLAUDE.md, CHANGELOG.md, CHANGELOG-cn.md.
Accept: every path named in README exists; CLAUDE.md's anchor-map roles resolve; no v1 vocabulary
(L1/L2/L3/F, Full/Light/None, severe/general) survives outside the CHANGELOG history table.

**P4 — Announcement + article,** EN + CN.
Accept: every number in both traces to `v2/README.md`, the PR body, or a measured artifact in git;
no claim of a behavior that was not run.

**P5 — Review.** Two independent reviewers on the full diff, union, triage before counting.
Accept: confirmed blocking count = 0.

**P6 — Close + release.** Deep-tier Close pass, then tag `v2.0.0` and push.
Accept: release workflow green; `.skill` asset attached and containing v2.

## Rollback

- Before the tag: `git revert` the promotion merge, or restore v1 with
  `git rm -r three-loop-workflow && git checkout v1.14.0 -- three-loop-workflow/`. The `git rm` is
  required: `checkout` only writes paths present in the tag, so on its own it would leave v2's six
  v2-only files sitting beside the restored v1 tree.
- After the tag: `git tag -d v2.0.0 && git push origin :refs/tags/v2.0.0`, delete the GitHub release,
  re-tag from `v1.14.0` to restore the "latest release" pointer users download.
- Users who already installed v2: no data migration exists to undo. Reinstalling the v1.14.0 folder is
  the whole rollback, which is why the announcement names the tag explicitly.
