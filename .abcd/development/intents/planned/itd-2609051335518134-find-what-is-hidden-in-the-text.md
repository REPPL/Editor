---
id: itd-2609051335518134
slug: find-what-is-hidden-in-the-text
spec_id: spc-2609061318159422
kind: standalone
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317463033]
---

# Find what is hidden in the text

## Press Release

Bob opens the link Alice sent him. Before the text, a quotation stands
over the page — the one Alice chose to open with. He reads it, dismisses
it, and starts reading. When he comes back to the same page a week later,
the quotation does not appear again; he lands straight on the first
paragraph. It greeted him once, which is what an opening is for.

Reading on, he notices a small mark sitting inside a paragraph, about
where a footnote marker would be. He clicks it, and what Alice hid there
opens: a few sentences that did not belong in the argument, a photograph,
or a short video. When he closes it, the mark leaves the paragraph and
settles into a tray at the foot of the page, so he can see how many he
has found and go back to any of them. Carol, reading the same page on her
phone, finds the same marks; the panel she opens fills the width of the
screen instead of sitting in the margin, and nothing needs pinching.

Nothing on the page announces that the marks exist, and that is the
point. A reader who suspects there is more can type the Konami code — up,
up, down, down, left, right, left, right, b, a — and every mark still
hidden flashes briefly, with the page scrolling to the first of them.

None of this follows a reader anywhere. Which quotation Bob has seen and
which marks he has collected are remembered in his browser and nowhere
else; the site records nothing about him. And where the page cannot be
interactive at all, nothing Alice wrote is lost: in the journal PDF the
quotation prints as an epigraph on the first page and each hidden piece
prints as a static aside in the text.

## Why This Matters

Alice always has material that is worth including and not worth
interrupting the argument with: the aside, the photograph, the clip, the
thing a reader would enjoy on a second pass. Without somewhere to put it
she either cuts it or breaks the flow with it, and both are losses. The
opening quotation has the mirror-image problem: it is the right way to
begin a document once and an obstacle every time after that. This moment
gives both a home — one that rewards a curious reader without taxing a
hurried one, and that costs the reader nothing in privacy to enjoy.

## Mechanism

- We expect interactive elements declared in the source and rendered by a
  script the page carries to work at article length, because the article
  prototype already does exactly this: eggs that open text, an image, or
  a video, collect into a tray, and are revealed by the Konami code
  (`03-evidence.md`, "The article prototype"). Editor changes the
  authoring syntax, not the reading behaviour, so the untested part is
  the syntax alone.
- We expect the once-per-browser rule to hold, because the prototype's
  opening quotation is remembered per browser and the brief records that
  as proven: "an authored construct with a per-browser memory is
  workable" (`03-evidence.md`). This is falsifiable — clear the browser's
  storage and the quotation must return, in that browser and no other.
- We expect these constructs to be safe in the canon because each is an
  ordinary Pandoc form: a fenced div with attributes for the quotation
  and for an egg's content, and an attributed inline span for the mark
  (`05-internals.md`, section 3). A plain Markdown reader shows the
  marker character and the block's content as text rather than failing.
- We expect nothing to need storing on the site, because what a reader
  has dismissed or collected is a fact about that browser, not about a
  person. It lives where display preferences live, and it leaves only if
  the reader takes it.
- We expect print to be the honest test of "declared in the source",
  because content that only a script can produce cannot be printed. If
  the quotation and every egg's content can be rendered from the tree
  into the PDF with no script running, the content genuinely is in the
  document rather than in the page.

## Scope Conditions

- Platform: the published online article and the same article inside the <!-- cond: cond-2609061318156671 -->
  single HTML file, at desktop, iPad, and iPhone widths — 1280, 820, and
  390 CSS px. The deck omits
  both constructs entirely; the PDF prints their static forms. Alice sees
  the same behaviour in the app's preview.
- Population: this is Bob and Carol's moment. Alice authors the <!-- cond: cond-2609061318155455 -->
  constructs and checks them in preview, but the experience being
  specified is the reader's, and it requires no account, no sign-in, and
  no instruction.
- Assumption: an egg's content is text, an image, or a video, and a video <!-- cond: cond-2609061318153365 -->
  inside an egg follows the ordinary video source rule rather than one of
  its own — including showing a poster and a link when no source is
  reachable.
- Assumption: the Konami code reveals; it does not collect. A revealed <!-- cond: cond-2609061318156143 -->
  mark is still uncollected until the reader opens it.
- Assumption: an inline marker with no block, and a block no marker <!-- cond: cond-2609061318152713 -->
  names, are both authoring mistakes rather than reader-facing features.
  Each renders harmlessly — the marker as ordinary text, the block as
  nothing — and each is listed against its chapter in the sidebar so
  Alice finds it while writing.
- Assumption: the opening quotation belongs to the first chapter's first <!-- cond: cond-2609061318151945 -->
  block. A document has one opening, not one per chapter.
- Boundary with map #9, itd-2609051335489928 (Read the document as a <!-- cond: cond-2609061318154625 -->
  Tufte article): #9 owns the page these things sit in — layout,
  navigation, margin notes, the video rule, and the reading views'
  keyboard vocabulary. In scope here is only the once-only quotation, the
  hidden marks, the tray, and the Konami reveal.
- Boundary with map #21, itd-2609051336019782 (Receive a journal-style <!-- cond: cond-2609061318155915 -->
  PDF with the document): in scope here is that the quotation and every
  egg's content reach print rather than vanishing; out of scope is what
  the epigraph and the static aside look like on the printed page, which
  #21 owns. The exact static fallback each interactive element renders is
  open in `03-evidence.md`.
