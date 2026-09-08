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

<!-- abcd-review: INGESTED receipt=rcp-14a78a4bbc6f -->
Fidelity review — receipt rcp-14a78a4bbc6f (verifier abcd:intent-auditor claude-sonnet-5).

Provenance: abcd:intent-auditor@claude-sonnet-5 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:fb8cf52d705bd49ef4afdcef3b3f105028685e71a6ada05fe9c1bb3935200227
Input attestations: diff:8e6e1eb^..8e6e1eb@sha256:fa2199344556927a378ab8e7ca7e72465612384a0ab4c7649ab7a335bab2e0c4; intent:.abcd/development/intents/shipped/itd-2609071216221686-when-the-sidebar-holds-the-keyboard-s-shows-the-sidebar-if-i.md@sha256:943a8848b3f87ec92a3bb0914091707eb66d5905a3fc596d0bd2c3162032f371; spec:.abcd/development/specs/closed/spc-2609081444287807-when-the-sidebar-holds-the-keyboard-s-shows-the-sidebar-if-i.md@sha256:0b8fb4c032ee03de59b93ff8e8316585a907bc6b5e0e9e0e678e62b93d576d15; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609081444287807.md@sha256:bde7c0777d20967c8df054cb9d4a799e6be3c23d219c96b16adf5e0aaa81e0e6; test-run:npx vitest run src/focus.test.ts src/emacs-keys.test.ts@2 files passed, 137 tests passed, 0 failed;

Acceptance rollup: MET 4 · MET_WITH_CONCERNS 2 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: the sidebar-hide case closes the drawer unconditionally and hands focus back through toEditor(); the new test presses C-x o then h and asserts sidebar.open is false, focus.pane is 'editor', the chapter path, document text and cursor line are all unchanged from before
  evidence: src/focus.ts:492-499 — "case "sidebar-hide": sidebar.setOpen(false); toEditor(); return;"
  evidence: src/focus.test.ts:1093-1113 — "it("hides the drawer with h and hands the keyboard back to the text""
- ac-2 — MET_WITH_CONCERNS: keys.ts carries no bare-letter row for the editor scope, so h is left unclaimed there, and the new test presses h in the editor and asserts the binding table returns false (unanswered) and the sidebar is untouched; but the test cannot assert the letter h actually lands in the document (jsdom has no default keydown action) and the one manual row that would prove insertion, M36-2's third bullet, is unticked
  evidence: src/focus.test.ts:1144-1155 — "expect(press(app, "h")).toBe(false); expect(app.focus.pane).toBe("editor"); expect(app.sidebar.open).toBe(true);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609081444287807.md:35-38 — "[ ] Back in the text, press `h`. ... and the letter h lands in the chapter at the cursor."
- ac-3 — MET: takeFocus() is one function used whether or not the drawer was already open: the `if (!open) { openedForFocus = true; this.setOpen(true); }` branch only decides whether to open it, and the cursor-placement logic (revealSelected/cursorKey/paintCursor) below it runs unconditionally either way, so a sidebar reached hidden gets the same placement as one already shown; the new test confirms C-x o after h re-opens the drawer and moves focus and DOM focus into it
  evidence: src/sidebar.ts:657-676 — "takeFocus() { if (!open) { openedForFocus = true; this.setOpen(true); } const start = revealSelected();"
  evidence: src/focus.test.ts:1128-1141 — "it("shows a hidden sidebar again on C-x o, and moves the keyboard into it""
- ac-4 — MET: the diff touches no file wiring toggle-sidebar or C-x C-b (src/app.ts and src/sidebar.ts carry no hunks in this commit), and emacs-keys.test.ts's own unmoved regression test for C-x C-b still passes in the 137-test run
  evidence: src/emacs-keys.test.ts — "shows and hides the sidebar on C-x C-b (unmoved, passing)"
  evidence: git show 8e6e1eb --stat — "src/app.ts and src/sidebar.ts absent from the changed-file list"
- ac-5 — MET: the new row carries owner sidebar, label 'Hide the sidebar' and chord h, and the widened keys-panel test queries the rendered row by data-binding="sidebar-hide" and asserts its text contains the label, the chord and the sidebar note
  evidence: src/keys.ts:1189-1199 — "id: "sidebar-hide", label: "Hide the sidebar", chords: ["h"], group: "panes", owner: "sidebar","
  evidence: src/focus.test.ts:835-841 — "expect(hideRow?.textContent).toContain("Hide the sidebar"); expect(hideRow?.textContent).toContain("h"); expect(hideRow?.textContent).toContain("sidebar");"
- ac-6 — INCONCLUSIVE: the spec's own Acceptance Mapping concedes jsdom proves only the two-call open/close mechanism, not behaviour at any CSS width, and defers the width claim (390 vs 1280/820, no sideways scroll, no pointer needed) to manual check M36-1; every row of M36-1 in the acceptance log is unticked, so nothing in the supplied evidence resolves this criterion at 390px specifically
  evidence: .abcd/.work.local/logs/acceptance/spc-2609081444287807.md:22-25 — "[ ] At 390: the same as 820 ... [ ] At each width, nothing scrolls sideways at any point, and no step in this flow needs the pointer."
