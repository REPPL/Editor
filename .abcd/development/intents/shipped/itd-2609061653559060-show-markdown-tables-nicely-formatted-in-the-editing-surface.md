---
id: itd-2609061653559060
slug: show-markdown-tables-nicely-formatted-in-the-editing-surface
spec_id: spc-2609091733494078
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Keep Markdown tables aligned while I type them

## Press Release

Alice is building a table of the readings for week four. She types a pipe, a
title, another pipe, and the row is ragged — the title is longer than the
header above it and the columns have gone out of true. She keeps typing. As
each cell settles, the pipes slide into line around it: the header widens,
the rule beneath it widens with it, every row below squares up, and her caret
stays in the cell she is typing in, at the character she is typing at. She
never presses anything to make this happen and she never stops to count
spaces. The table in the file is a table she can read, and so is the table on
the screen, because they are the same thing.

## Why This Matters

A Markdown table is the one construct where the source stops being readable
the moment it stops being aligned, and it stops being aligned the moment
anything in it changes length. Editor's whole premise is that the Markdown
stays visible and stays the source of truth — so a table that degenerates
into a run of pipes as it is written is the premise failing in the one place
it is most visible.

The alternatives were considered and are worse for this. A chord that
realigns on demand leaves the table ragged for exactly as long as Alice is
working in it, which is when she is reading it most. A view-only alignment,
where a decoration lines the pipes up on screen and the file keeps whatever
was typed, protects the bytes but breaks the premise in the other direction:
the file stops being the thing on the screen, and a table opened in any other
editor is the ragged one. Org-mode has done this the third way for thirty
years, and it is the way that keeps the source honest.

## Mechanism

We expect alignment on every edit inside a table to be tolerable rather than
intrusive, because the rewrite is bounded to the table the caret is in and is
mapped through CodeMirror's own change set, which is what keeps the caret in
its cell rather than at an offset that has moved underneath it. Org-mode is
the evidence that the interaction is liveable at all; what is unproved here is
the caret behaviour, and that is where this claim is falsifiable: if the caret
ever lands in a different cell, or a keystroke is lost to a realignment, the
mechanism is wrong and the on-demand chord was the right answer.

We expect one undo to undo one edit, not an edit and a realignment, because
the realignment is appended to the same transaction the keystroke produced
rather than dispatched after it. Falsifiable in the ugliest way: if `C-/`
leaves a table half-realigned, or takes two presses to undo one typed
character, this is wrong.

We expect a table's cell text to be able to wrap across the drawn line without
the source gaining line breaks, because wrapping is the surface's business and
the source's business is the pipes. Falsifiable if wrapping a long cell turns
out to require breaking the row in the file, in which case wrapping is out of
scope and the cell simply runs wide.

## Scope Conditions

- Population: Alice, the maintainer, editing a chapter containing GitHub <!-- cond: cond-2609091733495172 -->
  Flavored Markdown pipe tables.
- Platform: the desktop app — the Tauri 2 shell with the system web view — on <!-- cond: cond-2609091733492361 -->
  macOS.
- Realignment happens only inside the table the caret is in, and only on an <!-- cond: cond-2609091733498918 -->
  edit the author made. A chapter opened and saved with nothing typed is
  returned byte for byte, ragged tables and all — the byte-fidelity criterion
  is not relaxed by this intent.
- Named and accepted: an edit to one cell rewrites the whitespace of every <!-- cond: cond-2609091733490634 -->
  row of that one table, and the dash run of its delimiter row — `|-|-|`
  becomes `|---|---|` — preserving every alignment marker. This is a wider
  blast radius than the characters Alice typed, and it is the price of the
  alignment being in the source rather than in the view. It is bounded to one
  table and it never touches a line outside it.
  (Amended 2026-09-09. As first written this condition said "the whitespace of
  every row", which does not cover the delimiter row's dashes; the design
  cannot align a table without lengthening or shortening them, and the
  alternative — padding the rule with spaces to width, `| - |` rather than
  `|---|` — is legal Markdown that reads as broken. The wider claim is
  recorded rather than the narrower one honoured.)
- Only pipe tables. No other construct is reformatted, and prose is never <!-- cond: cond-2609091733493119 -->
  rewrapped by this intent — `M-q` remains the only thing that reflows a
  paragraph.
