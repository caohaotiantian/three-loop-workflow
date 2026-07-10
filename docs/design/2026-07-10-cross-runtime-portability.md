# Design: Cross-runtime portability (Claude Code / Codex / opencode)

Slug: `2026-07-10-cross-runtime-portability` · Target version: **v1.13.0** · Tier: **Full** (load-bearing:
SKILL.md + references + frontmatter). Aligned scope (AskUserQuestion, 2026-07-10): **portable-baseline
reframe** + **document per-platform install**. Upstream evidence:
`docs/analysis-2026-07-10-cross-runtime-research.md` (verbatim spec quotes + verified findings) and
`docs/analysis-2026-07-07-external-skills-comparison.md` (the stateless / no-infra / self-hosted invariants).

## 1. Background and Purpose

The skill is distributed as a "Claude skill", but its *structure* already conforms to the agentskills.io open
standard: a `SKILL.md` (name + description frontmatter) plus a `references/` tree loaded by progressive
disclosure. Two other agent runtimes now consume that same format:

- **opencode** natively discovers skills from six paths including **`.claude/skills/`** and **`.agents/skills/`**,
  and loads them via a native `skill` tool (`skill({ name })`) — so **it already reads this skill with no
  changes** (`docs/analysis-2026-07-10-cross-runtime-research.md` §4, verified 3-0).
- **OpenAI Codex** discovers skills from `.agents/skills/` with `name` + `description` frontmatter and
  progressive disclosure (`docs/analysis-2026-07-10-cross-runtime-research.md` §5, single-source — Codex
  specifics are the weakest-sourced area).

Today the skill (a) declares no `compatibility`, so a Codex/opencode user gets no signal it is intended to work
there; (b) documents install only for Claude Code / Claude.ai; and (c) frames orchestration as Claude-Code
Workflow scripts + spawned subagents, with the single-agent path labelled a "fallback" — which reads as
"Claude-only" to a non-Claude reader, even though that manual path is already declared authoritative regardless
of mode (`three-loop-workflow/references/loop-3-development.md:3-8`).

**If we do nothing:** the skill silently under-serves two runtimes it is *structurally* already compatible with
(only its orchestration automation is Claude-specific). A Codex/opencode user cannot discover how to install it
or how the discipline runs without the Workflow tool, and may wrongly conclude the discipline is unavailable to
them. The discipline itself (L1→L2→L3→F, four principles, round
caps, two-generation termination, fresh-eyes review) is runtime-agnostic prose; only the *orchestration
automation* is Claude-specific. This change closes the gap **without** changing any discipline rule.

**Research steer (evidenced absence, medium confidence):** there is **no** documented within-`SKILL.md`
per-platform capability-fallback mechanism; the recommended shape is to keep the discipline runnable as
single-agent manual execution and treat Claude's Workflow/subagent orchestration as an *acceleration layer*
(`docs/analysis-2026-07-10-cross-runtime-research.md` §6). This design follows that steer while preserving
Workflow mode as the Claude-Code default (D4).

## 2. Deliverables

- [ ] **SKILL.md frontmatter** — promote `license: MIT` to a top-level field; add a `compatibility` field
  (1–500 chars) declaring Claude-Code-optimized + Codex/opencode manual mode, honest about the isolation caveat
  (D6), and pointing to `references/platforms.md`; bump `metadata.version` to `"1.13.0"`.
- [ ] **`references/platforms.md`** (new) containing: (a) a per-runtime **install/discovery table** (Claude
  Code `.claude/skills/`, Codex `.agents/skills/`, opencode reads both); (b) a **capability matrix** mapping
  each Claude-Code mechanism (Workflow scripts, subagent spawn, AskUserQuestion, Tasks, `.claude/agents`,
  StructuredOutput schema, `/run`+`/verify`) to its **manual-mode** realization on Codex/opencode; (c) the
  **fresh-reviewer-isolation realization ladder** (D6), including the honest degraded case.
