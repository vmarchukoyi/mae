# The mae workflow

How work moves through this project. This is the durable narrative; the terse index is in
`AGENTS.md` § "Workflow", and the step-by-step lives in the mae plugin's skills. Read this
once to understand the shape; invoke the skill when you run a stage.

## Principles (why it's built this way)

1. **Minimum surface, complexity inside.** Five skills are the whole external API:
   `/mae:init`, `/mae:explore`, `/mae:feature-start`, `/mae:feature-finish`, `/mae:fix`.
   Routing, subagents, and depth decisions live inside them — not in the operator's head.
2. **Two documents, not one.** `docs/constitution.md` holds the **engineering**
   non-negotiables; `docs/PROJECT.md` holds the **business** context (idea, goals, roles,
   scenarios). Confusing them is the top cause of an agent losing the goal. Both are
   required; neither absorbs the other.
3. **Documentation is true by definition.** Markdown in the repo is the single source of
   truth, and the pipeline maintains it — `/mae:explore` writes the map, `/mae:feature-finish`
   updates surface docs, `/mae:fix` patches specs. No wiki, nothing to drift out of band.
4. **Depth proportional to size.** A change is sized and routed once, up front. The route
   decides how deep the workflow goes. But a step is skipped only on an **N/A condition**,
   never on size alone — and every skip is announced with its reason.
5. **Push/PR are human-only.** The agent prepares; a human presses. `/mae:feature-finish`
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
  /mae:explore  ──►  docs/PROJECT.md  +  docs/architecture-map.md
                              │
              ┌───────────────┴───────────────┐
              ▼                                ▼
        per feature                        per bug
  specs/<feature>/spec.md               a bug report
        │                                    │
  /mae:feature-start                      /mae:fix
   (interview → size+route → recon →      (reproduce → trace to AC →
    spec-analyst → Plan Mode via           failing test → smallest fix →
    superpowers:writing-plans → plan.md)   same gate → spec patch + record)
        │                                    │
   execute (superpowers:executing-plans      └──►  green
    or subagent-driven-development)
        │
  /mae:feature-finish
   (code-reviewer, test-runner gate, DoD vs diff,
    docs, verification-before-completion, draft PR → STOP)
        │
   human pushes + opens PR
```

## Inputs & artifacts

| Artifact | Written by | Read by |
|---|---|---|
| `docs/PROJECT.md` | `/mae:explore` | every stage (business context) |
| `docs/architecture-map.md` | `/mae:explore` | recon, planning (structural map + machine commands) |
| `specs/<feature>/spec.md` | the `/mae:feature-start` interview (template `specs/_template/spec.md`) | `spec-analyst`, planning, DoD check |
| `specs/<feature>/plan.md` | `/mae:feature-start` (Plan Mode via `superpowers:writing-plans`) | execution, reviewer |
| `specs/<feature>/design/*` | designer (Figma exports) | `spec-analyst`, execution |
| `docs/features/<slug>.md` | `/mae:feature-finish` | future agents ("why does X work this way") |
| `_fixes/<date>-<slug>.md` | `/mae:fix` | future agents (bug root causes) |

## Spec lifecycle (frontmatter, no archive folder)

A spec's status lives in its frontmatter — `draft` → `in-progress` (set by
`/mae:feature-start`) → `done` (set by `/mae:feature-finish`). There is no `archive/`
directory; the `done` status is the record. `size` and `route` are also written to the
frontmatter by `/mae:feature-start`.

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
skipped — a refusal is navigation, not an error. `/mae:feature-start` will not plan
without a spec; `/mae:feature-finish` will not pass the gate with open blockers;
`/mae:fix` will not fix what it cannot reproduce. Respect the refusal; supply the input.
