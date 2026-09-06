---
schema_version: 1
id: "iss-2609061510051784"
slug: "in-the-16-08-build-c-v-moves-the-cursor-to-the-last-row-of-t"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/emacs.ts"
---

In the 16:08 build C-v moves the cursor to the last row of the chapter instead of scrolling down one page as Emacs's scroll-up-command does, and C-c C-v does the same instead of opening the article preview: the C-v after the C-c prefix is answered by the page-down command rather than by the prefix chain, so the preview row is unreachable from the keyboard