- [ ] **SKILL.md body** — one routing-table row → `references/platforms.md`, and a reframe of the existing
  Workflow-vs-manual framing that names **manual mode as the portable baseline** and **Workflow mode as the
  Claude-Code acceleration layer**, in the skill's *existing* "Workflow mode / manual mode" vocabulary (no new
  leading terms). This **includes rewording the always-loaded "manual/fallback mode" routing-table label**
  (`SKILL.md:179`) to a runtime-neutral phrasing (manual mode names the single-agent path, not a Claude-only
  "fallback"), so the always-loaded surface is not internally split for a Codex/opencode reader — the very
  reader this change serves. (`references/loop-3-development.md:3-8`'s "Recommended execution mode" header is
  retained: "Workflow recommended over manual Agent-tool orchestration" is accurate *on Claude Code*, and
  `platforms.md` carries the cross-runtime framing.) Net delta on the word ceiling **≤ 0**, paid for only by
  tightening wording *within the orchestration/routing region being reframed*; every reworded-vs-retained
  "fallback"/"manual"/"portable" occurrence is counted in the AC4 word accounting — no compression of unrelated
  prose (D3).
- [ ] **Minimal reframe touch** — `references/loop-3-workflow.md` (Workflow mode = the Claude-Code
  acceleration layer; non-Claude runtimes → `platforms.md`). Surgical: ≤ a few lines, existing vocabulary only.
  (The AskUserQuestion→STOP:QUESTION mapping is owned by `platforms.md`'s capability matrix, **not** a separate
  `escalation-rules.md` edit: `escalation-rules.md:79` already degrades correctly on any harness lacking the
  tool, and the confirmed Codex/opencode gap is the *subagent* API, not a user-question capability — conflating
  the two would assert an unsourced equivalence.)
- [ ] **`references/check-consistency.sh`** — (a) a distinctive drift token pairing the SKILL.md portability
  pointer with `references/platforms.md`; (b) register the new `tests/scenarios/` fixture filename in the
  required-fixture set.
- [ ] **`tests/scenarios/`** — one behavioral fixture asserting that, on a runtime **without** a skill-callable
  subagent, the disciplined agent does **not** self-review: it obtains a fresh/cleared reviewer context, and
  where even that is impossible it **discloses** the degraded isolation rather than silently self-reviewing
  (D6).
- [ ] **README.md + README-cn.md** — a cross-platform install section naming all three runtimes; correct the
  "a Claude skill" framing to "a portable Agent Skill"; add a v1.13.0 changelog row.
- [ ] **Package** — rebuild `three-loop-workflow.skill`; sync the installed copy if one exists.

## 3. Scope Boundary (NOT in scope)

- **NOT** rewriting the `description` field (already tuned; the load-bearing trigger signal; changing it risks
  trigger regressions — a separate concern). AC8 guards it against accidental bloat.
- **NOT** bundling any install/sync script or a Codex `agents/openai.yaml` manifest — aligned choice is
  document-only install, to preserve the **no-infra** invariant.
- **NOT** porting the Workflow JS scripts to Codex/opencode. They depend on the Claude Workflow runtime; manual
  mode **is** the portable realization, not a rewritten script.
- **NOT changing the behavior of any discipline rule** — no termination rule, round cap, tier gate, core
  principle, escalation trigger, or rationalization row changes. D8 **restates** (does not alter) the existing
  termination scope: the L3 manual path already carries the clean-first-round relaxation
  (`references/loop-3-development.md:63`, `references/schemas.md:55`); only L1/L2 stay strict (`SKILL.md:155`).
  Out-of-scope items F11 / A3 / B3 / Tier-C stay untouched.
- **NOT demoting Workflow mode for Claude Code.** The reframe adds a portable baseline; on Claude Code, Workflow
  mode remains the recommended L3 path (deterministic round-cap enforcement + real subagent isolation). The
  reframe is not license for a Claude-Code user to skip Workflow (D4).
- **NOT** adopting `allowed-tools` — experimental and unrecognized by opencode; non-portable, no gating value
  here (`docs/analysis-2026-07-10-cross-runtime-research.md` §3).
