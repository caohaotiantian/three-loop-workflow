#!/usr/bin/env bash
# Validate a three-loop-workflow Workflow script (phase.js, or your own).
#
# Three things are checked, because each one fails at a different time and only the first is a
# syntax error:
#
#   1. It parses. These scripts mix `export const meta` with top-level await/return, so they are valid
#      as neither standalone CommonJS nor standalone ESM — `node --check` cannot gate them (it
#      auto-detects module syntax and silently passes broken input). We strip the `export` keyword,
#      wrap the body in an async IIFE, and construct it with `new Function`, which parses without
#      executing.
#   2. It declares `export const meta`. The Workflow tool requires it as the first thing in the file
#      and requires it to be a pure literal; a script without it fails at launch, not at parse.
#   3. It avoids the primitives the Workflow runtime forbids — `Date.now()`, `Math.random()` and
#      argless `new Date()` all throw at runtime, because they would break resume. Comments are
#      stripped before this check so a script may still explain the rule.
#
# This gate says nothing about whether the logic is right. Control flow is asserted by execution —
# see scripts/sim-phase.js in this repository for how.
#
# Exit 0 = usable. 1 = a problem, named. 2 = usage.
set -euo pipefail
if [ "$#" -eq 0 ]; then
  echo "usage: check-workflow-syntax.sh <file.js> [<file.js>...]" >&2
  exit 2
fi
for f in "$@"; do
  node -e '
const fs = require("fs")
const p = process.argv[1]
const raw = fs.readFileSync(p, "utf8")

// 1. parses
new Function("agent","parallel","pipeline","log","phase","args","budget","workflow",
  `return(async()=>{${raw.replace(/^export\s+/gm,"")}})()`)

// 2. declares a meta block
if (!/^\s*export\s+const\s+meta\s*=/m.test(raw)) {
  console.error(`${p}: no \`export const meta = {...}\` declaration — the Workflow tool requires one`)
  process.exit(1)
}

// 3. no runtime-forbidden primitives (comments stripped so the rule can still be documented)
const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
const banned = [
  [/\bDate\.now\s*\(/, "Date.now()"],
  [/\bMath\.random\s*\(/, "Math.random()"],
  [/\bnew\s+Date\s*\(\s*\)/, "argless new Date()"],
]
let bad = 0
for (const [re, name] of banned) {
  code.split("\n").forEach((line, i) => {
    if (re.test(line)) {
      console.error(`${p}:${i + 1}: ${name} is unavailable in a Workflow script — it would break resume`)
      bad++
    }
  })
}
if (bad) process.exit(1)
' "$f"
done
echo "workflow-syntax ok: $*"
