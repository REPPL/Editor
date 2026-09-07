---
id: itd-2609051402083398
slug: move-through-the-article-by-keyboard
spec_id: spc-2609061318158216
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Move through the article by keyboard

## Press Release

Bob is reading Alice's article on his laptop with a cup of coffee in one
hand. He never touches the trackpad. One chord moves him to the next
Section, one moves him back, one steps through the items inside a Section,
and one opens the contents list so he can jump to a Chapter by name. He
searches the text for the word he half-remembers and steps through the
matches. Whatever is open — the search, the contents list, a panel — one
cancel chord closes it, and so does Escape.

The chords are the chords he already knows from the editing surface. Alice
does not learn one vocabulary for writing and a second for reading, and
neither does anyone she hands the document to: the reading views borrow
the editor's movement, search, and cancel, and claim nothing of their own
invention. A keys panel one chord away lists what is live on the page he
is looking at, so a reader who wants to know what the page can do asks the
page.

Carol reads the same article on her phone. Nothing here is taken away from
her: the page works by touch as it always did, the panel is reachable when
a keyboard is attached, and the chords that do not apply to a page without
a keyboard are simply not offered. And because this is the reading views'
own vocabulary, the deck at the lectern, the article in the single file,
and the rehearsal cards all move the same way.

## Why This Matters

`04-surfaces.md` section 4 promises that Bob can read the whole article
without reaching for the mouse, and until now no moment owned that
promise: the reading views were left to borrow chords nobody had listed.
That is how two vocabularies get built — one in the editor, one improvised
per rendering — and then a reader learns that the deck cancels with one
key and the article with another. It also blocks other work: the rehearsal
deck in map #25 (`itd-2609051336055362`) already assumes next, previous,
and one cancel chord exist and are shared. Naming the reading views'
chords once, in one table, makes the promise testable and gives every
later reading surface something to inherit rather than invent.

## Mechanism

- We expect the reading views to reuse the editor's vocabulary rather than
  invent one because the bindings are frontend data — one table with an
  id, a label, and the chords for each action, read by the keys panel, the
  tooltips, and the acceptance tests alike (`05-internals.md` section 5).
  A reading view therefore declares which entries it honours; it does not
  declare chords of its own. Falsifiable: a chord live on a reading page
  that is absent from the table is a defect.
- We expect one cancel rule to hold on a reading page as it does in the
  editor because the keyboard-navigation prototype proves a single check
  at the head of every overlay's handler cancels a search, a panel, an
  overlay, or a prefix, and that overlays own the keyboard while open and
  move with the same chords as the view beneath them (`03-evidence.md`,
  the keyboard-navigation prototype).
- We expect movement by structure rather than by scroll distance to be the
  right unit because the article's navigation is drawn from the document
  hierarchy and the contents list already follows it (`04-surfaces.md`
  section 4; decision to carry all four levels in the contents). Moving by
  Section is moving through the argument, which is what a reader is doing.
- We expect keyboard reading to cost the reader nothing in privacy because
  the page is static output and nothing about where a reader has moved is
  recorded anywhere but the browser they are moving in (`05-internals.md`
  section 8).
- We expect this to be the one place the reading chords are settled
  because every other reading surface consumes them: the deck at the
  lectern, the article inside the single file, and the rehearsal deck. If
  a second surface has to name a chord this intent did not, the set is
  incomplete rather than the surface special.

## Scope Conditions

- Platform: the published article on the presenter site, the same article <!-- cond: cond-2609061318150599 -->
  in the desktop app's preview, and the same article inside the single
  HTML file, in current Safari and Chromium engines at the three
  legibility widths — 390, 820, and 1280 CSS px.
- Population: Bob and Carol reading with a keyboard attached, and Alice <!-- cond: cond-2609061318153674 -->
  reading her own draft. A reader with no keyboard loses nothing: touch
  and pointer keep working exactly as they do without this moment.
- Assumption: the binding table exists and the reading views declare which <!-- cond: cond-2609061318158331 -->
  of its entries they honour. Which entries those are is the open question
  in `03-evidence.md` this moment closes for the reading views.
- Boundary with map #2, `itd-2609051335406422` (Edit with the Emacs <!-- cond: cond-2609061318158896 -->
  bindings I already know): 2 owns the editing surface's vocabulary, the
  binding table itself, and the shell claiming combinations back from the
  platform. 26 owns which of those entries a reading view honours and what
  each one does to a page that cannot be edited.
