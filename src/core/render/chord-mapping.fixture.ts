/**
 * The event-to-chord mapping, proven twice.
 *
 * `spc-2609061318158216` (map #26) reimplements `src/keys.ts`'s
 * `chordFromEvent` inside `article-keys.js`, a plain script the published
 * site serves with no bundler and so cannot import that module from at all
 * (the intent's own Excluded-as-plumbing condition names the mapping itself
 * as out of this map's scope to redesign — only to reimplement faithfully).
 * This fixture is the one list both implementations are held against:
 * `src/emacs-keys.test.ts` and the rest of the editor's own suite already
 * exercise `chordFromEvent` on real keyboards; `article-keys.test.ts` drives
 * both `chordFromEvent` and the script's own copy over exactly these
 * descriptors and asserts the two never disagree.
 */

/** One keyboard event, described plainly enough to build a real one from. */
export interface ChordFixtureEvent {
  readonly description: string;
  readonly code: string;
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  /** The chord both implementations must produce. */
  readonly expected: string;
}

export const CHORD_MAPPING_FIXTURE: readonly ChordFixtureEvent[] = [
  {
    description: "a bare letter, read from the physical key",
    code: "KeyN",
    key: "n",
    expected: "n",
  },
  {
    description: "Control plus a letter",
    code: "KeyN",
    key: "n",
    ctrlKey: true,
    expected: "C-n",
  },
  {
    description: "Control plus a letter the table writes lower-case",
    code: "KeyP",
    key: "p",
    ctrlKey: true,
    expected: "C-p",
  },
  {
    description: "a two-step prefix's first step, Control-c",
    code: "KeyC",
    key: "c",
    ctrlKey: true,
    expected: "C-c",
  },
  {
    description: "a two-step prefix's second step, a bare letter",
    code: "KeyN",
    key: "n",
    expected: "n",
  },
  {
    description: "Control-h, the keys-panel prefix",
    code: "KeyH",
    key: "h",
    ctrlKey: true,
    expected: "C-h",
  },
  {
    description: "a digit key",
    code: "Digit0",
    key: "0",
    expected: "0",
  },
  {
    description: "an arrow key, renamed from the DOM's Arrow* spelling",
    code: "ArrowDown",
    key: "ArrowDown",
    expected: "Down",
  },
  {
    description: "the other arrow key movement reads",
    code: "ArrowUp",
    key: "ArrowUp",
    expected: "Up",
  },
  {
    description: "Escape, spelled the same both ways",
    code: "Escape",
    key: "Escape",
    expected: "Escape",
  },
  {
    description: "Control-g, the cancel chord's other half",
    code: "KeyG",
    key: "g",
    ctrlKey: true,
    expected: "C-g",
  },
  {
    description: "Control-s, search forward",
    code: "KeyS",
    key: "s",
    ctrlKey: true,
    expected: "C-s",
  },
  {
    description: "Control-r, search backward",
    code: "KeyR",
    key: "r",
    ctrlKey: true,
    expected: "C-r",
  },
  {
    description: "Shift plus a punctuation key, read from the physical key",
    code: "Slash",
    key: "?",
    shiftKey: true,
    expected: "S-/",
  },
  {
    description: "Control-x, the keys-panel row's other prefix",
    code: "KeyX",
    key: "x",
    ctrlKey: true,
    expected: "C-x",
  },
  {
    description: "Option (Meta) composing a dead key on macOS",
    code: "KeyE",
    key: "Dead",
    altKey: true,
    expected: "M-e",
  },
  {
    description: "Meta plus a letter, ordinary case",
    code: "KeyS",
    key: "s",
    altKey: true,
    expected: "M-s",
  },
  {
    description: "Command (Super) plus a letter",
    code: "KeyF",
    key: "f",
    metaKey: true,
    expected: "s-f",
  },
  {
    description: "every modifier the table names, in canonical order",
    code: "KeyZ",
    key: "z",
    ctrlKey: true,
    altKey: true,
    metaKey: true,
    shiftKey: true,
    expected: "C-M-s-S-z",
  },
];
