---
id: adr-2609151837453096
slug: a-shared-editing-session-is-the-second-thing-that-may-touch
status: proposed
date: 2026-09-15
supersedes: null
superseded_by: null
related_intents: [itd-2609151837374137, itd-2609151837370351, itd-2609051336158553]
related_rfcs: []
related_adrs: [adr-2609091832455881]
---

# ADR-2609151837453096: A shared editing session is the second thing that may touch the network

## Context

The discipline *network only on publish* (`itd-2609051336158553`) says the
app touches the network only during a publish Alice started, and its
Forbids list names "sync of any sort, or a local-network server in the app
for tablet editing". The brief records that a local-network server was
considered for tablet editing and declined in favour of a file the author
carries (03-evidence, "Decisions made"). Every shipped intent's population
is Alice working alone on one document.

On 2026-09-15 the maintainer asked for a shared editing session: two
people on two machines in one document, each seeing the other's edits as
they type. That is sync by any reading of the word, and it cannot be built
under the rule as written. The maintainer confirmed in the same sitting
that this is a reversal of the discipline, not a reading of it, and asked
for it to be recorded before anything is planned against it.

What is already locked: the app still makes no request nobody asked for
(no update check, no telemetry, no fetch at start-up, no probe of a video
source); the exported single file still carries no remote dependency;
nothing is stored about a reader; and no machine's name or address enters
a document (`itd-2609051336080960`). The window tree
(`adr-2609091832455881`) already keeps N windows on one buffer in lockstep
through an echo of change sets, which is the local half of what a session
needs.

## Decision

We will allow the app to touch the network for exactly two things: a
publish Alice started, and a shared editing session a person started. A
session begins only when someone in the app offers a document or accepts
an offer, lasts only while both keep it open, and ends the moment either
closes it or the machine goes offline. Outside a session and outside a
publish the rule stands unchanged: no background traffic, no polling, no
sync, no server listening when no session is open.

The discipline's rule sentence and its Forbids list are amended in the
same change that accepts this record, quoting what they said and dating
the amendment, so the record does not read false against the tree.

What a session may carry: change sets, carets, and presence for the
chapters both have open; nothing else. What it may not carry or write:
any name or address of a machine or network into any file the document
holds. What a save writes: one text, from the converged state, byte for
byte what the two authors see; who holds the file and how the two states
converge is the subject of the spec that plans `itd-2609151837374137`,
and if that choice proves architecture-shaping it gets its own record.

## Alternatives Considered

1. **Keep the rule and refuse the intent.** Honest and cheap, and the
   discipline stays whole. Rejected by the maintainer: the shared session
   is wanted, and a rule that forbids the product's next moment is a rule
   to amend, not to hide behind.
2. **Read the rule as permitting it.** Argue that a session Alice starts is
   a publish-like act the rule already allows. Rejected: the Forbids list
   names sync in so many words, and a reading that makes the list say the
   opposite of its text is a silent rewrite. The maintainer chose to call
   it a reversal.
3. **Sync through the publish target.** Two authors push to and pull from
   the private repository the publish pipeline already uses. Rejected for
   this decision: it is not live, it puts every keystroke into a git
   history, and it makes the publish credential a collaboration
   credential. It remains available as a fallback path a later record may
   pick up.
4. **Narrow the rule to a person-started session (chosen).** The smallest
   opening that admits the intent: the app may open a connection a person
   started, to a peer they chose, for the length of a session, and
   nothing else changes.

## Consequences

Easier: the two collaboration intents can be planned without contradicting
a live rule; the window tree's lockstep echo has a named next step; the
tablet path's declined server is no longer the only precedent.

Harder: the discipline's audit has a second permitted case to check, and
every future network claim must say which of the two it is. *One source,
always* and *round-trip byte fidelity* now have to hold with two writers,
which is a convergence question the spec must answer and this record
does not. The offered-and-accepted rule needs a trust boundary: who may
offer, who may accept, and what is shown before either says yes.

Obligations: the discipline is amended in the accepting change; the
intents' scope conditions name the session as the only network path they
use; no record, test, fixture, or doc may carry a hostname, an address, or
a network's node name; and the Tailscale intent (`itd-2609151837370351`)
is optional and vendor-specific by construction, so a session must be
reachable without it.
