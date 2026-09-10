/**
 * The build gate, over the artefact that actually ships.
 *
 * `tools/check-bundle.mjs` is exercised over hand-written fixtures elsewhere:
 * the keymap gate in `emacs-keys.test.ts`, the deck-engine gate in
 * `present.test.ts`. A fixture proves the gate reads what it says it reads. It
 * cannot prove the gate reads the *emitted* file, because a fixture is written
 * by the same hand that wrote the pattern and passes by construction — which
 * is how `iss-2609061132369973` shipped past a green suite in the first place.
 *
 * So this file closes that gap from both ends: the gate is run over the real
 * `dist/` whenever the working tree has one, and the question the fixtures
 * were loosest about — whether the accessor is what the mount *defaults* to,
 * or merely a name the chunk mentions — is asked of a bundle that mentions it
 * and nothing more.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

/** The gate itself, as `npm run build` runs it. */
const GATE = join(process.cwd(), "tools/check-bundle.mjs");

/** Run the gate over one folder shaped like `dist`. */
function runGate(dist: string): { code: number; output: string } {
  try {
    return {
      code: 0,
      output: execFileSync(process.execPath, [GATE, dist], {
        encoding: "utf8",
        stdio: "pipe",
      }),
    };
  } catch (error) {
    const failure = error as { status?: number; stderr?: string };
    return { code: failure.status ?? 1, output: failure.stderr ?? "" };
  }
}

/** A keymap chunk the keymap gate passes, so only the engine gate speaks. */
const KEYMAP = [
  "const Ww={a:1};class Q{static bindKey(){}static addCommands(){}}",
  "for(let e in Ww)Q.bindKey(e,Ww[e]);",
  "Q.addCommands({unsetTransientMark:function(){},killLine:function(){}});",
].join("\n");

/** The engine and the accessor, minified the way they ship. */
const ENGINE = [
  "class P{}var F=P;",
  'F.initialize=e=>(Object.assign(F,new P(document.querySelector(".reveal"),e)),F.initialize());',
  'function V(){return typeof F?.initialize==="function"?F:null}',
].join("\n");

/** Write one `dist` of named chunks in a temporary folder and gate it. */
function gateOver(chunks: Readonly<Record<string, string>>): {
  code: number;
  output: string;
} {
  const dist = mkdtempSync(join(tmpdir(), "check-bundle-mount-"));
  mkdirSync(join(dist, "assets"));
  for (const [name, source] of Object.entries({ "main-abc123.js": KEYMAP, ...chunks })) {
    writeFileSync(join(dist, "assets", name), source);
  }
  return runGate(dist);
}

describe("the gate's third question: what the mount defaults to", () => {
  it("passes a chunk whose mount takes the accessor as its default", () => {
    const mounted = `${ENGINE}\nfunction Me(e,t,n,r=V()){return r===null?t:(r.initialize({}),!0)}\nconsole.log(Me);`;
    const seen = gateOver({ "present-abc123.js": mounted });
    expect(seen.code, seen.output).toBe(0);
    expect(seen.output).toContain("the deck engine is installed");
  });

  it("fails a chunk that only mentions the accessor somewhere in a body", () => {
    // The honesty of the third question. `src/present.ts` calls `engine()` in
    // a function body as well as in the mount's parameter list, so a bundle
    // that lost the default but kept the body call still carries `=V()` — and
    // the mount then runs on whatever a caller passed, which in the shipped
    // window is nothing. Asked as a substring, this bundle passed.
    const bodyOnly = `${ENGINE}\nfunction Me(e,t,n,r){let i=V();return r===null?i:(r.initialize({}),!0)}\nconsole.log(Me);`;
    expect(bodyOnly).toContain("=V()");
    const seen = gateOver({ "present-abc123.js": bodyOnly });
    expect(seen.code).not.toBe(0);
    expect(seen.output).toContain("the mount defaulting to V()");
  });
});

describe("the gate over the built dist", () => {
  it("passes the bundle this working tree last built", (ctx) => {
    // The one run in this suite that reads an emitted file rather than a
    // fixture. A working tree that has not built yet has nothing to read, and
    // a skip that says so is honest where a silent pass would not be: the
    // gate still runs for real in `npm run build`, which is where a build
    // that dropped the keymap or the engine is stopped.
    const assets = join(process.cwd(), "dist", "assets");
    if (!existsSync(assets)) {
      ctx.skip("dist/assets is not here: run npm run build to read the emitted bundle");
      return;
    }
    const chunks = readdirSync(assets).filter((name) => name.endsWith(".js"));
    expect(chunks.some((name) => /^main-.*\.js$/.test(name)), chunks.join(", ")).toBe(true);
    expect(chunks.some((name) => /^present-.*\.js$/.test(name)), chunks.join(", ")).toBe(
      true,
    );

    const seen = runGate(join(process.cwd(), "dist"));
    expect(seen.code, seen.output).toBe(0);
    expect(seen.output).toContain("the Emacs keymap is installed");
    expect(seen.output).toContain("the deck engine is installed");
  });
});
