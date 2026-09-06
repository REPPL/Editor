---
id: spc-2609061617208646
slug: the-maintainer-asks-for-c-x-c-o-to-open-a-file-or-a-folder-t
intent: itd-2609061509393380
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Open whatever is in front of me

## Summary

This spec delivers map #35, `itd-2609061509393380`: `C-x C-o` opens a
document folder or a single Markdown file, chosen through the shell's own
dialog under the nonce model `new_document.rs` and `export.rs` already use.
`other-window` gives the chord up — the pane cycle keeps `C-x o` alone, as
Emacs answers it — and `open-file-or-folder` takes it. A folder pick walks
exactly as `open_folder` already does. A file pick that sits inside an
existing document (an ancestor folder carries `document.yaml`) opens that
whole document with the picked chapter selected. A file pick with no such
ancestor opens as a one-chapter document rooted in the folder it sits in,
built by hand rather than by the whole-folder walk, so a sibling file that
happens to share that folder never appears beside it: nothing is written for
this shape, ever. A dialog can offer files or folders, never both, so the
page asks which kind of thing first, on the same list-overlay the quit and
close prompts already use.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src-tauri/src/open_source.rs` | absent | new: `OpenSourcePicks`, the nonce lifecycle, `resolve_source`, the ancestor walk for an existing document, and the three commands |
| `src-tauri/src/document.rs` | exists: `read_tree`, the walk's private helpers | adds `read_single_chapter`, the hand-built one-chapter tree for a bare file |
| `src-tauri/src/lib.rs` | exists: `DocumentRoot`, `open_folder`, the invoke handler | registers `open_source`, manages `OpenSourcePicks`, widens `DocumentRoot::set` to `pub(crate)` so `open_source.rs` can share it, and lists the three new commands |
| `src/doctree.ts` | exists: `openFolder`, the tree types | adds `PickedSource`, `OpenedSource`, and the three IPC wrappers |
| `src/keys.ts` | exists: 98 rows, `other-window` on `C-x o`/`C-x C-o` | moves `C-x C-o` off `other-window` onto a new row, `open-file-or-folder` |
| `src/emacs.ts` | exists: `APP_COMMAND_IDS` | adds `open-file-or-folder` |
| `src/app.ts` | exists: `commands`, `promptForFolder`, `AppServices` | three optional services, the chooser overlay, and the command that applies what either dialog returns |
| `src/main.ts` | exists: the wiring | passes the three new services from `src/doctree.ts` into `createApp` |
| `src-tauri/src/document.test.ts`, `src-tauri/src/open_source.rs` tests | — | new coverage for the single-chapter shape and the pick-and-claim flow |
| `src/emacs-keys.test.ts`, `src/focus.test.ts` | exist | the `other-window` chord expectations move from two chords to one |
| `src/open-source.test.ts` | absent | new: every criterion below a jsdom test can reach |

### Out

- Reading a folder into a tree once it is chosen: map #1's own walk <!-- cond: cond-2609061617206519 -->
  (`open_folder`, `document::read_tree`) is called unchanged for a folder
  pick and for a file found inside an existing document. This spec adds no
  second walk.
- Writing a folder for a bare file, or promoting one into a folder with a <!-- cond: cond-2609061617202280 -->
  metadata file and a Part: map #29's own shape. Opening a bare file here
  never writes anything, before or after the chapter is edited.
- The pane cycle's own chord: `other-window` keeps `C-x o`, exactly as <!-- cond: cond-2609061617200282 -->
  Emacs answers it. `src/focus.ts` is not touched.
- Export and publish of a one-chapter document opened this way. Both <!-- cond: cond-2609061617201811 -->
  already refuse when no document folder is open (`documentForPublish`,
  the export services), and this spec neither loosens nor renames either
  refusal.
- A combined native dialog offering files and folders together.
  `tauri-plugin-dialog`'s `FileDialogBuilder` exposes `pick_file` and
  `pick_folder` as two calls, each setting the platform panel's own
  `canChooseFiles`/`canChooseDirectories` pair the other way with no public
  option to combine them, and adding a dependency to reach a combined mode
  is not this change's to spend. The page's own chooser stands in for it.
- The on-disk model, the folder walk, and the nonce-and-claim mechanism a <!-- cond: cond-2609061617202522 -->
  chosen destination already travels under — `new_document.rs` and
  `export.rs` are read, not changed.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| No machine in the document `itd-2609051336080960` | `src-tauri/src/document.rs` › `builds_a_one_chapter_tree_without_writing_anything`; `src/open-source.test.ts` › "opens a bare file and writes nothing to its folder" |
| Round-trip byte-fidelity `itd-2609051336074533` | `src/open-source.test.ts` › "saves the bare-file chapter back byte for byte" |
| One source, always `itd-2609051336090390` | `read_single_chapter` builds its tree from the one picked file, never from a folder walk that could show a sibling; `src-tauri/src/document.rs` › `a_bare_file_s_tree_shows_no_sibling_in_its_folder` |
| Network only on publish `itd-2609051336158553` | `src/open-source.test.ts` › "attempts no network request while opening either way" |

## Design

### The chord moves

`src/keys.ts`'s `other-window` row loses `C-x C-o` and keeps `C-x o` alone —
the one line the intent's Mechanism section argues Emacs already spends that
chord on `delete-blank-lines`, a command nothing in this table answers today.
A new row takes the freed chord:

| id | label | chords | group | owner |
|---|---|---|---|---|
| `open-file-or-folder` | Open a file or a folder | `C-x C-o` | document | editor |

`open-file-or-folder` joins `APP_COMMAND_IDS` in `src/emacs.ts`, exactly as
`open-folder` already does, so the chord is bound from the row and `M-x`
reaches it through `runBinding` like every other `editor` row. The
conformance sweep (`src/emacs-keys.test.ts`, "gives no two rows the same
chord") is what proves `C-x o` now belongs to `other-window` alone and
`C-x C-o` to nothing else.

### The chooser, before either dialog opens

A native panel is a folder chooser or a file chooser, never both — verified
against `tauri-plugin-dialog` 2.7.3's own `desktop.rs` and the `rfd` 0.16
backend beneath it: `pick_file` sets `canChooseDirectories(false)` and
`pick_folder` sets `canChooseFiles(false)`, unconditionally, with no builder
option to relax either. So `open-file-or-folder`'s command opens a
list-overlay first, the same `openListOverlay` the quit and close prompts
already share:

```ts
const OPEN_SOURCE_CHOICES: readonly ListEntry[] = [
  { id: "folder", label: "A document folder" },
  { id: "file", label: "A single file" },
];
```

Choosing a row calls `services.pickDocumentFolder()` or
`services.pickDocumentFile()`; cancelling either dialog, or the overlay
itself, leaves whatever was open exactly as it was and writes nothing. Both
optional services are absent outside the shell, and the command announces
that opening this way needs the desktop application, the same message
`present`, `preview`, and the export panel give outside it.

### The nonce, on the model `new_document.rs` already sets

`src-tauri/src/open_source.rs` holds `OpenSourcePicks`, a `Mutex<Vec<Picked>>`
of `{ nonce, kind, path, at }`, offered and claimed on the same thirty-second
lifetime and the same retain-then-look-up shape `NewDocumentDestinations` and
`ExportDestinations` both already use — a third store rather than a shared
one, because this module answers a different question again: what either
dialog produces is a *pick*, spent by opening it, not a destination a later
write claims. `PickedKind` is `Folder` or `File`, and `pick_document_folder`
and `pick_document_file` are two commands, one per dialog, both minting a
nonce over the canonicalised path the dialog returned and handing back only
`PickedSource { nonce, name }` — the file or folder's own name, never the
path around it, exactly as `ChosenNewDocumentFolder` already withholds it.

```rust
#[tauri::command]
pub async fn pick_document_folder(
    app: tauri::AppHandle,
    picks: tauri::State<'_, OpenSourcePicks>,
) -> Result<Option<PickedSource>, String>;