- ac-7 — MET_WITH_CONCERNS: one-source-always is demonstrably true (sidebar.open is the single field setOpen/takeFocus/releaseFocus/sidebar-hide all read and write, and setOpen is a documented no-op on a repeat call) and AT-reachability is structurally true (the new row is one more entry in the same BINDINGS table the keys panel already renders every other sidebar row from, with no bespoke rendering added); but the three-device-class sub-claim rests on the same unticked M36-1 manual rows as ac-6, so it is not independently established here
  evidence: src/sidebar.ts:623-631 — "setOpen(next) {"
  evidence: src/keys.ts:1189-1199 — "id: "sidebar-hide""
  evidence: .abcd/.work.local/logs/acceptance/spc-2609081444287807.md:10-28 — "## M36-1 — the whole flow at three widths"

Gap audit:
- honoured:
  - h in the sidebar hides the drawer unconditionally and hands the keyboard back
    evidence: src/focus.ts:492-499 — "case "sidebar-hide": sidebar.setOpen(false); toEditor(); return;"
  - C-x o reuses takeFocus's existing open-a-closed-drawer behaviour, no new plumbing
    evidence: src/sidebar.ts:657-676 — "if (!open) { openedForFocus = true; this.setOpen(true); }"
  - a bare s is bound to nothing
    evidence: src/keys.ts:1145-1199 — "no chord entry of "s" added anywhere in the diff"
  - the keys panel lists the new row under the sidebar's own group
    evidence: src/focus.test.ts:835-841 — "expect(hideRow?.textContent).toContain("Hide the sidebar")"
  - C-x C-b and the map #30 pane cycle are left untouched
    evidence: git show 8e6e1eb --stat — "src/app.ts and src/sidebar.ts carry no hunks"
- diverged: (none)
- missing:
  - the letter h actually lands in the chapter text on a real keydown
    evidence: .abcd/.work.local/logs/acceptance/spc-2609081444287807.md:35-38 — "[ ] Back in the text, press `h`. ... the letter h lands in the chapter at the cursor."
  - the drawer opens/closes correctly at 820 and 390 CSS pixels with no sideways scroll and no pointer step
    evidence: .abcd/.work.local/logs/acceptance/spc-2609081444287807.md:19-25 — "[ ] At 820: the sidebar is a drawer. ... [ ] At 390: the same as 820"
  - the key log shows h recognised-and-answered in the sidebar and unanswered/unlogged in the editor, on a real device
    evidence: .abcd/.work.local/logs/acceptance/spc-2609081444287807.md:32-38 — "[ ] Show the key log with `C-x k`. ... [ ] Back in the text, press `h`."

Scope-condition dispositions:
- cond-2609081444289771 — survived: sidebar-hide answers only through the existing BINDINGS/scopeOf machinery, reachable exactly when the sidebar is built and its keyboard cursor is available, the same population map #30 already established and that this diff does not widen
  evidence: src/keys.ts:1189-1199 — "owner: "sidebar""
- cond-2609081444285240 — untested: nothing in this diff touches Tauri-shell or macOS-specific code, and the delivered evidence is jsdom-only; the manual checklist that would exercise the real desktop shell (npm run tauri dev, M36-1/M36-2) is entirely unticked, so the platform assumption is neither exercised nor contradicted here
- cond-2609081444280811 — survived: the two new tests show h is a command exclusively while the sidebar holds the keyboard (it hides the drawer) and is left to the text exclusively while the editor holds it (the binding table returns unanswered), matching the condition exactly
  evidence: src/focus.test.ts:1093-1113 — "hides the drawer with h and hands the keyboard back to the text"
  evidence: src/focus.test.ts:1144-1155 — "leaves h to the text, unclaimed, while the cursor is in the editor"
- cond-2609081444283041 — survived: the keys.ts diff adds exactly one new row, sidebar-hide on chord h; no chord "s" is added anywhere in the delivered diff, so showing a hidden sidebar remains reachable only through C-x o
  evidence: src/keys.ts:1189-1199 — "chords: ["h"]"
- cond-2609081444281939 — survived: src/sidebar.ts, which owns takeFocus/releaseFocus and the pane-cycle movement vocabulary, carries no hunk in this commit; the delivered change is exactly one new BINDINGS row and one new case in focus.ts's run(id), inside the scope map #30 already gave the sidebar
  evidence: git show 8e6e1eb --stat — "src/sidebar.ts absent from the changed-file list"
- cond-2609081444280608 — survived: toggle-sidebar's wiring in src/app.ts is untouched by this diff, and emacs-keys.test.ts's own unmoved C-x C-b regression test still passes in the 137-test run this audit performed
  evidence: src/emacs-keys.test.ts — "shows and hides the sidebar on C-x C-b (unmoved, passing)"
## Grounds

- pursued: h in the sidebar hides the drawer and hands the keyboard back to the editor, unconditionally, and C-x o already reaches a hidden sidebar and shows it. Expected wrong if pressing h in the sidebar ever inserted the letter, if h in the editor ever hid the sidebar, or if C-x C-b stopped toggling.
