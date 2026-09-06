---
id: itd-2609051335492327
slug: read-it-the-way-i-like-it
spec_id: spc-2609061318154502
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

# Read it the way I like it

## Press Release

Carol opens Alice's article on her phone late in the evening. In the
corner of the page is a small toolbar. She chooses the dark theme and the
largest text, and the page changes under her hands: same words, same
notes, same order, set the way she can read them. She closes the tab, and
when she comes back the next morning the page is still dark and still
large. Nothing asked her to sign in, and nothing was set up in advance by
Alice.

Bob reads the same article on his laptop. He prefers a long line, so he
takes the measure out to wide, and the margin notes settle beside the
paragraphs at the new width without crowding the text. Later he wants the
page as its author framed it: one press of reset and the theme, the text
size, and the measure all return to their defaults, and stay there on the
next visit.

Their choices belong to them and go no further. Carol's dark theme does
not follow her to her laptop, does not appear on Bob's copy, and is not
recorded anywhere Alice can see. It lives in the browser Carol chose it
in, and nowhere else.

## Why This Matters

A reading page set once, by its author, suits its author. Bob wants a long
line at a desk; Carol wants large sepia text on a phone at night; both
have been told, by nearly every page they read, to cope. The alternative
that most pages take — remembering the reader through an account — makes
a reading preference into a record of who read what. This moment gives
each reader the page on their own terms and keeps the fact of it in their
own browser.

## Mechanism

- We expect a theme, text size, and measure control with a reset to be
  the right set, and to cost little, because the reference article
  prototype already ships exactly these, persisted in the browser;
  `03-evidence.md` records the lesson as "the controls are cheap and
  belong to the article, not the author". Falsifiable: the set is wrong
  if a reader has to reach for the browser's own zoom to read the page
  comfortably at any of the three widths.
- We expect per-browser memory to be enough, with no account and no
  server, because the same prototype proves a per-browser memory in use
  for the once-only opening quotation: "an authored construct with a
  per-browser memory is workable" (`03-evidence.md`).
- We expect the controls to compose with the Tufte layout rather than
  fight it, because the layout folds by width alone (`03-evidence.md`:
  "margin notes work on all three device classes with CSS alone"), so
  changing the measure re-runs the same fold the device width would have
  run. Falsifiable: set the widest measure at iPad width (820 CSS px) and
  look for a
  margin note overlapping the text.
- We expect no reader state to leave the page, because the site is static
  output deployed from the production repository (`05-internals.md`
  section 8) and has nothing to receive it. Falsifiable: record the
  network while every control is exercised; a single request carrying a
  preference disproves it.

## Scope Conditions

- Bundle: this intent belongs to the bundle **The article** (phase 2) with <!-- cond: cond-2609061318154139 -->
  map #9, `itd-2609051335489928`, "Read the document as a Tufte article".
  One spec covers both: the page and the reader's control over it.
- Platform: current Safari and Chromium engines at iPhone, iPad, and <!-- cond: cond-2609061318154083 -->
  desktop widths — 390, 820, and 1280 CSS px — wherever the article
  renders: the presenter site and the desktop app's preview now, and the
  single HTML file from phase 5, where the controls travel with the file
  and remember per browser against that file. Where a browser makes
  storage unavailable, the controls still work for the visit and simply
  do not persist.
- Population: Bob and Carol reading a published document, and Alice <!-- cond: cond-2609061318151286 -->
  reading her own draft with the same controls. There is no author-facing
  setting in this moment.
- Assumption: preferences are per browser and per device, and nothing <!-- cond: cond-2609061318156570 -->
  synchronises them. A reader on two devices sets them twice.
- Assumption: the choices are among built-in reader themes. Author themes <!-- cond: cond-2609061318158871 -->
  are out of scope for the product (`06-delivery.md`, "Out of scope"), so
  no control here selects a style Alice supplied.
- Boundary with map #9 (`itd-2609051335489928`): #9 owns the default page <!-- cond: cond-2609061318156014 -->
  — the layout, the default measure, where a margin note sits, the
  contents list, images and video in the flow. #10 owns the toolbar, the
  three controls, the reset, and the persistence.
- Boundary with map #23 (keep my own marks on someone else's page, phase <!-- cond: cond-2609061318158758 -->
  7): both keep state in Bob's browser. The boundary is what is kept —
  #10 keeps display preferences only; #23 keeps marks about the text and
  the file Bob exports them as.
- Boundary with map #12 (find what is hidden in the text): #12 owns the <!-- cond: cond-2609061318152897 -->
  once-only opening quotation and its per-browser memory of having been
  shown, and the collected easter eggs. #10 owns display preferences and
  nothing that remembers what a reader has read.

## Acceptance Criteria

- Given a published article opened for the first time in a browser, when
  Bob looks at the page, then a toolbar offers theme (light, dark,
  sepia), text size (smaller, default, larger), measure (narrow, normal,
  wide), and a reset.
- Given Carol has chosen the larger text size, when she reloads the page
  in the same browser, then the text is still at the larger size and the
  toolbar shows that choice as the current one.
- Given Bob has chosen the sepia theme and the narrow measure, when he
  presses reset, then theme, text size, and measure all return to the
  article's defaults, and a reload keeps the defaults.
- Given the network is recorded while Carol exercises every control, when
  the recording is read, then no request carries a preference, and the
  same article opened in a second browser on the same machine renders at
  the defaults.
- Given the article at iPhone width (390 CSS px), when Carol sets the
  largest text size and the wide measure together, then the page scrolls
  vertically only and no element is wider than the viewport; and the same
  holds at iPad width (820 CSS px) and desktop width (1280 CSS px).
- Given a chapter whose paragraphs carry citations and `.credit` blocks,
  when Bob changes the measure at desktop width (1280 CSS px), then every
  margin note stays level with the block it belongs to and none overlaps
  the text column.
- Given the same article inside the exported single HTML file, opened
  from disk with the network switched off, when Carol chooses the dark
  theme and the larger text and reopens the file in that browser, then
  the toolbar offers the same three controls and the same reset, and her
  choices are still in force. (The file remembers per browser and per
  file, so a second copy of the file opens at the defaults.)
- Given a browser in which stored preferences are unavailable or have
  been cleared, when Carol changes a control, then the change applies for
  that visit, the page renders at the defaults on the next load, and no
  error is shown.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`);
  legible on three device classes (`itd-2609051336128348`), at 390, 820,
  and 1280 CSS px; one source, always (`itd-2609051336090390`); and, from
  phase 3 where it binds, variant fidelity (`itd-2609051336107315`) — no
  control in this toolbar names, offers, or hints at a variant.

## Open Questions

- Which navigation chords the reading views share with the editor
  (`03-evidence.md`, open questions, "Editor"). Reaching and operating
  this toolbar without a pointer belongs to map #26,
  `itd-2609051402083398` (Move through the article by keyboard), which is
  where that list is settled; what the toolbar holds is settled here.
  `03-evidence.md` leaves no other question open for the reader controls:
  it records them as proven by the article prototype.
- Whether a reader's choices should follow the document or the browser
  when the same document is read at a link and again from a single file
  she was sent. Each is its own origin, so today she sets them twice.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
