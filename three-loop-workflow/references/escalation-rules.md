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
| Deletion of a file listed in CLAUDE.md _load-bearing-docs_ role | AskUserQuestion: state which contract the file fulfills, what replaces it, and the migration impact on every file that references it |
| Another in-progress design doc covers overlapping domain | AskUserQuestion: identify the overlap, propose merge or serialization, and get a coordination ruling before proceeding |

## Forbidden

**Bypassing the question with a "reasonable default".** Delaying delivery is preferable to leaving design debt. A "reasonable default" embedded silently is a decision that:

- Was never reviewed by the user.
- Is invisible to the next reviewer reading only the design doc.
- Compounds: a chain of silent defaults across multiple tasks produces a system whose behavior nobody actually decided.

If you find yourself thinking "I'll just pick a sensible value and move on", stop. That is the exact failure mode this rule prevents.

Also forbidden: **deferring an interpretation decision to the L1 reviewer** ("I'll note my assumption in the doc and the reviewer will catch it"). The L1 reviewer reads only the doc — it can challenge a contradiction or a single-option decision, but it cannot know the user's intent. Only the user can resolve an interpretation; a silently-resolved interpretation surfaced as a doc "assumption" was never decided, just hidden.

## Rationalizations — recognize and stop

The excuses agents generate under pressure, each with the rule it violates. Catching yourself
thinking one of these means: re-run the relevant gate or escalate — do not proceed.

| You catch yourself thinking | Reality → what to do |
|---|---|
| "It's only ~3 files / I'll split it into two tasks" | Still Full if any Full-Mode gate trips; splitting to game the ≤3 line is forbidden (light-mode.md Full-Mode gate). |
| "The decision has an obvious winner" | If it truly has a clear winner it is not a >1-option decision; if you are arguing the point, it is one — surface it (§0.1; Question quality below). |
| "They said do it quickly / just add Y" | Instructions say WHAT, not HOW; terse phrasing is not a tier downgrade (SKILL.md "Which tier applies"). |
| "I'll just note the default/assumption in a comment" | A silent default is Forbidden (above) and violates comments-explain-code-not-workflow (§0.3); escalate instead. |
| "First review came back clean, so I'm done" | A clean first round closes a Phase only under the L3 clean-first-round relaxation AND only if no fix was applied; L1/L2 always need the confirming generation; any fix re-engages two-generation (SKILL.md shared termination). |
| "The dev summary says it's done" | Review and accept read the diff (`git diff <baseSha>..<branch>`), never the dev summary — the summary is not evidence. |
| "An unresolved general issue is just advisory, ship it" | An unresolved general issue blocks two-generation closure; it is corroboration, not advice. |
| "Quick patch now, investigate the cause later" | A symptom fix spends the shared round budget and forces a later clean round anyway; name the root cause first (loop-3-development.md fix corner). |
| "One more fix attempt" (at round 3) | Round 3 escalates with a deadlock report, never a silent round 4 — the cap is the trigger, not a bug (Round-cap exhaustion below). |

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

If subagents are already in flight when the STOP:QUESTION condition is detected,
do not use their outputs — discard partial work and re-run after the user's answer
is received. The "suspend all subagent spawns" instruction is forward-looking only;
in-flight agents must be abandoned, not waited on.

## Round-cap exhaustion (deadlock report)

When any single domain (L1, L2, or a single L3 Phase) hits 3 rounds without clearing severe issues, this is **not** permission to lower the bar. Treat it as a structural escalation:

1. **Compose a deadlock report** listing:
    - The unresolved severe items (verbatim from the latest review).
    - What was attempted each round.
    - Why each fix attempt did not close the item.
    - What the reviewer subagent's reasoning was (so the user can judge whether the reviewer is correct).
    - **Evidence of where it breaks** — for each unresolved item, the failing acceptance command or reviewer-cited symptom (with its actual output) and the file/layer/value where expected and actual diverge. 'It keeps failing' is a story, not evidence.

    Pattern check: if a different item failed each round, or fix scope grew each round, the cap is firing on an architectural/decomposition defect — not a local bug. Name the likely source (L1 design or L2 phase split) and make option (a) the recommended default per the existing L3→L1/L2 rollback routing. When per-round failures are stable and local, leave the three options flat.
2. **Use AskUserQuestion** with options like:
    - **(a) revise upstream document** (design or impl) to remove the conflict.
    - **(b) accept a documented compromise** with explicit risk recorded in the design doc's Risks and Rollback section; the user MAY also authorize a single retry of the failing Phase with `models:{review|fix: <stronger-model>}` — an explicit user-authorized choice, never an automatic pre-escalation round.
    - **(c) drop the deliverable** from this task's scope and file a follow-up issue.
3. **Meta-test the cap.** If the cap was hit because a SKILL rule was unclear, missing, or hard to find (not genuine task difficulty), classify it in one line — clear-but-ignored (discipline gap) / should-have-said-X (doc gap) / didn't-see-section-Y (organization gap) — and open a follow-up issue against the three-loop-workflow repo.
4. **Do not silently retry round 4.** The 3-round cap exists precisely to force this conversation.

## Returning from escalation

When the user answers, record the decision:

- **In the design doc** if it changes a Deliverable, Acceptance Criterion, or Key Design Decision.
- **In the impl doc** if it changes a Phase task or acceptance command.
- **In the commit message body** if it is a tactical decision that fits within an existing design clause.

The trace test (every changed line maps to a Deliverable or an escalated decision) depends on these records being durable. A user reply in chat that never lands in a doc cannot anchor a future code change.

## Failure retrospective (deadlock path)

When the escalation was a **round-cap deadlock** and, on return, the **surviving unresolved failure is a
task-domain class of bug** (the deliverable was kept — option b — not dropped or redesigned away), run the
**failure retrospective** (`references/failure-retrospective.md`): record the class and drive a durable
class-prevention onto an already-read surface. Emit `failure_retrospective: triggered`. If the deadlock's only
cause was a skill-process gap and no task-domain class survives, emit `failure_retrospective: skipped` — the
retrospective does not fire.

This is **additive to**, never a replacement for, "Meta-test the cap" above: Meta-test files a skill-repo issue
about the *skill-rule* gap; the retrospective lands a prevention for the *task-domain class*. Different
subjects — a deadlock that is both runs both.
