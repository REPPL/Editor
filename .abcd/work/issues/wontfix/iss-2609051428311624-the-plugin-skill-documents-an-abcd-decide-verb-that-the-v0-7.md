---
schema_version: 1
id: "iss-2609051428311624"
slug: "the-plugin-skill-documents-an-abcd-decide-verb-that-the-v0-7"
severity: "minor"
category: "observation"
source: "user-observation"
found_during: "prepare-this-repo"
origin: researcher-authored
production_mode: dictated-and-formatted
found_at: ".abcd/development/decisions/adrs"
wontfix_reason: "Not this repository's code: the finding is about the abcd binary and its bundled plugin skills, which this application repository consumes and does not contain. It is recorded here because this repository is where it was met, and the working practice it names — hand-laying decision records in the documented id shape, one spec per bundle member, composing a release cut by hand where the plugin-shaped gates refuse in an application repo, and stamping a rubric and prompt hash on an audit request — is what this repository actually does in its place. Carrying it further belongs to the tool, not here"
---

The plugin skill documents an abcd decide verb that the v0.7.1 binary does not have; five decision records were laid by hand in the documented id shape

## Grounds

- declined: an observation about a dependency's behaviour cannot be fixed in the repository that met it, and the workaround it describes is already this repository's practice; wrong if a later abcd release changes one of these behaviours and this repository's hand-laid records then diverge from what the binary expects, which is a fresh finding rather than this one reopened
