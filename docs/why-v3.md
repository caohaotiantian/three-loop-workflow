# Why v3

*v3.0.0 rewrites v2 from the ground up, as v2 rewrote v1. What changed, what it rests on, and what
nobody has measured.*

中文版 → [why-v3-cn.md](./why-v3-cn.md)

---

## What was asked

The owner's direction: the skill should be **runtime-neutral**, working wherever an agent can read files,
run the project's commands and talk to the user. It should ship **no Workflow script** and name **no
agent types or tools**. It should follow **convention over configuration**: state requirements and
constraints, and leave the means to the agent. And it should be **self-contained**, with nothing to
install beside it and nothing to set up in a project.

Behind that was cost. The owner's own sessions with v2 ran much longer, with far more spawned agents.
They were not task-matched and cannot be reproduced from this repository, so nothing here rests on them.

## What the repository's own evidence said

**Most of the discipline was already redundant.** `docs/why-v2.md` (Part 4) recorded that an agent
forbidden to read the skill answered almost every fixture correctly; the one fixture that discriminated
was a change with a single risky corner. Commit `c33354e` repeated this with a control-arm probe: most
rules put to agents with the skill withheld were answered correctly and unprompted, some with sharper
reasoning than the rule. v3 carries those verdicts through the rest of the skill.

**The round cap was not the problem; scope growth was.** The pre-registered round-cap experiment
(`docs/2026-07-31-round-cap-experiment.md`) found the seeded defects repaired in the first round. Later
rounds went to machinery the fix step had added itself, which the next round reviewed instead of the
change. The replicate whose fix step added nothing converged at once. The cap stayed at three.

**Test effort was pushed up by a mechanism, not chosen.** v2 asked for a test every round, from three
directions: Accept required a command whose exit code decides success; the Build-loop script told every
writer that new behaviour needs a test; the reviewer brief asked for one. Nothing said when a test is the
wrong check.

**The reading load.** Recomputed by the gate from the tags: in v2.7.0 the always-loaded `SKILL.md` was
2,704 words, a Standard task read 8,725 words (`SKILL.md` plus the plan and build references), and the
whole prose surface was 16,605 words. In v3.0.0, `SKILL.md` is 1,711 words and is the whole Standard
route; with `references/deep.md` the surface is 2,322 words.

## What was cut, and why

- **The Build-loop script** (`phase.js`) and its harness: bound to one runtime, reported by the owner as
  untriggered by users, and the heaviest gate machinery in the repository. Both remain at tag `v2.7.0`.
- **Every named mechanism.** v3 states the property instead: a reviewer is a context that did not write
  the change; asking the user means asking and waiting. One line says the user may add their own review,
  security or orchestration tools, which supplement the independent review and never replace it.
- **Configuration**: the anchor map and its roles, `baseSha` bookkeeping, progress lines, rejection
  files, a numeric triage scale. The plan is `.agent/<task>/plan.md`, one directory per task, committed
  with the change. An existing `.gitignore` entry for `.agent` stays. The change description carries the
  hand-off.
- **The delegation guide, the guide journal, the platform table.** The long guide is retired: worktrees,
  an integrator, a script's API. Two properties stay. A delegated "done" is a claim, and the change must
  be in the repository and non-empty before it is accepted. A bounded domain goes to its own sub-agent
  when reading or changing it would fill this one; the brief names the domain and what it must not
  touch, and this context keeps the conclusion, not the transcript. The probe found the model handled a
  wrong guide better than the rule did. Install paths moved to the README.
- **Default test-writing.** Evidence is the cheapest thing that would fail without the change: an
  existing check turning green, a new test, or the observed outcome. No new unit test is required by
  default, and the skill names where one is the wrong check (UI rendering, wiring, configuration, thin
  calls to external services, one-off scripts, prose). A missing test is non-blocking unless it guards a
  confirmed correctness bug.
- **Depth defaults that pushed upward.** v3 takes the lightest depth that fits. Deep fires only on four
  narrowed triggers; Direct is decided by whether correctness is visible in the edit, or an existing
  check pins it.

## What was kept, and on what evidence

- **One risky corner escalates that corner, not the whole change**: the only rule a control arm has been
  measured getting wrong.
- **A path a person clicks, types or calls** is driven by a context that did not write the change. That
  context gets the path and the failure, not the diff or the author's account, and a contradiction is a
  finding. The author drives it only when no such context exists, and the hand-off says so. Retiring the
  separate behaviour agent had taken this requirement with it; the requirement is kept and the mechanism
  is not.
- **Only the user lowers the depth**, after a recommendation that shows, for someone new to the workflow,
  what this change would skip and the failure left open. If they insist, the agent follows and records
  it. A hard constraint is not waived that way.
- **Independent review**, above Direct, on the argument of correlated blind spots. Where no independent
  context exists, the review runs as a separate pass from the diff and the brief alone, labelled
  "self-review, not independent", and the user is offered the brief.
- **Triage before counting.** Counting unconfirmed findings spends fix rounds on correct code. The
  precision measurement behind it cannot be reproduced here.
- **Non-goals and Accept before the first edit**, the guard against the scope growth the experiment
  found.
- **Stop conditions instead of a counter.** Stop and ask when a round leaves the confirmed findings
  unchanged, when a fix reaches files or machinery the plan did not name, or when blocking findings remain
  after the third round. A new check, harness, guard or test file becomes a named follow-up rather than
  part of the fix, which targets what consumed the experiment's rounds. After each fix the reviewer
  re-checks only the fix, which gives the stop conditions something to count.
- **Two reviewers, only where a mistake leaves the repository**: a breaking change to an external
  contract, or an irreversible external effect, with findings unioned, never intersected. The
  two-reviewer figure in `docs/why-v2.md` was measured on design documents, not diffs, and cannot be
  reproduced here, which is why it is confined.
- **The cold read** of anything read rather than run: the finished files, as a product, not as a diff.
  The changelog's v2.5.0 entry records why: reading the release that way found an instruction that would
  have handed the reviewer an empty diff, which no diff review showed. An empty diff is not a clean
  review.

## What is not known

- **v3's effect on time and on test volume is unmeasured.** No outcome comparison between v2 and v3
  exists. The word counts above say how much an agent reads, not how long a task takes or how many tests
  it writes.
- **The redundancy verdicts are dated.** They were taken with the models of mid-2026, against v2's
  wording, and not re-run against v3's. `tests/probe.js` now carries situations for two v3 rules with no
  evidence yet, a unit test as the wrong check and a fix that grows machinery; no result for either is
  recorded here.
- **The uncovered class stays uncovered.** The probe runs a control arm only, so nothing detects the
  skill pushing a capable model away from a correct default.
- **The cuts carry named risks.** The scoped re-check can miss a defect a fix causes outside the lines it
  reads. Where no independent context exists, the author drives the path and can see what they expect;
  the hand-off says so.

v2.7.0 stays reachable: `git checkout v2.7.0`, or the `.skill` attached to its release.
