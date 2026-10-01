# Deep

Read this when a trigger in SKILL.md section 1 fires. It adds to SKILL.md.

## Always at Deep

**Before building:**

- **Write the Decisions before choosing,** not as a justification afterwards.
- **Rollback:** how to undo the change, and what undoing does not undo — data already written, messages already sent, clients already upgraded. If you cannot describe it, you do not understand the change yet.
- **Source external claims.** A claim about external behavior carries its source (a file:line, or a command and its output) or a throwaway spike, run outside the tree, that answers one question.
- **Have the plan read independently.** The reader looks for an Accept that cannot fail, a Decision with one option, a Non-goal the Goal contradicts, an unsourced claim, a missing rollback, and two sections that contradict each other.

**Phases** only where the parts can be verified independently. Each phase's review sees that phase's complete diff, and the round limit in SKILL.md section 6 counts per phase. The final review's fixes (Close, below) count as one more phase; the stop conditions still apply.

**Close, before the hand-off:**

- The full check run before the hand-off (SKILL.md section 4) covers the whole repository and starts from a clean state: a fresh checkout or clean worktree of the committed change, with no build output or caches from earlier runs. Never get there by deleting files in the user's working tree.
- Read the callers of every changed behavior. The one you are hunting still compiles and now does the wrong thing. Leave pre-existing dead code alone.
- Re-read the rollback against what landed. A rollback that no longer works is a blocking finding.
- Update only the docs this change made stale.
- **If the change was built in phases,** one final independent review of the whole change against the plan, asking how the phases interact: a contract one phase changed and another still assumes, state one phase sets up and another tears down, an ordering that only holds within a phase.

## Extras by trigger

Add the row for each trigger that fired.

| Trigger | Adds |
|---|---|
| 1. A contract consumed outside the repository | The first Decision is whether the break is necessary at all: an alias, a defaulted field, a new surface beside the old one, or a deprecation window. Carry that option into the question to the user. Ship the deprecation or versioning artifacts. Two reviewers (below). |
| 2. An irreversible effect outside the repository | Migrations run forward on realistic data, the rollback runs, and old and new readers are confirmed to coexist; an unverified migration is blocking. The safe observation from SKILL.md section 4 uses real-shaped data. Two reviewers (below). |
| 3. A rule in a contract file | The cold read from SKILL.md section 4 is required even when the edit is small, and covers the whole file set the rule lives in, not only the edited lines. |
| 4. Structures that diverge | Where only running it decides, a throwaway spike before choosing. |

## Two reviewers (triggers 1 and 2)

The plan read and each diff review, the final whole-change review included, get two independent reviewers instead of one. Both get the same brief, each with a different angle added: one is an adversary hunting a break; the other is next year's maintainer, who also reads the history of the touched paths. Union their findings; never intersect them. Both do the scoped re-check after each fix.

Without independent contexts, the plan read and each diff review become one self-review pass each, labelled as SKILL.md section 5 says, not several.
