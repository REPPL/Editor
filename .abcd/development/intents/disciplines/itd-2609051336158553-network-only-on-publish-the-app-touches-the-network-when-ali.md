---
id: itd-2609051336158553
slug: network-only-on-publish-the-app-touches-the-network-when-ali
spec_id: null
kind: discipline
suggested_kind: discipline
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Network only on publish

## Rule

The app touches the network when Alice presses Publish, and at no other
time. Everything else it does — opening, editing, dropping assets,
previewing, presenting, exporting — works with the machine offline.

## Forbids

- Background requests of any kind: update checks, licence checks,
  telemetry, crash reporting, font or script fetches at start-up.
- Sync of any sort, or a local-network server in the app for tablet
  editing.
- Probing a video source at build time, including the gated source a
  video block names.
- A CDN or any other remote dependency inside the exported single HTML
  file.
- A preview or a rendering that fetches a remote resource in order to
  display correctly.
- Editor holding a credential or token of its own for any service.

## Binds From

Phase 1, with the first publish, and it holds through every phase after
it: the referenced assets and gated video sources of phase 4, the single
file of phase 5, and the gated publishing of phase 6.

## How A Spec Proves It

- Given the app is running with a document open, When Alice edits for an
  hour, drops images, presses Present, and exports, and the app's network
  traffic is recorded throughout, Then there is none.
- Given a chapter with a `::: {.video}` block naming a `gated:` URL, When
  every rendering is built, Then the URL is written into the output and
  is never requested during the build.
- Given the exported single HTML file opened from disk on a machine with
  no network, When Carol reads the article and runs the deck, Then the
  text, styles, fonts, scripts, and embedded assets all render, and media
  above the threshold shows a poster frame and a link.
- Given Alice presses Publish, When the app's requests are recorded, Then
  they are the git push using her existing configuration, and the access
  policy call for a gated document, and nothing else; the app sends no
  token of its own because it holds none.
- Given the app is quit and reopened offline, When it loads the last
  document, Then it opens fully with no request attempted and no error
  about being offline.
- Given a proposed dependency that fetches at runtime — a script from a
  CDN in the single file, a remotely hosted web font — When it is offered,
  Then it is refused and the asset is embedded instead.

## Why

`02-constraints.md` states the rule flatly — "Network only on publish. No
server, no sync, no cloud service" — and `06-delivery.md` puts cloud sync
out of scope in the same words: "no background network. The network is
touched by the publish action alone." The trade-off was taken with its
cost named: a local-network server in the app for tablet editing was
rejected, so "the tablet path is a file the author carries, not a live
connection". `03-evidence.md` records the one place a remote dependency
was weighed and split by host — the slide prototype used "reveal.js with
a CDN for the published render, and a dependency-free single-file render
with the source embedded in a script tag", from which the brief concludes
"a CDN is acceptable on the site and unacceptable in the single file".
The gated video source is the sharpest case: `05-internals.md` section 3
says Editor "holds no credentials for it and never probes it at build
time". A document that never phones home is one Alice can write on a
train, and one whose behaviour she can predict entirely from what she can
see.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
