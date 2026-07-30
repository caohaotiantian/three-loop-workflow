# Pre-registration — does a Deep change to a document-shaped artifact converge within three fix rounds?

**Written and committed 2026-07-30, before any data existed.** The commit that adds this file adds no
results.

**Where this file lives during the runs.** It is committed to a branch — `exp/preregistration` — that is
**not checked out** while the replicates run. The reviewers under measurement are dispatched with the
parent repository as their initial working directory, so a file in that working tree is one `grep -r`
away from them; a file that exists only in a commit on an unchecked-out branch is not. The working tree
during every replicate is exactly the pre-registration's parent commit, which contains neither this
document nor `scripts/exp-seed.py`. Both are materialised into a scratch directory outside the
repository to be run. The commit's sha and date are the record that this was written first; the results
document cites them.

The scratch clones are built from that same parent commit, with every other branch deleted and the
object store pruned, and `git cat-file -e <this-commit-sha>` is asserted to **fail** inside each clone
before a single agent runs. Asserted per replicate by `scripts/exp-clone.sh`, not once.

This project has already had a published result flip under re-analysis because a denominator changed
after the fact. Everything that could be chosen after seeing the data — every denominator, every
threshold, every matching rule, and the action bound to each outcome — is fixed here.

---

## 1. Question and hypothesis

**Question.** Does a Deep change to a document-shaped artifact reach zero confirmed blocking findings
within three fix rounds?

**H0 (the shipped rule is right).** A Deep change to a document-shaped artifact reaches zero confirmed
blocking findings within 3 review fix rounds.

**H1.** It converges, but takes more than 3 rounds.

**H2.** It does not converge by review at all — the confirmed-blocking count does not reach zero within
6 rounds.

**H3 (a different diagnosis, not a different cap).** The confirmed-blocking count does not fall
monotonically; a different item fails each round. Under H3 the cap is firing on a planning defect and
raising it would not help.

H0–H2 are mutually exclusive. H3 can hold alongside any of them and is evaluated separately.

### What is already settled and is not being asked

**v2.0.0's four fix rounds broke the cap.** They ran inside a single review phase against a cap that is
three *per phase*: `docs/measurements/2026-07-30-round-data/promote-v2-release-plan.md:124` defines P5
as one phase — "Two independent reviewers on the full diff, union, triage before counting. Accept:
confirmed blocking count = 0" — and all four rounds ran inside it. The escalation happened, but a fourth
round ran, and `references/build.md` says the cap "never becomes a quiet round four". This is recorded
as evidence for the experiment, not as a question for it, and the results document states it as settled
with that citation.

---

## 2. The two existing observations

Neither was designed as a measurement. Both are this repository reviewing itself. Counts read from
commit bodies, which are the only record kept:

| Change | Confirmed blocking, by round | Rounds | Outcome |
|---|---|---|---|
| v2.0.0 | 8 → 12 → 8 → 7 | 4 | never reached zero; shipped by escalation |
| v2.2.0 | 9 → 6 → 4 | 3 | hit the cap; 10 of 19 confirmed findings were defects in the gates that change itself added |

Sources: `0f15b22` ("triage confirmed 20, of which 8 were blocking"), `14d4ce9`, `e4abaf1`, `b13c100`
for v2.0.0; `9630fd9`, `f141045`, `00c53b4` for v2.2.0.

Both are **right-censored**: the run stopped when the budget ran out, not when the process converged.
That censoring is the reason "never reached zero" is the strongest statement anyone can make about them,
and it is the specific defect this experiment is designed to remove.

---

## 3. Design

### 3.1 The instrument must be able to exceed the value under test

`three-loop-workflow/scripts/phase.js` defaults `maxRounds = 3` and halts at `fixes >= maxRounds`. Every
run under the shipped setting is right-censored at 3, so a convergence point above 3 is unobservable by
construction.

**The measurement arm therefore runs `maxRounds: 6`.** This is a deliberate deviation from the shipped
setting, and it is the *only* axis on which the arm deviates.

> **Read nothing in this experiment as evidence about the shipped harness's behaviour.** The shipped
> harness stops at 3. Every figure produced here comes from a harness allowed to run to 6.

Termination is confirmed-blocking zero, or the 6-round ceiling, recorded as `censored: true`.

**No median is reported.** With n = 3 and right-censoring at 6, a median is not identifiable. Only
counts are reported: reached zero within 3, within 6, never.

### 3.2 Fix the material, vary only the agents

Rounds-to-zero is mostly a function of how defective the first draft is. A self-invented task per
replicate would measure the drafting agent, not the cap.

- **Material:** `three-loop-workflow/references/build.md`, at the parent of this pre-registration
  commit, seeded with the defect list in §4.
