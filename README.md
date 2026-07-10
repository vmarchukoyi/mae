# SDD Workflow — a Claude Code plugin skeleton

A **spec-driven development** workflow for Claude Code, extracted as a reusable, stack-agnostic
starter. It gives a project four thin commands, a subagent roster, path-scoped coding rules,
deterministic guard/format hooks, and a zero-dependency process validator.

> **This is a skeleton, not a finished plugin.** The *engine* (agents, skills, hooks, validator,
> conventions, templates) is generic. The *content layer* — `CONSTITUTION.md` and the
> `.agents/rules/*` — ships as templates you fill in for your stack. See
> [What to customize](#what-to-customize).

## The idea

- **Two documents, not one.** `CONSTITUTION.md` = engineering law; `docs/PROJECT.md` = business
  context. Confusing them is the top cause of an agent losing the goal.
- **Minimum surface, complexity inside.** Four commands are the whole external API; routing,
  subagents, and depth decisions live inside them.
- **Documentation is true by definition.** Markdown in the repo, maintained by the pipeline —
  no external wiki.
- **Depth proportional to size.** A change is sized and routed once; steps skip only on an N/A
  condition, and every skip is announced.
- **Push / PR are human-only.** The agent prepares; a human presses.
- **The process has tests.** `validate-workflow.mjs` checks the workflow's own artifacts.

Full narrative: [`docs/conventions/workflow.md`](docs/conventions/workflow.md).

## The four commands

| Command | When | Does |
|---|---|---|
| `/project-explore` | once per project + to refresh | survey → `docs/PROJECT.md` + `docs/architecture-map.md` |
| `/feature-start` | begin a feature | size/route → recon → spec-analyst → devils-advocate → Plan Mode → `plan.md` |
| `/feature-finish` | implementation done | review → test gate → DoD vs diff → docs → drafts a PR, then STOPS |
| `/fix` | a bug | reproduce → failing test → smallest fix → same gate → record |

These are implemented as skills under `.agents/skills/`. The nine subagents they orchestrate
live in `.agents/agents/` — see [`AGENTS.md`](AGENTS.md) § "Agent roster".

## What's in here

```
.
├── AGENTS.md                     # terse index (agent roster, workflow, surface placement)
├── CLAUDE.md                     # points Claude Code at AGENTS.md
├── CONSTITUTION.template.md      # → copy to CONSTITUTION.md and fill in (engineering law)
├── package.json                  # `pnpm validate:workflow`
├── .claude-plugin/plugin.json    # plugin manifest
├── .claude/settings.json         # permissions + hook wiring (generic)
├── .agents/
│   ├── agents/                   # 9 subagent definitions
│   ├── skills/                   # the 4 orchestrator skills
│   ├── rules/                    # always-on + path-scoped coding rules (templated)
│   └── hooks/                    # guard.sh (block dangerous cmds) + format.sh
├── docs/
│   ├── conventions/              # workflow.md, git.md, documentation.md
│   └── _templates/               # project / architecture-map / service-doc templates
├── specs/
│   ├── README.md
│   └── _template/spec.md         # the spec format (Scenarios + design/ + frontmatter lifecycle)
└── scripts/validate-workflow.mjs # the process validator (Node built-ins only)
```

## Install / wire up

Two ways to consume it:

1. **As a Claude Code plugin** — publish this directory to a plugin marketplace (or point Claude
   Code at it locally) so `.agents/agents` + `.agents/skills` register. See `.claude-plugin/plugin.json`.
2. **Vendored into a repo** — copy `.agents/`, `.claude/`, `docs/`, `specs/`, `scripts/`,
   `AGENTS.md`, `CLAUDE.md`, and your filled-in `CONSTITUTION.md` into the project root. The
   hooks resolve via `${CLAUDE_PROJECT_DIR}`, so they work once the files sit at the repo root.

Then, in the target repo:

```bash
cp CONSTITUTION.template.md CONSTITUTION.md   # then fill in every <…>
# author docs/PROJECT.md by running /project-explore
node scripts/validate-workflow.mjs            # or: pnpm validate:workflow
```

## What to customize

The engine references a set of engineering conventions as **examples**. Before using this on a
real stack, adapt:

1. **`CONSTITUTION.md`** — copy from the template; set your stack lock, hard rules, and DoD.
2. **`.agents/rules/*`** — every rule file is a generic template with a note at the top. Keep the
   universal discipline (no `any`, validate at boundaries, reversible migrations, never weaken a
   test); replace stack specifics (ORM, framework, tenancy/schema model) and the `paths:` globs.
3. **Namespace & config placeholders in the agents/skills** — the reference prompts use a
   `@acme/*` shared-package namespace and an `app.config.ts` typed config file as illustrative
   conventions. Find-and-replace them (and any data-isolation opinion you don't share) to match
   your project, or delete the mention.
4. **`.claude/settings.json`** — the `allow` list is empty; add the read-only commands your stack
   runs often to cut permission prompts. Keep the `deny`/`ask` guards.
5. **`AGENTS.md`** — fill in the roster models, surface layout, and pointers for your repo.

## Notes

- **Per-project docs are generated, not shipped.** `docs/PROJECT.md`, `docs/architecture-map.md`,
  and `docs/roadmap.md` are produced by the workflow (`/project-explore`, `/feature-finish`).
  Until you create them (and your `CONSTITUTION.md`), `validate-workflow.mjs` will report missing
  files / broken links pointing at them — that is expected for a fresh skeleton, not a defect.
- **Third-party knowledge skills were intentionally excluded.** The source repo also carried
  vendored skill packs (Prisma, Stripe, shadcn, etc.); those are external and belong to their
  own distributions. Only the four workflow orchestrators are here.
- **Hooks are guidance-plus-enforcement.** `guard.sh` deterministically blocks `rm -rf`,
  force-push, `git reset --hard`, and writes into protected paths. `format.sh` formats touched
  files. Both are wired in `.claude/settings.json`.
