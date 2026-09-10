# Evaluator outside the loop

## The convention

Whoever reviews an option did not propose it. The reviewer is independent of
the author — a different agent, a different model, or a human who has not seen
the reasoning that produced the thing under review.

## Why it earns its keep

An author reviewing their own work checks it against the design they had in
mind, which is the one thing that is certainly consistent with it. What they
cannot check is whether the design was right, because the design is the lens.
The failures that survive self-review are the ones the author never thought to
look for, and no amount of care substitutes for a second pair of eyes that
does not already know the answer.

This applies to more than code. A spec written by whoever will build it tends
to specify what is easy to build. A research note written by whoever wants the
conclusion tends to reach it. A verdict written by whoever asked for the verdict
is not evidence.

## What it costs

A second pass, and the wall-clock and token cost of one. It also costs the
author the experience of being told they were wrong by something that did not
share their context, which is the whole point and is not comfortable.

## How to tell it is being followed

- A diff presented as reviewed, where the review was performed by the agent
  that wrote it.
- A review that finds only style notes is usually a review that did not have
  the independence to find anything else.
- A review that reports a section as clean, explicitly, rather than silently
  omitting it, is a review that actually looked. A clean section is a finding.
- An adversarial reviewer given the acceptance criteria and told to go
  criterion by criterion, returning confirmed findings separately from
  plausible ones, is the shape of this working.

## Related

[Verifier selects, gates decide](verifier-selects-gates-decide.md) — the
independent reviewer proposes; it does not decide.
