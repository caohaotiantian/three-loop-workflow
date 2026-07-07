# External Skills Audit & Comparison — mattpocock-skills, Trellis vs three-loop-workflow

**Date:** 2026-07-07
**Scope:** Deep audit of two external Claude skill collections in `../skills/`, compared against this
repo's `three-loop-workflow` skill (v1.6.0), producing a ranked, constraint-filtered improvement backlog.
**Method:** Two parallel Opus subagents (read-only) audited each collection; findings cross-checked against
this repo's `SKILL.md` + all `references/`. This document is analysis only — not a load-bearing skill file.

---

## 0. Executive summary (Minto top)

Three-loop-workflow is **structurally ahead** of both external systems on review discipline — it is the only
one of the three with an **adversarial multi-voter panel** and a **two-generation termination rule**. Both
external systems stop review at *first green*, which is strictly weaker. So the improvement opportunity is
**not** structural.

The gap is the **craft-and-human-factors layer** — exactly what this repo's own MEMORY backlog already
flagged (2026-06-15: *"craft/human-factors layer is the gap, not structure"*). The two collections are the
strongest available sources for filling it:

- **mattpocock-skills** contributes a rigorous **meta-theory of skill-writing** (the `writing-great-skills`
  glossary: predictability, the two loads, leading words, the negation failure mode, completion-criterion
  clarity-vs-demand) plus intent-preservation machinery (changesets, `.out-of-scope/`, ADR gate).
- **Trellis** contributes **behavioral loop-closing** — most importantly `trellis-break-loop` (turn a fixed
  bug into a permanent guardrail) and the brainstorm **Evidence Rule** (never ask what the repo can answer).

The single most valuable, best-fitting, anti-bloat-compatible imports are all **pure-Markdown, stateless,
self-hosted-friendly**. Trellis's persistence/MCP/channel machinery must **not** be adopted — it is the exact
opposite of three-loop's stateless-per-invocation design. §5 ranks the backlog; §6 recommends the first cycle.

---

## 1. What each system is (high-level design)

### 1.1 three-loop-workflow (this repo)
A **single, self-hosted, stateless** Claude skill enforcing a top-down review cycle:

```
L1 Design doc ──▶ L2 Implementation doc ──▶ L3 Development (dev→review→accept→fix) ──▶ F End-to-end closeout
   round cap 3        round cap 3               round cap 3 per Phase                    (project-wide gates)
        │                  │                          │
        └── two-generation termination: pass = zero severe this round AND a prior round zero general
```
- **Named roles**, fresh-reviewer isolation (author ≠ reviewer), tier gate (Full / Light / None by blast
  radius), optional **N-voter adversarial panel** with mechanical union counting, JS **Workflow scripts**
  (`l3-phase.js`, `review-panel.js`) for L3 orchestration, and **Markdown behavioral scenarios** as the
  acceptance fixture for the discipline itself.
- **Design invariants:** anti-bloat (SKILL.md ~2878/2888-word ceiling — **~10 words of headroom**),
  stateless per invocation (git history is the only memory), self-maintained by its own L1→L2→L3→F cycle,
  no Python / no MCP / no external infra.

### 1.2 mattpocock-skills
A **broad collection of ~35 small, composable skills** across `engineering/`, `productivity/`, `misc/`,
`personal/`, `in-progress/`, `deprecated/` — *lifecycle-as-directory*. Explicitly **rejects process-owning
frameworks** (`README.md:17`: "Approaches like GSD, BMAD, and Spec-Kit… take away your control"). Skills
compose by **prose `/invocation`**, never cross-file links. Machinery: **changesets** (semver + intent),
**ADRs**, **`.out-of-scope/` KB**, a router skill (`ask-matt`), and a full **meta-model of skill authorship**
(`writing-great-skills` + `GLOSSARY.md`). Split axis: **who can reach a skill** (user-invoked vs
model-invoked), governed by the two costs — *context load* and *cognitive load*.

### 1.3 Trellis
A **spec-driven, multi-agent, persistent** development framework (npm `@mindfoldhq/trellis`, AGPL-3.0). Thesis
(`README.md:11`): *"AI writes code fast, but every session it starts from scratch… Trellis persists specs,
tasks, and memory into your repo."* Architecture = a **persistence layer that survives context compaction**,
wrapped in a 4-phase workflow (Plan → Execute → Finish) with roles **architect / plan / research / implement
/ check**. State lives in five durable stores (spec, task, workspace/journal, runtime session, channel event
log), re-injected every turn by hooks. A separate **channel/forum** runtime spawns peer worker processes over
an event-sourced JSONL bus.

---

## 2. Side-by-side comparison

