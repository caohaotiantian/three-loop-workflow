# Light Mode (the lighter tier for small, low-risk changes)

The full L1 → L2 → L3 → F cycle is proportionate for load-bearing and high-risk work, but a
heavyweight process applied to a two-file bug fix gets skipped — and skipped discipline is
zero discipline. **Light Mode** keeps the parts of the discipline that actually catch failures
while dropping the ceremony that does not pay for a small change. It is a *gated* tier: a hard
checklist forces Full Mode whenever the stakes are real, and the gate is fresh-eyes-enforced,
not author-asserted.

## When Light Mode is allowed

Light Mode applies only when **all** of the following are true:

- the change touches **≤ 3 non-load-bearing files** (>3 → Full; don't game the line by
  splitting one change into two tasks);
- **no breaking change** (schema / exit code / CLI / storage / protocol / directory — the
  canonical trigger list is in `references/escalation-rules.md`);
- **no new external contract**;
- **no unresolved >1-option design decision** and **no magic-number / threshold decision**.

If any of these fails, the change is **Full Mode**. **When in doubt → Full.** A *trivial,
non-commitment-clause* edit to a load-bearing doc (fixing a typo or formatting that changes no
rule) is the *None* tier — one independent review, not a cycle; any *substantive* edit to a
load-bearing doc is always Full Mode.

## What Light Mode keeps (the four non-negotiables)

1. **A short inline design brief** with exactly four mandatory fields — written to
   `docs/design/<task-slug>.md` (or an equivalent committed location), so a fresh reviewer can
   read it:
   - **What / why** — the change and its purpose.
   - **Explicit non-goals** — what this change does *not* do (Simplicity First).
   - **Any >1-option decision surfaced** — if a real choice exists, name the options and the
     pick. (If the choice has no clear winner, you are in Full Mode — escalate.)
   - **A measurable acceptance command** — a runnable `<ACCEPT-CMD>` (Goal-Driven Execution).

   Plan mode (shift-tab) is the idiomatic way to *draft* this brief, but the brief — not the
   transcript-resident plan — is the artifact the fresh reviewer reads.
2. **The same fresh-reviewer diff review** — author ≠ reviewer. A fresh subagent reviews the
   diff against the brief.
3. **The same round-cap → escalation** — 3 rounds, then escalate; never relax the bar.
4. **The four core principles** — Think Before Coding, Simplicity First, Surgical Changes,
   Goal-Driven Execution.

## What Light Mode drops

- The **separate L2 implementation document** (the four-field brief plus its acceptance command
  carry enough for a small change).
- The **F closeout consolidation** collapses to: the acceptance command exits 0, plus a
  one-line closure note in the brief (do not silently skip it — the doc-graveyard-prevention
  intent is preserved at minimal cost).

## The gate is fresh-eyes-enforced

The tier is chosen by the author, but the author's judgment is not trusted blindly. The
**Light-Mode review prompt must re-run the Full-Mode gating checklist against the actual diff**.
If the reviewer finds a load-bearing file, a breaking change, an unresolved >1-option decision,
or a magic-number / threshold the author missed, it **rejects the Light tier and escalates the
task to Full Mode**. This makes mis-tiering a caught error rather than a silent downgrade — the
exact failure mode the skill exists to prevent.
