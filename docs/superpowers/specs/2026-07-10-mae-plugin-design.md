# mae — Claude Code plugin for spec-driven development (design)

**Date:** 2026-07-10 · **Status:** approved design, pre-plan (rev 2)
**Decisions locked with the owner:** plugin + `/mae:init` scaffold skill · vendor selected
superpowers skills (MIT, with attribution) · stack-agnostic core with stack presets ·
distributed via a private git marketplace · canonical plugin repo layout (option A) ·
**skills only, no `commands/`** · constitution lives in `docs/`, no root template ·
Conventional Commits v1.0.0 mandated by the git convention doc.

## 1. Problem

The repo currently holds an SDD workflow **skeleton** migrated from another project:
agents, skills, rules, and hooks duplicated across `.agents/*` and `.claude/*`, no
`.claude-plugin/plugin.json`, and `@maeton/*`-specific leftovers in rules and
`settings.json`. The goal is a **Claude Code plugin** that colleagues install once
(`/plugin install`), which:

1. scaffolds or adopts a project's SDD structure (`/mae:init`),
2. drives feature work through a small skill surface (spec → plan → implement → finish),
3. generates and maintains project documentation as part of the pipeline,
4. behaves like obra/superpowers: skills-first discipline, injected at session start.

## 2. Repository layout (target)

The repo becomes plugin **and** marketplace; the `.agents`/`.claude` duplication is
removed. **No `commands/` directory** — skills are the only surface. The plugin is named
`mae`, so every skill is invoked namespaced: `/mae:init`, `/mae:feature-start`, ….

```
mae/
├── .claude-plugin/
│   ├── plugin.json           # name "mae", description, version, author
│   └── marketplace.json      # lists this plugin; repo doubles as private marketplace
├── skills/
│   ├── init/                 # NEW orchestrator — questionnaire (see §3.1)
│   ├── explore/              # renamed from project-explore
│   ├── feature-start/        # cleaned of @maeton / app.config.ts refs
│   ├── feature-finish/
│   ├── fix/
│   ├── using-mae/            # meta-skill, injected at SessionStart (see §4)
│   ├── plan-writing/         # ┐
│   ├── plan-execution/       # │
│   ├── test-first/           # │ process skills — ideas adapted from
│   ├── root-cause-debugging/ # │ obra/superpowers, renamed & rewritten
│   ├── verify-before-done/   # │ in mae terminology (see §4)
│   ├── review-request/       # │
│   ├── review-response/      # │
│   ├── workspace-isolation/  # │
│   ├── parallel-agents/      # │
│   ├── subagent-orchestration/           # │
│   ├── skill-authoring/                  # ┘ (maintainers only)
│   └── <knowledge skills>    # prisma-*, stripe-*, shadcn, magic-ui, better-auth — moved as-is
├── agents/                   # 3 core subagents (see §3.2), cleaned of stack leftovers
├── hooks/
│   ├── hooks.json            # PreToolUse guard · PostToolUse format · SessionStart using-mae
│   ├── guard.sh              # blocks rm -rf, force-push, reset --hard, protected paths
│   ├── format.sh
│   └── session-start.sh      # prints skills/using-mae/SKILL.md content as context
├── templates/                # everything /mae:init scaffolds INTO a user project
│   ├── AGENTS.md
│   ├── rules/
│   │   ├── _core/            # stack-agnostic rules (engineering.md, testing discipline)
│   │   ├── typescript/       # current TS rules, cleaned + correct paths: globs
│   │   └── php/              # minimal v1 skeleton, grows later
│   ├── specs/                # README + _template/spec.md
│   ├── agents/               # optional e2e-planner / e2e-runner (scaffolded on opt-in, §3.2)
│   ├── docs/
│   │   ├── constitution.md   # the engineering-law template (replaces root CONSTITUTION.template.md)
│   │   ├── conventions/      # git.md (Conventional Commits v1.0.0), workflow.md, documentation.md
│   │   └── _templates/       # project.md, architecture-map.md, service-doc.md
│   ├── scripts/validate-workflow.mjs
│   └── settings.json         # permissions only (deny .env/secrets/docs/constitution.md, ask push/PR)
├── scripts/                  # plugin's own CI checks (see §7)
└── README.md                 # install & usage guide for colleagues
```

**Why this split:** agents/skills/hooks execute from the plugin cache
(`${CLAUDE_PLUGIN_ROOT}`) and update for everyone via `/plugin update`. Only artifacts
that must live in the project repo (law, rules, specs, docs, validator, permissions)
are scaffolded by `/mae:init`.

## 3. Skill surface (external API — 5 workflow skills)

Skills are user-invocable (`/mae:<name>`) and model-invocable by trigger. No thin
command wrappers — the skill file is the single artifact.

