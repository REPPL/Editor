# Your first talk

In this tutorial you create a document, write a few lines, add a divider
slide, project the deck, and dry-run a publish. Nothing you do here leaves
your machine.

It takes about twenty minutes. You need Editor running: `npm run tauri dev`
from the repository root.

## 1. Create a document

Press `C-x C-n`. The New document panel opens.

Type a title — "The Lantern Papers" will do — then press **Choose folder…**
and pick an empty folder. Press **Create**.

The folder opens, the sidebar shows one Part and one Chapter, the chapter is
open, and the cursor sits on a blank line beneath the heading Editor wrote
from your title.

The bottom line of the window is the modeline. It names the chapter you are
in, says whether it has unsaved changes, and is where Editor answers you.

## 2. Move about with the keys

The editing surface answers Emacs chords. Try these:

- `C-n` and `C-p` move down and up a line; `C-f` and `C-b` move a character.
- `M-f` and `M-b` move a word at a time.
- `C-a` and `C-e` go to the beginning and the end of the line.
- `C-Home` and `C-End` go to the beginning and the end of the chapter.

Press `C-h b` to see every chord Editor answers, grouped by what it does. The
panel closes with `C-g` or Escape, which is how every overlay in Editor closes.

## 3. Write the opening

On the blank line beneath the heading, type a sentence or two — whatever
your talk is about. The modeline shows a dot beside the chapter name: the
buffer now differs from the file.

Press Return twice and type a second heading, `## Where it begins`, then
Return again and a line under it.

Press `C-x C-s` to save. The modeline says what it wrote, and the dot goes.

If you change your mind, `C-/` undoes and `C-S-/` redoes — as many times as
you like, in one press each.

## 4. Insert a divider

A divider is a slide with nothing on it but its heading: the beat before you
change subject.

Put the cursor at the end of the second heading — `## Where it begins` — and
press `C-c i`. The insert palette opens. Type `div`; **Divider heading**
rises to the top. Press Return.

The heading now reads:

```markdown
## Where it begins {.divider}
```

That is all a divider is. Every construct Editor knows is written this way:
plain Markdown that a tool knowing nothing about Editor still reads correctly.
Press `C-c i` and type a few letters to see the rest.

Now try a slide split. Put the cursor at the end of a paragraph, press `C-c i`,
type `split`, and press Return. A `---` goes in on a paragraph of its own, and
everything after it is the next slide.

Save with `C-x C-s`.

## 5. Project it

Press `C-c C-p`.

A second window opens with the deck built from the text in your buffer —
not from the file, so an unsaved edit projects. Move through it with the arrow
keys or the space bar; press `Escape` for the overview.

Press `s` to open the speaker notes beside the deck. The notes are the prose
Editor put under the slide, plus the next slide's headline; press `s` again to
close them and give the whole window back to the slide.

Nothing was written anywhere. Close the window and the deck is gone; your
chapter is untouched.

## 6. Dry-run a publish

Press `C-c C-l`. The publish panel opens with the document's title, the variant
being published, and — every time, behind no disclosure — the sentence about
what unlisted means.

Press **Dry run**.

Editor builds the version exactly as a real publish would: it computes the
document's identity, the variant's token, and the version hash from the content
alone, and lists every step. Then it stops. Nothing is written into a
repository, nothing leaves the machine, and no link is minted.

Read the steps. They are the same steps a real publish runs, in the same order,
so a dry run that succeeds is a publish that will.

Press **Close**, or `C-g`.

## Where to go next

- The real publish needs a repository and a host: see
  [Connect the production repository](how-to-connect-the-production-repository.md).
- Every construct, with the exact form to write:
  [The Markdown canon](reference-the-markdown-canon.md).
- Why a document is a folder, and how one chapter becomes three renderings:
  [The document model and the three renderings](explanation-the-document-model.md).
