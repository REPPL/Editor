---
id: spc-2609061341298538
slug: the-outline-vocabulary-of-emacs-markdown-and-org-modes-headi
intent: itd-2609061318091323
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Move through and reshape the book by heading

## Summary

This spec delivers tier two of the Emacs vocabulary survey
(`.abcd/development/research/notes/2026-09-05-emacs-vocabulary-gap.md`) for
intent 34, `itd-2609061318091323`: the document model as an outline. A new
module, `src/outline-commands.ts`, holds every command as a plain function of
an `EditorView`, in the same shape `src/prose.ts` already proved for tier one
— a refusal string or `null` — plus the CodeMirror extensions folding and
narrowing need. Twenty-one new rows join the binding table; none of the three
incumbent chords the research note flagged as colliding (`C-c C-p` present,
`C-c C-l` publish, `C-x k` the key log) moves, and the new vocabulary is
fitted around them instead. The fourth collision, `M-s` (centre-selection),
is retired: the chord becomes the search prefix `M-s o` carries, and `C-l`'s
own recentre already covers what centre-selection did. Heading movement,
folding, promotion, demotion and moving a section all read and write through
`core/parse.ts`'s one tree, the same source the sidebar's outline already
uses; folding and narrowing never touch the document at all, which is what
lets both hold the round-trip byte-fidelity discipline by construction rather
than by care.

## Scope

In, by module:

| Module | Current state | This spec |
|---|---|---|
| `src/outline-commands.ts` (new) | does not exist | every tier-two command as a function of a view; the `foldService` heading-fold callback; the narrow `StateField`/decorations; `openSwitchChapter` and `openOccur` over `openListOverlay` |
| `src/keys.ts` | 108 rows, one prose vocabulary group | twenty-one new rows in a new `outline` group; the `center-selection` row removed (its chord retired, not relocated) |
| `src/emacs.ts` | `APP_COMMAND_IDS` lists tier-one's rows | eighteen of the twenty-one new ids added (three — switch-chapter, close-chapter, occur — are wired straight from `app.ts` because they need the application's chapter list and dirty state, the same reason `quit` already lives there); `queryReplaceRegex`, alongside the existing `queryReplace` |
| `src/app.ts` | `commands` wires tier-one's rows | the new ids wired the same way tier one's are, plus `close-chapter` (an app-level confirm-then-`forgetChapter` flow mirroring `quit`) and `outline-switch-chapter` (opens `openSwitchChapter` over `app.chapters`/`app.openChapter`) |
| `src/editor.ts` | no fold or narrow extension | `outlineExtensions()` spliced into `editorExtensions()`: `codeFolding()` plus the module's own `foldService` and narrow decoration field |
| `src/style.css` | no fold or narrow rule | the folded-placeholder and `cm-outline-narrowed` line rules |
| Tests: `src/outline-commands.test.ts` (new) | — | every command, the four settled conflicts, and the narrow/fold byte-fidelity guarantee over the hazardous fixture |
| Docs: `docs/how-to-move-through-the-outline.md` (new), `docs/README.md` | one prose how-to page | a new how-to page indexed under How-to guides |

Out, by boundary (`cond-…` ids from the intent):

- The binding table's shape, the keys panel and the cancel contract —
  `itd-2609051335406422` (map 2), `cond-2609061344225339`. This spec adds
  rows and passes under the existing conformance sweep; it defines neither
  the table's shape nor the sweep.
- The `M-x` command palette itself and the seventeen prose commands —
  `itd-2609051934109483` (map 32), `cond-2609061344223634`. This spec's rows
  are listed and run by that palette like every other editor-scope row.
- Reaching the sidebar tree from the keyboard and moving within it —
  `itd-2609051921482691` (map 30), `cond-2609061344229975`. Switch-chapter
  and the chapter list open and select a chapter from the text; neither
  moves focus into the tree.
- The sidebar tree, its badges, and opening a chapter at a heading by
  pointing at it — `itd-2609051335399446` (map 1), `cond-2609061344220963`.
