# Incidental findings — defects in the repository, surfaced by the experiment

Not part of the measurement. Recorded here so they are fixed on the working branch rather than lost,
and so the results document can say the experiment found them rather than implying it was looking.

## 1. The mutation count is documented three ways and none of them matches the script

Surfaced by a round-3 reviewer in replicate 1, verifying an adjacent claim. Confirmed by counting the
mutation identifiers in `scripts/negative-test.sh` at `244c20a`:

- `M1`–`M18` → **18** mutations against `three-loop-workflow/scripts/phase.js`
- `S1`–`S5` → **5** mutations against `tests/run-scenarios.js`
- **23 total**

Against that:

| Where | What it says | Correct? |
|---|---|---|
| `CLAUDE.md:49` | "`scripts/negative-test.sh` breaks `phase.js` **fifteen** ways" | No — 18 |
| `CLAUDE.md:99` | "breaks `phase.js` **fifteen** ways and fails if the harness misses one" | No — 18 |
| `CHANGELOG.md:17` | "breaks the two scripts **twenty-one** ways" | No — 23 |

`CLAUDE.md` is under _load-bearing-docs_, and the figure is wrong in both places — the fix-at-the-cited-
line failure this repository has already paid for twice. The v2.2.0 CHANGELOG entry is **unreleased and
untagged**, so correcting it is not retro-editing a dated record; it describes the change now being
made. The count in `docs/measurements/2026-07-30-round-data/harden-audit-findings-plan.md` ("21/21")
**stays as written** — that is a rescued dated record of what was true when it was written, and the
Non-goals forbid editing it.

Worth noting how it happened: the last commits on this branch added two mutations without updating the
prose that counts them, which is the drift `accept-release.sh` recomputes every other published figure
to prevent — and this figure is not among the ones it recomputes.

## Void adjudication attempt — a key an agent could not copy

The first adjudication run produced verdicts for **16 of 67** findings. `exp-analyse.mjs` refused to
compute a survival rate from it — "adjudication covers 16 of 67 confirmed findings — the denominator is
not the pre-registered one" — which is the guard doing exactly its job.

The cause was in `exp-groups.mjs`, not in the adjudicators. It handed each adjudicator the **canonical
finding id** as the key to echo back: `<replicate>::<round>::<the entire finding text>`. Findings here
run well past a thousand characters, so this asked an agent to reproduce a paragraph verbatim as a
dictionary key, and most reasonably did not. **A handle an agent has to copy must be short enough to
copy.**

Repaired by issuing short opaque handles (`F001`…) with an explicit `idmap` back to the canonical id,
and a new `scripts/exp-join.mjs` that fails if any handle is unknown or any finding is unaccounted for.
The first attempt is kept as `adjudication-firstattempt-void.json` rather than deleted; a partial
result quietly discarded is how a denominator gets chosen after the fact.

Worth noting which direction the defect ran: with 16 of 67 joined, the survival rate would have been
computed on the subset whose ids happened to round-trip. There is no reason to think that subset is
representative, and the guard is the only reason it was not published.

## Experimenter error, recorded against myself

While replicate 2 was **already running**, I ran `git bundle unbundle` on replicate 1's bundle to read
its commit list. `unbundle` writes the bundle's objects into the repository. Replicate 1's fix-commit
subjects name the seeds, so for the remainder of replicate 2 those objects sat in the object store —
**unreachable**, invisible to `git log --all`, and reachable only by a deliberate `git fsck
--lost-found` or by knowing a sha.

I did not prune them immediately: `git prune --expire=now` races against agents writing commits, and
voiding replicate 2 by corrupting it is a worse outcome than a low-probability read. Instead the
exposure was made **detectable** — replicate 2's agent transcripts are audited for `fsck`,
`lost-found`, `cat-file` and `unbundle` before its data is used, and the replicate is void if any
appear. Pruned after the replicate returned.

The finding-shaped version of this: reading a bundle is not a read-only operation, and the experiment's
own blinding discipline has now been broken twice by *me* rather than by the agents under measurement.
Both times the remedy was a mechanical assertion rather than an intention.

## 2. `phase.js` cannot run a fix round against a repository outside the agents' working directory

Full account in `.agent/measure-round-cap/plan.md` under "Harness incidents", void 2. Reported as a
finding in the results document, not merely as a reason the first design was abandoned.