- Alignment can be turned off for the session by one chord, announced in the <!-- cond: cond-2609091900422614 -->
  modeline so Alice always knows which mode she is in. It is not persisted:
  the app starts with alignment on, every time. A setting that outlives the
  session is deliberately out of scope — a preference silently remembered
  from a week ago is a mode you can be in without knowing it, which is the
  cost the chord is chosen to avoid.
- A table that is malformed — unequal cell counts, a missing delimiter row — <!-- cond: cond-2609091733497438 -->
  is left exactly as typed. Alignment is a courtesy to a table that already
  parses, not a repair of one that does not.
- Alignment markers in the delimiter row (`:---`, `:---:`, `---:`) are <!-- cond: cond-2609091733498537 -->
  preserved and honoured: a right-aligned column's cells are padded on the
  left.
- Character width is counted in a way that does not corrupt text it cannot <!-- cond: cond-2609091733499546 -->
  measure. Where a cell contains characters whose drawn width is not their
  count — combining marks, wide characters, emoji — the alignment may be
  imperfect but the text is never altered.
- Wrapping cell text over drawn line breaks is wanted "if possible" and is <!-- cond: cond-2609091733493537 -->
  scoped as a second, separable question: if it cannot be done without
  changing the source, it is dropped and recorded as dropped.

## Acceptance Criteria

- Given the caret in a cell of a well-formed table, when Alice types a
  character that makes that cell wider than its column, then every row of that
  table realigns, and the caret is still in the same cell immediately after
  the character she typed.
- Given the caret in a cell, when Alice types a character that makes the cell
  narrower, then the columns narrow to fit and the caret holds its place.
- Given a realignment has happened, when Alice presses `C-/`, then one undo
  removes the character she typed and the alignment that came with it,
  leaving the table exactly as it was before the keystroke.
- Given a delimiter row carrying `:---:` and `---:`, when a table realigns,
  then the centre- and right-aligned columns pad on the correct side and the
  markers survive unchanged.
- Given a malformed table, when Alice types in it, then nothing is realigned
  and nothing is rewritten.
- Given text outside any table, when Alice types, then nothing is realigned.
- Given a chapter with a ragged table, when it is opened and saved with
  nothing typed, then the file is byte for byte what it was.
- Given a table with a cell longer than the surface is wide, when it is drawn,
  then the cell's text wraps within its column rather than scrolling the page
  sideways — or, if this proves impossible without changing the source, the
  criterion is recorded as dropped with its reason.
- Given alignment on and the caret in a table, when Alice presses the toggle
  chord, then the modeline says alignment is off, and typing in that table
  realigns nothing.
- Given alignment off, when Alice presses the toggle chord again, then the
  modeline says alignment is on, and the next edit inside a table realigns it;
  the table is not realigned by the toggle itself, only by the next edit.
- Given alignment turned off, when the app is restarted, then alignment is on
  again — the switch does not outlive the session.
- Inherited: one source, always — the alignment is computed in one place and
  applied through one transaction path; legible on three device classes — a
  table is workable at 1280, 820 and 390 CSS pixels; reachable by assistive
  technology — realignment does not move or re-announce the caret's context
  beyond the character typed.

## Open Questions

- ~~Whether a rewrite of every row of a table on a single keystroke sits
  comfortably with the repository's byte-fidelity criterion.~~ **Settled
  2026-09-09 by `adr-2609092000099546`**: the discipline forbids the
  serialiser reformatting on its own initiative, not an author's own edit
  reformatting the construct their caret is in. Three conditions bound what an
  author's edit may reformat — the edit is the occasion, the construct the
  caret is in is the limit, one undo undoes it — and this intent meets all
  three. Both brief clauses are corrected to say so.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-d3b16dcab085 -->
Fidelity review — receipt rcp-d3b16dcab085 (verifier abcd:intent-auditor claude-sonnet-5).

Provenance: abcd:intent-auditor@claude-sonnet-5 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:c0672c16b58042dfc8f283f2fa5e0b58b91d75d6bea6f0cfa2683a95108879c2
Input attestations: diff:HEAD..working-tree@-;

Acceptance rollup: MET 10 · MET_WITH_CONCERNS 1 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: the filter widens every row and re-derives the caret position in-cell on a widening edit, proven live over a real EditorView
  evidence: src/tables.test.ts:249-260 — ""widens every row when a cell grows past its column""
  evidence: src/tables.test.ts:262-271 — ""leaves the caret immediately after the character that widened the cell""
  evidence: src/tables.ts:451-490 — "for (let column = 0; column < columns; column += 1) { ... starts.push(text.length + left.length);"
