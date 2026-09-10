---
id: spc-2609091724073619
slug: the-maintainer-settles-two-more-c-x-o-moves-the-keyboard-and
intent: itd-2609091722353838
origin: researcher-authored
production_mode: hand-written
---
# `C-x o` moves the keyboard and never changes what is shown

## Summary

This spec delivers map #38, `itd-2609091722353838`: the pane cycle visits
panes that are shown, changes none of them, and says so when it finds nowhere
to go. Two edits to `src/focus.ts` carry the whole rule. `sidebarTarget`
becomes unavailable while the drawer is not shown, so a hidden tree is not a
pane for the same reason a panel that is not open is not one; and `cycle()`
stops short of the pane it started in and announces through the modeline
rather than calling a return to where the keyboard already is a move.

The second edit is also the fix for `iss-2609081707572166`, the critical bug
the maintainer found in the 0.3.1 app: with no document loaded the tree has no
rows, no panel is open, and the cycle walked back round to the editor and
called it a step, so `C-x o` looked dead. "Nowhere else to go" is one
condition however it arose — no rows, nothing shown, nothing loaded at all —
and it is said in one place.

Showing a hidden sidebar is not this spec's business. `F2`
(`itd-2609091722296239`, `spc-2609091724077315`) is the route to a hidden
tree, and the two land together because they amend the same shipped intent,
map #36 (`itd-2609071216221686`).

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/focus.ts` | exists: `sidebarTarget.available()` as `sidebar.rows().length > 0`, asked by `cycle`, `to`, `reconcile` and `paneOf` alike; `cycle()` walking every place including the one it started in; `FocusHooks` | `PaneTarget` gains `canHold()` beside `available()`; `available()` also requires `sidebar.open` and is asked by `cycle` and `to`; `paneOf` and `reconcile` ask `canHold()`; `cycle()` walks only the other places and announces when none answers; `FocusHooks` gains `announce(text)` |
| `src/app.ts` | exists: `announce()`, the modeline's own message cell | the focus model is built with `announce` as a hook |
| `src/sidebar.ts` | exists: `takeFocus()`, which opens a drawer it finds closed, and `releaseFocus()`, which closes what it opened | that pair deleted with its `openedForFocus` flag, now unreachable; the `open`, `takeFocus`, `adoptFocus` and `releaseFocus` doc comments restated — see Design |
| `src/focus.test.ts` | exists: the cycle, the drawer, the panels | a new group, "a cycle with nowhere to go"; a second, "a tree that is drawn but not shown", pressing at real DOM focus rather than through `press`; four existing drawer tests restated under the new rule |
| `docs/how-to-find-and-change-the-keys.md` | exists: how a chord the sidebar answers is reached | the paragraph that said `C-x o` opens a hidden sidebar is replaced by what the cycle does now, in the same section `F2` is described in |
| `docs/spike-emacs-keys.md` | exists: row 17, the two-reader check | reworded: `C-x C-o` no longer belongs in it, and the hidden-sidebar case is named as the chord working rather than failing |
| `.abcd/development/brief/07-intent-map.md` | exists: 36 rows | row 38, and an amendment sentence on #36's own entry |
| `.abcd/development/intents/shipped/itd-2609071216221686-*.md` | shipped | its third criterion, and the Mechanism paragraph beneath it, amended in place, naming this intent |
| `.abcd/development/intents/shipped/itd-2609051921482691-*.md` | shipped: map #30, five criteria naming `C-x o` | one of the five — the 820-pixel criterion, which says the drawer opens with the keyboard — amended in place; the other four describe the cycle among panes that are shown and survive untouched |
| `.abcd/development/specs/closed/spc-2609051925374395-*.md` | closed: map #30's spec | the two rows citing the drawer tests this change renames, amended in place |

### Out

- What shows and hides the sidebar. `F2` and `C-x C-b` are
  `itd-2609091722296239` and `spc-2609091724077315`
  (cond-2609091724076918). This spec adds no route to a hidden drawer; it
  removes one.
- `C-x C-o`. It answers `open-file-or-folder` (`itd-2609061509393380`, map
  #35) and keeps doing so; it is not restored to the cycle
  (cond-2609091724074053). The maintainer found it dead because they
  reached for it, not because it should cycle.
- `C-c C-o`. Unbound before this spec and unbound after it
  (cond-2609091724076182).
- The tree's own availability rule in kind: a tree with no rows still
  cannot hold a cursor (cond-2609091724071724). What is added is one more
  clause in the one place that question is asked.
- A second announcement channel. The sentence goes through `announce()`,
  the same call every refusal in `src/app.ts` already uses, into the
  modeline's own message cell.
- `PANE_ORDER` itself, and the panel contract. A registered panel cycled
  away from still stays open; an overlay is still cancelled on departure
  (`iss-2609052115254279`).

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| One source, always `itd-2609051336090390` | "may the cycle move here" is asked in `targetFor(pane).available()` and nowhere else — `cycle` and `to`, and through `to` every route that moves the keyboard — so the hidden case is written once rather than tested again at each call site. "Can this pane hold the keyboard at all" is its own question, `canHold()`, asked by `paneOf` and `reconcile` and equally written once: two questions, one source each, rather than one source answering a question it was not asked (`iss-2609091858449023`) |
| Legible on three device classes `itd-2609051336128348` | the rule is about what is shown, not about how wide the window is; `src/focus.test.ts` proves the mechanism and jsdom proves no width; manual check M38-2 at 1280, 820 and 390 |
| Reachable by assistive technology `itd-2609061324342715` | structural: the sentence is written into the modeline's own message cell by the same `announce` every other message uses, so it is announced exactly as "No chapter is open" and "Kept your edits" already are; nothing bespoke is added for it |

## Design

### A hidden tree is not a pane the cycle visits

`src/focus.ts`, `sidebarTarget`:

```ts
canHold: sidebarCanHold,                              // rows().length > 0
available: () => sidebar.open && sidebarCanHold(),
```

`open` is the field `setOpen` writes and `sidebar.open` reads; there is no
second copy of the drawer's state to consult.

The two clauses are two questions, not one asked twice. `canHold()` is
"could the keyboard be in this pane at all" — is it drawn, with something a
cursor can sit on. `available()` is "may the cycle move the keyboard here" —
`canHold()`, and shown. They coincided while a tree's only way of not being a
pane was having no rows; adding "shown" to the one question every route
asked separated them, and the first draft of this spec did not notice. See
Risks.

`cycle` and `to` ask `available()`, so no route that *moves* the keyboard can
reach a tree that is not shown. `paneOf` and `reconcile` ask `canHold()`,
because where the keyboard already is is not somewhere the cycle sent it and
is not the cycle's to overrule.

### `takeFocus` no longer shows the drawer

`sidebar.takeFocus()` used to open a drawer it found closed:

```ts
if (!open) { openedForFocus = true; this.setOpen(true); }
```

Every caller was checked. There is exactly one: `sidebarTarget.take()` in
`src/focus.ts`, reached only through `to(pane)`, which refuses a pane whose
`available()` is false. With the rule above in place, that branch could never
run again from anywhere in the application, and no test reached it either.

It is deleted, with `openedForFocus` and `releaseFocus`'s matching
close-only-what-I-opened branch. Keeping it was considered: it is `Sidebar`'s
published contract ("Take the keyboard: open the drawer, put the cursor
somewhere it can start"), and a published contract is not usually rewritten
from its only caller. But a contract nobody can honour is worse than a
smaller contract: it invites the next reader to call `takeFocus` expecting a
hidden tree to appear, which is precisely the gesture `itd-2609091722353838`
retires, and it leaves a flag that can only ever be false. The two doc
comments now say what is true — `takeFocus` shows nothing and `releaseFocus`
hides nothing — and `sidebar-hide` and `toggle-sidebar` remain the only rows
that change what is shown.

Nothing about the drawer's behaviour changes with the deletion, which is the
rule and not a side effect of it: leaving a pane is not hiding it.

### Saying so

```ts
function cycle(): void {
  const from = PANE_ORDER.indexOf(pane);
  for (let step = 1; step < PANE_ORDER.length; step += 1) {
    const next = PANE_ORDER[(from + step) % PANE_ORDER.length];
    if (next !== undefined && targetFor(next).available()) {
      to(next);
      return;
    }
  }
  hooks.announce("Nowhere else to go");
}
```

Two changes, both small. The loop stops one short of a full turn, so the pane
the keyboard is already in is no longer a candidate: `editorTarget.available()`
is unconditionally true, which is what made the walk terminate on the editor
and report a move that had not happened. And the fall-through says so.

The sentence goes out through `FocusHooks.announce`, which `src/app.ts`
answers with its own `announce` — the function that writes the modeline's
message cell and refreshes it. It is a plain message, not a transient one:
the modeline's message cell already holds "No chapter is open" and "Kept your
edits" until something newer is said, and a refusal that vanished on a timer
would be a second convention.

No wording is invented twice. "Nowhere else to go" is written once, in
`cycle()`, and read back by the tests through the modeline's rendered text.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| Sidebar hidden, cursor in the text, `C-x o` → the keyboard stays in the editing surface, the sidebar stays hidden, and the modeline announces that there is nowhere else to go | `src/focus.test.ts` › "stays in the text and says so when the sidebar is hidden", which also asserts the cursor and the text are untouched |
| No document loaded, so the tree is empty and no panel is open, `C-x o` → the modeline announces rather than the chord doing nothing with no report | `src/focus.test.ts` › "says so with no document loaded at all" — the application mounted with no folder opened, which is the state `iss-2609081707572166` was found in |
| Sidebar shown with rows, cursor in the text, `C-x o` → the keyboard moves into the tree exactly as it does today, with the cursor placed the same way | `src/focus.test.ts` › "moves the keyboard to the sidebar on C-x o and starts on the open chapter" (map #30's own test, unmoved) |
| Sidebar shown and holding the keyboard, `C-x o` → the keyboard moves on and the sidebar stays shown | `src/focus.test.ts` › "leaves the tree shown when the keyboard moves on from it"; and "cycles editor, sidebar, panel, editor in one fixed order" (map #30's own test, unmoved), which walks on through the panel and back |
| A panel open, cycling through it and away → the panel behaves exactly as it does today, including an overlay cancelled on the way out | `src/focus.test.ts` › "cycles editor, sidebar, panel, editor in one fixed order", over all five panels, unmoved |
| Sidebar hidden, `F2` then `C-x o` → the tree is shown and the keyboard is in it: the two chords compose | `src/focus.test.ts` › "finds the tree again once F2 has shown it", which presses `C-x o` first and reads the announcement before `F2`; and "shows a hidden sidebar again on F2, and C-x o then moves the keyboard into it" |
| The announcement is not made while a pane is there to reach | `src/focus.test.ts` › "says nothing about nowhere to go while a pane is there to reach" — the negative case, without which the sweep above proves only that the sentence exists |
| Inherits: one source, always; legible on three device classes; reachable by assistive technology | see Disciplines inherited, above |

Manual checks, run with `npm run tauri dev` and recorded as an unticked list
in `.abcd/.work.local/logs/acceptance/spc-2609091724073619.md`:

- **M38-1** — the bug as found: the app open with no document loaded at all,
  `C-x o` pressed, and the modeline read. This is `iss-2609081707572166`'s
  own reproduction and the one check that closes it on a real window.
- **M38-2** — the whole rule at 1280, 820 and 390 CSS pixels: hidden tree,
  shown tree, panel open.
- **M38-3** — the announcement itself: that it is legible in the modeline
  beside the position and the mark, and that it is replaced by the next
  thing said rather than sticking under it.

## Tasks

1. Split `PaneTarget` into `canHold()` and `available()` in `src/focus.ts`,
   add the `sidebar.open` clause to `sidebarTarget.available()`, and point
   `paneOf` and `reconcile` at `canHold()`; delete `takeFocus`'s
   open-a-closed-drawer branch, `releaseFocus`'s matching close and the
   `openedForFocus` flag from `src/sidebar.ts`, restating the doc comments
   that described them.
   Verify: `npx vitest run src/focus.test.ts -t "nowhere"` and
   `npx vitest run src/focus.test.ts -t "drawn but not shown"`.
2. Stop `cycle()` one short of a full turn and announce the fall-through;
   add `announce` to `FocusHooks` and pass `src/app.ts`'s own.
   Verify: `npx vitest run src/focus.test.ts`.
3. Restate the four existing drawer tests that assumed `C-x o` opens a
   hidden drawer, and add the two new groups — "a cycle with nowhere to go"
   and the regression group "a tree that is drawn but not shown".
   Verify: `npx vitest run src/focus.test.ts`.
4. Amend the third acceptance criterion of `itd-2609071216221686` and the
   Mechanism paragraph beneath it, in place, naming this intent, following
   `iss-2609052143457583`'s pattern.
   Verify: read-through.
5. Update the two doc pages and add row 38 to the intent map.
   Verify: `npm run lint`.
6. Write the manual acceptance checklist and run the full gate list.
   Verify: `npm test && npm run lint && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo fmt --manifest-path src-tauri/Cargo.toml --check`.

## Risks and Open Questions

- **`iss-2609081707572166` is not closed by this spec alone.** It reports
  three chords dead: `C-x o`, `C-x C-o` and `C-c C-o`. This rule answers the
  first. `C-x C-o` opens a file or a folder and is doing its job
  (`itd-2609061509393380`); `C-c C-o` is unbound and stays unbound. The
  issue wants resolving against all three answers, not against this one.
- **The rule's first draft answered a question it was not asked
  (`iss-2609091858449023`).** Adding `sidebar.open` to `available()` was
  correct for `cycle`, `to` and `reconcile` and wrong for `paneOf`: with the
  drawer hidden and the column still drawn above 820 CSS pixels
  (`iss-2609091754178640`), focus arriving on a tree row left `paneOf`
  answering null, the model naming Editor, and `F2`, `C-x C-b`, `C-x o` and
  `h` with no reader at all — `onKeydown` returns early on `editor`, and
  CodeMirror's own listener never fires while `contentDOM` has not got the
  focus. The fix separates the two questions: `canHold()`, which `paneOf` and
  `reconcile` ask, and `available()`, which `cycle` and `to` ask. `reconcile`
  asks `canHold()` deliberately — a pane the cycle would not visit has not
  gone anywhere, and taking the keyboard out of a tree it is genuinely in
  would be the same defect one keystroke later. The regression group in
  `src/focus.test.ts`, "a tree that is drawn but not shown", presses at
  `document.activeElement` rather than through the `press` helper, which
  aims at `app.view.contentDOM` whenever the model says `editor` and so
  cannot see a model that is wrong.
- **The announcement is sticky.** It stays in the modeline's message cell
  until something newer is said, which is the convention every other message
  in `src/app.ts` follows. If the maintainer finds it lingers, the fix is
  `announceBriefly`, which already exists for the type scale — a one-word
  change, deliberately not made pre-emptively.
- **A drawer hidden at more than 820 CSS pixels still shows as a column.**
  `src/style.css` honours `data-open="no"` only below that width, so the
  cycle can now refuse a tree the maintainer can still see. That gap is the
  stylesheet's, not this rule's, and it is recorded in
  `spc-2609091724077315`'s own Risks with a manual check; it is named here
  because it is this spec that makes it visible as a refusal rather than as
  a no-op.
- **`C-x o` is named in three shipped intents' Acceptance Criteria, not
  one.** A literal sweep of the shipped record
  (`../research/notes/2026-09-08-emacs-default-divergences.md`, "The full
  chord sweep, run") found the chord in map #36's ac-3, which this rule
  retires; in five criteria of map #30 (`itd-2609051921482691`), which first
  shipped the cycle; and in one of map #33 (`itd-2609061509393380`). All
  seven were read in full. Four of map #30's five describe the cycle among
  panes that are shown and survive untouched, as does map #33's, which is a
  statement about `C-x C-o` no longer answering the gesture. The fifth —
  map #30's 820-pixel criterion, "then the drawer opens with the keyboard …
  closes on Return and on cancel" — states the retired behaviour directly
  and is amended in place with this change, along with the two rows of its
  closed spec (`spc-2609051925374395`) that cite the two renamed tests.
  Recorded here so a later reader need not run the sweep again.
- **Fourth ways to be empty.** The intent's own falsifier: a way for the
  cycle to find nothing that this sentence does not cover. None is known —
  the three the bug named all reach the same fall-through — and the negative
  test guards the other direction, that the sentence is not said while a
  pane is reachable.
