---
id: itd-2609061141039863
slug: alice-cannot-change-the-editing-surface-s-text-size-from-the
spec_id: spc-2609061145242761
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609061141024865
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Make the text bigger or smaller from the keyboard

## Press Release

It is late, the room is dim, and the chapter Alice is writing is set in
type she picked at midday. She presses `C-x C-=` and the text of the
chapter grows one step. She presses it again and it grows another. The
sidebar beside it, the modeline at the foot, the keys panel she left
open — none of them move or change size. Only the words she is writing
are bigger. `C-x C--` takes a step back down, and `C-x C-0` puts the
surface back to the size the app opened at.

The modeline tells her where she is: for a moment it reads the scale as
a percentage of the default, then it goes back to showing her position
in the chapter. Nothing is written to the chapter file. The bytes on
disk after three presses are the bytes that were there before, and
`document.yaml` gains nothing: how large Alice likes her text is a fact
about her eyes and her screen, not about the book.

The next morning the app opens at the size she left it. The scale is
remembered per machine, beside the other things the app knows about this
machine, so the laptop she works on at night and the machine on her desk
each keep their own. Nothing about it appears in the settings panel: it
is set by pressing a key, the way a text scale is set in Emacs, and read
back when the app starts.

The three commands are rows in the binding table like every other row.
They have labels, they are listed in the keys panel one chord away, and
they are listed by name under `M-x`, so Alice can reach them without
remembering the chords. Each begins with the `C-x` prefix, which is why
`C--` still redoes the edit she just undid and `C-=` is still free for
whatever the table wants next.

## Why This Matters

Alice's editing surface is set at one size, chosen once by whoever wrote
the stylesheet, and the only ways out of it are the operating system's
own zoom — which enlarges the sidebar, the panels, and the modeline
along with the text, so the chapter gets no wider a share of the window
than it had — and getting closer to the screen. She writes for hours at
a time, on more than one machine, at more than one time of day, and the
size that suits a bright morning at a desk is not the size that suits a
dim evening on a sofa. Every other Emacs she has ever used answers this
in one chord.

## Mechanism

- We expect the chords to be reachable without collision because they
  are two-step chords behind a prefix the app already claims: the
  keyboard-navigation prototype proves that real prefix keys work inside
  a text field in a web view, with the prefix state visible in the
  modeline; that note records "Prefix keys are real"
  (`../../research/notes/2026-09-05-prototype-keyboard-navigation.md`).
  A chord that begins with `C-x` cannot be mistaken for a bare `C--` or
  `C-=`, so redo keeps its key and no row in the table has to move.
- We expect 1.2 per step to be the right step because it is the step
  Emacs itself uses, and Alice's hands come from Emacs: the constraints
  make Emacs bindings the one set and alternative binding sets out of
  scope, so a command that behaves like its Emacs namesake needs no
  learning at all. The vocabulary note ranks exactly this kind of row —
  a command a writer presses without thinking — as what the table is
  missing (`../../research/notes/2026-09-05-emacs-vocabulary-gap.md`).
- We expect scaling the editing surface alone, rather than the window,
  to be what Alice wants because the article prototype already proves it
  for the reading side: its reader controls change the text's size and
  measure without touching the page's chrome, and 03-evidence.md records
  that as "cheap" and belonging to the artefact. The same argument holds
  on the editing side, where the chrome is a sidebar Alice is not
  reading.
- We expect the settings store to be the right home because the scale is
  a machine fact of exactly the class that store already holds — the
  asset roots, the publish target — and because the "no machine in the
  document" discipline forbids machine-local settings inside a document
  folder. Writing it there would mean a document that carries one
  author's eyesight to every other reader of the folder.
- The claim is falsifiable in the obvious way: if the system's own zoom
  already served, the maintainer would not have asked for these chords
  after a session with the app, and an Alice who never presses them
  after they ship refutes it.

## Scope Conditions

