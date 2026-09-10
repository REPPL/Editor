---
id: spc-2609051353405598
slug: drop-an-image-and-have-it-just-work
intent: itd-2609051335420536
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Drop an image and have it just work

## Summary

This spec delivers the drop gesture for `itd-2609051335420536` (map #4,
standalone, phase 1): a file dragged onto a chapter's text lands in that
chapter's Part `assets/` folder and a canonical Markdown reference appears
at the drop point with the cursor where the caption goes. The shell owns all
of the file work — the native drop event, content hashing, de-duplication,
phone-native conversion, the atomic copy — and hands the frontend a finished
reference relative to the chapter, so the web view never sees an
operating-system path and never decides what a file is. The frontend owns the
position: it turns the drop's physical point into a document offset, writes
one of three canonical forms through a shared forms module, and places the
cursor. It adds two Rust modules, one command, three frontend modules and
their tests; no renderer, and it stops at the reference in the text.

## Scope

### In

| Module | Owns |
|---|---|
| `src-tauri/src/assets.rs` (new) | classification by magic bytes, SHA-256 hashing, the threshold gate, name choice and collisions, the atomic copy, `assets.json` |
| `src-tauri/src/convert.rs` (new) | phone-native decode and JPEG re-encode through Apple's ImageIO, behind `#[cfg(target_os = "macos")]` |
| `src-tauri/src/metadata.rs` (new) | a partial `document.yaml` read for `asset_threshold_bytes` and nothing else |
| `src-tauri/src/lib.rs`, `Cargo.toml` | the one command, registered on the existing handler and confined by the existing `DocumentRoot`; the pinned crates; `dragDropEnabled` left at `true` |
| `src/canon.ts` (new) | the canonical forms and their cursor offsets |
| `src/reference.ts` (new) | percent-decoding and the media-address test |
| `src/drop.ts` (new) | the subscription, the position mapping, the URL branch on drop and paste, the drop cue |
| `src/doctree.ts`, `src/app.ts`, `src/main.ts` | one service, wired |
| `src/core/inserts.test.ts`, `src/drop-target.test.ts`, `docs/how-to-drop-images-videos-and-files.md` | the tests, the how-to page, and the manual checks recorded under `.abcd/.work.local/logs/acceptance/` |

### Out, and who owns it

- Referenced mode, asset roots, the manifest schema, the upload on publish:
  map #15, `itd-2609051335541009`. This spec reads the threshold and refuses
  above it. Setting it and naming a root: map #27, `itd-2609051402126424`.
- Further video sources, the try-in-order rule, the poster fallback: map
  #16, `itd-2609051335568936`. This spec writes the block with one source.
- What a rendering does with the reference, including an image becoming its
  own slide: map #5, `itd-2609051335447894`. This spec ends at the text.
