---
name: test-driven-development
description: Use when implementing a feature or bugfix, before writing implementation code.
source: https://github.com/obra/superpowers/tree/main/skills/test-driven-development
---

Red, green, refactor. Write one failing test for the behavior, watch it fail for the right reason, write the minimum code to pass, then clean up with tests green. Test behavior through the public surface (Testing Library queries by role/name, `axe-core` for accessibility), not implementation details. Client tests live next to the code as `src/**/*.test.ts(x)`; call `cleanup` in `afterEach` because Vitest globals are off.
