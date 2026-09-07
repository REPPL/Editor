---
id: itd-2609051335489928
slug: read-the-document-as-a-tufte-article
spec_id: spc-2609061318090042
kind: standalone
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: the-article
supersedes: [itd-2609051221553568, itd-2609051317463033]
---

# Read the document as a Tufte article

## Press Release

Bob opens the link Alice sent him and reads. The whole document is one
page: it carries the document's title, a contents list drawn from the
Parts, the Chapters, the Sections, and the Sub-sections, and a
generous measure with a wide margin beside it. Where Alice cited a source
or wrote a footnote, the reference sits in that margin, level with the
paragraph that made it, so Bob reads the note without leaving the
sentence. Images sit in the flow with their captions beneath them and
their credits alongside. He reads the whole thing top to bottom and never
jumps to a foot of a page.

Carol opens the same link on her phone. The margin folds away: each note
appears in the flow, just after the paragraph it belongs to, at the same
size as the text around it. Nothing scrolls sideways and nothing needs
pinching. On her iPad the margin comes back. It is the same page, the same
link, and the same file behind it.

Where the text carries a video, the article plays it if a source is
reachable. Carol on a train, out of reach of every source, sees the poster
frame and a link, in the place the video would have been, with its caption
under it.

Alice writes nothing extra to get this. The article is rendered from the
same chapter files that make the deck, so the constructs she wrote for the
talk leave no mark on the page: a speaker-notes div produces nothing, a
columns div puts its content in the flow, a divider heading is an ordinary
heading, and a page-break comment produces nothing. She writes one text,
and this is what a reader gets.

## Why This Matters

Alice's readers meet her long-form writing in one of two bad shapes: a
page that is comfortable on a laptop and unreadable on a phone, or a page
whose references sit at the foot so that following one costs the reader
their place. Serving Bob on a projector-lit laptop and Carol on a phone
has meant keeping more than one rendering, which is how copies of a text
drift apart. This moment gives every reader the same page, at the width in
front of them, with the sources beside the sentence, from a single source
text.

## Mechanism

- We expect margin notes to hold at iPhone, iPad, and desktop widths with
  stylesheet rules alone, because the reference article prototype already
  does exactly this: numbered citations with their full reference in the
  margin, "folding into the flow on narrow screens", which
  `03-evidence.md` reads as "margin notes work on all three device classes
  with CSS alone". Falsifiable: render one page at the three widths and
  look for any element wider than the viewport.
- We expect the book hierarchy to need no translation into a reading
  experience, because the prototype's title, two heading levels beneath
  it, and clickable contents list "map onto Chapter, Section, Sub-section
  with no translation" (`03-evidence.md`, the article prototype).
- We expect the article to need no article-specific authoring, because the
  construct table in `05-internals.md` section 3 gives the article its own
  column and every slide-only construct is marked ignored or absent in it.
  Falsifiable: a chapter containing every slide construct renders a page
  with no trace of them.
- We expect the video rule to be right rather than a compromise, because
  the prototype proves it in use: video "embeds on the web and shows a
  thumbnail with a link when the file is opened from disk"
  (`03-evidence.md`), which is the same fallback a reader out of reach of
  every source meets.
- We expect one renderer to serve every host, because `05-internals.md`
  section 4 makes the article renderer one module of a core shared
  unchanged by the app, the single file, the presenter site, and the
  pipeline, and calls a difference between hosts a bug in the core.
  Falsifiable, and against the hosts that actually render an article: the
  app's preview, the article pushed to the site by the publish action,
  and the article inside the single HTML file are compared for one
  document and must not differ. The pipeline renders the paper, not the
  page, so it is not one of the three.

## Scope Conditions

- Bundle: this intent belongs to the bundle **The article** (phase 2) with <!-- cond: cond-2609061318099562 -->
  map #10, `itd-2609051335492327`, "Read it the way I like it". One spec
  covers both: a Tufte page with no way to change the measure is half the
  reading experience.
- Platform: current Safari and Chromium engines at iPhone, iPad, and <!-- cond: cond-2609061318091913 -->
  desktop widths — 390, 820, and 1280 CSS px — on the
  presenter site and in the desktop app's preview. Native reading apps are
  out.
- Population: Bob and Carol reading a published document, and Alice <!-- cond: cond-2609061318092215 -->
  reading her own draft. No authoring gesture belongs to this moment.
- Assumption: in phase 2 the article renders the document's default <!-- cond: cond-2609061318096567 -->
  variant only. Variant marking and filtering are map #14 and the
  variant-fidelity discipline, in phase 3; from that phase the article
  renders whichever variant it is handed, and the discipline binds here.
- Boundary with map #10 (`itd-2609051335492327`): #9 owns the default page <!-- cond: cond-2609061318097929 -->
  — layout, measure, where a note sits, the contents list, the video rule.
  #10 owns the toolbar that changes theme, text size, and measure, and the
  persistence of those choices.
- Boundary with map #11 (cite from a bibliography file): #11 owns the <!-- cond: cond-2609061318091537 -->
  citation key, the bibliography file, resolution, and the generated
  reference list. #9 owns only where a resolved citation or footnote sits
  on the page and how it folds at narrow widths.
- Boundary with map #12 (find what is hidden in the text): #12 owns the <!-- cond: cond-2609061318092133 -->
  once-only opening quotation and the easter eggs — the marks, the tray,
  the collection, and the Konami reveal. #9 owns the page around them and
  implements none of that behaviour.
- Boundary with map #16 (point a video at several sources): #16 owns the <!-- cond: cond-2609061318090890 -->
  order in which sources are tried and what a reader sees when none is
  reachable. #9 owns only that the article honours that order and places
  the player, or the poster and link, in the flow at that point.
