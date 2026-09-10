---
id: itd-2609051336005698
slug: publish-something-only-named-people-can-open
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: major
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
supersedes: [itd-2609051221553568, itd-2609051317492681]
---

# Publish something only named people can open

## Press Release

Alice has a document that must not rest on an unguessable link: a draft
for two named readers, with figures she is not ready to defend. She
presses Publish and the panel asks the question it asks every time —
unlisted, or gated. She chooses gated, types the addresses of the people
who may read it into the allow-list beside the flag, and publishes. The
panel is plain about what she has just chosen, and about what the other
choice would have meant: an unlisted link, once shared, cannot be
recalled.

Bob opens the link she sent him. The site asks him to sign in. He signs
in with the address Alice listed and the article opens. The deck, the
PDF, the images, and every path beneath the document's id are behind the
same door, so he does not meet it twice. Carol, who is not on the list,
opens the same link, signs in, and is refused. She learns nothing from
the refusal — not the title, not a heading, not the name of a file.

Months later Alice opens the publish log and sees the flag against each
version: March's went out unlisted, June's is gated, and each entry
carries its links. The gate stands in front of the document, not in front
of one version, so March's reading is behind the same door now — the words
Bob read in March have not changed by a character, but the way to them
runs through the sign-in. She takes one address off the allow-list, publishes
again, and that reader stops getting in. She has not moved the document,
changed its id, or rebuilt anything a reader had bookmarked.

## Why This Matters

The tempting mistake is to treat an unguessable link as privacy. It is
not: a link, once shared, is out of the author's hands for good, and it
is exactly the documents Alice cares most about that she is most likely
to send to the wrong person. Making the choice at every publish, in
words, with the allow-list in front of her, turns the distinction from
something she has to remember into something she has to answer.

## Mechanism

We expect a host-side access policy over the document's path to hold
because nothing Editor builds is asked to keep a secret. The gate stands
in front of the built files rather than inside them, so a reader who
defeats the page defeats nothing; there is no client-side check to
disable and no token in the markup to lift. This is falsifiable by
request: ask for an asset, a slide page, or the PDF beneath the id with
no session, and the answer must be the sign-in, not the file.

We expect an allow-list of named addresses to be workable because the
audience is a handful of people the author names, not a population. The
trade-offs table in 03-evidence.md records the alternatives that were
rejected — "an account system, or making everything gated" — and the cost
accepted: "Anything confidential depends on the host's access control
being configured correctly." That cost is the reason the app shows the
live allow-list beside the flag at publish, rather than storing it once
and trusting it.

We expect the policy to be applied without Editor ever holding a
credential for the host, because the allow-list is published as a
committed file for that document in the production repository and the
pipeline applies the access policy from it, using a secret that lives in
the pipeline and nowhere else. This is the same shape as the push:
Editor writes and commits, and something else with the right key acts on
what it committed. Falsifiable in one search: examine Alice's machine and
the app's settings for any token belonging to the host, and there must be
none.

We expect the allow-list not to sit in the document folder, because a
list of people's addresses is not part of the text and the folder must
stay something Alice can send to Carol. It travels to the production
repository, which is private, and never to the folder or the built pages.

We expect gating to cost nothing inside the document, because the flag
lives in the publish log and the policy lives at the host. The Markdown,
the assets, and the built output of a gated document are byte-identical
to the same document published unlisted. This is falsifiable: publish one
document each way and compare the built trees.

We expect the gate to belong to the document rather than to a version,
because it stands in front of everything under the document's id: every
version, every variant, every asset. A version's content never changes —
an old link shows what it showed — but access follows the document, so
gating a document today puts the reading Bob saved in March behind the
same door.

We expect the choice to stay deliberate because it is presented at every
publish and recorded per version, so a version that went out unlisted can
be identified afterwards from the log alone rather than from memory
(04-surfaces.md section 7).

## Scope Conditions

- Platform: the presenter site's host access control, applied over one
  document's path. The gate covers the stable path, every version path,
  every variant path beneath the id, and everything under them — article,
  deck, PDF, assets, and published layers.
- Population: Alice, plus the named readers on an allow-list she edits in
  the app's publish panel. Editor holds no account, no password, no
  session, and no token for the host, and keeps no record of who has read
  what. The access provider necessarily learns the identity of a reader
  who signs in — that is what a gate is — and that is the one carve-out
  in the rule that nothing is stored about a reader: Editor and the pages
  it publishes hold nothing, and the door holds what a door must.
- Assumption: the allow-list is published as a per-document file in the
  production repository, which is private, and the pipeline applies the
  access policy from it with a secret of its own. The allow-list never
  enters the document folder and never reaches a built page.
- Assumption: the production repository is private and the deployed site
  public, so for a gated document the access policy is the only thing
  between a reader and the files (ADR-2609051324157479).
- Assumption: the flag is chosen at every publish and never inherited
  silently from the last one.
