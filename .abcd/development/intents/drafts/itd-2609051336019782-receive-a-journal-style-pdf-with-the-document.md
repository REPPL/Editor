---
id: itd-2609051336019782
slug: receive-a-journal-style-pdf-with-the-document
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317508768]
---

# Receive a journal-style PDF with the document

## Press Release

Alice presses Publish, and a little later a PDF is sitting beside the
version on the presenter, offered as one more link next to the article
and the deck. She installed nothing, ran nothing, and waited for nothing
on her own machine: the app shows the render's status against the
version — rendering, done, or failed with the reason — and never a
preview, because the typesetting happens in the pipeline rather than on
her laptop.

The PDF is not the article in print clothes. It is a modern
academic-journal layout: clean type set to a single measure, strong
tables, footnotes at the foot of the page they belong to, numbered
references with the entries generated at the back, a contents list that
follows the Parts and Chapters, and page numbers. Where Alice wrote a
page-break comment in the source, the page breaks. Where she wrote a
video, the poster frame prints with a link beneath it. The marks hidden
in the article print as static asides, so nothing that was written is
missing. The columns, the speaker notes, and the divider slides — the
things that exist only for a deck — are not there at all.

Bob is reading the article on the version link Alice sent him. He wants
it on paper, with a pen. He clicks PDF beside that version and gets a
document he can print, mark up, and cite by page number, holding the same
text he was just reading and the same references in the same order. Carol
holds the other variant's link; her PDF is her variant's, with its own
reference list, rendered beside her own version. Neither of them meets a
render step, a font, or a toolchain.

## Why This Matters

Print is a different reading, and a web page pressed through a browser's
print dialogue is not it: the tables break, the footnotes migrate, and
the references lose their numbers. Today the only way to get a proper
printed artefact out of a document like Alice's is a hand-maintained
preamble and a build command nobody committed. 03-evidence.md records it
of the acceptance project as "three page-break comments honoured by a
print preamble, with no committed build command"; the research note
`2026-09-05-acceptance-project-review.md` sets it out at length: "The
source relies on three page-break HTML comments that a LaTeX preamble
turns into page breaks. No build command is committed; the PDF route
survives only as that preamble." A rendering that arrives with every publish, from the same
text, is the difference between a printable document and a document
somebody once managed to print.

## Mechanism

We expect a journal PDF to come out of the same text because print is a
rendering of the one document tree exactly as the article and the deck
are: `render/print` reads the same nodes, with the same attributes and
the same variant filtering already applied (05-internals.md sections 2
and 4). This is falsifiable against the article: for one variant, the
PDF's reference list and the article's must hold the same entries in the
same order, and any divergence is a bug in the core rather than in either
renderer.

We expect the pipeline to be the right place for it because Typst is a
single binary in the build runner, and ADR-2609051324167479 records the
alternative that was rejected for its cost — a TeX toolchain in CI and
slower builds. Keeping the render off Alice's machine also means the app
never needs fonts, a typesetter, or a second install path, so a publish
from a fresh machine produces the same PDF as a publish from hers.

We expect there to be exactly one resolver of citations in the product,
because the core's print renderer emits references already resolved — the
numbers, the entries, and the list — and the typesetter only sets what it
is handed. Two resolvers would be two chances to disagree, which is the
one thing the renderings-agree discipline forbids. The core emits the
typesetter's source directly from the shared document model; nothing in
the pipeline converts the text a second time. Falsifiable: the entries
and their order in the paper and in the article must match for one
variant, and any difference is a bug in the core.

We expect the app to be able to report the render's progress without
breaking the network rule, because the rule is that Editor touches the
network during a publish Alice started — the upload, the push, the access
policy, and asking that publish's pipeline how it is getting on — and
never otherwise. The polling ends when the pipeline reports done or
failed, or when Alice cancels; it does not run in the background of an
ordinary editing session.

