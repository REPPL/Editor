---
id: itd-2609061509393380
slug: the-maintainer-asks-for-c-x-c-o-to-open-a-file-or-a-folder-t
spec_id: spc-2609061617208646
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
promoted_from: iss-2609061509390620
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Open whatever is in front of me

## Press Release

Alice has a folder open in the Finder, or just one Markdown file she has
been drafting on a train with nothing else beside it, and she wants Editor
to show it. She presses `C-x C-o`, says whether it is a folder or a
single file, and picks it through the same dialog `C-x C-f` already
opens. A folder opens exactly as it always has: the sidebar draws the
book, Part by Part, Chapter by Chapter. A single file opens as a
one-chapter document rooted in the folder it already sits in — nothing is
written to that folder, not a `document.yaml`, not a Part, not a rename —
and the sidebar shows the one chapter, ready to edit, save, and read back
byte for byte. If the file she picked already lives inside a folder that
is a document folder, Editor opens the whole book and starts her on that
chapter, because a document she already has does not become a stranger to
itself just because she reached it by a different door.

`C-x C-o` used to be a second way to move to the other pane, sitting
beside `C-x o` for the same reason Emacs's own `C-x` sequences keep the
Control key down between two related steps. Emacs spends that chord on
`delete-blank-lines`, a command a writer of prose in Editor's world rarely
misses, so giving it up costs nothing an author would call a loss. The
pane cycle keeps its one chord, `C-x o`, exactly as Emacs answers it, and
`C-x C-f` keeps opening a folder exactly as it does today — `C-x C-o` is a
second door onto the same room, not a replacement for the first.

## Why This Matters

Editor's whole design rests on a document being a folder Alice already
owns, and every moment before this one assumed she would arrive at it as
a folder: `C-x C-f` asks for one, the New document panel writes one. What
none of them answer is the case the maintainer actually hit — a single
file, with no folder built around it yet, that she wants to look at or
edit in Editor without first deciding whether it is going to become a
book. Refusing that file, or worse, quietly manufacturing a `document.yaml`
and a Part folder she never asked for, either turns Editor away from
material she has in front of her or writes something into her folder she
did not choose. A one-chapter document that writes nothing lets her open
the file, edit it, and save it byte for byte, exactly as if it had always
been a document folder of one chapter — because `05-internals.md` section
1 already names that shape the degenerate case of a real document, not a
lesser one.

## Mechanism

- We expect a single Markdown file to need no folder written around it
  because the on-disk model already treats "one folder, one Markdown
  file" as an ordinary document (`05-internals.md` section 1, "a
  single-chapter document is the degenerate case"); the only thing this
  moment adds is not requiring that folder, the Part inside it, and the
  metadata file to exist beforehand. The claim is falsified if opening a
  bare file writes anything to disk before Alice has typed a single edit.
- We expect the freed `C-x C-o` to cost nothing because Emacs's own
  binding for it, `delete-blank-lines`, has no row in Editor's table
  today and nothing in the shipped keymap calls it: no chord Editor
  already answers is Emacs's `delete-blank-lines`, and no test or
  document names it as a gap. If a later author asks for that command
  specifically, it is a new row on a chord of its own, not evidence this
  one was wrong to take.
- We expect a file already inside a document folder to open that whole
  document, not a synthetic one-chapter stand-in, because a document
  Alice already has does not stop being that document depending on which
  command opened it; `document.yaml` at the document's own root is what
  `05-internals.md` section 1 already uses to say a folder is a document,
  so the same test that answers "is this folder a document" for `C-x C-n`
  answers it here.
- We expect one dialog per kind of pick — a folder dialog or a file
  dialog, never a single panel offering both — because the desktop file
  chooser Editor already uses for `C-x C-f` and the New document panel
  opens in one mode or the other and no third mode exists to ask for
  either at once; the falsifier is a native panel, on this platform, that
  lets Alice choose a folder and a plain file interchangeably in one
  dialog without Editor adding anything to ask for it.
