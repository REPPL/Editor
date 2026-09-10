---
id: spc-2609051353381023
slug: edit-with-the-emacs-bindings-i-already-know
intent: itd-2609051335406422
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Edit with the Emacs bindings I already know

## Summary

This spec delivers map #2, `itd-2609051335406422`: the editing surface answers
the chords Alice already has in her hands, and the list of what it answers is a
table she can read inside the app. Most of the machinery exists — CodeMirror 6
with `@replit/codemirror-emacs` at the highest precedence, a binding table in
`src/keys.ts`, a modeline showing the prefix and the mark, an explicit save on
`C-x C-s`, an atomic write in Rust, and a close the shell holds back while the
buffer is dirty. What this spec adds is the keys panel, one overlay module that
implements the cancel rule once, the chords the shipped keymap answers but the
table does not yet list, and a conformance test that makes the table complete in
both directions. It is the second of the three specs in the Editing surface
bundle and owns the binding table for all three.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/keys.ts` | exists: 40 rows, chord notation, `chordFromEvent`, `canonicalChord` | adds the rows the keymap answers and the table omits, plus `keys-panel`, `insert-palette`, `query-replace`; adds `SUPPRESSED` |
| `src/emacs.ts` | exists: keymap registration, three supplied commands, three Editor chords | adds `replace`, the suppression list, and the panel and palette chords |
| `src/editor.ts` | exists: extensions, precedence, line separator, cursor position | adds `revealLine` for map #1's sidebar and restores the pre-search cursor on cancel |
| `src/overlay.ts` | absent | new: one overlay contract — take the keyboard, move on the table's own chords, cancel on `keyboard-quit` |
| `src/keyspanel.ts` | absent | new: the panel, rendered from `BINDINGS` |
| `src/modeline.ts` | exists: chapter, dirty, position, prefix, mark | adds the detached marker and a tooltip naming each cell's chord |
| `src/keyspike.ts` | exists: the key log | kept as the diagnostic behind `C-x k`; the spike's throwaway window is already gone |
| `src/app.ts` | exists | panel wiring only; map #1 owns the folder and map #3 the palette |
| `src/emacs-keys.test.ts` | exists: 790 lines, sweep and effect tests | adds the conformance sweep and the negative case; its sidebar test moves to `src/document.test.ts` |
| `src/keyspanel.test.ts` | absent | new: the panel, the overlay contract, the cancel rule |
| `docs/spike-emacs-keys.md` | exists | its checklist becomes the record of which rows a person has confirmed |

### Out

- Which of these chords survive in Safari on an iPad: map #18,
  `itd-2609051335586905` (cond-2609051353385287). This spec owns the desktop app
  and the table; 18 owns the tablet.
- Which of these chords a reading view answers: map #26,
  `itd-2609051402083398` (cond-2609051353383595), which reads this table.
- Rebinding one action and persisting it. `03-evidence.md` leaves it open; the
  row's `id` is the seam a later answer needs and nothing more.
- The sidebar, the outline, the drop, the watcher: spc-2609051353137620.
- The insert palette and the canon: spc-2609051353398011. It consumes
  `src/overlay.ts` and adds one row to the table.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| Round-trip byte-fidelity `itd-2609051336074533` | "opens a hazardous chapter and saves it byte for byte", over a fixture carrying a 544-character line, a ragged table, an HTML comment, and a fenced div; `round_trips_crlf_bytes_untouched` (exists) |
| No machine in the document `itd-2609051336080960` | the surface writes the buffer's text and nothing else; no path, name, or setting enters a chapter |
| One source, always `itd-2609051336090390` | the buffer holds the file's text, with no hidden representation and no rich-text round trip; the panel, the tooltips, and the tests read one table |
| Degrade gracefully in a plain tool `itd-2609051336110536` | nothing here writes a construct; the surface leaves the canon to spc-2609051353398011 |
| Legible on three device classes `itd-2609051336128348` | manual check M4 at 390, 820, and 1280 with the panel open and a prefix half-typed |
| Network only on publish `itd-2609051336158553` | "attempts no network request while editing", the sibling of map #1's sweep |

## Design

Layers and bundle ownership are as spc-2609051353137620 sets them out. This spec
owns `src/keys.ts`, `src/emacs.ts`, `src/editor.ts`, `src/overlay.ts`,
`src/keyspanel.ts`, and `src/modeline.ts`; the other two specs add rows to the
table and never change its shape.

### The table is the promise, in both directions

`src/keys.ts` already holds the table `05-internals.md` section 5 asks for: an
id, a label, an owner (`keymap`, `editor`, or `shell`), a group, and the chords,
in the prototype's notation — `C-` Control, `M-` Meta, `s-` Super, `S-` Shift, a
space for a prefix sequence. The panel, the tooltips, and the tests read it.

What is missing is the other direction. `@replit/codemirror-emacs` exports
`emacsKeys`, the 62-row map it installs, and the shipped table lists about forty
of its chords. The rest — `M-h`, `M-@`, `M-s`, `M-/`, `M-;`, `M-x`, `S-M-5`,
`C-x C-u`, `C-x C-l`, `C-x r`, `C-z`, `C--`, the `S-` selection variants, and
`C-x C-p` — are answered by the surface and named nowhere, which is exactly the
incompleteness the intent's negative criterion forbids. Each is settled one of
two ways and no third:

- **listed** — a row is added, with a label an author can read;
- **suppressed** — `EmacsHandler.bindKey(chord, undefined)` clears it from the
  shared `commandKeyBinding` map, so the chord is not claimed and falls through
  to the browser. `M-x` (a command line with no commands behind it), `M-/`
  (completion with no source configured), and `M-;` (comment toggling, which
  Markdown has no line form for) are suppressed for the same reason: a chord
  that opens a dead end is worse than one that does nothing.

`S-M-5`, which an Emacs user says as `M-%`, is bound to a `replace` command the
package never implements — the same gap `src/emacs.ts` already fills for
`gotoline`, `findnext`, and `findprevious`. It is supplied from
`@codemirror/search` and listed as `query-replace`.

The conformance test is what keeps this true: it walks `emacsKeys`,
canonicalises each key into the table's notation (the package writes `CMD-` for
Command and sorts its modifiers; `Esc` is `Escape`), and asserts that every
chord is either in `BINDINGS` or in `SUPPRESSED`, and never in both. A future
version of the package that adds a chord fails the build rather than quietly
widening the promise.

### The two new rows, and their chords

| Row | Chords | Why |
|---|---|---|
| `keys-panel` | `C-h b`, `C-x ?` | `C-h b` is `describe-bindings`; `C-h` is free in the keymap but WebKit may read it as a backspace in a contenteditable, so the second chord is in the same row and costs nothing if the first fails checklist row 13 |
| `insert-palette` | `C-c i` | added by spc-2609051353398011. `C-c` is the mode prefix and is unbound by the keymap; Control-c is not copy on macOS |

Both are prefix sequences, which the package supports generically: a prefix step
is stored as the string `"null"` and builds `$data.keyChain`, which is what the
modeline already reads.

### One overlay, one cancel rule

`src/overlay.ts` is the contract every overlay in Editor obeys, written once
because `03-evidence.md` records that a single check at the head of each
overlay's key handler is what makes one cancel rule hold:

```
openOverlay({ element, onChoose }) -> { close(), element }
```

While an overlay is open it takes the keyboard; it moves on the chords the table
already names (`next-line`, `previous-line`, and their arrow aliases), chooses on
`Return`, and closes on every chord of `keyboard-quit` — `C-g` and `Escape`.
Movement is resolved through `chordFromEvent` and `bindingById` rather than
against hard-coded keys, so an overlay cannot drift from the table. Closing
restores focus and the selection the surface had when it opened. Nothing gets
its own escape hatch: an overlay that needs one is a defect.

The same rule covers the search panel and a half-typed prefix, which is what the
intent's third and fourth criteria ask for. The keymap's `keyboardQuit` already
clears a prefix; `src/editor.ts` adds the part it does not do — remembering where
the cursor sat when a search opened and putting it back when the search is
cancelled.

### The keys panel

`src/keyspanel.ts` renders `BINDINGS` grouped by `group`, each row showing the
label and its chords, with the owner shown for a `shell` row so `s-o` is not
mistaken for something the page claims. It is an overlay, so it moves and
cancels like every other. It reads the table at open time rather than copying it,
which is the whole of the criterion that a table entry changed in one place
changes the panel, the tooltip, and the test together. Every control that has a
chord takes its `title` from `bindingById(...)`, so a tooltip is generated, not
typed.

### Saving, and what the modeline says

Unchanged and already shipping: `C-x C-s` writes through `write_chapter`, which
writes a dot-prefixed temporary file beside the chapter and renames it, so a
failure leaves the original whole; the modeline marks a dirty buffer `**` and a
clean one `--`; switching chapter or closing the document with edits asks first;
the shell holds a window close back and asks the page, because only the page
knows whether the buffer differs from the file. This spec adds one marker: a
chapter whose file has gone from disk reads as detached, and its save is refused
with the missing path named (spc-2609051353137620 owns the case).

Undo is CodeMirror's history, and a chapter switch builds a fresh `EditorState`
rather than dispatching a transaction, so no undo step reaches past the state the
chapter opened in — already true and already tested.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| Every movement chord in the table moves as its label says, and none reaches macOS or the web view instead | `src/emacs-keys.test.ts` › "claims every step of every modified chord the page owns" (exists), plus the per-command effect tests for `C-f`, `C-b`, `C-n`, `C-p`, `M-f`, `M-b`, `C-a`, `C-e` (exist); manual checklist rows 1, 2, 8 |
| Kill a line and yank it back twice; act on a region between mark and point | `src/emacs-keys.test.ts` › "kills to the end of the line", "yanks what was killed back, twice", "sets the mark, and the modeline can see it", "kills the region between the mark and the point" (exist), extended to yank twice |
| Search forward, step, search backward; cancel returns the cursor to where the search began | `src/emacs-keys.test.ts` › "opens the search panel on C-s and on C-r" (exists) and a new "returns the cursor to where the search began when the search is cancelled" |
| A prefix shows in the modeline and completes; cancel clears it and inserts nothing | `src/emacs-keys.test.ts` › "shows a half-typed prefix in the modeline, and clears it on C-g" (exists), extended to assert the document is unchanged |
| The keys panel lists every action with its label and live chords, Escape closes it, and it reads the same table the tests read | `src/keyspanel.test.ts` › "lists every binding the table carries", "closes on Escape and on C-g", "renders a row added to the table without a second edit" |
| Unsaved text is not on disk; the modeline marks it; switching or closing asks; saving differs only by the paragraph | `src/emacs-keys.test.ts` › "saves the open chapter on C-x C-s", "asks before unsaved edits are lost, and keeps them on a refusal", "holds a close back while the chapter is dirty, and tells the shell" (exist) |
| Undo reverses each change in order and reaches no further than the state the chapter opened in | `src/emacs-keys.test.ts` › "undoes and redoes an edit", "keeps a chapter's undo history to itself" (exist) |
| A chord that appears nowhere in the table performs nothing, is not listed, and leaves the chapter byte for byte | `src/emacs-keys.test.ts` › "answers no chord the table does not list" — the conformance sweep over `emacsKeys` — and "leaves the chapter untouched for a chord outside the table" |
| A hazardous chapter opened, moved through, and saved without typing is byte for byte identical | `src/emacs-keys.test.ts` › "opens a hazardous chapter and saves it byte for byte"; `src-tauri` › `round_trips_crlf_bytes_untouched` (exists) |
| The panel and the modeline stay legible at 390, 820, and 1280, and cancel still closes the panel | manual check M4 |
| Round-trip byte-fidelity; no machine in the document; one source, always; degrade gracefully; three device classes; network only on publish | the byte-fidelity test above; `src/emacs-keys.test.ts` › "attempts no network request while editing"; manual check M4; the remaining three are structural and are argued in Scope |

Manual checks, run with `npm run tauri dev`:

- **M4** — at 390, 820, and 1280 CSS pixels, open the keys panel, half-type a
  prefix, and cancel; nothing scrolls sideways and nothing needs a pinch.
- **M5** — the checklist in `docs/spike-emacs-keys.md`, rows 1 to 12, plus a new
  row 13 for `C-h b` and row 14 for `C-c i`. A row that fails is a decision
  recorded against the table, not a silent loss.

## Tasks

1. Add the conformance test over `emacsKeys` and let it fail, so the omissions
   are enumerated rather than guessed at.
   Verify: `npx vitest run -t "answers no chord the table does not list"`.
2. Add a row for each chord it names, or an entry in `SUPPRESSED`, and apply the
   suppression in `src/emacs.ts`. Verify: the same command, now passing.
3. Supply `replace` from `@codemirror/search` and list it as `query-replace`.
   Verify: `npx vitest run -t "query-replace"`.
4. Add `src/overlay.ts` with the cancel rule and the table-driven movement.
   Verify: `npx vitest run src/keyspanel.test.ts`.
5. Add `src/keyspanel.ts` and the `keys-panel` row on `C-h b` and `C-x ?`.
   Verify: `npx vitest run src/keyspanel.test.ts`.
6. Give every control with a chord a tooltip read from `bindingById`.
   Verify: `npx vitest run -t "names its chord in the tooltip"`.
7. Restore the pre-search cursor on cancel in `src/editor.ts`.
   Verify: `npx vitest run -t "returns the cursor to where the search began"`.
8. Add the hazardous-chapter fixture and its byte-fidelity test.
   Verify: `npx vitest run -t "byte for byte"`.
9. Add the offline sweep and the detached marker.
   Verify: `npx vitest run src/emacs-keys.test.ts`.
10. Move the sidebar test out of `src/emacs-keys.test.ts` into
    `src/document.test.ts`. Verify: `npm test`.
11. Add rows 13 and 14 to the checklist in `docs/spike-emacs-keys.md` and run
    M4 and M5, recording each result against the table. Verify:
    `npm run build && npm run lint && npm test && cargo test --manifest-path src-tauri/Cargo.toml`.

## Risks and Open Questions

- **What "full" means** is open in `03-evidence.md`: "the binding table: which
  prefix keys and which of the less common Emacs bindings count as 'full'. A
  written table is the finite acceptance list." The build assumes the answer the
  spike reached and this spec completes: full means every chord the shipped
  keymap answers, minus the three suppressed, plus the chords Editor adds. That
  is a decision the phase records, not one this spec may make alone.
- **Which combinations macOS and WebKit take first** is open in
  `03-evidence.md` and is the spike's first question. Only the checklist can
  answer it; `docs/spike-emacs-keys.md` already records what the unit tests
  cannot reach — interception, Option as Meta, layout, the clipboard, and the
  iPad. `C-h b` is the one new chord at real risk and carries `C-x ?` beside it.
- **Rebinding one action** is open in `03-evidence.md`. Nothing here persists a
  chord; `id` is the seam.
- **Concurrent edits** are open in `03-evidence.md`, and the same question
  decides what happens when a chapter Editor holds dirty is rewritten
  underneath it. The build assumes the narrow case `04-surfaces.md` settles —
  Editor says so and asks which text to keep — and spc-2609051353137620 owns it.
- **The key log outlives the spike.** `06-delivery.md` says the spike "is thrown
  away afterwards". The throwaway window never shipped; what landed is the test
  suite, the table, and the log. The build keeps the log behind `C-x k` as the
  instrument the checklist depends on, and records that as a departure from the
  delivery chapter's wording rather than pretending it is not one.
