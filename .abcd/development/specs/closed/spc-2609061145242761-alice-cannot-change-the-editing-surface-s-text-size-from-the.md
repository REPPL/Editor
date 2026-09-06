---
id: spc-2609061145242761
slug: alice-cannot-change-the-editing-surface-s-text-size-from-the
intent: itd-2609061141039863
origin: researcher-authored
production_mode: dictated-and-formatted
---
# Make the text bigger or smaller from the keyboard

## Summary

This spec delivers map #33, `itd-2609061141039863`: three rows in the binding
table that make the editing surface's type bigger, smaller, and default again,
without moving the sidebar, the modeline, or any panel beside it. The scale is
a property of the CodeMirror view and nothing else — a theme extension held in
a compartment, reconfigured on each step, with the step itself in a state field
so the modeline and the tests can read it. Steps are a factor of 1.2, Emacs's
own, five either way and bounded at both ends; a chord at a bound changes
nothing and says so. The scale is remembered per machine in the settings file
the shell already keeps, through a new `text_scale` field and a
`set_text_scale` command, and it is written into no chapter and no
`document.yaml`.

## Scope

### In, by module

| Module | State | This spec |
|---|---|---|
| `src/text-scale.ts` | absent | new: the step, the bounds, the factor, the compartment-held theme, and the three commands as functions of the view |
| `src/keys.ts` | exists: 94 rows, `SUPPRESSED`, `scopeOf`, `chordIndexIn` | adds three `editor` rows in the `control` group; nothing else |
| `src/emacs.ts` | exists: `APP_COMMAND_IDS`, the handler wrapper, `REBOUND` | adds the three ids; teaches the wrapper the one chord the package's key reader swallows before it consults its own prefix chain |
| `src/editor.ts` | exists: `theme` at 14 px, `stateFor`, `setDocument` | names the base size once, seeds the compartment, and carries the step across a `setState` |
| `src/app.ts` | exists: `commands`, `announce`, `AppServices` | three command entries, a message that clears itself, and two optional services for reading and writing the scale |
| `src/settings.ts` | exists: `createSettingsServices` | adds `createTextScaleServices`, the mirror of the two commands |
| `src/settings-panel.ts` | exists: the `Settings` interface | adds `text_scale` to the interface, mirroring the Rust struct; the panel itself gains no field |
| `src/main.ts` | exists: the wiring | passes the two services into `createApp` |
| `src-tauri/src/settings.rs` | exists: `Settings`, `get_settings`, two setters | adds `text_scale`, `clamp_text_scale`, `set_text_scale_at`, and the `set_text_scale` command |
| `src-tauri/src/lib.rs` | exists: the invoke handler | one line: `settings::set_text_scale` |
| `src/text-scale.test.ts` | absent | new: every criterion below that a jsdom test can reach |
| `src/focus.test.ts`, `src/settings-panel.test.ts`, `src-tauri/src/publish/tests.rs` | exist | one line each: the `Settings` fixtures gain `text_scale` |

### Out

- The table's shape, the keys panel, the tooltips, the prefix machinery and the
  cancel contract: map #2, `itd-2609051335406422` (cond-2609061145244537).
  This spec adds rows and owns only what each does to the surface.
- The `M-x` palette, its filtering and its prompts: map #32,
  `itd-2609051934109483` (cond-2609061145241018). The three rows are listed and
  run there because every `editor` row is.
- The settings panel and the moment of typing a number into it: map #27,
  `itd-2609051402126424` (cond-2609061145240749). The scale gains no field in
  that panel.
- The deck's typography: map #5, `itd-2609051335447894` (cond-2609061145245151).
  The present window's type scale is untouched.
- A per-buffer scale, a second editing pane, and rebinding the three chords —
  the first two by assumption (cond-2609061145242133), the third open in
  `03-evidence.md`.

### Disciplines inherited

