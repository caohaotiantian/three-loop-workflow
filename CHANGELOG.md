# Changelog

Full version history for the three-loop-workflow skill. See [README.md](./README.md) for what the skill is, when it applies, and how to install it.

## v2.7.0 — delegation has a home

`references/orchestration.md` was the file you opened to run two writers at once, or to drive the Build
loop as a script. Neither is the common case for delegation. The common one — handing a phase to a
single agent and getting back a claim you have to believe — had no home anywhere in the skill. It has
one now, and the file is named for it: **hand implementation to another agent** is the first thing its
opening line says, and `SKILL.md`'s routing table now says so too.

**Five new sections, all about handing work to an agent.** *Spawn, or do it yourself* puts the control
arm first: a fresh agent's cost is the **context it lacks**, so the comparison any orchestration has to
beat is one agent with a better prompt or a better model, and you run that comparison before you build
a topology. *Briefing a writer* says what a brief carries — the objective, the output shape, what to
read, the boundaries, and the phase's `baseSha` captured before the spawn — because your session and
your reasoning are not inherited, and then names the three things a writer gets wrong unprompted: it
opens a per-phase branch, so the next phase's review re-shows this phase's work; it returns "done"
rather than the branch and head sha it finished on; it leaves the work uncommitted. *Verify the claim,
not the report* treats "done" as a claim about a repository — compare the reported sha with
`git rev-parse <branch>`, then require `git diff <baseSha>..<branch>` to be non-empty, and name the
branch rather than `HEAD`, because the writer may have worked in its own worktree. A failed check is
the phase's `agent-error`: re-brief, do not accept. *Two writers: divide, then land* partitions by
**file ownership**, written into the plan before anyone is spawned, and names an **integrator** who is
neither writer — neither writer's green covers the merge, so the gates run again on the merged tree and
the integrated review's base is the merge target's head before the first branch landed. And *the plan
does not travel*: `.agent/` is gitignored, so an agent starting in a worktree, a clone or a container
reads the plan path, finds nothing, and works from the brief alone. The main worktree's copy is
authoritative — hand over its absolute path, and copy the directory in only where the agent cannot see
that tree at all.

What the delegation guidance rests on is recorded outside the skill, in
**`docs/analysis-2026-09-17-orchestration-evidence.md`**: every source with its URL, its date and a
grade — measured, vendor advice, case study, opinion — the two that could not be fetched, the
recommendations that were considered and declined, where the sources disagree with each other, and the
figures deliberately not carried across. The shipped skill still quotes no statistic; it cites two
sources by title and date and one by title and year, which is the form `platforms.md` already used.

### What the script actually does, where the file said less

Each of these was in `scripts/phase.js` and not in the prose beside it. `reviewers` above 4 and
`maxRounds` above 10 are `usage-error`s, not silently clamped values. The wrong-branch check runs
**every round**, not only at the write step, and it stops the phase as an `agent-error` — without it a
fix agent that strays leaves the branch unchanged and the phase grinds to `cap-exhausted` with nothing
to say why. The gates' test tally is not an error: fewer tests collected than an earlier round, more
skipped, or no tally where one was reported before, each becomes a **finding routed through triage**,
because deleting an obsolete test is legitimate work — and that routing happens only on a round whose
gates went **green**. A `closed` result carries the tally as `tests`; no other status does, and a note
stands in where no round reported one, since a shrink check with no baseline is a guard that was off
rather than one that passed. Triage is a separate agent that rules on no work of its own and is handed
the findings **numbered**, so it may return only numbers from that list and a finding no reviewer
raised is unrepresentable rather than discouraged. And `agent-error` now says what a caller can read
from it: `stage` is always set, `reason` is there where a guard wrote one, and it is an infrastructure
or environment fault rather than a verdict on the change.

`phase.js` itself changed only in text, and no behavior moved: `meta.description` named
write → gates → review → fix while `meta.phases` listed Triage, and neither named the behavior check
that runs beside the reviewers; two comments and a log line cited `build.md` for the reviewer-count
rule that `SKILL.md` §4 owns; and one comment claimed `phaseLabel` reaches the Fix agent's prompt,
which it does not.

### One home, four rules

Four rules were stated in two places, which is two things to keep in sync and a drift this repository
has already shipped once. The **reviewer count** now lives only in `SKILL.md` §4 — `build.md` and
`plan.md` point at it, and `plan.md` keeps "Why two", which is its own argument. **A branch name is not
isolation** lives in `orchestration.md` with the trap it belongs to; `build.md` points. The
**`behaviorCheck` contract** — the shapes, what `false` asserts, what `{ read: … }` asks for — lives in
`orchestration.md` beside the rest of the script's arguments; `build.md` states the rule and points for
the argument. And *read the result as a product* is `close.md`'s, including when it runs at Standard
depth and what it catches that diff review structurally cannot; `build.md` no longer restates it.

