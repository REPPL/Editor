/**
 * `documentScopeOf`: the value `PreviewSource.documentScope` carries.
 *
 * A document's own root must fold to the same scope every time, and two
 * different roots must fold to two different scopes — the whole guarantee
 * `iss-2609070642209805`'s fix over the preview window's per-document
 * memory rests on (`article-eggs.js`'s once-only opening and collected
 * eggs). Nothing else here is under test: the rest of this module is thin
 * `invoke` wrappers with no logic of their own to prove.
 */

import { describe, expect, it } from "vitest";

import { documentScopeOf } from "./doctree";

describe("documentScopeOf", () => {
  it("is a lower-case hex digest, and never the root it was given", async () => {
    const scope = await documentScopeOf("/documents/the-lantern-papers");
    expect(scope).toMatch(/^[0-9a-f]{16}$/);
    expect(scope).not.toContain("lantern");
    expect(scope).not.toContain("/");
  });

  it("folds the same root to the same scope, every time", async () => {
    const first = await documentScopeOf("/documents/the-lantern-papers");
    const second = await documentScopeOf("/documents/the-lantern-papers");
    expect(first).toBe(second);
  });

  it("folds two different roots to two different scopes", async () => {
    const first = await documentScopeOf("/documents/the-lantern-papers");
    const second = await documentScopeOf("/documents/a-second-document");
    expect(first).not.toBe(second);
  });
});
