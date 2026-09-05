---
id: itd-2609051335420536
slug: drop-an-image-and-have-it-just-work
spec_id: spc-2609051353405598
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317433203]
---

# Drop an image and have it just work

## Press Release

Alice is three paragraphs into the chapter about the second winter, and the
photograph she wants is sitting on her desktop. She drags it onto the
paragraph. The file lands in that chapter's `assets/` folder, an image
reference appears at the point where she let go, and the cursor is already
inside the empty alt text, waiting for a caption. She types the caption and
carries on writing. She opened no file picker, typed no path, and never
left the text she was in the middle of.

An hour later she drops the same photograph again, further down the
chapter. The assets folder still holds one copy: Editor recognises the
bytes it already has and writes a second reference to the file that is
there. A photograph straight off her phone is converted to a web format on
the way in and the reference points at the conversion, with no second copy
of the original left behind. A short video clip dropped the same way becomes
a video block naming the local file, a video address dragged or pasted in
becomes a video block naming that address, and a spreadsheet becomes a
link. Whatever she drops, the
answer is a construct already written for her in the canon, and she is left
with the cursor in the one place she still has something to say.

What sits on disk afterwards is a folder anyone can read. The reference is
ordinary Markdown with a path relative to the chapter, so the file still
opens in Emacs, still converts through Pandoc, and still says nothing about
the machine Alice is sitting at. When she sends the folder to Carol, or
opens it herself on a different machine next year, the picture is exactly
where the text says it is.

## Why This Matters

Typing an asset path by hand is where a document quietly breaks: the path
is right on the machine it was typed on and wrong everywhere else, the same
picture arrives three times under three names, and a folder whose name
contains a space breaks the link a month later when nobody remembers what
changed. Alice's own material already carries all three faults. She should
be able to pick a picture up and put it where it goes, and get a document
folder that is still portable, still plain, and still honest about what it
contains.

## Mechanism

- We expect the drop to complete without a file picker or a typed path
  because the shell, not the web view, receives the native drop and owns
  file writing, hashing, and de-duplication (`05-internals.md` section 5),
  so the editor is handed a finished relative reference rather than an
  operating-system path to interpret.
- We expect two drops of one file to cost one copy because asset identity
  is the content hash rather than the file name (`05-internals.md` section
  6). The acceptance project supplies the failing case this is measured
  against: it holds "byte-identical duplicate images" and "duplicated sets"
  of assets (`03-evidence.md`).
- We expect the inserted text to survive every other tool because it is
  Pandoc's own image syntax with an optional attribute, which the canon
  requires of every construct so that "Emacs, Pandoc, and any plain
  renderer read the file and degrade gracefully" (`05-internals.md`
  section 3).
- We expect placing the cursor in the alt text to be the right ending for
  the gesture, rather than after the reference, because alt text is the
  caption in every rendering (`05-internals.md` section 3), so the one
  thing Editor cannot supply is the one thing Alice is left holding.
- We expect relative paths written by the shell to hold where hand-typed
  ones do not, because the known hazard is already recorded rather than
  hypothetical: the acceptance project contains "a percent-encoded folder
  path containing a space" (`03-evidence.md`), which makes escaping a
  testable criterion on day one.
- We expect the gesture to stay silent on the network because the drop
  writes only inside the document folder; nothing is uploaded until Alice
  publishes (`02-constraints.md`, network only on publish).

## Scope Conditions

- Platform: the desktop app on macOS, Tauri 2 with the system web view. <!-- cond: cond-2609051353403730 -->
  Drag and drop from the operating system is a shell capability; the same
  gesture is not offered by the single HTML file, where "assets are added
  in the desktop app" (`04-surfaces.md` section 6).
- Population: Alice, the author, working in an already-open document folder <!-- cond: cond-2609051353400979 -->
  with a chapter open in the editor.
- Size: this intent covers files below the document's size threshold, <!-- cond: cond-2609051353401750 -->
  which are copied into the `assets/` folder beside the chapter and
  referenced by a relative path. In scope: the copy, the reference, the
  cursor, de-duplication of copied files by content hash, and conversion
  of a phone-native image on the way in — conversion belongs to the drop
  at any size, and the original is not kept. Out of scope and owned by
  map #15 `itd-2609051335541009` (Add media too big to copy): everything
  the threshold turns on — referenced assets, named asset roots, the
  record, and the upload on publish. Setting the threshold and naming a
  root belong to map #27, `itd-2609051402126424`.
