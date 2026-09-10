---
id: itd-2609051335406422
slug: edit-with-the-emacs-bindings-i-already-know
spec_id: spc-2609051353381023
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

# Edit with the Emacs bindings I already know

## Press Release

Alice opens a chapter and types. Her hands already know where everything
is: she moves by character, word, line, and buffer; she kills a line and
yanks it back; she sets the mark and acts on the region; she searches
forward and backward as she types; she undoes. The prefix keys work, and
so does the chord that saves. Nothing is swallowed on the way — not by
the window, not by the machine — and the Markdown she is editing is the
file itself, with no hidden copy behind it.

When she cannot recall a chord she does not leave the app to find it. One
chord opens the keys panel, which lists every action Editor claims, its
label, and the chords live for it right now; any control that has a chord
names it in its tooltip. A prefix key opens a prefix state and the
modeline at the foot of the window shows it, beside her position in the
chapter. One cancel chord cancels anything — a search in progress, the
keys panel, any overlay, a half-typed prefix — and Escape does the same,
so there is never a state Alice cannot get out of.

The bindings Editor claims are a written list rather than a promise. If a
chord is in the list, it works in the editing surface; if it is not, the
list says so and Alice can see that in the panel rather than discovering
it mid-sentence. And because the chapter on disk stays plain Markdown,
Emacs itself remains free to open the very same file whenever she prefers
it.

## Why This Matters

Alice has spent years in one editing vocabulary, and an editor that gets
it half right is worse than one that does not try: the muscle memory
fires, the wrong thing happens, and the sentence is gone. Every other
moment in Editor rests on this one, because a folder she cannot type into
comfortably is a folder she will edit somewhere else — which puts the
text back into two places, the exact failure the acceptance project shows
(`03-evidence.md`). The bindings are also why the Markdown can stay
visible and authoritative: Alice does not need a rich-text surface to
edit quickly, she needs her own keys.

## Mechanism

- We expect a real Emacs editing surface inside a web view because
  CodeMirror's Emacs keymap implements these bindings and the Tauri shell
  can claim, at the window level, the combinations the platform would
  otherwise take first (`01-product.md` assumptions; ADR
  `adr-2609051324137479`). The claim is falsifiable by the spike in
  `06-delivery.md`, and its named fallback is a different shell.
- We expect prefix keys to survive inside a text field because the
  keyboard-navigation prototype already does exactly that: a prefix chord
  opens a visible prefix state, the next key completes the chord, and
  control prefixes keep working while the caret is in a field
  (`03-evidence.md`; `2026-09-05-prototype-keyboard-navigation.md`).
  `05-internals.md` names this as the spike's central risk.
- We expect one cancel rule to hold everywhere because the prototype
  proves a single check at the head of every overlay's key handler
  cancels a search, a panel, an overlay, or a prefix
  (`03-evidence.md`). A surface that needs its own escape hatch is a bug,
  not a feature.
- We expect "full Emacs bindings" to be testable because the table is
  data — an id, a label, and default chords per action — read by the keys
  panel, by the tooltips, and by the acceptance tests from one source
  (`05-internals.md` section 5). A binding absent from the table is not
  claimed, so the promise is finite and each entry falsifies
  independently.
- We expect editing not to disturb the file because the surface holds the
  file's text and nothing else: no hidden representation and no round trip
  through a rich-text model (`04-surfaces.md`), and serialising an edited
  tree changes only the spans that were edited (`05-internals.md`
  section 2).

## Scope Conditions

- Platform: the desktop app only — a Tauri 2 shell around the macOS <!-- cond: cond-2609051353386305 -->
  system web view, with Rust claiming the key combinations the platform
  would otherwise take (`02-constraints.md`; `05-internals.md` section 5).
- Gate: this intent is gated by the spike in `06-delivery.md`, which <!-- cond: cond-2609051353385085 -->
  produces the binding table. Every criterion below refers to that table
  rather than to a chord written here, and the intent claims no chord the
  table does not list.
