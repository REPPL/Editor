/**
 * Citation completion and hover, from the bibliography beside the document.
 *
 * "She types an opening bracket and an at sign, and the editor completes the
 * key from that file as she types. Hovering a completed key shows the
 * matching reference without taking her out of the sentence"
 * (itd-2609051335502171's press release).
 *
 * Both pieces are built on `@codemirror/view`'s own tooltip machinery —
 * `showTooltip` for the completion list, `hoverTooltip` for the resting
 * reference — which is already a direct dependency (`package.json`). The
 * completion list is deliberately not `src/overlay.ts`'s list overlay: that
 * contract holds the keyboard while it is open, which is right for a panel
 * Alice opens and closes, but wrong here, where she keeps typing letters into
 * the document while the list narrows beneath her. `@codemirror/autocomplete`
 * is not a dependency — `package.json` lists only the packages above it, and
 * the copy in `node_modules` is a transitive one dragged in by
 * `@replit/codemirror-emacs` — so no dependency is added; this reimplements
 * the one behaviour this intent needs directly on the view.
 */

import { StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import {
  hoverTooltip,
  keymap,
  showTooltip,
  type EditorView,
  type KeyBinding,
  type Tooltip,
} from "@codemirror/view";

import {
  authorsOf,
  formatAuthorList,
  EMPTY_BIBLIOGRAPHY,
  type BibEntry,
  type Bibliography,
} from "./core/bibliography";

// ------------------------------------------------------- the trigger, as text

/** A citation key's own shape, Pandoc's: `05-internals.md` section 3. */
const KEY_CHARACTERS = /^[\w:.#$%&+?<>~/-]*$/;

/** An unterminated `[@` immediately before the cursor, and what follows it. */
export interface CitationTrigger {
  /** Where the partial key begins, just after `[@`. */
  readonly from: number;
  /** What has been typed of the key so far. */
  readonly prefix: string;
}

/**
 * Whether `column` sits right after an unterminated `[@key…` on `lineText`,
 * and what has been typed of the key so far.
 *
 * One line only, because a citation is never written across a line break —
 * a search that crossed one would risk answering to an unrelated `[@` two
 * paragraphs up on a line that holds none of its own. The most recent literal
 * `[@` before the cursor is the one in force, so a second citation started
 * after an earlier, closed one completes against the second. Only the bare
 * `[@key` and `[@key, locator` forms trigger completion — the press release's
 * own words, "she types an opening bracket and an at sign" — not Pandoc's
 * `[see @key]`, which [`completedCitationAt`] still reads once it is closed.
 */
export function citationTriggerAt(lineText: string, column: number): CitationTrigger | null {
  const before = lineText.slice(0, column);
  const openAt = before.lastIndexOf("[@");
  if (openAt === -1) return null;
  const between = before.slice(openAt + 2);
  // A closing bracket, a space starting the locator, or anything else the
  // key's own shape does not allow means this `[@` is no longer open.
  if (!KEY_CHARACTERS.test(between)) return null;
  return { from: openAt + 2, prefix: between };
}

/** Every key in `bibliography` beginning with `prefix`, file order, case-insensitive. */
export function citationCandidates(
  bibliography: Bibliography,
  prefix: string,
): readonly string[] {
  const needle = prefix.toLowerCase();
  const candidates: string[] = [];
  for (const key of bibliography.entries.keys()) {
    if (key.toLowerCase().startsWith(needle)) candidates.push(key);
  }
  return candidates;
}

// -------------------------------------------------- a completed citation, hovered

/** A citation as written and closed, and the keys inside it. */
export interface CompletedCitation {
  readonly from: number;
  readonly to: number;
  readonly keys: readonly string[];
}

/** Every key in a bracketed citation — the same shape `markdown.ts`'s own rule reads. */
const KEY_IN_CITATION = /@([A-Za-z\d_][\w:.#$%&+?<>~/-]*[A-Za-z\d_]|[A-Za-z\d_])/g;

/**
 * A `[@key]` or `[@key, locator]` span on `lineText`.
 *
 * The capture starts at the `@`, not after it, so a citation naming more
 * than one key — `[@a; @b]` — keeps the first key's own `@` inside the
 * captured text for [`KEY_IN_CITATION`] to find alongside the rest.
 */
const CITATION_SPAN = /\[(@[^[\]]*)\]/g;

/**
 * The completed citation `column` rests inside, if any.
 *
 * "Completed" means closed with `]`: a citation still being typed is what
 * [`citationTriggerAt`] answers instead, and the two never both match one
 * position, because a `[@` with no `]` yet is exactly what makes this
 * pattern not match at all.
 */
export function completedCitationAt(lineText: string, column: number): CompletedCitation | null {
  CITATION_SPAN.lastIndex = 0;
  for (let match = CITATION_SPAN.exec(lineText); match !== null; match = CITATION_SPAN.exec(lineText)) {
    const from = match.index;
    const to = from + match[0].length;
    if (column < from || column > to) continue;
    const keys: string[] = [];
    KEY_IN_CITATION.lastIndex = 0;
    const inner = match[1] ?? "";
    for (
      let keyMatch = KEY_IN_CITATION.exec(inner);
      keyMatch !== null;
      keyMatch = KEY_IN_CITATION.exec(inner)
    ) {
      if (keyMatch[1] !== undefined) keys.push(keyMatch[1]);
    }
    if (keys.length > 0) return { from, to, keys };
  }
  return null;
}

/** One line, plainly: "Author, Author and Author. Year. Title." — no container, no locator. */
function summaryLine(entry: BibEntry): string {
  const authors = formatAuthorList(authorsOf(entry));
  const year = entry.fields["year"] ?? "";
  const title = entry.fields["title"] ?? "";
  const parts = [authors, year, title].filter((part) => part !== "");
  return parts.length === 0 ? entry.key : `${parts.join(". ")}.`;
}

/**
 * What hovering a completed citation shows: one line per key that resolves,
 * author, title and date — or nothing when none of its keys resolve, which
 * leaves the hover silent rather than telling Alice what she already sees in
 * the sidebar.
 */
export function citationHoverSummary(
  bibliography: Bibliography,
  keys: readonly string[],
): readonly string[] {
  const lines: string[] = [];
  for (const key of keys) {
    const entry = bibliography.entries.get(key);
    if (entry !== undefined) lines.push(summaryLine(entry));
  }
  return lines;
}

// ------------------------------------------------------- the editor extension

/** Tell an editor which bibliography `[@` completes and hovers against. */
export const setBibliographyEffect = StateEffect.define<Bibliography>();

/** The bibliography the extensions below read from the view's own state. */
export const bibliographyField = StateField.define<Bibliography>({
  create: () => EMPTY_BIBLIOGRAPHY,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setBibliographyEffect)) return effect.value;
    }
    return value;
  },
});

