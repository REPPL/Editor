---
id: itd-2609051336074533
slug: round-trip-byte-fidelity-any-path-that-reads-and-writes-the
spec_id: null
kind: discipline
suggested_kind: discipline
reclassification_history: []
builds_on: []
severity: minor
impact: additive
origin: researcher-authored
production_mode: dictated-and-formatted
---

# Round-trip byte-fidelity

## Rule

Any path that reads the source and writes it back returns it byte for
byte, except at the spans the author edited. Serialising an unedited tree
reproduces the chapter file exactly; serialising an edited tree changes
only the bytes the author changed.

## Forbids

- Reflowed lines. A 544-character line comes back 544 characters long,
  and no paragraph is rewrapped to a pleasing width.
- Invented escapes. No character is re-escaped, no emphasis is added
  around a run the author left plain, no number is escaped.
- Realigned tables. Ragged pipes stay ragged; column padding belongs to
  the author, not to the serialiser.
- Dropped comments. `<!-- pagebreak -->` and every other HTML comment
  survives every read and every write.
- Rewriting outside an edited span: reordered front matter, normalised
  line endings, a trailing newline added or removed, a percent-encoded
  path decoded and re-encoded.
- Any preview, renderer, or export writing to a chapter file at all.

## Binds From

Phase 1, and it holds for every phase after it. Intent 13, import by
split, is its first hard test; intent 18, editing on the iPad and
bringing the text back, is its second. Both are named in the map as tests
of this discipline rather than owners of it, so neither restates it.

## How A Spec Proves It

- Given a chapter holding a 544-character line, a table with ragged
  pipes, and `<!-- pagebreak -->` alone on a line, When it is opened and
  saved with no edit, Then the file's bytes are identical to before,
  compared by content hash.
- Given that same chapter, When Alice changes one word in one paragraph,
  Then the only bytes that differ lie inside that paragraph's source
  span, and every other line is byte-identical.
- Given a flat manuscript of 814 lines with four heading levels, When it
  is imported by split, Then concatenating the written chapter files in
  numeric order reproduces the original file byte for byte.
- Given a chapter imported into the single HTML file and exported again
  with no edit, When the two files are compared, Then they are
  byte-identical.
- Given any rendering path — article, deck, PDF, preview — When it runs
  over a chapter, Then the chapter file's bytes are unchanged afterwards;
  a renderer that writes to the source fails this discipline outright.
- Given a chapter reference whose folder name contains a percent-encoded
  space, When the chapter is read and written back, Then the encoding of
  every reference is unchanged.

## Why

`03-evidence.md` records the acceptance project's byte-level hazards —
544-character lines, byte-identical duplicate images, and a
percent-encoded folder path containing a space — and draws the conclusion
that "Round-trip byte-fidelity is a hard acceptance criterion, not a
nicety". The same chapter records the reviewers' demand for "no invented
emphasis, no escaped numbers, no reflowed lines or tables, and the
page-break comments preserved". The mechanism is in `05-internals.md`
section 2: every node carries its attributes exactly as written and its
source span as byte offsets into the chapter file, so serialisation can
copy untouched bytes rather than regenerate them. Fidelity is what makes
the promise in `02-constraints.md` — that Emacs, Pandoc, and any plain
tool remain free to edit the same files — safe to keep, because a
document that survives Editor unchanged is a document the author has not
been made to surrender.

## Audit Notes

_Empty. Populated by intent-auditor when intent moves to shipped/._
