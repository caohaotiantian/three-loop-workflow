# Does a Deep change to a document-shaped artifact converge within three fix rounds?

*Pre-registered 2026-07-30 before any data existed; run 2026-07-30 to 2026-07-31. The raw artifacts and
the analysis script are committed beside this document.*

*`scripts/exp-analyse.mjs` recomputes the figures below from those artifacts and exits non-zero if a
document disagrees. Read what that does and does not buy you: it holds the **multi-digit** figures —
each must appear in both languages, the same number of times — and it asserts the per-round series
against what `phase.js` returned. For the **single-digit** counts it can only check that the digit
appears somewhere, which almost no prose can fail. Those are the counts in "Results", and they are the
ones you should verify against `raw/verdicts.json` yourself rather than trust a green gate for. This
paragraph exists because an earlier draft claimed the script checked "every figure", and a Close
reviewer showed that five published figures could be corrupted at once with the gate still green.*

> **This experiment ran with the fix-round cap set to 6, not the shipped 3.** `scripts/phase.js` halts
> at `fixes >= maxRounds`, so under the shipped setting every run is right-censored at three and a
> convergence point above three cannot be observed at all — which is precisely why "it never reached
> zero" was the strongest thing anyone could say about the two runs that prompted this. **Nothing here
> is evidence about how the shipped harness behaves.**

## The answer

**Mostly no — and the cap is not what was wrong.**

Three replicates ran against byte-identical material. **2 never reached zero** even with six rounds
available; **1 reached zero within 3**, and it did so in a single review fix round. No replicate was
void.

But the seeded defects were not what consumed the rounds. Every replicate found and repaired them in
its **first** review round. What consumed the rest was the change **growing**: the fix step invented new
checks for the rules it had just repaired, and each following round reviewed the new checks instead of
the change.

The correspondence is exact across all three runs:

| Replicate | Confirmed findings on the document being fixed | On machinery the change itself added | Elsewhere | Outcome |
|---|---|---|---|---|
| 1 | 9 | **17** | 2 | never reached zero |
| 2 | 10 | **0** | 0 | **reached zero, 1 review fix round** |
| 3 | 10 | **18** | 1 | never reached zero |
| **All three** | **29** | **35** | 3 | 67 confirmed |

The one replicate whose fix step added nothing converged immediately. The two that built machinery never
converged. Raising the cap would have bought more rounds of the same thing.

## What the pre-committed decision rule mandates

Written before any data existed, in `docs/measurements/2026-07-30-round-cap/preregistration.md` §6, and
evaluated by script rather than by argument:

- **R3 fires** — 2 of 3 replicates censored. `references/escalation.md`'s round-cap section becomes the
  primary exit for document-shaped Deep work, and says so. **The cap value stays at three.**
- **R4 fires** — the confirmed-blocking count was non-monotonic in 2 of 3 replicates. The diagnosis is a
  planning defect, not a cap defect. R4 explicitly **blocks** raising the cap.
- **R2 (raise the cap) is both superseded by R3 and blocked by R4.** It does not fire.
- **R1 (change nothing) does not fire.**

So the change this experiment mandates is to `references/escalation.md`, and **the cap is not touched**.

**R5 fired on its pre-registered terms and was deliberately not extended.** The pre-registration
assigned R5 — qualitative depth guidance about self-modifying changes — to the single recorded v2.2.0
observation, and said this experiment could not test it, because the seeded material adds no checks.
That turned out to be true of the material and false of what happened: the *fix step* added checks, and
35 of the 67 confirmed findings landed on them. Acting on that would mean treating an unplanned
analysis as a pre-registered one. It is reported as exploratory, `SKILL.md` is untouched, and the
follow-up that would settle it is named at the end.

**One pre-registered method detail was not followed, and the substitute is stated here rather than by
editing a dated document.** §5.2 says the per-round series is keyed off round-stamped agent labels. The
Workflow journal carries no labels at all — it records `{agentId, type, result}`. `scripts/exp-extract.mjs`
therefore classifies each agent by the opening text of the prompt `phase.js` built for it, and segments
rounds on the gates agent, which runs exactly once per verify trip. Same quantity, different mechanism,
and the reconstruction is asserted against what `phase.js` returned — fix counts, the gate/review split,
and the final confirmed count must all agree, or the analysis exits non-zero.

**`build.md` was also edited, and not because the experiment mandated it.** No pre-registered row
authorises it, and the distinction is worth keeping sharp: the table above says what the *data forced*.
Putting the same rule into `build.md`'s Fix and Gates steps is an ordinary product judgment, made
because `escalation.md` is read once you are already deadlocked while `build.md` is read by the person
about to spawn the gate — a rule placed after the damage is worth much less than the same rule placed
before it. Recorded here as a decision rather than smuggled in as a result.

