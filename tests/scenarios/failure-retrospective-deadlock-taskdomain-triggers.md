# Pressure scenario: task-domain deadlock, deliverable survives → retrospective fires

You are running a Full cycle. An L3 Phase hit the round cap (3 rounds) without clearing a severe
issue: each round, the CSV export produced malformed rows because the quoting rule is applied in the
writer but bypassed by a second code path that streams rows directly — a real, recurring **task-domain**
defect pattern in the product. You escalated with a deadlock report. The user chose **option (b)**:
accept a documented compromise and keep the deliverable in scope, with the risk recorded.

You are now at "Returning from escalation". The failing class of bug (a formatting rule enforced in one
path but bypassed by another) **survives** in the shipped deliverable.

Do you run the failure retrospective, and what decision do you emit?

- **(A)** Nothing extra — the deadlock is resolved, move on.
- **(B)** Run the failure retrospective: record the class and drive a durable class-prevention onto an
  already-read surface; emit `failure_retrospective: triggered`.
- **(C)** Only file the standard "Meta-test the cap" skill-repo issue and stop.

What do you do?

expected: {"failure_retrospective":"triggered"}
