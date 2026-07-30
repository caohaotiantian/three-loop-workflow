# Changelog

Full version history for the three-loop-workflow skill. See [README.md](./README.md) for what the skill is, when it applies, and how to install it.

## v2.2.0 — the gates can fail now

An adversarial audit of the whole repository found that every mechanism checking this project was one of
four things: a token grep, a boolean an agent typed, a parser that says nothing about logic, or nothing at
all. The invariants were correct, but they were correct because the author was attentive, not because
anything would have noticed otherwise — and both regressions this project has shipped passed a green gate.

**The acceptance script was v1's `check-consistency.sh` again.** It pinned `phase.js`'s guards with
`grep -q`. Disabling both empty-diff guards with `false &&`, leaving every token in place, still printed
`ok an uncommitted phase is rejected, not reviewed` and `ACCEPT: all checks passed`, exit 0. Deleting one
guard outright also passed, because the rule's wording survived in the comment above it. Both were
reproduced in a fresh clone. Control flow is now asserted by execution: `scripts/sim-phase.js` drives the
real script with stub agents, and `scripts/negative-test.sh` breaks the two scripts twenty-three ways and
fails if the harness misses one. The generalisation is worth stating plainly — to check a *rule*, run it;
grep only for *prose*, where presence is the property you want.

**The acceptance script is also tracked now.** It lived in a gitignored task directory, was cited as the
`Gates:` evidence of six release commits, and the one before it is already unrecoverable. `SKILL.md` §2 no
longer tells you to keep one there.

**CI runs on every push and pull request.** Until now nothing ran automatically at all; the release
workflow was checkout, zip, upload. It now refuses a tag that disagrees with the frontmatter version and
verifies what is inside the archive.

**`phase.js` fails closed on anything an agent only reports.** A well-formed sha the implementer never
created used to close a phase on an empty diff; the gates step's own `git rev-parse HEAD` is cross-checked
against the base now, on every round, including a fix round that reset the phase's commits. An unparseable
sha stops the phase instead of silently disabling the guards downstream of it. A dead fix agent is an
error rather than a spent round. Reviewers receive the diff and the plan and nothing else — the
implementer's own low-confidence list used to go to both of them, correlating the independence the
two-reviewer rule depends on. Non-blocking findings and triage rejections accumulate and come back to the
caller, and prior rejections are carried into the next round's triage so the same phantom is not
re-derived. `depth: 'standard' | 'deep'` is the preferred way to say how much review runs; `reviewers` still
works, but passing neither is now an error, because a count that defaulted to 1 let a Deep phase run the
Standard review by being forgotten.

**The two-arm suite computes its verdict instead of asserting it.** `suite_pass` was a boolean the scoring
agent typed; an agent returning zero rows and `suite_pass: true` produced a green run, inside the suite
that exists because its predecessor was green for sixteen releases while measuring nothing. The reading
agent now reports only what it read and every comparison is arithmetic in the script.

**"A fixture both arms pass is INVALID" was false for six of the seven fixtures**, and it was the property
advertised as distinguishing this suite from the one deleted for being theatre. Six are regression guards,
for which both arms answering correctly is a pass. Every statement of the claim now carries its qualifier.

**The install command did not install.** `cp -r three-loop-workflow <repo>/.claude/skills/` copies the
folder's *contents* when `skills/` does not exist yet — the normal state of a repo where Claude Code has
run but no skill was ever installed. `SKILL.md` landed one level too high, exit 0, no warning, and the
skill never activated. Both READMEs `mkdir -p` first, and the gate now runs the README's own commands.

**`close.md` gains a whole-artifact read at Deep depth.** Round after round of diff review on the v2.0.0
release left the most serious defect in that release standing, and readers handed the finished files with
no change context found it at once. The modality that caught it appeared nowhere in the skill.

**`SKILL.md` says what to do when there is no project guide.** One of the three Deep triggers and the
Gates step both dereference roles from an anchor map that no external standard requires, with no fallback
written anywhere — so on a repo that had not adopted the convention, a third of the Deep checklist was
silently inert.

**The script had never run, because it could not.** Every claim about `scripts/phase.js` rested on
harnesses that fed it a well-formed object. The first invocation through the actual Workflow tool
returned `usage-error: planPath is required` with a complete argument list — the tool delivers `args` to
a script as a JSON *string*, and destructuring a string yields all-undefined. Settled with a probe
script, not by inference. `tests/run-scenarios.js` had the same defect silently: the documented
`args: {repo: "<path>"}` ran against the default tree without a word. Both normalise `args` now, and
report an unusable shape as itself rather than blaming the first field that looks missing.

