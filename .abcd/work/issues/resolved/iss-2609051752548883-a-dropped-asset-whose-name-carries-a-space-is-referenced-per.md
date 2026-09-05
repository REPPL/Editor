---
schema_version: 1
id: "iss-2609051752548883"
slug: "a-dropped-asset-whose-name-carries-a-space-is-referenced-per"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "intent-audit"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src-tauri/src/present.rs"
resolution: "Decoded once per side; published copies renamed to percent-safe names"
impact: fix
shipped_in: v0.1.0
resolved_by:
  intent: "itd-2609051335420536"
  spec: "spc-2609051353405598"
  commit: "71a19bb"
---

A dropped asset whose name carries a space is referenced percent-encoded but the preview read path never decodes it, so the image cannot resolve in Present (intent audit rcp-3e7bc007f8f8, ac-3 NOT_MET)

## Grounds

- pursued: one decode at the seam where a file is opened keeps every reference the author wrote intact and makes page and file agree; wrong if a host server decodes a second time
