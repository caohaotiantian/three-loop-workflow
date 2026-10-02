# Delegation across agents — evidence record (2026-10-02)

What the delegation rules added to `SKILL.md` §3 on this date rest on. The skill states the rule and no
reason; every source, figure and disagreement lives here. Companion to
[`analysis-2026-09-17-orchestration-evidence.md`](./analysis-2026-09-17-orchestration-evidence.md), which
records the evidence behind v2.7.0's long delegation reference — the reference v3 retired as machinery and
this change restores, shorter, as requirements.

The pair `docs/why-v3-cn.md` has no counterpart here: the 2026-09-17 record has none either, and nothing
in this file is quoted by a shipped document.

## 1. Sources

| # | Title | Publisher / author | Date | URL | What it is | Grade |
|---|---|---|---|---|---|---|
| 1 | Don't Build Multi-Agents | Cognition (Yan) | 2025-06-12 | cognition.com/blog/dont-build-multi-agents | The best-known argument against multi-agent; implicit decisions conflict across parallel actors | opinion |
| 2 | Multi-agents working | Cognition | 2026-04-22 | cognition.com/blog/multi-agents-working | Concedes the narrow working class: writes single-threaded, intelligence parallel | vendor advice |
| 3 | How and when to build multi-agent systems | LangChain | 2025-06-16 | langchain.com/blog/how-and-when-to-build-multi-agent-systems | Independently restates 2's reader/writer split | vendor advice |
| 4 | Multi-agent research system | Anthropic | 2025-06-13 | anthropic.com/engineering/multi-agent-research-system | Orchestrator-worker; brief contents; results compressed through the coordinator | measured (one eval) |
| 5 | Building effective agents | Anthropic | 2024-12-19 | anthropic.com/engineering/building-effective-agents | Orchestrator-worker as a pattern, and when not to reach for it | vendor advice |
| 6 | Effective context engineering for AI agents | Anthropic | 2025-09-29 | anthropic.com/engineering/effective-context-engineering-for-ai-agents | Attention budget; sub-agents as a context-isolation device | vendor advice |
| 7 | MAST failure taxonomy | Cemri et al. | v3 2025-10-26, NeurIPS | arxiv.org/abs/2503.13657 | 14 failure modes over 1600+ traces and 7 frameworks, 150 human-annotated at κ=0.88 | measured |
| 8 | Contended parallel writers on one tree | arXiv | 2026-06-13 | arxiv.org/html/2606.15376v1 | Parallel writers on one tree, disjoint write sets included, passed 13% of 10 contended trials against a serialized baseline | measured, small n |
| 9 | Cohesion-aware partitioning | arXiv | 2026-05-31 | arxiv.org/html/2606.00953v1 | Partitioning by dependency cohesion beat file-level parallelism and a named vendor team mode on 28 repo tasks | measured, small n |
| 10 | Orchestration overhead | arXiv | 2026-02-03 | arxiv.org/abs/2602.03128 | A fixed model across 9 frameworks: orchestration alone cost >60× latency; interface mismatches cost up to 32 accuracy points | measured |
| 11 | More agents ≠ better | arXiv | 2025-03-03 | arxiv.org/abs/2503.01935 | Overall KPI fell as team size rose 1→3→5→7 on a research task | measured, small n |
| 12 | Multi-agent systems research | Anthropic | 2026-08-13 | anthropic.com/research/multiagent-systems | Independent agents are low-variance: shared priors repeat the same bad choice | measured |
| 13 | Agent Skills specification | agentskills.io | accessed 2026-10-02 | agentskills.io/specification | Defines no delegation primitive: a host need not be able to start an agent | normative |
| 14 | `/orchestrate` (native and Claude dialect) | this machine | read 2026-10-02 | `~/.omp/agent/commands/orchestrate.md` | One harness's own orchestration prompt: batch by dependency, self-contained briefs, verify the workspace, send shortfalls back to the same agent | vendor practice |
| 15 | Parallel-dive slices | installed skill | read 2026-10-02 | `~/.omp/agent/skills/`, `deep-dive-doc-slices` | Same shape: fixed section template, batched independent slices, closing slice re-derives every claim | vendor practice |

