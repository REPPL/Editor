---
schema_version: 1
id: "iss-2609100519025566"
slug: "runbinding-resolves-a-row-by-chord-against-codemirror-s-unfi"
severity: "minor"
category: "bug"
source: "agent-observation"
found_during: "building spc-2609091733496272"
origin: researcher-authored
production_mode: hand-written
found_at: "src/emacs.ts"
resolution: "One list, two readers. isSuppressedIn and withoutSuppressed in src/keys.ts were already the canonical answer; what was missing was a single list built from them — the surface built one inline and runBinding built none. codemirrorKeymap() in src/emacs.ts now holds it, src/editor.ts installs it in place of its three inline spreads, and runBinding's third resolution loop iterates it, so the two sites share the list and drift is impossible rather than merely unlikely. Placed in emacs.ts because keys.ts imports nothing and must stay that way, and editor.ts would have closed an import cycle. Proved by reverting the loop to the raw keymaps: the palette ran delete-backward in the chapter, visible as the lost space after the heading's hash"
impact: fix
---

runBinding resolves a row by chord against CodeMirror's unfiltered keymaps, so a row whose chord is suppressed in that keymap can reach the very command the suppression exists to prevent. Found while building spc-2609091733496272: the new prefix-help row carries C-h, which is a SUPPRESSED entry with where codemirror precisely so that CodeMirror's delete-backward cannot answer it. The editing surface honours that through withoutSuppressed, but runBinding's third resolution loop iterates defaultKeymap, historyKeymap and searchKeymap raw, and defaultKeymap carries Ctrl-h, so choosing What can follow this prefix from M-x would have deleted a character in the chapter instead of refusing. The reachable case is closed in that spec by registering an editor-owned command for the row, which resolves at the first step and never reaches the keymap loop; the general asymmetry between withoutSuppressed and runBinding is untouched and is what this record is for.

## Grounds

- pursued: a suppression enforced in one place and consulted from every reader cannot be bypassed by the next row that carries a suppressed chord, which is the general fault rather than the C-h instance already closed; wrong if a fourth keymap is added to the surface without being added to codemirrorKeymap, which would reopen the gap silently
