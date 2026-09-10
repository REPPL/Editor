---
id: itd-2609051317492681
slug: publish-a-document-to-the-presenter-site-with-one-action-and
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051335468596, itd-2609051335479329, itd-2609051335598083, itd-2609051336005698]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Publish and receive the stable link

## Press Release

Alice presses Publish. Editor builds the article, the slides, and the
assets, commits them under the document's stable id in the production
repository, pushes, and hands her the link. Cloudflare Pages deploys the
site. The link always shows the latest version; every publish also has its
own hash, so an older link keeps showing what it showed. Each variant of
the document has its own link, and no page reveals that other variants
exist.

At publish time Alice chooses unlisted or gated. An unlisted document is
reachable by anyone with the link. A gated one sits behind Cloudflare
Access and asks for a sign-in from an allow-list. Editor keeps a publish
log inside the document folder listing every version, its hash, and its
links, and offers open and copy for each.

## Why This Matters

Publishing is the moment the work leaves the machine. One action, one
stable link, a versioned history, and a privacy choice made deliberately
each time is what makes the presenter site safe to use for everything.

## Mechanism

We expect one action to be enough because Cloudflare Pages deploys from a
git push with nothing else to operate. We expect a stable id plus content
hashes to give both a shareable link and an immutable history because the
id is minted once per document and the hash is computed from the built
output. We expect gating to be a flag because Cloudflare Access applies
per path.

## Scope Conditions

- The production repository is private; the site is public.
- The document's stable id is minted on first publish and stored in front
  matter; each publish writes under `<id>/<hash>/` and updates a pointer
  for latest.
- Editor uses the author's existing git setup on the machine to push and
  holds no token of its own.
- Gated means a Cloudflare Access policy over the document's path with an
  email allow-list the author edits in the app.

## Acceptance Criteria

- Given a configured production repository, when Alice publishes a
  document for the first time, then Editor mints its stable id, commits
  the built output under it, pushes, and shows the stable link and the
  version link; and once deployed, both open the document on an iPhone, an
  iPad, and a desktop browser.
- Given a document published twice, when the second publish completes,
  then the stable link shows the second version, the first version's link
  still shows the first, and the publish log lists both.
- Given a document with variants A and B, when published, then each has
  its own link under the stable id and neither page links to the other.
- Given a document published gated with an allow-list, when Bob opens the
  link, then he is asked to sign in, and only an allow-listed address
  proceeds.
- Given the presenter opened with no id or a wrong one, then it shows
  nothing and lists nothing.

## Open Questions

- Length of the stable id and of the content hash.
- Whether the publish log is the front matter itself or a sibling file.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
