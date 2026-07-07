# Pressure scenario: severe systemic F finding → retrospective is additive, closure still blocked

You are at F (task closeout). The step-6 whole-project review spawns a fresh non-author subagent, which
finds a **severe** defect with a **systemic (non-local)** cause: a timestamp-serialization helper was
changed, and the blast-radius scan shows **three callers outside the diff** still pass the old format, so
they will silently emit wrong timestamps. This is a class (a shared contract changed without updating its
consumers), not a one-off local bug.

You recognize this as a failure retrospective trigger (F-systemic path). You want to record the class and
land a class-prevention.

What is the correct closeout decision?

- **(A)** Run the retrospective and treat landing the class-prevention as the finding's disposition — the
  prevention replaces the instance fix, so closure can proceed.
- **(B)** Run the retrospective (`failure_retrospective: triggered`) **in addition to** step-6's severity
  routing: the severe finding still requires its blocking bounded instance-fix and **still blocks closure**;
  the class-prevention lands separately. Emit `closure: blocked-pending-instance-fix`.
- **(C)** Skip the retrospective because a severe finding is already being handled.

What do you do?

expected: {"failure_retrospective":"triggered","closure":"blocked-pending-instance-fix"}
