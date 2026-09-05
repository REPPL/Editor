---
id: itd-2609051922232742
slug: alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th
spec_id: spc-2609051927564472
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609051922220654
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Export what I have made to a folder I choose

## Press Release

Alice has a talk on Thursday and a document that is ready for it. She
presses `C-c C-e` and a panel opens over the text, listing what Editor can
write from the document as it stands. Three rows can be written now: the
deck as a folder, the article as a folder, and a dry run of a publish.
Each row says where it writes and what it puts there before she confirms
anything — the deck row names the folder it will create, the built slides,
the deck engine that runs them, and every asset the chapters reference.
Two further rows sit below, marked not yet available with the phase each
arrives in: one HTML file that reads anywhere, and the journal PDF. Alice
can see what the app does and what it does not do without leaving the
panel. `C-g` closes it and nothing is written.

She chooses the deck. The native folder dialog opens beside her document
folder, never inside it, and she picks a folder on her desktop. Editor
writes it: the deck's page, the engine it needs, and the images the
chapters use, copied under names that need no escaping. She double-clicks
the page and the deck runs in her browser with every slide, every image,
and every speaker note in place, with no network and nothing installed.

Thursday's room has a machine that will not join the network and a
projector that will. Alice copies the folder onto a memory stick, Bob
opens the page on the room's machine, and the talk runs from disk. Carol,
who could not come, gets the article folder the same way and reads it on
her laptop that evening.

The third row does the other job. The dry run stages the version a publish
would push and opens that folder in the Finder, so Alice can look at
exactly what would go to the site before anything leaves her machine. All
three rows are written by the builder the publish itself uses, so the
folder she carries into the room holds the same bytes the site will serve.
No export writes anything into the document folder, and no export touches
the network.

## Why This Matters

Alice's work is only as portable as the machine it was made on. Without
this panel her local options are a link that needs the network and a
publish she cannot inspect until it has already happened: she cannot hand
a colleague a folder, present from a room that is offline, or look at what
a publish would push before pushing it. The panel makes every file the app
is willing to write visible in one place, with its destination and its
contents stated in advance, so writing to disk is a thing Alice decides
rather than a thing she discovers afterwards.

## Mechanism

- We expect one panel that names each export's destination and contents
  before Alice confirms to be read rather than skipped, because the
  keyboard prototype recorded in `03-evidence.md` proves that an overlay
  which owns the keyboard while it is open, lists what it offers, and is
  cancelled by one chord is legible to a keyboard user; the same prototype
  supplies the cancel rule this panel obeys.
- We expect the exported deck to run from disk because the slide prototype
  proves a dependency-free build with the engine carried beside the
  content, and records that "a CDN is acceptable on the site and
  unacceptable in the single file" — a folder opened from a memory stick
  is the offline case, not the site case.
- We expect the folder Alice carries and the version the site serves to
  agree because both come from the same build step, which
  `05-internals.md` section 4 makes a function of the tree and the variant
  alone. A second builder for local output would be a second place for the
  renderings to disagree, and the brief's answer to that is that "a
  rendering difference between hosts is a bug in the core".
- We expect the exported folder to carry nothing of Alice's machine
  because every asset the build copies is named by its path relative to
  the document root and lands under a published name, as `05-internals.md`
  sections 1 and 6 require of the document folder itself; the export
  inherits that naming rather than inventing one.
- We expect defaulting the destination beside the document, and refusing a
  destination inside it, to keep the document a source and only a source,
  because a rendering written into the document folder is a rendering that
  can be read back as input, which the *one source, always* discipline
  forbids.
- The falsifier the source observation names: if authors export rarely
  enough that a single menu item with a dialog would serve, the panel is
  ceremony. It is wrong if Alice, after a term of use, has used one row
  and never read the others.

## Scope Conditions

- Platform: the desktop app in its web view on macOS, with the shell's <!-- cond: cond-2609051927563540 -->
  native folder dialog and its reveal-in-Finder. There is no export panel
  in the single HTML file or on the presenter site.
- Population: Alice, the author, at her own machine. Bob and Carol receive <!-- cond: cond-2609051927562061 -->
  a folder; neither has an export panel of their own.
- Phase: this is phase 1, so an export carries copied assets only. A <!-- cond: cond-2609051927568274 -->
  referenced asset above the threshold is intent 15's
  (`itd-2609051402126424` sets the threshold and the roots; intent 15 owns
  what an export then links to), and this intent adds no behaviour of its
  own for one.
- Boundary with intent 7 (`itd-2609051335468596`), publish: 7 owns <!-- cond: cond-2609051927560765 -->
  publishing, the stable id, the version hash, the flag, the push, and the
  dry run's staging — what is staged and where. This intent owns only the
  row that names the dry run in the panel, states what it writes, and
  opens the staged folder for Alice to look at.
- Boundary with intents 5 and 6 (the deck bundle): 5 and 6 own what the <!-- cond: cond-2609051927569197 -->
  deck contains — the default mapping and the constructs that shape it.
  This intent owns only that the deck those two define is written into a
  folder Alice chooses, with the engine and the assets beside it.
