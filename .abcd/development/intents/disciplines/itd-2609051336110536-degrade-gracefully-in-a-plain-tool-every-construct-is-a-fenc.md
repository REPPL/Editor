---
id: itd-2609051336110536
slug: degrade-gracefully-in-a-plain-tool-every-construct-is-a-fenc
spec_id: null
kind: discipline
suggested_kind: discipline
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Degrade gracefully in a plain tool

## Rule

Every extension is a fenced div with attributes, a heading or image
attribute, or an HTML comment. A plain Markdown reader reads past it, the
prose around it stays intact, and no content is lost.

## Forbids

- A bespoke lightweight syntax: a new inline delimiter, a pipe-separated
  directive line, a `Video:` convention, or any form that needs a parser
  extension beyond attributes, fenced divs, and comments.
- Meaning carried outside the text: a heading heuristic, a positional CSS
  selector, a filename convention, or a script that wires content the
  Markdown does not name.
- A construct whose content disappears in a plain reader, or whose
  markers break the paragraph they sit in.
- Metadata in a form a plain tool cannot skip, in place of front matter
  or a sibling file.
- A palette entry that writes anything other than one of the three
  permitted forms.

## Binds From

Phase 1, with the first palette entries, and it governs every construct
added afterwards: citations and eggs in phase 2, the variant marker in
phase 3, the video block in phase 4.

## How A Spec Proves It

- Given a chapter using every construct in the canon, When it is
  converted by a plain Pandoc-compatible tool with no Editor extension,
  Then the conversion succeeds, the prose appears in source order, and no
  paragraph of content is dropped.
- Given the same chapter opened in a plain text editor, When Alice reads
  it, Then every construct is legible as text and she can edit the
  content inside a fenced div without disturbing the Markdown around it.
- Given every entry in the insert palette, When each writes its canonical
  form at the cursor, Then each form is a fenced div with attributes, a
  heading or image attribute, or an HTML comment — and nothing else.
- Given `<!-- pagebreak -->` alone on a line, When the article and the
  deck are built, Then it is ignored and nothing is printed where it sat.
- Given a proposed construct that requires a parser extension — a new
  inline delimiter, or a directive line with its own separator — When it
  is offered for the canon, Then it is refused, however convenient it
  reads.
- Given a chapter edited in another Markdown tool and saved, When Editor
  reopens it, Then every construct still parses and no attribute has been
  lost.

## Why

`02-constraints.md` locks the canon in these words: "Every extension is a
fenced div with attributes, a heading attribute, or an HTML comment, so
Emacs, Pandoc, and any plain renderer read the file and degrade
gracefully." The evidence for the cost of the alternative is the
acceptance project, where interactivity "lives in a hand-built reading
app, not in the Markdown" and "every video, transcript, and PDF is wired
from JavaScript by filename convention, not from the text": content that
cannot be read, moved, or archived without the app that made it. The
article prototype makes the positive case — "nothing in that reading
experience depends on Org mode: it depends on the heading structure and
the rendering script" — which is only true because the source stayed
plain. `03-evidence.md` records what the rule costs: "more verbose
source; the author needs the insert palette to remember it". That is the
trade the maintainer took, so that the file outlives the tool.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
