# CLAUDE.md Integration

This skill references the project's `CLAUDE.md` by **role**, not by literal heading name, so it remains portable across projects whose CLAUDE.md heading conventions differ. A role is a logical responsibility that some section of CLAUDE.md must fulfill. Each project pins concrete heading text to each role at the top of its CLAUDE.md (a short anchor map suffices).

## The five required roles

| Role | Responsibility |
|---|---|
| _repo-workflow_ | How tasks proceed in this repo: entry points, who triggers L1/L2/L3, escalation contacts, link to this skill |
| _load-bearing-docs_ | Concrete list of contract files protected by the full L1/L2/L3 cycle (typically SKILL.md, OpenAPI specs, schema definitions, public API contracts) |
| _language-policy_ | Language and terminology rules: which language is used in code, in process docs, in contract files; terminology-consistency requirements |
| _common-commands_ | Concrete value of `<TEST-CMD>` and other shell commands the workflow invokes |
| _engineering-norms_ | Project-level coding standards, architecture overview, anti-patterns, "what not to do" rules cited by the impl doc Engineering Constraints Index |

A project may add more roles, but **removing or renaming any of these five breaks the workflow's portability guarantee**. The role names and responsibilities are stable across projects so that a fresh agent can find the project-specific values regardless of what the project chose to call its sections.

## Anchor map convention

To make grep-based self-checks reliable, each project pins a short anchor map at the top of its CLAUDE.md mapping role names to actual heading text. Example:

```markdown
<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_ → "## Development Workflow"
- _load-bearing-docs_ → "## Load-Bearing Documents"
- _language-policy_ → "## Language Policy"
- _common-commands_ → "## Common Commands"
- _engineering-norms_ → "## Engineering Norms"
```

When this skill says "read the CLAUDE.md _common-commands_ role", grep for the literal heading text the anchor map points to. If a project adds extra roles, list them in the same anchor map so future tasks can resolve them too.

## Cross-file consistency checklist

When modifying any **commitment clause** below, the same commit must update both the source of truth and the reference site. Self-check before submitting. Each project extends this table with project-specific clauses in its own CLAUDE.md.

Items written in _italics_ are **roles**, not literal heading names. References to specific files (e.g., "skill SKILL.md") are literal — they refer to files inside this skill.

| Clause category | Source of truth | Required reference site |
|---|---|---|
| Coding philosophy (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution) | skill `SKILL.md` "Core principles" | review subagent prompts in `references/loop-1-design.md`, `references/loop-2-implementation.md`, `references/loop-3-development.md` (any violation is a severe issue) |
| Three-loop trigger conditions (when L1/L2/L3 apply) | skill `SKILL.md` "When this skill applies" | CLAUDE.md _repo-workflow_ role |
| CLAUDE.md role vocabulary | this file ("The five required roles") | CLAUDE.md anchor map at the top of the file |
| Four-corner subagent template | `references/loop-3-development.md` | impl doc Engineering Constraints Index |
| Commit prefix `fix(phaseN-roundR)` | `references/loop-3-development.md` "Commit conventions" | `references/loop-2-implementation.md` review template |
| External-process E2E trigger | `references/loop-3-development.md` "When to trigger" | CLAUDE.md _repo-workflow_ role (one-line forward reference) |
| Load-bearing document list | skill `SKILL.md` "When this skill applies" + CLAUDE.md _load-bearing-docs_ role | All listed contract files cross-reference each other in their headers |
| Language and terminology policy | CLAUDE.md _language-policy_ role | review subagent prompts in `references/loop-1-design.md` and `references/loop-2-implementation.md` |
| Test command `<TEST-CMD>` | CLAUDE.md _common-commands_ role | the "acceptance command" section of every impl doc |
| Project engineering norms | CLAUDE.md _engineering-norms_ role | impl doc Engineering Constraints Index |

When introducing a new commitment clause, register its source of truth and reference site in this table **before** modifying any file. If the new clause needs a CLAUDE.md anchor not in the five-role minimum, either reuse an existing role or extend the role vocabulary in the same commit (and update the project's anchor map).

## Self-check command examples

Substitute each `<role-anchor>` with the literal heading text the project's CLAUDE.md uses for that role. The anchor map at the top of CLAUDE.md provides the substitution.

```bash
# Confirm load-bearing docs are declared in CLAUDE.md and referenced in the skill.
grep -n "<load-bearing-docs anchor>" CLAUDE.md
grep -rn "load-bearing" path/to/three-loop-workflow/

# Confirm the commit prefix convention is intact.
grep -rn "fix(phaseN-roundR)" path/to/three-loop-workflow/

# Confirm the role vocabulary is defined and the anchor map is present.
grep -n "Required roles" path/to/three-loop-workflow/references/claude-md-integration.md
grep -n "anchor map\|role.*heading" CLAUDE.md
```

## Relationship between files

- **CLAUDE.md** (per project): project index. Provides project-specific configuration fulfilling each of the five roles, plus any project-specific extensions.
- **This skill** (`SKILL.md` + `references/`): cross-project meta-process. Three loops, design / impl review templates, four-corner subagent template, commit conventions, external-process verification constraints. Project-agnostic — no project-specific values live here.
- **Per-task outputs**: `docs/design/<task-slug>.md` and `docs/implementation/<task-slug>.md` are created on demand during L1 and L2. They are not maintained as a pre-existing library, and no README index is kept for these directories.

CLAUDE.md and this skill reference each other in read-only fashion to prevent content drift: process clauses live in this skill, project-specific configuration lives in CLAUDE.md. If you find yourself wanting to put a project-specific constant into the skill, or a process rule into CLAUDE.md, you have crossed the boundary — fix the placement before committing.

## Onboarding a new project to this skill

When introducing this skill to a project that does not yet use it:

1. Add the anchor map to the top of the project's CLAUDE.md.
2. Confirm each of the five roles is filled by an existing or new section. If any role is missing, write that section before any L1 task runs.
3. Pin the concrete `<TEST-CMD>` value in the _common-commands_ role.
4. List load-bearing contract files in the _load-bearing-docs_ role. The first task that touches one of these files will trigger the full L1 → L2 → L3 cycle, so the list must be accurate.
5. (Recommended) Run the self-check commands above to confirm the anchors resolve.

This is a one-time setup per project. After it's done, every functional change task can begin at L1 without re-bootstrapping.
