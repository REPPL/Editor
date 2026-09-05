# CONTEXT

Shared orientation for anyone (human or agent) picking this repo up. Short and
pointer-heavy: durable design truth belongs in `../development/`, personal
session state in `../.work.local/NEXT.md` (local, untracked).

## What this repo is

Editor is a lightweight Markdown editor for notes and presentations. It is
public on GitHub under the maintainer's account and licensed MIT.

## Current phase

Phase 0. The design record is complete and current: the seven-chapter
brief and its glossary under `../development/brief/`, five ADRs under
`../development/decisions/adrs/`, twenty-nine intents across
`../development/intents/planned/` and `drafts/`, and ten disciplines every
spec inherits. Read `../development/brief/README.md` first; it says which
chapter answers what.

The buildable skeleton is in place: a Tauri 2 shell under `src-tauri/`, a
TypeScript frontend at the root with CodeMirror and its Emacs keymap, a
Vitest harness, and the spike's findings in `docs/`. The commands that
build, test, and lint it are in `AGENTS.md` and are the ones that were
run.

The story is: create on the desktop app; edit text anywhere in a single
self-contained HTML file that imports and exports Markdown; publish with
one action that builds, commits under the document's stable id, pushes to
the production repository, and lets Cloudflare Pages deploy a presenter
page plus every document. One book-shaped source — Parts, Chapters,
Sections, Sub-sections, Sub-sub-sections — renders three ways: a
Tufte-style article, a journal PDF through Typst in the pipeline, and web
slides, all sharing footnotes and a bibliography file, all legible at 390,
820, and 1280 CSS pixels. Editing uses full Emacs key bindings. The locked
decisions are in `../development/brief/02-constraints.md`, which wins over
any other chapter. The next substantive work is phase 1: the folder and
the sidebar, the editing surface against its binding table, the copied
asset drop, the deck, and the first unlisted publish.

## Sharp edges

- The first usable slice is slides for a specific talk, even though the
  article is the rendering that must be perfect first.
- An unlisted document is not private: anyone with its link can read it.
  Anything confidential is published gated, and the gate follows the
  document id, not one version.
- Assets enter the production repository's git history on publish, which
  is why that repository is private and a public history is not an option.
  Anything past the host's per-file ceiling goes to object storage
  instead, uploaded by the pipeline, which is the only holder of that
  credential.
- Byte-fidelity on round trip is an acceptance criterion, not a nicety.
  Any path that reads and writes a chapter returns it byte for byte except
  where the author edited.
- The app touches the network only during a publish the author started.
  No update check, no telemetry, no build-time probe of a video source.
- Never commit or push without the maintainer asking; new dependencies need
  sign-off first.
