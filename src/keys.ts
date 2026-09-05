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
  /** Shipped by the CodeMirror Emacs keymap. */
  | "keymap"
  /** Added by Editor on top of the keymap. */
  | "editor"
  /** Claimed by the Tauri menu before the web view sees it. */
  | "shell";

/** The grouping a binding appears under in the keys panel. */
export type BindingGroup =
  | "movement"
  | "editing"
  | "mark"
  | "search"
  | "document"
  | "control";

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
    chords: ["M-f", "C-Right"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "backward-word",
    label: "Backward word",
    chords: ["M-b", "C-Left"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "beginning-of-line",
    label: "Beginning of line",
    chords: ["C-a", "Home"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "end-of-line",
    label: "End of line",
    chords: ["C-e", "End"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "beginning-of-buffer",
    label: "Beginning of document",
    chords: ["C-Home"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "end-of-buffer",
    label: "End of document",
    chords: ["C-End"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "scroll-up",
    label: "Page down",
    chords: ["C-v", "PageDown"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "scroll-down",
    label: "Page up",
    chords: ["M-v", "PageUp"],
    group: "movement",
    owner: "keymap",
  },
  {
    id: "goto-line",
    label: "Go to line",
    chords: ["M-g"],
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
    chords: ["M-d"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "backward-kill-word",
    label: "Kill word backward",
    chords: ["M-Backspace", "C-Backspace"],
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
    chords: ["C-/", "C-x u"],
    group: "editing",
    owner: "keymap",
  },
  {
    id: "redo",
    label: "Redo",
    chords: ["S-C-/"],
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
    chords: ["C-w"],
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
    chords: ["C-y"],
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
    id: "select-all",
    label: "Select the whole document",
    chords: ["C-x h"],
    group: "mark",
    owner: "keymap",
  },

  // Search
  {
    id: "isearch-forward",
    label: "Search forward",
    chords: ["C-s"],
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
    chords: ["M-C-s"],
    group: "search",
    owner: "editor",
  },
  {
    id: "find-previous",
    label: "Previous match",
    chords: ["M-C-r"],
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
];

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