## What was already settled, and is not re-opened

**v2.0.0's four fix rounds broke the cap.**
`docs/measurements/2026-07-30-round-data/promote-v2-release-plan.md:124` defines P5 as a *single* review
phase — "Two independent reviewers on the full diff, union, triage before counting. Accept: confirmed
blocking count = 0" — and all four rounds ran inside it, against a cap that is three *per phase*. The
escalation happened, but a fourth round ran, and `references/build.md` says the cap "never becomes a
quiet round four". Settled, with that citation. It was evidence for this experiment, not a question for
it.

## The two observations that prompted this

Neither was designed. Both are this repository reviewing itself; the counts come from commit bodies,
which are the only record that was kept.

| Change | Confirmed blocking, by round | Outcome |
|---|---|---|
| v2.0.0 | 8 → 12 → 8 → 7 | never reached zero; shipped by escalation |
| v2.2.0 | 9 → 6 → 4 | hit the cap; 10 of 19 confirmed findings were defects in the gates that change itself added |

Both are **right-censored** — they stopped when the budget ran out, not when the process converged.
Removing that censoring is what this experiment was built to do.

## Design

**Fixed material, varying agents.** Rounds-to-zero is mostly a function of how defective the first draft
is, so a self-invented task per replicate would measure the drafting agent rather than the cap. Every
replicate ran against a byte-identical seeded copy of `three-loop-workflow/references/build.md`
(`md5 6eaf071fc58643d056a5e21d1f075b83`), on its own branch off the same base, at `depth: 'deep'` — two
independent reviewers, unioned, triage before counting — with the real acceptance command
`bash scripts/accept-release.sh`.

**Nine edits, six defective and three correct.** One defect per class this repository has actually
shipped and then caught: an invented statistic, a claim the code does not support, a cross-file
contradiction, a stale path, a rule stated in the opposite sense, and a figure on a mixed denominator.
Three of the nine are **true**, because a diff in which every changed hunk is wrong is a much easier
detection task than a real change. A reviewer reporting one of those three is reporting a phantom, and
that is a measurement rather than a nuisance.

**The gate could fail, and did.** Asserted per replicate in both directions: green on the unseeded tree,
red on the seeded one, failing on exactly the statistics sweep the invented-statistic seed targets.
Exactly one of the six seeds is detectable by any mechanical check — which is this repository's own
thesis reproduced incidentally, and which is why the other five had to be found by review.

## Results

| | Status | Fixes (gate + review) | Confirmed-blocking, by review round | Monotonic? |
|---|---|---|---|---|
| **Replicate 1** | `cap-exhausted` (censored) | 6 = 1 + 5 | 9 → 3 → 5 → 3 → 5 → 3 | no |
| **Replicate 2** | `closed` | 2 = 1 + 1 | 10 → 0 | yes |
| **Replicate 3** | `cap-exhausted` (censored) | 6 = 1 + 5 | 10 → 5 → 4 → 5 → 2 → 3 | no |

Counts, as pre-registered — **no median is reported**, because with n = 3 and right-censoring at six it
is not identifiable:

- reached zero **within 3** review fix rounds: **1**
- reached zero **within 6**: **1**
- **never** reached zero: **2**
- void: **0**

One gate fix round was spent in every replicate — the seeded statistic is the one defect the gate can
see — and gate and review rounds share one budget. So the observable ceiling for *review* fix rounds was
five, not six.

Across all three runs: **74** findings reported (the exact-string union `phase.js` hands to triage),
**67** confirmed, **7** rejected.

## What actually consumed the rounds

Replicate 2's fix step touched one file and added ten lines. Replicates 1 and 3 both reached for a new
gate, and both then spent every remaining round failing to make it work.

Replicate 1's is the sharper case. It wrote a **grep intended to tell a true claim from a false one** —
a pattern that would catch "the script detects a fabricated sha" while allowing the true sentences a
writer is entitled to make about the same subject. Thirteen consecutive fix commits record the attempt:

> *the fabricated-sha sweep was defeated by an adjective* · *…by a bullet list* · *a fronted subordinate
> clause let a foreign negator mask the claim* · *…rejected true statements of its own limit*

That is `check-consistency.sh` — the gate this project deleted in v2.0.0 for being bypassable —
re-invented from scratch inside the repository whose `CLAUDE.md` states the rule being broken: *to check
a **rule**, run it; grep only for **prose**, which is the one thing whose presence is the property you
want.*

