---
id: spc-2609051938278499
slug: the-binding-table-lacks-the-prose-vocabulary-a-writer-reache
intent: itd-2609051934109483
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Edit prose with the Emacs commands my hands already know

## Summary

This spec delivers tier one of the Emacs vocabulary survey
(`.abcd/development/research/notes/2026-09-05-emacs-vocabulary-gap.md`) for
intent 32, `itd-2609051934109483`: seventeen new rows in the binding table and
the commands behind them, plus the one already-listed row, `mark-word`, that
the Option-chord fix makes reachable. A new module, `src/prose.ts`, holds the
text commands as plain functions over an `EditorView`; a new
`src/command-palette.ts` holds `M-x` as a view over the table and the insert
forms. Nothing about how keys are handled changes: every new chord is a row of
`src/keys.ts` bound through the one Emacs handler, `M-x` and `M-/` come off the
suppression list, and the conformance sweep stays green with no exemption
written for any of it. `M-q` is the only command that touches more than the
characters at the cursor, and it rewrites exactly the source lines of the one
parsed paragraph the cursor sits in, refusing anywhere that is not a paragraph.

## Scope

In, by module:

- `src/keys.ts` — seventeen rows added; `M-x` and `M-/` removed from
  `SUPPRESSED`. No change to `Binding`, `Suppression`, `chordFromEvent` or the
  chord notation: this spec consumes that shape, it does not author it.
- `src/prose.ts` (new) — the text commands, as functions of a view and an
  options record, each returning a refusal string or `null`.
- `src/command-palette.ts` (new) — `M-x`: the filterable list over the table's
  rows and the insert palette's forms.
- `src/emacs.ts` — the new ids added to `APP_COMMAND_IDS`, and two exports,
  `runBinding` and `killSelection`, because this is the only module holding the
  tracked handler and the package's command table.
- `src/overlay.ts` — one optional `onKey` hook and one shared
  `openListOverlay`; the cancel contract itself is untouched. `src/palette.ts`
  moves onto it, same class names and behaviour, so `src/palette.test.ts`
  passes unchanged.
- `src/app.ts` and `src/main.ts` — the new rows wired through the existing
  `commands` record; the document's fill column read alongside its title; one
  shared quit path.
- `src/doctree.ts`, `src-tauri/src/metadata.rs` — `fill_column` on the document
  metadata, default 80. `src/style.css` — the palette and the narrow modeline.
- Tests: `src/prose.test.ts` and `src/command-palette.test.ts` (new);
  `src/emacs-keys.test.ts` and the `metadata.rs` tests (changed). Docs:
  `docs/how-to-find-and-change-the-keys.md`.

Out, by boundary. Intent 2, `itd-2609051335406422` (map 2): the table's shape,
the keys panel, the cancel contract and the sweep are its; this spec adds rows
and passes under the sweep. Intent 3, `itd-2609051335415528` (map 3): what an
insert form writes and the `C-c i` chord are its; this spec only lists those
forms under `M-x`. Intent 30, `itd-2609051921482691` (map 30): focus between
panes is its; `M-r` moves the cursor inside the text and no chord here moves
focus out of it. Tier two of the research note, and its chord conflicts, are
untouched.

Disciplines inherited, and how each is proven here:

- **Round-trip byte-fidelity** (`itd-2609051336074533`): `M-q` replaces exactly
  `doc.line(block.line).from` to `doc.line(block.endLine).to`, and the test
  asserts the bytes either side are identical, on a fixture and on a real
  chapter kept for local testing.
- **No machine in the document** (`itd-2609051336080960`): no command writes a
  path, a name, or a date; `fill_column` is a number.
- **One source, always** (`itd-2609051336090390`): the palette lists the
  binding table and the insert-form table, and copies neither.
- **Degrade gracefully in a plain tool** (`itd-2609051336110536`): filling
  never leaves a line beginning with a character that would open a block
  construct in a plain Markdown reader.
- **Legible on three device classes** (`itd-2609051336128348`): every message
  this spec writes fits the modeline at 390 CSS pixels.
- **Network only on publish** (`itd-2609051336158553`): nothing here reaches
  the network; the existing editing-and-network test covers the new chords.

