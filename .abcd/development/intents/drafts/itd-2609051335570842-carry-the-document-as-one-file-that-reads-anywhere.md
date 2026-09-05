---
id: itd-2609051335570842
slug: carry-the-document-as-one-file-that-reads-anywhere
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317484141]
---

# Carry the document as one file that reads anywhere

## Press Release

Alice finishes a chapter folder and chooses Export single file. Editor
writes one HTML file to the place she names. She double-clicks it and the
document opens: the Tufte article as the published link shows it,
navigation drawn from the Parts and Chapters, citations and footnotes in
the margin beside the paragraph that made them, images in the flow,
reader controls in their small toolbar. The same key that starts the deck
in the app starts it here, and the chapter runs as slides. Nothing is
fetched while she reads. There is no font to download, no stylesheet, no
script, no deck engine waiting on a network she may not have.

She attaches the file to an email to Carol. Carol opens it on a plane
with the wireless off, on a laptop that has never heard of Editor. She
installs nothing, signs in to nothing, and reads the whole document,
turns the deck through to the end, and changes the text size and the
measure to suit the cabin light. Bob opens the same attachment on his
phone at the back of a room: the margin notes fold into the text, and he
reads without pinching or scrolling sideways.

One thing is honestly missing. The half-gigabyte video that Alice's
document references, and that publishing uploads to the site, is not
inside the file — no file that size travels as an attachment. In its
place Bob and Carol see the poster frame and a link that plays it once
they are back on a network. Everything else is there: every image, every
style, every mark hidden in the paragraphs, the opening quotation that
shows once and then stays out of the way.

The file is a reading artefact, not a rescue copy. It is what Alice hands
someone when a link will not do: an archive, an attachment, a folder on a
memory stick, a document that will still open in ten years on a machine
with a browser and nothing else installed.

## Why This Matters

A link is a promise about someone else's network, someone else's uptime,
and someone else's access rules, and Alice cannot keep any of the three
on Carol's behalf. Today the alternative to a link is a PDF that loses
the navigation, the reader controls, the deck, and the video, or a folder
of files that only opens correctly on the machine that made it. This
removes the choice: the same document Bob reads at a link is the document
Carol reads from disk, with the same rendering, on a plane, on a phone,
on a borrowed laptop, for as long as she keeps the file.

## Mechanism

- We expect one self-contained HTML file to work as a primary reading
  artefact rather than a fallback, because the maintainer's prototype
  article already is one: under half a megabyte, images embedded as data
  URIs, opening identically from disk and from the web
  (`03-evidence.md`, "The article prototype").
- We expect the deck to run inside the file with no network, because the
  slide prototype already ships a second, dependency-free single-file
  render alongside its CDN-backed one, and the brief draws the rule from
  it: "A CDN is acceptable on the site and unacceptable in the single
  file" (`03-evidence.md`, "The slide prototype").
- We expect the file's rendering to match the published one rather than
  approximate it, because both are produced by the same TypeScript core
  running unchanged in a different host, and "a rendering difference
  between hosts is a bug in the core, not a host to be patched"
  (`05-internals.md` section 4).
- We expect embedding to stay tractable at real document sizes, because
  the asset threshold has already sorted assets before the exporter sees
  them: `assets.json` marks each asset `copied` or `referenced`
  (`05-internals.md` section 6), and only `copied` assets embed. The
  acceptance project's 2.5 GB of media against 7,900 words is why the
  sorting exists (`03-evidence.md`, "The acceptance project").
- We expect the degradation for unreachable media to be right rather than
  invented, because the prototype article already behaves this way: it
  embeds the player on the web and shows a thumbnail with a link when the
  file is opened from disk (`03-evidence.md`, "The article prototype").
- We expect reading from disk to store nothing anywhere but the reader's
  own browser, because there is no server in the design at all: the
  network is touched by the publish action alone
  (`02-constraints.md`, "Publishing").

## Scope Conditions

- Platform: any browser that opens a local HTML file, at iPhone, iPad,
  and desktop widths. The file is produced on macOS by the desktop app;
  it is not produced by the presenter site or by the pipeline.