- A Markdown file dropped on a Part in the sidebar (map #1), Import (map
  #13), Re-import (map #18): the target decides, and those targets are not
  the chapter's text. The insert palette (map #3) consumes `src/canon.ts`;
  it does not own it.

### Disciplines inherited, and where each is proven

| Discipline | Proven by |
|---|---|
| Round-trip byte-fidelity (`itd-2609051336074533`) | `src/drop-target.test.ts` compares the buffer before and after and asserts the only differing bytes lie in the inserted span |
| No machine in the document (`itd-2609051336080960`) | `assets.rs::records_no_absolute_path_in_the_manifest`; conversion writes no EXIF |
| Degrade gracefully in a plain tool (`itd-2609051336110536`) | `src/core/inserts.test.ts` asserts each form is an image attribute, a bracketed link, or a fenced div with attributes, and nothing else |
| Network only on publish (`itd-2609051336158553`) | `src/drop-target.test.ts::never reaches the network for a video address`, with a failing `fetch` stub |
| One source, always (`itd-2609051336090390`) | one forms module writes every construct; the reference is the only record of the asset in the text |
| Legible on three device classes (`itd-2609051336128348`) | check M9 against the deck preview at 390, 820 and 1280 CSS pixels |

## Design

### The gesture and the command

`dragDropEnabled` stays `true`, so the shell — not the web view — receives
the native drop and gets real paths. `src/drop.ts` subscribes through
`getCurrentWebview().onDragDropEvent`, whose payload is
`{ type: 'enter' | 'over' | 'drop' | 'leave', paths, position }` with
`position` a `PhysicalPosition`. On `enter` and `over` the editor pane takes
a `dropping` class and the modeline says what a drop would write; `leave`
and `drop` clear it. On `drop` the point converts once:

```ts
const { x, y } = position.toLogical(await getCurrentWindow().scaleFactor());
const offset = view.posAtCoords({ x, y }) ?? view.state.doc.length;
```

A point outside the editor pane's rect is not this gesture and is ignored.
The frontend then calls one command and inserts what comes back.

```
drop_on_chapter(chapter: String, paths: Vec<String>) -> Result<DropReport, String>
```

`Err` for the three whole-gesture failures: no folder is open, the chapter
resolves outside the open document (`document::confine_chapter`), or the
`assets/` folder cannot be created. Everything else is per file, so one bad
file does not cost Alice the other four, as `document::read_tree` already
reads a partial walk.

```rust
struct DropReport { accepted: Vec<DropOutcome>, refused: Vec<DropRefusal> }
struct DropRefusal { name: String, reason: String }
struct DropOutcome {
    kind: AssetKind,                // Image | Video | File
    reference: String,              // percent-encoded, relative to the chapter
    id: String,                     // first 16 hex characters of the SHA-256
    bytes: u64,                     // of the source
    converted_from: Option<String>,
    deduplicated: bool,
}
```

Per path, in order:

| Step | What happens |
|---|---|
| 1 Resolve | `fs::canonicalize`, then `fs::metadata`. A folder is refused. |
| 2 Classify | On the first 32 bytes, not the extension. `FF D8 FF` JPEG; `89 50 4E 47 0D 0A 1A 0A` PNG; `GIF8` GIF; `RIFF….WEBP` WebP; `1A 45 DF A3` WebM. An ISO base media file is `ftyp` at byte 4, then the brand: `heic heix heim heis hevc hevx hevm hevs mif1 msf1` is a phone-native image, `avif avis` a web image, everything else video. `II*\0` or `MM\0*` with a `.dng` name is phone-native raw. SVG has no magic number, so a `.svg` name opening `<?xml` or `<svg` is an image — one talk kept for local testing is SVG throughout. Anything else is a file. |
| 3 Gate on size | `bytes >= threshold` is refused, naming the size and the threshold, which is `asset_threshold_bytes` from `document.yaml` when `metadata.rs` can read it, else 8 MiB. |
| 4 Hash | Stream the source through SHA-256; `id` is the first 16 hex characters, matching §6's shape, and the full digest is kept as `source_sha256`. The hash is over the **source** bytes, never the conversion, because an encoder is not guaranteed byte-stable. |
| 5 De-duplicate | An entry in `assets.json` with that `id` whose recorded path still resolves inside the document folder at the recorded length is reused: nothing is copied, `deduplicated` is true, and the reference is built from that path relative to this chapter. This is what makes two drops of one file cost one copy under any file name. |
| 6 Name it | The source's file name, extension substituted when converting, leading dots stripped, control characters and `:` replaced with `-`, truncated to 200 bytes. If `assets/<name>` exists it is hashed: equal bytes are adopted and recorded, different bytes take `<stem>-2.<ext>`, `-3`, …, compared case-insensitively because APFS is. |
| 7 Convert or copy | Either way the bytes go to a dot-prefixed temporary in the same `assets/` folder, are `sync_all`ed, then renamed into place — `document::write_chapter_text`'s atomic shape, the dot keeping `document::read_part` from listing a half-written file. |
| 8 Record | Append or replace the `assets.json` entry at the document root, written the same way: `id`, `kind`, `bytes`, `mode: "copied"`, `path` relative to the document root, `converted_from` where set, `source_sha256`; created with `schema_version: 1` and `hash: "sha256"` when absent. No absolute path is ever written. |

### Conversion

`convert.rs` decodes through Apple's ImageIO and re-encodes to JPEG at
quality 0.82: `CGImageSourceCreateWithURL`, `CGImageSourceCreateImageAtIndex`,
then `CGImageDestinationCreateWithURL` with the UTI `public.jpeg`.
Orientation is applied to the pixels and the source's property dictionary is
**not** carried into the destination, so the written JPEG stands upright and
carries no EXIF — which is also how this path keeps the no-machine
discipline, a phone photograph's EXIF holding GPS coordinates and the camera
owner's name. `converted_from` records `heic`, `heif`, or `dng`.

Pinned, added to `[dependencies]` in `src-tauri/Cargo.toml`:

```toml
sha2 = "0.11.0"
percent-encoding = "2.3.2"

[target.'cfg(target_os = "macos")'.dependencies]
objc2-image-io = { version = "0.3.2", features = [
  "CGImageSource", "CGImageDestination", "CGImageProperties",
  "objc2-core-graphics", "std",
] }
objc2-core-foundation = "0.3.2"
objc2-core-graphics = "0.3.2"
```

**No Rust crate decodes HEIC at a cost this repository can pay.** `image`
0.25.10 supports no HEIF and its maintainers exclude the format on patent
grounds. `libheif-rs` 3.0.0 over `libheif-sys` 5.3.1+1.23.1 works, but needs
a system `libheif` through Homebrew and `pkg-config` — a provisioning step
`AGENTS.md` does not have — and puts an LGPL-3.0 native library in an MIT
bundle. The one pure-Rust decoder, `heic` 0.1.6, is AGPL-3.0-only or a paid
commercial licence, which an MIT repository cannot take, and its own README
says the code is not fully reviewed. ImageIO is on every Mac, is Apple's own
licensed decoder, adds no build friction, and reads DNG through the same
interface; `sips -s format jpeg <in> --out <out>` is that machinery through
a subprocess and is the recorded alternative if the bindings prove
troublesome.

**When conversion is unavailable** — a corrupt file, a HEIF variant ImageIO
declines, a build with no ImageIO — the drop is **refused**: nothing written
into the folder, nothing into the chapter, and the modeline names the file
and says the conversion failed. No placeholder, because a reference to a
picture that is not the picture is a quiet lie inside a document meant to be
portable, and leaving the original is what the intent forbids. This answers
the open question in `03-evidence.md` and must be struck from it.

### What is written into the text

`src/canon.ts` returns `{ text, cursor }`, `cursor` an offset into `text`,
so the palette and the drop write one set of forms. The forms are quoted
from `05-internals.md` §3:

| Drop | Written | Cursor |
|---|---|---|
| Image | `![](assets/lantern.jpg)` | between the square brackets |
| Video file | `::: {.video}` / `- local: assets/keynote.mp4` / `:::` | the line after the block |
| Video address | the same block, `- gated: <url>` | the line after the block |
| Anything else | `[](assets/counts.xlsx)` | between the square brackets |

An image and a link are inline and go exactly at the drop offset. A fenced
div is a block, so it is inserted at the end of the block the drop landed in,
with a blank line either side, adding only the separators not already there —
it never splits a paragraph and never rewrites a line. Line breaks are
`view.state.lineBreak`, so a CRLF chapter gets CRLF. Several files insert in
the order dropped, the point advancing, the cursor ending in the last slot.
The reference is percent-encoded in Rust with `percent-encoding`: everything
outside the set of letters, digits and `-._~/` is escaped, which covers the
space, the parentheses, the angle brackets, the quotes, the backslash, the
backtick and the percent sign that would otherwise break a Markdown
destination. The file keeps the name Alice gave it, and `src/reference.ts`
decodes, so encoding has one implementation.

An address becomes a video block only when its path ends in
`.mp4 .m4v .mov .webm .ogv` — a direct media address. Nothing else is
guessed at: a page URL from a site offering no media address inserts as an
ordinary Markdown link on a drop and pastes as plain text on a paste,
because a paste that rewrites what Alice pasted is a paste she cannot use.
Nothing is fetched on any path; the address is written verbatim. Tauri's
drag-drop carries file paths only, so an address arrives through the web
view's own `paste` (guaranteed) or `drop` (conditional — see Risks).

## Acceptance Mapping

| Intent criterion | Proven by |
|---|---|
| AC1 240 kB JPEG: copy at `assets/lantern.jpg`, `![](assets/lantern.jpg)`, cursor in the alt text | `assets.rs::copies_a_dropped_image_into_the_assets_folder_beside_the_chapter`; `src/drop-target.test.ts::"inserts an image reference at the drop point and leaves the cursor in the alt text"` |
| AC2 the same bytes twice under any name: one file, two references | `assets.rs::writes_one_copy_for_two_drops_of_the_same_bytes`; `assets.rs::a_second_drop_into_another_part_copies_rather_than_climbing_out_of_it` |
| AC3 a name with a space resolves, and the chapter round-trips | `assets.rs::percent_encodes_a_reference_whose_name_contains_a_space`; `src/drop-target.test.ts::"round-trips a reference holding a percent-encoded space"`; check M7 for the preview |
| AC4 the chapter differs only by the inserted reference | `src/drop-target.test.ts::"changes only the bytes of the inserted span"` over a fixture with a 544-character line, a ragged table and `<!-- pagebreak -->` |
| AC5 a video file below the threshold: a `.video` block with one `local:` entry, nothing invented | `src/drop-target.test.ts::"writes the video block in the canon's own form, with one source"` |
| AC6 a video address: a block naming it, nothing downloaded, nothing copied, no request | `src/drop-target.test.ts::"writes a video block for a pasted media address"`; `src/drop-target.test.ts::"never reaches the network for a video address"` (a `fetch` stub that fails the test if called, and no `drop_on_chapter` call) |
| AC7 any other file: copied under the same rule, an ordinary link, cursor in the link text | `assets.rs::copies_a_file_that_is_neither_image_nor_video`; `src/drop-target.test.ts::"inserts a link and leaves the cursor in the link text"` |
| AC8 phone-native: the reference points at the conversion, no original left, the record keeps the format | `assets.rs::converts_a_heic_photograph_to_a_web_jpeg`, which asserts all three: the reference points at the conversion, no original is left, and the manifest records the format it came from. The above-threshold half is deferred — see Risks |
| AC9 no machine named anywhere; offline every drop succeeds and makes no request | `assets.rs::records_no_absolute_path_in_the_manifest` (scans every written file for the fixture root, the home directory name and the user name); `src/drop-target.test.ts::"never reaches the network for a video address"`; check M8, run with networking off |
| AC10 the preview shows the image within the measure at 390, 820 and 1280 CSS pixels | check M9, against the deck preview of map #5. Not automatable in jsdom, which has no layout engine — see Risks |
| A copy carries none of the author's machine, whatever the format | `assets.rs::finds_the_metadata_a_copy_must_not_carry`, `takes_the_metadata_out_without_touching_the_image`, `takes_a_gifs_comment_and_application_blocks_out`, `takes_an_svgs_comments_metadata_and_local_paths_out`, `refuses_an_avif_carrying_metadata_it_cannot_take_out`, `a_jpeg_this_reader_loses_its_place_in_is_treated_as_carrying_metadata` |
| A conversion asks for a bounded amount of memory | `convert.rs::caps_what_a_conversion_reads_and_what_it_writes` |
| A `document.yaml` that will not parse stops the drop rather than being guessed at | `assets.rs::an_unparsable_document_yaml_stops_the_drop_rather_than_guessing` |
| Inherits, six disciplines | the table under **Scope**; each row names its test |

Manual checks, logged under `.abcd/.work.local/logs/acceptance/`: **M7** drop a file whose name
carries a space and read the reference back in the preview; **M8** run a session of drops with
networking off; **M9** open the deck preview of a dropped image at 390, 820 and 1280 CSS px.

## Tasks

Each Cargo command below is `cargo <verb> --manifest-path src-tauri/Cargo.toml`,
abbreviated to `cargo <verb>`.

1. Add the pinned crates; write `metadata.rs`. Verify:
   `cargo build && cargo test metadata`.
2. `assets.rs`: classification and hashing, with the magic-byte tests.
   Verify: `cargo test classifies`.
3. `assets.rs`: name choice, collision handling, the atomic copy,
   `assets.json`, de-duplication, the no-machine scan. Verify:
   `cargo test assets`.
4. `convert.rs` over ImageIO, with a checked-in HEIC fixture. Verify:
   `cargo test converts_a_heic`.
5. Register `drop_on_chapter` in `lib.rs` with its confinement tests.
   Verify: `cargo test && cargo clippy --all-targets -- -D warnings`.
6. `src/canon.ts`, `src/reference.ts`, `src/canon.test.ts`, and
   `dropOnChapter` in `src/doctree.ts`. Verify:
   `npx vitest run src/canon.test.ts && npm run lint`.
7. `src/drop.ts` — the subscription, the position mapping, the insertion,
   the cursor, the drop cue — with the `dropAssets` service on `src/app.ts`
   wired in `src/main.ts`. Verify: `npx vitest run src/drop.test.ts`.
8. The URL branch on `paste` and on the web view's `drop`, with the `fetch`
   stub test, measuring whether a non-file drag arrives. Verify: as task 7.
9. `docs/how-to-drop-images-videos-and-files.md` — the how-to; the manual checks are recorded under `.abcd/.work.local/logs/acceptance/`; the two
   decisions this spec makes (refusal rather than a placeholder, ImageIO
   rather than a HEIC crate) in `.abcd/work/DECISIONS.md`; the
   conversion-fallback question struck from `03-evidence.md`. Verify:
   `npm run build && npm test && npm run lint`.

## Risks and Open Questions

- **The default threshold is open** (`03-evidence.md`, open questions,
  Assets). The build assumes `asset_threshold_bytes` from `document.yaml`
  where present — both example documents carry `8388608` — and 8 MiB
  otherwise, refusing at or above it, because referenced mode is map #15.
- **AC8 straddles a phase boundary**: it asks for conversion "of any size and
  on either side of the threshold", but above the threshold an asset is
  referenced rather than copied, which is map #15 in phase 4. The build
  proves the below-threshold half and asserts an above-threshold drop is
  refused for its size, not its format.
- **AC10 asks a rendering question this intent's own scope excludes.** The
  intent "ends at the reference in the text" and "what any rendering does
  with that reference is owned elsewhere", yet AC10 asks the preview to show
  the image at three widths. Phase 1's only preview is the deck (map #5), so
  the build measures there; until map #5 lands, AC10 and the preview half of
  AC3 stay open against this spec.
- **The intent says nothing about the cursor after a video block.** Its press
  release leaves Alice "with the cursor in the one place she still has
  something to say" — a caption — but AC5 enumerates what appears and
  `caption=""` is not among it. The build takes the criterion literally: the
  bare block, cursor on the line after. `::: {.video caption=""}` with the
  cursor in the quotes is the change if the criterion is loosened.
- **The canon has no role for a plain remote video address.** §3 defines
  `local` (a relative path or an `asset:` id), `site` (a path under the
  published document) and `gated` (a URL on a site that asks the viewer to
  sign in); a public `.mp4` address is none of them. The build assumes
  `gated:` — the only role whose value is an absolute URL, and renderings
  try every source in order regardless — and flags that map #16 should add a
  `remote:` role or widen one of the three.
- **A non-file drag may not reach the web view.** With `dragDropEnabled` true
  the shell intercepts the drop and Tauri's payload carries file paths only;
  whether a drag with no file URLs falls through to the web view's own `drop`
  on macOS is unsettled and task 8 measures it. `paste` satisfies AC6 alone,
  so only AC6's drag half is at risk.
- **The intent asks whether the asset record is per document or per Part.**
  §6 answers it — "One manifest per document, at its root" — so the build
  follows the brief. `source_sha256` is a field this spec adds to §6's entry
  so that de-duplication does not rest on a 64-bit truncation; map #15 owns
  the schema. The `document.yaml` read is likewise partial — one key, with a
  fallback on anything it cannot parse, rather than a YAML dependency for one
  integer — and map #29's reader replaces it.
- **Copied JPEGs keep their EXIF.** Only conversion strips metadata, so a
  JPEG dropped straight off a phone carries its GPS coordinates into the
  document folder. AC9 scans chapter files and the record rather than asset
  binaries, so this passes as written, but it wants a decision before phase 4
  puts 80 photographs through the same gesture.
