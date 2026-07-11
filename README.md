# mae

**mae** is a Claude Code plugin for **spec-driven development**. It gives a team one small
skill surface — `init`, `start`, `finish`, `fix` — that carries
a feature from spec to plan to implementation to PR, and it scaffolds and maintains the
project's documentation as part of the pipeline. Install it once; everyone on the project
gets the same workflow.

## Requirements — the superpowers plugin

> **mae will not run without [superpowers](https://github.com/obra/superpowers).** It is a
> required companion plugin: mae owns the SDD stages and invokes `superpowers:*` skills for
> process discipline (planning, execution, TDD, debugging, verification, review) at defined
> points. `/mae:init` checks for it and stops with install instructions if it is missing.

Install superpowers first:

```
/plugin marketplace add obra/superpowers
/plugin install superpowers@claude-plugins-official
```

Then add this marketplace and install mae:

```
/plugin marketplace add otakoyi/mae      # or a local path to this repo
/plugin install mae@otakoyi
```

`/mae:init` scaffolds `.claude/settings.json` with **both** plugins enabled, so a colleague
opening the project gets both automatically.

## Quickstart

1. `/mae:init` — answer the interview (project state, stack, constitution, e2e/CI opt-ins),
   then it scaffolds the SDD layer **and** surveys the project into `docs/PROJECT.md` +
   `docs/architecture-map.md`. Run once; re-run only to refresh.
2. `/mae:start` — author a spec, plan it, implement it.
3. `/mae:finish` — review, gate, DoD-vs-diff, docs, draft the PR (then it STOPS —
   push and PR are human-only).

## The four skills

| Skill | Role |
|---|---|
| `/mae:init` | Bootstrap or adopt a project (questionnaire): constitution, core rules, specs, validator, permissions — **then** survey the codebase → `docs/PROJECT.md` + `docs/architecture-map.md` (stamped with the commit). One-time; re-run to refresh. |
| `/mae:start` | Spec interview → recon → `spec-analyst` → Plan Mode → `specs/<feature>/plan.md`. |
| `/mae:finish` | Review loop → verification gate → test gate → DoD vs diff → docs → drafts a PR, then STOPS. |
| `/mae:fix` | Reproduce → failing test → smallest fix → same gate → record. |

## Agents (and their cost)

- **`spec-analyst`** (Opus) — reconciles the spec against the constitution/code and
  adversarially attacks it, in one dispatch.
- **`code-reviewer`** (Opus) — the single source of pre-PR review criteria; strong model.
- **`test-runner`** (Haiku) — runs the quality gate faithfully; cheap, keeps noisy output
  out of the main context.
- **`e2e-planner` / `e2e-runner`** — optional, scaffolded only if you opt into e2e at init.

## Updates

New releases roll out to everyone via `/plugin update`. The project's scaffolded files
carry a version marker; re-running `/mae:init` offers a migration diff when the installed
plugin is newer.

## Feedback

Questions, bugs, ideas → `#mae-feedback`.