#[tauri::command]
pub async fn pick_document_file(
    app: tauri::AppHandle,
    picks: tauri::State<'_, OpenSourcePicks>,
) -> Result<Option<PickedSource>, String>;

#[tauri::command]
pub async fn open_document_source(
    nonce: String,
    app: tauri::AppHandle,
    picks: tauri::State<'_, OpenSourcePicks>,
    root: tauri::State<'_, DocumentRoot>,
    watcher: tauri::State<'_, watch::CurrentWatch>,
) -> Result<OpenedSource, String>;
```

`open_document_source` claims the nonce — an unknown or spent one is refused
with the same wording `new_document.rs`'s own claim refuses with — and calls
`resolve_source(kind, &path)` inside `spawn_blocking`, exactly where
`open_folder` and `create_new_document` already do their own file-system
work. `resolve_source` returns the folder that becomes the new
`DocumentRoot`, the `DocumentTree` to show, and the chapter path to select,
if any:

- **Folder.** `document::canonical_root` then `document::read_tree`,
  unchanged — the same two calls `open_folder`'s own command body already
  makes. No chapter is pre-selected.
- **File.** `document::read_single_chapter(&resolved)` is called first,
  always: it is what refuses a file that is not `.md` or `.markdown`,
  reusing the extension check `is_chapter` already answers for every other
  chapter path, and it is also the tree this pick falls back to. Only then
  does `resolve_source` walk `resolved.parent()`'s ancestors for one
  carrying `document.yaml` — "is this folder a document" answered the same
  way `new_document.rs`'s own refusal already answers it
  (`cond-2609061617205743`) — in `document_root_above`; the first one found
  becomes the real `DocumentRoot`, read through the ordinary
  `document::read_tree`, and the picked file's path is looked up inside that
  tree (`tree_contains_chapter`) to become the selected chapter — found in
  every case a real walk reaches it, and left unselected rather than refused
  in the one it does not, which is the same "the sidebar disagrees with
  nothing it did not itself draw" reading `open_folder` already gives an
  unreadable entry. No ancestor found: the standalone tree
  `read_single_chapter` already built is what is shown, and its own root
  path is what becomes `DocumentRoot`.

`open_document_source` sets `DocumentRoot` and replaces the folder watcher
with the resolved root exactly as `open_folder`'s command body already does
— one canonical root, one watcher, whichever route got there
(`cond-2609061617204415`, `cond-2609061617202904`). `DocumentRoot::set` moves
from module-private to `pub(crate)` so `open_source.rs` can call it; nothing
about its contract changes.

### The one-chapter tree, built by hand

```rust
pub fn read_single_chapter(file: &Path) -> Result<DocumentTree, String>
```

lives in `document.rs` beside `read_tree`, because it reuses the same private
pieces `read_part` already calls — `is_chapter`, `title_of`,
`modified_millis`, `display_name` — rather than duplicating any of them. It
refuses a name `is_chapter` does not recognise with `"{name} is not a
Markdown file"`, and otherwise builds one `Chapter` from the file's own
metadata and one `Part` whose `path`, `name`, and `title` are the containing
folder's — `parts: []`, `chapters: [that one chapter]`. It is not `read_tree`
called on the parent folder: a whole-folder walk would also draw whatever
else happens to live beside the file — another manuscript, a stray note —
and "a one-chapter document" means exactly the one chapter open, not every
sibling a folder happens to hold. Putting the chapter directly on the root
Part's own `chapters` is what `src/sidebar.ts`'s existing root-chapter
drawing already renders with no empty Part row, the same path a real
single-Part document takes today (`itd-2609051335399446`'s own single-chapter
criterion).

