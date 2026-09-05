---
id: itd-2609051335468596
slug: publish-and-get-a-link-i-can-open-from-the-lectern
spec_id: spc-2609051353438810
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

# Publish and get a link I can open from the lectern

## Press Release

Alice finishes the chapter twenty minutes before the talk and presses
Publish. Editor builds the deck and its assets, commits them under the
document's own id, pushes to the production repository, and hands her one
link. She sends the link to herself, opens it on the machine at the
lectern, and the talk is on the screen. There is no export folder to
carry, no memory stick, and nothing to install on a machine she does not
own.

The link is the document's stable link, and it always shows the newest
version. When Alice spots a wrong date over coffee, she corrects the line,
presses Publish again, and the same link shows the correction: the link
she has already sent to the room does not go stale. Bob, following from
the back row on his phone, opens that same link and reads it at his own
size, with nothing sliding off the side of the screen.

Nothing else on the site leads there. Carol, who types the site's address
without an id, meets an empty page: no document, no index, no list of what
exists. The document is unlisted, and Editor says plainly what unlisted
means — anyone holding the link can read it, and a link once sent cannot
be recalled.

Until Alice presses Publish, the app has not touched the network at all.
The folder on her disk is the whole document; publishing is the one moment
it leaves the machine, and it leaves through her own git configuration.
Editor keeps no account and no token of its own.

## Why This Matters

A talk has a date and a room, and the machine in that room is rarely
Alice's. Carrying a build around as files means a folder one version
behind, an asset that did not travel with it, or a borrowed browser that
will not open a local page the way it opens a hosted one — discovered
with the audience already seated. One link, minted by the same action that
builds the document, closes the gap between the text Alice was editing and
the thing the room sees, and keeps it closed when she edits again.

## Mechanism

- We expect the published deck to match what Alice saw in the app because
  both run one rendering core over one tree: the app, the presenter site,
  and the publish pipeline are hosts of the same implementation, so a
  difference between them is a bug in the core rather than a setting to
  reconcile (05-internals.md, section 4). Falsifiable: render one chapter
  in the app and on the site and compare them.
- We expect one action to be enough because the whole of publishing is a
  commit and a push into a repository that a static host deploys. There is
  no service of Editor's to be running, and nothing to be down at the
  lectern beyond the host itself (02-constraints.md;
  adr-2609051324157479).
- We expect Alice's existing git configuration to carry the push because
  Editor holds no credential of its own, so there is nothing to store and
  nothing to leak (01-product.md). This is a claim and not yet a result:
  03-evidence.md carries it under "Publish and pipeline" as a confirmation
  owed to the first publish.
- We expect an unguessable id to be adequate protection for an unlisted
  document because the presenter lists nothing and enumerates nothing, and
  a wrong address renders the same empty shell as no address at all, so
  the link is the only route to the document and guessing it is the only
  attack (05-internals.md, section 9). The claim rests on a length
  03-evidence.md leaves open, which is what makes it falsifiable rather
  than assumed.
- We expect the failure path to be reportable rather than silent because
  publishing is a build, a commit, and a push, each of which either
  completes or does not: nothing is half-deployed, because the site is
  whatever the last successful push left in the repository. Falsifiable:
  pull the network mid-publish and compare the deployed site with what it
  served before.
- We expect a stable link with versions beneath it to serve a talk better
  than a fresh link each time because the alternative was considered and
  its cost measured: a new hash on every publish means the link sent last
  week goes stale, and the price of the choice is that the stable link is
  a standing secret (03-evidence.md, trade-offs taken).

## Scope Conditions

- Platform: the desktop app on macOS, Tauri 2 around the system web view. <!-- cond: cond-2609051353432330 -->
  Readers open the link in current Safari and Chromium engines at
  desktop, iPad, and iPhone widths — 1280, 820, and 390 CSS px.
- Population: Alice publishes; Bob and Carol only ever hold a link. One <!-- cond: cond-2609051353437737 -->
  author and one machine — concurrent publishing from two devices is out
  of scope for the product (06-delivery.md).
- Assumptions: git is configured on Alice's machine, the production <!-- cond: cond-2609051353437846 -->
  repository exists and is private, and the static host deploys it.
  Editor stores no token of its own.
- In scope: one document, one variant — the document's default — <!-- cond: cond-2609051353437094 -->
  published unlisted; the stable id minted at first publish; the version
  hash beneath it; the link handed back to Alice; and the guarantee that
  the presenter shows nothing without an id.
- Bundle: this intent is a member of the Publish bundle, whose other <!-- cond: cond-2609051353438316 -->
  member is map #8, itd-2609051335479329. They share one spec, because a
  link Alice cannot find again is not yet a link.
