# CONTEXT

Shared orientation for anyone (human or agent) picking this repo up. Short and
pointer-heavy: durable design truth belongs in `../development/`, personal
session state in `../.work.local/NEXT.md` (local, untracked).

## What this repo is

Editor is a lightweight Markdown editor for notes and presentations. It is
public on GitHub under the maintainer's account and licensed MIT.

## Current phase

Pre-code, with the first intent drafted. The repository holds a licence, a
README, a Rust/Cargo `.gitignore`, the product chapter of the brief
(`../development/brief/01-product.md`), and one draft intent under
`../development/intents/drafts/`. No `Cargo.toml`, no source, no tests, no
docs tree. The story is: create on the desktop app; edit text anywhere in a
single self-contained HTML file that imports and exports Markdown; publish
with one action: build, commit under a hash folder, push to the production
GitHub repository, and Cloudflare Pages deploys a public presenter page
plus every document. The hash in the presenter URL shows a presentation
from anywhere. The pipeline renders the PDF; the app does not. One
book-shaped source (Parts, Chapters, Sections, Sub-sections) exports three
ways: a Tufte-style online article with videos and interactive elements, a
journal-style PDF via Typst, and web slides, all sharing footnotes and
native bibliography references, all optimised for desktop screens, iPad,
and iPhone. Editing uses full Emacs key bindings. The locked decisions are
in `../development/brief/02-constraints.md`. The next substantive work is
splitting the draft intent, minting the ADRs, and landing a buildable
skeleton.

## Sharp edges

- The shell is Tauri 2 by grill decision; the ADR is still to be minted.
  Do not scaffold a framework until it is.
- The first usable slice is slides for a specific talk, even though the
  article is the rendering that must be perfect first.
- An unlisted document is not private: anyone with its link can read it.
  Anything confidential is published gated, behind Cloudflare Access.
- Assets enter the production repository's git history on publish. The
  intent assumes that repository is private; confirm before the first push,
  because a public history cannot be withdrawn.
- Assets reachable from anywhere for editing is parked as a future feature.
- `AGENTS.md` cannot yet list verified build or test commands because there is
  nothing to build. Update it the moment a build exists.
- Never commit or push without the maintainer asking; new dependencies need
  sign-off first.