### Escalation, and what Close hands over

`escalation.md`'s in-flight-overlap row asked for "the overlap, and whether to merge or serialize" and
now asks for the answerable version: which files both tasks touch, which is further along, your
recommendation — merge, serialize, or split ownership — and what gets redone either way. Beside it, a
paragraph for the case the row did not cover: **peer sessions and agents are in-flight tasks too**. Two
sessions on one checkout are two writers in one tree. Before taking over a task another session
started, confirm that peer has stopped, hunt its uncommitted work in any shared tree, and read
`.agent/<task>/plan.md` **before your first edit** — its Non-goals bind you too, and its Progress line
and `baseSha` values say where a review starts. The task directory is the hand-off contract between
peers as much as across a compaction.

`close.md` said no closure document and then listed what the PR body carries, which made the positive
half a Deep-only list although a Standard change writes a PR body too. *What Close hands over* is now
one of two depth-independent sections, it points at `SKILL.md` §2's durable copy rather than
paraphrasing the Goal and Non-goals again, and a **Standard** change hands over the same list minus the
rollback re-read — that subtraction is `close.md`'s own line. `SKILL.md`'s depth table ends the
Standard row at §2's PR body, and its routing row for `close.md` now reads "Close a Deep change, hand
any change over, or read its output as a whole".

### The backstops moved, after a re-review and in their own commits

Three went red and were raised, each in a commit of its own after the re-review this repo's norm
requires — two fresh diff reviewers on the phase that grew `orchestration.md`, one on the phase that
grew `escalation.md`, two fix rounds, a verification review of both, and a read-as-a-product pass over
the whole skill — with the duplicates those reviews found cut before the counts were taken. `orchestration.md` 2300 → 3250, `escalation.md` 1450 → 1600, and the whole prose
surface 16500 → 17400, each roughly the new count plus five percent, rounded, with the reason written
into `scripts/accept-release.sh` beside the number. The objection is on the record there too, and it is
the stronger one this time: `orchestration.md` landed above its own plan's aim twice, it is now the
largest reference in the set, and it carries two subjects — hand delegation, and the script's API. The
next growth in that file is a **split**, not another raise. The total is the binding constraint again,
because the per-file backstops now sum above it.

### Known limitations

`behaviorCheck: null` is still accepted by `phase.js` and **reported as `false`** — the run logs it
and the closed result says the check was declined, so a `null` arriving from a missing variable is
indistinguishable in the record from a caller who declared that nothing here is user-visible. That is
the "a stage that does not run" defect the required argument exists to prevent. It is a follow-up, with
its own harness case, not a fix smuggled into a release.

## v2.6.0 — aimed at the person, and at what is likely wrong

Four independent reviews read v2.5.0 — the always-loaded surface, the Build loop with `phase.js`
beside it, this repository's own prior audits against published practice, and a red-team walk-through
of six concrete requests — and were merged into one plan before anything was edited. Two findings
recurred across all four. Every mechanism here checks the diff against the plan, and nothing checks
the plan against the person who asked. And the ceremony a Deep grade buys is priced identically
whatever tripped it, so the cheapest thing the skill could do for a small change caught by one trigger
was the thing it never did.

**Confirm the reading before you build.** Where the Goal names a reading of the request that could
have gone the other way, that sentence and Accept's observable outcome go in front of whoever asked,
and you wait. One exchange against a whole build spent on the wrong thing — and on a Standard change,
where there is no plan reviewer, it is the cheapest independent check on whether this is the *right*
change rather than a correct implementation of a wrong one. Where nothing was ambiguous it costs
nothing: say what you are about to do and carry on. Where nobody is reachable, the Goal records that
the reading was unconfirmed, so the diff reviewer knows to question it.

**The description advertised two modes the skill did not serve.** v2.5.0 dropped the guide-refresh
clause — the one trigger phrasing this repo has ever measured — and with it the only route to
`maintenance.md`, which became unreachable text again. The clause is restored, in a form the NOT-WHEN
list cannot swallow; the restoration is a wording change and was not re-measured, which is a task of
its own. The other advertised mode, reviewing a change before it lands, routed a reader into a
workflow whose every step assumes you are the author: no plan, no `baseSha` of yours, five reviewer
questions that cannot be answered, and no exit that reads "hand the findings over". §4 now implements
that path rather than withdrawing the claim — base from `git merge-base`, the existing reviewer
prompt with two substitutions, gates run rather than trusted from a badge, triage as always, findings
handed to the author, and no fixing.

