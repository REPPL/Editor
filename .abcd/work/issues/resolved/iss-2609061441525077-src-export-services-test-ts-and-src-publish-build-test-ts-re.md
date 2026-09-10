---
schema_version: 1
id: "iss-2609061441525077"
slug: "src-export-services-test-ts-and-src-publish-build-test-ts-re"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "src/export/services.test.ts"
resolution: "Replaced the examples/-folder readFileSync fixtures in src/publish/build.test.ts and src/export/services.test.ts with synthetic in-file chapter text, so neither test depends on a folder that is now gitignored."
impact: internal
---

src/export/services.test.ts and src/publish/build.test.ts read chapters from examples/ via readFileSync at collection time, so both fail on any machine or CI run where examples/ is absent now that iss-2609061418065651 untracked and gitignored that folder

## Grounds

- pursued: both files' presentation()/document() fixtures now build DocumentSource trees from inline Markdown strings with the same shape (two chapters, one Part, headings, sections and one image reference each) the assertions needed; ran both files and the full suite, all passing with no disk read outside the repo's own committed site/ and core/ files.
