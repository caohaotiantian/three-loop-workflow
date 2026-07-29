# Why we rebuilt three-loop-workflow

*A rewrite that started as a complaint about token cost, turned into a measurement exercise, and ended
by reversing its own plan twice.*

中文版 → [why-v2-cn.md](./why-v2-cn.md)

---

## The complaint

The skill burns tokens too fast.

That was the whole brief. Not "the discipline is wrong" — the discipline had been refined across
fourteen releases and it worked. The problem was that following it had become expensive enough to make
people not want to.

The honest thing to say up front is that **this rewrite did not answer that complaint.** It answered a
nearby question it could actually measure. Every number below about size is *surface* size — how many
words the skill is — not the cost of running a task through it. Nobody has yet run v2 on a real
feature and measured what it costs end to end. That gap is stated here rather than papered over,
because it is the single largest thing this work does not know.

What the measuring *did* find was worse than a token problem, and that is what the rest of this is
about.

---

## Part 1 — What was actually wrong with v1

### The ratchet

v1.14.0's always-loaded `SKILL.md` was **2,915 words**. Its own consistency gate capped it at 2,920.
Five words of headroom, after fourteen releases of deliberate trimming.

The reason it never got smaller is that two mechanisms were pulling in opposite directions. The gate
**required ten specific tokens to be physically present** in `SKILL.md` — `blast-radius`,
`change-orphan`, `clean-first-round`, `two-generation`, `zero severe`, and five more. The same gate
**capped the file's word count**. One mechanism pushed content in; the other punished it for being
there. The ceiling had already been raised once, 2,888 → 2,920, to make room.

That is not a file you can trim. That is a ratchet, and it is why this became a rebuild instead of an
edit.

Around it sat the rest of the package: **21,802 words of prose across 15 Markdown files** — 27,896 words
and 20 files once the five scripts are counted. And beside the product, the exhaust — `docs/design/` and `docs/implementation/`, the
committed per-task archive, at **43,822 words**. One and a half times the size of the thing it
documented, and read by no human. Agents wrote it, agents read it, and it went into every repository
that used the skill.

### The gate was theater

`CLAUDE.md` called `check-consistency.sh` "the authoritative acceptance check." It was 242 lines, 124 of
them substantive, and it had exactly one checking primitive: a shell function `require()` whose entire
body was `grep -qF -- "$token" "$f"`. It was invoked **24 times**. Against that sat **five** checks that
inspected content at all: two byte-identity comparisons of duplicated blocks, one grep for a specific
forbidden string, and two word-count ceilings.

So we tested it. We took `SKILL.md`'s central termination rule and replaced it with its exact semantic
opposite — *"Exit the loop immediately; a confirming round is optional"* — while leaving the required
token present in an HTML comment. Then we ran the gate:

```
three-loop-consistency: OK
EXIT=0
```

The gate could not tell the rule from its inversion. **Presence of a word is not presence of a rule** —
and a gate built almost entirely out of `grep -qF` cannot be anything but a presence check.

### The tests measured nothing

`tests/scenarios/` held 33 behavioral fixtures. It had been green for sixteen releases.

It had never been run against a control. So we ran one: six fixtures, each answered twice — once by an
agent with the skill loaded, once by an agent **hard-forbidden from reading it**. Twelve runs.

| Arm | Result |
|---|---|
| Skill loaded | 6/6 correct |
| Skill withheld | 6/6 correct |
| **Discrimination** | **0/6 — 0%** |

All twelve runs, asked to self-report, volunteered that the scenario text had stated the governing rule
before asking the question. Nine of nine files inspected had the same defect. Some filenames were
answer keys on their own — a fixture named `quickly-add-is-full.md` does not need to be opened.

A suite that cannot fail when the behavior is wrong is worse than no suite, because it reads as
coverage that does not exist. This one had been reporting coverage it never had, for sixteen releases,
while the gate that "checked" it only verified the *files existed*.

---

## Part 2 — The measurement that reversed the plan

### What we intended to delete

v1 mandated a confirming review round: a loop closed only after a clean round *following* a clean
round. It is expensive — it doubles review cost on every artifact.

Three independent sources said cut it:

- **Anthropic's Opus 5 guidance** — "remove them"; "do not use subagents to verify or double-check your
  own work."
- **The superpowers 5×5 A/B**, which found no benefit.
- **Our own research and audit sweep**, whose synthesis read: *delete the two-generation rule,
  delete the panel, delete the accept corner; keep one reviewer on the diff.*