- Renderings: this intent ends at the reference in the text. What any <!-- cond: cond-2609051353407278 -->
  rendering does with that reference is owned elsewhere; in particular the
  rule that "every image in a Section or Sub-section becomes a slide of its
  own, full-bleed, in source order" belongs to map #5
  `itd-2609051335447894` (Present a chapter with no slide markup).
- Non-image drops: a video file below the threshold produces a `.video` <!-- cond: cond-2609051353402131 -->
  block naming the local file, a video URL dragged or pasted onto the
  text produces a `.video` block naming that address, and any other file
  produces a link (`04-surfaces.md` section 2). The ordered source list,
  the gated source, and what a reader sees when no source is reachable
  are owned by map #16 `itd-2609051335568936` (Point a video at several
  sources, one behind a sign-in). What this intent owns is the drop on
  the editor text: a Markdown file dropped on a Part in the sidebar is a
  new chapter and belongs to map #1, `itd-2609051335399446`; a flat
  manuscript arrives through the Import command and belongs to map #13,
  `itd-2609051335529787`; and an edited chapter comes back through the
  Re-import command, which belongs to map #18, `itd-2609051335586905`.
- Plumbing inherited, not owned here: content hashing, the conversion <!-- cond: cond-2609051353400450 -->
  itself, and the asset record's schema (`05-internals.md` section 6).
  What this intent owns of conversion is the observable outcome: the
  reference points at the web-format file and the phone-native original
  is not left in the document folder.
- Network: the drop performs no network request of any kind, on any path. <!-- cond: cond-2609051353405457 -->

## Acceptance Criteria

- Given a chapter open in the editor with the cursor in a paragraph, When
  Alice drags a 240 kB JPEG from the desktop and drops it on that
  paragraph, Then a copy of the file exists at `assets/lantern.jpg` beside
  the chapter, the text at the drop point reads `![](assets/lantern.jpg)`,
  and the cursor sits between the square brackets ready for the caption.
- Given `lantern.jpg` has already been dropped once, When Alice drops a
  byte-identical copy of the same file, under any file name, into a
  different paragraph, Then the assets folder still holds exactly one file
  and both paragraphs carry a reference resolving to it.
- Given a source file whose name contains a space, When Alice drops it,
  Then the written reference resolves in the editor's preview, and the
  chapter file round-trips byte for byte through a save and reload with the
  reference unchanged.
- Given a chapter whose bytes are recorded before the gesture, When Alice
  drops an image and the chapter is written, Then the file differs from the
  recorded bytes only by the inserted reference: no line is reflowed, no
  character re-escaped, no comment or table touched.
- Given a video file below the document's threshold, When Alice drops it,
  Then a `::: {.video}` block appears at the drop point with a single
  `- local:` entry naming the copied file relative to the chapter, and no
  `site` or `gated` entry is invented.
- Given a video URL, When Alice drags it onto the chapter text or pastes
  it there, Then a `::: {.video}` block appears at that point naming that
  address as its source, nothing is downloaded, no file is copied into
  the document folder, and no request is made to that address.
- Given a spreadsheet or any other file that is neither an image nor a
  video, When Alice drops it on the chapter text, Then it is copied
  beside the chapter under the same threshold rule and an ordinary
  Markdown link to it appears at the drop point, with the cursor in the
  link text ready for a label.
- Given a photograph in a phone-native format, of any size and on either
  side of the threshold, When Alice drops it, Then the reference written
  into the chapter points at a web-format conversion, the phone-native
  original is not left anywhere in the document folder, and the record
  keeps the format it was converted from.
- Given any number of drops of any kind, When the document folder is
  searched afterwards, Then no chapter file and no asset record names
  Alice's machine — no absolute local path, no home directory name, no
  user name, and no local host or volume name; and with the machine
  offline every drop still succeeds and issues no network request.
- Given a dropped image in an open chapter, When the editor window is
  narrowed to iPad width (820 CSS px), and again to iPhone width (390 CSS
  px) and desktop width (1280 CSS px), Then the preview shows the image
  within the measure at every one of the three widths with no horizontal
  scrolling and no pinch zoom.
