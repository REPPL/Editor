---
id: itd-2609061318091323
slug: the-outline-vocabulary-of-emacs-markdown-and-org-modes-headi
spec_id: spc-2609061341298538
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
promoted_from: iss-2609051934113806
origin: extracted-from-record
production_mode: dictated-and-formatted
---

# Move through and reshape the book by heading

## Press Release

Alice is deep in chapter three and wants to check something in chapter
one. She presses `C-x b`, types `intro`, and Editor opens it where she left
the cursor. Back in chapter three she wants to see the shape of the
section she is revising without the rest of the chapter in the way, so she
puts the cursor on its heading and presses `C-x n n`; every other line
drops out of the window. `C-x n w` brings them back exactly as they were —
narrowing never touched the file, only what the window shows of it.

She reorganises the section. It belongs one level deeper, so she presses
`C-c Right`, and it and everything under it demote together, `##` becoming
`###` all the way down. She decides it should come before its neighbour
instead of after, and `C-c Up` swaps the two, subtree included, without
her retyping a word. Moving between headings is `C-c C-n` forward and
`C-c p` back; staying at the same level is `C-c C-f` and `C-c C-b`; going
up to the section's own parent is `C-c C-u`. On a long heading she presses
`Tab` and its body folds to one line; `S-Tab` folds the whole chapter down
to its outermost headings so she can see its shape at a glance, and `Tab`
on the one she wants opens it again.

She marks a phrase with `C-c C-s b` and it comes back bold, a word with
`C-c C-s i` and it comes back italic. She drops in a link with `C-c l` and
an image with `C-c C-i`, each leaving the cursor exactly where the next
thing she types belongs. She has used a word somewhere earlier and cannot
remember where, presses `M-s o`, types it, and a list of every line that
holds it appears; she picks one and the cursor is there, having changed
nothing. When chapter three is done she presses `C-x C-k`; it has unsaved
edits, so Editor asks first, in the window rather than a system dialog.
She saves, presses it again, and the window returns to no chapter open —
the sidebar and the folder are exactly where they were.

None of this touches Present, Publish or the key log: `C-c C-p`, `C-c C-l`
and `C-x k` still reach the commands Alice already presses without
thinking, because those chords were shipped and documented first and the
new vocabulary was fitted around them rather than through them. Nothing
about the document changes underneath any of it, either: promote, demote
and move rewrite only the heading lines and the lines they carry with
them, narrowing hides nothing from the file that reaches disk, and the
twenty-one new rows are twenty-one more rows in the same table the keys
panel already shows.

## Why This Matters

Tier one gave Alice the sentence and the paragraph; it left the heading
untouched. A five-level book — Part, Chapter, Section, Sub-section,
Sub-sub-section — is held in the head as an outline, not as a wall of
prose, and an editor that answers "reflow this paragraph" but not "move
this section before its neighbour" or "show me the shape of this chapter"
still sends Alice back to a mouse and a lot of scrolling the moment she
stops writing sentences and starts reorganising them. The research note
that ranked this vocabulary put it plainly: tier one is what a writer's
hands do sentence by sentence, and tier two is what they do when the
chapter itself needs reshaping. Shipping the first without the second
answers half of "Emacs bindings I already know."

The four collisions matter for the same reason the vocabulary does: a
chord that sometimes does what Alice expects and sometimes does not is
worse than a smaller table that never surprises her. Settling them now,
with the same rows that create the new pressure on the table, is cheaper
than shipping a vocabulary that quietly breaks three commands she already
relies on.

## Mechanism

We expect this to be the right slice to add now, and not before, because
the research note explicitly ranks it as "tier two: the document model as
an outline (a slice of its own)" — coming after tier one's prose
vocabulary and before tier three's registers, rectangles and macros — and
map entry 32 records that ranking as the reason the outline tier is "a
later intent, decided with the chord conflicts it lists." This intent is
that later intent. It is falsified in the way tier one's own mechanism
already conceded: if a sitting with the app finds Alice reaching past this
list for a tier-three command instead, the ranking was wrong.