A six-defect edit to one file ended as five files and several hundred inserted lines. The last reviewers
were still finding real defects in it, and they were right to.

## What survived blind adversarial adjudication

Termination is driven by `phase.js`'s single `triage:` agent, which sees the diff and is one agent. So
every confirmed finding was re-judged afterwards by **three** adjudicators, each given the finding text
and the diff it was raised against — stripped of replicate, round, reviewer and triage verdict, in a
deterministically shuffled order — and each instructed to **refute**, defaulting to "not a defect" when
torn. A finding is upheld only if at least two of three decline to refute.

**49 of the 67 confirmed findings were upheld; 18 were refuted.**

Read that against triage's own rejection rate, which was **7** out of 74 reported. The single triager
rejected a small fraction; the refute-first panel rejected roughly a quarter more of what it passed.
That is not a contradiction — the panel is deliberately biased against the finding, and the pre-committed
rule ("default to *not a defect* when torn") means it rejects things a careful reader might keep. But it
does say the confirmed counts that stopped these runs are an upper bound, and that the direction of the
error is toward over-counting.

**Every replicate found the same five seeds.** S2 through S6 were reported and confirmed in all three
runs. **S1 appears in none of them, and should not** — the invented statistic was the one seed the gate
detects, so it was repaired in round 1 before any reviewer saw the diff. Review's recall of the seeds it
could see was complete, and identical across three independent runs.

**No reviewer ever reported one of the three correct edits as a defect** — not once, in any replicate.
The bait was there and nothing took it.

## The second question: does a third reviewer add less than the second?

Attempted, and it **does not answer the question** — for a reason worth publishing.

The pre-registered condition was met, so the arm ran: `phase.js`'s review prompt verbatim, three
reviewers in parallel on the round-1 seeded diff, three trials, per-reviewer findings kept unmerged with
no dedupe and no union. Coverage is the share of the six seeded defects a set of reviewers found between
them, averaged over **every** ordering of the three — the correction the original E2 analysis had to
apply afterwards, done up front here because it costs nothing.

**Every reviewer found all six seeds, in every trial.** Coverage is complete at one reviewer, so the
second and third add exactly nothing, and the marginal gain is zero at both steps. That is a statement
about the material, not about reviewers: with a ceiling at k = 1 the arm cannot discriminate reviewer
counts at all.

The methodological result is the useful part. Measuring what a second or third reviewer buys requires
defects a single reviewer *misses* — which is what the original E2 material had and this design lacks.
Seeding known, findable defect classes makes a clean convergence experiment and a useless coverage
experiment, and the two cannot share a corpus.

One trial is excluded: a reviewer was lost to an API error, and two reviewers cannot produce a k = 3
point. Recorded rather than averaged over.

**`SKILL.md` §4 therefore still rests on a cost decision, unchanged.** Nothing here either supports or
undermines stopping at two.

The one piece of contrary evidence is in the main arm, not this one: of the six round-2 reviewers across
the three replicates, five matched seed S6 and one did not, while all six matched each of the other
seeds. A single reviewer missed a real defect and its partner caught it — which is the whole case for
the second reviewer, observed once.

## Three things this does not show

**Triage precision here is not the historical figure.** The rejection rate was low. Seeded material is
almost entirely real defects, and the reviewers rarely took the three correct edits as bait, so precision
had little opportunity to be poor. This does **not** refute the 50–70% blocking-precision figure in
`why-v2.md`; it measures a different population, and the honest reading is that the two are not
comparable.

**The scope growth is an interaction with this repository's norms.** `build.md` says that adding a gate
requires writing its failing case first. The fix agents obeyed. In a repository without that norm, a
documentation fix would not spawn a test harness, and these rounds would look different.

**Defect density is a design parameter, and this one is dense.** Six defects in nine edited hunks of one
file. A real Deep change carries an unknown number of defects of unknown classes across a much larger
diff. Fast convergence here would have been weak evidence *for* the cap; slow convergence is stronger
evidence against it. The asymmetry runs against the product, which is the right direction for it to run.

## The measurement's own failures

Two attempts were voided before any data was collected, and one experimenter error happened mid-run. All
three are published because a result whose method is only reported when it worked is not a result.

**Void 1 — the blinding failed on the first run, exactly where the pre-registration said it might.**
Limitation #4 of the pre-registration said the design "does not rest on a mechanism that would stop a
reviewer that went looking through `git log --all` in the parent repository". Within four minutes, a fix
agent ran `git log --all`, then `git show --stat` and `git diff` against the pre-registration commit, and
read the seed list. Remedied by moving that commit into a bundle outside the repository, deleting its
branch, expiring the reflog and pruning the object — after which `git cat-file -e` fails — and by moving
the voided transcript out of `~/.claude/` so a later replicate could not grep its way into the run that
had read the key. Re-asserted before every replicate, not once.

