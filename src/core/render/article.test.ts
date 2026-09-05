/**
 * The article skeleton: the same tree, read as a page.
 *
 * Two things are proved here. The skeleton carries what an article carries —
 * headings to four levels, a contents list, figures with captions and credits,
 * footnotes, citations as unresolved keys, video as its poster and a link. And
 * the bundle's obligation, stated in `spc-2609051353425884`: the slide-only
 * constructs cost the article nothing, and the rule that says so is the canon
 * table rather than a branch this renderer keeps to itself.
 */

import { describe, expect, it } from "vitest";

import { pathResolver } from "../assets";
import { CANON_ROWS, placementOf } from "../canon";
import { parseChapter } from "../parse";
import { renderArticle } from "./article";

/** The article for one chapter. */
function article(source: string, resolve = pathResolver()): string {
  return renderArticle(parseChapter(source), resolve);
}

/** The article's visible text, tags gone. */
function visible(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

describe("what the article carries", () => {
  it("writes the four heading levels as four headings", () => {
    const html = article(
      [
        "# The Lantern Papers",
        "",
        "## Beginnings",
        "",
        "### The first year",
        "",
        "#### A note on dates",
        "",
      ].join("\n"),
    );
    expect(html).toContain("<h1>The Lantern Papers</h1>");
    expect(html).toContain('<h2 id="beginnings">Beginnings</h2>');
    expect(html).toContain('<h3 id="beginnings/the-first-year">The first year</h3>');
    expect(html).toContain(
      '<h4 id="beginnings/the-first-year/a-note-on-dates">A note on dates</h4>',
    );
  });

  it("writes a contents list of the headings below the title", () => {
    const html = article("# Title\n\n## Beginnings\n\n### The first year\n\n## Findings\n");
    expect(html).toContain('<nav class="contents">');
    expect(html).toContain('<a href="#beginnings">Beginnings</a>');
    expect(html).toContain('<a href="#beginnings/the-first-year">The first year</a>');
    expect(html).toContain('<a href="#findings">Findings</a>');
  });

  it("writes a paragraph as a paragraph and a rule as a rule", () => {
    const html = article("A sentence.\n\n---\n\nAnother.\n");
    expect(html).toContain("<p>A sentence.</p>");
    expect(html).toContain("<hr />");
  });

  it("writes an image as a figure with its caption and its credit", () => {
    const html = article(
      '![The lantern at dusk](assets/lantern.jpg "Photograph by Carol")\n',
    );
    expect(html).toContain("<figure>");
    expect(html).toContain('src="assets/lantern.jpg"');
    expect(html).toContain('<span class="caption">The lantern at dusk</span>');
    expect(html).toContain('<span class="credit">Photograph by Carol</span>');
  });

  it("honours an image's declared width, with no inline style", () => {
    // The site serves under `style-src 'self'` and the HTML `width` attribute
    // takes no percentages, so a declared share reaches the page as a data
    // attribute and `presenter/article.css` holds the rule.
    const html = article('![Dusk](assets/lantern.jpg){width="75%"}\n');
    expect(html).toContain('data-width="75"');
    expect(html).not.toContain("style=");
    expect(html).not.toContain('width="75%"');
    // A width in pixels is an HTML width and stays one.
    expect(article('![Dusk](assets/lantern.jpg){width="320"}\n')).toContain('width="320"');
  });

  it("writes a footnote reference and its note", () => {
    const html = article("A claim.[^dates]\n\n[^dates]: The dates are estimates.\n");
    expect(html).toContain('<sup class="footnote-reference"><a href="#fn-dates"');
    expect(html).toContain('<section class="footnotes">');
    expect(html).toContain('<li id="fn-dates">');
    expect(html).toContain("The dates are estimates.");
  });

  it("writes an inline footnote's content in the notes too", () => {
    const html = article("A claim.^[an inline note]\n");
    expect(html).toContain('<section class="footnotes">');
    expect(html).toContain("an inline note");
  });

  it("writes a citation as the unresolved key the author wrote", () => {
    const html = article("As shown [@smith2020, p. 4] and by @jones2019.\n");
    expect(html).toContain('<span class="citation">[@smith2020, p. 4]</span>');
    expect(html).toContain('<span class="citation">@jones2019</span>');
    // Nothing here resolves a key or generates a reference list.
    expect(html).not.toContain("References");
  });

  it("writes a video as its poster and a link", () => {
    const html = article(
      [
        '::: {.video poster="assets/poster.jpg" caption="The second half"}',
        "- site: keynote.mp4",
        "- remote: https://videos.example.org/keynote.mp4",
        ":::",
        "",
      ].join("\n"),
    );
    expect(html).toContain('<figure class="video">');
    expect(html).toContain('src="assets/poster.jpg"');
    expect(html).toContain('<a href="keynote.mp4">keynote.mp4</a>');
    expect(html).toContain('data-role="remote"');
    expect(html).not.toContain("<video");
  });

  it("writes a list, a quote, a table and a code block", () => {
    const html = article(
      [
        "- one",
        "- two",
        "",
        "> A quotation.",
        "",
        "| a | b |",
        "|---|---|",
        "| 1 | 2 |",
        "",
        ": The counts",
        "",
        "```ts",
        "const x = 1;",
        "```",
        "",
      ].join("\n"),
    );
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<blockquote><p>A quotation.</p></blockquote>");
    expect(html).toContain("<caption>The counts</caption>");
    expect(html).toContain('<code class="language-ts">const x = 1;');
  });
});

describe("the slide-only constructs", () => {
  it("puts columns in the flow, omits notes, keeps a divider an ordinary heading", () => {
    const html = article(
      [
        "## Interlude {.divider}",
        "",
        "::: {.columns}",
        '::: {.column width="50%"}',
        "Left.",
        ":::",
        '::: {.column width="50%"}',
        "Right.",
        ":::",
        ":::",
        "",
        "::: {.notes}",
        "Slow down here.",
        ":::",
        "",
      ].join("\n"),
    );
    // A divider is an ordinary heading, its class carried and never as text.
    expect(html).toContain('<h2 id="interlude" class="divider">Interlude</h2>');
    expect(visible(html)).not.toContain("{.divider}");
    // The columns are ignored and their content is in the flow.
    expect(html).toContain("<p>Left.</p><p>Right.</p>");
    expect(html).not.toContain('class="columns"');
    expect(html).not.toContain("--column-tracks");
    // The reader never learns a talk was shaped in the file.
    expect(html).not.toContain("Slow down here.");
  });

  it("writes a credit where the article's margin note will go", () => {
    const html = article("::: {.credit}\nPhotograph by Carol.\n:::\n");
    expect(html).toContain('<aside class="credit"><p>Photograph by Carol.</p></aside>');
  });

  it("ignores a page-break comment", () => {
    const html = article("Before.\n\n<!-- pagebreak -->\n\nAfter.\n");
    expect(html).toContain("<p>Before.</p><p>After.</p>");
    expect(html).not.toContain("pagebreak");
  });

  it("reads its placements from the canon table rather than deciding for itself", () => {
    // Every phase-1 construct has an Article cell, and the renderer answers to
    // it: change the table and the article changes with it.
    for (const row of CANON_ROWS.filter((entry) => entry.phase === 1)) {
      expect(row.article.placement, row.id).toBeTruthy();
    }
    const notes = parseChapter("::: {.notes}\nA.\n:::\n").blocks[0];
    expect(notes).toBeDefined();
    expect(placementOf(notes!, "article")).toBe("absent");
  });
});

describe("one source", () => {
  it("resolves a picture through the same seam the deck uses, and refuses the same shapes", () => {
    expect(article("![A lantern](assets/lantern.jpg)\n")).toContain(
      'src="assets/lantern.jpg"',
    );
    const absolute = article("![A lantern](/Users/someone/lantern.jpg)\n"); // abcd-lint:allow illustrative refusal path
    expect(absolute).not.toContain("/Users/someone"); // abcd-lint:allow illustrative refusal path
    expect(absolute).toContain('class="missing-image"');
  });
});
