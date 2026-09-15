---
id: itd-2609051335399446
slug: open-a-folder-and-see-the-book
spec_id: spc-2609051353137620
kind: standalone
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: editing-surface
supersedes: [itd-2609051221553568, itd-2609051317429272]
---

# Open a folder and see the book

## Press Release

Alice chooses a folder on her machine and Editor opens it as a book. The
sidebar shows exactly what is there: each Part is a folder, each Chapter
is a Markdown file inside it, and inside each Chapter the Sections,
Sub-sections, and Sub-sub-sections drawn from its second, third, and
fourth heading levels. The numeric prefixes on the file and folder names
give the order. Alice clicks any node and that chapter opens in the
editing surface, scrolled to that heading with the cursor on it.

There is no import step, no index file, and nothing to keep in step by
hand. The sidebar is the folder, so it cannot disagree with it. Alice
renames a chapter in the Finder from `03-method.md` to `05-method.md`,
and Editor reloads: the chapter has moved in the sidebar, and no other
file in the document folder has been touched. She adds a chapter by
putting a Markdown file into a Part. She reorders the book by renaming.

A folder with one Part and one chapter opens just as readily as a book of
five Parts, so a set of talk notes is not a lesser case of anything. And
because the structure is the file system and the text is plain Markdown,
the folder Alice opens in Editor is the same folder Emacs opens, the same
folder her backup copies, and the same folder she will still be able to
read when Editor is not in front of her.

## Why This Matters

Alice's material is either one long file whose structure lives inside its
headings, or a folder shadowed by an index that something has to keep
current. Both make a second record of the same truth, and second records
drift: the acceptance project already holds three copies of one text, one
of them thirty lines out of date, with nothing reconciling them
(`03-evidence.md`). Opening the folder and seeing the book removes the
second record entirely — there is one place the order is written, it is
the file names, and every tool she owns can edit it.

## Mechanism

- We expect the sidebar never to disagree with the folder because it
  keeps no ordering of its own: order comes from the numeric prefix on
  the file or folder name and nothing else records it, so renaming is
  reordering (`05-internals.md` section 1). The claim is falsified the
  moment any reorder requires writing a second file.
- We expect four levels of hierarchy to be the right depth because the
  acceptance project carries 177 headings at exactly four levels, with
  two thirds of them at the fourth (`03-evidence.md`). A tree that stops
  at three would hide two thirds of a real document.
- We expect reloading the whole book on every external change to stay
  imperceptible because the text of a demanding real document is about
  7,900 words over 814 lines, while its 2.5 GB of assets are never read
  to draw the tree (`03-evidence.md`).
- We expect Alice to accept the file system as the structure editor
  because renaming already reorders in Finder, in a terminal, and in
  Emacs, so the gesture she learns in Editor is one she can perform when
  Editor is closed.
- We expect the article prototype's hierarchy to map without translation
  because it uses two heading levels below the title and Chapter,
  Section, and Sub-section land on them directly (`03-evidence.md`).

## Scope Conditions

- Platform: the desktop app only — a Tauri 2 shell around the macOS <!-- cond: cond-2609051353132058 -->
  system web view (`02-constraints.md`). Reading views and the single
  HTML file are not in scope here.
- Population: Alice, one author, one document folder open at a time. <!-- cond: cond-2609051353138384 -->
  Collaboration and concurrent editing from two devices are out of scope
  for the product (`06-delivery.md`).
- Assumption: document-level metadata is read from `document.yaml` at the <!-- cond: cond-2609051353136582 -->
  document root, which is where the book's title comes from. A chapter's
  own front matter carries chapter-level metadata only.
- Boundary with map #13, `itd-2609051335529787` (Bring an old single-file <!-- cond: cond-2609051353135286 -->
  manuscript in), and with map #29, `itd-2609051402191319` (Start a new
  document): 13 owns writing the split that creates a chapter folder, and
  29 owns creating the smallest folder that is already a book; 1 owns
  reading whatever is already on disk, including what either of them
  wrote. A flat manuscript is imported through the Import command rather
  than by dropping it here, and 1 makes no promise about folders it did
  not find. What 1 does own of the drop gesture is one case: a Markdown
  file dropped on a Part in the sidebar becomes a new chapter in that
  Part. A file dropped on the editor text is a reference at the cursor
  and belongs to map #4, `itd-2609051335420536`.