- Assumption: CodeMirror is the editing surface in both the app and the <!-- cond: cond-2609051353388604 -->
  single file, held until the spike confirms or replaces it
  (`01-product.md`).
- Population: Alice, one author, one binding set. Alternative binding <!-- cond: cond-2609051353382930 -->
  sets are out of scope for the product (`06-delivery.md`); rebinding one
  action is a separate open question.
- Boundary with map #18, `itd-2609051335586905` (Edit on the iPad and <!-- cond: cond-2609051353385287 -->
  bring the text back): the boundary is the host. 2 owns the desktop app
  and the binding table itself; 18 owns which of those bindings survive
  in Safari on an iPad, where there is no shell to claim anything back.
- Boundary with the reading views and with map #26, <!-- cond: cond-2609051353383595 -->
  `itd-2609051402083398` (Move through the article by keyboard): 26 owns
  which entries of this table the article, the deck, and the single file
  honour, and what each does to a page that cannot be edited. This intent
  owns the editing surface's vocabulary, the table itself, and the panel
  that displays it, not its reuse elsewhere.
- Bundle: member of the Editing surface bundle with map #1, <!-- cond: cond-2609051353385499 -->
  `itd-2609051335399446`, and map #3, `itd-2609051335415528`. One spec —
  an editor with no bindings is not the editor the constraints describe.
- Plumbing inherited, not owned: the editing component, key interception <!-- cond: cond-2609051353387424 -->
  in the shell, the key table's data shape, and atomic writes to disk.

## Acceptance Criteria

- Given a chapter open with the cursor mid-paragraph, When Alice presses
  each movement chord in the binding table in turn — character, word,
  line, and buffer, forward and backward — Then the cursor moves exactly
  as that entry's label states, for every entry, and no chord in the
  table reaches macOS or the web view instead of the editor.
- Given the cursor at the start of a line, When Alice kills the line and
  yanks it back twice, Then the line is removed once and inserted twice
  at the cursor; and Given a mark set at one point and the cursor at
  another, When Alice acts on the region, Then the action applies to
  exactly the text between them.
- Given a chapter containing the word "lantern" three times, When Alice
  searches forward and steps through the matches, then searches backward,
  Then each step lands on the next match in that direction; and When she
  presses the cancel chord mid-search, Then the search closes and the
  cursor returns to where the search began.
- Given no prefix is active, When Alice presses a prefix chord from the
  table, Then the modeline shows the prefix state and the following key
  completes the chord; and When she presses the cancel chord instead,
  Then the prefix state clears, the modeline shows no prefix, and no
  character is inserted into the chapter.
- Given a chapter is open, When Alice presses the keys-panel chord, Then
  the panel lists every action in the binding table with its label and
  its live chords, Escape closes it, and the entries shown are read from
  the same table the acceptance tests read — a table entry changed in one
  place changes the panel, the tooltip, and the test together.
- Given Alice has typed a paragraph and has not pressed the save chord,
  When the chapter file is read from disk, Then it is byte for byte what
  it was before she typed, the modeline marks the buffer as unsaved, and
  When she then switches to another chapter or closes the document, Then
  Editor asks what to do with the unsaved changes rather than discarding
  or writing them silently; and When she saves instead, Then the file
  differs only by the paragraph she typed and the modeline no longer
  marks it unsaved.
- Given the cursor mid-paragraph, When Alice deletes a sentence, retypes
  part of it, and presses the undo chord repeatedly, Then each press
  reverses the previous change in order until the paragraph is what it
  was when the chapter opened, and no undo step reaches past the state
  the file was opened in.
- Given a chord that appears nowhere in the binding table, When Alice
  presses it in the editing surface, Then no editing action is performed,
  the keys panel does not list it, and the chapter is byte for byte what
  it was. (Negative case: a chord that acts without being in the table
  makes the table an incomplete promise.)
