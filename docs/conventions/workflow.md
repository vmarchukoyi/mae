# The agent workflow

How work moves through this repo. This is the durable narrative; the terse index is in
[`../../AGENTS.md`](../../AGENTS.md) § "Feature workflow", and the step-by-step lives in
the skill files under `.agents/skills/`. Read this once to understand the shape; read
the skill when you run a command.

## Principles (why it's built this way)

1. **Minimum surface, complexity inside.** Four commands are the whole external API:
   `/project-explore`, `/feature-start`, `/feature-finish`, `/fix`. Routing, subagents,
   and depth decisions live inside them — not in the operator's head.
2. **Two documents, not one.** `CONSTITUTION.md` holds the **engineering**
   non-negotiables; [`../PROJECT.md`](../PROJECT.md) holds the **business** context
   (idea, goals, roles, scenarios). Confusing them is the top cause of an agent losing
   the goal and hallucinating. Both are required; neither absorbs the other.
3. **Documentation is true by definition.** Markdown in the repo is the single source of
   truth, and the pipeline maintains it — `/project-explore` writes the map,
   `/feature-finish` updates surface docs + the roadmap, `/fix` patches specs. No wiki,
   no Confluence, nothing to drift out of band.
4. **Depth proportional to size.** A change is sized (XS–XL) and routed
   (`quick`/`standard`/`full`) once, up front. The route decides how deep the workflow
   goes. But a step is skipped only on an **N/A condition**, never on size alone — an XS
   feature that adds a migration still runs the migration steps — and every skip is
   announced with its reason.
5. **Push/PR are human-only.** The agent prepares; a human presses. `/feature-finish`
   stops at a drafted PR and asks.
6. **The process has tests.** `scripts/validate-workflow.mjs` (`pnpm validate:workflow`)
   checks that agents/skills have valid frontmatter, orchestrators carry a handoff block,
   doc links resolve, and the architecture map is not stale. Run it after editing any
   `.agents/*` prompt.

## The pipeline

```
                once per project (and to refresh)
  /project-explore  ──►  docs/PROJECT.md  +  docs/architecture-map.md
                              │
              ┌───────────────┴───────────────┐
              ▼                                ▼
        per feature                        per bug
  specs/<feature>/spec.md               a bug report
        │                                    │
  /feature-start                          /fix
   (size+route, recon, spec-analyst,      (reproduce → trace to AC →
    architect?, clarify, devils-advocate   failing test → smallest fix →
    → Plan Mode → plan.md, roadmap→Now)    same gate → spec patch + _fixes/)
        │                                    │
   implement (implementer or inline)         └──►  green
        │
  /feature-finish
   (code-reviewer, test-runner gate, DoD vs diff,
    docs, spec→done, roadmap→Shipped, draft PR → STOP)
        │
   human pushes + opens PR
```

## Inputs & artifacts

| Artifact | Written by | Read by |
|---|---|---|
| [`../PROJECT.md`](../PROJECT.md) | `/project-explore` | every stage (business context) |
| [`../architecture-map.md`](../architecture-map.md) | `/project-explore` | recon, planning (structural map + machine commands) |
| `specs/<feature>/spec.md` | designer/manager (template `specs/_template/spec.md`) | `spec-analyst`, `devils-advocate`, planning, DoD check |
| `specs/<feature>/plan.md` | `/feature-start` (Plan Mode) | implementer, reviewer |
| `specs/<feature>/design/*` | designer (Figma exports) | `devils-advocate`, implementer |
| [`../roadmap.md`](../roadmap.md) | `/feature-start` + `/feature-finish` | humans, client reports |
| `docs/features/<slug>.md` | `/feature-finish` | future agents ("why does X work this way") |
| `_fixes/<date>-<slug>.md` | `/fix` | future agents (bug root causes) |

## Spec lifecycle (frontmatter, no archive folder)

A spec's status lives in its frontmatter — `draft` → `in-progress` (set by
`/feature-start`) → `done` (set by `/feature-finish`). There is no `archive/` directory;
the roadmap's **Shipped** section plus the `done` status are the record. `size` and
`route` are also written to the frontmatter by `/feature-start`.

## Handoff discipline

Every orchestrator ends with a **Handoff** block: *What I did* (files + proposed commit),
*Review before continuing* (real, clickable paths = the reviewer's checklist), and *Run
next* (the next command in a copy-paste fence). A forward hand-off says `/clear` first —
the next stage re-reads its inputs from disk, so context does not accumulate. A loop-back
(fix-then-retry) stays in context. This is what keeps each stage's window clean.

## Subagents (clean context, cite-or-drop)

Heavy reading and adversarial critique run in subagents so the main window stays focused
on decisions. Two roster members embody the quality patterns worth calling out:

- **`codebase-explorer`** (Haiku) — cheap recon; reports `path:line`, never edits.
- **`devils-advocate`** (Opus) — the last gate before Plan Mode. It runs in a **clean
  context**: it reads the spec from disk, not the conversation, so it sees the gaps the
  authors already rationalized away. Every finding **cites a source line or is dropped**;
  it **surfaces** ambiguities, it does not resolve them.

Full roster and model routing: [`../../AGENTS.md`](../../AGENTS.md) § "Agent roster".

## Gate pattern

A stage refuses when a prerequisite artifact is missing and names the step that was
skipped — a refusal is navigation, not an error. `/feature-start` will not plan without a
spec; `/feature-finish` will not pass the gate with open blockers; `/fix` will not fix
what it cannot reproduce. Respect the refusal; supply the missing input.
