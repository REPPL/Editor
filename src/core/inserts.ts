/**
 * The canonical form of every construct, as data.
 *
 * `05-internals.md` section 3 writes each construct in one of exactly five
 * permitted forms — a fenced div with attributes, a heading attribute, an
 * image attribute, a bracketed span attribute, or an HTML comment — plus
 * Pandoc's own citations and footnotes, which are not extensions at all. This
 * module is that set, written once: the insert palette, the drop gesture and
 * the deck's own commands all read it, so a construct's spelling has one
 * implementation and a plain tool reads past every one of them.
 *
 * Sixteen rows for the press release's fourteen constructs: the horizontal
 * rule is an entry of its own, and the easter egg is written in two places, so
 * the canon spells both.
 *
 * Each row names its row in `canon.ts`, and takes its phase from there: the
 * placement table decides when a construct is seeded, and a form that carried
 * its own number would be a second copy of that decision. A row above the
 * current phase carries its form and its tests from the day it is written, so
 * a later phase changes nothing here at all.
 */

import { rowById } from "./canon";
import type { BlockKind, InlineKind } from "./tree";

/** How a form reaches the buffer. */
export type InsertShape = "block" | "inline" | "heading-attribute";

/** The node a form must parse to, which is how a test holds it to the canon. */
export interface InsertExpectation {
  readonly kind: "block" | "inline";
  readonly nodeKind: BlockKind | InlineKind;
  readonly classes: readonly string[];
  readonly pairs: Readonly<Record<string, string>>;
  readonly id?: string;
  readonly children?: readonly InsertExpectation[];
}

/** One construct, ready to insert. */
export interface InsertForm {
  readonly id: string;
  readonly label: string;
  /** What the palette's filter matches, besides the label. */
  readonly keywords: readonly string[];
  /** The exact text to insert, with no cursor marker in it. */
  readonly text: string;
  /** Where the cursor lands: an offset into `text`, in code units. */
  readonly cursor: number;
  /**
   * The construct as section 3 writes it. The same as `text` for every row but
   * the divider, whose form is an attribute appended to a heading the author
   * already has.
   */
  readonly canonical: string;
  readonly shape: InsertShape;
  readonly expects: InsertExpectation;
  /**
   * The phase in which the palette offers the row.
   *
   * Read from the canon's own row for the construct, never written here: the
   * placement table is the one place a construct's phase is decided, and two
   * copies of a number drift.
   */
  readonly visibleFrom: number;
}

/** The cursor marker used in this file, and stripped from every form. */
const CURSOR = "▮";

/** A row before its marker is taken out. */
interface Draft {
  readonly id: string;
  readonly label: string;
  readonly keywords: readonly string[];
  /** The form with exactly one cursor marker, or none for a form with no body. */
  readonly form: string;
  readonly canonical?: string;
  readonly shape: InsertShape;
  readonly expects: InsertExpectation;
  /** The id of the construct's row in `canon.ts`, which decides its phase. */
  readonly canon: string;
}

/**
 * The sixteen forms, quoted from `05-internals.md` section 3.
 *
 * Three are deliberate reductions of a fuller form the brief writes, each
 * recorded in `spc-2609051353398011`: the video block omits `poster` and
 * `caption` and names one source; the citation writes the plain key form; the
 * footnote writes the inline form.
 */
