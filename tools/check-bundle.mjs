#!/usr/bin/env node
/*
 * Check that the built bundle still carries what the running app needs.
 *
 * Two gates, one shape of bug: a dependency that installs itself correctly on
 * disk, correctly under the dev server, and correctly under the test runner,
 * and is then taken apart by the bundler on the one path nobody runs before
 * shipping. Neither gate can be answered by a unit test, because a unit test
 * never sees the emitted file.
 *
 * GATE ONE: the Emacs keymap.
 *
 * `@replit/codemirror-emacs` installs itself in two module-level calls, and
 * both carry a `/*@__PURE__*\/` annotation saying they may be dropped:
 *
 *     for (let i in emacsKeys) {
 *         EmacsHandler.bindKey(i, emacsKeys[i]);
 *     }
 *     EmacsHandler.addCommands({ unsetTransientMark: … });
 *
 * They may not: they are the whole keymap. `vite.config.ts` tells both halves
 * of the toolchain not to believe the annotation, and until this script there
 * was nothing that read the emitted file to see whether it had worked —
 * `docs/spike-emacs-keys.md` says why the unit suite cannot: Vitest loads the
 * dependency as it lies on disk, unbundled and untree-shaken, so the tests
 * stay green while the shipped application goes quiet.
 *
 * So this runs after `vite build`, on what was actually written. It reads
 * structure rather than names — the loop's own index variable, tied to the
 * table it reads and the `bindKey` call it makes — so it survives minification
 * and says nothing about how the bundler spells anything. A rename inside the
 * dependency (a new version dropping `unsetTransientMark`, say) fails it too:
 * that is a check worth re-reading, not a check worth loosening.
 *
 * What it does not say is *which file* the keymap has to be in. A bundler is
 * free to put a dependency in a chunk of its own and have the entry import it,
 * and that is a build that works. So the question asked is the one that
 * matters: is the keymap whole in some chunk the entry actually loads? The
 * entry's own imports are followed, transitively, and the run fails only when
 * no chunk on that graph carries it.
 *
 * GATE TWO: the deck engine the present window drives.
 *
 * `iss-2609061132369973`: `present.html` used to load the vendored UMD build
 * of reveal.js from a `<script type="module">` tag and `src/present.ts` read
 * the `Reveal` that file assigns to `globalThis`. The assignment happens in
 * the UMD's *last* branch, the one taken when the file is executed as a
 * script. The dev server serves it raw, so that branch ran and the global was
 * there; the jsdom suite evaluated the same file into its own global, so it
 * was there too. The release build handed the file to the bundler instead,
 * which read the UMD's *first* branch — `typeof exports === "object"` — took
 * it for CommonJS, and turned `module.exports = factory()` into a module
 * export. No global was ever assigned. `globalThis.Reveal` was `undefined` in
 * the shipped window, the deck mounted with no engine behind it, and the
 * maintainer got one slide and a row of dead arrows while every check stayed
 * green.
 *
 * The repair is to import the engine — the ES-module build, which means the
 * same thing to a bundler, a dev server and a test runner alike — and this is
 * the half of the guard that reads the emitted file. Three questions, on the
 * present entry's own graph: is reveal's `initialize` implementation actually
 * in there; does the accessor `src/present.ts` reads the engine through
 * resolve to that same binding; and is that accessor what the mount defaults
 * to. A build where the engine is present but the application is looking
 * somewhere else passes the first question and fails the second, which is
 * exactly the build that shipped.
 *
 * Usage: node tools/check-bundle.mjs [dist directory]
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

/**
 * The package's own binding loop, whatever the bundler renamed it to.
 *
 * `for (let i in emacsKeys) EmacsHandler.bindKey(i, emacsKeys[i])`, with the
 * three identifiers free and the back-references holding the shape together:
 * the key bound is the index the loop walks, and the value is that index into
 * the table the loop is over.
 */
