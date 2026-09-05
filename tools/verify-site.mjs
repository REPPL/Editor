#!/usr/bin/env node
/*
 * Verify a built presenter site.
 *
 * Four claims, checked against the files as they sit in the repository:
 *
 *   - the not-found page is byte for byte the shell, so a wrong address and
 *     the root show the same empty page;
 *   - every entry at the site root is a reserved name or a well-formed id, so
 *     nothing at the root names a document;
 *   - every `latest.json` names a hash whose version folder exists, so no
 *     stable link points at a version that is not there;
 *   - no file is over the host's per-file ceiling.
 *
 * Usage: node tools/verify-site.mjs <site directory>
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

/** Sixteen bytes, base32, lower-cased and unpadded. */
const NAME = /^[a-z2-7]{26}$/;

/** What may sit at the site root beside a document id. */
const RESERVED = new Set([
  "index.html",
  "404.html",
  "robots.txt",
  "_headers",
  "presenter",
]);

/** The host's per-file ceiling. */
const CEILING_BYTES = 25 * 1024 * 1024;

const failures = [];

function fail(message) {
  failures.push(message);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function checkShell(site) {
  const shell = await readFile(join(site, "index.html"));
  const notFound = await readFile(join(site, "404.html"));
  if (!shell.equals(notFound)) {
    fail("404.html is not byte-identical to index.html");
  }
}

async function checkRoot(site) {
  for (const entry of await readdir(site)) {
    if (RESERVED.has(entry) || NAME.test(entry)) {
      continue;
    }
    fail(`no_root_entry_outside_the_reserved_names: ${entry}`);
  }
}

async function checkLatest(site) {
  for (const id of await readdir(site)) {
    if (!NAME.test(id)) {
      continue;
    }
    for (const token of await readdir(join(site, id))) {
      if (!NAME.test(token)) {
        fail(`not a token: ${id}/${token}`);
        continue;
      }
      const stable = join(site, id, token);
      const latest = join(stable, "latest.json");
      if (!(await exists(latest))) {
        fail(`no latest.json under ${id}/${token}`);
        continue;
      }
      let hash;
      try {
        hash = JSON.parse(await readFile(latest, "utf8")).hash;
      } catch (error) {
        fail(`latest.json will not parse under ${id}/${token}: ${error.message}`);
        continue;
      }
      if (typeof hash !== "string" || !NAME.test(hash)) {
        fail(`latest.json names no version under ${id}/${token}`);
        continue;
      }
      if (!(await exists(join(stable, "v", hash)))) {
        fail(`latest.json names a version that is not there: ${id}/${token}/${hash}`);
      }
    }
  }
}

async function checkCeiling(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkCeiling(path);
      continue;
    }
    const { size } = await stat(path);
    if (size > CEILING_BYTES) {
      fail(`over the per-file ceiling: ${path} (${size} bytes)`);
    }
  }
}

const site = process.argv[2];
if (!site) {
  process.stderr.write("usage: node tools/verify-site.mjs <site directory>\n");
  process.exit(2);
}
if (!(await exists(site))) {
  process.stderr.write(`no such directory: ${site}\n`);
  process.exit(2);
}

await checkShell(site);
await checkRoot(site);
await checkLatest(site);
await checkCeiling(site);

if (failures.length > 0) {
  for (const failure of failures) {
    process.stderr.write(`${failure}\n`);
  }
  process.exit(1);
}
process.stdout.write(`${site}: verified\n`);