### Applying what a pick opened

`src/app.ts` gains three optional `AppServices` methods, mirrored from
`src/doctree.ts`:

```ts
pickDocumentFolder?(): Promise<{ nonce: string; name: string } | null>;
pickDocumentFile?(): Promise<{ nonce: string; name: string } | null>;
openDocumentSource?(
  nonce: string,
): Promise<{ tree: DocumentTree; selectedChapter: string | null }>;
```

and one command, wired the way `switchChapter` already is — a local function
reusing the application's own `showTree`, `forgetChapter`, `documentTitle`,
`chaptersOf`, and `mayDiscard`, rather than a new public `App` method: the
discard guard runs *after* the dialog closes and *before* the tree is shown,
the same order `promptForFolder` already keeps between choosing a folder and
opening it. A chapter the outcome names is opened through the same
`app.openChapter` the sidebar already calls; a chapter it names but the
drawn tree does not contain — the one edge `document_root_above` can leave
unresolved — falls back to announcing the document's title alone, exactly as
an ordinary folder open with nothing pre-selected already announces.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| `C-x C-o`, "a document folder", a real book: sidebar shows it as `C-x C-f` would | `src/open-source.test.ts` › "opens a folder exactly as C-x C-f would" |
| `C-x C-o`, "a single file", no `document.yaml` above it: one chapter shown, open, folder gains no new file | `src-tauri/src/document.rs` › `builds_a_one_chapter_tree_without_writing_anything`; `src/open-source.test.ts` › "opens a bare file as a one-chapter document and writes nothing" |
| Editing and saving that one-chapter document: bytes on disk are what she typed, nothing else exists beside it | `src/open-source.test.ts` › "saves the bare-file chapter back byte for byte" |
| A file picked from inside a real document: whole document opens, picked chapter is the one already open | `src-tauri/src/open_source.rs` › `finds_the_document_root_above_a_chapter_two_levels_deep`; `src/open-source.test.ts` › "opens the whole document when the picked file already lives inside one" |
| A file that is not Markdown: nothing opens, refused with a message, nothing written | `src-tauri/src/document.rs` › `refuses_a_non_markdown_file_as_a_bare_chapter`; `src/open-source.test.ts` › "refuses a file that is not Markdown" |
| Either dialog cancelled: nothing changes, nothing is written | `src/open-source.test.ts` › "cancelling either dialog leaves the open document untouched" |
| `C-x o` still moves to the other pane; `C-x C-o` no longer does | `src/emacs-keys.test.ts` › "gives no two rows the same chord"; `src/focus.test.ts` › "moves the keyboard to the sidebar on C-x o and starts on the open chapter" |
| Opening either way offline: every action succeeds, no request is attempted | `src/open-source.test.ts` › "attempts no network request while opening either way" |
| Inherits the four disciplines | the tests named in Scope |

