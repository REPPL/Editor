---
id: itd-2609151837370351
slug: find-a-co-author-on-the-tailscale-network-when-the-machine-i
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: [itd-2609151837374137]
severity: minor
impact: additive
origin: researcher-authored
production_mode: hand-written
---

# Find a co-author on the Tailscale network

## Press Release

Alice and Bob are both on the same Tailscale network, the one they already
use to reach each other's machines. Alice chooses Share, and instead of
typing anything, she sees Bob's machine listed by the name the network
gives it, because Editor noticed the network and asked it who is there.
She picks Bob; the offer arrives on his machine the same way. Neither of
them typed an address, opened a port, or looked anything up. When the
network is not there, Share works as it does without it, and nothing in
Editor mentions Tailscale.

## Why This Matters

A shared session needs the two machines to find each other, and the
ordinary answer — an address typed by hand, a port opened — is the step
that makes people give up. A network the two already share, that already
knows their names and already carries their traffic encrypted, removes
that step without Editor becoming a network product. This is optional by
construction: the session intent (`itd-2609151837374137`) must work
without it, and this intent only makes the finding easier where the
network is present.

## Mechanism

> _Prompted: to be written in the planning interview. Candidates: the
> Tailscale client on the machine exposes a local status command and a
> local API that list the peers of the current network with their names,
> so Editor can read who is reachable without any request outside the
> machine; a session then opens over the network's own addresses, which
> are encrypted end to end by the network and not by Editor._

## Scope Conditions

> _Required: to be elicited in the planning interview. Candidates: the
> desktop app on macOS; the Tailscale client installed and running,
> detected by its presence and never installed or started by Editor;
> the peer list read locally, never written anywhere; a node name shown
> in the app is never written into a document, a record, or a log; the
> intent builds on the session intent and ships only after it._

## Acceptance Criteria

> _Required: Given-When-Then bullets to be confirmed in the planning
> interview. Seeded candidates:_
> - _Given the Tailscale client is running, When Alice chooses Share, Then the peers of her network are listed by name and choosing one sends the offer without an address typed._
> - _Given the client is not installed or not running, When Alice chooses Share, Then the dialogue is the session intent's own and nothing names Tailscale._
> - _Given a session was found this way, When the document's files, Editor's settings, and any log are read, Then none carries a node name or an address._
> - _Given no Share is in progress, When the client is running, Then Editor reads nothing from it and makes no request._

## Open Questions

- Whether the peer list is read through the command-line client or the
  local API, and what Editor does when the client is present but the
  person is logged out.
- Whether a peer without Editor running should be listed at all, or only
  those who can accept.
- Whether the network's own access controls are enough to say who may
  offer, or Editor needs its own consent step on top.
