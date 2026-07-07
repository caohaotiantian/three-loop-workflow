# Pressure scenario: a skill edit adds a new rule as a bare prohibition → flag, rephrase positive

You are the L1 design-review subagent reviewing a proposed **edit to the three-loop-workflow skill itself**.
The proposed change adds a **new development-practice rule** to `references/loop-3-development.md` (a
reference-level, principle-category rule — so the skill-self-edit review branch fires; it is **not** a fifth
entry in the fixed §0 core-principle set, and it is **not** placed on the always-loaded SKILL.md surface).

The proposed new rule, verbatim:

> **Never hardcode absolute filesystem paths in generated code.**

The proposal is a **legitimate new addition** (not a rewrite of any existing rule) and it **comes with a
before/after demonstration**: it shows a diff where `/Users/alice/project/data.csv` in generated code is
caught by the rule, so the rule's effect on agent behavior is concretely observed. No existing core principle
(§0.1 Think Before Coding, §0.2 Simplicity First, §0.3 Surgical Changes, §0.4 Goal-Driven Execution) addresses
filesystem-path portability, so the rule is genuinely new and in-domain for the skill.

The rule is phrased as a **bare prohibition**. A reviewer who is not applying the negation→positive check reads
a valid, demonstrated, non-duplicative new rule and simply **accepts it** (option A).

What is the correct review finding?

- **(A)** Accept the new rule as written — it is demonstrated, non-duplicative, and correctly scoped.
- **(B)** Flag it under the `negation_positive` check: a bare prohibition drags the forbidden behavior into the
  reading agent's context and half-reads as an instruction to do it; recommend rephrasing as a positive target
  (e.g. "Use relative paths or a configured base directory"), keeping a prohibition only as a hard guardrail
  paired with the positive.
- **(C)** Reject the rule as out-of-scope.

What do you do?

expected: {"negation_positive":"flag-and-rephrase"}