**The anchor map is no longer written as the normal case.** The longest sentence on the always-loaded
surface described a convention essentially no repository outside this one has, and the fallback
covering nearly every real repository got one line. That is inverted: unstructured prose is the normal
guide, you read it and take the gate commands, the contract files and the norms; the role-anchored form
is the special case that makes role citations resolve directly. Where a role has no home, derive it
from the repository and say in one line what you inferred and from where — a missing role never means
the rule it feeds is skipped. Offering to restructure someone's guide mid-change is gone: it edits a
contract file, so it is a Deep change of its own, proposed after this one lands. And where a repo has
no gates at all, that is now stated before building rather than absorbed silently, because writing a
project's first test infrastructure is a scope decision.

**Deep scales to the trigger that fired.** The instruction to "run the parts that catch the risk, not
the ceremony" handed back exactly the judgement the checklist had just removed, and in half the
red-team scenarios that was the cost driver. Each trigger now names the mechanisms that catch *its*
risk and the ones to drop without asking: a contract break keeps the escalation, the compatibility
decision, the deprecation artefacts and `close.md`'s blast-radius read and rollback re-read, and drops
phases unless the surface is large; an irreversible outside effect keeps Rollback, migration
verification and a behavior check on real-shaped data; a contract-file rule edit drops phases and
migration steps, and the Close section carrying its weight is the read-as-a-product pass — both plan
readers and a Close pass are universal at Deep, and what the table scales is the phasing and which
Close sections carry the weight; structural alternatives keep the alternatives
and a spike, and nothing else until the choice is made. A one-line rule edit that trips a trigger runs
that trigger's row and nothing else.

Four smaller edits to the same surface. The first grade is **provisional** — a build that turns up a
contract, a migration or a load-bearing rule you did not see stops before the next commit and
re-grades, upward on your own judgement and downward only on the user's. When the contract trigger
fires, the first Decision in the plan is **whether the break is necessary at all** — an alias, a
defaulted field, a new surface beside the old one, a deprecation window — because "we could avoid
breaking this" is not a detail the user can supply later. Direct admits a **patch or minor** dependency
bump, never a major one; the old wording let unbounded blast radius through on the absence of an
advisory. And a defect whose cause is unknown is now routed to Diagnosis *before* the plan, as its own
task with the cause as its Goal and a reproduction as its Accept, because you cannot write an
acceptance command for a fix you have not diagnosed.

### In the references

Triage answers two questions in order — **is it true, and is it this change's problem?** The five-point
scale answers only the first, and a finding that names a declared Non-goal scored 75-plus and then got
fixed. The skill *manufactures* these, because the reviewer is aimed at the Non-goals; they are now
rejected by name, with one line saying which Non-goal and that it is worth its own task.

The behavior check gains a **read** mode, for something read rather than run: the reader is handed the
finished files in the order a new user meets them, with no diff and no account of what changed, and
answers whether every step can be performed as written and whether any two sections contradict. This
repository's own load-bearing-document changes are that case, and the only expressible answer before
was `false` — the assertion that nobody will read it.

The reviewer questions now put two classes gates rarely catch directly after the unexpected-input
question: what happens when something the change calls **fails**, and which facts about code
**outside the diff** the change assumes. A
process-comment question was cut to make the slot, and the prompt now says that a diff of generated
artefacts — notebooks, lockfiles, snapshots, minified output — must be read in its source form,
because a diff you cannot read is not a diff you reviewed. A fix round may never edit the plan: the
plan is gitignored and therefore invisible to every reviewer that follows, which makes widening the
Goal the cheapest way to clear a finding. Close re-reads **Rollback against what actually landed** —
a recorded rollback that no longer works is a blocking finding, not a note — and its prohibition on
closure documents gained the positive half it never had: what the person merging this receives, in
the PR body, in five lines. Escalation gained a first row for the defect that is still doing damage,
where you say what you are stopping and stop it before diagnosing rather than asking permission, and
its contract row now names an exported symbol callers import. `platforms.md` gained the degradation
row for driving the user-visible path, a row for purpose-built diff reviewers, and the personal Codex
install path.

Four smaller reference rules a user meets directly. Close's *read the result as a product* pass is now
**depth-independent**: a Standard change whose output is read or run as a whole — a document set, a
CLI's help, a config schema, a public API surface — runs that one section for the cost of an agent,
and the rest of Close stays Deep. The behavior check on a surface you must not drive — production
payments, a live third party, an hours-long job — is **not waived**, and `behaviorCheck: false` is the
wrong answer there, because a person does call it: drive it somewhere safe and cheap instead, a
sandbox credential, a test card, a toy dataset, and name in the plan where it ran and what that
environment does not cover. `false` asserts one thing only — that nothing this phase builds is ever
clicked, typed or called. Accept's observable outcome is written to be **cheap to observe**, a few
requests rather than a soak, because the check that runs beside every review is the one that must not
cost hours. And Decisions gain the option the model rarely generates unasked: name **the smaller one**
— the version that does less, reuses something that exists, or does nothing — with what it fails to
give the user. It usually loses, and writing why is cheap.

