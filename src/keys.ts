/**
 * The binding table.
 *
 * Bindings are data, not code: each action carries an id, a human label, and
 * the chords that reach it. The table is the acceptance list the spike checks
 * and the source for the keys panel, so nothing here may be a comment in
 * another module.
 *
 * Chord notation follows the keyboard-navigation prototype:
 *
 * - `C-` Control
 * - `M-` Meta, which is Option on macOS
 * - `s-` Super, which is Command on macOS
 * - `S-` Shift
 *
 * A chord with a space in it is a prefix sequence: `C-x C-s` means Control-x
 * then Control-s.
 */

/** Where a binding is implemented. */
export type BindingOwner =
  /** Shipped by the CodeMirror Emacs keymap, at the highest precedence. */
  | "keymap"
  /**
   * Shipped by one of CodeMirror's own keymaps, below the Emacs keymap.
   *
   * These answer only what the Emacs keymap leaves alone, and they decline
   * the event when the command has nothing to do — an undo with an empty
   * history, an indent with nothing to indent — so the page does not always
   * claim them.
   */
  | "codemirror"
  /** Added by Editor on top of the keymaps. */
  | "editor"
  /** Claimed by the Tauri menu before the web view sees it. */
  | "shell"
  /**
   * Reserved for a command another part of the application will wire.
   *
   * The row exists so the chord is spoken for and the uniqueness check holds
   * before the command lands. Nothing answers it yet.
   */
  | "app"
  /**
   * Answered by the sidebar, and only while the sidebar holds the keyboard.
   *
   * Focus is single and exclusive, so a chord a `sidebar` row carries may be
   * carried by an `editor` row as well: `C-n` is next line in the text and
   * next node in the tree, and never both. That is why the table's
   * no-two-rows-one-chord invariant is stated per scope — see `scopeOf`.
   */
  | "sidebar";

/** The grouping a binding appears under in the keys panel. */
export type BindingGroup =
  | "movement"
  | "selection"
  | "editing"
  | "outline"
  | "mark"
  | "search"
  | "document"
  | "control"
  | "panes";

/** The groups in the order the keys panel shows them. */
export const BINDING_GROUPS: readonly BindingGroup[] = [
  "movement",
  "selection",
  "editing",
  "outline",
  "mark",
  "search",
  "document",
  "control",
  "panes",
];

/** The human heading each group carries in the keys panel. */
export const GROUP_LABELS: Readonly<Record<BindingGroup, string>> = {
  movement: "Movement",
  selection: "Selection",
  editing: "Editing",
  // The document model as an outline (`itd-2609061318091323`): heading
  // movement, folding, promotion, moving a section, and narrowing.
  outline: "Outline",
  mark: "Mark and kill ring",
  search: "Search",
  document: "Document",
  control: "Control",
  // The whole window-switching flow reads together, rather than a second
  // "Next line" sitting beside the first in Movement.
  panes: "Panes",
};

/** One action and the chords that reach it. */
export interface Binding {
  /** Stable identifier, used by tests and by persisted rebindings. */
  readonly id: string;
  /** Human label for the keys panel and tooltips. */
  readonly label: string;
  /** Default chords, most idiomatic first. */
  readonly chords: readonly string[];
  readonly group: BindingGroup;
  readonly owner: BindingOwner;
}

/**
 * The default binding table.
 *
 * This is the finite list the delivery chapter asks "full Emacs bindings" to
 * be reduced to. It is deliberately smaller than GNU Emacs: it covers the
 * chords an author uses while writing prose.
 */
