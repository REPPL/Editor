---
schema_version: 1
id: "iss-2609061418065651"
slug: "the-example-documents-under-examples-are-tracked-in-a-public"
severity: "major"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "examples"
resolution: "examples untracked and ignored, every reference removed, a local-document harness added"
impact: internal
---

The example documents under examples/ are tracked in a public repository and named by code, tests, snapshots and docs, although they are the maintainer's own material needed only for local testing; untrack and ignore the folder, remove every reference to it from code and docs, drop the snapshots that embed its text, and let the tests that read local documents skip loudly when the folder is absent

## Grounds

- pursued: the maintainer's own documents stay local test material and the public tree names none of them; wrong if a test that needed real material now proves less than it did
