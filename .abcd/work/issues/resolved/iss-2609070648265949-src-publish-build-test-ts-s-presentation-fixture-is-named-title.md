---
schema_version: 1
id: "iss-2609070648265949"
slug: "src-publish-build-test-ts-s-presentation-fixture-is-named-title"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "src/publish/build.test.ts"
resolution: "the build and export-panel test fixtures now carry invented titles"
impact: internal
---

src/publish/build.test.ts's presentation() fixture is named, titled and headed after the real examples/an example folder folder, which the new no-examples-reference rule and AGENTS.md's privacy rule both forbid

## Grounds

- pursued: no tracked test names an example document; wrong if a grep for the example names finds one
