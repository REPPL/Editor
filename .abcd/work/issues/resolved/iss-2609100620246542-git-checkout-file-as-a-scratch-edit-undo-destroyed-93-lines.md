---
schema_version: 1
id: "iss-2609100620246542"
slug: "git-checkout-file-as-a-scratch-edit-undo-destroyed-93-lines"
severity: "critical"
category: "bug"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd"
resolution: "Graduated to the committed record rather than left as a decisions line: a SCRATCHEDITS custom domain in .abcd/rules.json now injects on git checkout, git restore, git stash, revert, undo, discard, scratch, probe and non-vacuity prompts. Five rules: no git restore path as a scratch-edit undo, because they discard to HEAD and not to the working state; copy the file aside and force it back instead; verify a restore with git diff --numstat plus a grep marker per distinct piece of work rather than assuming it; never reason about whether a file is clean from the session's opening git status snapshot; and proving a test fails without its fix stays required, done by editing forward and back. The lost work itself was recovered verbatim and every piece is verified present"
impact: internal
---

git checkout -- <file> as a scratch-edit undo destroyed 93 lines of uncommitted session work in src/app.ts, recovered only by luck from sourcesContent in a stale dist source map: on a branch carrying a session's worth of unstaged work every git restore path discards to HEAD, not to the working state, and an agent reasoning from the session's opening git status snapshot read the file as clean when it was not

## Grounds

- pursued: a correction any agent should receive belongs in the repo's committed rules where the loader will inject it on the keywords that precede the mistake, not in one operator's memory or one dated decisions line nobody reads before running a git command; wrong if the recall keywords miss the phrasing an agent actually uses when it reaches for a revert, which would leave the rule true and silent