### For callers driving `scripts/phase.js`

**The gates step must now report `diffLines`** — what `git diff --numstat <base>..HEAD | wc -l` prints
— and it is required in the schema. Every empty-diff guard until now was an equality test on shas, and
sha inequality is not diff emptiness: a fix round that reverts the phase's own work moves HEAD, passes
both guards, produces an empty diff, and earns green gates and a clean review from a reviewer that was
shown nothing. An unparseable `diffLines` fails closed.

**Two new result shapes callers may switch on.** A review-driven round that changes the code but not
the confirmed findings returns **`no-progress`** — checked after the cap, so the cap still wins — with
the deadlock report, rather than spending the remaining rounds proving the same thing more expensively.
And `behaviorCheck` accepts **`{ read: '<the files, in the order a new user meets them>' }`** beside
the string and `false`, with the same schema and the same refusal to close on a check that could not
be run. `orchestration.md` now tabulates every `status` the script can return and what a caller does
with each, `closed` being the only one that continues the run.

Green is no longer believed against the script's own contradicting data: `all_pass: true` beside a
tally with failing tests, or with nothing passed and everything skipped, stops the phase instead of
dispatching reviewers onto a red build. Triage receives the scope test and the score bands, and the
precedent block no longer pre-judges — a reappearing claim is either the same phantom or a real defect
the earlier rejection got wrong, and the two look identical from there. The fix prompt carries the
repair-only rule the round-cap experiment exists to enforce, names new machinery instead of building
it, and is forbidden the plan. The reviewer prompt is byte-identical to `build.md`'s, which is a
mechanism duplicated by necessity and has drifted once already. Four one-line guard repairs: an
unparseable branch is an error rather than a silently disabled check, the closed result normalises its
gate list like every other path, `agentsDispatched` is reported on every return and not only the two
that succeed, and reviewers three and four stop receiving prompts byte-identical to one and two.

Every control-flow change landed behind a harness case watched failing first. `sim-phase` asserts 125
invariants and `negative-test` kills 79/79 mutations — which is a count of what someone thought to
inject, and bounds nothing above it.

### Rejected, on the record

Showing Goal and Accept before *every* build, which is the confirmation turn priced at zero on an
unambiguous request. Widening Direct to any behavior fix with a pasted check — the Direct row's
exclusions are the highest-value lines in the file and widening the tier is where they leak. A session
or token budget in the plan: a rule with no mechanism, and `no-progress` attacks the same cost with
one. A `resumeFrom` argument, real and the largest new control-flow surface proposed, deferred to its
own change with its own harness cases. Flipping Deep's reviewer default from two to one: it silently
reduces verification for every existing caller, so the call site logs the cost instead and says where
one is the documented choice. Deleting `maintenance.md` as unreachable, when the actual fix was the
description clause that stopped routing to it. And the two-arm eval and the model-variance sweep,
which are the right next task and deliberately not this one, because budget draining into the suite is
this repository's oldest failure mode.

### The backstops moved, after a re-review and in their own commit

The additions exceeded the cuts and six per-file backstops went red, including the total. The repo's
own norm says a red backstop is answered by neither shaving synonyms nor raising the number in the
commit that grew the file — so the growth was re-reviewed by two fresh diff reviewers and a
read-as-a-product pass, the duplicates that review found were cut, the counts were taken after that,
and the numbers moved in a separate commit with the reason written beside them. The objection is on
the record there too, because it is a fair one: the always-loaded surface grew by about a third in a
single pass, and a tighten pass afterwards recovered little of it. The next addition to `SKILL.md`
displaces something; it does not get another raise.

## v2.5.0 — verify the product, not only the diff

An external audit of v2.4.0 arrived from two directions and reached the same verdict from both: the
skeleton is right, and the centre of gravity is wrong. Everything this skill did well validated
*execution* — a plan, gates, a fresh reviewer, triage, closure arithmetic. Almost nothing validated
*specification*. The expensive failure in agent-assisted work is not an unreviewed five-line fix; it is
a justified, reviewed, green implementation of the wrong thing, and every mechanism here pointed away
from it.

**Acceptance now has two halves.** A command whose exit code decides success, as before — and, whenever
a person will click, type or call the thing being built, the observable outcome: what they should be
able to do afterwards, written so someone who has not read the code can go and do it. An exit code says
the assertions the author wrote hold. It cannot say the job can be done. Plans that are all first half
are how a change ships green and useless, and the second half is what `build.md`'s behavior check drives.

