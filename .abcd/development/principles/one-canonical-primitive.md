# One canonical primitive

## The convention

Before adding anything generic-smelling — a parser, an index, a renderer, a
notation converter, a piece of state — find where that question is already
answered in this repository and extend it. Never add a third copy. Adding a
second is a decision that has to be argued; adding a third is not a decision,
it is a drift that has already happened.

## Why it earns its keep

Two answers to one question do not stay equal. They diverge, and the divergence
shows up as a bug nobody can locate, because each copy is locally correct. The
worst version is two answers in different notations: each is right, and the
seam between them is wrong in a way neither file reveals.

Extending the canonical home is also cheaper than it looks. A primitive that
already serves one caller usually needs a parameter, not a rewrite, to serve a
second — and the parameter is visible to a reader in a way a parallel
implementation is not.

## What it costs

Reading before writing, and sometimes generalising something that worked
because it was specific. A generalisation that makes the original caller harder
to read is a bad trade, and the honest answer there is a second primitive with
its reason stated.

## How to tell it is being followed

- A new module answering a question an existing module answers, with no
  statement of why the existing one could not be extended.
- Two notations for the same thing with a converter between them, where the
  converter has an inverse written by hand. Mapping the canonical form
  *forward* and comparing is correct by construction; an inverse is a second
  notation table that can drift from the first.
- A private helper exported and given one parameter, so two callers share one
  answer, is the shape of this working.

## Related

[Loud staging](loud-staging.md) is what a primitive does when it cannot answer.
