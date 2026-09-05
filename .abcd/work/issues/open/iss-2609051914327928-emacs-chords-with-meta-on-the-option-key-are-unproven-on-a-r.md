---
schema_version: 1
id: "iss-2609051914327928"
slug: "emacs-chords-with-meta-on-the-option-key-are-unproven-on-a-r"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: "src/keys.ts"
---

Emacs chords with Meta on the Option key are unproven on a real macOS WebView: the spike derives chords from the key code, but whether Option-letter reaches the page before macOS composes a character, and whether the dead-key combinations (Option-e, u, i, n, backtick) are claimed without starting an accent, has only been tested in jsdom. The maintainer requires them to work

## Observations from the maintainer, 2026-09-05 evening

- After the Option guard landed, Option-f still does nothing in the running
  app (Control-f moves by a letter as expected). Diagnosis by the
  orchestrator: on macOS the Option-f keydown carries `key: "ƒ"` with
  `code: "KeyF"`; the vendored Emacs keymap derives its key name from
  `event.key` for letters, so it sees `M-ƒ`, matches nothing, and the
  lowest-precedence guard then claims the event so the character never
  types but no command runs. The jsdom tests simulated Option chords with
  `key: "f"`, which is not what WebKit sends.
