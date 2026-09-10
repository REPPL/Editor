---
id: itd-2609051934109483
slug: the-binding-table-lacks-the-prose-vocabulary-a-writer-reache
spec_id: spc-2609051938278499
kind: standalone
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
promoted_from: iss-2609051934091500
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Edit prose with the Emacs commands my hands already know

## Press Release

Alice writes a paragraph, changes her mind halfway through, and the line
runs long. She presses `M-q` and the paragraph reflows to her fill column;
the paragraph above it and the table below it are exactly the bytes they
were a moment ago. She sees that two words came out in the wrong order,
puts the cursor between them and presses `M-t`. She moves back a sentence
with `M-a`, forward a paragraph with `M-}`, capitalises a name with `M-c`,
and repairs the two spaces a kill left behind with `M-SPC`. None of this
is learning: it is the vocabulary her hands have used for twenty years,
answering in Editor the way it answers everywhere else.

When she wants a word she has already written, she types its first four
letters and presses `M-/`; Editor completes it from the document's own
words, and pressing again cycles to the next candidate. When she cannot
remember which chord does a thing, she presses `M-x` and types a few
letters of its name: a palette lists every command the binding table
carries, filtered as she types, and running the one she chooses. The
insert palette she already knows is still on `C-c i`, and its constructs
are listed under `M-x` too, so there is one place to reach anything. When
she presses a chord and something unexpected happens, `C-h k` and that
chord again name it in the modeline.

At the end of the sitting she presses `C-x C-c`. The chapter has unsaved
changes, so Editor asks before it quits, exactly as closing a chapter
does. She answers, and the window goes.

Nothing about the document changes. The Markdown is what it was, the file
Bob will read is the file Alice wrote, and the seventeen new commands are
seventeen more rows in the same table the keys panel already shows.

## Why This Matters

An editor that claims Emacs bindings and then stops short of the commands
a writer of prose uses hourly is not a familiar surface but an
approximation of one, and an approximation is worse than an unfamiliar
tool: every command Alice presses is a wager on whether this one is
present. She stops trusting her hands and starts checking, which is the
opposite of what the bindings were for. Filling a paragraph, moving by
sentence, transposing two words, and completing a word from the text she
has already written are not advanced Emacs; they are how prose is written
in it, and their absence is felt on the first page.

## Mechanism

We expect these seventeen commands to be the right ones to add, rather
than an arbitrary slice of Emacs, because they were chosen against a table
that already held eighty-three rows: the research note compares what is
present with what a writer reaches for without thinking and ranks only
what is both missing and reached for hourly, leaving the outline
vocabulary and the registers, rectangles, and macros to later tiers. The
claim is falsifiable in the obvious way — if a sitting with the app finds
Alice reaching for something this list does not carry, the ranking was
wrong.

We expect adding them to cost a row and a function each, not a change to
how keys are handled, because the bindings are data: `05-internals.md`
section 5 states that the table is "one table with an id, a label, and the
chords for each action, which the keys panel, the tooltips, and the
acceptance tests all read from", and the keyboard-navigation prototype in
`03-evidence.md` proves that shape works, with real prefix keys inside a
text field and help one chord away listing the live bindings.

We expect `M-x` to be nearly free for the same reason: every row already
carries the human label a command palette lists, so the palette is a view
over data that exists. We expect it to behave like every other overlay
because the prototype proves the contract — "overlays own the keyboard
while open and navigate with the same chords", and "`C-g` and Escape
cancel anything: a search, a panel, an overlay, a prefix".

We expect `M-q` to be safe against the round-trip byte-fidelity discipline
because the tree carries source spans: `05-internals.md` section 2 states
that "serialising an edited tree changes only the spans that were edited",
so filling rewrites the span of one paragraph and every other byte in the
chapter is copied through untouched. The same span model is what lets the
command refuse: a cursor inside a fenced div, a pipe table, a code fence,
or a heading is inside a node whose span is not a paragraph's, and a
command that would reflow it declines rather than guesses.

We expect `M-x`, `M-/`, and `M-@` to be the three rows at risk, because
the research note records them as suppressed today and `03-evidence.md`
holds open "which key combinations macOS and the web view take before the
editor sees them, and which of those the shell can claim back". If the
shell cannot claim them, these rows ship on an alternative chord or not at
all, and that is the falsification.

## Scope Conditions

- Platform: the desktop app, in the Tauri 2 system web view on macOS, with <!-- cond: cond-2609051938271571 -->
  the shell claiming the combinations the platform would otherwise take.
  The same rows in the single HTML file on an iPad, where there is no
  shell to claim anything, belong to intent 18.
- Population: Alice, the sole author, editing the Markdown of one chapter. <!-- cond: cond-2609051938270695 -->
  No moment here belongs to Bob or Carol; nothing these commands do
  reaches a rendering.
- Assumption: the spike named in `06-delivery.md` has run and produced the <!-- cond: cond-2609051938279075 -->
  written binding table, and the editing surface is the one it chose.
  These rows are added to that table, not to a second one.
- Scale: tier one of the research note only — seventeen commands. Tier <!-- cond: cond-2609051938271627 -->
  two, the document model as an outline (heading movement, folding,
  promotion and demotion, narrowing, occur, switching chapter by name),
  is a later intent of its own, together with the chord conflicts the note
  lists for the maintainer to decide. Tier three is not in scope at all.
