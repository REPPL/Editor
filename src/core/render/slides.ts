/**
 * The slide plan as reveal.js markup.
 *
 * One fragment renderer, two envelopes. `renderSlides` emits what reveal.js
 * expects and nothing else — a `<section>` per column, nested `<section>`s for
 * the vertical slides, an `<aside class="notes">` per slide, the foot line
 * under the face — with no `<html>`, no engine and no style around it. The app
 * mounts that fragment in a page that already carries the engine from the
 * bundle; `deckDocument` wraps it for a host that has to be given one. So no
 * host holds a copy of a rule.
 *
 * The engine is vendored, never fetched: `src/vendor/reveal/`, copied beside
 * every deck that is written. The deck runs from disk, and the app touches the
 * network only on publish.
 */

import { pathResolver, type Resolver } from "../assets";
import { placementOf } from "../canon";
import type { DeckPlan, FootLine, Slide } from "../deck";
import type { Block } from "../tree";
import {
  attributes,
  classAttribute,
  escapeAttribute,
  escapeText,
  renderCommonBlock,
  renderFigure,
  renderInlines,
  renderVideo,
  type RenderContext,
} from "./html";

import stylesheet from "./slides.css?inline";

/** Editor's own layout over the engine, as text a build can write out. */
export const DECK_STYLESHEET: string = stylesheet;

/**
 * The engine's files, relative to `src/vendor/reveal/`, that a deck needs.
 *
 * The build copies exactly these beside the deck it writes. The theme is not
 * among them: `DECK_STYLESHEET` is the deck's appearance, and reveal's own
 * theme would fight the fluid layout by fixing a font size.
 */
export const DECK_ENGINE_FILES: readonly string[] = [
  "reset.css",
  "reveal.css",
  "reveal.js",
  "plugin/notes/notes.js",
  "LICENSE",
];

/**
 * The one reveal.js configuration, read by the app and by the site alike.
 *
 * `disableLayout` is the whole legibility argument in one flag: the engine
 * moves between slides and this deck's own stylesheet lays them out, so a
 * slide reflows to the reader's width instead of being scaled to fit. Keyboard,
 * touch and the on-screen controls are all on, because the criterion is that
 * none of the three is offered without working.
 */
export const DECK_CONFIG = {
  disableLayout: true,
  controls: true,
  controlsTutorial: false,
  progress: true,
  touch: true,
  keyboard: true,
  overview: true,
  hash: true,
  center: false,
  transition: "none",
  // Nothing about a reader is stored, so the engine's own history is off.
  history: false,
} as const;

/** How a slide's kind reaches the stylesheet. */
const KIND_CLASS: Readonly<Record<Slide["kind"], string>> = {
  title: "slide-title",
  section: "slide-section",
  subsection: "slide-subsection",
  divider: "slide-divider",
  image: "slide-image",
  continuation: "slide-continuation",
};

/** The heading tag a slide's headline is written with. */
function headlineTag(slide: Slide): string {
  if (slide.level === null) return "h2";
  return `h${String(Math.min(Math.max(slide.level, 1), 6))}`;
}

/** The context every slide is rendered in. */
function contextFor(resolve: Resolver): RenderContext {
  return { resolve, rendering: "slides" };
}

/** The declared track sizes of a columns div, or null when it declares none. */
function trackSizes(block: Block): string | null {
  const widths = block.children
    .filter((child) => child.attributes.classes.includes("column"))
    .map((child) => child.attributes.pairs["width"] ?? "");
  if (widths.length === 0) return null;
  // A column with no declared width takes an equal share of what is left.
  return widths.map((width) => (width === "" ? "1fr" : width)).join(" ");
}

/**
 * A columns div: a grid whose tracks are the widths the author declared.
 *
 * The tracks arrive as a custom property rather than as a computed
 * `grid-template-columns`, so the stylesheet's phone rule replaces them
 * without an `!important` and the columns stack in source order.
 */
function renderColumns(block: Block, context: RenderContext): string {
  const tracks = trackSizes(block);
  const columns = block.children
    .map((child) =>
      child.attributes.classes.includes("column")
        ? `<div class="column">${renderFlow(child.children, context)}</div>`
        : renderFlow([child], context),
    )
    .join("");
  return `<div${classAttribute(["columns", ...block.attributes.classes.filter((name) => name !== "columns")])}${attributes(
    [["style", tracks === null ? null : `--column-tracks: ${tracks}`]],
  )}>${columns}</div>`;
}

/** An unrecognised div: its classes on the wrapper, its children in flow. */
function renderDiv(block: Block, context: RenderContext): string {
  if (block.video !== undefined) return renderVideo(block, context);
  return `<div${attributes([["id", block.attributes.id]])}${classAttribute(
    block.attributes.classes,
  )}>${renderFlow(block.children, context)}</div>`;
}

