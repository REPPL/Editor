---
id: spc-2609091733494078
slug: show-markdown-tables-nicely-formatted-in-the-editing-surface
intent: itd-2609061653559060
origin: researcher-authored
production_mode: hand-written
---
# Keep Markdown tables aligned while I type them

## Summary

This spec delivers map #39, `itd-2609061653559060`: a pipe table the caret is
inside is realigned on every edit the author makes inside it, in the same
transaction that carried the edit, so the source on disk and the table on the
screen are one thing and one `C-/` takes both back. One chord, `C-c C-t`,
turns it off for the life of the app process and says so in the modeline.

The mechanism is one CodeMirror `EditorState.transactionFilter`. It is the
only mechanism that can do this: `transactionExtender`, the other candidate,
computes a merged spec and then throws its `changes` away
(`node_modules/@codemirror/state/dist/index.cjs`, `extendTransaction` — it
rebuilds the transaction with `tr.changes`, not the merged ones), so an
extender can add annotations and effects and cannot add a single character.
The filter returns `[tr, { changes, sequential: true, selection }]`, which
`resolveTransaction` composes into one transaction with one change set, one
undo step, and a caret this spec places explicitly rather than leaves to
`mapPos`.

What already exists is more than expected and less than enough.
`src/core/parse.ts` is the canonical answer to "is this a table, where does it
begin and end, and how is each column aligned": `parseChapter` returns a block
of `kind: "table"` with `line`, `endLine`, and a `TableContent` whose header
cells carry `align`. That primitive is reused unchanged and is not duplicated
(`itd-2609051336090390`, one source, always; the precedent is
`src/outline-commands.ts`, which reads headings through `parseChapter` rather
than through CodeMirror's own Markdown grammar so the two can never disagree).
What `parseChapter` cannot give is the source bytes of a cell — `cell.text` is
the flattened text of the parsed inlines, so `**x**` comes back as `x` and
`` `y\|z` `` comes back as `y|z` — and alignment must rewrite source, not
rendering. So this spec adds exactly one new thing: a source-level splitter
for a pipe row, in `src/tables.ts`, which becomes the one home for pipe-table
source geometry.

The byte-fidelity question this intent raised is settled and no longer open:
`adr-2609092000099546` rules that the discipline forbids the serialiser
reformatting on its own initiative, and states three conditions an author's
own edit must meet to reformat the construct their caret is in. Design §
Byte fidelity shows this design meeting each of the three. Both brief clauses
are already corrected and in force, so neither is work this spec does.

Cell text wrapping within its column is **dropped**, with its evidence in
Design § Wrapping. The intent's third Mechanism expectation is thereby
falsified, and the spec records it as falsified rather than silently unmet.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/tables.ts` | absent | new: the source row splitter, the width measure, the alignment computation, the refusal predicates, the session flag and its accessors, and the `EditorState.transactionFilter` that appends the realignment to the author's own transaction |
| `src/tables.test.ts` | absent | new: every criterion jsdom can reach, over a real `EditorView` built by `createEditor` |
| `src/editor.ts` | exists: `editorExtensions()`, thirteen extensions, `createEditor`, `setDocument`, `documentText` | one line: `alignTables()` added to `editorExtensions()`. No other change; in particular `markdown()` keeps its default commonmark base |
| `src/keys.ts` | exists: 140 rows, `SUPPRESSED`, `scopeOf`, `chordIndexIn` | one `editor` row, `toggle-table-alignment`, on `C-c C-t` |
| `src/emacs.ts` | exists: `APP_COMMAND_IDS`, the ids whose action lives in the application | one id added to `APP_COMMAND_IDS`, so the chord reaches the application's command through the row rather than a second copy of the chord |
| `src/app.ts` | exists: the `registerCommand` map, `announce`, `prose` | one entry in the command map: flip the flag and announce the mode through the existing `announce` |
| `src/core/parse.ts` | exists: `tableFrom`, `alignOf`, `mapOf`, the `table` case of the block walk | **unchanged.** Read, not extended: `block.kind`, `block.line`, `block.endLine`, and `block.table.head[0][n].align` are the four facts this spec takes from it |
| `src/emacs-keys.test.ts` | exists: the `HAZARDOUS` fixture, "opens a hazardous chapter and saves it byte for byte", the per-scope chord sweeps | the fixture gains a ragged pipe table and a table with a `\|` in a cell, with the byte count in the assertion corrected; one new test for `C-c C-t` reaching its command and announcing the mode |
| `docs/how-to-write-a-table.md` | absent | new how-to page: what Editor aligns, when it declines, what it does with a wide character, what it does with a long cell, and the chord that turns it off for the session |
| `docs/README.md` | exists: the how-to index | one entry |
| `.abcd/development/brief/07-intent-map.md` | exists: 38 rows | row 39, with its entry beside #38's own |

### Out

- **Any construct that is not a GitHub Flavored Markdown pipe table.** No
  heading, list, quotation, fenced div, code block or paragraph is reformatted
  by anything in this spec, and `M-q` remains the only thing that reflows
  prose: cond-2609091733493119. `src/prose.ts` is untouched.
- **An on-demand realign chord, and a view-only alignment decoration.** Both
  were considered and refused in the intent's own Why This Matters. `C-c C-t`
  is a mode switch, not a realign command: it never rewrites a byte. There is
  nothing to press that aligns a table.
- **A persisted alignment preference.** cond-2609091900422614: the switch is
  session-scoped by decision, not by omission, and a setting that outlives the
  session is deliberately out of scope. Nothing in this spec reads or writes
  the settings store, `document.yaml`, or any file.
- **Repairing a malformed table.** Unequal cell counts and a missing
  delimiter row leave the text exactly as typed: cond-2609091733497438.
  Editor never adds a pipe, never removes one, and never invents a delimiter
  row.
- **A character-width table.** Cells are measured, never re-encoded, and a
  character whose drawn width is not its count may sit one column out:
  cond-2609091733499546. No wcwidth table, no East Asian Width data, no new
  dependency.
- **Cell text wrapping within its column.** Dropped, with evidence, under
  Design § Wrapping: cond-2609091733493537 scopes it as separable and
  droppable, and the intent's eighth Acceptance Criterion admits the drop by
  name.
- **The byte-fidelity ruling and the two brief clauses that carry it.**
  `adr-2609092000099546` is accepted and in force, and both clauses are
  already corrected in `05-internals.md` § 2 and `07-intent-map.md` §
  Disciplines. This spec is measured against that ruling; it does not restate
  it and does not re-decide it.
- **A table inside a fenced div or a blockquote.** Left exactly as typed,
  deliberately: extending alignment into a nested or quoted table is a later
  intent. The behaviour is pinned by test rather than left an accident — see
  Acceptance Mapping.
- **The tablet.** cond-2609091733492361 puts the population on the desktop
  app; the tablet has no CodeMirror surface of Editor's own to filter
  transactions in.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| One source, always `itd-2609051336090390` | there is one answer to "is this a table and how are its columns aligned" — `parseChapter` — and `src/tables.ts` asks it rather than re-deriving it from the delimiter row or from CodeMirror's own grammar, exactly as `src/outline-commands.ts` does for headings. There is one path that writes an alignment — the single `transactionFilter` — and one place the session flag lives; the modeline hears about it through `src/app.ts`'s existing `announce`, not a second channel |
| Round-trip byte-fidelity, as ruled by `adr-2609092000099546` | the ADR's three conditions, each met and each named in Design § Byte fidelity; and `src/emacs-keys.test.ts` › "opens a hazardous chapter and saves it byte for byte", with a ragged table added to the fixture |
| Legible on three device classes `itd-2609051336128348` | `EditorView.lineWrapping` is already on the surface (`src/editor.ts`), so an over-wide row wraps rather than scrolling the page sideways, before and after this change; `src/tables.test.ts` › "wraps an over-wide row rather than widening the line" proves the mechanism, and manual check M39-1 proves the pixels at 1280, 820 and 390. The modeline's two mode messages are eleven and twelve characters, well inside `MODELINE_BUDGET` |
| Reachable by assistive technology `itd-2609061324342715` | structural, and the reason the realignment rides in the author's own transaction rather than a second one: one transaction is one DOM mutation batch and one selection change, so a screen reader hears the character typed and not a second, spurious caret move. The mode switch is announced in the modeline, which is the channel every other mode in the app already speaks through. Not newly proven by a jsdom test — jsdom has no accessibility tree — and checked by hand as M39-4 |

## Design

### What already answers "is this a table"

`parseChapter(state.sliceDoc())` returns blocks; a block with
`kind === "table"` carries `line` and `endLine`, one-based and inclusive, and
`table.head[0]` carries one `TableCell` per column with `align` of `"left"`,
`"center"`, `"right"` or `null`. Probed against the shipped parser, on the
configured markdown-it instance in `src/core/markdown.ts`:

| Source | `parseChapter` says |
|---|---|
| `\| a \| b \|` alone | `paragraph` |
| `\| a \| b \|` + `\|---\|---\|` | `table`, lines 1–2, no body rows |
| the same + `\| 1 \|` | `table`, body row padded to `["1", ""]` |
| the same + `\| 1 \| 2 \| 3 \|` | `table`, body row truncated to `["1", "2"]` |
| `\| a \| b \|` + `\|---\|` | `paragraph` — a delimiter row of the wrong width is not a table at all |
| `\|:-:\|--:\|` | `align: ["center", "right"]` |

Two things follow, and both are load-bearing.

First, **a table under construction stops being malformed at exactly the right
moment**. A header row on its own is a paragraph, so nothing is rewritten
while Alice types it — correctly, because there are no columns yet to align
to. The block becomes a table the moment the delimiter row is complete. That
is precisely when the first realignment would land, and it would land in the
middle of the line she is typing, which is why the caret being in the
delimiter row is a refusal (below). The first realignment therefore happens
when she presses Return and types into the first body row, which is the first
moment there is anything to align. "Refuse a malformed table" does not mean
"never align a table anyone is typing from scratch"; it means "do not align
one before it has columns".

Second, **markdown-it normalises unequal rows rather than rejecting them**,
padding a short row and truncating a long one. The intent's own scope
condition (cond-2609091733497438) names unequal cell counts as malformed, and
a normalising parser would happily rewrite a row the author has just broken by
deleting a pipe into a row with a column missing. So `src/tables.ts` adds one
refusal predicate over the *source* rows — not a second parser, a check — and
that predicate is what catches the author mid-break.

### The filter, and why it is a filter

`editorExtensions()` gains `EditorState.transactionFilter.of(realign)`.

`transactionExtender` is wrong here, and the reason is in the shipped source
rather than in the prose documentation. `extendTransaction`
(`node_modules/@codemirror/state/dist/index.cjs`) merges each extender's spec
into a local `spec` and then finishes with
`Transaction.create(state, tr.changes, tr.selection, spec.effects,
spec.annotations, ...)`: the merged `changes` and `selection` are discarded and
the original transaction's are kept. An extender can add effects and
annotations and nothing else. Realignment is characters, so it must be a
filter.

The filter returns two specs:

```ts
return [transaction, { changes, sequential: true, selection }];
```

Three consequences, each read off `resolveTransaction`/`mergeTransaction` in
the same file:

- **One transaction.** `resolveTransaction` composes the two specs into one
  `Transaction` with one `ChangeSet`. The history field, like every other
  state field, updates against the *filtered* transaction — `Transaction.state`
  is computed after filtering — so the undo stack carries one entry holding
  both the typed character and the realignment. One `C-/` takes both.
- **`sequential: true` is required.** With it, `mergeTransaction` sets
  `changes = a.changes.compose(b.changes)`, so our appended positions are
  offsets into the document *as the author's edit left it*. Without it,
  CodeMirror would map our changes back through the author's own, and our
  offsets — computed from `transaction.newDoc` — would land in the wrong
  places.
- **No infinite loop, by construction, not by flag.** `filterTransaction`
  re-resolves the returned specs with `resolveTransaction(state, specs,
  false)` — the third argument is `filter`, and it is `false`. The
  transaction the filter produces does not run the filters again. No
  re-entry annotation is needed and none is added; the guard is that the
  filter dispatches nothing. What *is* needed, and is separate, is that the
  filter be quiet on an already-aligned table: it computes the new row texts,
  compares them with the existing ones, and returns `transaction` unchanged
  when they are equal, exactly as `fillParagraph` returns early when
  `filled === source`.

### What the filter refuses, and in what order

The predicates run cheapest first. Every one of them returns the transaction
untouched.

0. Alignment is off for the session. One boolean read; see § The off switch.
1. `!transaction.docChanged` — a bare cursor move.
2. `transaction.isUserEvent("undo") || transaction.isUserEvent("redo")`.
   Appending changes to an undo would make the undo write text the author
   never had, and the alignment being undone is the alignment that rode in on
   the transaction being reversed. The history's own inverse is already
   right.
3. The new selection is not one empty cursor. `rectangularSelection` is on
   the surface, so multiple cursors are reachable; a multi-cursor edit inside
   a table has no single cell to anchor to, and refusing is the only
   answer that cannot move a caret the author is watching.
4. `transaction.newDoc.lineAt(head).text` holds no `|`. **This is the cost
   gate.** Almost every keystroke in a chapter is in prose, and this check is
   a string scan of one line. `parseChapter` is called only past it.
5. `parseChapter` does not put a top-level `table` block on the caret's line.
   A table inside a fenced div or behind a `>` prefix is not a top-level
   block and is refused here, deliberately and permanently for this spec.
6. The transaction's changed range does not intersect the table's line span.
   An edit elsewhere that happens to leave the caret in a table realigns
   nothing.
7. The caret is in the delimiter row. Named above: this is what stops the
   table being rewritten under the author's hands on the very keystroke that
   makes it a table, and what lets her type `:---:` a character at a time
   without the row regenerating around her. The alignment she has just
   declared takes effect on her next edit in any other row, which is where
   the criterion asks to see it.
8. The source rows are not uniform. Split each source line of the table on
   unescaped pipes (below); refuse unless every row — header, delimiter and
   body — yields the same cell count. This is the intent's malformed case,
   and it is what happens the instant the author deletes a pipe.
9. Any row of the table does not both begin (after up to three spaces of
   indent) and end with `|`. GFM permits a table whose rows carry no edge
   pipes, and `parseChapter` accepts one; aligning it would mean adding
   pipes, which is neither whitespace nor a delimiter row's dashes and so
   falls outside what cond-2609091733490634 admits. A table written without
   edge pipes is left exactly as typed, and the how-to page says so rather
   than leaving it a silent nothing.

### The off switch

One row in `src/keys.ts`:

```ts
{
  id: "toggle-table-alignment",
  label: "Align tables as I type",
  chords: ["C-c C-t"],
  group: "editing",
  owner: "editor",
}
```

**`C-c C-t` is free, and here is what was checked.** Every `C-c` row in the
table today is `C-c i`, `C-c C-p`, `C-c C-v`, `C-c C-l`, `C-c C-,`,
`C-c C-e`, `C-c C-n`, `C-c p`, `C-c C-f`, `C-c C-b`, `C-c C-u`, `C-c Left`,
`C-c Right`, `C-c Up`, `C-c Down`, `C-c C-s b`, `C-c C-s i`, `C-c l` and
`C-c C-i` — nineteen rows, none of them `C-c C-t`. `C-c C-s` is the
bold/italic prefix and `C-c C-t` does not sit under it, so no leaf is created
under an existing prefix and no prefix is turned into a leaf; the hazard
`iss-2609061510051784` recorded for `C-c C-v` — a chord left unbound behind a
prefix another row already opens — does not arise, because `C-c C-t` is a
complete two-step chord under the `C-c` prefix that nineteen rows already
share. The vendored keymap claims nothing here either: the whole `C-c` space
is Editor's own, and `@replit/codemirror-emacs`'s shipped map contains no
`Ctrl-c` binding at all (zero matches for `Ctrl-c` in
`node_modules/@replit/codemirror-emacs/dist/index.cjs`). `C-c C-t` appears in
no `SUPPRESSED` entry. The existing per-scope uniqueness sweep in
`src/emacs-keys.test.ts` is what keeps this true as rows are added, and it
covers the new row the moment it exists.

The id is added to `APP_COMMAND_IDS` in `src/emacs.ts`, which is the list of
rows whose action lives in the application, so the chord that reaches the
command is the row's and not a second copy. `src/app.ts`'s command map gains
one entry, which flips the flag and announces the result through the existing
`announce`:

```ts
"toggle-table-alignment": () => {
  announce(setTableAlignment(!tableAlignmentOn()) ? "Table alignment on" : "Table alignment off");
},
```

Eleven and twelve characters, no full stop — no modeline message in the
codebase ends in one — and both well inside `MODELINE_BUDGET`.

**The flag is a module-level boolean in `src/tables.ts`, initialised `true`,
with `tableAlignmentOn()` and `setTableAlignment(on)`.** It is process state,
and "session" here means the life of the app process, so process state is what
it should be. The two alternatives are both wrong for one shared reason:

- A `StateField` toggled by a `StateEffect` would reset to its `create` value
  every time `setDocument` runs, because `setDocument` calls
  `view.setState(stateFor(...))` and builds a fresh state. Alignment turned
  off would come back on the moment Alice opened another chapter, which is not
  a session.
- A `Compartment` reconfigured to add or remove the extension has the same
  defect for the same reason — a compartment's contents live in the state that
  `stateFor` rebuilds — and two more besides: a reconfigure is itself a
  transaction dispatched while the author is typing, and it would make one row
  of `editorExtensions()` conditional, so a reader of `src/editor.ts` could no
  longer see the surface's shape by reading the list.

So **off means the filter runs and returns the transaction untouched; the
filter is never torn down or re-added.** It is predicate 0, one boolean read
at the top of a function that already returns early nine other ways, and it
costs less than the cost gate it precedes.

**The toggle never realigns anything.** It is a command in `src/app.ts` that
writes a boolean and a modeline message; it dispatches no transaction against
the document and touches no text. Turning alignment back on therefore leaves
every table exactly as it is until the next edit inside one, which is the
intent's own criterion. This is not a restraint that had to be added — it
falls out of the flag being read by the filter rather than acted on by the
command.

**Every start is on.** The initialiser is `true` and nothing writes the flag
except the command, so a fresh process aligns. Nothing persists it: no
settings read, no settings write, no `document.yaml` key.

### Splitting a source row

One function, `cellsOf(line: string): SourceCell[] | null`, and it is the only
new understanding of Markdown this spec adds. A row is:

- optional indent of up to three spaces;
- a leading `|`;
- cells separated by `|`;
- a trailing `|`.

A `|` preceded by an odd number of backslashes is an escaped pipe and belongs
to the cell, not to the boundary. This is the whole of the GFM rule, and it is
confirmed by the parser this spec reads: `` | `y\|z` | `` comes back as one
cell whose text is `y|z`. Nothing else is special — a pipe inside a code span
is *not* protected in GFM, and this splitter does not protect it either, which
is what keeps it and `parseChapter` agreeing.

Each `SourceCell` records the offsets of its content and of the whitespace run
at each end. Those offsets are the anchors the change set is written against,
so a change is always "the whitespace between this pipe and this text",
never "this whole row".

### Measuring a cell

The width of a cell is the number of **grapheme clusters** in its trimmed
source text, counted with `Intl.Segmenter` — present in Node under Vitest and
in the macOS system WebView, and therefore no dependency
(`new Intl.Segmenter(undefined, { granularity: "grapheme" })`), with
`[...text].length` — code points — as the fallback if it is ever absent.

Being specific about what that gets wrong, because the intent asks for it
(cond-2609091733499546):

- **Right:** ASCII, and Latin text with combining marks. `e` + U+0301 is one
  cluster and draws as one glyph, so a cell holding `é` written either way
  measures the same and the column is exactly true. Counting code points
  would have made the decomposed form one column too wide.
- **Right:** an emoji ZWJ sequence or a flag is one cluster, not five code
  points and not eleven UTF-16 units.
- **Wrong, and accepted:** a character whose drawn advance is two columns —
  CJK, most emoji, fullwidth forms — is one cluster and is measured as one,
  so its column draws one cell narrow for each such character. No width table
  is added to fix this. The text is never altered; only the padding is
  wrong.
- **Wrong, and correct:** a cell holding `**bold**` measures eight, not four,
  because the surface draws eight characters. Editor aligns the source, and
  the source is what is on the screen. Likewise `\|` measures two, because
  two is what is drawn.

This measure lives in one exported function so a test can sweep it and the
how-to page can state it.

### The alignment

Given `n` columns:

- `width[i] = max(3, max over rows of measure(cell i))`. The floor of three
  is the delimiter row's own need: `:-:` and `--:` do not fit in less.
- A **body or header** cell is written as `| ` + content + padding + ` `,
  where the padding sits on the right for `left` and `null`, on the left for
  `right`, and is split with the odd character on the right for `center`. One
  space of gutter on each side of the content, always.
- The **delimiter** cell is regenerated from `align`, not copied: `null` →
  `---…`, `left` → `:--…`, `right` → `…--:`, `center` → `:-…-:`, each filled
  with `-` to `width[i]`, written as `|` + cell + `|` with no gutter spaces,
  which is the conventional GFM shape and keeps the pipes of the rule in the
  same columns as the pipes of the rows.
- The indent of each row is the indent the author wrote for that row, kept.

The delimiter row's run of dashes therefore lengthens and shortens, and dashes
are not whitespace: an author who wrote `|-|-|` gets `|---|---|`. Every marker
she wrote survives — that is the fourth criterion — but the rule she wrote does
not survive character for character. This is inherent, because a delimiter row
*is* the column widths, and `cond-2609091733490634` admits it in as many
words: "the whitespace of every row of that one table, and the dash run of its
delimiter row — `|-|-|` becomes `|---|---|` — preserving every alignment
marker". The alternative the condition's own amendment note rejects — padding
the rule with spaces to width, `| - |` — is legal Markdown that reads as
broken, and is not designed here.

### The change set, and the caret

Changes are emitted per whitespace run, against `transaction.newDoc`, and only
where the run differs. A row whose padding is already right contributes
nothing; a table already aligned contributes nothing at all and the filter
returns the transaction untouched.

The caret is **placed, not mapped**. Before building the changes, the filter
records where the caret is as a triple — the table-relative row index, the
cell index, and the offset in grapheme clusters from the start of that cell's
content. After building them, it computes the position of that same triple in
the realigned document and returns it as `selection` on the appended spec.
`mergeTransaction` with `sequential: true` takes `b.selection` when the
appended spec carries one and maps it through an empty change set, so the
position we write is the position the caret lands on, in final-document
coordinates.

This is deliberate, and it is the reason the criteria about the caret are
provable rather than hoped for. Leaving the caret to `mapPos` would work for
the common case — an insertion at the caret with the default association
leaves the caret before it — and would fail for the case that actually
matters: an author whose caret is parked inside a run of padding that is being
shortened. `mapPos` would send her to the start of the replaced run;
placing the caret sends her to the same offset in the same cell, clamped to
the end of the cell's content when the padding she was sitting in has gone.
She never leaves the cell, and the intent's own falsifier — "if the caret ever
lands in a different cell" — is a thing a test can assert, not a thing to
watch for.

### Refusal cases, one by one

- **A malformed table** — unequal source cell counts, or no delimiter row, or
  a delimiter row of a different width. Nothing is rewritten and nothing is
  announced. The least surprising answer because it is the *only* answer that
  cannot lose text: a refusal writes nothing at all, so a table Editor
  declines to understand is a table Editor cannot damage.
- **A table being broken mid-edit** — the author has just deleted a pipe. If
  she deleted it from the delimiter row, the block ceases to be a table and
  predicate 5 refuses. If she deleted it from a body row, predicate 8
  refuses on unequal cell counts. Either way the table keeps the alignment it
  had, ragged in exactly the one row she is working in, and it squares up
  again on her first keystroke after she puts the pipe back. Nothing flickers
  and nothing is repaired for her.
- **A paste of a whole table.** A paste is an author edit
  (cond-2609091733498918 says "an edit the author made", not "a keystroke"),
  and it goes through the same filter with the same predicates: if the caret
  lands in one well-formed table when the paste is done, that one table
  realigns and no other. The blast radius is the same as a keystroke's — one
  table — even though the paste itself was larger. A paste that lands in
  prose, or that leaves a non-empty selection, realigns nothing.
- **An undo.** Predicate 2. The alignment was part of the transaction being
  reversed, so its inverse is already in the history's own change set;
  appending anything would be writing text the author never typed into an
  operation whose entire promise is that it writes text she did. Undo
  granularity itself is unchanged: CodeMirror's history still groups adjacent
  typing, so one `C-/` may take back several characters and the alignment that
  came with them, exactly as it does today for several characters alone.
- **A redo.** The same, by the same predicate, and for the same reason: the
  alignment is in the change set being replayed.
- **Alignment off.** Predicate 0. Every edit inside every table behaves
  exactly as it does today, with no realignment and no announcement beyond the
  one the toggle itself made.

### Byte fidelity

The rule this design is measured against is `adr-2609092000099546`: the
discipline forbids the serialiser reformatting on its own initiative, and
permits an author's own edit reformatting the construct their caret is in on
three conditions. Both brief clauses now say so —
`05-internals.md` § 2 and `07-intent-map.md` § Disciplines. Taking the three
conditions in the ADR's own order:

**1. The author's own edit is the occasion. No timer, no save, no open, no
background pass.** Met by construction, not by care. The only entry point is
`EditorState.transactionFilter`, which runs on a dispatched transaction and
nothing else. There is no timer, no `setInterval`, no `updateListener` that
dispatches, and no save hook: `documentText(view)` is `state.sliceDoc()` and
writes nothing back. Opening a chapter is `setDocument` in `src/editor.ts`,
which calls `view.setState(stateFor(...))` — a new state is not a transaction,
so the filter cannot see an open at all. A chapter with a ragged table is
therefore loaded ragged and saved ragged, and the intent's seventh criterion
is a property the filter has no mechanism to violate. It is still tested,
because a future change could make opening a chapter dispatch a transaction,
and the test is what would catch it.

**2. The construct the caret is in is the limit.** The rewrite is bounded to
the single block `parseChapter` puts the caret's line in, between its own
`line` and `endLine`. Predicate 6 additionally requires the author's own
change to have landed inside that span, so an edit elsewhere that merely
leaves the caret in a table rewrites nothing. Two tables in one chapter never
move together; no line outside the table's span is touched, ever; and within
the table, no cell's content is altered — not its escapes, not its markup, not
its characters, not their order — and no pipe is added or removed. What does
change is the inter-pipe whitespace of every row and the dash run of the
delimiter row, which is exactly and only what cond-2609091733490634 admits.

**3. One undo undoes it.** Met by the transaction shape, which is the whole
reason the mechanism is a filter and not a second dispatch: the realignment is
composed into the keystroke's own transaction and appears on the history as
one entry. `src/tables.test.ts` › "takes the character and its realignment
back on one undo" and "puts one entry on the history for one keystroke in a
table" are the two tests that hold this, and the intent's own second Mechanism
expectation is falsified if either fails.

Nothing in the off switch touches any of the three: it can only make the
filter do less.

### Wrapping: dropped, with the reason

The intent's third Mechanism expectation was that a cell's text could wrap
across a drawn line without the source gaining line breaks, and it named its
own falsifier: "falsifiable if wrapping a long cell turns out to require
breaking the row in the file, in which case wrapping is out of scope and the
cell simply runs wide." **That expectation is falsified**, and this spec
records it as falsified rather than unmet. The eighth Acceptance Criterion is
recorded as dropped with the reason below.

What was investigated:

- `EditorView.lineWrapping` is already on the surface. An over-wide table row
  therefore already wraps rather than scrolling the page sideways, so the
  discipline the criterion was really protecting — legible at 390 CSS pixels,
  no horizontal scrolling — holds today and holds after this change. What it
  does not do is keep the wrapped remainder inside its column: the
  continuation runs the full width under the whole row, and the other
  columns' pipes are not maintained down it.
- A `Decoration.line` can set CSS on a line, and a hanging indent
  (`text-indent` negative, `padding-left` positive) can make every
  continuation of one line start at a chosen x-offset. In a monospace font
  after alignment, a column's boundary *is* at a fixed character offset, so
  this can indent the continuation to one column. It cannot indent it to a
  different column per wrap, and a row has only one line to hang. It works
  only when the overflowing column is the last one, which is a special case
  dressed up as a feature.
- Wrapping a *middle* column means the following columns' pipes must be
  pushed down with it. That is a table layout: each cell has to become its
  own box. In CodeMirror that means replacing the row's text with widget
  decorations, at which point the characters drawn are no longer the
  characters in the file at the offsets the caret uses, and `coordsAtPos`,
  selection drawing and `C-f`/`C-b` all need bespoke implementations. It is
  also the exact thing the intent refused when it refused a view-only
  alignment: the file would stop being the thing on the screen.

So wrapping within a column cannot be had from a decoration, and having it
from a widget would cost the premise the whole intent exists to defend. An
over-wide cell runs wide, wraps as a line, and the page does not scroll
sideways. The how-to page says so, so an author who meets a long cell knows it
is a decision rather than a bug.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| Caret in a cell; a typed character makes that cell wider than its column; every row realigns and the caret is still in the same cell immediately after the character | `src/tables.test.ts` › "widens every row when a cell grows past its column"; `src/tables.test.ts` › "leaves the caret immediately after the character that widened the cell". jsdom cannot deliver a real keydown through the browser's own input path, so the test dispatches the transaction CodeMirror's input handler produces (`userEvent: "input.type"`), which is the shape this design turns on; the real keyboard is M39-1 |
| Caret in a cell; a typed character makes the cell narrower; the columns narrow and the caret holds its place | `src/tables.test.ts` › "narrows every column when the widest cell shrinks"; `src/tables.test.ts` › "holds the caret in its cell when the padding around it is taken away" (the caret parked in trailing padding, which is the case `mapPos` would get wrong) |
| A realignment has happened; `C-/` removes the typed character and the alignment together, leaving the table exactly as it was | `src/tables.test.ts` › "takes the character and its realignment back on one undo"; `src/tables.test.ts` › "puts one entry on the history for one keystroke in a table". The chord itself on a real keyboard is M39-2 |
| A delimiter row carrying `:---:` and `---:`; the centre and right columns pad on the correct side and the markers survive | `src/tables.test.ts` › "pads a centre column on both sides and a right column on the left"; `src/tables.test.ts` › "keeps every alignment marker when it rewrites the rule to the new width" |
| A malformed table; typing in it realigns nothing and rewrites nothing | `src/tables.test.ts` › "leaves a table with unequal cell counts exactly as typed"; `src/tables.test.ts` › "leaves a header row with no delimiter row exactly as typed"; `src/tables.test.ts` › "leaves the table alone on the keystroke that deletes a pipe from a row"; `src/tables.test.ts` › "leaves a table whose rows carry no edge pipes exactly as typed" |
| Text outside any table; typing realigns nothing | `src/tables.test.ts` › "rewrites nothing when the edit is in prose"; `src/tables.test.ts` › "rewrites nothing when the edited line holds a pipe inside a fenced code block"; `src/tables.test.ts` › "leaves a table inside a fenced div exactly as typed"; `src/tables.test.ts` › "leaves a table inside a blockquote exactly as typed"; `src/tables.test.ts` › "does not parse the chapter when the edited line holds no pipe" (the cost gate, asserted by counting parses through a spy) |
| A chapter with a ragged table, opened and saved with nothing typed, is byte for byte what it was | `src/emacs-keys.test.ts` › "opens a hazardous chapter and saves it byte for byte", with a ragged table and a `\|`-bearing cell added to the `HAZARDOUS` fixture. Structural as well: `setDocument` dispatches no transaction, so the filter never runs on an open |
| A cell longer than the surface is wide wraps within its column, or the criterion is recorded as dropped with its reason | **Dropped.** Reason recorded in Design § Wrapping — with the intent's third Mechanism expectation recorded as falsified — and repeated in the how-to page. What is proven instead is the discipline the criterion was protecting: `src/tables.test.ts` › "wraps an over-wide row rather than widening the line" (the surface carries `EditorView.lineWrapping`), and manual check M39-1 at 390 CSS pixels |
| Alignment on and the caret in a table; the toggle chord is pressed; the modeline says alignment is off and typing in that table realigns nothing | `src/tables.test.ts` › "realigns nothing while alignment is off"; `src/emacs-keys.test.ts` › "announces the mode on every press of C-c C-t" (the chord reaching its command through `APP_COMMAND_IDS` and the message reaching the modeline through the existing `announce`). The chord on a real keyboard is M39-9 |
| Alignment off; the toggle chord is pressed again; the modeline says alignment is on, the toggle itself realigns nothing, and the next edit inside a table realigns it | `src/tables.test.ts` › "realigns nothing when alignment is switched back on, and realigns on the next edit"; `src/emacs-keys.test.ts` › "announces the mode on every press of C-c C-t" |
| Alignment turned off; the app is restarted; alignment is on again | `src/tables.test.ts` › "starts on again when the module is loaded afresh" (`vi.resetModules()` and a dynamic re-import, which is the closest jsdom has to a new process); `src/tables.test.ts` › "writes the switch nowhere but memory" (no settings read, no settings write, no `document.yaml` key). A real quit and relaunch is M39-9, because jsdom has no process to restart |
| Inherits: one source, always; legible on three device classes; reachable by assistive technology | see Disciplines inherited, above. `src/tables.test.ts` › "asks core/parse for the table and never re-derives one" pins the first by asserting that a source whose delimiter row markdown-it rejects is never aligned, whatever a line scan would have said about it |

Manual checks, run with `npm run tauri dev` and recorded as an unticked list
in `.abcd/.work.local/logs/acceptance/spc-2609091733494078.md`:

- **M39-1** — the whole interaction on a real keyboard at 1280, 820 and 390
  CSS pixels: type into a cell and watch the pipes move; confirm the caret
  never leaves the cell and no character is lost at typing speed; confirm an
  over-wide row wraps and the page never scrolls sideways.
- **M39-2** — `C-/` on a real keyboard after a realignment: one press takes
  back the character and the alignment together, and the table is exactly what
  it was.
- **M39-3** — cost, on a real chapter: with a large chapter open (one of the
  documents under `examples/` or `EDITOR_LOCAL_DOCUMENTS`), hold a key down
  inside a table and confirm typing does not lag; then hold a key down in
  prose and confirm it is indistinguishable from the same chapter before this
  change.
- **M39-4** — VoiceOver: with the screen reader on, type inside a table and
  confirm the realignment is not announced as a second caret move or a
  re-read of the line; and that the toggle's modeline message is announced
  once, as every other modeline message is.
- **M39-5** — composition and dead keys: Option-e then `e` inside a cell
  produces `é` and the column measures it as one; an IME committing several
  characters at once realigns once.
- **M39-6** — wide characters: a cell holding CJK text and a cell holding an
  emoji, drawn in the surface's monospace font. Confirm the text is unaltered
  and note by how much the column is out; this is the accepted imperfection
  and the check is that it is imperfect, not broken.
- **M39-7** — paste: copy a ragged table from another application and paste
  it into a chapter. Confirm it lands and realigns once, and that a paste
  into prose realigns nothing.
- **M39-9** — the off switch on the real keyboard, and across a restart:
  `C-c C-t` reaches the page and both steps show in the key log; the modeline
  reads the mode and is legible at 390; alignment off leaves every table alone
  through opening another chapter; and quitting and relaunching the app comes
  back with alignment on.

## Tasks

1. Write `src/tables.ts`: `cellsOf`, the grapheme-cluster `measure`, the
   column widths, the row and delimiter-row writers, the ten refusal
   predicates, the session flag with `tableAlignmentOn` and
   `setTableAlignment`, and the `realign` filter, exported as
   `alignTables(): Extension`.
   Verify: `npx vitest run src/tables.test.ts`.
2. Add `alignTables()` to `editorExtensions()` in `src/editor.ts`, beside
   `outlineExtensions()`, with a comment naming the one thing this extension
   does that no other extension in the list does: write a document change the
   author did not type.
   Verify: `npx vitest run src/tables.test.ts src/emacs-keys.test.ts`.
3. Add the `toggle-table-alignment` row to `src/keys.ts` on `C-c C-t`, in the
   `editing` group, owned by `editor`.
   Verify: `npx vitest run -t "gives no two rows the same chord"`.
4. Add `"toggle-table-alignment"` to `APP_COMMAND_IDS` in `src/emacs.ts`, and
   the matching entry to the command map in `src/app.ts` — flip the flag,
   announce `Table alignment on` or `Table alignment off` through the existing
   `announce`.
   Verify: `npx vitest run src/emacs-keys.test.ts -t "C-c C-t"`.
5. Write `src/tables.test.ts`, covering every row of Acceptance Mapping above
   that is not an M-row, including the cost gate, the one-source pin, the two
   nested-table pins, and the three toggle criteria.
   Verify: `npx vitest run src/tables.test.ts`.
6. Widen the `HAZARDOUS` fixture in `src/emacs-keys.test.ts` with a ragged
   pipe table and a cell holding `\|`, correct the longest-line assertion to
   the fixture's new longest line, and add the `C-c C-t` announcement test.
   Verify: `npx vitest run src/emacs-keys.test.ts`.
7. Write `docs/how-to-write-a-table.md` — what Editor aligns, the four cases
   it declines and why, what happens to a wide character, what happens to a
   long cell (it runs wide and wraps; it does not wrap within its column), the
   delimiter row's dashes, and `C-c C-t` with the fact that it lasts for the
   session and not beyond — and add its entry to `docs/README.md`.
   Verify: `npm run lint`.
8. Add row 39 and its entry to `.abcd/development/brief/07-intent-map.md`.
   Verify: read-through; no automated check covers prose intent-map text.
9. Write the manual acceptance checklist and run the full gate list.
   Verify: `npm test && npm run lint && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo fmt --manifest-path src-tauri/Cargo.toml --check`.

## Risks and Open Questions

- **This is the first extension on the surface that writes text the author did
  not type.** `src/outline-commands.ts` says of itself that folding and
  narrowing are decorations over untouched text and therefore carry no
  byte-fidelity risk by construction; `src/prose.ts` says `fillParagraph` is
  the only command that touches more than the characters around the cursor,
  and it is a command, which is to say the author asked for it. This filter is
  neither. `adr-2609092000099546` is what makes it admissible, and its three
  conditions are what a reviewer should hold it to. It is worth a reader of
  `src/editor.ts` noticing, which is why task 2 asks for the comment.
- **`parseChapter` runs once per keystroke inside a table.** The gate in
  predicate 4 means it does not run in prose, which is almost all typing, and
  a table is where an author types slowly. But it is an O(chapter) markdown-it
  parse and it is on the input path, and jsdom cannot tell anyone whether that
  is felt at a real chapter's size. M39-3 is the check. If it is felt, the
  escape is a cache on `Text` identity like `src/outline-commands.ts`'s (which
  will not help, since each keystroke makes a new `Text`) or an incremental
  answer to "what block is line *n* in", which is a change to
  `src/core/parse.ts` and a separate intent, not a patch here. `C-c C-t` is
  also a workaround for a chapter where the cost bites, which is a second
  reason for the chord beyond the one the scope condition gives.
- **The caret in the delimiter row is a refusal, and that is a design choice
  this spec made rather than one the intent settled.** It buys the
  table-under-construction case and the "type `:---:` a character at a time"
  case, and it costs a moment: an alignment marker changed in the delimiter
  row shows its effect on the next edit in another row, not immediately. The
  alternative — realign and anchor the caret to the end of its delimiter cell
  — was rejected as the more surprising of the two, but it is a judgement.
- **`Intl.Segmenter`'s grapheme rules are Unicode's, not the font's.** Two
  characters the segmenter calls one cluster may still draw as two glyphs in
  some fonts, and the surface's font stack is `ui-monospace, SFMono-Regular,
  'SF Mono', Menlo, Consolas, monospace` — five different possible answers.
  The measure is the best one available without a width table and without
  measuring the DOM; M39-6 is where it is looked at rather than assumed.
- **The session flag is module state, which is a thing this codebase has
  little of.** `src/outline-commands.ts` keeps a one-slot parse cache the same
  way, so the shape is not new, but a cache is not a mode: this is the first
  module-level boolean that changes what the editor does. The consequences are
  named rather than hidden — it does not survive a reload of the page in dev
  (`npm run dev` hot-reloads modules), and a test that flips it must put it
  back, which task 5's suite does in an `afterEach`.
- **`C-c C-t` is unclaimed today but is a natural chord for other things.**
  Emacs's own Markdown mode does not bind it, and nothing in Editor's table
  does, but it is short and memorable enough that a future intent will want
  it. Recorded so that the next spec to reach for it finds this one.