- Given a chapter carrying a 544-character line, a table, an HTML
  comment, and a fenced div, When Alice opens it, moves the cursor to the
  end of the buffer, and saves without typing, Then the file is byte for
  byte identical — no reflowed line, no re-escaped character, no
  realigned table, no dropped comment.
- Given the desktop app window narrowed to iPad width (820 CSS px), and
  again at iPhone width (390 CSS px) and desktop width (1280 CSS px),
  When Alice opens the keys panel and enters a prefix state, Then the
  panel and the modeline remain fully legible at every one of the three
  widths with no horizontal scrolling and no pinch zoom, and the cancel
  chord still closes the panel.
- Inherits: round-trip byte-fidelity (`itd-2609051336074533`); no machine
  in the document (`itd-2609051336080960`); one source, always
  (`itd-2609051336090390`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); legible on three device classes
  (`itd-2609051336128348`); network only on publish
  (`itd-2609051336158553`).

## Open Questions

- What "full" means. `03-evidence.md` leaves open "the binding table:
  which prefix keys and which of the less common Emacs bindings count as
  'full'. A written table is the finite acceptance list." Until the spike
  writes it, the criteria above have a list to refer to but not its
  contents.
- Whether individual chords are rebindable and persisted, as the
  keyboard-navigation prototype allows — open in `03-evidence.md`, which
  separates it from alternative binding sets.
- Which key combinations macOS and the web view take before the editor
  sees them, and which of those the shell can claim back — open in
  `03-evidence.md` and the first question the spike answers.
- Which navigation chords the reading views share with the editor — open
  in `03-evidence.md`. The moment that answers it is map #26,
  `itd-2609051402083398` (Move through the article by keyboard), which
  reads its chords from this intent's table; this intent stops at the
  editing surface.
- How concurrent edits from two devices are detected so that
  last-write-wins can be reported rather than silently applied — open in
  `03-evidence.md`. The same question decides what the editor does when a
  chapter it is holding with unsaved changes is rewritten underneath it
  by another tool.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-44a3e570b46e -->
Fidelity review — receipt rcp-44a3e570b46e (verifier intent-auditor claude-fable-5-1).

Provenance: intent-auditor@claude-fable-5-1 · rubric_hash sha256:44f19418b0b8d56d7b17cbecbd5acd5d2cbed5abc4347428680ce46647f381d5 · prompt_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5
Input attestations: diff:e41596a^..HEAD (4228d9b61cc16d1f116a452bddd22f00096158a7..13277282fdd2c6a9e1a7dc66b019e323a1830376)@sha256:6343ab4e968dd2ce947b393ad874bb85af80f3bbb074f2d20e2e98bfd2353d7e; intent:.abcd/development/intents/shipped/itd-2609051335406422-edit-with-the-emacs-bindings-i-already-know.md@-; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609051353381023.md (every row unticked)@-;

Acceptance rollup: MET 6 · MET_WITH_CONCERNS 4 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET_WITH_CONCERNS: Effect tests cover C-f/C-b/C-n/C-p/M-f/M-b/C-a/C-e and the claim sweep covers every modified chord the Emacs layer answers; an audit probe at HEAD under a mac platform showed every movement row claimed and landing as labelled. Concerns: the six s- movement chords (s-Left, s-Right, s-Up, s-Down, s-Home, s-End) are labelled owner keymap but are answered only by CodeMirror's mac-only standard keymap, so the shipped sweep skips them (test line 500) and the shipped suite never exercises them; and the 'no chord reaches macOS or the web view' clause is provable only by manual rows 1, 2 and 8, all unticked.
  evidence: src/emacs-keys.test.ts:346 — "moves forward and backward by character"
  evidence: src/emacs-keys.test.ts:483 — "claims every step of every modified chord the page owns"
  evidence: src/emacs-keys.test.ts:500 — "if (!answered.has(canonicalChord(chord))) continue;"
  evidence: src/editor.ts:176 — "Prec.highest([...searchCancel, markdownReturn, emacsKeymap()])"
  evidence: src/keys.ts:143 — "chords: ["C-a", "Home", "s-Left"]"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:25 — "- [ ] Row 1 — `M-f`, `M-b`, `M-d`, `M-w`, `M-u`, `M-l`, `M-v`"