The plan was written to delete it. Before executing, we measured it.

### E2 — reviewer variance

> **On the evidence for this section.** The E2 and adjudication figures below were measured in a
> working session, and the raw artifacts — the 116 findings, the 232 adjudicator verdicts, the Python
> recomputation — were never committed to this repository. `v2/README.md`, which carried the summary,
> was deleted when v2 was promoted. So **you cannot reproduce or refute these numbers from this repo**,
> only the size and prohibition counts elsewhere in this article, which are recomputed on every
> acceptance run. An article whose thesis is that unverifiable claims propagate should say which of its
> own claims are unverifiable. These are the ones.

Four real design documents from `docs/design/`. Three independent fresh reviewers on each, all
receiving **byte-identical prompts**, all reading the **same unchanged document**. Twelve reviews.

They produced 116 finding-instances, which collapsed to **70 distinct defects**.

| | Defects found | Coverage |
|---|---|---|
| Reviewer 1 alone | 38 / 70 | **54%** |
| Reviewers 1 + 2 | 60 / 70 | **86%** |
| All three | 70 / 70 | 100% |

The distribution matters more than the totals. Only **19%** of defects were found by all three
reviewers. **51% were found by exactly one.** Reviewers do not converge on the same defects and then
argue about the tail — they miss *different* things. Per-reviewer detection worked out to roughly 55%.

And the severity finding: reviewer 1 found 8 severe defects. Reviewers 2 and 3 found **4 more severe
defects that reviewer 1 had missed entirely — one in every document.** One of them was a silent
relaxation of the skill's own "an author must never review their own work" invariant.

A third reviewer added 10 more defects — 14% of the union, against round two's 31%. That is where the
curve flattens.

**The data said keep it.** The plan was wrong, and the three sources that recommended deleting it were
answering a different question. The boundary that reconciles them: *self*-verification is dead — an
agent re-reading its own reasoning adds nothing. *Independent* review by a reader who never saw that
reasoning adds 29 percentage points of coverage — roughly two-thirds of what the first reviewer missed. Opus 5's guidance is about the first. This measurement is about the second.

So v2 kept the confirming round, and re-mechanised it: **two reviewers in parallel on Deep work, one on
Standard, never three.**

### Validating the validation

A 54% → 86% jump is exactly the kind of number that is too convenient to trust. It rests entirely on
reviewer 2's extra findings being *real defects* rather than inflation — and nobody had checked.

So all 116 findings were hashed, stripped of attribution, deterministically shuffled, and re-judged by
**two independent adversarial adjudicators per document** — eight adjudicators, 232 verdicts — each
instructed to *refute* and to default to FALSE when torn. The scoring was biased against the result we
wanted. Coverage was then recomputed in Python rather than by an agent, averaged over *every* reviewer
ordering instead of one arbitrary "reviewer 1."

| | Reported | Validated |
|---|---|---|
| 1 reviewer | 54% | **56.5%** |
| 2 reviewers | 86% | **85.5%** |

The rule held. Adjudicators agreed with each other 84% of the time.

But the validation surfaced something the first analysis had no way to see. **Reviewer precision is
poor:**

| Finding graded... | Survived adjudication |
|---|---|
| severe / blocking | **50–70%** |
| general / non-blocking | **30–46%** |

Between a quarter and a half of what reviewers report — including things they mark blocking — is not
there. That is the price of the instruction that gets recall up. Telling a reviewer to be conservative
does not fix it; a reviewer told to be conservative reports *less*, including the real defects.

### The bug that finding created

v2 had shipped, four hours earlier, a `phase.js` that computed closure from the **raw** blocking count.

With 30–50% of blocking findings being phantoms, that is a live bug: a finding that is not real
consumes a fix round, and enough of them exhaust the round cap and declare deadlock on code that was
already correct. It is the same class as the v1 bug we had just catalogued — and we had introduced it
ourselves, in the rewrite that was supposed to fix that class.

Hence v2's **Triage** step, between review and closure. Check each finding against the code it cites.
Reject the ones that misread it. Closure computes on *confirmed* findings, never the raw report and
never the reviewer's prose verdict. Carrying that rule cost `SKILL.md` about 90 words, and it is the
single most load-bearing thing the measurement bought.

### The round counter