## Design

### The rows

Seventeen rows, each with `owner: "editor"`, written from the physical key as
`mark-word` already is, because that is what a browser reports once Option and
Shift are down. Emacs's own spelling is in brackets.

| id | label | chords | group |
|---|---|---|---|
| `fill-paragraph` | Fill the paragraph | `M-q` | editing |
| `transpose-words` | Transpose words | `M-t` | editing |
| `transpose-lines` | Transpose lines | `C-x C-t` | editing |
| `capitalize-word` | Capitalise word | `M-c` | editing |
| `backward-sentence` | Backward sentence | `M-a` | movement |
| `forward-sentence` | Forward sentence | `M-e` | movement |
| `backward-paragraph` | Backward paragraph | `M-S-[` (`M-{`) | movement |
| `forward-paragraph` | Forward paragraph | `M-S-]` (`M-}`) | movement |
| `delete-indentation` | Join to the previous line | `M-S-6` (`M-^`) | editing |
| `just-one-space` | Just one space | `M-Space` | editing |
| `delete-horizontal-space` | Delete the surrounding space | `M-\` | editing |
| `zap-to-char` | Zap to a character | `M-z` | editing |
| `dabbrev-expand` | Expand the word from the document | `M-/` | editing |
| `command-palette` | Run a command | `M-x` | control |
| `describe-key` | Describe the next key | `C-h k` | control |
| `move-to-window-line` | Cursor to the middle of the view | `M-r` | movement |
| `quit` | Quit Editor | `C-x C-c` | document |

`M-x` and `M-/` leave `SUPPRESSED`: both were suppressed for having nothing
behind them, and both now have something. The package binds `M-x` to
`focusCommandLine` and `M-/` to `startCompletion`; `EmacsHandler.bindKey`
replaces each with Editor's command, the route `APP_COMMAND_IDS` already takes
for every row Editor owns. `mark-word` keeps its row, its `M-S-2`, and its
`keymap` owner: the Option-chord work makes it reachable, and this spec adds
nothing to it.

### `src/prose.ts`

Each command is `(view: EditorView, options: ProseOptions) => string | null` —
`null` when it acted, a short refusal when it did not, which `src/app.ts`
announces. `ProseOptions` carries `fillColumn` (default 80) and
`sentenceEndDoubleSpace` (default true). The only module-level state is one
`WeakMap<EditorView, Expansion>`, for `M-/`.

**Fill.** `parseChapter(documentText(view))` (`src/core/parse.ts`) gives the
chapter; the cursor's one-based line selects the top-level block whose
`[line, endLine]` contains it. Anything but a `paragraph` refuses by kind —
"Fill does not apply inside a table", "… inside a fenced div", "… inside a code
block", "… on a heading" — and a cursor on no block refuses with "Nothing to
fill here". Only top-level blocks are considered, so a paragraph inside
`::: {.notes}` is inside a `div` and refuses, and a `: The counts by winter
{#tbl:counts}` caption line is inside its `table` block, where `parse.ts` folds
it. Lists, quotes and lone images refuse for the same reason: the tree records
no continuation prefix for them, and a command that would guess declines.

Filling takes the buffer's own text for those lines, splits it on runs of
whitespace, and re-joins: one space between words, two after a sentence end
when `sentenceEndDoubleSpace` holds, the first line's leading whitespace as
every line's prefix, `view.state.lineBreak` between lines. A word is put on the
next line when the current one would exceed the fill column, except that a word
longer than the column stands alone, and except that a word which would open a
block construct in a plain reader — `#`, `>`, `-`, `+`, `*`, `|`, `:`, `=`, a
digit run followed by `.` or `)`, or a fence — is never a line's first word.
One transaction, so one `C-/` takes the whole fill back.

**The rest.** `transposeWords` and `transposeLines` swap the two units either
side of the cursor and leave the point after the second; `capitalizeWord`
upper-cases the first letter of the word at or after the point and lower-cases
its tail. Sentence movement uses Emacs's rule — `[.?!]`, then any of `]"')}`,
then two spaces or a line break, with one space enough when
`sentenceEndDoubleSpace` is off; paragraph movement runs over blank lines, as
Emacs's does, and needs no parse. `deleteIndentation` joins the line to the one
above with one space, `justOneSpace` collapses the whitespace around the point
to one, and `deleteHorizontalSpace` removes it. `moveToWindowLine` reads
`view.lineBlockAtHeight(scrollTop + height / 2)`, keeping the column.

**Zap and describe.** Both prompt in the modeline and read one key. The prompt
is an overlay with no rows, mounted in the application's overlay host with a
visually hidden focus target, so it holds the keyboard and `C-g` or Escape
cancels it under the one contract rather than a second copy of it. It reaches
the key through `overlay.ts`'s new `onKey(event): boolean` hook, consulted
after the cancel chords and before movement; returning true keeps the prompt
open for another step, which is how `C-h k` reads `C-x C-s` as one sequence
against `chordIndex()` and then names the row, or says the chord is not bound.

**Amended 2026-09-10**, superseded in one particular by
`itd-2609091722353594` (`spc-2609091733496272`): the sentence above describes
the order `describeKey` resolves a chord in — name the row if the table has
one, else keep reading if it is a prefix, else say it is not bound — and that
order is unchanged. What changes is that one chord is now both. That intent
adds a `prefix-help` row carrying `C-h`, so `C-h k` then `C-h` names **What
can follow this prefix** and stops, where before there was no row for `C-h`
and the prompt read on for the second step of `C-h b` or `C-h k`. The
row-first order wins because it is the general rule, and because it is what
GNU Emacs answers for `C-h k C-h`. `C-h` is the only chord in the table that
is both a row and a prefix, so no exception is written for the case.
`M-z` selects from the point to and including the next occurrence of the
character and calls `killSelection(view)`, which runs the package's own
`killRegion` through the tracked handler, so the killed text is on the one kill
ring and `C-y` yanks it.

**Expand.** `M-/` takes the word characters before the point as the prefix —
a word is a run of Unicode letters, digits and underscores — collects every
distinct word of the document matching it, orders them by distance from the
point, backwards first and then forwards, and replaces the prefix with the
first. Pressing again replaces it with the next; after the last, the prefix
itself comes back and the cycle repeats. The `WeakMap` entry holds the
candidates, the index, the replaced range, and the `state.doc` and head the
last expansion left; any other transaction or cursor move invalidates it and
the next `M-/` starts a fresh cycle.

### `src/command-palette.ts`

`M-x` opens the same `openListOverlay` the insert palette opens, with the same
class names, movement and cancel. Its entries are every `BINDINGS` row whose
owner is not `shell` — a menu accelerator has no page-side command — plus every
`formsVisibleIn(PALETTE_PHASE)` insert form as `insert:<form id>`. The filter
is fuzzy over the label and the id, ranked: label prefix, label-word prefix,
label-word initials (so `tw` reaches `Transpose words`), id substring, then
subsequence. Choosing a binding entry calls `runBinding(view, id)` in
`src/emacs.ts`, which resolves the command in one of three ways and returns a
refusal when it can resolve none: Editor's own `editor:<id>` in
`EmacsHandler.commands`; the package command `emacsKeys` binds to one of the
row's chords, run through the tracked handler; or the `KeyBinding.run` of
`defaultKeymap`, `historyKeymap` or `searchKeymap` for a `codemirror` row.
Choosing an insert entry calls `src/palette.ts`'s own `insertForm`.

### `quit`

`C-x C-c` is an application command. With nothing unsaved it quits; with
unsaved edits it opens a two-row confirmation overlay — "Keep editing" first,
then "Quit without saving", so that the destructive answer is one the cursor
has to be moved onto — in the overlay host, so `C-g` and Escape return Alice
to the text with her edits intact, which a native dialog cannot do. Quitting goes
through a new optional `AppServices.quit?()`, wired in `src/main.ts` to the two
steps the held-back window close already takes, `setDirty(false)` then
`getCurrentWindow().destroy()`, extracted into one function so there is one
quit and not two. Outside the shell it says quitting needs the desktop
application.

### The fill column

`document.yaml` already declares it — `05-internals.md` section 1 lists
`fill_column: 80` — and nothing reads it. `DocumentMetadata` in
`src-tauri/src/metadata.rs` gains `pub fill_column: Option<u32>`; the shape in
`src/doctree.ts` gains `readonly fill_column: number | null`. No new IPC
command: `read_document_metadata` takes no argument, resolves the one metadata
file at the root, and returns one more field. `src/app.ts` reads it beside the
title on open and reload, and holds 80 when the file is absent, silent, or
unreadable.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| AC1 — the seventeen actions appear in the keys panel with label and chord, no chord claimed twice | `src/emacs-keys.test.ts` "lists every tier-one prose command with a label and a chord"; existing "gives no two rows the same chord" and "has no duplicate ids" |
| AC2 — `M-q` on a 544-character paragraph between a paragraph and a captioned table fills at 80 and changes no byte outside it | `src/prose.test.ts` "fills one paragraph to the document's fill column and leaves every other byte alone"; "fills a real chapter's paragraph without touching the table or its caption" |
| AC3 — `M-q` inside a `::: {.notes}` div, a pipe table, a code fence, or on a heading changes nothing and says so | `src/prose.test.ts` "refuses to fill anywhere that is not a paragraph, and names where" |
| AC4 — `lant` plus `M-/` completes, cycles, and returns to `lant` | `src/prose.test.ts` "expands a word from the document's own words and cycles back to what was typed" |
| AC5 — `M-x`, `tw`, `Transpose words` swaps the words; `M-x` then `C-g` changes not one byte | `src/command-palette.test.ts` "filters on the initials of a label and runs the row's command"; "changes not one byte when it is cancelled" |
| AC6 — `C-x C-c` asks when dirty, `C-g` returns with the edits kept; quits silently when clean | `src/emacs-keys.test.ts` "asks before C-x C-c quits and keeps the edits on C-g"; "quits without asking when nothing is unsaved" |
| AC7 — at 390 pixels the `M-z` prompt and the `C-h k` answer each sit on one line, nothing clipped, nothing scrolling | `src/prose.test.ts` "keeps every prompt and message inside the modeline's budget" (character budget and single-line assertion) plus manual check M-4 (a 390-pixel window on the real engine) |
| AC8 — the conformance sweep passes unchanged | `src/emacs-keys.test.ts`, existing and unedited: "answers no chord the table does not list", "suppresses a chord instead of listing it, never both", "claims every step of every modified chord the page owns", "matches every chord in the table against the event it would arrive as". **Amended 2026-09-10**, superseded in one particular by `itd-2609091722353594` (`spc-2609091733496272`): "existing and unedited" no longer holds for the second of the four. That spec gives `C-h` a row while it remains a `SUPPRESSED` entry (`where: "codemirror"`, so that CodeMirror's own delete-backward cannot answer it), which makes it the one chord that is both, and "suppresses a chord instead of listing it, never both" gains one named exception, asserted in both directions — the chord must be listed, it must still be suppressed, and the exception set must contain only genuinely suppressed chords. The other three sweeps are untouched, and the three sub-claims this criterion enumerates — every row carries a label and a chord, no chord collides, every chord the sweep presses reaches the editor — all still hold |
| AC9 — inherits the six disciplines | Byte-fidelity: AC2's assertions plus existing "opens a hazardous chapter and saves it byte for byte". Degrade gracefully: `src/prose.test.ts` "never wraps a line so that a word opens a block construct". Network: existing "attempts no network request while editing". One source: `src/command-palette.test.ts` "lists every runnable row of the table and every insert form". Legibility: AC7. No machine in the document: no command writes one |
| Manual | `.abcd/.work.local/logs/acceptance/spc-2609051938278499.md`: M-1 each of the eighteen chords pressed on a real Mac keyboard in the shell, with the key log open; M-2 the dead-key chords `M-e` and `M-a` against a real Option key; M-3 `M-x`, `M-/` and `M-@` reaching the editor rather than the web view or the platform; M-4 the 390-pixel window; M-5 `C-x C-c` closing the real window, dirty and clean |

## Tasks

1. Add `fill_column` to `DocumentMetadata` in `src-tauri/src/metadata.rs` with
   a test that reads it and one that leaves it absent. Verify:
   `cargo test --manifest-path src-tauri/Cargo.toml`.
2. Mirror it in `src/doctree.ts`; read it beside the title in `src/app.ts`,
   defaulting to 80. Verify: `npm test`.
3. Add the seventeen rows to `src/keys.ts` and remove the `M-x` and `M-/`
   suppressions. Verify: `npx vitest run src/emacs-keys.test.ts`, which fails
   until step 5 binds them — that is the point of running it here.
4. Write `src/prose.ts`: fill first, then transpose, case, sentence and
   paragraph movement, whitespace repair, `moveToWindowLine`. Verify:
   `npx vitest run src/prose.test.ts`.
5. Add the ids to `APP_COMMAND_IDS` and wire them in `src/app.ts`; add
   `killSelection` and `runBinding` to `src/emacs.ts`. Verify:
   `npx vitest run src/emacs-keys.test.ts`.
6. Add `onKey` and `openListOverlay` to `src/overlay.ts` and move
   `src/palette.ts` onto it. Verify: `npx vitest run src/palette.test.ts`,
   unchanged.
7. Write the modeline prompt and, on it, `zap-to-char` and `describe-key`.
   Verify: `npx vitest run src/prose.test.ts`.
8. Write `src/dabbrev` expansion in `src/prose.ts` with its cycle. Verify:
   `npx vitest run -t "cycles back to what was typed"`.
9. Write `src/command-palette.ts` and its test; open it from `src/app.ts`.
   Verify: `npx vitest run src/command-palette.test.ts`.
10. Wire `quit`: the confirmation overlay, `AppServices.quit`, and the one
    shared quit path in `src/main.ts`. Verify: `npm test`.
11. Add the narrow-window modeline rules and the palette rules to
    `src/style.css`. Verify: `npm run build`.
12. Update `docs/how-to-find-and-change-the-keys.md`: `M-x` and `M-/` off the
    suppressed table, the command palette and `C-h k` described. Write the
    manual checklist to `.abcd/.work.local/logs/acceptance/`, and the decision
    lines to `.abcd/work/DECISIONS.md`. Verify: `npm run lint`.
13. Run the six commands in `AGENTS.md`.

## Risks and Open Questions

- `03-evidence.md` leaves open "which key combinations macOS and the web view
  take before the editor sees them, and which of those the shell can claim
  back". `M-x`, `M-/` and `M-@` are the rows at risk, and `M-Space` and
  `M-S-[`/`M-S-]` join them. The build assumes the Option-as-Meta guard already
  in `src/editor.ts` holds for all of them; manual checks M-1 to M-3 are the
  falsification, and a chord the platform keeps ships on an alternative or not
  at all rather than as a row that does nothing.
- `03-evidence.md` leaves open "whether individual chords in that table are
  rebindable and persisted", and "which prefix keys and which of the less
  common Emacs bindings count as 'full'". The build assumes no rebinding: these
  rows ship on the same terms as every other row. Tier one is this intent's
  answer for prose only, and the second question stays open until the outline
  tier lands.
- The intent asks that `C-g` answer the quit question and that Editor ask
  "exactly as closing a chapter does". Both cannot hold today: the close path
  asks through `services.confirmDiscard`, a native dialog in the shell,
  answering Escape and Return alone. The build satisfies the criterion with an
  in-app confirmation for the chord, leaves the window-close path as it is, and
  records in `.abcd/work/DECISIONS.md` that adopting the overlay there is a
  later intent's decision.
- Where the sentence rule's off switch lives is undecided: `02-constraints.md`
  fixes the `document.yaml` key list and it carries no such key, and
  `settings.json` is machine facts only. The build ships it as a `ProseOptions`
  field defaulting to Emacs's own rule, in code and in tests but in no panel.
- `M-q` refuses in more places than the intent names — lists, quotes and lone
  images as well — because the tree records no continuation prefix for them. If
  Alice reaches for `M-q` in a list, the ranking was wrong in the way the
  intent's Mechanism says it would be.
- Filling parses the whole chapter on every press; the largest example chapter
  is under a thousand lines. A chapter far larger would want the parse cached.