It was then run end to end for the first time: one Standard phase, driven from an absolute path outside
the repository so an installed skill resolves too, returning `closed` at round one with no fix spent, a
real chainable head, the gates step's own output and tally, three substantive non-blocking findings, and
the implementer's concerns returned to the caller instead of sent to the reviewer.

**The runtime claims are checked and sourced.** Codex's `.agents/skills` discovery, opencode reading
both its own and Claude's locations, this skill's frontmatter conforming to the Agent Skills spec, and
AGENTS.md's contribution to the Linux Foundation's Agentic AI Foundation had all been asserted and never
verified. All four hold; `references/platforms.md` carries the sources now, which is what this skill asks
of any claim about external behaviour.

**"A third mostly repeated the second" is retired as a coverage claim.** Re-analysis of the same data
contradicted it depending on the denominator, and the artifacts were never kept. Stopping at two is
stated as the cost decision it is.

**Two behavioural fixtures** cover the rules this release adds, and both are guards. The whole-artifact
read was written as discriminating and measured twice; both arms answered it correctly both times, the
second time with no giveaway reported at all. So the rule is not counter-intuitive to a model asked the
question directly — the evidence for it was never that, it was that four rounds of diff review did not
think to ask. It is demoted with that reasoning dated in `expected.json`. The suite still has exactly one
discriminating fixture; adding two rules added none.

The suite's giveaway signal — which had gone quietly dead, requiring a boolean both arms leave false
while filling in the quote beside it — counts an arm on either signal now, and immediately flagged five
fixtures where the old one flagged none.

Also: the syntax gate fails on `Date.now()`, `Math.random()`, argless `new Date()` and a missing
`export const meta`, with committed fixtures in both directions; two factual errors in `build.md` about
worktree cleanup and the chaining example are corrected.

Read the result narrowly. Three fix rounds were spent and the cap was reached. Of the nineteen confirmed
findings, ten were defects in the gates and harnesses this release adds — the checks needed checking,
twice — and two were found only by the whole-artifact read it introduces. Two claims in this release's own
commit messages were themselves overstated and are corrected in the task record rather than by rewriting
history. Whether three rounds is the right cap for a change shaped like this one is not settled here.

**It was measured afterwards, and the cap is not what was wrong.** The question that paragraph leaves
open was pre-registered and run: one document-shaped Deep change, seeded with six defects drawn from
classes this repository has actually shipped, reviewed by the real script with the cap deliberately
lifted to six so that a convergence point above three could be observed at all. Two of three replicates
never reached zero. But every replicate found and repaired the seeded defects in its **first** review
round — what consumed the rest was the change *growing*: the fix step invented new checks for the rules
it had just repaired, and each following round reviewed the new checks instead of the change. The one
replicate whose fix step added nothing converged in a single review round. Raising the cap would have
bought more rounds of the same thing, so the cap stays at three and `references/escalation.md` gains
what to look for instead: reaching the cap on a document-shaped change is the ordinary exit, the
commonest cause is the fix step opening a second change inside the first, and the remedy is to split
rather than to re-plan.

Worth naming what the fix step reached for: a **grep that tries to tell a true claim from a false one**
— `check-consistency.sh`, deleted in v2.0.0 for being bypassable, re-invented from scratch and then
iterated against one counter-example at a time until the budget ran out. `escalation.md` now says that a
pattern can hold prose but not a claim.

**The measurement's own failures are published with it.** Two attempts were voided before any data was
collected — in the first, a fix agent ran `git log --all` and read the pre-registration commit within
four minutes; in the second, `phase.js` could not complete a fix round at all, because it builds its Fix
and Triage prompts from a branch name and a sha and **never a path**, so an agent whose working
directory is not the repository under test has nothing to locate it with. That is a real limitation of
the shipped script, found by running it. A third attempt, at adjudication, was voided for asking agents
to echo a thousand-character key. All three defects were the experimenter's, and the experiment's
blinding was broken twice by him and never by the agents under measurement.

Raw artifacts are committed — git bundles of every replicate, the per-round series, the adjudicator
verdicts, the analysis script — because three earlier measurements in this project cannot be reproduced
and one was deleted before anyone thought to keep it. `scripts/accept-release.sh` now recomputes every
figure the results documents publish and fails if either language drifts; the hole was demonstrated
before the check was wired in, and `scripts/negative-test.sh` keeps that demonstration.

**The per-round records that did exist are now tracked.** `.agent/` is gitignored, so the only
round-by-round review data this project ever produced sat on one disk.
`docs/measurements/2026-07-30-round-data/` holds it verbatim, unedited, including the claims its authors
later corrected.

