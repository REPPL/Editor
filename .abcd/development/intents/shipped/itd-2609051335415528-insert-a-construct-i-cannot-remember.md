---
id: itd-2609051335415528
slug: insert-a-construct-i-cannot-remember
spec_id: spc-2609051353398011
kind: standalone
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: editing-surface
supersedes: [itd-2609051221553568, itd-2609051317429272]
---

# Insert a construct I cannot remember

## Press Release

Alice wants the next slide to hold two columns. She does not remember how
a columns div is written, and she does not have to. She presses one chord,
the insert palette opens, she types "col", and Return puts the exact form
at her cursor — the outer div, both column divs with their widths, the
closing fences — with the cursor sitting inside the first column, where
the words go. She types. The palette has closed and taken nothing with it.

The palette lists the constructs the canon defines: divider, columns,
speaker notes, callout, margin aside, credit, variant block, variant
span, video block, citation, footnote, page break, easter egg, and
opening quotation. Each writes the canonical
form and nothing else. It is the only place the syntax has to live in
anyone's memory, which is why Alice can write in a deliberately verbose,
plain-Markdown canon without ever having learned it — and why what lands
in her chapter is something Emacs and any other Markdown tool read
happily.

The palette is an overlay like every other overlay in Editor: it takes the
keyboard while it is open, moves with the same chords as the text, and
closes on the same cancel chord. Alice never reaches for the mouse and
never leaves the chapter. When a construct's rendering arrives in a later
phase, the palette gains an entry — Alice does not gain a thing to
remember.

## Why This Matters

The canon is verbose on purpose. Every extension is a fenced div with
attributes, a heading or image attribute, or an HTML comment, precisely so
that Emacs, Pandoc, and any plain renderer can read the file and degrade
gracefully — and `03-evidence.md` records the cost of that choice in the
same breath: "more verbose source; the author needs the insert palette to
remember it". Without the palette the canon is a private dialect Alice
mistypes, or worse, invents around, and the prototypes show her doing
exactly that when the syntax is not to hand. The palette is what makes the
plain-tool guarantee affordable to the person paying for it.

## Mechanism

- We expect the palette to remove the memory burden rather than move it
  because it writes the forms `05-internals.md` section 3 spells out
  character for character, so what Alice must recall is a construct's
  name, which she has, rather than its punctuation, which she has not.
- We expect a palette entry to be testable without a screenshot because
  the inserted text parses to the node the mapping table in
  `05-internals.md` section 3 describes, with its attributes exactly as
  written, and serialises back byte for byte. An entry that produces
  something the core does not recognise fails a unit test, not a review.
- We expect a small, fixed set to be enough because the slide prototype's
  fifty hand-written slides reached for precisely this set: rules between
  slides, a column split, comments carrying layout and credit, and
  speaker notes (`03-evidence.md`). The palette names them rather than
  inventing new ones.
- We expect the palette to be usable without the mouse because overlays
  in the keyboard-navigation prototype own the keyboard while open and
  navigate with the same chords as the main view, cancelling on the same
  chord (`03-evidence.md`;
  `2026-09-05-prototype-keyboard-navigation.md`).
