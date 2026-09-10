# How to start a new document

A document is a folder. This is how you get the first one, with nothing
already written and nothing invented on your behalf.

## Open the panel

Press `C-x C-n`.

The New document panel opens with a title field, a **Choose folder…**
button, and a Create button that stays disabled until both a title and a
folder are given.

## Type a title and choose a folder

Type the document's title. It is used twice: as the title in the document's
metadata, and, exactly as you typed it, as the level-one heading of the one
chapter Editor writes.

Press **Choose folder…**. The system's own folder dialog opens; pick an
empty folder, or one that does not already hold a document. Cancelling the
dialog leaves the panel exactly as it was.

## Create it

Press **Create**, or close the panel with `C-g` or Escape to abandon it —
nothing is written until you press Create.

Editor writes:

```
the-lantern-papers/
  document.yaml           the title, the default asset threshold, the default citation style
  01-chapters/
    01-the-lantern-papers.md   "# The Lantern Papers" and a blank line
```

The folder opens, the sidebar shows the one Part and the one Chapter, the
chapter is open, and the cursor sits on the blank line beneath the heading.
Start typing.

Nothing else is in the folder: no sample text, no placeholder chapter, no
template to delete. `document.yaml` carries no id — an id is minted the
first time you publish — and declares no variants and no bibliography. A
document with no variant declared is not a document you cannot publish: it
publishes and exports as its own single default variant, so there is
nothing more to write in `document.yaml` before you try [your first
talk](tutorial-your-first-talk.md).

## What Create refuses

If the folder you chose already holds a document — a `document.yaml` file,
or a chapter already sitting inside a Part — Create refuses, says what it
found, and writes nothing at all: no folder, no metadata, no partial
chapter. Choose a different folder, or an empty one, and try again.

## Growing it

The structure is the file system, from the first second. Close Editor and
open the same folder in any Markdown tool, put it under version control, or
hand it to someone else — every file in it is plain text.

Add a second chapter by putting another Markdown file into `01-chapters`;
the sidebar picks it up in prefix order. Add a second Part by making another
numbered folder beside the first.

## Related

- [Your first talk](tutorial-your-first-talk.md) — once a document exists,
  editing, projecting and publishing it from there.
- [The document model and the three renderings](explanation-the-document-model.md)
  — why a document is a folder, and what `document.yaml` holds.
