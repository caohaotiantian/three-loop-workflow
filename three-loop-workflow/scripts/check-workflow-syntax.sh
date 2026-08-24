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
#   2. It declares `export const meta` somewhere in the code. The Workflow tool wants it first in the
#      file and wants it to be a pure literal; neither of those is checked here — what is checked is
#      that a declaration exists at all, because a script without one fails at launch, not at parse.
#   3. It avoids the primitives the Workflow runtime forbids — `Date.now()`, `Math.random()` and
#      argless `new Date()` all throw at runtime, because they would break resume.
#
# Checks 2 and 3 run against a MASKED copy of the source in which comments and string/template
# literals have been blanked out (newlines kept, so reported line numbers still line up). Interpolated
# `${...}` expressions inside a template stay visible, because those are code.
#
# Masking rather than a regex over raw text, because the naive version failed in both directions and
# both were reproduced: a `Date.now()` sitting after a `//` inside a string literal passed, and a
# CORRECT script was rejected for the word `Math.random()` appearing inside prompt text — which is a
# live hazard here, since phase.js is mostly template-literal prompts that instruct agents about
# determinism. A check that rejects the true sentences a writer is entitled to make does not converge.
#
# This gate says nothing about whether the logic is right. Control flow is asserted by execution —
# see scripts/sim-phase.js in the three-loop-workflow repository for how.
#
# Exit 0 = usable. 1 = a problem, named. 2 = usage.
set -uo pipefail
if [ "$#" -eq 0 ]; then
  echo "usage: check-workflow-syntax.sh <file.js> [<file.js>...]" >&2
  exit 2
fi
JS=$(cat <<'NODE'

const fs = require("fs")
const p = process.argv[1]
let raw
try {
  raw = fs.readFileSync(p, "utf8")
} catch (e) {
  console.error(`${p}: cannot read (${e.code || e.message})`)
  process.exit(1)
}

function parse(src) {
  new Function("agent","parallel","pipeline","log","phase","args","budget","workflow",
    `return(async()=>{${src.replace(/^export\s+/gm,"")}})()`)
}

// 1. parses. Named, because this runs over a list of files and an unattributed parse error sends the
// reader to the wrong one.
try { parse(raw) } catch (e) { console.error(`${p}: ${e.message}`); process.exit(1) }

// Blank out comments and literal text, keep code. Newlines survive so line numbers are unchanged.
// Regex literals are recognised too: phase.js contains one holding a backtick and two quote
// characters, and mistaking it for division corrupts every state decision after it.
// A keyword cannot end an expression, so a `/` after one opens a regex rather than dividing. This is
// not a corner case here: `return /^[A-Za-z0-9._\/-]*$/` is the shape phase.js validates refs with, and
// reading it as division starts the scan at the ESCAPED slash inside the character class, ends it at
// the real terminator, and blanks the `]`. The mask then silently disagrees with the file it came from.
const OPENERS = new Set(["return","typeof","instanceof","in","of","new","delete","void","throw",
                         "case","do","else","yield","await"])
function opensRegex(src, i) {
  let j = i - 1
  while (j >= 0 && /\s/.test(src[j])) j--
  if (j < 0) return true
  if (!/[A-Za-z0-9_$]/.test(src[j])) return false
  let k = j
  while (k >= 0 && /[A-Za-z0-9_$]/.test(src[k])) k--
  return OPENERS.has(src.slice(k + 1, j + 1))
}

function mask(src) {
  const out = new Array(src.length)
  const blank = i => { out[i] = src[i] === "\n" ? "\n" : " " }
  const keep  = i => { out[i] = src[i] }
  // Stack of template-literal brace depths: an entry is pushed at `${` and popped at its `}`.
  const tmpl = []
  let i = 0
  let lastCode = ""   // last significant code character, for the regex-vs-division decision
  let prevCode = ""   // the one before it, so `++` and `--` are recognised as expression-enders
  while (i < src.length) {
    const c = src[i], d = src[i + 1]
    if (c === "/" && d === "/") {                       // line comment
      while (i < src.length && src[i] !== "\n") blank(i++)
      continue
    }
    if (c === "/" && d === "*") {                       // block comment
      blank(i++); blank(i++)
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) blank(i++)
      if (i < src.length) { blank(i++); blank(i++) }
      continue
    }
    if (c === "\"" || c === "'") {                      // string literal
      keep(i++)
      while (i < src.length && src[i] !== c) {
        if (src[i] === "\\") blank(i++)
        if (i < src.length) blank(i++)
      }
      if (i < src.length) keep(i++)
      lastCode = "\""
      continue
    }
    if (c === "`") {                                    // template literal
      keep(i++)
      while (i < src.length) {
        if (src[i] === "\\") { blank(i++); if (i < src.length) blank(i++); continue }
        if (src[i] === "`") { keep(i++); break }
        if (src[i] === "$" && src[i + 1] === "{") {     // interpolation: back to code
          keep(i++); keep(i++)
          tmpl.push(0)
          break
        }
        blank(i++)
      }
      lastCode = "`"
      continue
    }
    // `i++ / 2` divides: `++` and `--` end an expression, and looking at one character sees only `+`.
    const endsExpr = /[A-Za-z0-9_$)\]]$/.test(lastCode) || ((lastCode === "+" || lastCode === "-") && prevCode === lastCode)
    if (c === "/" && (!endsExpr || opensRegex(src, i))) {
      // Candidate regex literal. A real one cannot span a newline, so if we reach one we were
      // wrong and it was division after all — rewind and treat it as ordinary code.
      let j = i + 1, cls = false, ok = false
      while (j < src.length) {
        const e = src[j]
        if (e === "\\") { j += 2; continue }
        if (e === "\n") break
        if (e === "[") cls = true
        else if (e === "]") cls = false
        else if (e === "/" && !cls) { ok = true; break }
        j++
      }
      if (ok) {
        keep(i++)
        while (i <= j) blank(i++)
        out[j] = "/"
        while (i < src.length && /[a-z]/.test(src[i])) keep(i++)   // flags
        lastCode = "/"
        continue
      }
    }
    if (tmpl.length) {                                  // inside a `${ ... }` expression
      if (c === "{") tmpl[tmpl.length - 1]++
      else if (c === "}") {
        if (tmpl[tmpl.length - 1] === 0) {              // closes the interpolation
          tmpl.pop()
          keep(i++)
          // resume the enclosing template literal
          while (i < src.length) {
            if (src[i] === "\\") { blank(i++); if (i < src.length) blank(i++); continue }
            if (src[i] === "`") { keep(i++); break }
            if (src[i] === "$" && src[i + 1] === "{") { keep(i++); keep(i++); tmpl.push(0); break }
            blank(i++)
          }
          continue
        }
        tmpl[tmpl.length - 1]--
      }
    }
    if (!/\s/.test(c)) { prevCode = lastCode; lastCode = c }
    keep(i++)
  }
  return out.join("")
}