**The behavior check stopped being overhead and became part of closing.** It existed in v2.4.0, at
section twelve of thirteen in `build.md`, after the round cap, named once on the always-loaded surface
in a list of things that cost extra — and absent from the scripted loop entirely. It now sits beside the
review, on the same green build, and the termination rule names it: a change closes when the confirmed
blocking count is zero, the gates are green, **and** someone who did not write it has driven the path
Accept described. A check that could not be run is not a check that passed.

**Reviewers are now asked about what is likely to be wrong.** Three of the four directed questions were
scope bookkeeping, which aimed the one mechanism that catches defects at the class least likely to hold
them. The list now opens with the inputs the change does not expect, then hostile input where the diff
touches untrusted data or access control, then whether existing tests were weakened — and asks whether
the *plan* is wrong, because a diff that conforms to a wrong plan passes every other question. The order
is part of the rule: a directed question dominates a reviewer's attention and the top of the list gets
most of it.

**Security had no coverage at all, and now has the two cheapest kinds.** A change to who can reach what
is never Direct, whatever its size; the reviewer is asked, in the prompt already being sent, what a
hostile input can make the change do; and where a runtime ships a purpose-built reviewer, `build.md`
says to run it in addition to the review rather than instead of it, with its findings still going
through your triage. What was rejected was a section of advice about being careful, which changes no
outcome and costs tokens on every read.

### The defects, each reproduced before it was fixed

`scripts/phase.js` read `all_pass` for truthiness. A gates agent that returned the string `"false"` —
which is truthy — **closed a red build green**, dispatching a reviewer on a build that had already
failed. It is now an identity test, and every list the script reads goes through a normaliser, because
a schema is a request and what comes back is JSON a model typed.

`scripts/check-workflow-syntax.sh` was wrong in both forbidden directions at once. It passed a script
whose only `export const meta` sat inside a block comment, passed a banned primitive hidden after a `//`
inside a string literal, passed the same primitive split across a line break, passed a bare `new Date`
and a `Date.now` taken as a value — and **rejected a correct script** for naming a primitive inside
prompt text, which is what `phase.js` is mostly made of. It now masks comments and literal text with a
hand-written lexer, and then re-parses the masked copy as an oracle: blanking only the *contents* of a
literal leaves source that still parses, so a masked copy that does not parse proves the mask lost its
place. That oracle immediately caught the lexer reading `return /^…/` as a division and corrupting the
shipped `phase.js` — which had been returning the right verdict by luck.

The `tasks` guard tested truthiness, so an array of task objects stringified to `[object Object]`,
passed, and dispatched a writer whose entire task list was that literal: the run that looks complete and
implemented nothing, which is the sentence in the guard's own rejection message. `acceptCmds: [""]`
satisfied "a phase with no runnable acceptance cannot close".

Triage returned the confirmed findings as text, and whatever it returned became the Fix agent's work
list — an agent with write access and no output schema. Confirmation is now a selection of **numbers**
from the list it was given, so a paraphrase, a merge or an invention is unrepresentable rather than
merely discouraged; a triage that ruled on nothing is an error, and findings nobody ruled on stop the
phase instead of closing it.

**There was a complete path to a false green through test weakening**, on a failure mode the skill names
and forbids in exactly one place: the prompt sent to the only agent with an incentive to do it. A fix
round could remove an assertion, gates would report green, and nothing compared the tally to the round
before. The gates step now reports typed counts and the script does arithmetic on them across rounds; a
suite that shrinks, or starts skipping, or stops being countable at all, raises a finding that goes
through triage like any other — because deleting an obsolete test is legitimate work and a hard failure
would be unusable. Where no round ever reported a tally, the result says the check never ran, rather
than letting a silent absence read as a clean one.

### Breaking, for callers driving the script

**`behaviorCheck` is a required argument**, and `false` is how you declare that nothing this phase
builds is user-visible. Optional was wrong for the same reason a defaulting reviewer count was wrong: a
stage that silently does not run is the defect, and recording the omission in the result is one reader
too late. Passing a description dispatches a fresh agent that drives the path beside the reviewers, at
no wall-clock cost; what it observes that contradicts the plan becomes a finding, and a check that was
asked for and could not be run returns `behavior-unverified` rather than closing.

An explicit `reviewers` count now **wins** over what `depth` implies, instead of being an error. That is
not the defect the old guard was built for — that was an argument silently defaulting — and the case it
exists for is real: the measurement behind "two" was taken on plans, so on a reversible phase's diff the
second reviewer is a choice rather than a result. The override is logged and the result reports both.

### Depth, and the thing the checklist was suppressing

The gate asked how much breaks and how hard it is to undo. Both are questions about the repository, and
a change that is one commit to revert can still be unrecoverable for whoever already consumed it — so
where the change is user-facing there is now a third: who relies on today's behavior, and how would they
find out it changed. The Deep triggers moved out of a table cell and into a checklist, one of them
generalised from "a migration" to any irreversible effect outside this repository, and the trigger list
now says plainly that three of the four can be ticked by reading and the fourth is a judgement. A worked
example follows, because the first and most consequential act in the whole workflow was the only
judgement in the skill with nothing shown: the same feature graded three ways, and the nouns in the
request predicting none of them.