| Dimension | three-loop-workflow | mattpocock-skills | Trellis |
|---|---|---|---|
| **Core unit** | One gated cycle | Many small composable skills | Spec + task graph + agents |
| **State** | Stateless (git = memory) | Stateless; some setup config | **Heavy persistence** (5 stores) |
| **Review termination** | **Two-generation + N-voter panel** | First green (code-review 2-axis) | First green ("until green") |
| **Cross-task learning** | ✗ (findings die in git) | `.out-of-scope/` + changesets | **`break-loop` → spec writeback** |
| **Craft meta-theory** | Implicit (anti-bloat instinct) | **Explicit** (`writing-great-skills`) | First-principles + python-design |
| **Composition** | Internal references | Prose `/invocation` | Files + `task.json.status` |
| **Human-in-loop discipline** | Escalation rules, question quality | **Grilling, HITL/AFK tags** | Brainstorm 1-at-a-time + Evidence Rule |
| **Infra footprint** | None (MD + JS) | None (MD + shell) | **Node CLI + Python + MCP + hooks** |
| **Anti-bloat governance** | `wc -w` gate, paired-token gate | Two-loads model, leading words | Injection layer, breadcrumb contract |

**Reading:** three-loop wins **review rigor** and **infra minimalism**; mattpocock wins **authoring craft**
and **intent preservation**; Trellis wins **memory/loop-closing** and **multi-agent coordination** (at the
cost of heavy infra three-loop deliberately forgoes).

---

## 3. Deep dive — the transferable craft (mattpocock)

- **Predictability is the root virtue** (`writing-great-skills/SKILL.md:7`): *"A skill exists to wrangle
  determinism out of a stochastic system. Predictability — the agent taking the same process every run, not
  producing the same output — is the root virtue."* Every lever serves it.
- **The two loads** govern all granularity: **context load** (model-invoked descriptions sit in the window
  every turn) and **cognitive load** (the user must remember user-invoked skills). *"split only when the cut
  earns it."*
- **Leading words (Leitwort)** (`GLOSSARY.md:131`): a pretrained concept repeated *as a token, never as a
  sentence*, accumulating a distributed definition and anchoring behavior. The compression lever — *"'fast,
  deterministic, low-overhead' → tight"*, *"'a loop you believe in' → red."* Directly relevant to this
  repo's word ceiling.
- **Negation failure mode** (`GLOSSARY.md:163`): *"Steering by prohibition… drags the forbidden behaviour
  into context and makes it more available, not less… the ban half-reads as an instruction to do the thing."*
  Cure: **prompt the positive**; keep a prohibition only as a hard guardrail *paired with the positive
  target*. → three-loop's discipline files are **prohibition-dense**; this is a direct, low-effort win.
- **Completion criterion = clarity × demand** (`GLOSSARY.md:139`): clarity resists *premature completion*;
  **demand** ("every modified model accounted for") sets how much work is forced — and it binds even flat
  reference, independent of steps. → sharpens three-loop's per-round predicate and F checklist.
- **`_Avoid_` banned-synonym lists** on every glossary term (e.g. seam *"Avoid: boundary"*). → three-loop
  checks role-name **presence** but not **drift into synonyms**; `_Avoid_` lists make drift grep-enforceable.
- **Intent preservation:** `.out-of-scope/*.md` (rejected requests kept with reasoning so they don't
  return), **changesets** (semver-tagged *why*), and the **ADR three-part gate** (record only if
  hard-to-reverse AND surprising-without-context AND a real trade-off — `domain-modeling/SKILL.md:68`).

## 4. Deep dive — the transferable behavior (Trellis)

- **`trellis-break-loop`** (`SKILL.md:105`): *"The value of debugging is not in fixing the bug, but in making
  this class of bugs never happen again."* Mechanism: 5-dimension root-cause (Missing Spec / Cross-Layer
  Contract / Change-Propagation Failure / Test-Coverage Gap / Implicit Assumption), Bayesian confidence
  framing, and a **hard writeback** — *"The analysis is worthless if it stays in chat. The value is in the
  updated specs."* → three-loop has **no** cross-task learning; a fixed bug leaves no guardrail.
- **Brainstorm Evidence Rule** (`trellis-brainstorm/SKILL.md:15`): *"If a question can be answered by
  exploring the codebase, explore the codebase instead… Do not ask the user to confirm facts the repository
  can answer."* Every question carries decision + why + recommended answer + trade-off. → sharpens
  three-loop's L1 pre-step B and escalation question-quality rules.
- **Architect blast-radius output template** (`architect.md:260`): a fixed reviewer shape —
  `[RECOMMENDATION] / [DESIGN SHAPE] / [REJECTED ALTERNATIVES] / [BLAST RADIUS] / [VERIFICATION: exact
  commands] / [OPEN QUESTIONS]` + a **Red-Flags checklist** of concrete drift patterns. → three-loop already
  names `blast-radius` in F; this is a ready-made structured reviewer contract.
- **Provider-diverse reviewers** (`workflows.md:74`): run one reviewer on a *different model* to decorrelate
  blind spots. → three-loop's panel already supports per-corner `models` routing; validate + document.
- **Dispatcher-wait anti-pattern** (`trellis-channel/SKILL.md:51`): never trust an LLM worker to emit a
  signal token — *"LLM workers commonly write the tag string into prose instead of running the CLI command."*
  Derive completion from the harness envelope. → an orchestration-robustness note for `review-panel.js`.