- Boundary with the article bundle (intents 9 and 10, phase 2): those own <!-- cond: cond-2609051927560440 -->
  the page's layout, its margin notes, and its reader controls. This
  intent owns only that the built page and its assets are written into a
  folder; it adds nothing to what the page says.
- Boundary with intent 17 (`itd-2609051335570842`), the single HTML file: <!-- cond: cond-2609051927567253 -->
  17 owns the file, its embedding, and its offline behaviour. This intent
  owns only the row that lists it as not yet available and names the phase
  it arrives in.
- Boundary with intent 21 (`itd-2609051336019782`), the journal PDF: 21 <!-- cond: cond-2609051927561892 -->
  owns the printed artefact and the pipeline step that renders it, which
  never runs in the app. This intent owns only the row that lists it as
  not yet available and names its phase.
- Boundary with intent 2 (the editing surface bundle): 2 owns the binding <!-- cond: cond-2609051927562246 -->
  table and the contract every overlay obeys — that it takes the keyboard
  while open and that one cancel chord closes it. This intent contributes
  one entry to that table and obeys the contract; it does not restate it.
- Assumption: the deck engine ships with the app, so an export copies it <!-- cond: cond-2609051927563438 -->
  and needs no network to complete.

## Acceptance Criteria

- **Given** a document open in the app, **when** Alice presses `C-c C-e`,
  **then** a panel opens listing five exports: the deck as a folder, the
  article as a folder, and a dry-run publish, each stating the folder it
  writes to and the files it writes there; and the single HTML file and
  the journal PDF, each marked not yet available with the phase it arrives
  in; and neither of those two can be confirmed — the confirm key on
  either opens no dialog and writes nothing.
- **Given** the panel open, **when** Alice presses `C-g`, **then** the
  panel closes, the point is where she left it, and no file anywhere on
  disk has changed.
- **Given** a chapter whose Sections carry images written as
  `![The lantern at dusk](assets/lantern.jpg)` and a `::: {.notes}` block,
  **when** Alice chooses the deck row, accepts the dialog's default
  destination beside the document folder, and confirms, **then** the
  written folder opens in a browser from disk with every slide in order,
  every image displayed, and the notes block as that slide's speaker
  notes, with the network disconnected.
- **Given** the same document and variant, **when** Alice exports the deck
  to a folder and then runs the dry-run row, **then** every asset and all
  slide markup in the exported folder are byte-identical to the staged
  version's, the deck page differs only in the attributes that point at
  the engine and stylesheet beside it, and the dry-run row opens the
  staged folder in the Finder.
- **Given** an article export and a deck export just written, **when**
  every file in each folder is searched, **then** no file contains an
  absolute path, a machine name, or a user name, and every reference
  between the folder's own files is relative.
- **Given** the network watched at the shell, **when** Alice runs each of
  the three available exports in turn, **then** no request is made.
- **Given** a hash of every file in the document folder taken before,
  **when** Alice runs each of the three available exports in turn, and
  attempts to choose a destination inside the document folder, **then**
  that destination is refused with the reason stated, and the hashes taken
  afterwards are identical to those taken before.
- **Given** the app window at 820 CSS pixels wide, **when** the panel is
  open, **then** every row's name, destination, and statement of what it
  writes is readable in full with no horizontal scrolling and no pinch
  zoom.
- Inherits: *one source, always*; *no machine in the document*; *network
  only on publish*; *legible on three device classes*.

## Open Questions

