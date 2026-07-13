---
name: mae:init
description: Use once to bootstrap or adopt a project for the mae SDD workflow, then re-run only to refresh. Questionnaire-driven; detects new vs existing projects, scaffolds docs/constitution.md, the core rules, validator, permissions — then surveys the project into docs/PROJECT.md + docs/architecture-map.md (the two documents every later stage reads). specs/ is not scaffolded — /mae:start creates it on demand. On a re-run it skips existing scaffold files and incrementally re-surveys a stale map. Triggers on "init the project", "set up mae", "bootstrap sdd", "survey", "map the codebase", "refresh the map".
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion
---

# /mae:init — bootstrap or adopt a project (one-time, re-run to refresh)

Run this **once** to stand a project up on the mae workflow. It does two jobs in one
pass, in order:

1. **Scaffold the SDD layer** — `docs/constitution.md`, the core rules, the
   validator, permissions (optional e2e/CI) — and fill the constitution from an interview.
   `specs/` is **not** scaffolded; `/mae:start` creates `specs/<feature>/` on demand when
   a feature is planned.
2. **Survey the project** into the **two documents** every later stage depends on —
   `docs/PROJECT.md` (business context) and `docs/architecture-map.md` (structural map,
   stamped with the commit it reflects).

Run it as an **interview**, not a batch job (ask-when-uncertain doctrine): one question
at a time (`AskUserQuestion`), each with your recommended answer and a one-line why;
research facts from the repo instead of asking them; no scaffolding before the open
decisions are resolved. Deterministic file placement is delegated to the scaffolder —
your job is to interview and to fill placeholders.

The scaffolder is invoked as:
`node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" --target . [--e2e]`

**Re-run to refresh, not to redo.** On a re-run the scaffolder skips existing files and
the survey does an *incremental* re-survey of only the changed modules (Step 9). init is
idempotent — running it again never clobbers approved work.

## Two documents, never one

`docs/constitution.md` (engineering law), `docs/PROJECT.md` (business context), and
`docs/architecture-map.md` (structure) are **three different documents and all are
required**. Confusing them is the #1 source of an agent losing the business goal and
hallucinating. Never fold one into another.

| Document | Audience | Holds |
|---|---|---|
| `docs/constitution.md` | the agent's **engineering** law | stack lock, hard rules, Definition of Done |
| `docs/PROJECT.md` | the agent's **business** memory | idea, goals, target users, roles, top scenarios, non-goals, glossary |
| `docs/architecture-map.md` | the agent's **structural** memory | surface inventory, boundaries, machine-readable commands, the commit it reflects |

## Step 0 — Dependency check (gate)

Verify the **superpowers** plugin is available: its `superpowers:*` skills appear in the
session's skill list (the SessionStart hook also checks the plugin cache on disk). If it is
missing, STOP and give the exact install commands — do not scaffold anything:

```
/plugin marketplace add obra/superpowers
/plugin install superpowers@claude-plugins-official
```

## Step 1 — Decide the run (fresh vs refresh)

Read `docs/architecture-map.md` if it exists.

- **No map** → this is a **fresh init**. Continue at Step 2.
- **Map exists** → this is a **re-run**. The scaffold is already in place; do a light
  drift check (Step 8) and jump to the **incremental refresh** in Step 9 — read the map's
  `reflects_commit`, diff against `HEAD`, and re-survey only what changed. Do not
  re-interview for the constitution unless the user asks.

State which run you chose and why in one line.

## Step 2 — Depth dial + per-developer config (one question)

Ask **one** `AskUserQuestion`: how much init decides on its own vs asks. This governs
both halves (scaffold and survey).

- **easy** — decide reversible calls yourself; list assumptions for veto at the end.
- **medium** — ask on anything that shapes the stack, the business framing, or a boundary.
- **hard** — confirm each non-trivial call before writing it.

Default **medium**.

## Step 3 — Detect project state (new vs existing)

Inspect the working directory. **Empty / near-empty** (no source tree, no manifest like
`package.json` / `composer.json` / `pyproject.toml`) → **new-project (greenfield)**.
Otherwise → **existing-project (brownfield)**. If it is genuinely ambiguous, ask which
the user intends. This axis decides both the scaffold branch (Step 4/5) and the survey
mode (Step 8).

## Step 4 — New-project branch (greenfield)

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
3. Continue with the common scaffold (Step 6+).

## Step 5 — Existing-project branch (brownfield)

1. Analyze the codebase: dispatch the built-in **Explore** agent (mae ships no recon agent
   of its own) to report stack, layout, test/build commands, and existing docs.
2. Report what was **found** vs what will be **added**. Never overwrite an existing file
   without showing a diff and getting approval — the scaffolder skips existing files by
   default.

## Step 6 — Interview for the constitution

Detect/confirm the stack, then interview for the engineering law — one question at a time,
each with a recommended answer:
- **Stack lock** (language, package manager, framework, data layer, validation, auth…).
- **Hard rules** (the short absolute list the workflow enforces).
- **Definition of Done** (the PR-done gate).

Hold the answers; you fill the `docs/constitution.md` placeholders after scaffolding
(Step 7 writes the template with `<…>` placeholders).

## Step 7 — Run the scaffolder + fill the constitution