- Boundary with map #14, `itd-2609051335537470` (Write one text for two <!-- cond: cond-2609051353138977 -->
  audiences): 1 owns the tree, its ordering, and opening a node; 14 owns
  the variant badges beside a chapter and what they mean. In this phase
  the sidebar carries no variant badge.
- Boundary with the phase: `06-delivery.md` excludes variants, citations, <!-- cond: cond-2609051353132779 -->
  and referenced assets from phase 1, so the asset counts and unresolved
  citation marks that `04-surfaces.md` describes beside a chapter arrive
  with map #11, `itd-2609051335502171`, and map #15,
  `itd-2609051335541009`. What ships here is the tree and its labels.
- Bundle: member of the Editing surface bundle with map #2, <!-- cond: cond-2609051353135907 -->
  `itd-2609051335406422`, and map #3, `itd-2609051335415528`. One spec,
  and none of the three ships alone — a sidebar with no editor is a file
  browser.
- Plumbing inherited, not owned: the on-disk model, the parse tree, and <!-- cond: cond-2609051353136134 -->
  folder watching (`05-internals.md`).

## Acceptance Criteria

- Given a document folder holding `01-beginnings/` and `02-findings/`,
  each with numbered chapter files, When Alice opens the folder, Then the
  sidebar lists both Parts in prefix order, lists each Part's Chapters in
  prefix order beneath it, and labels each Chapter with its level-one
  heading.
- Given a chapter containing `## Beginnings`, `### The first year`, and
  `#### A note on dates`, When Alice expands that chapter in the sidebar,
  Then all three appear as Section, Sub-section, and Sub-sub-section
  nodes, nested and in source order.
- Given the sidebar is showing that chapter, When Alice clicks the
  `#### A note on dates` node, Then the chapter opens in the editing
  surface scrolled to that heading with the cursor on it.
- Given the document is open in Editor, When Alice renames
  `03-method.md` to `05-method.md` in the Finder, Then the sidebar shows
  the chapter in its new position without Alice reopening the folder, and
  every file in the document folder is byte for byte what it was apart
  from the rename.
- Given a single-chapter document — one folder, one Markdown file, one
  `assets/` folder beside it — When Alice opens it, Then the sidebar
  shows that one Chapter with its headings, with no empty Part row and no
  error.
- Given a folder holding no Markdown file at any depth, When Alice opens
  it, Then Editor reports that the folder holds no chapters, shows an
  empty sidebar, and writes no file of any kind inside that folder.
- Given the document is open, When Alice drops a Markdown file on a Part
  in the sidebar, Then the file is placed in that Part with the next
  numeric prefix, the sidebar shows it as a Chapter of that Part with its
  headings beneath it, and its bytes are what were dropped: no line
  reflowed, no character re-escaped, and no heading rewritten.
- Given the document is open, When Alice drops a file that is not
  Markdown on a Part in the sidebar, Then no chapter is created, Editor
  says what it will and will not accept there, and nothing is written
  inside the document folder. (Negative case.)
- Given the desktop app window narrowed to iPad width (820 CSS px), and
  again at iPhone width (390 CSS px) and desktop width (1280 CSS px),
  When Alice opens a document whose deepest chapter title runs to sixty
  characters, Then the sidebar and the editing surface remain legible
  side by side or stacked at every one of the three widths, with no
  horizontal scrolling and no pinch zoom.
- Given a document is open and the machine has no network connection,
  When Alice browses the sidebar and opens every chapter in the book,
  Then every action succeeds and no network request is attempted.
- Inherits: round-trip byte-fidelity (`itd-2609051336074533`); no machine
  in the document (`itd-2609051336080960`); one source, always
  (`itd-2609051336090390`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); legible on three device classes
  (`itd-2609051336128348`); network only on publish
  (`itd-2609051336158553`).

