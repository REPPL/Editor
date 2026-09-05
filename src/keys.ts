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
  | "app";

/** The grouping a binding appears under in the keys panel. */
export type BindingGroup =
  | "movement"
  | "selection"
  | "editing"
  | "mark"
  | "search"
  | "document"
  | "control";

/** The groups in the order the keys panel shows them. */
export const BINDING_GROUPS: readonly BindingGroup[] = [
  "movement",
  "selection",
  "editing",
  "mark",
  "search",
  "document",
  "control",
];

/** The human heading each group carries in the keys panel. */
export const GROUP_LABELS: Readonly<Record<BindingGroup, string>> = {
  movement: "Movement",
  selection: "Selection",
  editing: "Editing",
  mark: "Mark and kill ring",
  search: "Search",
  document: "Document",
  control: "Control",
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
    id: "upcase-region",
    label: "Upper-case the region",
    chords: ["C-x C-u", "C-x C-l"],
    group: "editing",
    owner: "keymap",
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
  {
    id: "center-selection",
    label: "Centre the selection",
    chords: ["M-s"],
    group: "movement",
    owner: "keymap",
  },
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
    id: "keys-panel",
    label: "Show the keys panel",
    chords: ["C-h b", "C-x S-/"],
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
    id: "toggle-sidebar",
    label: "Show or hide the sidebar",
    chords: ["C-x C-b"],
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
    id: "publish-open",
    label: "Publish this document",
    chords: ["C-c C-l"],
    group: "document",
    owner: "app",
  },
  {
    id: "open-settings",
    label: "Open settings",
    chords: ["C-c C-,"],
    group: "document",
    owner: "app",
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
    chord: "M-x",
    where: "keymap",
    why: "a command line with no commands behind it",
  },
  {
    chord: "M-/",
    where: "keymap",
    why: "completion with no source configured",
  },
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
    chord: "C-h",
    where: "codemirror",
    why: "the describe-bindings prefix; Backspace deletes backward",
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
    name = CODE_NAMES[event.code] ?? KEY_NAMES[event.key] ?? event.key;
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
