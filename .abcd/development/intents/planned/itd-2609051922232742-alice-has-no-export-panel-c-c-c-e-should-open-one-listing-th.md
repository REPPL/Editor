---
id: itd-2609051922232742
slug: alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th
spec_id: spc-2609051927564472
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609051922220654
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Export what I have made to a folder I choose

## Press Release

Alice has a talk on Thursday and a document that is ready for it. She
presses `C-c C-e` and a panel opens over the text, listing what Editor can
write from the document as it stands. Three rows can be written now: the
deck as a folder, the article as a folder, and a dry run of a publish.
Each row says where it writes and what it puts there before she confirms
anything — the deck row names the folder it will create, the built slides,
the deck engine that runs them, and every asset the chapters reference.
Two further rows sit below, marked not yet available with the phase each
arrives in: one HTML file that reads anywhere, and the journal PDF. Alice
can see what the app does and what it does not do without leaving the
panel. `C-g` closes it and nothing is written.

She chooses the deck. The native folder dialog opens beside her document
folder, never inside it, and she picks a folder on her desktop. Editor
writes it: the deck's page, the engine it needs, and the images the
chapters use, copied under names that need no escaping. She double-clicks
the page and the deck runs in her browser with every slide, every image,
and every speaker note in place, with no network and nothing installed.

Thursday's room has a machine that will not join the network and a
projector that will. Alice copies the folder onto a memory stick, Bob
opens the page on the room's machine, and the talk runs from disk. Carol,
who could not come, gets the article folder the same way and reads it on
her laptop that evening.

The third row does the other job. The dry run stages the version a publish
would push and opens that folder in the Finder, so Alice can look at
exactly what would go to the site before anything leaves her machine. All
three rows are written by the builder the publish itself uses, so the
folder she carries into the room holds the same bytes the site will serve.
No export writes anything into the document folder, and no export touches
the network.

## Why This Matters

Alice's work is only as portable as the machine it was made on. Without
this panel her local options are a link that needs the network and a
publish she cannot inspect until it has already happened: she cannot hand
a colleague a folder, present from a room that is offline, or look at what
a publish would push before pushing it. The panel makes every file the app
is willing to write visible in one place, with its destination and its
contents stated in advance, so writing to disk is a thing Alice decides
rather than a thing she discovers afterwards.

## Mechanism

- We expect one panel that names each export's destination and contents
  before Alice confirms to be read rather than skipped, because the
  keyboard prototype recorded in `03-evidence.md` proves that an overlay
  which owns the keyboard while it is open, lists what it offers, and is
  cancelled by one chord is legible to a keyboard user; the same prototype
  supplies the cancel rule this panel obeys.
- We expect the exported deck to run from disk because the slide prototype
  proves a dependency-free build with the engine carried beside the
  content, and records that "a CDN is acceptable on the site and
  unacceptable in the single file" — a folder opened from a memory stick
  is the offline case, not the site case.
- We expect the folder Alice carries and the version the site serves to
  agree because both come from the same build step, which
  `05-internals.md` section 4 makes a function of the tree and the variant
  alone. A second builder for local output would be a second place for the
  renderings to disagree, and the brief's answer to that is that "a
  rendering difference between hosts is a bug in the core".
- We expect the exported folder to carry nothing of Alice's machine
  because every asset the build copies is named by its path relative to
  the document root and lands under a published name, as `05-internals.md`
  sections 1 and 6 require of the document folder itself; the export
  inherits that naming rather than inventing one.
- We expect defaulting the destination beside the document, and refusing a
  destination inside it, to keep the document a source and only a source,
  because a rendering written into the document folder is a rendering that
  can be read back as input, which the *one source, always* discipline
  forbids.
- The falsifier the source observation names: if authors export rarely
  enough that a single menu item with a dialog would serve, the panel is
  ceremony. It is wrong if Alice, after a term of use, has used one row
  and never read the others.

## Scope Conditions

- Platform: the desktop app in its web view on macOS, with the shell's <!-- cond: cond-2609051927563540 -->
  native folder dialog and its reveal-in-Finder. There is no export panel
  in the single HTML file or on the presenter site.
- Population: Alice, the author, at her own machine. Bob and Carol receive <!-- cond: cond-2609051927562061 -->
  a folder; neither has an export panel of their own.
- Phase: this is phase 1, so an export carries copied assets only. A <!-- cond: cond-2609051927568274 -->
  referenced asset above the threshold is intent 15's
  (`itd-2609051402126424` sets the threshold and the roots; intent 15 owns
  what an export then links to), and this intent adds no behaviour of its
  own for one.