- Boundary with intent 2, `itd-2609051335406422` (Edit with the Emacs <!-- cond: cond-2609051938271592 -->
  bindings I already know): 2 owns the binding table's shape — the id, the
  label, the chords — the keys panel that renders it, the cancel contract,
  and the conformance sweep that checks the table. This intent adds rows
  to that table and passes under that sweep; it defines none of them. In:
  the seventeen commands and what each does to the text. Out: the table,
  the panel, the sweep.
- Boundary with intent 3, `itd-2609051335415528` (Insert a construct I <!-- cond: cond-2609051938278797 -->
  cannot remember): 3 owns the insert palette on `C-c i` and the canonical
  form each entry writes at the cursor. In: that those same entries are
  listed by the `M-x` command palette and run from it. Out: what any of
  them inserts, and the palette's own chord, which is unchanged.
- Boundary with intent 30, `itd-2609051921482691` (Move between the editor <!-- cond: cond-2609051938279178 -->
  and the sidebar without the mouse): 30 owns focus between panes, the
  sidebar by keyboard, and the return. In: movement of the cursor inside
  the text of one chapter, `M-r` included, which moves the cursor within
  the view. Out: any movement of focus out of the text.
- Assumption: the fill column is a document setting, defaulting to 80, so <!-- cond: cond-2609051938272027 -->
  a document may state its own and a document that says nothing is filled
  at 80.
- Out of scope: rebinding any of these chords, which `03-evidence.md` <!-- cond: cond-2609051938277046 -->
  leaves open for the table as a whole, and alternative binding sets,
  which `06-delivery.md` puts out of scope entirely.

## Acceptance Criteria

- **Given** the binding table with tier one added, **when** Alice opens
  the keys panel, **then** every one of the seventeen actions — fill
  paragraph, transpose words, transpose lines, capitalise word, backward
  and forward sentence, backward and forward paragraph, delete
  indentation, just one space, delete horizontal space, zap to char, mark
  word, command palette, describe key, move to window line, quit, and
  expand word — appears as a row with its label and its chord, and no
  chord in the table is claimed by two rows.
- **Given** a chapter whose second paragraph is one 544-character line,
  between a first paragraph and a pipe table captioned
  `: The counts by winter {#tbl:counts}`, **when** Alice puts the cursor
  in that second paragraph and presses `M-q`, **then** that paragraph
  alone is wrapped at the document's fill column of 80, and every byte of
  the file before its first character and after its last is identical to
  what it was.
- **Given** the cursor inside a `::: {.notes}` fenced div, inside the pipe
  table, inside a fenced code block, or on a `## Beginnings` heading line,
  **when** Alice presses `M-q`, **then** no byte of the chapter changes
  and the modeline says the command does not apply there.
- **Given** a chapter using the words `lanternlight` and `lanternkeeper`
  and no other word beginning `lant`, **when** Alice types `lant` and
  presses `M-/`, **then** the nearer word completes it; pressing `M-/`
  again replaces it with the other; pressing a third time returns the
  text to `lant`.
- **Given** the cursor between two words, **when** Alice presses `M-x`,
  types `tw`, and chooses `Transpose words` from the filtered list,
  **then** the palette closes and the two words swap; and **when** she
  presses `M-x` again and then `C-g`, **then** the palette closes and not
  one byte of the chapter has changed.
- **Given** a chapter with unsaved changes, **when** Alice presses
  `C-x C-c`, **then** Editor asks before quitting and `C-g` returns her to
  the text with the changes still unsaved; with nothing unsaved, the same
  chord quits without asking.
- **Given** the window at 390 CSS pixels wide, **when** Alice presses
  `M-z` and then, after answering it, `C-h k` followed by `M-c`, **then**
  the modeline shows the zap-to-char prompt and afterwards names
  `Capitalise word`, each on one line, with nothing clipped and no
  horizontal scrolling anywhere on the surface.
  (Amended 2026-09-10, superseded in one particular by
  `itd-2609091722353594`, *See what a prefix can do, without leaving the
  prefix*. This criterion's own case is unaffected: `C-h k` then `M-c` still
  names `Capitalise word`, on one line, at every width. What changes is
  `C-h k`'s answer for one chord — `C-h` itself. That intent adds a
  `prefix-help` row carrying `C-h`, so `C-h` becomes the only chord in the
  table that is both a row and the first step of a longer chord, and
  `describeKey` looks a chord up as a row before asking whether it is a
  prefix: `C-h k` then `C-h` now names **What can follow this prefix** and
  stops, where it previously waited for a second step and would then have
  named `C-h b` or `C-h k`. This is what GNU Emacs answers for `C-h k C-h`,
  and it was accepted deliberately rather than worked around, because the
  general rule — name the row if there is one — is worth more than an
  exception for one chord. The prefix-reading behaviour this criterion's own
  case depends on is untouched: `C-h k` then `C-x` then `C-s` still reads
  the two steps as one sequence and names **Save the chapter**. Recorded
  here rather than left to be inferred, following `iss-2609052143457583`.)
