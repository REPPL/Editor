---
id: spc-2609051927564472
slug: alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th
intent: itd-2609051922232742
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Export what I have made to a folder I choose

## Summary

This spec delivers map #31, `itd-2609051922232742`: one panel on `C-c C-e` that
lists every file Editor is willing to write to disk, states each one's
destination and contents before Alice confirms, and writes the two she can
carry — the deck as a folder and the article as a folder — beside a third row
that opens the folder a dry-run publish staged. It adds `src/export-panel.ts`
and `src/export/services.ts` on the page, and `src-tauri/src/export.rs` in the
shell, and it adds no builder: the folder is built by `buildVersion` in
`src/publish/build.ts` and written by `stage_version` in
`src-tauri/src/publish/stage.rs`, the same two functions the dry run runs, so
the folder Alice carries into the room and the version the site serves are one
build with one difference — where the deck's engine sits. The two renderings
this phase cannot make, the single HTML file and the journal PDF, are rows that
say so and name their phase, and neither can be confirmed.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/export-panel.ts` | absent | new: the five rows, what each states, and `createExportPanel` / `mountExportPanel` |
| `src/export/services.ts` | absent | new: the plan a row is described from, the folder dialog, and the three shell calls |
| `src/publish/build.ts` | exists: `buildVersion`, `renderVariant`, the two envelopes, `CHROME_FOLDER` | adds `host: "site" \| "folder"` to `RenderOptions`, a chrome argument on `articleDocument` and `deckDocument`, and `FOLDER_CHROME` |
| `src/keys.ts` | exists: the table, `SUPPRESSED`, `chordIndex` | one `app` row: `export-open`, `C-c C-e` |
| `src/emacs.ts` | exists: `APP_COMMAND_IDS` | adds `export-open`, so the chord reaches the panel from the text |
| `src/main.ts` | exists: mounts publish and settings | mounts the export panel through the same two extension points |
| `src/style.css` | exists: `.panel` at `min(720px, 94vw)` | adds `.export-row` and its state marks; no new width |
| `src-tauri/src/export.rs` | absent | new: `run_export`, the destination refusal, `export_rendering`, `reveal_staged_version` |
| `src-tauri/src/publish/stage.rs` | exists: `stage_version`, `CHROME`, `ENGINE`, `copy_tree` | `copy_tree` widened to `pub(crate)`; `chrome_for_folder(kind)` names the subset an export carries |
| `src-tauri/src/lib.rs` | exists: the handler list | registers the two commands |
| `src/export-panel.test.ts`, `src/export/services.test.ts` | absent | new |
| `src/publish/build.test.ts` | exists | the folder host, and what an exported page and a staged page share |

### Out

- Publishing, the stable id, the version token, the version hash, the flag, the
  push, and what the dry run stages and where: map #7, `itd-2609051335468596`
  (cond-2609051927560765). The dry-run row calls the `publish_dry_run` command
  that already exists and adds no argument to it.
- What the deck contains: map #5 and #6, `itd-2609051335447894` and
  `itd-2609051335458626` (cond-2609051927569197). What the article page says:
  map #9 and #10 (cond-2609051927560440).
- The single HTML file: map #17, `itd-2609051335570842` (cond-2609051927567253).
  The journal PDF, which the pipeline renders and the app never does: map #21,
  `itd-2609051336019782` (cond-2609051927561892). Each is one row that says
  which phase it arrives in.
- The binding table's shape and the contract every overlay obeys: map #2,
  `itd-2609051335406422` (cond-2609051927562246). This spec adds one row and
  opens through `openOverlay`.
- Referenced assets above the threshold: map #15, `itd-2609051402126424`
  (cond-2609051927568274). An export carries copied assets, which is every
  asset phase 1 has.
- Anything outside the desktop app: there is no export panel in the single file
  or on the presenter site (cond-2609051927563540), and nobody but Alice has one
  (cond-2609051927562061).

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| One source, always `itd-2609051336090390` | `src/export/services.test.ts` › "builds through buildVersion, from the tree the dry run builds from"; the row's contents line is read off the built plan, so no list of files is written twice |
| No machine in the document `itd-2609051336080960` | `export_leaves_the_document_folder_byte_for_byte`, `an_exported_folder_carries_no_absolute_path`, `export_refuses_a_destination_inside_the_open_document`; `src/publish/build.test.ts` › "names nothing above the folder it is written into" |
| Network only on publish `itd-2609051336158553` | `src/export-panel.test.ts` › "makes no request through an export"; `no_network_outside_publish`, which names `publish/mod.rs` as the one file holding the HTTP client and now has `export.rs` beside it |
| Legible on three device classes `itd-2609051336128348` | `src/export-panel.test.ts` › "carries no fixed width and breaks a long name"; check M31-2 |
| Round-trip byte-fidelity `itd-2609051336074533` | nothing here writes to a chapter; the export reads the files and the document folder's hashes are taken before and after in `export_leaves_the_document_folder_byte_for_byte` |
| Degrade gracefully in a plain tool `itd-2609051336110536` | no construct is written and the canon is untouched |

## Design

### The panel, and the five rows

`C-c C-e` is free: the table's `C-c` sequences are `i`, `C-p`, `C-l` and `C-,`.
The row is `{ id: "export-open", label: "Export to a folder", chords: ["C-c C-e"],
group: "document", owner: "app" }`, and `mountExportPanel` registers it exactly
as `mountPublishPanel` registers `publish-open`.

The panel is an overlay, not a form: it opens through `openOverlay` in
`src/overlay.ts`, so `C-n` and `C-p` move, `Return` confirms the highlighted
row, and `C-g` and Escape close it — the one cancel contract, not a second copy
of it. `createExportPanel(services)` builds the element; `mountExportPanel(host,
panel)` calls `registerPanel("export", element)` and keeps the element's parent
as the overlay host.

On open the panel asks `services.plan()` once. The plan is a pure build in the
page: `documentForPublish` (shared with publish, so a dirty buffer, an unreadable
chapter and a nameless variant are refused there and here in one place), then
`buildVersion` with `host: "folder"`. Nothing is written, so `C-g` on any row
leaves the disk as it was. Each row is drawn from the plan:

| Row | Destination | Writes |
|---|---|---|
| The deck as a folder | a new folder, `<slug>-deck`, inside the folder you choose | `slides/index.html`; `presenter/` — the deck engine, five vendored files, its stylesheet and its start-up script; `assets/…`, one line per image |
| The article as a folder | a new folder, `<slug>-article`, inside the folder you choose | `index.html`; `presenter/article.css`; `assets/…` |
| A dry run of a publish | the application's own cache folder, outside every document | the version a publish would push, and its step list; opens that folder in the Finder |
| One HTML file that reads anywhere | — | not yet available: phase 5 |
| The journal PDF | — | not yet available: phase 6, and rendered in the pipeline, never in the app |

The counts and the names in the third column come from the plan and from the
chrome table below, never from prose in the panel, which is what keeps the
statement true when the build changes. `slug` is `slugify` from
`src/core/outline.ts` over the document's title. A row whose build carries
refusals shows every one and cannot be confirmed, as the publish panel does.
`onChoose` on either unavailable row announces the phase and returns: no
dialog is opened and no command is invoked.

### One build, two chrome bases

The site keeps its chrome once at its root and copies nothing into a version
folder (`05-internals.md` section 8), so a built page names it `/presenter/…`.
That path resolves to nothing when a folder is opened from disk, so the one
build takes the base as an argument rather than growing a second renderer:

- `articleDocument(title, body, chrome = CHROME_FOLDER)` and
  `deckDocument(title, fragment, chrome = CHROME_FOLDER)`;
- `renderVariant(tree, variant, { title, host })` passes `/presenter` for
  `"site"` — unchanged, so no published version's hash moves — and, for
  `"folder"`, `FOLDER_CHROME` (`presenter`) to the article at the folder's root
  and `../presenter` to the deck one level below it.

Everything else is identical by construction: the same tree, the same variant,
the same `assetPlan`, the same asset hrefs, the same slide markup. An exported
page and a staged page differ in the two or four `href` and `src` attributes
that name the chrome and in nothing else, and a test asserts exactly that by
substituting the base and comparing the whole file byte for byte.

### The folder the shell writes

`run_export(context, request)` in `src-tauri/src/export.rs`, with
`ExportRequest { kind, variant, folder_name, destination, files, copies }` —
the same `BuiltFile` and `AssetCopy` shapes `PublishRequest` carries, because
the build runs in the web view and hands over what it built. In order:

1. `folder_name` must be one path segment matching `^[a-z0-9][a-z0-9-]{0,63}$`.
   The shell validates the name the page slugified rather than trusting it.
2. `destination` is canonicalised. It is refused when it is the open document's
   root or lies inside it — resolved paths compared with `starts_with`, the rule
   `confine_path` uses, inverted — with the reason stated. A rendering written
   into the document folder could be read back as input, which *one source,
   always* forbids.
3. The target is `destination/folder_name`, and where that exists the name gains
   `-2`, `-3`, … until it does not. An export never writes over anything.
4. `stage::stage_version(cache/export-staging, document_root, files, copies)` —
   the dry run's own function, on its own staging tree so neither clears the
   other. Every built path is confined to the staging tree and every asset read
   is confined to the document folder; both hold unchanged.
5. `stage::copy_tree` copies the staged tree into the target, then the chrome
   the kind needs is written beside it.
6. The command reveals the target through the opener plugin's
   `reveal_item_in_dir`. Rust side only: the plugin's own command stays
   ungranted in `capabilities/default.json`, exactly as `open_published_link`
   argues, so no script in the view can name a path to the Finder.

`ExportOutcome { folder: String, files: usize }` carries the created folder's
name and a count, never a path: a machine's folders are not put into a message
the panel may show.

`chrome_for_folder(kind)` in `stage.rs` names the subset, from the constants
that already exist, so the export copies the same bytes the site serves:

- deck: `ENGINE`, all five — `presenter/reveal/{reveal.js,reveal.css,reset.css,plugin/notes/notes.js,LICENSE}` — plus `presenter/slides.css` and `presenter/deck.js` from `CHROME`;
- article: `presenter/article.css` from `CHROME`.

The site's own root files — the shell, `404.html`, `robots.txt`, `_headers`,
`presenter.js`, `presenter.css` — are not in either list. The shell's
`index.html` would collide with the article's, and none of them means anything
in a folder.

`reveal_staged_version` reveals `publish::staging_path(cache_dir)`, refusing
when the dry run has not run. The dry-run row is `publishDryRun` — map #7's
command, unchanged — and then this.

### The dialog

The folder chooser is the dialog plugin's `open({ directory: true, multiple:
false, defaultPath })`, already granted as `dialog:allow-open` and already used
for Open Folder. `defaultPath` is the folder holding the document folder, so the
dialog opens beside the document and never inside it; where no document is open
the panel does not open at all and says why.

## Acceptance Mapping

| Criterion (`itd-2609051922232742`) | Proven by |
|---|---|
| `C-c C-e` opens a panel listing five exports, three with destination and contents, two marked not yet available with their phase | `src/export-panel.test.ts` › "lists five rows, three that write and two that name their phase", "states each row's destination and every file it writes", "reaches the panel through the binding table's row" |
| Neither unavailable row can be confirmed: no dialog, nothing written | `src/export-panel.test.ts` › "opens no dialog and invokes no command on a row that is not yet available" |
| `C-g` closes it, the point is where she left it, no file has changed | `src/export-panel.test.ts` › "closes on C-g and on Escape, having invoked nothing", which asserts the overlay returned focus to the surface; `openOverlay`'s contract is map #2's |
| The written deck folder opens from disk with every slide, every image and the notes as speaker notes, with the network disconnected | `src/publish/build.test.ts` › "a folder build names its engine beside it, and nothing above the folder"; `src/export/services.test.ts` › "hands the deck row the deck page, the engine and the images, and nothing else"; the notes and the slide order are map #5's `src/core/deck.test.ts`; check **M31-1** |
| The exported deck and the staged version folder are byte-identical, and the dry-run row opens the staged folder in the Finder | `src/publish/build.test.ts` › "an exported page is the staged page with the chrome base substituted, byte for byte" (the two envelope attributes are the whole difference; see Risks); `stage_version_writes_the_bytes_it_was_given` and `two_stagings_of_one_build_hash_alike`; `the_dry_run_row_opens_the_folder_the_dry_run_staged` |
| No file in either folder holds an absolute path, a machine name or a user name; every reference between the folder's files is relative | `an_exported_folder_carries_no_absolute_path` (walks the written folder, refusing the temporary root, `/Users`, `file:` and the host name); `src/publish/build.test.ts` › "names nothing above the folder it is written into" |
| Each of the three exports in turn makes no request | `src/export-panel.test.ts` › "makes no request through an export" (the fetch fake the publish panel's network suite uses); `no_network_outside_publish` |
| A destination inside the document folder is refused with the reason stated, and the document folder's hashes are unchanged | `export_refuses_a_destination_inside_the_open_document`, `export_refuses_the_document_root_itself`, `export_leaves_the_document_folder_byte_for_byte` |
| Every row is readable in full at 820 CSS pixels with no horizontal scrolling and no pinch zoom | `src/export-panel.test.ts` › "carries no fixed width and breaks a long name"; check **M31-2** |
| Inherits *one source, always*, *no machine in the document*, *network only on publish*, *legible on three device classes* | the Scope table, one named test each |

Manual checks, logged as an unticked list under
`.abcd/.work.local/logs/acceptance/spc-2609051927564472.md`: **M31-1** copy the
deck folder onto a memory stick, open it in a browser on a second machine with
the network off, and step through every slide, image and speaker note;
**M31-2** the panel at 1280, 820 and 390 CSS pixels in the real window;
**M31-3** the folder dialog opens beside the document folder, and the Finder
reveals the written folder and the staged one.

## Tasks

1. `src/publish/build.ts`: the chrome argument on both envelopes, `host` on
   `RenderOptions`, `FOLDER_CHROME`, and the three build tests. — `npx vitest run src/publish/build.test.ts`
2. `src/keys.ts` and `src/emacs.ts`: the `export-open` row and its id. — `npx vitest run src/emacs-keys.test.ts src/keyspanel.test.ts`
3. `src-tauri/src/export.rs`: `run_export`, the name and destination refusals,
   the collision suffix, `chrome_for_folder` in `stage.rs`, `copy_tree` widened,
   and the tests. — `cargo test --manifest-path src-tauri/Cargo.toml export`
4. The two commands, registered in `lib.rs`, with the reveal on the Rust side. — `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
5. `src/export/services.ts`: the plan, the per-kind file filter, the dialog with
   its default path, and the three calls. — `npx vitest run src/export/services.test.ts`
