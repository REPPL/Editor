import { describe, expect, it } from "vitest";

import {
  canonicalListing,
  decodeBase32,
  encodeBase32,
  IDENTIFIER_BYTES,
  IDENTIFIER_LENGTH,
  isIdentifier,
  mintIdentifier,
  sha256HexOfText,
  versionHash,
} from "./identity";

/**
 * The vectors below are the same in `src-tauri/src/publish/identity.rs`, so
 * the shell's grammar and the page's cannot drift apart.
 */

describe("base32", () => {
  it("writes sixteen bytes as twenty-six characters", () => {
    expect(encodeBase32(new Uint8Array(IDENTIFIER_BYTES))).toHaveLength(
      IDENTIFIER_LENGTH,
    );
  });

  it("encodes the two extremes", () => {
    expect(encodeBase32(new Uint8Array(16))).toBe("a".repeat(26));
    expect(encodeBase32(new Uint8Array(16).fill(0xff))).toBe(
      "77777777777777777777777774",
    );
  });

  it("agrees with RFC 4648, lower-cased and unpadded", () => {
    const encoder = new TextEncoder();
    expect(encodeBase32(encoder.encode("f"))).toBe("my");
    expect(encodeBase32(encoder.encode("fo"))).toBe("mzxq");
    expect(encodeBase32(encoder.encode("foo"))).toBe("mzxw6");
    expect(encodeBase32(encoder.encode("foob"))).toBe("mzxw6yq");
    expect(encodeBase32(encoder.encode("fooba"))).toBe("mzxw6ytb");
    expect(encodeBase32(encoder.encode("foobar"))).toBe("mzxw6ytboi");
  });

  it("round-trips every byte value", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_value, index) => index);
    expect(Array.from(decodeBase32(encodeBase32(bytes)))).toEqual(
      Array.from(bytes),
    );
  });

  it("refuses a character outside the alphabet", () => {
    expect(() => decodeBase32("a0a")).toThrow(/not base32/);
  });
});

describe("the identifier grammar", () => {
  it("accepts a minted identifier", () => {
    expect(isIdentifier(mintIdentifier())).toBe(true);
  });

  it("refuses the look-alike digits, upper case, and the wrong length", () => {
    expect(isIdentifier("0".repeat(26))).toBe(false);
    expect(isIdentifier("1".repeat(26))).toBe(false);
    expect(isIdentifier("8".repeat(26))).toBe(false);
    expect(isIdentifier("9".repeat(26))).toBe(false);
    expect(isIdentifier("A".repeat(26))).toBe(false);
    expect(isIdentifier("a".repeat(25))).toBe(false);
    expect(isIdentifier("a".repeat(27))).toBe(false);
    expect(isIdentifier("")).toBe(false);
  });

  it("refuses the brief's old sixty-four-bit example", () => {
    expect(isIdentifier("7f3a91c2e4d85b06")).toBe(false);
  });

  it("refuses the reserved segments the presenter routes on", () => {
    expect(isIdentifier("v")).toBe(false);
    expect(isIdentifier("slides")).toBe(false);
    expect(isIdentifier("assets")).toBe(false);
    expect(isIdentifier("presenter")).toBe(false);
  });

  it("mints sixteen bytes from the source it is given", () => {
    const minted = mintIdentifier((length) =>
      Uint8Array.from({ length }, (_value, index) => index),
    );
    expect(minted).toBe(encodeBase32(Uint8Array.from({ length: 16 }, (_v, i) => i)));
    expect(isIdentifier(minted)).toBe(true);
  });

  it("mints a different identifier each time", () => {
    const minted = new Set(
      Array.from({ length: 64 }, () => mintIdentifier()),
    );
    expect(minted.size).toBe(64);
  });
});

describe("the canonical listing", () => {
  it("writes one line per file, sorted by the path's bytes", () => {
    const listing = canonicalListing([
      { path: "slides/index.html", sha256: "bb" },
      { path: "index.html", sha256: "aa" },
      { path: "assets/01-beginnings/lantern.jpg", sha256: "cc" },
    ]);
    expect(listing).toBe(
      "cc  assets/01-beginnings/lantern.jpg\naa  index.html\nbb  slides/index.html\n",
    );
  });

  it("is a function of content and layout alone", async () => {
    const entries = [
      { path: "index.html", sha256: await sha256HexOfText("<h1>a</h1>\n") },
    ];
    expect(canonicalListing(entries)).toBe(canonicalListing([...entries]));
  });
});

describe("the version hash", () => {
  it("hashes a known tree to a known name", async () => {
    const entries = [
      {
        path: "index.html",
        sha256: await sha256HexOfText("<h1>The Lantern Papers</h1>\n"),
      },
      {
        path: "slides/index.html",
        sha256: await sha256HexOfText(
          "<section>The Lantern Papers</section>\n",
        ),
      },
    ];
    expect(await versionHash(entries)).toBe("fsirhjtwyqgsgh2gvayaqgtmwy");
  });

  it("does not depend on the order the files arrive in", async () => {
    const entries = [
      { path: "index.html", sha256: "aa" },
      { path: "slides/index.html", sha256: "bb" },
    ];
    expect(await versionHash(entries)).toBe(
      await versionHash([...entries].reverse()),
    );
  });

  it("changes when one byte of one file changes", async () => {
    const first = await versionHash([
      { path: "index.html", sha256: await sha256HexOfText("a") },
    ]);
    const second = await versionHash([
      { path: "index.html", sha256: await sha256HexOfText("b") },
    ]);
    expect(first).not.toBe(second);
  });

  it("changes when a file moves", async () => {
    const digest = await sha256HexOfText("a");
    expect(await versionHash([{ path: "index.html", sha256: digest }])).not.toBe(
      await versionHash([{ path: "slides/index.html", sha256: digest }]),
    );
  });

  it("is an identifier like any other", async () => {
    expect(isIdentifier(await versionHash([]))).toBe(true);
  });
});

describe("sha256", () => {
  it("agrees with the published vectors", async () => {
    expect(await sha256HexOfText("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(await sha256HexOfText("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
