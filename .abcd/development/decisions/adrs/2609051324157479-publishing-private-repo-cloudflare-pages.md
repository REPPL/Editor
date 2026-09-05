---
id: adr-2609051324157479
slug: publishing-private-repo-cloudflare-pages
status: accepted
date: 2026-09-05
supersedes: null
superseded_by: null
related_intents: [itd-2609051335468596, itd-2609051335479329, itd-2609051335541009, itd-2609051335598083, itd-2609051336005698, itd-2609051402150739]
related_rfcs: []
related_adrs: []
---

# ADR-2609051324157479: Publishing pushes to a private GitHub repository deployed by Cloudflare Pages, with stable ids and versioned hashes

## Context

The maintainer wants one publish action, a link that works anywhere, a public presenter site on their own domain, gated content for some documents, and no server to run. Assets are large and some are personal: the acceptance project alone carries six videos between 150 and 512 MB, which is well past what a git host will take in one file and further past what a static deploy will serve from a repository. A public git history cannot be withdrawn. The maintainer considered a two-channel design (public code, private content uploaded directly to storage) and set it aside as a future feature in favour of one production system.

## Decision

Editor builds a document, commits the output under the document's stable id in a private GitHub repository, and pushes with the author's existing git setup; Cloudflare Pages deploys the public site. Each document has one stable unguessable id minted at first publish and stored in its `document.yaml`; each publish adds a content hash beneath it, and a latest pointer makes the stable link show the newest version while old hashes keep old versions. Each variant has an unguessable path token of its own between the id and the version, so one variant's link cannot be shortened or guessed into another, and no page reveals other variants. At publish time the author chooses unlisted (the id and the token are the only protection) or gated (Cloudflare Access with an email allow-list over the document's id, covering every version and every variant beneath it). The allow-list is committed as an access file beside the document's output and applied by the pipeline with a credential the app never holds. Assets above the deploying host's per-file ceiling do not go through git at all: the pipeline uploads them to object storage under the same id, holding that credential too, and every rendering links there. Assets below the ceiling are published as files beside the version. The pipeline renders the PDF.

## Alternatives Considered

1. Public repository. Rejected: assets would enter a history that cannot be withdrawn; Pages deploys from a private repository identically.
2. Direct upload of all content to object storage, with only code in GitHub. Cleaner separation, but a second credential, a second channel, and a PDF step that must reach private storage. Parked as a future feature by the maintainer; the ceiling rule takes the part of it that the hosts' file limits make unavoidable, and no more.
3. A new hash per publish only. Immutable and simple, but the link sent last week goes stale. Rejected in favour of a stable id plus hashes.
4. Everything gated. Kills the present-anywhere story. Rejected.
5. Pushing every asset through the repository whatever its size. Simplest to describe and impossible to run: a 512 MB video exceeds both the repository's per-file limit and the deploying host's. Rejected on the arithmetic.

## Consequences

Editor needs the author's git credentials on the machine and none of its own; the storage and access credentials belong to the pipeline, which is the only place a secret lives. The site layout is id, then variant token, then hash, with a latest pointer per variant; the presenter, the article script and the slide engine are maintained once at the site root and shared by every version. Access policies are per document id and are applied by the pipeline from a committed access file, so a document gated today is gated for every link already shared. One publish action now has two stores behind it, and the ceiling that divides them belongs to the hosts rather than to the author, so it is a figure to verify and re-verify rather than a setting. An unlisted document is not private, and the brief says so in every place a reader might assume otherwise.