## Open Questions

- Whether the sidebar edits structure at all. `03-evidence.md` leaves
  open "whether the sidebar edits structure — dragging a chapter between
  Parts — or whether structure edits stay in the file system for the
  first release". This intent is written for the second answer; the first
  would add a gesture, not change the tree.
- How a reload behaves against unsaved work. Closing a chapter with unsaved
  changes asks, and the modeline marks an unsaved buffer, so Alice's own
  gestures are covered. (Amended 2026-09-15. As first written this read
  "Closing or switching chapter with unsaved changes asks". Since
  `itd-2609081931493520` a chapter is a buffer the application holds, and a
  window switching to another chapter leaves that buffer, edits and all, with
  the modeline still marking it unsaved, so a switch discards nothing and no
  longer asks; the gestures that do discard — quitting, replacing the
  document, `C-x C-k` — each ask for themselves. Settled by the maintainer
  against iss-2609111123510084.) What is still open is the external
  case: `03-evidence.md` leaves open "how concurrent edits from two
  devices are detected so that last-write-wins can be reported rather
  than silently applied", which is also what decides what Editor does
  when a chapter changes on disk while Alice has it open and edited.
- What the sidebar does with a Markdown file whose numeric prefix is
  missing or collides with another file's, and with a non-Markdown file
  sitting in a Part. Order comes from the prefix and nothing else records
  it, so a missing prefix has no answer yet.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-a19e15cfeda1 -->
Fidelity review — receipt rcp-a19e15cfeda1 (verifier intent-auditor claude-fable-5-1).

Provenance: intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:9d40aeae31c5874fb7baf7d62c896a1bdc5b103c1e9f28147308df32fd29293c
Input attestations: diff:e41596a^..HEAD (4228d9b..1327728)@sha256:6343ab4e968dd2ce947b393ad874bb85af80f3bbb074f2d20e2e98bfd2353d7e; intent:.abcd/development/intents/shipped/itd-2609051335399446-open-a-folder-and-see-the-book.md@-; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609051353137620.md@-;

Acceptance rollup: MET 5 · MET_WITH_CONCERNS 5 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: The walk sorts Parts and Chapters by numeric prefix (document.rs:263-264, proven by walks_a_folder_of_chapters), and the sidebar labels a Chapter with outline.title from its level-one heading, falling back to the filename title; document.test.ts asserts the rendered rows 'first / Alice and the Lantern / second / bob'.
  evidence: src-tauri/src/document.rs:263 — "parts.sort_by(|a, b| compare_by_order((a.order, &a.name), (b.order, &b.name)));"
  evidence: src-tauri/src/document.rs:649 — "fn walks_a_folder_of_chapters()"
  evidence: src/sidebar.ts:213 — "button.textContent = outline?.title !== undefined && outline.title !== null && outline.title !== "" ? outline.title : chapter.title;"
  evidence: src/document.test.ts:204 — "lists Parts and Chapters in prefix order and labels a Chapter with its level-one heading"
- ac-2 — MET: outlineOf maps levels 2/3/4 to section/subsection/subsubsection and nests by a level stack; the outline test uses the criterion's exact headings ('Beginnings', 'The first year', 'A note on dates') and asserts kinds, nesting and source-order lines, and the sidebar test renders them nested after expansion.
  evidence: src/core/outline.ts:63 — "2: "section", 3: "subsection", 4: "subsubsection""
  evidence: src/core/outline.ts:119 — "while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= level)"
  evidence: src/core/outline.test.ts:24 — "nests Sections, Sub-sections, and Sub-sub-sections in source order"
  evidence: src/document.test.ts:216 — "nests Sections, Sub-sections, and Sub-sub-sections in source order"
