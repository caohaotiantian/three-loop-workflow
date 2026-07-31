# Plan — e2e smoke task (throwaway)

## Goal
Add a tiny arithmetic helper with a test, under `.e2e/`, so that one Build phase can be exercised
end-to-end. Nothing outside `.e2e/` changes.

## Non-goals
- No change to any file outside `.e2e/`.
- No new dependency; plain node only.

## Decisions
**D1. Plain node, no test framework.** problem: a runner would need installing → options: (a) node
assertions in a shell script; (b) add a dev dependency → choice: **(a)** → why: zero setup, and the
acceptance command stays a single exit code.

## Accept
```bash
bash .e2e/test.sh
```

## Phases
**P1** — create `.e2e/calc.js` exporting `subtract(a, b)`, and `.e2e/test.sh` asserting
`subtract(5, 3) === 2` and `subtract(0, 4) === -4`. Accept: `bash .e2e/test.sh` exits 0.
