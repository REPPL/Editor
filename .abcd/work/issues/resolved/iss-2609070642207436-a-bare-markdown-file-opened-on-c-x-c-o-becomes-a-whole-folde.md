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
resolution: "the shell now remembers a bare-file open (open_source::SingleFileRoot) and open_folder rebuilds through read_single_chapter for a root that matches; the watcher over a bare file is narrowed to the file itself; proven in src-tauri/src/open_source.rs and src/open-source.test.ts"
impact: fix
---

A bare Markdown file opened on C-x C-o becomes a whole-folder walk on the first reload, which the author's own save triggers through the folder watcher, so the sidebar fills with every sibling file

## Grounds

- pursued: a reload of a bare-file document, however triggered, shows exactly the one chapter it opened with; shown wrong by a reload test that stubs a fuller tree and finds the sidebar rows changed
