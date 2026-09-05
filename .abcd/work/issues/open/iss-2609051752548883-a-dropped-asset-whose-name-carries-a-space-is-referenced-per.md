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
---

A dropped asset whose name carries a space is referenced percent-encoded but the preview read path never decodes it, so the image cannot resolve in Present (intent audit rcp-3e7bc007f8f8, ac-3 NOT_MET)
