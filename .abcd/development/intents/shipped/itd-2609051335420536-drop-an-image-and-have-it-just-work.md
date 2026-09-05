---
id: itd-2609051335420536
slug: drop-an-image-and-have-it-just-work
spec_id: spc-2609051353405598
kind: standalone
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
there. A photograph straight off her phone is converted to a web format on
the way in and the reference points at the conversion, with no second copy
of the original left behind. A short video clip dropped the same way becomes
a video block naming the local file, a video address dragged or pasted in
becomes a video block naming that address, and a spreadsheet becomes a
link. Whatever she drops, the
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

- Platform: the desktop app on macOS, Tauri 2 with the system web view. <!-- cond: cond-2609051353403730 -->
  Drag and drop from the operating system is a shell capability; the same
  gesture is not offered by the single HTML file, where "assets are added
  in the desktop app" (`04-surfaces.md` section 6).
- Population: Alice, the author, working in an already-open document folder <!-- cond: cond-2609051353400979 -->
  with a chapter open in the editor.
- Size: this intent covers files below the document's size threshold, <!-- cond: cond-2609051353401750 -->
  which are copied into the `assets/` folder beside the chapter and
  referenced by a relative path. In scope: the copy, the reference, the
  cursor, de-duplication of copied files by content hash, and conversion
  of a phone-native image on the way in — conversion belongs to the drop
  at any size, and the original is not kept. Out of scope and owned by
  map #15 `itd-2609051335541009` (Add media too big to copy): everything
  the threshold turns on — referenced assets, named asset roots, the
  record, and the upload on publish. Setting the threshold and naming a
  root belong to map #27, `itd-2609051402126424`.
- Renderings: this intent ends at the reference in the text. What any <!-- cond: cond-2609051353407278 -->
  rendering does with that reference is owned elsewhere; in particular the
  rule that "every image in a Section or Sub-section becomes a slide of its
  own, full-bleed, in source order" belongs to map #5
  `itd-2609051335447894` (Present a chapter with no slide markup).
- Non-image drops: a video file below the threshold produces a `.video` <!-- cond: cond-2609051353402131 -->
  block naming the local file, a video URL dragged or pasted onto the
  text produces a `.video` block naming that address, and any other file
  produces a link (`04-surfaces.md` section 2). The ordered source list,
  the gated source, and what a reader sees when no source is reachable
  are owned by map #16 `itd-2609051335568936` (Point a video at several
  sources, one behind a sign-in). What this intent owns is the drop on
  the editor text: a Markdown file dropped on a Part in the sidebar is a
  new chapter and belongs to map #1, `itd-2609051335399446`; a flat
  manuscript arrives through the Import command and belongs to map #13,
  `itd-2609051335529787`; and an edited chapter comes back through the
  Re-import command, which belongs to map #18, `itd-2609051335586905`.
- Plumbing inherited, not owned here: content hashing, the conversion <!-- cond: cond-2609051353400450 -->
  itself, and the asset record's schema (`05-internals.md` section 6).
  What this intent owns of conversion is the observable outcome: the
  reference points at the web-format file and the phone-native original
  is not left in the document folder.
- Network: the drop performs no network request of any kind, on any path. <!-- cond: cond-2609051353405457 -->

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
- Given a video URL, When Alice drags it onto the chapter text or pastes
  it there, Then a `::: {.video}` block appears at that point naming that
  address as its source, nothing is downloaded, no file is copied into
  the document folder, and no request is made to that address.
- Given a spreadsheet or any other file that is neither an image nor a
  video, When Alice drops it on the chapter text, Then it is copied
  beside the chapter under the same threshold rule and an ordinary
  Markdown link to it appears at the drop point, with the cursor in the
  link text ready for a label.
- Given a photograph in a phone-native format, of any size and on either
  side of the threshold, When Alice drops it, Then the reference written
  into the chapter points at a web-format conversion, the phone-native
  original is not left anywhere in the document folder, and the record
  keeps the format it was converted from.
- Given any number of drops of any kind, When the document folder is
  searched afterwards, Then no chapter file and no asset record names
  Alice's machine — no absolute local path, no home directory name, no
  user name, and no local host or volume name; and with the machine
  offline every drop still succeeds and issues no network request.
- Given a dropped image in an open chapter, When the editor window is
  narrowed to iPad width (820 CSS px), and again to iPhone width (390 CSS
  px) and desktop width (1280 CSS px), Then the preview shows the image
  within the measure at every one of the three widths with no horizontal
  scrolling and no pinch zoom.
- Inherits: no machine in the document (`itd-2609051336080960`);
  round-trip byte-fidelity (`itd-2609051336074533`); degrade gracefully
  in a plain tool (`itd-2609051336110536`); network only on publish
  (`itd-2609051336158553`); one source, always (`itd-2609051336090390`);
  legible on three device classes (`itd-2609051336128348`).

## Open Questions

- The default size threshold between copied and referenced assets, which
  decides which side of the line a given drop falls on before Alice has
  set it herself (`03-evidence.md`, open questions, Assets; map #27,
  `itd-2609051402126424`, owns setting it).
- Whether the asset record is per document or per Part, which decides
  where a copied drop is recorded (`03-evidence.md`, open questions,
  Assets).
- What happens when conversion of a phone-native image is unavailable — a
  placeholder, a refusal, or the original left in place (`03-evidence.md`,
  open questions, Assets). Conversion belongs to this moment at any size,
  so this is the moment the answer binds.
- What a video URL dropped from a site that offers no direct media
  address produces, since the block names an address rather than fetching
  one and Editor never probes it.

## Audit Notes

<!-- abcd-review: OWED receipt=rcp-3e7bc007f8f8 -->
Fidelity review OWED (receipt rcp-3e7bc007f8f8).

## Grounds

- pursued: copy-beside-the-chapter with content-hash de-duplication keeps documents portable; wrong if duplicate assets or broken relative links appear in real documents
