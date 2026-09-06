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
import { parseBibliography, resolveCitations } from "../bibliography";
import { CANON_ROWS, placementOf } from "../canon";
import { parseChapter } from "../parse";
import {
  chapterHasRefsHeading,
  renderArticle,
  renderDocumentContents,
  renderReferenceList,
  type ArticleOptions,
} from "./article";

/** The article for one chapter. */
function article(source: string, resolve = pathResolver(), options: ArticleOptions = {}): string {
  return renderArticle(parseChapter(source), resolve, options);
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
    // The title's own anchor is what a "Chapter" contents entry sends a
    // reader to; nothing else in the canon gives it one.
    expect(html).toContain('<h1 id="the-lantern-papers">The Lantern Papers</h1>');
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

  it("writes a footnote as a margin note beside its paragraph, not at the foot of the page", () => {
    const html = article("A claim.[^dates]\n\n[^dates]: The dates are estimates.\n");
    expect(html).toContain('<sup class="footnote-reference"><a href="#fn-dates"');
    expect(html).toContain('<p>A claim.<sup class="footnote-reference">');
    expect(html).toContain('<aside id="fn-dates" class="margin-note footnote">');
    expect(html).toContain("The dates are estimates.");
    // The paragraph and its note are siblings, so a stylesheet rule alone
    // decides whether the note sits beside it or folds into the flow.
    expect(html).toMatch(/<\/p><aside id="fn-dates"/);
    expect(html).not.toContain("<section class=\"footnotes\">");
  });

  it("writes an inline footnote's content in a margin note too", () => {
    const html = article("A claim.^[an inline note]\n");
    expect(html).toMatch(/class="margin-note footnote"/);
    expect(html).toContain("an inline note");
    expect(html).not.toContain("<section class=\"footnotes\">");
  });

  it("writes a citation as the literal text the author wrote when no bibliography is given", () => {
    // A caller exercising this module in isolation, with no
    // `CitationResolution` at all — `html.ts`'s own phase-1 fallback.
    const html = article("As shown [@smith2020, p. 4] and by @jones2019.\n");
    expect(html).toContain('<span class="citation">[@smith2020, p. 4]</span>');
    expect(html).toContain('<span class="citation">@jones2019</span>');
    expect(html).toContain(
      '<aside class="margin-note citation unresolved">[@smith2020, p. 4]</aside>',
    );
    expect(html).toContain('<aside class="margin-note citation unresolved">@jones2019</aside>');
    expect(html).not.toContain("<ol class=\"reference-list\">");
  });

  it("writes a resolved citation as a numbered marker, with the full reference in the margin", () => {
    const source = "As shown [@smith2020, p. 4].\n";
    const citations = resolveCitations(
      [parseChapter(source)],
      parseBibliography(
        "@article{smith2020, author = {Smith, Alice}, title = {The Lantern Papers}, year = {2020}}",
      ),
    );
    const html = article(source, pathResolver(), { citations });
    expect(html).toContain('<span class="citation">[1, p. 4]</span>');
    expect(html).toContain('<aside class="margin-note citation"><p>Smith, Alice. 2020. The Lantern Papers.</p></aside>');
  });

  it("marks a key that resolves to nothing, never as the literal brackets the author wrote", () => {
    const source = "As shown [@nosuchkey].\n";
    const citations = resolveCitations([parseChapter(source)], parseBibliography(""));
    const html = article(source, pathResolver(), { citations });
    expect(html).not.toContain("[@nosuchkey]");
    expect(html).toContain('<span class="citation-key unresolved">nosuchkey</span>');
    expect(html).toContain('<aside class="margin-note citation unresolved">nosuchkey</aside>');
  });

  it("puts a citation and a footnote from the same paragraph in the margin, in source order, beside it rather than at the foot", () => {
    const html = article(
      "A claim [@smith2020, p. 4] and a note.^[an inline note]\n",
    );
    const paragraph = html.indexOf("<p>A claim");
    const citationNote = html.indexOf('class="margin-note citation unresolved"');
    const footnoteNote = html.indexOf('class="margin-note footnote"');
    expect(paragraph).toBeGreaterThanOrEqual(0);
    expect(citationNote).toBeGreaterThan(paragraph);
    expect(footnoteNote).toBeGreaterThan(citationNote);
    expect(html).not.toContain('<section class="footnotes">');
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

  it("writes a callout as a box in the flow, carrying its kind", () => {
    const html = article(
      '::: {.callout kind="warning"}\nThe figures before 1998 are estimates.\n:::\n',
    );
    expect(html).toContain(
      '<div data-kind="warning" class="callout"><p>The figures before 1998 are estimates.</p></div>',
    );
  });

  it("runs a `.full-bleed` image the full measure", () => {
    const html = article(
      '![The lantern at dusk](assets/lantern.jpg "By Carol"){.full-bleed}\n',
    );
    expect(html).toContain('<figure class="full-bleed">');
    expect(html).toContain('src="assets/lantern.jpg"');
    expect(html).toContain('<span class="caption">The lantern at dusk</span>');
    expect(html).toContain('<span class="credit">By Carol</span>');
  });

  it("tries a video's sources in the order written, and inserts no player when they are all unreachable at render time", () => {
    const html = article(
      [
        '::: {.video poster="assets/keynote-poster.jpg" caption="Part two"}',
        "- local: keynote.mp4",
        "- site: keynote.mp4",
        "- gated: https://media.example.org/keynote.mp4",
        ":::",
        "",
      ].join("\n"),
    );
    expect(html).toContain('<figure class="video">');
    expect(html).toContain('src="assets/keynote-poster.jpg"');
    expect(html).toContain("<figcaption>Part two</figcaption>");
    expect(html).not.toContain("<video");
    // The reachability of a source is a fact about the reader's own moment,
    // never about the moment this tree was rendered — `article-video.js`,
    // not this module, is where that is decided.
    const local = html.indexOf('data-role="local"');
    const site = html.indexOf('data-role="site"');
    const gated = html.indexOf('data-role="gated"');
    expect(local).toBeGreaterThanOrEqual(0);
    expect(site).toBeGreaterThan(local);
    expect(gated).toBeGreaterThan(site);
  });
});

describe("the document's contents list, to four levels", () => {
  // The intent's own scenario: two Parts holding four chapters in all.
  const chapters = [
    {
      chapter: parseChapter(
        "# The Lantern Papers\n\n## Beginnings\n\n### The first year\n\n#### A note on dates\n",
      ),
      idPrefix: "c1-",
      part: "Beginnings",
    },
    {
      chapter: parseChapter("# Winter light\n\n## Findings\n"),
      idPrefix: "c2-",
      part: "Beginnings",
    },
    {
      chapter: parseChapter("# The Lantern Papers\n\n## Later work\n"),
      idPrefix: "c3-",
      part: "Findings",
    },
    {
      chapter: parseChapter("# Closing notes\n"),
      idPrefix: "c4-",
      part: "Findings",
    },
  ];

  it("carries the Parts, the Chapters, the Sections and the Sub-sections, and each entry points at that heading", () => {
    const contents = renderDocumentContents(chapters);
    // The Parts, each holding its own Chapters. A Part has no heading of its
    // own on the page, so its own entry is a label, not a link — the
    // Chapter nested directly beneath it is what a reader chooses instead.
    expect(contents).toContain('<span class="part">Beginnings</span>');
    expect(contents).toContain('<span class="part">Findings</span>');
    // Two chapters opening with the same title write two different ids: the
    // prefix is what a document-wide contents list needs that one chapter's
    // own never did.
    expect(contents).toContain('<a href="#c1-the-lantern-papers">The Lantern Papers</a>');
    expect(contents).toContain('<a href="#c3-the-lantern-papers">The Lantern Papers</a>');
    expect(contents).toContain('<a href="#c2-winter-light">Winter light</a>');
    expect(contents).toContain('<a href="#c4-closing-notes">Closing notes</a>');
    // The Sections and the Sub-sections.
    expect(contents).toContain('<a href="#c1-beginnings">Beginnings</a>');
    expect(contents).toContain('<a href="#c1-beginnings/the-first-year">The first year</a>');
    expect(contents).toContain('<a href="#c2-findings">Findings</a>');
    expect(contents).toContain('<a href="#c3-later-work">Later work</a>');
    // Four levels, not five: a Sub-sub-section still gets a heading and an
    // anchor on the page, but the list that jumps to one stops short of it.
    expect(contents).not.toContain("A note on dates");
  });

  it("choosing an entry moves the page to that heading: every href names an id the chapter's own rendering writes", () => {
    const rendered = chapters
      .map((entry) =>
        renderArticle(entry.chapter, pathResolver(), {
          contents: false,
          idPrefix: entry.idPrefix,
        }),
      )
      .join("");
    expect(rendered).toContain('id="c1-the-lantern-papers"');
    expect(rendered).toContain('id="c1-beginnings/the-first-year"');
    expect(rendered).toContain('id="c2-findings"');
    expect(rendered).toContain('id="c3-later-work"');
    expect(rendered).toContain('id="c4-closing-notes"');
    // The Sub-sub-section is still a real heading on the page.
    expect(rendered).toContain('id="c1-beginnings/the-first-year/a-note-on-dates"');
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

  it("writes a credit as a margin note, beside the block it follows", () => {
    const html = article(
      "A photograph.\n\n::: {.credit}\nPhotograph by Carol.\n:::\n",
    );
    expect(html).toContain(
      '<aside class="margin-note credit"><p>Photograph by Carol.</p></aside>',
    );
    // It sits right after the paragraph it credits: one stylesheet rule
    // decides whether that means "beside it" or "directly after it".
    expect(html).toMatch(/<p>A photograph\.<\/p><aside class="margin-note credit">/);
  });

  it("writes a `.margin` span as a margin note, and leaves no marker behind in the sentence", () => {
    const html = article("She arrived [in the second week]{.margin} and stayed.\n");
    expect(html).toContain('<aside class="margin-note margin">in the second week</aside>');
    // The canon calls it "a margin aside without a marker": the words are in
    // the note, not doubled into the sentence that made it.
    expect(visible(html)).not.toContain("in the second week and stayed");
    expect(visible(html)).toContain("She arrived");
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

describe("the generated reference list (itd-2609051335502171)", () => {
  const BIB = [
    "@article{smith2020,",
    "  author = {Smith, Alice},",
    "  title = {The Lantern Papers},",
    "  year = {2020},",
    "}",
    "@book{carroll1999,",
    "  author = {Carroll, Carol},",
    "  title = {Reading by Lamplight},",
    "  year = {1999},",
    "}",
  ].join("\n");

  it("writes one entry per cited key, numbered in first-citation order, and no others", () => {
    const source = "First [@carroll1999], then [@smith2020].\n";
    const citations = resolveCitations([parseChapter(source)], parseBibliography(BIB));
    expect(renderReferenceList(citations)).toBe(
      '<ol class="reference-list">' +
        '<li id="ref-1">Carroll, Carol. 1999. Reading by Lamplight.</li>' +
        '<li id="ref-2">Smith, Alice. 2020. The Lantern Papers.</li>' +
        "</ol>",
    );
  });

  it("writes nothing when nothing was cited, and nothing for no resolution at all", () => {
    expect(renderReferenceList(resolveCitations([], parseBibliography(BIB)))).toBe("");
    expect(renderReferenceList(undefined)).toBe("");
  });

  it("renders the list beneath a `.refs` heading the document writes itself", () => {
    const source = ["A claim [@smith2020].", "", "## Sources {.refs}", ""].join("\n");
    const citations = resolveCitations([parseChapter(source)], parseBibliography(BIB));
    const html = article(source, pathResolver(), { citations });
    expect(html).toContain('<h2 id="sources" class="refs">Sources</h2><ol class="reference-list">');
    expect(chapterHasRefsHeading(parseChapter(source))).toBe(true);
  });

  it("reports no `.refs` heading for a chapter that writes none", () => {
    expect(chapterHasRefsHeading(parseChapter("A claim [@smith2020].\n"))).toBe(false);
  });
});