**Void 2 — `phase.js` cannot complete a fix round against a repository that is not the agents' working
directory.** With the key gone, the replicate reached round 1's gate failure and died on phase.js's own
no-op-fix guard: `the last fix round committed nothing — HEAD is unchanged`. The guard fired correctly;
the cause is upstream, and it is reported as a finding below.

**Void 3 — an adjudication key no agent could copy.** The first adjudication pass returned verdicts for
16 of the 67 confirmed findings. `exp-analyse.mjs` refused to compute a survival rate from it, which is
the guard doing its job. The cause was that the group builder handed each adjudicator the *canonical*
finding id — replicate, round, and the entire finding text — as the key to echo back, and findings here
run past a thousand characters. A handle an agent has to copy must be short enough to copy. Repaired
with short handles and an explicit id map, and re-run; the partial attempt is kept as
`adjudication-firstattempt-void.json` rather than deleted, because a partial result quietly discarded is
how a denominator gets chosen after the fact.

**Experimenter error — I re-imported the answer key mid-run.** While replicate 2 was running I ran
`git bundle unbundle` on replicate 1's bundle to read its commit list. `unbundle` writes objects into the
repository, and replicate 1's fix-commit subjects name the seeds. They were unreachable and invisible to
`git log --all`, but present. Rather than prune during a live run — which races against agents writing
commits — the exposure was made **detectable**: replicate 2's transcripts were audited for `fsck`,
`lost-found` and `unbundle` before its data was used. None appeared, so the replicate stands. The
objects were pruned once it returned. The generalisable form: reading a bundle is not a read-only
operation. And every breach of blinding here traced to something the experimenter left reachable
rather than to an agent circumventing a control — but an agent did read the key, so the design's
protection was never the agents' restraint, and saying it that way round is the only honest form.

## Incidental findings

Neither was looked for.

**1. `phase.js` could not run a fix round out-of-tree — now fixed.** It built its Fix and Triage
prompts from a branch name and a sha and **never a path**, so an agent whose working directory was not
the repository under test had nothing to locate it with. The fix agent searched the filesystem,
committed nothing, and the round was spent. That is the usage `build.md` documents — an installed skill
orchestrating your own checkout — so the documented path was broken. Found by running it, and repaired
here rather than left as a note: `phase.js` takes a `repoPath`, every one of its six prompts carries it,
and an unusable value is a `usage-error` rather than something interpolated into a prompt.

**2. The mutation count was documented three ways and none matched the script.** Surfaced by a reviewer
verifying an adjacent claim. `scripts/negative-test.sh` defines `M1`–`M18` against `phase.js` and
`S1`–`S5` against `run-scenarios.js`. `CLAUDE.md` said "fifteen" in two places; the v2.2.0 CHANGELOG
entry said "twenty-one". Both corrected in this change. The figure in
`docs/measurements/2026-07-30-round-data/` stays as written — it is a rescued dated record of what was
true when written.

## Limitations, as pre-registered

1. **Defect density is a design parameter, and this one is dense** — six defects in nine hunks of one
   file. This can show convergence *is possible* at this density; it cannot show a real change converges.
2. **The classes are known to be findable.** Every seed is drawn from a class this repository has already
   shipped and caught. Nothing here measures a defect class review is blind to.
3. **n = 3, one document, one model, one day.** No confidence interval is computed and none should be
   inferred.
4. **Blinding rests on absence, not on a mechanism.** The pre-registration and seed script were kept out
   of the working tree and out of the clone, and their absence was asserted per replicate — but nothing
   would have stopped a reviewer determined to go looking. Stated as residual risk, not as closed.
5. **`maxRounds: 6` is not the shipped setting.** Repeated because it is the limitation most likely to be
   dropped when a figure is quoted elsewhere.
6. **The gate contributes at most one fix round, to a shared budget.** Reported separately as `gateFixes`
   and excluded from the primary measure.

## What this cannot settle, and what would

- **Whether a real Deep change converges.** This measures a document of known, dense, findable defects.
  Generalising to an ordinary change is an inference, not a result.
- **Whether the scope-growth pattern holds elsewhere.** It needs a repository whose norms do not demand a
  failing case per rule.
- **Whether forbidding the fix step to add machinery would converge.** The obvious follow-up: re-run this
  exact material with that one constraint, and see whether the count reaches zero. If it does, the rule
  in `escalation.md` is worth promoting into `build.md`'s Fix step; if it does not, prose review does not
  converge and the cap is beside the point either way.
