---
id: itd-2609051402150739
slug: take-a-document-off-the-site
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Take a document off the site

## Press Release

Alice published a draft in March for two readers and a conference. It is
October, the paper it became is out, and the draft should not be standing
at a link any more. She opens the document in Editor and chooses Withdraw.
Editor shows her exactly what will stop being served — every version, every
variant, the article, the deck, the paper, the assets, and any published
annotation layer — says in plain words that a link already sent will stop
working and that copies already downloaded cannot be recalled, and asks
her to confirm. She confirms.

The next deploy carries nothing of the document. Bob opens the link he
saved in March and meets the presenter's empty shell — the same page anyone
meets who types the address with no id at all, or with an id that has
never existed. He is not told that something was here and has gone; there
is no tombstone, no title, and no redirect.

The document itself is untouched. Every chapter, every asset, the
bibliography, the annotations beside the chapters: all of it is still the
folder on Alice's disk, exactly as it was. The publish log keeps its
history and gains one more line — withdrawn, with its date and what it
covered — so Alice can still see what she published and when, even though
none of it is served any more. If she publishes again later, the document
keeps its id and goes back up under the same stable link, with a fresh
version beneath it.

## Why This Matters

`03-evidence.md` records the price of the stable link in the trade-offs
already taken: "the stable link is a standing secret: it cannot be
withdrawn without unpublishing". Unpublishing is the half of that sentence
nothing owns. Until it does, everything Alice publishes is published
forever, which quietly changes what she is willing to publish at all — a
draft, a talk with a figure she later corrects, a document for two named
readers. Withdrawal is also the only honest remedy for the unlisted flag:
`04-surfaces.md` section 7 tells Alice that an unlisted document is not a
private one because a link once sent cannot be recalled, and the one thing
she can still do about it is stop serving the file the link points at.

## Mechanism

- We expect withdrawal to be a publish in reverse rather than a new
  mechanism because the site is the deployed contents of the production
  repository: removing the document's paths from that repository and
  pushing is the whole of it, and the static host deploys the result the
  same way it deploys an addition (`05-internals.md` section 8; the
  publishing decision record).
- We expect a withdrawn id to reveal nothing because the presenter shows
  the same empty shell for a wrong id, a missing id, and an id that has
  been withdrawn: the site's not-found page is that shell, and no page
  lists or enumerates anything (`05-internals.md` section 9). Falsifiable:
  render the shell for a never-published id and for a withdrawn one and
  compare what a reader can see.
- We expect the large assets that never travelled through the repository
  to go too, because a referenced asset above the host ceiling is uploaded
  by the pipeline into object storage under the document's id
  (`05-internals.md` sections 6 and 8), so a withdrawal that removed only
  the repository's files would leave the video standing at its own
  address.
- We expect a gated document's access file to be removed in the same
  action because the policy is applied by the pipeline from a committed
  per-document file (`05-internals.md` section 8): a policy left behind
  guards nothing and is a record of an allow-list that no longer needs to
  exist.
- We expect the document to survive its own withdrawal because nothing
  Editor publishes is the document: the folder of plain files the author
  owns is (`01-product.md`). Falsifiable by hashing the document folder
  before and after: not one byte may change.
- We expect the honest limit to be stated rather than implied, because
  withdrawal cannot reach a copy Bob saved, a single HTML file Carol was
  sent, or a cache Alice does not control. A promise wider than that would
  be a promise the design cannot keep.

## Scope Conditions

- Platform: the desktop app on macOS drives the withdrawal; the effect is
  on the presenter site deployed from the production repository, and on
  the object storage the pipeline uploads large assets to.
- Population: Alice withdraws. Bob and Carol only ever hold links, and
  what they meet afterwards is the presenter's empty shell.
- Phase: phase 6, with the rest of publishing in full. Withdrawal covers
  whatever a document has published by then: versions, variants, the
  paper, and any published layer.
- Assumption: withdrawal is per document, covering every version and every
  variant under the id together. Withdrawing one version and leaving
  another standing is not in this moment.
- Assumption: the document keeps its stable id through a withdrawal, so a
  later publish returns it to the same stable link with a new version
  beneath it.
