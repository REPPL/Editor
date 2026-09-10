---
id: itd-2609051335541009
slug: add-media-too-big-to-copy
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: major
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317433203]
---

# Add media too big to copy

## Press Release

Alice drags a half-gigabyte video from her media drive onto a chapter.
Nothing moves. The chapter gains a video block at the drop point, the
document folder stays the size it was, and the sidebar shows the chapter
carrying one more asset. Editor has recorded the file once: its content
hash as its identity, its kind, its size, the name of the asset root it
lives under, and its path beneath that root. Every rendering of the
document points at that one record.

The size at which this happens is Alice's to set, once, for the
document. Below it a file is copied beside the chapter and referenced by
a relative path. Above it the file stays where it is and is referenced
instead. The gesture is the same either way — she drags, the reference
lands, the cursor sits ready for a caption — and the only thing the size
changes is whether the document folder gains a copy.

She drops the same video again the next day, from a different folder.
Editor recognises it by its content and records nothing new: one asset,
two references to it. Beside each chapter the sidebar says how many assets
it draws on, so she can see at a glance which chapter is carrying the
weight, and it says plainly when one of them cannot be found where the
root points.

When she publishes, every referenced asset goes up once and every
rendering links to that single copy. The ones a repository can carry
travel with the document; the half-gigabyte video is too large for that
and goes straight to the site's own storage under the document's id,
without Editor ever holding a credential for it. Until then the document
is still a folder of plain files she can carry to another machine: it
names roots, never drives, so nothing inside it says where her media
lives.

## Why This Matters

Alice's real material is two orders of magnitude larger than her text —
six videos of 150 to 512 MB and some 2.5 GB in all against about 7,900
words, with whole photograph sets duplicated (03-evidence.md, the
acceptance project). Copying that beside the chapters is not an option,
so today the heavy material is wired in from code by filename convention
and never appears in the text at all: the text does not know what it
references, the duplicates are invisible, the phone-native originals sit
beside conversions twice their size, and moving the work to another
machine means mending paths by hand. The threshold is what lets one
document hold both the words and the media without the folder becoming
unusable.

## Mechanism

- We expect a size threshold to keep the document folder tractable
  because the acceptance project measures 2.5 GB of assets against 7,900
  words (03-evidence.md): a copy-everything design fails at the first
  video, and a reference-everything design loses the small assets that
  make a document self-contained.
- We expect content-hash identity to collapse repeat drops into one
  asset because the acceptance project already contains byte-identical
  duplicate images and duplicated photograph sets (03-evidence.md), so
  the duplication is a property of how the material was gathered rather
  than of how carefully it is dropped.
- We expect a named root plus a path beneath it to keep machine paths out
  of the document because the record carries only a root name and a
  relative path (05-internals.md section 6), and the acceptance project
  shows the cost of the alternative: root-relative paths into two
  different asset trees and a percent-encoded folder path containing a
  space (03-evidence.md).
- We expect the upload to belong to this moment rather than to the
  publish action because it is the threshold that creates it: an asset
  the document folder does not carry has to reach the site some other
  way, and which way depends on its size. Below the host's per-file
  ceiling it travels with the document; above it — which is where the
  acceptance project's six videos of 150 to 512 MB sit — it goes to the
  site's object storage under the document's id, uploaded by the publish
  pipeline with a credential Editor never holds. Falsifiable: publish a
  document with one asset of each kind and ask for both at their
  addresses.
- We expect this to cost Alice nothing at the moment of dropping because
  the gesture, the reference that lands, and the cursor in the caption
  are identical above and below the threshold (04-surfaces.md section 2);
  only the folder's contents differ.

## Scope Conditions

- Platform: the desktop app for the drop and the record, and the publish
  pipeline for the upload. Hashing, de-duplication, and resolving a root
  name to a place on the machine belong to the shell (05-internals.md
  section 5). The single HTML file adds no assets at all, so nothing in
  this moment happens there.
- Excluded as plumbing: the asset record's schema and field names, the
  hashing algorithm, and the storage call the pipeline makes
  (05-internals.md sections 5, 6, and 8). Every criterion below is
  written against what Alice or a reader can observe — what the folder
  holds, what the sidebar says, what a rendering resolves to, and what
  answers at an address — rather than against a field in a file.
- Population: Alice, the author, at her desk with her media reachable.
  Bob and Carol are not present; they meet the result inside a rendering.
- Assumption: the threshold is one per-document setting whose default is
  still undecided, and the asset record is kept per document rather than
  per Part (03-evidence.md).
- Assumption: an asset root is a name the app's settings resolve locally,
  so the same document opens on another machine once that name resolves
  there.
