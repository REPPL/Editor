---
id: itd-2609051336037640
slug: keep-my-own-marks-on-someone-else-s-page
spec_id: null
kind: null
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: annotations
supersedes: [itd-2609051221553568, itd-2609051317516762]
---

# Keep my own marks on someone else's page

## Press Release

Alice sends Bob a link. He opens it on his laptop, reads the article, and
starts working the way he works: he highlights the two sentences the
argument turns on, writes a note against a paragraph he does not believe,
and marks the Sections he has been through. The page is not his — he
cannot edit a word of it — but the marks are, and they are still there
when he comes back to the link the next morning.

They are there because they never went anywhere. Bob's marks live in his
own browser and nowhere else: the site is a set of static files, it asks
him for nothing, it records nothing about him, and Alice cannot see that
he has read her document at all, let alone what he made of it. Open the
same link in a different browser and the page is unmarked.

Carol reads the same link on her phone on the train. She highlights a
passage with the same gesture, and her mark and her note sit in the flow
of the text at phone width, with nothing to pinch or scroll sideways.
Because her marks are kept per browser, her reading of the document and
Bob's never touch.

When Bob has something worth sending, he exports. He gets a small file for
each chapter he marked, in exactly the shape Alice's own marks take beside
her chapters, and sends them to her however he likes. That is where his
part ends: the files are his, and what Alice does with them is her
business.

Later, when Alice has reviewed a reading someone sent her and published it
as a layer, Carol finds a control on the page for it: off until she
chooses it, on once she does, and gone again when she turns it off.
Turning it on shows that person's highlights and notes against her own
reading of the text; turning it off leaves the page exactly as it was.
Nothing about her choice travels anywhere — the same browser-only rule
that keeps Carol's own marks private keeps which layers she has open
private too, and a reload of the page restores her choice from her own
browser rather than from the site.

## Why This Matters

A reader who cannot mark a page reads it once and loses everything they
noticed. The usual fix is an account: sign in, and the site keeps your
highlights, which means the site now keeps you. Alice publishes a static
document to people she is not asking to register, and Bob wants to mark it
up without being counted, tracked, or asked. Both can have what they want
only if the marks stay in the reader's own browser and leave only as a
file the reader chooses to hand over.

## Mechanism

- We expect reader marks to work with no server because the state is small
  and per-browser, and 03-evidence records that this is already proven at
  this scale on the reading surface: the article prototype's "reader
  controls for theme, text size, and measure, persisted in the browser"
  and its once-only opening quotation "remembered per browser". Marks are
  the same kind of state with more of it, and the acceptance project's
  reading app carries highlighting, per-section notes and per-step
  reviewed marks in versioned browser-storage keys already.
- We expect the reader's file to be the author's file because both are the
  sidecar format of 05-internals section 7: same `schema_version`, same
  kinds, same anchor. The ADR on sidecar annotations makes it explicit
  that this format is public API from the first release precisely because
  readers export it. Falsifiable: a file exported by Bob's browser must
  load in the app with no conversion step.
- We expect a mark to survive a republish of the document because the
  anchor is resolved by the same ladder on the reading side as in the app,
  against the version the reader is looking at, and the ladder ends in an
  orphan listing rather than a guess. Falsifiable: rewrite an annotated
  paragraph, republish, and the mark must either find its words or be
  listed as orphaned — never land on different words.
- We expect the site to be able to store nothing because it stores nothing
  anywhere else either: the published site is files deployed by a static
  host, with no application server to accept a write.

## Scope Conditions

- Platform: the published article in a reader's browser, on desktop, iPad
  and iPhone widths — 1280, 820, and 390 CSS px. No account, no sign-in,
  and no capability required of
  the reader beyond the browser's own storage.
- Population: Bob and Carol — readers of a document they did not write and
  cannot edit. It applies equally to a document published unlisted and to
  one behind a gate, since the gate decides who reaches the page, not what
  they can do on it.
- Assumption: a reader's browser retains its storage between visits.
  Private windows, cleared site data and a second device each start empty,
  and the export file is the only way marks move between them.
- Assumption: a mark belongs to the chapter whose text it was made
  against, even though the article is one page for the whole document. A
  reader who marks two chapters exports two files, each in the same shape
  as the sidecar the app writes beside that chapter.
- Bundle: this intent is a member of the **Annotations** bundle with map
  #22 | itd-2609051336025064 (Mark up a chapter without touching the
  text), and shares one spec with it. 22 is Alice in the app writing the
  sidecar beside her chapter; 23 is Bob in a browser writing the same
  format into his own storage. One file format, two writers: neither
  member is worth building alone.
