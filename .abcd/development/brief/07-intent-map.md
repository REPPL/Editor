# Intent map

How this canvas is cut into intents. An intent is one user-facing moment
with its own press release and Given-When-Then acceptance criteria.
Plumbing with no moment of its own has no intent: it lives in
[`05-internals.md`](05-internals.md) and is inherited.

Three kinds:

- **standalone** — one moment, one spec, ships on its own;
- **bundle-member** — one of several moments that only make sense delivered
  together, sharing one spec;
- **discipline** — a cross-cutting rule with no moment of its own, which
  every other spec inherits and every acceptance list repeats.

## The cut at a glance

| # | Intent | Kind | Bundle | Phase |
|---|---|---|---|---|
| 1 | Open a folder and see the book | bundle-member | Editing surface | 1 |
| 2 | Edit with the Emacs bindings I already know | bundle-member | Editing surface | 1 |
| 3 | Insert a construct I cannot remember | bundle-member | Editing surface | 1 |
| 4 | Drop an image and have it just work | standalone | — | 1 |
| 5 | Present a chapter with no slide markup | bundle-member | The deck | 1 |
| 6 | Shape the deck in the same text | bundle-member | The deck | 1 |
| 7 | Publish and get a link I can open from the lectern | bundle-member | Publish | 1 |
| 8 | Find the version Bob read in March | bundle-member | Publish | 1 |
| 9 | Read the document as a Tufte article | bundle-member | The article | 2 |
| 10 | Read it the way I like it | bundle-member | The article | 2 |
| 11 | Cite from a bibliography file | standalone | — | 2 |
| 12 | Find what is hidden in the text | standalone | — | 2 |
| 13 | Bring an old single-file manuscript in | standalone | — | 3 |
| 14 | Write one text for two audiences | standalone | — | 3 |
| 15 | Add media too big to copy | standalone | — | 4 |
| 16 | Point a video at several sources, one behind a sign-in | standalone | — | 4 |
| 17 | Carry the document as one file that reads anywhere | standalone | — | 5 |
| 18 | Edit on the iPad and bring the text back | standalone | — | 5 |
| 19 | Give each audience its own link | standalone | — | 6 |
| 20 | Publish something only named people can open | standalone | — | 6 |
| 21 | Receive a journal-style PDF with the document | standalone | — | 6 |
| 22 | Mark up a chapter without touching the text | bundle-member | Annotations | 7 |
| 23 | Keep my own marks on someone else's page | bundle-member | Annotations | 7 |
| 24 | Publish someone else's annotations as a layer | standalone | — | 7 |
| 25 | Rehearse from cards built out of the headings | standalone | — | 7 |
| 26 | Move through the article by keyboard | standalone | — | 2 |
| 27 | Set the size threshold and name an asset root | standalone | — | 4 |
| 28 | Take a document off the site | standalone | — | 6 |
| 29 | Start a new document | standalone | — | 1 |
| 30 | Move between the editor and the sidebar without the mouse | standalone | — | 1 |
| 31 | Export what I have made to a folder I choose | standalone | — | 1 |
| 32 | Edit prose with the Emacs commands my hands already know | standalone | — | 1 |
| 33 | Make the text bigger or smaller from the keyboard | standalone | — | 1 |
| 34 | Move through and reshape the book by heading | standalone | — | 1 |
| 35 | Open whatever is in front of me | standalone | — | 1 |

## The intents

### Bundle: Editing surface (phase 1)

One spec. None of the three ships alone: a sidebar with no editor is a file
browser, an editor with no bindings is not the editor the constraints
describe, and a canon nobody can type is a canon nobody uses.

**1. Open a folder and see the book** — bundle-member.
Surfaces: the editor (folder, sidebar).
Overlaps: intent 13, which creates the folder this one opens — the boundary
is that 13 owns writing the split, 1 owns reading whatever is already
there; and intent 14, which puts variant badges in the sidebar — 1 owns the
tree, 14 owns what the badges mean.
Plumbing excluded: the on-disk model, the parse tree, folder watching.
Order: first. Everything else needs a document open.

**2. Edit with the Emacs bindings I already know** — bundle-member.
Surfaces: the editor (Emacs bindings, the keys panel, the cancel rule).
Overlaps: intent 18, the same bindings inside the single file with no shell
to claim keys — the boundary is the host: 2 owns the desktop app and the
binding table, 18 owns what survives in Safari on an iPad.
Plumbing excluded: the editing component, key interception in the shell,
the key table's data shape, atomic writes.
Order: with 1. Gated by the spike in
[`06-delivery.md`](06-delivery.md), which produces its binding table.