- `03-evidence.md` records the trade-off "The single HTML file as the only
  local artefact", whose accepted cost is that "Alice cannot hand someone
  a folder to serve; anything local is one file or a published link".
  This moment is that folder. Whether the trade-off row stands as written,
  and whether the matching exclusion in `06-delivery.md` ("A local export
  of the renderings as files") is struck, is not settled by the evidence
  chapter and belongs to the maintainer.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-3e95007d468c -->
Fidelity review — receipt rcp-3e95007d468c (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:17a3ad3e52e25a7b2ad08f9c8bc61d017c3f0ee9c11e8cf32539ad456d714893
Input attestations: diff:34caa3f..HEAD (c15eda3); code read at HEAD, the export feature itself landing in 34caa3f@sha256:94526d6365a8cdc85538163d14b8468edfe57132f48cb484f06905d87286062e; intent:.abcd/development/intents/shipped/itd-2609051922232742-alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th.md@-; spec:.abcd/development/specs/closed/spc-2609051927564472-alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th.md@-; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609051927564472.md (every row unticked)@-; test-run:npx vitest run src/export-panel.test.ts src/export/services.test.ts src/publish/build.test.ts: 45 passed; cargo test export: 22 passed@-;

Acceptance rollup: MET 3 · MET_WITH_CONCERNS 4 · NOT_MET 0 · INCONCLUSIVE 2

Per-criterion verdicts:
- ac-1 — MET: keys.ts binds export-open to C-c C-e and main.ts mounts the panel on that command; rowsFor draws exactly five rows, the three writable ones with a destination sentence and a per-file list read off the built plan, the single-file and PDF rows marked unavailable with 'phase 5' and 'phase 6'; run() returns before any dialog or command on an unavailable row and the test proves chooseFolder, exportRendering, dryRun and reveal are never called on rows 4 and 5.
  evidence: src/keys.ts:774-778 — "id: "export-open", label: "Export to a folder", chords: ["C-c C-e"]"
  evidence: src/main.ts:152-160 — "const exportPanel = createExportPanel( createExportServices(loadForPublish, ...) ... mountExportPanel(app, exportPanel);"
  evidence: src/export-panel.ts:61-105 — "return [ writable("deck"), writable("article"), { id: "dry-run", ... }, { id: "single-file", ... available: false, why: SINGLE_FILE_PHASE }, { id: "pdf", ... why: PDF_PHASE } ];"
  evidence: src/export-panel.ts:51-53 — "SINGLE_FILE_PHASE = "Not yet available: phase 5."; PDF_PHASE = "Not yet available: phase 6, and rendered in the publish pipeline, never in the app.""
  evidence: src/export/services.ts:107-114 — "return [ ...plan.files.filter((file) => file.path === page).map((file) => file.path), ...FOLDER_CHROME_FILES[kind], ...plan.copies.map((copy) => copy.to) ];"
  evidence: src/export-panel.ts:227-231 — "if (!row.available) { // No dialog is opened and no command is invoked. announce(...); return; }"
  evidence: src/export-panel.test.ts:127-154 — "expect(rows.map((row) => row.dataset["row"])).toEqual(["deck", "article", "dry-run", "single-file", "pdf"]);"
  evidence: src/export-panel.test.ts:207-222 — "expect(used.calls.chooseFolder).not.toHaveBeenCalled(); expect(used.calls.exportRendering).not.toHaveBeenCalled(); ... expect(used.said.join(" ")).toMatch(/phase \d/);"
  evidence: src/export-panel.test.ts:156-182 — "expect(written).toContain("slides/index.html"); expect(written).toContain("presenter/reveal/reveal.js"); expect(written).toContain("assets/01-slides/lantern.jpg");"
- ac-2 — MET: The panel opens through openOverlay, which records document.activeElement on open, closes on every keyboard-quit chord, removes the element and calls returnFocusTo.focus() without dispatching any transaction; the test presses each keyboard-quit chord and asserts the overlay is gone, focus is back on the element that had it, and no service but the pure plan() was invoked — plan() is buildVersion in the page and writes nothing.
  evidence: src/overlay.ts:149-150 — "const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;"
  evidence: src/overlay.ts:204-208 — "if (chordsOf("keyboard-quit").includes(chord)) { event.preventDefault(); event.stopPropagation(); overlay.close(false); return; }"
  evidence: src/overlay.ts:180-190 — "hooks.element.remove(); ... // nothing here dispatched a transaction, so there is nothing to restore. returnFocusTo?.focus();"
  evidence: src/export-panel.test.ts:224-247 — "expect(press(chord).defaultPrevented).toBe(true); expect(currentOverlay()).toBeNull(); ... expect(document.activeElement).toBe(before); ... expect(call).not.toHaveBeenCalled();"
  evidence: src/export/services.ts:141-142 — "/** Build the open document as a folder would carry it. Writes nothing. */ plan(): Promise< ExportPlan>;"
  evidence: src/export/services.ts:191-202 — "const built = buildVersion(document.tree, document.variant, { rendered: renderVariant(document.tree, document.variant, { title: document.title, host }) });"
- ac-3 — INCONCLUSIVE: The mechanism is present and cited: the deck row hands the shell slides/index.html plus every asset copy, the shell writes the staged tree and then the vendored engine (reveal.js, reveal.css, reset.css, plugin/notes/notes.js, slides.css, deck.js) beside it, the folder build names that engine as ../presenter/… with no scheme and no leading slash, deck.js registers RevealNotes, and the dialog opens at the parent of the document folder. But the criterion's observable — the folder opening in a browser from disk with every slide, every image and the notes as speaker notes, with the network disconnected — is assigned by the spec to manual check M31-1, every row of which is unticked, and no automated test opens the written folder in a browser. Unverified, not failed.
  evidence: src-tauri/src/export.rs:599-637 — "assert_eq!(names, vec!["assets/01-part/lantern.jpg", "presenter/deck.js", "presenter/reveal/LICENSE", "presenter/reveal/plugin/notes/notes.js", "presenter/reveal/reset.css", "presenter/reveal/reveal.css", "presenter/reveal/reveal.js", "presenter/slides.css", "slides/index.html"]);"
  evidence: src-tauri/src/publish/stage.rs:130-152 — "pub const ENGINE: [(&str, &str); 5] = [ ("presenter/reveal/reveal.js", include_str!("../../../src/vendor/reveal/reveal.js")), ..."
  evidence: src/publish/build.test.ts:435-450 — "for (const name of ["../presenter/reveal/reset.css", ..., "../presenter/reveal/plugin/notes/notes.js", "../presenter/deck.js"]) { expect(folder.deck).toContain(name); }"
  evidence: site/presenter/deck.js:39-40 — "if (global.RevealNotes) { options.plugins = [global.RevealNotes];"
  evidence: src/core/render/slides.ts:218-221 — "< aside class="notes"${attributes([["data-source", slide.notesSource]])}>"
  evidence: src-tauri/src/export.rs:425-455 — "if let Some(folder) = opens_at { dialog = dialog.set_directory(folder); } dialog.blocking_pick_folder()"
  evidence: src/export/services.ts:214-215 — "// The dialog opens beside the document folder, never inside it. beside: parentOf(documentRoot()),"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051927564472.md:9-25 — "## M31-1 — the deck folder runs from disk, on another machine, offline ... - [ ] Every slide is there ... - [ ] Every image is displayed. - [ ] The speaker-notes window ..."
- ac-4 — MET_WITH_CONCERNS: One builder: plan() and dryRun() both run buildVersion over renderVariant, differing only in host; the build test proves folder.deck equals site.deck with '="/presenter' replaced by '="../presenter' byte for byte and that every non-chrome reference and every asset copy is identical, while stage_version writes the bytes it is given and two stagings of one build hash alike; the dry-run row calls publish_dry_run then reveal_staged_version, which reveals publish::staging_path. Concerns: (1) the difference is six attributes (three link, three script), not the 'two or four' the spec's design text says — consistent with the criterion as written but the spec is loose; (2) the Finder reveal itself is a tauri_plugin_opener call that no test exercises and manual check M31-3 is unticked; (3) this criterion was narrowed inside the delivered range by commit 5240f71, from 'the deck files … are byte-identical' to the page-differs-only-in-chrome-attributes wording judged here.
  evidence: src/publish/build.test.ts:408-433 — "const deckSubstituted = site.deck.split('="/presenter').join('="../presenter'); expect(folder.deck).toBe(deckSubstituted); ... expect(rest(folder.deck)).toEqual(rest(site.deck));"
  evidence: src/publish/build.ts:485-490 — "export function chromeBase(host: BuildHost, rendering: "article" | "slides"): string { if (host === "site") { return CHROME_FOLDER; } return rendering === "slides" ? `../${FOLDER_CHROME}` : FOLDER_CHROME; }"
  evidence: src/publish/build.ts:589-599 — "< link rel="stylesheet" href="${chrome}/reveal/reset.css"> ... < script src="${chrome}/deck.js">< /script>"
  evidence: src/export/services.test.ts:116-138 — "expect(plan.files).toEqual(built.files); expect(plan.copies).toEqual(built.copies); ... expect(plan.copies).toEqual(site.copies);"
  evidence: src/export/services.ts:224-236 — "const { variant, built } = await build("site"); return invoke< PublishOutcome>("publish_dry_run", { request: { variant, flag: "unlisted", files: ..., copies: ... } });"
  evidence: src-tauri/src/export.rs:1041-1075 — "fn stage_version_writes_the_bytes_it_was_given() ... fn two_stagings_of_one_build_hash_alike() ... assert_eq!(first.hash, second.hash); ... assert_eq!(walk(&first.path), walk(&second.path));"
  evidence: src-tauri/src/export.rs:492-496 — "pub async fn reveal_staged_version(app: tauri::AppHandle) -> Result<(), String> { let cache = cache_dir(&app)?; let staged = staged_version_path(&cache)?; reveal(&app, &staged) }"
  evidence: src-tauri/src/export.rs:1085-1103 — "assert_eq!(staged_version_path(&fixture.context.cache_dir).expect("a folder"), staged.path);"
  evidence: src/export-panel.test.ts:279-292 — "expect(used.calls.dryRun.mock.invocationCallOrder[0] ?? 0).toBeLessThan(used.calls.revealStagedVersion.mock.invocationCallOrder[0] ?? 0);"
  evidence: .abcd/development/intents/shipped/itd-2609051922232742-alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th.md:156-161 — "then every asset and all slide markup in the exported folder are byte-identical to the staged version's, the deck page differs only in the attributes that point at the engine and stylesheet beside it (narrowed in commit 5240f71)"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051927564472.md:40-52 — "- [ ] Choose the dry-run row: the Finder opens with the staged version folder selected"
- ac-5 — MET_WITH_CONCERNS: an_exported_folder_carries_no_absolute_path writes both folders and walks every file, refusing the temporary root, $HOME, the user's own name, 'file:' and '="/' in any HTML; the folder build test refuses any scheme, leading slash or double climb in the article's and deck's references; the shell's own messages name no path. Concerns: no test asserts the machine's host name is absent, although the spec claims that test does; and the relative-reference assertion covers the two built pages only, not the copied chrome (reveal.css, reveal.js, notes.js), which are vendored constants that no test scans for internal references.
  evidence: src-tauri/src/export.rs:998-1038 — "assert!(!text.contains(&temporary), ...); if !home.is_empty() { assert!(!text.contains(&home), ...); } if user.len() > 2 { assert!(!text.contains(&user), ...); } if name.ends_with(".html") { assert!(!text.contains("file:"), ...); assert!(!text.contains("=\"/"), ...); }"
  evidence: src/publish/build.test.ts:452-468 — "for (const url of references(folder.article)) { expect(url, url).not.toMatch(/^(?:[a-z] [a-z0-9+.-]*:|\/|\.\.)/i); } for (const url of references(folder.deck)) { ... expect(url, url).not.toContain("../../"); }"
  evidence: src-tauri/src/export.rs:892-926 — "fn nothing_an_export_says_names_a_path_on_the_machine() ... assert!(!export.outcome.folder.contains('/'), ...);"
  evidence: src/export/services.test.ts:209-218 — "expect(name).not.toContain(ROOT); expect(name).not.toMatch(/^\//); expect(name).not.toContain("..");"
  evidence: .abcd/development/specs/closed/spc-2609051927564472-alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th.md:169-171 — "`an_exported_folder_carries_no_absolute_path` (walks the written folder, refusing the temporary root, the home folder's own prefix, `file:` and the host name)"