- We expect the shell's dialog to remain the one place a path is chosen
  because every other moment that touches the file system already keeps
  the choice under a nonce rather than trusting a path the page hands
  back (`new_document.rs`, `export.rs`); a script running in the page can
  therefore ask Editor to open what Alice actually picked, and nothing
  else.

## Scope Conditions

- Platform: the desktop app only, a Tauri 2 shell around the macOS system <!-- cond: cond-2609061617204415 -->
  web view. Opening a folder or a file through a native dialog is a shell
  capability; the single HTML file and any reading view open nothing.
- Population: Alice, one author, one document open at a time — the same <!-- cond: cond-2609061617202904 -->
  population `C-x C-f` already serves. Nothing here changes how many
  documents may be open together.
- Assumption: "is this folder a document" is answered the same way New <!-- cond: cond-2609061617205743 -->
  document already answers it for a destination it refuses — the folder
  carries a `document.yaml` — walked upward from the picked file's own
  folder until either one is found or the walk runs out of ancestors.
- Boundary with map #1, `itd-2609051335399446` (Open a folder and see the <!-- cond: cond-2609061617206519 -->
  book): 1 owns walking a folder into a tree once it is chosen; this
  moment owns choosing it, whether the choice is a folder or a single
  file, and reuses 1's own walk unchanged for a folder pick and for a
  file found to sit inside an existing document.
- Boundary with map #29, `itd-2609051402191319` (Start a new document): 29 <!-- cond: cond-2609061617202280 -->
  writes the smallest folder that is already a book; this moment writes
  nothing for a bare file and never promotes one into a folder on
  Alice's behalf. A one-chapter document opened here that Alice later
  wants Parts and a metadata file for is still New document's to build.
- Boundary with map #30, `itd-2609051921482691` (Move between the editor <!-- cond: cond-2609061617200282 -->
  and the sidebar without the mouse, the pane cycle): 30 keeps `C-x o` as
  the one chord that moves between panes, exactly as Emacs answers it;
  this moment takes the second chord, `C-x C-o`, which 30's own spec
  placed beside it, and neither row answers the other's chord any
  longer.
- Excluded: export and publish of a one-chapter document opened this way. <!-- cond: cond-2609061617201811 -->
  Both already refuse when no document folder is open, and a bare file's
  synthetic tree is not backed by one; this moment does not change either
  refusal's wording or add a route around it.
- Excluded as plumbing: the on-disk model, the folder walk, and the <!-- cond: cond-2609061617202522 -->
  shell's own nonce-and-claim mechanism the chosen destination travels
  under (`05-internals.md` section 1; `new_document.rs`; `export.rs`).

## Acceptance Criteria

- Given no document is open, When Alice presses `C-x C-o` and chooses "a
  document folder" and then a folder holding a book, Then the sidebar
  shows that book exactly as `C-x C-f` would have shown it.
- Given no document is open, When Alice presses `C-x C-o`, chooses "a
  single file", and picks a Markdown file that sits in a folder with no
  `document.yaml` anywhere above it, Then the sidebar shows a document of
  exactly one chapter, that chapter is open in the editing surface, and
  the folder the file sits in gains no new file of any kind.
- Given that one-chapter document is open, When Alice edits the chapter
  and saves it, Then the file on disk is what she typed, byte for byte,
  and no other file beside it exists.
- Given a document folder already exists with a `document.yaml` at its
  root and a chapter two levels beneath it, When Alice presses `C-x C-o`,
  chooses "a single file", and picks that chapter directly, Then Editor
  opens the whole document as `C-x C-f` would, the sidebar shows every
  Part and Chapter of it, and the picked chapter is the one already open
  in the editing surface.
- Given Alice presses `C-x C-o` and chooses "a single file", When she
  picks a file that is not Markdown, Then Editor opens nothing, says the
  file is not one it can open, and writes nothing anywhere. (Negative
  case.)
