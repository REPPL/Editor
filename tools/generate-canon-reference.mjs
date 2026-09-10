#!/usr/bin/env node
/*
 * Generate the derivable parts of `docs/reference-the-markdown-canon.md`.
 *
 * Two regions of that page are the code's own tables written out as prose:
 *
 *   - "The forms" is `src/core/inserts.ts` — one entry per insert form, its
 *     canonical spelling, the shape it takes in the buffer, the phase the
 *     palette first offers it in, and the words that find it there;
 *   - the placement table is `src/core/canon.ts` — one row per construct and
 *     the brief's own wording for what each of the three renderings does
 *     with it.
 *
 * Everything outside the markers is hand-written and is preserved byte for
 * byte.
 *
 * Those tables are TypeScript, so they are not imported from Node directly.
 * They are evaluated through Vite's SSR module loader, which is already a dev
 * dependency of this project: no new dependency, and no second, weaker copy of
 * the tables in a regex reader here.
 *
 * Usage:
 *   node tools/generate-canon-reference.mjs           write the page
 *   node tools/generate-canon-reference.mjs --check   fail if the page is stale
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

/** The repository root, from this file's own location. */
const ROOT = new URL("../", import.meta.url);

/** The page this tool owns two regions of. */
export const PAGE_PATH = fileURLToPath(
  new URL("docs/reference-the-markdown-canon.md", ROOT),
);

/** How wide generated prose wraps. Matches the rest of the docs. */
const WIDTH = 78;

/** What an insert form's shape means to an author. */
const SHAPE_PROSE = {
  block: "Written as a block of its own.",
  inline: "Written inline, where the cursor is.",
  "heading-attribute": "Appended to the heading on the cursor's line.",
};

/**
 * Load the two tables.
 *
 * Vite compiles the TypeScript; the modules are the same ones the program
 * itself imports, so the page cannot disagree with the program.
 */
async function loadTables() {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(ROOT),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  try {
    const canon = await server.ssrLoadModule("/src/core/canon.ts");
    const inserts = await server.ssrLoadModule("/src/core/inserts.ts");
    return { rows: canon.CANON_ROWS, forms: inserts.INSERT_FORMS };
  } finally {
    await server.close();
  }
}

/** Greedy wrap, so a generated paragraph sits inside the docs' measure. */
function wrap(text, width = WIDTH) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line === "") line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  return lines.join("\n");
}

/** The "The forms" region: one entry per insert form, in palette order. */
export function renderForms(forms) {
  return forms
    .map((form) => {
      const shape = SHAPE_PROSE[form.shape];
      if (shape === undefined) {
        throw new Error(`canon reference: unknown insert shape ${form.shape}`);
      }
      const found = form.keywords.join(", ");
      const note = wrap(
        `${shape} Offered from phase ${form.visibleFrom}. Found in the palette by: ${found}.`,
      );
      return [
        `### ${form.label}`,
        "",
        "```markdown",
        form.canonical.replace(/\s+$/, ""),
        "```",
        "",
        note,
      ].join("\n");
    })
    .join("\n\n");
}

/** The placement table: one row per construct, the brief's own wording. */
export function renderPlacements(rows) {
  const header = [
    "| Construct | Article | Slides | PDF | From phase |",
    "|---|---|---|---|---|",
  ];
  const body = rows.map(
    (row) =>
      `| ${row.construct} | ${row.article.wording} | ${row.slides.wording} | ` +
      `${row.print.wording} | ${row.phase} |`,
  );
  return [...header, ...body].join("\n");
}

/** Put one region's body between its markers, leaving everything else alone. */
export function replaceRegion(page, name, body) {
  const open = `<!-- generated: ${name} -->`;
  const close = "<!-- /generated -->";
  const start = page.indexOf(open);
  if (start === -1) {
    throw new Error(`canon reference: the page has no ${open} marker`);
  }
  const end = page.indexOf(close, start);
  if (end === -1) {
    throw new Error(`canon reference: ${open} is never closed`);
  }
  const before = page.slice(0, start + open.length);
  const after = page.slice(end);
  return `${before}\n\n${body.replace(/\s+$/, "")}\n\n${after}`;
}

/** The page as it should be, given the page as it is. */
export function generate(page, { rows, forms }) {
  let next = replaceRegion(page, "forms", renderForms(forms));
  next = replaceRegion(next, "canon table", renderPlacements(rows));
  return next;
}

/** A compact line diff: common prefix and suffix dropped, the rest marked. */
function diff(actual, expected) {
  const a = actual.split("\n");
  const b = expected.split("\n");
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail += 1;
  }
  const lines = [`@@ line ${head + 1} @@`];
  for (const line of a.slice(head, a.length - tail)) lines.push(`- ${line}`);
  for (const line of b.slice(head, b.length - tail)) lines.push(`+ ${line}`);
  return lines.join("\n");
}

async function main() {
  const check = process.argv.includes("--check");
  const page = await readFile(PAGE_PATH, "utf8");
  const expected = generate(page, await loadTables());
  if (page === expected) {
    if (!check) process.stdout.write("docs/reference-the-markdown-canon.md is up to date\n");
    return;
  }
  if (!check) {
    await writeFile(PAGE_PATH, expected, "utf8");
    process.stdout.write("docs/reference-the-markdown-canon.md regenerated\n");
    return;
  }
  process.exitCode = 1;
  process.stderr.write(
    "docs/reference-the-markdown-canon.md is stale.\n" +
      "Run: npm run docs:canon\n\n" +
      diff(page, expected) +
      "\n",
  );
}

// Only the command line runs it; the pure parts above stay importable.
const invoked = process.argv[1];
if (invoked !== undefined && import.meta.url === pathToFileURL(invoked).href) {
  await main();
}
