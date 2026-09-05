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
 * Usage: node tools/check-bundle.mjs [dist directory]
 */

import { readFileSync, readdirSync } from "node:fs";
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
 * The package's own command table.
 *
 * A property name rather than an identifier, because minifiers do not rename
 * property names: `unsetTransientMark` is the first command the package
 * registers and it is registered nowhere else in the tree.
 */
const ADD_COMMANDS = /\.addCommands\(\s*\{\s*unsetTransientMark\b/;

/** The command `src/emacs.ts` asks for at run time to see the same thing. */
const RUNTIME_WITNESS = "killLine";

/** What one source is missing, as a list of names. Empty means it is whole. */
function missingFrom(source) {
  const missing = [];
  if (!BIND_LOOP.test(source)) missing.push("the package's bindKey loop");
  if (!ADD_COMMANDS.test(source)) missing.push("the package's addCommands call");
  if (!source.includes(RUNTIME_WITNESS)) {
    missing.push(`the ${RUNTIME_WITNESS} command the running application looks for`);
  }
  return missing;
}

/** Every built chunk in a dist folder, by name. */
function chunksIn(assets) {
  return readdirSync(assets).filter((name) => name.endsWith(".js"));
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
  for (const name of entries) {
    const source = readFileSync(join(assets, name), "utf8");
    const missing = missingFrom(source);
    if (missing.length > 0) failures.push({ name, missing });
  }

  if (failures.length === 0) {
    console.log(
      `check-bundle: the Emacs keymap is installed in ${entries.join(", ")}.`,
    );
    return 0;
  }

  for (const { name, missing } of failures) {
    console.error(`check-bundle: ${name} is missing ${missing.join(", ")}.`);
    // Where else it landed is the useful next question: a chunk split moves
    // the calls without dropping them, and that is a different repair.
    const elsewhere = chunks
      .filter((other) => !entries.includes(other))
      .filter((other) => missingFrom(readFileSync(join(assets, other), "utf8")).length === 0);
    if (elsewhere.length > 0) {
      console.error(
        `check-bundle: it is whole in ${elsewhere.join(", ")}, so the entry chunk moved rather than the keymap being dropped.`,
      );
    }
  }
  console.error(
    "check-bundle: the bundler took @replit/codemirror-emacs's own installation for pure calls. See the treeshake note in vite.config.ts.",
  );
  return 1;
}

process.exit(main());