- ac-2 — MET_WITH_CONCERNS: The region half is tested (mark at 0, point at line end, C-w removes exactly that text) and an audit probe at HEAD confirmed C-k at line start followed by two C-y presses removes the line once and inserts it twice. Concern: the shipped test named 'yanks what was killed back, twice' presses C-y once and kills a region rather than a line, so the spec's promised extension to a double yank was not delivered and the test name overclaims.
  evidence: src/emacs-keys.test.ts:413 — "kills the region between the mark and the point"
  evidence: src/emacs-keys.test.ts:421 — "it("yanks what was killed back, twice", () => {"
  evidence: src/emacs-keys.test.ts:426 — "expect(press(view, "C-y")).toBe(true);"
  evidence: src/keys.ts:206 — "id: "kill-line""
  evidence: src/keys.ts:299 — "id: "yank""
- ac-3 — MET_WITH_CONCERNS: Cancel is proven: searchOrigin records the pre-search cursor, cancelSearch restores it, and tests show C-g and Escape both close the panel and return the cursor. Stepping is realised by findnext/findprevious supplied from @codemirror/search and an audit probe at HEAD stepped forward through three 'lantern' matches and back; concern: no shipped test exercises the stepping, and manual row 10 is unticked.
  evidence: src/editor.ts:94 — "const searchOrigin = StateField.define< number | null>({"
  evidence: src/editor.ts:111 — "function cancelSearch(view: EditorView): boolean {"
  evidence: src/emacs-keys.test.ts:578 — "returns the cursor to where the search began when the search is cancelled"
  evidence: src/emacs-keys.test.ts:590 — "closes a cancelled search on Escape as well"
  evidence: src/emacs.ts:206 — "findnext: (handler: EmacsHandler) => {"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:34 — "- [ ] Row 10 — `C-s`, then `M-C-s`"
- ac-4 — MET: C-x puts 'C-x-' in the modeline prefix cell with data-active=yes, C-x h completes to select-all, and C-g clears the prefix, leaves the cursor where it was and leaves the document text unchanged.
  evidence: src/emacs-keys.test.ts:997 — "shows a half-typed prefix in the modeline, and clears it on C-g"
  evidence: src/emacs-keys.test.ts:599 — "leaves the cursor alone when C-g cancels a prefix rather than a search"
  evidence: src/emacs-keys.test.ts:461 — "selects the whole document with the C-x h prefix chord"
  evidence: src/modeline.ts:91 — "prefixCell.textContent = status.prefix ? `${status.prefix}-` : "";"
- ac-5 — MET: The panel renders BINDINGS at open time grouped by group, tests assert one row per table entry with its label and every chord, Escape and C-g close it, and tooltips come from describeChord over the same table (modeline cells, sidebar open button).
  evidence: src/keyspanel.ts:50 — "const inGroup = BINDINGS.filter((binding) => binding.group === group);"
  evidence: src/keyspanel.test.ts:153 — "lists every binding the table carries"
  evidence: src/keyspanel.test.ts:173 — "renders a row added to the table without a second edit"
  evidence: src/keyspanel.test.ts:205 — "closes on Escape and on C-g"
  evidence: src/emacs-keys.test.ts:930 — "opens the keys panel on C-h b and on C-x ?"
  evidence: src/keyspanel.ts:122 — "export function describeChord(id: string, prose: string): string {"
  evidence: src/app.ts:590 — "openButton.title = describeChord("open-folder", "Open a document folder");"
