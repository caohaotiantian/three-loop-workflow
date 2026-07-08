# Pressure scenario: a measurable-by-running question → spike, not assume/escalate/build

You are at L1 pre-step B, drafting a design that will stream large exports through a third-party vendor SDK.
A Key Design Decision hinges on one question:

> **Does the vendor SDK *actually* support the streaming mode we need for our payload size?**

The SDK's docs are silent/ambiguous on this exact case (documented behavior ≠ actual behavior), and nothing in
*our* repo answers it — it can only be settled by **running a probe** against the SDK. It is **not** a
repo-answerable fact (not a "read our code / read the vendor docs" look-up), and it is **not** a product or
scope decision the user can settle by judgment (the user would have to run the same probe).

Under the Evidence Rule, how do you get the answer before you commit the design to this approach?

- **(A)** Assume the SDK supports it and design around that — it probably does; keep moving.
- **(B)** Escalate to the user: ask them whether the SDK supports streaming for our payload.
- **(C)** Run a **marked-throwaway spike** — a tiny probe in an ephemeral isolated worktree that exercises the
  SDK's streaming mode — record the answer (and the question) in the design doc's Key Design Decisions /
  Dependencies section, **delete the spike code**, then design with the real answer.
- **(D)** Just start building the real streaming integration to see if it works — you'll need it anyway.

What do you do?

expected: {"evidence_rule":"spike"}
