# mae for Cursor

A native port of the **mae** spec-driven, human-gated workflow (`init` / `start` /
`finish` / `fix`) for [Cursor](https://cursor.com). Cursor has no plugin or marketplace
system, so this folder is a **source bundle** you copy into your project's `.cursor/` — plus
a metadata `plugin.json` used only by this repo's CI gate.

## What's here

```
plugin.json          metadata + gate anchor only (not consumed by Cursor)
rules/
  using-mae.mdc      the mae session contract (alwaysApply rule)
commands/            the four commands, one file each
  mae-init.md          → /mae-init
  mae-start.md         → /mae-start
  mae-finish.md        → /mae-finish
  mae-fix.md           → /mae-fix
hooks.json           beforeShellExecution guard wiring
hooks/
  guard-cursor.sh    deny-list for dangerous shell commands
mcp.json             optional Playwright MCP sample
```

## Install

Copy the pieces into the project you drive with mae:

```bash
mkdir -p .cursor/rules .cursor/commands .cursor/hooks
cp rules/using-mae.mdc   .cursor/rules/
cp commands/*.md         .cursor/commands/
cp hooks.json            .cursor/hooks.json
cp hooks/guard-cursor.sh .cursor/hooks/
chmod +x .cursor/hooks/guard-cursor.sh
# optional MCP:
cp mcp.json              .cursor/mcp.json
```

- `rules/using-mae.mdc` is `alwaysApply: true`, so the mae contract loads every session.
- Each `commands/mae-*.md` becomes `/mae-<name>` in Cursor chat.
- `hooks.json` wires `beforeShellExecution` to `guard-cursor.sh`, which **denies**
  force-push, `git reset --hard`, `rm -rf`, and writes to `.env*` / `secrets/` / `.claude/`
  / `.github/workflows/` / `docs/constitution.md`.

## Commands

| Command | Use |
|---|---|
| `/mae-init` | Bootstrap or adopt a project; scaffold the SDD layer and survey it. One-time; re-run to refresh. |
| `/mae-start` | Begin a feature: interview → spec → task branch → recon + analysis → plan (present & STOP for approval). |
| `/mae-finish` | Review → quality gate → verify DoD → docs-with-code → conventional commit → draft PR, then STOP. |
| `/mae-fix` | Bug loop: reproduce → failing test → smallest fix → same gate → patch spec + fix record. |

## Notes

- **Scaffolder.** `/mae-init` runs the mae repo's `scripts/scaffold.mjs`
  (`node <path-to-mae>/scripts/scaffold.mjs --target .`). Point it at wherever you cloned
  this repository.
- **Out of scope (v1):** the `e2e-planner` / `e2e-runner` agents. They may land later.
