---
schema_version: 1
id: "iss-2609051428335393"
slug: "bundle-planning-is-not-supported-by-the-binary-intent-plan-t"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "intent-plan"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: ".abcd/development/brief/07-intent-map.md"
wontfix_reason: "Not this repository's code: the finding is about the abcd binary and its bundled plugin skills, which this application repository consumes and does not contain. It is recorded here because this repository is where it was met, and the working practice it names — hand-laying decision records in the documented id shape, one spec per bundle member, composing a release cut by hand where the plugin-shaped gates refuse in an application repo, and stamping a rubric and prompt hash on an audit request — is what this repository actually does in its place. Carrying it further belongs to the tool, not here"
---

Bundle planning is not supported by the binary: intent plan takes one id, ignores suggested_kind and bundle, and link refuses drafts, so bundle members got one spec each

## Grounds

- declined: an observation about a dependency's behaviour cannot be fixed in the repository that met it, and the workaround it describes is already this repository's practice; wrong if a later abcd release changes one of these behaviours and this repository's hand-laid records then diverge from what the binary expects, which is a fresh finding rather than this one reopened
