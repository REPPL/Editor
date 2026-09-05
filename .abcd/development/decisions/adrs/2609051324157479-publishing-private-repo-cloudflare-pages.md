---
id: adr-2609051324157479
slug: publishing-private-repo-cloudflare-pages
status: accepted
date: 2026-09-05
supersedes: null
superseded_by: null
related_intents: []
related_rfcs: []
related_adrs: []
---

# ADR-2609051324157479: Publishing pushes to a private GitHub repository deployed by Cloudflare Pages, with stable ids and versioned hashes

## Context

The maintainer wants one publish action, a link that works anywhere, a public presenter site on their own domain, gated content for some documents, and no server to run. Assets are large and some are personal. A public git history cannot be withdrawn. The maintainer considered a two-channel design (public code, private content uploaded directly to storage) and set it aside as a future feature in favour of one production system.

## Decision

Editor builds a document, commits the output under the document's stable id in a private GitHub repository, and pushes with the author's existing git setup; Cloudflare Pages deploys the public site. Each document has one stable unguessable id minted at first publish and stored in front matter; each publish adds a content hash beneath it, and a latest pointer makes the stable link show the newest version while old hashes keep old versions. Each variant has its own link under the id, and no page reveals other variants. At publish time the author chooses unlisted (the id is the only protection) or gated (Cloudflare Access with an email allow-list over the document's path). Large assets upload once and every rendering links to that copy; a video block may also name a source on a separate gated site. The pipeline renders the PDF.

## Alternatives Considered

1. Public repository. Rejected: assets would enter a history that cannot be withdrawn; Pages deploys from a private repository identically.
2. Direct upload of content to object storage, with only code in GitHub. Cleaner separation, but a second credential, a second channel, and a PDF step that must reach private storage. Parked as a future feature by the maintainer.
3. A new hash per publish only. Immutable and simple, but the link sent last week goes stale. Rejected in favour of a stable id plus hashes.
4. Everything gated. Kills the present-anywhere story. Rejected.

## Consequences

Editor needs the author's git credentials on the machine and none of its own. The site layout is id, then hash, then per-variant paths, with a latest pointer; the presenter page is maintained once in the repository. Cloudflare Access policies are per document path and must be created by the publish action. An unlisted document is not private, and the brief says so in every place a reader might assume otherwise.