We expect the deliberate difference from the article to reduce work
rather than add it, because dropping Tufte from print "removes the
margin-note problem entirely from the PDF path"
(ADR-2609051324167479). This is falsifiable: nothing in the printed
output positions content in a margin column, so no construct needs a
print-specific margin rule.

We expect the ignore rules to hold without per-construct argument
because the mapping table in 05-internals.md section 3 gives print its
own column: what a construct does in the PDF is read from that row, not
decided inside the print renderer. Each row is one fixture, so the table
is the acceptance list.

We expect page breaks to survive because `<!-- pagebreak -->` is an HTML
comment that a plain Markdown tool reads past, and 03-evidence.md records
that authors already write exactly this and depend on it.

## Scope Conditions

- Platform: the publish pipeline in the build runner, on every publish.
  Never Alice's machine, never the app, and never a reader's browser. The
  app's part is to report the render's status against the version while
  the publish Alice started is still running, and to stop when it reports
  done or failed or she cancels.
- Assumption: the core resolves every citation and emits the paper's
  source with its references and reference list already resolved; the
  typesetter sets what it is handed and resolves nothing. There is one
  resolver in the product, and map #11, itd-2609051335502171, owns it.
- Population: Bob and Carol read and print the PDF from the presenter.
  Alice never sees the PDF inside the app — only the render's status
  against the version.
- Assumption: every publish produces one PDF per published variant,
  stored beside that variant's version and linked from the presenter
  alongside the article and the deck.
- Assumption: every interactive element has a declared static fallback
  that the PDF prints, specified per element with the article
  (01-product.md, assumptions held until overturned).
- Boundary with map #11 (itd-2609051335502171, Cite from a bibliography
  file): 11 owns the citation key, the bibliography file, resolution, and
  the generated reference list. 21 owns only the printed form — a
  numbered reference in the text and its entry in the list at the back —
  and stands as one of the hard tests that the renderings agree.
- Boundary with map #12 (itd-2609051335518134, Find what is hidden in the
  text): 12 owns the easter egg and the once-only quotation as reading
  moments — the collecting, the tray, the reveal. 21 owns only their
  printed forms, as the mapping table gives them: an egg prints as a
  static aside, an `.opening` block prints as an epigraph on the first
  page.
- Boundary with map #6 (itd-2609051335458626, Shape the deck in the same
  text): 6 owns what the slide constructs mean in a deck. 21 owns only
  that they do not appear in print: a `.columns` div's content falls into
  the flow, a `.notes` div is absent, and a `{.divider}` heading is an
  ordinary heading.
- Boundary with map #14 (itd-2609051335537470, Write one text for two
  audiences) and map #19 (itd-2609051335598083, Give each audience its
  own link): 14 owns the marks and 19 owns the links. 21 owns only that
  each published variant renders its own PDF from its own filtered tree,
  with its own reference list.
- Boundary with map #7 (itd-2609051335468596, Publish and get a link I
  can open from the lectern): 7 stops at pushed and deployed. 21 owns the
  pipeline step that follows, the PDF stored beside the version, the link
  the presenter offers for it, and the status the app reports.
- Out of scope: a PDF preview in the app, a PDF rendered on Alice's
  machine, an author-chosen print theme, and any print layout that
  imitates the article.
- Excluded plumbing: the Typst step, the journal template, and the
  pipeline wiring.

## Acceptance Criteria

- Given a document of two Parts with headings at all four levels, a
  bibliography file, and citations in the text, when a publish completes,
  then a PDF exists beside each published variant's version, the
  presenter offers it as a link beside that version, and the PDF carries
  a contents list following the Parts and Chapters, numbered references
  with a generated list at the back, and page numbers.
- Given a chapter containing `<!-- pagebreak -->` alone on a line, when
  the PDF is rendered, then a page break falls at that point; and when
  the same chapter is rendered as the article, then nothing appears there
  at all.
