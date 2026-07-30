#!/usr/bin/env python3
"""Embed an adjudication payload into a copy of a Workflow script.

A Workflow script has no filesystem, so everything it needs must arrive as `args`. The round-cap
experiment's adjudication payload is 67 findings and roughly 80,000 characters of quoted review text,
which is larger than an argument can practically carry. This substitutes the JSON for the script's
`const EMBEDDED_GROUPS = null` line and changes nothing else.

The point is that the substitution is mechanical and reversible: the committed script and the one that
actually ran differ by exactly one line, and this regenerates that line from the committed input.

Usage: exp-embed.py <script.js> <payload.json> <out.js>
"""
import json
import sys

SENTINEL = "const EMBEDDED_GROUPS = null"


def main():
    if len(sys.argv) != 4:
        print("usage: exp-embed.py <script.js> <payload.json> <out.js>", file=sys.stderr)
        return 2
    script, payload, out = sys.argv[1:4]

    src = open(script, encoding="utf-8").read()
    if src.count(SENTINEL) != 1:
        print(f"FAIL  expected exactly one `{SENTINEL}` in {script}, found {src.count(SENTINEL)}",
              file=sys.stderr)
        return 1

    data = json.load(open(payload, encoding="utf-8"))
    if not isinstance(data, dict) or not data.get("groups"):
        print(f"FAIL  {payload} does not carry a non-empty `groups` array", file=sys.stderr)
        return 1

    # json.dumps is valid JavaScript for this shape, and ensure_ascii keeps the output byte-stable
    # regardless of the locale the generator runs under — the same trap accept-release.sh pins.
    literal = json.dumps(data, ensure_ascii=True)
    open(out, "w", encoding="utf-8").write(src.replace(SENTINEL, f"const EMBEDDED_GROUPS = {literal}", 1))

    n = sum(len(g["findings"]) for g in data["groups"])
    print(f"  embedded {len(data['groups'])} group(s), {n} finding(s) -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