- Which chords, if any, a reading view answers — `itd-2609051402083398`
  (map 26), `cond-2609061344221674`.
- True narrow-to-region, restricting the cursor and every command to inside
  the section — `cond-2609061344223793`. This spec's narrow hides other
  lines from the window only; the document, the cursor, and every command
  still reach the whole chapter.
- Org's exact three-state overview/contents/all-levels cycle —
  `cond-2609061344224051`. `S-Tab` here is two states: every outermost
  heading folded, or everything open.
- Rebinding any chord, or an alternative binding set —
  `cond-2609061344223035`.
- A Setext (underlined) heading — refused, not rewritten, by promote,
  demote, fold and narrow alike, for the reason `fillParagraph` already
  refuses a construct the tree cannot safely rewrite: the tree records no
  second line to keep in step with the first.

Disciplines inherited, and how each is proven here:

- **Round-trip byte-fidelity** (`itd-2609051336074533`): promote, demote and
  move replace only the exact line ranges of the affected heading(s) or
  section(s), computed from the original, unmutated state before any
  dispatch; fold and narrow never call `view.dispatch` with a document
  change at all, only with effects a decoration field reads, so
  `documentText(view)` is provably identical whether or not either is
  active.
- **No machine in the document** (`itd-2609051336080960`): no command here
  writes a path, a name, a date, or any fact about the machine; fold and
  narrow state live in the CodeMirror view, not in `document.yaml`.
- **One source, always** (`itd-2609051336090390`): every heading-aware
  command parses through `core/parse.ts`'s `parseChapter`, the same tree
  `core/outline.ts` derives the sidebar from; the `foldService` callback
  reads that tree rather than CodeMirror's own Markdown grammar, so the
  outline the sidebar shows and the sections this spec folds, promotes, and
  narrows to can never disagree about what a heading is.
- **Degrade gracefully in a plain tool** (`itd-2609051336110536`): every
  edit this spec makes — promote/demote's `#` runs, a moved section's lines,
  a bold or italic marker, a link or image template — is plain Markdown a
  reader with no extensions renders correctly; fold and narrow write nothing
  to the file at all.
- **Legible on three device classes** (`itd-2609051336128348`): the
  switch-chapter and occur overlays reuse `openListOverlay`, already proven
  at 390 CSS pixels by the command palette; no new modeline message exceeds
  `MODELINE_BUDGET`.
- **Network only on publish** (`itd-2609051336158553`): nothing here reaches
  the network.

## Design

### The rows

Twenty-one rows, `owner: "editor"`, in a new `outline` group of
`BINDING_GROUPS` (inserted after `editing`, before `mark`, so the keys panel
shows the outline vocabulary beside the commands it is closest in spirit to).

| id | label | chords |
|---|---|---|
| `outline-next-heading` | Next heading | `C-c C-n` |
| `outline-previous-heading` | Previous heading | `C-c p` |
| `outline-forward-same-level` | Next heading at this level | `C-c C-f` |
| `outline-backward-same-level` | Previous heading at this level | `C-c C-b` |
| `outline-up-heading` | Up to the parent heading | `C-c C-u` |
| `outline-toggle-fold` | Fold or unfold this section | `Tab` |
| `outline-cycle` | Cycle the whole outline | `S-Tab` |
| `outline-promote` | Promote the heading | `C-c Left` |
| `outline-demote` | Demote the heading | `C-c Right` |
| `outline-move-up` | Move the section up | `C-c Up` |
| `outline-move-down` | Move the section down | `C-c Down` |
| `outline-bold-region` | Bold | `C-c C-s b` |
| `outline-italic-region` | Italic | `C-c C-s i` |
| `outline-insert-link` | Insert a link | `C-c l` |
| `outline-insert-image` | Insert an image | `C-c C-i` |
| `outline-switch-chapter` | Switch chapter by name | `C-x b` |
| `outline-close-chapter` | Close the chapter | `C-x C-k` |
| `outline-narrow` | Narrow to this section | `C-x n n` |
| `outline-widen` | Widen | `C-x n w` |
| `outline-occur` | Occur: find in the document | `M-s o` |
| `query-replace-regex` | Replace with a regular expression | `C-M-S-5` |

