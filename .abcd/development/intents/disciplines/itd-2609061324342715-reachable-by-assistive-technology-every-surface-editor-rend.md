---
id: itd-2609061324342715
slug: reachable-by-assistive-technology-every-surface-editor-rend
spec_id: null
kind: discipline
suggested_kind: discipline
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Reachable by assistive technology

## Rule

Every surface Editor renders — the editor and its panels, the deck, the
article and its controls, and the presenter site — is operable by keyboard
without the Emacs chords, announces itself to a screen reader through
native semantics, or through ARIA where no native semantic exists, and
uses colour-safe defaults so that no state is conveyed by colour alone.

## Forbids

- A control, panel, or overlay reachable only by an Emacs chord, with no
  Tab-and-Enter or arrow-key path to the same action for a reader who does
  not know the binding table.
- A custom widget — a toolbar button, a toggle, a tray, a tab — with no
  role, no name, and no state exposed to a screen reader, where a native
  element (`button`, `input`, `nav`, a heading) would have supplied one for
  free.
- An icon-only control with no accessible name: a chord shown in a tooltip
  is not a substitute for a name a screen reader can read.
- A live change — a saved indicator, a publish outcome, an orphaned
  annotation, a validation message — reaching sighted readers only, with
  no equivalent reaching a screen reader.
- A state — unsaved, unresolved, orphaned, reviewed, the active layer, the
  current slide — carried by colour alone, with no text, icon, or pattern
  saying the same thing.
- Contrast low enough that the three reader themes (light, dark, sepia)
  fail to meet a plain contrast floor for body text and for the state
  markers this rule requires.
- Focus moving without a visible focus indicator, or an overlay that traps
  the keyboard on entry but leaves no way to reach it in the first place
  without a mouse.

## Binds From

Phase 2, because the article is the first reading surface with a public
audience: Bob and Carol reach it from a link, not from the app, and
neither has read the binding table. It governs every rendering added
afterwards — the presenter site and the single HTML file that carry the
same reader controls, and the deck wherever it is presented.

## How A Spec Proves It

- Given the article's reader controls (theme, text size, measure) at each
  of the three themes, When they are operated with Tab and Enter alone and
  no pointer, Then every control is reachable, its state is announced, and
  its action succeeds.
- Given the article rendered with no stylesheet, When its heading
  structure is inspected, Then Parts, Chapters, Sections, and Sub-sections
  form a correct heading hierarchy a screen reader can navigate by,
  independent of the Emacs movement chords.
- Given a custom control with no native equivalent — an easter-egg mark, a
  layer toggle, a rehearsal deck's flip control — When it is inspected,
  Then it carries a role and an accessible name, and its state (open,
  toggled on, scored) is exposed through ARIA rather than through colour or
  position alone.
- Given an unsaved chapter, an unresolved citation, and an orphaned
  annotation, When each is rendered, Then each carries a text or icon
  marker in addition to any colour, so a reader who cannot perceive colour
  sees the same state.
- Given the deck's slide controls on the presenter site, When they are
  operated by keyboard alone, Then horizontal and vertical movement both
  work with no chord from the desktop app's binding table required.
- Given the article and the presenter site in each of the three themes,
  When body text and every state marker are measured for contrast, Then
  each meets the plain contrast floor the spec cites.
- Given a reader using a screen reader opens the published article, When
  they reach the once-only quotation, an easter egg, or a video's poster
  and link, Then each announces what it is before it is activated.

## Why

`04-surfaces.md` section 4 gives the article a reading vocabulary "shared"
with the editor's — the same chords "move by section and by item, search
the text, and cancel whatever is open" — and states plainly that "Bob can
read the whole article without reaching for the mouse." That sentence is
half a promise: it is true for Bob if he knows the chords, and false for a
screen-reader user who does not, has never opened the desktop app, and
reached the page from a link the way `02-constraints.md` says every reader
does. The reader controls in the same section — theme, text size, measure
— exist because Bob and Carol "may be looking at a projector, a tablet, or
a phone," in `01-product.md`'s words; a control scheme that reads well on
a projector and fails a screen reader serves only part of that audience.
The three themes already carry the colour work this discipline needs: light,
dark, and sepia are "three palettes of the one article style," so a
colour-safe floor is one constraint on palettes Editor was already
building, not a fourth one. The article is named the rendering that "must
be perfect first" in `02-constraints.md`; a page that is perfect for a
sighted mouse user and unusable for a keyboard-only or screen-reader
reader is not perfect, it is untested in the direction this discipline
covers.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
