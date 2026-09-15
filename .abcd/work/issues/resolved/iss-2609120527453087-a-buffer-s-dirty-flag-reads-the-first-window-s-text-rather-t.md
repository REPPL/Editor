---
schema_version: 1
id: "iss-2609120527453087"
slug: "a-buffer-s-dirty-flag-reads-the-first-window-s-text-rather-t"
severity: "minor"
category: "bug"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/app.ts"
resolution: "A buffer now records the window that last carried a change into it while it still shows it, written from that window's own update listener before the refresh, and bufferText asks that window first and any window on the buffer after, so app.dirty, save and confirmClose are authoritative rather than only the modeline's flag. The test appends its own update listener to the second window and reads app.dirty inside the update the change arrives in, which is the only moment the stale answer exists; reverting reports false where true is right"
impact: fix
resolved_by:
  spec: "spc-2609111105376860"
---

A buffer's dirty flag reads the first window's text rather than the one that just changed: refresh runs in the originating view's update listener before the echo reaches peers, so when the typing window is not first in insertion order anyDirty and reportDirty see a peer's stale text for one call and correct on the next listener, giving a spurious dirty flip per keystroke in some layouts

## Grounds

- pursued: making the read authoritative at its source is smaller than threading a window id through every caller, and it fixes the answer for save and the close prompt rather than only for the modeline; wrong if a change can reach a buffer from a window that is no longer showing it
