# Cross-runtime skill portability — research findings (Claude Code / Codex / opencode)

**Date:** 2026-07-10
**Scope:** Upstream evidence for `docs/design/2026-07-10-cross-runtime-portability.md`. Sources: a direct
WebFetch of the three primary specs (agentskills.io, OpenAI Codex build-skills, opencode skills) plus a
fan-out `/deep-research` pass (5 angles, 19 sources fetched, 93 claims extracted, top 25 adversarially
verified — 24 confirmed, 1 refuted). This document is **analysis only — not a load-bearing skill file**.
It exists so the design doc is self-contained (a fresh agent can read the verbatim evidence here).

---

## 1. The portable core (verified 3-0)

A skill is a directory containing `SKILL.md` whose YAML frontmatter requires **exactly two** fields — `name`
(1–64 chars, lowercase alphanumeric + single hyphens, must match the parent directory) and `description`
(1–1024 chars, non-empty). Optional: **top-level** `license`; `compatibility`; `metadata` (string→string);
`allowed-tools`. This minimal subset is identical across the agentskills.io spec, Anthropic's Claude docs, and
opencode. Directory: `SKILL.md` + optional `scripts/`/`references/`/`assets/`; progressive disclosure keeps
`SKILL.md` < 500 lines / < 5000 tokens.
Sources: `https://agentskills.io/specification`, `https://opencode.ai/docs/skills/`,
`https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices`.

## 2. `compatibility` is a *declaration*, not a fallback switch (verified 3-0)

Verbatim (agentskills.io/specification): *"The optional `compatibility` field: Must be 1-500 characters if
provided; Should only be included if your skill has specific environment requirements; Can indicate intended
product, required system packages, network access needs, etc."* Canonical example value:
*"Designed for Claude Code (or similar products)"*, and *"Most skills do not need the compatibility field."*
It advertises requirements; it does **not** trigger automated per-platform behavior.

## 3. `allowed-tools` is experimental and non-portable (verified 3-0)

agentskills.io: *"Experimental. Support for this field may vary between agent implementations."* opencode's
recognized fields are `name`/`description`/`license`/`compatibility`/`metadata` only, and *"unknown frontmatter
fields are ignored"* — so `allowed-tools` is silently dropped on opencode. Do not rely on it for cross-runtime
gating.

## 4. opencode reads Claude/agents dirs natively (verified 3-0)

opencode discovers skills from six paths: `.opencode/skills/`, `~/.config/opencode/skills/`,
**`.claude/skills/`**, `~/.claude/skills/`, **`.agents/skills/`**, `~/.agents/skills/`. It loads them on demand
via a native `skill` tool advertising each skill's name+description, invoked as `skill({ name: "..." })`.
**A skill already living under `.claude/skills/` is visible to opencode with no move.**
Source: `https://opencode.ai/docs/skills/`.

## 5. Codex discovery (direct fetch, single-source — treat Codex specifics as lower-confidence)

`https://learn.chatgpt.com/docs/build-skills` (fetched 2026-07-10): Codex skills live in `.agents/skills/`
(repo, CWD→root), `$HOME/.agents/skills/`, `/etc/codex/skills/`. Frontmatter `name` + `description`. Optional
`agents/openai.yaml` (interface / policy / `dependencies.tools` = MCP). Explicit invocation via `/skills` or
`$skill`; implicit via description match, gated by `allow_implicit_invocation` (default true). Progressive
disclosure; ~8000-char discovery budget for name+description+path.
**Caveat:** the deep-research pass could NOT independently corroborate Codex's own discovery/gating/invocation
(Codex appeared only as a *sync target* `.codex/skills` in third-party tooling). Codex mechanics rest on this
one primary doc — the weakest-sourced area of this research.

## 6. The key strategic steer — no within-SKILL.md capability-fallback pattern exists (verified, medium confidence: evidenced absence)

Across all 24 surviving claims, **no** documented mechanism lets a single `SKILL.md` declare per-platform
capability fallbacks (e.g. "subagents on Claude Code, inline sequential steps elsewhere"). `compatibility` is
requirements-only. Real multi-runtime tooling keeps **separate** per-platform files (sync-skills) or **routes**
which runtimes a skill reaches (skillshare) — not graceful within-file degradation. The synthesized
recommendation: *"the three-loop design must solve this itself, e.g. make the discipline single-agent-inline by
default and treat Claude's Workflow/subagent orchestration as an optional acceleration layer."*

## 7. No confirmed subagent/orchestration API a skill can call on Codex or opencode (research open question)

The research could not confirm that either Codex or opencode exposes a **skill-callable** subagent-spawning or
workflow/pipeline primitive: *"The surviving evidence confirms no orchestration API on either runtime."*
Consequence for this skill: on Codex/opencode we must assume the discipline degrades to **single-agent inline
sequential execution**, and fresh-reviewer isolation there rests on a **fresh/cleared reviewer context**
(operator-initiated new session) rather than a spawned subagent. (opencode *does* have a runtime agent system,
so the disciplined model may still delegate where it chooses; but the skill must not *assume* it can.)

## 8. Authoring best-practices (verified 3-0) + install story

- Progressive disclosure is a 3-tier budget: ~100-token name+description at startup for all skills;
  `SKILL.md` body loaded on activation (recommended < 5000 tokens / < 500 lines); bundled
  `scripts/`/`references/`/`assets/` loaded on demand at zero resident cost. The 500-line / 5000-token figures
  are **heuristics** ("for optimal performance"), not benchmarked thresholds. No empirical study of optimal
  description length/structure was found.
- `description` best practice: third person, specific keywords, state **both** what the skill does and when to
  use it. (Claude Code truncates combined description + `when_to_use` at ~1536 chars in the listing.)
- **Install union covering all three runtimes:** Claude Code reads `.claude/skills/`; Codex reads
  `.agents/skills/`; opencode reads both. Copying the folder into `.claude/skills/` and `.agents/skills/`
  therefore serves all three with no sync tooling.

## 9. Refuted / rejected

- **Refuted (1-2):** the claim that cross-platform portability "remains aspirational" rather than delivered —
  opencode's native reading of `.claude/skills` and the working sync tools refute the strong framing.
- **Do NOT adopt:** external sync tools (sync-skills, skillshare) as a bundled dependency — they add infra the
  skill deliberately forgoes (consistent with `docs/analysis-2026-07-07-external-skills-comparison.md` §5 #15).
  They may be mentioned as an optional pointer only.

## 10. Caveats (verbatim from the research synthesis)

- The ecosystem is < 8 months old (open standard published 2025-12-18) and moving fast; field support and
  discovery paths can change.
- Codex-specific mechanics are the biggest evidence gap (see §5) — verify against OpenAI's live docs before
  relying on any Codex detail beyond `.agents/skills` + name/description.
- The "no within-file fallback pattern" finding (§6) is an **evidenced absence**, not a positive documented
  statement — hence medium confidence.
