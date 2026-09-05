---
id: itd-2609051335568936
slug: point-a-video-at-several-sources-one-behind-a-sign-in
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317433203]
---

# Point a video at several sources, one behind a sign-in

## Press Release

Some of Alice's material lives elsewhere on purpose. She writes one video
block and names its places in order: the file on her own drive, the copy
the site will carry, and a copy on a separate website that asks a viewer
to sign in. One block, three places, one order. She writes it once and
never thinks about it again.

At her desk the local file plays, because it is there. On the published
page the site's copy plays, because the local file is not. For the
material that only lives behind the other site's sign-in, what happens
depends on who is reading: Carol, already signed in there, gets the
player; Bob, on the train with no account and no signal, gets the poster
frame, the caption, and a link he can follow later. Neither of them meets
a broken player or an empty box.

The deck and the PDF answer from the same list. A slide plays what is
reachable and shows the poster and link when nothing is. The PDF prints
the poster with its link beneath it, because paper cannot play anything.
Alice writes no second version of the block for any of them.

Editor holds no credential for the other site, never asks her for one,
and never touches that site while she works. The gate is theirs; Editor
simply names the address and lets the reader's own browser meet it.

## Why This Matters

Material that sits behind someone else's sign-in has no home in a
Markdown document today. In the acceptance project the videos are wired
in from JavaScript by filename convention, with a fallback chain of local
file, remote host, and link-out behind a sign-in probe (03-evidence.md),
which means the text does not say where its own video is, each rendering
would have to be taught the chain separately, and a reader who cannot
reach any of the sources sees nothing at all rather than a poster and a
way through. Naming the sources in the text, in order, puts the answer
where the author wrote the video and gives every rendering the same one.

## Mechanism

- We expect an ordered source list to be the right shape because the
  acceptance project already runs exactly this chain — local file, remote
  host, link-out behind a sign-in — and 03-evidence.md records it as
  proven prior art rather than as a proposal.
- We expect the three renderings to agree about a video because one core
  module resolves the manifest and chooses the source order, and all four
  hosts run that core unchanged (05-internals.md section 4); a
  disagreement between them is a defect in the core, not a host to be
  patched.
- We expect a poster and a link to be an acceptable floor rather than a
  failure because the article prototype already behaves this way: it
  embeds the player on the web and shows a thumbnail with a link when the
  file is opened from disk, and readers accept it (03-evidence.md).
- We expect no credential to be needed anywhere because the gate belongs
  to the other site and is met by the reader's own browser session:
  Editor never probes that site at build time (05-internals.md section
  3), so nothing about who may watch is recorded at publish and nothing
  needs to be kept secret by Editor.
- We expect the construct to survive tools that know nothing about it
  because it is a fenced div with attributes holding a plain list, which
  any Markdown reader reads past (05-internals.md section 3).

## Scope Conditions

- Platform: every rendering and every host — the preview in the app, the
  article and the deck on the site, the deck and the article inside the
  single file, and the PDF from the pipeline.
- Population: Alice authors the block; Bob reads without an account on
  the other site; Carol reads with one. Which of them sees a player is a
  property of their own browser session, not of the document.
- Assumption: the gated site is not Editor's and is configured by someone
  else. Editor neither hosts nor transcodes video (06-delivery.md, out of
  scope) and stores no credential for any source.
- Assumption: `local` is a path relative to the chapter or an entry in
  the asset record, `site` is a path under the published document, and
  `gated` is a URL on a site that asks the viewer to sign in
  (05-internals.md section 3).
- Boundary with map #15, itd-2609051335541009, "Add media too big to
  copy": #15 owns where a file lives, the threshold, and what is recorded
  about it. In for this intent: the order a rendering tries the sources
  in, and what a reader sees when none answers. Out: the record itself.
- Boundary with map #20, itd-2609051336005698, "Publish something only
  named people can open": #20 gates Alice's own document with an
  allow-list she edits. In for this intent: consuming a gate someone else
  runs. Out: creating, configuring, or listing anyone on any gate.
- Boundary with map #9, itd-2609051335489928, map #5,
  itd-2609051335447894, and map #21, itd-2609051336019782: each of those
  owns its own column of the construct table in 05-internals.md section
  3 — where a video sits on the page, on the slide, and on the printed
  page. In for this intent: the list all three consult and the rule that
  they consult it identically.
- Boundary with map #3, itd-2609051335415528, "Insert a construct I
  cannot remember": #3 owns that the canonical video block appears at the
  cursor. In for this intent: what the items inside it mean.
- Boundary with map #17, itd-2609051335570842, "Carry the document as one
  file that reads anywhere": #17 owns embedding and offline behaviour in
  the single file. In for this intent: the source order that file
  follows before it degrades.

## Acceptance Criteria

- Given a chapter carrying
  `::: {.video poster="assets/keynote-poster.jpg" caption="The second half"}`
  with the items `- local: assets/keynote.mp4`, `- site: keynote.mp4`,
  and `- gated: https://media.example.org/keynote.mp4`, When Alice
  previews that chapter with the local file present, Then the player
  plays the local file and neither the site copy nor the gated address is
  requested.
- Given the same block on the published site, When Bob opens the article
  where no local file exists, Then the player plays the copy stored under
  the published document, and the gated address is not requested.
- Given a block whose only item is
  `- gated: https://media.example.org/keynote.mp4`, When Carol, already
  signed in to that site, opens the article, Then the player plays the
  gated copy in place, with the block's caption beneath it.
- Given that same block, When Bob, not signed in and off the network,
  opens the same article, Then he sees the poster frame, the caption, and
  a link to the gated address, and no player control, empty frame, or
  error message appears anywhere on the page.
- Given a block whose every named source fails to answer, When the
  article renders, Then the poster and a link stand in the flow where the
  video would have been, the rest of the page is unaffected, and where
  the author named no `poster` a labelled link appears rather than an
  empty box.
- Given the same chapter, When the deck and the PDF are rendered from it,
  Then the slide carries the player where a source answers and the poster
  and link where none does, the PDF carries the poster with its link
  printed beneath it and no player at all, and neither of them reaches a
  source the article did not reach.
- Given the published article at iPhone width, When a video block falls
  back to its poster and link, Then the poster fits within the measure,
  the link is large enough to follow by tap, and nothing on the page
  scrolls sideways or needs pinch zoom.
- Given the app open on a chapter carrying a `gated` source, When Alice
  edits it, previews it, and builds the renderings without pressing
  Publish, Then no request reaches the gated host, no credential for it
  is stored or asked for, and the built output names the address without
  having contacted it.
- Inherits: the renderings agree; network only on publish; nothing is
  stored about a reader; degrade gracefully in a plain tool; legible on
  three device classes; no machine in the document.

## Open Questions

- Which poster frame a video block uses when the author supplies none
  (03-evidence.md, open questions, "Assets": "Which poster frame a video
  block uses when the author supplies none").

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