const DRAFTS: readonly Draft[] = [
  {
    id: "slide-split",
    label: "Slide split",
    keywords: ["rule", "break", "split", "slide", "horizontal"],
    // The blank line below matters as much as the rule itself: `---` with
    // prose on the very next line is still a rule, but the rule is what a
    // *slide split* is, and a split with the next slide's first sentence
    // glued to it reads as one block. The blank line above is the palette's
    // to supply, not the form's — a form beginning with a newline could not
    // also be "exactly as the canon writes it" on an empty line.
    form: "---\n\n",
    shape: "block",
    expects: { kind: "block", nodeKind: "rule", classes: [], pairs: {} },
    canon: "rule",
  },
  {
    id: "divider",
    label: "Divider heading",
    keywords: ["divider", "section", "break", "interlude"],
    form: " {.divider}",
    canonical: "## Interlude {.divider}",
    shape: "heading-attribute",
    expects: {
      kind: "block",
      nodeKind: "heading",
      classes: ["divider"],
      pairs: {},
    },
    canon: "divider",
  },
  {
    id: "columns",
    label: "Columns",
    keywords: ["columns", "column", "side", "two", "beside"],
    form:
      '::: {.columns}\n::: {.column width="50%"}\n▮\n:::\n::: {.column width="50%"}\n\n:::\n:::\n',
    shape: "block",
    expects: {
      kind: "block",
      nodeKind: "div",
      classes: ["columns"],
      pairs: {},
      children: [
        {
          kind: "block",
          nodeKind: "div",
          classes: ["column"],
          pairs: { width: "50%" },
        },
        {
          kind: "block",
          nodeKind: "div",
          classes: ["column"],
          pairs: { width: "50%" },
        },
      ],
    },
    canon: "columns",
  },
  {
    id: "speaker-notes",
    label: "Speaker notes",
    keywords: ["notes", "speaker", "presenter", "script"],
    form: "::: {.notes}\n▮\n:::\n",
    shape: "block",
    expects: { kind: "block", nodeKind: "div", classes: ["notes"], pairs: {} },
    canon: "notes",
  },
  {
    id: "credit",
    label: "Source credit",
    keywords: ["credit", "source", "photograph", "attribution"],
    form: "::: {.credit}\n▮\n:::\n",
    shape: "block",
    expects: { kind: "block", nodeKind: "div", classes: ["credit"], pairs: {} },
    canon: "credit",
  },
  {
    id: "page-break",
    label: "Page break",
    keywords: ["page", "break", "pdf", "print"],
    // The blank line makes it a block comment. Without it markdown-it reads
    // the comment as inline HTML inside whatever paragraph follows — or, with
    // a single newline, swallows that paragraph into the comment's own HTML
    // block. The canon's `<!-- pagebreak -->` is a block of its own.
    form: "<!-- pagebreak -->\n\n▮",
    shape: "block",
    expects: { kind: "block", nodeKind: "comment", classes: [], pairs: {} },
    canon: "pagebreak",
  },
  {
    id: "callout",
    label: "Callout",
    keywords: ["callout", "warning", "note", "box", "aside"],
    form: '::: {.callout kind="warning"}\n▮\n:::\n',
    shape: "block",
    expects: {
      kind: "block",
      nodeKind: "div",
      classes: ["callout"],
      pairs: { kind: "warning" },
    },
    canon: "callout",
  },
  {
    id: "margin-aside",
    label: "Margin aside",
    keywords: ["margin", "aside", "remark", "sidenote"],
    form: "[▮]{.margin}",
    shape: "inline",
    expects: { kind: "inline", nodeKind: "span", classes: ["margin"], pairs: {} },
    canon: "margin",
  },
  {
    id: "variant-block",
    label: "Variant block (name it yourself)",
    keywords: ["variant", "audience", "talk", "full", "block"],
    form: '::: {.variant variant=""}\n▮\n:::\n',
    shape: "block",
    expects: {
      kind: "block",
      nodeKind: "div",
      classes: ["variant"],
      pairs: { variant: "" },
    },
    canon: "variant",
  },
  {
    id: "variant-span",
    label: "Variant span (name it yourself)",
    keywords: ["variant", "audience", "inline", "span"],
    form: '[▮]{.variant variant=""}',
    shape: "inline",
    expects: {
      kind: "inline",
      nodeKind: "span",
      classes: ["variant"],
      pairs: { variant: "" },
    },
    canon: "variant",
  },
  {
    id: "video",
    label: "Video block",
    keywords: ["video", "film", "player", "media", "local"],
    form: "::: {.video}\n- local: ▮\n:::\n",
    shape: "block",
    expects: { kind: "block", nodeKind: "div", classes: ["video"], pairs: {} },
    canon: "video",
  },
  {
    id: "citation",
    label: "Citation",
    keywords: ["citation", "cite", "reference", "bibliography", "key"],
    form: "[@▮]",
    shape: "inline",
    expects: { kind: "inline", nodeKind: "citation", classes: [], pairs: {} },
    canon: "citation",
  },
  {
    id: "footnote",
    label: "Footnote",
    keywords: ["footnote", "note", "inline"],
    form: "^[▮]",
    shape: "inline",
    expects: {
      kind: "inline",
      nodeKind: "footnote-inline",
      classes: [],
      pairs: {},
    },
    canon: "footnote",
  },
  {
    id: "egg-marker",
    label: "Easter egg marker (name it yourself)",
    keywords: ["egg", "easter", "marker", "hidden"],
    form: '[✦]{.egg egg="▮"}',
    shape: "inline",
    expects: {
      kind: "inline",
      nodeKind: "span",
      classes: ["egg"],
      pairs: { egg: "" },
    },
    canon: "egg",
  },
  {
    id: "egg-block",
    label: "Easter egg block (name it yourself)",
    keywords: ["egg", "easter", "block", "hidden", "reveal"],
    form: '::: {.egg #▮ label="✦"}\n\n:::\n',
    shape: "block",
    expects: {
      kind: "block",
      nodeKind: "div",
      classes: ["egg"],
      pairs: { label: "✦" },
    },
    canon: "egg",
  },
  {
    id: "opening",
    label: "Opening quotation",
    keywords: ["opening", "quotation", "epigraph", "once"],
    form: '::: {.opening once="per-browser"}\n> ▮\n:::\n',
    shape: "block",
    expects: {
      kind: "block",
      nodeKind: "div",
      classes: ["opening"],
      pairs: { once: "per-browser" },
    },
    canon: "opening",
  },
];

