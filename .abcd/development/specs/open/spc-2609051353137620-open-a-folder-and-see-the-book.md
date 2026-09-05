---
id: spc-2609051353137620
slug: open-a-folder-and-see-the-book
intent: itd-2609051335399446
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Open a folder and see the book

## Summary

This spec delivers map #1, `itd-2609051335399446`: Alice chooses a folder and
Editor shows it as a five-level tree — Part, Chapter, Section, Sub-section,
Sub-sub-section — that reloads itself when the folder changes underneath it.
The scaffold already walks a folder into Parts and Chapters, orders them by
numeric prefix, and opens a chapter into the editing surface; what this spec
adds is the three levels below a Chapter, a chapter label taken from the file's
own level-one heading, a folder watcher in the shell, a Markdown file dropped
on a Part becoming a chapter there, and a layout legible at 390, 820, and 1280
CSS pixels. It is the first of the three specs in the Editing surface bundle and
owns the shell, the document tree, and the sidebar for all three.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src-tauri/src/document.rs` | exists: walk, order, confine, atomic write | adds `add_chapter`, `next_prefix`, `confine_part`, and `read_many` |
| `src-tauri/src/watch.rs` | absent | new: a debounced recursive watcher over the open root |
| `src-tauri/src/lib.rs` | exists: four commands, menu, close gate | adds `read_chapters`, `add_chapter`; starts and replaces the watcher in `open_folder` |
| `src/core/parse.ts` | absent | new: markdown-it 14 configured for the canon; the core's `parse` seam |
| `src/core/outline.ts` | absent | new: headings two to four into an outline with labels and lines |
| `src/doctree.ts` | exists: four IPC wrappers and the tree types | adds the two new commands, `Badge`, and the outline types |
| `src/sidebar.ts` | exists: two levels, click to open | rewritten to five levels, expansion state, drop target, badge slot |
| `src/app.ts` | exists: open, read, save, dirty, discard | adds the outline pass, `reload`, the drop route, the detached-chapter case |
| `src/keys.ts` | exists: the binding table | adds the rows `reload-document` and `toggle-sidebar` (schema owned by spc-2609051353381023) |
| `src/style.css` | exists: fixed 260 px sidebar | adds the drawer breakpoint and the tree indentation |
| `src/document.test.ts` | absent | new: the sidebar, the reload, the drop, and the offline sweep |
| `src/outline.test.ts` | absent | new: heading extraction against the examples |

### Out

- Variant badges, asset counts, and unresolved citation marks beside a chapter.
  `06-delivery.md` excludes variants, citations, and referenced assets from
  phase 1, and cond-2609051353132779 says so. The node model carries an empty
  `badges` list so map #11, #14, and #15 add data, not a redesign.
- Creating a document: map #29, `itd-2609051402191319`. Splitting a flat
  manuscript: map #13, `itd-2609051335529787`. This spec reads whatever is on
  disk, including what either of them wrote.
- A file dropped on the editor's text: map #4, `itd-2609051335420536`. The drop
  router recognises the text target and hands it nothing, so 4 adds a branch.
- Dragging a chapter between Parts in the sidebar. `03-evidence.md` leaves open
  "whether the sidebar edits structure"; this spec is written for the answer
  that structure edits stay in the file system.
- Editing, the keys panel, and the palette: spc-2609051353381023 and
  spc-2609051353398011, the other two members of this bundle.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| Round-trip byte-fidelity `itd-2609051336074533` | the walk, the outline, and the drop are read-only over chapter bytes; the drop copies bytes, never a string round trip (`copies_dropped_bytes_verbatim`) |
| No machine in the document `itd-2609051336080960` | nothing is written into the folder except the dropped chapter's own bytes; `writes_nothing_when_a_folder_holds_no_chapters` |
| One source, always `itd-2609051336090390` | order comes from the filename prefix and nothing else; no index file is written; the rename test proves reordering touches one name |
| Degrade gracefully in a plain tool `itd-2609051336110536` | the outline reads ATX and setext headings only, so a folder Editor has never seen reads identically |
| Legible on three device classes `itd-2609051336128348` | the drawer breakpoint, and manual check M2 at 390, 820, and 1280 |
| Network only on publish `itd-2609051336158553` | `attempts no network request while a document is open`, and manual check M3 |

## Design

### Layers, and who owns what across the bundle

Three layers, and the boundary is not crossed downwards: `src-tauri/src/` is the
shell (files, the watcher, the drop, atomic writes, the menu, claiming key
combinations — `05-internals.md` section 5); `src/core/` is the rendering core
of section 4, which runs unchanged in all four hosts and imports nothing from
the host layer; `src/*.ts` is the desktop host.

Ownership inside the bundle, so three specs do not each rewrite one file. This
spec owns `src-tauri/`, `src/doctree.ts`, `src/sidebar.ts`, `src/core/parse.ts`,
and `src/core/outline.ts`. spc-2609051353381023 owns `src/keys.ts`,
`src/emacs.ts`, `src/editor.ts`, `src/overlay.ts`, `src/keyspanel.ts`, and
`src/modeline.ts`; other specs add rows to the binding table and never change
its shape. spc-2609051353398011 owns `src/core/canon.ts` and `src/palette.ts`,
and extends the plugin set of `parse.ts` rather than forking it. `src/app.ts` is
shared: this spec owns the folder, the chapter, the reload, and the drop; spec 2
owns save, dirty, and conflict; spec 3 owns the palette command.

### The document tree

`DocumentTree` keeps its shape; `Chapter` gains `bytes: number` and
`modified: number | null` from the walk's own metadata call. `title` stays the
filename-derived label and becomes the fallback: the label the sidebar shows for
a Chapter is its level-one heading when the file has one, which is what the
intent's first criterion asks for. That heading is read by the core, not by
Rust, because "what is a heading" must have one implementation or the sidebar
and the deck can disagree about the same file.

### The outline

`src/core/parse.ts` builds one markdown-it instance, pinned exact:
`markdown-it` 14.3.1 with `markdown-it-attrs` 4.5.0 (the `{...}` attributes on
headings, images, and spans), `markdown-it-container` 4.0.0 (the `::: {...}`
fenced divs), `markdown-it-footnote` 4.0.0, and `markdown-it-bracketed-spans`
1.0.3. It exports `parse(text): Token[]` and nothing else in this phase. The
citation plugin and its BibTeX reader arrive with map #11; `reveal.js` and the
renderers arrive with the deck bundle. All five are new dependencies and need
the sign-off `AGENTS.md` requires before the first task runs.

`src/core/outline.ts` turns those tokens into the tree the sidebar draws:

```
Badge        { kind: "variant" | "assets" | "unresolved", label, count? }
OutlineNode  { id, kind, label, level, line, children, badges }
Outline      { title: string | null, nodes: OutlineNode[], badges: Badge[] }
```

- `kind` is `section`, `subsection`, or `subsubsection` for levels two, three,
  and four; `title` is the text of the first level-one heading.
- `label` is the heading's text with its attribute block removed, so
  `## Interlude {.divider}` reads as "Interlude" and the class is data on the
  node rather than characters in the label.
- `line` is the heading's one-based line, from the token's `map`. Lines, not
  byte offsets: a line is the same number in Rust and in CodeMirror while a byte
  offset is not, and nothing before the annotation anchors of map #22 needs
  offsets. A wrong offset recorded now is worse than none.
- `id` is the heading path joined by slashes, slugified — the path shape
  `05-internals.md` section 7 gives an annotation anchor — so expansion state
  survives a reload that renumbers files.
- `badges` is present and always empty here; nothing computes one yet and
  nothing renders an empty list.

Fenced code is markdown-it's problem, which is the point of using it: a `## ` at
the start of a line inside a fence is not a Section, and the examples hold such
lines.

### IPC

| Command | Arguments | Returns | Errors |
|---|---|---|---|
| `open_folder` | `path` | `DocumentTree` | the folder cannot be read or is not a folder; unreadable entries come back in `failures` rather than as an error |
| `read_chapters` | `paths: string[]` | `{ reads: [{ path, text }], failures: string[] }` | each path is confined to the open root; one unreadable chapter is a failure line, not a failed batch |
| `add_chapter` | `part`, `source` | `Chapter` | the Part is outside the open document; the source is not `.md` or `.markdown`; the target name already exists; the copy failed |
| `read_chapter` | `path` | `string` | unchanged |
| `write_chapter` | `path`, `text` | — | unchanged |
| `set_dirty` | `dirty` | — | unchanged |

`read_chapters` makes a reload one round trip rather than one per chapter. The
demanding document is about 7,900 words over 814 lines (`03-evidence.md`), so
reading every chapter to draw the tree is cheap; its 2.5 GB of assets are never
opened. `add_chapter` refuses before it writes: `confine_part` resolves the Part
inside the canonical root the way `confine_chapter` already resolves a file, the
extension check reuses `is_chapter`, and the destination name is the next unused
two-digit prefix in that Part followed by the source's stem with any prefix of
its own removed. The bytes are copied as bytes through the same
temp-file-and-rename path `write_chapter_text` uses, so a half-written chapter
never appears in the tree and no line ending, escape, or trailing newline is
touched.

### Watching

`src-tauri/src/watch.rs` holds one recursive watcher over the canonical root,
built on `notify` 8.2.0 with `notify-debouncer-full` 0.7.0 — both new crates,
both needing sign-off. `open_folder` replaces any watcher already running, which
is what keeps "one document folder open at a time" (cond-2609051353138384) true
in the shell as well as on screen. Events are debounced at 150 ms and emitted to
the page as `document://changed` carrying no payload: the page re-walks rather
than trusting a diff, because the walk is the only thing that decides order.
A save that provokes a reload finds the bytes it wrote and changes nothing on
screen; the temporary files `write_chapter_text` creates start with a dot and
the walk already skips them.

`App.reload()` re-walks, re-reads, and redraws, keeping the expansion set and
the selected path. An open chapter unchanged on disk is left alone; one changed
on disk with a clean buffer takes the new text and the modeline says so; one
changed on disk with a dirty buffer makes Editor ask which text to keep and
write neither until she answers, which is what `04-surfaces.md` requires.
Detection compares the bytes on disk against the bytes Editor read, not a hash:
hashing arrives with publish. A chapter whose path no longer resolves leaves the
buffer alone, marks it detached in the modeline, and refuses the next save with
the missing path named.

### The drop

`src/app.ts` listens for the webview's drag-drop event, converts the physical
position to CSS pixels, and asks `document.elementFromPoint` what lies under the
pointer. A hit on `[data-part-path]` routes to `add_chapter`; a hit on the
editing surface is map #4's and is left alone; anything else is refused with a
message naming what each target accepts. The rule itself is written once in
`05-internals.md` section 5.

### Layout

The sidebar is a fixed 260 px column beside the editing surface at 1024 CSS
pixels and above, and a drawer over the surface below that, opened by the
`toggle-sidebar` row of the binding table and by a control that names its chord.
Tree rows indent by depth and wrap rather than scroll, so a sixty-character
title takes a second line and the pane never scrolls sideways. Of the three
widths the discipline names, 390 and 820 get the drawer and 1280 the column.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| Two Parts, prefix order, chapters labelled by their level-one heading | `src/document.test.ts` › "lists Parts and Chapters in prefix order and labels a Chapter with its level-one heading"; `src-tauri` › `walks_a_folder_of_chapters` (exists) |
| `##`, `###`, `####` appear nested and in source order | `src/outline.test.ts` › "nests Sections, Sub-sections, and Sub-sub-sections in source order" |
| Clicking a Sub-sub-section opens the chapter scrolled to it, cursor on the heading | `src/document.test.ts` › "opens a chapter at the heading a sidebar node names" |
| A Finder rename moves the chapter without reopening, and touches no other file | `src/document.test.ts` › "redraws the tree when the shell reports a change"; `src-tauri` › `emits_a_change_when_a_chapter_is_renamed`; manual check M1 |
| A single-chapter document opens with no empty Part row and no error | `src/document.test.ts` › "shows a one-Part, one-chapter document with no empty rows" |
| A folder with no Markdown reports it, shows an empty sidebar, writes nothing | `src/document.test.ts` › "reports a folder that holds no chapters"; `src-tauri` › `writes_nothing_when_a_folder_holds_no_chapters` |
| A Markdown file dropped on a Part becomes a chapter with the next prefix, bytes untouched | `src-tauri` › `adds_a_dropped_chapter_with_the_next_prefix`, `copies_dropped_bytes_verbatim`; `src/document.test.ts` › "routes a sidebar drop to the Part under the pointer" |
| A non-Markdown file dropped on a Part creates nothing and says what is accepted | `src-tauri` › `refuses_a_dropped_file_that_is_not_markdown`; `src/document.test.ts` › "says what a Part accepts and writes nothing" |
| Legible at 390, 820, and 1280 with a sixty-character title | manual check M2 |
| Browsing and opening every chapter offline attempts no request | `src/document.test.ts` › "attempts no network request while a document is open"; manual check M3 |
| Round-trip byte-fidelity | `src-tauri` › `copies_dropped_bytes_verbatim`, `round_trips_crlf_bytes_untouched` (exists) |
| No machine in the document | `src-tauri` › `writes_nothing_when_a_folder_holds_no_chapters`; manual check M1 |
| One source, always | `src/document.test.ts` › "redraws the tree when the shell reports a change" |
| Degrade gracefully in a plain tool | `src/outline.test.ts` › "ignores a heading inside a fenced code block" |
| Legible on three device classes | manual check M2 |
| Network only on publish | `src/document.test.ts` › "attempts no network request while a document is open" |

Manual checks, run with `npm run tauri dev` and recorded against this spec:

- **M1** — open a real folder, rename a chapter in the Finder, watch the sidebar
  move it, then confirm with `git status` that the rename is the only change.
- **M2** — resize to 390, 820, and 1280 CSS pixels with a sixty-character
  chapter title open; nothing scrolls sideways and nothing needs a pinch.
- **M3** — with the machine offline, open a folder and every chapter in it.

## Tasks

1. Obtain sign-off for `markdown-it` 14.3.1, `markdown-it-attrs` 4.5.0,
   `markdown-it-container` 4.0.0, `markdown-it-footnote` 4.0.0,
   `markdown-it-bracketed-spans` 1.0.3, `notify` 8.2.0, and
   `notify-debouncer-full` 0.7.0, then install them.
   Verify: `npm run lint` and `cargo build --manifest-path src-tauri/Cargo.toml`.
2. Add `src/core/parse.ts` with the pinned instance and the four plugins.
   Verify: `npx vitest run src/outline.test.ts` once step 3 lands.
3. Add `src/core/outline.ts` and `src/outline.test.ts`, driving them from
   `examples/presentation/01-slides/01-technology-impact-assessment.md` and a
   fixture carrying a fourth-level heading, which the examples lack
   (`examples/CANON-CHECK.md`). Verify: `npx vitest run src/outline.test.ts`.
4. Add `bytes` and `modified` to `Chapter` in `src-tauri/src/document.rs`, and
   `read_many`. Verify: `cargo test --manifest-path src-tauri/Cargo.toml`.
5. Add `confine_part`, `next_prefix`, and `add_chapter_from` to
   `src-tauri/src/document.rs` with their refusal tests.
   Verify: `cargo test --manifest-path src-tauri/Cargo.toml add_`.
6. Expose `read_chapters` and `add_chapter` in `src-tauri/src/lib.rs` and mirror
   them in `src/doctree.ts`. Verify: `npm run lint`.
7. Add `src-tauri/src/watch.rs`, start it from `open_folder`, and emit
   `document://changed`. Verify:
   `cargo test --manifest-path src-tauri/Cargo.toml watch`.
8. Rewrite `src/sidebar.ts` to five levels with expansion state, `data-part-path`
   on Part rows, and the empty badge slot.
   Verify: `npx vitest run src/document.test.ts`.
9. Wire the outline pass, `reload`, the conflict prompt, and the detached case
   into `src/app.ts`. Verify: `npx vitest run src/document.test.ts`.
10. Route the webview drag-drop event to `add_chapter` for a Part target and to
    nothing for the text target. Verify: `npx vitest run src/document.test.ts`.
11. Add the drawer breakpoint to `src/style.css` and the `toggle-sidebar` and
    `reload-document` rows to `src/keys.ts`. Verify: `npm test`.
12. Run M1, M2, and M3 and record the results against this spec. Verify:
    `npm run build && npm run lint && npm test && cargo test --manifest-path src-tauri/Cargo.toml`.

## Risks and Open Questions

- **Seven new dependencies.** `AGENTS.md` requires sign-off before any is added,
  and `03-evidence.md` records no decision on a Markdown parser or a watcher.
  The build assumes the pins above and stops at task 1 without sign-off. The
  watcher's fallback is polling the walk on window focus, which costs the
  criterion "without Alice reopening the folder" only while the window is
  already focused.
- **Structure editing in the sidebar** is open in `03-evidence.md`: "whether the
  sidebar edits structure — dragging a chapter between Parts — or whether
  structure edits stay in the file system for the first release". The build
  assumes the second. Dropping a chapter onto a Part is the one structural
  gesture, and it is the drop rule of `05-internals.md` section 5, not a
  reordering.
- **Concurrent edits** are open in `03-evidence.md`: "how concurrent edits from
  two devices are detected so that last-write-wins can be reported rather than
  silently applied". The build assumes the narrower case `04-surfaces.md`
  already settles — a chapter changed on disk while the buffer is dirty asks
  which text to keep — and nothing more.
- **A missing or colliding numeric prefix** has no answer in the brief; the
  intent says so. The build assumes the walk's existing rule, which
  `05-internals.md` section 1 states: names sharing a prefix, and names with
  none, sort after it by name. The sidebar shows that order and reports nothing.
- **Chapters loose at the document root.** `05-internals.md` section 1 says the
  document folder holds no chapter, while the walk accepts one and the intent's
  single-chapter criterion depends on the opened folder itself being the Part.
  The build shows loose chapters where the walk puts them and writes nothing;
  map #29 owns the shape a new document is written in. A chapter with no
  level-one heading keeps the filename-derived title it has today.
- **`markdown-it` is not a byte-faithful parser**, and the byte-fidelity
  discipline depends on the serialiser of `05-internals.md` section 2, which no
  phase-1 intent needs. Nothing here writes a chapter from a parse: the buffer
  holds the file's text and the walk never opens a chapter for writing. A later
  serialiser is judged against that discipline on its own.
