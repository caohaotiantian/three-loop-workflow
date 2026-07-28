# v2 — staged rewrite

A ground-up rebuild of the three-loop-workflow skill, staged here so `three-loop-workflow/` (v1.14.0) stays untouched until you decide.

## Why

The v1 discipline was sound. Its delivery was not.

| | v1.14.0 | v2 |
|---|---|---|
| Always-loaded `SKILL.md` | 2,915 words (~5,557 tok) | **1,107 words (~1,851 tok)** |
| Total prose | 21,802 words | **5,092 words** |
| Files | 20 | 10 |
| Prohibition tokens | 137 | 31 |
| Committed docs per task | 2 (design + impl) | 0 (ephemeral `.agent/plan.md`) |

v1's `SKILL.md` sat 5 words under its own 2,920-word ceiling, while its consistency gate *required* ten tokens to be physically present in that same file. One mechanism pushed content in; the other punished it for being there. That ratchet is why fourteen releases of trimming never shrank it, and why this is a rebuild rather than an edit.

## What changed, and on what evidence

**Loops renamed to what they are: Plan → Build → Close.** L1 and L2 were one plan artificially cut in two; merging them deletes the slug protocol, the rollback protocol, the Deprecated-section convention, and one whole review loop.

**Depth is now graded on blast radius and reversibility**, with a checklist for the deep tier instead of "when in doubt → Full" stated twice. v1's gate was a disjunction of qualitative predicates with no size term, so routine work landed on the expensive branch.

**Gates run before reviewers, always.** v1 mentioned typecheck/lint exactly once, in a parenthetical. An agent's opinion about code that does not compile is worthless, and the compiler is free.

**Two reviewers on deep work, one on standard — measured, not assumed.** Four real design documents × three independent reviewers: reviewer 1 alone found 54% of the defects the three found between them; a second took coverage to 86% and surfaced a blocking defect in *every* document that the first missed. Only 19% of defects were found by all three; 51% by exactly one. A third added 14%.

This measurement **reversed** the plan. Anthropic's Opus 5 guidance ("remove verification instructions", "do not use subagents to verify your own work") and superpowers' 5×5 A/B both pointed at deleting the confirming round. The data said keep it — the boundary is that *self*-verification is dead while *independent* review is not, and reviewer recall is only ~55%.

**Then the coverage result was itself validated.** All 116 findings were blinded, shuffled, and re-judged by two independent adversarial adjudicators per document, instructed to refute and to default to FALSE when torn. Restricted to defects that survived, and averaged over every reviewer ordering rather than one arbitrary "reviewer 1":

| | reported | validated |
|---|---|---|
| 1 reviewer | 54% | **56.5%** |
| 2 reviewers | 86% | **85.5%** |

The rule holds. But validation exposed what the first analysis missed: **reviewer precision is poor.** Only 50–70% of findings graded *blocking* were real, and 30–46% of the rest. Adjudicators agreed 84% of the time.

That is why v2 has a **Triage** step. Closure computes on *confirmed* findings, never the raw report — otherwise a phantom defect burns a fix round and can exhaust the cap on code that was already correct. The bug was live in `phase.js` until this measurement found it.

**Deletions justified by primary sources:** the 5-voter panel and its anti-inflation clause (Anthropic: a review prompt told to "be conservative" will "report less"); the separate accept subagent (forbidden from judging, and its report declared insufficient by the next rule); the committed per-task doc archive (43,822 words, read by nobody); `check-consistency.sh`.

`check-consistency.sh` was deleted after being tested: replacing v1's central termination rule with its exact semantic opposite, leaving the token in an HTML comment, still returned `three-loop-consistency: OK`, exit 0.

## Layout

```
three-loop-workflow/
  SKILL.md                  always loaded; depth gate first, so it survives compaction
  references/plan.md        the plan artifact, facts-vs-decisions, spikes, plan review
  references/build.md       write → gates → review → fix, diagnosis, flakes, round cap
  references/close.md       deep-tier closeout: orphans, blast radius, migrations
  references/escalation.md  when and how to ask; deadlock reports
  references/platforms.md   runtimes, degradation, and the optional hooks
  scripts/phase.js          the Build loop as deterministic code
  hooks/require-plan.sh     no contract edit without a plan (enforcement, not request)
  hooks/validate-commit-msg.sh
tests/
  run-scenarios.js          two-arm runner: skill-on vs skill-off
  scenarios/s01..s06.md     opaque fixtures
  expected.json             answers, held outside the fixtures
```

## What the test suite actually shows

7 fixtures, each run with the skill loaded and with it withheld. Four runs, three rounds of rewriting. Final: `suite_pass: true` — **6/6 guards held, 1/1 discriminating fixture VALID**. Read that narrowly; the ratio is the story.

**The skill degrades nothing.** It did not inflate depth on a local rename, did not turn reviewer union into intersection, did not let a friendly "pass" override `blocking_count: 1`, did not ask the user for a value the repo already settles, and did not add reviewers on blast-radius anxiety. For a rule-heavy skill that is the failure mode that matters most, and it is clean.

**Only one fixture discriminates: s04.** The control arm upgraded a whole four-file change to the deepest tier because one corner touched a production-write path — defending it with "a change is only as safe as its riskiest part". The skill arm ran Standard and escalated the corner. That is a real rule doing real work.

The uncomfortable finding is the other five. They were written to test the reviewer count, the union rule, closure-from-counts, and facts-vs-decisions — and a competent engineer with no skill at all got every one right. **Under Opus 5, most of this discipline is redundant with the model's own judgment.** What survives is the specific and counter-intuitive: an exact reviewer count, a tie-break between defensible tiers, "one risky corner does not upgrade the whole change".

s02 and s07 were written as discriminating, failed, and were demoted to guards. The demotion is recorded in `expected.json` rather than quietly relabelled, because tuning a fixture's category until the suite goes green is the exact dishonesty this suite exists to prevent.

## Known-incomplete

- **`close.md` is unmeasured.** Carried over from v1's F phase on argument, not evidence. The least-tested part of this rewrite.
- **The two-reviewer result was measured on design documents, not diffs.** Applying it to diffs is an inference; gates already remove a class of defect before a reviewer sees the code, so marginal value there is probably lower.
- **The E2 experiment never observed a clean first review.** All 12 reviews found something, so "a clean round-1 is weak evidence" is inferred from the ~55% detection rate, not directly measured.
- **One live discriminator.** The suite proves the skill is harmless and proves one rule load-bearing. It does not test the rest.
- **Nothing here has been run on a real task.** Every number is from controlled experiments, not from shipping a feature with v2.