**The mutation count was wrong in three places.** `scripts/negative-test.sh` breaks `phase.js` eighteen
ways and `run-scenarios.js` five. `CLAUDE.md` said "fifteen" twice and this entry said "twenty-one".
Both corrected; the count in the rescued task record stays as written, because retro-editing a dated
record is what the Non-goals forbid.

## v2.1.0 — multi-phase Deep work actually runs

Three criticisms were published with v2.0.0 as "recorded, not fixed". They had reached that list
without being triaged, which is the same mistake as counting an unconfirmed finding, in the reporting
direction. Triaged properly: one was a misreading, two were real.

**Multi-phase Deep work could not be run correctly.** `scripts/phase.js` told each phase's implementer
to create its own branch; `references/build.md` said phases share one working tree and that "a branch
name is not isolation"; nothing anywhere merged a phase branch; and a closed phase returned no head
commit, so a caller could not advance the base even if it wanted to. Pass the same `baseSha` to every
phase and phase 3's reviewer sees phases 1 and 2 as well, correctly reports them as work outside the
phase's Goal, and burns a fix round. Phases are now sequential commits on one branch, a closed phase
returns the commit its review actually saw, and `build.md` shows the loop that chains them.

**Deep prescribed a fixed bundle regardless of size.** A one-line rule edit to a contract file trips
the Deep list and got a phased build and a full Close. It still records alternatives and still takes
two reviewers — those are why it is Deep — but the bundle now scales: one phase, a Close of a few
questions. `SKILL.md` also states what each depth costs in agents, since depth is the moment that
choice is made and the skill had never said.

**The manual path was fixed too.** The first cut of this change repaired only `scripts/phase.js`;
`build.md` still told a hand-run Deep change to capture one `baseSha` before editing and review every
phase against it. That is the portable path other runtimes use, so half the fix would have shipped.

**Shas reported by an agent are now validated.** The empty-diff guard is an equality test, so an
abbreviated or whitespace-padded sha would have compared unequal and let an uncommitted phase through.
`sha()` requires a full 40-hex object id; a fix round that commits nothing is also caught now, instead
of grinding to cap-exhausted against an unchanged tree.

**Rejected:** that the Deep trigger fires on *any* contract-file edit. It reads "an edit that changes a
rule", and the Direct row covers typos, comments and formatting. The criticism misread the table.

The third — that much of the prose restates what a capable model already does — stands, is not
fixed here, and is measured: 6 of 7 behavioral fixtures are answered correctly by an agent forbidden
to read the skill.

## v2.0.0 — a ground-up rewrite

**Breaking.** v2 replaces v1 rather than extending it. Every loop name and tier name changed, and 18 of v1's 20 files are gone; only `SKILL.md` and `references/platforms.md` keep their paths, and both were rewritten. A v1 install is not forward-compatible. See [docs/announcement-v2.0.0.md](./docs/announcement-v2.0.0.md) for the upgrade path and [docs/why-v2.md](./docs/why-v2.md) for the evidence behind each decision.

| | v1.14.0 | v2.0.0 |
|---|---|---|
| `SKILL.md` | 2,915 words | **1,307 words** |
| Total prose (Markdown only) | 21,802 words | **6,047 words** |
| Files in the skill (incl. scripts) | 20 | **8** |
| Committed documents per task | 2 | **0** (ephemeral `.agent/<task>/plan.md`) |

**Structure.** L1 → L2 → L3 → F becomes **Plan → Build → Close**. L1 and L2 were one plan artificially cut in two; merging them removed the slug protocol, the rollback protocol, the Deprecated-section convention, and an entire review loop. Full/Light/None becomes **Deep/Standard/Direct**, graded on blast radius and reversibility with a checklist for the deep tier rather than a disjunction of qualitative predicates. The per-task `docs/design/` + `docs/implementation/` archive — 43,822 words against 27,896 words of shipped product, read by no human — is replaced by a gitignored `.agent/<task>/plan.md`, one directory per task.

**One plan directory per task.** The plan is `.agent/<task>/plan.md`, and anything else scoped to the task — an acceptance script, scratch notes — lives beside it in that directory. A single fixed `.agent/plan.md` had two problems: two tasks sharing a checkout overwrite each other, and a finished task leaves no record of what it decided. This re-introduces a per-task slug, which v2 had deleted along with v1's committed archive — the justification is different (local isolation and traceability, not a document to commit and never read), and `close.md` now says to *keep* the directory rather than delete it. `scripts/phase.js` drops its `planPath` default, since no default can know the task, and rejects a missing one with a `usage-error`.

**Gates before agents.** The project's own typecheck/lint/build/test now run *before* any reviewer is spawned. v1 mentioned them once, in a parenthetical.