- ac-3 — MET_WITH_CONCERNS: Clicking a heading node calls openChapter(chapter, node), which loads the text and revealLine(view, node.line) puts the cursor at the heading's line start with scrollIntoView; the test asserts the cursor sits at line 9 '#### A sub-sub-section'. Concern: 'scrolled to that heading' is realised only as the scrollIntoView dispatch flag, which jsdom cannot observe, and no manual row covers it.
  evidence: src/app.ts:523 — "if (node) revealLine(view, node.line);"
  evidence: src/editor.ts:271 — "view.dispatch({ selection: EditorSelection.cursor(at), scrollIntoView: true });"
  evidence: src/document.test.ts:242 — "opens a chapter at the heading a sidebar node names"
  evidence: src/document.test.ts:256 — "expect(line.number).toBe(9);"
- ac-4 — MET_WITH_CONCERNS: The chain exists and each link is tested: the debounced recursive watcher reports a rename (emits_a_change_when_a_chapter_is_renamed passes), open_folder emits document://changed, main.ts routes it to app.reload(), and reload re-walks and redraws keeping expansion with nothing written (document.test.ts asserts written == []). Concern: the live end-to-end (real Finder rename → redraw, and 'every other file byte for byte' via git status) is only covered by manual check M1, which is unticked; the main.ts listen→reload wiring has no automated test.
  evidence: src-tauri/src/watch.rs:135 — "fn emits_a_change_when_a_chapter_is_renamed()"
  evidence: src-tauri/src/lib.rs:114 — "if let Err(error) = watcher.replace(&resolved, move || { if let Err(error) = app.emit(watch::CHANGED_EVENT, ())"
  evidence: src/main.ts:137 — "void listen(CHANGED_EVENT, () => { void app.reload(); });"
  evidence: src/app.ts:445 — "next = await services.openFolder(rootPath);"
  evidence: src/document.test.ts:310 — "redraws the tree when the shell reports a change"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353137620.md:13 — "- [ ] In the Finder, rename one chapter from `02-…` to `04-…`."
- ac-5 — MET: The walk accepts a chapter at the opened root and leaves a reserved `assets/` folder out of the Parts (leaves_the_assets_folder_out_of_the_parts); the sidebar draws root chapters directly under the document heading with no Part row, and the test asserts one row, zero .tree-part-label elements and no .sidebar-empty message.
  evidence: src-tauri/src/document.rs:38 — "const RESERVED_FOLDERS: [&str; 1] = ["assets"];"
  evidence: src-tauri/src/document.rs:674 — "fn leaves_the_assets_folder_out_of_the_parts()"
  evidence: src/sidebar.ts:318 — "body.replaceChildren(title, childList(tree.root, 0));"
  evidence: src/document.test.ts:281 — "shows a one-Part, one-chapter document with no empty rows"
- ac-6 — MET: holdsChapters recurses the whole tree; an empty result draws 'This folder holds no Markdown chapters' in the sidebar and app.ts announces it in the modeline; the Rust walk is read-only and writes_nothing_when_a_folder_holds_no_chapters compares the folder listing before and after; the page test asserts nothing was written.
  evidence: src/sidebar.ts:310 — "if (!holdsChapters(tree.root)) {"
  evidence: src/sidebar.ts:313 — "empty.textContent = "This folder holds no Markdown chapters.";"
  evidence: src/app.ts:409 — "announce(`${title} holds no Markdown chapters${unreadable}`);"
  evidence: src-tauri/src/document.rs:1008 — "fn writes_nothing_when_a_folder_holds_no_chapters()"
  evidence: src/document.test.ts:288 — "reports a folder that holds no chapters"
- ac-7 — MET_WITH_CONCERNS: add_chapter_from copies the source as bytes through a dot-temp file and rename, names it next_prefix + stem (adds_a_dropped_chapter_with_the_next_prefix, copies_dropped_bytes_verbatim with CRLF/tab/no trailing newline); the router sends a Part hit to addChapter and app.reload() then redraws. Concern: no test asserts the new chapter and its headings appear in the sidebar after the drop (the page test only asserts addChapter was called with the Part path and nonce), and the native DragDrop→nonce→add path is covered only by manual M4, unticked.
  evidence: src-tauri/src/document.rs:540 — "let name = format!("{}-{}", next_prefix(part)?, stem);"
  evidence: src-tauri/src/document.rs:1070 — "fn copies_dropped_bytes_verbatim()"
  evidence: src-tauri/src/document.rs:1048 — "fn adds_a_dropped_chapter_with_the_next_prefix()"
  evidence: src/drop.ts:85 — "targets.onPart(path, payload);"
  evidence: src/app.ts:348 — "const added = await services.addChapter(partPath, payload.nonce); await app.reload();"
  evidence: src/document.test.ts:441 — "expect(added).toEqual([{ part: "book/02-second", nonce: "abc" }]);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353137620.md:36 — "## M4 — a Markdown file dropped on a Part"
