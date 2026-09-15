---
id: itd-2609151837374137
slug: edit-one-document-together-across-the-network-alice-and-bob
spec_id: null
kind: null
suggested_kind: null
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: hand-written
---

# Edit one document together, across the network

## Press Release

Alice is writing the paper and Bob is writing the talk, and they are the
same text. Alice opens the document folder on her machine, chooses Share,
and names Bob. On Bob's machine an offer appears with the document's title
and Alice's name; he accepts, and the same folder opens in front of him,
chapter list and all. He opens the chapter Alice is in, splits his area,
and puts the introduction beside it. As Alice types in the introduction,
her sentence appears on Bob's screen, character by character, with a
second caret carrying her name. Bob fixes a citation two paragraphs down
at the same time, and neither keystroke waits for the other. When Alice
saves, one file is written, and it holds both edits; when Bob saves a
moment later, nothing changes on disk, because it is the same text.

Each keeps their own caret, their own windows, their own undo. A chapter
only one of them has open is theirs alone until the other opens it. When
Bob closes the document, or his machine loses the network, Alice sees him
go, keeps everything both of them wrote, and carries on. Nothing about
Bob's machine, or the network between them, is written into the document.

## Why This Matters

Two people writing one text today take turns, or keep two copies and
merge, and a merge on Markdown that someone aligned by hand is where the
byte-fidelity discipline is quietly broken. A session that shows each
author the other's edits as they happen removes the turns and the copies,
and the one-text promise the rest of Editor makes — one source, the
renderings agree, a save writes what the author sees — extends to two
authors without a new copy of the text appearing anywhere. This is the
first intent that widens the population from Alice alone, and it is
filed only because `adr-2609151837453096` narrows the network rule to
admit it.

## Mechanism

> _Prompted: to be written in the planning interview as falsifiable
> "we expect X because Y" claims. Candidates the record already suggests:
> the window tree's lockstep echo of change sets is the local half of a
> session (adr-2609091832455881); converging two authors' change sets
> needs a model that commutes, which the echo does not, so the spec must
> choose one and say what a save writes._

## Scope Conditions

> _Required: to be elicited in the planning interview. Candidates: the
> desktop app only; two authors, not N; both on machines that can reach
> each other, by whatever route — the Tailscale intent
> (itd-2609151837370351) is one route and not a precondition; a session is
> person-started and ends with the document; no name or address of a
> machine enters the document; one source and byte fidelity hold for the
> saved text._

## Acceptance Criteria

> _Required: Given-When-Then bullets to be confirmed in the planning
> interview. Seeded candidates:_
> - _Given Alice has shared and Bob has accepted, When Alice types in a chapter both have open, Then Bob's window shows the text as she types and Bob's caret does not move._
> - _Given both type in one chapter at once, When either saves, Then one file is written holding both edits and a second save writes nothing new._
> - _Given Bob's machine goes offline mid-session, When Alice carries on, Then no edit by either is lost and Alice is told he has gone._
> - _Given a session ran, When the document's files are read, Then none carries a hostname, an address, or a network name._
> - _Given no session is open, When the app is watched on the network, Then it makes no request and listens on nothing._

## Open Questions

- How two authors' edits converge, and which machine's text a save
  writes: the spec's central question, and a candidate for its own ADR.
- Whether a chapter one author has open and the other opens later arrives
  with the first author's unsaved edits or the text on disk.
- What the offer shows before it is accepted, and whether an offer can be
  declined silently.
- Whether presence and the second caret are drawn in the window tree's
  existing per-window model or need a new decoration.