- Given a chapter carrying a pipe table with a caption and an image
  written `![The lantern at dusk](assets/lantern.jpg "Photograph by
  Carol"){width="75%"}`, when the PDF is rendered, then the table is set
  as a table with every column ruled and aligned as written and its
  caption beneath it, no row is split across a page unless the table
  itself is longer than a page, and the image is placed at the width the
  attribute asks for with its alt text as the caption and its title
  attribute as the credit.
- Given a chapter containing a `::: {.notes}` div, a `::: {.columns}` div
  with two `.column` children, and a `## Interlude {.divider}` heading,
  when the PDF is rendered, then the notes text appears nowhere in it,
  both columns' content appears in source order in the ordinary flow, and
  "Interlude" is set as an ordinary heading rather than a break page.
  (Negative case.)
- Given a `::: {.video poster="assets/keynote-poster.jpg" caption="The
  second half"}` block naming a local and a site source, when the PDF is
  rendered, then the poster frame prints with its caption and exactly one
  link beneath it, and that link is not the `local:` path.
- Given an inline `[✦]{.egg egg="lantern"}` marker with its `::: {.egg
  #lantern label="✦"}` block, and an `::: {.opening once="per-browser"}`
  block, when the PDF is rendered, then the egg's content prints as a
  static aside, the opening prints as an epigraph on the first page, and
  no collectable mark, tray, or reveal control appears anywhere.
- Given a document declaring `variants: [full, talk]` with a `full`-only
  paragraph carrying a `[@smith2020]` citation, when both variants
  publish, then two PDFs exist, the talk PDF contains neither the
  paragraph nor that entry in its reference list, and the two reference
  lists differ by exactly that entry.
- Given a source the print step cannot render, when the pipeline runs,
  then the app reports that version's PDF as failed with the reason
  against the version, the PDF already published for an earlier version
  is untouched, and the new version's article and deck are still served.
  (Negative case.)
- Given the presenter showing one version at iPhone width (390 CSS px),
  at iPad width (820 CSS px), and at desktop width (1280 CSS px), when
  Bob reaches for the PDF, then the link sits beside the article and deck
  links at every one of the three widths with no horizontal scrolling and
  no pinching, and opening it hands the file to the reader's own viewer
  rather than rendering it in the page.
- Given the app open on a document Alice is editing and has not
  published, when outbound network activity is observed for a full
  session, then no request leaves the machine; and Given a publish Alice
  has just started, when the same activity is observed, then the only
  requests are that publish's own — the upload, the push, the access
  policy, and asking that publish's pipeline for its status — and they
  stop when it reports done or failed, or when she cancels.
- Inherits: the renderings agree (`itd-2609051336130664`); variant
  fidelity (`itd-2609051336107315`); one source, always
  (`itd-2609051336090390`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); no machine in the document
  (`itd-2609051336080960`); legible on three device classes
  (`itd-2609051336128348`) — over the presenter's link and the app's
  status at 390, 820, and 1280 CSS px, the paper itself being measured by
  its own page rather than by a viewport; network only on publish
  (`itd-2609051336158553`), which covers the status this moment polls
  for.

## Open Questions

- Whether the PDF renders in a repository action on push or in the site's
  build step is open in 03-evidence.md ("Publish and pipeline"). It
  decides where the status the app reports comes from, and how soon after
  a publish the link can be offered.
- Which journal template ships — a published one or Editor's own — is
  open in 03-evidence.md ("Publish and pipeline").
- Which of a video block's sources is the one printed beneath the poster
  when both a site copy and a gated copy are named. The criterion above
  fixes only that it is not the local path.
- The exact static fallback each interactive element renders for print is
  open in 03-evidence.md ("Article and slides"). Until it is settled, the
  criteria above fix only the egg and the opening quotation.
- Which citation styles ship first is open in 03-evidence.md
  ("Citations"), and the numbered references this PDF prints assume the
  numeric style is among them.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