- ac-2 — MET: backspacing the widest cell narrows the whole table and the caret is proven to hold even in trailing padding, the case mapPos would get wrong
  evidence: src/tables.test.ts:295-315 — ""narrows every column when the widest cell shrinks""
  evidence: src/tables.test.ts:317-342 — ""holds the caret in its cell when the padding around it is taken away""
- ac-3 — MET: one C-/ (via the codemirror undo() command) restores the pre-keystroke document and the history shows exactly one entry for the typed character plus its realignment
  evidence: src/tables.test.ts:371-379 — ""takes the character and its realignment back on one undo""
  evidence: src/tables.test.ts:381-392 — ""puts one entry on the history for one keystroke in a table""
  evidence: src/tables.ts:352-354 — "if (transaction.isUserEvent("undo") || transaction.isUserEvent("redo"))"
- ac-4 — MET: centre and right markers are honoured with correct-side padding and survive a rule rewrite that widens the dash run
  evidence: src/tables.test.ts:344-354 — ""pads a centre column on both sides and a right column on the left""
  evidence: src/tables.test.ts:356-369 — ""keeps every alignment marker when it rewrites the rule to the new width""
  evidence: src/tables.ts:279-284 — "function ruleFor(span: number, align: Align): string"
- ac-5 — MET: unequal cell counts and a missing delimiter row are refused byte-for-byte, and the exact keystroke that breaks a row (deleting a pipe) is pinned
  evidence: src/tables.test.ts:527-538 — ""leaves a table with unequal cell counts exactly as typed""
  evidence: src/tables.test.ts:548-561 — ""leaves the table alone on the keystroke that deletes a pipe from a row""
- ac-6 — MET: prose, fenced code, a fenced div, and a blockquote are all proven to realign nothing, going beyond the bare AC wording to pin the deliberate exclusions
  evidence: src/tables.test.ts:595-605 — ""rewrites nothing when the edit is in prose""
  evidence: src/tables.test.ts:621-633 — ""leaves a table inside a fenced div exactly as typed""
  evidence: src/tables.test.ts:635-642 — ""leaves a table inside a blockquote exactly as typed""
- ac-7 — MET: a real app open-move-save cycle over a 544-char-line, ragged-table, tab, CRLF-adjacent fixture returns the exact same string on both the live document and the written file, not merely a structural argument
  evidence: src/emacs-keys.test.ts:983-1032 — ""opens a hazardous chapter and saves it byte for byte""
  evidence: src/emacs-keys.test.ts:1028 — "expect(documentText(app.view)).toBe(HAZARDOUS);"
  evidence: src/emacs-keys.test.ts:1031 — "expect(written).toBe(HAZARDOUS);"
- ac-8 — MET: the criterion is disjunctive by its own wording (wrap within column, or record the drop with a reason) and the delivered reality took the second branch explicitly, in the spec's own Design section and in the shipped how-to page, with the surviving discipline (no sideways scroll) kept under test
  evidence: .abcd/development/specs/closed/spc-2609091733494078-show-markdown-tables-nicely-formatted-in-the-editing-surface.md:518-558 — ""That expectation is falsified", and this spec records it as falsified rather than unmet."
  evidence: docs/how-to-write-a-table.md:109-121 — "the wrapped remainder runs the full width of the surface rather than staying inside its column"
  evidence: src/tables.test.ts:732-749 — ""wraps an over-wide row rather than widening the line""
- ac-9 — MET: pressing C-c C-t through the real chord path sets the modeline text to "Table alignment off" and typing in the table is proven to leave it exactly as typed
  evidence: src/emacs-keys.test.ts:1074-1079 — "expect(pressSequence(app.view, "C-c C-t")).toBe(true); ... expect(saying()).toBe("Table alignment off");"
  evidence: src/tables.test.ts:758-765 — ""realigns nothing while alignment is off""
- ac-10 — MET: a second press flips the modeline to "Table alignment on" with the chapter unchanged by the press itself, and the very next edit inside the table is shown to realign it
  evidence: src/emacs-keys.test.ts:1081-1084 — "expect(pressSequence(app.view, "C-c C-t")).toBe(true); ... expect(saying()).toBe("Table alignment on"); ... expect(documentText(app.view)).toBe(HAZARDOUS);"
  evidence: src/tables.test.ts:767-784 — ""realigns nothing when alignment is switched back on, and realigns on the next edit""