**3. Insert a construct I cannot remember** — bundle-member.
Surfaces: the editor (insert palette).
Overlaps: every intent that defines a construct — 6, 9, 11, 12, 14, 16,
21. The boundary: those intents own what a construct means in a rendering;
3 owns only that the canonical form appears at the cursor. The callout and
the margin aside belong to intent 9, which is where they are rendered. A
construct arriving in a later phase adds a palette entry, not a new
intent.
Plumbing excluded: the canon itself, which is
[`05-internals.md`](05-internals.md) section 3.
Order: with 1 and 2, seeded with the slide constructs.

### Phase 1, standalone

**4. Drop an image and have it just work** — standalone.
Surfaces: assets (drop, conversion), the editor.
Overlaps: intent 15, the same gesture above the threshold — the boundary is
what the threshold turns on, not the gesture: 4 owns the drop itself for
every kind of file, the copy beside the chapter, de-duplication of copied
files, and conversion of a phone-native image at any size; 15 owns the
threshold, referenced mode, roots, the manifest, and the upload. Also
intent 16, where a dropped video's block gains further sources — 4 writes
the block with the one local source; and intent 5, where an image becomes
its own slide — 4 stops at the reference in the text.
Plumbing excluded: hashing, the manifest schema, the drop rule in
[`05-internals.md`](05-internals.md) section 5.
Order: phase 1, because image slides need images.

**29. Start a new document** — standalone.
Surfaces: the editor (a new document).
Overlaps: intent 1, which opens what this creates — the boundary is that
29 writes `document.yaml`, the first Part, and the first chapter, and 1
reads whatever is already there; and intent 13, which creates a document
from a manuscript instead.
Plumbing excluded: the metadata file's keys.
Order: phase 1, before 1 has anything to open.

**30. Move between the editor and the sidebar without the mouse** —
standalone.
Surfaces: the editor (focus between panes, the sidebar by keyboard, the
modeline).
Overlaps: intent 1, which owns the sidebar tree and what a click does — the
boundary is that 1 owns the tree, its badges, and opening a chapter at a
heading, and 30 owns reaching that tree from the keyboard, moving in it,
and returning; intent 2, which owns the binding table's shape, the keys
panel, and the cancel contract — 30 registers rows in that table and reuses
that contract rather than defining either; intent 3, whose palette is one
of the panes the cycle reaches — 3 owns what the palette inserts; and
intent 26, which owns the same vocabulary in a reading view — the boundary
is the surface: 30 stops at the app's own chrome.
Plumbing excluded: which pane holds focus, the focus ring, and the shell's
claim on `C-x` as a prefix.
Order: phase 1, with 1 and 2. Amended into the map after the maintainer
used the app and found the sidebar reachable only by pointing at it.

**31. Export what I have made to a folder I choose** — standalone.
Surfaces: the editor (the export panel); slides and the online article, as
the folders it writes; publish (the dry run's staged folder, opened for
inspection).
Overlaps: intent 7, which owns publishing and the dry run's staging — the
boundary is that 7 owns what a publish builds, stages, and pushes, and 31
owns only the row that names the dry run, states what it writes, and opens
the staged folder; intents 5 and 6, which own what the deck contains — 31
owns only that the deck they define is written into a chosen folder with
its engine and assets beside it; intents 9 and 10, which own the article
page 31 writes out; intent 17, which owns the single HTML file — 31 lists
it as not yet available with its phase and writes no such file; intent 21,
which owns the PDF the pipeline renders and the app never does, listed the
same way; and intent 2, which owns the binding table and the contract every
overlay obeys — 31 adds one row to that table and inherits the contract.
Plumbing excluded: the version builder every export shares, the native
folder dialog and reveal-in-Finder, and the vendored deck engine.
Order: phase 1, after 5, 6 and 7, which give it something to write. Amended
into the map after the maintainer used the app and found no way to write
the deck or the article to disk, or to see what a publish would push.

