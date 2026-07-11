# Documentation contract

How project knowledge is written and kept current so a future agent ramps fast.
`docs/` is the **durable knowledge base**; `specs/` holds **per-feature inputs**
(transient). Don't confuse them.

## Where things live

| Location | Holds | Lifetime |
|---|---|---|
| `docs/PROJECT.md` | Business context (idea, goals, roles, scenarios). Written by `/mae:init`. | durable |
| `docs/constitution.md` | Engineering law (stack lock, hard rules, DoD). | durable |
| `docs/architecture-map.md` | Structural map (surfaces, boundaries, machine commands). Written by `/mae:init`. | durable |
| `docs/projects/<app>.md` | One doc per **app** in the repo | durable |
| `docs/packages/<pkg>.md` | One doc per shared **package** | durable |
| `docs/conventions/*.md` | Rules for agents (git, this contract, workflow) | durable |
| `docs/features/<slug>.md` | Per-feature record written at `/mae:finish` | durable |
| `specs/<feature>/spec.md` | Feature input (task/idea/DoD) | per-feature |

Every doc names which surface it covers so an agent always knows *which project* it is in.
In a multi-project monorepo, never write a doc that assumes a single app.

## The two-audience rule (per service doc)

Each `projects/*` and `packages/*` doc carries both:

- **A mermaid diagram — for humans.** Shows shape at a glance: who calls it, what it
  depends on, where data flows. Keep it small (≤ ~10 nodes). One diagram, not five.
- **A "For the agent" prose block — for AI.** Dense, literal, greppable facts that change
  how code gets written here: ownership boundary, public surface (as paths), persistence
  schema + tenancy, auth instance, the constitution rules that bite, and gotchas. No
  marketing, no history — just what's true now.

Simple and useful beats exhaustive. A stale doc misleads; keep it current or delete it.
Copy `docs/_templates/service-doc.md` to start a new one.

## When docs get written/updated

- **`/mae:start`** reads the relevant `projects/`/`packages/` doc during recon,
  so the plan is grounded in documented reality.
- **`/mae:finish`** (Document step) **must**, before the PR:
  1. Update every service doc whose surface the change touched — prose facts **and** the
     mermaid if structure moved.
  2. Add a one-line entry to that doc's **Changelog** section.
  3. Write `docs/features/<slug>.md` — a short record: what shipped, why, which surfaces
     moved, link to the spec.
  4. If a new app/package/module was created, add its doc (no orphan docs).

## Rules

- Facts as paths (`packages/db/src/x.ts`), not vibes. An agent will grep them.
- Don't duplicate `docs/constitution.md` (law) or `AGENTS.md` (switchboard) — link them.
- Convert relative dates to absolute (`2026-07-02`, not "today").
