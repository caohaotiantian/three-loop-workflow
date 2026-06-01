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
