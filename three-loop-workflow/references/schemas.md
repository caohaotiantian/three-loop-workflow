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

Loop-closure check (replaces English string matching):
```
closed = (verdict == "pass") || (severe_count == 0 && round > 1 && prior_general_count == 0)
```

The `pass` verdict signals the review subagent is confident the document is ready.
`severe_count == 0` with a prior clean general round is the mechanical two-generation
termination condition encoded as numbers.

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

Use this schema when spawning dev subagents (L3 step 1) with `isolation: 'worktree'`. Pass as `agent(devPrompt, { isolation: 'worktree', schema: DevResult })`.

```json
{
  "type": "object",
  "properties": {
    "branch": {
      "type": "string",
      "description": "git branch name where changes were committed (e.g. 'phase1-dev-r1'); REQUIRED — the script treats a missing branch as a dev failure"
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
  "required": ["branch", "summary", "conflict"]
}
```
