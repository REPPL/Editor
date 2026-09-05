# Reference prototype: keyboard navigation for a complex page

Source: a single-file HTML tool the maintainer built for a different task,
pointed at on 2026-09-05 as a good example of Emacs-style navigation with
help and modes. Only its form is recorded; its purpose and content are
left out. The maintainer is not fond of its visual style; the navigation is
the reference.

## Form

- One HTML file of about 100 KB with everything inline.
- A declarative key table: each action has an id, a human label, and a
  list of default chords (for example next item on `C-n` and Down,
  previous section on `C-[` and Left, page down on `C-v`, search on `C-s`
  and previous match on `C-r`, cancel on `C-g`, help on `C-c`, a how-it-
  works panel on `C-h`, a keys panel on `C-x k`, save on `C-x C-s`).
  Bindings are user-rebindable from that panel and persisted.
- Modifier mapping is explicit: Control prefixes `C-`, Option prefixes
  `M-`, Command prefixes `s-`. Chords are strings built from the event, so
  the table is data, not code.
- Prefix keys are real: `C-x` opens a prefix state and the next key
  completes the chord. Control prefixes keep working inside a text field
  so editing and navigating share one vocabulary.
- `C-g` and Escape cancel anything: a search, a panel, an overlay, a
  prefix. Every overlay's key handler checks for them first.
- A modeline at the foot shows position (item n of total) and mode; a
  help button in the toolbar names its own chord in a tooltip.
- Overlays own the keyboard while open and navigate with the same `C-n`
  and `C-p` as the main view.

## What this decides for Editor

- The binding table the constraints chapter asks for should be data in
  this shape: id, label, default chords, rebindable, persisted, rendered
  in a keys panel and in tooltips.
- `C-g` cancels everywhere, and a prefix state is visible in the modeline.
- Help is one chord away and lists the live bindings, not a static page.
- Navigation chords (sections, items, search) apply to the reading views
  too, not only to the editor, so the presenter and the single file
  inherit them.
