---
schema_version: 1
id: "iss-2609151509280846"
slug: "with-no-variants-declared-the-preview-and-a-publish-disagree"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "intent-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/preview.ts"
---

With no variants declared, the preview and a publish disagree on a marked block: the preview passes a null variant and inVariant admits every marked block, while publish renders the default variant through belongsTo and excludes every marked block. The renderings-agree discipline is violated on that shape. Found by the design review of itd-2609051335537470
