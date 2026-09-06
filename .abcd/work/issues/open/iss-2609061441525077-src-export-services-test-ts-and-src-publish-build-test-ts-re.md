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
---

src/export/services.test.ts and src/publish/build.test.ts read chapters from examples/ via readFileSync at collection time, so both fail on any machine or CI run where examples/ is absent now that iss-2609061418065651 untracked and gitignored that folder
