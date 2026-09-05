# How to export a folder you can carry

Some rooms have no network. Editor writes the deck and the article as folders
you choose, so a talk runs from a memory stick and a reader gets a page that
opens by double-click.

## Open the export panel

Press `C-c C-e`.

The panel lists every file Editor is willing to write from the document as it
stands, one row each. Move through the rows with `C-n` and `C-p`, write the
highlighted row with Return, and close the panel with `C-g` or Escape. Nothing
is written until you confirm a row.

| Row | Where it writes | What it puts there |
|---|---|---|
| The deck as a folder | a new folder, `<title>-deck`, inside the folder you choose | the built slides, the deck engine beside them, and every image the chapters reference |
| The article as a folder | a new folder, `<title>-article`, inside the folder you choose | the built page, its stylesheet, and the same images |
| A dry run of a publish | the application's own cache folder | the version a publish would push, and its step list; the folder opens in the Finder |
| One HTML file that reads anywhere | — | not yet available: phase 5 |
| The journal PDF | — | not yet available: phase 6, and rendered in the publish pipeline rather than in the app |

Each row states its destination and lists every file before you confirm. The
list comes from the build itself, so it says what will actually be written.

The last two rows cannot be confirmed. Pressing Return on either names the
phase it arrives in, opens no dialog, and writes nothing.

## Write the deck

Highlight the deck row and press Return. The folder dialog opens beside your
document folder. Choose somewhere — the desktop, a memory stick — and confirm.

Editor writes the folder and shows it in the Finder. Inside it:

```
macromarketing-2026-deck/
  slides/index.html      the deck: this is the page you open
  presenter/             the engine, its stylesheet, and its start-up script
  assets/…               one file per image, under a name that needs no escaping
```

Open `slides/index.html` in any browser. The deck runs with no network and
nothing installed: every slide, every image, and every `::: {.notes}` block as
that slide's speaker notes. Copy the whole folder to move it; the files refer
to each other by relative paths only, and no file names anything on your
machine.

The article row works the same way and writes `index.html` at the folder's
root.

## What an export refuses

- **A destination inside the document folder.** A rendering written into the
  document could be read back as one of its own sources, so the export refuses
  the document folder and everything under it, and says so.
- **Writing over a folder that is there.** A second export of the same
  document creates `<title>-deck-2`, `<title>-deck-3`, and so on. Nothing is
  ever overwritten.
- **A build with unresolved references.** A picture the build cannot find
  stops every row that writes, and the panel lists each one with its chapter
  and its reason. Fix the reference and open the panel again.
- **Unsaved edits.** An export reads the files, not the buffer. Save with
  `C-x C-s` first; until you do, the panel says why it will not open.

## Look at a publish before you push it

Highlight the dry-run row and press Return. Editor stages the version a publish
would push — the same build, with the chrome the site keeps at its root — and
opens the staged folder in the Finder, without touching the repository or the
network. It is the way to see exactly what would go to the site.

## What is the same, and what differs

The folder you carry and the version the site serves come from one builder.
The images are the same bytes, the slide markup is the same markup, and the
only difference is where each page finds the deck engine: the site keeps one
copy at its root for every version, and an exported folder carries its own copy
beside the page. That is why the deck's page sits at `slides/index.html` inside
the folder rather than at its root — the same shape a published version has, so
every reference between the files is identical.

## Related

- [Connect the production repository](how-to-connect-the-production-repository.md)
  — what a real publish needs before the dry run becomes a push.
- [The document model and the three renderings](explanation-the-document-model.md)
  — why one parse and one build stand behind every rendering.