- ac-6 — MET: On the page, the network suite replaces fetch with a rejecting fake, runs the deck, article and dry-run rows in turn and asserts fetch was never called; in the shell, no_network_outside_publish walks every .rs file and finds the ureq client named in publish/mod.rs alone, export.rs holds none, and the dry-run row invokes publish_dry_run → run_publish, whose dry_run branch skips install and commit, while the one ureq agent lives in check_deploy_at, a command the export panel never invokes.
  evidence: src/export-panel.test.ts:355-378 — "fetched = vi.fn(() => Promise.reject(new Error("no request may leave"))); ... for (const index of [0, 1, 2]) { ... } expect(used.calls.exportRendering).toHaveBeenCalledTimes(2); expect(used.calls.dryRun).toHaveBeenCalledTimes(1); expect(fetched).not.toHaveBeenCalled();"
  evidence: src-tauri/src/publish/tests.rs:687-720 — "fn no_network_outside_publish() ... assert_eq!(named, vec!["publish/mod.rs".to_string()], "{named:?}");"
  evidence: src-tauri/src/export.rs:20-21 — "Nothing here touches the network. `no_network_outside_publish` names the one file in the crate that holds an HTTP client, and this is not it."
  evidence: src-tauri/src/publish/mod.rs:783-793 — "pub async fn publish_dry_run(...) { ... let context = context_for(&app, document_root, true)?; tauri::async_runtime::spawn_blocking(move || run_publish(&context, &request))"
  evidence: src-tauri/src/publish/mod.rs:667-680 — "pub fn check_deploy_at( ... let agent: ureq::Agent = ureq::Agent::config_builder()"
  evidence: src-tauri/src/publish/tests.rs:494-515 — "fn dry_run_leaves_no_trace() ... // No git ran. assert!(fixture.fake.calls().is_empty());"
  evidence: src/export/services.ts:218-237 — "invoke("choose_export_destination", ...) ... invoke("export_rendering", { request }) ... invoke("publish_dry_run", ...) ... invoke< void>("reveal_staged_version")"
