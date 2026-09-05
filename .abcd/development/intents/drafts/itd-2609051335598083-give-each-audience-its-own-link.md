---
id: itd-2609051335598083
slug: give-each-audience-its-own-link
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: major
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317492681]
---

# Give each audience its own link

## Press Release

Alice has one text and two audiences. The room at the conference gets
forty minutes; the people who follow up afterwards get the whole
argument. She has marked the passages that belong to one audience and not
the other, and she presses Publish once. Editor builds every variant the
document declares and hands her one link for each, side by side in the
publish panel with a copy button against each. The publish log records
them together: one document, one stable id, one version, two links.

Bob opens the talk link on his laptop. He reads the talk. The contents
list holds the talk's headings, the margin notes hold the talk's
citations, the reference list at the foot holds the talk's sources, and
nothing anywhere on the page mentions that a longer reading exists. There
is no switcher, no "read the full version" line, no greyed-out control.
The page is not a filtered view of something larger; it is the document,
as far as it goes.

Carol opens the link Alice sent her, which is the reader's variant under
the same id. She gets the longer text, with the passages Bob never saw
and the references that hang off them. She cannot tell from the page that
Bob's reading is shorter, and Bob cannot tell from his that hers is
longer. Alice sends the right link to the right person and keeps writing
in one file.

## Why This Matters

Without this, one text for two audiences means two texts. Alice copies
the document, cuts the parts the conference does not need, and from that
moment the two drift: a correction lands in one and not the other, and
six months later she cannot say which is right. Marking the differences
in one file only helps if the marks reach the reader, and a reader who is
offered a choice of variants has been told about the audience they are
not in. The link is the only place the choice can live without being
visible.

## Mechanism

We expect one text to serve several links because selection happens at
build time, not at read time: the core's `variant` module filters the
tree to one variant, including the footnotes and citations inside removed
blocks, and each variant is then rendered as a complete, independent set
of pages (05-internals.md sections 2 and 4). Nothing at read time decides
what to show, so there is no state to get wrong and nothing to defeat.

We expect readers not to discover the other variants because a variant's
delivered bytes contain no reference to any other variant: its pages are
siblings under the stable id and nothing links between them
(05-internals.md section 9). This is falsifiable in the simplest way —
search every file of one variant's build for another variant's name or
path, and the claim fails on the first hit.

We expect a link not to give up its siblings when a reader shortens it,
because a variant's path segment is an unguessable token minted with the
id rather than the variant's own name: shortening the talk link reaches
the document's id and nothing else, the id alone renders the presenter's
empty shell, and no path a reader can construct from what they hold
reaches another audience's reading. A variant path that spelled out
`talk` or `full` would defeat every other guarantee in this intent with a
single edit to the address bar.

We expect this to be the correct unit of work because the acceptance
project already carries three variants of one text, with the
conditionality living in heading heuristics and positional CSS and a
three-way switcher in the reading app; 03-evidence.md records that the
strongest reviewer ranked conditional content per variant as the top
risk. Moving selection into the link removes the switcher, and with it
the moment where a reader is shown the shape of a document they are not
being given.

We expect the cost to Alice to be one action, not one per audience,
because the publish action already walks every declared variant to build
them; producing a second path costs a second write, not a second publish.

## Scope Conditions

- Platform: the presenter site deployed from the production repository.
  Every variant is its own path beneath the document's stable id, built
  and pushed by the same publish action; nothing is served dynamically
  and no reader request chooses a variant.
- Population: Alice publishes. Bob and Carol each hold one link and read
  one variant. There are no accounts and no reader identity anywhere in
  this moment.
- Assumption: the set of variants is declared once for the document, with
  one of them the default, and a document that declares a single variant
  publishes exactly as it does with none.
- Assumption: each variant has its own path token, minted with the id and
  unguessable, its own stable link under that token serving that
  variant's latest version, and its own path beneath each published
  version. The document's id alone is not a link to anything: it renders
  the presenter's empty shell, exactly as a wrong id does, so there is no
  default-variant address derivable from another variant's.
