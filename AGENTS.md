# AGENTS.md — developing the mae plugin

This repo **is** the mae plugin and its private marketplace. This file is for people (and
agents) working on the plugin itself. For using mae in a project, see `README.md`.

## Layout

```
.claude-plugin/         plugin.json (name "mae") + marketplace.json
skills/                 the workflow skills (init, start, finish, fix)
                        and using-mae
agents/                 the 3 core subagents (spec-analyst, code-reviewer, test-runner)
hooks/                  hooks.json + run-hook.cmd wrapper + guard / format / session-start
templates/              everything /mae:init scaffolds INTO a user project
                        (AGENTS.md, rules/, specs/, agents/, docs/, ci/, scripts/, settings.json)
scripts/check-plugin.mjs   the CI gate for this repo
scripts/scaffold.mjs       deterministic file placement used by /mae:init
docs/superpowers-compat.md the superpowers skills mae depends on + verified version
```

## The gate

`pnpm check:plugin` (`node scripts/check-plugin.mjs`) must pass before any PR. It validates
manifests, skill/agent frontmatter, hook wiring, a scaffold smoke test, forbidden-reference
scan, the superpowers-compat list, and the `using-mae` size budget.

## Conventions

- **Conventional Commits**, squash-merge to `main`, branch protection. Push and PR creation
  are human-only.
- **superpowers is a required dependency** — mae invokes `superpowers:*` skills by name.
  Every such name must be listed in `docs/superpowers-compat.md` (the gate enforces this).
- No new runtime dependencies — scripts use Node built-ins only.
- Once bootstrapped, this repo **dogfoods** its own workflow: use `/mae:start` to
  add a feature to the plugin.
