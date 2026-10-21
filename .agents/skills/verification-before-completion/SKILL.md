---
name: verification-before-completion
description: Use before claiming work is done, fixed or passing, and before any commit or PR.
source: https://github.com/obra/superpowers/tree/main/skills/verification-before-completion
---

No completion claim without fresh evidence in the same turn. Identify the command that proves the claim, run it in full, read the output and exit code, then state the result with that evidence. Lint is not typecheck and typecheck is not build. A bug is fixed only when the original symptom is re-tested; a regression test must be seen failing without the fix. Avoid "should work" and "probably".