- **Given** the seventeen rows added, **when** the binding table's
  conformance sweep runs, **then** it passes unchanged: every row carries
  a label and at least one chord, no chord collides, and every chord the
  sweep presses reaches the editor rather than the web view or the
  platform.
  (Amended 2026-09-10, superseded in one particular by
  `itd-2609091722353594`, *See what a prefix can do, without leaving the
  prefix*. The three sub-claims still hold, and hold for the seventeen rows
  this intent added. "Passes unchanged" does not: that intent gives `C-h` a
  row while it remains a suppression entry taken out of CodeMirror's keymap
  only, which makes it the one chord that is both listed and suppressed, so
  the sweep "suppresses a chord instead of listing it, never both" gains one
  named exception, asserted in both directions. The other sweeps are
  untouched. The audit of this criterion already qualified "unchanged" —
  ac-8 in Audit Notes below records that two sweep tests were tightened in
  the delivered range for another intent's fix — so this is the second time
  the word has had to give, and it is amended here rather than qualified
  again from outside. Recorded following `iss-2609052143457583`.)
- Inherits: round-trip byte-fidelity; no machine in the document; one
  source, always; degrade gracefully in a plain tool; legible on three
  device classes; network only on publish.

## Open Questions

- Which of the less common Emacs bindings count as "full" is open in
  `03-evidence.md` — "the binding table: which prefix keys and which of
  the less common Emacs bindings count as 'full'. A written table is the
  finite acceptance list." Tier one is this intent's answer for prose; the
  outline tier is a later one, and the question stays open until both have
  landed.
- Whether these chords are rebindable and persisted is open in
  `03-evidence.md`, which asks it of the table as a whole and notes that
  the keyboard-navigation prototype allows it. This intent adds rows on
  the same terms as every other row, whatever those turn out to be.
- Which combinations macOS and the web view take before the editor sees
  them, and which the shell can claim back, is open in `03-evidence.md`.
  It decides whether `M-x`, `M-/`, and `M-@` can carry the chords named
  here or must carry others.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-514fe9f2cc79 -->