- ac-7 — MET_WITH_CONCERNS: run_export canonicalises both roots and refuses a destination equal to or inside the document root with a sentence saying why, before anything is created; export_leaves_the_document_folder_byte_for_byte walks the document folder before, runs the deck export, the article export and a refused inside-the-document attempt, and asserts the walk (names and bytes) is unchanged; the panel surfaces the refusal in the modeline via announce. Concerns: the hash test does not run the dry-run row (its document-folder assertion is dry_run_leaves_no_trace, which checks document.yaml and the log only, not every file), and the refusal happens after the native dialog returns, at export time, rather than the dialog itself refusing the folder — manual check M31-3 covering that flow is unticked.
  evidence: src-tauri/src/export.rs:275-297 — "if destination == document_root { return Err(format!("{} is the open document folder. A rendering written into it could be read back as one of its own sources, so an export writes anywhere else.", ...)); } if destination.starts_with(&document_root) { return Err(..."is inside the open document folder...") }"
  evidence: src-tauri/src/export.rs:977-995 — "let before = walk(fixture.document.path()); run_export(... "deck" ...); run_export(... "article" ...); run_export(..., &fixture.document.path().join("01-part")).expect_err("refused"); assert_eq!(walk(fixture.document.path()), before);"
  evidence: src-tauri/src/export.rs:673-694 — "fn export_refuses_a_destination_inside_the_open_document() ... assert!(message.contains("inside the open document folder")); ... fn export_refuses_the_document_root_itself() ... assert!(message.contains("is the open document folder"));"
  evidence: src/export-panel.ts:289-295 — "void run(row).catch((error: unknown) => { announce(String(error)); });"
  evidence: src-tauri/src/publish/stage.rs:234-237 — "for file in files { let target = confined_target(&root, &file.path)?; write_file(&target, file.text.as_bytes())?; }"
  evidence: src-tauri/src/publish/tests.rs:494-503 — "// Nothing on disk in the document folder. assert_eq!(fixture.document_yaml(), before); assert!(!log::log_path(fixture.document.path()).exists());"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051927564472.md:42-45 — "- [ ] Choosing the document folder itself is refused, with the reason stated in the modeline, and nothing is written."
