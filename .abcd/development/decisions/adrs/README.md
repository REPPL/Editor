# Decision records

Architecture decisions in MADR shape: context, decision, alternatives
considered, consequences. A decision earns a record when it passes three
tests: it is hard to reverse, it is surprising without its context, and it
is the result of a real trade-off. Anything failing one of them is
file-scoped rationale, an open question in the brief's evidence chapter, or
an intent.

Ids are `adr-<yymmddHHMMSS><rrrr>`; the filename is the stamp then the slug,
so a listing is in decision order. A record lands as `proposed` and becomes
`accepted` in the change that puts it in force. Supersession is declared
both ways: `supersedes` on the successor, `superseded_by` on the
predecessor.

| Id | Decision | Status |
|---|---|---|
| adr-2609051324137479 | [The desktop shell is Tauri 2 around a web editing surface](2609051324137479-desktop-shell-is-tauri-2.md) | accepted |
| adr-2609051324147479 | [A document is a folder of chapters in Pandoc-compatible Markdown with variants](2609051324147479-document-model-folder-of-chapters.md) | accepted |
| adr-2609051324157479 | [Publishing pushes to a private GitHub repository deployed by Cloudflare Pages, with stable ids and versioned hashes](2609051324157479-publishing-private-repo-cloudflare-pages.md) | accepted |
| adr-2609051324167479 | [The PDF is rendered by Typst in the publish pipeline in a journal layout](2609051324167479-pdf-engine-is-typst.md) | accepted |
| adr-2609051324177479 | [Reader annotations live in sidecar files beside chapters, private by default, publishable as layers](2609051324177479-annotations-are-sidecar-files.md) | accepted |