Fidelity review — receipt rcp-514fe9f2cc79 (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:67e662dc96f6c6f89926bb02484a001efd73ca444b251bc082d7871c0e5367bb
Input attestations: diff:931c7a2..HEAD (c15eda3); the introducing commit 931c7a2 'feat: the prose vocabulary, an M-x command palette, and dabbrev' lies just outside the supplied range, so the code was judged at HEAD@sha256:d8e81fcb00f89ab02387a2f53381c3dea49b7b36b9bb9edf24af050a631060b8; intent:.abcd/development/intents/shipped/itd-2609051934109483-the-binding-table-lacks-the-prose-vocabulary-a-writer-reache.md@-; spec:.abcd/development/specs/closed/spc-2609051938278499-the-binding-table-lacks-the-prose-vocabulary-a-writer-reache.md@-; manual-checklist:.abcd/.work.local/logs/acceptance/spc-2609051938278499.md (every row unticked)@-; test-run:npx vitest run at HEAD: 33 files, 729 tests passed; src/prose.test.ts, src/command-palette.test.ts, src/emacs-keys.test.ts, src/palette.test.ts: 163 passed@-;

Acceptance rollup: MET 4 · MET_WITH_CONCERNS 4 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET_WITH_CONCERNS: Seventeen rows are in BINDINGS with an id, a label and a chord each (keys.ts:787-912), mark-word keeps its existing row (keys.ts:512-517), and an app-level test opens the keys panel on C-h b and finds all eighteen ids named by the criterion rendered with their label and their chords. Concerns: the criterion says 'seventeen' while naming eighteen actions (mark-word was already a row, which the test records); and chord uniqueness is enforced per scope (test 337-350), so table-wide the sidebar rows deliberately share C-n/C-p/Return with editor rows by intent 30's design — none of the seventeen new chords is claimed by any other row in either scope.
  evidence: src/keys.ts:787-912 — "id: "fill-paragraph", label: "Fill the paragraph", chords: ["M-q"] … id: "quit", label: "Quit Editor", chords: ["C-x C-c"]"
  evidence: src/emacs-keys.test.ts:1220-1253 — "shows every tier-one prose command in the keys panel … expect(row?.textContent ?? "", id).toContain(bindingById(id)?.label ?? "") … expect(chords?.textContent ?? "", id).toContain(chord)"
  evidence: src/emacs-keys.test.ts:420-449 — "expect(tier).toHaveLength(17); … expect(bindingById("mark-word")?.chords).toEqual(["M-S-2"])"
  evidence: src/emacs-keys.test.ts:337-350 — "gives no two rows the same chord … for (const scope of ["editor", "sidebar"] as const) … expect(shared).toEqual([])"
  evidence: src/keys.ts:919-926 — "chords: ["C-n", "Down"] … chords: ["C-p", "Up"] (sidebar scope, shared with keys.ts:129-136)"
- ac-2 — MET: fillParagraph parses the chapter, selects the top-level paragraph at the cursor's line, and replaces exactly doc.line(block.line).from..doc.line(block.endLine).to in one transaction (prose.ts:345-373); the test builds the criterion's fixture — a first paragraph, a 544-character second paragraph, a pipe table captioned ': The counts by winter {#tbl:counts}' — puts the cursor in the long line, fills at 80, and asserts text.startsWith(before), text.endsWith(after), every line ≤ 80, no word gained or lost, and the table caption intact; a second test does the same on a real example chapter.
  evidence: src/prose.ts:360-372 — "const from = state.doc.line(Math.min(block.line, state.doc.lines)).from; const to = state.doc.line(Math.min(block.endLine, state.doc.lines)).to; … replace(view, from, to, filled);"
  evidence: src/prose.test.ts:52-96 — "const LONG_PARAGRAPH = … const PARAGRAPH_LINE = 5; … ": The counts by winter {#tbl:counts}""
  evidence: src/prose.test.ts:169-201 — "expect(LONG_PARAGRAPH).toHaveLength(544); … expect(text.startsWith(before)).toBe(true); expect(text.endsWith(after)).toBe(true); … expect(line.length, line).toBeLessThanOrEqual(DEFAULT_FILL_COLUMN);"
  evidence: src/prose.test.ts:287-325 — "fills a real chapter's paragraph without touching the table or its caption"
  evidence: src/app.ts:383-389 — "fillColumn = DEFAULT_FILL_COLUMN; … if (typeof stated === "number" && stated > 0) fillColumn = stated;"
- ac-3 — MET: Any block kind other than paragraph returns a named refusal without dispatching (prose.ts:355-358, FILL_REFUSALS at 160-171); the test places the cursor on a heading, inside the pipe table and its caption, inside the ::: {.notes} div, inside the code fence (and a quotation and a list), asserts the refusal names the place and that the document is byte-identical; app.ts announces the refusal string into the modeline message cell (app.ts:404-406 → 297-300 → modeline.ts:158). The fixture's headings are '# Beginnings' and '## Winters' rather than the criterion's '## Beginnings', which changes nothing about the kind refused.
  evidence: src/prose.ts:355-358 — "if (!block) return NOTHING_TO_FILL; if (block.kind !== "paragraph") { return FILL_REFUSALS[block.kind] ?? FILL_ELSEWHERE; }"
  evidence: src/prose.ts:160-171 — "heading: "Fill does not apply on a heading", table: "Fill does not apply inside a table", div: "Fill does not apply inside a fenced div", code: "Fill does not apply inside a code block""
  evidence: src/prose.test.ts:259-285 — "[1, "heading"], [14, "heading"], [8, "table"], [12, "table"], [17, "fenced div"], [21, "code block"] … expect(documentText(view), `line ${String(line)}`).toBe(CHAPTER);"
  evidence: src/app.ts:404-406 — "function prose(run: () => string | null): void { announce(run() ?? ""); }"
  evidence: src/modeline.ts:158 — "messageCell.textContent = context.message;"
- ac-4 — MET: dabbrevExpand takes the word characters before the point, collects distinct matching words ordered backwards-nearest then forwards, cycles through them and then back to the prefix (prose.ts:630-715); the test uses exactly 'lanternkeeper' and 'lanternlight' with 'lant' typed after them and asserts lanternlight (nearer), then lanternkeeper, then 'lant', then lanternlight again; the M-/ chord is bound and answered (emacs-keys.test.ts:420-441 asserts emacsAnsweredChords has it) and off SUPPRESSED.
  evidence: src/prose.ts:683-715 — "if (held && held.doc === state.doc && held.head === head) { return showExpansion(view, held, (held.index + 1) % held.candidates.length); } … candidates: [...candidates, prefix]"
  evidence: src/prose.test.ts:635-659 — ""The lanternkeeper trims what the lanternlight leaves.", "", "lant" … toBe("lanternlight") … toBe("lanternkeeper") … toBe("lant")"
  evidence: src/keys.ts:876-882 — "id: "dabbrev-expand", label: "Expand the word from the document", chords: ["M-/"]"
  evidence: src/emacs-keys.test.ts:461-465 — "expect(suppressed).not.toContain("M-x"); expect(suppressed).not.toContain("M-/");"
- ac-5 — MET: The palette ranks label-word initials so 'tw' puts transpose-words first (command-palette.ts:81-95), choosing runs the row through runBinding (131-139); the test opens the palette over the app, types 'tw', presses Return, and sees the palette gone and 'beta alpha gamma'; a second test opens, types, presses each keyboard-quit chord (C-g and Escape) and asserts the palette is gone and the document byte-identical; the M-x chord itself is proven through the app (emacs-keys.test.ts:1255-1272).
  evidence: src/command-palette.ts:89-90 — "const initials = words.map((word) => word.charAt(0)).join(""); if (initials.startsWith(needle)) return 2;"
  evidence: src/command-palette.test.ts:200-208 — "type("tw"); expect(offered()[0]).toBe("transpose-words"); press("Return"); expect(document.querySelector(".palette")).toBeNull(); expect(view.state.doc.line(3).text).toBe("beta alpha gamma");"
  evidence: src/command-palette.test.ts:210-218 — "changes not one byte when it is cancelled … for (const chord of bindingById("keyboard-quit")?.chords ?? []) … expect(documentText(view), chord).toBe(SAMPLE);"
  evidence: src/emacs-keys.test.ts:1255-1272 — "opens the command palette on M-x, over the shared list overlay … expect(documentText(app.view)).toBe(before);"
- ac-6 — MET_WITH_CONCERNS: quit() leaves at once when the buffer is clean and otherwise opens a two-row confirm overlay opening on 'Keep editing' (app.ts:429-451); the tests press C-x C-c dirty, see the overlay, press C-g, and assert no quit call, dirty still true, the edit still in the buffer; clean, the chord calls services.quit once with no overlay. Concern: 'quits' is proven only to the services.quit seam — main.ts:58-60 wires it to setDirty(false) then getCurrentWindow().destroy(), but the real window closing is manual row M-5, which is unticked.
  evidence: src/app.ts:429-451 — "function quit(): void { if (!isDirty()) { leave(); return; } … openListOverlay< ListEntry>({ … className: "confirm", label: "Quit Editor" … entries: () => QUIT_CHOICES"
  evidence: src/emacs-keys.test.ts:1307-1336 — "asks before C-x C-c quits and keeps the edits on C-g … expect(quitCalls).toBe(0); expect(app.dirty).toBe(true); expect(documentText(app.view)).toBe(`Edited. ${SAMPLE}`);"
  evidence: src/emacs-keys.test.ts:1338-1345 — "expect(app.dirty).toBe(false); expect(pressSequence(app.view, "C-x C-c")).toBe(true); expect(document.querySelector(".confirm")).toBeNull(); expect(quitCalls).toBe(1);"
  evidence: src/main.ts:58-61 — "async function quitWindow(): Promise< void> { await setDirty(false); await getCurrentWindow().destroy(); }"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051938278499.md:593-598 — "- [ ] With nothing unsaved, `C-x C-c` closes the window with no question asked."
- ac-7 — INCONCLUSIVE: The mechanism is present: every prose message is held to a 52-character budget and a single line by a test that also builds every 'C-h k' answer from the table (prose.test.ts:828-845), and style.css gives the message cell its own wrapped line below 520px (style.css:507-530). But the criterion is an observable at 390 CSS pixels on the real engine, the same CSS applies text-overflow: ellipsis and white-space: nowrap to that cell — so an over-budget message would be clipped, not wrapped — jsdom has no layout to measure with, and the manual rows that prove it (M-4) are all unticked. Unverified, not failed.
  evidence: src/prose.ts:43 — "export const MODELINE_BUDGET = 52;"
  evidence: src/prose.test.ts:828-845 — "keeps every prompt and message inside the modeline's budget … expect(message, message).not.toContain("\n"); expect(message.length, message).toBeLessThanOrEqual(MODELINE_BUDGET);"
  evidence: src/style.css:507-530 — "@media (max-width: 520px) { .modeline { flex-wrap: wrap; … } .modeline-message { flex: 1 0 100%; overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; } }"
  evidence: src/prose.test.ts:796-802 — "pressKey("c", ["M"]); expect(said[said.length - 1]).toBe("M-c is Capitalise word");"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051938278499.md:583-587 — "- [ ] `M-z`: the prompt `Zap to char:` sits on one line in the modeline, whole, with nothing elided. … - [ ] Nothing scrolls sideways anywhere on the surface at any point above."
- ac-8 — MET_WITH_CONCERNS: The sweep is green at HEAD with the seventeen rows in the table and no exemption written for any of them: every row has an id, a label and a chord (test 280-286), no two rows share a chord within a scope (337-370), no chord is both listed and suppressed (372-378), every keymap-answered chord is a row or suppressed (468-509), every step of every modified editor chord is claimed by the Emacs handler (713-753), and every chord matches the event it arrives as (520-535). Concerns: two sweep tests were tightened in the delivered range for intent 30's other-window fix (per-scope index; other-window chords unique across scopes), so 'unchanged' holds for the prose rows but not for the sweep text; and 'reaches the editor rather than the web view or the platform' is provable in jsdom only up to the handler claiming a synthesised event — the platform half is manual rows M-1 and M-3, all unticked.
  evidence: src/emacs-keys.test.ts:280-286 — "gives every action an id, a label, and at least one chord"
  evidence: src/emacs-keys.test.ts:468-509 — "answers no chord the table does not list … const listed = chordIndexIn("editor"); … expect(unnamed).toEqual([]);"
  evidence: src/emacs-keys.test.ts:713-753 — "claims every step of every modified chord the page owns … expect(unclaimed).toEqual([]); … expect(swept.length).toBeGreaterThan(60);"
  evidence: src/emacs-keys.test.ts:420-441 — "expect(emacsAnsweredChords().has(canonicalChord(chord)), id).toBe(true);"
  evidence: src/keys.ts:977-996 — "export const SUPPRESSED: readonly Suppression[] = [ { chord: "M-;" … }, { chord: "s-/" … }, { chord: "C-h", where: "codemirror" … } ];"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051938278499.md:573-577 — "- [ ] `M-x` opens the command palette; nothing of the system's opens, and the log shows the chord claimed. … - [ ] `M-Space` reaches Editor rather than the input-source switcher."
- ac-9 — MET_WITH_CONCERNS: Five of the six disciplines are cited: byte-fidelity by ac-2's before/after assertions plus the CRLF fill test and the unchanged hazardous-chapter round trip; no machine in the document because no command writes a path, name or date and fill_column is a number (metadata.rs:52); one source because the palette reads BINDINGS and formsVisibleIn and a source sweep proves it copies neither; degrade gracefully by the opensBlock guard and its test; network by the existing test that presses every non-shell row and records no request. Concern: 'legible on three device classes' rests on the character budget and CSS alone — the three-width measurement is manual M-4, unticked (see ac-7).
  evidence: src/prose.test.ts:412-441 — "fills a paragraph in a document whose line ending is CRLF"
  evidence: src/emacs-keys.test.ts:888-939 — "opens a hazardous chapter and saves it byte for byte"
  evidence: src-tauri/src/metadata.rs:51-52 — "/// The column `fill-paragraph` wraps prose at. Absent means the default 80. pub fill_column: Option< u32>,"
  evidence: src/command-palette.test.ts:262-272 — "copies neither table … expect(/\bchords:/.test(source)).toBe(false); expect(source).toContain("./keys");"
  evidence: src/prose.ts:220-227 — "export function opensBlock(word: string): boolean { return ( /^[#>\-+*|:=]/.test(word) || /^\d+[.)]/.test(word) || word.startsWith("\`\`\`") …"
  evidence: src/prose.test.ts:327-357 — "never wraps a line so that a word opens a block construct"
  evidence: src/emacs-keys.test.ts:957-1031 — "attempts no network request while editing … for (const binding of BINDINGS) { if (binding.owner === "shell" || binding.owner === "app") continue; for (const chord of binding.chords) pressSequence(app.view, chord);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051938278499.md:589 — "- [ ] Repeat every row of M-4 at 820 and 1280 pixels."

Gap audit:
- honoured:
  - Seventeen more rows in the same table the keys panel already shows, each a row and a function
    evidence: src/keys.ts:787-912 — "The prose vocabulary: the commands an Emacs writer's hands already know."
    evidence: src/emacs.ts:84-105 — ""fill-paragraph", "transpose-words", … "quit","
    evidence: src/app.ts:487-537 — ""fill-paragraph": () => { prose(() => fillParagraph(view, proseOptions())); }"
  - M-q reflows one paragraph to the fill column; the paragraph above and the table below are the bytes they were
    evidence: src/prose.ts:345-373 — "`M-q`: fill the paragraph the cursor is in, and nothing else."
    evidence: src/prose.test.ts:169-201 — "expect(text.startsWith(before)).toBe(true); expect(text.endsWith(after)).toBe(true);"
  - M-/ completes from the document's own words and pressing again cycles
    evidence: src/prose.ts:683-715 — "export function dabbrevExpand(view: EditorView): string | null"
    evidence: src/prose.test.ts:641-659 — "expands a word from the document's own words and cycles back to what was typed"
  - M-x lists the binding table's commands and the insert palette's constructs, filtered as she types, running the chosen one; C-c i still opens the insert palette
    evidence: src/command-palette.ts:50-78 — "for (const binding of BINDINGS) { … } for (const form of formsVisibleIn(PALETTE_PHASE)) {"
    evidence: src/command-palette.test.ts:243-251 — "inserts a construct chosen from the same list … toBe("::: {.notes}")"
    evidence: src/emacs-keys.test.ts:1187 — "opens the insert palette on C-c i"
  - C-h k and a chord name it in the modeline, reading a prefix chord as one sequence
    evidence: src/prose.ts:819-836 — "hooks.announce(`${chord} is ${row.label}`);"
    evidence: src/emacs-keys.test.ts:1274-1292 — "reads a prefix chord into the C-h k prompt … "C-x C-s is Save the chapter""
  - M-z prompts in the modeline and the kill is on the one kill ring, so C-y yanks it back
    evidence: src/emacs.ts:411-416 — "export function killSelection(view: EditorView): boolean { const command = EmacsHandler.commands["killRegion"];"
    evidence: src/emacs-keys.test.ts:1294-1305 — "zaps to a character read through the prompt, and yanks it back"
  - C-x C-c asks before quitting when the chapter has unsaved changes
    evidence: src/app.ts:429-451 — "With nothing unsaved it quits. With unsaved edits it asks in the overlay host"
    evidence: src/emacs-keys.test.ts:1307-1336 — "asks before C-x C-c quits and keeps the edits on C-g"
  - M-x and M-/ come off the suppression list because they now have something behind them
    evidence: src/keys.ts:977-996 — "export const SUPPRESSED"
    evidence: src/emacs-keys.test.ts:461-465 — "expect(suppressed).not.toContain("M-x"); expect(suppressed).not.toContain("M-/");"
  - The fill column is a document setting defaulting to 80
    evidence: src-tauri/src/metadata.rs:180-193 — "reads_the_fill_column_a_document_states … leaves_the_fill_column_absent_when_the_document_says_nothing"
    evidence: src/app.ts:383-389 — "fillColumn = DEFAULT_FILL_COLUMN; … if (typeof stated === "number" && stated > 0) fillColumn = stated;"
    evidence: docs/how-to-edit-prose-with-emacs-commands.md:22-26 — "fill_column: 72 … A document that says nothing is filled at 80."
  - The Markdown is what it was: no command writes machine state into the document
    evidence: src/prose.ts:4-8 — "Every command here is a plain function of a view and an options record."
    evidence: src/emacs-keys.test.ts:888-939 — "opens a hazardous chapter and saves it byte for byte"
- diverged:
  - Editor asks before it quits 'exactly as closing a chapter does'
    evidence: src/app.ts:429-451 — "asks in the overlay host rather than through a native dialog"
    evidence: src/main.ts:73-75 — "confirmDiscard(question) { return confirm(question, { title: "Editor", kind: "warning" }); }"
    evidence: .abcd/work/DECISIONS.md:120 — "The close path is left as it is; adopting the overlay there is a later intent's decision."
  - A palette lists every command the binding table carries
    evidence: src/command-palette.ts:53-61 — "if (binding.owner === "shell") continue; … if (scopeOf(binding) !== "editor") continue;"
    evidence: .abcd/work/DECISIONS.md:131 — "`M-x` offers `editor`-scope rows only, and `runBinding` refuses any other scope before it looks at a chord."
  - M-q declines inside a fenced div, a pipe table, a code fence, or a heading
    evidence: src/prose.ts:160-171 — "list: "Fill does not apply inside a list", quote: "Fill does not apply inside a quotation", image: "Fill does not apply on an image", rule: …, comment: …, html: …"
    evidence: docs/how-to-edit-prose-with-emacs-commands.md:28-33 — "Inside a fenced div, a pipe table, a fenced code block, a list, a quotation, or on a heading, it changes nothing"
  - Seventeen new commands, seventeen more rows — while ac-1 names eighteen actions
    evidence: src/keys.ts:509-517 — "id: "mark-word", label: "Mark the next word", chords: ["M-S-2"], group: "selection", owner: "keymap""
    evidence: src/emacs-keys.test.ts:442-447 — "The eighteenth action the criterion names keeps the row it had"
  - Nothing about how keys are handled changes; only rows and functions are added
    evidence: src/overlay.ts:43 — "onKey?(event: KeyboardEvent): boolean;"
    evidence: src/overlay.ts:147 — "const keyTarget: EventTarget = hooks.onKey ? window : document;"
    evidence: .abcd/work/DECISIONS.md:130 — "An overlay that loses the keyboard is closed, not left open. … `focus.ts`'s `panelTarget.release` now closes the overlay"
- missing:
  - The chords reach the editor rather than the web view or macOS on a real Mac keyboard (M-x, M-/, M-@, M-Space, the dead keys M-e and M-a)
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051938278499.md:538-577 — "- [ ] `M-q` in a paragraph — the paragraph reflows at 80 … - [ ] `M-Space` reaches Editor rather than the input-source switcher."
    evidence: .abcd/work/issues/resolved/iss-2609051914327928-emacs-chords-with-meta-on-the-option-key-are-unproven-on-a-r.md:38-40 — "Awaiting the maintainer's confirmation on a real keyboard before this issue is resolved."
  - The modeline at 390 CSS pixels shows each prompt and answer on one line, nothing clipped, nothing scrolling
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051938278499.md:579-589 — "**M-4 — the 390-pixel window.** … every row unticked"
    evidence: src/style.css:523-529 — ".modeline-message { … text-overflow: ellipsis; white-space: nowrap; }"
  - The window goes on C-x C-c in the running shell, dirty and clean, and the fill column is read from a real document.yaml
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051938278499.md:591-606 — "**M-5 — `C-x C-c` closing the real window, dirty and clean.** … **M-6 — the fill column read from the document.**"

Scope-condition dispositions:
- cond-2609051938271571 — untested: The desktop-shell-on-macOS assumption — that the shell claims the combinations the platform would otherwise take — was exercised only under jsdom with synthesised events carrying macOS's composed characters (src/emacs-keys.test.ts:1604-1817, e.g. '≈' on KeyX for M-x); the rows that would prove it on the real Tauri web view (M-1, M-2, M-3 of the checklist) are all unticked, and iss-2609051914327928 was resolved while still recording 'Awaiting the maintainer's confirmation on a real keyboard'. Neither exercised nor contradicted on the platform the condition names.
- cond-2609051938270695 — survived: Every command is a function of the EditorView over one chapter's Markdown; the palette runs editor-scope rows only; nothing in prose.ts or command-palette.ts touches a rendering, a reader, or a publish path.
  evidence: src/prose.ts:4-8 — "Every command here is a plain function of a view and an options record. … nothing in this module reaches the DOM except the two commands that have to read a key"
  evidence: src/command-palette.ts:18-24 — "import { formsVisibleIn … } from "./core/inserts"; import { runBinding } from "./emacs"; import { BINDINGS, scopeOf … } from "./keys";"
- cond-2609051938279075 — survived: The seventeen rows are entries of the one BINDINGS table in src/keys.ts, bound through the same APP_COMMAND_IDS route every Editor-owned row takes, and the palette is proven by a source sweep to hold no second list of ids or chords.
  evidence: src/keys.ts:780-786 — "// The prose vocabulary: … Every chord is written from the physical key, as `mark-word` already is"
  evidence: src/emacs.ts:81-105 — "// The prose vocabulary. Each is a function of the view in `src/prose.ts`; the application wires it"
  evidence: src/command-palette.test.ts:262-272 — "copies neither table"
- cond-2609051938271627 — survived: Exactly seventeen rows were added, all from the research note's tier one; no heading-movement, folding, promotion, narrowing, occur or chapter-switch command appears in the table or in prose.ts.
  evidence: src/emacs-keys.test.ts:425-441 — "expect(tier).toHaveLength(17);"
  evidence: src/keys.ts:787-912 — "fill-paragraph … transpose-words … transpose-lines … capitalize-word … backward-sentence … forward-sentence … backward-paragraph … forward-paragraph … delete-indentation … just-one-space … delete-horizontal-space … zap-to-char … dabbrev-expand … command-palette … describe-key … move-to-window-line … quit"
- cond-2609051938271592 — narrowed: The boundary held for the three things it names as intent 2's — the table's shape (Binding, chordFromEvent and the notation are untouched; only rows and two SUPPRESSED entries changed), the keys panel, and the sweep (its prose-relevant tests are byte-identical to before the feature commit) — but the overlay mechanism that carries intent 2's cancel contract was extended by this delivery: overlay.ts gained an onKey hook whose prompts listen on the window rather than the document, openListOverlay was extracted for the palette and the quit question, and c0a856f made focus.ts close any overlay on cycle-away.
  narrowing: holds for the binding table's shape, the keys panel and the conformance sweep; it does not hold for the overlay/cancel mechanism, which this intent extended rather than merely used
  evidence: src/overlay.ts:43 — "onKey?(event: KeyboardEvent): boolean;"
  evidence: src/overlay.ts:147 — "const keyTarget: EventTarget = hooks.onKey ? window : document;"
  evidence: src/overlay.ts:287 — "export function openListOverlay< T extends ListEntry>("
  evidence: .abcd/work/DECISIONS.md:122-124 — "`overlay.ts` gains one optional `onKey` hook … An overlay carrying an `onKey` hook listens for keys on the window rather than on the document"
  evidence: src/emacs-keys.test.ts:713-753 — "claims every step of every modified chord the page owns (unchanged since c4296ab)"
- cond-2609051938278797 — survived: The insert forms are listed under M-x as insert:< id> entries and run through palette.ts's own insertForm; the C-c i chord and what a form writes are untouched — palette.ts moved onto the shared list overlay while src/palette.test.ts is unchanged since before the feature commit and the C-c i app test still passes.
  evidence: src/command-palette.ts:69-76 — "for (const form of formsVisibleIn(PALETTE_PHASE)) { entries.push({ id: `${INSERT_PREFIX}${form.id}`, label: form.label, binding: null, form, }); }"
  evidence: src/command-palette.ts:131-134 — "if (entry.form) { return insertForm(view, entry.form) ?? `Inserted ${entry.form.label}`; }"
  evidence: src/emacs-keys.test.ts:1187 — "opens the insert palette on C-c i"
- cond-2609051938279178 — survived: M-r moves the cursor to the line halfway down the view keeping its column and changes no byte; none of the seventeen commands moves focus out of the text, and the M-x and C-h k tests assert the pane stays the editor.
  evidence: src/prose.ts:587-597 — "export function moveToWindowLine(view: EditorView): string | null { … const block = view.lineBlockAtHeight(top + height / 2);"
  evidence: src/prose.test.ts:622-632 — "keeps the column and changes not one byte"
  evidence: src/emacs-keys.test.ts:1282-1284 — "press(app.view, "C-x"); expect(document.querySelector(".prompt")).not.toBeNull(); expect(app.focus.pane).not.toBe("sidebar");"
- cond-2609051938272027 — survived: fill_column is an optional field of DocumentMetadata parsed from document.yaml with a Rust test for a stated value and for absence, mirrored as number | null in doctree.ts, read beside the title in app.ts with 80 standing when the file is absent, silent, or unreadable, and fillParagraph defaults to 80 when no column is passed.
  evidence: src-tauri/src/metadata.rs:180-193 — "parse_metadata("title: The Lantern Papers\nfill_column: 72\n") … assert_eq!(metadata.fill_column, Some(72)); … assert_eq!(DocumentMetadata::default().fill_column, None);"
  evidence: src/doctree.ts:74 — "readonly fill_column: number | null;"
  evidence: src/app.ts:383-389 — "fillColumn = DEFAULT_FILL_COLUMN; … if (typeof stated === "number" && stated > 0) fillColumn = stated;"
  evidence: src/prose.ts:33 — "export const DEFAULT_FILL_COLUMN = 80;"
- cond-2609051938277046 — survived: The seventeen rows ship as static entries of the one table on the same terms as every other row; nothing delivered rebinds a chord at runtime, persists a binding, or offers an alternative binding set, and the how-to page still directs a change to the table itself.
  evidence: src/keys.ts:787-912 — "chords: ["M-q"] … chords: ["C-x C-c"] (literal rows, no rebinding surface)"
  evidence: docs/how-to-edit-prose-with-emacs-commands.md:7-9 — "Every chord below has a row in the binding table, so `C-h b` lists it and `C-h k` names it. To change one, see [Find and change the keys]"
## Grounds

- pursued: the thirteen tier-one chords are what an Emacs writer's hands already know, so adding them removes the last reason to leave the app; wrong if the maintainer keeps editing in Emacs anyway