- We expect this to prevent dialect drift because the palette is the only
  writer of these forms in the app, so there is one implementation of each
  construct's spelling and a change to the canon is a change in one place
  (ADR `adr-2609051324147479`, which rejects a private dialect "in favour
  of an insert palette that makes the canonical forms one key away").

## Scope Conditions

- Platform: the desktop app only — a Tauri 2 shell around the macOS <!-- cond: cond-2609051353399760 -->
  system web view (`02-constraints.md`). The palette is frontend, so the
  code is shared, but no other host is claimed here.
- Population: Alice, one author, editing one chapter. The palette acts at <!-- cond: cond-2609051353399534 -->
  the cursor in the chapter she has open.
- Phase: seeded with the slide constructs, because phase 1 is the deck <!-- cond: cond-2609051353392265 -->
  (`06-delivery.md`; `07-intent-map.md`) — the horizontal rule split, the
  divider heading attribute, columns, speaker notes, and credit. An entry
  is added when its construct's rendering arrives; that addition is an
  entry, not a new intent. The full list the palette carries once every
  phase has landed is divider, columns, speaker notes, callout, margin
  aside, credit, variant block, variant span, video block, citation,
  footnote, page break, easter egg, and opening quotation.
- Boundary with the intents that define constructs — map #6, <!-- cond: cond-2609051353398378 -->
  `itd-2609051335458626`; map #9, `itd-2609051335489928`, which owns the
  callout and the margin aside; map #11, `itd-2609051335502171`; map #12,
  `itd-2609051335518134`; map #14, `itd-2609051335537470`; map #16,
  `itd-2609051335568936`; and map #21, `itd-2609051336019782`: each of
  those owns what its construct means in a rendering. 3 owns only that
  the canonical form appears at the cursor, correct and complete. What a
  `.notes` div does to a deck, what a callout or a margin aside looks
  like on the page, what `[@key]` resolves against, what a variant block
  hides — all out of scope here.
- Bundle: member of the Editing surface bundle with map #1, <!-- cond: cond-2609051353396605 -->
  `itd-2609051335399446`, and map #2, `itd-2609051335406422`. One spec —
  a canon nobody can type is a canon nobody uses.
- Plumbing inherited, not owned: the canon itself, which is <!-- cond: cond-2609051353396144 -->
  `05-internals.md` section 3, and the parse and serialise path that
  proves an inserted form round-trips.

## Acceptance Criteria

- Given the cursor is on a blank line in a chapter, When Alice opens the
  palette and chooses Columns, Then the text inserted is exactly the
  columns form of `05-internals.md` section 3 — outer `::: {.columns}`,
  two `::: {.column width="50%"}` blocks, and their closing fences — and
  the cursor sits inside the first column's body.
- Given the cursor is anywhere in a chapter, When Alice chooses Speaker
  notes, Then a `::: {.notes}` block with its closing fence is inserted
  with the cursor on its body line, and no other line of the chapter has
  changed.
- Given the cursor is on the line `## Interlude`, When Alice chooses
  Divider, Then the heading reads `## Interlude {.divider}` and no new
  block is inserted above or below it.
- Given a chapter into which every construct the palette lists has been
  inserted once, When the chapter is parsed and serialised without
  editing, Then the file returns byte for byte, and each construct parses
  to the node the mapping table in `05-internals.md` section 3 names,
  with its attributes exactly as written.
- Given the palette is open with "col" typed into it, When Alice presses
  the cancel chord, Then the palette closes, nothing is inserted, and the
  chapter is byte for byte what it was — and the same holds for Escape.
- Given a chapter holding one of every palette construct, When it is
  rendered by a plain Markdown tool that knows none of these extensions,
  Then the tool renders every paragraph and reaches the end of the file:
  no construct stops it and none swallows the text that follows it.
- Given the palette lists an entry, When that entry's inserted form is
  compared against `05-internals.md` section 3, Then it matches a form
  written there; the palette offers no construct outside the canon.
- Given the desktop app window narrowed to iPad width (820 CSS px), and
  again at iPhone width (390 CSS px) and desktop width (1280 CSS px),
  When Alice opens the palette and filters it by typing, Then the list
  and its labels are fully legible at every one of the three widths with
  no horizontal scrolling and no pinch zoom, and Return still inserts at
  the cursor.
- Inherits: round-trip byte-fidelity (`itd-2609051336074533`); no machine
  in the document (`itd-2609051336080960`); one source, always
  (`itd-2609051336090390`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); legible on three device classes
  (`itd-2609051336128348`); network only on publish
  (`itd-2609051336158553`).

## Open Questions

- Whether the video block the palette inserts can name a poster when
  Alice supplies none: `03-evidence.md` leaves open "which poster frame a
  video block uses when the author supplies none", which decides whether
  the palette's video entry writes a `poster` attribute at all.
- Whether the easter-egg entry may write a variant-marked block:
  `03-evidence.md` leaves open "whether easter-egg content can itself be
  a variant-marked block", which decides whether one palette choice can
  produce a nested pair of divs.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-04d6e441c952 -->
Fidelity review — receipt rcp-04d6e441c952 (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:26f8290996a68d169eab15aa3c0279e6b40030f1e892df1605261bca55c03548
Input attestations: diff:e41596a^..HEAD@sha256:6343ab4e968dd2ce947b393ad874bb85af80f3bbb074f2d20e2e98bfd2353d7e;

Acceptance rollup: MET 4 · MET_WITH_CONCERNS 4 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: inserts.ts:127-128 carries the columns form character for character as 05-internals.md section 3 writes it (outer .columns, two .column width="50%" divs, closing fences); on a blank line insertionFor adds no prefix or suffix (palette.ts:85-89) and palette.test.ts:117-135 asserts the buffer equals SAMPLE with form.text spliced in and the cursor on line 7, the first column's body line; test suite passes at HEAD
  evidence: src/core/inserts.ts:128 — "'::: {.columns}\n::: {.column width="50%"}\n▮\n:::\n::: {.column width="50%"}\n\n:::\n:::\n'"
  evidence: src/palette.test.ts:126 — "SAMPLE.slice(0, at) + form.text + SAMPLE.slice(at)"
  evidence: src/palette.test.ts:133 — "expect(line.number).toBe(7)"
  evidence: .abcd/development/brief/05-internals.md:164 — "::: {.columns}"
- ac-2 — MET_WITH_CONCERNS: inserts.ts:156 writes '::: {.notes}\n▮\n:::\n'; palette.test.ts:137-150 asserts line 3 is unchanged, lines 5 and 7 are the fences, and the cursor sits on the empty body line 6; palette.test.ts:212-250 asserts every byte outside the insertion is the chapter as it was. Concern: 'anywhere in a chapter' is proven on a blank line only — with the cursor mid-line, palette.ts:85-89 splits the cursor's line around the block (prefix "\n\n", suffix "\n"), a spec-signed-off behaviour but a change to that line
  evidence: src/core/inserts.ts:156 — "form: "::: {.notes}\n▮\n:::\n""
  evidence: src/palette.test.ts:144 — "expect(view.state.doc.line(3).text).toBe(before)"
  evidence: src/palette.ts:87 — "const prefix = before.trim() === "" ? "" : "\n\n";"
- ac-3 — MET: palette.ts:69-77 appends form.text (' {.divider}') at the heading line's end and inserts no block, refusing off a heading; palette.test.ts:152-163 asserts the heading reads '... {.divider}', the line count is unchanged at 5 and the whole document equals the one-line replacement; inserts.test.ts:87 parses '## Interlude {.divider}' to a heading carrying class divider
  evidence: src/palette.ts:75 — "const at = line.to;"
  evidence: src/palette.test.ts:159 — "expect(view.state.doc.lines).toBe(5)"
  evidence: src/core/inserts.test.ts:87 — "parseChapter(`## Interlude${form.text}\n`)"
- ac-4 — MET_WITH_CONCERNS: inserts.test.ts:219-240 parses all sixteen forms and asserts node kind, classes, attribute pairs and (for columns) the two .column children; palette.test.ts:212-250 asserts the buffer after each insertion is the original bytes plus the form. Concern: no serialiser exists in the delivered tree (tree.ts:72 says it 'arrives with the serialiser'), so 'parsed and serialised ... returns byte for byte' is satisfied only in the degenerate form the spec signed off — the buffer is the file's text and nothing re-serialises — not by a parse-then-serialise round trip
  evidence: src/core/inserts.test.ts:222 — "expect(node.kind, form.id).toBe(form.expects.nodeKind)"
  evidence: src/palette.test.ts:241 — "expect(text.slice(0, at), form.id).toBe(start.slice(0, at))"
  evidence: src/core/tree.ts:72 — "the fidelity harness that needs one arrives with the serialiser"
- ac-5 — MET: overlay.ts:132-137 closes on every chord of keyboard-quit, which keys.ts:389 defines as ["C-g", "Escape"]; palette.test.ts:180-189 opens the palette, types 'col', presses each chord in turn and asserts the palette is gone and the document equals SAMPLE; emacs-keys.test.ts:948-964 repeats it from the real C-c i chord
  evidence: src/keys.ts:389 — "chords: ["C-g", "Escape"],"
  evidence: src/overlay.ts:132 — "if (chordsOf("keyboard-quit").includes(chord)) {"
  evidence: src/palette.test.ts:187 — "expect(documentText(view)).toBe(SAMPLE);"
- ac-6 — MET: inserts.test.ts:298-324 builds a chapter holding all sixteen forms with prose between them, renders it with an unconfigured MarkdownIt('commonmark'), and asserts every prose paragraph appears in source order, the last paragraph is reached, and the sentinel typed inside each construct survives
  evidence: src/core/inserts.test.ts:302 — "const plain = new MarkdownIt("commonmark");"
  evidence: src/core/inserts.test.ts:310 — "expect(html).toContain("The last paragraph of the chapter.");"
  evidence: src/core/inserts.test.ts:322 — "expect(html, sentinel).toContain(sentinel);"
- ac-7 — MET_WITH_CONCERNS: Compared each of the sixteen forms in inserts.ts:92-308 against 05-internals.md section 3 by hand: the seven offered in phase 1 (slide-split, divider, columns, speaker-notes, credit, page-break, footnote — inserts.test.ts:118-127) match section 3 verbatim, and every held-back row names a section 3 construct; inserts.test.ts:173-217 holds the shapes and class markers against the brief. Concerns: the automated 'spells every construct' check is a substring check on '{.class' and attribute pairs, not a form-equality check; three held-back forms are deliberate reductions the spec records (video without poster/caption and with one 'local:' source, citation as bare key, footnote inline only)
  evidence: src/core/inserts.test.ts:209 — "expect(brief, `${form.id}: ${marker}`).toContain(marker);"
  evidence: src/core/inserts.ts:238 — "form: "::: {.video}\n- local: ▮\n:::\n""
  evidence: .abcd/development/brief/05-internals.md:204 — "::: {.video poster="assets/keynote-poster.jpg" caption="The second half"}"
- ac-8 — INCONCLUSIVE: The only proof of legibility at 390, 820 and 1280 CSS px is manual check M6, and every row of the acceptance checklist is unticked; style.css:226 sizes the overlay at min(560px, 92vw) and style.css:317 sets overflow-wrap: anywhere on rows, which is consistent with the claim but no test or recorded run exercises the three widths, and Return-inserts-at-cursor is only proven in jsdom
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353398011.md:10 — "- [ ] At 1280: `C-c i` opens the palette"
  evidence: src/style.css:226 — "width: min(560px, 92vw);"
  evidence: src/style.css:317 — "overflow-wrap: anywhere;"
- ac-9 — MET_WITH_CONCERNS: Five of six inherited disciplines cite automated proof: byte-fidelity (palette.test.ts:212-250), no machine in the document (inserts.test.ts:242-248), one source (palette.test.ts:264-283 sweep), degrade gracefully (inserts.test.ts:298-324), network only on publish (palette.ts and inserts.ts import no network API; document.test.ts:520-545 stubs fetch/XHR and asserts none). Concerns: 'legible on three device classes' rests solely on unticked manual M6 and is unverified; and the one-source sweep omits drop-target.ts, whose line 76 carries a second literal spelling of the video form as a fallback
  evidence: src/palette.test.ts:279 — "expect(source.includes(":::"), file).toBe(false);"
  evidence: src/core/inserts.test.ts:244 — "expect(form.text, form.id).not.toMatch(/(^|[\s:="])[~/]/);"
  evidence: src/document.test.ts:521 — "it("attempts no network request while a document is open""
  evidence: src/drop-target.ts:76 — "const form = VIDEO_FORM?.text ?? "::: {.video}\n- local: \n:::\n";"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609051353398011.md:13 — "- [ ] At 390: the same"