- **NOT** altering existing consistency-gate tokens, byte-identity pairs, or word ceilings (a ceiling change, if
  it proved unavoidable, is escalated as its own decision — R1).
- **Quality budgets (section-7 rule): explicitly excluded.** A documentation/framing change with no runtime hot
  path, no new UI/CLI/endpoint surface, no user-visible output latency. The skill's real quality budget — the
  always-loaded word ceiling — is declared and enforced (AC1, AC4, R1).

## 4. Key Design Decisions

**D1 — How to declare cross-runtime support.** Problem: a non-Claude runtime needs a machine-readable signal of
intended environment. Options: (a) the spec's `compatibility` field; (b) a new custom frontmatter key; (c)
prose-only in the body. Choice: **(a)** — the spec defines `compatibility` (≤500) for exactly this; canonical
example *"Designed for Claude Code (or similar products)"*; opencode recognizes it
(`docs/analysis-2026-07-10-cross-runtime-research.md` §2–§3). Rejected: (b) opencode ignores unknown fields →
non-portable; (c) forfeits the standard machine-readable declaration and the ≤500-char discipline.

**D2 — `license` placement.** Problem: `license: MIT` is nested under `metadata`, but the spec defines a
**top-level** `license`. Options: (a) promote to top-level; (b) keep nested. Choice: **(a)**, keeping
`metadata.version` (no standard top-level `version` field exists). Rejected: (b) expresses a standard field as a
non-standard metadata key.

**D3 — Where the portability detail lives, and how SKILL.md stays net-neutral.** Problem: install matrix +
capability map + isolation ladder is ~150 lines; SKILL.md has ~8 words of headroom against its 2888 ceiling.
Options: (a) inline in SKILL.md; (b) a new `references/platforms.md`; (c) spread across existing references.
Choice: **(b)** — progressive disclosure pushes on-demand detail into references. The SKILL.md surface gains
only one routing row + a reworded (not added) orchestration frame; the net word delta is held **≤ 0** by
tightening wording **only within the region being reframed** — not a compression sweep of unrelated prose
(which would be a drive-by refactor barred by §0.3, and is a *separate* backlog item). If net-neutral proves
infeasible without harming clarity, the word-ceiling change is **escalated to the user as its own decision** —
never a silent bump or a drive-by compression. Rejected: (a) impossible within the ceiling; (c) no single
source of truth for the install/capability story → drift.

**D4 — Reframe depth + Claude-Code posture (aligned).** Problem: how far to rework the Claude-centric framing,
without demoting Workflow for Claude users. Options: honest-minimal / **portable-baseline reframe** / full
tooling. Choice: **portable-baseline reframe** (user-aligned) — name **manual mode as the portable baseline**
and **Workflow mode as the Claude-Code acceleration layer**, reusing existing vocabulary. Crucially, **on
Claude Code Workflow mode stays the recommended L3 path** (it alone enforces round caps deterministically and
gives real subagent isolation); the reframe only makes the manual path first-class for runtimes lacking the
Workflow tool. Rejected: full tooling (breaks no-infra); honest-minimal (leaves the framing Claude-centric,
the gap this change closes). Basis: `docs/analysis-2026-07-10-cross-runtime-research.md` §6 + the alignment.

**D5 — Install / single-source-of-truth mechanism (aligned).** Problem: keep one canonical skill usable by
three runtimes. Options: document-only / helper script / external sync tool. Choice: **document per-platform
install** — opencode reads both `.claude/skills/` and `.agents/skills/`; Claude Code reads `.claude/skills/`;
Codex reads `.agents/skills/`, so documenting a copy to each covers all three with zero tooling
(`docs/analysis-2026-07-10-cross-runtime-research.md` §8). Canonical source stays the repo's
`three-loop-workflow/` folder. Rejected: helper script / external tool (add infra the skill forgoes; mentioned
as an optional pointer only).