While we were in there: v1's runner incremented its round counter *unconditionally*, before the
branch that decides whether a fix actually runs. The prose said "R increments only on a fix." The code
disagreed. It had been known since 2026-07-07, split to a follow-up cycle, and never shipped.

We built a harness that executes both scripts' real control flow:

| Scenario | v1 | v2 |
|---|---|---|
| Clean first review | passed, 0 fixes | closed, round 1 |
| 1 issue, then clean | passed, accept budget **0** | closed, round 2 |
| 2 issues, then clean | **cap-exhausted** | closed, round 3 |
| 3 issues | cap-exhausted | cap-exhausted |

One general finding left zero accept-fix budget. Two fix rounds reported cap-exhausted on a *perfectly
clean third round*. In v2, `round` increments only when a fix runs.

---

## Part 3 — What v2 is

| | v1.14.0 | v2.0.0 |
|---|---|---|
| `SKILL.md` | 2,915 words | **1,336 words** |
| Total prose (Markdown only) | 21,802 words | **6,047 words** |
| Files (incl. scripts) | 20 | **8** |
| Committed docs per task | 2 | **0** |

**Plan → Build → Close.** L1 and L2 were one plan artificially cut in two. Merging them deleted the
slug protocol, the rollback protocol, the Deprecated-section convention, and an entire review loop.
The output is a gitignored `.agent/<task>/plan.md` — one directory per task — instead of two committed documents.

**Depth graded on blast radius and reversibility.** *If this is wrong, how much breaks? How hard is it
to undo?* Direct / Standard / Deep, with a **checklist** for the deep tier. v1's gate was a disjunction
of qualitative predicates with no size term, so routine work kept landing on the expensive branch.

**Gates before agents.** Typecheck, lint, build, test — before any reviewer is spawned. v1 mentioned
them once, in a parenthetical. An agent's opinion about code that does not compile is worthless, and
the compiler is free.

**Two reviewers on Deep, one on Standard. Triage before counting.** As measured above.

**Deleted, each with grounds:** the five-voter panel and its anti-inflation clause; the separate accept
subagent (forbidden from judging, and its report declared insufficient by the very next rule); the
committed per-task archive; `check-consistency.sh`; and — last, by the owner's call — both hook
scripts. v2 enforces nothing mechanically, and says so plainly rather than implying a guarantee it
does not provide.

**A test suite that can fail.** Every fixture runs in both arms. A fixture both arms answer correctly
is reported **INVALID**, not green.

---

## Part 4 — The uncomfortable result

The new suite works. It also says something unflattering about the product.

Of seven fixtures, **one discriminates.** Six are guards — cases where the model already decides
correctly and the fixture exists to catch the skill making it *worse*. All six held.

The one that discriminates is **s04**: a four-file change where a single corner touches a
production-write path. The control arm upgraded the *entire* change to the deepest tier, defending it
with "a change is only as safe as its riskiest component." The skill arm ran Standard and escalated
just that corner.

The other six were written to test the reviewer count, the union rule, closure-from-counts, and
facts-versus-decisions — and a competent engineer with no skill at all got every one right.

**Under Opus 5, most of this discipline is redundant with the model's own judgment.** "Run the gates
before spending a reviewer," "don't mask a flake," "look up a value the repo already has" — these are
baseline senior behavior in 2026, and writing them down changes nothing.

What survives is the **specific and counter-intuitive**: an exact reviewer count, a tie-break between
two defensible tiers, "one risky corner does not upgrade the whole change."

Two fixtures, s02 and s07, were written as discriminators, failed three rounds of tuning, and were
demoted to guards. The demotion is recorded verbatim in `expected.json` rather than quietly relabelled
— tuning a fixture's category until the suite goes green is precisely the dishonesty the suite exists
to prevent.

---

## Part 5 — What we got wrong while building it

This section exists because a rewrite that only reports its successes is the same genre of document as
a gate that only reports OK.

**We shipped a false claim about our own script.** `platforms.md` stated that the bundled commit hook
rejected AI attribution in commit messages. It contained no such check. `feat: generated with Claude
Code` passed it, exit 0. The claim was written into the file that lectures against writing checks that
do not work. It became a permanent engineering norm: *do not claim a script does something without
testing that it does.*

