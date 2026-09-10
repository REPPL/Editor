# Script-first MVP

## The convention

Earn each rung. The smallest documented protocol is the minimum viable version;
a script comes before a tool, a tool before a framework, and each step up is
justified by the one below it having been outgrown.

## Why it earns its keep

Automation encodes a process, and a process that has never been run by hand is
not yet understood well enough to encode. Building the tool first means
building it against a guess, and the guess is expensive to unpick once other
things depend on it.

Running it by hand first is also how the real steps get discovered — the
special cases, the order that matters, the step that turns out to be two steps.
A documented manual protocol is a specification written by use rather than by
imagination.

## What it costs

Doing the tedious thing on purpose, several times, while knowing how to
automate it. That is genuinely unpleasant, and the temptation to skip it is
strongest exactly when the process is most novel — which is when skipping it is
most costly.

## How to tell it is being followed

- A tool built for a process that has been run zero times.
- A framework introduced to solve a problem one script had not yet failed at.
- A rung skipped without saying which one, and why the one below was outgrown.
- A written-down protocol with numbered steps, run by hand, whose pain points
  are the specification for the tool that replaces it, is the shape of this
  working.

## Related

[Prefer SOTA, adversary-filtered](prefer-sota.md) — the state of the art is
often a higher rung than this repository has earned, and that is a fit
challenge, not a reason to climb.
