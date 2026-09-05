/**
 * The reference page is generated, so it must not be able to fall behind.
 *
 * `docs/reference-the-markdown-canon.md` writes out two of this directory's
 * tables — the insert forms and the placement table. Change either table and
 * forget the page, and the page is quietly wrong; this holds the page against
 * the generator so the forgetting fails loudly instead.
 *
 * The generator is run as a process rather than imported: it is a `.mjs` tool
 * outside `tsconfig.json`'s programme, and its check mode is exactly what
 * `npm run lint` runs, so the test and the lint gate cannot diverge.
 */

import { spawnSync } from "node:child_process";
import process from "node:process";
import { describe, expect, it } from "vitest";

/** Vitest runs from the repository root, as the other tests here assume. */
const GENERATOR = "tools/generate-canon-reference.mjs";

describe("the generated Markdown canon reference", () => {
  it("is what the generator would write today", () => {
    const run = spawnSync(process.execPath, [GENERATOR, "--check"], {
      encoding: "utf8",
    });
    expect(run.error).toBeUndefined();
    // The generator prints the diff, so a failure says what drifted.
    expect(`${run.stderr}${run.stdout}`.trim()).toBe("");
    expect(run.status).toBe(0);
  }, 60_000);
});
