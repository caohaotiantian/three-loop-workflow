# Plan — close the audit findings

**Depth: Deep.** Three triggers fire from SKILL.md §1: an edit that changes rules in files under
_load-bearing-docs_ (`SKILL.md`, `references/*`, `scripts/*`, `CLAUDE.md`); a breaking change to a
published contract (`phase.js`'s invocation arguments); and decisions the repository cannot settle
(recorded below, escalated before choosing).

baseSha: `abab57fa4fb4643f9a9046d90a80e9fec345a625` (branch `fix/audit-hardening`)

## Goal

Close the 26 findings from the 2026-07-30 audit, in five phases ordered so that each later phase is
verified by a gate the earlier phase made capable of failing. The governing defect is one thing: where
a rule is enforced by code the code is right, and where a rule is enforced by a *claim* about code the
claim outruns what runs. So the gate is repaired first, and every later phase is accepted by it.

## Non-goals

- **No retro-editing of dated records.** `docs/design/`, `docs/implementation/`, the `CHANGELOG` v1
  table, and the dated `docs/` analyses stay as written. Where a claim in `docs/why-v2.md` is
  incomplete, the qualifier is added; the account of what was measured on 2026-07-28 is not revised.
- **No new measurement of the two-reviewer rule.** The E2 data is unreproducible (why-v2.md:113-119
  says so). Re-running it is a project, not a fix. This change corrects the *pointer* to it, nothing
  more.
- **No statistics into the shipped skill.** Standing owner rule. Qualitative prose only under
  `three-loop-workflow/`.
- **Not promoting any fixture to `discriminating`.** Three guards were measured to carry giveaways.
  Rewriting fixtures is separate work.
- **No re-litigation of the round cap value.** Three fix rounds stays. Whether prose review converges
  in three is a real question, raised in the Close notes, not answered here.
- **Not converting the repo to Workflow-mode self-hosting.** See D5.

## Decisions

**D1. Order the phases by gate capability, not by severity.**
problem: 26 findings, several of which are "the gate cannot detect X" → options: (a) fix by severity,
highest first; (b) fix the gate first, then let it accept every later phase; (c) fix docs first because
they are cheapest → choice: **(b)** → why: (a) would land the `phase.js` correctness fixes while the
only thing checking them is a token grep that passes on a deleted guard — the fixes would be unverified
by construction. (c) ships the cheap half and loses momentum on the half that matters. Under (b) each
later phase has a real Accept command. Cost: phase 1 delivers no user-visible fix.

**D2. The release acceptance script becomes tracked, and `SKILL.md` §2 narrows.** *(escalated — see
Escalations, Q2)*
problem: `.agent/promote-v2-release/accept.sh` is the evidence cited by six release commits' `Gates:`
trailers, is untracked, and its predecessor `.agent/accept.sh` is already gone → options: (a) commit
repo-level acceptance to `scripts/`, keep only the plan and scratch in `.agent/`; (b) commit the whole
`.agent/<task>/` for load-bearing tasks; (c) leave it, accept the loss → choice: **pending Q2** → why:
this changes a rule on the always-loaded surface, so it is the owner's call, not a default.

**D3. `phase.js` guards fail closed on unvalidated agent input.**
problem: `sha()` validates shape, not existence, so a well-formed fabricated `headSha` closes a phase
on an empty diff; and `&& gateHead &&` disables the no-op-fix guard when the gates agent returns an
unparseable sha → options: (a) cross-check the gates agent's independently-measured HEAD against
`base` and treat an unparseable gates sha as `agent-error`; (b) ask the write agent to prove the commit
exists by reporting `git rev-list --count`; (c) accept it as an honest-agent-only guard → choice:
**(a)** → why: the true HEAD is already in hand at `phase.js:203` and costs nothing — the script had
two independent measurements and compared only the self-reported one. (b) adds a field an agent can
also fabricate. (c) leaves the residual half of the defect the release called its most serious.

**D4. `tasks` becomes required; version is minor, not major.**
problem: making a defaulted argument required breaks `phase.js`'s published invocation contract →
options: (a) required arg, major bump to 3.0.0; (b) required arg, minor bump to 2.2.0; (c) keep the
default and warn → choice: **(b)** → why: a caller that omitted `tasks` received an empty task list and
a meaningless run, so nothing that previously *worked* stops working — the contract change converts a
silent failure into a loud one. (a) overstates the disruption; (c) preserves the silent failure the
finding is about. Recorded as a behavior change in the CHANGELOG regardless.

**D7. `depth` is added; `reviewers` keeps working.** *(Recorded in fix round 1, after a reviewer showed
D4's premise did not cover it.)*
problem: P2 replaced the numeric `reviewers` argument with `depth`, which made the previously documented
`reviewers: 2` invocation a `usage-error`. D4 settled on a minor bump on the premise that "nothing that
previously *worked* stops working" — true of `tasks`, false of this → options: (a) keep the rename, bump
major to 3.0.0; (b) accept both spellings, require at least one, stay minor; (c) revert to `reviewers`
and accept the footgun → choice: **(b)** → why: the defect was never the *name*, it was the **default** —
a count that fell back to 1 let a Deep phase run the Standard review by omission. Requiring one of the
two closes that without breaking a documented call, so D4's premise becomes true rather than being
argued around. (a) charges every user a major upgrade for a rename. (c) keeps the footgun. Cost: two
spellings for one concept, which the Simplicity rule normally forbids — accepted here because backward
compatibility is a reason, and disagreement between them is a `usage-error` rather than a precedence
rule nobody would remember.

**D5. Run the loop by hand, not through `phase.js`.**
problem: this is a multi-phase Deep change, which `build.md` says is what Workflow mode is for →
options: (a) drive phases through `scripts/phase.js`; (b) run the loop by hand with fresh subagent
reviewers per phase → choice: **(b)** → why: phase 2 edits `phase.js` itself, so (a) would have the
orchestrator rewriting its own control flow mid-run — and the empty-diff and cap guards under repair
are the ones the run would depend on. (b) is the portable path the skill fully supports; the reviewer
count and triage discipline are unchanged. Cost: round counting is manual, so it is recorded here.

**D6. Two reviewers per phase, in parallel, union, triage before counting.** Not a choice — SKILL.md §4
for Deep. Recorded so the phase log can be checked against it.

## Escalations — asked before building, answered 2026-07-30

- **Q1 → delete the injection.** `concerns` no longer reaches any reviewer; SKILL.md:60 stands as
  written. The implementer still reports the field, and it is returned to the caller instead.
- **Q2 → track repo-level acceptance in `scripts/`.** `.agent/<task>/` keeps the plan and scratch only;
  `SKILL.md` §2 narrows by one clause. Settles D2.
- **Q3 → return the rejection record and feed it forward.** One triager stays; `rejected` joins the
  returned object and prior rejections are passed into the next round's triage prompt.
- **Q4 → add the whole-artifact read to `close.md`, Deep only.** Not to `build.md`: the evidence
  supports it for document-shaped work, and Standard should not pay for it.

## Accept

```bash
bash scripts/accept-release.sh
```

Whole-change acceptance. Must exit 0 on HEAD, and must exit **non-zero** on each of the five mutation
variants in `scripts/negative-test.sh` — the failing case is written and watched to fail before the
check that catches it is trusted.

## Phases

**P1 — A gate that can fail.** Findings 1, 5, 6, 10.
Move release acceptance to a tracked `scripts/accept-release.sh`; replace its five `grep -q` invariant
checks with `scripts/sim-phase.js`, a stub-driven execution of `phase.js`; extend
`check-workflow-syntax.sh` to fail on `Date.now(`/`Math.random(`/`new Date(` and on a missing
`export const meta`; add a `push`/`pull_request` CI workflow that runs both, and a version==tag
assertion to `release.yml`.
Accept: `bash scripts/negative-test.sh` exits 0, having confirmed each mutation is detected — including
the two guards disabled with `false &&` (tokens intact) and the no-op guard deleted outright;
`node scripts/sim-phase.js` exits 0; `check-workflow-syntax.sh` exits 1 on a `Date.now()` fixture and 0
on `new Date(args.ts)`.

*Amended mid-phase.* The original Accept required `accept-release.sh` to exit 0 at the end of P1. It
cannot: the script is authored complete in P1, so the five checks belonging to P4 and P5 are red until
those phases land. Writing the check before the fix and watching it fail is this repo's own rule, so the
gate is left red on purpose and the exit-0 requirement moves to the whole-change Accept. P1 closes on
`5 check(s) FAILED`, all five in P4/P5 scope and named in the phase log below.

**P2 — `phase.js` fails closed.** Findings 3, 7, 11, 12, 14, 15, 21, 22, 23.
Accept: `node scripts/sim-phase.js` exits 0 with every scenario asserted, including fabricated-sha →
`agent-error`, malformed-gate-sha → `agent-error`, cap spends exactly `maxRounds` fixes, gate-fix and
review-fix rounds counted separately; `check-workflow-syntax.sh` exits 0.

**P3 — the scenario runner computes its verdict.** Finding 4.
Accept: `node scripts/sim-phase.js --scenarios` drives `run-scenarios.js` with a scoring agent that
returns `suite_pass: true` alongside a GUARD-BROKEN row, and asserts the script overrides it to false;
a dropped arm returns a non-green status.

**P4 — the claims match what runs.** Findings 2, 9, 13, 16, 20, 24, 26.
Accept: `accept-release.sh` gains checks for `mkdir -p` in both READMEs' install commands and for the
discriminating qualifier on the both-arms claim in all six locations; both README install paths verified
by execution in a temp directory.

**P5 — the skill gains what the audit showed it lacks.** Findings 17, 18, 19.
Accept: `accept-release.sh` asserts the whole-artifact read exists in `close.md` and the missing-guide
fallback in `SKILL.md`; `SKILL.md` word count ≤ 1500; syntax gate green.

**Close.** Repo-wide gates from a clean tree; orphans; blast radius on every `phase.js` return-shape
consumer; CHANGELOG + CHANGELOG-cn for 2.2.0 with matching figures; version bump; the convergence
question recorded for the owner.

## Rollback

- Before any tag: `git checkout main && git branch -D fix/audit-hardening`. Nothing outside the branch
  and `.agent/harden-audit-findings/` is touched until merge.
- After merge, before a tag: `git revert -m 1 <merge-sha>`. The five phases are separate commits, so a
  single phase can be reverted alone — which is the property `build.md:100` asks for and the v2.0.0
  release commits did not have.
- After a tag: `git tag -d v2.2.0 && git push origin :refs/tags/v2.2.0`, delete the GitHub release.
  No user data or persisted state is migrated, so reinstalling the previous folder is the whole
  user-side rollback.

## Review log

**Fix round 1** (P1+P2 review: 2 reviewers per phase, union, triage before counting).
Reported 11 blocking across both phases; **9 confirmed, 2 rejected**. Both reviewers independently found
the round-2 empty-diff hole, each by execution.

Confirmed and fixed:

1. `gateHead === base` was gated on `fixes === 0`, so the shell-sourced empty-diff guard only ran before
   the first fix. A fix round that reset or dropped the phase's commits landed HEAD back on the base and
   tripped neither guard — `lastHead` is the previous round's non-base head. Closed green with
   `headSha === baseSha`. Now checked every round.
2. `phase.js` and `build.md` both claimed the fabricated-sha hole was closed. It is not: a fabricated sha
   is *discarded* in favour of the real head, which makes it harmless, not detected. Both claims narrowed
   to what is true. Detecting it needs a shell, which a Workflow script does not have.
3. `build.md`'s "every argument is required except two" was false against its own table — `phaseLabel`
   defaults and `models` was missing entirely. Table corrected and marked per-argument.
4. `sim-phase.js`'s union invariant was half-asserted: the finding names were `x` and `y`, and `y` occurs
   in the static triage prompt prose, so the reviewer-2 assertion passed unconditionally. The triage stub
   also returned a hardcoded confirmation. Distinctive names, stub echoes its input, and mutation **M16**
   (reviewer 2 discarded entirely) added — it survived before the fix.
5. `accept-release.sh` used `printf "%'d"`, which emits no separator under `LC_ALL=C.UTF-8` — the CI
   default. Reproduced: six spurious failures, so the whole-change Accept was unreachable in the CI that
   runs it. Grouping is now computed in python3. (The first replacement used `sed -E ':a;…;ta'`, which
   BSD sed reads as one label name and silently returns its input — caught by re-running, not by reading.)
6. The install check hand-wrote the `mkdir -p` the READMEs omitted, so it passed whatever the README said.
   It now extracts the commands from `README.md` and runs those. Verified in both directions: `ok` on
   HEAD, `FAIL` naming the misplaced path when the `mkdir` is removed.
7. The syntax gate's new behaviours had no committed failing case — tested by hand, attested in a trailer,
   reproducible by nobody. Eight fixtures in `tests/gate-fixtures/`, asserted in both directions.
8. **D2/Q2 was half-landed.** `SKILL.md` §2 still told users to keep an acceptance script in the
   gitignored task directory — the practice this whole change exists to end. Narrowed.
9. The `depth` rename broke a documented invocation with no Decision recording it. See **D7**.

Rejected:

- *"`workflow({scriptPath}, args)` is an undocumented two-positional-argument form."* The runtime's
  signature is `workflow(nameOrRef, args?)`; two positionals is correct. The reviewer said it could not
  verify from inside the repo, which is fair — but the form is right, so there is nothing to fix.
- *"Removing `reviewers` breaks callers"* as a **code** defect — real as a record defect (D7), and the
  code fix makes the break moot rather than documenting it.

Round 1 spent. Cap is 3.

**Fix round 2** (P3+P4 review, and the remainder of the P1 triage).
Reported 8 blocking; **6 confirmed, 2 already fixed in round 1**.

1. `run-scenarios.js` counted rows instead of matching them: two rows for one fixture and none for
   another satisfied `rows.length === FIXTURES.length` and scored green with the only discriminating
   fixture never judged — the exact defect P3 exists to close. Verified by execution. Now the row **set**
   is matched against `FIXTURES`, rejecting duplicates, unknowns and omissions, each named in the reason.
2. `kind` is agent-reported, and a reply labelling every row `guard` passed vacuously: `every()` over an
   empty array is true, so a suite with nothing capable of discriminating went green. A floor
   (`discriminating.length >= 1`) closes it in the runner; `accept-release.sh` separately reads
   `expected.json` and asserts it really declares one, because a Workflow script has no `fs`.
3. **The P3 Accept criterion was unimplemented.** A reviewer mutated the pass condition to honour an
   agent-supplied `suite_pass` and all twelve harness cases stayed green — no canned reply had ever set
   it, so the one channel the rewrite existed to close was untested. Two cases added, and
   `negative-test.sh` now mutates `run-scenarios.js` too (S1–S4).
4. The both-arms claim check was line-scoped and English-only: `docs/why-v2.md`'s claim wraps across two
   lines so `both arms` and `INVALID` never shared one, and the four Chinese documents were never read.
   Demonstrated by reverting each half in a scratch clone — the old check stayed silent both times. Now
   paragraph-scoped over normalised text, in both languages, and negative-tested in both.
5. **The gate was locale-dependent in two more ways than round 1 fixed.** `wc -w` itself differs — 6,047
   for the v2.0.0 prose under UTF-8, 6,046 under `LC_ALL=C` — and the published figures are the UTF-8
   ones, so the gate would have accused correct documents of being stale. A UTF-8 locale is pinned, and
   the script refuses to run if none exists. The first version of that pin was itself broken: under
   `set -o pipefail`, `locale -a | grep -q` fails because grep exits first and `locale -a` takes SIGPIPE,
   so no locale ever matched. Caught by running it, not by reading it. Now green under `C`, `C.UTF-8`,
   `en_US.UTF-8`, `POSIX`, and with the variables unset.
6. The two checks accepting P5 are prose-presence and cannot be more: no check can tell "the rule is
   stated" from "the rule is stated correctly", and text asserting the opposite would match equally.
   Rather than dress presence up as verification they are now **labelled** presence-only, pinned to a
   distinctive sentence, and the limitation is named in the script. Behavioural coverage for the two new
   prose rules needs two-arm fixtures — deferred, and recorded in the Close notes as a follow-up rather
   than left implied.

Round 2 spent. Two of three rounds used; the cap is 3.

**Fix round 3** (P5 review + the whole-artifact product read — the rule P5 itself added, applied here).
Reported 6 blocking; **4 confirmed, 2 already fixed in round 2**.

1. **A quantified measurement had crossed onto the shipped surface.** `close.md` justified the new
   whole-artifact read with "four rounds of diff review … three readers", violating this plan's own
   Non-goal and the owner's standing rule. Rewritten qualitatively. The statistics sweep in
   `accept-release.sh` did not catch it — it looks for `%`, "percentage points" and one named figure —
   and widening it to every numeral would flag legitimate ones ("three fix rounds", "two reviewers").
   That boundary is a judgment call review has to make; noted rather than automated.
2. **`CLAUDE.md` claimed "nothing an agent merely reports is trusted".** The confirming value is itself
   an agent report — the gates step is asked to run `git rev-parse HEAD`. What the code does is
   cross-check two independent reports, which detects an empty review and renders a fabricated sha
   harmless without detecting it. Reworded to what is true.
3. **`CLAUDE.md` claimed the harnesses assert all ten invariants individually. Two did not hold.** The
   union case was fixed in round 1. The verify loop's structural bound genuinely cannot be asserted
   alone: removing it changes nothing observable, because the cap returns first. Demonstrated —
   `while (true)` alone leaves all 42 invariants green. It is defence in depth, load-bearing only when
   the counter also breaks, so mutation **M17** now removes both at once and the runaway ceiling catches
   it. The claim is narrowed to say exactly that.
4. **Two claims in the P4 commit message were false**, and they are in permanent history:
   - it said CLAUDE.md now carries the both-arms qualifier. CLAUDE.md was not in that diff; it was
     corrected in P5, one commit later.
   - it said "CHANGELOG.md already stated it correctly and is unchanged". The *paragraph* is honest —
     it reports 6/6 guards held and "only one of seven fixtures can discriminate at all" — but the
     *sentence* carries the same overstatement corrected elsewhere. The dated entry is left as written
     under the Non-goal on dated records; the false claim about it is corrected here and in the v2.2.0
     entry rather than by rewriting the commit.

Round 3 spent. The cap is 3 and it is now reached: no further fix round is available under this plan, so
anything found after this closes as a follow-up, not a quiet round four.

## Close notes

- **Repo-wide gates**: `accept-release.sh` green under `LC_ALL=C`, `C.UTF-8`, `en_US.UTF-8`, `POSIX` and
  unset; `sim-phase.js` 42/42; `sim-scenarios.js` 16/16; `negative-test.sh` 21/21 mutations detected;
  syntax gate green on both scripts and on all eight committed fixtures, in both directions.
- **Orphans**: `.agent/promote-v2-release/accept.sh` is superseded by `scripts/accept-release.sh` and is
  referenced by no tracked file. It is another task's directory, which `close.md` says to leave, so it is
  left — but it is a bypassable script sitting on disk, and anyone who runs it will get a green result
  that means nothing. Worth deleting by hand.
- **Blast radius**: the only consumer of `phase.js`'s argument contract was `build.md`, updated in P2;
  `platforms.md`'s references remain accurate. `reviewers` still works, so no external caller breaks.
- **Deferred, named rather than implied**: the two prose rules added in P5 (the missing-guide fallback and
  the whole-artifact read) have presence checks only. Behavioural coverage needs two-arm fixtures, which
  this plan's Non-goals excluded. That is the honest gap in this change.
- **The convergence question, unanswered and worth the owner's attention.** This change took three fix
  rounds and reached the cap. Of the 19 confirmed findings, **10 were defects in the gates and harnesses
  added by the change itself** — the checks needed checking, twice. Two were found only by the
  whole-artifact read, which is the rule this change added. Whether three rounds is the right cap for a
  document-shaped Deep change, or whether prose review simply does not converge in three, is now
  supported by two data points (v2.0.0's four rounds, this change's three-and-capped) and neither was
  planned as an experiment.

## Non-blocking triage (not a fourth fix round)

The P3–P5 review's four **blocking** findings were all already closed in round 2. Its non-blocking list
was not. `build.md`: "Triage non-blocking ones the same way: fix the cheap and correct ones, and for the
rest say plainly what you are not doing and why." The cap bounds *blocking* rounds and no blocking finding
is outstanding, so this is that step, not a quiet round four.

**Fixed:**

- **A regression this change introduced.** The documented `args.fixtures` subset path always returned
  `incomplete`: the read prompt asked for "every fixture in expected.json" while the completeness check
  matched against `FIXTURES`. Reproduced, then fixed by scoping the prompt to the fixtures actually run.
- **`letter()` misread a hedge.** It scanned for the first standalone A–D anywhere in the string, so
  "not A, but B" scored as **A** — silently counted as a real answer. Now strict, with one tolerated
  shape (`{"answer":"C"}`, which the old schema description invited), else malformed.
- **Two token greps in `accept-release.sh` claimed more than they checked**, against this file's own
  opening rule. `const suite_pass = reading.suite_pass && false &&` satisfies the "computed in the script"
  grep, and a double-quoted schema entry evades the anti-schema grep. Both demonstrated. **Deleted rather
  than patched** — `sim-scenarios.js` catches the semantic version of both by execution, and
  `negative-test.sh` proves it can. A bypassable check next to a working one is just a false claim.
- **Two comments asserted an observation with no record behind it** ("arms really did return…",
  "Really observed:"). The premise is sound from the diff — the old description asked for an object while
  typing the field a string — so the wording now states the premise instead of an unrecorded run.
- **`run-scenarios.js`'s header claimed more than it delivers.** "Computed, not asserted" is true of every
  comparison and of the pass condition, but the *inputs* still come from an agent reading `expected.json`,
  because a Workflow script has no filesystem. The header now says exactly what is and is not detectable.

**Not fixed, and why:**

- **A constant fixture→kind map in the runner.** It would close the mislabelled-`kind` half, but it
  duplicates `expected.json` inside the script that consumes it, and two sources of the same fact drift —
  which is the failure this repo has already paid for five times in one release. The residual risk is
  bounded: a mislabelled `kind` on a specific fixture flips that fixture's verdict, and the two cases that
  matter are covered elsewhere — an all-`guard` reply hits the discriminating floor, and
  `accept-release.sh` reads `expected.json` directly to confirm one is declared. Stated as a known limit
  in the runner's header rather than half-closed.
- **Plan deviation, recorded here rather than silently:** P3's Accept named
  `node scripts/sim-phase.js --scenarios`. It shipped as a separate `scripts/sim-scenarios.js`, because a
  mode flag on a harness for a different script is worse than two files with one job each. The Accept's
  substance — driving the runner with a canned reply that tries to assert a pass — is met.

## Two-arm suite — run against the changed tree (2026-07-30, post-P5)

Required by CLAUDE.md for any change to the discipline; P5 changed `SKILL.md` and `close.md`. It had been
run only against the pre-change tree, which was an acceptance step missed at Close.

`suite_pass: true` — **no GUARD-BROKEN**, no malformed rows, no invalid fixtures.
All six guards HELD; s04 VALID (skill-off A, skill-on B). Discrimination 1/7, 1 of 7 capable — unchanged.

This is also the first live exercise of the P3 rewrite: a real reading agent returned rows and the script
computed the verdict, with nothing agent-typed in the pass condition. It behaved as the harness modelled.

**One thing the strict computation surfaced that the old scorer hid.** `both_arms_flagged_giveaway` is now
computed from both arms' booleans and came back **false for every fixture** — while the free-text
`giveaway` field was populated on s03, s05 and s06, and both arms on s01 volunteered in their *reasoning*
that the fact list is stacked. Arms fill in the giveaway text while leaving `rule_was_stated_in_prompt`
false, so the flag under-reports and the honest signal is now in the per-fixture `note`s. The old LLM
scorer read these loosely and reported three flagged guards; the strict version reports none. Neither
number is wrong — they measure different things — but the boolean is the weaker one.

**Follow-up, not fixed here:** either tighten the `rule_was_stated_in_prompt` prompt so the boolean tracks
the text, or drop the boolean and judge from `giveaway` being non-empty. Recorded rather than changed,
because the fixtures themselves are an explicit Non-goal of this plan.