- **"Capability, not ceremony" + "When NOT to use"** (`session-insight/SKILL.md:29`): every soft skill states
  when *not* to fire. → aligns with three-loop's tier gate; reduces over-triggering.
- **DO NOT ADOPT:** the persistence machinery (`task.json` state machine, `add_session.py` 567-line journal
  writer, runtime session pointers), the channel/MCP runtime, and GitNexus MCP. All presume durable
  multi-day/multi-dev state — the exact inverse of three-loop's stateless invariant.

---

## 5. Ranked improvement backlog (constraint-filtered)

Each item scored against three-loop's four binding constraints: **anti-bloat**, **stateless**,
**self-hosted**, **no-infra (MD+JS)**. ✅ = fits cleanly, ⚠️ = fits with care, ✗ = do not adopt.

| # | Improvement | Source | Value | Effort | Fit | Where it lands |
|---|---|---|---|---|---|---|
| 1 | **Negation → positive rewrite pass** across SKILL.md + references; keep prohibitions only as positive-paired guardrails | MP §3 | High | Low | ✅ | Edits in place; net-neutral/negative on word count |
| 2 | **Failure-retrospective step** (break-loop): after a bug fix / round-cap event, root-cause the *class* and write a durable prevention note | Trellis §4 | High | Low–Med | ✅ | New `references/`; F-phase + escalation trigger |
| 3 | **`references/authoring-principles.md`** — compressed craft meta-model (predictability, two loads, leading words, negation, clarity×demand) for the skill's own maintainers | MP §3 | High | Med | ✅ | New reference; feeds self-hosted review |
| 4 | **Leading-word compression sweep** to reclaim word-ceiling headroom while sharpening | MP §3 | High | Med | ✅ | Edits in place; **net-negative** on SKILL.md |
| 5 | **`_Avoid_` synonym guards** on the 5 role names + core terms; grep-enforce in `check-consistency.sh` | MP §3 | Med-High | Low | ✅ | `claude-md-integration.md` + gate |
| 6 | **Brainstorm Evidence Rule** — exhaust repo evidence before escalating a question | Trellis §4 | Med-High | Low | ✅ | `loop-1-design.md` pre-step B + escalation |
| 7 | **Architect-style structured review output** + Red-Flags checklist for L1 design review | Trellis §4 | Med | Low | ✅ | `loop-1-design.md` review template |
| 8 | **`docs/out-of-scope/` KB** — rejected *design directions* for the skill kept with rationale | MP §3 | Med | Low | ✅ | New docs dir |
| 9 | **Changeset-style intent records** tied to the version bump | MP §3 | Med | Med | ⚠️ | Process; overlaps commit convention |
| 10 | **ADR three-part gate** for load-bearing skill decisions | MP §3 | Med | Low | ✅ | A rule, not infra |
| 11 | **Provider/model-diverse voters** — document + default a decorrelating voter | Trellis §4 | Med | Low | ✅ | `multi-voter-review.md` + panel script |
| 12 | **Dispatcher-wait robustness note** in `review-panel.js` (don't trust a model-emitted signal token) | Trellis §4 | Med | Trivial | ✅ | Script comment / guard |
| 13 | **"When NOT to use" clauses** on optional modes (panel, teams) | Trellis §4 | Med | Trivial | ✅ | Edits in place |
| 14 | **Scenarios reframed as no-op verdicts** (does removing line X change behavior?) → bloat detector | MP §3 | Med | Low | ✅ | `tests/scenarios/` framing |
| 15 | Heavy persistence / channel / MCP | Trellis | — | — | ✗ | **Reject** — breaks stateless invariant |

**Convergence note:** items 1–7 are where *both* audits point and all clear every constraint. They are the
craft/behavioral layer the existing MEMORY backlog predicted would be the gap.

---

## 6. Recommendation for the first improvement cycle

Do **not** batch the backlog — the skill's own rule (one design doc = one coherent subsystem) forbids it, and
SKILL.md has ~10 words of headroom, so breadth must buy its way onto the always-loaded surface. Run one
**coherent, high-value, well-scoped** Full cycle first, then iterate. Three coherent candidates:

- **A. Craft-layer refactor** (items 1, 3, 4, 5) — import the authoring meta-model and apply negation→positive
  + leading-word compression + `_Avoid_` guards. *Highest leverage for a self-hosted skill; net-negative on
  word count; but broad blast radius (touches many files).*
- **B. Failure-retrospective capability** (item 2, + 6/7 support) — the single biggest *structural gap*:
  three-loop has no way to turn a fixed bug into a permanent guardrail. Clean subsystem: one new reference,
  one F/escalation trigger, one new behavioral scenario. *Best fit-to-value ratio; surgical.*
- **C. Design-review sharpening** (items 6, 7, + 1 locally) — Evidence Rule + structured architect output +
  Red-Flags in L1. *Tightest scope; improves the earliest, highest-leverage loop.*

**Recommendation: B** — it adds a genuinely missing capability (cross-task learning within the stateless
model: the prevention note is just committed Markdown, git = memory), is surgical enough to respect the
word ceiling, and is directly testable by a new `tests/scenarios/` fixture. A and C then follow as separate
cycles.