- ac-6 — MET: writeChapter is called only from save(), dirty is the buffer-vs-savedText comparison shown as ** or -- in the modeline, openChapter and openFolder ask via confirmDiscard before discarding, confirmClose answers a close the Rust shell holds back with prevent_close while dirty, and the atomic write lands the buffer text only; an audit probe at HEAD confirmed ** after typing with nothing written, then a write differing only by the typed paragraph and -- afterwards.
  evidence: src/app.ts:190 — "function isDirty(): boolean {"
  evidence: src/app.ts:543 — "await services.writeChapter(path, text);"
  evidence: src/app.ts:497 — "if (!sameChapter && !(await mayDiscard())) {"
  evidence: src/app.ts:555 — "async confirmClose(): Promise< boolean> {"
  evidence: src/modeline.ts:79 — "const state = context.detached ? "!!" : context.dirty ? "**" : "--";"
  evidence: src-tauri/src/lib.rs:326 — "if let WindowEvent::CloseRequested { api, .. } = event {"
  evidence: src-tauri/src/document.rs:442 — "pub fn write_chapter_text(path: &Path, text: &str) -> Result<(), String> {"
  evidence: src/emacs-keys.test.ts:1088 — "asks before unsaved edits are lost, and keeps them on a refusal"
  evidence: src/emacs-keys.test.ts:1105 — "holds a close back while the chapter is dirty, and tells the shell"
- ac-7 — MET: Undo is CodeMirror history and a chapter switch builds a fresh EditorState, so no step reaches past the opened text; tests show one undo/redo and that Bob's buffer cannot undo into Alice's, and an audit probe at HEAD confirmed three ordered edits reverse under repeated C-/ back to the opened text with further presses leaving it unchanged.
  evidence: src/editor.ts:256 — "export function setDocument(view: EditorView, doc: string): void {"
  evidence: src/editor.ts:257 — "view.setState(stateFor(doc, hooksByView.get(view) ?? {}));"
  evidence: src/emacs-keys.test.ts:451 — "undoes and redoes an edit"
  evidence: src/emacs-keys.test.ts:1008 — "keeps a chapter's undo history to itself"
- ac-8 — MET: The conformance sweep asserts every chord the four installed keymaps answer is a table row or a SUPPRESSED entry (never both), suppression is applied to both the Emacs and CodeMirror keymaps, unlisted chords leave the hazardous chapter untouched, and the panel renders only BINDINGS.
  evidence: src/emacs-keys.test.ts:268 — "answers no chord the table does not list"
  evidence: src/emacs-keys.test.ts:708 — "leaves the chapter untouched for a chord outside the table"
  evidence: src/keys.ts:765 — "export const SUPPRESSED: readonly Suppression[] = ["
  evidence: src/emacs.ts:246 — "EmacsHandler.bindKey(toPackageChord(chord), undefined);"
  evidence: src/editor.ts:178 — "...withoutSuppressed(defaultKeymap),"
  evidence: src/keyspanel.test.ts:156 — "expect(rows.length).toBe(BINDINGS.length);"
- ac-9 — MET: The HAZARDOUS fixture carries a 544-character line, a ragged table, an HTML comment, a fenced div, tabs and no trailing newline; the test opens it, presses every movement chord including end-of-buffer, saves, and asserts the written text is identical; the surface holds the file's own line separator and the Rust write is byte-exact and atomic.
  evidence: src/emacs-keys.test.ts:627 — "const HAZARDOUS = ["
  evidence: src/emacs-keys.test.ts:655 — "opens a hazardous chapter and saves it byte for byte"
  evidence: src/emacs-keys.test.ts:703 — "expect(written).toBe(HAZARDOUS);"
  evidence: src/editor.ts:222 — "EditorState.lineSeparator.of(lineSeparatorOf(doc)),"
  evidence: src-tauri/src/document.rs:784 — "fn round_trips_crlf_bytes_untouched() {"
- ac-10 — INCONCLUSIVE: Legibility at 390, 820 and 1280 CSS px with no horizontal scroll or pinch is provable only by manual check M4, and every M4 row is unticked; the CSS sizes the overlay at min(560px, 92vw) and drawers the sidebar at 820px, but the modeline is a non-wrapping flex row with no narrow-width rule, so nothing in the repo demonstrates the outcome.
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:10 — "- [ ] At 1280: open the keys panel with `C-h b`"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:15 — "- [ ] At 390: the same two checks, and no text needs a pinch."
  evidence: src/style.css:226 — "width: min(560px, 92vw);"
  evidence: src/style.css:387 — ".modeline {"
