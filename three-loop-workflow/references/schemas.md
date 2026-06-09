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
      "description": "Severe issues that block loop advancement"
    },
    "general": {
      "type": "array",
      "items": { "type": "string" },
      "description": "General issues recommended to fix this round"
    },
    "clarifications": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Items requiring main agent to consult user"
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
      "description": "git branch name where changes were committed (e.g. 'phase1-dev-r1'); REQUIRED — the script treats a missing branch as a dev failure"
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
    }
  },
  "required": ["branch", "baseSha", "summary", "conflict"]
}
```