- Boundary with map #14 (itd-2609051335537470, Write one text for two
  audiences): 14 owns the moment of marking — the `.variant` fenced div
  and the inline span, the preview of one variant in the app, and the
  sidebar badges that say which variants a chapter carries. 19 owns only
  the published links: that each declared variant is built to its own
  path under one id, and that no page reveals another exists. The marks
  and the preview are 14's; everything after Publish is 19's.
- Boundary with map #7 (itd-2609051335468596, Publish and get a link I
  can open from the lectern): 7 owns the publish action itself — the
  stable id, the version hash, the unlisted flag, the presenter that
  shows nothing without an id, and one link for the default variant. 19
  owns the second and every further link, and nothing else about
  publishing.
- Boundary with map #20 (itd-2609051336005698, Publish something only
  named people can open): 19 says nothing about who may open a variant
  link. The access policy over a published document, and whether it
  covers every variant path together, belong to 20.
- Boundary with map #21 (itd-2609051336019782, Receive a journal-style
  PDF with the document): the per-variant PDF beside each version is
  21's. 19 stops at the article and the deck for each variant.
- Out of scope: any reader-facing control that changes variant, in any
  rendering, on any device; and any page, index, or feed that lists the
  variants of a document.
- Excluded plumbing: the site's path layout, and the variant filter in
  the core.

## Acceptance Criteria

- Given a document whose metadata declares `variants: [full, talk]` with
  `default_variant: full`, when Alice publishes, then the publish panel
  lists one link per declared variant with a copy control against each,
  and the publish log entry records both links under one stable id and
  one version hash.
- Given a chapter containing `She arrived [in the second week]{.variant
  variant="full"} and stayed.`, when Bob opens the talk link, then the
  marked span is absent from the rendered page and from the page source,
  and the surrounding sentence reads with no gap, marker, or placeholder
  where it was.
- Given a `::: {.variant variant="full"}` block containing a footnote and
  a `[@smith2020]` citation, when the talk variant's pages are built,
  then neither the footnote nor the reference appears in the talk
  article, the talk deck, or the talk's generated reference list.
- Given the complete build of one variant, when every file in it is
  searched, then no other declared variant's name or path token appears
  as a path segment, a link target, or a rendered string, and no page
  carries a control, menu item, or keyboard chord that changes variant.
  (Negative case.)
- Given Bob holds the talk link and nothing else, when he shortens it
  segment by segment, then every address he can reach that way renders
  the presenter's empty shell — including the document's id on its own —
  and none of them reaches the reader's variant, its version paths, its
  assets, or its paper. (Negative case.)
- Given the talk link and the reader's link side by side, when their
  paths are compared, then neither variant's segment is the variant's
  own name, nor derivable from the other's, nor derivable from the
  document's id: each is a token minted with the id. (Negative case.)
- Given a chapter containing a block marked `variant="draft"` where
  `draft` is not among the document's declared variants, when Alice
  publishes, then publish stops before anything is pushed, names the
  chapter and the line, and no version folder appears on the site.
  (Negative case.)
- Given two published versions of a document with two variants, when the
  stable link for one variant is requested, then it serves that variant's
  latest version, and when the earlier version's link for that variant is
  requested, then it still serves what it served before, unchanged.
- Given the talk variant's article at iPhone width (390 CSS px), at iPad
  width (820 CSS px), and at desktop width (1280 CSS px), when Carol
  reads it, then the contents list and navigation show only the talk's
  headings, margin notes fold into the flow at the narrowest width, and
  no page scrolls sideways or needs pinching at any of the three.
- Inherits: variant fidelity (`itd-2609051336107315`); one source, always
  (`itd-2609051336090390`); the renderings agree
  (`itd-2609051336130664`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; network only on
  publish (`itd-2609051336158553`); nothing is stored about a reader
  (`itd-2609051336145770`).

## Open Questions

- The length of the stable id and of the version hash is open in
  03-evidence.md ("Publish and pipeline"). It matters here because every
  variant path sits beneath the id, so for an unlisted document the
  length of the id and of the variant's own token together are the whole
  of what protects each audience's link. The token's length is the same
  question in a second place.
- Whether the presenter, the article script, and the slide engine are
  maintained once in the production repository and shared by every
  document, rather than copied into each published version, is open in
  03-evidence.md ("Publish and pipeline"). If they are shared, they sit
  above the variant paths and must therefore carry nothing that names a
  variant of any document.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