- Platform: the desktop app in its web view. The surface scaled is the <!-- cond: cond-2609061145247985 -->
  one continuous editing view the constraints describe, and the scale is
  a property of that view, not of the window or the document.
- Population: Alice, the maintainer, one machine at a time. A second <!-- cond: cond-2609061145241167 -->
  machine keeps its own scale, because the store is per machine and no
  scale travels with the folder.
- Range: the scale is bounded at five steps in each direction — about <!-- cond: cond-2609061145247418 -->
  0.40 of the default at the bottom and about 2.49 at the top. A chord
  pressed at a bound leaves the size where it is and says so; it does
  not wrap and it does not silently do nothing.
- Boundary with intent 2 (itd-2609051335406422), which owns the binding <!-- cond: cond-2609061145244537 -->
  table's shape, the keys panel, and the cancel contract: this intent
  adds three rows to that table and owns what each does to the surface,
  and owns nothing of the table, the panel, or the contract.
- Boundary with intent 32 (itd-2609051934109483), which owns the prose <!-- cond: cond-2609061145241018 -->
  commands and the `M-x` command palette: these three rows appear under
  `M-x` because every row does, and this intent owns only that they are
  there and run; 32 owns the palette itself, its filtering, and its
  prompts.
- Boundary with intent 27 (itd-2609051402126424), which owns the <!-- cond: cond-2609061145240749 -->
  settings panel and the moment of setting a number and naming a place
  in it: the scale is written and read through the same per-machine
  settings store, gains no field in that panel, and is never set by
  typing into one.
- Boundary with intent 5 (itd-2609051335447894), which owns the deck and <!-- cond: cond-2609061145245151 -->
  its typography: the present window's type scale is untouched by these
  chords, and a deck shown after two enlargements is the deck the
  mapping produces at its own size.
- Assumption: one editing surface is open at a time, so there is one <!-- cond: cond-2609061145242133 -->
  scale and no per-buffer scale to reconcile. A second editing pane
  would reopen the question and is not in this intent.

## Acceptance Criteria

- **Given** the app is open on a chapter, **when** Alice opens the keys
  panel and then types `M-x`, **then** three rows appear in both — an
  enlarge row on `C-x C-=`, a shrink row on `C-x C--`, and a restore row
  on `C-x C-0` — each with a label, and running a row from `M-x` has the
  same effect as pressing its chord.
- **Given** a chapter open at the default scale, **when** Alice presses
  `C-x C-=` once, **then** the editing surface's computed font size is
  1.2 times what it was, and the computed font size of the sidebar, the
  modeline, the keys panel, and every other element on the page is
  exactly what it was before the press.
- **Given** Alice has pressed `C-x C-=` twice and `C-x C--` once,
  **when** she presses `C-x C-0`, **then** the editing surface's computed
  font size is the default to the pixel, and the modeline shows the
  scale briefly and then returns to showing her position and mode.
- **Given** Alice has enlarged the surface two steps, **when** she quits
  the app and starts it again, **then** the surface opens at that scale,
  `get_settings` reports it, and the setting sits in the application's
  own configuration directory rather than in any document folder.
- **Given** a chapter whose bytes are recorded before the test, **when**
  Alice presses `C-x C-=`, `C-x C--`, and `C-x C-0` in turn without
  editing, **then** the chapter file's bytes are unchanged, the buffer
  is not marked as having unsaved changes, and `document.yaml` carries
  no key naming a scale.
- **Given** Alice has undone an edit and the surface is at the default
  scale, **when** she presses `C--` on its own, **then** the edit is
  redone and the surface's font size does not change; and **when** she
  presses `C-=` on its own, **then** the surface's font size does not
  change either.
- **Given** the surface is at the top of the range, **when** Alice
  presses `C-x C-=` again, **then** the font size does not change, the
  modeline says the limit is reached, and the same holds at the bottom
  of the range for `C-x C--`.
- **Given** the window is 390 CSS pixels wide with a chapter whose
  longest line is 544 characters, **when** Alice enlarges the surface
  twice, **then** the lines wrap and nothing on the page scrolls
  sideways or needs pinching.