- Given Alice presses `C-x C-o` and cancels either dialog without
  choosing anything, When the dialog closes, Then whatever was open
  beforehand is exactly as it was, and nothing is written.
- Given the pane cycle, When Alice presses `C-x o`, Then the keyboard
  moves to the other pane exactly as before, and `C-x C-o` no longer
  answers that gesture.
- Given a document is open through either route and the machine has no
  network connection, When Alice opens it and edits and saves the
  chapter, Then every action succeeds and no network request is
  attempted.
- Inherits: no machine in the document (`itd-2609051336080960`) — a
  bare-file open writes nothing until Alice edits; round-trip
  byte-fidelity (`itd-2609051336074533`) — either route reads and writes
  a chapter's bytes unchanged apart from her own edit; one source, always
  (`itd-2609051336090390`) — a bare file's sidebar is the one chapter on
  disk and nothing else records it; network only on publish
  (`itd-2609051336158553`) — opening a file or a folder this way makes no
  request of any kind.

## Open Questions

- Whether a later intent should let Alice promote an already-open
  one-chapter document into a full folder — a `document.yaml`, a named
  Part — without closing and recreating it through New document. This
  moment answers only opening; promoting is New document's shape already
  and is left there.
- Whether the two-step chooser this moment adds (folder, or file) is the
  answer that should stand once more of the application has a considered
  view of small confirming prompts, or whether a future design finds a
  single-dialog route this platform's own file panel does not offer
  today without a further dependency.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-e23ff599ff7d -->
