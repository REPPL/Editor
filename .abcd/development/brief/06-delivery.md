# Delivery

The order the work lands in, the one thing that is de-risked before
anything else, what is deliberately excluded, and what "done" means for a
phase.

## The one spike

**CodeMirror's Emacs keymap inside a Tauri 2 window on macOS.** Everything
in the editor rests on the assumption that a web view can hold a real Emacs
editing surface; the platform is the risk, not the keymap. The spike is a
throwaway window that does nothing but edit a file.

It answers:

- which combinations the operating system takes before the web view sees
  them, and which of those the Tauri shell can claim back;
- which combinations the Safari engine takes for itself;
- whether the same bindings survive in Safari on an iPad with a hardware
  keyboard, which is the tablet path and has no shell to claim anything;
- what "full Emacs bindings" means as a finite list.

It produces a written binding table — the acceptance list every later
editing criterion refers to — and a decision: CodeMirror's keymap as it
stands, the keymap extended, or a different editing surface. The spike runs
before any product code and is thrown away afterwards.

## Phases

### Phase 0 — Foundations

The buildable skeleton: the Tauri 2 shell, the TypeScript core's module
boundaries, the test harness, and verified build, test, and lint commands
recorded in `AGENTS.md`. The spike runs here, and its outcome
is recorded against the shell's decision record under
`../decisions/adrs/`, which the phase's work cites for the shell, the
document model, publishing, the PDF engine, and annotations.

### Phase 1 — Slides for a talk

The first usable slice, because a talk has a date. Alice opens a chapter
folder, edits it with the bindings, drops in an image, presses Present, and
publishes an unlisted link she can open from the lectern.

Includes: the folder and the sidebar; the editing surface and the binding
table; the insert palette for the slide constructs; the copied-asset drop
path only; the default slide mapping and the authored constructs; the deck
running locally and on the presenter site; publish with a stable id and a
version hash, unlisted, default variant.

Excludes: the threshold and referenced assets, gated video sources, the
article, citations, variants, the PDF, the single file, annotations.

### Phase 2 — The article

The rendering that must be perfect. The Tufte page with navigation, margin
notes, images and video in the flow, and the three device widths; the
reader controls; citations and footnotes against the bibliography file,
with generated reference lists; then the once-only quotation and the easter
eggs.

### Phase 3 — The demanding document

Everything the acceptance project needs before it can be brought in
whole: import by split from one flat file, the fourth heading level,
variant marking with preview and filtering, and the round-trip fidelity
harness that proves no rendering path rewrites the source.

### Phase 4 — Assets at scale

The threshold, referenced assets recorded by content hash against a named
root, de-duplication, conversion of phone-native images, and the ordered
video source list including a gated source. This is the phase the
acceptance project's 2.5 GB exists to break.

### Phase 5 — The single file

One HTML file that reads offline: article, deck, embedded assets, poster
and link above the threshold. Then the same file as an editor: import a
chapter's Markdown, edit with the bindings on an iPad, export, and re-import
into the desktop app with every asset reference still resolving.

### Phase 6 — Publish in full

Per-variant links under one id, the gated flag with its allow-list, the
publish log, and the journal PDF rendered by Typst in the pipeline and
offered beside each version.

### Phase 7 — Annotations and layers

Sidecar annotations with anchors that survive edits; reader annotations in
the browser with export; loading someone's file and publishing it as a
public layer; rehearsal decks in flip and scored modes.

## Definition of done for a phase

A phase is done when all of the following hold:

1. Every acceptance criterion of every intent in the phase passes, on a
   real document rather than a fixture.
2. The build, the full test run, and the lint command all pass, and the
   commands in `AGENTS.md` are the ones that were run.
3. The disciplines hold across the phase: round-trip byte-fidelity, no
   absolute path in any document folder, one source with no second copy of
   the text, every extension still readable by a plain Markdown tool, and
   every rendering legible at iPhone, iPad, and desktop widths.
4. The phase's renderings agree with each other on the same source:
   citations, footnotes, and variant filtering give the same answer
   everywhere they appear.
5. The brief is current: any decision the phase made is in
   `02-constraints.md` or in a decision record, any question it settled is
   struck from `03-evidence.md`, and any question it opened is added.
6. The repository's decision log carries a line for each decision the
   phase made.

## Out of scope

Not built, and not to be designed around:

- **Collaboration.** One author. Concurrent edits from two devices are not
  supported: the last write wins and the app says so.
- **Cloud sync.** No server, no account, no background network. The network
  is touched by the publish action alone.
- **A standalone tablet app.** The tablet path is the single HTML file in
  Safari with a hardware keyboard.
- **WYSIWYG editing.** The Markdown is visible and is the source of truth.
- **Alternative key binding sets.** Emacs bindings are the one set.
- **Author themes.** One built-in article style and one deck theme.
- **Hosting or transcoding video.** Video is linked; the site carries only
  what publish uploads.
- **Assets reachable from anywhere for editing away from the computer.**
  Parked as a future feature. The named-root form in the asset manifest
  keeps the door open; nothing else in the design anticipates it.