- Inherits: no machine in the document; round-trip byte-fidelity;
  legible on three device classes; network only on publish.

## Open Questions

- Which prefix keys and which of the less common Emacs bindings count as
  "full" is open in [`03-evidence.md`](../../brief/03-evidence.md) ("The
  binding table: which prefix keys and which of the less common Emacs
  bindings count as 'full'"). Whether the text-scale commands are inside
  that line or an addition to it is settled by adding them.
- Whether individual chords are rebindable and persisted is open in the
  same place ("Whether individual chords in that table are rebindable
  and persisted"). If rebinding lands, these three rows are rebindable
  like any other, and a rebinding is a different thing to persist from
  the scale itself.
- Which combinations macOS and the web view take before the editor sees
  them is open there too ("Which key combinations macOS and the web view
  take before the editor sees them, and which of those the shell can
  claim back"). `C-=` and `C--` after a prefix are candidates, because a
  web view has its own zoom on the unprefixed forms.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-3bbfe1df5bc4 -->
Fidelity review — receipt rcp-3bbfe1df5bc4 (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:b40b127d7fd99c5184c860f6de24eec0783ddf0ac1387b6c01dbb091aed30242
Input attestations: diff:6c7062a^..HEAD (2a88a9e..1dae945)@sha256:a4943ed7b3c7373d43871c9634042865a069e5e01d1ce92120eed9544018aae0; intent:.abcd/development/intents/shipped/itd-2609061141039863-alice-cannot-change-the-editing-surface-s-text-size-from-the.md@-; spec:.abcd/development/specs/closed/spc-2609061145242761-alice-cannot-change-the-editing-surface-s-text-size-from-the.md@-; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609061145242761.md@-; test-run:npx vitest run src/text-scale.test.ts (24 passed); cargo test --manifest-path src-tauri/Cargo.toml settings (10 passed)@-;

Acceptance rollup: MET 6 · MET_WITH_CONCERNS 2 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: Three editor rows with labels and chords sit in the binding table; the test opens the keys panel and reads commandEntries, finding each row by id with its label in both, and runEntry on each M-x entry moves the step exactly as the chord does (2 up, 1 down, reset to 14px).
  evidence: src/keys.ts:426-442 — "id: "text-scale-increase", label: "Bigger text", chords: ["C-x C-="] ... "Smaller text" ["C-x C--"] ... "Default text size" ["C-x C-0"]"
  evidence: src/emacs.ts:78-80 — ""text-scale-increase", "text-scale-decrease", "text-scale-reset","
  evidence: src/text-scale.test.ts:501-511 — "const row = panel.element.querySelector(`[data-binding="${id}"]`); expect(row?.textContent, id).toBe(bindingById(id)?.label); ... expect(entry?.label, id).toBe(bindingById(id)?.label);"
  evidence: src/text-scale.test.ts:513-532 — "runEntry(app.view, entryFor("text-scale-increase")); ... expect(textScaleStep(app.view)).toBe(2); ... runEntry(app.view, entryFor("text-scale-reset")); expect(sizeOf(app.view.dom)).toBe("14px");"
- ac-2 — MET: The scale is a Prec.highest theme on the `&` (.cm-editor) selector held in a compartment; the test records the computed font size of every element outside the surface, presses C-x C-=, sees the surface go 14px to 16.8px (ratio 1.2 to 10 places) and every recorded element unchanged, and checks that every stylesheet rule setting 16.8px matches the editor element and not the sidebar or modeline.
  evidence: src/text-scale.ts:89-93 — "return Prec.highest(EditorView.theme({ "&": { fontSize: fontSizeFor(step) } }));"
  evidence: src/text-scale.test.ts:259-283 — "const beside = Array.from(document.querySelectorAll("*")).filter((element) => element !== surface && !surface.contains(element)); ... expect(sizeOf(surface)).toBe("16.8px"); ... for (const [element, size] of before) { expect(sizeOf(element), ...).toBe(size); }"
  evidence: src/text-scale.test.ts:288-294 — "const rules = rulesSetting("16.8px"); ... expect(app.view.dom.matches(rule.selectorText)).toBe(true); expect(app.sidebar.element.matches(rule.selectorText)).toBe(false);"
- ac-3 — MET: After two enlargements and one shrink, C-x C-0 is answered by the swallowed-chord guard (the package otherwise reads C-0 as a numeric argument) and the surface returns to exactly 14px == fontSizeFor(0); announceBriefly puts 'Text scale 120%' in the message cell and clears it after 1500 ms under fake timers while the position cell reads L1:C1 throughout.
  evidence: src/text-scale.test.ts:303-315 — "expect(pressSequence(app.view, "C-x C-0")).toBe(true); expect(textScaleStep(app.view)).toBe(0); expect(sizeOf(app.view.dom)).toBe("14px");"
  evidence: src/emacs.ts:136-152 — "const swallowed = swallowedChord(this, event); if (swallowed !== null) { ... data.keyChain = ""; data.count = 0; EmacsHandler.execCommand("
  evidence: src/app.ts:333-340 — "function announceBriefly(text: string): void { announce(text); ... transient = setTimeout(() => { transient = null; if (message === text) announce(""); }, TRANSIENT_MESSAGE_MS);"
  evidence: src/text-scale.test.ts:388-397 — "expect(saying(app)).toBe("Text scale 120%"); expect(position(app)).toBe("L1:C1"); vi.advanceTimersByTime(1500); expect(saying(app)).toBe(""); expect(position(app)).toBe("L1:C1");"
- ac-4 — MET_WITH_CONCERNS: Both halves are tested and wired: the page reads the stored step on mount and applies it silently (test mounts with readTextScale=2 and sees fontSizeFor(2) and an empty modeline); the Rust Settings struct carries text_scale so get_settings returns it, set_text_scale resolves through path_for -> app_config_dir, and the Rust test asserts the file lands at < config_dir>/settings.json with "text_scale": 2. Concern: no test spans the Tauri invoke seam between createTextScaleServices and the Rust command, and the actual quit-and-relaunch is only manual row M33-3, which is unticked.
  evidence: src/app.ts:924-935 — "if (services.readTextScale) { void services.readTextScale().then((step) => { ... setTextScale(view, step); })"
  evidence: src/text-scale.test.ts:563-571 — "app = mount(2); ... expect(textScaleStep(app.view)).toBe(2); expect(sizeOf(app.view.dom)).toBe(fontSizeFor(2)); expect(saying(app)).toBe("");"
  evidence: src/settings.ts:39-47 — "async readTextScale() { const settings = await invoke< Settings>("get_settings"); return settings.text_scale; }, async writeTextScale(steps) { await invoke< Settings>("set_text_scale", { steps }); }"
  evidence: src/main.ts:84 — "...(inShell() ? { quit: quitWindow, ...createTextScaleServices() } : {}),"
  evidence: src-tauri/src/settings.rs:64 — "pub text_scale: i32,"
  evidence: src-tauri/src/settings.rs:274-281 — "let config = app.path().app_config_dir() ...; Ok(settings_path(&config))"
  evidence: src-tauri/src/settings.rs:407-422 — "assert_eq!(path, dir.path().join(SETTINGS_FILE)); ... assert!(text.contains("\"text_scale\": 2"), "{text}");"
  evidence: src-tauri/src/lib.rs:292 — "settings::set_text_scale,"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061145242761.md:36-41 — "- [ ] Enlarge the surface two steps. Quit the app and start it again. - [ ] The surface opens at that size"
- ac-5 — MET: Over the hazardous fixture (544-char line, tab, trailing space, no final newline) the test presses all three chords, then sees documentText identical to the fixture, app.dirty false, writeChapter never called, and the scale routed only to writeTextScale; the only Rust file that writes text_scale is settings.rs, and none of the document.yaml writers (metadata.rs, document.rs) reference a scale.
  evidence: src/text-scale.test.ts:446-465 — "expect(documentText(app.view)).toBe(HAZARDOUS); expect(app.dirty).toBe(false); expect(written).toBeNull(); expect(scaleWrites).toEqual([1, 0]);"
  evidence: src/app.ts:368-393 — "function rememberScale(step: number): void { const write = services.writeTextScale; if (!write) return;"
  evidence: src-tauri/src/settings.rs:223-228 — "pub fn set_text_scale_at(path: &Path, steps: i32) -> Result< Settings, String> { ... settings.text_scale = clamp_text_scale(steps); write_settings(path, &settings)?;"
- ac-6 — MET: The table keeps C-- on redo and binds no row to C-= or C-0; the test edits, undoes with C-/, presses bare C-- and sees the edit redone with the surface at its previous size and step 0, then presses bare C-= and sees size and step unchanged. Whether the web view zooms its own window on a bare C-= is outside this criterion's wording and is unticked manual row M33-2.
  evidence: src/text-scale.test.ts:181-188 — "expect(bindingById("redo")?.chords).toContain("C--"); ... expect(claimed).not.toContain("C-="); expect(claimed).not.toContain("C-0");"
  evidence: src/text-scale.test.ts:428-444 — "press(app.view, "C--"); expect(documentText(app.view)).toContain("Bob "); expect(sizeOf(app.view.dom)).toBe(size); ... press(app.view, "C-="); expect(sizeOf(app.view.dom)).toBe(size); expect(textScaleStep(app.view)).toBe(0);"
  evidence: src/emacs.ts:178-195 — "const chain = handler.$data.keyChain; if (!chain) return null; ... const name = ownChords.get(`${chain} C-Digit${digit[1] ?? ""}`);"
- ac-7 — MET: setTextScale clamps to +-5 and returns false when the step did not move; textScaleMessage then names the bound. The tests drive five steps each way, press once more, and see the step, the computed size and the write count unchanged with the modeline reading 'Text scale 249%, the largest step' and 'Text scale 40%, the smallest step'.
  evidence: src/text-scale.ts:117-124 — "const wanted = clampStep(step); if (wanted === textScaleStep(view)) return false;"
  evidence: src/text-scale.ts:127-133 — "if (step >= TEXT_SCALE_LIMIT) return `${scale}, the largest step`; if (step <= -TEXT_SCALE_LIMIT) return `${scale}, the smallest step`;"
  evidence: src/text-scale.test.ts:399-413 — "expect(sizeOf(app.view.dom)).toBe(size); expect(saying(app)).toBe("Text scale 249%, the largest step"); expect(scaleWrites.length).toBe(writes);"
  evidence: src/text-scale.test.ts:415-426 — "expect(saying(app)).toBe("Text scale 40%, the smallest step");"
- ac-8 — INCONCLUSIVE: The only automated evidence is that the cm-lineWrapping class stays on the content element after each of two enlargements over a 544-character line; jsdom has no layout engine, so whether anything scrolls sideways or needs pinching at 390 CSS px is assigned to manual row M33-1, and every M33-1 row is unticked. The criterion is unverified, not failed.
  evidence: src/text-scale.test.ts:484-499 — "expect(longest).toBe(544); ... expect(app.view.contentDOM.classList.contains("cm-lineWrapping")).toBe(true);"
  evidence: src/text-scale.test.ts:494-496 — "jsdom has no layout engine, so the manual check at 390 CSS pixels is what proves the rest."
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061145242761.md:12-18 — "- [ ] At 390: the same, and no text needs a pinch to read."
- ac-9 — MET_WITH_CONCERNS: Three of the four inherited disciplines have automated proof: no machine in the document (scale goes only to the config-directory settings file, never to a chapter), round-trip byte-fidelity (hazardous fixture unchanged across three chords), and network only on publish (fetch/XHR stubbed, zero attempts across nine chords). Concern: legibility on three device classes rests solely on manual row M33-1, which is unticked, so that discipline is unverified for this delivery.
  evidence: src-tauri/src/settings.rs:417-422 — "In the application's own configuration directory, never in a document folder ... assert_eq!(path, dir.path().join(SETTINGS_FILE));"
  evidence: src/text-scale.test.ts:446-465 — "expect(documentText(app.view)).toBe(HAZARDOUS); ... expect(written).toBeNull();"
  evidence: src/text-scale.test.ts:600-638 — "globalThis.fetch = ((input: unknown) => { attempts.push(...) ... expect(attempts).toEqual([]);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061145242761.md:9-18 — "## M33-1 — legible at 390, 820, and 1280 CSS pixels ... - [ ] At 1280 ... - [ ] At 820 ... - [ ] At 390"

Gap audit:
- honoured:
  - Three rows behind the C-x prefix, so C-- stays redo and C-= stays free
    evidence: src/keys.ts:426-442 — "chords: ["C-x C-="] ... ["C-x C--"] ... ["C-x C-0"]"
    evidence: src/text-scale.test.ts:181-188 — "expect(bindingById("redo")?.chords).toContain("C--");"
  - Only the editing surface scales; the sidebar, modeline and panels keep their size
    evidence: src/text-scale.ts:89-93 — "EditorView.theme({ "&": { fontSize: fontSizeFor(step) } })"
    evidence: src/text-scale.test.ts:281-283 — "for (const [element, size] of before) { expect(sizeOf(element), ...).toBe(size); }"
  - Steps of 1.2, five either way, and a bound that says so instead of doing nothing
    evidence: src/text-scale.ts:27-33 — "BASE_FONT_SIZE_PX = 14; TEXT_SCALE_STEP = 1.2; TEXT_SCALE_LIMIT = 5;"
    evidence: src/text-scale.test.ts:199-203 — "expect(percentOf(TEXT_SCALE_LIMIT)).toBe(249); expect(percentOf(-TEXT_SCALE_LIMIT)).toBe(40);"
  - Restore lands on the default to the pixel, including C-x C-0 which the package's key reader swallowed
    evidence: src/text-scale.test.ts:311-313 — "expect(pressSequence(app.view, "C-x C-0")).toBe(true); ... expect(sizeOf(app.view.dom)).toBe("14px");"
    evidence: src/text-scale.test.ts:317-345 — "spends the numeric argument the chord's own reader took"
  - The modeline reads the scale as a percentage for a moment and then returns to the position
    evidence: src/app.ts:333-340 — "function announceBriefly(text: string): void"
    evidence: src/text-scale.test.ts:388-397 — "vi.advanceTimersByTime(1500); expect(saying(app)).toBe("");"
  - Nothing is written to the chapter or document.yaml; the scale goes only to the per-machine settings store, clamped on the way in and out
    evidence: src/text-scale.test.ts:457-464 — "expect(written).toBeNull(); expect(scaleWrites).toEqual([1, 0]);"
    evidence: src-tauri/src/settings.rs:426-437 — "fs::write(&path, "{\"text_scale\": 40}"); assert_eq!(read_settings(&path).expect("read back").text_scale, 5);"
  - The scale survives opening another chapter and is applied on mount without a modeline message
    evidence: src/editor.ts:371-374 — "stateFor(doc, hooksByView.get(view) ?? {}, textScaleStep(view))"
    evidence: src/text-scale.test.ts:476-482 — "carries the scale across a chapter change"
    evidence: src/text-scale.test.ts:563-571 — "expect(saying(app)).toBe("");"
  - Nothing about the scale appears in the settings panel
    evidence: src/settings-panel.ts:36-43 — "The panel shows no field for it ... readonly text_scale: number;"
  - The how-to documents the three chords, the step, the range and the per-machine store
    evidence: docs/how-to-find-and-change-the-keys.md:99-114 — "## Make the text bigger or smaller"
- diverged:
  - The intent owns nothing of the table, the panel, or the prefix/cancel contract (intent 2's territory); the delivery had to add a guard inside the Emacs handler wrapper that resolves C-x C-digit chords and spends the numeric argument, a piece of prefix machinery now owned here for Editor's own chords
    evidence: src/emacs.ts:136-152 — "const swallowed = swallowedChord(this, event); if (swallowed !== null) { ... data.keyChain = ""; data.count = 0;"
    evidence: src/emacs.ts:164-195 — "const ownChords = new Map< string, string>(); ... function swallowedChord("
  - The spec's module table scoped settings.rs to text_scale, clamp_text_scale, set_text_scale_at and the command; the fix commit also added a process-wide write lock over every setter (set_publish_target_at, set_asset_root_at) and a page-side write queue, widening the change into the shared store
    evidence: src-tauri/src/settings.rs:106-114 — "static WRITING: Mutex<()> = Mutex::new(()); ... fn writing() -> MutexGuard<'static, ()>"
    evidence: src-tauri/src/settings.rs:181 — "let _writing = writing();"
    evidence: src/app.ts:368-393 — "one write is in flight at a time and the steps that arrive while it is are collapsed to the last of them"
  - The delivered range also carries unrelated present-window work (81caa12, 7689c2a, three captures) that belongs to no criterion of this intent
    evidence: src/present.ts:1 — "30 lines changed in 6c7062a^..HEAD by 'fix: place every slide over the stage and hide by visibility, not display'"
    evidence: src/core/render/slides.css:1 — "100 lines changed in the same range, not by the text-scale commits"
- missing:
  - Real-window proof that enlarged lines wrap at 390 CSS px with nothing scrolling sideways or needing a pinch
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061145242761.md:12-18 — "- [ ] At 390: the same, and no text needs a pinch to read."
  - Real-window proof that the web view does not take C-x C-= / C-x C-- before the page, and does not zoom its own chrome on bare C-=
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061145242761.md:20-33 — "## M33-2 — the chords reach the page ... This is the one the web view can refuse"
  - An actual quit-and-relaunch showing the surface reopen at the stored scale with settings.json carrying "text_scale": 2
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061145242761.md:36-44 — "- [ ] `settings.json` in the application's configuration directory carries `"text_scale": 2`."
  - Proof that the deck presented after two enlargements is at its own type size
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061145242761.md:53-56 — "## M33-5 — the deck is untouched - [ ] Enlarge the surface two steps, then present with `C-c C-p`."

Scope-condition dispositions:
- cond-2609061145247985 — survived: The scale is a compartment-held theme on the CodeMirror view's own element and a StateField in its EditorState, not a property of the window or the document; the delivered test proves the rule reaches .cm-editor and nothing beside it.
  evidence: src/text-scale.ts:64-78 — "const setStep = StateEffect.define< number>(); const textScaleField = StateField.define< number>({ ... const scaleCompartment = new Compartment();"
  evidence: src/text-scale.test.ts:288-294 — "expect(app.view.dom.matches(rule.selectorText)).toBe(true); expect(app.sidebar.element.matches(rule.selectorText)).toBe(false);"
- cond-2609061145241167 — survived: The step is stored only in the settings file resolved from the application's config directory on the machine running it, and no chapter or folder write carries it, so a second machine reads its own file and nothing travels with the folder, as assumed.
  evidence: src-tauri/src/settings.rs:274-281 — "app.path().app_config_dir()"
  evidence: src-tauri/src/settings.rs:417-422 — "In the application's own configuration directory, never in a document folder"
  evidence: src/text-scale.test.ts:467-474 — "expect(scaleWrites).toEqual([1, 2]); expect(written).toBeNull();"
- cond-2609061145247418 — survived: TEXT_SCALE_LIMIT is 5 in both the page and the shell, percentOf(+-5) is 249 and 40, and a chord at either bound leaves the size unchanged and says which limit was reached rather than wrapping or staying silent.
  evidence: src/text-scale.test.ts:199-203 — "expect(percentOf(TEXT_SCALE_LIMIT)).toBe(249); expect(percentOf(-TEXT_SCALE_LIMIT)).toBe(40);"
  evidence: src/text-scale.test.ts:407-410 — "expect(sizeOf(app.view.dom)).toBe(size); expect(saying(app)).toBe("Text scale 249%, the largest step");"
  evidence: src-tauri/src/settings.rs:79-86 — "pub const TEXT_SCALE_LIMIT: i32 = 5; ... steps.clamp(-TEXT_SCALE_LIMIT, TEXT_SCALE_LIMIT)"
- cond-2609061145244537 — narrowed: The table's shape, the keys panel and the cancel contract were left alone (keyspanel.ts and the table's structure are untouched; only three rows were appended), but the delivery could not stay out of the prefix machinery: C-x C-0 is unreachable through the package's chain, so the handler wrapper in src/emacs.ts gained a guard that resolves Control-digit chords when the chain is open and spends the numeric argument, which the spec itself flags as a second mechanism beside the prefix machinery.
  narrowing: Holds for the binding table's shape, the keys panel and the cancel contract; it does not hold for the prefix key reader, where this intent now owns the swallowed-chord guard (src/emacs.ts:136-152, 164-195) for the chords Editor registers itself.
  evidence: src/keys.ts:422-442 — "The editing surface's type size. Emacs's own chords, each behind the `C-x` prefix"
  evidence: src/emacs.ts:136-152 — "const swallowed = swallowedChord(this, event); if (swallowed !== null) { // Resolved the way `findCommand` resolves a chord of its own"
  evidence: src/emacs.ts:166-177 — "`findCommand` reads Control-and-a-digit as the start of a numeric argument *before* it consults its own key chain"
- cond-2609061145241018 — survived: The three rows reach M-x solely by being editor rows in APP_COMMAND_IDS; the palette module was not changed in the range and the test reaches the rows through the palette's own commandEntries and runEntry.
  evidence: src/emacs.ts:76-80 — "// The type scale. `C-x C-0` needs the guard below to reach its command ... "text-scale-increase", "text-scale-decrease", "text-scale-reset","
  evidence: src/text-scale.test.ts:15 — "import { commandEntries, runEntry } from "./command-palette";"
  evidence: src/text-scale.test.ts:513-532 — "runs each row from M-x with the effect of its chord"
- cond-2609061145240749 — survived: The scale is read through get_settings and written through a new set_text_scale command on the same store; the settings panel gained only the text_scale field on the Settings interface, no form control, and the text-scale services are kept apart from SettingsServices.
  evidence: src/settings-panel.ts:36-43 — "The panel shows no field for it: it is set by pressing a key ... readonly text_scale: number;"
  evidence: src/settings.ts:32-38 — "The panel shows no field for it, so these are separate from `SettingsServices`"
  evidence: src/settings.ts:41-46 — "invoke< Settings>("get_settings") ... invoke< Settings>("set_text_scale", { steps })"
- cond-2609061145245151 — untested: No test presents a deck after an enlargement and the only proof named is manual row M33-5, which is unticked; the present.ts and slides.css changes in the range come from a separate present-window fix, not from the scale, so nothing exercised or contradicted the assumption.
- cond-2609061145242133 — survived: The application drives one view, the settings store holds one integer, and every delivered test scales that single surface; the step is carried across setDocument on the same view rather than reconciled between views.
  evidence: src/app.ts:348-356 — "const step = to(textScaleStep(view)); const moved = setTextScale(view, step);"
  evidence: src-tauri/src/settings.rs:64 — "pub text_scale: i32,"
  evidence: src/editor.ts:371-374 — "stateFor(doc, hooksByView.get(view) ?? {}, textScaleStep(view))"
## Grounds

- pursued: Emacs's own text-scale chords let Alice fit the surface to her eyes without leaving the keyboard; wrong if the web view's own zoom on the unprefixed chords fights them