- ac-11 — MET_WITH_CONCERNS: Round-trip byte fidelity and network-only-on-publish are tested; one-source and no-machine-in-the-document hold structurally because save writes documentText(view) and nothing else and the panel, tooltips and tests read one BINDINGS table; degrade-gracefully is argued (this spec writes no construct) rather than tested. Concern: legible-on-three-device-classes rests solely on unticked manual check M4 and is unverified.
  evidence: src/emacs-keys.test.ts:655 — "opens a hazardous chapter and saves it byte for byte"
  evidence: src/emacs-keys.test.ts:724 — "attempts no network request while editing"
  evidence: src/app.ts:541 — "const text = documentText(view);"
  evidence: src/keyspanel.ts:4 — "It reads `BINDINGS` at open time rather than copying it"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:14 — "- [ ] At 820: the same two checks."

Gap audit:
- honoured:
  - The binding table is data and the one source for the panel, the tooltips and the tests
    evidence: src/keys.ts:96 — "export const BINDINGS: readonly Binding[] = ["
    evidence: src/keyspanel.ts:50 — "const inGroup = BINDINGS.filter((binding) => binding.group === group);"
    evidence: src/keyspanel.ts:122 — "export function describeChord(id: string, prose: string): string {"
  - The table is complete in both directions: every answered chord is listed or suppressed, never both
    evidence: src/emacs-keys.test.ts:268 — "answers no chord the table does not list"
    evidence: src/emacs-keys.test.ts:251 — "suppresses a chord instead of listing it, never both"
  - One cancel rule: C-g and Escape close any overlay, the search panel and a half-typed prefix
    evidence: src/overlay.ts:132 — "if (chordsOf("keyboard-quit").includes(chord)) {"
    evidence: src/editor.ts:135 — "const searchCancel = ["
    evidence: src/keyspanel.test.ts:96 — "closes on every chord of keyboard-quit"
  - Cancelling a search returns the cursor to where the search began
    evidence: src/editor.ts:94 — "const searchOrigin = StateField.define< number | null>({"
    evidence: src/emacs-keys.test.ts:578 — "returns the cursor to where the search began when the search is cancelled"
  - A prefix key opens a prefix state the modeline shows beside the cursor position
    evidence: src/modeline.ts:91 — "prefixCell.textContent = status.prefix ? `${status.prefix}-` : "";"
    evidence: src/emacs-keys.test.ts:997 — "shows a half-typed prefix in the modeline, and clears it on C-g"
  - The chapter on disk is the file itself: the buffer holds the file's text, save writes that text atomically, nothing is written silently
    evidence: src/app.ts:543 — "await services.writeChapter(path, text);"
    evidence: src-tauri/src/document.rs:466 — "fs::rename(&temp, path).map_err(|error| {"
    evidence: src/emacs-keys.test.ts:1088 — "asks before unsaved edits are lost, and keeps them on a refusal"
  - M-% (query-replace) is supplied and listed; the inert package commands gotoline/findnext/findprevious are supplied
    evidence: src/emacs.ts:203 — "gotoline: (handler: EmacsHandler) => {"
    evidence: src/keys.ts:676 — "id: "query-replace""
    evidence: src/emacs-keys.test.ts:609 — "opens the search panel with the replacement field on M-%"
  - Undo is bounded to the chapter as opened
    evidence: src/editor.ts:257 — "view.setState(stateFor(doc, hooksByView.get(view) ?? {}));"
    evidence: src/emacs-keys.test.ts:1008 — "keeps a chapter's undo history to itself"
  - Editing attempts no network request
    evidence: src/emacs-keys.test.ts:724 — "attempts no network request while editing"
  - The shell installs no Edit-menu accelerators so the surface sees Cmd-Z/X/C/V/A, and holds a close back while dirty
    evidence: src-tauri/src/lib.rs:222 — "menu carries an Edit submenu whose accelerators (Cmd-Z, Cmd-X, Cmd-C,"
    evidence: src-tauri/src/lib.rs:328 — "api.prevent_close();"