- ac-8 — MET: add_chapters_from checks every source before writing and refuses with 'is not a Markdown chapter; a Part takes .md and .markdown files'; the Rust test asserts the message and an unchanged Part, and the page test asserts the refusal reaches the modeline and nothing was written.
  evidence: src-tauri/src/document.rs:589 — "if !is_chapter(&name) { return Err(format!("{name} is not a Markdown chapter; a Part takes .md and .markdown files""
  evidence: src-tauri/src/document.rs:1088 — "fn refuses_a_dropped_file_that_is_not_markdown()"
  evidence: src/app.ts:326 — "onRefused: (refusal) => { announce(refusal); }"
  evidence: src/document.test.ts:444 — "says what a Part accepts and writes nothing"
- ac-9 — INCONCLUSIVE: The mechanism is present — a drawer below 820 CSS px, a 260 px column above it, overflow-wrap: anywhere on tree labels, and a toggle test — but legibility, absence of horizontal scrolling and absence of pinch zoom at 390, 820 and 1280 with a sixty-character title is proven only by manual check M2, whose rows are all unticked; no automated test measures layout at any width.
  evidence: src/style.css:194 — "@media (max-width: 820px) {"
  evidence: src/style.css:166 — "overflow-wrap: anywhere;"
  evidence: src/document.test.ts:299 — "opens and closes the drawer on toggle-sidebar"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353137620.md:22 — "## M2 — legible at 390, 820, and 1280 CSS pixels"
- ac-10 — MET_WITH_CONCERNS: The page test stubs fetch and XMLHttpRequest, opens the folder, expands and clicks every row and reloads, and asserts zero attempts; the Tauri CSP restricts connect-src to 'self' and ipc:, and no remote URL appears in the shipped page sources. Concern: only the page's half is automated; the shell-level offline sweep (manual M3) is unticked.
  evidence: src/document.test.ts:521 — "attempts no network request while a document is open"
  evidence: src/document.test.ts:552 — "expect(attempts).toEqual([]);"
  evidence: src-tauri/tauri.conf.json:26 — "connect-src 'self' ipc: http://ipc.localhost"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353137620.md:31 — "## M3 — offline"
- ac-11 — MET_WITH_CONCERNS: Five of the six inherited disciplines are demonstrated: byte fidelity (copies_dropped_bytes_verbatim, round_trips_crlf_bytes_untouched), no machine in the document (writes_nothing_when_a_folder_holds_no_chapters; the reload path writes nothing), one source (order from the filename prefix only, document.rs:263-264; no index file), degrade gracefully (outline reads only what markdown-it makes a heading; fenced-code test), network only on publish (ac-10). Concern: 'legible on three device classes' rests solely on manual M2, unticked, so that discipline is unverified here.
  evidence: src-tauri/src/document.rs:784 — "fn round_trips_crlf_bytes_untouched()"
  evidence: src-tauri/src/document.rs:1070 — "fn copies_dropped_bytes_verbatim()"
  evidence: src-tauri/src/document.rs:1008 — "fn writes_nothing_when_a_folder_holds_no_chapters()"
  evidence: src/core/outline.test.ts:71 — "ignores a heading inside a fenced code block"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353137620.md:22 — "## M2 — legible at 390, 820, and 1280 CSS pixels"

