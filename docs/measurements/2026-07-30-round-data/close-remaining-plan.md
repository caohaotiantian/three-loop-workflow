# Plan — close the remaining deferred items

**Depth: Deep.** Edits rules in `SKILL.md`, `references/*` and `scripts/*` (all _load-bearing-docs_).
baseSha: see `.agent/close-remaining/baseSha`. Branch: `fix/audit-hardening` (continues).

## Goal

Close every item on the standing "unfinished / deferred" list, or convert it into a recorded decision
with its reason — so that nothing remains merely *omitted*. Where an item cannot be settled from here,
say so with what would settle it.

## Non-goals

- **No retro-editing of dated records.** Unchanged from the previous plan.
- **No new measurement of E2.** The data is unreproducible; the claim that rests on it gets made honest,
  not re-derived.
- **Not deleting `.agent/promote-v2-release/`.** It is another task's durable record and `close.md` says
  leave it. Its hazard is raised for the owner instead.
- **Not pushing, tagging or opening a PR.** Outside my authority (`escalation.md`, row 6).

## Decisions

**D1. Run `phase.js` under the real Workflow tool, in a throwaway repo outside this one.**
problem: every claim about `phase.js` rests on stubbed harnesses; it has never been executed by the
runtime it is written for → options: (a) leave it unverified and say so; (b) run it end-to-end on a
scratch repo; (c) run it on this repo → choice: **(b)** → why: (a) leaves the largest assumption in the
project untested when a test is available. (c) would let write and fix agents commit in the real
repository. A throwaway repo with absolute paths gets the evidence with the blast radius contained.
This also answers whether a `scriptPath` outside the repo resolves at all.

**D2. Verify the external claims, or mark them unverified.** `platforms.md`'s runtime paths, the
agentskills.io conformance claim, the `AGENTS.md` governance attribution, and the frontmatter fields have
never been checked. `plan.md`'s own rule is that a claim about external behavior carries its source.

**D3. Items that are correctly left as-is become recorded decisions, not omissions.** Non-blocking triage
inside `phase.js`, gate output in trailers, the single fix budget, and the fixture→kind map are all
defensible as they stand — but "we decided this" and "we never got to it" are different states, and only
the first is safe to inherit.

## Accept

```bash
bash scripts/accept-release.sh
```
plus, per phase below.

## Phases

**P1 — End-to-end.** Run `phase.js` through the Workflow tool on a scratch repo, both a clean-close path
and a fix-round path. Accept: the run returns `status: 'closed'` with a real `headSha`, the scratch repo
contains the commits, and this repository's working tree is untouched.

**P2 — External claims.** Verify or qualify each. Accept: every external claim in the shipped skill is
either sourced or marked unverified in the text.

**P3 — Suite quality.** Two-arm fixtures for the two prose rules P5 added; repair the giveaway flag.
Accept: `sim-scenarios.js` green; the new fixtures run in both arms.

**P4 — Close the record.** `escalation.md` gains the gates-vs-review cap distinction; the "a third mostly
repeats" claim made honest; the four as-is items recorded as decisions. Accept: `accept-release.sh` green.

## Rollback

`git reset --hard` to the recorded baseSha; nothing outside the branch and `.agent/close-remaining/`.

## Record

**P1 — End-to-end. Closed, and it found the defect that explains everything.**
`phase.js` had never run because it *could not*. The Workflow tool delivers `args` as a JSON string;
the script destructured it as an object, so every invocation returned `usage-error: planPath is
required` with a complete argument list. Settled by a probe script (`typeofArgs: "string"`,
`parsesToObject: {ok:true}`), not by inference. `run-scenarios.js` had it silently — the documented
`args: {repo}` fell back to the default tree without a word. Both normalise now; mutations M18/S5 pin it.
After the fix: one Standard phase driven from an absolute path outside the repo returned `closed`,
round 1, 0 fixes, real chainable head, real gate output, three substantive non-blocking findings, and
concerns returned to the caller rather than sent to the reviewer. An installed-skill `scriptPath`
resolves. Run `wf_933f56e6-e81`; the throwaway branch was deleted afterwards and this repository's
tracked tree was untouched.

**P2 — External claims. Closed; all four true, now sourced in `platforms.md`.**
Codex scans `.agents/skills` from cwd to repo root plus `$HOME/.agents/skills`; opencode reads six
locations including both `.claude/skills/` and `.agents/skills/`; the Agent Skills spec requires
`name`/`description` and allows `license`/`compatibility`/`metadata`, and this skill's frontmatter is
within every limit (description 474/1024, compatibility 99/500, `name` equals its directory); AGENTS.md
was released by OpenAI in Aug 2025 and contributed to the Linux Foundation's AAIF at formation.

**P3 — Suite quality. Closed, with an uncomfortable result.**
Two fixtures added; **both are guards**. s09 was written as discriminating and failed twice — first as a
fixture defect (the text named the deciding fact and both arms quoted it), then, rewritten, on the merits
with no giveaway at all. The rule is not counter-intuitive to a model asked the question directly. That
does not retire the rule; the evidence for it was that four rounds of diff review never asked. Demoted
with dated reasoning. **The suite still has exactly one discriminating fixture.**
The giveaway flag was repaired — it required a boolean both arms leave false while filling the quote
beside it — and immediately flagged five fixtures where the old one flagged none.

**P4 — Close the record. Closed.** `escalation.md` distinguishes a cap spent on gates from one spent on
review; "a third mostly repeats the second" retired as a coverage claim and restated as a cost decision
(its acceptance check repointed and negative-tested); three limitations in `build.md` recorded as
decisions; CI actions pinned to commit SHAs.

## What remains, and it is now a short list

- **Not pushed, no PR, no tag.** Outside my authority; the owner's call.
- **`.agent/promote-v2-release/` still on disk** — a bypassable acceptance script and a stale plan, both
  unreferenced. Another task's record, so left; worth deleting by hand.
- **Two questions nobody can settle from here**: whether v2.0.0's four rounds broke the cap or reset per
  phase, and whether three rounds suits document-shaped work. Both need a designed experiment, not an
  argument.
- **The E2 data remains unreproducible.** The claim resting on it is now stated as a cost decision, which
  is the honest form, but the underlying artifacts are gone for good.
