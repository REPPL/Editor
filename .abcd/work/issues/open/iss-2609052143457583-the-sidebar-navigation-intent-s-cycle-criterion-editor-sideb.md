---
schema_version: 1
id: "iss-2609052143457583"
slug: "the-sidebar-navigation-intent-s-cycle-criterion-editor-sideb"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "intent-audit"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: ".abcd/development/intents/shipped"
---

The sidebar-navigation intent's cycle criterion (editor, sidebar, panel, editor with a keys panel or palette open) is not met by design since the abandoned-overlay fix: an overlay is closed when the keyboard leaves it, so the three-step cycle holds only for the publish and settings panels; the audit records NOT_MET and the criterion wants amending to say so
