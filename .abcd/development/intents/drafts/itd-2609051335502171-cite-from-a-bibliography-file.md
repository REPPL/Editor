---
id: itd-2609051335502171
slug: cite-from-a-bibliography-file
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317455985]
---

# Cite from a bibliography file

## Press Release

Alice keeps a BibTeX file beside her document and names it in the
document's metadata. When she wants to cite something, she types an
opening bracket and an at sign, and the editor completes the key from
that file as she types. Hovering a completed key shows the matching
reference without taking her out of the sentence. One key —
`[@smith2020]`, or `[@smith2020, p. 4]` when the page matters — is the
whole gesture. Footnotes work the same way, in the same plain syntax.

That one key becomes three different things without Alice doing anything
more. Bob, reading the article on his laptop, sees a numbered marker in
the paragraph and the full reference in the margin beside it, so he never
leaves the sentence to find out who said it. Carol, in the audience while
Alice presents the same chapter, sees a short source line at the foot of
the slide. The journal PDF that arrives with every publish carries a
numbered reference and a reference list at the end. Alice types no
reference list anywhere: every one of them is built from the keys the
text actually uses, so a passage she cuts takes its reference with it.

When a key resolves to nothing — a typo, or a work she has not added to
the file yet — no rendering quietly prints the brackets as literal text.
The preview marks the citation, and the chapter's row in the sidebar
lists the unresolved key beside what else that chapter carries. Alice
finds out while she is writing, not from the projector.

## Why This Matters

A reference typed by hand is a reference that drifts. Alice writes the
same work into an article, a deck, and a paper, and the three copies
diverge the moment she corrects one of them — and correcting all three is
work she has to remember to do. Worse, a reference list typed by hand
keeps entries for passages that no longer exist and quietly loses the
ones she added last. Naming a source once, by a key, and letting every
rendering ask the same file for the answer removes both problems and the
proof-reading pass that goes with them.

## Mechanism

- We expect completion plus hover to be enough for Alice to stop typing
  references by hand, because the reading half of this is already proven:
  the article prototype renders numbered citations with their full
  reference in the margin and readers stay in the text
  (`03-evidence.md`, "The article prototype"). Only the authoring gesture
  is new, so the risk sits in one place.
- We expect a citation key to be safe to write into the canon because it
  is Pandoc's own `[@key]` form against a BibTeX file, which
  `02-constraints.md` locks. Emacs, Pandoc, and any plain renderer read
  the chapter unchanged; an unrecognised key degrades to visible text
  rather than to a broken construct.
- We expect one resolution step, shared by every rendering, to keep the
  three renderings honest, because the reference list is a function of
  the one tree and the one bibliography rather than three per-renderer
  implementations (`05-internals.md`, section 4, the `bibliography`
  module). This is falsifiable: hand the same chapter to the article, the
  deck, and the PDF, and the entries, the numbering, and the omissions
  must match, or the claim is wrong.
- We expect unresolved keys to be catchable at writing time rather than
  at publish time, because the sidebar already reports per chapter what
  that chapter carries, and an unresolved key is one more such fact
  (`04-surfaces.md`, section 1).
- We expect this moment to need a purpose-built test document, because
  the acceptance project contains zero citations, footnotes,
  bibliography, code fences, or block quotes (`03-evidence.md`, "The
  acceptance project"). Nothing in the real material exercises this, so
  a document written for the test is the only evidence available.

## Scope Conditions

- Platform: authoring happens in the desktop app, in the system web view;
  display happens in the online article, the deck, and the journal PDF.
  The bibliography is a BibTeX file inside the document folder, named in
  the document's metadata, and it is read from disk with no network call.
- Population: Alice is the only person who writes a citation. Bob reads
  the article, Carol watches the deck or receives the PDF; neither is
  offered any control over how a reference is displayed.
- Assumption: exactly one citation style is configured per document. Which
  styles ship first is open in `03-evidence.md`, so this intent covers the
  configured style resolving, generating, and agreeing across renderings,
  not the catalogue of styles.
- Assumption: a chapter with no citations and a document with no
  bibliography file are both ordinary cases, not errors. The reference
  list is simply absent.
- Boundary with map #9, itd-2609051335489928 (Read the document as a Tufte
  article): in scope here is the key, the file, the resolution, and the
  generated reference list; out of scope is where the margin note sits on
  the page, how it folds on a narrow screen, and what the navigation does
  with it — #9 owns the article's layout.
