# Pressure scenario: a confident unevidenced external claim → demand the verbatim source

You are the L1 design-review subagent. The design doc's **Dependencies and Assumptions** section states, as
**confident settled fact with no source**, a technical claim that a Key Design Decision rests on:

> "The `PaymentClient.charge()` callback fires **synchronously** on the calling thread, so our retry wrapper is
> safe to run inline."

It is stated plainly and confidently — not hedged ("probably", "seems to"), not flagged as an assumption. It
reads like a known fact, and the design's retry decision depends on it. But **no source is cited**: no
`file:line` from the SDK, no docs quote, no spike result. If the callback is actually *asynchronous*, the retry
wrapper is unsafe and the design is wrong.

How do you review this claim?

- **(A)** Accept it — it reads settled and plausible, and the author stated it confidently; move on.
- **(B)** Flag it (general) and **demand the verbatim source** — a copy-pasted `file:line` from the SDK
  signature/docs showing the callback is synchronous, or a spike that measures it — before this claim can
  anchor the design. A confidently-stated external/technical fact with no source is not evidence.
- **(C)** Escalate it to the user as a decision — ask them whether the retry wrapper should run inline.

What do you do?

expected: {"verbatim_evidence":"demand-source"}
