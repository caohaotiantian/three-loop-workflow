# Rescued per-round review records — 2026-07-30

Verbatim copies of the task records this project produced under its own Plan → Build → Close cycle.
They were written to `.agent/<task>/`, which is **gitignored**, so until this commit they existed on
exactly one disk. Their sibling `.agent/promote-v2-release/accept.sh` — the script cited as the `Gates:`
evidence of six release commits — was deleted during a cleanup before anyone thought to keep it, and is
gone for good. Its successor `scripts/accept-release.sh` is tracked and carries most of its checks, so
little was lost, but the pattern is the point: this repository has now recorded three measurements it
cannot reproduce because the artifacts were never committed.

These are **copies, not moves**. The originals stay at `.agent/`, where the skill expects working state
to live. Nothing here is edited — not for terminology, not for accuracy. Two of the three contain
claims their own authors later corrected, and the corrections live in the commit history and in
`CHANGELOG.md`, not in these files. Read them as records of what was believed when written.

## Contents

| File | Source | What it is |
|---|---|---|
| `promote-v2-release-plan.md` | `.agent/promote-v2-release/plan.md` | The v2.0.0 release plan. Its P5 is the single review phase inside which all four v2.0.0 fix rounds ran. |
| `harden-audit-findings-plan.md` | `.agent/harden-audit-findings/plan.md` | The v2.2.0 plan, and the only per-round review log this project has ever kept: rounds, reported, confirmed, rejected, each with its reason. |
| `close-remaining-plan.md` | `.agent/close-remaining/plan.md` | The v2.2.0 follow-up increment — end-to-end run, external claims, suite quality, record-closing. |
| `close-remaining-e2e-plan.md` | `.agent/close-remaining/e2e-plan.md` | The throwaway plan used to drive `phase.js` end-to-end through the real Workflow tool. |
| `close-remaining-baseSha.txt` | `.agent/close-remaining/baseSha` | The base commit that increment was reviewed against. |

## Where the round counts live

The per-round confirmed-blocking counts are in commit bodies, not in these plans — the v2.0.0 task kept
no round log at all, which is why its counts must be read out of history:

- **v2.0.0**, four rounds inside one review phase: `0f15b22` (round 1 — "triage confirmed 20, of which 8
  were blocking"), `14d4ce9` (round 2), `e4abaf1` (round 3), `b13c100` (round 4).
- **v2.2.0**, three rounds across five phases: `9630fd9` (round 1), `f141045` (round 2), `00c53b4`
  (round 3).

Neither run was designed as a measurement. Both are observations of this repository reviewing itself,
and both are analysed in `docs/2026-07-30-round-cap-experiment.md`, alongside a designed replication.