- ac-8 — INCONCLUSIVE: The mechanism is cited: the panel is a .panel at width min(720px, 94vw), the export block declares no pixel width, every row and file name carries overflow-wrap: anywhere, and the test asserts a long asset name is stated in full with no nowrap or overflow-x: scroll in the block. But the criterion is an observable at 820 CSS pixels in the real window, the spec assigns it to manual check M31-2, every width row there is unticked, and no test measures rendered layout at that width. Unverified, not failed.
  evidence: src/style.css:535-543 — ".panel { position: fixed; ... width: min(720px, 94vw);"
  evidence: src/style.css:789-795 — ".export-row { padding: 8px 10px; ... overflow-wrap: anywhere; word-break: break-word; }"
  evidence: src/export-panel.test.ts:335-352 — "expect(panel.element.textContent).toContain(LONG_ASSET); ... expect(declaration[1] ?? "").not.toMatch(/\d+px/); expect(block).toContain("overflow-wrap: anywhere"); expect(block).not.toContain("white-space: nowrap");"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051927564472.md:27-38 — "## M31-2 — every row is legible at 1280, 820 and 390 CSS pixels ... - [ ] At 820: the same, and no row's text is cut off."
- ac-9 — MET_WITH_CONCERNS: One source, always: the plan is buildVersion over the publish path's own tree, with no second file list, and the export refuses the document folder as a destination. No machine in the document: the exported folder and every shell message are scanned for the temp root, home and user, and the outcome carries a name and a count. Network only on publish: the fetch fake and no_network_outside_publish. Legible on three device classes is the concern: it is proven only structurally (no fixed width, overflow-wrap) and the manual widths in M31-2 are unticked, so the fourth inherited discipline is unverified at any real width.
  evidence: src/export/services.test.ts:116-128 — "it("builds through buildVersion, from the tree the dry run builds from" ... // The plan is the builder's output, not a second list of files beside it. expect(plan.files).toEqual(built.files);"
  evidence: src-tauri/src/export.rs:998-1038 — "fn an_exported_folder_carries_no_absolute_path()"
  evidence: src-tauri/src/export.rs:977-995 — "fn export_leaves_the_document_folder_byte_for_byte()"
  evidence: src/export-panel.test.ts:363-378 — "it("makes no request through an export""
  evidence: src-tauri/src/publish/tests.rs:687-720 — "fn no_network_outside_publish()"
  evidence: src/export-panel.test.ts:335-352 — "it("carries no fixed width and breaks a long name""
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051927564472.md:27-38 — "## M31-2 — every row is legible at 1280, 820 and 390 CSS pixels (unticked)"

Gap audit:
- honoured:
  - C-c C-e opens a panel over the text listing five exports, three writable with destination and contents and two marked not yet available with their phase
    evidence: src/export-panel.ts:61-105 — "return [ writable("deck"), writable("article"), { id: "dry-run" ... }, { id: "single-file" ... }, { id: "pdf" ... } ];"
    evidence: src/export-panel.test.ts:127-154 — "lists five rows, three that write and two that name their phase"
  - The deck row names the folder it will create, the built slides, the engine and every asset
    evidence: src/export/services.ts:107-114 — "...plan.files.filter((file) => file.path === page)..., ...FOLDER_CHROME_FILES[kind], ...plan.copies.map((copy) => copy.to)"
    evidence: src/export/services.test.ts:186-198 — "expect(writes).toHaveLength(1 + FOLDER_CHROME_FILES.deck.length + built.copies.length);"
  - C-g closes the panel and nothing is written
    evidence: src/export-panel.test.ts:224-247 — "closes on C-g and on Escape, having invoked nothing"
  - All three rows are written by the builder the publish uses, so the folder holds the same bytes the site serves
    evidence: src/export/services.ts:191-202 — "buildVersion(document.tree, document.variant, { rendered: renderVariant(..., { title: document.title, host }) })"
    evidence: src-tauri/src/export.rs:373-395 — "let staged = stage::stage_version(&context.cache_dir.join(EXPORT_STAGING_FOLDER), ...)?; ... stage::copy_tree(&staged.path, target, ...)"
    evidence: src-tauri/src/publish/stage.rs:171-189 — "pub fn chrome_for_folder(kind: &str) ... chrome.extend(ENGINE.iter().copied());"
  - No export writes anything into the document folder, and an export never writes over anything
    evidence: src-tauri/src/export.rs:282-297 — "if destination.starts_with(&document_root) { return Err(...) }"
    evidence: src-tauri/src/export.rs:963-975 — "fn export_never_writes_over_a_folder_that_is_there() ... assert_eq!(second.folder, "a-talk-deck-2");"
  - No export touches the network
    evidence: src/export-panel.test.ts:363-378 — "expect(fetched).not.toHaveBeenCalled();"
    evidence: src-tauri/src/publish/tests.rs:687-720 — "assert_eq!(named, vec!["publish/mod.rs".to_string()])"
  - The engine is copied from the app so an export needs no network to complete
    evidence: src-tauri/src/publish/stage.rs:130-152 — "include_str!("../../../src/vendor/reveal/reveal.js")"
    evidence: src-tauri/src/export.rs:632-636 — "assert_eq!(fs::read_to_string(folder.join("presenter/deck.js")).expect("read"), include_str!("../../site/presenter/deck.js"));"
  - The dry run stages the version a publish would push and opens that folder
    evidence: src/export-panel.ts:232-239 — "const outcome = await services.dryRun(); await services.revealStagedVersion();"
    evidence: src-tauri/src/export.rs:1085-1103 — "the_dry_run_row_opens_the_folder_the_dry_run_staged"
