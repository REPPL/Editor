# The present window in the bundle: how the deck engine goes missing

Written 2026-09-06, from the run logs of the session that settles
`iss-2609061132369973`. The narrative half of `docs/spike-emacs-keys.md`
belongs here rather than in a user-facing page: that page says how to drive a
scripted run, and this one says what a scripted run finds and what it costs to
read the answer.

## The shape of the failure

A dependency installs itself correctly on disk, correctly under the dev
server, and correctly under the test runner, and is then taken apart by the
bundler on the one path nobody runs before shipping. The keymap goes first
(`docs/spike-emacs-keys.md`, "Why the keymap was inert in the running app");
the deck engine goes the same way and for a different reason, which is what
makes the shape worth a note rather than a line.

The present window loads the vendored UMD build of reveal.js from a
`<script type="module">` tag, and the page reads the `Reveal` that file
assigns to `globalThis`. The assignment lives in the UMD's *last* branch, the
one a plain script takes. The dev server serves the file raw, so that branch
runs. The jsdom suite evaluates the same file into its own global, so the
global is there too. The release build hands the file to the bundler, which
reads the UMD's *first* branch — `typeof exports === "object"` — takes it for
CommonJS, and turns `module.exports = factory()` into a module export. Nothing
is ever assigned to a global. The window mounts a deck with no engine behind
it: one slide, a row of dead arrows, and every check green.

## What a scripted run can and cannot say

`EDITOR_PRESENT_LOG` names a file the present window appends one JSON object
to. On its own it cannot separate the two failures that matter, because both
of them produce an empty file: an engine that never starts, and a window that
is never opened. A person can tell them apart by looking at the screen; a
script cannot, and a script is what runs the release binary.

`EDITOR_PRESENT_ON_OPEN` is what closes that gap. With the window opened by
the harness rather than by a keypress, an empty log means the engine, and a
log line means the deck. The line the release binary writes once the engine is
imported rather than read off a global is:

```json
{"phase":"ready","slides":5,"indexh":0,"indexv":0,"engine":"initialize+sync+slide+ready","presentAt":0,
 "controls":{"navigate-left":true,"navigate-right":false,"navigate-up":true,"navigate-down":true}}
```

Five slides, the deck on the first of them, the engine answering all four of
the methods the page drives it through, and the left arrow inert because there
is nothing to the left. That is the whole of the evidence, and it is available
only from a run of the shipped artefact.

## What this decides

- The engine is imported, not read off a global. The ES-module build means the
  same thing to a bundler, a dev server and a test runner, and the UMD build
  means three different things to the three of them. Both builds are vendored
  because both pages are real: the app's window goes through a bundler and the
  published site does not.
- A guard reads the emitted file. `tools/check-bundle.mjs` asks its questions
  of the present entry's own chunk graph — the engine is here, the accessor
  resolves to *this* engine, the mount defaults to *that* accessor — because
  every source-level check passes on a bundle whose window holds no engine.
- The harness earns its place in the release binary. Its three switches are
  what produce the logs above, and the logs are what a release-only failure is
  diagnosed from. The cost is a dev surface in a shipped app, confined to a
  log path under the cache or temporary directory that the page cannot name.
  `iss-2609061211328807` holds the decision open for the maintainer.

## What is still unproven here

Whether the deck *navigates* under a real keyboard. The log says the engine is
mounted and how many slides it holds; pressing the arrow keys through macOS
and reading the log back is a manual row, and stays one.
