# Raw artifacts — round-cap experiment, 2026-07-30/31

Everything the results document rests on. Committed because this project has three measurements it
cannot reproduce, and `docs/measurements/2026-07-30-round-data/` exists as the record of that habit.

**Nothing here is a summary.** `scripts/exp-analyse.mjs` recomputes every published figure from these
files and exits non-zero if a document disagrees with it, so the documents cannot drift from the data
without the release gate failing.

## What each file is

| File | What it is |
|---|---|
| `verdicts.json` | What `three-loop-workflow/scripts/phase.js` returned for each replicate, verbatim. The authoritative status, fix counts and gate/review split. |
| `series.json` | The per-round series, reconstructed from the Workflow journal by `scripts/exp-extract.mjs`. Reviewer counts, the exact-string union handed to triage, what triage confirmed and rejected, and the head sha each round's reviewers actually saw. |
| `exp-rep<N>.bundle` | A git bundle of `<base>..exp-rep<N>` — every commit each replicate produced. `git fetch <bundle> 'refs/heads/*:refs/heads/*'` restores the exact material, including the seeded starting state and every fix. |
| `exp-rep<N>.commits.tsv` | sha, ISO timestamp, subject for each commit, so the shape of a run is readable without restoring it. |
| `exp-rep<N>.final.diff` | The whole change as it stood when the phase returned. |
| `exp-rep<N>.runlog.json` | Agent count, token total, tool-call count, and `phase.js`'s own round-by-round log lines. |
| `adjudication.json` | Blind adversarial re-judging of every triage-confirmed finding: three adjudicators each, instructed to refute, defaulting to "not a defect". `upheld` requires ≥2 of 3 declining to refute. |
| `seed-match.json` | Which pre-registered edit each confirmed finding refers to, by ≥2-of-3 majority, or `null`. |
| `<branch>.uncommitted.*` | Present only where a round left work uncommitted — the state `phase.js`'s no-op-fix guard exists to catch. |

## Proving the pre-registration came first

`../preregistration.bundle` holds the original commit, with its author date. It was committed to a
branch that was deliberately **not checked out** while the replicates ran — every agent under
measurement starts with this repository as its working directory, so a seed list in that working tree
would have been one `grep -r` away from the reviewers, and on the first attempt exactly that happened.
The branch was then deleted and its object pruned, which is why the commit is not reachable from any ref
here and has to be restored from the bundle:

```bash
git clone --bare docs/measurements/2026-07-30-round-cap/preregistration.bundle /tmp/prereg
git -C /tmp/prereg log -1 --format='%H %cI %s' 543dae1
```

`../preregistration.provenance.txt` records the same sha and date. The file committed at that sha and
the one beside it here are the same document; the bundle is what makes "written before any data
existed" checkable rather than asserted. That commit also carries `scripts/exp-clone.sh`, the
out-of-tree clone builder the first design used — it is preserved there and deliberately **not**
shipped in `scripts/`, because the design it belongs to does not work (see void 2 in the results
document).

## Reproducing a replicate

```bash
git fetch docs/measurements/2026-07-30-round-cap/raw/exp-rep1.bundle 'refs/heads/*:refs/heads/exp-*'
git diff 244c20a..exp-rep1                    # the change as reviewed
git log  244c20a..exp-rep1                    # the rounds, in order
```

The seeded starting state is the **first** commit in each bundle. `scripts/exp-seed.py` regenerates it
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