- diverged:
  - She double-clicks the page and the deck runs: the page Alice opens is one folder in, at < folder>/slides/index.html, not at the folder's top
    evidence: src-tauri/src/export.rs:630-631 — "// The deck's page sits one folder in, which is what makes every asset reference identical to the staged version's. assert!(folder.join("slides/index.html").is_file());"
    evidence: src/publish/build.ts:103 — "export const DECK_PATH = "slides/index.html";"
  - The native folder dialog opens beside her document folder, never inside it: the dialog is only pointed beside the document; a folder inside it can still be picked and is refused afterwards, at export time, with the reason in the modeline
    evidence: src-tauri/src/export.rs:438-445 — "if let Some(folder) = opens_at { dialog = dialog.set_directory(folder); } dialog.blocking_pick_folder()"
    evidence: src-tauri/src/export.rs:288-297 — "if destination.starts_with(&document_root) { return Err(format!("{} is inside the open document folder...")) }"
  - The deck files in the exported folder and the staged version folder are byte-identical: narrowed within the delivered range to assets and slide markup identical, page differing in the chrome attributes
    evidence: .abcd/development/intents/shipped/itd-2609051922232742-alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th.md:156-161 — "every asset and all slide markup in the exported folder are byte-identical to the staged version's, the deck page differs only in the attributes that point at the engine and stylesheet beside it"
    evidence: src/publish/build.test.ts:408-416 — "const deckSubstituted = site.deck.split('="/presenter').join('="../presenter'); expect(folder.deck).toBe(deckSubstituted);"
  - The request carries the folder Alice chose: the delivered request carries a shell-minted nonce instead, claimed once and expiring after thirty seconds, so a dialog answer older than that costs a second pick
    evidence: src-tauri/src/export.rs:50-70 — "pub const DESTINATION_LIFETIME: Duration = Duration::from_secs(30); ... pub struct ExportDestinations(Mutex< Vec< ChosenFolder>>);"
    evidence: src/export/services.ts:43-50 — "readonly destination_nonce: string;"
- missing:
  - The deck runs in her browser from disk with every slide, every image and every speaker note, with no network: no automated test opens the written folder in a browser and M31-1 is unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051927564472.md:9-25 — "- [ ] On a second machine, with networking turned off, open `<folder>/slides/index.html` in a browser."
  - Every row legible at 820 CSS pixels: no rendered-width measurement exists and M31-2 is unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051927564472.md:27-38 — "- [ ] At 820: the same, and no row's text is cut off."
  - The Finder reveals the written folder and the staged one: reveal_item_in_dir is called but never observed, and M31-3 is unticked
    evidence: src-tauri/src/export.rs:412-418 — "app.opener().reveal_item_in_dir(path).map_err(|error| format!("cannot show the folder: {error}"))"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051927564472.md:40-52 — "- [ ] After a successful export the Finder opens with the written folder selected."
  - No file contains a machine name: no test asserts the host name is absent from the written folder, although the spec's acceptance mapping says the test refuses it
    evidence: src-tauri/src/export.rs:1009-1016 — "let temporary = ...; let home = std::env::var("HOME").unwrap_or_default(); let user = Path::new(&home).file_name()..."
    evidence: .abcd/development/specs/closed/spc-2609051927564472-alice-has-no-export-panel-c-c-c-e-should-open-one-listing-th.md:169-171 — "refusing the temporary root, the home folder's own prefix, `file:` and the host name"

Scope-condition dispositions:
- cond-2609051927563540 — survived: The dialog is tauri_plugin_dialog's blocking_pick_folder and the reveal is tauri_plugin_opener's reveal_item_in_dir, both in the shell; the panel is imported by src/main.ts alone, so neither the single file nor the presenter site carries one.
  evidence: src-tauri/src/export.rs:432-445 — "use tauri_plugin_dialog::DialogExt; ... dialog.blocking_pick_folder()"
  evidence: src-tauri/src/export.rs:412-418 — "use tauri_plugin_opener::OpenerExt; app.opener().reveal_item_in_dir(path)"
  evidence: src/main.ts:149-160 — "// Export, `C-c C-e`: the third overlay through the same two extension points. ... mountExportPanel(app, exportPanel);"
- cond-2609051927562061 — survived: The only export panel is the one mounted into the desktop app for the open document's author; what leaves the machine is a folder, and the outcome crossing back to the page is a folder name and a count, never a path of anyone's.
  evidence: src/main.ts:152-160 — "const exportPanel = createExportPanel( createExportServices(loadForPublish, () => app.documentRoot), ..."
  evidence: src/export/services.ts:55-59 — "/** What one export wrote: a folder's name and a count, never a path. */ export interface ExportOutcome { readonly folder: string; readonly files: number; }"
- cond-2609051927568274 — survived: An export hands the shell every copy the plan carries and the shell copies bytes disk to disk; neither export.rs nor services.ts nor build.ts holds any threshold or link-instead-of-copy behaviour, so an export carries copied assets only, as phase 1 assumed.
  evidence: src/export/services.ts:133-135 — "files: plan.files.filter((file) => file.path === page), copies: plan.copies,"
  evidence: src-tauri/src/publish/stage.rs:238-257 — "for copy in copies { let source = confine_asset(&document_root, &decode_reference(&copy.from)?)?; ... let bytes = fs::read(&source)...; write_file(&target, &bytes)?; }"
