---
id: itd-2609051336080960
slug: no-machine-in-the-document-no-absolute-paths-hostnames-usern
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

# No machine in the document

## Rule

Nothing inside a document folder names a machine. Every reference is
relative to the chapter that makes it, or to a named asset root the app
resolves locally, so the folder means the same thing wherever it is
opened.

## Forbids

- Absolute paths in any file in the document folder: chapter Markdown,
  `document.yaml`, `assets.json`, `publish-log.json`, annotation
  sidecars.
- Hostnames or machine names, including a share name or a mounted
  volume's name, written into a reference.
- Usernames, home directory names, or an author's email address in any
  path or field.
- Machine-local settings inside the document: an asset root's local
  location, a tool's install path, a credential, a token.
- A referenced asset recorded by where it happens to sit on this machine
  rather than by root plus a path relative to that root.
- A rendering that resolves a machine-local reference silently instead of
  reporting it.

## Binds From

Phase 1. Every phase adds files to the document folder — the manifest in
phase 4, the publish log and the layers in phases 6 and 7 — and each new
file inherits the rule as written here.

## How A Spec Proves It

- Given a document folder with chapters, a manifest, a publish log, and
  annotation sidecars, When every file in it is scanned, Then no value
  matches an absolute path, a hostname, a username, or a home directory
  name.
- Given Alice drops a 512 MB video that lives outside the document
  folder, When the asset is recorded, Then `assets.json` carries
  `"mode": "referenced"` with a `root` name and a path relative to that
  root, and the location of the root itself appears nowhere in the
  folder.
- Given Alice drops a small image, When the reference is written, Then it
  is a relative path such as `assets/lantern.jpg`, resolved from the
  chapter.
- Given the whole folder is copied to a second machine and opened, When
  Alice reads it, Then every copied asset resolves with no edit to any
  file, and every referenced asset resolves once that machine's settings
  name the root.
- Given a chapter carrying a hand-pasted absolute image path, When the
  chapter is opened, Then the sidebar reports it as a machine-local
  reference and publish refuses it rather than embedding it in the
  output.
- Given a published version's output, When its HTML, its manifest, and
  its assets are inspected, Then nothing in them names the machine that
  built them.

## Why

`05-internals.md` section 1 states the rule for the folder — "No path in
a document folder is absolute, and none names a machine" — and section 6
states it again for the manifest: "A referenced asset names a root, never
a machine path. The root is a name the author's app settings resolve
locally, which keeps the document folder free of absolute paths and
leaves room for the parked feature of reaching assets from anywhere."
The evidence is the acceptance project, whose Markdown "references only
five images, by root-relative path, into two different asset trees" while
every video and PDF is "wired from JavaScript by filename convention, not
from the text": a document that only works on the machine that made it.
Editor exists to hand Alice a folder of plain files she owns, and a
folder that carries a machine inside it is not portable, not archivable,
and not safe to publish, because a path can disclose as much as its
contents.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