- Boundary with map #7, `itd-2609051335468596` (Publish and get a link I
  can open from the lectern): 7 owns the publish action, the stable id,
  the version hash, the unlisted flag, and the presenter that shows
  nothing without an id. 28 owns the reverse action and the guarantee that
  a withdrawn id is indistinguishable from an id that never existed.
- Boundary with map #8, `itd-2609051335479329` (Find the version Bob read
  in March): 8 owns the publish log and the promise that an old version
  link still shows what it showed. 28 owns the one thing that ends that
  promise deliberately, and the line the log gains when it does.
- Boundary with map #19, `itd-2609051335598083` (Give each audience its
  own link): 19 owns the per-variant paths. 28 withdraws them together; a
  withdrawal that took one variant and left another is out of scope for
  both, because it would tell the remaining audience that another exists.
- Boundary with map #20, `itd-2609051336005698` (Publish something only
  named people can open): 20 owns the gate and the allow-list. 28 owns
  removing the access file along with the document, so no policy outlives
  what it protected.
- Boundary with map #24, `itd-2609051336040242` (Publish someone else's
  annotations as a layer): 24 owns the layer and the reader's control for
  it. 28 takes any published layer down with the version it sits beneath.
- Boundary with map #15, `itd-2609051335541009` (Add media too big to
  copy): 15 owns the record and the upload. 28 owns the removal of what
  that upload put on the site and in object storage under this id.
- Excluded as plumbing: the repository operations, the storage deletion
  call, and the pipeline step that applies them (`05-internals.md`
  sections 8 and 9).

## Acceptance Criteria

- Given a document published in two versions and two variants, When Alice
  chooses Withdraw, Then Editor lists every path that will stop being
  served — both versions, both variants, the article, the deck, the paper,
  the assets, and any published layer — states that links already sent will
  stop working and that copies already taken cannot be recalled, and waits
  for her confirmation.
- Given she confirms and the deploy completes, When the stable link, a
  variant link, and an earlier version link are each opened, Then every
  one of them shows the presenter's empty shell, and that shell is
  identical to the one shown for an id that has never been published.
  (Negative case.)
- Given the same withdrawn document, When the deployed site is crawled
  from its root and every remaining page is read, Then nothing names the
  document, its title, its id, its variants, or the fact that anything was
  removed.
- Given the document had a referenced asset published to object storage
  under its id, When the withdrawal completes, Then that asset's address
  no longer serves the file, and no rendering anywhere on the site still
  links to it.
- Given the document was gated, When the withdrawal completes, Then its
  access file is gone from the production repository and its allow-list is
  no longer applied anywhere.
- Given the withdrawal has completed, When the document folder on Alice's
  disk is compared with a hash taken before she started, Then every file
  is byte for byte what it was — chapters, assets, bibliography, and
  annotation sidecars alike — and the publish log has gained exactly one
  entry recording the withdrawal, its date, and the versions it covered.
- Given a withdrawn document, When Alice publishes it again, Then it goes
  up under the same stable id with a new version beneath it, the earlier
  version paths are not restored, and the publish log shows the
  withdrawal between the two publishes.
- Given Bob opens his saved link on an iPhone at 390 CSS px and Carol
  opens hers at 820 CSS px, When each meets the empty shell, Then the
  shell is legible at both widths with no horizontal scrolling and no
  pinch zoom, and neither reveals anything about what the link once
  served.
- Inherits: no machine in the document (`itd-2609051336080960`); network
  only on publish (`itd-2609051336158553`); one source, always
  (`itd-2609051336090390`); variant fidelity (`itd-2609051336107315`);
  nothing is stored about a reader (`itd-2609051336145770`); legible on
  three device classes (`itd-2609051336128348`).

## Open Questions

- How long the host and any edge cache may keep serving a withdrawn path
  after the deploy, and whether Editor reports withdrawal as done when the
  push lands or when the site stops answering.
- Whether a withdrawn document's id may ever be published again by
  another document, or is retired with it. Retiring it costs nothing and
  keeps an old link from ever resolving to different material.
- Whether the publish log's withdrawal entry keeps the links it withdrew,
  which is useful to Alice as a record and is the one place a withdrawn
  path is still written down.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