| Skill | Role |
|---|---|
| `/mae:init` | **NEW.** Questionnaire-driven bootstrap — see §3.1. |
| `/mae:explore` | renamed from `project-explore`: survey → `docs/PROJECT.md` + `docs/architecture-map.md` |
| `/mae:feature-start` | unchanged flow; spec-authoring step absorbs superpowers' brainstorming dialogue (one question at a time before Plan Mode) |
| `/mae:feature-finish` | unchanged flow; gains the `verify-before-done` gate |
| `/mae:fix` | unchanged flow; built on `root-cause-debugging` (root cause before fix) |

Push / PR remain human-only.

### 3.1 `/mae:init` — the questionnaire

Runs as an interactive interview (AskUserQuestion, one topic at a time), branching on
project state:

**Step 0 — detect project state.** Empty/near-empty repo (no source tree, no manifest)
→ **new-project branch**. Otherwise → **existing-project branch**. Ambiguous → ask.

**New-project branch:**
1. Ask whether to generate a base project structure.
2. If yes, offer two paths:
   - **Preset frameworks** — a curated shortlist per stack (v1: Next.js, NestJS,
     Node/TS library; PHP: Laravel skeleton). Scaffolding uses the framework's
     **official generator** (`create-next-app`, `nest new`, `composer create-project`,
     …) — the plugin never maintains its own copy of framework boilerplate.
   - **Free description** — the user describes what they want; the agent drafts a
     structure proposal (tree + key configs) and creates it **only after explicit
     approval** of the proposal.
3. Then continue with the common scaffold (below).

**Existing-project branch:**
1. Analyze the codebase (dispatch the **built-in Explore agent** — mae ships no
   recon agent of its own): stack, layout, test/build commands, existing docs.
2. Embed what's missing, never overwrite what exists without showing a diff:
   documentation skeleton, rules, specs/, validator, permissions.
3. Report what was found vs what was added.

**Common scaffold (both branches):**
- Detect/confirm stack → pick rules preset (`_core` + `typescript`/`php`; unknown
  stack → `_core` only, flag for manual completion).
- Interview for the engineering law → generate **`docs/constitution.md`** (stack lock,
  hard rules, definition of done). There is **no root `CONSTITUTION.template.md`** —
  the template lives inside the plugin (`templates/docs/constitution.md`) and the
  generated file lives in the project's `docs/`.
