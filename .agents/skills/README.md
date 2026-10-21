# Project skills

These local skill references are installed for the myCDrecords client. They guide frontend decisions in this repository.

- `frontend-design`: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- `design-taste-frontend`: https://github.com/Leonxlnx/taste-skill/tree/main/skills
- `ponytail`: https://github.com/DietrichGebert/ponytail/tree/main/skills/ponytail
- `superpowers`: https://github.com/obra/superpowers/tree/main/skills
- `systematic-debugging`: https://github.com/obra/superpowers/tree/main/skills/systematic-debugging
- `verification-before-completion`: https://github.com/obra/superpowers/tree/main/skills/verification-before-completion
- `test-driven-development`: https://github.com/obra/superpowers/tree/main/skills/test-driven-development
- `webapp-testing`: https://github.com/anthropics/skills/tree/main/skills/webapp-testing

The external repositories remain the source of truth for updates. This project applies their guidance through the repository instructions and the implementation conventions in `src`.

Installed tool: `lean-ctx` (https://github.com/yvgude/lean-ctx), a global MCP server and CLI that cuts token usage. Telemetry is off. Check with `lean-ctx doctor`, measure with `lean-ctx gain`, remove with `lean-ctx uninstall`. Keep it registered in one MCP scope only (user scope; no `.vscode/mcp.json`).