export const BINDINGS: readonly Binding[] = [
  // Movement
  {
    id: "forward-char",
    label: "Forward character",
    chords: ["C-f", "Right"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "backward-char",
    label: "Backward character",
    chords: ["C-b", "Left"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "next-line",
    label: "Next line",
    chords: ["C-n", "Down"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "previous-line",
    label: "Previous line",
    chords: ["C-p", "Up"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "forward-word",
    label: "Forward word",
    chords: ["M-f", "C-Right", "M-Right"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "backward-word",
    label: "Backward word",
    chords: ["M-b", "C-Left", "M-Left"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "beginning-of-line",
    label: "Beginning of line",
    chords: ["C-a", "Home", "s-Left"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "end-of-line",
    label: "End of line",
    chords: ["C-e", "End", "s-Right"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "beginning-of-buffer",
    label: "Beginning of document",
    chords: ["C-Home", "M-S-,", "s-Up", "s-Home"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "end-of-buffer",
    label: "End of document",
    chords: ["C-End", "M-S-.", "s-Down", "s-End"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "scroll-up",
    label: "Page down",
    chords: ["C-v", "PageDown", "C-Down"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "scroll-down",
    label: "Page up",
    chords: ["M-v", "PageUp", "C-Up"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "goto-line",
    label: "Go to line",
    chords: ["M-g", "M-s-g"],
    group: "movement",
    owner: "editor",
  },
  {
    id: "recenter",
    label: "Recentre the view",
    chords: ["C-l"],
    group: "movement",
    owner: "keymap",
  },

  // Editing
  {
    id: "delete-char",
    label: "Delete character",
    chords: ["C-d", "Delete"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "kill-line",
    label: "Kill to end of line",
    chords: ["C-k"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "kill-word",
    label: "Kill word forward",
    chords: ["M-d", "C-Delete"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "backward-kill-word",
    label: "Kill word backward",
    chords: ["M-Backspace", "C-Backspace", "M-Delete", "C-M-h"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "open-line",
    label: "Open a line",
    chords: ["C-o"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "transpose-chars",
    label: "Transpose characters",
    chords: ["C-t"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "upcase-word",
    label: "Upper-case word",
    chords: ["M-u"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "downcase-word",
    label: "Lower-case word",
    chords: ["M-l"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "undo",
    label: "Undo",
    chords: ["C-/", "C-x u", "C-z", "C-S--", "s-z"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "redo",
    label: "Redo",
    chords: ["S-C-/", "C-S-x u", "C--", "C-S-z", "s-S-z"],
    group: "editing",
    owner: "keymap",
  },

  // Mark and kill ring
  {
    id: "set-mark",
    label: "Set the mark",
    chords: ["C-Space"],
    group: "mark",
    owner: "keymap",
  },
  {
    id: "exchange-point-and-mark",
    label: "Exchange point and mark",
    chords: ["C-x C-x"],
    group: "mark",
    owner: "keymap",
  },
  {
    id: "kill-region",
    label: "Kill the region",
    chords: ["C-w", "C-S-w"],
    group: "mark",
    owner: "keymap",
  },
  {
    id: "kill-ring-save",
    label: "Copy the region",
    chords: ["M-w"],
    group: "mark",
    owner: "keymap",
  },
  {
    id: "yank",
    label: "Yank",
    chords: ["C-y", "S-Delete"],
    group: "mark",
    owner: "keymap",
  },
  {
    id: "yank-pop",
    label: "Yank the previous kill",
    chords: ["M-y"],
    group: "mark",
    owner: "keymap",
  },
  {
    id: "select-rectangle",
    label: "Select a rectangular region",
    chords: ["C-x r"],
    group: "mark",
    owner: "keymap",
  },
  {
    id: "select-all",
    label: "Select the whole document",
    chords: ["C-x h", "C-x C-p", "s-a"],
    group: "mark",
    owner: "keymap",
  },

  // Search
  {
    id: "isearch-forward",
    label: "Search forward",
    chords: ["C-s", "s-f"],
    group: "search",
    owner: "keymap",
  },
  {
    id: "isearch-backward",
    label: "Search backward",
    chords: ["C-r"],
    group: "search",
    owner: "keymap",
  },
  {
    id: "find-next",
    label: "Next match",
    chords: ["M-C-s", "s-g", "F3"],
    group: "search",
    owner: "editor",
  },
  {
    id: "find-previous",
    label: "Previous match",
    chords: ["M-C-r", "s-S-g", "S-F3"],
    group: "search",
    owner: "editor",
  },

  // Document
  {
    id: "save-chapter",
    label: "Save the chapter",
    chords: ["C-x C-s"],
    group: "document",
    owner: "editor",
  },
  {
    id: "open-folder",
    label: "Open a document folder",
    chords: ["C-x C-f"],
    group: "document",
    owner: "editor",
  },
  {
    // `C-x C-o` used to sit beside `C-x o` for `other-window`; the maintainer
    // asked for a chord that opens a file or a folder, and Emacs itself
    // spends this one on `delete-blank-lines`, which nothing in this table
    // answers, so the pane cycle gives it up (`itd-2609061509393380`, map
    // #35). `C-x C-f` keeps opening a folder exactly as it does today; this
    // is a second door, onto a folder or a single file, chosen through the
    // shell's own dialog.
    id: "open-file-or-folder",
    label: "Open a file or a folder",
    chords: ["C-x C-o"],
    group: "document",
    owner: "editor",
  },
  {
    // Emacs's own `C-x C-n` is `set-goal-column`, which the package this
    // editing surface is built on does not implement — its own keymap
    // (`@replit/codemirror-emacs`'s `emacsKeys`) carries no entry for it at
    // all, so nothing already answers this chord (`itd-2609051402191319`).
    id: "new-document-open",
    label: "New document",
    chords: ["C-x C-n"],
    group: "document",
    owner: "app",
  },
  {
    // `Cmd-O` is the File menu's accelerator, so macOS resolves it before the
    // web view is consulted and the editing surface never sees the keydown.
    // It reaches the same action by a different route, which is what `shell`
    // owner means, and it is why the sweep below does not expect the page to
    // claim it.
    id: "open-folder-menu",
    label: "Open a document folder (menu)",
    chords: ["s-o"],
    group: "document",
    owner: "shell",
  },

  // Control
  {
    id: "keyboard-quit",
    label: "Cancel",
    chords: ["C-g", "Escape"],
    group: "control",
    owner: "keymap",
  },
  {
    id: "universal-argument",
    label: "Numeric argument",
    chords: ["C-u"],
    group: "control",
    owner: "keymap",
  },
  {
    id: "toggle-key-log",
    label: "Show the key log",
    chords: ["C-x k"],
    group: "control",
    owner: "editor",
  },

  // The editing surface's type size. Emacs's own chords, each behind the `C-x`
  // prefix the app already claims: that is what leaves `C--` as redo and `C-=`
  // free, and what keeps a web view's own zoom keys out of the way.
  {
    id: "text-scale-increase",
    label: "Bigger text",
    chords: ["C-x C-="],
    group: "control",
    owner: "editor",
  },
  {
    id: "text-scale-decrease",
    label: "Smaller text",
    chords: ["C-x C--"],
    group: "control",
    owner: "editor",
  },
  {
    id: "text-scale-reset",
    label: "Default text size",
    chords: ["C-x C-0"],
    group: "control",
    owner: "editor",
  },

  // Selection. Every movement chord has a Shift variant that drags the
  // selection along with the point; the keymaps ship them, so the table lists
  // them rather than leaving a third of what the surface answers unnamed.
  {
    id: "select-forward-char",
    label: "Select forward character",
    chords: ["C-S-f", "S-Right"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-backward-char",
    label: "Select backward character",
    chords: ["C-S-b", "S-Left"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-next-line",
    label: "Select to the next line",
    chords: ["C-S-n", "S-Down"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-previous-line",
    label: "Select to the previous line",
    chords: ["C-S-p", "S-Up"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-forward-word",
    label: "Select forward word",
    chords: ["M-S-f", "C-S-Right", "M-S-Right"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-backward-word",
    label: "Select backward word",
    chords: ["M-S-b", "C-S-Left", "M-S-Left"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-beginning-of-line",
    label: "Select to the beginning of the line",
    chords: ["C-S-a", "S-Home", "s-S-Left"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-end-of-line",
    label: "Select to the end of the line",
    chords: ["C-S-e", "S-End", "s-S-Right"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-beginning-of-buffer",
    label: "Select to the beginning of the document",
    chords: ["C-S-Home", "s-S-Up", "s-S-Home"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-end-of-buffer",
    label: "Select to the end of the document",
    chords: ["C-S-End", "s-S-Down", "s-S-End"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-page-down",
    label: "Select a page down",
    chords: ["C-S-Down", "S-PageDown"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-page-up",
    label: "Select a page up",
    chords: ["C-S-Up", "S-PageUp"],
    group: "selection",
    owner: "keymap",
  },
  {
    // `M-@` on a US layout. The chord is written from the physical key,
    // because that is what a browser reports once Shift is down.
    id: "mark-word",
    label: "Mark the next word",
    chords: ["M-S-2"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "mark-paragraph",
    label: "Mark the paragraph",
    chords: ["M-h"],
    group: "selection",
    owner: "keymap",
  },
  {
    id: "select-parent-syntax",
    label: "Select the enclosing construct",
    chords: ["s-i"],
    group: "selection",
    owner: "codemirror",
  },
  {
    id: "select-next-occurrence",
    label: "Select the next occurrence",
    chords: ["s-d"],
    group: "selection",
    owner: "codemirror",
  },
  {
    id: "select-all-matches",
    label: "Select every occurrence of the selection",
    chords: ["s-S-l"],
    group: "selection",
    owner: "codemirror",
  },
  {
    id: "add-cursor-above",
    label: "Add a cursor above",
    chords: ["M-s-Up"],
    group: "selection",
    owner: "codemirror",
  },
  {
    id: "add-cursor-below",
    label: "Add a cursor below",
    chords: ["M-s-Down"],
    group: "selection",
    owner: "codemirror",
  },

  // Editing the keymaps ship that the first table did not name.
  {
    id: "newline",
    label: "New line",
    chords: ["Return", "C-m"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "delete-backward-char",
    label: "Delete backward",
    chords: ["Backspace", "S-Backspace"],
    group: "editing",
    owner: "codemirror",
  },
  {
    // The pair of region case changes. `C-x C-l` is Emacs's `downcase-region`
    // and belongs to the row below: the package binds it to the same upcase
    // call `C-x C-u` carries, so this row inherited a chord that lowered
    // nothing (`iss-2609091729471352`). Both are answered by Editor's own
    // command now — see `registerEditorChords` in `src/emacs.ts`.
    id: "upcase-region",
    label: "Upper-case the region",
    chords: ["C-x C-u"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "downcase-region",
    label: "Lower-case the region",
    chords: ["C-x C-l"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "insert-blank-line",
    label: "Insert a blank line",
    chords: ["s-Return", "S-Return"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "move-line-up",
    label: "Move the line up",
    chords: ["M-Up"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "move-line-down",
    label: "Move the line down",
    chords: ["M-Down"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "copy-line-up",
    label: "Copy the line up",
    chords: ["M-S-Up"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "copy-line-down",
    label: "Copy the line down",
    chords: ["M-S-Down"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "delete-line",
    label: "Delete the line",
    chords: ["s-S-k"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "delete-to-line-start",
    label: "Delete to the beginning of the line",
    chords: ["s-Backspace"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "delete-to-line-end",
    label: "Delete to the end of the line",
    chords: ["s-Delete"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "indent-less",
    label: "Outdent",
    chords: ["s-["],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "indent-more",
    label: "Indent",
    chords: ["s-]"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "indent-selection",
    label: "Reindent the selection",
    chords: ["M-s-\\"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "goto-matching-bracket",
    label: "Go to the matching bracket",
    chords: ["s-S-\\"],
    group: "movement",
    owner: "codemirror",
  },
  // `center-selection` (`M-s`, package-native) is retired here
  // (`itd-2609061318091323`): it names no doc, test or other module, and
  // `M-s` becomes the outline vocabulary's search prefix instead, carrying
  // `outline-occur` on `M-s o`. `recenter` (`C-l`) already puts the cursor's
  // line at the centre of the view, which is what centre-selection did.
  {
    id: "undo-selection",
    label: "Undo the selection change",
    chords: ["s-u"],
    group: "editing",
    owner: "codemirror",
  },
  {
    id: "redo-selection",
    label: "Redo the selection change",
    chords: ["s-S-u"],
    group: "editing",
    owner: "codemirror",
  },
  {
    // `M-%` on a US layout, written from the physical key.
    id: "query-replace",
    label: "Replace",
    chords: ["M-S-5"],
    group: "search",
    owner: "editor",
  },

  // Editor's own surfaces.
  {
    // `C-h b` is `describe-bindings`. WebKit may read a bare `C-h` as a
    // backspace in editable content, so `C-x ?` — written from the physical
    // key as `C-x S-/` — sits in the same row and costs nothing if it does.
    //
    // `F1` is the third chord, the key Emacs has given help on for as long as
    // it has had one, aliased there to the whole `C-h` prefix map and here to
    // the one thing that map is worth reaching: the panel that lists the
    // table (`itd-2609091722353594`). It is a leaf and never a prefix, so
    // `F1 b` is not a sequence, and it reaches the panel from the editing
    // surface and from nowhere else — exactly where the row's other two
    // chords reach it. Adding the row to what every pane answers would have
    // widened `C-h b` and `C-x S-/` with it, which the maintainer declined.
    id: "keys-panel",
    label: "Show the keys panel",
    chords: ["C-h b", "C-x S-/", "F1"],
    group: "control",
    owner: "editor",
  },
  {
    id: "insert-palette",
    label: "Insert a construct",
    chords: ["C-c i"],
    group: "editing",
    owner: "editor",
  },
  {
    // A mode switch, not a command: it never rewrites a byte, and there is
    // nothing to press that aligns a table (`itd-2609061653559060`). `C-c C-t`
    // is a complete two-step chord under the `C-c` prefix nineteen other rows
    // already share, and it sits under no existing prefix — `C-c C-s` is the
    // bold and italic prefix and this is not beneath it — so it neither
    // creates a leaf under a prefix nor turns a prefix into a leaf, which is
    // the hazard `iss-2609061510051784` recorded. The vendored keymap claims
    // nothing in the `C-c` space at all.
    id: "toggle-table-alignment",
    label: "Align tables as I type",
    chords: ["C-c C-t"],
    group: "editing",
    owner: "editor",
  },
  {
    // `F2` first, because it is the chord that always works: the row has to
    // be reachable from every pane, not only from the editing surface, and a
    // function key is answerable by both readers — the surface's own
    // CodeMirror extension and `src/focus.ts`'s document-level one — where a
    // `C-x` sequence bound only in the first is not
    // (`itd-2609091722296239`). `C-c C-s` is not available for this: it is
    // already the two-step prefix bold (`C-c C-s b`) and italic
    // (`C-c C-s i`) sit under (`itd-2609061318091323`), and the vendored
    // package resolves a prefix the instant a multi-step binding is
    // registered beneath it, so it can never also be a leaf.
    //
    // `C-x C-b` stays, freed from being a toggle only the text could reach,
    // as Emacs's own `list-buffers` chord pointed at Editor's chapter list —
    // the tree `C-x b` already searches by name. The divergence is named and
    // accepted: Emacs's `list-buffers` refreshes a list that never closes,
    // where a second press here hides the tree.
    id: "toggle-sidebar",
    label: "Show or hide the sidebar",
    chords: ["F2", "C-x C-b"],
    group: "document",
    owner: "editor",
  },
  {
    id: "reload-document",
    label: "Reload the document from disk",
    chords: ["C-x C-r"],
    group: "document",
    owner: "editor",
  },
  {
    id: "toggle-tab-focus",
    label: "Let Tab move focus instead of indenting",
    chords: ["M-S-m"],
    group: "control",
    owner: "codemirror",
  },

  // The application's own rows: the chord is the table's, the command is
  // registered by the bundle that owns it.
  {
    id: "present",
    label: "Present the chapter",
    chords: ["C-c C-p"],
    group: "document",
    owner: "app",
  },
  {
    // The article preview: a second window, in the manner of `present`,
    // rendering the whole document from the buffers the shell holds
    // (spc-2609061318090042). `v` for the view it opens, free beside
    // `present`'s own `p`.
    id: "preview",
    label: "Preview the article",
    chords: ["C-c C-v"],
    group: "document",
    owner: "app",
  },
  {
    id: "publish-open",
    label: "Publish this document",
    chords: ["C-c C-l"],
    group: "document",
    owner: "app",
  },
  {
    // `C-x o` is `other-window` in Emacs, and the sidebar-navigation spec
    // wires the pane cycle behind it, which is why the row is answered by
    // the application rather than reserved by it. `C-x C-o` sat beside it
    // for the same reason Emacs keeps the Control key down between two
    // related steps, until the maintainer asked for a chord that opens a
    // file or a folder; the pane cycle keeps `C-x o` alone, as Emacs does,
    // and `open-file-or-folder` answers the freed chord
    // (`itd-2609061509393380`, map #35).
    id: "other-window",
    label: "Move to the other pane",
    chords: ["C-x o"],
    group: "document",
    owner: "editor",
  },
  {
    id: "open-settings",
    label: "Open settings",
    chords: ["C-c C-,"],
    group: "document",
    owner: "app",
  },
  {
    id: "export-open",
    label: "Export to a folder",
    chords: ["C-c C-e"],
    group: "document",
    owner: "app",
  },

  // The prose vocabulary: the commands an Emacs writer's hands already know.
  //
  // Every chord is written from the physical key, as `mark-word` already is,
  // because that is what a browser reports once Option and Shift are down.
  // Emacs's own spelling is in the comment beside each.
  {
    id: "fill-paragraph",
    label: "Fill the paragraph",
    chords: ["M-q"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "transpose-words",
    label: "Transpose words",
    chords: ["M-t"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "transpose-lines",
    label: "Transpose lines",
    chords: ["C-x C-t"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "capitalize-word",
    label: "Capitalise word",
    chords: ["M-c"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "backward-sentence",
    label: "Backward sentence",
    chords: ["M-a"],
    group: "movement",
    owner: "editor",
  },
  {
    id: "forward-sentence",
    label: "Forward sentence",
    chords: ["M-e"],
    group: "movement",
    owner: "editor",
  },
  {
    // `M-{` on a US layout.
    id: "backward-paragraph",
    label: "Backward paragraph",
    chords: ["M-S-["],
    group: "movement",
    owner: "editor",
  },
  {
    // `M-}` on a US layout.
    id: "forward-paragraph",
    label: "Forward paragraph",
    chords: ["M-S-]"],
    group: "movement",
    owner: "editor",
  },
  {
    // `M-^` on a US layout.
    id: "delete-indentation",
    label: "Join to the previous line",
    chords: ["M-S-6"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "just-one-space",
    label: "Just one space",
    chords: ["M-Space"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "delete-horizontal-space",
    label: "Delete the surrounding space",
    chords: ["M-\\"],
    group: "editing",
    owner: "editor",
  },
  {
    id: "zap-to-char",
    label: "Zap to a character",
    chords: ["M-z"],
    group: "editing",
    owner: "editor",
  },
  {
    // Off the suppression list: completion now has the document's own words
    // behind it.
    id: "dabbrev-expand",
    label: "Expand the word from the document",
    chords: ["M-/"],
    group: "editing",
    owner: "editor",
  },
  {
    // Off the suppression list: the command line now has every row of this
    // table and every insert form behind it.
    id: "command-palette",
    label: "Run a command",
    chords: ["M-x"],
    group: "control",
    owner: "editor",
  },
  {
    id: "describe-key",
    label: "Describe the next key",
    chords: ["C-h k"],
    group: "control",
    owner: "editor",
  },
  {
    // Emacs's `describe-prefix-bindings`, on demand: with a prefix
    // half-typed, the help character lists what can follow it
    // (`itd-2609091722353594`). The chord is a bare `C-h`, and it is
    // deliberately *not* in `APP_COMMAND_IDS`: binding it in the package
    // would overwrite the prefix entry `C-h b` and `C-h k` depend on. The
    // row is answered by the guard in `emacs.ts`'s `handleKeyboard` wrapper
    // while a chain is live, and by the branch in `src/focus.ts` while that
    // reader holds a prefix — which is why `C-h` on its own still opens the
    // `C-h` prefix in the text and still claims nothing at all in the tree.
    id: "prefix-help",
    label: "What can follow this prefix",
    chords: ["C-h"],
    group: "control",
    owner: "editor",
  },
  {
    id: "move-to-window-line",
    label: "Cursor to the middle of the view",
    chords: ["M-r"],
    group: "movement",
    owner: "editor",
  },
  {
    id: "quit",
    label: "Quit Editor",
    chords: ["C-x C-c"],
    group: "document",
    owner: "editor",
  },

  // The outline vocabulary (`itd-2609061318091323`): the document model as
  // Emacs's Markdown mode and Org mode treat it. Four chords this table
  // already carried collide with Markdown mode's own spelling; the settled
  // rule in every case is that the shipped, documented meaning keeps its
  // chord and the new vocabulary takes another rather than displacing it —
  // `present` (`C-c C-p`), `publish-open` (`C-c C-l`) and `toggle-key-log`
  // (`C-x k`) are unchanged by this block. The fourth, `center-selection`
  // on `M-s`, is retired above; `M-s` becomes the prefix `outline-occur`
  // answers on.
  {
    id: "outline-next-heading",
    label: "Next heading",
    chords: ["C-c C-n"],
    group: "outline",
    owner: "editor",
  },
  {
    // Markdown mode's own previous-heading is `C-c C-p`, which `present`
    // already holds; this is Editor's own family, on the same terms as
    // `insert-palette`'s `C-c i`.
    id: "outline-previous-heading",
    label: "Previous heading",
    chords: ["C-c p"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-forward-same-level",
    label: "Next heading at this level",
    chords: ["C-c C-f"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-backward-same-level",
    label: "Previous heading at this level",
    chords: ["C-c C-b"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-up-heading",
    label: "Up to the parent heading",
    chords: ["C-c C-u"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-toggle-fold",
    label: "Fold or unfold this section",
    chords: ["Tab"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-cycle",
    label: "Cycle the whole outline",
    chords: ["S-Tab"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-promote",
    label: "Promote the heading",
    chords: ["C-c Left"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-demote",
    label: "Demote the heading",
    chords: ["C-c Right"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-move-up",
    label: "Move the section up",
    chords: ["C-c Up"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-move-down",
    label: "Move the section down",
    chords: ["C-c Down"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-bold-region",
    label: "Bold",
    chords: ["C-c C-s b"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-italic-region",
    label: "Italic",
    chords: ["C-c C-s i"],
    group: "outline",
    owner: "editor",
  },
  {
    // Markdown mode's own insert-link is `C-c C-l`, which `publish-open`
    // already holds; this is Editor's own family, on the same terms as
    // `outline-previous-heading` above.
    id: "outline-insert-link",
    label: "Insert a link",
    chords: ["C-c l"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-insert-image",
    label: "Insert an image",
    chords: ["C-c C-i"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-switch-chapter",
    label: "Switch chapter by name",
    chords: ["C-x b"],
    group: "outline",
    owner: "editor",
  },
  {
    // Emacs's own close-chapter is `kill-buffer`, on `C-x k`, which
    // `toggle-key-log` already holds; `C-x C-k` sits beside it on the same
    // terms `open-file-or-folder` sits beside `C-x C-f` — the Control key
    // stays down from the `C-x`.
    id: "outline-close-chapter",
    label: "Close the chapter",
    chords: ["C-x C-k"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-narrow",
    label: "Narrow to this section",
    chords: ["C-x n n"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-widen",
    label: "Widen",
    chords: ["C-x n w"],
    group: "outline",
    owner: "editor",
  },
  {
    id: "outline-occur",
    label: "Occur: find in the document",
    chords: ["M-s o"],
    group: "outline",
    owner: "editor",
  },
  {
    // `C-M-%` on a US layout, written from the physical key as
    // `query-replace` already writes `M-%`.
    id: "query-replace-regex",
    label: "Replace with a regular expression",
    chords: ["C-M-S-5"],
    group: "outline",
    owner: "editor",
  },

  // The sidebar's own rows. Every chord here but one is carried by an
  // editor row as well; which one answers is decided by the pane that holds
  // the keyboard, never by the chord. See `scopeOf`. The exception is
  // `sidebar-hide`'s bare `h`: an unmodified letter is the editing
  // surface's own text and carries no row there, so it answers only inside
  // the sidebar's scope (itd-2609071216221686, map #36).
  {
    id: "sidebar-next-node",
    label: "Next node",
    chords: ["C-n", "Down"],
    group: "panes",
    owner: "sidebar",
  },
  {
    id: "sidebar-previous-node",
    label: "Previous node",
    chords: ["C-p", "Up"],
    group: "panes",
    owner: "sidebar",
  },
  {
    id: "sidebar-expand-node",
    label: "Expand the node",
    chords: ["C-f", "Right"],
    group: "panes",
    owner: "sidebar",
  },
  {
    id: "sidebar-collapse-node",
    label: "Collapse the node",
    chords: ["C-b", "Left"],
    group: "panes",
    owner: "sidebar",
  },
  {
    id: "sidebar-open-node",
    label: "Open the chapter here",
    chords: ["Return"],
    group: "panes",
    owner: "sidebar",
  },
  {
    // `h` hides the sidebar and hands the keyboard back to the editor,
    // unconditionally: unlike `sidebar-quit`, it closes the drawer even
    // when it was already open before the keyboard arrived. `C-x o` is the
    // route back in; it already opens a hidden sidebar on its way into it
    // (itd-2609071216221686, map #36, which refines map #30's vocabulary).
    id: "sidebar-hide",
    label: "Hide the sidebar",
    chords: ["h"],
    group: "panes",
    owner: "sidebar",
  },
  {
    id: "sidebar-quit",
    label: "Back to the editor",
    chords: ["C-g", "Escape"],
    group: "panes",
    owner: "sidebar",
  },
];

/**
 * The chords Editor takes off the keymaps rather than answering.
 *
 * A chord that opens a dead end is worse than one that does nothing: it looks
 * like a feature and is not. Each entry is cleared from the shared Emacs
 * binding map and filtered out of CodeMirror's own keymaps, so the key falls
 * through to the browser rather than reaching a command with nothing behind
 * it. Suppressing is the only alternative to a table row: the conformance
 * sweep fails a chord that is in neither list, and one that is in both.
 */
export interface Suppression {
  readonly chord: string;
  /** Which keymap it is taken out of. */
  readonly where: "keymap" | "codemirror" | "both";
  readonly why: string;
}

export const SUPPRESSED: readonly Suppression[] = [
  {
    chord: "M-;",
    where: "keymap",
    why: "comment toggling, which Markdown has no line form for",
  },
  {
    chord: "s-/",
    where: "codemirror",
    why: "the same comment toggle, from CodeMirror's own keymap",
  },
  {
    // Taken out of CodeMirror's keymap only: in the Emacs keymap `C-h` is the
    // first step of `C-h b`, and clearing it there would close the keys panel
    // off rather than free the key.
    //
    // The one chord that is both suppressed and listed, and it is each for a
    // different keymap. It is taken out of CodeMirror's so that
    // delete-backward cannot answer it, and it carries the `prefix-help` row
    // because the Emacs layer answers it after a prefix
    // (`itd-2609091722353594`). Every other entry here is a chord Editor
    // hands back to the browser; this one and `M-s` below are the two that
    // are not, and this one is the first that is also a row. The invariant
    // sweep in `emacs-keys.test.ts` names the exception and asserts it in
    // both directions rather than excusing it.
    chord: "C-h",
    where: "codemirror",
    why: "the describe-bindings prefix, and the prefix-help row after a prefix; Backspace deletes backward",
  },
  {
    // Not a chord Editor gives back to the browser, the way every other
    // entry here is: the package's own `M-s` (`centerSelection`) is retired
    // (`itd-2609061318091323`), and `outline-occur`'s `C-c…`-style row binds
    // the longer chain `M-s o` over it, which is what turns `M-s` into a
    // working prefix rather than a dead leaf. Clearing it here first is what
    // lets that longer chain win — see the ordering note in
    // `emacs.ts`'s `registerEditorChords`.
    chord: "M-s",
    where: "keymap",
    why: "centre-selection is retired; C-l's own recentre already covers it, and M-s becomes outline-occur's own prefix on M-s o",
  },
];

/** Whether a chord is suppressed rather than answered, anywhere. */
export function isSuppressed(chord: string): boolean {
  const wanted = canonicalChord(chord);
  return SUPPRESSED.some((entry) => canonicalChord(entry.chord) === wanted);
}

/** Whether a chord is suppressed in one particular keymap. */
export function isSuppressedIn(
  chord: string,
  where: "keymap" | "codemirror",
): boolean {
  const wanted = canonicalChord(chord);
  return SUPPRESSED.some(
    (entry) =>
      canonicalChord(entry.chord) === wanted &&
      (entry.where === where || entry.where === "both"),
  );
}

/** Look one binding up by id. */
export function bindingById(id: string): Binding | undefined {
  return BINDINGS.find((binding) => binding.id === id);
}

/** Keys whose event name is not the chord name. */
const KEY_NAMES: Readonly<Record<string, string>> = {
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
  " ": "Space",
  Escape: "Escape",
  Enter: "Return",
};

/**
 * Punctuation keys by their physical `code`.
 *
 * `event.key` reports the character the platform would produce, which Shift
 * changes: the key that carries `/` reports `?` once Shift is down, so a redo
 * pressed as Shift-Control-`/` would otherwise be read as `S-C-?` and match no
 * row in the table. The physical key does not move, so that is what the chord
 * is built from.
 */
const CODE_NAMES: Readonly<Record<string, string>> = {
  Slash: "/",
  Backslash: "\\",
  Minus: "-",
  Equal: "=",
  Comma: ",",
  Period: ".",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  BracketLeft: "[",
  BracketRight: "]",
  Space: "Space",
};

/**
 * The modifier prefixes, in the order a canonical chord writes them.
 *
 * The order is arbitrary but it has to be one order, or the same chord written
 * two ways — `S-C-/` in the table, `C-S-/` from an event — reads as two chords
 * and the key log's "not in table" verdict lies about a binding that works.
 */
const MODIFIER_ORDER = ["C-", "M-", "s-", "S-"] as const;

/** The modifiers and key name a chord step is made of. */
interface ChordStep {
  readonly modifiers: ReadonlySet<string>;
  readonly name: string;
}

/** Split one chord step, such as `S-C-/`, into its modifiers and its key. */
function parseStep(step: string): ChordStep {
  const modifiers = new Set<string>();
  let rest = step;
  for (;;) {
    const prefix = MODIFIER_ORDER.find(
      (modifier) => rest.startsWith(modifier) && rest.length > modifier.length,
    );
    if (!prefix) break;
    modifiers.add(prefix);
    rest = rest.slice(prefix.length);
  }
  return { modifiers, name: rest };
}

/** Write a chord step back out with its modifiers in canonical order. */
function formatStep(step: ChordStep): string {
  return (
    MODIFIER_ORDER.filter((modifier) => step.modifiers.has(modifier)).join("") +
    step.name
  );
}

/**
 * Rewrite a chord — single or multi-step — with its modifiers in one order.
 *
 * Apply it to both sides of any comparison: the table is written the way an
 * Emacs user would say a chord out loud, and an event arrives in whatever
 * order the browser's modifier flags happen to be read.
 */
export function canonicalChord(chord: string): string {
  return chord
    .split(" ")
    .map((step) => formatStep(parseStep(step)))
    .join(" ");
}

/**
 * Build a chord string from a keyboard event, in the table's notation.
 *
 * The chord is derived from the event rather than from a lookup table, so the
 * table stays data. Letters, digits, and punctuation are all reported by their
 * physical key so that Option-f reads as `M-f` and not as the character macOS
 * would otherwise insert, and Shift-`/` reads as `S-/` and not as `?`.
 *
 * The same rule is what makes the accent keys work. Option-e, Option-u,
 * Option-i, Option-n and Option-` are dead keys on macOS: the keydown carries
 * `key` of `"Dead"` because no character has been decided yet, and a real
 * `code`. Reading the code means such an event is the letter's chord, exactly
 * as if nothing were composing.
 */
export function chordFromEvent(event: KeyboardEvent): string {
  const modifiers = new Set<string>();
  if (event.ctrlKey) modifiers.add("C-");
  if (event.altKey) modifiers.add("M-");
  if (event.metaKey) modifiers.add("s-");
  if (event.shiftKey) modifiers.add("S-");

  let name: string;
  if (/^Key[A-Z]$/.test(event.code)) {
    name = event.code.slice(3).toLowerCase();
  } else if (/^Digit[0-9]$/.test(event.code)) {
    name = event.code.slice(5);
  } else {
    name =
      CODE_NAMES[event.code] ??
      KEY_NAMES[event.key] ??
      // A dead key that is not one of the named codes has no character to
      // fall back on, so the physical key is the only honest name for it.
      (event.key === "Dead" || event.key === "Unidentified"
        ? event.code
        : event.key);
  }
  // A modifier pressed on its own is not a chord; report the modifier itself
  // so the key log shows that the key reached the page.
  if (
    name === "Control" ||
    name === "Alt" ||
    name === "Meta" ||
    name === "Shift"
  ) {
    return formatStep({ modifiers, name: "" }) || name;
  }
  return formatStep({ modifiers, name });
}

/**
 * The character a key produces once Shift is down, and the key underneath it.
 *
 * The Emacs package writes a chord as the character — `M-@`, `M-%` — while
 * the table and `chordFromEvent` write the physical key, because that is what
 * a browser reports. A US layout is assumed, which is the layout the package's
 * own notation assumes.
 */
const SHIFTED_TO_KEY: Readonly<Record<string, string>> = {
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  _: "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
  "~": "`",
};

/** How every keymap's own modifier notation maps onto the table's. */
const SPEC_MODIFIERS: readonly (readonly [string, string])[] = [
  ["Ctrl-", "C-"],
  ["Control-", "C-"],
  ["C-", "C-"],
  ["Alt-", "M-"],
  ["Meta-", "M-"],
  ["M-", "M-"],
  ["Cmd-", "s-"],
  ["CMD-", "s-"],
  ["Mod-", "s-"],
  ["s-", "s-"],
  ["Shift-", "S-"],
  ["S-", "S-"],
];

/** How every keymap's own key names map onto the table's. */
const SPEC_NAMES: Readonly<Record<string, string>> = {
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
  Enter: "Return",
  Esc: "Escape",
  Ins: "Insert",
};

/**
 * Rewrite one chord from a keymap's own notation into the table's.
 *
 * `Mod-` is Command, because macOS is the platform Editor ships on. A single
 * upper-case letter means the shifted key, which is how CodeMirror writes it.
 */
export function fromKeymapSpec(spec: string): string {
  const step = (part: string): string => {
    const modifiers = new Set<string>();
    let rest = part;
    for (;;) {
      const found = SPEC_MODIFIERS.find(
        ([prefix]) => rest.startsWith(prefix) && rest.length > prefix.length,
      );
      if (!found) break;
      modifiers.add(found[1]);
      rest = rest.slice(found[0].length);
    }
    if (rest.length === 1 && rest >= "A" && rest <= "Z") {
      modifiers.add("S-");
      rest = rest.toLowerCase();
    }
    const unshifted = SHIFTED_TO_KEY[rest];
    if (unshifted !== undefined) {
      modifiers.add("S-");
      rest = unshifted;
    }
    rest = SPEC_NAMES[rest] ?? rest;
    return MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)).join("") + rest;
  };
  return spec.split(/\s+/).map(step).join(" ");
}

/** The shape of a CodeMirror key binding this module needs to read. */
export interface KeymapSpec {
  readonly key?: string | undefined;
  readonly mac?: string | undefined;
  readonly shift?: unknown;
}

/**
 * Every chord one of CodeMirror's own keymaps answers, in the table's
 * notation.
 *
 * The macOS spelling wins where a binding carries one, because that is the
 * platform the app ships on. A binding with a `shift` command answers the
 * Shift variant of the same key as well, so it counts as two chords.
 */
export function keymapChords(keymap: readonly KeymapSpec[]): readonly string[] {
  const chords: string[] = [];
  for (const binding of keymap) {
    const spec = binding.mac ?? binding.key;
    if (spec === undefined) continue;
    chords.push(fromKeymapSpec(spec));
    if (binding.shift) chords.push(fromKeymapSpec(`Shift-${spec}`));
  }
  return chords;
}

/**
 * The same keymap with every suppressed chord taken out.
 *
 * A binding is dropped when either spelling it carries names a suppressed
 * chord, so the suppression holds on whichever platform the page runs on.
 */
export function withoutSuppressed<T extends KeymapSpec>(
  keymap: readonly T[],
): T[] {
  return keymap.filter((binding) => {
    for (const spec of [binding.mac, binding.key]) {
      if (
        spec !== undefined &&
        isSuppressedIn(fromKeymapSpec(spec), "codemirror")
      ) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Which pane answers a row.
 *
 * Focus is single and exclusive, so the table has two scopes rather than one
 * flat list: the editing surface answers a chord while the cursor is in the
 * text, and the sidebar answers one while the tree holds the keyboard. The
 * invariant that no two rows share a chord is stated inside a scope, which is
 * what lets `C-n` be next line and next node without either being ambiguous.
 *
 * Two editor rows are answered by every pane, because neither is about the
 * pane it is pressed in: `other-window`, the chord that leaves a pane, and
 * `toggle-sidebar`, the chord that shows and hides the tree from wherever the
 * keyboard is (`itd-2609091722296239`). They are the rows whose scope is not
 * the whole story, and their chords collide with nothing in either scope.
 */
export type BindingScope = "editor" | "sidebar";

/** The scope a row answers in. */
export function scopeOf(binding: Binding): BindingScope {
  return binding.owner === "sidebar" ? "sidebar" : "editor";
}

/** Every chord of one scope, canonicalised, with the rows that claim it. */
export function chordIndexIn(scope: BindingScope): Map<string, Binding[]> {
  const index = new Map<string, Binding[]>();
  for (const binding of BINDINGS) {
    if (scopeOf(binding) !== scope) continue;
    for (const chord of binding.chords) {
      const key = canonicalChord(chord);
      const rows = index.get(key);
      if (rows) rows.push(binding);
      else index.set(key, [binding]);
    }
  }
  return index;
}

/** Every chord in the table, canonicalised, with the rows that claim it. */
export function chordIndex(): Map<string, Binding[]> {
  const index = new Map<string, Binding[]>();
  for (const binding of BINDINGS) {
    for (const chord of binding.chords) {
      const key = canonicalChord(chord);
      const rows = index.get(key);
      if (rows) rows.push(binding);
      else index.set(key, [binding]);
    }
  }
  return index;
}

/** How the table's modifier prefixes are spelled in a CodeMirror key. */
const KEYMAP_MODIFIERS: Readonly<Record<string, string>> = {
  "C-": "Ctrl-",
  "M-": "Alt-",
  "s-": "Mod-",
  "S-": "Shift-",
};

/** How the table's key names are spelled in a CodeMirror key. */
const KEYMAP_NAMES: Readonly<Record<string, string>> = {
  Left: "ArrowLeft",
  Right: "ArrowRight",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Return: "Enter",
};

/**
 * Rewrite one chord from the table's notation into CodeMirror's.
 *
 * Only single-step chords: CodeMirror has no prefix sequences, which is why
 * every prefix chord Editor answers goes through the Emacs handler instead.
 */
export function toKeymapSpec(chord: string): string {
  const step = parseStep(chord);
  const modifiers = MODIFIER_ORDER.filter((modifier) =>
    step.modifiers.has(modifier),
  )
    .map((modifier) => KEYMAP_MODIFIERS[modifier] ?? modifier)
    .join("");
  return modifiers + (KEYMAP_NAMES[step.name] ?? step.name);
}

/**
 * The reading views' own vocabulary (`itd-2609051402083398`, map #26).
 *
 * A reading view declares which rows of the table above it honours; it
 * invents no chord of its own (`spc-2609061318158216`'s own Design). Every id
 * here must already name a row in `BINDINGS` — `readingBindings` throws
 * rather than dropping a typo silently — and the order is the order the
 * article's own keys panel lists them in. `src/core/render/reading-keys.ts`
 * is what turns this into the JSON a plain script on the published site can
 * read, because that script cannot import this module at all.
 */
export const READING_BINDING_IDS: readonly string[] = [
  "outline-next-heading",
  "outline-previous-heading",
  "next-line",
  "previous-line",
  "outline-occur",
  "isearch-forward",
  "isearch-backward",
  "keyboard-quit",
  "keys-panel",
];

/**
 * The reading views' own bindings, resolved from `READING_BINDING_IDS`.
 *
 * Throwing on an id with no row is deliberate: a silent `.filter(Boolean)`
 * would make a typo here read as "one fewer honoured action" rather than the
 * broken reference it is.
 */
export function readingBindings(): Binding[] {
  return READING_BINDING_IDS.map((id) => {
    const binding = bindingById(id);
    if (binding === undefined) {
      throw new Error(`READING_BINDING_IDS names "${id}", which is not a row in BINDINGS`);
    }
    return binding;
  });
}
