---
schema_version: 1
id: "iss-2609070642207436"
slug: "a-bare-markdown-file-opened-on-c-x-c-o-becomes-a-whole-folde"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "three-reviewer-code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src-tauri/src/open_source.rs"
---

A bare Markdown file opened on C-x C-o becomes a whole-folder walk on the first reload, which the author's own save triggers through the folder watcher, so the sidebar fills with every sibling file