Gap audit:
- honoured:
  - one chord opens a filterable palette and Return puts the canonical form at the cursor with the cursor where the content goes
    evidence: src/keys.ts:695 — "id: "insert-palette","
    evidence: src/palette.ts:105 — "view.dispatch({"
    evidence: src/emacs-keys.test.ts:948 — "it("opens the insert palette on C-c i""
  - the canon is written once as data and the palette is the app's writer of it
    evidence: src/core/inserts.ts:343 — "export const INSERT_FORMS: readonly InsertForm[] = DRAFTS.map(finish);"
    evidence: src/palette.ts:15 — "import { formsVisibleIn, matchForms,"
  - the palette is an overlay on the shared contract: takes the keyboard, moves on table chords, cancels on the cancel chord
    evidence: src/palette.ts:164 — "overlay = openOverlay({"
    evidence: src/overlay.ts:163 — "document.addEventListener("keydown", onKeydown, true);"
  - typing 'col' reaches Columns first
    evidence: src/palette.test.ts:114 — "expect(offered()[0]).toBe("columns");"
  - every form degrades in a plain CommonMark tool
    evidence: src/core/inserts.test.ts:299 — "renders every paragraph, in order, and reaches the end of the file"
  - a later phase adds an entry by a number, not a form: held-back rows carry their form and tests now
    evidence: src/core/inserts.ts:351 — "export function formsVisibleIn(phase: number)"
    evidence: src/core/inserts.test.ts:128 — "expect(formsVisibleIn(4)).toHaveLength(16);"
