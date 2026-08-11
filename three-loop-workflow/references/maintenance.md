# Maintenance

The project guide is read at the start of every change and rewritten almost never. Left alone it drifts — a command that was renamed, a count that moved, a file that was split in two, a branch described as unmerged that merged weeks ago. The drift is invisible from inside a change, because the guide is what a reader consults *instead* of checking.

This pass closes the loop the rest of the skill leaves open: work leaves notes, the notes are folded into the guide, and what does not survive folding is dropped.

**It is its own task, never a step inside another one.** Grade it with the depth gate like anything else — correcting a stale number is Direct; changing a rule in a file the guide lists under _load-bearing-docs_ is Deep, by the same test `SKILL.md` §1 applies to everything else. Folding the guide in the middle of a feature is the same mistake as adding a harness in the middle of a fix round: a second change inside the first, arriving unreviewed (`build.md`, Fix).

## The journal — `.agent/<task>/journal.md`

Beside the plan, in the task's own directory. Written while the work happens, not reconstructed afterwards.

Write an entry when — and only when — one of these is true:

- Something cost you real time that a note would have saved: a platform quirk, a tool that reports success while doing nothing, a documented command whose behavior is not its behavior.
- An idea was raised and deliberately **not** done, so nobody re-proposes it without new information.
- The guide claimed something the repo contradicted. Record it and keep going; do not detour to fix it.
- Something was settled that has no other home. Anything that changes the Goal, a Decision or Accept goes in `plan.md`, and anything tactical goes in the commit body (`escalation.md`, "Record the answer") — this is for what belongs to neither, because it is not about this diff at all.

An entry is a few lines: what happened, and the rule that generalises from it. "Test things" generalises nothing. "A patch that no longer applies must count as a failure, not a skip" is the level that pays.

**Do not journal what you did.** The commits and the PR describe the change. A record that restates them is exhaust, and the archive it accumulates into is read by nobody — this skill deleted one for exactly that reason (`close.md`, "What Close does not do").

**What makes this different is its cost when nobody folds it, not a promise that somebody will.** A committed, reviewed archive costs attention on every clone and in every review whether it is read or not; that is what made the last one worth deleting. A journal in a gitignored directory costs nothing if it is never folded — it is simply lost, which is the correct outcome for a note that was not worth promoting. What keeps it that way is the entry condition above and the prohibition beside it. A journal that grows past those is the archive again, wearing a different name.

Nothing backs the directory up, and it does not travel: run this pass in a fresh clone and you read an empty journal, which is indistinguishable from a clean project. Fold on the machine the work happened on.

All of that rests on `.agent/` being in the repository's `.gitignore`, which the skill asserts everywhere and establishes nowhere. Check it once per repo. If it is not ignored, the journal is committed, every reviewer reads it alongside the diff, and the argument above inverts: it becomes the archive this skill deleted, at full price.

## The pass

Three steps, in this order. Verifying before promoting keeps you from appending to a document whose existing claims are already false.

**1. Verify what the guide already claims.** Take every checkable claim — commands, counts, paths, versions, "X is current", "Y is not merged yet" — and check it by running or reading it, not by recognising it. A claim that was true when written is the ordinary case and the one that reads most convincingly; recognition is the failure mode, because you are re-reading prose you already believe.

Expect the damage to fall unevenly, because it does: **rules and traps age well, state and counts age badly.** A trap someone hit a month ago is still there. A number is stale as soon as anything moves, and it will usually have been written by someone who had just run the command that prints it. Two rules follow, and they are the ones worth taking away from this file:

- **Do not write down a number a command prints. Write the command.**
- **Record the identifier, not the status** — a pull request number outlives "not merged yet".

**2. Promote what the journals earned.** An entry belongs in the guide when a future agent would do the wrong thing without it: a norm, a trap, a command, a decision now settled. It does not belong there when it is a fact about the code (the code says it better), a record of what happened (the commit says it better), or a rule a capable model already follows.

Put each promoted item under the role it belongs to, per the guide's anchor map — a norm under _engineering-norms_, a command under _common-commands_, a file that became a contract under _load-bearing-docs_. If an item belongs to no role, that is a signal about the item. Adding a role obliges every file that reads roles to change with it, so it is a decision to escalate, not a naming choice.

**3. Prune.** Delete the entries that were promoted, and the ones that turned out not to matter. Correct or delete guide text that step 1 falsified — a wrong claim is worse than a missing one, because the missing one sends the reader to the repo and the wrong one stops them looking.

Prune *notes*. The task's directory and its `plan.md` stay where they are (`close.md`, "Clean up"). Pruning has no undo, which is the design; nothing here is the only copy of anything that mattered, because step 2 ran first.

### A third target, if your runtime has one

Some runtimes keep a persistent store of their own — notes carried between sessions, outside the repository. Where one exists it drifts hardest, because it is loaded before every task and checked by nothing, so run all three steps over it as well: verify, promote what belongs in the repository instead, prune the rest. Prefer the store that has a gate — a fact the repository already holds true by construction should not be copied into one that holds nothing.

Whether a given runtime keeps such a store changes between releases; `platforms.md` says to look rather than to assume.

## What this pass does not do

It does not produce a report. The output is a corrected guide and a shorter journal; a document describing the pass is one more thing to keep true.

It does not touch the historical record — dated audits, released changelog entries, frozen archives. Those record what was true when they were written, and correcting them retroactively destroys the only evidence of what was believed at the time. Add a dated note beside the claim instead.

It does not run at the close of a change. That was considered and rejected: Close runs on Deep changes only, so the interval would be undefined, and it would fire at the point in the loop where the budget is most spent and adjacent work is most dangerous.

**The boundary with Close is where the change stops.** `close.md` §5 reconciles what *this change* made stale — a command it renamed, a norm it changed — and scopes that tightly on purpose. This pass is for the drift no single change caused: the claim that was true when it was written, the count that moved while nobody was editing the sentence around it. *Did my change break this line?* is Close. *Is this document still true?* is here.

Nor does `scripts/phase.js` run it. The script drives one phase of one change, so it would fire several times inside a single change, which is neither periodic nor cheap — and a Workflow script has `agent()`, `parallel()`, `phase()` and `log()` and no shell (`orchestration.md`), so it cannot inspect a directory to decide whether the pass is due.

## The limit, stated

**Nothing here fires this pass.** A per-change workflow has no clock, and a cadence this file asserted would be a rule with no mechanism behind it — the failure this skill exists to avoid, not to commit. What is real:

- **You are asked.** The user's own cadence supplies the period.
- **You notice.** The guide is already open at the start of every change, so spotting a claim the repo contradicts costs nothing. Record it in the journal and finish the change you are on.
- **Something outside the skill schedules it.** A recurring job or a scheduled session can run this pass on a real interval. That lives in your harness's configuration, not in this skill, and it is the only arrangement in which "periodic" is literally true.
