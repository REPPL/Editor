---
id: spc-2609091724077315
slug: the-maintainer-s-settled-sidebar-rule-the-bare-h-hides-the-s
intent: itd-2609091722296239
origin: researcher-authored
production_mode: hand-written
---
# Show and hide the sidebar from wherever the keyboard is

## Summary

This spec delivers map #37, `itd-2609091722296239`: the `toggle-sidebar` row
gains `F2` as its first chord and is answered by both of the application's key
readers rather than by the editing surface's alone, so one press shows or
hides the tree from the text, from the tree itself, and from an open panel.
`C-x C-b` stays on the row as its second chord — Emacs's own `list-buffers`,
pointed at Editor's chapter list, which is the same tree `C-x b`
(`outline-switch-chapter`) already searches by name.

Nothing new is built. The row already exists; the command behind it already
exists in `src/app.ts`; the second reader already exists in `src/focus.ts`,
where `other-window` is already the row every pane answers. What this spec
adds is one more chord on the row, one more always-answered id in that reader,
and the hook that lets the reader reach the application's own toggle instead
of writing a second one.

`C-c C-s` takes no part in this, and no chord is moved off it: bold
(`C-c C-s b`) and italic (`C-c C-s i`) hold it as a two-step prefix
(`itd-2609061318091323`), and the vendored package resolves a prefix the
instant a multi-step binding sits beneath it, so it can never also be a leaf
(`../research/notes/2026-09-08-emacs-default-divergences.md`, "`C-c C-s` and
`F2`").

It lands with `spc-2609091724073619` (map #38, the `C-x o` rule), because the
two amend the same shipped intent — map #36, `itd-2609071216221686` — and
neither widens the other: this spec owns what shows and hides the sidebar,
that one owns where the keyboard goes.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/keys.ts` | exists: the `toggle-sidebar` row on `C-x C-b`, `owner: "editor"` | the row's chords become `["F2", "C-x C-b"]`, with the comment recording why `F2` is first and why `C-c C-s` is unavailable; the `BindingScope` doc comment names two rows every pane answers rather than one |
| `src/focus.ts` | exists: `CYCLE_ID`, `answering()`, `run(id)`, `FocusHooks` | a second always-answered id, `TOGGLE_ID`; `answering()` offers it in the sidebar and in a panel; one `case` in `run(id)`; `FocusHooks` gains `toggleSidebar()` |
| `src/app.ts` | exists: the `"toggle-sidebar"` entry in the command table, calling `sidebar.toggle()` | that call is named once as `toggleSidebar()`, and both the command table and the focus model's hook reach it |
| `src/focus.test.ts` | exists: the cycle, the tree, the drawer, the negative cases | a new group, "showing and hiding the sidebar from every pane" |
| `src/emacs-keys.test.ts` | exists: the per-scope uniqueness sweep; the `C-x C-b` regression test | the sweep's globally-unique case covers both always-answered rows; the regression test gains its return press, and `F2` gets the same round trip from the text |
| `docs/how-to-find-and-change-the-keys.md` | exists: how a chord the sidebar answers is reached | a section, "Show and hide the sidebar" |
| `docs/how-to-move-through-the-outline.md` | exists: the `C-x b` / `C-x C-b` pair | the sentence naming `C-x C-b` names the chapter list and `F2` beside it |
| `docs/spike-emacs-keys.md` | exists: the desktop checklist | row 16 reworded; row 18 added, for `F2` on a real macOS keyboard |
| `.abcd/development/brief/07-intent-map.md` | exists: 36 rows | row 37, and an amendment sentence on #36's own entry |
| `.abcd/development/intents/shipped/itd-2609071216221686-*.md` | shipped | its fourth criterion amended in place, naming this intent as the one that superseded it |

### Out

- Where the keyboard goes. The pane cycle's rule — that it visits panes that
  are shown, changes none of them, and reports finding nowhere to go — is
  `itd-2609091722353838` and `spc-2609091724073619`
  (cond-2609091724075988). This spec never moves the keyboard except in the
  one case the intent names: hiding the tree while the tree holds it.
- `C-c C-s`, and bold and italic. Not moved, not shared, not made to time
  out into a leaf (cond-2609091724078919). The one test this spec adds for
  it is a negative one: no row anywhere carries `C-c C-s` as a chord of its
  own.
- The sidebar's own `h` (`sidebar-hide`, map #36). Unchanged in chord, in
  scope, and in what it does. `F2` from inside the sidebar reaches the same
  two calls in the same order, through `run(id)`'s own case rather than by
  routing one row into another.
- A show-only variant of the command, so that a second `C-x C-b` refreshes
  rather than hides. Declined: the divergence from Emacs's `list-buffers` is
  named and accepted (cond-2609091724071963), and a second command is the
  cost the research note weighed and rejected.
- `F1`, the keys panel's third chord. Named in the same research note, not
  asked for by this intent, and not added here.
- The drawer's own CSS. See **Risks**, below: at more than 820 CSS pixels
  the sidebar is a column and `data-open="no"` changes nothing on the
  screen. That is the state of the stylesheet before this spec and after it;
  this spec neither relies on it nor repairs it, and records it instead.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| One source, always `itd-2609051336090390` | the drawer's shown-or-hidden state stays `sidebar.open`, written only by `setOpen`; the command that flips it is named once in `src/app.ts` and reached by both chords through both readers, so neither reader carries a toggle of its own |
| Legible on three device classes `itd-2609051336128348` | `src/focus.test.ts` proves the mechanism — the two calls, from three panes — and jsdom proves no width; manual check M37-1 at 1280, 820 and 390 |
| Reachable by assistive technology `itd-2609061324342715` | structural: the row is one row of `BINDINGS`, rendered by the keys panel exactly as every other row is, with its chords in the same `kbd` cells; `src/focus.test.ts` › "lists both of the toggle's chords in the keys panel, and claims no C-c C-s leaf" reads them back off the rendered panel |

## Design

### One chord added, in front of the one already there

`src/keys.ts`:

```ts
{
  id: "toggle-sidebar",
  label: "Show or hide the sidebar",
  chords: ["F2", "C-x C-b"],
  group: "document",
  owner: "editor",
}
```

`F2` is first because it is the chord that always works, and the keys panel
lists chords in the table's order. It is free: no row of `BINDINGS` carries
it, the vendored package's `emacsKeys` has no `f2` entry, and nothing
suppresses it. It survives both readers' notation without a translation
entry — `chordFromEvent` falls through to `event.key`, which is `F2`;
`toPackageChord` finds no `PACKAGE_KEY_NAMES` entry and passes `F2` through;
and the package's own `getKey` leaves a `code` of `F2` alone, since it is
neither one character nor a `Numpad`/`Key` prefix.

`owner` stays `"editor"`. The owner says where a row is implemented, and this
one is still implemented on top of the keymaps rather than by the sidebar;
what changes is that a second reader answers it too, which is exactly the
shape `other-window` already has. `scopeOf` is untouched, so the per-scope
uniqueness invariant holds unchanged.

### A second row every pane answers

`src/focus.ts` names one id today:

```ts
/** The one row every pane answers, because it is how a pane is left. */
const CYCLE_ID = "other-window";
```

It gains a second beside it, `TOGGLE_ID = "toggle-sidebar"`, and both appear
in `answering()`:

```ts
if (pane === "sidebar") return [CYCLE_ID, TOGGLE_ID, ...SIDEBAR_IDS];
if (pane === "panel") return [CYCLE_ID, TOGGLE_ID];
```

Nothing else about the reader changes. The prefix machinery already handles a
multi-step chord — `C-x C-b`'s first step opens a pending prefix in the same
cell `C-x o`'s does — and a single-step chord is matched directly, which is
all `F2` needs. In a panel the reader still answers these two rows and
nothing else, so the panel's own keys and the one cancel contract are
untouched.

### The command stays where it lives

`run(id)` reaches the application rather than the drawer:

```ts
case TOGGLE_ID:
  hooks.toggleSidebar();
  if (pane === "sidebar" && !sidebar.open) toEditor();
  return;
```

`FocusHooks` gains `toggleSidebar()`, and `src/app.ts` gives it the same
function its command table calls:

```ts
function toggleSidebar(): void {
  sidebar.toggle();
}
```

This is the one-source discipline stated as code: `sidebar.toggle()` is
called from one place, and the row's two chords reach it through two readers.
The alternative — `sidebar.setOpen(!sidebar.open)` written again inside
`focus.ts`, the way `sidebar-hide` writes `setOpen(false)` — would be a
second place that decides what the chord means, and the two could drift.

The `toEditor()` beneath it is the `h` promise: hiding the tree while the
tree holds the keyboard leaves the keyboard in a pane that is no longer
there, so it goes back to the text. It is the same call `sidebar-hide` makes,
in the same order, and it is guarded rather than unconditional because `F2`
from the text or from a panel must move nothing.

### What the keys panel says

Nothing in `src/keyspanel.ts` changes: it renders `BINDINGS` at the moment it
opens, so the row lists `F2` and `C-x C-b` in the table's order the first time
it is read.

## Acceptance Mapping

| Criterion (Given/When/Then) | Proven by |
|---|---|
| Sidebar hidden, cursor in the text, `F2` → the sidebar shows, the cursor does not move, nothing is inserted | `src/focus.test.ts` › "shows the sidebar on F2 from the text, moving nothing else" |
| Sidebar shown, cursor in the text, `F2` → the sidebar hides and the cursor stays | `src/focus.test.ts` › "hides the sidebar on F2 from the text, leaving the cursor where it was"; `src/emacs-keys.test.ts` › "shows and hides the sidebar on F2 as well" (the same round trip through the editing surface's own reader) |
| Sidebar shown and holding the keyboard, `F2` → it hides and the keyboard returns to the editing surface, exactly as `h` leaves it | `src/focus.test.ts` › "hides the sidebar on F2 from inside it, and hands the keyboard back", asserted against the same facts as `h`'s own test beside it: the chapter, the text and the cursor's line |
| A panel open and holding the keyboard, `F2` → the drawer's state changes and the panel is untouched | `src/focus.test.ts` › "shows and hides the sidebar on F2 from a panel, leaving the panel alone" (the publish panel: registered, so it survives the keyboard staying in it) |
| Sidebar hidden, `C-x C-b` from the editing surface → it shows | `src/focus.test.ts` › "shows the chapter list on C-x C-b, and hides it on a second press"; `src/emacs-keys.test.ts` › "shows and hides the sidebar on C-x C-b" (map #1's own test, widened by the return press) |
| Sidebar shown, `C-x C-b` → it hides; the one named divergence from `list-buffers` | the same two tests, whose second press is the divergence asserted directly |
| Focus in the sidebar, `h` → hides and hands the keyboard back, unchanged by this intent | `src/focus.test.ts` › "hides the drawer with h and hands the keyboard back to the text" and "hides the sidebar with h even when it was already open before focus arrived" (map #36's own tests, unmoved but for the drawer no longer needing `C-x o` to show it) |
| The keys panel lists both `F2` and `C-x C-b` on the toggle row, and no row claims `C-c C-s` as a leaf | `src/focus.test.ts` › "lists both of the toggle's chords in the keys panel, and claims no C-c C-s leaf": the chords are read back off the rendered detail cell in order, and the sweep over `BINDINGS` for a bare `C-c C-s` chord returns empty while bold and italic keep theirs |
| The chord is reachable from every pane, which is the mechanism's own falsifier | `src/focus.test.ts` › "answers C-x C-b from the tree as well as from the text", and the three `F2` tests above, one per pane |
| No two rows share these chords, in any scope | `src/emacs-keys.test.ts` › "gives no two rows the same chord", whose globally-unique case now sweeps both always-answered rows |
| Inherits: one source, always; legible on three device classes; reachable by assistive technology | see Disciplines inherited, above |

Manual checks, run with `npm run tauri dev` and recorded as an unticked list
in `.abcd/.work.local/logs/acceptance/spc-2609091724077315.md`:

- **M37-1** — `F2` from each of the three panes, at 1280, 820 and 390 CSS
  pixels: from the text, from inside the tree, and with the keys panel open.
- **M37-2** — with the key log open (`C-x k`), `F2` and `C-x C-b` each
  pressed twice, so the log shows both recognised and answered; this is also
  the check that macOS has not claimed `F2` for the display, which no test
  in jsdom can reach.
- **M37-3** — the drawer at more than 820 CSS pixels: whether hiding it
  hides anything on the screen. See **Risks**, below.

## Tasks

1. Add `F2` to the `toggle-sidebar` row in `src/keys.ts`, in front of
   `C-x C-b`, with the comment recording why; correct the `BindingScope` doc
   comment to name two always-answered rows.
   Verify: `npx vitest run -t "gives no two rows the same chord"`.
2. Add `TOGGLE_ID` to `src/focus.ts`, offer it from `answering()` in the
   sidebar and in a panel, add the `case` to `run(id)`, and add
   `toggleSidebar()` to `FocusHooks`.
   Verify: `npx vitest run src/focus.test.ts`.
3. Name the toggle once in `src/app.ts` and reach it from both the command
   table and the focus model's hook.
   Verify: `npx vitest run src/emacs-keys.test.ts src/document.test.ts`.
4. Add the new tests to `src/focus.test.ts`, and widen the two sweeps in
   `src/emacs-keys.test.ts`.
   Verify: `npx vitest run src/focus.test.ts src/emacs-keys.test.ts`.
5. Amend the fourth acceptance criterion of `itd-2609071216221686` in place,
   naming this intent, following `iss-2609052143457583`'s pattern.
   Verify: read-through.
6. Update the three doc pages and add row 37 to the intent map.
   Verify: `npm run lint` (the docs-currency check reads the pages).
7. Write the manual acceptance checklist and run the full gate list.
   Verify: `npm test && npm run lint && npm run build && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo fmt --manifest-path src-tauri/Cargo.toml --check`.

## Risks and Open Questions

- **Above 820 CSS pixels, hiding the drawer hides nothing on the screen.**
  `src/style.css` gives `.sidebar[data-open="no"] { display: none }` only
  inside `@media (max-width: 820px)`; at a wider window the sidebar is a
  column and the attribute has no visual effect. This is the stylesheet as
  it stands before this change — map #36's `h` has the same gap — and this
  spec deliberately does not repair it, because making the column disappear
  at every width is a layout decision for the maintainer rather than a
  consequence of adding a chord. It is the one place where "the tree folds
  away" in the press release may not be what a desktop window shows, so it
  is a manual check (M37-3) and a candidate for the issue ledger rather than
  a silent assumption.
- **The platform may hold `F2`.** A function key is answerable by both
  readers precisely because it is not a character, and on macOS the same
  fact means the system may claim it for the display before the web view
  sees it. Nothing in jsdom can tell; M37-2 is what tells.
- **A second `C-x C-b` hides, where Emacs's own refreshes.** Named and
  accepted (cond-2609091724071963). It is falsifiable by the maintainer
  finding the close surprising rather than harmless, in which case the
  answer is a distinct show-only command and the claim was wrong.
- **`h` and `F2` now answer the same question from inside the sidebar.**
  Both hide the drawer and hand the keyboard back, by the same two calls.
  That is the intent's own shape — `h` is the tree's own row, `F2` is the
  chord that works from anywhere — not a duplication introduced here; a
  reader of `run(id)` sees the two cases side by side, and the comment on
  the toggle case points at the contrast.