- cond-2609051927560765 — survived: The dry-run row invokes publish_dry_run unchanged with a site-host build and then reveals publish::staging_path; the range touches no file under src-tauri/src/publish, and the export stages into its own export-staging tree rather than the publish's.
  evidence: src/export/services.ts:224-236 — "return invoke< PublishOutcome>("publish_dry_run", { request: { variant, flag: "unlisted", files: ..., copies: ... } });"
  evidence: src-tauri/src/export.rs:231-238 — "pub fn staged_version_path(cache_dir: &Path) -> Result< PathBuf, String> { let staged = crate::publish::staging_path(cache_dir); if !staged.is_dir() { return Err("no dry run has been staged yet...") }"
  evidence: src-tauri/src/export.rs:32-36 — "pub const EXPORT_STAGING_FOLDER: &str = "export-staging"; // Two trees, so an export and a dry run neither clear nor hash into each other."
- cond-2609051927569197 — survived: The deck an export writes is renderVariant's own slide fragment; the folder host changes the chrome base argument on deckDocument and nothing in the slides, which the build test proves by showing every non-chrome reference identical between the folder and site decks.
  evidence: src/publish/build.ts:543-547 — "deck: deckDocument(options.title, fragments.join("\n"), chromeBase(options.host, "slides")),"
  evidence: src/publish/build.test.ts:423-427 — "expect(rest(folder.deck)).toEqual(rest(site.deck));"
- cond-2609051927560440 — survived: The article an export writes is the same article body with only the stylesheet href rebased; the article row carries the page, presenter/article.css and the assets and adds nothing to what the page says.
  evidence: src/publish/build.ts:552-564 — "export function articleDocument(title, body, chrome = CHROME_FOLDER) ... `<link rel="stylesheet" href="${chrome}/article.css">`"
  evidence: src/publish/build.test.ts:416-417 — "const articleSubstituted = site.article.split('="/presenter').join('="presenter'); expect(folder.article).toBe(articleSubstituted);"
  evidence: src-tauri/src/export.rs:639-660 — "an_article_export_carries_only_the_article_s_stylesheet ... vec!["assets/01-part/lantern.jpg", "index.html", "presenter/article.css"]"
- cond-2609051927567253 — survived: The single HTML file is one row marked unavailable with 'phase 5', which returns before any dialog or command; nothing here embeds or writes such a file.
  evidence: src/export-panel.ts:88-95 — "{ id: "single-file", label: "One HTML file that reads anywhere", destination: "—", writes: [], available: false, why: SINGLE_FILE_PHASE }"
  evidence: src/export-panel.test.ts:207-222 — "opens no dialog and invokes no command on a row that is not yet available"
- cond-2609051927561892 — survived: The journal PDF is one row marked unavailable with 'phase 6, and rendered in the publish pipeline, never in the app', which returns before any dialog or command; no PDF rendering exists in the delivery.
  evidence: src/export-panel.ts:96-103 — "{ id: "pdf", label: "The journal PDF", destination: "—", writes: [], available: false, why: PDF_PHASE }"
  evidence: src/export-panel.ts:52-53 — "PDF_PHASE = "Not yet available: phase 6, and rendered in the publish pipeline, never in the app.""
- cond-2609051927562246 — survived: The panel contributes one app-owned row to the binding table and opens through openOverlay, whose keyboard-quit, next-line, previous-line and Return handling it does not restate; the test proves the chord is the table's row and that C-g closes it under the shared contract.
  evidence: src/keys.ts:773-779 — "id: "export-open", label: "Export to a folder", chords: ["C-c C-e"], group: "document", owner: "app","
  evidence: src/export-panel.ts:279-300 — "overlay = openOverlay({ element, ...(host === null ? {} : { host }), rowCount: () => elements.length, onMove: ..., onChoose: ..., onClose: ... });"
  evidence: src/export-panel.test.ts:184-205 — "// The chord is the table's row, not a listener of the panel's own. expect(bindingById(EXPORT_OPEN_ACTION)?.chords).toEqual([EXPORT_OPEN_CHORD]);"
- cond-2609051927563438 — survived: The engine is compiled into the shell with include_str! from src/vendor/reveal and written from those constants beside the deck; the test reads the written deck.js back and finds the site's own bytes, with no fetch anywhere in the path.
  evidence: src-tauri/src/publish/stage.rs:130-152 — "pub const ENGINE: [(&str, &str); 5] = [ ("presenter/reveal/reveal.js", include_str!("../../../src/vendor/reveal/reveal.js")), ..."
  evidence: src-tauri/src/export.rs:384-388 — "for (name, text) in chrome { write_chrome(target, name, text)?; files += 1; }"
  evidence: src-tauri/src/export.rs:632-636 — "// The engine is the site's own bytes. assert_eq!(fs::read_to_string(folder.join("presenter/deck.js")).expect("read"), include_str!("../../site/presenter/deck.js"));"
## Grounds

- pursued: an export panel naming every destination before confirming keeps file writes explicit and gives the deck a way to disk; wrong if authors never open a folder export and the single file suffices