/**
 * Set the bibliography an already-mounted editor completes and hovers
 * against — called whenever the document (and so its `document.yaml` and its
 * bibliography file) changes, the same moment the sidebar's own facts are
 * recomputed.
 */
export function setBibliography(view: EditorView, bibliography: Bibliography): void {
  view.dispatch({ effects: setBibliographyEffect.of(bibliography) });
}

/** The class every row of the completion list carries. */
const ROW_CLASS = "cm-citation-completion-row";

/** The completion list for the trigger in force, or nothing. */
function completionTooltips(state: EditorState): readonly Tooltip[] {
  if (!state.selection.main.empty) return [];
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  const trigger = citationTriggerAt(line.text, head - line.from);
  if (trigger === null) return [];
  const bibliography = state.field(bibliographyField);
  const candidates = citationCandidates(bibliography, trigger.prefix);
  if (candidates.length === 0) return [];
  const pos = line.from + trigger.from;
  return [
    {
      pos,
      above: false,
      strictSide: true,
      create: (view) => {
        const dom = document.createElement("ul");
        dom.className = "cm-citation-completion";
        for (const key of candidates) {
          const row = document.createElement("li");
          row.className = ROW_CLASS;
          row.textContent = key;
          row.dataset["key"] = key;
          row.addEventListener("mousedown", (event) => {
            // A `mousedown` beats the field losing focus, exactly as a
            // completion popup's own row does in every editor that has one.
            event.preventDefault();
            acceptCitationCompletion(view, key);
          });
          dom.append(row);
        }
        return { dom };
      },
    },
  ];
}