`center-selection` (`M-s`, `owner: "keymap"`) is removed outright: it names
no doc, no other test, and no other module (a repo-wide search finds it
nowhere but its own row), so retiring it costs nothing a maintainer would
notice, and `C-l`'s own `recenter` already puts the cursor's line at the
centre of the view. Binding `outline-occur` on the two-step chord `M-s o`
is enough on its own to convert `M-s` into a prefix: `EmacsHandler.bindKey`
(see `node_modules/@replit/codemirror-emacs/dist/index.js`) stores a `"null"`
marker at every non-final step of a chain it is given, overwriting whatever
single-key command `M-s` carried before. No suppression entry is needed or
correct here — `M-s` is not silenced, it becomes a prefix with a real
binding one step further in, exactly as `C-x` already is.

`present` (`C-c C-p`), `publish-open` (`C-c C-l`) and `toggle-key-log`
(`C-x k`) are **not edited**: their rows, chords, owners and wiring in
`main.ts`, `publish-panel.ts` and `app.ts` are untouched, and the existing
test `emacs-keys.test.ts` — "reserves the chords other specs will wire, and
answers none of them" — continues to assert their chords unchanged. The
outline vocabulary's previous-heading, insert-link and close-chapter take
`C-c p`, `C-c l` and `C-x C-k` instead, following the `C-c i` / `C-c C-i`
precedent this table already sets (a plain-letter second step is Editor's
own family, distinct from the Control-held second step Markdown mode itself
would use).

### `src/outline-commands.ts`

**Heading context.** `orderedHeadings(chapter)` walks `walkBlocks(chapter.
blocks)` (the same walk `core/outline.ts` uses, so a heading inside a fenced
div counts here exactly as it counts there) and collects every `heading`
block's line and level, in document order. `context(view)` parses the view's
text once (cached in a single-slot module cache keyed on `state.doc`, the
same shape `text-scale.ts` and `prose.ts` already use for view-keyed state)
and returns the headings plus the index of the *current* heading — the last
one at or before the cursor's line — or `-1` with the cursor before every
heading. `subtreeEndLine(headings, index, totalLines)` returns the last line
belonging to a heading's subtree: the line before the next heading whose
level is less than or equal to its own, or the document's last line with no
such heading.

**Movement.** `nextHeading`/`previousHeading` look forward/backward from the
cursor's line through every heading regardless of level, matching Markdown
mode's own `C-c C-n`/`C-c C-p`. `forwardSameLevelHeading`/
`backwardSameLevelHeading` scan from the current heading for the next/
previous heading at exactly its level, refusing the moment a shallower
heading is crossed first — that is what makes the result a sibling rather
than a heading in a different parent's subtree. `upHeading` scans backward
from the current heading for the first shallower one. Movement is `revealLine`
from `src/editor.ts`, already proven to change no byte.

