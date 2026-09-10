# Verifier selects, gates decide

## The convention

A verdict is a proposal. Whatever produced it — a test run, a review, an audit,
a survey — narrows the options and says which it prefers. Adopting one is the
maintainer's act, and it is recorded as theirs.

## Why it earns its keep

A verifier that also decides is a verifier nobody can overrule, and its
failure mode is silent: it picks, the pick becomes the state of the repository,
and the reasoning that would have shown it wrong is never written down. Keeping
the gate human keeps the reasoning in the open, because a proposal has to be
legible enough to accept or refuse.

It also keeps the verifier honest about uncertainty. A reviewer that must decide
has an incentive to sound certain; a reviewer that proposes can say "plausible,
not confirmed" and still be useful.

## What it costs

Latency. Work stops at the gate, and the maintainer is the bottleneck by
design. The mitigation is not to remove the gate but to make what reaches it
decision-shaped: options, costs, a recommendation, and what would show the
recommendation wrong.

## How to tell it is being followed

- A finding acted on without the maintainer seeing it, on the grounds that it
  was obviously right.
- A recommendation presented as a conclusion, with no alternative stated and no
  falsifier — a proposal that cannot be refused is a decision in disguise.
- A settled question recorded with the maintainer's reasoning rather than the
  verifier's, and a declined option recorded with its cost, is the shape of
  this working.

## Related

[Evaluator outside the loop](evaluator-outside-the-loop.md) is who proposes.
[Loud staging](loud-staging.md) is what a verifier owes when it cannot verify.
