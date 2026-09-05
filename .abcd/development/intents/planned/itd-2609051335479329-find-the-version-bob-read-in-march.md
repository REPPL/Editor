---
id: itd-2609051335479329
slug: find-the-version-bob-read-in-march
spec_id: spc-2609051353457083
kind: standalone
suggested_kind: bundle-member
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
bundle: publish
supersedes: [itd-2609051221553568, itd-2609051317492681]
---

# Find the version Bob read in March

## Press Release

In October Bob asks Alice about a figure she showed in March. The document
has moved on since: two sections are rewritten and the figure has a
different number. Alice opens the document in Editor and opens its publish
log — a list of every publish, newest first, each entry with its date, its
version hash, the variants it carried, the flag it went out under —
unlisted or gated — and its links. She finds the March entry by its date, copies its version link,
and sends it back. Bob opens the page he read in March.

Every publish writes its own version path and leaves every earlier one
alone. The stable link moves forward; the links beneath it do not move at
all. So the link Bob saved in March still shows March, the link Alice sent
last week still shows last week, and Alice never has to reconstruct an old
build from memory or from her git history.

The log lives in the document folder as a plain file beside the chapters,
so it is Alice's record rather than the app's. She can read it with any
tool, keep it in her own backups, and open or copy any entry from inside
Editor. A version is named by what it contains, not by when the button was
pressed: publishing again without changing anything lands on the hash that
is already there. The log still records that she published — every press
of the button leaves a line — but no second version path appears on the
site for content that has not changed.

## Why This Matters

A document that is republished is a document whose past is being
overwritten unless something keeps it. Without a record, "the version Bob
read in March" is a question Alice cannot answer: she has the current text
and a link that has moved on, and reconstructing what a reader saw means
guessing at a build. The publish log turns every past reading into a link
she can hand back in seconds, and turns republishing from something that
loses history into something that adds to it.

## Mechanism

- We expect a saved link to keep showing what it showed because publishing
  writes a new version folder and then rewrites only the stable paths and
  the pointer that names the latest hash; old version paths are never
  rewritten (05-internals.md, section 9). Falsifiable in one sitting:
  publish, save the version link, publish different content, fetch the
  saved link and compare it against what the first publish deployed.
- We expect the hash to be a dependable name for a version because it is
  computed from the built output, so identical content republished
  produces the identical hash and lands on the path that already holds it
  (05-internals.md, section 9). The log and the site therefore count
  different things: the log counts publishes, including one that changed
  nothing, and the site counts distinct versions. Falsifiable: publish the
  same document twice unchanged, compare the two hashes, and count the
  version paths.
- We expect Alice to find an old version months later because the log
  records the timestamp, the hash, the variants, the flag, and the links
  for every publish, and records them in the document folder rather than
  in application state — the same reasoning that keeps the document a
  folder of plain files the author owns (05-internals.md, section 10;
  01-product.md).
- We expect the record to stay true to the site because the log's entries
  are written by the publish action itself, not maintained beside it, so
  an entry exists exactly when a version was deployed. Falsifiable: an
  entry whose version path 404s, or a version path with no entry, is a
  failure of this intent.
- We expect this to matter in practice because the evidence is a document
  that already exists in three drifted copies, one of them some thirty
  lines out of step (03-evidence.md, the acceptance project). Versions
  that can be named and reopened are what stop a fourth copy being made
  simply to preserve what a reader saw.

## Scope Conditions

- Platform: the publish log is read in the desktop app on macOS; the <!-- cond: cond-2609051353457296 -->
  version links it holds open in current Safari and Chromium engines at
  desktop, iPad, and iPhone widths — 1280, 820, and 390 CSS px.
- Population: Alice reads the log — it is not published and no reader sees <!-- cond: cond-2609051353458175 -->
  it. Bob and Carol only ever hold a version link she sends them.
- Assumptions: the document has been published at least once, the log <!-- cond: cond-2609051353451554 -->
  lives in the document folder as a plain file the author owns, and the
  static host serves every published version path indefinitely.
