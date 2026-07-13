# The mae workflow

How work moves through this project. This is the durable narrative; the terse index is in
`AGENTS.md` § "Workflow", and the step-by-step lives in the mae plugin's skills. Read this
once to understand the shape; invoke the skill when you run a stage.

## Principles (why it's built this way)

1. **Minimum surface, complexity inside.** Four skills are the whole external API:
   `/mae:init`, `/mae:start`, `/mae:finish`, `/mae:fix`.
   Routing, subagents, and depth decisions live inside them — not in the operator's head.
2. **Two documents, not one.** `docs/constitution.md` holds the **engineering**
   non-negotiables; `docs/PROJECT.md` holds the **business** context (idea, goals, roles,
   scenarios). Confusing them is the top cause of an agent losing the goal. Both are
   required; neither absorbs the other.
3. **Documentation is true by definition.** Markdown in the repo is the single source of
   truth, and the pipeline maintains it — `/mae:init` writes the map, `/mae:finish`
   updates surface docs, `/mae:fix` patches specs. No wiki, nothing to drift out of band.
4. **Depth proportional to size.** A change is sized and routed once, up front. The route
   decides how deep the workflow goes. But a step is skipped only on an **N/A condition**,
   never on size alone — and every skip is announced with its reason.
5. **Push/PR are human-only.** The agent prepares; a human presses. `/mae:finish`
   stops at a drafted PR and asks.
6. **The process has tests.** `scripts/validate-workflow.mjs` checks that project artifacts
   have valid frontmatter, doc links resolve, rules are well-formed, and the scaffold
   version marker is present. Run it after editing project agent infrastructure.
7. **Process discipline comes from superpowers.** mae owns the SDD stages; planning,
   execution, TDD, debugging, verification, and review are invoked from `superpowers:*`
   skills inside those stages (see `AGENTS.md`).

## The pipeline

```
                once per project (and to refresh)
  /mae:init  ──►  docs/PROJECT.md  +  docs/architecture-map.md
                              │
              ┌───────────────┴───────────────┐
              ▼                                ▼
        per feature                        per bug
  a task (spec optional)                a bug report
        │                                    │
  /mae:start                      /mae:fix
   (size+route → optional spec → recon →  (reproduce → trace to AC →
    spec-analyst → Plan Mode via           failing test → smallest fix →
    superpowers:writing-plans → plan.md)   same gate → spec patch + record)
        │                                    │
   execute (superpowers:executing-plans      └──►  green
    or subagent-driven-development)
        │
  /mae:finish
   (code-reviewer, test-runner gate, DoD vs diff,
    docs, verification-before-completion, draft PR → STOP)
        │
   human pushes + opens PR
```

## Inputs & artifacts

| Artifact | Written by | Read by |
|---|---|---|
| `docs/PROJECT.md` | `/mae:init` | every stage (business context) |
| `docs/architecture-map.md` | `/mae:init` | recon, planning (structural map + machine commands) |
| `specs/<feature>/spec.md` | **optional** — the `/mae:start` interview, on demand (recommended for L/XL; plugin template `templates/specs/_template/spec.md`) | `spec-analyst`, planning, DoD check |
| `specs/<feature>/plan.md` | `/mae:start` (Plan Mode via `superpowers:writing-plans`); `specs/<feature>/` is created here on demand | execution, reviewer, DoD check when there's no spec |
| `specs/<feature>/design/*` | designer (Figma exports) | `spec-analyst`, execution |
| `docs/features/<slug>.md` | `/mae:finish` | future agents ("why does X work this way") |
| `_fixes/<date>-<slug>.md` | `/mae:fix` | future agents (bug root causes) |

## Spec lifecycle (frontmatter, no archive folder)

When a feature **has** a spec, its status lives in the spec frontmatter — `draft` →
`in-progress` (set by `/mae:start`) → `done` (set by `/mae:finish`). There is no
`archive/` directory; the `done` status is the record. `size` and `route` are also
written to the frontmatter by `/mae:start`. **When there is no spec**, the plan carries
`size`/`route` and its Definition-of-done section, and the roadmap entry tracks status
instead.

## The agent roster (3 core + 2 optional)

Heavy reading and adversarial critique run in subagents so the main window stays focused
on decisions:

- **`spec-analyst`** — pre-plan critic with two phases in one pass: reconcile the spec
  against `docs/constitution.md` and the code, then attack it in clean context. Every
  finding cites a source line or is dropped; it surfaces, it does not resolve.
- **`code-reviewer`** — single source of pre-PR review criteria; dispatched by
  `superpowers:requesting-code-review`.
- **`test-runner`** — runs the quality gate (lint → typecheck → test → build) and reports
  faithfully; never weakens a check.
- **`e2e-planner` / `e2e-runner`** (optional) — present only if `/mae:init`'s e2e opt-in
  was answered yes. Recon is done by the built-in Explore agent.

## Gate pattern

A stage refuses when a prerequisite artifact is missing and names the step that was
skipped — a refusal is navigation, not an error. `/mae:start` will not plan
without a spec; `/mae:finish` will not pass the gate with open blockers;
`/mae:fix` will not fix what it cannot reproduce. Respect the refusal; supply the input.