- **Replicates:** **n = 3**, byte-identical material, independent agents, independent clones. What
  varies is the agents, so the spread is process variance.
- If fewer than 3 complete, the completed runs are reported as **individual observations**, never
  averaged, and the shortfall is stated in the results document.
- **Reviewers see the cumulative `git diff <phaseBase>..<branch>`,** which is what `phase.js` does.
  Per-round diffs are not hand-rolled; that would make the counts a different quantity.
- **`acceptCmds` is real:** `['bash scripts/accept-release.sh']`, run inside the scratch clone.

### 3.3 The gate must be red before replicate 1

A gate that is green on a seeded document is decorative and the run is void.

Measured in a throwaway clone before this document was written:

| Probe | `accept-release.sh` |
|---|---|
| invented `%` statistic in `build.md` | **`ACCEPT: 1 check(s) FAILED`** — the statistics sweep, named |
| mixed-denominator bare count | green |
| stale path `scripts/verify-plan.sh` | green |

So **exactly one seed (S1) is gate-detectable by design.** That is deliberate: the gate must be able to
fail, but gate-driven and review-driven fix rounds share one budget, and a gate that caught five seeds
would spend the budget under test on gate rounds. `phase.js` reports `gateFixes` and `reviewFixes`
separately, which is what makes the two separable rather than confounded.

The gate's redness is re-asserted per replicate, on the seeded tree, before the phase is dispatched.
A replicate whose gate is green at seed time is **void** and is reported as void.

### 3.4 Blinding

The seed list in §4 is committed here and must not reach the reviewers. Each clone is built by
`scripts/exp-clone.sh` with `git clone --no-hardlinks`, checked out at this commit's **parent**, every
other branch deleted, `git reflog expire --expire=now --all`, `git gc --prune=now`, and then
`git cat-file -e <this-commit-sha>` asserted to **fail** inside the clone. A clone where it succeeds is
not used.

The seeded commit's message describes the change the way a real one would and names no defect.

---

## 4. The seeds — pre-registered, committed before any data exists

Six defects, one per class this repository has actually shipped (see `0f15b22`, `14d4ce9`, `f141045`,
`00c53b4`). Applied by `scripts/exp-seed.py`, which fails loudly if any anchor text is not found
verbatim — a seeding script that silently no-ops would produce a clean document and a green run.

| ID | Class | Where | The defect |
|---|---|---|---|
| **S1** | Invented statistic | Review | Claims the second reviewer "adds 47% more confirmed findings than the first" on diffs. No such measurement exists — `why-v2.md` Part 6 explicitly records that the diff case was never measured. Gate-detectable. |
| **S2** | A claim the code does not support | Workflow mode | Claims `phase.js` "resolves the reported value in the repository" and stops on a fabricated sha. `phase.js:236-242` says the opposite in its own comment, and a Workflow script has no shell. |
| **S3** | Cross-file contradiction | Review | Says each reviewer gets the diff, the plan, **and the implementer's low-confidence list**. `SKILL.md` §4 says "the diff and the plan — and **nothing else**"; `phase.js:328-332` withholds it deliberately. |
| **S4** | Stale path | Diagnosis | Directs the reader to `scripts/verify-plan.sh`, which exists nowhere in the repository. |
| **S5** | Rule stated in the opposite sense | Fix | "Fix every reported blocking finding, then triage." Inverts the same file's Triage section and `SKILL.md` §4's "Triage before you fix, and before you count". |
| **S6** | Figure on a mixed denominator | Round cap | "Ten of the twenty-one confirmed findings in the last release…". 19 is the confirmed-finding count (`CHANGELOG.md`); 21 is `negative-test.sh`'s mutation count. Numerator and denominator come from different populations. |

Exact replacement text is in `scripts/exp-seed.py`, which is the executable form of this table.

### Three of the nine edits are correct

A diff in which every changed hunk is defective is a different — and much easier — detection task than a
real change, where most edited lines are fine and the reviewer has to discriminate. The seeded commit
therefore also carries three edits that are **true** against the shipped script and the rest of the
skill, and that trace to the plan's Goal:

| ID | Where | The edit |
|---|---|---|
| **C1** | Gates | Record which commands you actually ran, not the ones the project guide lists. |
| **C2** | Round cap | Count rounds in which a fix was spent, not gate re-runs — verifying once more than you fixed is correct. |
| **C3** | Write | A phase that ends with uncommitted work has not ended; the review diffs ref-to-ref. |

**A reviewer that reports C1, C2 or C3 as a defect is reporting a phantom**, and that is a measurement,
not a nuisance — it is exactly the quantity triage exists to remove. Confirmed findings that match a
correct edit are counted and reported.