- diverged:
  - Spec: the existing yank test is 'extended to yank twice'; delivered: the test named 'twice' yanks once, after a region kill rather than a line kill
    evidence: src/emacs-keys.test.ts:421 — "it("yanks what was killed back, twice", () => {"
    evidence: src/emacs-keys.test.ts:426 — "expect(press(view, "C-y")).toBe(true);"
  - Table rows label s-Left, s-Right, s-Up, s-Down, s-Home, s-End as owner keymap, but they are answered only by CodeMirror's mac-only standard keymap; the shipped claim sweep therefore skips them and the suite never exercises them
    evidence: src/keys.ts:157 — "chords: ["C-Home", "M-S-,", "s-Up", "s-Home"],"
    evidence: src/emacs-keys.test.ts:500 — "if (!answered.has(canonicalChord(chord))) continue;"
    evidence: src/keys.ts:1053 — "const spec = binding.mac ?? binding.key;"
  - Spec: the spike checklist 'becomes the record of which rows a person has confirmed'; delivered: the checklist has rows 13-16 added but records no result for any row
    evidence: docs/spike-emacs-keys.md:189 — "Record the result of each row against the binding table."
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:25 — "- [ ] Row 1 — `M-f`, `M-b`, `M-d`, `M-w`, `M-u`, `M-l`, `M-v`"
  - Intent: the Editing surface bundle is 'one spec'; delivered: three closed specs, one per intent, and the intent is kind standalone
    evidence: .abcd/development/specs/closed/spc-2609051353381023-edit-with-the-emacs-bindings-i-already-know.md:21 — "It is the second of the three specs in the Editing surface"
    evidence: .abcd/development/intents/shipped/itd-2609051335406422-edit-with-the-emacs-bindings-i-already-know.md:5 — "kind: standalone"
  - Delivery chapter: the spike is thrown away afterwards; delivered: the key log ships as a table row behind C-x k, recorded as a deliberate departure
    evidence: src/keys.ts:401 — "id: "toggle-key-log""
    evidence: .abcd/development/specs/closed/spc-2609051353381023-edit-with-the-emacs-bindings-i-already-know.md:239 — "The key log outlives the spike."
- missing:
  - The manual half of acceptance (M4 at three widths, M5 rows 1-16, the cancel rule in the window) has not been run: every row is unticked
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:10 — "- [ ] At 1280: open the keys panel with `C-h b`"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:44 — "- [ ] `C-s`, type a few letters, `C-g`: the panel closes"
  - No shipped test steps through search matches with find-next/find-previous; the criterion's stepping outcome is not in the suite
    evidence: src/emacs-keys.test.ts:438 — "opens the search panel on C-s and on C-r"
    evidence: src/emacs.ts:206 — "findnext: (handler: EmacsHandler) => {"
  - No narrow-width rule for the modeline, and no evidence that the panel and modeline are legible without horizontal scroll at 390 px
    evidence: src/style.css:387 — ".modeline {"
    evidence: src/style.css:194 — "@media (max-width: 820px) {"