/** The completion list, as a tooltip recomputed after every transaction. */
export const citationCompletionField = StateField.define<readonly Tooltip[]>({
  create: (state) => completionTooltips(state),
  update(tooltips, transaction) {
    if (!transaction.docChanged && !transaction.selection && transaction.effects.length === 0) {
      return tooltips;
    }
    return completionTooltips(transaction.state);
  },
  provide: (field) => showTooltip.computeN([field], (state) => state.field(field)),
});

/** Replace the trigger's typed prefix with `key`, cursor after it. */
function acceptCitationCompletion(view: EditorView, key: string): boolean {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const trigger = citationTriggerAt(line.text, head - line.from);
  if (trigger === null) return false;
  const from = line.from + trigger.from;
  view.dispatch({
    changes: { from, to: head, insert: key },
    selection: { anchor: from + key.length },
  });
  view.focus();
  return true;
}

/**
 * Accept the completion in force: the first candidate, in the order the
 * bibliography file lists them.
 *
 * Bound to `Tab` — see [`citationCompletionKeymap`] — and declines when
 * nothing is showing, so an ordinary `Tab` reaches whatever it would
 * otherwise, and this never claims the chord for itself.
 */
function acceptFirstCandidate(view: EditorView): boolean {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const trigger = citationTriggerAt(line.text, head - line.from);
  if (trigger === null) return false;
  const candidates = citationCandidates(view.state.field(bibliographyField), trigger.prefix);
  const first = candidates[0];
  if (first === undefined) return false;
  return acceptCitationCompletion(view, first);
}

/**
 * `Tab` accepts the completion in force; every other chord is untouched.
 *
 * `Prec.highest` in `editor.ts`, above the Emacs keymap: a `Tab` that would
 * otherwise indent or do nothing must reach the citation list first, and a
 * `Tab` with no list showing declines and falls through exactly as before.
 */
export const citationCompletionKeymap: readonly KeyBinding[] = [
  { key: "Tab", run: acceptFirstCandidate },
];

/**
 * Resting on a completed citation shows its resolved entries, in place.
 *
 * `hoverTooltip`'s own debounce is the "resting" itself: it fires only once
 * the pointer has stopped moving over the position, which is the same
 * behaviour CodeMirror's own hover machinery gives every other tooltip in
 * this editor, so this asks for no new debounce logic of its own.
 */
export const citationHoverTooltip = hoverTooltip((view, pos) => {
  const line = view.state.doc.lineAt(pos);
  const citation = completedCitationAt(line.text, pos - line.from);
  if (citation === null) return null;
  const summary = citationHoverSummary(view.state.field(bibliographyField), citation.keys);
  if (summary.length === 0) return null;
  return {
    pos: line.from + citation.from,
    end: line.from + citation.to,
    above: true,
    create: () => {
      const dom = document.createElement("div");
      dom.className = "cm-citation-hover";
      for (const text of summary) {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        dom.append(paragraph);
      }
      return { dom };
    },
  };
});

/** Every extension the editing surface needs for citation completion and hover. */
export function citationExtensions(): Extension {
  return [
    bibliographyField,
    citationCompletionField,
    citationHoverTooltip,
    keymap.of(citationCompletionKeymap),
  ];
}