/** Take the marker out of a draft and record where it was. */
function finish(draft: Draft): InsertForm {
  const marker = draft.form.indexOf(CURSOR);
  const text =
    marker === -1 ? draft.form : draft.form.replace(CURSOR, "");
  return {
    id: draft.id,
    label: draft.label,
    keywords: draft.keywords,
    text,
    cursor: marker === -1 ? text.length : marker,
    canonical: draft.canonical ?? text,
    shape: draft.shape,
    expects: draft.expects,
    visibleFrom: phaseOf(draft.canon),
  };
}

/**
 * The phase the canon seeds a construct in.
 *
 * A draft naming a row the table does not carry is a programming error, and
 * one that would quietly hide the form for ever; it is loud instead.
 */
function phaseOf(canonId: string): number {
  const row = rowById(canonId);
  if (row === undefined) {
    throw new Error(`inserts: no canon row named ${canonId}`);
  }
  return row.phase;
}

/** Every form, in the order the palette lists them. */
export const INSERT_FORMS: readonly InsertForm[] = DRAFTS.map(finish);

/** One form by id. */
export function formById(id: string): InsertForm | undefined {
  return INSERT_FORMS.find((form) => form.id === id);
}

/** The forms the palette offers in a phase. */
export function formsVisibleIn(phase: number): readonly InsertForm[] {
  return INSERT_FORMS.filter((form) => form.visibleFrom <= phase);
}

/**
 * The forms a query matches, best first.
 *
 * A prefix of the label or of a keyword ranks above a substring anywhere, so
 * "col" reaches Columns before Callout.
 */
export function matchForms(
  query: string,
  forms: readonly InsertForm[] = INSERT_FORMS,
): readonly InsertForm[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return forms;
  const scored: { form: InsertForm; score: number }[] = [];
  for (const form of forms) {
    const label = form.label.toLowerCase();
    const words = [label, ...form.keywords.map((word) => word.toLowerCase())];
    if (words.some((word) => word.startsWith(needle))) {
      scored.push({ form, score: label.startsWith(needle) ? 0 : 1 });
    } else if (words.some((word) => word.includes(needle))) {
      scored.push({ form, score: 2 });
    }
  }
  return scored
    .sort((a, b) => a.score - b.score || INSERT_FORMS.indexOf(a.form) - INSERT_FORMS.indexOf(b.form))
    .map((entry) => entry.form);
}