**Seeds are not the only findings that count.** Reviewers will report defects that are not seeds — some
real, some phantom. Termination runs on *all* confirmed blocking findings, which is what the shipped
harness does. Seed recall is a secondary measure, reported separately, and is never substituted for the
primary.

---

## 5. Analysis plan — every denominator and threshold fixed here

### 5.1 Primary

**Review fix rounds to confirmed-blocking zero**, per replicate, from `phase.js`'s returned object:

- `closed` → converged; the count is `reviewFixes`.
- `cap-exhausted` → **`censored: true`**; the count is recorded as `>6`, never as 6.
- `agent-error` / `usage-error` / `plan-conflict` → the replicate is **void**, reported as void with its
  reason, and not counted as either convergence or censoring.

Reported as three counts over the replicates: **reached zero within 3**, **within 6**, **never**.
Total `fixes` and `gateFixes` are reported alongside, because the budget is shared.

### 5.2 Secondary

- **Per-round confirmed-blocking series**, reconstructed from the Workflow journal by
  `scripts/exp-extract.mjs` from the round-stamped agent labels `review:<phase>:r<N>:v<K>` and
  `triage:<phase>:r<N>`. The extractor **fails loudly** on an unexpected journal shape rather than
  reporting zeros.
- **Monotonicity.** The series is monotonic iff it is non-increasing across consecutive review rounds.
  **Threshold: H3 fires if the series is non-monotonic in ≥ 2 of 3 replicates.**
- **Seed recall** = (distinct seeds matched by ≥ 1 confirmed finding in any round) / **6**.
- **Triage rejection rate** = `rejected` / `reported_union`, per round, where `reported_union` is the
  exact-string union `phase.js` hands to triage. Exact-string union is the shipped behaviour and is
  inherited, not chosen.
- **Adjudication survival** = (confirmed findings upheld by ≥ 2 of 3 blind adjudicators) / (all
  triage-confirmed findings), pooled across replicates, and reported per replicate.

### 5.3 Matching rules

- **Reviewer-to-reviewer duplicates:** `phase.js` dedupes by exact string equality before triage. That
  is what the shipped harness does and it is inherited unchanged. Near-duplicates therefore both reach
  triage and both count — stated as a known property, not corrected after the fact.
- **Finding-to-seed:** blind adjudicators assign each confirmed finding to **at most one** seed ID or to
  `NONE`. **Threshold: ≥ 2 of 3 adjudicators must agree on the same seed ID; otherwise `NONE`.**
- **Finding-to-finding (Q2 arm only):** two findings from different reviewers are the same defect iff
  **≥ 2 of 3** adjudicators say so; otherwise distinct.

### 5.4 Adjudication

Blind and adversarial, and deliberately **not** `phase.js`'s `triage:` agent — that is one agent, it
sees the diff, and it is what drove termination. This is a check *on* it.

- Attribution stripped: no replicate, no round, no reviewer index, no triage verdict.
- Order shuffled by a **deterministic index permutation** (`i * 7 + 3 mod n`). `Math.random()` throws in
  a Workflow script and is forbidden by this repository's norms regardless.
- Three adjudicators per finding, each instructed to **refute**, defaulting to **"not a defect"** when
  torn.
- Adjudication does **not** re-drive termination. The runs already happened. It reports how much of what
  stopped them was real.

### 5.5 Computed, never asserted

`scripts/exp-analyse.mjs` recomputes every figure the results documents publish from the committed raw
data, prints the §6 verdict, and **exits non-zero** if any published figure disagrees or if the raw data
is internally inconsistent. Its own failing cases are written and watched to fail before it is trusted.
No figure in the results documents is an agent's summary.

---

## 6. Decision rule — the actions, bound before the data exists

Evaluated in this order. More than one may fire; each is applied independently unless a higher row says
otherwise.

| # | Condition (thresholds fixed) | Action |
|---|---|---|
| **R1** | **3 of 3** replicates `closed` with `reviewFixes ≤ 3` | **The cap is right. Change nothing.** The results document states that the two seed observations reflect their plans rather than the rule, and says so in the CHANGELOG. |
| **R2** | **≥ 2 of 3** replicates `closed` with `reviewFixes ≤ 6`, and **≥ 1** of those needed `reviewFixes > 3` | **Raise the cap** in `SKILL.md` §4 and `references/build.md` "Round cap" to `max(reviewFixes)` over the closed replicates — the *smallest* value covering the observed runs, not a round number. |
| **R3** | **≥ 2 of 3** replicates `censored: true` at 6 | **Document-shaped Deep work does not terminate by convergence.** `references/escalation.md`'s round-cap section becomes the primary exit and says so; the cap value stays. R3 supersedes R2. |
| **R4** | Series non-monotonic in **≥ 2 of 3** replicates | **The diagnosis is a planning defect, not a cap defect.** `escalation.md`'s "a *different* item failed each round" guidance is what changes. R4 blocks R2: a cap is not raised on a run whose count is not falling. |
| **R5** | A large share of confirmed findings are defects in checks the change itself added | **Belongs in `SKILL.md`'s depth guidance** as a qualitative rule about self-modifying changes. **This arm cannot be tested by this experiment** — the seeded material adds no checks. It is decided on the single recorded v2.2.0 observation (10 of 19), and any text it produces must say that it rests on one unplanned observation. |

