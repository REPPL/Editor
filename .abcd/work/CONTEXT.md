# CONTEXT

Shared orientation for anyone (human or agent) picking this repo up. Short and
pointer-heavy: durable design truth belongs in `../development/`, personal
session state in `../.work.local/NEXT.md` (local, untracked).

## What this repo is

Editor is a lightweight Markdown editor for notes and presentations. It is
public on GitHub under the maintainer's account and licensed MIT.

## Current phase

Phases one and two have shipped: twenty-one intents under
`../development/intents/shipped/`, each with its closed spec and an ingested
fidelity audit. Phase one is the deck and the editing surface; phase two is
the article — the Tufte page with a preview window in the app, reader
controls, citations from a bibliography file, hidden content, keyboard
movement on the page — plus three the maintainer asked for while using the
app: a new document from nothing, the outline vocabulary, and one chord that
opens a file or a folder. Releases 0.1.0 to 0.3.1 are cut in `CHANGELOG.md`
and tagged locally; nothing is pushed. The app builds as a release bundle.
The maintainer's example documents are local test material under the
gitignored `examples/` folder, and nothing committed names one; a harness
runs every local document through the article and the deck. What no phase
has had is a human at the keyboard: the manual acceptance rows under
`../.work.local/logs/acceptance/` are all but one unticked, and every audit
records the three-width criteria as inconclusive for that reason. Phase
three — bringing a single-file manuscript in (intent 13) and writing one
text for two audiences (intent 14) — is next in
`../development/brief/07-intent-map.md`. One draft waits for its planning
interview: aligned Markdown tables in the editing surface
(`itd-2609061653559060`).

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