| Discipline | Proven here by |
|---|---|
| No machine in the document `itd-2609051336080960` | `src/text-scale.test.ts` › "writes the scale through the shell's settings and into no chapter"; `src-tauri/src/settings.rs` › `a_text_scale_round_trips_beside_the_other_machine_facts`, which writes into a configuration directory and nowhere else |
| Round-trip byte-fidelity `itd-2609051336074533` | `src/text-scale.test.ts` › "changes not one byte of the open chapter" over the hazardous fixture |
| Legible on three device classes `itd-2609051336128348` | `src/text-scale.test.ts` › "keeps the surface wrapping at every step"; manual check M33-1 at 390, 820 and 1280 |
| Network only on publish `itd-2609051336158553` | `src/text-scale.test.ts` › "attempts no network request while scaling" |
| One source, always `itd-2609051336090390` | the chords come from `bindingById`; the base size is named once in `src/text-scale.ts` and read by the theme |

## Design

### The scale, as a property of the view

`src/text-scale.ts` holds five numbers and nothing else that could disagree
with them:

```ts
export const BASE_FONT_SIZE_PX = 14;   // what the surface opens at
export const TEXT_SCALE_STEP = 1.2;    // Emacs's own step
export const TEXT_SCALE_LIMIT = 5;     // five steps either way
```

`factorFor(step)` is `TEXT_SCALE_STEP ** step`; `fontSizeFor(step)` is
`BASE_FONT_SIZE_PX * factorFor(step)` rounded to three decimals and written
with `px`, so step 0 is `14px` to the pixel and step 1 is `16.8px`, exactly
1.2 times it. `percentOf(step)` rounds `factorFor(step) * 100`, which makes
the range 40 % to 249 % — the figures the intent's Range condition names.

Two extensions, both built by `textScaleExtension(step)`:

- `textScaleField.init(() => step)`, a `StateField<number>` updated by a
  `StateEffect<number>`, so the step lives in the editor state where the
  modeline, the commands and the tests read it through `textScaleStep(view)`;
- `scaleCompartment.of(scaleTheme(step))`, where `scaleTheme(step)` is
  `Prec.highest(EditorView.theme({ "&": { fontSize: fontSizeFor(step) } }))`.

The precedence is not decoration. `EditorView.theme` mounts its style module in
facet order and the surface already carries a base theme setting `fontSize` on
the same `&` selector; without `Prec.highest` the two rules tie and the base
one wins. `&` is `view.dom`, the `.cm-editor` element, so every descendant —
content, gutters, the search panel — scales with it and nothing outside it can.

`setTextScale(view, step)` clamps to `±TEXT_SCALE_LIMIT`, dispatches the effect
and the `scaleCompartment.reconfigure` in one transaction, and returns whether
the step actually moved. That single return is what the bound criterion rests
on: a refusal is a `false`, not a silent no-op.

`src/editor.ts` names the base size once — its own theme reads
`fontSizeFor(0)` — and threads the step through `stateFor(doc, hooks, step)`,
so `setDocument` (a fresh `EditorState` per chapter, by that module's own
design note) re-seeds the compartment with `textScaleStep(view)` and opening a
chapter does not throw the scale away.

### Three rows, and the digit the package swallows

| id | label | chords | group | owner |
|---|---|---|---|---|
| `text-scale-increase` | Bigger text | `C-x C-=` | control | editor |
| `text-scale-decrease` | Smaller text | `C-x C--` | control | editor |
| `text-scale-reset` | Default text size | `C-x C-0` | control | editor |

All three are free: the table's `C-x` sequences are `u`, `r`, `h`, `k`, `o`,
`C-x`, `C-s`, `C-f`, `C-p`, `C-o`, `C-u`, `C-l`, `C-t`, `C-c`, `S-/`, `C-b` and
`C-r`. Behind the prefix, `C--` keeps redo and `C-=` stays unbound, which is
the intent's Mechanism written down. The three ids join `APP_COMMAND_IDS` in
`src/emacs.ts`, so each chord is bound from its row and `M-x` reaches it
through `runBinding` like every other `editor` row.