- Inherits: no machine in the document (`itd-2609051336080960`);
  round-trip byte-fidelity (`itd-2609051336074533`); degrade gracefully
  in a plain tool (`itd-2609051336110536`); network only on publish
  (`itd-2609051336158553`); one source, always (`itd-2609051336090390`);
  legible on three device classes (`itd-2609051336128348`).

## Open Questions

- The default size threshold between copied and referenced assets, which
  decides which side of the line a given drop falls on before Alice has
  set it herself (`03-evidence.md`, open questions, Assets; map #27,
  `itd-2609051402126424`, owns setting it).
- Whether the asset record is per document or per Part, which decides
  where a copied drop is recorded (`03-evidence.md`, open questions,
  Assets).
- What happens when conversion of a phone-native image is unavailable — a
  placeholder, a refusal, or the original left in place (`03-evidence.md`,
  open questions, Assets). Conversion belongs to this moment at any size,
  so this is the moment the answer binds.
- What a video URL dropped from a site that offers no direct media
  address produces, since the block names an address rather than fetching
  one and Editor never probes it.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-3e7bc007f8f8 -->
Fidelity review — receipt rcp-3e7bc007f8f8 (verifier intent-auditor claude-fable-5-1).

Provenance: intent-auditor@claude-fable-5-1 · rubric_hash sha256:0e09f874c820362be6f80ad9eacacb7c37138ad450a3c46a9eed429b2b7239f1 · prompt_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5
Input attestations: diff:e41596a^..HEAD (4228d9b..1327728)@sha256:6343ab4e968dd2ce947b393ad874bb85af80f3bbb074f2d20e2e98bfd2353d7e;

Acceptance rollup: MET 3 · MET_WITH_CONCERNS 6 · NOT_MET 1 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET_WITH_CONCERNS: run_drop copies the file into < Part>/assets/< name> and returns a relative reference (Rust test, passing); insertOutcomes writes `![] (ref)` with the cursor at +2, between the brackets (jsdom test, passing); main.ts wires the branch into the router; but the physical gesture (Finder drag, pointer-to-offset via posAtCoords) is proven only by manual rows that are all unticked, and a JPEG carrying EXIF is rewritten with its metadata segments removed rather than copied byte for byte.
  evidence: src-tauri/src/assets.rs:1914 — "fn copies_a_dropped_image_into_the_assets_folder_beside_the_chapter()"
  evidence: src-tauri/src/assets.rs:1934 — "assert_eq!(fs::read(&copied).expect("copy"), PNG);"
  evidence: src/drop-target.ts:87 — "return { from: at, text, cursor: at + 2 };"
  evidence: src/drop-target.test.ts:108 — "inserts an image reference at the drop point and leaves the cursor in the alt text"
  evidence: src/main.ts:93 — "const dropTarget = createDropTarget({"
  evidence: src-tauri/src/assets.rs:1182 — "return Ok((Payload::Bytes(without_metadata(&bytes)), None));"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:19 — "- [ ] Drag a JPEG of about 240 kB from Finder onto a paragraph"
- ac-2 — MET: ingest hashes the source with SHA-256 and `reuse` returns the recorded path when the digest is already in assets.json; the passing test drops the same bytes under `lantern.png` and `a different name.png` and asserts one file in assets/, one manifest entry, and the same reference from both drops.
  evidence: src-tauri/src/assets.rs:1945 — "fn writes_one_copy_for_two_drops_of_the_same_bytes()"
  evidence: src-tauri/src/assets.rs:1976 — "assert_eq!(names, vec!["lantern.png".to_string()], "one file, not two");"
  evidence: src-tauri/src/assets.rs:1273 — "fn reuse<'a>("
  evidence: src-tauri/src/assets.rs:1060 — "if let Some((entry, reference)) = reuse(context, manifest, &digest) {"
