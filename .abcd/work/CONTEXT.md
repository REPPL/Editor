# CONTEXT

Shared orientation for anyone (human or agent) picking this repo up. Short and
pointer-heavy: durable design truth belongs in `../development/`, personal
session state in `../.work.local/NEXT.md` (local, untracked).

## What this repo is

Editor is a lightweight Markdown editor for notes and presentations. It is
public on GitHub under the maintainer's account and licensed MIT.

## Current phase

Phase one, the deck, has shipped: eight intents under
`../development/intents/shipped/`, each with its closed spec and an
ingested fidelity audit; release 0.1.0 is cut in `CHANGELOG.md` and tagged
locally. The app builds as a release bundle. What phase one has not had is a
human at the keyboard: the manual acceptance rows under
`../.work.local/logs/acceptance/` are all unticked, and every audit records
the three-width legibility criteria as inconclusive for that reason. Phase
two, the article, is next (intents 9 to 12 in
`../development/brief/07-intent-map.md`).

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