- Boundary with map #24 | itd-2609051336040242 (Publish someone else's
  annotations as a layer): 23 ends when Bob has a file, and resumes at the
  reader-facing side of a layer Alice publishes — the control on the page
  that shows or hides it, on or off in the reader's own browser. Alice
  loading Bob's file, reviewing it beside her own, the layer itself and
  the name it carries, and the guarantee that her own private marks never
  reach the site unless she publishes them the same way, all belong to 24.
- Boundary with map #10 | itd-2609051335492327 (Read it the way I like
  it): both keep state in the reader's browser, and the boundary is what
  is kept. 10 owns display preferences — theme, text size, measure. 23
  owns marks about the text — highlights, notes, reviewed marks, cards.
  Clearing one must not clear the other.
- Boundary with map #9 | itd-2609051335489928 (Read the document as a
  Tufte article): 9 owns the page, its layout and its margin notes; 23
  owns only what a reader adds on top of it and where that is kept.
- Out of scope: browser storage mechanics and the export path, which are
  plumbing; sending the file anywhere on the reader's behalf, which never
  happens; and any collection of readership, which the product does not
  do.

## Acceptance Criteria

- Given Bob opens a published article on a browser that has never seen it,
  when he selects a sentence and highlights it, writes a note against a
  paragraph and marks a Section reviewed, then all three appear on the
  page and are still there after a full reload of the same link in the
  same browser.
- Given Bob is making marks on the page, when outbound network activity is
  observed for the whole session, then no request carries annotation
  content, and after the session the published site's files and any host
  record are unchanged.
- Given Bob's marks in one browser, when the same link is opened in a
  private window, in a second browser, or on a second device, then the
  page shows the document with no marks on it.
- Given Bob has a highlight, a note and a reviewed mark, and they fall in
  two different chapters of the one page he is reading, when he exports,
  then he receives one file per chapter he has marked, each in the same
  format the app writes beside a chapter, and each loads in the app with
  no conversion step and lands on the chapter it was made against.
- Given Bob has set theme to dark and text size to larger and has made
  three marks, when he clears his marks, then the theme and text size
  survive; and when he instead resets the reader controls, then the three
  marks survive.
- Given Bob annotated the stable link and Alice then republishes with the
  annotated paragraph rewritten and a Section renamed, when Bob reopens
  the stable link, then each mark either re-attaches to its quoted words
  or is listed as orphaned with its quote, and no mark is drawn over
  different words.
- Given Carol opens the same link at iPhone width (390 CSS px), when she
  selects a passage, highlights it and adds a note, then the mark and the
  note read in the flow of the text with no horizontal scrolling and no
  pinch zoom, and the same holds at iPad width (820 CSS px) and desktop
  width (1280 CSS px).
- Given a published version carrying a layer Alice has published (map
  #24), when Carol opens the stable link, then the article offers a
  control to show and hide that layer, off until she chooses it, and
  turning it on shows the layer's highlights and notes against the
  passages they resolve to; turning it off returns the page to how it was
  before she chose it.
- Given Carol has turned a layer on and reloads the page, when it loads
  again, then her choice is restored from her own browser, and the files
  served for that version are unchanged — the site has recorded nothing
  about her.
- Given Carol reading at iPhone width (390 CSS px) turns a layer on, when
  its highlights and notes render, then they are legible with no
  horizontal scrolling and no pinch zoom, the notes folding into the flow
  the way margin content does at that width; and at iPad width (820 CSS
  px) and desktop width (1280 CSS px) they sit in the margin beside the
  passages they belong to.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`);
  legible on three device classes (`itd-2609051336128348`), at 390, 820,
  and 1280 CSS px; no machine in the document (`itd-2609051336080960`);
  one source, always (`itd-2609051336090390`); and orphan, never guess
  (`itd-2609051402235443`) — a reader's mark re-resolved against a
  version they did not edit either finds its own words or is reported as
  orphaned, and never lands on different ones.

## Open Questions

- The anchor format, and how much editing it tolerates before an
  annotation is reported as orphaned rather than re-attached, is open in
  03-evidence under "Annotations". It bites harder here than in the app,
  because a reader's marks are re-resolved against a version they did not
  edit and cannot inspect.
- How a mark made in the browser names the chapter it belongs to, given
  that the published page exposes no chapter filenames. The export has to
  carry a name the app can match, and what that name is has not been
  settled.
- Whether a reader can bring an exported file back into a browser — from
  a laptop to a phone, say — since export is currently the only way marks
  leave and there is no way in.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
