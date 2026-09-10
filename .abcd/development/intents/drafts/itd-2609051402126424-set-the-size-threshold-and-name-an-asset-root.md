---
id: itd-2609051402126424
slug: set-the-size-threshold-and-name-an-asset-root
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Set the size threshold and name an asset root

## Press Release

Alice's video lives on a drive she keeps her media on, and her document
lives in a folder she keeps her writing in. She opens the document's
settings and does two small things, once. She sets the size above which a
dropped file is referenced rather than copied — eight megabytes suits her,
because her photographs are under it and her videos are far over it. Then
she names the place her media lives: she calls it `media`, points the name
at the drive on this machine, and closes the panel.

From then on the two settings do their work silently. She drags a
photograph and it copies beside the chapter; she drags a video and it is
recorded as a reference under `media` with a path beneath that name, and
the document folder does not grow. What is written into the document is
the name and the relative path, never the drive: the name is Alice's
machine's business and lives in the app's own settings, not in the folder
she sends to Carol.

A year later she opens the same document on a new machine. The document
still says `media`; the new machine does not know what that means yet.
Editor says so plainly, names the root it cannot resolve and how many
assets depend on it, leaves every chapter untouched, and offers her the
one gesture that fixes it: point `media` at the drive here. She does, and
the document is whole again.

## Why This Matters

The threshold and the root are the two numbers the whole asset design
rests on, and neither has had a moment where Alice sets them. Without the
threshold, "below the threshold" and "above the threshold" are conditions
in every asset criterion with no way for an author to choose which side a
file falls on. Without a named root that resolves per machine, a
referenced asset is either an absolute path — which the document folder
forbids — or a reference to nowhere. The acceptance project shows the cost
of leaving both implicit: root-relative paths into two different asset
trees, mended by hand whenever the work moved. One settings moment turns
two implicit constants into two things Alice decided.

## Mechanism

- We expect the threshold to belong to the document rather than to the app
  because it is recorded with the document's own metadata and travels with
  it (`05-internals.md` sections 1 and 6), so a document opened on another
  machine sorts its assets exactly as it did on the first.
- We expect the root name to belong to the machine rather than to the
  document because that is what keeps the folder free of absolute paths:
  "a referenced asset names a root, never a machine path. The root is a
  name the author's app settings resolve locally" (`05-internals.md`
  section 6). Falsifiable in one search: a machine path found anywhere in
  a document folder disproves it.
- We expect an unresolved root to be reportable rather than fatal because
  the reference is by name and content hash, not by location: nothing
  about the chapter changes when the name has no local answer, so the
  honest behaviour is to say which name is unresolved and how much depends
  on it.
- We expect a settable threshold to be necessary rather than a preference
  because the acceptance project measures about 2.5 GB of assets against
  7,900 words, with six videos of 150 to 512 MB and some 80 phone-native
  photographs (`03-evidence.md`). No single constant serves both ends of
  that range for every author, which is why `03-evidence.md` carries the
  default as an open question rather than a settled number.
- We expect the ceiling above which a referenced asset is published to
  object storage not to be Alice's to set, because it is a property of the
  hosts rather than of her document: it is stated as a constant in
  `05-internals.md`, and a document that could set it could be configured
  into a publish that cannot succeed.

## Scope Conditions

- Platform: the desktop app on macOS, Tauri 2 around the system web view.
  Resolving a root name to a place on this machine is a shell capability
  (`05-internals.md` section 5); the single HTML file adds no assets and
  has no settings of this kind.
- Population: Alice, the author, one document open. There is no shared or
  synchronised setting: another machine of hers is another machine.
- Phase: phase 4, with referenced assets. Before that phase every asset is
  copied and the threshold has nothing to decide; the settings panel
  arrives when the distinction does.
- Assumption: the threshold is one number per document, recorded with the
  document's metadata; the roots are names recorded with the document and
  resolved by the app's own settings on each machine.