- Boundary with map #4, itd-2609051335420536, "Drop an image and have it
  just work": #4 owns the drop below the threshold — the copy beside the
  chapter, the relative reference, de-duplication among copied files, and
  conversion of a phone-native image, which belongs to the drop at any
  size and is therefore #4's on both sides of the threshold. In for this
  intent: everything else the threshold turns on — the referenced mode,
  the named root, the record, the single copy the site will hold, and the
  upload that puts it there. Out: the gesture itself, the reference at
  the drop point, and the cursor in the caption, which #4 owns.
- Boundary with map #27, itd-2609051402126424, "Set the size threshold and
  name an asset root": 27 owns Alice choosing the number and naming the
  root, and what happens when a named root has no local answer on this
  machine. This intent owns what the threshold and the root then do to a
  drop, to the record, and to the publish.
- Boundary with map #16, itd-2609051335568936, "Point a video at several
  sources, one behind a sign-in": in for this intent is where a file
  lives and what is recorded about it. Out: the order in which a
  rendering tries a video's sources and what a reader sees when none is
  reachable, which #16 owns.
- Boundary with map #17, itd-2609051335570842, "Carry the document as one
  file that reads anywhere": in for this intent is the record that marks
  an asset too large to embed. Out: embedding, offline behaviour, and the
  degradation to a poster and a link, which #17 owns.
- Boundary with map #7, itd-2609051335468596, "Publish and get a link I
  can open from the lectern": #7 owns the publish action, the id, the
  version, and the link. In for this intent is what that action does with
  referenced assets — that each one goes up exactly once, that a file
  above the host's per-file ceiling goes to the site's object storage
  under the document's id rather than through the repository, and that
  every rendering then points at the one copy. Editor holds no credential
  for that storage; the pipeline holds it.

## Acceptance Criteria

- Given a document whose threshold is 8 MB and a 512 MB video file under
  an asset root named `media`, When Alice drags that file onto an open
  chapter, Then the document folder is no larger than it was — no copy of
  the video appears anywhere inside it — a video block naming that file
  appears at the drop point, and the chapter's preview plays it from
  where it sits.
- Given a referenced video already recorded, When Alice drags the
  byte-identical file onto another chapter from a different folder under
  a different name, Then the document folder still holds no copy, no
  second asset is recorded, and both chapters' video blocks resolve to
  the same file on disk.
- Given a chapter drawing on three referenced assets and two copied ones,
  When Alice looks at the sidebar, Then that chapter's row says it
  carries five assets, and the count changes when she adds or removes a
  reference.
- Given a document folder after any number of drops, When every file in
  it is read, Then none of them names Alice's machine: no absolute local
  path, no home directory name, no user name, and no local volume or
  share name. A referenced asset names a root and a path beneath it, a
  copied asset names a path relative to its chapter, and the folder opens
  unchanged on a machine where that root resolves somewhere else. (Links
  to the published site and the address of a gated video are the
  document's own record and are not machine names.)
- Given a chapter whose referenced video is absent from the place its
  root resolves to, When Alice opens that chapter, Then the sidebar
  reports that asset as unresolved beside the chapter, the chapter's text
  is untouched, and no request leaves the machine to look for the file.
  (Negative case.)
- Given a document with one referenced asset below the host's per-file
  ceiling and one 512 MB video above it, When Alice publishes, Then each
  is uploaded exactly once, the published article, deck, and paper all
  link to that one copy rather than carrying their own, the large video
  is served from the site's own storage under the document's id, and
  republishing the same document without changing either asset uploads
  neither of them again.
- Given the same publish, When Alice's machine is examined for what it
  holds, Then Editor stores no credential for the site's storage: the
  upload is performed by the publish pipeline with a secret Editor never
  sees and never asks her for.
- Given a chapter carrying a referenced photograph, When the article is
  read at iPhone width (390 CSS px), at iPad width (820 CSS px), and at
  desktop width (1280 CSS px), Then the image fits within the measure at
  every one of the three widths and nothing on the page scrolls sideways
  or needs pinch zoom.
- Inherits: no machine in the document (`itd-2609051336080960`); network
  only on publish (`itd-2609051336158553`); one source, always
  (`itd-2609051336090390`); round-trip byte-fidelity
  (`itd-2609051336074533`); degrade gracefully in a plain tool
  (`itd-2609051336110536`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px.

## Open Questions

- What the default size threshold between copied and referenced assets is
  (03-evidence.md, open questions, "Assets": "The default size threshold
  between copied and referenced assets"). Alice can change it — map #27,
  itd-2609051402126424, owns that — but what she finds there before she
  does still decides which side an ordinary drop falls on, and the
  copied-versus-referenced boundary between this intent and map #4 rests
  on that number.
- Whether the referenced-asset record is per document or per Part
  (03-evidence.md, open questions, "Assets"), which also decides whether
  a root is named once for the document or once per Part.
- How a video block's `local` item names a referenced asset rather than a
  path relative to the chapter. The canon allows both and gives a form
  for only one of them.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
