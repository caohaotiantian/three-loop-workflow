#!/usr/bin/env bash
# Syntax-check a three-loop-workflow Workflow script (l3-phase.js / review-panel.js).
# These scripts mix `export const meta` with top-level await/return, so they are valid
# as neither standalone CommonJS nor standalone ESM — `node --check` cannot gate them
# (it auto-detects module syntax and silently passes broken input). Instead we strip the
# `export` keyword, wrap the body in an async IIFE, and construct it with `new Function`
# (parses without executing). Exit 0 = parses; non-zero = syntax error.
set -euo pipefail
for f in "$@"; do
  node -e 'const fs=require("fs");const s=fs.readFileSync(process.argv[1],"utf8").replace(/^export\s+/m,"");new Function("agent","parallel","pipeline","log","phase","args","budget","workflow",`return(async()=>{${s}})()`)' "$f"
done
echo "workflow-syntax ok: $*"