**Folding.** `headingFoldRange(state, lineStart)` is a `@codemirror/language`
`foldService` callback: it finds the heading, if any, starting at that line,
and returns `{from: end of the heading's own line, to: end of its subtree}`,
or `null` with nothing to fold. Registering it — `foldService.of(
headingFoldRange)` alongside `codeFolding()` — is most of folding:
`toggleFold` (fold or unfold at the cursor) answers `Tab` directly.
`cycleOutline` answers `S-Tab`: `unfoldAll` when anything is folded, otherwise
one `foldEffect` per level-two heading (the outline's own top level,
`core/outline.ts`'s `FIRST_LEVEL`) rather than `foldAll`'s walk from position
zero — a chapter's level-one title has no shallower heading to stop its own
subtree at, so `foldAll` would fold everything below the title on the first
press, which is a heavier default than "every outermost heading" asks for.
Every fold dispatched either way is the same `foldEffect` `codeFolding()`
stores and `unfoldAll` clears, so the decoration and its mapping through
edits are CodeMirror's own; only the choice of which headings to fold on a
cycle is this spec's.

**Promote and demote.** `shiftHeadingLevel(view, delta, limitMessage)` finds
the current heading, collects it and every following heading deeper than it
(its subtree, by the same rule `subtreeEndLine` uses), and for each: reads
the heading's own line text, matches it against `/^( {0,3})(#{1,6})(\s.*)?$/`,
and refuses the whole operation — no line is touched — the moment a match
fails (a Setext heading) or the shifted level would leave the range `1..6`.
Only once every affected line is validated does one `view.dispatch` replace
every affected line's own span with its indent and the shifted `#` run, so
the operation is one undo step and either wholly applies or wholly refuses.

**Moving a section.** `moveHeadingBy(view, direction)` finds the current
heading's nearest same-level sibling in the given direction, using the same
"stop at a shallower heading" rule as same-level movement — which is also
what guarantees the sibling's own subtree ends exactly where the current
section begins (or vice versa for moving down), so the two sections are
always contiguous. The two sections' texts are read with `doc.sliceString`
and swapped with two non-overlapping changes in one transaction; nothing
outside their combined span is touched.

**Region markup and inserts.** `boldRegion`/`italicRegion` wrap a non-empty
selection in `**…**`/`*…*` and leave the cursor after it; with no selection
they insert an empty pair and put the cursor between the markers.
`insertLink`/`insertImage` insert `[label]()`/`![label]()`, taking a non-empty
selection as the label and placing the cursor between the parentheses, or,
with no selection, inserting `[]()`/`![]()` with the cursor between the
square brackets.

**Switch chapter and occur.** `openSwitchChapter(chapters, onChoose, hooks)`
and `openOccur(view, hooks)` are both `openListOverlay` callers — the same
overlay the command palette and quit confirmation already open — so movement,
filtering and cancellation are the one contract, not a second copy of it.
`openSwitchChapter`'s entries are `{id: chapter.path, label: chapter.title}`,
filtered by a case-insensitive substring match on the label; choosing one
calls `onChoose(path)`, which `src/app.ts` wires to `app.openChapter`.
`openOccur`'s entries are built from the document's own lines, filtered the
same way, offered only once something is typed — occur with an empty query
would list the whole chapter, which is not "keep it small" — and choosing one
calls `revealLine`. Neither ever calls `view.dispatch` with a document
change: occur only ever reads.

**Narrowing.** A dedicated `StateField<{from, to} | null>`, set by one
`StateEffect` and mapped through edits with `changes.mapPos`, holds the
narrowed range; a second `StateField<DecorationSet>` derived from it adds a
line decoration with the class `cm-outline-narrowed` (`display: none` in
`style.css`) to every line outside the range. `narrowToSection` computes the
range from the current heading through its subtree and dispatches the
effect; `widenSection` dispatches it with `null`. Because the decoration is
the only thing either touches, `documentText(view)` — what every save reads —
is unaffected in either state: narrowing cannot produce a truncated write
because nothing about the model is ever narrowed, only what is drawn. This is
the intent's own falsification target, so `outline-commands.test.ts` proves
it directly: narrow, then save the hazardous fixture `emacs-keys.test.ts`
already uses for "opens a hazardous chapter and saves it byte for byte", and
assert the written text is unchanged.

**`query-replace-regex`.** Lives beside the existing `queryReplace` in
`src/emacs.ts`: opens the search panel, dispatches `setSearchQuery.of(new
SearchQuery({...getSearchQuery(view.state), regexp: true}))`, and focuses the
replace field — the same steps `queryReplace` already takes, with the
regular-expression option forced on rather than left as the panel's default.

### `close-chapter` and `switch-chapter` in `src/app.ts`

`close-chapter` mirrors `quit`'s shape exactly: with nothing unsaved it calls
`forgetChapter()` (already used to return to the welcome text when a tree is
replaced) and announces what closed; with unsaved edits it opens the same
kind of two-row confirm overlay `quit` opens, and `C-g` or Escape return
Alice to the text with her edits intact. `outline-switch-chapter` calls
`openSwitchChapter(app.chapters, (path) => { const chapter = app.chapters.
find((c) => c.path === path); if (chapter) void app.openChapter(chapter); },
{host: overlayHost})`.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| AC1 — twenty-one new actions in the keys panel, no chord claimed twice | `src/outline-commands.test.ts` "lists every outline command in the binding table with a label and a chord"; existing `emacs-keys.test.ts` "gives no two rows the same chord" |
| AC2 — next/previous/same-level/up-heading move the cursor and change no byte; refuse at the ends | `src/outline-commands.test.ts` "moves to the next and previous heading regardless of level"; "moves to the next and previous heading at the same level, refusing across a shallower one"; "moves up to the parent heading"; "refuses movement with a message when no heading answers the direction" |
| AC3 — `Tab` folds/unfolds a section without changing the file; `S-Tab` folds/unfolds every outermost heading | `src/outline-commands.test.ts` "folds and unfolds the section under a heading, changing no byte"; "cycles every outermost heading folded and back open" |
| AC4 — `C-c Right`/`C-c Left` shift a heading and its subtree, refuse at the level bound and on a non-# heading | `src/outline-commands.test.ts` "demotes a heading and its subtree together"; "refuses to promote a chapter title past level one, unchanged"; "refuses to promote or demote a Setext heading, unchanged" |
| AC5 — `C-c Down`/`C-c Up` swap adjacent same-level sections, subtree included; refuse with no sibling | `src/outline-commands.test.ts` "moves a section down past its sibling, subtree included"; "refuses to move a section with no sibling at its level" |
| AC6 — bold/italic wrap a selection or open empty markers | `src/outline-commands.test.ts` "wraps a selection in bold and italic markers"; "opens empty markers with the cursor between them when nothing is selected" |
| AC7 — insert-link/insert-image place `[]()`/`![]()`, using a selection as the label | `src/outline-commands.test.ts` "inserts a link and an image template, using the selection as the label" |
| AC8 — switch chapter by name opens, filters and opens a chapter; `C-g` changes nothing | `src/outline-commands.test.ts` "filters chapters by name and calls back with the chosen path"; app-level: `src/emacs-keys.test.ts` or `src/app.test.ts`, whichever already exercises chapter switching — "opens the switch-chapter list on C-x b and opens the chosen chapter" |
| AC9 — close-chapter asks when dirty, `C-g` keeps the edits; closes silently when clean | app-level test mirroring the existing "asks before C-x C-c quits and keeps the edits on C-g" |
| AC10 — narrow hides other lines; widen restores them; both leave `documentText` and a save byte-identical, proven on the hazardous fixture | `src/outline-commands.test.ts` "narrows to a section and widens, hiding and restoring lines without changing the document"; "never truncates a save while narrowed, over the hazardous chapter" |
| AC11 — occur lists matching lines, opening one moves the cursor; cancelling changes nothing | `src/outline-commands.test.ts` "finds matching lines with occur and moves the cursor to the chosen one" |
| AC12 — `C-M-%` opens the panel's replace field with regexp on | `src/outline-commands.test.ts` "opens the search panel's replace field with the regular-expression option already on" |
| AC13 — the four conflicts: incumbents unchanged, new vocabulary on its own chords, `M-s` a prefix, no chord claimed twice | `src/outline-commands.test.ts` "settles the four chord conflicts without moving present, publish or the key log"; existing `emacs-keys.test.ts` "reserves the chords other specs will wire, and answers none of them" (unedited, still passing) |
| AC14 — inherits the six disciplines | Byte-fidelity: AC2–AC5's "changes no byte" assertions plus AC10's fixture test. One source: `src/outline-commands.test.ts` "derives heading structure from the same parse the sidebar's outline uses" (a fixture with a heading inside a fenced div, checked against `core/outline.ts`'s own `outlineOf`). Degrade gracefully: every inserted or rewritten line is plain Markdown, asserted by parsing the result again. Legibility and network: inherited by construction — no new modeline message and no request either. |

## Tasks

1. Add `orderedHeadings`, `context`, `subtreeEndLine` and the movement
   commands to `src/outline-commands.ts`. Verify:
   `npx vitest run src/outline-commands.test.ts -t "heading"`.
2. Add `headingFoldRange`, `outlineExtensions()`, `toggleHeadingFold` and
   `cycleOutline`; splice `outlineExtensions()` into `editorExtensions()` in
   `src/editor.ts`. Verify: `npx vitest run src/outline-commands.test.ts -t
   "fold"`.
3. Add `shiftHeadingLevel`, `promoteHeading`, `demoteHeading`,
   `moveHeadingUp`, `moveHeadingDown`. Verify:
   `npx vitest run src/outline-commands.test.ts -t "promot|demot|move"`.
4. Add `boldRegion`, `italicRegion`, `insertLink`, `insertImage`. Verify:
   `npx vitest run src/outline-commands.test.ts -t "bold|italic|link|image"`.
5. Add the narrow `StateField`s and `narrowToSection`/`widenSection`; add the
   `cm-outline-narrowed` rule to `src/style.css`. Verify:
   `npx vitest run src/outline-commands.test.ts -t "narrow"`.
6. Add `openSwitchChapter` and `openOccur`. Verify:
   `npx vitest run src/outline-commands.test.ts -t "switch chapter|occur"`.
7. Add `queryReplaceRegex` to `src/emacs.ts`. Verify:
   `npx vitest run src/outline-commands.test.ts -t "regular-expression"`.
8. Add the twenty-one rows and the `outline` group to `src/keys.ts`; remove
   `center-selection`. Verify: `npx vitest run src/emacs-keys.test.ts`.
9. Add the ids to `APP_COMMAND_IDS` in `src/emacs.ts`; wire the rows,
   `close-chapter` and `outline-switch-chapter` in `src/app.ts`. Verify:
   `npm test`.
10. Write `docs/how-to-move-through-the-outline.md`; index it in
    `docs/README.md`. Write the manual checklist to
    `.abcd/.work.local/logs/acceptance/`, and the decision lines to
    `.abcd/work/DECISIONS.md`. Verify: `npm run lint`.
11. Run the six commands in `AGENTS.md`.

## Risks and Open Questions

- **Departure from an earlier draft of this spec**: `S-Tab` was first
  designed as `foldAll`/`unfoldAll` directly, and an early read of that
  design found it would fold a chapter's entire body under its level-one
  title on the very first press, since `foldAll` walks from position zero
  and `subtreeEndLine` does not special-case level one as the chapter's own
  title rather than a genuine ancestor. `cycleOutline` was built instead to
  fold each level-two heading in turn — the outline's own top level — using
  the same `foldEffect`/`unfoldAll` machinery, so "every outermost heading"
  means the sections a chapter's title sits above, not the title itself.
  Recorded in `.abcd/work/DECISIONS.md`. A chapter with no level-two heading
  at all (every section written one level deeper) finds nothing to fold,
  which is a real limit of this choice.
- Narrowing here is a visual aid, not a restriction: the cursor, `M-x`,
  search, and every other command still reach the whole chapter while
  narrowed. `cond-boundary-narrow` records this as deliberate; the risk is
  that Alice expects Emacs's stronger guarantee and is surprised the first
  time a command reaches past what she can see.
- `M-s` becoming a prefix through `EmacsHandler.bindKey`'s own chain
  machinery, rather than through a suppression entry, is asserted rather
  than covered by an existing test of that mechanism; `outline-commands.
  test.ts` exercises it directly by pressing `M-s` alone and asserting
  nothing happens, then `M-s o` and asserting occur opens.
- `promoteHeading`/`demoteHeading`/`moveHeadingBy` all assume ATX headings;
  a Setext heading refuses cleanly, but a chapter that mixes the two styles
  is not exercised beyond that refusal.
- The switch-chapter and close-chapter acceptance rows are proven at the
  application level rather than purely in `outline-commands.test.ts`,
  because both need `app.chapters`/`app.openChapter` and the dirty-state
  confirm flow; if `app.test.ts` does not already exist as a home for such
  tests, they land in `src/emacs-keys.test.ts` beside the existing
  `C-x C-c` tests, which already exercise the same confirm-overlay shape.
