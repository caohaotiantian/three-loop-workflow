# Escalation Rules

These rules apply across all three loops (L1, L2, L3) and the closeout review (F). The point of escalating is that any silent default becomes a lurking decision the next reviewer cannot challenge — so we surface decisions to the user explicitly.

## When to immediately suspend the loop and ask the user

| Situation | Action |
|---|---|
| Deliverables admit multiple interpretations | AskUserQuestion: list candidates plus recommendation |
| Internal contradiction in the design document with no patch in sight | AskUserQuestion: request a source-of-truth ruling |
| Breaking change (schema, exit code, CLI arg, storage layout, external protocol) | AskUserQuestion: also state the migration cost |
| Credentials, network, or permissions unavailable | First use Bash to verify the failure reason, then report to the user |
| Magic number or default threshold (algorithm parameter, weight, timeout, batch size) | Cite an existing constant from `docs/design/` or the source. If none exists, AskUserQuestion |
| Schema backward-compatibility ruling (keep, migrate, or drop legacy fields) | AskUserQuestion: include migration impact surface |
| Action exceeds authorized scope (push to main, delete files outside workspace, send messages externally) | Request authorization first |

## Forbidden

**Bypassing the question with a "reasonable default".** Delaying delivery is preferable to leaving design debt. A "reasonable default" embedded silently is a decision that:

- Was never reviewed by the user.
- Is invisible to the next reviewer reading only the design doc.
- Compounds: a chain of silent defaults across multiple tasks produces a system whose behavior nobody actually decided.

If you find yourself thinking "I'll just pick a sensible value and move on", stop. That is the exact failure mode this rule prevents.

## Question quality requirements

Every escalation must include three things:

1. **Candidate options** — never an open-ended "what should we do?". List 2 or more concrete choices.
2. **Recommendation** — name your preferred option.
3. **Rationale** — why you prefer it, including the trade-offs you accepted and rejected.

Pure open-ended questions are forbidden because they push the design burden onto the user without exposing the design space. The user should be able to answer "Option B, because of trade-off Y" — not "let me think about this for an hour".

### Example: good escalation

> The design doc requires "low-latency request handling" but does not specify a target. I see three viable thresholds:
> - **(a) p99 < 100ms** — matches our existing API tier, requires upgrading the cache layer.
> - **(b) p99 < 250ms** — achievable on the current stack, modest change.
> - **(c) p50 < 50ms with no p99 target** — different goal, simpler implementation.
>
> Recommendation: (b), because it preserves the contract with the current cache layer and the design doc's risk section flags cache-layer changes as high-risk. Trade-off: leaves headroom to tighten later if usage warrants.

### Example: bad escalation

> What latency target should we use?

(No options, no recommendation, no rationale. Pushes the entire decision onto the user.)

## Degraded mode

If the AskUserQuestion tool is unavailable in the current harness, degrade to a plain-text question segment in the main output beginning with `STOP: QUESTION` and **suspend all subagent spawns** until a reply arrives. Do not let subagents continue in parallel — their work depends on the answer.

The `STOP: QUESTION` block must still satisfy the three quality requirements above (options, recommendation, rationale).

## Round-cap exhaustion (deadlock report)

When any single domain (L1, L2, or a single L3 Phase) hits 3 rounds without clearing severe issues, this is **not** permission to lower the bar. Treat it as a structural escalation:

1. **Compose a deadlock report** listing:
    - The unresolved severe items (verbatim from the latest review).
    - What was attempted each round.
    - Why each fix attempt did not close the item.
    - What the reviewer subagent's reasoning was (so the user can judge whether the reviewer is correct).
2. **Use AskUserQuestion** with options like:
    - **(a) revise upstream document** (design or impl) to remove the conflict.
    - **(b) accept a documented compromise** with explicit risk recorded in the design doc's Risks and Rollback section.
    - **(c) drop the deliverable** from this task's scope and file a follow-up issue.
3. **Do not silently retry round 4.** The 3-round cap exists precisely to force this conversation.

## Returning from escalation

When the user answers, record the decision:

- **In the design doc** if it changes a Deliverable, Acceptance Criterion, or Key Design Decision.
- **In the impl doc** if it changes a Phase task or acceptance command.
- **In the commit message body** if it is a tactical decision that fits within an existing design clause.

The trace test (every changed line maps to a Deliverable or an escalated decision) depends on these records being durable. A user reply in chat that never lands in a doc cannot anchor a future code change.