- Boundary with intent 7 (`itd-2609051335468596`), publish: 7 owns <!-- cond: cond-2609051927560765 -->
  publishing, the stable id, the version hash, the flag, the push, and the
  dry run's staging — what is staged and where. This intent owns only the
  row that names the dry run in the panel, states what it writes, and
  opens the staged folder for Alice to look at.
- Boundary with intents 5 and 6 (the deck bundle): 5 and 6 own what the <!-- cond: cond-2609051927569197 -->
  deck contains — the default mapping and the constructs that shape it.
  This intent owns only that the deck those two define is written into a
  folder Alice chooses, with the engine and the assets beside it.
- Boundary with the article bundle (intents 9 and 10, phase 2): those own <!-- cond: cond-2609051927560440 -->
  the page's layout, its margin notes, and its reader controls. This
  intent owns only that the built page and its assets are written into a
  folder; it adds nothing to what the page says.
- Boundary with intent 17 (`itd-2609051335570842`), the single HTML file: <!-- cond: cond-2609051927567253 -->
  17 owns the file, its embedding, and its offline behaviour. This intent
  owns only the row that lists it as not yet available and names the phase
  it arrives in.
- Boundary with intent 21 (`itd-2609051336019782`), the journal PDF: 21 <!-- cond: cond-2609051927561892 -->
  owns the printed artefact and the pipeline step that renders it, which
  never runs in the app. This intent owns only the row that lists it as
  not yet available and names its phase.
- Boundary with intent 2 (the editing surface bundle): 2 owns the binding <!-- cond: cond-2609051927562246 -->
  table and the contract every overlay obeys — that it takes the keyboard
  while open and that one cancel chord closes it. This intent contributes
  one entry to that table and obeys the contract; it does not restate it.
- Assumption: the deck engine ships with the app, so an export copies it <!-- cond: cond-2609051927563438 -->
  and needs no network to complete.

## Acceptance Criteria

- **Given** a document open in the app, **when** Alice presses `C-c C-e`,
  **then** a panel opens listing five exports: the deck as a folder, the
  article as a folder, and a dry-run publish, each stating the folder it
  writes to and the files it writes there; and the single HTML file and
  the journal PDF, each marked not yet available with the phase it arrives
  in; and neither of those two can be confirmed — the confirm key on
  either opens no dialog and writes nothing.
- **Given** the panel open, **when** Alice presses `C-g`, **then** the
  panel closes, the point is where she left it, and no file anywhere on
  disk has changed.
- **Given** a chapter whose Sections carry images written as
  `![The lantern at dusk](assets/lantern.jpg)` and a `::: {.notes}` block,
  **when** Alice chooses the deck row, accepts the dialog's default
  destination beside the document folder, and confirms, **then** the
  written folder opens in a browser from disk with every slide in order,
  every image displayed, and the notes block as that slide's speaker
  notes, with the network disconnected.
- **Given** the same document and variant, **when** Alice exports the deck
  to a folder and then runs the dry-run row, **then** the deck files in
  the exported folder and in the staged version folder are byte-identical,
  and the dry-run row opens the staged folder in the Finder.
- **Given** an article export and a deck export just written, **when**
  every file in each folder is searched, **then** no file contains an
  absolute path, a machine name, or a user name, and every reference
  between the folder's own files is relative.
- **Given** the network watched at the shell, **when** Alice runs each of
  the three available exports in turn, **then** no request is made.
- **Given** a hash of every file in the document folder taken before,
  **when** Alice runs each of the three available exports in turn, and
  attempts to choose a destination inside the document folder, **then**
  that destination is refused with the reason stated, and the hashes taken
  afterwards are identical to those taken before.
- **Given** the app window at 820 CSS pixels wide, **when** the panel is
  open, **then** every row's name, destination, and statement of what it
  writes is readable in full with no horizontal scrolling and no pinch
  zoom.
- Inherits: *one source, always*; *no machine in the document*; *network
  only on publish*; *legible on three device classes*.

## Open Questions

- `03-evidence.md` records the trade-off "The single HTML file as the only
  local artefact", whose accepted cost is that "Alice cannot hand someone
  a folder to serve; anything local is one file or a published link".
  This moment is that folder. Whether the trade-off row stands as written,
  and whether the matching exclusion in `06-delivery.md` ("A local export
  of the renderings as files") is struck, is not settled by the evidence
  chapter and belongs to the maintainer.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._

## Grounds

- pursued: an export panel naming every destination before confirming keeps file writes explicit and gives the deck a way to disk; wrong if authors never open a folder export and the single file suffices