**D6 — Fresh-reviewer-isolation realization ladder (the load-bearing invariant).** Problem: author≠reviewer
isolation (`three-loop-workflow/SKILL.md:33`) is realized on Claude Code by spawning a fresh subagent, but the
research confirms **no skill-callable subagent/orchestration API on Codex or opencode**
(`docs/analysis-2026-07-10-cross-runtime-research.md` §7), and a true single-agent runtime has none at all.
Options: (a) require subagents (makes the skill Claude-only); (b) redefine "fresh" purely by information
exposure and claim parity everywhere; (c) an **honest realization ladder** that uses the strongest mechanism a
runtime offers and *discloses* the weakest case. Choice: **(c)**. The ladder, best-to-weakest:
1. **Spawned subagent** (Claude Code; opencode's agent system if the model delegates) — full structural
   isolation; author identity never reviews.
2. **Fresh/cleared reviewer context** — where no skill-callable subagent exists, the review runs in a new or
   cleared session seeded with *only* the artifact + the review prompt template + the linked design/impl docs,
   never the author's reasoning. This isolates *information exposure* but depends on a genuine context reset
   (often operator-initiated).
3. **Disclosed degradation** — if neither is available, the skill **cannot self-enforce** isolation. The agent
   must **say so** (a positive instruction: "state that isolation is not runtime-enforced and request a fresh
   review session") and must **not** silently self-review. Self-review presented as fresh review is the failure
   this discloses.
Rejected: (a) defeats portability; (b) is the "asserted-but-not-observed" trap — it would imply a subagent-less
runtime gives the same guarantee, which it does not. The `compatibility` field and `platforms.md` state the
caveat honestly rather than implying parity. (See R5; the behavioral fixture tests the tier-2/tier-3 *decision*,
not a false claim that a Claude subagent proves tier-2.)

**D7 — Gate protection for the new clause.** Problem: a new reference with a cross-site claim (SKILL.md pointer
↔ `platforms.md`) can silently lose the pointer. Options: (a) a distinctive paired drift token + fixture
registration; (b) no gate. Choice: **(a)** — every registered commitment clause here is drift-gated. This is a
**single** token, the **portability drift token**, a distinctive literal (not a substring of the `platforms.md`
path, so a bare cross-link cannot satisfy it) present in both SKILL.md and `platforms.md` (AC1 asserts it in
both; AC3 greps it in `platforms.md`). Rejected: (b) — an ungated cross-site clause is exactly the v1.12.1
panel-angles drift the gate must catch.

**D8 — Termination rule for manual mode (restatement of existing L3 scope).** Problem: the reframe names manual
single-agent execution the portable baseline; a reader could ask which termination rule it uses. Options: (a)
leave implicit; (b) state explicitly. Choice: **(b)** — manual mode is an **L3 execution mode** (the
four-corner template is "authoritative regardless of which mode is used",
`three-loop-workflow/references/loop-3-development.md:3-8`), so it uses the **L3 termination rules, including
the clean-first-round relaxation** — a Phase whose first review is fully clean with no fix closes in one round —
exactly as `references/loop-3-development.md:63` and `references/schemas.md:55` already state ("the L3-only
clean-first-round relaxation; L1/L2 stay strict"). It is the **L1/L2** loops, not the L3 manual path, that keep
the strict two-generation rule (`SKILL.md:155`). `platforms.md` restates this for the portable reader and links
the canonical text; it introduces **no** new or changed rule (and denies the manual path nothing — important,
since the manual path is exactly what Codex/opencode run). Rejected: (a) — leaving it implicit is the
unresolved interaction the L1 review flagged.

## 5. Dependencies and Assumptions

Verbatim external/technical facts live, sourced, in `docs/analysis-2026-07-10-cross-runtime-research.md`
(§1–§8, each with its source URL and verification vote). Load-bearing summary:

- agentskills.io required fields = `name` (≤64) + `description` (≤1024); optional top-level `license`,
  `compatibility` (1–500, example *"Designed for Claude Code (or similar products)"*), `metadata`,
  `allowed-tools` (experimental) — research §1–§3.
- opencode: six discovery paths incl. `.claude/skills/` + `.agents/skills/`; native `skill` tool; unknown
  fields ignored; `allowed-tools` unrecognized — research §4, §3.
- Codex: `.agents/skills/`; `name`+`description`; optional `agents/openai.yaml`; `/skills` + `$skill`;
  `allow_implicit_invocation` — research §5 (single-source; Codex specifics lower-confidence).
- No skill-callable subagent/orchestration API confirmed on Codex or opencode — research §7. This is the direct
  basis for D6.
- Current skill frontmatter (`three-loop-workflow/SKILL.md:1-7`, read 2026-07-10): `name: three-loop-workflow`
  (kebab, matches dir ✓); `description` = **669 chars** (measured; ≤1024 ✓); `metadata.version: "1.12.3"`;
  `metadata.license: MIT`. SKILL.md `wc -w` = **2880** (ceiling 2888).
- Manual four-corner path already authoritative regardless of mode:
  `three-loop-workflow/references/loop-3-development.md:3-8`. Existing degraded modes:
  `references/escalation-rules.md:79-86` (STOP:QUESTION), `references/optional-subagents.md:92-96`.

Assumptions:
- The 669-char description is within every runtime's budget (opencode ≤1024; Claude Code truncates
  description+when_to_use at ~1536; Codex ~8000). Holds by measurement.
- A conformant reader ignores optional frontmatter it does not support (opencode states this; the spec defines
  `compatibility`/`license` as optional). **Flag:** how real Codex handles *extra* frontmatter beyond
  name+description is UNCONFIRMED (research §5, §10). Mitigation: additions are spec-standard optional fields
  only — the lowest-risk possible additions — and are documented as removable (R3).

## 6. Relationship with Existing Designs

- **No prior design covers cross-runtime portability.** Upstream analysis:
  `docs/analysis-2026-07-10-cross-runtime-research.md` (this task's evidence) and
  `docs/analysis-2026-07-07-external-skills-comparison.md`, which established the binding invariants this design
  honors: **stateless**, **self-hosted**, **no-infra (MD + JS)**, and the explicit "DO NOT ADOPT persistence /
  MCP / channel machinery" boundary (§4–§5). D5's document-only install and the no-tooling scope boundary are
  consistent with that boundary.
- SKILL.md anchors reused: the word ceiling + routing table (`SKILL.md:168-187`), the degraded-mode references
  (`SKILL.md:201-203`), and the Workflow-vs-manual split (`SKILL.md:178-179`; `loop-3-workflow.md:11`).
- **No conflict** with any existing design or discipline rule. The change is additive + reframing; D8 restates
  (does not alter) existing termination scope; the out-of-scope memory items (F11 / A3 / B3 / Tier-C) are
  untouched. Terminology anchors: CLAUDE.md _language-policy_ role (English) and SKILL.md. No warning-marker
  conflicts.

## 7. Acceptance Criteria (measurable + automatable)

- **AC1** — `bash three-loop-workflow/references/check-consistency.sh` exits 0: all existing commitment-clause
  tokens intact, the new portability drift token present in both sites, the new fixture registered, SKILL.md
  ≤ 2888 words, every `references/*.md` ≤ 3000 words.
- **AC2** — SKILL.md frontmatter parses as valid YAML and contains a **top-level** `license: MIT`, a
  `compatibility` value of length 1–500, and `metadata.version: "1.13.0"`, **and `metadata` no longer carries a
  `license` key** (the promotion is a **move**, not a copy — D2). Verify: `python3 -c` with `yaml.safe_load` +
  assertions (exact command in the impl doc).
- **AC3** — `three-loop-workflow/references/platforms.md` exists and contains, by grep: the three runtime names
  (`Claude Code`, `Codex`, `opencode`), the two install paths (`.claude/skills`, `.agents/skills`), a
  fresh-reviewer-isolation definition (a distinctive isolation-ladder phrase), the **portability drift token**
  (the single paired token from D7, also asserted in SKILL.md by AC1), and the L3 termination-scope restatement
  (D8 — the manual path keeps the L3 clean-first-round relaxation, pointing to `loop-3-development.md:63`).
- **AC4** — SKILL.md word count ≤ its pre-change baseline of **2880** (`wc -w`): net-neutral or net-negative on
  the always-loaded surface.
- **AC5** — `check-workflow-syntax.sh` passes for both `l3-phase.js` and `review-panel.js` (regression guard:
  the JS scripts are not edited).
- **AC6** — the new `tests/scenarios/*.md` fixture exists and is registered in `check-consistency.sh`. Run via
  a fresh subagent role-playing the disciplined agent on a **subagent-less** runtime, its `expected` asserts a
  **concrete observable**: the agent emits the tier-2/tier-3 instruction (obtain a fresh/cleared reviewer
  context, or disclose "isolation is not runtime-enforced — request a fresh review session") **and** produces
  **no** self-review verdict — not a judged "behaved correctly". (The fixture tests the agent's
  routing/disclosure *decision*; it does not claim a Claude subagent proves single-agent isolation.)
- **AC7** — `README.md` and `README-cn.md` each contain a cross-platform install section naming all three
  runtimes (grep for `Codex` and `opencode` in both).
- **AC8** — `description` char length ≤ 1024 (regression guard; expected unchanged at 669).
- **AC9** — the **full** `tests/scenarios/*.md` suite (existing + new), run via fresh subagents against the
  edited skill, each yields its declared `expected` verdict. This encodes the **CLAUDE.md Development Workflow
  behavioral gate**: this task reframes termination-adjacent SKILL.md / `loop-3-workflow.md` prose (the
  orchestration-mode framing sits next to the termination condition), so the full suite runs as a regression
  guard even though no termination *rule* changes.

## 8. Risks and Rollback

- **R1 — SKILL.md word count exceeds 2888.** Mitigation: additions are worded tightly and paid for only within
  the reframed orchestration/routing region; AC4 + the gate `wc -w` check fail loudly otherwise. If net-neutral
  is infeasible without harming clarity, **escalate the ceiling as its own decision** (do not compress unrelated
  prose, do not silently bump). Rollback: revert the SKILL.md hunk.
- **R2 — a reframe edit silently changes a discipline rule.** Mitigation: Scope Boundary forbids it; AC9 (full
  behavioral suite) + the gate's rule tokens (`two-generation`, `zero severe`, tier tokens) red-fail a dropped
  or altered rule; the skill-self behavioral GREEN check applies to any rule the reframe touches.
- **R3 — Codex rejects extra frontmatter → skill fails to load there.** Residual from the research gap (§5).
  Mitigation: additions are spec-standard optional fields only; a conformant reader ignores unsupported
  optional fields. Rollback: the fields are optional — dropping `compatibility`/top-level `license` restores a
  name+description+metadata frontmatter Codex documents as sufficient. No data/behavior migration.
- **R4 — the new drift token or fixture is under-specified → gate false-green.** Mitigation: a distinctive
  literal token (not a substring of the file path); the fixture follows the existing `tests/scenarios/` shape
  with a concrete `expected`; F re-runs the suite cold (AC9).
- **R5 — isolation is not runtime-enforceable on a true single-agent runtime.** This is real, not hypothetical:
  D6 tier-3 exists precisely because a runtime may offer neither a subagent nor a resettable context to the
  skill. Mitigation is **honesty, not a false guarantee** — `compatibility` + `platforms.md` state that full
  fresh-eyes isolation needs a runtime that can provide a fresh reviewer context, and the agent must disclose
  when it cannot self-enforce it (D6 tier-3). AC6 verifies the disclosure/routing behavior. Residual accepted:
  on such a runtime the discipline runs with operator-provided isolation, which is the honest ceiling.
- **Overall rollback:** additive across ≤ 8 files with **no schema / data / config / storage / API-version /
  dependency migration**. `git revert` of the feature commits fully restores v1.12.3.