- Population: Carol and Bob, who receive the file and read it, and Alice,
  who exports it. No account, no installation, and no network is required
  of a reader.
- Assumption: assets below the document's `asset_threshold_bytes` embed
  and assets above it do not. A document whose media is entirely above
  the threshold still exports; it simply carries posters and links where
  the media would be.
- Assumption: the file carries one variant. The variant fidelity
  discipline forbids any page revealing that other variants exist, and a
  file is a page like any other.
- Boundary with map #9 (itd-2609051335489928, read the document as a
  Tufte article) and map #5 (itd-2609051335447894, present a chapter with
  no slide markup): those intents own what the article and the deck are.
  This intent owns only that both arrive whole inside one file that opens
  from disk. A layout complaint about the article is 9's; a missing font
  inside the file is this intent's.
- Boundary with map #15 (itd-2609051335541009, add media too big to
  copy): 15 owns the threshold, the manifest, and where a referenced
  asset lives. This intent owns what the exported file does about media
  it cannot carry — the poster and the link — and nothing else about
  referenced assets.
- Boundary with map #18 (itd-2609051335586905, edit on the iPad and bring
  the text back): the same file, a different job. This intent is Carol's,
  who reads; 18 is Alice's, who edits and must get the text home. Import,
  export, and the editing surface inside the file belong to 18.

## Acceptance Criteria

- Given a chapter folder whose assets are all below
  `asset_threshold_bytes`, when Alice exports the single file and opens
  it from disk with the network switched off, then the article renders
  complete — every image, style, font, and script inside the file — and
  no request leaves the machine.
- Given the same file open from disk, when Carol starts the deck, then
  the Sections and Sub-sections run as they do on the presenter site,
  driven by the dependency-free build, and the file contains no reference
  to any content delivery network or remote host.
- Given a video block written as
  `::: {.video poster="assets/keynote-poster.jpg" caption="The second half"}`
  whose `local` source is a referenced asset above the threshold, when
  Bob opens the file with no source reachable, then he sees the poster
  frame and a link, and neither a player nor an error message.
- Given a chapter carrying a margin aside written as
  `[a remark in the margin]{.margin}` and a full-bleed image, when Carol
  opens the file at iPhone width and again at iPad width, then the margin
  material folds into the flow and nothing scrolls sideways or needs
  pinch zoom.
- Given a chapter carrying `::: {.opening once="per-browser"}` and an
  egg pair — `[✦]{.egg egg="lantern"}` in a paragraph and
  `::: {.egg #lantern label="✦"}` in the same chapter — when Carol opens
  the file twice in one browser, then the quotation appears on the first
  opening only, and on both openings the egg opens its content from disk
  and moves into the tray.
- Given a document folder recording an asset with `"mode": "referenced"`,
  when Alice exports the single file, then that asset's bytes are absent
  from the file and the file contains no absolute path, no machine name,
  no user name, and no asset root location anywhere in its text.
- Given one chapter exported as a single file and the same chapter
  published to the presenter site, when both are read side by side, then
  the headings, the footnotes, the citation numbering, and the generated
  reference list are identical in both.
- Inherits: one source, always; the renderings agree; legible on three
  device classes; nothing is stored about a reader; network only on
  publish; no machine in the document; variant fidelity; degrade
  gracefully in a plain tool.

## Open Questions

From `03-evidence.md`, "Open questions":

- "The default size threshold between copied and referenced assets."
  The threshold decides what a reader gets offline and what degrades to a
  poster, so the default is this moment's default too.
- "Which poster frame a video block uses when the author supplies none."
  Offline, the poster is the whole of what the reader sees.
- "Whether the presenter, the article script, and the slide engine are
  maintained once in the production repository and shared by every
  document, rather than copied into each published version." The single
  file has no shared root to draw on, so it embeds its own copy either
  way; what is open is whether the file and the site can then drift.
- "Whether easter-egg content can itself be a variant-marked block."
  A single file carries one variant, so an egg's variant marking decides
  whether the egg travels with the file at all.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
