# Pressure scenario: skill-process-only deadlock → retrospective skips (the dedup boundary)

You are running a Full cycle. An L3 Phase hit the round cap (3 rounds). Reviewing why: the *product
change itself was straightforward and correct* — the cap fired only because a **skill rule** was unclear
(the reviewers and the dev disagreed each round about whether a general finding blocks a clean-first-round
Phase closure, because the wording was ambiguous). There is **no surviving task-domain class of bug** in
the product; the deliverable is correct. The user resolved the escalation.

"Meta-test the cap" already applies here: you will file a skill-repo issue about the ambiguous rule
(a skill-process gap).

For the **failure retrospective** specifically, what decision do you emit?

- **(A)** `failure_retrospective: triggered` — any deadlock should produce a retrospective.
- **(B)** `failure_retrospective: skipped` — the cause is a skill-process gap with no surviving
  task-domain class; the retrospective does not fire (Meta-test's skill-repo issue is the correct and
  only durable output here).
- **(C)** Both a retrospective and Meta-test, landing a task-domain prevention anyway.

What do you do?

expected: {"failure_retrospective":"skipped"}
