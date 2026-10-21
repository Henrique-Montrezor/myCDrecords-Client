---
name: webapp-testing
description: Verify the running app in a real browser with Playwright: UI behavior, screenshots, console and network errors.
source: https://github.com/anthropics/skills/tree/main/skills/webapp-testing
---

Reconnaissance then action: open the page, wait for `networkidle`, take a screenshot or read the DOM, pick selectors from the rendered state (role, text, id), then act. Capture console errors and failed requests. Run in headless Chromium and close the browser. In this project use the editor browser tools against `http://localhost:5173`, check 375px and >= 1280px, and cover loading, empty, error, success and anonymous states. Repeatable checks belong in Vitest (`*.test.tsx`), not in one-off scripts.