- Boundary with map #8 (itd-2609051335479329) and map #28, <!-- cond: cond-2609051353434718 -->
  itd-2609051402150739 (Take a document off the site): this intent mints a
  version and its links. The record of every version minted, and finding
  an old one months later, belong to #8; taking the whole document off the
  site again belongs to #28.
- Boundary with map #19 (itd-2609051335598083): this intent publishes one <!-- cond: cond-2609051353433511 -->
  variant — the document's default — and hands Alice the one stable link
  that serves it. The document's id alone is not that link and shows the
  empty shell. Every further per-variant link under the same id, the
  unguessable path token each variant is given, and the rule that no page
  reveals another variant exists, belong to #19.
- Boundary with map #20 (itd-2609051336005698): this intent owns unlisted <!-- cond: cond-2609051353434181 -->
  and the empty presenter. The access policy, the allow-list Alice edits,
  and the sign-in Bob meets belong to #20.
- Boundary with map #21 (itd-2609051336019782): this intent stops at <!-- cond: cond-2609051353435641 -->
  pushed and deployed. The PDF the pipeline renders on the same push, and
  its place beside the version, belong to #21.
- Excluded as plumbing: the pipeline, the site's path layout, and git <!-- cond: cond-2609051353431967 -->
  mechanics (05-internals.md, sections 8 and 9).

## Acceptance Criteria

- Given a document folder that has never been published, when Alice
  presses Publish and confirms unlisted, then Editor mints a stable id,
  writes it into the document's metadata, commits the built output under
  that id in the production repository, and pushes.
- Given that publish has completed, when Editor reports it done, then
  Alice is shown one stable link with a copy action, and opening it in a
  browser serves the document she just published.
- Given a document already published once, when Alice edits one line and
  publishes again, then the same stable link serves the new content, so
  the link she sent before the edit is the link that shows the
  correction.
- Given the presenter opened at its root with no id, at an id that has
  never been published, or at the document's id with nothing beneath it,
  then each of the three renders the same empty shell — no document, no
  title, no list — and the shell a wrong address reaches is the shell the
  presenter shows with no id at all. (Negative case.)
- Given an unlisted document that has been published, when the deployed
  site is crawled from its root, then no page links to, lists, or
  enumerates the document's path.
- Given Alice is choosing between unlisted and gated, when the publish
  panel shows the choice, then it states in words that an unlisted
  document is not a private one — that anyone holding the link can read
  it, and that a link once sent cannot be recalled — and it states this
  every publish rather than once.
- Given the push cannot complete — the network is unreachable, or the
  remote refuses it — when Alice presses Publish, then Editor reports the
  failure with its reason, the site still serves exactly what it served
  before, and the document folder is byte for byte what it was apart from
  anything the publish had already recorded. (Negative case.)
- Given the app open with a document loaded, when a full editing session
  is observed at the network layer and Publish is never pressed, then no
  request leaves the machine.
- Given Bob opens the stable link at iPhone width (390 CSS px), at iPad
  width (820 CSS px), and at desktop width (1280 CSS px), then the
  published document is legible at every one of the three widths with no
  horizontal scrolling and no pinch zoom.
- Inherits: network only on publish (`itd-2609051336158553`); no machine
  in the document (`itd-2609051336080960`); one source, always
  (`itd-2609051336090390`); legible on three device classes
  (`itd-2609051336128348`), at 390, 820, and 1280 CSS px; and, from phase
  3 where it binds, variant fidelity (`itd-2609051336107315`), which
  governs what a published path may reveal about the variants beside it.

## Open Questions

- The length of the stable id and of the version hash, which is the whole
  of an unlisted document's protection (03-evidence.md, "Publish and
  pipeline").
- Confirmation that Editor pushes with the author's existing git setup and
  holds no token of its own (03-evidence.md, "Publish and pipeline").
- Confirmation that the presenter and the renderers are maintained once in
  the production repository and shared by every document, rather than
  copied into each published version (03-evidence.md, "Publish and
  pipeline").
- How long the host takes to deploy a push, and therefore whether Editor
  reports a publish done when the push lands or when the link answers.
  The moment matters at a lectern twenty minutes before a talk.

## Audit Notes

<!-- abcd-review: OWED receipt=rcp-c553924fd8bc -->
Fidelity review OWED (receipt rcp-c553924fd8bc).

## Grounds

- pursued: one publish action through a git push to a private repository deployed by Cloudflare Pages yields a link that works from a lectern; wrong if deploy latency or credentials make the first publish unreliable