- Boundary with map #14, itd-2609051335537470 (Write one text for two <!-- cond: cond-2609061318152835 -->
  audiences): #14 owns marking a block with a variant and previewing a
  variant. Whether an egg's content can itself be variant-marked is open
  in `03-evidence.md`; until it is settled, this intent assumes an egg
  block carries no variant attribute, and the *variant fidelity*
  discipline owns the obligation once it can.
- Boundary with map #3, itd-2609051335415528 (Insert a construct I cannot <!-- cond: cond-2609061318150131 -->
  remember): #3 owns only that choosing "easter egg" or "opening
  quotation" in the palette puts the canonical form at the cursor, with
  the cursor where the content goes. This intent owns what those forms do
  for a reader afterwards.
- Boundary with map #10, itd-2609051335492327 (Read it the way I like <!-- cond: cond-2609061318157089 -->
  it): #10 keeps the reader's display preferences in their browser —
  theme, text size, measure. This intent keeps only two facts about
  hidden content: whether the quotation has been shown, and which marks
  have been collected. Neither intent stores anything about who the
  reader is.

## Acceptance Criteria

- Given a chapter whose first block is `::: {.opening once="per-browser"}`
  holding a quotation and its attribution, when Bob opens the published
  article for the first time in a browser, then the quotation is shown
  over the page and dismissing it reveals the text; and when he opens the
  same link again in that same browser, then the article opens directly
  at the text with no quotation shown.
- Given a paragraph containing `The survey ran for three
  winters[✦]{.egg egg="lantern"}` and, elsewhere in the same chapter, a
  block `::: {.egg #lantern label="✦"}`, when the article renders, then
  the marker appears at that point in the paragraph, the block's content
  appears nowhere in the flow of the text, and clicking the marker opens
  that content.
- Given Bob has opened that marker, when he closes the panel, then the
  marker is gone from the paragraph and present in the tray at the foot
  of the page, and clicking it in the tray reopens the same content.
- Given a chapter with at least three eggs of which one is already
  collected, when Bob types up, up, down, down, left, right, left,
  right, b, a, then the two uncollected marks are briefly revealed, the
  page scrolls to the first of them in document order, and the collected
  one is not revealed again.
- Given an inline marker `[✦]{.egg egg="lantern"}` whose identifier
  matches no `.egg` block in that chapter, when the article renders, then
  the marker's label appears as ordinary text, nothing at that point is
  clickable, no entry is created in the tray, and the Konami reveal does
  not count it; and when Alice has that chapter open in the app, then the
  sidebar lists the marker against that chapter as unresolved. The rest
  of the chapter renders unchanged. (Negative case.)
- Given a `::: {.egg #lantern label="✦"}` block that no inline marker in
  that chapter names, when the article renders, then the block's content
  appears nowhere in the flow, nothing is added to the tray, and the
  sidebar lists the block against that chapter as unresolved for Alice to
  find. (Negative case.)
- Given a document of four chapters where the second chapter's first
  block is `::: {.opening once="per-browser"}`, when Bob opens the
  article, then no quotation is shown over the page: the opening belongs
  to the first chapter's first block alone, and the sidebar lists the
  misplaced block against that chapter. (Negative case.)
- Given the published article at iPhone width (390 CSS px), when Carol
  opens a mark, then the panel fits the width of the viewport with no
  horizontal scrolling and no pinch zoom, and closing it returns her to
  the paragraph she was reading with the tray still reachable by
  scrolling; and at iPad width (820 CSS px) and desktop width (1280 CSS
  px) the panel opens beside the text with nothing wider than the
  viewport.
- Given one chapter carrying an opening quotation and three eggs, when
  the deck is produced from it, then the deck contains neither the
  quotation nor any egg or its content. The same criterion binds against
  the paper from phase 6, when it exists to be compared: the paper then
  carries the quotation as an epigraph on its first page and each egg's
  content as a static aside.
- Given Bob has dismissed the quotation and collected two marks, when the
  published site is inspected, then nothing about his reading is held
  outside his own browser and no request carries it anywhere; and when
  that browser's storage is cleared, then the page returns to its
  first-visit state with the quotation shown and the tray empty.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`);
  legible on three device classes (`itd-2609051336128348`), at 390, 820,
  and 1280 CSS px; the renderings agree (`itd-2609051336130664`); one
  source, always (`itd-2609051336090390`); degrade gracefully in a plain
  tool (`itd-2609051336110536`); network only on publish
  (`itd-2609051336158553`); and variant fidelity
  (`itd-2609051336107315`), from phase 3 where it binds — this page is a
  rendering of an already-filtered tree, and neither a mark nor a tray
  entry may survive from a variant it does not belong to.

## Open Questions

- Whether an easter egg's content can itself be a variant-marked block
  (`03-evidence.md`, "Open questions", "Article and slides"). This
  decides whether the fifth and seventh criteria above need a variant
  case.
- The exact static fallback each interactive element renders for print
  (`03-evidence.md`, "Open questions", "Article and slides"). The
  criterion above requires the content to reach the page; its printed
  form is not yet decided.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._

## Grounds

- pursued: the once-only opening and the easter eggs render and behave exactly as specced — a valid opening degrades to a flow epigraph and promotes to a once-per-browser modal, a matched egg opens beside the text and collects into a tray, an orphan marker or block and a misplaced opening are inert and sidebar-listed, the deck omits both constructs, and nothing about a reader's progress leaves localStorage; this would be shown wrong by a failing test in article.test.ts, html.test.ts, article-eggs.test.ts, slides.test.ts, eggs.test.ts, sidebar.test.ts or document.test.ts, or by the six gates failing.