- diverged:
  - the press release lists fourteen constructs; the table carries sixteen rows (the rule split and the egg's second form added), recorded in the spec's Risks
    evidence: src/core/inserts.test.ts:107 — "expect(INSERT_FORMS).toHaveLength(16);"
  - the spec and the checklist say phase 1 offers six forms; the delivered palette offers seven, footnote included because canon.ts seeds Footnote in phase 1 and the deck renders it
    evidence: src/core/inserts.test.ts:119 — "expect(formsVisibleIn(1).map((form) => form.id)).toEqual(["
    evidence: src/core/canon.ts:268 — "phase: 1,"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353398011.md:10 — "the six offered labels are"
  - the canon's phase lives in canon.ts rather than as a visibleFrom number on each row as the spec's Construct shape described
    evidence: src/core/inserts.ts:324 — "visibleFrom: phaseOf(draft.canon),"
  - the palette is not the only spelling of a canonical form in the app: drop-target.ts carries a fallback literal of the video form outside inserts.ts, and the one-source sweep does not cover that file
    evidence: src/drop-target.ts:76 — "?? "::: {.video}\n- local: \n:::\n""
    evidence: src/palette.test.ts:268 — "const writers = ["
  - byte-fidelity is proven as buffer equality, not as a parse-then-serialise round trip; no serialiser is delivered
    evidence: src/core/tree.ts:72 — "arrives with the serialiser"
- missing:
  - legibility at 390, 820 and 1280 CSS px with Return still inserting — manual M6 has no ticked row and no automated substitute
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353398011.md:10 — "- [ ] At 1280"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353398011.md:12 — "- [ ] At 820: the same."
  - the whole manual checklist (the six forms in the window, divider refusal in the modeline, plain-viewer degrade) is unrun
    evidence: .abcd/.work.local/logs/acceptance/spc-2609051353398011.md:20 — "- [ ] Slide split on a blank line inserts `---`."

Scope-condition dispositions:
- cond-2609051353399760 — untested: the palette is DOM code exercised only under vitest/jsdom in the delivered range; the one check that runs it inside the Tauri desktop shell is manual M6, which has no ticked row, so the desktop-host assumption was neither exercised nor contradicted
- cond-2609051353399534 — survived: the palette acts on the single EditorView's main selection head and app.ts hands it the one open view, so one author at one cursor in one chapter is exactly what the delivered code assumes
  evidence: src/palette.ts:66 — "const head = state.selection.main.head;"
  evidence: src/app.ts:312 — "openPalette(view, { host: overlayHost, announce });"
- cond-2609051353392265 — survived: phase 1 offers the slide constructs the condition names (rule split, divider, columns, notes, credit) plus page break and footnote, both of which the deck renders in phase 1, so the entry-follows-rendering rule the condition states is what gates visibility; the full sixteen-row table covers every construct the condition lists
  evidence: src/core/inserts.test.ts:119 — "expect(formsVisibleIn(1).map((form) => form.id)).toEqual(["
  evidence: src/core/render/slides.ts:170 — "if (line.kind === "footnote") {"
  evidence: src/palette.ts:27 — "export const PALETTE_PHASE = 1;"
- cond-2609051353398378 — survived: palette.ts and inserts.ts contain no rendering logic; what a construct means lives in canon.ts's placement table and the renderers, and inserts.ts reads only the phase from that table
  evidence: src/core/inserts.ts:23 — "import { rowById } from "./canon";"
  evidence: src/core/inserts.ts:339 — "return row.phase;"
- cond-2609051353396605 — survived: the palette is built on the bundle's shared overlay contract and adds one row to the shared binding table rather than owning either, as a bundle member would
  evidence: src/palette.ts:20 — "import { openOverlay, type Overlay } from "./overlay";"
  evidence: src/keys.ts:697 — "chords: ["C-c i"],"
- cond-2609051353396144 — narrowed: the canon is quoted from 05-internals.md section 3 and the parse path (parse.ts) is inherited and exercised over every form, but the serialise half of the inherited round-trip path does not exist in the delivered tree, so the round-trip proof is parse plus buffer-equality only
  narrowing: holds for the canon text and the parse path; the serialise path the condition assumed is absent, so byte-fidelity is proven by buffer equality rather than by parse-then-serialise
  evidence: src/core/inserts.test.ts:19 — "const INTERNALS = ".abcd/development/brief/05-internals.md";"
  evidence: src/core/tree.ts:72 — "arrives with the serialiser"
## Grounds

- pursued: an insert palette removes the need to remember fenced-div syntax; wrong if authors still hand-type constructs incorrectly or the palette's forms drift from the canon
