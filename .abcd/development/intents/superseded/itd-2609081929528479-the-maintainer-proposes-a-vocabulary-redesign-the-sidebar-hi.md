---
id: itd-2609081929528479
slug: the-maintainer-proposes-a-vocabulary-redesign-the-sidebar-hi
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609081716367990
origin: extracted-from-record
production_mode: hand-written
superseded_by: [itd-2609091722353594, itd-2609091722296239, itd-2609091722353838]
kind_at_supersession: null
superseded_on: 2026-09-09
---

# The maintainer proposes a vocabulary redesign: the sidebar hidden by default; C-x as the prefix for every standard dialogue (open, close, print, save, find) with a which-key style overlay listing the prefix's commands; C-c plus a single letter for everything specific to the document; C-x C-o to switch to the other window and to open the sidebar again; C-x C-h or a bare h to hide it from the sidebar. Three parts collide with Emacs or with each other and need settling before any build

## Press Release

_Not written. This proposal was considered and declined before it reached a
press release; the section is left unwritten deliberately rather than
back-filled for a shape that was never built._

## Why It Was Declined

The maintainer proposed rebuilding Editor's whole chord vocabulary around two
prefixes: `C-x` for every standard dialogue and `C-c` plus a single letter for
everything specific to the document. Three of its parts collided with Emacs or
with each other, which is what sent the proposal to a survey rather than to a
spec.

The survey is `.abcd/development/research/notes/2026-09-08-emacs-default-divergences.md`,
and it settled the question the other way. Read against vanilla Emacs's own
global map, Editor's table already agrees with Emacs almost everywhere it
matters, and the places it does not are mostly chords Emacs spends on
commands a Markdown editor has no analogue for. The proposal's own `C-c`
half, meanwhile, describes space Emacs deliberately leaves free for exactly
the kind of document vocabulary Editor already puts there — so the redesign
would have been rearranging what was already right.

Against that, the cost was concrete and large: 140 rows, 21 shipped intents
several of which name a chord literally in an Acceptance Criterion, doc pages
that print those chords for a reader, and the manual acceptance record behind
them. Realigning a chord already shipped, tested and documented costs more
than adding one that is free.

So the settlement recorded in `iss-2609081929528202` stands in this draft's
place: Editor follows Emacs's default bindings wherever Emacs has one, and
four additions are made in the free space rather than a vocabulary rebuilt.
The three intents named in `superseded_by` carry those additions.

What would show the settlement wrong: the maintainer finding, in use, that
the Emacs defaults they never reach for crowd out the Editor moments they do
— the exact risk the original grounds named. That is a finding to capture
against the settled intents, not a reason to reopen this draft.

## Why This Matters

Graduated from `iss-2609081716367990`: The maintainer proposes a vocabulary redesign: the sidebar hidden by default; C-x as the prefix for every standard dialogue (open, close, print, save, find) with a which-key style overlay listing the prefix's commands; C-c plus a single letter for everything specific to the document; C-x C-o to switch to the other window and to open the sidebar again; C-x C-h or a bare h to hide it from the sidebar. Three parts collide with Emacs or with each other and need settling before any build. Read that issue record for the source observation.

## Mechanism

> _Prompted (the claim-recording gradient): why the authors expect this to work, as a falsifiable "we expect X because Y" — not the outcome restated. Replace this line with the claim, or with the exact token `None stated.` alone on its line to record the claim as considered and declined._

## Scope Conditions

> _Required (the claim-recording gradient): the population, platform, scale, or assumptions this claim holds under, one per top-level bullet — `abcd intent plan` stamps each with a persistent identity. Replace this line with those bullets, or with the exact token `None stated.` alone on its line._

## Acceptance Criteria

> _Required (the itd-1 discipline): add at least one Given-When-Then bullet describing the verifiable bar for "shipped" before this draft can be planned._

## Open Questions

_None recorded yet._

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
