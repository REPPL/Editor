---
id: spc-2609061318158586
slug: start-a-new-document
intent: itd-2609051402191319
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Start a new document

## Summary

This spec delivers map #29, `itd-2609051402191319`: `C-x C-n` opens a panel
with a title field, a folder choice made through the shell's own folder
dialog, and a Create button. On confirm, the shell writes — atomically,
refusing outright and writing nothing at all if the chosen folder already
holds a document — the smallest thing that is already a book:
`document.yaml` carrying the title, the default asset threshold, and the
default citation style (no id, no variants, no bibliography), one numbered
Part folder holding one numbered Chapter file whose level-one heading is the
title exactly as typed. Part and Chapter names follow the slug rule. The page
then opens the folder through the same route map #1 already owns
(`open_folder`), opens the one chapter, and puts the cursor on the blank line
beneath the heading. It adds `src-tauri/src/new_document.rs` in the shell —
the writer, the refusal, the slug rule, and a folder-dialog nonce store kept
independent of `export.rs`'s — and `src/new-document.ts` and
`src/new-document-panel.ts` on the page, mounted through the same two
extension points every other panel uses.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src-tauri/src/new_document.rs` | absent | new: `create_document`, the slug rule, `what_it_already_holds`, `NewDocumentDestinations` (a folder-dialog nonce store), `choose_new_document_folder`, `create_new_document` |
| `src-tauri/src/lib.rs` | exists: the module list, `.manage(...)`, `generate_handler!` | adds the module, one `.manage`, and the two commands to the handler list |
| `src/new-document.ts` | absent | new: `chooseNewDocumentFolder`, `createNewDocument` — thin `invoke` wrappers, the page's only contact with the two commands |
| `src/new-document-panel.ts` | absent | new: the title field, the folder choice, Create/Cancel, `createNewDocumentPanel`, `mountNewDocumentPanel` |
| `src/new-document-panel.test.ts` | absent | new |
| `src/keys.ts` | exists: the table, `SUPPRESSED` | one `document`-group, `app`-owner row: `new-document-open`, `C-x C-n` |
| `src/emacs.ts` | exists: `APP_COMMAND_IDS` | adds `new-document-open`, so the chord reaches the panel from the text |
| `src/main.ts` | exists: mounts publish, settings, export | mounts the new-document panel through the same two extension points, and wires `afterDocumentCreated` (`app.openFolder`, `app.openChapter`, `revealLine`, `focus.toEditor`) |
| `src/style.css` | exists: `.panel` at `min(720px, 94vw)` | adds a `.new-document-*` section; no new width |
| `docs/how-to-start-a-new-document.md`, `docs/README.md` | absent / exists | new how-to page, indexed under How-to guides |

### Out

- The document's id, minted on first publish: map #7, `itd-2609051335468596`
  (cond-2609061318157197). This writes `document.yaml` with no `id` key at
  all.
- Declaring variants and a default variant: map #14, `itd-2609051335537470`
  (cond-2609061318153050). A document created here declares none.
- The bibliography file and the citation style's own moment of being chosen
  by the author: map #11, `itd-2609051335502171` (cond-2609061318157252).
  This names no bibliography and writes the one default citation style; map
  #11's builder is written to honour it.
- Changing the asset threshold or naming an asset root afterwards: map #27,
  `itd-2609051402126424` (cond-2609061318159508). This writes the one default
  threshold and no roots.
- Reading a folder that already exists and drawing the tree from it: map #1,
  `itd-2609051335399446` (cond-2609061318152083). This spec calls that
  route (`app.openFolder`) rather than re-implementing it.
- The other route into a document — splitting a flat manuscript: map #13,
  `itd-2609051335529787` (cond-2609061318159734). This writes no chapter
  text of the author's own; the only text it writes is the heading.
- Anything outside the desktop app: there is no New document command in the
  single file or on the presenter site (cond-2609061318159118), and nobody
  but Alice has one (cond-2609061318150427).
- The metadata file's exact keys and the atomic file writes that create a
  folder, as plumbing already named in `05-internals.md` sections 1 and 5
  (cond-2609061318158123) — this spec is the first *writer* of that file, not
  a redefinition of its shape.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| No machine in the document `itd-2609051336080960` | `refuses_a_folder_that_already_holds_a_document_yaml_and_writes_nothing`, `refuses_a_folder_that_already_holds_a_chapter_and_writes_nothing`; every path `create_document` writes is confined to the folder Alice chose, and no absolute path or machine name is embedded in the document itself |
| One source, always `itd-2609051336090390` | the title is typed once and read back into both the heading and `document.yaml`; `writes_the_heading_exactly_as_typed_while_the_slug_folds_it_down` |
| Round-trip byte-fidelity `itd-2609051336074533` | not applicable to a chapter that is created rather than edited; the chapter this spec writes is the one and only version of its bytes, and nothing here reads a chapter back and rewrites it |
| Degrade gracefully in a plain tool `itd-2609051336110536` | `creates_the_smallest_book_a_document_can_be` reads the written files back with `fs::read_to_string` rather than through Editor, proving they are plain Markdown and plain YAML |
| Network only on publish `itd-2609051336158553` | `create_document` and the two commands touch no HTTP client; `new_document.rs` carries none |
| Legible on three device classes `itd-2609051336128348` | `carries no fixed width and breaks a long folder name`; check **M29-2** |

## Design

### Deciding what the intent leaves open

Three answers the intent asks for and does not give, decided here and
recorded in `.abcd/work/DECISIONS.md`:

1. **The default asset threshold.** `05-internals.md` section 6 calls the
   default open, but its own `assets.json` example carries
   `threshold_bytes: 8388608`, and both of the maintainer's own documents kept
   for local testing (iss-2609061418065651) carry `asset_threshold_bytes:
   8388608` in `document.yaml`. `metadata::DocumentMetadata` names no default
   of its own — the field is a bare `Option<u64>`. This writes `8_388_608`
   (8 MiB), the figure already in use everywhere else in the repository.
2. **The default citation style.** `numeric` — the value one of those
   documents' `document.yaml` carries, and the one the brief names for map
   #11's bibliography builder to honour.
3. **What the first Part is named.** Not from the title. The intent's own
   Open Questions section gives the reason: renaming a Part is renaming a
   folder, and the first Part is the one an author is least likely to ever
   rename. A name derived from the title would go stale the moment the
   title changed, because nothing keeps the two in step — the title lives in
   `document.yaml` and the chapter's own heading, neither of which is the
   folder name. A neutral name, `chapters`, never goes stale. `01-chapters`
   is the Part; `01-<slug of the title>.md` is the Chapter inside it.

### The slug rule, and where it departs from the frontend's

`new_document.rs::slugify` implements the rule the intent states literally —
lowercase ASCII, non-alphanumerics reduced to hyphens, collapsed — by
lower-casing each character with `char::to_ascii_lowercase` and folding
anything that is not then an ASCII letter or digit to a single hyphen,
trimming both ends. This is *not* `slugify` in `src/core/outline.ts`, which
additionally folds accented Latin letters to their plain form through
Unicode's NFKD normalisation (`"Technikfolgenabschätzung"` →
`"technikfolgenabschatzung"`). Rust's standard library carries no such table,
and `AGENTS.md` forbids adding a dependency to reach for one, so the Rust
rule treats an accented or non-Latin letter as any other non-alphanumeric
character: it becomes a hyphen rather than the letter it resembles
(`"Technikfolgenabschätzung"` → `"technikfolgenabsch-tzung"`). Both rules are
lowercase ASCII, non-alphanumerics collapsed to hyphens — the intent's own
words — and they agree on every title this repository's examples use; they
differ only on accented and non-Latin script, which this document names as a
decision rather than an oversight.

An empty result — a title of nothing but punctuation — becomes `document`,
the same fallback `slugFor` in `src/export/services.ts` already uses for an
empty slug, so the two moments answer a title with nothing sluggable the
same way without importing from each other.

### The writer, and the refusal

`create_document(destination, title)` in `new_document.rs`:

1. The title is trimmed and checked non-empty; a blank title refuses before
   anything else runs.
2. `destination` is canonicalised and must be a folder.
3. `what_it_already_holds(root)` looks for a reason this folder is already a
   document: a `document.yaml` file, or — walking with `document::read_tree`,
   the same walk `open_folder` runs — a chapter already sitting under some
   Part. Either refuses with a message naming what was found; a folder
   holding neither is written into however else it is occupied, because the
   question is whether it is *already a document*, not whether it is empty.
4. The Part folder, `01-chapters`, is created with `fs::create_dir`, which
   fails outright if anything by that name is already there.
5. The chapter — `01-<slug>.md`, holding `"# <title>\n\n"` — and
   `document.yaml` are each written through `document::write_chapter_text`,
   the same atomic writer chapters are saved with: a temporary file beside
   the destination, flushed, renamed into place.
6. A failure at step 5 sweeps the Part folder back out, the same way
   `export::run_export` takes its folder away on a failed export — a
   half-written document must not be left standing where the next attempt
   would trip over it.

Every refusal happens before step 4, so a refusal — including the
already-a-document case the intent's negative criterion names — writes
nothing at all: no folder, no metadata, no partial chapter.

`document.yaml` is written from a small local struct,
`NewDocumentMetadata { title, asset_threshold_bytes, citation_style }`, not
from `metadata::DocumentMetadata`: that struct's fields are mostly `Option`,
and serialising one whole would write every unset field as an explicit
`null`. Three keys go in; nothing else does, which is what "no id, no
variants, no bibliography" means on disk rather than only in the struct that
reads it back.

### The folder dialog, on export's own trust model

`choose_new_document_folder` opens the dialog through
`tauri_plugin_dialog::DialogExt`, exactly as `export::choose_export_destination`
does, and returns not a path but a `ChosenNewDocumentFolder { nonce, name }`:
the nonce `NewDocumentDestinations` minted for the folder Alice picked, and
the folder's own last path segment for the panel to show her — never the
machine path around it. `create_new_document` claims that nonce once;
`export.rs`'s docstring states the reasoning this reuses verbatim: "the web
view never names a destination: it names a nonce this state minted... An
unknown or expired nonce is refused, and a nonce is good for one [use]."
`NewDocumentDestinations` is its own store rather than a shared one with
`export::ExportDestinations`, because the two answer different questions — an
export's destination holds a rendering *beside* a document that already
exists; this one's destination *becomes* a document — and coupling them would
make a change to either module's refusal rules a risk to the other's.

### The panel

`src/new-document-panel.ts` follows the settings panel's shape rather than
the export panel's: a form with its own `keydown` listener (`C-g` and Escape
close it, the one cancel rule every overlay shares), not a list of rows
opened through `openOverlay`. `createNewDocumentPanel(services, options)`
builds the element; `mountNewDocumentPanel(host, panel)` calls
`host.registerPanel("new-document", ...)` and `host.registerCommand(...)`,
exactly as `mountSettingsPanel` does.

State: a title field, a "Choose folder…" button, a line stating the chosen
folder's name or "No folder chosen yet.", a status line for a refusal, and a
Create button disabled until both a non-blank title and a chosen folder are
held. Choosing a folder calls `services.chooseFolder(null)`; a `null` answer
(the author cancelled the dialog) leaves every field as it was. Pressing
Create spends the held nonce — clearing it and the folder line immediately,
win or lose, so a failed attempt cannot be retried without choosing again —
and calls `services.createDocument(title, nonce)` with the title field's raw
value: the shell trims and validates it, the same "the page proposes, the
shell decides" split `export.rs`'s `is_folder_name` already argues for a
folder name. On success the panel closes and calls `options.onCreated(outcome)`;
on failure it shows the shell's own message in the status line and leaves the
title as typed.

### Opening what was just written

`onCreated` is wired in `main.ts`, where `app` is in scope, as
`afterDocumentCreated`:

```ts
async function afterDocumentCreated(outcome: NewDocumentOutcome): Promise<void> {
  await app.openFolder(outcome.root);
  const chapter = app.chapters.find((candidate) => candidate.path === outcome.chapter);
  if (chapter) {
    await app.openChapter(chapter);
    revealLine(app.view, 2);
  }
  app.focus.toEditor();
}
```

`app.openFolder` is map #1's own route (`itd-2609051335399446`): it walks the
folder exactly as it would walk one Alice opened by hand, which is the
boundary the intent draws between the two maps, and it is what fills the
sidebar with the one Part and one Chapter and announces the title read back
from `document.yaml`. `app.openChapter` loads the chapter's text into a fresh
`EditorState`, whose default selection sits at offset 0 — the start of the
heading line — so `revealLine(app.view, 2)` moves the cursor to line two: the
chapter is exactly `"# <title>\n\n"`, so line one is the heading and line two
is the blank line beneath it, with nothing after it. `focus.toEditor()` hands
the keyboard to the text, the same call the sidebar's own open-chapter hook
makes when a chapter is opened from a pane other than the editor.

## Acceptance Mapping

| Criterion (`itd-2609051402191319`) | Proven by |
|---|---|
| Confirming with a title and an empty folder writes `document.yaml` carrying that title, one numbered Part, one numbered Chapter whose heading is that title | `creates_the_smallest_book_a_document_can_be` |
| The sidebar lists one Part and one Chapter, the chapter opens, the cursor sits on the blank line beneath the heading with no other text | `afterDocumentCreated` in `main.ts` (`app.openFolder`, `app.openChapter`, `revealLine(app.view, 2)`); the chapter's own content is proven exactly `"# <title>\n\n"` by `creates_the_smallest_book_a_document_can_be`; check **M29-1** for the keyboard and the cursor as a human sees them |
| The metadata carries the title, the default threshold, and the default citation style, and no id, no variants, no bibliography | `reads_back_with_no_id_no_variants_and_no_bibliography` |
| Every file is readable in a plain Markdown tool, and none carries an absolute path, a user name, or a machine name | `creates_the_smallest_book_a_document_can_be` reads every file with `fs::read_to_string` rather than through Editor; `NewDocumentOutcome`'s `root`/`chapter` are the only absolute paths this feature produces and they cross the IPC boundary only to be handed straight back to `open_folder`, never written into a file; check **M29-3** for a plain editor on the actual folder |
| A folder that already holds a document is refused, says what it found, and writes nothing — no folder, no metadata, no partial chapter | `refuses_a_folder_that_already_holds_a_document_yaml_and_writes_nothing`, `refuses_a_folder_that_already_holds_a_chapter_and_writes_nothing` |
| A title with punctuation and non-ASCII characters: Part and Chapter names follow the slug rule; the heading carries the title exactly as typed | `writes_the_heading_exactly_as_typed_while_the_slug_folds_it_down`, `the_slug_rule_is_lowercase_ascii_with_the_rest_collapsed_to_hyphens` |
| Adding a second Markdown file to the Part in the Finder shows two Chapters in prefix order, nothing else changed | not this spec's writer — `document.rs`'s own walk and ordering (`compare_by_order`, `next_prefix`) are unchanged by this spec and already tested in `document.rs`; check **M29-4** for the Finder side of it |
| The panel is legible at 820 and 390 CSS px | `carries no fixed width and breaks a long folder name`; check **M29-2** |
| Created with the machine offline, no outbound request, and the document is created in full | `new_document.rs` holds no HTTP client and calls none; `create_document`'s only I/O is `std::fs`; check **M29-5** |
| Inherits the six named disciplines | the Scope table, one test or one structural argument each |

Manual checks, logged as an unticked list under
`.abcd/.work.local/logs/acceptance/spc-2609061318158586.md`:

- **M29-1** — `C-x C-n`, type a title, choose an empty folder, press Create.
  The sidebar shows one Part and one Chapter, the chapter is open, and the
  cursor blinks on the blank line under the heading.
- **M29-2** — the panel at 820 and 390 CSS pixels: the title field, the
  folder line, and the Create/Cancel buttons are all readable with no
  horizontal scrolling and no pinch zoom.
- **M29-3** — quit Editor, open the created folder in a plain Markdown tool
  (or a text editor) and in the Finder; every file opens and reads as plain
  text, and the folder structure matches what the sidebar showed.
- **M29-4** — with the document open, add a second `.md` file to the Part
  folder in the Finder, then reload (or watch it redraw): two Chapters, in
  prefix order, and the first chapter's file is untouched.
- **M29-5** — disconnect the network, repeat M29-1, and confirm in a network
  monitor (or by the absence of any change to a connectivity indicator) that
  nothing was sent.

## Tasks

1. `src-tauri/src/new_document.rs`: the slug rule, `create_document`, the
   refusal, `NewDocumentDestinations`, and the two commands, plus the module's
   own tests. — `cargo test --manifest-path src-tauri/Cargo.toml new_document`
2. `src-tauri/src/lib.rs`: the module, the `.manage`, the two commands in
   `generate_handler!`. — `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
