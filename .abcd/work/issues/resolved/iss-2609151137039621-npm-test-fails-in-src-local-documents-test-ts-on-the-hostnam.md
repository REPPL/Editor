---
schema_version: 1
id: "iss-2609151137039621"
slug: "npm-test-fails-in-src-local-documents-test-ts-on-the-hostnam"
severity: "major"
category: "bug"
source: "user-observation"
found_during: "gates"
origin: researcher-authored
production_mode: hand-written
found_at: "src/local-documents.test.ts"
resolution: "The guard in src/local-documents.test.ts matches the hostname as a whole word, case-insensitively and with hyphen boundaries, and skips a name under four characters with a console warning saying so rather than silently. A real machine name still fails the gate; a vendor default inside ordinary prose no longer does. The full suite passes: 55 files, 1232 tests."
impact: internal
---

npm test fails in src/local-documents.test.ts on the hostname guard: the check is a bare substring match against os.hostname(), and after a reboot macOS reports a three-letter vendor default that occurs inside ordinary prose, so any local document that mentions a laptop or a word beginning with those letters fails the gate. The guard's purpose is to catch a machine's identity leaking into a rendered page; a hostname too generic to identify a machine cannot leak one, and matching it as a substring rather than a whole word makes the gate depend on the machine's name of the day

## Grounds

- pursued: a hostname too generic to identify a machine cannot leak one, so skipping it out loud loses nothing while a whole-word match still catches a real name; wrong if a rendered page carrying a real machine name passes the gate
