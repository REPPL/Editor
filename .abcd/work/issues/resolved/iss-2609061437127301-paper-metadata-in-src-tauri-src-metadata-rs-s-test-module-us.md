---
schema_version: 1
id: "iss-2609061437127301"
slug: "paper-metadata-in-src-tauri-src-metadata-rs-s-test-module-us"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "build"
origin: researcher-authored
production_mode: hand-written
found_at: "src-tauri/src/metadata.rs"
resolution: "fixed: PAPER_METADATA rewritten with real embedded newlines instead of \\n\\ continuations, so the block scalar keeps its indentation; both tests pass"
impact: internal
---

PAPER_METADATA in src-tauri/src/metadata.rs's test module uses Rust line-continuation escapes inside its YAML block-scalar abstract, which strips the continuation lines' leading indentation and breaks YAML parsing for reads_a_block_scalar_abstract and leaves_the_fill_column_absent_when_the_document_says_nothing

## Grounds

- pursued: cargo test now shows 225 passed, 0 failed, including reads_a_block_scalar_abstract and leaves_the_fill_column_absent_when_the_document_says_nothing; wrong if either test fails again
