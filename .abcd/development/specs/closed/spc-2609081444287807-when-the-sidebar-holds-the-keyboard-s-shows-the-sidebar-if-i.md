---
id: spc-2609081444287807
slug: when-the-sidebar-holds-the-keyboard-s-shows-the-sidebar-if-i
intent: itd-2609071216221686
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Hide the sidebar from the sidebar

## Summary

This spec delivers map #36, `itd-2609071216221686`: one more row in the
sidebar's own scope, `sidebar-hide` on the bare chord `h`, that closes the
drawer and hands the keyboard back to the editing surface in one press,
regardless of whether the drawer was already open before the keyboard
arrived. It refines map #30 (`itd-2609051921482691`), which built the pane
cycle, the sidebar's keyboard cursor, and the six rows the tree already
answers — next node, previous node, expand, collapse, open, and the quit
that leaves without necessarily hiding. `h` is the seventh. The route back
in needs no new code: `C-x o`, the chord that already gives the tree the
keyboard, already opens a hidden drawer on its way in, because `takeFocus`
opens the drawer first when it finds it closed. A bare `s` binds to
nothing — the maintainer declined it at the planning interview, because
there is no "in the sidebar" for a show-key to mean while the sidebar is
hidden, and in the editing surface `s` is the letter s.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/keys.ts` | exists: 139 rows, `scopeOf`, `chordIndexIn`, six `sidebar` rows | adds one `sidebar` row, `sidebar-hide`, on the bare chord `h` |
| `src/focus.ts` | exists: the pane cycle, `SIDEBAR_IDS` derived from `scopeOf`, `run(id)` | adds one `case` to `run`: hide the drawer unconditionally, then hand the keyboard back through `toEditor()` |
| `src/keyspanel.ts` | exists: `OWNER_NOTES`, a code comment naming the row count | one comment corrected from six to seven; the panel itself reads `BINDINGS` at open time and needs no row-shaped change |
| `src/focus.test.ts` | exists: the cycle, the tree, the drawer, the negative cases | new tests for `h`, and two existing sweeps widened by one exclusion and one expected count |
| `src/emacs-keys.test.ts` | exists: the per-scope uniqueness sweep, the sidebar-scope listing | the sidebar row list gains `sidebar-hide` in position |
| `docs/how-to-find-and-change-the-keys.md` | exists: the paragraph naming how a chord the sidebar answers is reached | one sentence, naming `h` and the existing `C-x o` route into a hidden sidebar |
| `.abcd/development/brief/07-intent-map.md` | exists: 35 rows | row 36 added, with an entry beside #35's own |

### Out

- The pane cycle itself, the sidebar's own movement, expand, collapse, open
  and cancel vocabulary, the rule that focus is single and exclusive, and
  `takeFocus`/`releaseFocus`'s own open-what-I-opened contract: map #30,
  `itd-2609051921482691` (cond-2609081444281939). This spec adds a row
  inside the scope 30 built and reuses `takeFocus`'s existing behaviour of
  opening a closed drawer on the way in; it does not touch either function's
  signature or `sidebar-quit`'s own, narrower, close-only-what-I-opened
  rule.
- `C-x C-b`, `toggle-sidebar`, and its reach from the editing surface
  regardless of which pane holds the keyboard: map #1,
  `itd-2609051335399446` (cond-2609081444280608). Untouched; proven
  unregressed by the existing test named in Acceptance Mapping, below.
- A bare `s` bound to anything, anywhere. The maintainer declined it at the
  planning interview (cond-2609081444283041): with the sidebar hidden there
  is no pane for a show-key to belong to, and `C-x o` already reaches a
  hidden sidebar. No row is added for `s`, and no chord is reserved for it.
- The tablet, where there is no shell to claim `C-x` and so no pane cycle to
  refine, the same boundary map #30 already draws.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| One source, always `itd-2609051336090390` | the drawer's open-or-closed state is `sidebar.open`, the one field `setOpen` writes and `takeFocus`/`releaseFocus`/`sidebar-hide` all read and write through; nothing here keeps a second copy of it |
| Legible on three device classes `itd-2609051336128348` | `src/focus.test.ts` › "hides the drawer with h and hands the keyboard back to the text" and "shows a hidden sidebar again on C-x o, and moves the keyboard into it", over the same two-call open/close mechanism map #30 already proved at width in `M30-1`; manual check M36-1 at 1280, 820 and 390 |
| Reachable by assistive technology `itd-2609061324342715` | structural: the row is announced by the same keys-panel mechanism every other sidebar row already is — a native list item read from `BINDINGS`, with a label and a chord, nothing bespoke added for this one row; not newly proven by a dedicated test, and not newly at risk either, since the mechanism is unchanged |

## Design

### One more row, in the sidebar's own scope

`src/keys.ts` gains one row, placed between `sidebar-open-node` and
`sidebar-quit`:

```ts
{
  id: "sidebar-hide",
  label: "Hide the sidebar",
  chords: ["h"],
  group: "panes",
  owner: "sidebar",
}
```

`h` is free in the sidebar scope: the six existing rows carry `C-n`, `Down`,
`C-p`, `Up`, `C-f`, `Right`, `C-b`, `Left`, `Return`, `C-g`, `Escape`, and
none of those is `h`. It is free in the editor scope too — `chordIndexIn`
carries no bare, unmodified letter as a row, because CodeMirror's own
typing handles those without a table entry — so the per-scope
no-two-rows-one-chord invariant holds without change to `scopeOf` or
`chordIndexIn` themselves.

This is the one sidebar row whose chord is not also carried by an editor
row. Six of the seven — `C-n`, `C-p`, `C-f`, `C-b`, `Return`, `C-g` — are
also `next-line`, `previous-line`, and the like in the text, which is why
the block comment above the sidebar rows in `src/keys.ts` said every chord
there is carried by an editor row as well; that comment is corrected to
name the one exception, `h`, and why it is one: a bare letter is the
editing surface's own text and carries no row there at all.

### Hiding, unconditionally

`src/focus.ts`'s `run(id)` gains one case:

```ts
case "sidebar-hide":
  sidebar.setOpen(false);
  toEditor();
  return;