The scaffolder lays down the **always-on core rules** (`.claude/rules/` — engineering,
testing, git) plus the rest of the SDD layer. These are stack-agnostic; any
stack-specific rules are the project's to add later. Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" --target .
```

Ask (recommend yes, opt-out) one more question, adding the flag accordingly:
- **E2E testing?** → add `--e2e` (scaffolds `e2e-planner`/`e2e-runner` into `.claude/agents/`
  and registers the Playwright MCP server in `.mcp.json`).

Then fill the `docs/constitution.md` placeholders with the Step 6 answers.

## Step 8 — Survey: gather

The scaffold is in place; now produce the two survey documents. Gather first.

**Brownfield:**
- Read `docs/constitution.md`, `AGENTS.md`, existing `docs/` — the stated intent.
- Inventory surfaces: `apps/*`, `packages/*`, `modules/*`. For each, read the entry
  file, `package.json`, and any existing surface doc.
- Detect the machine facts from evidence, never from guesswork (Step 9 rule).
- Read-heavy work can go to the **Explore** agent (built-in) — keep the main context clean.

**Greenfield:**
- Run the level-adaptive foundation session: stack, first surfaces, first modules,
  data boundaries — anchored to `docs/constitution.md`'s stack lock (do not re-litigate
  locked choices; choose only what the constitution leaves open).
- The output is a skeleton map + a short list of foundational decisions to record (Step 10).

## Step 9 — Survey: write the two documents

**`docs/PROJECT.md` (business context).** Copy `project.md` from the plugin's
`templates/docs/_templates/` (scaffolded into the project as `docs/_templates/`) and fill it:
- **Idea & problem** — what this product is and the pain it removes.
- **Goals / success signals** — what "working" means in business terms.
- **Target users & roles** — who uses it, what each role can do.
- **Top scenarios** — the handful of end-to-end journeys that matter most.
- **Non-goals** — what this product deliberately does not do.
- **Glossary** — domain terms an agent must not confuse.

For a **derived project**, the "product" is that project's application — its users are
the engineers and stakeholders building on top of it.

**`docs/architecture-map.md` (structural map).** Copy `architecture-map.md` from
`docs/_templates/`. Two rules make this document trustworthy:

1. **`reflects_commit` stamp.** Put the current `git rev-parse HEAD` in the frontmatter.
   This is what makes staleness detectable and the re-run refresh incremental.
2. **Machine-readable frontmatter, evidence-only.** Fill `test_cmd`, `lint_cmd`,
   `typecheck_cmd`, `build_cmd`, `migration_tool`, `frontend` from **proof in the repo**
   (a script in `package.json`, a config file, a lockfile). **No proof → leave the value
   an empty string. Never guess.** Every later stage reads its commands from here, so a
   wrong guess poisons the whole pipeline; a blank is safe.

Body: one row per surface (path, kind, role, depends-on, consumed-by), the boundaries
that bite (schema separation, tenancy, package ownership), and a coarse mermaid of how
surfaces connect. Link out to the per-surface docs under `docs/projects/` and
`docs/packages/` — do not duplicate them here.

## Step 10 — Greenfield only: record the foundation

For each foundational choice made in Step 8, write a short decision record (inline is
fine unless it changes a shared boundary, in which case open it as its own planning
conversation) and a starter task list. Skip entirely for brownfield — you are describing,
not deciding.

## Step 11 — Re-run behavior (idempotent bootstrap + incremental refresh)

- **Scaffold drift.** The scaffolder skips existing files. For a skipped-but-outdated file
  (its `mae-scaffold-version` marker older than the installed plugin version), show a
  per-file diff and apply only the changes the user approves. Never silently overwrite.
- **Map refresh.** Read the map's `reflects_commit`, then run `git rev-parse HEAD` and
  `git diff --name-only <reflects_commit>..HEAD`.
  - Diff empty → the map is current. Report that and stop.
  - Diff touches **≤ half** the modules → **incremental refresh**: re-scan only the
    changed surfaces, update just their sections, re-stamp `reflects_commit`.
  - Diff touches **> half** the modules → **full re-scan**.

  Never silently do a full rescan when an incremental one suffices; announce the choice.

## Handoff (always end with this block)

```
## What I did
- SDD layer scaffolded (constitution, core rules, validator, permissions; optional e2e/CI) and constitution filled from the interview
- docs/PROJECT.md — <created | refreshed sections: …>
- docs/architecture-map.md — reflects_commit <sha>, <full scan | incremental: modules …>
- <decision records / roadmap seed, if greenfield>
Proposed commit: docs: bootstrap + survey project (constitution, PROJECT.md, architecture-map.md @ <sha>)

## Review before continuing
- docs/constitution.md      ← engineering law — is the stack lock + DoD right?
- docs/PROJECT.md           ← is the business goal right? veto any wrong assumption
- docs/architecture-map.md  ← are the machine commands real? any blank that should be filled?
- .claude/settings.json, AGENTS.md

## Run next
Start a feature once the map is approved:
```
/clear
/mae:start
```
```

## Rules

- One skill, one time. init both bootstraps and surveys; re-run it only to refresh, never
  to redo. Idempotent — existing scaffold files are skipped, a stale map is re-surveyed
  incrementally.
- Three documents, never one: `docs/constitution.md` (engineering) ≠ `docs/PROJECT.md`
  (business) ≠ `docs/architecture-map.md` (structure).
- Evidence-only for machine keys — a blank beats a guess.
- Interview, not batch: one question at a time, each with a recommended answer; no
  scaffolding before the open decisions are resolved.
- Announce every auto-skip with its reason. This is not a black box.