- Boundary with map #5, itd-2609051335447894 (Present a chapter with no
  slide markup): in scope here is that a Section's citations resolve to a
  source credit for that slide; out of scope is the slide mapping itself
  and where the credit line sits on the slide — #5 owns the deck.
- Boundary with map #21, itd-2609051336019782 (Receive a journal-style
  PDF with the document): in scope here is the entries the PDF is given
  and their agreement with the other two renderings; out of scope is the
  printed artefact — numbering style on the page, the foot-of-page rule,
  the contents list — which #21 owns.
- Boundary with map #3, itd-2609051335415528 (Insert a construct I cannot
  remember): #3 owns only that choosing "citation" or "footnote" in the
  palette puts the canonical form at the cursor; this intent owns what
  happens to that form afterwards, including completion, hover, and
  resolution.
- Out of scope: the BibTeX reader itself and the implementation of any
  particular style, which are plumbing in `05-internals.md`; and the
  removal of a citation that sits inside a filtered variant block, which
  the *variant fidelity* discipline owns.

## Acceptance Criteria

- Given a document whose metadata names `bibliography: references.bib`,
  and a chapter containing `[@smith2020]` where that key exists in the
  file, when Alice opens the preview, then the citation renders as a
  numbered marker at that point and the entry's full reference appears in
  the margin beside its paragraph, and the generated reference list holds
  exactly the entries the chapter cites and no others.
- Given the same document, when Alice types `[@smi` in the editor, then
  the completion list offers every key in `references.bib` beginning with
  those letters, and resting on a completed key shows that entry's
  author, title, and date in place, without opening a separate window.
- Given a chapter containing `[@smith2020, p. 4]` and a Pandoc footnote
  written as `^[an inline note]`, when the article, the deck, and the PDF
  are produced from that one chapter, then the citation carries its
  locator in all three, the footnote appears as a margin note in the
  article, as part of the slide's credit line in the deck, and as a
  numbered note at the foot of the page in the PDF, and the entry appears
  exactly once in each generated reference list.
- Given a chapter containing `[@nosuchkey]`, where that key is in no
  entry of `references.bib`, when Alice opens the preview, then the
  citation is marked as unresolved in the preview and the key is listed
  against that chapter in the sidebar, and no rendering prints
  `[@nosuchkey]` as literal bracketed text to a reader.
- Given a Section whose text carries a citation, when Alice presents that
  chapter, then the slide for that Section shows a short source line at
  its foot naming the cited work, and the slide carries no margin note
  and no reference list.
- Given the published article open at an iPhone-width viewport, when Bob
  reaches a paragraph carrying a citation, then the margin reference
  folds into the flow directly beneath that paragraph, and neither the
  page nor the reference requires horizontal scrolling or pinch zoom.
- Given a chapter carrying citations and footnotes, when it is opened in
  a plain Markdown tool that knows nothing of the canon, then every
  citation and footnote is readable as ordinary text and no construct
  stops the tool rendering the rest of the chapter.
- Inherits: The renderings agree (this intent is its first hard test);
  One source, always; Degrade gracefully in a plain tool; Legible on
  three device classes; Round-trip byte-fidelity; Network only on
  publish; Variant fidelity, from the phase it binds.

## Open Questions

- Which citation styles ship first (`03-evidence.md`, "Open questions",
  "Citations"). Until this is settled, the acceptance criteria above
  describe one configured style, not a choice offered to Alice.
- Where the `bibliography` and `citation_style` keys this moment reads
  actually live: a metadata file at the document root, or front matter in
  the first chapter (`03-evidence.md`, "Open questions", "Document model
  and canon").

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
