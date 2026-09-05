---
id: itd-2609051335541009
slug: add-media-too-big-to-copy
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
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
two references to it. She drags in eighty photographs straight off her
phone. Each is converted to a web format on the way in, each reference
points at the conversion, and each record remembers the format it came
from.

When she publishes, every referenced asset uploads once and every
rendering links to that single copy. Until then the document is still a
folder of plain files she can carry to another machine: it names roots,
never drives, so nothing inside it says where her media lives.

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
- We expect the drop to be the right moment to convert a phone-native
  photograph because the acceptance project holds about 80 of them
  alongside conversions twice their size (03-evidence.md): converting
  later means keeping both, and not converting at all means the
  renderings cannot show them.
- We expect this to cost Alice nothing at the moment of dropping because
  the gesture, the reference that lands, and the cursor in the caption
  are identical above and below the threshold (04-surfaces.md section 2);
  only the folder's contents differ.

## Scope Conditions

- Platform: the desktop app alone. Hashing, de-duplication, conversion,
  and resolving a root name to a place on the machine belong to the shell
  (05-internals.md section 5). The single HTML file adds no assets at
  all, so nothing in this moment happens there.
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
  chapter, the relative reference, and de-duplication among copied files.
  In for this intent: everything the threshold turns on — the referenced
  mode, the named root, conversion on the way in, and the single copy the
  site will hold. Out: the gesture itself, the reference at the drop
  point, and the cursor in the caption, which #4 owns.
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
  can open from the lectern": in for this intent is the record naming
  where the published copy will sit. Out: the publish action that uploads
  it, which #7 owns.

## Acceptance Criteria

- Given a document whose threshold is 8 MB and a 512 MB video file under
  an asset root named `media`, When Alice drags that file onto an open
  chapter, Then no copy of it appears anywhere in the document folder,
  the asset record gains one entry with `mode: referenced`, its content
  hash as `id`, `kind: video`, `root: media`, and a path beneath that
  root, and a `::: {.video poster="…" caption="…"}` block naming that
  asset as its `local` source appears at the drop point.
- Given the same document, When Alice drags a 240 KB photograph onto the
  same chapter, Then the file is copied into that chapter's `assets/`
  folder, its record reads `mode: copied` with a path relative to the
  chapter, and an `![](assets/…)` reference appears at the drop point:
  the size decides the mode, not the kind of file.
- Given a referenced video already recorded, When Alice drags the
  byte-identical file onto another chapter from a different folder, Then
  no second record is written, the existing `id` is reused, and a second
  video block pointing at that same asset appears at the new drop point.
- Given a photograph in a phone-native format below the threshold, When
  Alice drops it, Then the reference written into the chapter points at a
  web-format conversion rather than at the original, and the record
  carries `converted_from` naming the format it came from.
- Given a document folder after any number of drops, When every file in
  it is read, Then none of them contains an absolute path, a host name,
  or a user name: a referenced asset names a root and a path beneath it,
  a copied asset names a path relative to its chapter, and the folder
  opens unchanged on a machine where that root resolves elsewhere.
- Given a chapter whose referenced video is absent from the place its
  root resolves to, When Alice opens that chapter, Then the sidebar
  reports that asset as unresolved beside the chapter, the chapter's text
  is untouched, and no request leaves the machine to look for the file.
- Given a chapter carrying a referenced photograph, When the article is
  read at iPhone width, Then the image fits within the measure and
  nothing on the page scrolls sideways or needs pinch zoom.
- Inherits: no machine in the document; network only on publish; one
  source, always; round-trip byte-fidelity; degrade gracefully in a plain
  tool; legible on three device classes.

## Open Questions

- What the default size threshold between copied and referenced assets is
  (03-evidence.md, open questions, "Assets": "The default size threshold
  between copied and referenced assets").
- Whether the referenced-asset manifest is per document or per Part
  (03-evidence.md, open questions, "Assets").
- What happens when conversion of a phone-native image is unavailable: a
  placeholder, a refusal, or the original left in place (03-evidence.md,
  open questions, "Assets").

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
