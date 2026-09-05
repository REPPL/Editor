---
id: itd-2609051317484141
slug: carry-a-document-as-one-self-contained-html-file-that-reads
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051335570842, itd-2609051335586905]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Carry a document as one HTML file

## Press Release

Alice exports her document as one HTML file. It opens from disk with no
network: the article, the slides, every embedded image, style, and font.
Large media shows a poster and a link until she is online. She sends the
file to Carol as an attachment, and Carol reads it on whatever she has.

The same file is an editor. On her iPad, with a keyboard, Alice opens it
in Safari, imports the chapter's Markdown, edits with the Emacs bindings,
and exports the Markdown back. Nothing else changes. Back at her desk she
imports the result into Editor and the chapter updates in place.

## Why This Matters

A document that needs an app to read it is not owned. One file that reads
anywhere and edits anywhere, years from now, is the guarantee that the
Markdown format alone does not give.

## Mechanism

We expect a single file to carry the article and the deck because both are
static HTML with one script, and the prototype article already proves the
format at length. We expect it to work as an editor because a browser can
read a chosen local file and offer a download, which is all import and
export need; the editor component is the same CodeMirror build the desktop
app uses.

## Scope Conditions

- Embed-small-link-large from the constraints chapter; large media links to
  the published site.
- Import and export move one chapter's Markdown at a time; assets are not
  moved.
- Safari on iPad with a hardware keyboard is the tablet target.

## Acceptance Criteria

- Given a document exported as one HTML file and opened from disk with no
  network, then every page and slide, image, style, and font shows, and
  large media shows a poster and a link.
- Given the file open in Safari on an iPad with a keyboard, when Alice
  imports a chapter's Markdown, edits with the bindings in the spec's
  table, and exports, then the exported Markdown differs from the import
  only by her edits.
- Given a Markdown file exported that way, when Alice imports it into the
  desktop app, then the chapter updates in place and every asset reference
  resolves.

## Open Questions

- Whether the file can import a whole chapter folder as a zip.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
