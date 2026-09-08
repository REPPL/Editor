---
id: itd-2609071216221686
slug: when-the-sidebar-holds-the-keyboard-s-shows-the-sidebar-if-i
spec_id: spc-2609081444287807
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Hide the sidebar from the sidebar

## Press Release

Alice has jumped to the sidebar with `C-x o` to find a section three
chapters back. `C-n` walks her down the tree, she reads the titles as she
goes, and she finds the one she wants without opening it — she already
knows where it is, she just wanted to check. She presses `h`. The tree
folds out of the way and her cursor is back in the text, exactly where she
left it, with nothing opened and nothing typed. A page later she wants the
tree again: `C-x o`, the same chord she has pressed to change window for
twenty years, brings the sidebar back and puts her straight into it.

## Why This Matters

Today the sidebar's own vocabulary — `C-n`, `C-p`, `C-f`, `C-b`, Return,
`C-g` — moves and opens and cancels, but nothing in it closes the drawer
without leaving the pane, and nothing lets Alice put the tree away with the
same hand that opened it. She can look without touching the mouse, but she
cannot tidy up without it: to close the drawer she has to reach past the
keyboard, or back all the way out with `C-g` and lose the sidebar's own
open-or-closed state along with the focus. A single letter that hides the
sidebar and hands the keyboard straight back finishes the moment map #30
started: every ordinary use of the tree, start to finish, on the keys her
hands are already on.

## Mechanism

We expect a bare, unmodified letter to read as a command rather than as
text only while the sidebar holds the keyboard, because focus is single
and exclusive there already: map #30
(`itd-2609051921482691`) built the sidebar's own scope on exactly that
fact, so a chord answered in that scope never collides with the same key
typed in the editing surface. This is falsifiable in the ugliest
direction: if pressing `h` in the sidebar ever inserted the letter
anywhere, or if `h` in the editing surface ever hid the sidebar, the
mechanism would be wrong.

We expect `C-x o` to already reach a hidden sidebar and show it, because
`takeFocus` — the call the pane cycle already makes to give the tree the
keyboard — opens the drawer first when it finds it closed
(`src/sidebar.ts`). The maintainer's settlement follows from this: a route
to a hidden sidebar already exists on the chord that leaves any other
pane, so the only piece missing is the one that folds the drawer away
again from inside it. A bare `s` has nothing to attach to until the
sidebar is reachable at all, which is why the maintainer declined it:
`s` in the editing surface is the letter s, and with the sidebar hidden
there is no "in the sidebar" for `s` to mean show from.

## Scope Conditions

- Population: Alice, the maintainer, editing a document she has open with <!-- cond: cond-2609081444289771 -->
  the sidebar built and its keyboard cursor available — the same
  population map #30 (`itd-2609051921482691`) states.
- Platform: the desktop app — the Tauri 2 shell with the system web view — <!-- cond: cond-2609081444285240 -->
  on macOS, the same platform map #30 depends on for the shell to claim
  `C-x` back from the platform; nothing here changes that dependency.
- The single-letter rule holds only while the sidebar holds the keyboard. <!-- cond: cond-2609081444280811 -->
  In the editing surface `h` is the letter h, exactly as `C-n`, `C-p`,
  `C-f`, `C-b`, Return and `C-g` are already the text's own chords there
  and only the sidebar's chords while the tree has focus.
- A bare `s` is not bound anywhere by this intent. Showing a hidden <!-- cond: cond-2609081444283041 -->
  sidebar is reached only through `C-x o`, the chord that already moves
  the keyboard to the next pane; there is no "in the sidebar" for a
  show-key to mean while the sidebar is hidden, and in the editing
  surface `s` is text.
- Boundary with map #30, *Move between the editor and the sidebar without <!-- cond: cond-2609081444281939 -->
  the mouse* (`itd-2609051921482691`): 30 owns the pane cycle, the tree's
  own movement, expand, collapse, open and cancel vocabulary, and the rule
  that focus is single and exclusive. This intent adds one more row to the
  sidebar's own scope and widens nothing about the cycle itself — `C-x o`
  already opens a closed drawer on its way into the sidebar, from 30's own
  build.
- Boundary with map #1's toggle, `C-x C-b` (*Open a folder and see the <!-- cond: cond-2609081444280608 -->
  book*, `itd-2609051335399446`): that chord keeps showing and hiding the
  sidebar from the editing surface regardless of which pane holds the
  keyboard, and this intent leaves it untouched. `h` is the sidebar's own
  route to the same state, reachable only from inside the pane it hides.

## Acceptance Criteria

- Given focus in the sidebar, when Alice presses `h`, then the sidebar
  hides, focus returns to the editing surface, and the cursor is exactly
  where she left it with nothing opened and nothing changed in the
  chapter.
- Given the cursor in the editing text, when Alice presses `h`, then the
  letter h is inserted at the cursor and the sidebar is untouched.
- Given the sidebar hidden and the cursor in the editing text, when Alice
  presses `C-x o`, then the sidebar shows and focus moves into it, with
  the cursor placed the same way `C-x o` already places it on a sidebar
  that was already shown.
- Given the sidebar shown or hidden, when Alice presses `C-x C-b` from the
  editing surface, then the sidebar toggles exactly as it did before this
  intent.
- Given the keys panel open, when it is read, then the row for `h` is
  listed under the sidebar's own group, with a label and the chord `h`.
- Given the window at 390 CSS pixels, where the sidebar is a drawer rather
  than a column, when Alice runs `C-x o` into the drawer and `h` back out
  of it, then the drawer opens and closes exactly as it does at 1280 and
  820 CSS pixels, nothing scrolls sideways, and no step needs the pointer.
- Inherited: one source, always — the drawer's open-or-closed state is
  read and written in exactly the place it already lives, nowhere
  duplicated for this chord; legible on three device classes — the flow
  above holds at 1280, 820 and 390 CSS pixels; reachable by assistive
  technology — the new row is announced through the same mechanism every
  other sidebar row already is, with nothing bespoke added for it.

## Open Questions

_None recorded yet._

## Audit Notes

<!-- abcd-review: OWED receipt=rcp-14a78a4bbc6f -->
Fidelity review OWED (receipt rcp-14a78a4bbc6f).

## Grounds

- pursued: h in the sidebar hides the drawer and hands the keyboard back to the editor, unconditionally, and C-x o already reaches a hidden sidebar and shows it. Expected wrong if pressing h in the sidebar ever inserted the letter, if h in the editor ever hid the sidebar, or if C-x C-b stopped toggling.