### Anti-bloat binds every prose surface now, not one file

Only `SKILL.md` had a size backstop, so the reference set beside it — eight times larger, and the thing
a Standard change actually loads — was held by nothing. During this very audit it grew by a sixth while
the always-loaded file stayed green. `accept-release.sh` now carries a backstop for every prose file and
one for their total, and prints each count. The objection to raising `SKILL.md`'s own number in the same
pass that grew it is recorded in the gate beside the number, because it is a fair objection and the
answer to it is not obvious: the additions are rules rather than prose, each argued for individually,
and the old number had itself caused a defect — the rewrite that stripped the two-reviewer figures to
fit under it left a paraphrase that misstated them in both directions. Shaving synonyms to land under a
backstop is that same behaviour, and is now named as not being an answer.

### Contradictions the whole-artifact read found

Close's rule that a reader should meet the finished files with no diff and no change context earned its
place again. Reviewing this release as a product rather than as a diff turned up, among others, an
instruction to re-capture `baseSha` after amending that was simply **wrong** — an amend rewrites HEAD,
not HEAD's parent, so the base is untouched and re-capturing it would hand the reviewer an empty diff —
a reference documenting a reviewer prompt the script did not send, a driver snippet using the construct
the comment above it forbade, a claim about `SKILL.md` that a grep falsified at the moment it was
written, and a section telling you to skip the product read on exactly the kind of change that most
needs it. None of those is visible in a diff. All of them are visible to someone reading the result.

### What is still not measured

Nothing here establishes that this skill improves an output. Its mechanisms match what the published
guidance recommends, and the defects above were demonstrated rather than argued — but *does this pay for
itself* still has a well-argued answer and not a measured one. The instrument for it exists and was not
run. Saying so is cheaper than implying otherwise.

## v2.4.0 — the guide gets a way back

Every change this skill runs begins by reading the project guide. Nothing in it has ever said what
happens to the guide afterwards, and the failure that follows is slow enough to be invisible: the guide
keeps being read, keeps being believed, and keeps describing a repository that has moved. Audited
against this repository on 2026-08-11 — one release after the guide was last touched, and eleven days
after the runtime's own memory store was — the split
was total and one-directional — every rule and every trap still verified exactly as written, and every
count and every branch status was wrong, all in the same direction. One note claimed in its own summary
line to describe the current state of the project, and did not.

**`references/maintenance.md` is the pass that closes that loop**, and it is its own task rather than a
step inside another one. Work leaves a journal in `.agent/<task>/journal.md`, beside the plan; the pass
verifies what the guide already claims, promotes what the journals earned into the role that owns it,
and prunes the rest. The order is load-bearing: verifying before promoting is what stops you appending
to a document whose existing claims are already false.

**The two rules the audit actually produced are narrower than "keep your docs current".** Do not write
down a number a command prints — write the command; every stale count found had been recorded by someone
who had just run the thing that prints it. And record the identifier rather than the status: a pull
request number outlives "not merged yet".

**Journals are not the archive this skill deleted, and the difference is stated so it can be checked.**
v1 accumulated a per-task document archive that nobody read, and `close.md` still carries the finding.
An entry here has an entry condition (a trap, a rejected idea, a decision with no other home, a guide
claim the repo contradicted), an explicit prohibition on restating what the commits already say, and a
pass that prunes it. The real difference is **cost on failure**, not a promise that somebody reads it:
a committed, reviewed archive costs attention on every clone and in every review whether it is read or
not, while a journal in a gitignored directory costs nothing if it is never folded — it is simply lost,
which is the right outcome for a note that was not worth promoting. An earlier draft claimed a "defined
consumer" instead, and plan review killed it: the trigger is "someone asks", which is exactly what let
the last archive rot.

**`SKILL.md`'s §2 generalises a rule — it does not buy back the words.** It said an acceptance command
that outlives the task belongs in the repository, and said nothing about anything else that does,
describing a directory that grows monotonically, holds the only copy of everything in it, and had a
no-cleanup rule and no promotion rule. It now names the general case. Being precise about what that
bought: the rewrite costs ten words of its own, so nothing here was displaced and all three edits are
additions. What the generalisation earns is the argument for the addition, not the budget for it.

