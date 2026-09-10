---
id: adr-2609092000099546
slug: byte-fidelity-forbids-the-serialiser-not-the-author
status: accepted
date: 2026-09-09
supersedes: null
superseded_by: null
related_intents: [itd-2609061653559060]
related_rfcs: []
related_adrs: [adr-2609051324147479]
---

# ADR-2609092000099546: Byte fidelity forbids the serialiser reformatting, not the author's own edit reformatting what they are editing

## Context

The round-trip byte-fidelity discipline is stated twice in the brief, and both
statements are absolute noun phrases.

`05-internals.md` § 2: "Serialising an unedited tree reproduces the file byte
for byte. Serialising an edited tree changes only the spans that were edited:
no reflowed paragraph, no re-escaped character, no realigned table."

`07-intent-map.md` § Disciplines, the Round-trip byte-fidelity row: "Reflowed
lines, invented escapes, realigned tables, dropped comments. Any path that
reads and writes the source returns it byte for byte except where the author
edited".

Planned intent `itd-2609061653559060` asks for Markdown tables to stay aligned
as the author types them: an edit inside a pipe table realigns that table's
columns in the same transaction as the keystroke. Its spec
(`spc-2609091733494078`) establishes that the round trip itself is safe by
construction — a chapter is opened with `view.setState`, which dispatches no
transaction, so the alignment filter cannot see an open, and a chapter opened
and saved untouched is returned byte for byte.

Read as written, though, both clauses forbid the intent outright. "No realigned
table" admits no author and no occasion. That reading cannot be right — it
would also forbid `M-q`, which has shipped since phase one and reflows a
paragraph on the author's own instruction — but the clauses do not say so, and
a discipline that has to be read against its own words is a discipline that
will be misread.

The question this record answers is what the two clauses were written to
forbid, so that the intent is either permitted for a stated reason or refused
for one.

## Decision

Both clauses forbid **the serialiser reformatting on its own initiative**.
Neither forbids **an author's own edit reformatting the construct they are
editing**.

The distinction is the initiative, and it is legible in the source of the
`05-internals.md` clause itself: every word of that paragraph is about
serialising a tree. The failure it names is the one a Markdown round trip
classically has — the author edits one word, the serialiser rewrites the whole
document to its own house style, and the diff is unreadable. That failure is
still forbidden, entirely, and this record does not soften it.

An author typing inside a table and the table's columns moving with them is a
different act with a different author. It is the same kind of act as `M-q`
reflowing the paragraph the caret is in — asked for, bounded to the construct
the caret is in, and undoable in one press. `M-q` has shipped since phase one
against these same two clauses without anyone reading them as forbidding it,
which is evidence that the intended reading was always the narrow one.

Three conditions bound what an author's edit may reformat, and they are the
operative part of this record:

1. **The author's own edit is the occasion.** No timer, no save, no open, no
   background pass. A chapter opened and saved with nothing typed is returned
   byte for byte, ragged tables and all.
2. **The construct the caret is in is the limit.** A table realigns; the table
   below it does not, and no line outside the construct is touched.
3. **One undo undoes it.** The reformatting is part of the keystroke's own
   transaction, not a second one after it, so the author can always get their
   bytes back with the press they already know.

Anything that fails one of the three is the forbidden thing, whoever writes it.

Both brief clauses are corrected to say this, rather than left standing and
read against.

## Alternatives Considered

1. **Leave the clauses and read them narrowly.** Cheapest, and it is what has
   effectively happened for `M-q` already. Rejected: a discipline enforced by
   custom rather than by its own words has already failed once here — this
   record exists because a spec author read the clause literally and stopped —
   and the next reader has no reason to reach the same narrow reading.

2. **Take the clauses at their word and refuse the intent.** Legitimate, and it
   would send `itd-2609061653559060` back to the on-demand chord or the
   view-only decoration, both of which leave the bytes alone. Rejected because
   it would also, consistently applied, retire `M-q`; a reading that forbids a
   shipped and unregretted feature is a reading of the wrong rule.

3. **Amend the two clauses without a decision record.** Two one-line edits.
   Rejected: narrowing a stated prohibition is hard to reverse, is surprising
   without its context, and is the result of a real trade-off — the three tests
   the ADR README sets.

4. **Distinguish by construct rather than by initiative** — permit realigning
   tables, keep "no reflowed paragraph" absolute. Rejected as arbitrary: it
   would forbid `M-q`, which is the very feature that shows the narrow reading
   was always intended, and it puts the line somewhere no principle explains.

## Consequences

One clause is corrected in each of `05-internals.md` and `07-intent-map.md`.
The prohibition survives where it earns its keep — no serialiser tidying, no
background pass, no reformatting on open or save — and gains three explicit
conditions an author-initiated reformat must meet.

`itd-2609061653559060` is permitted, and its spec's own byte-fidelity section
is now measured against a stated rule rather than against an absolute it had to
argue with. `M-q` is retrospectively covered by the same rule it always
satisfied.

Any future feature that reformats source on the author's behalf — a list
renumberer, a fence tidier, a reference-link collector — is admitted or refused
by the three conditions above rather than by a fresh argument each time. A
feature that reformats on save, or that reaches beyond the construct the caret
is in, is refused by this record without needing a new one.
