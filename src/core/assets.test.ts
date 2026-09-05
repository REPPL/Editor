/**
 * The resolver seam, and the two shapes it refuses.
 *
 * "No machine in the document": an absolute path and a path that climbs above
 * the chapter both name the author's machine rather than the document, so both
 * resolve to nothing and are reported. A renderer never opens a file, so this
 * is the only place the rule can be kept.
 */

import { describe, expect, it } from "vitest";

import { classify, dataResolver, pathResolver, referencesOf, siteResolver } from "./assets";
import { parseChapter } from "./parse";

describe("classifying a reference", () => {
  it("reads a path beside the chapter as relative", () => {
    expect(classify("assets/lantern.jpg")).toMatchObject({
      kind: "relative",
      path: "assets/lantern.jpg",
    });
    expect(classify("./assets/lantern.jpg").path).toBe("assets/lantern.jpg");
  });

  it("reads an absolute path as absolute, whichever platform wrote it", () => {
    expect(classify("/Users/someone/lantern.jpg").kind).toBe("absolute");
    expect(classify("C:\\Users\\someone\\lantern.jpg").kind).toBe("absolute");
    expect(classify("file:///Users/someone/lantern.jpg").kind).toBe("absolute");
  });

  it("reads a path that climbs above the chapter as climbing", () => {
    expect(classify("../lantern.jpg").kind).toBe("climbing");
    expect(classify("assets/../../lantern.jpg").kind).toBe("climbing");
    // A climb the path pays back stays inside the chapter's folder.
    expect(classify("assets/../lantern.jpg")).toMatchObject({
      kind: "relative",
      path: "lantern.jpg",
    });
  });

  it("reads a URL as remote and an empty reference as empty", () => {
    expect(classify("https://example.org/lantern.jpg").kind).toBe("remote");
    expect(classify("data:image/png;base64,AAAA").kind).toBe("remote");
    expect(classify("   ").kind).toBe("empty");
  });
});

describe("resolving", () => {
  it("reports an absolute or climbing reference and resolves nothing", () => {
    const resolve = pathResolver();
    const absolute = resolve("/Users/someone/lantern.jpg");
    expect(absolute.url).toBeNull();
    expect(absolute.problem).toMatch(/absolute path/);
    const climbing = resolve("../secrets/lantern.jpg");
    expect(climbing.url).toBeNull();
    expect(climbing.problem).toMatch(/above the chapter/);
  });

  it("resolves a relative reference to the path the site copied it to", () => {
    expect(siteResolver("assets/")("assets/lantern.jpg").url).toBe("assets/assets/lantern.jpg");
    expect(siteResolver("")("assets/lantern.jpg").url).toBe("assets/lantern.jpg");
  });

  it("resolves a relative reference to the bytes the shell read", () => {
    const resolve = dataResolver(
      new Map([["assets/lantern.jpg", "data:image/jpeg;base64,AAAA"]]),
    );
    expect(resolve("assets/lantern.jpg").url).toBe("data:image/jpeg;base64,AAAA");
    // A picture the shell refused resolves to nothing and says so.
    const missing = resolve("assets/winter.jpg");
    expect(missing.url).toBeNull();
    expect(missing.problem).toMatch(/no copy/);
  });

  it("leaves a URL as the author wrote it", () => {
    expect(pathResolver("assets/")("https://example.org/l.jpg").url).toBe(
      "https://example.org/l.jpg",
    );
  });
});

describe("the references a chapter holds", () => {
  it("lists every image once, in source order", () => {
    const chapter = parseChapter(
      [
        "![One](assets/one.jpg)",
        "",
        "Prose with ![two](assets/two.jpg) inside it.",
        "",
        "![One again](assets/one.jpg)",
        "",
      ].join("\n"),
    );
    expect(referencesOf(chapter)).toEqual(["assets/one.jpg", "assets/two.jpg"]);
  });
});
