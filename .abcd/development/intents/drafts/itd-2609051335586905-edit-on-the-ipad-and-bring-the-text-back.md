---
id: itd-2609051335586905
slug: edit-on-the-ipad-and-bring-the-text-back
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317484141]
---

# Edit on the iPad and bring the text back

## Press Release

Alice carries one file to the sofa. It is the same single HTML file she
exports for reading, and on the iPad it is also her editor. She opens it
in Safari with a hardware keyboard attached, imports the chapter she
wants to work on, and the Markdown appears in a text editing surface she
recognises: the source is visible, it is the source of truth, and the
chords she has used for twenty years move by character, word, line, and
buffer, kill and yank, set the mark, search forward and backward, and
undo. A keys panel one chord away lists the bindings that are live in
this host, and says plainly which chords the tablet takes for itself.
One cancel chord cancels anything, and so does Escape.

She rewrites two paragraphs, deletes a Sub-section she has stopped
believing in, and exports. The browser hands her a Markdown file. Nothing
was uploaded, nothing was synced, nothing was fetched: the file has no
network to reach and does not want one.

Back at her desk she hands the exported Markdown to Editor's Re-import
command. The app knows which chapter it came from, because the export
said so, and it updates that chapter in place.
The sidebar shows the same Parts and Chapters; every image reference
still resolves to the file beside the chapter; the half-gigabyte video
still resolves through the manifest to the copy that never moved. When
she looks at what changed, she sees her two paragraphs and the deleted
Sub-section, and nothing else — no reflowed lines, no re-escaped
characters, no tidied table, no lost comment.

What the tablet cannot do, it refuses cleanly. Alice cannot drag a
photograph into the chapter there: adding an image is the desktop app's
job, because that is where hashing, conversion, and the manifest live.
The tablet is for text, and it gets the text home unchanged except by her
edits.

## Why This Matters

Alice writes in the places where the writing happens, and half of those
places are not at her desk. Today the tablet is an editing dead end: a
notes app that mangles the Markdown, or a sync service she has ruled out,
or nothing. The cost of an editor that only exists on one machine is that
the text either stops when she leaves the desk or comes back subtly
damaged — the exact damage the acceptance project shows, where one text
became three copies and one of them silently drifted by thirty lines.
This gives her the same editor on the iPad, a borrowed laptop, or a
machine with nothing installed, and a guarantee about what comes back.

## Mechanism

- We expect the editing surface to run in Safari on an iPad because it is
  a web component by construction: the desktop app's native part is only
  a shell, and "the editing surface must be a web component, because the
  single self-contained HTML file has to carry an editor with Emacs
  bindings" (the decision record for the desktop shell). The single file
  carries the same build the app runs, so there is one editor and one
  binding table rather than two that drift.
- We expect the honest answer about which chords survive to be reportable
  rather than guessed, because the bindings are frontend data — "one
  table with an id, a label, and the chords for each action, which the
  keys panel, the tooltips, and the acceptance tests all read from"
  (`05-internals.md` section 5). A host that takes a chord can be marked
  in the same table the panel renders.
- We expect the exported Markdown to differ from the import only by
  Alice's edits, because every node carries its source span as byte
  offsets into the chapter file, and "serialising an edited tree changes
  only the spans that were edited: no reflowed paragraph, no re-escaped
  character, no realigned table" (`05-internals.md` section 2).
- We expect that promise to be testable against material that has already
  broken other tools, because the acceptance project supplies the
  hazards: 544-character lines, page-break comments a print route
  depends on, and a percent-encoded folder path containing a space
  (`03-evidence.md`, "The acceptance project").
- We expect an HTML-to-Markdown round trip to be prior art rather than a
  novelty, because the maintainer's own reading app already serialises
  its edits back into Markdown, and the research note records the round
  trip as proven rather than proposed.
- We expect re-import to leave assets alone because the chapter never
  carries an asset's bytes: copied assets are relative paths beside the
  chapter and referenced assets are ids in the manifest
  (`05-internals.md` sections 1 and 6). Text that changes cannot move a
  file the text only names.
- We expect a two-device clash to be reported rather than merged, because
  collaboration is out of scope by decision: "Concurrent edits from two
  devices are not supported: the last write wins and the app says so"
  (`06-delivery.md`, "Out of scope").

## Scope Conditions

- Platform: the single HTML file opened in Safari on an iPad with a
  hardware keyboard, and in any desktop browser on a machine with nothing
  installed. There is no shell here to claim key combinations back from
  the platform, so the set of live bindings is a subset of the desktop
  app's and the keys panel says which subset.
- Population: Alice alone. One author, one document, one chapter at a
  time. No second person edits the same chapter, and no device syncs.
- Assumption: the file reaches the tablet and the exported Markdown
  reaches the desk by whatever means Alice already uses to move a file.
  The tablet path is a file she carries, not a live connection, and the
  app opens no network for it.
- Assumption: text only. Images, video, and every other asset are added
  in the desktop app; the tablet neither copies, hashes, converts, nor
  references a file.
