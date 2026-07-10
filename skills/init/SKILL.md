---
name: init
description: Use to bootstrap or adopt a project for the mae SDD workflow — questionnaire-driven; detects new vs existing projects, scaffolds docs/constitution.md, rules preset, specs/, validator, permissions. Triggers on "init the project", "set up mae", "bootstrap sdd".
---

# /mae:init — bootstrap or adopt a project

Run this as an **interview**, not a batch job. Follow the ask-when-uncertain doctrine:
one question at a time (AskUserQuestion), each with your recommended answer and a one-line
why; research facts from the repo instead of asking them; no scaffolding before the open
decisions are resolved. Deterministic file placement is delegated to the scaffolder —
your job is to interview and to fill placeholders.

The scaffolder is invoked as:
`node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" --target . --preset <preset> [--e2e] [--ci]`

## Step 0 — Dependency check (gate)

Verify the **superpowers** plugin is available: its `superpowers:*` skills appear in the
session's skill list (the SessionStart hook also checks the plugin cache on disk). If it is
missing, STOP and give the exact install commands — do not scaffold anything:

```
/plugin marketplace add obra/superpowers
/plugin install superpowers@claude-plugins-official
```

## Step 1 — Detect project state

Inspect the working directory. **Empty / near-empty** (no source tree, no manifest like
`package.json` / `composer.json` / `pyproject.toml`) → **new-project branch**. Otherwise →
**existing-project branch**. If it is genuinely ambiguous, ask which the user intends.

## Step 2 — New-project branch

1. Ask whether to generate a base project structure (recommend: yes for a truly empty repo).
2. If yes, offer two paths:
   - **Preset frameworks** — a curated shortlist, scaffolded with the framework's **official
     generator**, never a bundled copy:
     - Next.js — `npx create-next-app@latest`
     - NestJS — `npx @nestjs/cli new`
     - Node/TS library — minimal `package.json` + `tsconfig.json`
     - Laravel — `composer create-project laravel/laravel`
     Before offering one, check the generator's tooling is available (`node`/`npx`,
     `composer`). If a generator is unavailable, say so and fall back to free description.
   - **Free description** — the user describes what they want; draft a structure proposal
     (tree + key configs) and create it **only after explicit approval** of the proposal.
3. Continue with the common scaffold (Step 4+).

## Step 3 — Existing-project branch

1. Analyze the codebase: dispatch the built-in **Explore** agent (mae ships no recon agent
   of its own) to report stack, layout, test/build commands, and existing docs.
2. Report what was **found** vs what will be **added**. Never overwrite an existing file
   without showing a diff and getting approval — the scaffolder skips existing files by
   default.

## Step 4 — Interview for the constitution

Detect/confirm the stack, then interview for the engineering law — one question at a time,
each with a recommended answer:
- **Stack lock** (language, package manager, framework, data layer, validation, auth…).
- **Hard rules** (the short absolute list the workflow enforces).
- **Definition of Done** (the PR-done gate).

Hold the answers; you fill the `docs/constitution.md` placeholders after scaffolding
(Step 5 writes the template with `<…>` placeholders).

## Step 5 — Run the scaffolder

Pick the rules preset from the detected stack: `typescript`, `php`, or `none` (unknown
stack → `_core` only, flag for manual completion). Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" --target . --preset <preset>
```

Ask (recommend yes, opt-out) two more questions, adding flags accordingly:
- **E2E testing?** → add `--e2e` (scaffolds `e2e-planner`/`e2e-runner` into `.claude/agents/`
  and registers the Playwright MCP server in `.mcp.json`).
- **CI enforcement?** → add `--ci` (scaffolds `.github/workflows/mae-checks.yml` — runs the
  validator and the Conventional-Commit PR-title check).

Then fill the `docs/constitution.md` placeholders with the Step 4 answers.

## Step 6 — Re-run behavior (idempotent)

On a re-run the scaffolder skips existing files. For a skipped-but-outdated file (its
`mae-scaffold-version` marker older than the installed plugin version), show a per-file diff
and apply only the changes the user approves. Never silently overwrite.

## Step 7 — Finish

Suggest `/mae:explore` to generate `docs/PROJECT.md` + `docs/architecture-map.md` — skip the
suggestion only if the existing-project analysis already produced `docs/PROJECT.md`.

## Handoff

- **What I did:** scaffolded the SDD layer (constitution, rules preset, specs, validator,
  permissions; optional e2e/CI) and filled the constitution from the interview.
- **Review before continuing:** `docs/constitution.md`, `.claude/settings.json`, `AGENTS.md`.
- **Run next:** `/mae:explore` (unless `docs/PROJECT.md` already exists).
