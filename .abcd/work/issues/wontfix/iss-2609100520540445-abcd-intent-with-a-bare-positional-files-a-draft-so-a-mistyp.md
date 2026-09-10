---
schema_version: 1
id: "iss-2609100520540445"
slug: "abcd-intent-with-a-bare-positional-files-a-draft-so-a-mistyp"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "maintainer-review"
origin: researcher-authored
production_mode: hand-written
found_at: ".abcd/development/intents/drafts"
wontfix_reason: "Not this repository's code: abcd intent's bare-positional form is the binary's own interface, and the same disposition applies as to the four tooling findings struck earlier. The mitigation that is this repository's to make is already in force — the SCRATCHEDITS domain in .abcd/rules.json tells an agent to verify rather than assume after any destructive or record-writing command, and a stray draft is cheap to spot with abcd intent status's actual verb, the bare abcd render"
---

abcd intent with a bare positional files a draft, so a mistyped subcommand becomes a record: an agent running abcd intent status <id> minted an unwanted draft intent rather than being refused as an unknown command, and had to delete the file by hand

## Grounds

- declined: a footgun in a dependency's command surface cannot be fixed here, and the cost of the sighting was one deleted file; wrong if a mistyped subcommand ever mints a record that is not obvious on the next bare render, which would make it a silent corruption rather than a visible stray