const code = mask(raw)

// The mask is a hand-rolled lexer, and hand-rolled lexers lose their place. Blanking only the CONTENT
// of a literal leaves source that still parses — `"abc"` becomes `"   "`, a comment becomes spaces, a
// regex becomes `/   /` — so a masked copy that does NOT parse is proof the mask went wrong, and every
// answer below it would be a guess. This oracle is free and it is what caught the bug above.
try {
  parse(code)
} catch (e) {
  console.error(`${p}: the literal mask lost its place (${e.message}) — this is a defect in this gate, not in the file. The answers below it cannot be trusted; fix mask() before believing either verdict.`)
  process.exit(1)
}

// 2. declares a meta block — checked on the masked copy, so a `export const meta` that exists only
//    inside a comment or a string does not satisfy it.
if (!/^\s*export\s+const\s+meta\s*=/m.test(code)) {
  console.error(`${p}: no \`export const meta = {...}\` declaration in code — the Workflow tool requires one (a copy inside a comment or a string does not count)`)
  process.exit(1)
}
// ...and it has to be the object literal itself. `export const meta = build()` satisfied the test above
// and then failed at launch, which is the failure this check exists to move earlier. The tool's other
// requirement — that meta comes first in the file — is NOT checked here, because nothing in this repo
// establishes it by execution, and a gate that enforces an unverified rule starts rejecting valid files.
if (!/^\s*export\s+const\s+meta\s*=\s*\{/m.test(code)) {
  console.error(`${p}: \`export const meta\` is not an object literal — the Workflow tool reads it without executing the file, so it cannot be a call, a variable or a spread`)
  process.exit(1)
}

// 3. no runtime-forbidden primitives
// Matched as MEMBER ACCESS, not as a call: `const f = Date.now` then `f()` later is the same defect a
// line further on, and `new Date` without parentheses is argless too. All three passed the call-shaped
// patterns these replace. `Date["now"]()` still passes, and no text-level check can see it.
const banned = [
  [/\bDate\s*\.\s*now\b/, "Date.now"],
  [/\bMath\s*\.\s*random\b/, "Math.random"],
  [/\bnew\s+Date\s*\(\s*\)/, "argless new Date()"],
  [/\bnew\s+Date\b(?!\s*\()/, "argless new Date"],
]
// Scanned over the whole masked source, not line by line: `Date\n  .now()` is the same defect with a
// newline in it, and a per-line scan cannot see it — verified, it printed `workflow-syntax ok`. The
// patterns already allow whitespace between the tokens; the line number now comes from the match offset.
let bad = 0
for (const [re, name] of banned) {
  const g = new RegExp(re.source, "g")
  let m
  while ((m = g.exec(code)) !== null) {
    const line = code.slice(0, m.index).split("\n").length
    console.error(`${p}:${line}: ${name} is unavailable in a Workflow script — it would break resume`)
    bad++
    if (m.index === g.lastIndex) g.lastIndex++
  }
}
if (bad) process.exit(1)
NODE
)
# Every file is checked, and each failure names its own file. Stopping at the first one means a caller
# fixing a batch learns about them one run at a time.
rc=0
for f in "$@"; do
  node -e "$JS" "$f" || rc=1
done
[ "$rc" -eq 0 ] || exit 1
echo "workflow-syntax ok: $*"