- ac-11 — MET_WITH_CONCERNS: the flag's design (module-level boolean, no settings/document.yaml write) and a jsdom module-reload test show alignment reverts to on when the module's initialiser reruns, but this is the closest jsdom can get to a real process restart, not the real quit-and-relaunch the criterion literally names, and that manual row is still unticked
  evidence: src/tables.test.ts:799-808 — ""starts on again when the module is loaded afresh" ... vi.resetModules(); ... const fresh = await import("./tables"); expect(fresh.tableAlignmentOn()).toBe(true);"
  evidence: src/tables.ts:74 — "let aligning = true;"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609091733494078.md — "- [ ] With alignment off, quit the app and relaunch it. Alignment is on: type in a ragged table and confirm it squares up."
- ac-12 — INCONCLUSIVE: the one-source discipline is pinned by an automated test, but the other two inherited disciplines named in this criterion (legible at three real CSS pixel widths; reachable by assistive technology) rest only on unticked manual checklist rows — the spec itself states the AT claim is 'not newly proven by a jsdom test' and 'checked by hand as M39-4'
  evidence: src/tables.test.ts:717-728 — ""asks core/parse for the table and never re-derives one""
  evidence: .abcd/development/specs/closed/spc-2609091733494078-show-markdown-tables-nicely-formatted-in-the-editing-surface.md:119 — "Not newly proven by a jsdom test — jsdom has no accessibility tree — and checked by hand as M39-4"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609091733494078.md — "- [ ] At 1280: ... / - [ ] With VoiceOver on, type inside a table cell."

Gap audit:
- honoured:
  - realignment rides the author's own transaction, one undo takes both back
    evidence: src/tables.test.ts:371-392 — ""takes the character and its realignment back on one undo"; "puts one entry on the history for one keystroke in a table""
  - a chapter with a ragged table opened and saved untouched returns byte for byte
    evidence: src/emacs-keys.test.ts:1028-1031 — "expect(documentText(app.view)).toBe(HAZARDOUS); ... expect(written).toBe(HAZARDOUS);"
  - malformed tables and tables outside the top-level scope (fenced div, blockquote) are never touched
    evidence: src/tables.test.ts:527-642 — ""leaves a table with unequal cell counts exactly as typed" ... "leaves a table inside a blockquote exactly as typed""
  - alignment markers are preserved and honoured across a rule rewrite
    evidence: src/tables.test.ts:356-369 — ""keeps every alignment marker when it rewrites the rule to the new width""
  - the toggle chord is session-scoped, writes nothing to disk, and only writes a boolean plus a modeline announcement
    evidence: src/tables.test.ts:810-827 — ""writes the switch nowhere but memory""
    evidence: src/app.ts:973-977 — ""toggle-table-alignment": () => { announce(setTableAlignment(!tableAlignmentOn()) ...)"
  - wide characters and combining marks are measured without ever altering the cell's text
    evidence: src/tables.test.ts:225-245 — ""counts a wide character as one, which is the accepted imperfection""
- diverged:
  - the intent's own third Mechanism expectation — cell text wraps across a drawn line without the source gaining line breaks — was investigated and found impossible without a widget-based table layout, and is recorded as falsified rather than delivered
    evidence: .abcd/development/specs/closed/spc-2609091733494078-show-markdown-tables-nicely-formatted-in-the-editing-surface.md:518-556 — "That expectation is falsified, and this spec records it as falsified rather than unmet."
  - the app-restart and delimiter-row Mechanism-caret claims are proven with a jsdom module-reload stand-in rather than a genuine process restart
    evidence: src/tables.test.ts:799-808 — "The closest jsdom has to a new process: the module's own initialiser runs again. A real quit and relaunch is M39-9."
- missing:
  - every row of the manual acceptance checklist — the real-keyboard caret behaviour at three widths, VoiceOver reachability, IME/dead-key composition, paste, and the real quit-and-relaunch — remains unticked, so the intent's own falsifiers for caret drift and lost keystrokes are unconfirmed on a real device
    evidence: .abcd/.work.local/logs/acceptance/spc-2609091733494078.md — "- [ ] At 1280: put the caret in a cell and type a word longer than the column."

