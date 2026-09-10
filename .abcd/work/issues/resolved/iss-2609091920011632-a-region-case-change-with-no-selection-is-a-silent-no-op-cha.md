---
schema_version: 1
id: "iss-2609091920011632"
slug: "a-region-case-change-with-no-selection-is-a-silent-no-op-cha"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "code-review"
origin: researcher-authored
production_mode: hand-written
found_at: "src/emacs.ts"
resolution: "Both region case chords move into APP_COMMAND_IDS and changeCaseRegion is exported returning a refusal string or null, run through the one existing prose wrapper so the mechanism stays in the Emacs layer and the announcement stays in the application. No second channel, no app state in the keymap layer. One message for both chords, in the house voice and without a full stop. This reverses the 2026-09-09 decision that rejected APP_COMMAND_IDS for these rows, whose reasoning held only while the pair had nothing to say"
impact: fix
---

A region case change with no selection is a silent no-op: changeCase with region true maps over collapsed ranges and writes the empty string back over nothing, so C-x C-u and C-x C-l swallow the chord and report nothing, where GNU Emacs signals mark-is-not-active; the chord is claimed so the browser does not act on it, which makes the silence a claim with nothing behind it

## Grounds

- pursued: a chord that is claimed so the platform does not act on it owes the author a reason when it does nothing, and the refusal belongs in one place for both directions; wrong if GNU Emacs's own mark-is-not-active signal turns out to carry information the single sentence does not
