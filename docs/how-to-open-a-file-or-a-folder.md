# How to open a file or a folder

`C-x C-f` opens a document folder. This is the other door onto the same
room: `C-x C-o` opens a document folder or a single Markdown file, whichever
you have in front of you.

## Open the chord

Press `C-x C-o`.

Editor asks which kind of thing to open: **A document folder** or **A
single file**. Move between the two with `C-n`/`C-p` or the arrow keys, and
press Return; `C-g` or Escape closes the question without opening anything.

## A document folder

Choosing **A document folder** opens the system's own folder dialog. Pick
any document folder, and Editor shows it exactly as `C-x C-f` would: the
sidebar draws every Part and Chapter, in prefix order.

## A single file

Choosing **A single file** opens the system's own file dialog, filtered to
Markdown. Pick a `.md` or `.markdown` file that has no document folder built
around it yet, and Editor opens it as a document of exactly one chapter,
rooted in the folder the file already sits in.

Nothing is written for this: no `document.yaml`, no Part folder, no rename.
The sidebar shows the one chapter, already open, and every edit you make
saves to that file alone, byte for byte — nothing else in its folder is
touched, and no other file appears beside it in the sidebar.

If the file you pick already lives inside a folder that is a document —
one carrying its own `document.yaml`, however many Parts deep the file
sits — Editor opens the whole document instead, exactly as `C-x C-f` would,
and starts you on the chapter you picked.

Picking a file that is not Markdown opens nothing: Editor says so, and
writes nothing anywhere.

## Unsaved edits

Opening another document replaces everything on screen, including the chapters
open in windows that do not hold the keyboard and the chapters whose windows you
have closed. So Editor asks first whenever any of them has unsaved edits, naming
the chapter when there is one and counting them when there are more. Decline,
and nothing is replaced: the document, the sidebar and every window are exactly
where you left them.

## Publishing and exporting a one-chapter document

A document opened this way names no variant — there is no `document.yaml` to
name one in — so it publishes and exports as its own single default variant,
the same as a document [New document](how-to-start-a-new-document.md)
creates before you have written any `variants:` into it. Nothing about the
publish panel or the export panel treats it differently.

A dry run and a folder export still write nothing beside the file itself. A
real publish is the one exception: the first time you publish, Editor mints
this document its identity and writes it into a `document.yaml` it creates
in the file's own folder, so a later publish reuses the same public link
rather than minting a second one. To give the file the rest of a document's
shape ahead of that — a named Part, room for a second chapter — start fresh
with [New document](how-to-start-a-new-document.md) and move the text
across, or build the folder around it by hand; either way, `C-x C-f` reads
it back exactly as any other document folder once it exists.

## Related

- [Start a new document](how-to-start-a-new-document.md) — the panel that
  writes a document folder for you when there is nothing written yet.
- [Find and change the keys](how-to-find-and-change-the-keys.md) — the keys
  panel, and every chord Editor answers.
- [The document model and the three renderings](explanation-the-document-model.md)
  — why a document is a folder, and what the degenerate one-chapter case is.