6. `src/export-panel.ts`, `src/style.css`, and the mount in `src/main.ts`. — `npx vitest run src/export-panel.test.ts`
7. The whole run, then the manual checklist file. — `npm run lint && npm test && cargo test --manifest-path src-tauri/Cargo.toml && cargo fmt --manifest-path src-tauri/Cargo.toml --check`

## Risks and Open Questions

- **Byte-identity and the chrome, the one place the intent asks for something
  the brief forbids.** The intent asks that "the deck files in the exported
  folder and in the staged version folder are byte-identical"; `05-internals.md`
  section 8 says "the presenter, the article script, and the slide engine are
  maintained once at the site root and shared by every published version;
  nothing is copied into a version folder", which is why a staged deck names
  `/presenter/reveal/reveal.js` — a path that resolves to nothing under a
  `file:` URL. The two cannot both hold. The build assumes the narrower reading
  and proves it: every asset is byte-identical, the slide markup is
  byte-identical, and the deck page differs from the staged page only in the
  three `link` and `script` attributes that name the chrome, tested by
  substituting the base and comparing whole files. Striking the criterion, or
  striking the site's rule, is the maintainer's.
- **The deck's page sits at `slides/index.html`.** Keeping the exported folder
  shaped like a version folder is what makes every asset href identical to the
  staged one; the cost is that the file Alice double-clicks is one folder in.
  The panel's row says so. Flattening it would move every image reference and
  give up the comparison above.
- **`03-evidence.md` has already answered the intent's open question.** Its
  trade-off table now carries "An export panel that writes the deck or the
  article as a folder Alice chooses, through the one builder the publish path
  uses" against the rejected "The single HTML file as the only local artefact",
  and `06-delivery.md` no longer excludes a local export. Nothing here reopens
  it.
- **Reveal-in-Finder is macOS-shaped**, as the platform condition says. The
  opener plugin's `reveal_item_in_dir` is what the shell already depends on for
  `open_published_link`; a failure to reveal is reported and does not undo a
  folder that was written.
- **The default threshold is still open** in `03-evidence.md`, so an export
  carries copied assets only and a referenced asset is map #15's. The build
  assumes every asset a phase 1 document holds is copied.