- Boundary with map #5 and map #6 (the deck): each rendering owns its own <!-- cond: cond-2609061318097375 -->
  column of the construct table in `05-internals.md` section 3. #9 owns
  the Article column, including its obligation to ignore the slide
  constructs; #5 and #6 own the Slides column.
- Boundary with map #17 (carry the document as one file): #17 owns <!-- cond: cond-2609061318099092 -->
  embedding this page, its assets, and its script into one offline file.
  #9 owns the page itself, wherever it is served from.
- Boundary with map #26, `itd-2609051402083398` (Move through the article <!-- cond: cond-2609061318090837 -->
  by keyboard): #26 owns moving through this page by keyboard — the
  chords, the contents list opened from a chord, search, and the cancel
  rule. #9 owns the page those chords move through, and asserts nothing
  about which chord does what.
- In this moment, from the canon: the callout and the margin aside. The <!-- cond: cond-2609061318099438 -->
  article bundle owns what `::: {.callout kind="…"}` and
  `[…]{.margin}` look like on the page, because the article is the
  rendering where each of them has a form of its own; the deck and the
  paper read their own columns of the mapping table in
  `05-internals.md` section 3.

## Acceptance Criteria

- Given a document folder of two Parts holding four chapters in all, with
  Sections and Sub-sections inside them, when Bob opens the article, then
  the whole document is one page, a contents list appears carrying the
  Parts, the Chapters, the Sections, and the Sub-sections, and choosing
  any entry moves the page to that heading.
- Given a paragraph carrying the citation `[@smith2020, p. 4]` and the
  footnote `^[an inline note]`, when the article renders at desktop
  width, then both appear in the margin level with that paragraph, and
  neither is printed at the foot of the page.
- Given a chapter carrying `::: {.credit}` and `[a remark in the
  margin]{.margin}`, when the article renders at desktop width (1280 CSS
  px), then each appears as a margin note beside the block it follows.
- Given a chapter carrying `::: {.callout kind="warning"}`, when the
  article renders at desktop width (1280 CSS px), then the callout
  appears as a box in the flow, set apart from the body text and
  carrying its kind, and at iPhone width (390 CSS px) it keeps the full
  measure with nothing scrolling sideways.
- Given a chapter carrying `::: {.notes}`, `::: {.columns}` with two
  `.column` children, `## Interlude {.divider}`, and `<!-- pagebreak -->`,
  when the article renders, then the notes div produces nothing, the
  columns' content appears in the flow with no side-by-side layout, the
  divider heading renders as an ordinary heading, and the page-break
  comment produces nothing.
- Given the same page at iPhone width (390 CSS px), when Carol reads it,
  then every margin note appears in the flow directly after the paragraph
  that made it, the page scrolls vertically only, and no element is wider
  than the viewport; and at iPad width (820 CSS px) and desktop width
  (1280 CSS px) the margin returns and no element is wider than the
  viewport at either.
- Given a video block opened as
  `::: {.video poster="assets/keynote-poster.jpg" caption="Part two"}`
  whose `local`, `site`, and `gated` sources are all unreachable, when
  the article renders, then the poster frame, the caption, and a link
  appear at that point in the flow and no player is inserted.
- Given the image
  `![The lantern at dusk](assets/lantern.jpg "By Carol"){.full-bleed}`,
  when the article renders, then the alt text is the caption, the title
  attribute is the credit, and the image sits in the flow at full-bleed
  width.
- Given one document rendered as the article three ways — in the desktop
  app's preview, in the build the publish action pushes to the site, and
  inside the exported single file — when the three are compared, then
  they carry the same headings in the same order, the same margin notes
  against the same paragraphs, the same reference list, and the same
  video fallbacks. (The pipeline is not compared here: it renders the
  paper, which map #21 owns.)
- Inherits: one source, always (`itd-2609051336090390`); the renderings
  agree (`itd-2609051336130664`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; degrade
  gracefully in a plain tool (`itd-2609051336110536`); no machine in the
  document (`itd-2609051336080960`); nothing is stored about a reader
  (`itd-2609051336145770`); and, from phase 3 where it binds, variant
  fidelity (`itd-2609051336107315`) — the article is a rendering, so the
  tree it is handed is already filtered and no page of it may reveal that
  another variant exists.

## Open Questions

- Which navigation chords the reading views share with the editor
  (`03-evidence.md`, open questions, "Editor"). The article's keyboard
  movement belongs to map #26, `itd-2609051402083398`, and cannot be
  specified there until that list exists.
- Which poster frame a video block uses when the author supplies none
  (`03-evidence.md`, open questions, "Assets"). The article's fallback
  needs an image whether or not `poster` is written.
- Whether the presenter, the article script, and the slide engine are
  maintained once in the production repository and shared by every
  document, rather than copied into each published version
  (`03-evidence.md`, open questions, "Publish and pipeline"). A fix to the
  reading experience reaches old versions only under the first answer.

## Audit Notes

<!-- abcd-review: OWED receipt=rcp-f251a03663ef -->
Fidelity review OWED (receipt rcp-f251a03663ef).

## Grounds

- pursued: the article as a Tufte page — margin notes that fold at 390 CSS px and sit beside the paragraph at 820 and 1280 through stylesheet rules alone, a four-level contents list grouped by Part, a callout box, full-bleed images, and a video rule a small runtime script upgrades; one renderer and one stylesheet and one script read or copied unchanged by the app's new preview window, the site build, and the folder export. It would be wrong if a margin note ever duplicated its paragraph's text inline, if the three hosts disagreed on headings or margin placement for one document, if any slide-only construct left a trace in the article, or if a video block ever showed a player before a source actually loaded.