3. `src/new-document.ts`: the two `invoke` wrappers. — `npx tsc --noEmit`
4. `src/keys.ts` and `src/emacs.ts`: the `new-document-open` row and id. —
   `npx vitest run src/emacs-keys.test.ts`
5. `src/new-document-panel.ts`, `src/style.css`: the panel, its tests. —
   `npx vitest run src/new-document-panel.test.ts`
6. `src/main.ts`: mount the panel, wire `afterDocumentCreated`. —
   `npm run build`
7. `docs/how-to-start-a-new-document.md`, indexed in `docs/README.md`; the
   manual checklist; the decision lines. — `npm run lint`
8. The whole run. —
   `npm test && npm run lint && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo fmt --manifest-path src-tauri/Cargo.toml --check`

## Risks and Open Questions

- **The Rust slug rule is not the frontend's `slugify`.** Documented above as
  a decision rather than a defect: the two agree on ASCII input and differ
  only on accented or non-Latin titles, where the frontend keeps the letter's
  shape and the shell drops it to a hyphen. Nothing in this feature reads a
  Part or Chapter name back through the frontend's `slugify`, so the two
  never have to agree with each other, only with the intent's own words.
- **Trimming the title.** Both the panel's Create button (client-side, for
  when to enable it) and `create_document` (server-side, authoritative) treat
  a title as its trimmed form for the purpose of refusing an empty one; the
  bytes written to the heading and to `document.yaml` are the *trimmed*
  title, not the raw field value. The intent's "exactly as typed" criterion
  is read here as being about internal characters — punctuation, accents,
  non-Latin script — not about incidental leading or trailing whitespace a
  text field collects by accident, which is the same reading `settings.rs`
  already gives an asset root's name.
- **What counts as "already holds a document".** `what_it_already_holds`
  answers yes to a `document.yaml` file or a chapter anywhere under a Part; a
  folder holding unrelated files, or an empty Part with no chapter in it, is
  still writable. This is the intent's own distinction — "already holds a
  document", not "is not empty" — and `a_second_document_is_still_refused_the_same_way_beside_an_empty_part`
  is the test that would fail if that reading were wrong.
- **No test exercises the mid-write rollback** (a Part folder created, then a
  failure before `document.yaml` is written). The write is two calls to an
  atomic primitive that is itself well-tested (`document.rs`'s own
  `write_chapter_text` suite); reproducing a failure between them needs a
  filesystem fault this suite does not have a safe way to inject. The
  sweep-away code mirrors `export::run_export`'s, which carries the same gap.
- **The dialog opens with no default folder.** Unlike the export panel, which
  opens the dialog beside the currently open document, New document passes no
  default path — there may be no document open at all when Alice reaches for
  it, and defaulting beside one that happens to be open was judged not worth
  the coupling to `src/export/services.ts`'s `parentOf` while another spec is
  actively changing that file. The dialog still opens; it opens wherever the
  operating system last left it.
