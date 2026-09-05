---
id: itd-2609051336025064
slug: mark-up-a-chapter-without-touching-the-text
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

# Mark up a chapter without touching the text

## Press Release

Alice rereads a chapter she drafted in the spring. She drags across a
sentence and it lights amber. She writes a note against the paragraph
beneath it. She marks a Sub-section reviewed, and picks three headings out
as cards to test herself on later. The chapter's Markdown does not change
by a single character: she can open the same file in Emacs, or in any
plain editor, and find exactly the text she wrote, with none of her marks
in it.

The marks live in one small file beside the chapter, named for it. Alice
can read it, copy it, put it under version control, or delete it, and the
chapter is untouched either way. Every mark carries the words it was made
against, the heading it sits under, and where it fell, so the file makes
sense on its own.

A week later she rewrites the paragraph above it, adds two more, and
renames a Section. When the chapter reloads, the highlight is still on the
same sentence, the note is still against the same paragraph, and the
reviewed mark is still on the same Sub-section — they have moved with the
text. Where a passage has genuinely gone, the mark is not silently
dropped: it appears in a list of orphaned marks, quoting the words it was
made against, for Alice to re-place or discard. Nothing is ever painted
over words it did not belong to.

None of this leaves her machine. Her marks are hers, on her own document,
until she decides to do something with them.

## Why This Matters

The way to annotate a document today is to write the annotation into it.
The acceptance project does exactly that: highlights, notes and reviewed
marks round-trip into the Markdown as a fenced note block, a comment after
a heading, and an inline mark tag with a colour attribute, so the source
fills up with reader markup, marking a document means editing it, and
every rendering has to be taught to ignore the marks. Alice wants to work
over her text — question it, colour it, keep track of what she has been
through — without the text becoming something other than what she wrote.

## Mechanism

- We expect an anchor to survive ordinary editing because every node in
  the parse tree carries its source span as byte offsets into the chapter
  file (05-internals section 2), so an anchor recorded as offsets *plus* a
  quoted excerpt with its prefix and suffix can be re-resolved against a
  freshly parsed tree rather than trusting a stored position. Falsifiable:
  edit above an annotation and the offsets alone must fail while the
  excerpt still finds it.
- We expect the five-step resolution ladder (05-internals section 7) to
  re-attach the great majority of marks after real edits because the
  maintainer's own reading app already re-attaches annotations from a
  quoted excerpt plus a position, which 01-product records as the
  assumption this rests on and 03-evidence records as prior art:
  "Reader-layer state is real, and an HTML-to-Markdown round trip is prior
  art rather than a novelty."
- We expect the chapter to stay byte-identical because annotating never
  calls the serialiser: an annotation action writes the sidecar and
  nothing else. This is falsifiable by hashing the chapter before and
  after any annotation action.
- We expect one sidecar per chapter, rather than one per document, to be
  the right unit because the chapter is what moves: it is what opens in
  the editor, what the single file imports and exports, and what import by
  split produces. A mark's file therefore follows its text.
- We expect the excerpt-based anchor to cost less than the in-text
  conventions it replaces because receiving someone else's marks becomes
  reading a second file rather than merging prose — the trade-off
  03-evidence records for this decision: "An anchor model that must
  survive edits; the in-text conventions remain an import path."

## Scope Conditions

- Platform: the desktop app, in the system web view on macOS, per
  02-constraints. The sidecar is plain JSON beside the chapter in the
  document folder, so any tool can read it.
- Population: Alice, the author, annotating her own document on her own
  machine. One author at a time; concurrent editing from two devices is
  out of scope for the product (06-delivery).
- Assumption carried: annotations re-attach after edits from a quoted
  excerpt plus a position, held until overturned in 01-product. How much
  editing that tolerates is open (see Open Questions).
- In scope: the four kinds — `highlight` with a colour, `note` with text,
  `reviewed` against a heading, and `card` — written to one sidecar per
  chapter; anchor resolution on load; the orphan list when resolution
  fails.
