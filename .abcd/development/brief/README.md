# Brief

The brief is the whole canvas: what Editor is, what it is made of, what is
proven, how it is cut into work. It is the "what". Intents are the "why",
one user moment each, and every intent is written from this brief alone.

Everything here is current state, in the present tense. A chapter is
rewritten when the design changes; nothing in it narrates the change.

## Chapters

| Chapter | Holds |
|---|---|
| [`01-product.md`](01-product.md) | What Editor is, for whom, its shape, the reference prototypes, and the assumptions still genuinely open |
| [`02-constraints.md`](02-constraints.md) | The locked decisions. Authoritative: where another chapter disagrees, this one wins |
| [`03-evidence.md`](03-evidence.md) | What the prototypes and the acceptance project prove, the open questions, and the trade-offs taken with the alternative rejected |
| [`04-surfaces.md`](04-surfaces.md) | One section per user-facing surface: what Alice, Bob, and Carol see and do |
| [`05-internals.md`](05-internals.md) | The plumbing: disk model, Markdown canon and its exact syntax, rendering core, shell, manifest, anchors, pipeline, site layout |
| [`06-delivery.md`](06-delivery.md) | Build sequence in phases, the de-risking spike, what is out of scope, definition of done |
| [`07-intent-map.md`](07-intent-map.md) | How the work is cut into intents, and the rule used to cut it |
| [`glossary.md`](glossary.md) | One entry per term the brief uses |

## Reading guide

- **New to the project:** read `01-product.md`, then `02-constraints.md`,
  then `04-surfaces.md`. That is the product.
- **Writing an intent:** read `01`, `02`, `07`, and the surface sections in
  `04` that the intent draws on. `07` names which surfaces belong to which
  intent and where the boundary falls.
- **Implementing:** read `05-internals.md` and `06-delivery.md`, with `02`
  beside them. `05` writes out the exact on-disk forms.
- **Deciding something:** check `03-evidence.md` first. It carries the open
  questions and the trade-offs already taken.

## Conventions

- People are Alice (the author), Bob and Carol (readers and audience).
- Paths are relative to the repository root or to a document folder, never
  to a machine.
- A detail marked **open** is undecided; `03-evidence.md` holds the
  question and its candidate answers.
- Research notes under [`../research/notes/`](../research/notes/) record the
  maintainer's prototypes and the acceptance project by form only.