**No action is taken that is not in this table.** If the data is ambiguous under every row, the recorded
outcome is "no rule change, and here is what would settle it".

### What falsifies each hypothesis

- **H0 is falsified** by any replicate that closes with `reviewFixes > 3`, or is censored.
- **H1 is falsified** if every replicate closes within 3 (H0 holds), or if ≥ 2 are censored (H2 holds).
- **H2 is falsified** by ≥ 2 of 3 replicates closing within 6.
- **H3 is falsified** if the confirmed-blocking series is non-increasing in ≥ 2 of 3 replicates.
- **The whole run is void** — and reported void, not quietly repaired — if the gate is green on the
  seeded tree, if a clone is found to contain this commit, or if this repository's tracked tree is
  modified during a replicate.

---

## 7. The second question, and the condition for attempting it

Whether a third independent reviewer adds materially less than the second is **still open**. `SKILL.md`
§4 currently rests on a cost decision, which is honest, and leaving it there is an acceptable outcome.

`phase.js` **cannot** measure it: line 367 unions findings into a `Set` of strings, destroying
per-reviewer attribution, and the returned object never exposes raw per-reviewer output.

**Pre-committed condition.** The Q2 arm is attempted **only if** all three primary replicates return a
verdict and none was voided by a harness defect. If attempted, it runs as `scripts/exp-review.js`:
`phase.js`'s review prompt **verbatim**, k = 3 reviewers dispatched in parallel on the round-1 seeded
diff only, returning `{round, reviewer_index, findings: [...]}` untouched — no dedupe, no union — with
each round's raw JSON persisted before analysis.

Raising the *primary* arm to `reviewers: 3` was considered and rejected: three reviewers is not the
shipped Deep width, so rounds-to-zero would then be measured under a second, confounded deviation.

**If the condition is not met, the question is cut, and the results document says it was cut and why.**

---

## 8. Limitations, fixed in advance rather than discovered afterwards

Named here so that no result can later be presented as stronger than the design allows.

1. **Defect density is a design parameter, and this one is dense.** Six defects in nine edited hunks of
   one file. A real Deep change carries an unknown number of defects of unknown classes spread over a
   much larger diff. This design can show that convergence *is possible* in k rounds on a document of
   this density; **it cannot show that a real change converges in k.** A fast convergence here is
   therefore weak evidence for the cap and a slow one is strong evidence against it — the asymmetry runs
   against the product, which is the right direction for it to run.
2. **The classes are known to be findable.** Every seed is drawn from a class this repository has
   already shipped and then caught. Nothing here measures a defect class review is blind to.
3. **n = 3, one document, one model, one day.** Process variance is estimated from three runs. No
   confidence interval is computed and none should be inferred.
4. **The agents' initial working directory is the parent repository.** Blinding rests on the
   pre-registration and the seed script being absent from that working tree (§ header) and absent from
   the clone (§3.4). It does **not** rest on a mechanism that would stop a reviewer that went looking
   through `git log --all` in the parent repository. Stated as a residual risk, not claimed closed.
5. **`maxRounds: 6` is not the shipped setting.** Repeated because it is the limitation most likely to
   be dropped when a figure is quoted elsewhere.
6. **The gate contributes at most one fix round, but it contributes it to a shared budget.** Reported as
   `gateFixes` and subtracted from the primary, which is `reviewFixes`.

## 9. Commitments about reporting

- **Raw artifacts are committed.** Raw findings, per-round counts, adjudicator verdicts, the analysis
  script. If it is not committed, it did not happen — this project has three unreproducible measurements
  already, and `docs/measurements/2026-07-30-round-data/` exists because of it.
- **A result that undercuts the product is published as prominently as one that supports it.** The
  v2.0.0 release did exactly that and it is the most credible thing in the repository.
- **The `maxRounds: 6` deviation is stated wherever a figure from this experiment appears**, in the
  document's own voice, not in a footnote.