- Bundle: this intent is a member of the **Annotations** bundle with map
  #23 | itd-2609051336037640 (Keep my own marks on someone else's page),
  and shares one spec with it. 22 is Alice in the app writing the sidecar;
  23 is Bob in a browser writing the same format. Neither is worth
  building without the other, because the format is the point.
- Boundary with map #24 | itd-2609051336040242 (Publish someone else's
  annotations as a layer): 22 ends with a private file in the document
  folder. Loading anyone's file, reviewing it, publishing it as a layer,
  and the guarantee that private marks are not published, all belong to
  24.
- Boundary with map #25 | itd-2609051336055362 (Rehearse from cards built
  out of the headings): 22 owns making and storing `card` annotations in
  the sidecar. Generating a deck from the headings, flip mode, scored
  mode, and session scoring belong to 25.
- Boundary with map #13 | itd-2609051335529787 (Bring an old single-file
  manuscript in) and map #18 | itd-2609051335586905 (Edit on the iPad and
  bring the text back): those intents own the fidelity of the text through
  a split and through a round trip. 22 owns only how anchors behave across
  the edits they permit, and asserts that annotating itself never writes
  to the chapter.
- Out of scope: the resolution ladder's implementation and the sidecar
  schema, which are plumbing in 05-internals section 7; rendering marks on
  a published page, which is 23 and 24.

## Acceptance Criteria

- Given a chapter `01-opening.md` with no sidecar, when Alice highlights a
  sentence and picks amber, then `01-opening.annotations.json` is written
  beside it with `schema_version`, `chapter: "01-opening.md"`, and one
  annotation of kind `highlight`, `colour: "amber"`, whose `anchor`
  carries `path`, `block`, `quote`, `prefix`, `suffix`, `start` and `end`.
- Given that same chapter now carries a highlight, a note, a `reviewed`
  mark on a Sub-section heading and a `card`, when the Markdown file is
  opened in a plain text editor, then it contains no `::: {.note}` block,
  no `<!-- done -->` comment and no `[…]{.mark}` span, and its SHA-256
  matches the hash taken before the first mark was made.
- Given an annotation anchored inside a Section, when Alice inserts two
  paragraphs above it, rewords a sentence elsewhere in the same Section
  and saves, then on reload the highlight covers the same words, the note
  sits against the same paragraph, and the sidecar's `start` and `end`
  have been rewritten to the new offsets.
- Given an annotation whose quoted excerpt no longer appears anywhere in
  the chapter, when the chapter reloads, then the annotation is listed as
  orphaned with its `quote` and its heading `path`, remains in the
  sidecar, and no highlight is painted over any other text.
- Given a chapter whose headings Alice has turned into cards, when she
  inspects the document folder, then every card is an annotation of kind
  `card` inside that chapter's one sidecar and no separate deck file
  exists.
- Given a chapter with a sidecar, when Alice deletes the sidecar in Finder
  and reopens the chapter, then the text and every preview are exactly as
  before, the marks are simply gone, and the app reports the absent file
  as normal rather than as an error.
- Given the app is open and Alice creates, edits and deletes annotations
  for ten minutes without pressing Publish, when outbound network activity
  is observed, then no request is made at all.
- Given a chapter carrying twenty annotations, when the app window is
  narrowed to iPad width (1024 px), then the text and the list of marks
  are both legible with no horizontal scrolling and no clipped controls.
- Inherits: Round-trip byte-fidelity; No machine in the document; One
  source, always; Degrade gracefully in a plain tool; Legible on three
  device classes; Network only on publish.

## Open Questions

- The anchor format itself, and how much editing it tolerates before an
  annotation is reported as orphaned rather than re-attached, is open in
  03-evidence under "Annotations". This intent's acceptance criteria fix
  the observable behaviour at both ends of that range — re-attach after an
  edit in the same Section, orphan when the excerpt is gone — but the
  threshold between them is not yet decided.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
