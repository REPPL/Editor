---
id: itd-2609051317433203
slug: drop-images-video-links-and-other-files-onto-a-chapter-with
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
superseded_by: [itd-2609051335420536, itd-2609051335541009, itd-2609051335568936]
kind_at_supersession: null
superseded_on: 2026-09-05
---

# Drop assets onto a chapter

## Press Release

Alice drags an image from her desktop onto a chapter and Editor does the
rest: the file is copied beside the chapter, a Markdown image reference
with a relative path is inserted at the drop point, and the alt text is
ready to type. A video link or file becomes a video block with a caption.
Any other file becomes a link.

Large files are handled, not hidden. Above a size Alice sets, Editor does
not copy the file into the document; it records it once as a referenced
asset that uploads to the site on publish, and every rendering links to
that one copy. A photograph in a phone-native format is converted to a web
image on the way in. Two drops of the same file yield one asset.

Some assets live elsewhere on purpose. A video block can name sources in
order: a local file, a copy on the published site, and a copy on a
separate gated website that asks the viewer to sign in. Each rendering
tries them in turn and shows a poster and a link when none is reachable.

## Why This Matters

The reason people reach for a word processor is that adding a picture is
a drag, not a path. Editor gives Markdown the same gesture, and because
real documents carry gigabytes of media, it decides up front what is
copied, what is referenced, and what stays behind a gate elsewhere.

## Mechanism

We expect copy-beside-the-chapter to keep documents portable because a
folder of Markdown plus relative links is what every other tool reads. We
expect a size threshold with referenced assets to keep the folder and the
single HTML file usable because the acceptance project showed video two
orders of magnitude larger than text. We expect an ordered source list for
video to cover gated hosting because the maintainer's existing reading app
already uses exactly that fallback chain with a sign-in probe.

## Scope Conditions

- Images, video (a URL or a local file), PDFs, and arbitrary files.
- Small assets copy beside the chapter into an assets folder; large ones
  are referenced by content hash in a document-level manifest and uploaded
  once on publish. The threshold is a document setting.
- Phone-native image formats convert to a web format on drop; the original
  is not kept in the document.
- A video block's sources are written in the canonical fenced form with an
  ordered list; a gated source is one whose host requires sign-in, and
  Editor never stores those credentials.
- Editor never transcodes or hosts video.

## Acceptance Criteria

- Given an image under the threshold dragged onto a chapter, when the drop
  completes, then the file exists in the chapter's assets folder and a
  Markdown image reference with a relative path is at the drop position.
- Given the same image dropped a second time, when the drop completes,
  then no second file is written and the new reference points at the
  existing one.
- Given a video file over the threshold, when the drop completes, then no
  copy is made beside the chapter, the manifest lists it by content hash,
  and the inserted video block references it.
- Given a phone-native photograph, when the drop completes, then a web
  image is written beside the chapter and the reference points at it.
- Given a video block listing a local file, a published copy, and a gated
  site, when the article is opened with only the gated site reachable,
  then the player loads from the gated site after sign-in; and when none
  is reachable, then a poster and a link show.
- Given any other file, when dropped, then it is copied or referenced by
  the same threshold rule and a Markdown link is inserted.

## Open Questions

- Default threshold value.
- Whether the referenced-asset manifest is per document or per Part.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
