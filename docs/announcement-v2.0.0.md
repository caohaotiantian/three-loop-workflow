# three-loop-workflow v2.0.0

**A ground-up rewrite. The prose is 72% smaller and every name in it changed.**

中文版 → [announcement-v2.0.0-cn.md](./announcement-v2.0.0-cn.md)

---

## What you get

| | v1.14.0 | v2.0.0 |
|---|---|---|
| `SKILL.md` (loaded every time) | 2,915 words | **1,307 words** |
| Total prose (Markdown only) | 21,802 words | **6,047 words** |
| Files (incl. scripts) | 20 | **8** |
| Documents committed per task | 2 | **0** |

The discipline survived. The delivery did not.

**Plan → Build → Close** replaces L1 → L2 → L3 → F. L1 and L2 were one plan cut in two; merging them
removed an entire review loop, the slug protocol, and the rollback protocol. The plan is now a single
gitignored `.agent/<task>/plan.md`, one directory per task — not two committed documents. The old per-task archive had reached 43,822
words against 27,896 words of actual product, and no human ever read it.

**Deep / Standard / Direct** replaces Full / Light / None, graded on two questions: *if this is wrong,
how much breaks?* and *how hard is it to undo?* The deep tier is now a **checklist, not a vibe** — if no
item fires, Standard is correct. One risky corner no longer upgrades an entire change.

**Gates run before reviewers, always.** Your project's typecheck, lint, build and tests run before any
subagent is spawned. v1 mentioned this once, in a parenthetical.

**Two reviewers on Deep work, one on Standard — measured, not guessed.** On four real design documents
with three independent reviewers each, one reviewer found 56.5% of the defects; two found 85.5%. A
third adds about 14%. Reviewers miss *different* things — only 19% of defects were caught by all three.

**Findings are triaged before they are counted.** The same measurement showed only 50–70% of findings
graded *blocking* survive adversarial checking, and 30–46% of the rest. Closure now computes on
confirmed findings, so a defect that is not real can no longer burn a fix round or falsely exhaust the
round cap.

**Two things were deleted for failing their own test.** The consistency gate returned `OK`, exit 0,
after its central termination rule had been replaced with the exact opposite. The behavioral suite was
run with the skill withheld and passed 6/6 — identical to the skill-on arm, 0% discrimination, green for
sixteen releases while measuring nothing. The replacement suite runs both arms and reports a
*discriminating* fixture both arms pass as **INVALID** rather than green. Six of its seven fixtures are
regression guards, which it says out loud rather than counting as coverage.

---

## Upgrading

**Replace the folder. Do not copy into it.** v1 and v2 share exactly two filenames — `SKILL.md` and
`references/platforms.md`. Copying v2 over v1 overwrites those and leaves the **other 18 v1 files**
behind (`loop-1-design.md`, `l3-phase.js`, `check-consistency.sh`, …). Nothing routes to them, but they
are still in the directory for an agent to find and read.

```bash
rm -rf ~/.claude/skills/three-loop-workflow
cp -r three-loop-workflow ~/.claude/skills/

# or
rsync -a --delete three-loop-workflow/ ~/.claude/skills/three-loop-workflow/
```

Then:

- **Add `.agent/` to your `.gitignore`.** That is where the plan now lives.
- **Remove any hook wiring.** v1 shipped an optional commit-message lint, `validate-commit-msg.sh`.
  v2 does not. If your `settings.json` invoked it, delete that entry — a hook pointing at a missing
  command fails on every commit.
- **Your `CLAUDE.md` anchor map still works, unchanged.** Same five roles. If you keep an `AGENTS.md`,
  v2 reads that too, and reads both when both exist.
- **`docs/design/` and `docs/implementation/` are no longer written.** Existing archives are yours to
  keep or delete; nothing reads them.
- **Update any project doc quoting the old terms.** L1/L2/L3/F → Plan/Build/Close. Full/Light/None →
  Deep/Standard/Direct. severe/general → blocking/non-blocking.

Staying on v1 is supported in the sense that it still exists — `git checkout v1.14.0`, or download the
`.skill` from the v1.14.0 release. It will not change again.

---

## Two things you should know before adopting it

**v2 enforces nothing mechanically.** Every rule in it is a request the agent can decline. During
development v2 carried `require-plan.sh`, a hook that blocked edits to contract files when no plan
existed — which made "no contract edit without a plan" an actual guarantee. It was removed before
release, deliberately, and that guarantee is now a convention. v1 never had that hook either; the only
hook it ever shipped was an optional commit-message lint. This is stated here rather than buried
because it is the one dimension on which v2 is weaker than it briefly was.

**Most of this discipline is redundant with Opus 5's own judgment.** We measured that too. Of seven
behavioral fixtures, six were answered correctly by an agent forbidden to read the skill. Only one
discriminated — the counter-intuitive rule that one risky corner does not upgrade the whole change. The
skill's value is concentrated in the specific and surprising rules, not in the ones that restate good
engineering. We publish it because it is sitting in `tests/expected.json` in this repo either way.

---

The full account — every experiment, every number, and the five mistakes made while building it — is in
[why-v2.md](./why-v2.md).
