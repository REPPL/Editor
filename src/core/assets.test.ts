/**
 * The resolver seam, and the two shapes it refuses.
 *
 * "No machine in the document": an absolute path and a path that climbs above
 * the chapter both name the author's machine rather than the document, so both
 * resolve to nothing and are reported. A renderer never opens a file, so this
 * is the only place the rule can be kept.
 */

import { describe, expect, it } from "vitest";

import {
  classify,
  dataResolver,
  decodeReference,
  pathResolver,
  referencesOf,
} from "./assets";
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
    expect(classify("/Users/someone/lantern.jpg").kind).toBe("absolute"); // abcd-lint:allow illustrative refusal path
    expect(classify("C:\\Users\\someone\\lantern.jpg").kind).toBe("absolute");
    expect(classify("file:///Users/someone/lantern.jpg").kind).toBe("absolute"); // abcd-lint:allow illustrative refusal path
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

describe("reading a reference's escapes back", () => {
  it("reads an escaped name as the name on disk", () => {
    expect(decodeReference("assets/a%20lantern.jpg")).toBe("assets/a lantern.jpg");
    expect(decodeReference("assets/a%20lantern%20%281%29.jpg")).toBe(
      "assets/a lantern (1).jpg",
    );
    expect(decodeReference("assets/lantern.jpg")).toBe("assets/lantern.jpg");
  });

  it("refuses an escape that decodes to a climb or to a separator", () => {
    expect(decodeReference("%2e%2e/secrets.jpg")).toBeNull();
    expect(decodeReference("assets/%2E%2E/secrets.jpg")).toBeNull();
    expect(decodeReference("assets/one%2Ftwo.jpg")).toBeNull();
    expect(decodeReference("assets/one%5Ctwo.jpg")).toBeNull();
    expect(decodeReference("assets/%zz.jpg")).toBeNull();
    // A climb in plain sight is the classifier's to refuse, not this.
    expect(decodeReference("../secrets.jpg")).toBe("../secrets.jpg");
  });
});

describe("resolving", () => {
  it("reports an absolute or climbing reference and resolves nothing", () => {
    const resolve = pathResolver();
    const absolute = resolve("/Users/someone/lantern.jpg"); // abcd-lint:allow illustrative refusal path
    expect(absolute.url).toBeNull();
    expect(absolute.problem).toMatch(/absolute path/);
    const climbing = resolve("../secrets/lantern.jpg");
    expect(climbing.url).toBeNull();
    expect(climbing.problem).toMatch(/above the chapter/);
  });

  it("resolves a relative reference to the path the site copied it to", () => {
    expect(pathResolver("assets/")("assets/lantern.jpg").url).toBe("assets/assets/lantern.jpg");
    expect(pathResolver("")("assets/lantern.jpg").url).toBe("assets/lantern.jpg");
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

  it("resolves an escaped reference to the file the name belongs to", () => {
    // The drop wrote `assets/a%20lantern.jpg`; the copy on disk is called
    // `a lantern.jpg`, and that is what the shell reads and answers about.
    const resolve = dataResolver(
      new Map([["assets/a lantern.jpg", "data:image/jpeg;base64,BBBB"]]),
    );
    expect(resolve("assets/a%20lantern.jpg").url).toBe("data:image/jpeg;base64,BBBB");
    expect(pathResolver()("assets/a%20lantern.jpg").url).toBe("assets/a lantern.jpg");
  });

  it("refuses a reference whose escapes decode to a climb", () => {
    const refused = dataResolver(new Map())("%2e%2e/x.jpg");
    expect(refused.url).toBeNull();
    expect(refused.problem).toMatch(/escapes/);
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
