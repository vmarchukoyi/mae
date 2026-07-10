# Documentation contract

How project knowledge is written and kept current so a future agent ramps fast.
`docs/` is the **durable knowledge base**; `specs/` holds **per-feature inputs**
(transient). Don't confuse them.

## Where things live

| Location | Holds | Lifetime |
|---|---|---|
| `docs/README.md` | Master index + multi-project map. **Read first.** | durable |
| `docs/architecture.md` | Cross-project topology, C4 L1/L2 mermaid, boundaries | durable |
| `docs/projects/<app>.md` | One doc per **app** (a project in the monorepo) | durable |
| `docs/packages/<pkg>.md` | One doc per **`@acme/*` package** (shared service) | durable |
| `docs/conventions/*.md` | Rules for agents (git, this contract, …) | durable |
| `docs/features/<slug>.md` | Per-feature record written at `feature-finish` | durable |
| `specs/<feature>/spec.md` | Feature input (task/idea/DoD) from designer+manager | per-feature |

This is a **multi-project monorepo**: several apps under `apps/*` (each its own
project), shared infrastructure under `packages/*` (`@acme/*`), and SaaS modules
under `modules/saas/*`. Every doc names which surface it covers so an agent always
knows *which project* it is in. Never write a doc that assumes a single app.

## The two-audience rule (per service doc)

Each `projects/*` and `packages/*` doc carries both:

- **A mermaid diagram — for humans.** Shows shape at a glance: who calls it, what
  it depends on, where data flows. Keep it small (≤ ~10 nodes). One diagram, not five.
- **A "For the agent" prose block — for AI.** Dense, literal, greppable facts that
  change how code gets written here: ownership boundary, public surface (as paths),
  Postgres schema + tenancy, auth instance, the constitution rules that bite, and
  gotchas. No marketing, no history — just what's true now.

Simple and useful beats exhaustive. A stale doc misleads; keep it current or delete it.
Copy `docs/_templates/service-doc.md` to start a new one.

## When docs get written/updated

- **`feature-start`** reads the relevant `projects/`/`packages/` doc during recon,
  so the plan is grounded in documented reality.
- **`feature-finish`** (Document step) **must**, before the PR:
  1. Update every service doc whose surface the change touched — prose facts **and**
     the mermaid if structure moved.
  2. Add a one-line entry to that doc's **Changelog** section.
  3. Write `docs/features/<slug>.md` — a short record: what shipped, why, which
     surfaces moved, link to `specs/<slug>/spec.md`.
  4. If a new app/package/module was created, add its doc and **link it from
     `docs/README.md`** (no orphan docs).
- **`architect`** owns `docs/architecture.md` and any decision records when a change
  moves L1/L2 shape.

## Rules

- Every doc is reachable from `docs/README.md`. No orphans.
- Facts as paths (`packages/db/src/x.ts`), not vibes. An agent will grep them.
- Don't duplicate `CONSTITUTION.md` (rules) or `AGENTS.md` (switchboard) — link them.
- Convert relative dates to absolute (`2026-07-02`, not "today").