**The always-loaded `description` gains a clause, and this is the part that was measured.** A routing row
on its own is unreachable text: the description scoped this skill to code changes, so a request to
refresh a project's context never loaded it, and nobody read the table pointing at the new reference.
Nothing in this repository tests the description — the behavioural suite of the day read the body and
followed the routing table — so it was measured directly instead. Fresh agents were given the old description and the
new one independently, with maintenance-shaped requests that never name a guide file, and asked whether
to load the skill. On two of the three phrasings the old description declined every time and the new one
accepted every time; on the third both accepted, the old one reasoning from the contract-file clause. A
typo request was declined under both, so the clause does not widen the skill's scope into changes it
should stay out of.

**What it cannot do is stated in the file.** Nothing fires this pass: a per-change workflow has no clock,
and a cadence asserted here would be a rule with no mechanism behind it. What is real is being asked,
noticing mid-change and recording it rather than detouring, and a recurring job outside the skill —
which is the only arrangement where "periodic" is literally true. Running it at the close of a Deep
change was considered and rejected in writing, so the next reader does not re-propose it: Close runs on
the rarest tier, which makes the interval undefined, and it fires at the moment adjacent work is most
dangerous.

**The rule ships with no test that can fail on it, and that is stated rather than implied.** No
discriminating fixture is possible — a model asked directly whether a lesson belongs in the project guide
answers correctly without this skill, as three of the five demoted fixtures in the behavioural suite recorded before it was deleted —
and there is no script here for an execution harness to drive. The gates that do apply still apply: the
new reference is swept for statistics, for retired claims and for v1 vocabulary along with the rest of
the package, and it is now named in the check that every reference prescribes a per-task plan path.

**The behavioural suite is deleted, and the test layer is rebuilt from what only agents can answer.**
Eleven fixtures ran every question with the skill loaded and withheld, at 23 agents a run, and returned
one bit: one fixture discriminated. Four could not fail by construction — one of them tested whether a
question gets asked, and a fixture's whole form is asking it. Two restated invariants `sim-phase.js`
already proves by execution. It had not been run in the fourteen commits before it went, and it was not
in CI, because CI cannot spawn agents.

Keeping it green cost more than running it ever did. A claim about its fixture tally had propagated to
eight sites, and a recomputation check, two exemption markers and a cross-file sweep existed to hold
those eight in agreement — most of a day's work this week, spent on a sentence describing a suite nobody
ran. All of that goes with it, along with `sim-scenarios.js` and a third of `accept-release.sh`.

`tests/probe.js` replaces the one question worth 23 agents: **does a rule change what a model does, or
does the model already do it?** It poses a situation to fresh agents that never saw the skill and hands
back the answers for a person to score. It is an instrument, not a gate — nothing asserts it stays green
and it is deliberately out of CI, which the file says rather than leaves to be discovered.

What it does *not* replace is stated in the same breath: with a control arm only, nothing here detects
the skill making a capable model **worse** — a rule that pushes it away from a correct default. That is
what the deleted guards were for, and the class is now uncovered. Saying so is cheaper than a suite that
was not run.

**The invariant harness had holes, and the audit that found them is now part of it.** `sim-phase.js`
printed that every invariant held while a fifth of an 88-mutation audit of `phase.js` survived it: a
phase could close green with zero reviewers dispatched, a no-op fix round after an advancing round
stopped being caught, the closed phase could hand the next one a sha only the implementer ever attested,
and four of six agent roles had no death path asserted. Ten invariants close those, and the ten
mutations that motivated them are now in `negative-test.sh`, so deleting an invariant shows up as a
survivor rather than as a smaller number nobody reads.

Adding them paid immediately: one mutation survived on arrival, because the invariant written for it
asserted only that a field was truthy and the mutation pins that field to a truthy constant. A
hand-verified assertion with no mutation behind it was already wrong, and only the mutation found it.

**The harnesses print rates now, not counts.** "All N invariants hold" is a number that only goes up;
it is what the harness printed on the day a fifth of the audit walked past it. `sim-phase` now says how
many invariants it asserts and that this is not a measure of what would be caught; `negative-test` prints
killed/tried and names its denominator's limit — it counts the defects someone thought to inject.

**Repository housekeeping, found while verifying the guide.** `CLAUDE.md` described the fixture suite as
it stood before four fixtures were added, said the acceptance script runs two execution harnesses when it
runs three plus the experiment analyser, and enumerated four Chinese counterpart files when there are
five. The fixture figure was corrected everywhere it described the suite and left alone
everywhere it records a dated measurement — those are two different claims that share a phrasing, and the
gate guards the second one. `CLAUDE.md` also now names `references/orchestration.md`, which had been
added without ever appearing there, and records that adding or removing one file in the package is a
several-place edit across the acceptance script and the release workflow — which keeps its own copy and
fails later than everything else. The guide states that without carrying a count, which is the same rule.

## v2.3.0 — the common path gets lighter, and three limits get named