- ac-3 — NOT_MET: The reference is percent-encoded on write (`assets/a%20lantern.jpg`) while the copy on disk keeps the literal space, and the editor's preview read path joins the raw reference onto the chapter folder with no percent-decoding anywhere in src/ or src-tauri/src (the spec's `src/reference.ts` decoder does not exist), so a reference holding %20 cannot resolve in the delivered preview; the round-trip half holds in the buffer test, but the preview half is contradicted by the code and its manual row (M7) is unticked.
  evidence: src-tauri/src/assets.rs:1870 — "fn percent_encodes_a_reference_whose_name_contains_a_space()"
  evidence: src-tauri/src/assets.rs:2229 — "assert!(root.join("01-beginnings/assets/the counts.xlsx").is_file());"
  evidence: src-tauri/src/present.rs:140 — "let candidate = folder_of(&chapter)?.join(reference);"
  evidence: src/core/assets.ts:148 — "return byReference.get(reference.path) ?? byReference.get(written) ?? null;"
  evidence: src/drop-target.test.ts:187 — "round-trips a reference holding a percent-encoded space"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:40 — "- [ ] The reference resolves in the deck preview (map #5)"
- ac-4 — MET: The passing test inserts into a fixture holding a 300+ character line, a ragged pipe table with an escaped pipe, and `< !-- pagebreak -- >`, and asserts the bytes before and after the span are identical to the original; block insertions use the document's own line separator (CRLF test), and write_chapter_text writes the text verbatim through an atomic temp file.
  evidence: src/drop-target.test.ts:168 — "changes only the bytes of the inserted span"
  evidence: src/drop-target.test.ts:177 — "expect(after.slice(0, at)).toBe(before.slice(0, at));"
  evidence: src/drop-target.test.ts:97 — "uses the document's own line separator"
  evidence: src-tauri/src/document.rs:442 — "pub fn write_chapter_text(path: &Path, text: &str) -> Result<(), String> {"
- ac-5 — MET_WITH_CONCERNS: classify maps `ftyp`/EBML heads to Video, ingest copies it below the threshold, and insertionFor writes the video form from core/inserts with one `- local:` line (test asserts no site/gated/poster/caption); the concern is that the block is placed after the end of the paragraph the drop landed in with blank lines added, not literally at the drop point, and no Rust test drops a below-threshold video file end to end (the only video fixture is above the threshold).
  evidence: src/drop-target.test.ts:82 — "writes the video block in the canon's own form, with one source"
  evidence: src/drop-target.test.ts:127 — "writes a video block after the paragraph, never inside it"
  evidence: src/drop-target.ts:97 — "A fenced div at the end of the block the drop landed in."
  evidence: src-tauri/src/assets.rs:304 — "if head.len() >= 12 && &head[4..8] == b"ftyp" {"
  evidence: src-tauri/src/assets.rs:2011 — "fn records_a_referenced_entry_for_a_file_above_the_threshold()"
- ac-6 — MET_WITH_CONCERNS: The paste path is proven: onPaste holds the paste, paste_reference classifies the address by extension with no fetch, and the block is written under `- remote:`; a fetch stub that throws is never called and drop_on_chapter is never invoked. The drag half is unverified: a DOM `drop` listener exists, but the shell's native DragDrop handler intercepts drops and nothing in the delivery records whether a URL drag ever reaches the web view (the checklist row for it is blank), and `remote:` is not one of the canon's three roles (local/site/gated).
  evidence: src/drop-target.test.ts:298 — "writes a video block for a pasted media address"
  evidence: src/drop-target.test.ts:329 — "never reaches the network for a video address"
  evidence: src-tauri/src/assets.rs:1388 — "pub fn classify_address(text: &str) -> PasteOutcome {"
  evidence: src-tauri/src/assets.rs:1491 — "pub async fn paste_reference("
  evidence: src/drop-target.ts:290 — "const onDomDrop = (event: DragEvent): void => {"
  evidence: src-tauri/src/lib.rs:337 — "if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, position }) = event {"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:72 — "- [ ] Drag a link from a browser onto the chapter text. Record what happens"
- ac-7 — MET: The passing Rust test drops `the counts.xlsx`, gets kind File and a percent-encoded relative reference, and finds the copy beside the chapter; the same `bytes >= threshold` gate applies to every class except phone-native; linkInsertion writes `[] (ref)` with the cursor at +1, inside the link text (jsdom test passing).
  evidence: src-tauri/src/assets.rs:2214 — "fn copies_a_file_that_is_neither_image_nor_video()"
  evidence: src-tauri/src/assets.rs:1076 — "if !phone_native && bytes >= context.threshold {"
  evidence: src/drop-target.ts:93 — "return { from: at, text, cursor: at + 1 };"
  evidence: src/drop-target.test.ts:117 — "inserts a link and leaves the cursor in the link text"