Raw findings for the two read-only surveys behind this table are in `.agent/delegation-rules/`
(working state, not committed): `research-web.md` (sources 1–13, 15) and `research-local.md` (14, 15 and
the harness's own agent API).

## 2. Rules added, and what each rests on

| Rule in `SKILL.md` §3 | Rests on |
|---|---|
| `Delegation buys isolation and parallelism, not understanding` — a fresh context lacks what this one has; the cheaper arm is a better brief or a better model here | 4 (a model upgrade beat a larger budget), 5, 6; the 2026-09-17 record §2 items 2, 4, 5 |
| `fan-out is a cost, not a default` | 7, 10, 11 — coordination is charged against the task, and more agents measured worse on a research task |
| `Split only work that stands alone, and write the split into the plan before dispatching it` | 9 (partition by cohesion, decided before spawning), 10 (interface mismatch is the dominant cost), 14 (one deliverable plus its acceptance check per slice) |
| `Parallel reading, serial writing` — extra contexts buy a read, a search, a second opinion, not concurrent writes | 1, 2, 3 (the one class all three endorse), 8 (parallel writers failed even on disjoint files), 9 |
| `a whole-state read makes even disjoint files unsafe` | 8 — the mechanism there is that a writer's *reads* span the whole tree, so file-level disjointness is not isolation |
| `A rework returns to the context that did it` | 14, 15 — the agent still holds what the rework needs, and a fresh one re-derives it |
| `Where two writers did run at once, a third context that wrote neither integrates … the review covers the merged change rather than either writer's part of it` | 8, 9, 10; v2.7.0's reference said the same before v3 cut it, and this change restores the requirement without its machinery |
| `each with a different angle added` (already in `deep.md`) — diversity comes from the role, not the count | 12 — independent agents share priors and repeat the same choice |

## 3. Considered and not adopted

- **Every number.** The shipped skill carries none, and none of the figures above survives a change of
  model, scaffold or workload (§4).
- **Machinery**: worktrees and their path traps, branch naming, mailbox and shared-task-list mechanisms,
  per-slice schema fields, model routing tables, spawn flags. All are one harness's API (13, 14), and the
  skill is loaded on hosts that need not implement them.
- **Agent teams as a recommended pattern** — experimental, and 9 measured a named team mode below plain
  sequential quality on its task set.
- **Topology prescriptions** (star, tree, graph, planner interfaces): one benchmark family (10), and
  implementation-defined.
- **"Share the full trace into the worker"**: 2 argues for it, 4/6 against an unbounded version — the
  skill splits the difference the sources do split: the brief carries the context the slice needs, the
  result comes back compressed.
- **A "when to parallelize" checklist or score**: nothing public measures fan-out on a *single* repository
  change with a reported n, which is exactly the case this skill is for.

## 4. Where sources disagree

- **Cognition vs Anthropic on coding.** 1 says do not build multi-agent for shared-context work; 2, its
  own follow-up, narrows that to *writes* while endorsing parallel intelligence; 4, 5 recommend the
  pattern narrowly and concede part of 1's ground. The skill takes the position 2 and 3 agree on.
- **Cost.** 4, 6 and the vendor cost docs give different multipliers for different workloads. None is
  stable enough to prescribe, which is why `fan-out is a cost` ships without a figure.
- **Verification depth.** Cheap deterministic checks versus adversarial cross-checking — 4/5 prefer the
  first, 10 shows the second's interface cost. The skill's order (gates before review) is the cheap-first
  reading, and `deep.md` keeps the adversarial pass for what cannot be checked mechanically.

## 5. Residual uncertainty

Written down so the next reader does not have to re-derive it:

- Almost every measured number above comes from one vendor or one paper; the independent triangulation is
  the reader/writer asymmetry (1, 2, 3, 8, 9) and the inter-agent misalignment class (7, 8).
- No source in this file measures a fan-out of several agents on one repository change with a reported
  sample size. The rules are stated at the strength the evidence supports, and the strongest measured
  claim — that concurrent writers on one tree fail even on disjoint files — is the one the skill states
  most bluntly.
- The change was reviewed on 2026-10-02 by two fresh readers of the diff, with different angles, and by a
  blind cold read of the two shipped files alone. The added text is prose, so `lint-skill.sh` bounds its
  form, not its truth.