- Boundary with map #9, `itd-2609051335489928` (Read the document as a <!-- cond: cond-2609061318159357 -->
  Tufte article): 9 owns the page — layout, margin notes, the contents
  list, images and video in the flow. 26 owns moving through that page by
  keyboard and nothing about how it is laid out.
- Boundary with map #10, `itd-2609051335492327` (Read it the way I like <!-- cond: cond-2609061318158883 -->
  it): 10 owns the reader controls and their persistence. 26 owns only
  that the toolbar is reachable and operable by keyboard; which controls
  it holds is 10's.
- Boundary with map #5, `itd-2609051335447894` (Present a chapter with no <!-- cond: cond-2609061318156889 -->
  slide markup): 5 owns the deck and its movement between Sections and
  Sub-sections. 26 owns the vocabulary the deck draws its movement chords
  from, so that next, previous, and cancel mean the same thing at the
  lectern as on the page.
- Boundary with map #25, `itd-2609051336055362` (Rehearse from cards built <!-- cond: cond-2609061318153551 -->
  out of the headings): 25 owns the cards, the two modes, and the sitting.
  26 owns the chords the deck moves by, which 25 consumes rather than
  declares.
- Boundary with map #12, `itd-2609051335518134` (Find what is hidden in <!-- cond: cond-2609061318153518 -->
  the text): 12 owns the once-only quotation, the hidden marks, the tray,
  and the Konami reveal. 26 owns that the panel an egg opens takes the
  keyboard while it is open and closes on the cancel chord, as every
  overlay does.
- Excluded as plumbing: the key table's data shape, the event-to-chord <!-- cond: cond-2609061318155666 -->
  mapping, and the overlay handler (`05-internals.md` section 5).

## Acceptance Criteria

- Given a published article of two Parts holding four Chapters, When Bob
  presses the next-section chord repeatedly from the top of the page, Then
  the page moves to each Section in document order, the heading it lands
  on is brought into view, and the previous-section chord retraces the
  same order backwards.
- Given the same article, When Bob presses the contents chord, Then the
  contents list opens listing Parts, Chapters, Sections, and Sub-sections,
  the movement chords step through its entries, and choosing one moves the
  page to that heading and closes the list.
- Given the article with the contents list open and a search in progress,
  When Bob presses the cancel chord, Then whatever is open closes, the
  page keeps the reading position it had, and pressing Escape instead has
  the same effect.
- Given the article open, When Bob searches for a word that appears three
  times and steps forward through the matches and then backward, Then each
  step brings the next match in that direction into view, and cancelling
  the search returns him to the paragraph he started from.
- Given the article open, When Bob presses the keys-panel chord, Then the
  panel lists every action this page honours with its label and its live
  chords, and lists no action the page does not honour. (Negative case:
  an entry the reading view does not honour is absent from the panel
  rather than shown as inert.)
- Given a chord in the binding table that the reading views do not honour,
  When Bob presses it on the article, Then nothing happens on the page, no
  editing action is performed, and the page's reading position is
  unchanged. (Negative case.)
- Given the article at 390 CSS px with a hardware keyboard attached, When
  Carol opens the keys panel and moves by section, Then the panel and the
  headings it moves to are fully legible with no horizontal scrolling and
  no pinch zoom, and at 820 and 1280 CSS px the same chords perform the
  same actions.