Fidelity review — receipt rcp-e23ff599ff7d (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:5cceadbe802b77e552dd41c38be061a2416fbf635a8e8c9715c66844166b3105
Input attestations: diff:c1bcf7b..cae1734@sha256:4a5e182af9d3f4549b332eff9cf5e02954a79320d0844b9f6d74d8d0a15cfc16; intent:.abcd/development/intents/shipped/itd-2609061509393380-the-maintainer-asks-for-c-x-c-o-to-open-a-file-or-a-folder-t.md@-; spec:.abcd/development/specs/closed/spc-2609061617208646-the-maintainer-asks-for-c-x-c-o-to-open-a-file-or-a-folder-t.md@-; checklist:.abcd/.work.local/logs/acceptance/spc-2609061617208646.md (M35-1..M35-4, every row unticked)@-; test-run:npx vitest run src/core/render/article-keys.test.ts src/core/render/reading-keys.test.ts src/emacs-keys.test.ts src/local-documents.test.ts src/preview.test.ts src/export/services.test.ts src/new-document-panel.test.ts src/outline-commands.test.ts src/open-source.test.ts src/focus.test.ts — 10 files, 287 tests passed, 0 failed@-; test-run:cargo test --manifest-path src-tauri/Cargo.toml open_source — 8 passed, 0 failed@-; test-run:cargo test --manifest-path src-tauri/Cargo.toml read_single_chapter — 0 tests matched (the spec's named document.rs tests carry other names); one_chapter_tree — 1 passed (document::tests::builds_a_one_chapter_tree_without_writing_anything); bare_chapter — 1 passed (document::tests::refuses_a_non_markdown_file_as_a_bare_chapter)@-;

Acceptance rollup: MET 5 · MET_WITH_CONCERNS 4 · NOT_MET 0 · INCONCLUSIVE 0

Per-criterion verdicts:
- ac-1 — MET: choosing 'a document folder' calls the folder dialog once, claims the nonce, and the sidebar rows are the same two Parts and chapters a folder open draws; in the shell resolve_source(Folder) is canonical_root then read_tree, the calls open_folder makes
  evidence: src/open-source.test.ts:215 — "opens a folder exactly as C-x C-f would"
  evidence: src-tauri/src/open_source.rs:415 — "fn resolves_a_folder_pick_exactly_as_open_folder_would()"
- ac-2 — MET: a bare file resolves to a one-chapter tree rooted in its folder with the directory listing unchanged before and after, a sibling .md is not drawn, and the page shows exactly one row already open with nothing written
  evidence: src/open-source.test.ts:230 — "opens a bare file as a one-chapter document and writes nothing"
  evidence: src-tauri/src/document.rs:749 — "fn builds_a_one_chapter_tree_without_writing_anything()"
  evidence: src-tauri/src/open_source.rs:431 — "fn resolves_a_bare_file_as_a_one_chapter_document_and_writes_nothing()"
  evidence: src-tauri/src/document.rs:443 — "pub fn read_single_chapter(file: &Path) -> Result< DocumentTree, String> {"
- ac-3 — MET_WITH_CONCERNS: after editing the bare-file chapter, save hands exactly the edited text to writeChapter at exactly that path and nothing else is written; concern: proven at the page level against a fake writer, so 'the file on disk' and 'no other file beside it' on a real disk rest on the pre-existing shell writer and the unticked M35-2
  evidence: src/open-source.test.ts:251 — "saves the bare-file chapter back byte for byte"
  evidence: src/open-source.test.ts:267 — "expect(written).toEqual([{ path: "drafts/01-notes.md", text: edited }]);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061617208646.md:583 — "- [ ] `git status` (or a Finder listing"
- ac-4 — MET: a chapter two levels beneath a document.yaml resolves to that root with the whole tree read and the picked chapter selected; the page then shows every Part and Chapter with that chapter open
  evidence: src-tauri/src/open_source.rs:458 — "fn finds_the_document_root_above_a_chapter_two_levels_deep()"
  evidence: src-tauri/src/open_source.rs:190 — "fn document_root_above(file: &Path) -> Option< PathBuf> {"
  evidence: src/open-source.test.ts:293 — "opens the whole document when the picked file already lives inside one"
- ac-5 — MET: a .txt pick is refused with 'is not a Markdown file' before any ancestor walk, the folder listing is unchanged, and the page shows the message with no root and no chapter open
  evidence: src/open-source.test.ts:310 — "refuses a file that is not Markdown"
  evidence: src-tauri/src/document.rs:778 — "fn refuses_a_non_markdown_file_as_a_bare_chapter()"
  evidence: src-tauri/src/open_source.rs:486 — "fn refuses_a_non_markdown_file_pick_and_writes_nothing()"
- ac-6 — MET_WITH_CONCERNS: a null answer from the folder dialog claims no nonce and leaves documentRoot null; concern: only the folder-dialog cancel is exercised — the file-dialog cancel and cancelling the chooser overlay itself are covered only by unticked M35-1 and M35-4 rows
  evidence: src/open-source.test.ts:325 — "cancelling either dialog leaves the open document untouched"
  evidence: src/open-source.test.ts:326 — "pickFolderResult = null; // the author closed the dialog without choosing"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061617208646.md:586 — "- [ ] Cancel the file dialog once instead"
- ac-7 — MET: other-window keeps C-x o alone and open-file-or-folder takes C-x C-o; C-x o still moves the keyboard to the sidebar and C-x C-o no longer does
  evidence: src/keys.ts:828 — "chords: ["C-x o"],"
  evidence: src/keys.ts:401 — "chords: ["C-x C-o"],"
  evidence: src/focus.test.ts:367 — "moves the keyboard to the sidebar on C-x o and starts on the open chapter"
  evidence: src/focus.test.ts:384 — "no longer moves the keyboard on C-x C-o"
- ac-8 — MET_WITH_CONCERNS: with fetch and XMLHttpRequest replaced by recorders the folder route completes with no attempt, and open_source.rs contains no HTTP client; concerns: only the folder route runs under the recorder, the edit-and-save step is not run under it, and no offline row exists in the checklist
  evidence: src/open-source.test.ts:371 — "attempts no network request while opening either way"
  evidence: src/open-source.test.ts:396 — "expect(attempts).toEqual([]);"
  evidence: src-tauri/src/open_source.rs:328 — "pub async fn open_document_source("
- ac-9 — MET_WITH_CONCERNS: no machine in the document (listing unchanged before and after), round-trip byte-fidelity (edited text handed back byte-equal), one source (a sibling beside the bare file is not drawn) are each test-proven; concern: network-only-on-publish is proven in jsdom for the folder route only
  evidence: src-tauri/src/document.rs:754 — "fs::write(base.join("other.md"), "# Not this one\n").expect("sibling");"
  evidence: src/open-source.test.ts:251 — "saves the bare-file chapter back byte for byte"
  evidence: src/open-source.test.ts:371 — "attempts no network request while opening either way"

Gap audit:
- honoured:
  - a single file opens as a one-chapter document with nothing written to its folder
    evidence: src-tauri/src/document.rs:749 — "fn builds_a_one_chapter_tree_without_writing_anything()"
    evidence: src-tauri/src/open_source.rs:431 — "fn resolves_a_bare_file_as_a_one_chapter_document_and_writes_nothing()"
  - a file already inside a document folder opens the whole book and starts on that chapter
    evidence: src-tauri/src/open_source.rs:458 — "fn finds_the_document_root_above_a_chapter_two_levels_deep()"
  - the pane cycle keeps its one chord C-x o
    evidence: src/keys.ts:828 — "chords: ["C-x o"],"
    evidence: src/focus.test.ts:384 — "no longer moves the keyboard on C-x C-o"
  - the shell's dialog remains the one place a path is chosen, under a nonce
    evidence: src-tauri/src/open_source.rs:387 — "fn a_pick_is_the_dialog_s_answer_claimed_once()"
    evidence: src-tauri/src/open_source.rs:170 — "pub struct PickedSource {"
  - a declined discard claims no nonce and leaves the shell's root untouched
    evidence: src/open-source.test.ts:336 — "declining the discard guard claims no nonce and leaves the shell's root untouched"
- diverged:
  - she picks it through the same dialog C-x C-f already opens — delivered as a chooser overlay first, then one native dialog per kind, because the platform panel cannot offer files and folders together
    evidence: src/app.ts:262 — "const OPEN_SOURCE_CHOICES: readonly ListEntry[] = ["
    evidence: src-tauri/src/open_source.rs:299 — ".add_filter("Markdown", &["md", "markdown"])"
  - nothing is written to that folder — holds for opening, editing and saving, but a real publish of a bare-file document mints a document.yaml into the file's own folder
    evidence: docs/how-to-open-a-file-or-a-folder.md:50 — "real publish is the one exception: the first time you publish, Editor mints"
  - the spec's named document.rs tests (a_bare_file_s_tree_shows_no_sibling_in_its_folder) — the sibling exclusion is asserted inside builds_a_one_chapter_tree_without_writing_anything instead
    evidence: src-tauri/src/document.rs:754 — "fs::write(base.join("other.md"), "# Not this one\n").expect("sibling");"
- missing:
  - the real Finder dialogs, both routes, on a real disk
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061617208646.md:565 — "- [ ] Press `C-x C-o`. The question "Open a folder or a single file?""
  - a test of the file-dialog cancel and the chooser-overlay cancel
    evidence: src/open-source.test.ts:326 — "pickFolderResult = null; // the author closed the dialog without choosing"

Scope-condition dispositions:
- cond-2609061617204415 — survived: outside the shell the three services are absent and the command announces it needs the desktop shell; the dialogs are tauri commands
  evidence: src/app.ts:769 — "announce("Opening a file or a folder needs the desktop shell");"
  evidence: src-tauri/src/lib.rs:354 — "open_source::pick_document_folder,"
- cond-2609061617202904 — survived: open_document_source sets the one DocumentRoot and replaces the one watcher, exactly as open_folder does, so one document is open at a time whichever route got there
  evidence: src-tauri/src/open_source.rs:341 — "root.set(resolved.clone())?;"
  evidence: src-tauri/src/open_source.rs:344 — "if let Err(error) = watcher.replace(watched, move || {"
- cond-2609061617205743 — survived: document_root_above walks the picked file's ancestors for a document.yaml and stops at the first found or when the parents run out
  evidence: src-tauri/src/open_source.rs:190 — "fn document_root_above(file: &Path) -> Option< PathBuf> {"
  evidence: src-tauri/src/open_source.rs:458 — "fn finds_the_document_root_above_a_chapter_two_levels_deep()"
- cond-2609061617206519 — narrowed: the walk itself (document::read_tree) is called unchanged for a folder pick and for a file inside a document, but map #1's own entry point open_folder was changed to consult SingleFileRoot and rebuild a bare file through read_single_chapter instead of walking
  narrowing: holds for document::read_tree, called unchanged; open_folder in lib.rs, map #1's route, now branches on SingleFileRoot before walking
  evidence: src-tauri/src/open_source.rs:415 — "fn resolves_a_folder_pick_exactly_as_open_folder_would()"
  evidence: src-tauri/src/lib.rs:127 — "if let Some(file) = open_source::SingleFileRoot::matches(&remembered, &resolved) {"
- cond-2609061617202280 — survived: a bare file's open writes nothing and no Part or metadata file is ever created by this route
  evidence: src-tauri/src/open_source.rs:454 — "assert_eq!(before.len(), after.len(), "nothing was written");"
  evidence: src/open-source.test.ts:249 — "expect(written).toEqual([]);"
- cond-2609061617200282 — survived: other-window keeps C-x o alone, open-file-or-folder takes C-x C-o, src/focus.ts is absent from the range, and neither row answers the other's chord
  evidence: src/keys.ts:828 — "chords: ["C-x o"],"
  evidence: src/focus.test.ts:384 — "no longer moves the keyboard on C-x C-o"
- cond-2609061617201811 — falsified: the condition assumed export and publish already refuse a one-chapter document opened this way; the delivered reality is that a document with no declared variant publishes and exports as its own single default variant, and a real publish writes a document.yaml into the bare file's folder — the doc page was rewritten to say so
  evidence: docs/how-to-open-a-file-or-a-folder.md:44 — "so it publishes and exports as its own single default variant"
  evidence: docs/how-to-open-a-file-or-a-folder.md:50 — "real publish is the one exception: the first time you publish, Editor mints"
  evidence: src/publish/services.ts:83 — "A document that declares no variant publishes as `DEFAULT_VARIANT`"
- cond-2609061617202522 — narrowed: new_document.rs and export.rs are read rather than changed and the nonce model is copied, but the folder-walk entry point and the watcher's root were changed for a bare file, and the nonce mechanism is a third store rather than the existing one reused
  narrowing: holds for the on-disk model, new_document.rs and export.rs; open_folder and the watched root in lib.rs changed for a bare file, and OpenSourcePicks is a new copy of the nonce mechanism
  evidence: src-tauri/src/lib.rs:144 — "let watched = bare_file.as_deref().unwrap_or(resolved.as_path());"
  evidence: src-tauri/src/open_source.rs:64 — "pub struct OpenSourcePicks(Mutex< Vec< Picked>>);"
## Grounds

- pursued: one open chord that takes a file or a folder lets Alice open whatever she has in front of her without knowing the folder model first; wrong if a single file opened without a document folder behind it misleads her into editing something the publish and deck paths cannot see, or if opening a chapter that already belongs to a real document folder shows her a stand-in instead of the book it is actually part of
- pursued: C-x C-o opens a file or a folder Alice picks through the shell's own dialog under a nonce, walking a folder exactly as C-x C-f does and building a hand-made one-chapter tree for a bare file that writes nothing; it would show wrong if a bare file's open wrote anything to its folder, if a file already inside a real document opened as a stand-in instead of that document, or if C-x o stopped moving between panes once C-x C-o was taken for opening
- pursued: final check before handoff — code and tests match the spec's design