Gap audit:
- honoured:
  - The sidebar is the folder: Parts are folders, Chapters are Markdown files, order comes from the numeric prefix and nothing else records it
    evidence: src-tauri/src/document.rs:263 — "parts.sort_by(|a, b| compare_by_order("
    evidence: src-tauri/src/document.rs:249 — "} else if metadata.is_file() && is_chapter(&entry_name) {"
  - Sections, Sub-sections and Sub-sub-sections drawn from heading levels two to four, from the one parse
    evidence: src/core/outline.ts:100 — "export function outlineOf(chapter: Chapter): Outline {"
    evidence: src/core/outline.test.ts:24 — "nests Sections, Sub-sections, and Sub-sub-sections in source order"
  - Clicking a node opens the chapter with the cursor on that heading
    evidence: src/document.test.ts:256 — "expect(line.number).toBe(9);"
  - An external rename reloads the tree without reopening and touches no other file
    evidence: src-tauri/src/watch.rs:135 — "fn emits_a_change_when_a_chapter_is_renamed()"
    evidence: src/document.test.ts:337 — "expect(written).toEqual([]);"
  - A Markdown file dropped on a Part becomes a chapter with the next prefix, bytes verbatim; a non-Markdown file is refused with a message and nothing written
    evidence: src-tauri/src/document.rs:1070 — "fn copies_dropped_bytes_verbatim()"
    evidence: src-tauri/src/document.rs:1088 — "fn refuses_a_dropped_file_that_is_not_markdown()"
  - A one-chapter folder opens as readily as a book; an empty folder is reported and nothing is written
    evidence: src/document.test.ts:281 — "shows a one-Part, one-chapter document with no empty rows"
    evidence: src-tauri/src/document.rs:1008 — "fn writes_nothing_when_a_folder_holds_no_chapters()"
  - Expansion state survives a reload that renumbers files
    evidence: src/app.ts:451 — "sidebar.setExpansion(expansion);"
    evidence: src/document.test.ts:336 — "expect(app.sidebar.expansion()).toEqual(before);"
