---
schema_version: 1
id: "iss-2609052115254279"
slug: "an-overlay-cycled-away-from-with-c-x-o-keeps-its-document-le"
severity: "critical"
category: "bug"
source: "user-observation"
found_during: "three-reviewer-code-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/focus.ts"
---

An overlay cycled away from with C-x o keeps its document-level key listener: with the quit confirmation open, C-x o then Return in the editor quits and discards the edit (reproduced by a reviewer); the same holds for M-x, the insert palette, the prompts, and the export panel
