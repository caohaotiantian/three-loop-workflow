# Writing

Read this before you write English for this task. That English covers a reply, a question, an explanation,
and the plan. It also covers the hand-off, the commit message, a comment in code, and a report the change
produces.

**Write all your English in ASD-STE100 Simplified Technical English, Issue 9 (2025-01-15).**

Apply the structural rules in full: the grammar, the sentence length, the punctuation. Apply the lexical
rules as a direction of travel. The approved dictionary of about 900 words is not available offline, so
do not claim dictionary compliance. The standard is at
<https://www.asd-ste100.org/STE_downloads.html>.

This rule covers the prose this task writes. It does not cover a document that the change edits, or text
that the change only touches.

## Words

- Use one word for one meaning. Do not rotate synonyms ("check", "verify", "confirm") for one action.
- Use a plain verb for an action. Do not use a noun form of the action. Write "analyze the log", not
  "perform an analysis of the log".
- Do not use phrasal verbs (Rule 9.3). Write "remove", not "take off". Write "start", not "spin up".
- Do not use marketing adjectives (seamless, robust, powerful). Delete the word, or give the measurement
  that earns the claim.
- Keep the technical nouns and the technical verbs of the domain. Define a term at its first use if the
  term is not common English.
- Use one term for one item in the whole document.
- Do not use Latin abbreviations. Write "for example", "that is", or nothing.
- Do not use contractions. Write all words in full.

## Grammar

- Use these verb forms only: infinitive, imperative, simple present, simple past, simple future, and past
  participle as an adjective.
- Use the active voice. In descriptive writing, use the passive voice only when the agent is unknown
  (Rule 3.6).
- Do not use "-ing" as a verb tense.
- Do not omit the article, the subject, or the verb. Omit the article only in a general statement
  ("Solvents can cause damage to paint.").
- Use the past participle as an adjective freely ("the disassembled unit"). This is not the passive voice.
- Use one part of speech for one word. Write "apply oil to the valve", not "oil the valve".

## Sentences

- Maximum 20 words in each sentence of a procedure, an instruction, a warning, or a caution. Maximum 25
  words in each sentence of a description.
- Write one instruction in each sentence. Use two instructions in one sentence only when the two actions
  occur at the same time.
- Write an instruction in the imperative form. Write "Remove the four screws.", not "The four screws must
  be removed."
- Put a condition before the command. Separate the condition and the command with a comma. Write "If the
  pump runs, turn it off."
- Do not use the semicolon (Rule 8.1). Write two sentences.
- Use a vertical list for a sequence of 3 or more steps, items, or conditions. Use one marker style. Use
  the same grammatical level for all items.
- Use one topic for each paragraph. Maximum 6 sentences in a paragraph.
- Use "WARNING" for a risk of injury or death. Use "CAUTION" for a risk of damage. Start with the command
  or the condition. Give the result of the risk.
- Write "NOTE" text as information only. Do not put an instruction in a note.
- Keep the strength of each hedge ("may", "can", "probably"). A shorter sentence must not become a
  stronger claim. Do not add a fact that the source does not state.
- Before you send text, do these checks:
  - Split each sentence that is longer than the limit.
  - Change each passive construction with a known actor to the active voice.
  - Change each "-ing" verb to a simple tense.
  - Select one term for one item.

## Visuals

Show the structure of the content when the structure is real. Do not add a diagram for decoration.

- Use a Mermaid diagram for a flow, a sequence, a state machine, or a relationship:
  - `flowchart` for a process or a dependency.
  - `sequenceDiagram` for the order of messages.
  - `stateDiagram-v2` for states and transitions.
  - `erDiagram` for a data model.
  - `gantt` for a schedule.
- Use a table for a comparison, a set of options, or a group of key-value facts, not a vertical list.
- Use HTML when the artifact is interactive or rich, as for a report, a dashboard, or a chart. Open the
  artifact in a browser. Check it before you deliver it.
- A Mermaid diagram in a terminal becomes ASCII. Keep the diagram small. Do not use color or style
  directives that the ASCII renderer drops.
- If a diagram and the text disagree, correct the diagram.
- Use a diagram only when one sentence is not sufficient.