- Scaffold `docs/conventions/` including **`git.md`** mandating
  [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
  commit format (`type(scope)!: description`), allowed types, breaking-change marker,
  branch naming (`feat/<spec-name>`), squash-merge to `main`, push/PR human-only.
- Scaffold `specs/`, `AGENTS.md`, `scripts/validate-workflow.mjs`; merge permissions
  into `.claude/settings.json`.
- **E2E opt-in:** ask whether the project needs live e2e testing. If yes, scaffold
  `e2e-planner` / `e2e-runner` from `templates/agents/` into the project's
  `.claude/agents/` **and** register the Playwright MCP server automatically (write the
  server entry into the project's `.mcp.json`). If no, neither the agents nor the MCP
  dependency ever appear in the project.
- **Scaffold versioning:** every scaffold run stamps the plugin version into the
  generated `AGENTS.md` (marker line). A re-run compares that stamp with the current
  plugin version and offers a migration diff; the scaffolded validator warns when the
  project's scaffold generation is older than the installed plugin.
- **CI enforcement, not wishes:** the scaffold offers (opt-out) a CI check that runs
  `validate-workflow.mjs` and verifies Conventional Commits (commitlint or PR-title
  check — sufficient under squash-merge). `git.md` documents the convention; CI holds it.
- Idempotent: on re-run, diff existing files and update only what the user approves.
- Ends by suggesting `/mae:explore` (skippable if the analysis already produced
  `docs/PROJECT.md` in the existing-project branch).

### 3.2 Agent roster (3 core + 2 optional)

The migrated roster of 9 shrinks to avoid agent/skill conflicts:

| Agent | Status | Rationale |
|---|---|---|
| `spec-analyst` | **kept, absorbs `devils-advocate`** | one pre-plan critic with two phases: reconcile spec vs constitution/code + adversarial attack in clean context. One dispatch instead of two. |
| `code-reviewer` | **kept** | single source of review criteria; `review-request` / `review-response` skills orchestrate it and never duplicate the criteria. |
| `test-runner` | **kept** | keeps noisy gate output (lint → typecheck → test → build) out of the main context; `verify-before-done` explicitly dispatches it — no second verification route. |
| `architect` | **removed** | Plan Mode + `plan-writing` cover design; reintroduce only if a real ADR need emerges. |
| `devils-advocate` | **merged** into `spec-analyst` | see above. |
| `codebase-explorer` | **removed** | the built-in Explore agent does recon; skills reference it directly. |
| `implementer` | **removed** | execution doctrine is unified in the skills: `plan-execution` (main-context execution with checkpoints) and `subagent-orchestration` (fresh general-purpose subagent per plan task). No named implementer — no competing doctrine. |
| `e2e-planner` / `e2e-runner` | **optional** | live in `templates/agents/`, scaffolded into the project only when `/mae:init`'s e2e question is answered yes, together with automatic Playwright MCP registration (§3.1). Not part of the plugin's `agents/` — colleagues without Playwright never see broken agents. |

## 4. Process skills (ideas adapted from superpowers, renamed & rewritten)

The mae plugin must **not read as a superpowers derivative**: every process skill gets
its own mae-native name and is rewritten in mae terminology, while keeping the proven
mechanics. Attribution lives in exactly one place — `docs/UPSTREAM.md` plus the upstream
MIT notice (legal minimum) — **not** in skill files, names, or frontmatter.

**Adaptation, not copying.** Terminology is rewritten to this pipeline: specs in
`specs/<feature>/spec.md`, DoD, `docs/constitution.md`, the lean agent roster (§3.2).
Overlapping mechanics are merged, not duplicated:

| mae skill | Source idea | Role in the pipeline |
|---|---|---|
| **`using-mae`** | `using-superpowers` | SessionStart-injected meta-skill — the core mechanism. Skill-first discipline ("1% chance a skill applies → invoke it"), red-flags anti-rationalization table, the 5-skill surface, the two-documents concept (constitution vs PROJECT), and the legitimacy of the trivial-change route (size routing is visible, not a secret). **Hard size budget: ≤ 60 lines** — it is paid on every session start; details live in the skills it points to. |
| — | `brainstorming` | folded into `feature-start` step 1 (spec authoring, one question at a time). No standalone skill: the spec IS the design artifact. |
| **`plan-writing`** / **`plan-execution`** | `writing-plans` / `executing-plans` | back `feature-start`'s Plan Mode phase and the unified execution doctrine (no implementer agent — §3.2) |
| **`test-first`** | `test-driven-development` | binding rule for whoever implements — main context or dispatched subagent (red → green → refactor) |
| **`root-cause-debugging`** | `systematic-debugging` | the heart of `/mae:fix` — phases, root cause before any fix |
| **`verify-before-done`** | `verification-before-completion` | gate inside `feature-finish` — evidence before claims |
| **`review-request`** / **`review-response`** | `requesting-` / `receiving-code-review` | `feature-finish` review loop; review criteria live only in the `code-reviewer` agent — the skills dispatch it and handle its findings |
| **`workspace-isolation`** | `using-git-worktrees` | isolated workspaces for feature work |
| **`parallel-agents`** | `dispatching-parallel-agents` | fan-out for independent tasks |
| **`subagent-orchestration`** | `subagent-driven-development` | executing plan tasks through fresh general-purpose subagents (the unified doctrine, §3.2) |
| **`skill-authoring`** | `writing-skills` | for plugin maintainers (evolving the plugin itself) |

**Format patterns adopted from superpowers:** frontmatter descriptions with explicit
"Use when…" triggers, checklists that become todos, red-flag tables, the cross-platform
`run-hook.cmd` wrapper for hooks.

### 4.1 The interview doctrine (ask-when-uncertain) — cross-cutting

A practice (inspired by mattpocock's "grilling" skill; noted in `docs/UPSTREAM.md`,
no code vendored) baked into mae everywhere an agent faces a decision, not shipped
as a separate skill:

1. **Design decisions belong to the user.** When uncertain between viable options,
   the agent asks — it never silently picks for the user.
2. **One question at a time**, and every question carries the agent's **recommended
   answer** with a one-line why.
3. **Facts are researched, not asked.** Anything discoverable from the codebase/docs
   is looked up; only genuine decisions reach the user.
4. **No execution before shared understanding.** Work starts only after the open
   decision tree is resolved and confirmed.

Where it is enforced (written into each skill's text):
- **`using-mae`** — states the doctrine as a session-wide rule ("when in doubt, ask;
  one question; recommend an answer").
- **`/mae:init`** — the questionnaire itself (§3.1) follows it.
- **`feature-start`** — spec authoring walks every branch of the decision tree until
  resolved before entering Plan Mode; `spec-analyst`'s surfaced questions feed this
  interview rather than being dumped as a list.
- **`plan-writing`** — a plan with an unresolved decision point is not presented as
  final; the point is asked first.
- **`fix`** — ambiguous reproduction or acceptance criterion → ask before touching code.

## 5. Hooks & safety

All hooks are invoked through a cross-platform `run-hook.cmd` wrapper (Windows without
WSL included) — **in v1, not later**: a guard that silently doesn't run is worse than
no guard. `hooks/hooks.json` in the plugin wires:

- **PreToolUse (Bash):** `guard.sh` — deterministic block of `rm -rf`, force-push,
  `git reset --hard`, writes to protected paths (`docs/constitution.md`, `.env*`,
  secrets). Must degrade gracefully (no-op checks) in projects not yet scaffolded.
- **PostToolUse (Edit|Write):** `format.sh` — formats touched files; detects available
  formatter per stack, exits 0 silently when none.
- **SessionStart:** injects `using-mae` skill content (session-start context pattern).

Project-side `settings.json` (scaffolded) carries **permissions only**: deny on
`.env*`/secrets/`docs/constitution.md`/`.claude/**`, ask on `git push`/`gh pr create`/
network/package-add. The current `@maeton/*` allow-list is dropped; presets contribute a
small generic allow-list (e.g. `pnpm lint/typecheck/test` for TS).

## 6. Documentation generation

Unchanged in substance — already covered by the pipeline: `/mae:explore` generates
`docs/PROJECT.md` + `docs/architecture-map.md` (stamped with the commit); `/mae:feature-finish`
verifies DoD vs diff and updates docs; `scripts/validate-workflow.mjs` (scaffolded into
each project) validates artifacts and links. Doc templates live in `templates/docs/`.

Project docs layout after `/mae:init` + `/mae:explore`:
`docs/constitution.md` (law) · `docs/PROJECT.md` (business) · `docs/architecture-map.md`
· `docs/conventions/{git,workflow,documentation}.md`.

## 7. Testing the plugin itself

A CI script in the plugin repo (`scripts/check-plugin.mjs`, Node built-ins only):

1. `plugin.json` / `marketplace.json` are valid and consistent (name, version).
2. Every skill/agent has valid frontmatter (name, description with trigger).
3. Hooks are executable; `hooks.json` references existing files.
4. Smoke test: run the scaffold logic against a temp dir, then run
   `validate-workflow.mjs` there and assert it passes on a fresh scaffold.
5. Internal link check across plugin Markdown (no references to removed paths —
   `CONSTITUTION.md` at root, `commands/`, `project-explore`, and no superpowers skill
   names — `systematic-debugging`, `writing-plans`, etc. — outside `docs/UPSTREAM.md`).

Manual acceptance: install the marketplace locally, run `/mae:init` on a throwaway
TS repo (both branches: empty dir and existing codebase), walk one feature through
`feature-start` → `feature-finish`.

## 8. Out of scope (v1)

- Full PHP preset content (skeleton only; TS preset is complete because content exists).
- MCP servers or compiled binaries — Markdown + shell only.
- Content changes to knowledge skills (prisma/stripe/shadcn/magic-ui/better-auth) — they move verbatim.
- Auto-update push mechanics beyond `/plugin update`.
- Framework presets beyond the v1 shortlist (Next.js, NestJS, Node/TS lib, Laravel).

## 9. Migration & cleanup

- Delete `.agents/*` and `.claude/{agents,skills,rules,commands}` duplicates after content
  moves to plugin layout; keep a minimal `.claude/settings.json` for developing the plugin
  itself.
- Delete root `CONSTITUTION.template.md`; its content becomes `templates/docs/constitution.md`.
- Rename all `project-explore` references to `explore`; all internal command references
  use the namespaced spelling (`/mae:feature-start`, …).
- Remove `.idea/`, `.DS_Store` (ensure gitignore).
- Delete removed agent files (`architect`, `devils-advocate`, `codebase-explorer`,
  `implementer`); fold the devils-advocate phase into `spec-analyst`; move
  `e2e-planner` / `e2e-runner` into `templates/agents/`.
- Rewrite `README.md` as the colleague-facing install/usage guide; move the "skeleton"
  narrative into `docs/` of the plugin. State explicitly: **mae replaces superpowers —
  do not install both**, two SessionStart doctrines would conflict.
- `CLAUDE.md`/`AGENTS.md` at repo root describe developing the plugin, not using it.

## Risks

- **Namespaced skills** (`/mae:feature-start`) differ from the old docs' `/feature-start`
  spelling — all internal references must use the namespaced form (checked by
  `check-plugin.mjs` §7.5).
- **Rules loading:** path-scoped rules are a project-file mechanism, hence scaffolding —
  the plugin cannot carry them; this is by design, and `/mae:init` re-run keeps them fresh.
- **Official generators need network/tooling** (`create-next-app`, `composer`) — the
  new-project branch must check tool availability first and fall back to the
  free-description path when a generator is unavailable.
- **Vendored drift:** upstream superpowers evolves; provenance lines + a `docs/UPSTREAM.md`
  note recording the vendored version make re-syncs tractable.
