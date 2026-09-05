---
id: itd-2609051335420536
slug: drop-an-image-and-have-it-just-work
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

# Drop an image and have it just work

## Press Release

Alice is three paragraphs into the chapter about the second winter, and the
photograph she wants is sitting on her desktop. She drags it onto the
paragraph. The file lands in that chapter's `assets/` folder, an image
reference appears at the point where she let go, and the cursor is already
inside the empty alt text, waiting for a caption. She types the caption and
carries on writing. She opened no file picker, typed no path, and never
left the text she was in the middle of.

An hour later she drops the same photograph again, further down the
chapter. The assets folder still holds one copy: Editor recognises the
bytes it already has and writes a second reference to the file that is
there. A short video clip dropped the same way becomes a video block naming
the local file; a spreadsheet becomes a link. Whatever she drops, the
answer is a construct already written for her in the canon, and she is left
with the cursor in the one place she still has something to say.

What sits on disk afterwards is a folder anyone can read. The reference is
ordinary Markdown with a path relative to the chapter, so the file still
opens in Emacs, still converts through Pandoc, and still says nothing about
the machine Alice is sitting at. When she sends the folder to Carol, or
opens it herself on a different machine next year, the picture is exactly
where the text says it is.

## Why This Matters

Typing an asset path by hand is where a document quietly breaks: the path
is right on the machine it was typed on and wrong everywhere else, the same
picture arrives three times under three names, and a folder whose name
contains a space breaks the link a month later when nobody remembers what
changed. Alice's own material already carries all three faults. She should
be able to pick a picture up and put it where it goes, and get a document
folder that is still portable, still plain, and still honest about what it
contains.

## Mechanism

- We expect the drop to complete without a file picker or a typed path
  because the shell, not the web view, receives the native drop and owns
  file writing, hashing, and de-duplication (`05-internals.md` section 5),
  so the editor is handed a finished relative reference rather than an
  operating-system path to interpret.
- We expect two drops of one file to cost one copy because asset identity
  is the content hash rather than the file name (`05-internals.md` section
  6). The acceptance project supplies the failing case this is measured
  against: it holds "byte-identical duplicate images" and "duplicated sets"
  of assets (`03-evidence.md`).
- We expect the inserted text to survive every other tool because it is
  Pandoc's own image syntax with an optional attribute, which the canon
  requires of every construct so that "Emacs, Pandoc, and any plain
  renderer read the file and degrade gracefully" (`05-internals.md`
  section 3).
- We expect placing the cursor in the alt text to be the right ending for
  the gesture, rather than after the reference, because alt text is the
  caption in every rendering (`05-internals.md` section 3), so the one
  thing Editor cannot supply is the one thing Alice is left holding.
- We expect relative paths written by the shell to hold where hand-typed
  ones do not, because the known hazard is already recorded rather than
  hypothetical: the acceptance project contains "a percent-encoded folder
  path containing a space" (`03-evidence.md`), which makes escaping a
  testable criterion on day one.
- We expect the gesture to stay silent on the network because the drop
  writes only inside the document folder; nothing is uploaded until Alice
  publishes (`02-constraints.md`, network only on publish).

## Scope Conditions

- Platform: the desktop app on macOS, Tauri 2 with the system web view.
  Drag and drop from the operating system is a shell capability; the same
  gesture is not offered by the single HTML file, where "assets are added
  in the desktop app" (`04-surfaces.md` section 6).
- Population: Alice, the author, working in an already-open document folder
  with a chapter open in the editor.
- Size: this intent covers files below the document's
  `asset_threshold_bytes`, which are copied into the `assets/` folder
  beside the chapter and referenced by a relative path. In scope: the copy,
  the reference, the cursor, and de-duplication of copied files by content
  hash. Out of scope and owned by map #15 `itd-2609051335541009` (Add media
  too big to copy): everything the threshold turns on — referenced assets,
  named asset roots, the upload on publish, and conversion of phone-native
  images.
- Renderings: this intent ends at the reference in the text. What any
  rendering does with that reference is owned elsewhere; in particular the
  rule that "every image in a Section or Sub-section becomes a slide of its
  own, full-bleed, in source order" belongs to map #5
  `itd-2609051335447894` (Present a chapter with no slide markup).
- Non-image drops: a video file below the threshold produces a `.video`
  block naming the local file, and any other file produces a link
  (`04-surfaces.md` section 2). The ordered source list, the gated source,
  and what a reader sees when no source is reachable are owned by map #16
  `itd-2609051335568936` (Point a video at several sources, one behind a
  sign-in).
- Plumbing inherited, not owned here: content hashing, image conversion,
  and the `assets.json` schema (`05-internals.md` section 6).
- Network: the drop performs no network request of any kind, on any path.

## Acceptance Criteria

- Given a chapter open in the editor with the cursor in a paragraph, When
  Alice drags a 240 kB JPEG from the desktop and drops it on that
  paragraph, Then a copy of the file exists at `assets/lantern.jpg` beside
  the chapter, the text at the drop point reads `![](assets/lantern.jpg)`,
  and the cursor sits between the square brackets ready for the caption.
- Given `lantern.jpg` has already been dropped once, When Alice drops a
  byte-identical copy of the same file, under any file name, into a
  different paragraph, Then the assets folder still holds exactly one file
  and both paragraphs carry a reference resolving to it.
- Given a source file whose name contains a space, When Alice drops it,
  Then the written reference resolves in the editor's preview, and the
  chapter file round-trips byte for byte through a save and reload with the
  reference unchanged.
- Given a chapter whose bytes are recorded before the gesture, When Alice
  drops an image and the chapter is written, Then the file differs from the
  recorded bytes only by the inserted reference: no line is reflowed, no
  character re-escaped, no comment or table touched.
- Given a video file below the document's threshold, When Alice drops it,
  Then a `::: {.video}` block appears at the drop point with a single
  `- local:` entry naming the copied file relative to the chapter, and no
  `site` or `gated` entry is invented.
- Given any number of drops of any kind, When the document folder is
  searched afterwards, Then no chapter file and no manifest entry contains
  an absolute path, a home directory name, a user name, or a host name; and
  with the machine offline every drop still succeeds and issues no network
  request.
- Given a dropped image in an open chapter, When the editor window is
  narrowed to iPad width, Then the preview shows the image within the
  measure with no horizontal scrolling and no pinch zoom.
- Inherits: No machine in the document; Round-trip byte-fidelity; Degrade
  gracefully in a plain tool; Network only on publish; One source, always;
  Legible on three device classes.

## Open Questions

- The default size threshold between copied and referenced assets, which
  decides whether a given drop is this moment at all (`03-evidence.md`,
  open questions, Assets).
- Whether the asset manifest is per document or per Part, which decides
  where a copied drop is recorded (`03-evidence.md`, open questions,
  Assets).
- What happens when conversion of a phone-native image is unavailable — a
  placeholder, a refusal, or the original left in place. It reaches this
  moment because a phone photograph below the threshold is a copied asset
  that still needs conversion (`03-evidence.md`, open questions, Assets).

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
