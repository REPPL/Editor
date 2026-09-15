# CONTEXT

Shared orientation for anyone (human or agent) picking this repo up. Short and
pointer-heavy: durable design truth belongs in `../development/`, personal
session state in `../.work.local/NEXT.md` (local, untracked).

## What this repo is

Editor is a lightweight Markdown editor for notes and presentations. It is
public on GitHub under the maintainer's account and licensed MIT.

## Current phase

Phases one and two have shipped, and the keyboard work that followed them:
twenty-seven intents under `../development/intents/shipped/`, each with its
closed spec and an ingested fidelity audit. Phase one is the deck and the
editing surface; phase two is the article — the Tufte page with a preview
window in the app, reader controls, citations from a bibliography file,
hidden content, keyboard movement on the page — plus three the maintainer
asked for while using the app: a new document from nothing, the outline
vocabulary, and one chord that opens a file or a folder.

Release 0.4.0 settles a vocabulary question and ships five intents.
Editor follows GNU Emacs's default bindings wherever Emacs has one, rather
than the `C-x`/`C-c` redesign first proposed, which is declined and its draft
superseded on the evidence of
`../development/research/notes/2026-09-08-emacs-default-divergences.md`.
`F2` shows and hides the sidebar from every pane; `C-x o` moves the keyboard
and never changes what is shown; `C-h` mid-prefix opens an overlay of what can
follow it; Markdown tables stay aligned as they are typed, with `C-c C-t` to
stop that for the session; and a cat on a rainbow trail marks the caret's
progress through the chapter at 1280 CSS pixels and wider.

Window splitting is on `main`, landed by pull request on 2026-09-15 and not
yet cut as a release. `C-x 2` and `C-x 3` divide the window holding the
keyboard, `C-x 0` and `C-x 1` close windows, `C-x o` walks them, and `C-x {`,
`C-x }` and `C-x ^` resize them, with the same floor a pointer drag on a
divider respects. A chapter is a buffer the application holds with zero or
more windows looking at it, so closing a window loses no edit and switching a
window to another chapter asks nothing; the gestures that do discard —
quitting, replacing the document, `C-x C-k` — each ask for themselves.
`adr-2609091832455881` is accepted, and the intent's fidelity audit is
ingested: every mechanism criterion is met, and the six that are drawn
geometry or assistive technology are inconclusive until a person sits at the
keyboard.

Releases 0.1.0 to 0.4.0 are cut in `CHANGELOG.md` and tagged; the repository
is pushed and `main` matches the remote. The next cut carries window
splitting. The app builds as a release bundle. The maintainer's example documents are local test material
under the gitignored `examples/` folder, and nothing committed names one; a
harness runs every local document through the article and the deck.

The manual acceptance rows under `../.work.local/logs/acceptance/` are the
record of what the automated runs cannot reach. The splitting log is the
first to be driven in the real shell — 66 of its 81 rows ticked from
screenshots and `git status`, with the maintainer away from the keyboard —
and its six geometric criteria were seen; the VoiceOver rows, there and
everywhere, still want a person. The older logs remain unticked.

Phase three is planned. Bringing a single-file manuscript in
(`itd-2609051335529787`, spec `spc-2609151652321002`) and writing one text
for two audiences (`itd-2609051335537470`, spec `spc-2609151823595737`) each
passed two adversarial reviews and the maintainer's planning interview on
2026-09-15, and both report READY. The second carries five defects the
reviews found in the shipped variant handling; the build that lands it
resolves them.

`abcd docs lint` is the seventh gate command, armed with the present-tense
token family so that its green means the documentation rule was checked.
Eight issues are open, all captured on 2026-09-15: two from the splitting
acceptance run that want a decision (the unfocused window's hollow caret,
`M-x` unanswered in the sidebar), five variant leaks and a brief-versus-tree
gap that the two-audiences build resolves, and a commit-trailer lapse.

## Sharp edges

- The first usable slice is slides for a specific talk, even though the
  article is the rendering that must be perfect first.
- An unlisted document is not private: anyone with its link can read it.
  Anything confidential is published gated, and the gate follows the
  document id, not one version.
- Assets enter the production repository's git history on publish, which
  is why that repository is private and a public history is not an option.
  Anything past the host's per-file ceiling goes to object storage
  instead, uploaded by the pipeline, which is the only holder of that
  credential.
- Byte-fidelity on round trip is an acceptance criterion, not a nicety.
  Any path that reads and writes a chapter returns it byte for byte except
  where the author edited.
- The app touches the network only during a publish the author started.
  No update check, no telemetry, no build-time probe of a video source.
- Never commit or push without the maintainer asking; new dependencies need
  sign-off first.