An adversarial critic read the shipped package — `SKILL.md`, the references, `phase.js` — and asked what
the skill *enforces* rather than what it says. Most of its structural verdict is declined below. Four of
its numbered findings were true of the package, and are fixed here, along with the activation gap it
names but does not number.

**`references/build.md` is no longer the file every change loads in full.** It is the largest reference
in the package, and `SKILL.md`'s routing sent every Standard change to all of it — including a worktree how-to
and the whole `phase.js` argument manual, which are read only by someone running concurrent writers or
driving the loop as a script. Both now live in `references/orchestration.md`, and `build.md` keeps the
loop. The rule a single-writer reader actually needs — phases share one working tree, a branch name is
not isolation — stays in `build.md` and points at the how-to from there, so the worktree guidance is
reachable from the common path rather than only from a Workflow-mode routing row.

**Triage rejections have somewhere to live.** `build.md` said to record them "briefly" and never said
where, so in practice they lived in the turn's output and were gone at the next compaction — after which
the same phantom finding returns to a reviewer with nothing to contradict it. Running by hand, the record
goes in the task's `.agent/<task>/` directory beside the plan; `scripts/phase.js` carries it in the phase
result. Stated so it is followable on both paths, not only on the one that has a return value.

**The gates step's `all_pass` is named as what it is.** `phase.js` cross-checks the sha an agent reports,
and the reference documents that it does. `all_pass` sits beside it, is also agent-reported, and nothing
downstream contradicts it — a gates agent that reports green on a red build is believed. That asymmetry
was undocumented, which is the failure this project has already shipped twice: a limit that reads as a
guarantee. `orchestration.md` now states it, and says what to do instead when it matters more than the
orchestration does. The script's own comment carried the narrower fact that the gates agent judges
nothing; it did not carry this one, and no reader of the reference could have found it.

**The Deep checklist loses its one non-checklist item.** "A decision with no clear winner that the
repository cannot answer" is satisfiable by almost any design-shaped task, three lines under a rule that
calls the list "a checklist, not a vibe". It now binds to the depth gate's own second question:
alternatives that commit to different structures, where choosing wrong means redoing the work rather than
editing it. A cheap-to-reverse open decision still escalates under §5 — it just no longer drags the whole
change to Deep.

**A skill that loads mid-edit can recover.** §1 said to choose depth "first, before reading anything
else" and had nothing to say about arriving after the editing had started, which is how skills routinely
activate. Capture the base from the last commit before your edits, grade the change now, write the plan
from what you have, and say that you started first.

**Two preconditions the loop did not enforce.** `scripts/phase.js` took a non-array `acceptCmds` — a
string, a length-bearing object, `null` — past its own emptiness check and died at `.map is not a
function` once the write agent had already run and committed, reporting a stack trace three steps from
the cause. All three are now a `usage-error` raised before any agent is dispatched, with a message that
names the shape rather than sending the caller after an argument they did supply. Separately,
`build.md` never said to commit before the *first* review, although its Fix step had ordered exactly
that for every later round: the reviewer reads `git diff <baseSha>..HEAD`, and work still sitting in the
working tree makes that range empty, which is indistinguishable from a clean review. The rule now closes
the Write step, and the trailer instruction says where gate output goes once the work is already
committed.

Room for the two additions came out of `SKILL.md`'s two-reviewer justification, which
`references/plan.md` already carries in more detail *and with its limits*. That is the anti-bloat norm
working as designed — rules on the always-loaded surface, the measurement behind them in the reference —
and it leaves the always-loaded word backstop a backstop rather than a budget that has been spent.

**Declined, and why.** Plan review on Standard doubles the cost of the common path with no measurement
behind it. One reviewer inside Deep would relax a rule on a preference, and the measurement that could
justify it — reviewer yield on diffs rather than on design documents — has not been run. A different loop
for document-shaped Deep changes was already answered by the round-cap experiment: the cap is not what
fails, scope growth in the fix step is. The rest are covered where they already sit, and repeating them
on the always-loaded surface would spend words to duplicate a pointer.

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
real script with stub agents, and `scripts/negative-test.sh` breaks the two scripts twenty-four ways and
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
four minutes; in the second, `phase.js` could not complete a fix round at all, because it built its Fix
and Triage prompts from a branch name and a sha and **never a path**, so an agent whose working
directory was not the repository under test had nothing to locate it with. That is the usage
`build.md` documents — an installed skill driving your own checkout — so the documented path was
broken. **Fixed rather than filed:** `phase.js` now takes `repoPath`, all six of its prompts carry it,
and an unusable value is a `usage-error` instead of something interpolated into a prompt. A third attempt, at adjudication, was voided for asking agents
to echo a thousand-character key. Two of the three were the experimenter's; the second is a defect in
the shipped script, and is reported as one. Every breach of blinding traced to something left
reachable rather than to an agent circumventing a control — but an agent did read the key.

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