**32. Edit prose with the Emacs commands my hands already know** —
standalone.
Surfaces: the editor (editing, the modeline's prompts).
Overlaps: intent 2, which owns the binding table's shape, the keys panel,
the cancel contract, and the sweep that checks the table for conformance —
the boundary is that 2 owns the table and 32 owns seventeen rows in it and
what each does to the text; intent 3, whose insert palette keeps its own
chord — 3 owns what an entry inserts, 32 owns only that those entries are
also listed and run by the `M-x` command palette; intent 30, which owns
focus between panes — the boundary is the text: 32 never moves focus out
of the chapter, so `M-r` moves the cursor within the view and nothing
else; and intent 18, the same rows in a browser with no shell to claim
keys.
Plumbing excluded: the key table's data shape, the fill algorithm, the
completion index over the chapter's words.
Order: phase 1, with 2. Amended into the map after the maintainer used the
app and found the table carried movement and killing but not the commands
a writer of prose presses hourly — filling a paragraph, moving by
sentence, transposing two words, completing a word from the text. It is
tier one of `../research/notes/2026-09-05-emacs-vocabulary-gap.md`; that
note's outline vocabulary is a later intent, decided with the chord
conflicts it lists.

**33. Make the text bigger or smaller from the keyboard** — standalone.
Surfaces: the editor (the editing surface's type size, the modeline's
report of it).
Overlaps: intent 2, which owns the binding table's shape, the keys panel,
and the cancel contract — the boundary is that 2 owns the table and 33
owns three rows in it and what each does to the surface; intent 32, which
owns the prose commands and the `M-x` command palette — these three rows
are listed and run there as every row is, and 32 owns the palette itself;
intent 27, which owns the settings panel — the boundary is the moment: 27
owns setting a number and naming a place in the panel, and 33 writes the
scale through the same per-machine settings store with no field in that
panel; and intent 5, which owns the deck's typography — the present
window's type scale is untouched.
Plumbing excluded: the settings file and its commands, the key table's
data shape, and the shell's claim on `C-x` as a prefix.
Order: phase 1, with 2 and 32. Amended into the map after the maintainer
used the app and found no way to match the text to their eyes and screen
short of the operating system's own zoom, which scales the sidebar and
the panels with it. The chords are Emacs's own text-scale commands, taken
behind the `C-x` prefix so that `C--` keeps redo and `C-=` stays free.

**34. Move through and reshape the book by heading** — standalone.
Surfaces: the editor (heading movement, folding, promote and demote,
moving a section, narrowing, occur, switching chapters).
Overlaps: intent 2, which owns the binding table's shape, the keys panel,
and the cancel contract — the boundary is that 2 owns the table and 34
owns twenty-one rows in it, settling the four chord conflicts the table
already carried; intent 32, which owns the prose vocabulary and the `M-x`
palette — 34's rows are listed and run there like every other row, and 32's
sentence and paragraph commands are untouched; intent 30, which owns
reaching the sidebar tree from the keyboard — 34's switch-chapter and
chapter-list moments open a chapter from the text and never move focus
into the tree; intent 1, which owns the sidebar tree itself — 34 reaches
the same chapters and headings without drawing a second tree; and intent
26, which decides which of this vocabulary a reading view answers, if any.
Plumbing excluded: the binding table's data shape, the fill algorithm and
the completion index (intent 32's), and CodeMirror's own fold state.
Order: phase 1, with 2 and 32. Amended into the map after the maintainer
used the app and found the table carried the sentence and the paragraph
but not the heading — no way to move by section, fold a chapter down to
its outline, promote or demote a heading with its subtree, or narrow to
one section, all of which Markdown mode and Org mode answer without
thinking. It is tier two of
`../research/notes/2026-09-05-emacs-vocabulary-gap.md`, and the intent
that settles the four chord conflicts the note recorded against `C-c
C-p`, `C-c C-l`, `C-x k` and `M-s`.

**35. Open whatever is in front of me** — standalone.
Surfaces: the editor (a chord that opens a file or a folder through the
shell's own dialog).
Overlaps: intent 1, which owns walking a folder into the tree once it is
chosen — the boundary is that 1 owns the walk, and 35 owns choosing what
gets walked, whether the choice is a folder or a single file, and reuses
1's own walk unchanged; intent 29, which owns writing the smallest folder
that is already a book — 35 opens what is already on disk and writes
nothing, even for a single file with no document folder behind it; and
intent 30, which claimed `C-x C-o` beside `C-x o` for the pane cycle
before the maintainer asked for a second way to open — the boundary is
that 30 keeps `C-x o` alone, as Emacs does, and 35 takes the chord 30 gave
up.
Plumbing excluded: the on-disk model, the folder walk, and the shell's own
nonce-and-claim mechanism a chosen destination travels under.
Order: phase 1, with 1 and 29, which give it something to open and a
shape to imitate for a bare file. Amended into the map after the
maintainer asked for one chord that opens a file or a folder.

### Bundle: The deck (phase 1)

One spec, because the default mapping and the authored constructs are two
halves of one rule: what the deck does when the author says nothing, and
what it does when they say something. The article's obligation to ignore
the constructs is stated once, here.

**5. Present a chapter with no slide markup** — bundle-member.
Surfaces: slides (the default mapping).
Overlaps: intent 9, which renders the same text as prose — the boundary is
the mapping table in [`05-internals.md`](05-internals.md) section 3: each
rendering owns its column.
Plumbing excluded: the deck engine builds, the core's slide renderer.
Order: phase 1, the first usable slice.

**6. Shape the deck in the same text** — bundle-member.
Surfaces: slides (authored constructs), the editor (palette entries).
Overlaps: intent 3 for the palette entries; intent 9 and intent 21, which
must ignore these constructs entirely.
Plumbing excluded: the fenced-div forms themselves.
Order: with 5. A talk needs statement slides and dividers, so the default
alone is not shippable.

### Bundle: Publish (phase 1)

One spec: an action that produces a link, and the record of the links it
has produced. Publishing without a version record is a link Alice cannot
find again.

**7. Publish and get a link I can open from the lectern** — bundle-member.
Surfaces: publish (stable id, version hash, unlisted).
Overlaps: intent 19 (per-variant links) and intent 20 (gated) both extend
this action — the boundary is that 7 owns one document, one variant,
unlisted, and the guarantee that the presenter shows nothing without an id;
19 and 20 own the second link and the gate. Also intent 21, which the
pipeline produces on the same push — 7 stops at "pushed and deployed".
Plumbing excluded: the pipeline, the site layout, git mechanics.
Order: phase 1. A talk is presented from a link.

**8. Find the version Bob read in March** — bundle-member.
Surfaces: publish (versioned hashes, publish log).
Overlaps: intent 7, which mints the entries; intent 20, whose gate follows
the document rather than the version — the boundary: 8 owns the promise
that what a version *says* never changes, 20 owns who may open it; and
intent 28, which ends the links and records that it did.
Plumbing excluded: the log's file format and the `latest` pointer.
Order: with 7.

### Bundle: The article (phase 2)

One spec: the page and the reader's control over it. A Tufte page with no
way to change the measure is half the prototype's reading experience.

**9. Read the document as a Tufte article** — bundle-member.
Surfaces: the online article (layout, margin notes, the contents, the
callout and the margin aside, the video rule).
Overlaps: intent 11, whose citations become the margin notes — the
boundary: 11 owns resolving a key to a reference, 9 owns where it sits on
the page; intent 16, whose source list decides what a video shows; intent
26, which moves through the page 9 lays out.
Plumbing excluded: the core's article renderer, the responsive CSS.
Order: phase 2, first. It is the rendering that must be perfect.

**10. Read it the way I like it** — bundle-member.
Surfaces: the online article (reader controls).
Overlaps: intent 23, which also stores reader state in the browser — the
boundary is what is stored: 10 keeps display preferences, 23 keeps marks
about the text.
Plumbing excluded: per-browser storage.
Order: with 9.

### Phase 2, standalone

**11. Cite from a bibliography file** — standalone.
Surfaces: citations; the editor (completion, unresolved keys); all three
renderings.
Overlaps: 9, 5, and 21, which each display a citation differently. The
boundary: 11 owns the key, the file, the resolution, and the generated
reference list; each rendering owns its display. 11 also carries the
"renderings agree" discipline's first hard test.
Plumbing excluded: the BibTeX reader, the style implementations.
Order: phase 2, with the article. The acceptance project cannot test it, so
it needs its own test document.

**12. Find what is hidden in the text** — standalone.
Surfaces: the online article (once-only quotation, easter eggs).
Overlaps: intent 9, which renders the page around them; intent 21, which
prints their static content; intent 14, since an egg's content may itself
be variant-marked (open).
Plumbing excluded: the article script's collection tray and reveal.
Order: phase 2, after 9. It is the one moment that belongs to Bob and Carol
alone, and it is what makes the prototype's reading experience whole.

**26. Move through the article by keyboard** — standalone.
Surfaces: the online article (moving by keyboard).
Overlaps: intent 2, which owns the same vocabulary in the editor — the
boundary is the surface: 2 owns the binding table, 26 owns which of its
chords a reading view answers to; intent 9, which lays out the page 26
moves through; intent 25, whose cards are driven by the same chords.
Plumbing excluded: the article script's focus handling.
Order: phase 2, with 9. Which chords the reading views share is an open
question in [`03-evidence.md`](03-evidence.md); this intent is where it is
answered.

### Phase 3

**13. Bring an old single-file manuscript in** — standalone.
Surfaces: the editor (import by split).
Overlaps: intent 1 (which then opens the result), intent 29 (the other way
a document begins), intent 14 (because a real manuscript carries variants
the split must leave exactly as they were), and intent 18 (the other
direction of the same fidelity promise). The boundary: 13 is one-way, from
a flat file to a folder of one Part, and it is the first acceptance test of
the byte-fidelity discipline.
Plumbing excluded: the parser and serialiser, the slug rule.
Order: phase 3, because it is what lets the acceptance project come in
whole.

**14. Write one text for two audiences** — standalone.
Surfaces: the editor (variant marking, preview, sidebar badges).
Overlaps: nearly everything — 9, 5, 19, 21, 17. The boundary is deliberate
and is the reason this is one intent and one discipline rather than a
feature of each rendering: **14 owns the moment of marking a block and
previewing a variant**; the discipline *variant fidelity* owns the
obligation of every renderer, every export, and every link to honour the
marks. Intent 19 owns the links themselves.
Plumbing excluded: the filter in the core, footnote and citation removal
inside filtered blocks.
Order: phase 3. The acceptance project has three variants, so nothing real
can be brought in without it.

### Phase 4

**15. Add media too big to copy** — standalone.
Surfaces: assets (threshold, referenced assets, the sidebar's asset count,
the upload on publish).
Overlaps: intent 4, which owns the drop and conversion at any size; intent
27, which sets the threshold and names the roots 15 records against;
intent 17, which degrades to a poster; intent 7, the publish action 15's
upload rides on — the boundary: 7 owns pushing a document, 15 owns that
each referenced asset uploads once and every rendering links to that one
copy, wherever the ceiling puts it.
Plumbing excluded: the manifest's fields, hashing, the ceiling and the
object store.
Order: phase 4. This is what 2.5 GB of real material breaks.

**27. Set the size threshold and name an asset root** — standalone.
Surfaces: assets (settings).
Overlaps: intent 15, which obeys both. The boundary: 27 owns the moment of
setting a number and naming a place, and what happens on a machine where
the place is not named; 15 owns what the setting then does to an asset.
Plumbing excluded: where app settings are stored.
Order: phase 4, before 15 can be exercised on a second machine.

**16. Point a video at several sources, one behind a sign-in** — standalone.
Surfaces: assets (video source lists), the online article, slides, the PDF.
Overlaps: intent 15, which records the local copy — the boundary: 15 owns
where a file lives, 16 owns the order in which renderings try sources and
what shows when none is reachable. Intent 20 is a different gate: 20 gates
Alice's document, 16 consumes someone else's gate.
Plumbing excluded: nothing of the gated site is Editor's; no credential
is ever stored.
Order: phase 4, with 15.

### Phase 5

**17. Carry the document as one file that reads anywhere** — standalone.
Surfaces: the single HTML file (reader).
Overlaps: 9 and 5, whose renderings it embeds; 15, whose media it cannot
embed. The boundary: 17 owns embedding, offline behaviour, and the
degradation to poster and link.
Plumbing excluded: the bundler, data URI embedding.
Order: phase 5.

**18. Edit on the iPad and bring the text back** — standalone.
Surfaces: the single HTML file (editor, import and export), the editor
(re-import).
Overlaps: intent 2 (the same bindings, a different host) and intent 17 (the
same file, a different job). The boundary is the job: 17 is for Carol, who
reads; 18 is for Alice, who edits and must get the text home unchanged
except by her edits. It is the second hard test of byte-fidelity.
Plumbing excluded: browser file access, the download path, chapter
matching on re-import.
Order: phase 5, after 17.

### Phase 6

**19. Give each audience its own link** — standalone.
Surfaces: publish (per-variant links).
Overlaps: intent 14 (the marks) and intent 7 (the action). The boundary: 19
owns only that each variant is its own unguessable path under one id, that
one such link cannot be shortened or guessed into another, and that no page
reveals another exists.
Plumbing excluded: the site's path layout and how a token is minted.
Order: phase 6, once variants exist.

**20. Publish something only named people can open** — standalone.
Surfaces: publish (gated, allow-list).
Overlaps: intent 7, whose flag it is; intent 8, whose versions the gate
covers. The boundary: 7 owns unlisted and the empty presenter; 20 owns the
allow-list Alice edits, the gate applying to every version and variant
under the id, and the sign-in Bob meets. It carries the rule that unlisted
is not private.
Plumbing excluded: the access file, its home in the production repository,
and the pipeline step that applies it.
Order: phase 6.

**28. Take a document off the site** — standalone.
Surfaces: publish (withdrawal, the publish log).
Overlaps: intent 7, which put it there; intent 8, whose version links stop
resolving; intent 20, since withdrawal is what unlisted publishing has
instead of a gate. The boundary: 28 owns the moment of removal and what a
held link shows afterwards.
Plumbing excluded: how the removal reaches the site.
Order: phase 6, after 7 and 8 have something to withdraw.

**21. Receive a journal-style PDF with the document** — standalone.
Surfaces: the PDF.
Overlaps: 11 (references), 12 (static fallbacks), 6 (constructs it must
ignore), 14 (one PDF per variant), 7 (the push that triggers it). The
boundary: 21 owns the printed artefact and the pipeline step that makes it;
every other intent owns its own content.
Plumbing excluded: the Typst step, the template, the pipeline wiring.
Order: phase 6.

### Bundle: Annotations (phase 7)

One spec: the same sidecar format, written by Alice in the app and by Bob
in his browser. Two moments, one file format, and neither is worth
building without the other.

**22. Mark up a chapter without touching the text** — bundle-member.
Surfaces: annotations (sidecar, anchors).
Overlaps: intent 13 and 18, since anchors must survive the edits those
allow. The boundary: 22 owns the anchor model's behaviour under editing;
the byte-fidelity discipline owns the text staying identical, and the
*orphan, never guess* discipline owns what happens when re-attachment
fails.
Plumbing excluded: the anchor resolution ladder, the sidecar schema.
Order: phase 7.

**23. Keep my own marks on someone else's page** — bundle-member.
Surfaces: annotations (reader side, export), the online article.
Overlaps: intent 10 (also browser state) and intent 24 (which receives the
exported file). The boundary: 23 ends when Bob has a file, and resumes at
the reader-facing toggle for a layer 24 publishes — the control Carol uses
to show or hide it; 24 begins when Alice opens the file and ends at the
layer itself and its name.
Plumbing excluded: browser storage, the export format.
Order: with 22.

### Phase 7, standalone

**24. Publish someone else's annotations as a layer** — standalone.
Surfaces: annotations (layers), publish.
Overlaps: intent 23 (the file, and the reader-facing toggle) and intent 7
(the publish action). The boundary: 24 owns review, the layer and its
name, and the guarantee that Alice's private marks are not published
unless she chooses to publish them as a layer of her own the same way; the
toggle readers see to show or hide a layer belongs to 23.
Plumbing excluded: where a received file sits before it is published, and
where a layer file sits beside the version.
Order: phase 7.

**25. Rehearse from cards built out of the headings** — standalone.
Surfaces: annotations (rehearsal decks).
Overlaps: intent 22, which stores the cards; intent 24, the route a deck
takes to reach a reader; intent 26, whose chords drive the cards; and
intent 5, which also turns headings into something else — the boundary is
the artefact: a deck of cards to test recall, not slides to show an
audience.
Plumbing excluded: card generation from headings, session scoring.
Order: phase 7, last. It is the one moment the acceptance project proves is
wanted and nothing else in the design depends on.

## Disciplines

Every spec inherits every discipline that binds in its phase, and names
those disciplines in its acceptance criteria rather than restating them as
features. A spec does not list a discipline that binds from a later phase,
and no spec is the owner of one: the discipline is.

| Discipline | Forbids | Binds from |
|---|---|---|
| **Round-trip byte-fidelity** | Reflowed lines, invented escapes, realigned tables, dropped comments. Any path that reads and writes the source returns it byte for byte except where the author edited | Phase 1; tested hard by intents 13 and 18 |
| **No machine in the document** | The author's machine inside a document folder: absolute local paths, local hostnames, usernames, machine-local settings. References are relative or named roots the app resolves | Phase 1 |
| **One source, always** | A second copy of the text anywhere. Every rendering is a function of the one tree; nothing is authored twice, and no rendering is ever an input | Phase 1 |
| **Variant fidelity** | A filtered block, or its footnotes and citations, surviving into another variant's rendering, reference list, PDF, or link; any page or path revealing that other variants exist | Phase 3 |
| **Degrade gracefully in a plain tool** | Any extension outside the canon's five forms, and any meaning a plain reader cannot see because it lives in a filename or a script | Phase 1 |
| **Legible on three device classes** | Horizontal scrolling or pinch zoom at 390, 820, or 1280 CSS pixels, in any screen rendering | Phase 1 |
| **The renderings agree** | Article, slides, and PDF disagreeing about a citation, a footnote, a reference list, or a variant | Phase 2 |
| **Nothing is stored about a reader** | Editor or the pages it publishes keeping any reader's marks, preferences, or identity. Reader state lives in the reader's browser and leaves only as a file they export | Phase 2 |
| **Network only on publish** | Any request outside a publish Alice started. No background traffic, sync, telemetry, or build-time probe | Phase 1 |
| **Orphan, never guess** | An annotation whose anchor no longer resolves being re-attached to different words instead of being reported as orphaned | Phase 7 |
| **Reachable by assistive technology** | A control, panel, or overlay reachable only by an Emacs chord; a custom widget with no role, name, or state exposed to a screen reader; a state conveyed by colour alone | Phase 2 |

## The rule used to cut

An intent ends where an intention is satisfied: one person, one gesture or
sitting, one artefact that changes state, after which they could stop and
still have got what they came for. Alice dropping an image is a moment;
hashing it is not. Bob collecting an easter egg is a moment; the script
that reveals it is not. When two moments cannot be delivered apart without
one of them being useless — a sidebar with no editor, a deck with no way to
shape it — they are members of one bundle sharing one spec. When a rule has
no moment at all but every moment must obey it — the source comes back
unchanged, no page reveals another variant — it is a discipline, inherited
rather than scheduled. Everything left over is plumbing, and plumbing lives
in the brief.

### Cuts considered and rejected

- **One intent per rendering** (article, slides, PDF, single file).
  Rejected: every construct would then be specified three or four times,
  once per renderer, and the ignore rules would have no single home. The
  mapping table in [`05-internals.md`](05-internals.md) is that home
  instead, and each rendering intent owns only its column.
- **One intent per surface section of this brief.** Rejected: the sections
  do not align with moments. The single HTML file holds two unrelated
  moments — Carol reading offline and Alice editing on a tablet — while the
  editor holds three that cannot ship apart.
- **One intent per delivery phase.** Rejected: a phase is a unit of
  delivery, not of intention. Phase 1 alone contains seven moments with
  three different personas.
- **Variants as a feature of the editing intent**, as the prior proposal
  has it. Rejected: the rule crosses five other specs, so it splits into
  one moment (marking and previewing, intent 14), one moment about links
  (intent 19), and one discipline (variant fidelity) that the rest inherit.

## Where this differs from the prior proposal

A prior proposal of nine drafts covered the same ground. Taken as one
proposal, this map keeps its subject matter and redraws four boundaries.

| Prior draft | Treatment here |
|---|---|
| Open and edit a chapter folder (bindings, import, palette, variants) | Split four ways: bundle 1-3, plus standalone 13 (import) and 14 (variants). Import and variants are moments of their own and land in a later phase |
| Drop assets | Split by the threshold: 4 (copied, phase 1) and 15 (referenced, phase 4), with 16 for the video source list |
| Cite from a bibliography file | Kept whole as 11 |
| Read a Tufte article | Split: bundle 9-10 (the page and its controls), standalone 12 (the hidden things) |
| Present slides | Kept, as a two-member bundle so that the default and the authored constructs share one spec |
| Single HTML file | Split by job: 17 reads, 18 edits |
| Publish and the stable link | Split by phase: bundle 7-8 in phase 1, then 19 and 20 in phase 6 |
| Journal PDF | Kept whole as 21 |
| Annotate and publish layers | Split three ways: bundle 22-23, standalone 24, standalone 25 |

Four moments the prior proposal left inside plumbing are intents of their
own here: moving through the article by keyboard (26), setting the
threshold and naming an asset root (27), taking a document off the site
(28), and starting a new document (29).