```

This is deliberately not `sidebar-quit`'s own case, which is only
`toEditor()`. `sidebar-quit`'s exit is narrower on purpose
(`itd-2609051921482691`): `releaseFocus()` closes the drawer only when
`takeFocus()` is the one that opened it, so a sidebar Alice had already
pinned open before reaching for the keyboard stays open when she leaves it
with `C-g`. `h` promises something stronger — "hide the sidebar" — so it
calls `sidebar.setOpen(false)` itself before calling `toEditor()`, closing
the drawer whether or not `takeFocus` is the one that opened it.

The two calls do not fight: `setOpen(false)` is a no-op the second time
`toEditor()` → `releaseFocus()` also tries it (`if (open === next) return;`
in `src/sidebar.ts`), and `releaseFocus()` still clears the
`openedForFocus` flag on its own path either way, so no stale state
survives the round trip. `sidebar.setOpen` and `toEditor` are both existing
calls; this row reuses them exactly as `sidebar-quit` and `toggle-sidebar`
already do, and adds no new call to either module.

`answering()` and `SIDEBAR_IDS` need no edit: both are already derived from
`scopeOf(binding) === "sidebar"` over `BINDINGS`, so the new row reaches the
reader the moment it exists in the table.

### The route back in needed nothing new

`C-x o`'s existing behaviour already satisfies the criterion "shows a
hidden sidebar and moves the keyboard into it": `sidebarTarget.take()` in
`src/focus.ts` calls `sidebar.takeFocus()`, and `takeFocus()` in
`src/sidebar.ts` already opens the drawer first when it finds it closed
(`if (!open) { openedForFocus = true; this.setOpen(true); }`), before
placing the cursor and taking DOM focus. This is `itd-2609051925374395`'s
own build (the drawer opening with the keyboard) and is the one criterion
this spec proves by testing existing behaviour rather than adding to it —
named directly in Acceptance Mapping so the audit does not read its absence
as a gap.

### `C-x C-b` untouched

`toggle-sidebar` is an `editor`-owned row, answered only while the pane is
`"editor"` — through the Emacs handler's own keymap, not through
`src/focus.ts`'s reader — exactly as it was before this spec. Nothing here
changes `owner`, `chords`, or the command it runs in `src/app.ts`. The
existing regression test named in Acceptance Mapping is unmoved by this
change; it is cited here rather than duplicated.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| `h` in the sidebar hides it, focus returns to the editing surface, and the cursor is where she left it with nothing opened and nothing changed | `src/focus.test.ts` › "hides the drawer with h and hands the keyboard back to the text" |
| `h` in the editing text is left to the text, not intercepted by any binding | `src/focus.test.ts` › "leaves h to the text, unclaimed, while the cursor is in the editor" |
| `C-x o` with the sidebar hidden shows it and moves focus in, the same way it already does on a sidebar that was shown | `src/focus.test.ts` › "shows a hidden sidebar again on C-x o, and moves the keyboard into it" (new, over `takeFocus`'s existing behaviour); `src/focus.test.ts` › "opens the drawer with the keyboard and closes it behind Return" (map #30's own test, unmoved, over the same call) |
| `C-x C-b` still toggles the sidebar exactly as before | `src/emacs-keys.test.ts` › "shows and hides the sidebar on C-x C-b" (map #1's own test, unmoved) |
| The keys panel lists the new row under the sidebar's own group, with its label and chord | `src/focus.test.ts` › "lists every row this flow answers in the keys panel" (widened): the `sidebar-hide` row's text contains its label, its chord, and the `sidebar` pane note |
| `h` hides even a sidebar that was already open before the keyboard arrived, unlike `sidebar-quit` | `src/focus.test.ts` › "hides the sidebar with h even when it was already open before focus arrived" |
| At 390 CSS pixels the drawer behaves the same | jsdom proves the mechanism, not the width, exactly as map #30's own build does: `src/focus.test.ts` › "hides the drawer with h and hands the keyboard back to the text" over the two-call open/close path; manual check M36-1 at 1280, 820 and 390 |
| Inherits: one source, always; legible on three device classes; reachable by assistive technology | see Disciplines inherited, above |

Manual checks, run with `npm run tauri dev` and recorded as an unticked
list in `.abcd/.work.local/logs/acceptance/spc-2609081444287807.md`:

- **M36-1** — at 1280, 820 and 390 CSS pixels: give the sidebar the
  keyboard with `C-x o`, press `h`, and confirm the drawer closes and the
  cursor is back in the text; at 820 and 390, where the sidebar is a
  drawer, confirm it slides shut rather than the column narrowing, and that
  nothing scrolls sideways. Then `C-x o` again and confirm the drawer opens
  with the keyboard in it, at each width.
- **M36-2** — with the key log open (`C-x k`), give the sidebar the
  keyboard, press `h`, and confirm the log shows `h` recognised and
  answered; then in the text, press `h` and confirm the log shows it
  recognised but unanswered (or not shown as a chord at all, if the log
  only tracks bindings), and that the letter lands in the chapter.

## Tasks

1. Add the `sidebar-hide` row to `src/keys.ts`, between `sidebar-open-node`
   and `sidebar-quit`, and correct the block comment above the sidebar rows
   to name `h` as the one chord not also carried by an editor row.
   Verify: `npx vitest run -t "gives no two rows the same chord"`.
2. Add the `case "sidebar-hide"` to `run(id)` in `src/focus.ts`: close the
   drawer unconditionally, then call `toEditor()`.
   Verify: `npx vitest run src/focus.test.ts -t "hides the drawer with h"`.
3. Correct the row-count comment in `src/keyspanel.ts` from six to seven.
   Verify: `npx vitest run src/keyspanel.test.ts`.
4. Widen the two existing sweeps in `src/focus.test.ts` and
   `src/emacs-keys.test.ts` that name every sidebar row by id or count, and
   add the new tests for `h`: hides and returns focus; hides even a sidebar
   already open; leaves `h` unclaimed in the text; shows a hidden sidebar
   on `C-x o`; lists the new row in the keys panel.
   Verify: `npx vitest run src/focus.test.ts src/emacs-keys.test.ts`.
5. Add the one sentence to `docs/how-to-find-and-change-the-keys.md`.
   Verify: `npm run lint` (the docs-currency check reads the page).
6. Add row 36 and its entry to `.abcd/development/brief/07-intent-map.md`.
   Verify: read-through; no automated check covers prose intent-map text.
7. Write the manual acceptance checklist and run the full gate list.
   Verify: `npm test && npm run lint && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo fmt --manifest-path src-tauri/Cargo.toml --check`.

## Risks and Open Questions

- **The unconditional hide is a small departure from `sidebar-quit`'s own
  pattern, not an extension of it.** `sidebar-quit` and `sidebar-hide` now
  answer the same question — "leave the sidebar" — two different ways: one
  remembers whether it opened the drawer, the other does not care. That is
  the intent's own claim (`h` "hides", `C-g`/Escape "quits"), not a
  simplification made here; a reader of `src/focus.ts` sees both cases
  side by side, with the comment on `sidebar-hide` pointing at the
  contrast.
- **`M36-2`'s key-log wording is provisional.** Map #30's own `M30-2`
  established the pattern of proving a chord reaches the page on a real
  keyboard through the key log; this spec's manual row assumes the log
  reports an unanswered-but-recognised chord for a plain letter the same
  way it does for others, which is not verified here — a jsdom test cannot
  reach a real keydown's default action, exactly as `src/focus.test.ts`'s
  own file header already says of Return and every other chord that types
  text.
- **No new plumbing.** Every call this spec's `sidebar-hide` case makes —
  `sidebar.setOpen`, `focus.toEditor` — already exists and is already
  exercised elsewhere; this spec's only genuinely new code is the one
  `case` and the one table row.