One of the three does not work through the package as it stands, and this is
the spec's one piece of surgery. `EmacsHandler.findCommand` reads a
Control-and-digit chord as the start of a numeric argument **before** it
consults its own key chain: after `C-x`, a `C-0` sets the count, returns a null
command, and leaves the chain half-open, so `C-x C-0` can never reach a
binding. This was measured against the shipped package, not assumed. The fix
sits beside `REBOUND`, in the module that already owns the package's spelling
defects: the `handleKeyboard` wrapper `trackHandlers` installs gains one
guard — when the chain is open, the event is Control-and-a-digit, and the chain
plus that key names a chord Editor itself registered, it runs that command,
clears the chain, and reports the event handled. It touches nothing the package
answers, because the map it consults holds only Editor's own chords.

### What the modeline says, and for how long

Each command announces through `App.announce`, in the message cell the modeline
already carries; the position and mark cells never move, which is what "returns
to showing her position and mode" means here. `src/app.ts` gains
`announceBriefly`, which announces and then clears after
`TRANSIENT_MESSAGE_MS` (1500) unless something else has spoken in the
meantime; its timer is cleared in `destroy`, so no message outlives the
application. The wording:

- a step: `Text scale 120%`;
- the top bound: `Text scale 249%, the largest step`;
- the bottom bound: `Text scale 40%, the smallest step`;
- the reset: `Text scale 100%`.

### Where the scale is kept

`Settings` in `src-tauri/src/settings.rs` gains `pub text_scale: i32`,
defaulting to 0 and documented as steps of 1.2 from the default rather than a
multiplier. `clamp_text_scale` bounds it to `-5..=5` on write *and* on read, so
a hand-edited `99` comes back as `5` instead of a surface nobody can read.
`set_text_scale_at(path, steps)` reads the settings whole, replaces the field,
writes them back through the existing `write_settings`, and returns the stored
`Settings`; the command is

```rust
#[tauri::command]
pub async fn set_text_scale(app: tauri::AppHandle, steps: i32) -> Result<Settings, String>
```

resolving its path through `path_for`, exactly as `set_asset_root` does — the
page never names the file. `src-tauri/src/lib.rs` gains one line in the invoke
handler.

The page reaches it through two optional services on `AppServices`,
`readTextScale?()` and `writeTextScale?(steps)`, supplied in `src/main.ts` by
`createTextScaleServices()` in `src/settings.ts` and absent everywhere else, so
a browser build and every existing test are untouched. On mount the application
reads the stored step and applies it; on each successful step it writes the new
one, and a failure is announced rather than swallowed. `SettingsServices` and
the settings panel's form are not widened: the only change on that side is
`text_scale` on the `Settings` interface, mirroring the struct.

## Acceptance Mapping

