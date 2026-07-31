#!/usr/bin/env bash
# Move the experiment out of the private working area and into the repository.
#
# Everything the experiment used lived outside the repository while it ran, because the agents under
# measurement start with the repository as their working directory and a seed list in that tree is one
# `grep -r` from them. That constraint ends when the last replicate returns; this script is the
# transition.
#
# Usage: exp-assemble.sh <repo>
set -euo pipefail

REPO=$1
PRIV="$HOME/.cache/tlw-exp"
MEAS="$REPO/docs/measurements/2026-07-30-round-cap"

cd "$REPO"
[ "$(git rev-parse --abbrev-ref HEAD)" = "fix/audit-hardening" ] || { echo "FAIL  not on fix/audit-hardening" >&2; exit 1; }

# Deliberately does NOT require a clean tree. Assembly happens after the last replicate has returned,
# alongside this change's own edits to the skill and the changelogs — refusing to run on a dirty tree
# would only force those edits to be committed in an arbitrary order first. What it does still require
# is the branch, because copying the seed list onto the wrong one is the mistake worth preventing.
# It must NOT be run while a replicate is in flight: that is what puts the answer key back in the tree.
if git rev-parse -q --verify exp-rep1 >/dev/null 2>&1 || git rev-parse -q --verify exp-q2 >/dev/null 2>&1; then
  echo "FAIL  an experiment branch still exists — a replicate may be in flight; assembling now would put the seed list back in the tree the reviewers stand in" >&2
  exit 1
fi

mkdir -p "$MEAS/raw" scripts .agent

# The pre-registration, back from the branch that was never checked out while the replicates ran.
cp "$PRIV/preregistration.md" "$MEAS/preregistration.md"
cp "$PRIV/preregistration.provenance.txt" "$MEAS/preregistration.provenance.txt"

# The harness. Committed because the analysis has to be re-runnable by someone who was not here.
for f in exp-seed.py exp-setup.sh exp-teardown.sh exp-restore.sh exp-next.sh exp-assemble.sh \
         exp-round-cap.js exp-review.js exp-adjudicate.js exp-embed.py \
         exp-extract.mjs exp-groups.mjs exp-join.mjs exp-analyse.mjs exp-q2-analyse.mjs; do
  [ -f "$PRIV/harness/$f" ] && cp "$PRIV/harness/$f" "scripts/$f"
done
chmod +x scripts/exp-*.sh scripts/exp-*.py 2>/dev/null || true

# Raw data. Bundles, per-round series, verdicts, adjudication.
for f in "$PRIV"/raw/*.bundle "$PRIV"/raw/*.tsv "$PRIV"/raw/*.diff \
         "$PRIV"/raw/*.verdict.json "$PRIV"/raw/*.series.json "$PRIV"/raw/*.runlog.json \
         "$PRIV"/raw/adjudication.json "$PRIV"/raw/seed-match.json \
         "$PRIV"/raw/adjudication-raw.json "$PRIV"/raw/adjudication-groups.json \
         "$PRIV"/raw/adjudication-firstattempt-void.json "$PRIV"/raw/seed-match-firstattempt-void.json \
         "$PRIV"/raw/q2*.json "$PRIV"/raw/*.uncommitted.*; do
  [ -e "$f" ] && cp "$f" "$MEAS/raw/"
done
cp "$PRIV/raw-README.md" "$MEAS/raw/README.md"

# The merged analysis inputs the committed analysis script reads by default.
python3 - "$MEAS/raw" <<'PY'
import json, sys, glob, os
raw = sys.argv[1]
v = {}
s = {"series": {}}
for f in sorted(glob.glob(os.path.join(raw, "rep*.verdict.json"))):
    v.update(json.load(open(f)))
for f in sorted(glob.glob(os.path.join(raw, "rep*.series.json"))):
    s["series"].update(json.load(open(f))["series"])
json.dump(v, open(os.path.join(raw, "verdicts.json"), "w"), indent=1)
json.dump(s, open(os.path.join(raw, "series.json"), "w"), indent=1)
print(f"  merged {len(v)} verdict(s) and {len(s['series'])} series")
PY

# The task's own working state comes back to where the skill says it lives.
[ -d "$PRIV/measure-round-cap" ] && cp -r "$PRIV/measure-round-cap" .agent/ || true

echo "  assembled. tracked additions:"
git status --porcelain | sed 's/^/    /'