const BIND_LOOP =
  /for\s*\(\s*(?:let|var|const)\s+([\w$]+)\s+in\s+([\w$]+)\s*\)\s*\{?\s*(?:\/\*@__PURE__\*\/)?\s*([\w$.]+)\.bindKey\(\s*\1\s*,\s*\2\[\s*\1\s*\]\s*\)/;

/**
 * Where the package's own command table begins.
 *
 * A property name rather than an identifier, because minifiers do not rename
 * property names: `unsetTransientMark` is the first command the package
 * registers and it is registered nowhere else in the tree.
 */
const ADD_COMMANDS = /\.addCommands\(\s*\{\s*unsetTransientMark\b/;

/**
 * The command `src/emacs.ts` asks for at run time to see the same thing.
 *
 * It has to be *this table's* `killLine`, which is why it is looked for as a
 * property of the object `addCommands` is called with and not as a substring
 * of the file. The application carries the name as a string constant of its
 * own — `PACKAGE_COMMAND` in `src/emacs.ts` — so a plain `includes` was
 * answered by the application's own literal, and would have passed a build
 * with the package's table dropped entirely. That is the check the witness
 * exists to fail.
 */
const RUNTIME_WITNESS = "killLine";
const WITNESS_KEY = /[{,]\s*["']?killLine["']?\s*:/;

/**
 * The object literal that starts at the first `{` at or after `at`.
 *
 * Brace counting, with quotes and template literals skipped so that a brace
 * inside a string does not close the object. Returns null when it does not
 * close, which a build gate reads as "not found": erring towards a failure
 * that is looked at beats erring towards a pass that is not.
 */
function objectAt(source, at) {
  const start = source.indexOf("{", at);
  if (start === -1) return null;
  let depth = 0;
  let quote = "";
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== "") {
      if (character === "\\") index += 1;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

/** What one source is missing, as a list of names. Empty means it is whole. */
function missingFrom(source) {
  const missing = [];
  if (!BIND_LOOP.test(source)) missing.push("the package's bindKey loop");

  const found = ADD_COMMANDS.exec(source);
  if (!found) {
    missing.push("the package's addCommands call");
    missing.push(`the ${RUNTIME_WITNESS} command the running application looks for`);
    return missing;
  }
  const table = objectAt(source, found.index);
  if (table === null || !WITNESS_KEY.test(table)) {
    missing.push(`the ${RUNTIME_WITNESS} command the running application looks for`);
  }
  return missing;
}

/** Every built chunk in a dist folder, by name. */
function chunksIn(assets) {
  return readdirSync(assets).filter((name) => name.endsWith(".js"));
}

/**
 * The chunk names one source imports, as written in the emitted file.
 *
 * Only the relative specifiers a bundler writes between its own chunks —
 * `import"./x.js"`, `from"./x.js"`, `import("./x.js")`. Anything else is a
 * bare module the build did not emit, and there is nothing in `assets` to
 * read for it.
 */
function importsOf(source) {
  const found = new Set();
  const specifier = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(specifier)) {
    const path = match[1];
    if (!path.startsWith("./") && !path.startsWith("../")) continue;
    const name = path.split("/").pop();
    if (name?.endsWith(".js")) found.add(name);
  }
  return [...found];
}

/** One entry chunk and everything it loads, in the order they were reached. */
function graphFrom(assets, entry) {
  const seen = [];
  const queue = [entry];
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.includes(name)) continue;
    const path = join(assets, name);
    if (!existsSync(path)) continue;
    seen.push(name);
    queue.push(...importsOf(readFileSync(path, "utf8")));
  }
  return seen;
}

/**
 * reveal.js's own `initialize`, whatever the bundler renamed it to.
 *
 * The engine's last statement wires the stub the module exports to the deck it
 * builds:
 *
 *     Reveal.initialize = options => (
 *       Object.assign(Reveal, new Deck(document.querySelector(".reveal"), options)),
 *       …,
 *       Reveal.initialize()
 *     );
 *
 * Structure again rather than names: the back-reference ties the object being
 * assigned *to* to the object whose `initialize` is being defined, and
 * `document.querySelector(".reveal")` is the engine's own literal, which no
 * minifier renames. The identifier it captures is the engine's binding in the
 * emitted chunk, which is the thing the second question is about.
 */
const ENGINE_INITIALIZE =
  /([\w$]+)\.initialize\s*=\s*[\w$]+\s*=>\s*\(\s*Object\.assign\(\s*\1\s*,\s*new\s+[\w$]+\(\s*document\.querySelector\(\s*["'`]\.reveal["'`]\s*\)/;

/**
 * Anything at all reading the engine off a global.
 *
 * The bug's own spelling. `src/present.ts` must not go back to it, and no
 * chunk on the present graph should mention it: the ES-module build never
 * assigns one, so a read here could only ever answer `undefined`.
 */
const GLOBAL_READ =
  /\b(?:globalThis|window|self)\s*(?:\.\s*Reveal\b|\[\s*["'`]Reveal["'`]\s*\])/;

/** One identifier, safe to paste into a regular expression. */
function quoted(name) {
  return name.replace(/[$]/g, "\\$&");
}

/**
 * The accessor `src/present.ts` reads the engine through, for one binding.
 *
 * `export function engine() { return typeof Reveal?.initialize === "function"
 * ? Reveal : null; }` — asked of *this* binding, so it answers the question
 * the release build failed: not "is the engine in the bundle" but "is the
 * engine in the bundle the one the application is holding". Returns the
 * accessor's own emitted name, or null.
 */
function accessorFor(source, binding) {
  const name = quoted(binding);
  const found = new RegExp(
    `function\\s+([\\w$]+)\\s*\\(\\s*\\)\\s*\\{\\s*return\\s+typeof\\s+${name}\\s*\\?\\.\\s*initialize\\s*={2,3}\\s*["'\`]function["'\`]\\s*\\?\\s*${name}\\s*:\\s*null\\s*\\}`,
  ).exec(source);
  return found === null ? null : found[1];
}

/**
 * The mount taking the accessor as a parameter's default, for one accessor.
 *
 * `src/present.ts` reaches the engine in one place a caller can override —
 * `function mountDeck(…, reveal = engine())` — and that default is what the
 * shipped window runs on. So the question is asked of a parameter list: the
 * accessor's call sitting between a `(` or a `,` and a `,` or a `)`, which is
 * the only place a default can be. A plain `const reveal = engine()` inside a
 * function body answers `=V()` and answers nothing about the mount, and the
 * emitted chunk has one of those too — which is what made the loose check pass
 * a bundle it had not read the mount of.
 */
function mountDefaultFor(accessor) {
  return new RegExp(`[(,]\\s*[\\w$]+\\s*=\\s*${quoted(accessor)}\\(\\s*\\)\\s*[,)]`);
}

/**
 * What one source is missing of the engine wiring. Empty means it is whole.
 *
 * The three questions in order, because each one only means anything if the
 * one before it was answered: the engine is here, the accessor resolves to
 * *this* engine, and the mount defaults to *that* accessor.
 */
function engineMissingFrom(source) {
  const found = ENGINE_INITIALIZE.exec(source);
  if (found === null) return ["reveal.js's own initialize implementation"];
  const binding = found[1];
  const accessor = accessorFor(source, binding);
  if (accessor === null) {
    return [
      `the engine accessor in src/present.ts resolving to ${binding}, which is the engine this chunk carries`,
    ];
  }
  if (!mountDefaultFor(accessor).test(source)) {
    return [`the mount defaulting to ${accessor}(), the accessor that holds the engine`];
  }
  return [];
}

/**
 * One gate: something the running application needs, in the emitted files.
 *
 * The same shape for both, because the same reasoning holds for both. Which
 * chunk carries it is the bundler's business, so the entry's own imports are
 * followed transitively and the run fails only when nothing on that graph has
 * it; and where else it landed is reported, because a chunk the entry does not
 * load is a wiring problem rather than a dropped installation.
 */
function gate({ assets, chunks, entryPattern, what, missingFrom: missing, note }) {
  const entries = chunks.filter((name) => entryPattern.test(name));
  if (entries.length === 0) {
    console.error(
      `check-bundle: no ${entryPattern.source} in ${assets}. The build wrote ${
        chunks.length === 0 ? "no chunk at all" : chunks.join(", ")
      }.`,
    );
    return 1;
  }

  const failures = [];
  const installed = [];
  for (const entry of entries) {
    const reachable = graphFrom(assets, entry);
    const carrier = reachable.find(
      (name) => missing(readFileSync(join(assets, name), "utf8")).length === 0,
    );
    if (carrier === undefined) {
      failures.push({
        entry,
        reachable,
        missing: missing(readFileSync(join(assets, entry), "utf8")),
      });
    } else {
      installed.push(carrier === entry ? carrier : `${carrier} (loaded by ${entry})`);
    }
  }

  if (failures.length === 0) {
    console.log(`check-bundle: ${what} is installed in ${installed.join(", ")}.`);
    return 0;
  }

  for (const { entry, reachable, missing: absent } of failures) {
    console.error(
      `check-bundle: nothing ${entry} loads carries ${what}. ${entry} itself is missing ${absent.join(", ")}.`,
    );
    console.error(
      `check-bundle: it loads ${reachable.length === 1 ? "no other chunk" : reachable.slice(1).join(", ")}.`,
    );
    const elsewhere = chunks
      .filter((other) => !reachable.includes(other))
      .filter((other) => missing(readFileSync(join(assets, other), "utf8")).length === 0);
    if (elsewhere.length > 0) {
      console.error(
        `check-bundle: it is whole in ${elsewhere.join(", ")}, which ${entry} does not load, so the wiring moved rather than ${what} being dropped.`,
      );
    }
  }
  console.error(`check-bundle: ${note}`);
  return 1;
}

/**
 * Nobody on the present graph reads the engine off a global.
 *
 * Separate from the gate above because it is the opposite kind of question: a
 * global read is not something missing from a chunk, it is something present
 * in one, and one chunk having it is enough to fail.
 */
function globalReadIn(assets, chunks) {
  const entries = chunks.filter((name) => /^present-.*\.js$/.test(name));
  for (const entry of entries) {
    for (const name of graphFrom(assets, entry)) {
      if (GLOBAL_READ.test(readFileSync(join(assets, name), "utf8"))) return name;
    }
  }
  return null;
}

function main() {
  const dist = process.argv[2] ?? "dist";
  const assets = join(dist, "assets");

  let chunks;
  try {
    chunks = chunksIn(assets);
  } catch (error) {
    console.error(`check-bundle: cannot read ${assets}: ${String(error)}`);
    return 1;
  }

  // Both gates run whatever the first one answers: a build with two things
  // wrong should say so once rather than over two runs.
  const keymap = gate({
    assets,
    chunks,
    entryPattern: /^main-.*\.js$/,
    what: "the Emacs keymap",
    missingFrom,
    note: "the bundler took @replit/codemirror-emacs's own installation for pure calls. See the treeshake note in vite.config.ts.",
  });
  const deckEngine = gate({
    assets,
    chunks,
    entryPattern: /^present-.*\.js$/,
    what: "the deck engine",
    missingFrom: engineMissingFrom,
    note: "the present window has no engine to drive, or is not holding the one that was bundled. See iss-2609061132369973 and the import at the top of src/present.ts.",
  });

  const global = globalReadIn(assets, chunks);
  if (global !== null) {
    console.error(
      `check-bundle: ${global} reads the deck engine off a global. The ES-module build assigns none, so that read answers undefined in the shipped window — which is the whole of iss-2609061132369973. Import the engine instead.`,
    );
  }
  return keymap === 0 && deckEngine === 0 && global === null ? 0 : 1;
}

process.exit(main());
