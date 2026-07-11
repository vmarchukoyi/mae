# mae for OpenAI Codex CLI

A native port of the **mae** spec-driven, human-gated workflow (`init` / `start` /
`finish` / `fix`) for [Codex CLI](https://github.com/openai/codex). Codex has no plugin or
marketplace system, so this folder is a **source bundle** you copy into place — plus a
metadata `plugin.json` used only by this repo's CI gate.

## What's here

```
plugin.json    metadata + gate anchor only (not consumed by Codex)
AGENTS.md      the mae session contract — Codex loads AGENTS.md every session
prompts/       the four commands, one file each
  mae-init.md    → /mae-init
  mae-start.md   → /mae-start
  mae-finish.md  → /mae-finish
  mae-fix.md     → /mae-fix
config.toml    approval-policy + optional MCP sample
```

## Install

1. **Commands.** Copy the prompts so Codex exposes them as slash commands:

   ```bash
   mkdir -p ~/.codex/prompts
   cp prompts/*.md ~/.codex/prompts/
   ```

   Each file becomes `/mae-<name>` in a Codex session.

2. **Session contract.** Copy `AGENTS.md` into the **root of the project** you drive with
   mae (Codex loads a project's `AGENTS.md` every session). If the project already has an
   `AGENTS.md`, append the mae section rather than overwriting.

3. **Guard / approvals.** Merge the keys from `config.toml` into `~/.codex/config.toml`.
   See the file header for the protected-path list. Note the honest limitation: Codex
   enforces this as an **approval policy**, not per-command blocking like the Claude
   plugin's guard.

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
- **Out of scope (v1):** the `e2e-planner` / `e2e-runner` agents and any per-command shell
  blocking beyond `approval_policy`. Both may land later.
