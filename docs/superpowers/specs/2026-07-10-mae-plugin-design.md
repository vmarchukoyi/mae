# mae — Claude Code plugin for spec-driven development (design)

**Date:** 2026-07-10 · **Status:** approved design, pre-plan
**Decisions locked with the owner:** plugin + `/sdd-init` scaffold command · vendor selected
superpowers skills (MIT, with attribution) · stack-agnostic core with stack presets ·
distributed via a private git marketplace · canonical plugin repo layout (option A).

## 1. Problem

The repo currently holds an SDD workflow **skeleton** migrated from another project:
agents, skills, rules, and hooks duplicated across `.agents/*` and `.claude/*`, no
`.claude-plugin/plugin.json`, and `@maeton/*`-specific leftovers in rules and
`settings.json`. The goal is a **Claude Code plugin** that colleagues install once
(`/plugin install`), which:

1. scaffolds a project's SDD structure (`/sdd-init`),
2. drives feature work through a small command surface (spec → plan → implement → finish),
3. generates and maintains project documentation as part of the pipeline,
4. behaves like obra/superpowers: skills-first discipline, injected at session start.

## 2. Repository layout (target)

The repo becomes plugin **and** marketplace; the `.agents`/`.claude` duplication is removed.

```
mae/
├── .claude-plugin/
│   ├── plugin.json           # name, description, version, author
│   └── marketplace.json      # lists this plugin; repo doubles as private marketplace
├── commands/                 # thin slash commands that delegate to skills
│   ├── sdd-init.md
│   ├── project-explore.md
│   ├── feature-start.md
│   ├── feature-finish.md
│   └── fix.md
├── skills/
│   ├── sdd-init/             # NEW orchestrator (see §3)
│   ├── project-explore/      # existing 4, cleaned of @maeton / app.config.ts refs
│   ├── feature-start/
│   ├── feature-finish/
│   ├── fix/
│   ├── using-sdd/            # meta-skill, injected at SessionStart (see §4)
│   ├── writing-plans/        # ┐
│   ├── executing-plans/      # │
│   ├── test-driven-development/          # │ vendored from obra/superpowers,
│   ├── systematic-debugging/             # │ adapted to SDD terminology
│   ├── verification-before-completion/   # │ (see §4)
│   ├── requesting-code-review/           # │
│   ├── receiving-code-review/            # │
│   ├── using-git-worktrees/              # │
│   ├── dispatching-parallel-agents/      # │
│   ├── subagent-driven-development/      # │
│   ├── writing-skills/                   # ┘ (maintainers only)
│   └── <knowledge skills>    # prisma-*, stripe-*, shadcn, magic-ui, better-auth — moved as-is
├── agents/                   # the 9 subagents, cleaned of stack leftovers
├── hooks/
│   ├── hooks.json            # PreToolUse guard · PostToolUse format · SessionStart using-sdd
│   ├── guard.sh              # blocks rm -rf, force-push, reset --hard, protected paths
│   ├── format.sh
│   └── session-start.sh      # prints skills/using-sdd/SKILL.md content as context
├── templates/                # everything /sdd-init scaffolds INTO a user project
│   ├── CONSTITUTION.template.md
│   ├── AGENTS.md
│   ├── rules/
│   │   ├── _core/            # stack-agnostic rules (engineering.md, testing discipline)
│   │   ├── typescript/       # current TS rules, cleaned + correct paths: globs
│   │   └── php/              # minimal v1 skeleton, grows later
│   ├── specs/                # README + _template/spec.md
│   ├── docs/                 # conventions/ + _templates/
│   ├── scripts/validate-workflow.mjs
│   └── settings.json         # permissions only (deny .env/secrets/CONSTITUTION, ask push/PR)
├── scripts/                  # plugin's own CI checks (see §7)
└── README.md                 # install & usage guide for colleagues
```

**Why this split:** agents/skills/commands/hooks execute from the plugin cache
(`${CLAUDE_PLUGIN_ROOT}`) and update for everyone via `/plugin update`. Only artifacts
that must live in the project repo (law, rules, specs, docs, validator, permissions)
are scaffolded by `/sdd-init`.

## 3. Command surface (external API — 5 commands)

Commands are namespaced by the plugin: `/mae:sdd-init`, `/mae:feature-start`, etc.
Each command file is thin — it invokes the same-named skill.

| Command | Role |
|---|---|
| `/mae:sdd-init` | **NEW.** Detect stack (`package.json`/`tsconfig` → typescript; `composer.json` → php; else ask). Interactively fill `CONSTITUTION.md` from template. Scaffold `.claude/rules/` (= `_core` + preset overlay), `specs/`, `docs/`, validator script, `AGENTS.md`; merge permissions into `.claude/settings.json`. Idempotent: on re-run, diff existing files and update only what the user approves. Ends by suggesting `/mae:project-explore`. |
| `/mae:project-explore` | unchanged: survey → `docs/PROJECT.md` + `docs/architecture-map.md` |
| `/mae:feature-start` | unchanged flow; spec-authoring step absorbs superpowers' brainstorming dialogue (one question at a time before Plan Mode) |
| `/mae:feature-finish` | unchanged flow; gains `verification-before-completion` gate |
| `/mae:fix` | unchanged flow; built on `systematic-debugging` (root cause before fix) |