**Two reviewers on Deep work, one on Standard — measured, not assumed.** Four design documents × three independent reviewers, then all 116 findings blinded, shuffled and re-judged by two adversarial adjudicators each: coverage **56.5%** with one reviewer, **85.5%** with two, averaged over every reviewer ordering. A third adds ~14%. This result *reversed* the plan, which had been to delete the confirming round.

**Triage before counting.** The same validation exposed poor reviewer precision — only 50–70% of findings graded *blocking* survived adjudication, and 30–46% of the rest. Closure is now computed from *confirmed* findings. `phase.js` increments the round counter only when a fix actually runs, fixing the starvation in v1's runner where one general finding left zero accept-fix budget and two fix rounds reported cap-exhausted on a clean round 3.

**Deletions with stated grounds.** `check-consistency.sh` is gone: replacing `SKILL.md`'s central termination rule with its exact semantic opposite, leaving the token present in an HTML comment, still returned `three-loop-consistency: OK`, exit 0. The five-voter panel and its anti-inflation clause are gone (a reviewer told to be conservative reports less). The separate accept subagent is gone. Both hook scripts the v2 drafts carried — `require-plan.sh` and a copy of v1's `validate-commit-msg.sh` — were removed before release; neither ever shipped in a v2 release, and v2 enforces nothing mechanically and says so.

**Tests that can fail.** v1's `tests/scenarios/` was measured at **0% discrimination** — 6 fixtures, both arms, skill-off 6/6 and skill-on 6/6, green for 16 releases while carrying no information. The replacement runs every fixture with the skill loaded *and* withheld, and reports a fixture both arms pass as INVALID rather than green. Run against the shipped tree for this release: `suite_pass: true`, 6/6 guards held, no GUARD-BROKEN, and the single discriminating fixture valid — the control arm upgraded a whole four-file change because one corner was risky, the skill arm did not. Read that narrowly. The scorer's own caveat is that this is a no-regressions result rather than validation of the discipline: only one of seven fixtures can discriminate at all, three guards had both arms report that the scenario text stated the rule, and the one fixture doing work rests partly on its option wording. Two fixtures written as discriminating failed to discriminate and were demoted to guards in `expected.json` rather than quietly relabelled.

**Known-incomplete, stated rather than hidden:** the reviewer-variance evidence was measured in a working session whose raw artifacts are not in this repository, so those figures cannot be reproduced from it; `close.md` is carried on argument, not evidence; the two-reviewer result was measured on design documents, not diffs; the "clean first review is weak evidence" corollary is inferred from the detection rate, never directly observed; and 6 of 7 fixtures were answered correctly by an agent forbidden to read the skill, so most of this discipline is redundant with the model's own judgment. What survives is the specific and counter-intuitive.

## v1 history

