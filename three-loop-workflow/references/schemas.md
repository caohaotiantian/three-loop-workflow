# Schemas

Structured output schemas for use with the `schema` option in workflow `agent()` calls
or any harness that supports structured subagent output. These schemas let the
orchestrating agent check review verdicts by field comparison rather than string matching.

## ReviewVerdict

Use this schema when spawning review subagents (L1 design review, L2 implementation
review, L3 review corner). Pass as `agent(reviewPrompt, { schema: ReviewVerdict })`.

```json
{
  "type": "object",
  "properties": {
    "severe": {
      "type": "array",
      "items": { "type": "string" },
      "description": "blocks advancement: a correctness/contract/core-principle violation or a lost load-bearing rule"
    },
    "general": {
      "type": "array",
      "items": { "type": "string" },
      "description": "a real, should-fix-this-round defect that is not blocking; counts toward the two-generation rule"
    },
    "clarifications": {
      "type": "array",
      "items": { "type": "string" },
      "description": "note-only / needs user input; never counted"
    },
    "verdict": {
      "type": "string",
      "enum": ["pass", "needs-fix", "severe-nonconformance"],
      "description": "pass = zero severe this round AND zero general last round; needs-fix = severe or general issues remain; severe-nonconformance = severe issues blocking advancement"
    },
    "severe_count": { "type": "number" },
    "general_count": { "type": "number" }
  },
  "required": ["severe", "general", "verdict", "severe_count", "general_count"]
}
```

Calibration: grade by actual severity. A genuine blocker is severe; a real but non-blocking
defect is general; an advisory/cosmetic observation is a clarification (note-only). do not inflate
a genuinely-misclassified should-fix item to severe — inflation burns the shared round budget and
forces false escalations. This sharpens accuracy; it never lowers a real blocker, and the panel
stays ADD-only. When unsure between severe and general, it is general.

Loop-closure check. Two forms:

- **L1 / L2 — strict two-generation** (a clean first round still requires a confirming round):
```
closed = (verdict == "pass") || (severe_count == 0 && round > 1 && prior_general_count == 0)
```
- **L3 only — clean-first-round relaxation** (encoded in `references/l3-phase.js`): a Phase
  additionally closes on a single round when the first review is fully clean AND no fix was
  applied. The moment any fix lands, `fixApplied` is set and two-generation re-engages:
```
closed = severe_count == 0 && ( (!fixApplied && general_count == 0) || (round > 1 && prior_general_count == 0) )
```

The `pass` verdict signals the review subagent is confident the document is ready.
`severe_count == 0` with a prior clean general round is the mechanical two-generation
termination condition encoded as numbers. The L3 relaxation removes only the tax on a
correct-first-time Phase; a round with any unresolved severe or general issue can never close.

> The F / EER closeout fresh-eyes whole-change correctness review (see end-to-end-review.md) reuses this same ReviewVerdict schema.

## AcceptVerdict

Use this schema when spawning accept subagents (L3 step 3). Pass as `agent(acceptPrompt, { schema: AcceptVerdict })`.

```json
{
  "type": "object",
  "properties": {
    "all_pass": {
      "type": "boolean",
      "description": "true if every ACCEPT-CMD exited 0"
    },
    "failures": {
      "type": "array",
      "items": { "type": "string" },
      "description": "list of failed commands with exit codes"
    }
  },
  "required": ["all_pass", "failures"]
}
```

## DevResult

Use this schema when spawning dev subagents (L3 step 1). Pass as `agent(devPrompt, { schema: DevResult })`. The `branch` field is the commit audit trail / rollback reference — dev agents should commit their changes to a named branch and return it here. The `baseSha` field is the **diff base**: the dev agent captures `git rev-parse HEAD` BEFORE editing and returns it, so the review and accept subagents can run `git diff <baseSha>..<branch>` and audit exactly the changes under review (without it, the fresh-eyes audit depends on an unstated, agent-guessed diff command).

```json
{
  "type": "object",
  "properties": {
    "branch": {
      "type": "string",
      "description": "git branch name where changes were committed (e.g. 'phase1-dev-r1' — created ONCE per Phase and reused across all fix rounds; the '-r1' suffix is fixed, not per-round); REQUIRED — the script treats a missing branch as a dev failure"
    },
    "baseSha": {
      "type": "string",
      "description": "the commit SHA captured via `git rev-parse HEAD` BEFORE any edit; REQUIRED — the diff base for the review/accept fresh-eyes audit (`git diff <baseSha>..<branch>`). Must be captured before editing or the diff collapses to empty."
    },
    "summary": {
      "type": "string",
      "description": "one-paragraph summary of what was implemented"
    },
    "conflict": {
      "type": "boolean",
      "description": "true if the dev agent detected a conflict between the design doc and the implementation task; triggers design-conflict return from l3-phase.js"
    },
    "blocked": {
      "type": "boolean",
      "description": "true if the dev agent cannot complete the task (missing context or too hard); triggers a bounded one-time re-dispatch (concerns become added context) then a dev-escalation return from l3-phase.js — do NOT fabricate success"
    },
    "concerns": {
      "type": "array",
      "items": { "type": "string" },
      "description": "low-confidence areas the dev wants the reviewer to scrutinize first; when blocked=false these are interpolated into the review prompt to steer the fresh-eyes audit"
    }
  },
  "required": ["branch", "baseSha", "summary", "conflict"]
}
```