**We wrote a check that passed on the rule it existed to enforce.** `build.md` documents placing
worktrees outside the repository. The documented command resolved its relative path against the
*current directory*, not the repository root — so run from a subdirectory it silently created the
worktree **inside** the repo, the exact thing the prose two lines below forbids. Git creates the
intermediate directories and exits 0. The acceptance check that "proved" the placement worked did so by
grepping the command for `../` — which is precisely the assumption that fails. Two independent
reviewers reproduced it empirically. Same failure class as v1's consistency gate, committed by us, in
the session where we wrote the norm against it.

**We invented a number.** `build.md` claimed the v1 gate had "shipped for sixteen releases." That
figure appears nowhere in the source it was condensing — it belonged to a different artifact. It was
written in the same diff that reworded the norm *"state what you ran, not what you intended."*

**We reported a metric that flattered us.** Prohibition tokens (`never`, `do not`, `don't`,
`forbidden`, `must not`) fell from **135 to 37** across the Markdown surface — a 73% drop that reads
like a rewrite. But prohibition *density* did not move: **6.19 → 6.11 per 1,000 words.** The absolute
drop is almost entirely a side effect of a shorter document, not of rewriting prohibitions as positive
instructions. Worse, the first published version of that comparison measured v1 across *all* files
against v2 across *Markdown only* — two different denominators in one table.

That error outlived its own correction. Writing this article, the figures inherited from the rebuild
notes (137 → 47) turned out to *still* mix bases: 137 is a Markdown-only count and 47 an all-files
count. The numbers above were re-measured from tag `v1.14.0` and the shipped tree with one regex and
one scope, stated here so the next person can reproduce or refute them. Three times now, on the same
metric, in documents whose subject is measurement discipline.

**We blamed working code twice.** A harness "proved" `phase.js` closed a phase when only one of two
reviewers reported. The code was right; the harness was wrong — twice, in two different ways.

By the end of the session this pattern had recurred five times, and it has one shape: *the check was
written to confirm what its author believed rather than to falsify it.* The structural fix — now the
practice — is to **recompute rather than assert**. The final acceptance script recalculates every
published metric instead of comparing against a hardcoded one, and it immediately caught a stale
number that a hardcoded check would have blessed.

---

## Part 6 — What we still don't know

- **`close.md` is unmeasured.** It is carried over from v1's F phase on argument, not evidence. The
  least-tested part of the rewrite.
- **The two-reviewer result was measured on design documents, not diffs.** Applying it to diffs is an
  inference. Gates already remove a class of defect before a reviewer sees code, so the marginal value
  of the second reviewer there is probably *lower*.
- **We never observed a clean first review.** All twelve E2 reviews found something. "A clean round-1
  is weak evidence" follows from the ~55% detection rate; it was not directly measured.
- **One live discriminator.** The suite proves the skill is harmless and proves one rule load-bearing.
  It does not test the rest.
- **Reviewer precision is a floor, not an estimate.** E2 adjudicated *historical, closed* documents, so
  some FALSE verdicts were anachronisms — documents judged against gates that postdated them. Real-use
  precision is probably better than 30–50%.
- **The E2 evidence is not in this repository.** The reviewer-variance and adjudication figures were
  measured in a working session whose artifacts were never committed, and the summary that carried
  them was deleted when v2 was promoted. They are reported here in good faith and cannot be checked
  from the repo. The size, file-count and prohibition figures can be, and are, on every acceptance run.
- **The original complaint is still open.** Every token figure here is surface size. What v2 costs to
  run a real task has not been measured.

---

## What generalizes

If you maintain a skill, a prompt library, or any set of rules an agent is supposed to follow, four
things from this transfer:

1. **A check that cannot fail when the behavior is wrong is worse than none.** Before you add a gate,
   write the failing case and watch it fail. If you cannot make it fail, you have written documentation
   with a green light attached.

2. **A test without a control arm is not a test.** Run every behavioral fixture with the skill withheld.
   If an agent without your rules gets it right, the fixture is measuring the model, not your work — and
   you have learned something about the rule, not just the fixture.

3. **Independent review is not self-verification, and the guidance to delete the second one does not
   apply to it.** Two readers who never saw each other's output cover 85.5% of the
   defects where one covers 56.5%. A third adds 14 points more.

4. **Ask for everything, then triage.** High recall costs precision — between 30% and 50% of what you
   get back will not be there. Confirm before you fix, and *before you count*. Otherwise a defect that
   does not exist consumes a fix round and can exhaust a budget on code that was already correct.

The last one is the general form of everything above: **measure it before you delete it, and then check
whether the measurement was real.** Both times we skipped the second step, we shipped a bug.
