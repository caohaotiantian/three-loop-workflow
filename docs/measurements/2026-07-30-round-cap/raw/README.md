# Raw artifacts — round-cap experiment, 2026-07-30/31

Everything the results document rests on. Committed because this project has three measurements it
cannot reproduce, and `docs/measurements/2026-07-30-round-data/` exists as the record of that habit.

**Nothing here is a summary.** `scripts/exp-analyse.mjs` recomputes the published figures from these
files and exits non-zero if a document disagrees. It holds the multi-digit figures and the agreement
between the two languages; single-digit counts it can only check for presence, which almost no prose
fails. `accept-release.sh` runs it on every invocation.

## What each file is

| File | What it is |
|---|---|
| `verdicts.json`, `rep<N>.verdict.json` | What `three-loop-workflow/scripts/phase.js` returned for each replicate, verbatim — status, fix counts, gate/review split. The merged file is what `exp-analyse.mjs` reads; the per-replicate ones are what it was merged from. |
| `series.json`, `rep<N>.series.json` | The per-round series, reconstructed from the Workflow journal by `../harness/exp-extract.mjs`: reviewer counts, the exact-string union handed to triage, what triage confirmed and rejected, and the head sha each round's reviewers saw. |
| `rep<N>.runlog.json` | Agent count, token total, tool-call count, and `phase.js`'s own round-by-round log lines. |
| `exp-rep<N>.bundle`, `exp-q2.bundle` | Every commit each replicate produced. Restores the exact material, including the seeded starting state and every fix. The whole-change diff is `git diff` from these — it is not stored separately. |
| `exp-rep<N>.commits.tsv`, `exp-q2.commits.tsv` | sha, ISO timestamp, subject per commit, so the shape of a run is readable without restoring it. |
| `adjudication-groups.json` | What the adjudicators were given: findings under short opaque handles, grouped by the diff each was raised against, plus the map back to canonical ids. |
| `adjudication-raw.json` | The adjudicators' returns, untouched, keyed by handle. |
| `adjudication.json` | The same verdicts joined onto canonical finding ids — the file the analysis reads. `upheld` requires ≥2 of 3 declining to refute. |
| `seed-match.json` | Which pre-registered edit each confirmed finding refers to, by ≥2-of-3 majority, or `null`. |
| `adjudication.runlog.json` | Agent count, tokens, tool calls for the adjudication pass. |
| `*-firstattempt-void.json` | The **voided** first adjudication pass, which returned verdicts for 16 of 67 findings because the handles were too long to echo. Kept rather than deleted: a partial result quietly discarded is how a denominator gets chosen after the fact. Not used by any analysis. |
| `q2-observations.json` | The Q2 arm's raw per-reviewer findings — no dedupe, no union. |
| `q2-groups.json`, `q2-match-raw.json`, `q2-seed-match.json` | Seed matching for the Q2 findings, in the same three stages as above. |
| `q2-adjudication.json` | Stage-A refutation verdicts for the Q2 findings. **Collected but unused** — the Q2 analysis needs only the matching. Kept because deleting collected verdicts because they went unused is the shape of selective reporting. |
| `q2-analysis.json`, `q2.runlog.json` | The Q2 coverage curve as computed, and that run's agent/token counts. |
| `<branch>.uncommitted.*` | Present only where a round left work uncommitted — the state `phase.js`'s no-op-fix guard exists to catch. |

## Where the harness lives

`../harness/` holds the fourteen scripts that drove the runs — seeding, setup, the Workflow drivers,
the extractor, the joiners, the adjudication embedder. They are archived with the data rather than kept
in `scripts/`, because they ran once and will not run again, and `CLAUDE.md` makes `scripts/**`
load-bearing: leaving one-shot code there would make every future touch of it a Deep change for no
benefit. The one exception is `scripts/exp-analyse.mjs`, which `accept-release.sh` runs on every
invocation and which therefore genuinely is part of the gate.

## Proving the pre-registration came first

`../preregistration.bundle` holds the original commit, with its author date. It was committed to a
branch that was deliberately **not checked out** while the replicates ran — every agent under
measurement starts with this repository as its working directory, so a seed list in that working tree
would have been one `grep -r` away from the reviewers, and on the first attempt exactly that happened.
The branch was then deleted and its object pruned, which is why the commit is not reachable from any ref
here and has to be restored from the bundle:

```bash
git fetch docs/measurements/2026-07-30-round-cap/preregistration.bundle \
  'refs/heads/exp/preregistration:refs/heads/prereg'
git log -1 --format='%H %cI %s' prereg
```

It is a *thin* bundle — one commit, with `244c20a` as its prerequisite — so it is fetched into this
repository rather than cloned standalone. Carrying the whole history to preserve one commit cost two
megabytes and bought nothing.

`../preregistration.provenance.txt` records the same sha and date. The file committed at that sha and
the one beside it here are the same document; the bundle is what makes "written before any data
existed" checkable rather than asserted. That commit also carries `scripts/exp-clone.sh`, the
out-of-tree clone builder the first design used — it is preserved there and deliberately **not**
shipped in `scripts/`, because the design it belongs to does not work (see void 2 in the results
document).

## Reproducing a replicate

```bash
git fetch docs/measurements/2026-07-30-round-cap/raw/exp-rep1.bundle 'refs/heads/*:refs/heads/*'
git diff 244c20a..exp-rep1                    # the change as reviewed
git log  244c20a..exp-rep1                    # the rounds, in order
```

The seeded starting state is the **first** commit in each bundle. `../harness/exp-seed.py` regenerates it
from a clean `references/build.md`, and refuses to run if the anchors no longer match.

## What is deliberately not here

- **The agent transcripts.** Tens of megabytes per replicate, and they contain the working directories
  and absolute paths of the machine that ran them. The journal-derived series carries every number the
  analysis uses; the transcripts add narration.
- **The two voided attempts' data.** They produced no convergence measurement — one was voided for a
  blinding failure and one for a harness limitation, both described in the results document. Keeping
  their numbers next to the real ones would invite someone to use them.

## The deviation, again

Every replicate ran with `maxRounds: 6`. The shipped default is **3**. No figure computed from these
files is evidence about how the shipped harness behaves.