| Criterion | Proven by |
|---|---|
| Three rows in the keys panel and under `M-x`, each labelled, and a row run from `M-x` does what its chord does | `src/text-scale.test.ts` › "lists three labelled rows in the keys panel and in M-x", "runs each row from M-x with the effect of its chord" |
| `C-x C-=` once: the surface's computed font size is 1.2× what it was, and every other element's is exactly what it was | `src/text-scale.test.ts` › "enlarges the surface by 1.2 and moves nothing else on the page" |
| Twice up, once down, then `C-x C-0`: the default to the pixel, and the modeline shows the scale and then goes back | `src/text-scale.test.ts` › "returns to the default size to the pixel", "shows the scale in the modeline and then clears it" (fake timers) |
| Two steps up survive a restart; `get_settings` reports it; it sits in the configuration directory, not a document folder | `src/text-scale.test.ts` › "opens at the scale the shell remembers", "writes the scale through the shell's settings and into no chapter"; `src-tauri/src/settings.rs` › `a_text_scale_round_trips_beside_the_other_machine_facts`, `a_text_scale_is_bounded_on_the_way_in_and_on_the_way_out`, `a_text_scale_leaves_the_other_machine_facts_alone` |
| Three chords, no edit: the chapter's bytes unchanged, the buffer clean, `document.yaml` gains no key | `src/text-scale.test.ts` › "changes not one byte of the open chapter" |
| `C--` alone redoes and does not scale; `C-=` alone does not scale | `src/text-scale.test.ts` › "leaves redo on C-- and leaves C-= unbound" |
| At a bound the size does not change and the modeline says the limit is reached, at both ends | `src/text-scale.test.ts` › "stops at the largest step and says so", "stops at the smallest step and says so" |
| 390 px wide, a 544-character line, enlarged twice: the lines wrap, nothing scrolls sideways | `src/text-scale.test.ts` › "keeps the surface wrapping at every step" (the `cm-lineWrapping` class over the hazardous fixture's longest line); the rest is manual check M33-1, because jsdom has no layout engine |
| Inherits the four disciplines | the tests named in Scope |

Manual checks, `npm run tauri dev`, recorded unticked in
`.abcd/.work.local/logs/acceptance/spc-2609061145242761.md`:

- **M33-1** — at 1280, 820 and 390 CSS pixels, enlarge twice on a chapter whose
  longest line is 544 characters. The lines wrap, nothing scrolls sideways,
  nothing needs a pinch, and the sidebar and modeline do not move.
- **M33-2** — with the key log open (`C-x k`), press each of the three chords
  and then `C--` and `C-=` on their own. All three prefixed chords are claimed
  by the page; the two bare ones are not claimed by the scale. This is the one
  the web view can refuse: `C-=` and `C--` are its own zoom keys.
- **M33-3** — enlarge twice, quit, reopen: the surface opens at that size, and
  `settings.json` in the application's configuration directory carries
  `"text_scale": 2` while the document folder carries nothing.

## Tasks

1. Add `src/text-scale.ts` — the constants, `factorFor`, `fontSizeFor`,
   `percentOf`, the field, the compartment and `setTextScale`.
   Verify: `npx vitest run src/text-scale.test.ts -t "enlarges the surface"`.
2. Seed the compartment from `src/editor.ts` and carry the step through
   `setDocument`. Verify: `npx vitest run src/editor` and the same test.
3. Add the three rows to `src/keys.ts` and the three ids to `APP_COMMAND_IDS`.
   Verify: `npx vitest run src/emacs-keys.test.ts`.
4. Add the swallowed-digit guard to the handler wrapper in `src/emacs.ts`.
   Verify: `npx vitest run src/text-scale.test.ts -t "returns to the default"`.
5. Wire the three commands, `announceBriefly`, and the two optional services in
   `src/app.ts`. Verify: `npx vitest run src/text-scale.test.ts`.
6. Add `text_scale`, `clamp_text_scale`, `set_text_scale_at` and the command in
   `src-tauri/src/settings.rs`, and the one line in `src-tauri/src/lib.rs`.
   Verify: `cargo test --manifest-path src-tauri/Cargo.toml settings`.
7. Add `createTextScaleServices` in `src/settings.ts`, `text_scale` on the
   `Settings` interface, and the wiring in `src/main.ts`.
   Verify: `npm run build`.
8. Write the paragraph in `docs/how-to-find-and-change-the-keys.md`, the manual
   checklist, and the decision line for the range.
   Verify: the six commands, plus `abcd lint`.

## Risks and Open Questions

- **The web view's own zoom.** `03-evidence.md` leaves open "which key
  combinations macOS and the web view take before the editor sees them, and
  which of those the shell can claim back". `C-=` and `C--` are its zoom keys;
  the build assumes that behind the `C-x` prefix they arrive as ordinary
  chords, which is what the keyboard-navigation prototype found for every other
  prefixed chord. M33-2 is where a failure shows, and it shows loudly.
- **The package's numeric argument.** The guard above is a second mechanism
  beside the package's prefix machinery, which this repository's own note in
  `src/emacs.ts` warns against. It is accepted because the alternative is
  either a different chord than the one Emacs uses or a fork of the package;
  the guard is confined to chords Editor registered itself.
- **Rebinding** is open in `03-evidence.md` ("whether individual chords in that
  table are rebindable and persisted"). These rows carry ids like every other,
  which is all a later answer needs; nothing about a chord is persisted here.
- **What the intent leaves silent**, with the build's assumption rather than an
  invented answer: the scale is not written until a step succeeds, so a refused
  chord writes nothing; a stored step outside the range is clamped rather than
  refused, because refusing would leave the surface at a size the author cannot
  read; and the transient message is 1500 ms, the only number here the intent
  does not fix.
