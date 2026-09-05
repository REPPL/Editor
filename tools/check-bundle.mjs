#!/usr/bin/env node
/*
 * Check that the built bundle still carries the Emacs keymap.
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

  const entries = chunks.filter((name) => /^main-.*\.js$/.test(name));
  if (entries.length === 0) {
    console.error(
      `check-bundle: no main-*.js in ${assets}. The build wrote ${
        chunks.length === 0 ? "no chunk at all" : chunks.join(", ")
      }.`,
    );
    return 1;
  }

  const failures = [];
  const installed = [];
  for (const entry of entries) {
    // The entry and everything it loads: which of them carries the keymap is
    // the bundler's business, and a chunk split is not a keymap being dropped.
    const reachable = graphFrom(assets, entry);
    const carrier = reachable.find(
      (name) => missingFrom(readFileSync(join(assets, name), "utf8")).length === 0,
    );
    if (carrier === undefined) {
      failures.push({
        entry,
        reachable,
        missing: missingFrom(readFileSync(join(assets, entry), "utf8")),
      });
    } else {
      installed.push(carrier === entry ? carrier : `${carrier} (loaded by ${entry})`);
    }
  }

  if (failures.length === 0) {
    console.log(
      `check-bundle: the Emacs keymap is installed in ${installed.join(", ")}.`,
    );
    return 0;
  }

  for (const { entry, reachable, missing } of failures) {
    console.error(
      `check-bundle: nothing ${entry} loads carries the Emacs keymap. ${entry} itself is missing ${missing.join(", ")}.`,
    );
    console.error(
      `check-bundle: it loads ${reachable.length === 1 ? "no other chunk" : reachable.slice(1).join(", ")}.`,
    );
    // Where else it landed is the useful next question: a chunk the entry does
    // not load is a wiring problem, and that is a different repair.
    const elsewhere = chunks
      .filter((other) => !reachable.includes(other))
      .filter((other) => missingFrom(readFileSync(join(assets, other), "utf8")).length === 0);
    if (elsewhere.length > 0) {
      console.error(
        `check-bundle: it is whole in ${elsewhere.join(", ")}, which ${entry} does not load, so the wiring moved rather than the keymap being dropped.`,
      );
    }
  }
  console.error(
    "check-bundle: the bundler took @replit/codemirror-emacs's own installation for pure calls. See the treeshake note in vite.config.ts.",
  );
  return 1;
}

process.exit(main());
