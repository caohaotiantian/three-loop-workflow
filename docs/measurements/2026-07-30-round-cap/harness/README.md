# The harness that drove the round-cap runs

Fourteen scripts, archived here rather than kept in `scripts/`.

They ran once. `CLAUDE.md` makes `scripts/**` load-bearing — "the acceptance gate and its harnesses" —
so leaving one-shot code there would make every future touch of it a Deep change for no benefit, and
would quietly claim these are part of the gate. They are not. The one that *is* stayed behind:
`scripts/exp-analyse.mjs`, which `accept-release.sh` runs on every invocation.

**Read them as a record of what ran, not as a toolkit.** Two of them (`exp-next.sh`, `exp-assemble.sh`)
still name the private working directory the runs used, so this is not a turnkey re-run. Their internal
comments say `scripts/exp-*` because that is where they lived when they executed; the paths were correct
then and are left as written for the same reason the pre-registration is.

| Script | What it did |
|---|---|
| `exp-seed.py` | Applied the nine pre-registered edits to `references/build.md`, refusing to run if any anchor no longer matched. |
| `exp-setup.sh` | Built one replicate: branch, gate green before seeding, gate red after, plan written, blinding asserted. |
| `exp-next.sh`, `exp-teardown.sh`, `exp-restore.sh` | Handoff between replicates; bundling; restoring branches from bundles for adjudication. |
| `exp-clone.sh` | *Not here* — the out-of-tree clone builder of the abandoned first design, preserved in `../preregistration.bundle`. It does not work; see void 2 in the results document. |
| `exp-round-cap.js` | The Workflow driver that dispatched the real `phase.js` per replicate. Did no counting or scoring. |
| `exp-review.js` | The Q2 arm: k reviewers on one fixed diff, findings kept unmerged. |
| `exp-adjudicate.js`, `exp-embed.py` | Blind adversarial re-judging and seed matching; the embedder inlines the payload because a Workflow script has no filesystem. |
| `exp-extract.mjs` | Reconstructed the per-round series from the Workflow journal, failing loudly on an unexpected shape. |
| `exp-groups.mjs`, `exp-join.mjs` | Built the adjudication input and joined its verdicts back onto canonical finding ids. |
| `exp-q2-analyse.mjs` | Coverage by reviewer count, averaged over every ordering. |
| `exp-assemble.sh` | Moved the whole experiment out of the private working area into this repository. |