- Boundary with map #15, `itd-2609051335541009` (Add media too big to
  copy): 15 owns what the threshold does — referenced mode, the record, the
  single copy the site holds, and the upload on publish. 27 owns only
  Alice choosing the number and naming the root, and what happens when a
  named root has no local answer.
- Boundary with map #4, `itd-2609051335420536` (Drop an image and have it
  just work): 4 owns the drop below the threshold and conversion at any
  size. 27 owns none of the drop gesture; it owns the setting the drop
  consults.
- Boundary with map #29, `itd-2609051402191319` (Start a new document): 29
  mints the document's metadata with a default threshold and no roots. 27
  owns changing either of them afterwards.
- Boundary with map #7, `itd-2609051335468596` (Publish and get a link I
  can open from the lectern): the publish action uploads what the record
  marks referenced. 27 says nothing about publishing and no setting here
  changes what a publish does beyond which assets are referenced at all.
- Boundary with map #1, `itd-2609051335399446` (Open a folder and see the
  book): 1 owns the sidebar and the tree. 27 owns the report that a named
  root is unresolved and the count of assets waiting on it; where that
  report is shown beside a chapter is 1's and 15's.
- Excluded as plumbing: the asset record's schema, hashing, and the
  mechanics by which a name resolves to a place on the machine
  (`05-internals.md` sections 5 and 6).

## Acceptance Criteria

- Given a document whose threshold is at its default, When Alice opens the
  document's settings and sets the threshold to eight megabytes, Then the
  new value is recorded with the document's metadata, and a file dropped
  afterwards is copied below that size and referenced above it.
- Given a document with no named root, When Alice adds a root called
  `media` and points it at a place on this machine, Then the name is
  recorded with the document, the location is recorded only in the app's
  own settings, and a search of every file in the document folder finds no
  absolute path, no user name, and no machine name.
- Given a document whose record names the root `media`, When Alice opens
  it on a machine where that name has never been pointed anywhere, Then
  Editor names `media` as unresolved, says how many assets depend on it,
  writes nothing into the document folder, and offers to point the name at
  a place here.
- Given that unresolved state, When Alice points `media` at a place on
  this machine that holds the files, Then every asset under that root
  resolves without any chapter file changing by a byte and without any
  asset being re-hashed, copied, or converted.
- Given Alice raises the threshold above the size of a file already
  recorded as referenced, When she looks at the document afterwards, Then
  the existing record is unchanged and no asset is silently copied into
  the document folder: the threshold decides what a new drop does, not
  what an old one did. (Negative case.)
- Given Alice attempts to set the threshold above the ceiling at which a
  referenced asset must be published to object storage, When she confirms,
  Then the setting is refused with the reason, the previous value stands,
  and nothing in the document folder changes. (Negative case.)
- Given the settings panel open with two roots named and the threshold
  shown, When the app window is narrowed to 820 CSS px and again to 390
  CSS px, Then every field, its value, and its label are fully legible
  with no horizontal scrolling and no pinch zoom.
- Given Alice changes the threshold, names a root, and re-points an
  existing root, When outbound network activity is observed throughout,
  Then no request leaves the machine.
- Inherits: no machine in the document (`itd-2609051336080960`); network
  only on publish (`itd-2609051336158553`); one source, always
  (`itd-2609051336090390`); round-trip byte-fidelity
  (`itd-2609051336074533`); legible on three device classes
  (`itd-2609051336128348`).

## Open Questions

- The default size threshold between copied and referenced assets
  (`03-evidence.md`, open questions, "Assets"). This moment lets Alice
  change it; what she finds there before she does is still undecided.
- Whether the referenced-asset record is per document or per Part
  (`03-evidence.md`, open questions, "Assets"), which decides whether a
  root named here is named once for the document or once per Part.
- What happens to assets already recorded under a root Alice renames or
  removes: whether the record follows the rename or the assets are
  reported unresolved until a root of that name exists again.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