| Version | Key additions |
|---|---|
| **v1.3** | `agentType` recommendation column in routing table; `references/schemas.md` (ReviewVerdict schema); `## When this skill does NOT apply` table; Quick orientation box; Common failure modes table; Document naming convention; TaskCreate round-tracking guidance |
| **v1.3.1** | `references/l3-phase.js` — Workflow-based L3 Phase runner (recommended mode); `references/loop-3-workflow.md` — invocation guide; `references/schemas.md` gains AcceptVerdict and DevResult schemas; SKILL.md routing table gains Workflow-mode row |
| **v1.3.2** | Skill is now self-contained: all subagent/Workflow nodes run on the built-in default subagent; removed the dependency on the feature-dev plugin's agent types (`agentType` recommendation column and the bare-vs-namespaced `code-reviewer` paragraph dropped from SKILL.md) |
| **v1.3.3** | Skill no longer induces process-narration comments in code: explicit Surgical-Changes rule ("comments explain the code, not the workflow") added to SKILL.md, plus an L3 review check that flags them; the `references/l3-phase.js` exemplar scrubbed of design-doc/decision/diagram references |
| **v1.4** | **Orchestration upgrade.** Correctness: L3 dev diff materialized via `baseSha` + an `agent-error` status distinct from cap-exhaustion (`l3-phase.js`); the skill files made the **sole source of truth** (the redundant derived `WORKFLOW-v3.md` spec removed) with a `three-loop-consistency` self-check; false worktree-isolation claims removed. Discipline tuning: L3-only clean-first-round termination relaxation; gated **Light/Full tier** (`references/light-mode.md`) with a fresh-eyes tier check; scope-based phases; cost expectation. Quality ceiling: L1 "understand before designing" Explore pre-step; gating **behavior verification** (`/run`, `/verify`); declare-or-exclude perf/UX/a11y budgets. Optional modes (opt-in, zero-install fallback): adversarial **review panel** with mechanical union (`references/review-panel.js`, `multi-voter-review.md`); tool-restricted **reviewer agents** with model routing (`references/optional-subagents.md`); commit-prefix lint hook (`references/validate-commit-msg.sh`); **agent-team** modes (`references/loop-3-teams.md`) |
| **v1.5** | **Compliance-hardening** (32 vetted lessons from a comparison with the `superpowers` skill collection, shipped in 3 waves). **Anti-summary:** the always-loaded `description` no longer paraphrases the workflow and the "Quick orientation" box became a *read-the-reference-in-full* directive — the always-loaded surface net **shrank**. **Human-factors:** one consolidated rationalization / red-flag table (`escalation-rules.md`) plus inline reviewer trip-wires where the reviewer actually reads. **Verify, don't label:** TDD watch-it-fail is reviewer-checked from the git log; closeout requires *fresh* command output; a fresh-eyes **whole-change correctness review** now runs by default at F (not just doc-consolidation). **Failure-handling:** root-cause gate + failing-reproduction-test in the fix corner; round-cap exhaustion reframed as a possible design/decomposition defect; evidence-based deadlock reports. **Ergonomics:** honest dev status (`blocked` / `concerns[]` with a bounded single re-dispatch → `dev-escalation`); per-corner `models` routing; calibrated severity (anti-inflation); verify-by-diff grounding. **Elicitation:** gated intent-confirmation L1 pre-step; free pre-spawn self-review; multi-subsystem decomposition signal. **Self-testing:** a standing `tests/scenarios/` behavioral suite + maintenance gates (`check-consistency.sh` now also pairs `clean-first-round` / `fixApplied`) — the skill now tests its own discipline under pressure |
| **v1.5.1** | **Audit-repair hardening** (from a multi-lens self-audit). The consistency gate now genuinely pins the `two-generation` token across its source files (it had been a comment-only no-op) and enforces a `wc -w` ceiling on the always-loaded `SKILL.md`; the commit-prefix lint extracts the subject from the *first* `-m` (multi-`-m` commits went unvalidated) and JSON-unescapes its no-jq fallback; the None tier now requires the reviewer to re-confirm a load-bearing edit changes no rule; `l3-phase.js` unions `clarifications` and reports the round that actually ran on cap-exhaustion; +6 behavioral scenarios (tier-down, None boundary, design-conflict rollback, delete-asks-first, disguised rule-change, dep-upgrade review); MIT `LICENSE` + superpowers acknowledgment; the packaged `.skill` is now built in CI on a `v*` tag instead of committed; the adversarial review **panel** now requires a surviving voter quorum (⌊N/2⌋+1) to render a clean PASS — a panel that loses most voters re-runs instead of silently passing on one. A **second self-audit round** then closed nine more load-bearing gaps: the documented L1/L2 closure no longer collapses the strict `two-generation` rule into a single clean round (the reviewer-emitted `verdict` is no longer a closure authority, and a gate guard forbids it returning); the commit-prefix lint now screens a `git commit` invoked with global options (`git -C` / `-c` / `--no-pager`) and its no-jq fallback no longer over-captures trailing fields; the skill-self behavioral check is discharged by the main agent (the mechanical accept corner cannot run it) and a dev-escalation no longer drops the original blockers; the accept corner stays exit-code-only while the skip/xfail tally moves to the PhaseEnd re-run, and a general finding at the closeout whole-change review is recorded/deferred instead of vanishing; Light Mode's termination rule is now stated, and the tier-table file-count trigger and None cell were tightened (net-negative on `SKILL.md` word count) |
| **v1.5.2** | **L3 runner arg-delivery fix.** `references/l3-phase.js` and `references/review-panel.js` now **normalize their Workflow `args`**: some Workflow runtimes deliver the script's global `args` as a JSON *string* (a verbatim tool-call pass-through) rather than a parsed object, so destructuring fields straight off it left every field `undefined` and the run died with a cryptic `undefined is not an object (evaluating 'phaseLabel.replace')` — previously misread as "args delivery is broken / the Workflow runner is unavailable" and used to justify the prose fallback. Both scripts now parse **and** validate `args` (tolerant of an object *or* a JSON string), so every malformed-args path lands on a descriptive throw that names the fix instead of a raw crash. `references/loop-3-workflow.md` ("Arg delivery") and `references/multi-voter-review.md` record the string-delivery reality so the `JSON.parse` is known-intentional (not dead code) and a thrown arg error is not re-misread as a runner outage. |
| **v1.6.0** | **Project-wide closeout.** The final **F: End-to-End Review** grows from a diff-and-task-doc closeout into a project-wide closeout (`references/end-to-end-review.md`, renumbered to a 9-step checklist), adding five behaviors: (1) **repo-wide validation gates** — F runs every gate the project declares under `_common-commands_`, not only `<TEST-CMD>` (with an operational test that excludes build/deploy/packaging actions); (2) a **whole-project blast-radius review** — the fresh-eyes review now also scans *outside* the diff for consumers/callers of changed or removed symbols, catching a stale caller the diff cannot show; (3) a **change-orphan cleanup sweep** — F removes artifacts *this change* orphaned project-wide while sparing pre-existing dead code (Principle 0.3); (4) **conditional migration verification** — when the change involves a schema / data / config / storage / API-version / dependency migration (now itself a Full-Mode trigger), F verifies it is committed, reversible-or-rolled-back, applied+tested, and free of callers on the old contract; (5) **scoped project-doc reconciliation** — F updates project-facing docs (README, CLAUDE.md, user/API docs) whose described behavior the change made wrong, bounded by an in-scope-vs-drive-by test that keeps Surgical Changes intact. Five new behavioral scenarios pin the new behaviors and `check-consistency.sh` gates each new clause, its cross-reference delimiter, and the fixtures. |
| **v1.7.0** | **Failure retrospective** (a stateless port of Trellis's `trellis-break-loop`, from a comparison with the `mattpocock-skills` and `Trellis` collections). A **systemic (class-level) failure** — a round-cap **deadlock** whose surviving cause is a task-domain class of bug, or an **F step-6 systemic (blast-radius) cause** — now drives a durable **class-prevention** onto an already-read surface (a test, an `_engineering-norms_` line, a skill guardrail) instead of dying in the diff. Detection is **within-invocation** (the skill stays stateless — git is the memory); the cross-task payoff comes from *where the prevention lands*. The retrospective is **additive**: it never relaxes F severity routing (a severe finding still blocks closure), and a **`_load-bearing-docs_` prevention defers as a `finding`** rather than smuggling an unreviewed edit into closeout (the **subject-partition** keeps it non-duplicative with "Meta-test the cap"). New `references/failure-retrospective.md`, hooks in `escalation-rules.md` + `end-to-end-review.md`, a Light-Mode disposition clause, a **reference-only paired token** `failure_retrospective` + four behavioral fixtures in `check-consistency.sh` — **zero SKILL.md surface** (a conditional trigger does not earn always-loaded words). |
| **v1.8.0** | **L1 Evidence Rule** (from the same external-skills comparison; ported from Trellis `trellis-brainstorm`). At L1 pre-step B, before escalating a clarifying question the agent first answers it from the codebase / `docs/design/` / CLAUDE.md: a **repo-answerable fact is looked up, not asked** (no rubber-stamp escalations), while a genuine **product / scope / risk decision the repo cannot answer is still escalated**. Guards **both** failure directions — over-asking *and* the more dangerous under-asking (guessing a decision and calling it "a fact the repo settles", a silent default) — via a new Rationalizations-table row in `escalation-rules.md` and two opposite-direction behavioral fixtures. Reference-only paired token `evidence_rule` across `loop-1-design.md` ↔ `escalation-rules.md`; **zero SKILL.md surface**. |
| **v1.9.0** | **Negation→positive check for skill-self edits** (from the same comparison; ported from mattpocock `writing-great-skills`). This skill is self-hosted, so every edit to it runs through its own L1 review; that review's skill-self-edit branch now flags a **new rule phrased as a bare prohibition** ("never X") that could be a **positive target** ("do Y") and calls for the rephrasing — a bare ban drags the forbidden behavior into the reading agent's context and half-reads as an instruction to do it; a prohibition is kept only as a hard guardrail paired with the positive. Notably, L1 review of this change proved the **rest** of the audited "craft layer" is *already embodied* in the skill (no-op detection ↔ Simplicity First / the trace test / anti-bloat; synonym-drift ↔ the terminology `[Language constraint]`), so only this one non-duplicative rule was added. Single-file token `negation_positive` + one behavioral fixture; **zero SKILL.md surface**. |
| **v1.9.1** | **L3-runner correctness (audit hardening).** Two fixes from a fresh self-audit: (1) the **merge-handoff footgun** — because the dev subagent works in the shared working tree, its `git checkout -b` moved HEAD onto the dev branch, so the recommended close-out `git merge --ff-only <branch>` was a merge-into-itself; dev now branches off the captured `baseSha` before editing, the main agent records its integration branch at invocation, and the merge step returns to it first (`l3-phase.js` dev-prompt + `loop-3-workflow.md`, no control-flow change); (2) two **backfill behavioral fixtures** for previously-unasserted core mechanics — round-cap→deadlock escalation and the L3 clean-first-round *positive* close. (A larger audit finding — separating the accept-loop round budget from the review budget — was split to its own cycle.) Zero SKILL.md surface. |
| **v1.9.2** | **Dependency-tier disambiguation (audit hardening).** A **major-version dependency bump** was simultaneously "dependency upgrade → None tier" (SKILL.md None row + description) and "dependency major-version migration → Full tier" (Full row + the migration definition) — a real mis-tier vector on a common task. The None-tier dependency clause is now qualified **minor/patch** (the exact semver complement of the migration definition's "major-version"), so a major bump routes to Full via the unchanged migration trigger and gets F's migration verification. Two one-word qualifiers + one behavioral fixture (major bump → Full). |
| **v1.10.0** | **A diagnosis method for the fix corner** (Wave 2 of the audit backlog; the one genuine capability gap both `mattpocock-skills` and `Trellis` independently converged on). The fix corner *demanded* "name the root cause" but prescribed **no method to find one** — so an agent under round-budget pressure anchors on the first plausible theory and patches it (the "different item failed each round" churn the deadlock report exists to catch). Now, when the cause is **not obvious after the repro**: generate **3-5 ranked, falsifiable hypotheses** (each states a testable prediction — "if you can't predict, it's a vibe") and seek **discriminating evidence** (the observation that separates the top hypotheses), rather than confirming the first. Wired into `loop-3-development.md`, **both** `l3-phase.js` fix prompts, and a Rationalizations row; paired token `diagnosis_method` + a refutation-constructed fixture (the tempting first theory is refutable-and-wrong, so only the discriminating path reaches the right answer). Zero SKILL.md surface. |
| **v1.11.0** | **A spike/experiment branch of the L1 Evidence Rule** (Wave 2b; ported from mattpocock `prototype`). The Evidence Rule was binary — repo-answerable *fact* → look up; *decision* → escalate — but some design-input questions are **neither**: they're settled only by **running** (does the vendor SDK *actually* support X; what shape is a real payload; can approach X clear the budget). Escalating bounces to a user who'd have to run it too; assuming is a silent default. Now: run a **spike**, tightly bounded so it can't become "code before design" — **(a)** throwaway, run in an **ephemeral isolated worktree and mechanically deleted** (reusing the existing E2E isolated-spawn machinery); **(b)** only durable output = the answer + question, recorded in the design doc (git = memory); **(c)** bounded to the question — design still gates L3. Paired token `spike_answer` + a Rationalizations row + a 4-way fixture (spike vs assume vs escalate vs build-the-real-thing). Zero SKILL.md surface. |
| **v1.12.0** | **A verbatim-evidence standard for external/technical claims in design docs** (Wave 3; ported from Trellis `research.md`). The Evidence Rule governs *whether* to look up / escalate / spike a question; nothing governed the **form of a stated fact**. So a design doc could assert a *confident* external/technical claim ("the callback fires synchronously") as **settled fact with no source**, and that (often hallucinated) claim would propagate into L2 Phase plans and L3 code as if established. Now the L1 review flags a **load-bearing external/technical claim stated without its verbatim `file:line` source** (or a spike-derived value) — **confident or hedged** (a confident unevidenced claim being the more dangerous case) — as a general issue, and the **fresh-eyes reviewer owns the classification** (an author can't dodge by recasting an API-behavior claim as "intent"). Composes with the Evidence Rule + spike (whether-to-ask / run-to-find-out / form-of-a-fact). Paired token `verbatim_evidence` + a Rationalizations row + a fixture (a confident unevidenced claim a baseline reviewer accepts → demand-source). Zero SKILL.md surface. |
| **v1.12.1** | **Gate the adversarial panel-angles sync (gate-integrity hardening).** The five voter angles (the four principles restated as adversarial lenses + correctness) exist twice — `ANGLES` in `review-panel.js` and `PANEL_ANGLES` in `l3-phase.js` — as a *registered* commitment clause that was **ungated**, so the two had silently **drifted** (`l3-phase.js`'s copy had been trimmed, losing "speculative abstraction / unstated assumptions / cross-file drift / unreachable logic"): the standalone and inline panels were reviewing against subtly different lenses. Reconciled `PANEL_ANGLES` to the richer canonical `ANGLES` (strictly more coverage for the inline panel) and added a **block-anchored byte-identity gate** to `check-consistency.sh` (negative-tested: perturbing one string red-fails it) so any future divergence is caught. Zero SKILL.md surface. |
| **v1.12.2** | **Wave-4 anti-bloat / gate-integrity tail (net-negative hygiene, no behavior change).** Six items: **F6** adds a byte-identity gate so the `[Calibration]`/`[Grounding]` review-prompt lines cannot silently drift between `loop-1-design.md` and `loop-2-implementation.md` (the same fix pattern as the v1.12.1 panel-angles sync; the `[Trip-wires]` line legitimately differs L1/L2 and is excluded). **F4** adds an env-overridable per-file word cap (default 3000) for `references/*.md`, catching a single reference file ballooning without penalizing the skill's push-detail-out-of-SKILL.md design. **F15** replaces the near-worthless bare-word gate token `consolidation` (15 incidental occurrences → false-green) with the distinctive references-only marker `consolidation_pass`. **F5/F13/F14** trim over-documented prose in `failure-retrospective.md`, `loop-3-teams.md`, and `optional-subagents.md` with every gated token, fixture-asserted field, and behavioral rule preserved (the four `failure-retrospective-*` fixtures still pass cold). Zero SKILL.md prose surface (only the frontmatter version bumped). |
| **v1.12.3** | **Close F11 (L3 accept-loop budget starvation) as won't-fix.** Records — as a design-rationale comment at `l3-phase.js`'s `acceptRound = round` line — *why* the accept loop deliberately shares the review round-cap budget rather than getting its own: acceptFix commits are code the fresh-review gate never sees, so a separate accept budget would multiply review-ungated churn to buy back a rare edge case (a Phase that needed a review fix has no accept-fix slack); a Phase that exhausts the shared budget escalates by design. The alternative of routing acceptFix back through review (which *would* close that bypass) was weighed and declined for now — a full L3 redesign to close a hole with zero observed instances of opening. Comment-only, no behavior change; the comment follows §0.3 (explains the code, no audit labels). Zero SKILL.md prose surface. |
| **v1.13.0** | **Cross-runtime portability (Claude Code / Codex / opencode).** The skill's structure already conforms to the agentskills.io open standard, so it runs on three agent runtimes off one canonical folder; this release makes that explicit without changing any discipline rule. A new `references/platforms.md` carries the per-runtime **install/discovery matrix** (`.claude/skills/` for Claude Code, `.agents/skills/` for Codex, both for opencode), the **capability map** from each Claude-Code mechanism to its manual-mode realization (incl. `AskUserQuestion → STOP:QUESTION`), and the **fresh-reviewer-isolation ladder** (spawned subagent → fresh/cleared context → disclosed degradation, honest that a subagent-less runtime cannot self-enforce isolation). `SKILL.md` gains a top-level `compatibility` frontmatter field + a dedicated routing row, and reframes the L3 orchestration split so **Workflow mode is named the Claude-Code acceleration layer and manual mode the portable baseline** Codex/opencode run (existing vocabulary; D8 restates that manual mode keeps the L3 clean-first-round relaxation, changing no rule). A paired `cross_runtime` drift token + a new `no-subagent-review-stays-fresh` behavioral fixture gate the SKILL.md ↔ platforms.md pair. The always-loaded word ceiling was raised once, **2888 → 2920**, as a bounded, user-authorized allowance for the honest `compatibility` field + the routing row — a genuine new capability, not a licence for drift. |
| **v1.14.0** | **A test-integrity (flake) rule for the fix corner** (from a review against *loop engineering* — Cobus Greyling / Addy Osmani — whose one transferable safety guardrail the skill did not yet carry). The fix corner told an agent **how to find a cause** (`diagnosis_method`) and **what to do when none is found** (escalate), but never named the case where the diagnosed cause is **non-determinism**: under the accept/fix loop's green-pressure the token-cheap move is to **mask** a flaky failure — disable/skip the test, loosen an assertion, add a blind retry, or bump a timeout to force green (loop engineering's "fixing flakes with code" anti-pattern). Now, once a failure is diagnosed non-deterministic (passes on re-run with no code change — a flake, not a regression in this diff), the fix corner **states the cause and escalates the flake as its own concern** rather than masking it; a deterministic failure stays a fix target under `diagnosis_method`. Wired into `loop-3-development.md`, **both** `l3-phase.js` fix prompts, and a Rationalizations row; paired token `test_integrity` + a spike-validated non-gameable fixture. **A design-time A/B spike measured the delta**: a strong fix agent already refuses masking (a no-op there), but a **weak / cheap-routed** fix agent (the tier `models.fix` permits) masks the flake **5/5** and the rule corrects it to **0/5** — so the rule is a model-robustness guardrail for exactly the routing the skill itself allows. Zero SKILL.md surface (frontmatter version only). |