- Boundary with map #7 (itd-2609051335468596, Publish and get a link I
  can open from the lectern): 7 owns the publish action, the stable id,
  the version hash, unlisted, and the presenter that shows nothing
  without an id. 20 owns the other side of that one flag — what gated
  means: the access policy, the allow-list Alice edits, the sign-in Bob
  meets, and the statement, at the point of choosing, that unlisted is
  not private.
- Boundary with map #19 (itd-2609051335598083, Give each audience its own
  link): 19 owns the per-variant paths beneath one id. 20 gates the id,
  so every variant path beneath it is gated together; a gate that applies
  to one variant and not another is out of scope for both.
- Boundary with map #16 (itd-2609051335568936, Point a video at several
  sources, one behind a sign-in): both involve a sign-in and they are
  different gates. 20 is the gate Alice puts over her own document. 16
  consumes someone else's gate on someone else's site, which Editor never
  configures, never probes at build time, and holds no credential for.
- Out of scope: any account system, any per-reader permission finer than
  the allow-list, and any record of a reader kept by Editor or by the
  built pages.
- Excluded plumbing: the access policy's configuration.

## Acceptance Criteria

- Given a document with a stable id and at least one published version,
  when Alice chooses gated and enters two addresses in the allow-list,
  then the publish completes, the publish log entry for that version
  records the flag as `gated` with its links, and the app shows the flag
  and the current allow-list against that version.
- Given the same publish, when the document folder is searched afterwards
  and Alice's machine and the app's settings are examined, then no file
  in the document folder holds any address from the allow-list, and
  Editor holds no token, password, or session for the host: the
  allow-list has gone to the production repository and the policy has
  been applied by the pipeline. (Negative case.)
- Given Alice is choosing between unlisted and gated, when the publish
  panel shows the choice, then it states in words what unlisted means —
  that anyone holding the link can read it, and that a link once sent
  cannot be recalled — and it asks the question every publish rather than
  carrying her last answer forward silently.
- Given a gated document, when a reader whose address is on the
  allow-list opens the stable link, then they are asked to sign in and,
  once signed in, reach the article; the deck, the PDF, and the assets
  beneath the same id then open with no second sign-in.
- Given the same gated document, when a reader whose address is not on
  the allow-list opens the same link and signs in, then they are refused,
  and the refusal carries no title, no heading, no asset name, and no
  count of versions or variants. (Negative case.)
- Given a gated document, when any built file beneath its id is requested
  directly with no session — an image, `paper.pdf`, a slide page — then
  the response is the sign-in rather than the file. (Negative case.)
- Given a document whose earlier version published unlisted and whose
  latest publishes gated, when any path beneath its stable id is
  requested, including the earlier version's, then it is behind the gate;
  and when an allow-listed reader signs in and opens that earlier
  version, then it serves exactly the content it served before, byte for
  byte. Access follows the document; content stays with its version, and
  the publish log still shows each version with the flag it was published
  under.
- Given Alice removes one address from the allow-list and publishes
  again, when that reader opens the link they used yesterday, then they
  are refused, and when a reader still on the list opens it, then they
  reach the same version.
- Given a gated document and a reader on the allow-list, when they sign
  in at iPhone width (390 CSS px), at iPad width (820 CSS px), and at
  desktop width (1280 CSS px), then the sign-in and the article render at
  every one of the three widths with no horizontal scrolling and no
  pinching, and images load without a further sign-in.
- Inherits: nothing is stored about a reader (`itd-2609051336145770`),
  with the one carve-out this moment creates — the access provider holds
  the identity of a reader who signs in, while Editor and the published
  pages hold nothing; network only on publish (`itd-2609051336158553`),
  which covers applying the access policy as part of the publish Alice
  started; no machine in the document (`itd-2609051336080960`); legible
  on three device classes (`itd-2609051336128348`), at 390, 820, and 1280
  CSS px; variant fidelity (`itd-2609051336107315`), since the gate
  covers every variant together and a refusal names none of them.

## Open Questions

- The length of the stable id and of the version hash is open in
  03-evidence.md ("Publish and pipeline"). It sets what the unlisted half
  of this choice is actually worth, and therefore how strongly the app
  should press the gated option for a document Alice calls confidential.
- Confirmation that Editor pushes with the author's existing setup and
  holds no token of its own is open in 03-evidence.md ("Publish and
  pipeline"). The allow-list travels the same way — committed and applied
  by the pipeline — so the same confirmation covers both.
- How quickly a change to the allow-list takes effect, since the policy
  is applied by the pipeline after the push. Alice removing a reader
  wants to know when that reader stops getting in, not only that they
  eventually will.
- Whether taking a gated document off the site removes its allow-list
  with it. Map #28, itd-2609051402150739, holds that as its own criterion;
  what a withdrawal leaves behind is the same question from the other
  side.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