Push / PR remain human-only.

## 4. Superpowers integration (vendored, MIT + attribution)

Every vendored file keeps a provenance line in frontmatter
(`origin: obra/superpowers@<version>, adapted`) and the repo carries the upstream MIT
license notice.

**Adaptation, not copying.** Terminology is rewritten to this pipeline: specs in
`specs/<feature>/spec.md`, DoD, `CONSTITUTION.md`, the 9-subagent roster. Overlapping
mechanics are merged, not duplicated:

- `using-superpowers` → **`using-sdd`**: the SessionStart-injected meta-skill — the core
  mechanism that makes superpowers work. Establishes skill-first discipline ("1% chance a
  skill applies → invoke it"), the red-flags anti-rationalization table, the 4+1 command
  surface, and the two-documents concept (CONSTITUTION vs PROJECT).
- `brainstorming` → folded into `feature-start` step 1 (spec authoring). No standalone
  brainstorming skill: the spec IS the design artifact.
- `writing-plans` / `executing-plans` → back `feature-start`'s Plan Mode phase and the
  `implementer` agent's execution loop.
- `test-driven-development` → binding rule for `implementer`.
- `systematic-debugging` → the heart of `/fix`.
- `verification-before-completion` → gate inside `feature-finish` (evidence before claims).
- `requesting-code-review` / `receiving-code-review` → `feature-finish` review loop and
  reaction to `code-reviewer` findings.
- `using-git-worktrees`, `dispatching-parallel-agents`, `subagent-driven-development` →
  orchestration guidance referenced by `feature-start` / `implementer`.
- `writing-skills` → kept for plugin maintainers (evolving the plugin itself).

**Format patterns adopted from superpowers:** frontmatter descriptions with explicit
"Use when…" triggers, checklists that become todos, red-flag tables, the cross-platform
`run-hook.cmd` wrapper for hooks.

## 5. Hooks & safety

`hooks/hooks.json` in the plugin wires:

- **PreToolUse (Bash):** `guard.sh` — deterministic block of `rm -rf`, force-push,
  `git reset --hard`, writes to protected paths. Must degrade gracefully (no-op checks)
  in projects not yet scaffolded.
- **PostToolUse (Edit|Write):** `format.sh` — formats touched files; detects available
  formatter per stack, exits 0 silently when none.
- **SessionStart:** injects `using-sdd` skill content (superpowers pattern).

Project-side `settings.json` (scaffolded) carries **permissions only**: deny on
`.env*`/secrets/`CONSTITUTION.md`/`.claude/**`, ask on `git push`/`gh pr create`/network/
package-add. The current `@maeton/*` allow-list is dropped; presets contribute a small
generic allow-list (e.g. `pnpm lint/typecheck/test` for TS).

## 6. Documentation generation

Unchanged in substance — already covered by the pipeline: `/project-explore` generates
`docs/PROJECT.md` + `docs/architecture-map.md` (stamped with the commit); `/feature-finish`
verifies DoD vs diff and updates docs; `scripts/validate-workflow.mjs` (scaffolded into
each project) validates artifacts and links. Doc templates move to `templates/docs/`.

## 7. Testing the plugin itself

A CI script in the plugin repo (`scripts/check-plugin.mjs`, Node built-ins only):

1. `plugin.json` / `marketplace.json` are valid and consistent (name, version).
2. Every skill/agent/command has valid frontmatter (name, description with trigger).
3. Hooks are executable; `hooks.json` references existing files.
4. Smoke test: run the scaffold logic against a temp dir, then run
   `validate-workflow.mjs` there and assert it passes on a fresh scaffold.
5. Internal link check across plugin Markdown.

Manual acceptance: install the marketplace locally, run `/mae:sdd-init` on a throwaway
TS repo, walk one feature through `feature-start` → `feature-finish`.

## 8. Out of scope (v1)

- Full PHP preset content (skeleton only; TS preset is complete because content exists).
- MCP servers or compiled binaries — Markdown + shell only.
- Content changes to knowledge skills (prisma/stripe/shadcn/magic-ui/better-auth) — they move verbatim.
- Auto-update push mechanics beyond `/plugin update`.

## 9. Migration & cleanup

- Delete `.agents/*` and `.claude/{agents,skills,rules,commands}` duplicates after content
  moves to plugin layout; keep a minimal `.claude/settings.json` for developing the plugin
  itself.
- Remove `.idea/`, `.DS_Store` (already untracked from git per last commit; ensure gitignore).
- Rewrite `README.md` as the colleague-facing install/usage guide; move the "skeleton"
  narrative into `docs/` of the plugin.
- `CLAUDE.md`/`AGENTS.md` at repo root describe developing the plugin, not using it.

## Risks

- **Namespaced commands** (`/mae:feature-start`) differ from the docs' `/feature-start`
  spelling — all internal references must use the namespaced form.
- **Rules loading:** path-scoped rules are a project-file mechanism, hence scaffolding —
  the plugin cannot carry them; this is by design, and `/sdd-init` re-run keeps them fresh.
- **Vendored drift:** upstream superpowers evolves; provenance lines + a `docs/UPSTREAM.md`
  note recording the vendored version make re-syncs tractable.