- diverged:
  - Spec design places the drawer breakpoint at 1024 CSS px ('column at 1024 and above'); the shipped CSS switches to the drawer at 820 px and below, so 820 gets the drawer as the spec's Layout section says but 821-1023 get the column
    evidence: .abcd/development/specs/closed/spc-2609051353137620-open-a-folder-and-see-the-book.md:195 — "The sidebar is a fixed 260 px column beside the editing surface at 1024 CSS"
    evidence: src/style.css:194 — "@media (max-width: 820px) {"
  - The book's title from document.yaml reaches only the modeline's 'Opened …' message; the sidebar's document row shows the folder's own name
    evidence: src/app.ts:407 — "const title = await documentTitle(next.root.title);"
    evidence: src/sidebar.ts:308 — "title.textContent = tree.root.title;"
  - Spec says the new chapter takes the 'next unused two-digit prefix'; next_prefix takes one past the highest prefix present, so a gap below the highest is never filled (consistent with the press release's 'next numeric prefix')
    evidence: src-tauri/src/document.rs:526 — "Ok(format!("{:02}", highest.saturating_add(1)))"
- missing:
  - Spec task 12: run M1, M2 and M3 (and the checklist's M4) and record the results against this spec — every row of the manual acceptance checklist is unticked
    evidence: .abcd/development/specs/closed/spc-2609051353137620-open-a-folder-and-see-the-book.md:263 — "12. Run M1, M2, and M3 and record the results against this spec."
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353137620.md:10 — "- [ ] Open a real document folder with two Parts and several chapters."
  - Legibility at 390, 820 and 1280 CSS px with a sixty-character title has no automated or recorded manual proof
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353137620.md:22 — "## M2 — legible at 390, 820, and 1280 CSS pixels"

Scope-condition dispositions:
- cond-2609051353132058 — survived: The sidebar, reload and drop live in the desktop host (src/*.ts) over the Tauri shell (src-tauri/), and every folder command refuses to run outside the shell; nothing in this intent's delivery targets a reading view or the single HTML file.
  evidence: src/doctree.ts:158 — "function requireShell(action: string): void {"
  evidence: src-tauri/src/lib.rs:98 — "async fn open_folder("
- cond-2609051353138384 — survived: One canonical DocumentRoot and one CurrentWatch, replaced on every open_folder, so exactly one folder is open and watched at a time; keeps_one_watcher_and_replaces_it passes.
  evidence: src-tauri/src/watch.rs:105 — "*held = None; *held = Some(watch(root, on_change)?);"
  evidence: src-tauri/src/watch.rs:179 — "fn keeps_one_watcher_and_replaces_it()"
- cond-2609051353136582 — narrowed: document.yaml at the root is read through the confinement primitive for the document title, and chapter labels come from each chapter's own level-one heading, not its front matter; but the title only reaches the modeline announcement, while the sidebar's document row shows the folder name.
  narrowing: holds for the modeline's 'Opened < title>' message only; the sidebar's document heading is the folder's filename-derived title, not the document.yaml title
  evidence: src-tauri/src/lib.rs:178 — "metadata::read_metadata(&document::confine_path(&root, metadata::METADATA_FILE)?)"
  evidence: src/app.ts:407 — "const title = await documentTitle(next.root.title);"
  evidence: src/sidebar.ts:308 — "title.textContent = tree.root.title;"
- cond-2609051353135286 — survived: The drop router owns exactly one case for this intent — a Part hit goes to add_chapter — and a hit on the editing surface is handed to the onText hook that main.ts fills from the drop bundle; no import or document-creation gesture was added here.
  evidence: src/drop.ts:81 — "const part = element?.closest< HTMLElement>("[data-part-path]");"
  evidence: src/drop.ts:89 — "if (element?.closest(".cm-editor")) { if (targets.onText) {"
  evidence: src/main.ts:101 — "app.onDropTarget("text", (payload) => { dropTarget.onText(payload); });"
- cond-2609051353138977 — survived: Every row carries an empty badge slot and nothing renders a variant badge; the outline records a node's variants as data only, and the test asserts no badge on any row.
  evidence: src/sidebar.ts:66 — "function badgeSlot(): HTMLSpanElement {"
  evidence: src/document.test.ts:234 — "gives every row an empty badge slot and no badge"
- cond-2609051353132779 — survived: What this intent ships is the tree and its labels: outline.badges and every node's badges are always empty, and no asset count or citation mark is computed beside a chapter.
  evidence: src/core/outline.ts:140 — "return { title, titleLine, nodes, badges: [] };"
  evidence: src/core/outline.test.ts:92 — "carries an empty badge list on every node"
- cond-2609051353135907 — survived: The sidebar shipped in the same commit as the Emacs binding table and the insert palette, and app.ts binds the three bundle members' commands on one surface.
  evidence: src/app.ts:308 — ""keys-panel": () => { openKeysPanel(overlayHost); }, "insert-palette": () => {"
  evidence: src/document.test.ts:14 — "import { createApp, type App, type AppServices } from "./app";"
- cond-2609051353136134 — narrowed: Only the on-disk walk pre-existed as inherited plumbing; the folder watcher and the parse seam were absent and were written by this delivery, as the spec's own scope table records.
  narrowing: holds for the on-disk model (walk, order, confine, atomic write), which pre-existed; the parse tree (src/core/parse.ts) and folder watching (src-tauri/src/watch.rs) were built and owned by this delivery, not inherited
  evidence: .abcd/development/specs/closed/spc-2609051353137620-open-a-folder-and-see-the-book.md:30 — "| `src-tauri/src/watch.rs` | absent | new: a debounced recursive watcher over the open root |"
  evidence: .abcd/development/specs/closed/spc-2609051353137620-open-a-folder-and-see-the-book.md:32 — "| `src/core/parse.ts` | absent | new: markdown-it 14 configured for the canon"
  evidence: src-tauri/src/watch.rs:42 — "pub fn watch< F>(root: &Path, on_change: F) -> Result< FolderWatch, String>"
## Grounds

- pursued: a sidebar that is the file system keeps long documents workable without leaving plain text; wrong if authors keep reaching for a single file or the sidebar and disk disagree in practice