Scope-condition dispositions:
- cond-2609051353386305 — narrowed: The delivery is a Tauri 2 desktop shell, but the shell claims no combination back from macOS: it omits the default Edit submenu so those accelerators never exist, and leaves everything else to the surface; which combinations macOS itself still takes (C-Space, Ctrl-Tab) is unmeasured because the manual rows are unticked.
  narrowing: Holds for the Tauri 2 desktop shell only in the sense that the shell installs no competing menu accelerators; no key combination is claimed back from macOS by Rust, and which combinations the platform still takes first is unmeasured.
  evidence: src-tauri/src/lib.rs:228 — "fn install_menu< R: tauri::Runtime>(app: &tauri::AppHandle< R>) -> tauri::Result<()> {"
  evidence: src-tauri/src/lib.rs:227 — "the editing surface."
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:29 — "- [ ] Row 5 — `Ctrl-Tab`"
- cond-2609051353385085 — narrowed: The spike's automated half produced the table and every acceptance test reads it, so the criteria do refer to the table; the spike's manual half, which decides which rows survive on macOS, has produced no recorded result.
  narrowing: Holds for the automated half of the spike: the binding table exists and the tests, the panel and the tooltips read it; the manual half of the spike has recorded no result for any checklist row.
  evidence: src/keys.ts:96 — "export const BINDINGS: readonly Binding[] = ["
  evidence: src/emacs-keys.test.ts:492 — "for (const binding of BINDINGS) {"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353381023.md:25 — "- [ ] Row 1 — `M-f`, `M-b`, `M-d`, `M-w`, `M-u`, `M-l`, `M-v`"
- cond-2609051353388604 — narrowed: CodeMirror 6 with the Emacs keymap is the editing surface in the desktop app; the delivered range contains no single-file editing surface, so the half of the assumption about 'the single file' was never exercised.
  narrowing: Holds for the desktop app only; no single-file editing surface exists in the delivered range to confirm or replace CodeMirror there.
  evidence: src/editor.ts:229 — "export function createEditor("
  evidence: src/editor.ts:176 — "Prec.highest([...searchCancel, markdownReturn, emacsKeymap()])"
- cond-2609051353382930 — survived: One constant binding table ships, no alternative set exists, and nothing rebinds or persists a chord; the row id is left as the seam and nothing more.
  evidence: src/keys.ts:96 — "export const BINDINGS: readonly Binding[] = ["
  evidence: src/keys.ts:79 — "/** Stable identifier, used by tests and by persisted rebindings. */"
- cond-2609051353385287 — untested: Nothing in the delivered range runs in Safari on an iPad, the spike doc records the tablet as untested, and checklist row 12 is unticked; the boundary was neither exercised nor contradicted.
- cond-2609051353383595 — survived: This delivery kept to the editing surface's vocabulary, the table and the panel; other bundles reserve rows in the table with owner app rather than the table reaching into the reading views, and the presenter's own key handling stays outside the table.
  evidence: src/keys.ts:723 — "// The application's own rows: the chord is the table's, the command is"
  evidence: src/keys.ts:730 — "owner: "app","
  evidence: src/present.ts:224 — "document.addEventListener("keydown", (event) => {"
- cond-2609051353385499 — falsified: The condition assumed the Editing surface bundle would ship as one spec; the record ships three closed specs, one per intent, and this intent is recorded as kind standalone with bundle-member only suggested.
  evidence: .abcd/development/specs/closed/spc-2609051353381023-edit-with-the-emacs-bindings-i-already-know.md:21 — "It is the second of the three specs in the Editing surface"
  evidence: .abcd/development/intents/shipped/itd-2609051335406422-edit-with-the-emacs-bindings-i-already-know.md:5 — "kind: standalone"
- cond-2609051353387424 — narrowed: The editing component, the shell's key handling and the atomic write predate the delivered range (created in 61807ed), so they were inherited; the key table's data shape was not inherited but extended by this delivery, which added SUPPRESSED, the Suppression interface and the codemirror and app owners in 22b929e.
  narrowing: Holds for the editing component, key handling in the shell, and the atomic write, all created before e41596a; it does not hold for the key table's data shape, which this delivery owns and extended.
  evidence: src/keys.ts:758 — "export interface Suppression {"
  evidence: src/keys.ts:32 — "| "codemirror""
  evidence: src-tauri/src/document.rs:442 — "pub fn write_chapter_text(path: &Path, text: &str) -> Result<(), String> {"
## Grounds

- pursued: the Emacs keymap inside a system web view can be made to honour the binding table with precedence and a thirty-line extension; wrong if the manual checklist on macOS finds chords the shell cannot claim