- Assumption: an exported chapter carries, in its own front matter, the
  path of the chapter it came from and a record of the bytes it was
  exported from. That is what lets the Re-import command find the chapter
  again and see that it has changed underneath her. Re-import is a
  command of its own: a Markdown file dropped on a Part in the sidebar is
  a new chapter and belongs to map #1, `itd-2609051335399446`; a flat
  manuscript goes through the Import command and belongs to map #13,
  `itd-2609051335529787`; and a file dropped on the editor text is a
  reference at the cursor and belongs to map #4,
  `itd-2609051335420536`.
- Boundary with map #2 (itd-2609051335406422, edit with the Emacs
  bindings I already know): the boundary is the host. 2 owns the desktop
  app, the binding table itself, and the shell claiming combinations back
  from the platform. This intent owns only what survives in Safari on an
  iPad with no shell, and how the keys panel reports the difference.
- Boundary with map #17 (itd-2609051335570842, carry the document as one
  file that reads anywhere): the same file, a different job. 17 owns
  reading — embedding, offline behaviour, poster and link. This intent
  owns importing a chapter's Markdown, editing it, exporting it, and
  re-importing it into the app.
- Boundary with map #13 (itd-2609051335529787, bring an old single-file
  manuscript in): the other direction of the same fidelity promise. 13 is
  one-way, a flat file into a chapter folder, and is byte-fidelity's
  first hard test. This intent is the round trip out and back, and is its
  second.
- Boundary with map #22 (itd-2609051336025064, mark up a chapter without
  touching the text): 22 owns whether an annotation anchor re-attaches
  after the edits this intent allows. This intent owns only that the text
  itself returns unchanged except where Alice edited it.

## Acceptance Criteria

- Given a chapter file containing a 544-character line, a
  `<!-- pagebreak -->` comment alone on a line, a table, and a fenced div
  written as `::: {.notes}`, when Alice imports it into the single file
  on an iPad and exports without typing anything, then the exported bytes
  are identical to the imported bytes.
- Given that same imported chapter, when Alice edits one paragraph and a
  Sub-section heading and exports, then the exported file differs from
  the import at those two places only: no reflowed line, no re-escaped
  character, no realigned table, and no dropped comment anywhere else in
  the file.
- Given an iPad with a hardware keyboard, when Alice works through every
  action in the binding table, then the keys panel marks each chord as
  live or taken by the host, every chord it marks live performs its
  action inside the text, and the cancel chord and Escape each clear a
  search, a panel, and a prefix state.
- Given a chapter exported from the tablet, when Alice brings it back
  through the Re-import command, then Editor identifies the chapter it
  came from without asking her which one it is, that chapter updates in
  place, every relative image reference beside it still resolves, and
  every referenced asset still resolves to the file it named, with no
  asset copied, moved, or re-hashed.
- Given a chapter Alice has also edited in the desktop app since she
  exported it, when she re-imports the tablet's copy, then Editor reports
  that the chapter has changed on disk since the export, names both
  versions, and waits for her to choose, rather than merging them or
  overwriting silently. (Negative case.)
- Given a Markdown file that was never exported from this document, when
  Alice offers it to the Re-import command, then Editor says it cannot
  tell which chapter it belongs to, writes nothing, and points her at the
  Import command for a manuscript and at a drop into a Part for a new
  chapter. (Negative case.)
- Given the single file open with the network switched off, when Alice
  imports a chapter, edits it, and exports it, then no request leaves the
  device, and no gesture in the file offers to add an image, a video, or
  any other asset.
- Given the single file open at iPad width (820 CSS px), at iPhone width
  (390 CSS px), and at desktop width (1280 CSS px), when the editing
  surface is showing, then the text, the modeline, and the keys panel are
  all legible at every one of the three widths with no horizontal
  scrolling and no pinch zoom.
- Inherits: round-trip byte-fidelity (`itd-2609051336074533`) — this
  moment is its second hard test; no machine in the document
  (`itd-2609051336080960`); one source, always (`itd-2609051336090390`);
  degrade gracefully in a plain tool (`itd-2609051336110536`); legible on
  three device classes (`itd-2609051336128348`), at 390, 820, and 1280
  CSS px; network only on publish (`itd-2609051336158553`); and, from
  phase 3 where it binds, variant fidelity (`itd-2609051336107315`),
  since a chapter carrying variant marks must come home with every mark
  intact.

## Open Questions

From `03-evidence.md`, "Open questions":

- "Whether the single file imports and exports one chapter at a time
  only, or can also take a whole chapter folder as an archive." This
  decides whether Alice can restructure a Part away from her desk or only
  rewrite inside one chapter.
- "How concurrent edits from two devices are detected so that
  last-write-wins can be reported rather than silently applied." The
  report on re-import is the whole of this moment's safety.
- "The binding table: which prefix keys and which of the less common
  Emacs bindings count as 'full'." The finite list is the acceptance list
  here as much as in the app, and the tablet's subset is measured against
  it.
- "Which key combinations macOS and the web view take before the editor
  sees them, and which of those the shell can claim back." On the tablet
  there is no shell to claim anything back, so what is open for the
  desktop is settled unfavourably here and must be reported instead.
- "Whether individual chords in that table are rebindable and persisted."
  If a chord is taken by the tablet, rebinding is the only remedy the
  design currently allows.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