- ac-8 — MET_WITH_CONCERNS: The passing macOS test drops a sips-made HEIC and asserts the reference is `assets/IMG_0001.jpg`, converted_from is `heic`, the written file is a JPEG without EXIF, and the assets folder holds only the .jpg; ingest bypasses the threshold for phone-native classes so conversion happens at any size. Concerns: the above-threshold half and DNG are proven by the code branch only (no test), conversion refuses sources over 64 MiB or 80 megapixels so 'of any size' is bounded, and the test returns silently (passes vacuously) where sips cannot write HEIC.
  evidence: src-tauri/src/assets.rs:2321 — "fn converts_a_heic_photograph_to_a_web_jpeg()"
  evidence: src-tauri/src/assets.rs:2360 — "assert_eq!(outcome.reference, "assets/IMG_0001.jpg");"
  evidence: src-tauri/src/assets.rs:1075 — "let phone_native = matches!(class, Class::PhoneNative(_));"
  evidence: src-tauri/src/convert.rs:34 — "pub const MAX_SOURCE_BYTES: u64 = 64 * 1024 * 1024;"
  evidence: src-tauri/src/assets.rs:2335 — "eprintln!("sips is not available; the conversion test is skipped");"
- ac-9 — MET_WITH_CONCERNS: References are built by relative_from and percent-encoded, the manifest records paths relative to the document root, and the passing test scans the written assets.json for the fixture root, $USER, the home folder name, /Users/ and /private/; assets.rs, convert.rs and metadata.rs pull in no networking crate and the frontend test's throwing fetch stub is never called. Concerns: the scan does not cover a host or volume name explicitly, a referenced (above-threshold) entry records the source's parent folder name as a root, and the offline session is an unticked manual row.
  evidence: src-tauri/src/assets.rs:2043 — "fn records_no_absolute_path_in_the_manifest()"
  evidence: src-tauri/src/assets.rs:2069 — "assert!(!manifest.contains("/Users/"), "no home directory");"
  evidence: src-tauri/src/assets.rs:881 — "fn forbidden_root_names() -> Vec< String> {"
  evidence: src-tauri/src/assets.rs:1098 — "let recorded = relative_from(context.root, &destination)"
  evidence: src/drop-target.test.ts:329 — "never reaches the network for a video address"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:104 — "- [ ] Turn networking off. Every drop above still succeeds and issues no"
- ac-10 — INCONCLUSIVE: No automated evidence exists for the three widths: the only proof offered is manual check M9, whose rows are all unticked, and jsdom has no layout engine; the deck's vendored theme caps images at 95% of the slide, which says nothing about horizontal scrolling or pinch zoom at 390/820/1280 CSS px.
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:109 — "- [ ] Open the deck preview of a chapter holding a dropped image."
  evidence: src/vendor/reveal/theme/white.css:132 — ".reveal img,"
  evidence: src/drop-target.test.ts:5 — "jsdom has no layout engine"