We expect promote, demote and the two move commands to hold the
round-trip byte-fidelity discipline (`itd-2609051336074533`) because they
read and rewrite only the affected heading lines, and, for a move, the
two adjacent sections' own lines, directly against `state.doc` — the same
line-indexed approach `fillParagraph` already proved safe for intent 32
(`spc-2609051938278499`: "it rewrites exactly the source lines of the one
parsed paragraph the cursor sits in"). Nothing here re-serialises the
parsed tree, so a byte outside the lines a command names cannot move; this
is falsified by any test that finds a change outside those lines.

We expect folding, cycling and narrowing to carry no byte-fidelity risk at
all, rather than merely being careful about one, because each is a
CodeMirror decoration over an untouched document: `documentText(view)`,
which every save reads, does not consult the fold state or the narrow
range. The file a save writes is the same string whether or not a line is
hidden from the window. This is falsified only if a test is found where
saving while folded or narrowed omits a hidden line — which is exactly
the test the brief asks be run hard, over the hazardous fixture the
text-scale spec already exercises for the same reason.

We expect folding to cost no new dependency because `@codemirror/language`
is already a dependency of the editing surface (`src/editor.ts` already
imports `syntaxHighlighting` and `defaultHighlightStyle` from it), and its
fold machinery — `codeFolding`, `foldEffect`, `foldService` — takes plain
document ranges, not a syntax tree. A `foldService` computed from
`core/parse.ts`'s own blocks, the same tree the sidebar's outline is
derived from (`core/outline.ts`: "There is one parse... not a second,
lighter read of the same file"), satisfies the one-source discipline
(`itd-2609051336090390`) without asking CodeMirror's own Markdown grammar
what a heading is. This is falsified if `foldable()` is found consulting
the syntax tree instead of the registered service for a heading line.

We expect the four conflicts to be settled correctly by keeping whichever
meaning is already shipped and documented, and moving the new vocabulary's
chord instead, because the incumbents are load-bearing in ways the note's
two candidate answers per conflict do not have to disturb: `C-c C-p`
(present) and `C-c C-l` (publish) are named in `docs/tutorial-your-first-
talk.md`, `docs/explanation-the-document-model.md` and `docs/how-to-
connect-the-production-repository.md`, and `C-c C-l` is exported as
`PUBLISH_OPEN_CHORD` from `src/publish-panel.ts` for its own panel copy;
`C-x k` (the key log) is named in `docs/how-to-find-and-change-the-keys.md`
and `docs/spike-emacs-keys.md`. Moving any of the three would mean editing
every one of those places for a maintainer's existing muscle memory, at a
cost the newly-arriving outline commands do not have to impose. This is
falsified if the maintainer says, on using it, that the outline commands
are the ones their hands reach for on those three chords and Present,
Publish or the key log are the ones that now feel wrong.

We expect switching chapters by name to need no new mechanism because
`app.chapters` and `app.openChapter` already exist for the sidebar
(`itd-2609051335399446`), and `openListOverlay` already exists as the one
filterable-list contract the command palette and the quit confirmation
both use (`itd-2609051934109483`). This is falsified if either is found
to assume the sidebar or the palette is its only caller.

## Scope Conditions

- Population: Alice, the sole author, editing one open chapter's Markdown <!-- cond: cond-2609061344229956 -->
  in the desktop app. No moment here belongs to Bob or Carol; nothing
  these commands do reaches a rendering.
- Platform: the desktop app, in the Tauri 2 system web view on macOS, the <!-- cond: cond-2609061344226878 -->
  same platform map entry 2 and map entry 32 scope to; the shell claims
  the chords this vocabulary adds the same way it already claims every
  other row of the binding table.
- Scale: the thirteen rows of the research note's tier-two table — heading <!-- cond: cond-2609061344229690 -->
  movement, same-level movement, up to the parent, folding and outline
  cycling, promote and demote, move a heading with its subtree, bold and
  italic on the region, insert a link and an image, switch chapter by
  name, close the chapter, narrow and widen, occur, and query-replace
  with a regular expression. The chapter list, the tier-two table's other
  named item, is answered by the sidebar toggle map entry 1 already
  bound to `C-x C-b`, not by a new row. Tier three of the research note —
  registers, rectangles, keyboard macros — is out of scope entirely, on
  the note's own recommendation.
- Boundary with map entry 2, `itd-2609051335406422` (the binding table's <!-- cond: cond-2609061344225339 -->
  shape): 2 owns the table's id/label/chords/owner/group shape, the keys
  panel, the cancel contract, and the conformance sweep. This intent adds
  rows to that table and passes under that sweep, and settles the four
  chord conflicts the table already carried before this intent existed,
  recording each settlement as a decision rather than leaving it a
  comment in the research note.
- Boundary with map entry 30, `itd-2609051921482691` (move between the <!-- cond: cond-2609061344229975 -->
  editor and the sidebar): 30 owns reaching the sidebar tree from the
  keyboard and moving within it. This intent's switch-chapter and
  chapter-list moments open and select a chapter from the text; neither
  moves focus into the tree, and the tree is not drawn a second time.
- Boundary with map entry 32, `itd-2609051934109483` (the prose <!-- cond: cond-2609061344223634 -->
  vocabulary): 32 owns the seventeen sentence-and-paragraph commands and
  the `M-x` command palette itself. This intent's rows are listed and run
  by that same palette like every other editor-scope row; none of 32's
  fill, sentence, paragraph or word-completion commands is touched.
- Boundary with map entry 1, `itd-2609051335399446` (the sidebar tree): 1 <!-- cond: cond-2609061344220963 -->
  owns the tree, its badges, and opening a chapter at a heading by
  pointing at it. This intent reaches the same chapters and headings from
  the keyboard and the text; it draws no tree of its own.
- Boundary with map entry 26, `itd-2609051402083398` (the reading views' <!-- cond: cond-2609061344221674 -->
  chords): 26 decides which of this vocabulary's chords, if any, a
  reading view answers. This intent is the editor's alone; nothing here
  reaches the article or the deck.
- Assumption: the binding table's shape and the one overlay cancel <!-- cond: cond-2609061344226854 -->
  contract are what map entries 2 and 32 already built; this intent adds
  to both without changing either's contract, mirroring intent 32's own
  "nothing about how keys are handled changes; only rows and functions
  are added."
- Boundary, excluded as plumbing: narrowing here hides other lines from <!-- cond: cond-2609061344223793 -->
  the window; it does not restrict the cursor, a search, or any other
  command to inside the narrowed section the way Emacs's own
  narrow-to-region restricts the whole buffer. The document, the cursor,
  and every command still reach the whole chapter; only what is drawn
  changes. A true restriction is a later intent's decision if Alice finds
  the visual narrowing is not enough.
- Boundary, excluded as plumbing: `S-Tab` is a two-state cycle — every <!-- cond: cond-2609061344224051 -->
  outermost heading folded, or everything open — rather than Org's exact
  three-state overview/contents/all-levels cycle, which is a heavier
  behaviour tier two's own note does not ask for by name.
- Out of scope: rebinding any of these chords, on the same terms intent <!-- cond: cond-2609061344223035 -->
  32 already ships its own rows under.

## Acceptance Criteria

- **Given** the binding table with this intent's rows added, **when**
  Alice opens the keys panel, **then** every one of the twenty-one new
  actions appears with its label and its chord, and no chord in the
  editor scope is claimed by two rows.
- **Given** a chapter with several headings at different levels, **when**
  Alice presses `C-c C-n`, `C-c p`, `C-c C-f`, `C-c C-b` or `C-c C-u` with
  the cursor variously inside a section's body and directly on a heading,
  **then** the cursor lands exactly on the target heading's line and not
  one byte of the chapter changes; **and when** no heading answers the
  direction asked — no heading after the last one, no sibling at that
  level, no shallower parent — **then** the modeline says so and the
  cursor does not move.
- **Given** the cursor on a heading with a body under it, **when** Alice
  presses `Tab`, **then** the body is hidden from the window and the file
  `documentText` reports is unchanged; **when** she presses `Tab` again,
  **then** the body is shown again; **and when** she presses `S-Tab`,
  **then** every outermost heading's body folds, and pressing it again
  unfolds all of them, in both cases with no byte of the file changed.
- **Given** the cursor on a `##` heading with two `###` headings under it,
  **when** Alice presses `C-c Right`, **then** the heading and both
  children demote to `###` and `####` and every other byte of the file is
  unchanged; **when** she presses `C-c Left` twice from a `#` heading,
  **then** the first promotes nothing changed by the second, and the
  second is refused with a message and changes nothing, because a chapter
  title cannot promote past level one; **and when** the cursor is on a
  heading written as an underlined Setext title, **then** promote and
  demote refuse and change nothing.
- **Given** two adjacent `##` sections, each with its own `###`
  sub-sections, **when** Alice presses `C-c Down` on the cursor in the
  first, **then** the two sections swap in full, subtree included, and
  every byte outside the swapped span is unchanged; **when** she presses
  `C-c Up` on the section that has no earlier sibling at its level,
  **then** nothing moves and the modeline says so.
- **Given** a selected phrase, **when** Alice presses `C-c C-s b`,
  **then** it is wrapped in `**…**` and every other byte is unchanged;
  **given** no selection, **when** she presses `C-c C-s i`, **then** a
  pair of `*` markers is inserted with the cursor between them and
  nothing else on the line moves.
- **Given** a selected word, **when** Alice presses `C-c l`, **then** it
  becomes the link text of `[word]()` with the cursor between the
  parentheses; **given** no selection, **when** she presses `C-c C-i`,
  **then** `![]()` is inserted with the cursor between the square
  brackets; in both cases every other byte of the file is unchanged.
- **Given** a document with three chapters, **when** Alice presses
  `C-x b` and types letters from a chapter's title, **then** a filterable
  list offers it, and choosing it opens that chapter with the cursor
  where she last left it, exactly as clicking it in the sidebar would;
  **and when** she presses `C-g` instead, **then** the list closes and
  the chapter she was in is still open, unchanged.
- **Given** an open chapter with unsaved edits, **when** Alice presses
  `C-x C-k`, **then** Editor asks before closing and `C-g` returns her to
  the text with the edits intact; **when** she saves and presses `C-x
  C-k` again, **then** the window returns to no chapter open with no
  question asked, the sidebar's selection clears, and the file on disk
  holds exactly what was saved.
- **Given** the cursor on a heading with two paragraphs under it and a
  sibling section after it, **when** Alice presses `C-x n n`, **then**
  only the heading and its own two paragraphs remain in the window and
  the sibling section is hidden; **when** she presses `C-x n w`, **then**
  every line is shown again; **and in both states**, saving the chapter,
  or reading `documentText` directly, returns every byte of the file
  including the hidden lines — narrowing never produces a truncated
  write, proven over the hazardous fixture the text-scale spec's own
  round-trip test uses.
- **Given** a chapter using a word in exactly two lines, **when** Alice
  presses `M-s o` and types that word, **then** a list names both lines
  by number and text; choosing one moves the cursor to that line and
  changes no byte; **and when** she cancels instead, **then** the list
  closes and the cursor is where it was.
- **Given** the cursor anywhere in the text, **when** Alice presses
  `C-M-%`, **then** the search panel opens with its replace field
  focused and its regular-expression option already on, ready for a
  pattern rather than a literal string.
- **Given** the binding table before and after this intent, **when** the
  conformance sweep runs, **then** `C-c C-p` still names Present, `C-c
  C-l` still names Publish, and `C-x k` still names the key log, none of
  the three claimed by an outline row; previous-heading answers on `C-c
  p`, insert-link on `C-c l`, and close-chapter on `C-x C-k` instead;
  `M-s` alone opens as a prefix with nothing bound to it directly, `M-s
  o` reaches occur, and no row claims centre-selection's old chord
  because that row is retired; and no chord in the editor scope is
  claimed by two rows.
- Inherits: round-trip byte-fidelity; no machine in the document; one
  source, always; degrade gracefully in a plain tool; legible on three
  device classes; network only on publish.

## Open Questions

- Whether promote, demote and fold should also understand a Setext
  heading (`===` or `---` underlines) rather than refusing on one is left
  open; refusing is the "never guess" answer tier one's own fill command
  already gives to a construct the tree cannot safely rewrite, and this
  stays open until a chapter is found using Setext headings in practice.
- Whether narrowing should grow from a visual aid into Emacs's true
  narrow-to-region, restricting the cursor and every command to inside
  the section, is left open for a later intent if the visual version is
  found not to be enough.
- Whether `S-Tab` should grow into Org's exact three-state overview,
  contents, and all-levels cycle, rather than the two-state version this
  intent ships, is left open.
- Whether occur belongs in the sidebar rather than in an overlay over the
  text is left open; this intent chose the overlay to keep the moment
  small and consistent with the command palette and switch-chapter, which
  already work the same way.
- Which of the two candidate chords the research note offered for each
  conflict should have been chosen is settled here in favour of the
  shipped, documented meaning in every case; whether that reads right to
  the maintainer once they are using the outline vocabulary daily stays
  open until they have.

## Grounds

- pursued: the outline vocabulary of Markdown and Org modes lets Alice move, fold and reshape the book by heading as her hands expect, and settling the four chord conflicts in one table keeps the reading views' vocabulary consistent; wrong if authors navigate by the sidebar alone and never fold or promote a heading
- pursued: the outline vocabulary of Markdown and Org modes lets Alice move, fold and reshape the book by heading as her hands expect, and settling the four chord conflicts in one table keeps the reading views' vocabulary consistent; wrong if authors navigate by the sidebar alone and never fold or promote a heading

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-d4b309cb708b -->
Fidelity review — receipt rcp-d4b309cb708b (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:2e1b2a6492b17085fd11cf29aa35e90139e7d663a6f8e1e6b7df43301ddea49e
Input attestations: diff:c1bcf7b..cae1734@sha256:4a5e182af9d3f4549b332eff9cf5e02954a79320d0844b9f6d74d8d0a15cfc16; intent:.abcd/development/intents/shipped/itd-2609061318091323-the-outline-vocabulary-of-emacs-markdown-and-org-modes-headi.md@-; spec:.abcd/development/specs/closed/spc-2609061341298538-the-outline-vocabulary-of-emacs-markdown-and-org-modes-headi.md@-; checklist:.abcd/.work.local/logs/acceptance/spc-2609061341298538.md (M34-1..M34-5, every row unticked)@-; test-run:npx vitest run src/core/render/article-keys.test.ts src/core/render/reading-keys.test.ts src/emacs-keys.test.ts src/local-documents.test.ts src/preview.test.ts src/export/services.test.ts src/new-document-panel.test.ts src/outline-commands.test.ts src/open-source.test.ts src/focus.test.ts — 10 files, 287 tests passed, 0 failed@-;

Acceptance rollup: MET 9 · MET_WITH_CONCERNS 4 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: the test pins exactly 21 outline rows, each with a non-empty label, its one chord, owner editor and group outline, and a second test asserts no editor-scope chord has two claimants
  evidence: src/outline-commands.test.ts:262 — "lists every outline command in the binding table with a label and a chord"
  evidence: src/outline-commands.test.ts:263 — "expect(OUTLINE_ROWS).toHaveLength(21);"
  evidence: src/outline-commands.test.ts:275 — "gives no chord in the editor scope to two rows"
  evidence: src/keys.ts:989 — "id: "outline-next-heading","
- ac-2 — MET_WITH_CONCERNS: next/previous, same-level forward/backward and up-heading land the cursor on the target heading's line from inside a body and refuse with a message at every end; concerns: the movement tests assert the cursor but not that the document is byte-unchanged (movement is revealLine, a selection-only dispatch), and the refusal is asserted as the returned string rather than on the modeline
  evidence: src/outline-commands.test.ts:311 — "moves to the next and previous heading regardless of level"
  evidence: src/outline-commands.test.ts:321 — "refuses movement with a message when no heading answers the direction"
  evidence: src/outline-commands.test.ts:328 — "moves to the next and previous heading at the same level, refusing across a shallower one"
  evidence: src/outline-commands.ts:139 — "export function nextHeading(view: EditorView): string | null {"
- ac-3 — MET_WITH_CONCERNS: Tab folds and unfolds the section with documentText unchanged, and S-Tab cycles folded and open with documentText unchanged; concern: 'every outermost heading' is delivered as every level-two heading, a recorded decision, so a chapter with no level-two heading folds nothing
  evidence: src/outline-commands.test.ts:363 — "folds and unfolds the section under a heading, changing no byte"
  evidence: src/outline-commands.test.ts:384 — "cycles every level-two heading folded and back open, changing no byte"
  evidence: src/outline-commands.ts:268 — "export function cycleOutline(view: EditorView): string | null {"
  evidence: .abcd/work/DECISIONS.md:153 — "Departed from `spc-2609061341298538`'s first draft for `outline-cycle`"
- ac-4 — MET: demote shifts the heading and both children together with the rest of the file byte-equal, promoting a level-one title is refused unchanged, and a Setext heading refuses both promote and demote unchanged
  evidence: src/outline-commands.test.ts:398 — "demotes a heading and its subtree together"
  evidence: src/outline-commands.test.ts:412 — "refuses to promote a chapter title past level one, unchanged"
  evidence: src/outline-commands.test.ts:426 — "refuses to promote or demote a Setext heading, unchanged"
- ac-5 — MET: moving down swaps the two adjacent sections in full, subtree included, matching a computed swap of exactly those line ranges; a section with no sibling at its level refuses and the document is unchanged
  evidence: src/outline-commands.test.ts:437 — "moves a section down past its sibling, subtree included"
  evidence: src/outline-commands.test.ts:449 — "refuses to move a section with no sibling at its level"
  evidence: src/outline-commands.test.ts:440 — "expect(documentText(view)).toBe(swapped(OUTLINE_CHAPTER, 3, 14, 15, 18));"
- ac-6 — MET: a selection is wrapped in ** and * markers with the rest of the line byte-equal, and with no selection an empty pair is opened with the cursor between the markers
  evidence: src/outline-commands.test.ts:470 — "wraps a selection in bold and italic markers"
  evidence: src/outline-commands.test.ts:482 — "opens empty markers with the cursor between them when nothing is selected"
- ac-7 — MET: a selected word becomes the link or image label with the cursor between the parentheses, and with no selection the empty template is inserted with the cursor inside the square brackets
  evidence: src/outline-commands.test.ts:489 — "inserts a link and an image template, using the selection as the label"
  evidence: src/outline-commands.test.ts:502 — "inserts empty templates with the cursor inside the brackets when nothing is selected"
- ac-8 — MET_WITH_CONCERNS: the overlay filters chapters by title and calls back with the chosen path, C-g cancels with nothing chosen, and app.ts wires the callback to app.openChapter; concerns: no test drives C-x b through the mounted application or asserts the cursor is restored to where it was left (the spec's own mapping names such a test and it does not exist), and M34-5 is unticked
  evidence: src/outline-commands.test.ts:563 — "filters chapters by name and calls back with the chosen path"
  evidence: src/outline-commands.test.ts:575 — "changes nothing when cancelled"
  evidence: src/app.ts:984 — ""outline-switch-chapter": () => {"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061341298538.md:762 — "- [ ] `C-x b`, type part of a chapter's name, choose it"
- ac-9 — INCONCLUSIVE: closeChapter in app.ts opens a confirm overlay when dirty and calls forgetChapter when clean, but no test anywhere in the range exercises it (test files reference only its binding row), the spec's promised app-level test is absent, and M34-5 is unticked
  evidence: src/app.ts:699 — "function closeChapter(): void {"
  evidence: src/outline-commands.test.ts:297 — "expect(bindingById("outline-close-chapter")?.chords).toEqual(["C-x C-k"]);"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061341298538.md:765 — "- [ ] With unsaved edits, `C-x C-k`: Editor asks before closing."
- ac-10 — MET: narrowing hides the lines outside the section and widening restores them with documentText unchanged, and over a hazardous fixture (544-char line, tab indent, trailing spaces, no trailing newline) documentText while narrowed equals the whole file
  evidence: src/outline-commands.test.ts:511 — "hides lines outside the section and restores them on widen, changing no byte"
  evidence: src/outline-commands.test.ts:533 — "never truncates a save while narrowed, over the hazardous chapter"
  evidence: src/outline-commands.ts:612 — "export function narrowToSection(view: EditorView): string | null {"
- ac-11 — MET: occur lists matching lines, choosing one moves the cursor to that line, cancelling changes no byte, and the match is on the line's text not its number
  evidence: src/outline-commands.test.ts:597 — "finds matching lines and moves the cursor to the chosen one"
  evidence: src/outline-commands.test.ts:607 — "changes not one byte when cancelled"
  evidence: src/outline-commands.ts:699 — "export function openOccur(view: EditorView, hooks: { host?: HTMLElement } = {}): Overlay {"
- ac-12 — MET: queryReplaceRegex opens the search panel, sets regexp true on the query and focuses the replace field
  evidence: src/outline-commands.test.ts:585 — "opens the search panel's replace field with the regular-expression option already on"
  evidence: src/emacs.ts:332 — "export function queryReplaceRegex(view: EditorView): void {"
  evidence: src/emacs.ts:343 — "regexp: true,"
- ac-13 — MET: present, publish-open and toggle-key-log keep C-c C-p, C-c C-l and C-x k; previous-heading, insert-link and close-chapter take C-c p, C-c l and C-x C-k; center-selection is gone and no row claims bare M-s; pressing M-s alone changes nothing and M-s o opens occur over the mounted application; the sweep finds no double-claimed chord
  evidence: src/outline-commands.test.ts:285 — "leaves the three incumbents exactly where they were"
  evidence: src/outline-commands.test.ts:300 — "retires centre-selection rather than relocating it"
  evidence: src/outline-commands.test.ts:693 — "presses M-s alone and finds nothing changed, then M-s o and finds occur open"
  evidence: src/emacs-keys.test.ts:339 — "gives no two rows the same chord"
  evidence: src/emacs-keys.test.ts:382 — "reserves the chords other specs will wire, and answers none of them"
- ac-14 — MET_WITH_CONCERNS: byte-fidelity is asserted by documentText comparisons across promote, move, fold, narrow and occur, and one source holds because heading structure is read through core/parse's parseChapter and walkBlocks; concerns: the spec's named one-source test ('derives heading structure from the same parse the sidebar's outline uses') does not exist, and legibility rests on unticked M34-3
  evidence: src/outline-commands.test.ts:553 — "expect(documentText(view)).toBe(hazardous);"
  evidence: src/outline-commands.ts:43 — "import { parseChapter } from "./core/parse";"
  evidence: src/outline-commands.ts:45 — "import { walkBlocks } from "./core/tree";"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061341298538.md:734 — "- [ ] At 390: open the switch-chapter list (`C-x b`)"

Gap audit:
- honoured:
  - the twenty-one new rows are twenty-one more rows in the same table the keys panel already shows
    evidence: src/outline-commands.test.ts:263 — "expect(OUTLINE_ROWS).toHaveLength(21);"
  - C-c C-p, C-c C-l and C-x k still reach Present, Publish and the key log
    evidence: src/outline-commands.test.ts:285 — "leaves the three incumbents exactly where they were"
  - narrowing never touched the file, only what the window shows of it
    evidence: src/outline-commands.test.ts:533 — "never truncates a save while narrowed, over the hazardous chapter"
  - promote, demote and move rewrite only the heading lines and the lines they carry with them
    evidence: src/outline-commands.test.ts:398 — "demotes a heading and its subtree together"
    evidence: src/outline-commands.test.ts:440 — "expect(documentText(view)).toBe(swapped(OUTLINE_CHAPTER, 3, 14, 15, 18));"
  - folding costs no new dependency and reads the one parse
    evidence: src/editor.ts:313 — "...outlineExtensions(),"
    evidence: src/outline-commands.ts:43 — "import { parseChapter } from "./core/parse";"
- diverged:
  - S-Tab folds every outermost heading — delivered as every level-two heading, so a chapter written one level deeper folds nothing
    evidence: src/outline-commands.test.ts:384 — "cycles every level-two heading folded and back open"
    evidence: .abcd/work/DECISIONS.md:153 — "Departed from `spc-2609061341298538`'s first draft for `outline-cycle`"
  - retiring M-s needs no suppression entry (spec Design) — delivered with M-s added to SUPPRESSED and registerEditorChords reordered
    evidence: src/keys.ts:1239 — "chord: "M-s","
    evidence: .abcd/work/DECISIONS.md:152 — "retiring `center-selection`'s `M-s` required adding it to `src/keys.ts`'s `SUPPRESSED`"
  - switch-chapter opens the chapter with the cursor where she last left it — wired to app.openChapter but the cursor restoration is not asserted
    evidence: src/app.ts:984 — ""outline-switch-chapter": () => {"
    evidence: src/outline-commands.test.ts:563 — "filters chapters by name and calls back with the chosen path"
- missing:
  - close-chapter asks before closing when dirty and closes silently when clean — no test exercises it
    evidence: src/app.ts:699 — "function closeChapter(): void {"
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061341298538.md:765 — "- [ ] With unsaved edits, `C-x C-k`: Editor asks before closing."
  - the spec's named one-source test 'derives heading structure from the same parse the sidebar's outline uses'
    evidence: src/outline-commands.test.ts:261 — "describe("the keys panel", () => {"

Scope-condition dispositions:
- cond-2609061344229956 — narrowed: the command functions run only in the editor, but three of this vocabulary's rows (outline-next-heading, outline-previous-heading, outline-occur) are honoured on the article by map #26 in the same range, so the rows themselves do reach a rendering
  narrowing: holds for the command functions in src/outline-commands.ts, which nothing outside the editor calls; the rows' chords and labels reach the reading views through READING_BINDING_IDS
  evidence: src/keys.ts:1639 — ""outline-next-heading","
  evidence: src/keys.ts:1643 — ""outline-occur","
- cond-2609061344226878 — untested: nothing in the range exercises the shell claiming these chords back from the platform on a real keyboard; that is M34-1, unticked
- cond-2609061344229690 — survived: the twenty-one rows cover the thirteen tier-two items and no register, rectangle or macro row was added
  evidence: src/outline-commands.test.ts:263 — "expect(OUTLINE_ROWS).toHaveLength(21);"
  evidence: src/keys.ts:1141 — "id: "query-replace-regex","
- cond-2609061344225339 — survived: rows were added and pass under the existing sweep unchanged, and each conflict settlement is a dated decision line
  evidence: src/emacs-keys.test.ts:339 — "gives no two rows the same chord"
  evidence: .abcd/work/DECISIONS.md:151 — "Settled the four chord conflicts `itd-2609061318091323`"
- cond-2609061344229975 — survived: switch-chapter opens a list overlay over app.chapters and calls app.openChapter; it never focuses the sidebar tree
  evidence: src/outline-commands.ts:660 — "export function openSwitchChapter("
  evidence: src/app.ts:747 — "openSwitchChapter("
- cond-2609061344223634 — survived: the new ids join APP_COMMAND_IDS beside the prose vocabulary's and src/prose.ts is absent from the range's diff
  evidence: src/emacs.ts:135 — ""outline-next-heading","
  evidence: src/emacs.ts:130 — "`src/outline-commands.ts`, wired the same way the prose vocabulary is;"
- cond-2609061344220963 — survived: the outline commands read headings through the one parse and reach chapters through app.chapters; no tree is drawn
  evidence: src/app.ts:747 — "openSwitchChapter("
  evidence: src/outline-commands.ts:60 — "for (const block of walkBlocks(chapter.blocks)) {"
- cond-2609061344221674 — survived: which chords a reading view answers is declared by map #26's READING_BINDING_IDS, not by this module, which imports nothing from the render layer
  evidence: src/keys.ts:1638 — "export const READING_BINDING_IDS: readonly string[] = ["
  evidence: src/outline-commands.ts:43 — "import { parseChapter } from "./core/parse";"
- cond-2609061344226854 — narrowed: the table's shape and the overlay cancel contract are reused (openListOverlay), but retiring M-s required a SUPPRESSED entry and a reordering of registerEditorChords, which the spec's own Design said would be neither needed nor correct
  narrowing: holds for the table's row shape and the overlay cancel contract; the key-handling registration order in src/emacs.ts changed and M-s joined SUPPRESSED
  evidence: src/keys.ts:1239 — "chord: "M-s","
  evidence: .abcd/work/DECISIONS.md:152 — "reordering `src/emacs.ts`'s `registerEditorChords`"
  evidence: src/outline-commands.ts:699 — "export function openOccur(view: EditorView, hooks: { host?: HTMLElement } = {}): Overlay {"
- cond-2609061344223793 — survived: narrowing dispatches a decoration effect only; documentText is unchanged in both states and the cursor is unrestricted
  evidence: src/outline-commands.ts:612 — "export function narrowToSection(view: EditorView): string | null {"
  evidence: src/outline-commands.test.ts:511 — "hides lines outside the section and restores them on widen, changing no byte"
- cond-2609061344224051 — survived: cycleOutline is two-state: unfold all when anything is folded, otherwise fold each level-two heading
  evidence: src/outline-commands.ts:268 — "export function cycleOutline(view: EditorView): string | null {"
  evidence: src/outline-commands.test.ts:384 — "cycles every level-two heading folded and back open, changing no byte"
- cond-2609061344223035 — untested: nothing in the range attempts to rebind any chord, so the exclusion is neither exercised nor contradicted