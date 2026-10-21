---
name: systematic-debugging
description: Use for any bug, test failure, build failure or unexpected behavior before proposing a fix.
source: https://github.com/obra/superpowers/tree/main/skills/systematic-debugging
---

No fix without root cause. Phases: (1) read the full error, reproduce, check recent changes, and for multi-layer flows (client -> API -> MySQL/Redis) log what enters and leaves each boundary; trace bad data back to its source. (2) Compare with similar working code and list every difference. (3) State one hypothesis, change one variable, verify. (4) Write a failing test, apply a single fix at the source, re-run. After 3 failed fixes stop and question the design with the user. Never bundle refactors with the fix.
