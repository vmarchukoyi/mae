<!-- mae-scaffold-version: {{MAE_VERSION}} -->

# AGENTS.md — <PROJECT NAME>

This project runs the **mae** spec-driven development workflow (a Claude Code plugin).
This file is the switchboard: what the workflow is, where things live, and the one rule
about how work enters. It is scaffolded by `/mae:init` and carries the scaffold version
marker above — do not delete that line.

## Two documents, not one

- **`docs/constitution.md`** — engineering **law** (stack lock, hard rules, Definition of
  Done). Changes need senior review and a standalone PR.
- **`docs/PROJECT.md`** — **business** context (idea, goals, roles, scenarios), generated
  by `/mae:init`.

Never conflate them. Detailed, path-scoped rules live under `.claude/rules/`.

## The workflow — four skills

| Skill | Role |
|---|---|
| `/mae:init` | Bootstrap or adopt this project (questionnaire), **then** survey the codebase → `docs/PROJECT.md` + `docs/architecture-map.md`. One-time; re-run to refresh. |
| `/mae:start` | Spec interview → recon → `spec-analyst` → Plan Mode → `specs/<feature>/plan.md`. |
| `/mae:finish` | Review → verification gate → test gate → DoD vs diff → docs → draft PR, then STOP. |
| `/mae:fix` | Reproduce → failing test → smallest fix → same gate → record. |

Full narrative: `docs/conventions/workflow.md`. Git convention: `.claude/rules/git.md`.

## Entry-point precedence (read this)

> Feature and bug work in this project enters through `/mae:start` and `/mae:fix`
> only. Superpowers process skills run **inside** mae stages, never as alternative entry
> points; if `superpowers:brainstorming` or `superpowers:writing-plans` would trigger on
> feature work, route to the mae skill instead.

mae delegates process discipline to the **superpowers** plugin at defined stages (planning,
execution, TDD, debugging, verification, review). Both plugins are required and are enabled
in `.claude/settings.json`.

## Agent roster

- **`spec-analyst`** — pre-plan critic: reconciles the spec against `docs/constitution.md`
  and the code, then adversarially attacks it in clean context. One dispatch.
- **`code-reviewer`** — single source of pre-PR review criteria.
- **`test-runner`** — runs the quality gate (lint → typecheck → test → build), faithfully.
- **`e2e-planner` / `e2e-runner`** — *if enabled* at `/mae:init` (Playwright MCP registered
  in `.mcp.json`). Recon uses the built-in Explore agent.

## Surface layout

<Fill in during /mae:init — the apps, packages, and modules that make up this repo.>

- Apps → `<apps/…>`
- Packages → `<packages/…>`
- Modules → `<modules/…>`

## Guaranteed behavior

- The mae plugin's hooks block destructive commands and writes to protected paths.
- `.claude/settings.json` denies edits to `.env*`, secrets, `docs/constitution.md`, and
  workflow files; `ask`-gates push / PR / network / package-add.
- `scripts/validate-workflow.mjs` validates project artifacts and links.
