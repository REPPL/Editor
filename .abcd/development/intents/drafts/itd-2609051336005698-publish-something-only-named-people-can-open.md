---
id: itd-2609051336005698
slug: publish-something-only-named-people-can-open
spec_id: null
kind: null
suggested_kind: standalone
reclassification_history: []
builds_on: []
severity: minor
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
carries its links. She takes one address off the allow-list, publishes
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

We expect gating to cost nothing inside the document, because the flag
lives in the publish log and the policy lives at the host. The Markdown,
the assets, and the built output of a gated document are byte-identical
to the same document published unlisted. This is falsifiable: publish one
document each way and compare the built trees.

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
  the app. Editor holds no account, no password, and no session, and
  keeps no record of who has read what.
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
  requested, including the earlier version's, then it is behind the gate,
  and the publish log still shows each version with the flag it was
  published under.
- Given Alice removes one address from the allow-list and publishes
  again, when that reader opens the link they used yesterday, then they
  are refused, and when a reader still on the list opens it, then they
  reach the same version.
- Given a gated document and a reader on the allow-list, when they sign
  in on an iPhone at 390 CSS pixels wide, then the article renders at
  that width with no horizontal scrolling and no pinching, and its images
  load without a further sign-in.
- Inherits: nothing is stored about a reader (itd-2609051336145770);
  network only on publish (itd-2609051336158553); no machine in the
  document (itd-2609051336080960); legible on three device classes
  (itd-2609051336128348); variant fidelity (itd-2609051336107315).

## Open Questions

- The length of the stable id and of the version hash is open in
  03-evidence.md ("Publish and pipeline"). It sets what the unlisted half
  of this choice is actually worth, and therefore how strongly the app
  should press the gated option for a document Alice calls confidential.
- Confirmation that Editor pushes with the author's existing setup and
  holds no token of its own is open in 03-evidence.md ("Publish and
  pipeline"). The same question decides how the access policy and its
  allow-list are created and updated at publish, since that is a second
  thing the publish action must be able to do without a credential of
  Editor's own.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