- Given Bob has moved through the whole article by keyboard, When the
  network is observed for the session, Then no request carries his
  position, his search terms, or any record of where he has been.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`);
  legible on three device classes (`itd-2609051336128348`); one source,
  always (`itd-2609051336090390`); network only on publish
  (`itd-2609051336158553`).

## Open Questions

- Which navigation chords the reading views share with the editor
  (`03-evidence.md`, open questions, "Editor"). This moment is where that
  question is answered; until the answer is written into the binding
  table, the criteria above have a set to refer to but not its contents.
- Whether individual chords in that table are rebindable and persisted
  (`03-evidence.md`, open questions, "Editor"). A reader who cannot open
  the app has no way to rebind, so the answer decides whether a chord a
  browser takes for itself has any remedy on a reading page.

## Audit Notes

<!-- abcd-review: INGESTED receipt=rcp-781d7ec9f9c8 -->
Fidelity review — receipt rcp-781d7ec9f9c8 (verifier abcd:intent-auditor claude-fable-5-1).

Provenance: abcd:intent-auditor@claude-fable-5-1 · rubric_hash sha256:542ed2cd51ff938717a3f47b2b332e8d47910beec0ca7ecdfd238ae7edf5ced5 · prompt_hash sha256:d53b5a8ac9a3f6c2450662e07edb27d8a661049b49f8e42c85832fecfec31c1c
Input attestations: diff:c1bcf7b..cae1734@sha256:4a5e182af9d3f4549b332eff9cf5e02954a79320d0844b9f6d74d8d0a15cfc16; intent:.abcd/development/intents/shipped/itd-2609051402083398-move-through-the-article-by-keyboard.md@-; spec:.abcd/development/specs/closed/spc-2609061318158216-move-through-the-article-by-keyboard.md@-; checklist:.abcd/.work.local/logs/acceptance/spc-2609061318158216.md (M26-1..M26-5, every row unticked)@-; test-run:npx vitest run src/core/render/article-keys.test.ts src/core/render/reading-keys.test.ts src/emacs-keys.test.ts src/local-documents.test.ts src/preview.test.ts src/export/services.test.ts src/new-document-panel.test.ts src/outline-commands.test.ts src/open-source.test.ts src/focus.test.ts — 10 files, 287 tests passed, 0 failed@-; test-run:cargo test --manifest-path src-tauri/Cargo.toml article — 1 passed (export::tests::an_article_export_carries_only_the_article_s_stylesheet_and_its_scripts)@-;

Acceptance rollup: MET 4 · MET_WITH_CONCERNS 4 · NOT_MET 0 · INCONCLUSIVE 1

Per-criterion verdicts:
- ac-1 — MET: the fixture is two Parts holding four Chapters; C-c C-n visits all six headings in document order and C-c p retraces them, reveal() focuses and scrolls the heading, and both ends refuse rather than wrap
  evidence: src/core/render/article-keys.test.ts:204 — "moves to each heading in document order, and back, from the top of the page"
  evidence: src/core/render/article-keys.test.ts:233 — "refuses past the last heading, matching the editor's own outline-next-heading"
  evidence: src/core/render/article-keys.js:237 — "function moveSection(delta)"
  evidence: src/core/render/article-keys.js:191 — "function reveal(element)"
- ac-2 — MET_WITH_CONCERNS: M-s o opens the contents overlay read from nav.contents, C-n/C-p step its rows and Return jumps and closes; concern: the fixture's nav carries Parts, Chapters and Sections only, so the promised fourth level (Sub-sections) is never exercised
  evidence: src/core/render/article-keys.test.ts:287 — "opens listing Parts, Chapters and Sections, moves with the movement chords, and Return jumps and closes"
  evidence: src/core/render/article-keys.test.ts:30 — "< nav class="contents">< ol>"
  evidence: src/core/render/article-keys.js:359 — "function contentsEntries()"
- ac-3 — MET_WITH_CONCERNS: C-g closes the contents list keeping sectionIndex, Escape closes it too, and C-g on the search field closes search and restores the origin element; concern: the script holds one overlay at a time, so the criterion's combined state (contents open and a search in progress) is not representable and each cancel is proven separately
  evidence: src/core/render/article-keys.test.ts:319 — "closes the contents list on C-g, keeping the reading position"
  evidence: src/core/render/article-keys.test.ts:331 — "closes the contents list on Escape too"
  evidence: src/core/render/article-keys.js:727 — "function handleOverlayKey(event, chord)"
- ac-4 — MET: the word lantern appears in three paragraphs; C-s steps forward through all three, C-r steps back, and C-g returns focus to the element the search started from
  evidence: src/core/render/article-keys.test.ts:341 — "steps forward and backward through three matches, and cancel returns to the paragraph it started from"
  evidence: src/core/render/article-keys.js:479 — "function findMatches(query)"
- ac-5 — MET: C-h b opens a panel with exactly nine dt rows carrying the honoured labels, and a real table row the page does not honour (Undo) is absent; the panel reads the same HONOURED array the data block was parsed into
  evidence: src/core/render/article-keys.test.ts:384 — "lists every honoured action with its label and chords, and no other action"
  evidence: src/core/render/article-keys.js:109 — "function loadHonoured()"
  evidence: src/core/render/article-keys.js:604 — "function openKeysPanel()"
- ac-6 — MET: C-k (kill-line, a table row the reading views do not honour) leaves state unchanged, opens no overlay, and the event is not defaultPrevented
  evidence: src/core/render/article-keys.test.ts:414 — "does nothing: no overlay, no movement, and the event is left unclaimed"
- ac-7 — INCONCLUSIVE: only structural stylesheet assertions exist (no bare px width, panels capped by calc(100vw)); jsdom has no layout engine, and the checklist row that would confirm legibility at 390/820/1280 (M26-1) is unticked
  evidence: src/core/render/article-keys.test.ts:577 — "declares no width in map #26's own section as a bare pixel value"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158216.md:628 — "- [ ] At 1280: open the keys panel"
- ac-8 — MET_WITH_CONCERNS: with fetch stubbed and XMLHttpRequest.open spied, every action is exercised and neither is called, localStorage stays empty after a search, and the script contains no location/history/storage/sendBeacon write; concern: proven in jsdom only, the real network-panel check M26-2 is unticked
  evidence: src/core/render/article-keys.test.ts:447 — "calls neither fetch nor XMLHttpRequest while every action is exercised"
  evidence: src/core/render/article-keys.test.ts:470 — "keeps a search term in memory only"
  evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158216.md:640 — "- [ ] Open the browser's network panel before loading the article."
- ac-9 — MET_WITH_CONCERNS: nothing stored (fetch/XHR spy, empty localStorage), one source (readingBindings resolves the table's own rows and the one data block is written by build.ts and preview.ts and shipped by services.ts and stage.rs), network only on publish (same spy); concern: legible on three device classes rests on unticked M26-1
  evidence: src/keys.ts:1657 — "export function readingBindings(): Binding[]"
  evidence: src/publish/build.ts:732 — "readingKeysDataScript(),"
  evidence: src/preview.ts:276 — "articleKeys()?.boot();"
  evidence: src-tauri/src/publish/stage.rs:140 — "include_str!("../../../src/core/render/article-keys.js")"
  evidence: src/core/render/article-keys.test.ts:447 — "calls neither fetch nor XMLHttpRequest"

Gap audit:
- honoured:
  - the reading views borrow the editor's vocabulary and claim no chord of their own invention
    evidence: src/keys.ts:1638 — "export const READING_BINDING_IDS: readonly string[] = ["
    evidence: src/emacs-keys.test.ts:2176 — "the reading views' own vocabulary (map #26)"
  - one cancel chord closes whatever is open, and so does Escape
    evidence: src/core/render/article-keys.test.ts:319 — "closes the contents list on C-g, keeping the reading position"
    evidence: src/core/render/article-keys.test.ts:331 — "closes the contents list on Escape too"
  - a keys panel one chord away lists what is live on the page
    evidence: src/core/render/article-keys.test.ts:384 — "lists every honoured action with its label and chords, and no other action"
  - nothing about where a reader has moved is recorded anywhere but the browser
    evidence: src/core/render/article-keys.test.ts:447 — "calls neither fetch nor XMLHttpRequest while every action is exercised"
  - the panel an egg opens takes the keyboard and closes on the cancel chord
    evidence: src/core/render/article-keys.test.ts:426 — "does nothing but relay C-g as Escape while an egg panel is open"
    evidence: src/core/render/article-keys.js:641 — "function eggPanelOpen()"
- diverged:
  - a reading view declares which table entries it honours and nothing else — delivered with a per-chord exclusion (s-f, Down, Up) so an honoured row's chords on the page are a subset of the table's
    evidence: src/core/render/reading-keys.ts:45 — "const READING_EXCLUDED_CHORDS: ReadonlySet< string> = new Set(["s-f", "Down", "Up"]);"
  - the contents list lists Parts, Chapters, Sections, and Sub-sections — the fourth level is never exercised
    evidence: src/core/render/article-keys.test.ts:30 — "< nav class="contents">< ol>"
  - the event-to-chord mapping is excluded as plumbing — delivered as a second, independent copy inside the reading script, proven against the original over a shared fixture
    evidence: src/core/render/article-keys.js:76 — "function chordFromEvent(event)"
    evidence: src/core/render/article-keys.test.ts:183 — "agrees with src/keys.ts's chordFromEvent over the shared fixture"
- missing:
  - the deck at the lectern, the article in the single file, and the rehearsal cards all move the same way — the single-file renderer references no article-keys script, the present window keeps its own keydown listener, and no rehearsal deck exists in the range
    evidence: src/export/services.ts:95 — "`${FOLDER_CHROME}/article-keys.js`,"
    evidence: src/present.ts:508 — "document.addEventListener("keydown", (event) => {"
  - legibility at 390, 820 and 1280 CSS px confirmed on a real layout engine
    evidence: .abcd/.work.local/logs/acceptance/spc-2609061318158216.md:628 — "- [ ] At 1280: open the keys panel"

Scope-condition dispositions:
- cond-2609061318150599 — narrowed: the script is wired into the presenter site, the folder export and the app's preview; the single-file renderer (html.ts) references no article script, and Safari/Chromium at the three widths are only reachable through the unticked M26-1
  narrowing: holds for the presenter site, the folder export and the desktop preview only; the article inside the single HTML file carries no article-keys.js, and the three widths in real engines are unverified
  evidence: src/publish/build.ts:733 — "< script src="${chrome}/article-keys.js" defer>< /script>"
  evidence: src/export/services.ts:95 — "`${FOLDER_CHROME}/article-keys.js`,"
  evidence: preview.html:42 — "< script type="module" src="/src/core/render/article-keys.js" defer>< /script>"
- cond-2609061318153674 — survived: bare Down/Up are excluded from the honoured chords so the browser's own scroll is untouched, an unhonoured chord is left unclaimed, and the only visible addition is a native button reachable by touch or Tab
  evidence: src/core/render/article-keys.test.ts:484 — "never prevents default on bare Down or Up, leaving the browser's own scroll alone"
  evidence: src/core/render/article-keys.test.ts:401 — "opens the same panel from the visible help button, reachable by Tab alone"
- cond-2609061318158331 — survived: the binding table exists and the reading views declare their honoured entries as nine ids resolved against it
  evidence: src/keys.ts:1638 — "export const READING_BINDING_IDS: readonly string[] = ["
  evidence: src/core/render/reading-keys.test.ts:22 — "names exactly the reading views' own ids, in the table's own order"
- cond-2609061318158896 — narrowed: the table and src/keys.ts's chordFromEvent are unchanged in the range, and map #26 declares entries as the boundary says; but it also decides a fixed per-chord exclusion and carries its own copy of the event-to-chord mapping
  narrowing: 26 decides which entries a reading view honours, and additionally which of an honoured row's chords it drops (s-f, Down, Up) and a duplicated chord mapping; map #2's own table and mapping are untouched
  evidence: src/core/render/reading-keys.ts:45 — "READING_EXCLUDED_CHORDS"
  evidence: src/core/render/article-keys.js:76 — "function chordFromEvent(event)"
  evidence: src/keys.ts:1370 — "export function chordFromEvent(event: KeyboardEvent): string {"
- cond-2609061318159357 — survived: the contents overlay reads the page's own nav.contents back as data and writes none of the page; the stylesheet additions sit in the section article.css reserved for this map
  evidence: src/core/render/article-keys.js:359 — "function contentsEntries()"
  evidence: src/core/render/article.css:711 — "keys panel `article-keys.js` builds"
- cond-2609061318158883 — untested: nothing in the range exercises the reader-controls toolbar's reachability by keyboard; the spec records it as found slow rather than absent, and M26-3 is unticked
- cond-2609061318156889 — untested: no code in the range makes the deck consume the reading vocabulary (READING_BINDING_IDS is referenced only by keys.ts, reading-keys.ts and article-keys.js); the deck's own movement is neither exercised nor contradicted here
- cond-2609061318153551 — untested: no rehearsal deck exists in the range, so its consumption of these chords is neither exercised nor contradicted
- cond-2609061318153518 — survived: while an egg panel is open every chord but cancel is left alone and C-g is relayed as the Escape keydown article-eggs.js listens for, guarded by a marker property against re-relay
  evidence: src/core/render/article-keys.test.ts:426 — "does nothing but relay C-g as Escape while an egg panel is open"
  evidence: src/core/render/article-keys.js:661 — "relayed.articleKeysRelayed = true;"
- cond-2609061318155666 — narrowed: src/keys.ts's chordFromEvent and src/overlay.ts are unchanged in the range, so the excluded pieces were not redesigned; the event-to-chord mapping was nonetheless re-implemented inside the reading script as a proven copy
  narrowing: holds for the originals in src/keys.ts and src/overlay.ts, which the range leaves untouched; the mapping itself is duplicated inside article-keys.js and proven equal over chord-mapping.fixture.ts
  evidence: src/core/render/article-keys.js:76 — "function chordFromEvent(event)"
  evidence: src/core/render/article-keys.test.ts:183 — "agrees with src/keys.ts's chordFromEvent over the shared fixture"
## Grounds

- pursued: the reading views honour nine existing binding-table rows (heading movement, line movement, occur, isearch, cancel, keys-panel) with no invented chord, proven in article-keys.test.ts and reading-keys.test.ts; wrong would show as a chord live on the page absent from the table, or an honoured chord doing nothing.
