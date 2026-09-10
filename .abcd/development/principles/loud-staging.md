# Loud staging

## The convention

A stage that no-ops, degrades, or cannot do what it was asked says so. Never a
false green. Silence is reserved for success.

## Why it earns its keep

A pipeline that reports success when a step did nothing is worse than one that
fails, because it spends the credibility of every other green. The reader
cannot tell the difference between "checked and fine" and "not checked", and
after one such stage they cannot trust any of them.

The same holds at the keystroke. A chord that is claimed — so the platform does
not act on it — and then does nothing is a claim with nothing behind it: it
looks like a feature and is not. Either it does the thing, or it says why it
cannot.

## What it costs

Noise. A stage that announces every skip is tiring, and the discipline can
degrade into a log nobody reads. The answer is that the announcement is
proportionate to the surprise: a step skipped for a stated, expected reason
says so once; a step that cannot run at all is louder.

## How to tell it is being followed

- A test suite that skips its whole body when a fixture is missing and exits
  zero. Skipping loudly, naming what was absent, is the fix.
- A command bound to a chord that returns without acting and without reporting.
- A verdict of "inconclusive" recorded as "met" because nothing contradicted it.
- A manual check recorded as an unticked row rather than assumed, so the record
  shows what the automated run could not reach, is the shape of this working.

## Related

[Verifier selects, gates decide](verifier-selects-gates-decide.md) — a verifier
that cannot verify owes the gate that fact, not a pass.