Manual checks, `npm run tauri dev`, recorded unticked in
`.abcd/.work.local/logs/acceptance/spc-2609061617208646.md`:

- **M35-1** — press `C-x C-o`, choose "a document folder", pick a real
  document folder in the Finder dialog, and confirm the sidebar matches
  `C-x C-f` on the same folder.
- **M35-2** — press `C-x C-o`, choose "a single file", pick a Markdown file
  sitting on its own with nothing else in its folder, edit it, save it, and
  confirm with `git status` that the file is the only thing that changed.
- **M35-3** — press `C-x C-o`, choose "a single file", and pick a chapter
  from inside a real multi-Part document; confirm the whole book appears in
  the sidebar with that chapter already open.

## Tasks

1. Add `read_single_chapter` to `src-tauri/src/document.rs` with its two
   tests. Verify:
   `cargo test --manifest-path src-tauri/Cargo.toml read_single_chapter`.
2. Add `src-tauri/src/open_source.rs`: `OpenSourcePicks`, `PickedSource`,
   `OpenedSource`, `resolve_source`, `document_root_above`,
   `tree_contains_chapter`, and the three commands, with the nonce-lifecycle
   and resolution tests. Verify:
   `cargo test --manifest-path src-tauri/Cargo.toml --lib open_source`.
3. Widen `DocumentRoot::set` to `pub(crate)`, register the module, manage
   `OpenSourcePicks`, and list the three commands in
   `src-tauri/src/lib.rs`. Verify:
   `cargo build --manifest-path src-tauri/Cargo.toml`.
4. Move `C-x C-o` off `other-window` and add the `open-file-or-folder` row
   in `src/keys.ts`; add the id to `APP_COMMAND_IDS` in `src/emacs.ts`.
   Verify: `npx vitest run src/emacs-keys.test.ts`.
5. Add `PickedSource`, `OpenedSource`, and the three IPC wrappers to
   `src/doctree.ts`. Verify: `npm run build`.
6. Add the three optional services, `OPEN_SOURCE_CHOICES`, the chooser
   command, and the applying function to `src/app.ts`; wire the three
   services from `src/doctree.ts` in `src/main.ts`. Verify:
   `npx vitest run src/open-source.test.ts`.
7. Update the `other-window` chord expectations in `src/emacs-keys.test.ts`
   and `src/focus.test.ts`. Verify: `npm test`.
8. Write `docs/how-to-open-a-file-or-a-folder.md`, index it in
   `docs/README.md`, write the manual checklist, and append the decision
   lines. Verify: the six gates, plus `abcd lint`.

## Risks and Open Questions

- **No combined dialog.** The chooser overlay is this spec's answer to a
  platform limitation, not a preference; a later `rfd` release or a
  dependency sign-off could remove the extra step, and the intent's own
  Open Questions record that this may not be the last word on it.
- **A chapter inside an existing document that a real walk cannot resolve**
  — a symlinked chapter, an entry `read_tree` records as a failure — leaves
  `selected_chapter` unresolved rather than refusing the whole open; the
  document still opens, with nothing pre-selected, which the Design section
  argues is the same reading `open_folder` already gives an unreadable
  entry elsewhere in a tree.
- **The ancestor walk has no depth limit** other than the file system's own
  ancestry, unlike `document::read_part`'s `MAX_DEPTH` on the way down. A
  real document is a handful of levels deep in either direction, and the
  walk stops the moment it finds a `document.yaml` or runs out of parents,
  so the risk is theoretical rather than a measured cost.
- **Manual checks** cover the real Finder dialogs and the real save-to-disk
  byte comparison; nothing in jsdom drives the native panel itself, which is
  the same gap map #1's own `M1` and `M2` already carry forward.
