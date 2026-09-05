---
id: adr-2609051324147479
slug: document-model-folder-of-chapters
status: accepted
date: 2026-09-05
supersedes: null
superseded_by: null
related_intents: [itd-2609051335399446, itd-2609051335415528, itd-2609051335529787, itd-2609051335537470]
related_rfcs: []
related_adrs: []
---

# ADR-2609051324147479: A document is a folder of chapters in Pandoc-compatible Markdown with variants

## Context

The maintainer's acceptance project is one flat Markdown file four heading levels deep, rendered three ways for three audiences, with the conditionality living in code. The prototypes accumulated a private dialect: three bars for columns, a Video line, colon-fenced callouts, Note lines, comment layout hints. Emacs, Pandoc, and every other tool must keep reading the files, and the author will not remember a dialect.

## Decision

On disk a document is a folder: Part = folder, Chapter = Markdown file, Section = H2, Sub-section = H3, Sub-sub-section = H4, ordered by numeric filename prefix; every chapter lives inside a Part, and a flat file is split into chapters under one Part on import. The Markdown canon is Pandoc-compatible: every extension is written in one of five forms — a fenced div with attributes, a heading attribute, an image attribute, a bracketed span attribute, or an HTML comment — so a plain renderer degrades gracefully. Citations are Pandoc citation keys against a BibTeX file beside the document and footnotes are Pandoc footnotes; neither is an extension. Variants are core: a block or span carrying a variant class renders only in that variant, and `document.yaml` at the document root declares the document's variants along with the rest of its metadata. The slide-only constructs (a columns div, a notes div, a divider heading attribute) are ignored by the article and the PDF; a horizontal rule is the exception, because it is a rule in all three renderings and splits a slide as well.

## Alternatives Considered

1. One file, always. Simplest round trip, but reordering a part is cut and paste, and the acceptance project shows the file already diverging into three copies. Rejected.
2. The author's choice of shape per document. Two code paths for every feature forever. Rejected.
3. A private dialect optimised for typing. Fastest to write; only Editor reads it fully; Emacs and Pandoc lose. Rejected in favour of an insert palette that makes the canonical forms one key away.
4. Variants as separate documents. Simple, and exactly the drift the acceptance project suffers today. Rejected.

## Consequences

Every renderer must implement the same small extension set, written out once in the brief's internals chapter. Split-on-import must be byte-preserving when the chapters are concatenated. The insert palette carries the syntax burden. Variants complicate every export: each variant is a separate rendering, a separate link, and a separate PDF.
