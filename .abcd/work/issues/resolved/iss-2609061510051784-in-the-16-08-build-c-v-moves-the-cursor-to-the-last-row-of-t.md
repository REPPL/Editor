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
resolution: "src/emacs.ts now binds C-v/M-v/PageDown/PageUp/C-Down/C-Up to a new scrollByPage that scrolls scrollDOM directly and leaves point alone, instead of the package's cursorPageDown/cursorPageUp which jumped point to the chapter's last/first line; and 'preview' was added to APP_COMMAND_IDS so C-c C-v reaches editor:preview through the C-c prefix chain instead of falling through unclaimed"
impact: fix
---

In the 16:08 build C-v moves the cursor to the last row of the chapter instead of scrolling down one page as Emacs's scroll-up-command does, and C-c C-v does the same instead of opening the article preview: the C-v after the C-c prefix is answered by the page-down command rather than by the prefix chain, so the preview row is unreachable from the keyboard

## Grounds

- pursued: a jsdom test presses C-v on a 200-line chapter and expects scrollDOM.scrollTop to increase while point stays exactly where it was rather than jumping to the document end, and a second test registers a preview command and expects C-c C-v to call it exactly once while leaving the chapter text untouched; both were written failing against the unmodified package first and turned green only after the src/emacs.ts change — a regression would show as either test failing again, or as the byte-fidelity sweep in emacs-keys.test.ts breaking if the new scroll commands ever mutated document text
