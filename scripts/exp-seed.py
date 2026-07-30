#!/usr/bin/env python3
"""Seed `references/build.md` with the six pre-registered defects.

The executable form of the seed table in
`docs/measurements/2026-07-30-round-cap/preregistration.md` §4. One defect per class this repository
has actually shipped, drawn from the commit bodies of 0f15b22, 14d4ce9, f141045 and 00c53b4.

Every anchor must be found **exactly once**. A seeding script that silently no-ops would hand the
reviewers a clean document and produce a green run that looked like convergence — which is the same
failure as a gate that cannot fail, in the direction that flatters the result.

Three of the nine edits are CORRECT (C1-C3). A diff in which every changed hunk is defective is a
different and much easier detection task than a real change, where most edited lines are fine and the
reviewer has to discriminate. They are part of the material, pre-registered with the seeds, and a
reviewer that reports one of them is reporting a phantom — which is the quantity triage exists to
remove.

Usage: exp-seed.py <path-to-build.md>
Prints one line per applied edit, then the count. Exits non-zero if any anchor is missing or ambiguous.
"""
import sys

# (id, class, anchor, replacement). The anchor is replaced in full, so each seed is a rewrite of real
# surrounding prose rather than an appended sentence a reviewer could spot by its seams.
SEEDS = [
    (
        "S1",
        "invented statistic",
        "Diffs are a friendlier target — the gates have already removed a whole class of defect "
        "before a reviewer looks — so a second reviewer buys less here than on a plan.",
        "Diffs are a friendlier target — the gates have already removed a whole class of defect "
        "before a reviewer looks — but the second reviewer still adds 47% more confirmed findings "
        "than the first working alone.",
    ),
    (
        "S2",
        "a claim the code does not support",
        "Note what that does **not** do: it does not detect a fabricated sha. If the implementer "
        "reports a well-formed sha it never created, the reported value is discarded in favour of "
        "the real head and the phase reviews the real diff — the fabrication is made harmless, not "
        "visible. Resolving a sha in the repository needs a shell, which a Workflow script does not "
        "have.",
        "It also detects a fabricated sha. If the implementer reports a well-formed sha it never "
        "created, the script resolves the reported value in the repository, finds no object of that "
        "name, and stops the phase with an `agent-error` rather than reviewing a diff nobody wrote.",
    ),
    (
        "S3",
        "cross-file contradiction",
        "Each gets the diff and the plan — not your summary of the change, and not the whole skill.",
        "Each gets the diff, the plan, and the implementer's own list of low-confidence areas, so "
        "both reviewers know which corners to look at hardest.",
    ),
    (
        "S4",
        "stale path",
        "2. Look for the **discriminating** evidence — the one observation that differs between your "
        "top two hypotheses. Let that pick the cause instead of confirming the first plausible one.",
        "2. Look for the **discriminating** evidence — the one observation that differs between your "
        "top two hypotheses. Let that pick the cause instead of confirming the first plausible one.\n"
        "3. Record the surviving hypothesis and check it with `scripts/verify-plan.sh` before you "
        "edit anything.",
    ),
    (
        "S5",
        "rule stated in the opposite sense",
        "Fix confirmed blocking findings. Triage non-blocking ones the same way:",
        "Fix every reported blocking finding, then triage: while the diff is still moving, "
        "confirming each claim first costs a round you will spend anyway. Triage non-blocking ones "
        "the same way:",
    ),
    (
        "S6",
        "figure on a mixed denominator",
        "Three fix rounds per phase, counted independently per phase. Hitting the cap escalates with "
        "a deadlock report (`references/escalation.md`). It never lowers the bar and never becomes a "
        "quiet round four.",
        "Three fix rounds per phase, counted independently per phase. Hitting the cap escalates with "
        "a deadlock report (`references/escalation.md`). It never lowers the bar and never becomes a "
        "quiet round four. Ten of the twenty-one confirmed findings in the last release were defects "
        "in the gates that release itself added, so a change that edits its own checks should expect "
        "to spend the cap.",
    ),
    # --- Correct edits. Not defects. Present so that the reviewers face a realistic mix rather than a
    # diff in which every hunk is wrong. Each is true against the shipped script and the rest of the
    # skill, and each traces to the plan's Goal.
    (
        "C1",
        "correct edit — not a defect",
        "- A recalled result is not a result. Re-run and paste this run's output.",
        "- A recalled result is not a result. Re-run and paste this run's output.\n"
        "- Record which commands you actually ran, not the ones the project guide lists. A gate you "
        "skipped is a gate the reviewer will assume ran.",
    ),
    (
        "C2",
        "correct edit — not a defect",
        "If a *different* item failed each round, or the fix kept growing, the cap is firing on a "
        "planning defect rather than a local bug.",
        "Count the rounds in which you actually spent a fix, not the number of times you re-ran the "
        "gates — verifying once more than you fixed is correct, because the last fix still has to be "
        "checked.\n\n"
        "If a *different* item failed each round, or the fix kept growing, the cap is firing on a "
        "planning defect rather than a local bug.",
    ),
    (
        "C3",
        "correct edit — not a defect",
        "If the plan conflicts with what you find in the code, stop and say so.",
        "A phase that ends with uncommitted work has not ended: the review diffs ref-to-ref, so "
        "anything left in the working tree is reviewed as though you had changed nothing.\n\n"
        "If the plan conflicts with what you find in the code, stop and say so.",
    ),
]


def main():
    if len(sys.argv) != 2:
        print("usage: exp-seed.py <path-to-build.md>", file=sys.stderr)
        return 2
    path = sys.argv[1]
    with open(path, encoding="utf-8") as fh:
        text = fh.read()

    missing = []
    for sid, cls, anchor, _ in SEEDS:
        n = text.count(anchor)
        if n != 1:
            missing.append(f"{sid} ({cls}): anchor occurs {n} times, expected exactly 1")
    if missing:
        print("FAIL  the seed anchors do not match the document — refusing to seed:", file=sys.stderr)
        for m in missing:
            print(f"  {m}", file=sys.stderr)
        return 1

    for sid, cls, anchor, replacement in SEEDS:
        text = text.replace(anchor, replacement, 1)
        print(f"  seeded {sid}  {cls}")

    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(f"  {len(SEEDS)} seeds applied to {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