- In scope: one entry per publish — including a republish that changed <!-- cond: cond-2609051353452131 -->
  nothing, which points at the hash already published and adds no version
  path — with its timestamp, hash, variants, flag, and links; open and
  copy for each entry; the stable link moving to the newest version while
  older version paths stay exactly as deployed. What an old version
  promises is its content: access follows the document, so a document
  gated later is gated at every version, and map #20,
  itd-2609051336005698, owns that. Taking versions off the site
  altogether belongs to map #28, itd-2609051402150739.
- Bundle: this intent is a member of the Publish bundle, whose other <!-- cond: cond-2609051353452105 -->
  member is map #7, itd-2609051335468596. They share one spec: #7 is the
  action that produces a link, this intent is the record of the links it
  has produced, and publishing without a version record is a link Alice
  cannot find again.
- Boundary with map #7 (itd-2609051335468596): #7 owns the publish action, <!-- cond: cond-2609051353450064 -->
  the minting of the stable id, the unlisted flag, and the empty
  presenter. This intent owns only the record of the entries #7 mints and
  the guarantee that an old entry still resolves to what it resolved to.
- Excluded as plumbing: the log's file format and the mechanism by which <!-- cond: cond-2609051353459277 -->
  the site records which version the stable link serves (05-internals.md,
  sections 9 and 10). What this intent owns of that mechanism is only its
  observable effect: the stable link serves the newest version and the
  older version links do not move.

## Acceptance Criteria

- Given a document published twice with different content, when Alice
  opens the publish log in the app, then it lists two entries, newest
  first, each showing its timestamp, its version hash, the variants
  published, the flag it went out under — `unlisted` or `gated` — and its
  links, with open and copy for each.
- Given the version link from the earlier entry, when it is opened after
  the later publish, then it serves that earlier publish's built output,
  content for content what it deployed. Access is the one thing that
  follows the document rather than the version: a document gated later is
  gated at every version, and what an old link promises is the same
  reading, not the same door.
- Given both publishes have completed, when the stable link is opened,
  then it serves the later version, and the earlier version link
  continues to serve the earlier one.
- Given a document whose content has not changed since its last publish,
  when Alice publishes again, then the log gains an entry recording that
  publish, that entry names the hash the previous entry already named, and
  no second version path is created on the site for the same content.
- Given a version hash that has never been published, when a link
  carrying it is requested, then the presenter renders the same empty
  shell it renders with no id at all — nothing named, nothing listed, and
  nothing that distinguishes an unpublished hash from a mistyped one.
  (Negative case.)
- Given the publish log opened outside Editor in a plain text editor, when
  Alice reads every entry in it, then each one is readable as it stands
  and none of them names her machine: no absolute local path, no local
  host or volume name, and no user name. Published links and the
  addresses of gated media are the document's own record and belong
  there.
- Given Bob's saved version link opened at iPad width (820 CSS px), and
  again at iPhone width (390 CSS px) and desktop width (1280 CSS px),
  then the version it names is legible at every one of the three widths
  with no horizontal scrolling and no pinch zoom.
- Inherits: no machine in the document (`itd-2609051336080960`); network
  only on publish (`itd-2609051336158553`); one source, always
  (`itd-2609051336090390`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; and, from phase
  3 where it binds, variant fidelity (`itd-2609051336107315`), since an
  entry lists the variants a version carried and no published page may
  reveal them to a reader.

## Open Questions

- Whether the publish log is a file of its own beside the chapters or part
  of the document's metadata file (03-evidence.md, "Document model and
  canon").
- The length of the version hash, which is the name every entry in the log
  is keyed on (03-evidence.md, "Publish and pipeline").
- What an entry records when a publish fails part way, and whether a
  failed publish leaves a line in the log at all.
- Confirmation that the presenter, the article script, and the slide
  engine are maintained once in the production repository and shared by
  every document, rather than copied into each published version
  (03-evidence.md, "Publish and pipeline"). This intent's promise is that
  an old link shows what it showed, so the answer decides whether an old
  version is frozen in full or only in its content.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._

## Grounds

- pursued: a stable id with content-hashed versions and a publish log lets old links keep old content; wrong if authors need to edit history or revoke a version
