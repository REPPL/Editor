/**
 * The slide plan as reveal.js markup.
 *
 * One fragment renderer, two envelopes. `renderSlides` emits what reveal.js
 * expects and nothing else — a `<section>` per column, nested `<section>`s for
 * the vertical slides, an `<aside class="notes">` per slide, the foot line
 * under the face — with no `<html>`, no engine and no style around it. The app
 * mounts that fragment in a page that already carries the engine from the
 * bundle; the site build wraps it in its own envelope, under the policy the
 * site serves. So no host holds a copy of a rule.
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
  escapeText,
  renderCommonBlock,
  renderFigure,
  renderInlines,
  renderVideo,
  widthBucket,
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
 *
 * `controlsBackArrows` is `visible` rather than the engine's own `faded`: the
 * faded back arrow is drawn at three-tenths opacity even when there is a slide
 * to go back to, which is indistinguishable from the disabled one and reads as
 * a control that has stopped working. A control must say where the deck can
 * go, so the back arrow is dim when it is disabled and plain when it is not.
 */
export const DECK_CONFIG = {
  disableLayout: true,
  controls: true,
  controlsBackArrows: "visible",
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
function contextFor(resolve: Resolver, variant: string | null): RenderContext {
  return { resolve, rendering: "slides", variant };
}

/**
 * A columns div: a row whose columns take the shares the author declared.
 *
 * The shares reach the page as data attributes and the stylesheet holds the
 * rules, because the site serves under `style-src 'self'` and a `style`
 * attribute is dropped there unread — which would collapse every column on the
 * published deck while the app's own deck looked right.
 */
function renderColumns(block: Block, context: RenderContext): string {
  const count = block.children.filter((child) =>
    child.attributes.classes.includes("column"),
  ).length;
  const columns = block.children
    .map((child) =>
      child.attributes.classes.includes("column")
        ? `<div class="column"${attributes([
            ["data-width", widthBucket(child.attributes.pairs["width"] ?? null)],
          ])}>${renderFlow(child.children, context)}</div>`
        : renderFlow([child], context),
    )
    .join("");
  return `<div${classAttribute([
    "columns",
    ...block.attributes.classes.filter((name) => name !== "columns"),
  ])}${attributes([
    ["data-columns", count === 0 ? null : String(count)],
  ])}>${columns}</div>`;
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
      if (line.kind === "citation") {
        return `<p class="citation">${escapeText(line.text ?? "")}</p>`;
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
export function renderSlides(
  plan: DeckPlan,
  resolve: Resolver = pathResolver(),
  variant: string | null = null,
): string {
  const context = contextFor(resolve, variant);
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