Scope-condition dispositions:
- cond-2609091733495172 — survived: the whole mechanism is scoped to GFM pipe tables via parseChapter's table block, and every test fixture is a pipe table
  evidence: src/tables.ts:301-307 — "function tableOn(source: string, line: number): Block | null { for (const block of parseChapter(source).blocks) { if (block.kind !== "table") continue;"
- cond-2609091733492361 — untested: nothing in the delivered diff or tests exercises or contradicts a macOS/Tauri-specific boundary; the extension is added to the one shared editing surface with no platform-conditional code
- cond-2609091733498918 — survived: realignment is bounded to the caret's own table by predicates 5 and 6, and an open-and-save cycle with nothing typed is proven byte for byte
  evidence: src/tables.ts:370-385 — "if (block === null) return transaction; ... if (!touched) return transaction;"
  evidence: src/emacs-keys.test.ts:1028-1031 — "expect(documentText(app.view)).toBe(HAZARDOUS); ... expect(written).toBe(HAZARDOUS);"
- cond-2609091733490634 — survived: the wider, amended wording — whitespace of every row and the dash run, preserving markers — is exactly what ruleFor and the whitespace-run changes implement, and is proven with a case that both widens dashes and preserves centre/right markers, bounded to the one table edited
  evidence: src/tables.ts:279-284 — "function ruleFor(span: number, align: Align): string { if (align === "left") return `:${"-".repeat(span - 1)}`;"
  evidence: src/tables.test.ts:356-369 — ""keeps every alignment marker when it rewrites the rule to the new width""
  evidence: src/tables.test.ts:417-440 — ""leaves the other table in the chapter exactly as it was""
- cond-2609091733493119 — survived: src/prose.ts, which owns M-q's paragraph reflow, is untouched by this diff, and the filter's predicate 5 refuses any block that is not a top-level table
  evidence: src/tables.ts:370-372 — "const block = tableOn(doc.toString(), caretLine.number); if (block === null) return transaction;"
- cond-2609091900422614 — survived: the switch is a module-level boolean, the toggle command only writes the flag and calls the existing announce, and a test confirms no settings/document.yaml/storage write exists anywhere in the module's source
  evidence: src/tables.test.ts:810-827 — ""writes the switch nowhere but memory""
  evidence: src/app.ts:973-977 — "announce(setTableAlignment(!tableAlignmentOn()) ? "Table alignment on" : "Table alignment off")"
- cond-2609091733497438 — survived: unequal cell counts and a missing delimiter row are both refused, leaving the source exactly as typed
  evidence: src/tables.test.ts:527-546 — ""leaves a table with unequal cell counts exactly as typed"; "leaves a header row with no delimiter row exactly as typed""
- cond-2609091733498537 — survived: padsFor and ruleFor honour left/right/centre markers and a right-aligned column is proven to pad on the left
  evidence: src/tables.ts:253-261 — "function padsFor(text: string, width: number, align: Align): [string, string] { ... if (align === "right") return [" ".repeat(slack + 1), " "];"
  evidence: src/tables.test.ts:344-354 — ""pads a centre column on both sides and a right column on the left""
- cond-2609091733499546 — survived: measure() counts grapheme clusters via Intl.Segmenter, never re-encoding the cell, and tests confirm the accepted imperfection for CJK/emoji without altering text
  evidence: src/tables.ts:229-231 — "export function measure(text: string): number { return clusterStarts(text).length - 1; }"
  evidence: src/tables.test.ts:236-240 — ""counts a wide character as one, which is the accepted imperfection""
- cond-2609091733493537 — survived: the condition's own escape hatch — drop and record if wrapping proves impossible without changing the source — is exactly what was exercised: the spec's Design section investigates three approaches, rejects each, and records the drop with its reason, echoed in the how-to page
  evidence: .abcd/development/specs/closed/spc-2609091733494078-show-markdown-tables-nicely-formatted-in-the-editing-surface.md:518-558 — "So wrapping within a column cannot be had from a decoration, and having it from a widget would cost the premise the whole intent exists to defend."
  evidence: docs/how-to-write-a-table.md:109-121 — "Keeping a long cell inside its column is not something Editor does."
## Grounds

- pursued: realigning a pipe table on every edit inside it keeps the source the thing on the screen, and CodeMirror's change mapping keeps the caret in its cell; wrong if the caret ever lands in a different cell, if a keystroke is lost to a realignment, or if one undo leaves a table half-aligned