- ac-11 — MET_WITH_CONCERNS: Five of the six inherited disciplines carry a cited passing proof: no machine (manifest scan test), byte-fidelity (inserted-span test), degrade gracefully (inserts.test.ts holds every form to one of the canon's shapes and a plain-tool render), network only on publish (fetch stub), one source (videoBlock derives its spelling from formById('video')); the sixth, legible on three device classes, is unverified for the same reason ac-10 is inconclusive.
  evidence: src-tauri/src/assets.rs:2043 — "fn records_no_absolute_path_in_the_manifest()"
  evidence: src/drop-target.test.ts:168 — "changes only the bytes of the inserted span"
  evidence: src/core/inserts.test.ts:173 — "writes one of the five permitted shapes, or Pandoc's own citation or footnote"
  evidence: src/core/inserts.test.ts:299 — "renders every paragraph, in order, and reaches the end of the file"
  evidence: src/drop-target.ts:62 — "const VIDEO_FORM = formById("video");"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:109 — "- [ ] Open the deck preview of a chapter holding a dropped image."

Gap audit:
- honoured:
  - The shell, not the web view, receives the native drop and owns file writing; the page is handed a nonce and a finished relative reference, never an OS path
    evidence: src-tauri/src/lib.rs:337 — "if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, position }) = event {"
    evidence: src-tauri/src/assets.rs:1879 — "fn refuses_a_nonce_it_never_minted_and_one_that_has_expired()"
  - Two drops of one file cost one copy because identity is the content hash, under any file name
    evidence: src-tauri/src/assets.rs:1945 — "fn writes_one_copy_for_two_drops_of_the_same_bytes()"
  - The inserted text is Pandoc's own image/link syntax or a fenced div, written from the one forms module the palette uses
    evidence: src/drop-target.ts:62 — "const VIDEO_FORM = formById("video");"
    evidence: src/core/inserts.test.ts:173 — "writes one of the five permitted shapes"
  - The cursor is left in the alt text (image) or link text (file) with nothing else to type
    evidence: src/drop-target.test.ts:108 — "leaves the cursor in the alt text"
    evidence: src/drop-target.test.ts:117 — "leaves the cursor in the link text"
  - A phone-native photograph is converted to JPEG on the way in, the original is not kept, and the record keeps the source format
    evidence: src-tauri/src/assets.rs:2321 — "fn converts_a_heic_photograph_to_a_web_jpeg()"
  - The drop writes only inside the document folder and makes no network request
    evidence: src/drop-target.test.ts:329 — "never reaches the network for a video address"
    evidence: src-tauri/src/assets.rs:1385 — "Nothing is fetched and nothing is guessed at"
  - Copies are atomic (dot-prefixed temp, sync, rename) and leave no temporary behind
    evidence: src-tauri/src/assets.rs:2255 — "fn leaves_no_temporary_file_behind()"
- diverged:
  - A video address becomes a block 'naming that address as its source': delivered under a `remote:` role that the canon (local/site/gated) and the spec (`gated:`) do not define
    evidence: src-tauri/src/assets.rs:1402 — "role: Some("remote".to_string()),"
    evidence: .abcd/development/specs/closed/spc-2609051353405598-drop-an-image-and-have-it-just-work.md:284 — "`gated:` — the only role whose value is an absolute URL"
  - A video block 'appears at the drop point': delivered after the end of the paragraph the point sits in, with blank lines added
    evidence: src/drop-target.ts:97 — "A fenced div at the end of the block the drop landed in."
  - 'A copy of the file' beside the chapter: a JPEG/PNG/GIF/SVG/WebP carrying metadata is rewritten with its metadata segments removed, and an AVIF carrying metadata is refused, rather than copied
    evidence: src-tauri/src/assets.rs:1172 — "if let Some(format) = unstrippable_metadata(&bytes) {"
    evidence: src-tauri/src/assets.rs:1182 — "return Ok((Payload::Bytes(without_metadata(&bytes)), None));"
  - The spec's module map (`src/canon.ts`, `src/reference.ts`, `src/drop.ts` owning the subscription): delivered as `src/core/inserts.ts` plus `src/drop-target.ts` with no reference decoder at all
    evidence: src/drop-target.ts:11 — "The forms come from `core/inserts.ts`"
    evidence: .abcd/development/specs/closed/spc-2609051353405598-drop-an-image-and-have-it-just-work.md:36 — "`src/reference.ts` (new) | percent-decoding and the media-address test"
  - The intent covers files below the threshold and leaves referenced assets to map #15: the delivery also records referenced entries, roots, and `asset:<id>` references above the threshold
    evidence: src-tauri/src/assets.rs:1313 — "fn reference_in_place("
    evidence: src-tauri/src/assets.rs:2011 — "fn records_a_referenced_entry_for_a_file_above_the_threshold()"
- missing:
  - A reference whose name contains a space resolves in the editor's preview: no percent-decoding exists on the read path, so `%20` cannot find the file that keeps its literal space
    evidence: src-tauri/src/present.rs:140 — "let candidate = folder_of(&chapter)?.join(reference);"
    evidence: src-tauri/src/assets.rs:925 — "pub fn encode_reference(path: &str) -> String {"
  - The preview shows a dropped image within the measure at 390, 820 and 1280 CSS px: no evidence beyond unticked manual rows
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:107 — "## 10. Legibility at three widths (AC10)"
  - Whether a dragged (not pasted) video URL reaches the editing surface at all: the spec's task 8 was to measure it and the checklist's answer line is blank
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:75 — "Write the answer here: ______________________"
  - The manual acceptance log: 52 rows, none ticked, so every gesture-level, layout-level and offline-level claim rests on code reading alone
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353405598.md:6 — "Tick a row only after seeing it yourself."

Scope-condition dispositions:
- cond-2609051353403730 — survived: The drop is taken from Tauri's window DragDrop event and conversion is compiled only for macOS, refusing elsewhere; the single HTML file offers no drop.
  evidence: src-tauri/src/lib.rs:337 — "if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, position }) = event {"
  evidence: src-tauri/src/convert.rs:187 — "#[cfg(not(target_os = "macos"))]"
- cond-2609051353400979 — survived: The branch refuses with 'Open a chapter before dropping a file into it' when no chapter is open, and drop_on_chapter refuses when no folder is open or the chapter resolves outside it.
  evidence: src/drop-target.test.ts:272 — "says so rather than writing when no chapter is open"
  evidence: src-tauri/src/assets.rs:1905 — "fn refuses_a_chapter_outside_the_open_document()"
- cond-2609051353401750 — falsified: The condition assumed everything the threshold turns on (referenced assets, roots, the record) was out of scope and that conversion happens at any size; the delivery implements referenced mode above the threshold with roots and `asset:<id>` references, and conversion is capped at 64 MiB / 80 megapixels.
  evidence: src-tauri/src/assets.rs:1313 — "fn reference_in_place("
  evidence: src-tauri/src/assets.rs:2011 — "fn records_a_referenced_entry_for_a_file_above_the_threshold()"
  evidence: src-tauri/src/convert.rs:34 — "pub const MAX_SOURCE_BYTES: u64 = 64 * 1024 * 1024;"
- cond-2609051353407278 — survived: The drop branch ends at the text: it inserts a reference and places the cursor, and renders nothing; the deck's handling of the reference lives in present.ts/present.rs, outside the drop modules.
  evidence: src/drop-target.ts:8 — "this module's whole job is where it"
  evidence: src/main.ts:92 — "// where the reference goes in the text."
- cond-2609051353402131 — narrowed: A video file writes a `.video` block with one local source, a pasted address writes a `.video` block naming it, and any other file writes a link; a dragged address is only conditionally reachable because the shell's native drop intercepts drags and the fall-through was never measured.
  narrowing: holds for a video file dropped and a video address pasted; a video address dragged onto the text is unverified
  evidence: src/drop-target.ts:145 — "if (outcome.kind === "video") {"
  evidence: src/drop-target.test.ts:298 — "writes a video block for a pasted media address"
  evidence: src/drop-target.ts:227 — "its own `drop` where the platform lets a non-file drag fall through"
- cond-2609051353400450 — falsified: The condition assumed content hashing, the conversion itself and the asset record's schema were inherited plumbing owned elsewhere; this delivery writes all three itself (SHA-256 hashing, the ImageIO conversion, and the Manifest/AssetEntry schema including a new source_sha256 field).
  evidence: src-tauri/src/assets.rs:965 — "pub fn hash_file(path: &Path) -> Result< String, String> {"
  evidence: src-tauri/src/convert.rs:76 — "pub fn to_web_jpeg(bytes: &[u8]) -> Result< Vec< u8>, String> {"
  evidence: src-tauri/src/assets.rs:192 — "fn default() -> Self {"
- cond-2609051353405457 — survived: No networking crate is used by assets.rs, convert.rs or metadata.rs; the address path classifies by extension and writes the string verbatim; a throwing fetch stub is never called in the frontend test.
  evidence: src-tauri/src/assets.rs:1385 — "Nothing is fetched and nothing is guessed at"
  evidence: src/drop-target.test.ts:329 — "never reaches the network for a video address"
## Grounds

- pursued: copy-beside-the-chapter with content-hash de-duplication keeps documents portable; wrong if duplicate assets or broken relative links appear in real documents