/** Render a run of blocks wherever they sit on a slide. */
function renderFlow(blocks: readonly Block[], context: RenderContext): string {
  return blocks
    .map((block) => {
      switch (placementOf(block, "slides")) {
        case "columns":
          return renderColumns(block, context);
        case "honoured":
          return renderFigure(block, context, ["full-bleed"]);
        case "ignored":
        case "absent":
          return "";
        default:
          break;
      }
      if (block.kind === "heading") {
        const level = Math.min(Math.max(block.level ?? 2, 1), 6);
        return `<h${String(level)}${classAttribute(block.attributes.classes)}>${renderInlines(
          block.inlines,
          context,
        )}</h${String(level)}>`;
      }
      if (block.kind === "div") return renderDiv(block, context);
      if (block.kind === "rule") return "<hr />";
      if (block.kind === "image") return renderFigure(block, context, ["full-bleed"]);
      return renderCommonBlock(block, context, renderFlow) ?? "";
    })
    .join("");
}

/** One line at the foot of a slide, as a line rather than as body text. */
function renderFoot(lines: readonly FootLine[], context: RenderContext): string {
  if (lines.length === 0) return "";
  const rendered = lines
    .map((line) => {
      if (line.kind === "footnote") {
        const label =
          line.label === null || line.label === ""
            ? ""
            : `<span class="label">${escapeText(line.label)}</span>`;
        const body =
          line.blocks.length > 0 ? oneLine(line.blocks, context) : renderInlines(line.inlines, context);
        return `<p class="footnote">${label}${body}</p>`;
      }
      return `<p class="credit">${oneLine(line.blocks, context)}</p>`;
    })
    .join("");
  return `<footer class="slide-foot">${rendered}</footer>`;
}

/** A div's blocks flattened into one line, which is what a foot line is. */
function oneLine(blocks: readonly Block[], context: RenderContext): string {
  return blocks
    .map((block) =>
      block.kind === "paragraph"
        ? renderInlines(block.inlines, context)
        : (renderCommonBlock(block, context, renderFlow) ?? escapeText(block.text)),
    )
    .join(" ");
}

/** One slide's `<section>`. */
function renderSlide(slide: Slide, context: RenderContext): string {
  const headline =
    slide.headline === ""
      ? ""
      : `<${headlineTag(slide)} class="headline">${renderInlines(
          slide.headlineInlines,
          context,
        )}</${headlineTag(slide)}>`;
  const face =
    slide.face.length === 0 ? "" : `<div class="face">${renderFlow(slide.face, context)}</div>`;
  const foot = renderFoot(slide.foot, context);
  const notes =
    slide.notes.length === 0
      ? ""
      : `<aside class="notes"${attributes([["data-source", slide.notesSource]])}>${renderFlow(
          slide.notes,
          context,
        )}</aside>`;
  // The divider's class reaches the section element and never the rendered
  // text: the attribute was consumed by the parse.
  const classes = ["slide", KIND_CLASS[slide.kind], ...slide.classes];
  return `<section${attributes([["id", slide.id]])}${classAttribute(classes)}${attributes([
    ["data-kind", slide.kind],
    ["data-line", String(slide.line)],
  ])}>${headline}${face}${foot}${notes}</section>`;
}

/**
 * The deck as the fragment reveal.js expects.
 *
 * A column of one slide is one `<section>`; a column of several is a
 * `<section>` holding them, which is how moving down reaches a Sub-section and
 * moving right reaches the next Section.
 */
export function renderSlides(plan: DeckPlan, resolve: Resolver = pathResolver()): string {
  const context = contextFor(resolve);
  return plan.columns
    .map((column) => {
      const only = column.slides[0];
      if (column.slides.length === 1 && only !== undefined) {
        return renderSlide(only, context);
      }
      return `<section>${column.slides
        .map((slide) => renderSlide(slide, context))
        .join("")}</section>`;
    })
    .join("");
}

/** What a host needs to be told to wrap a fragment into a page. */
export interface DeckDocumentOptions {
  /** The page title. */
  readonly title: string;
  /**
   * How the engine reaches the page. `linked` names a relative path to the
   * folder the build copied `DECK_ENGINE_FILES` into.
   */
  readonly engine: "linked";
  /** The engine folder, relative to the written page. */
  readonly enginePath?: string;
  /** Where `DECK_STYLESHEET` was written, relative to the written page. */
  readonly stylesheetPath?: string;
  /** The language of the deck's text. */
  readonly lang?: string;
}

/**
 * Wrap a fragment into a page a browser can open from disk.
 *
 * Every URL here is relative, so the deck opens from the published folder and
 * from a copy of that folder on a memory stick alike, and nothing is fetched.
 */
export function deckDocument(fragment: string, options: DeckDocumentOptions): string {
  const engine = options.enginePath ?? "reveal/";
  const stylesheet_ = options.stylesheetPath ?? "slides.css";
  const config = JSON.stringify(DECK_CONFIG);
  return [
    "<!doctype html>",
    `<html lang="${escapeAttribute(options.lang ?? "en")}">`,
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    `<title>${escapeText(options.title)}</title>`,
    `<link rel="stylesheet" href="${escapeAttribute(engine)}reset.css" />`,
    `<link rel="stylesheet" href="${escapeAttribute(engine)}reveal.css" />`,
    `<link rel="stylesheet" href="${escapeAttribute(stylesheet_)}" />`,
    "</head>",
    "<body>",
    '<div class="reveal"><div class="slides">',
    fragment,
    "</div></div>",
    `<script src="${escapeAttribute(engine)}reveal.js"></script>`,
    `<script src="${escapeAttribute(engine)}plugin/notes/notes.js"></script>`,
    `<script>Reveal.initialize(Object.assign(${config}, { plugins: [RevealNotes] }));</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
