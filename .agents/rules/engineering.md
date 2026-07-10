# Engineering non-negotiables (always-on)

The rules an agent must hold in every session in this repo. These are **reminders**;
the authoritative text is `CONSTITUTION.md` (law) and `docs/conventions/*`. When a
reminder here and the constitution disagree, **the constitution wins**. For guaranteed
behavior (not guidance) see `.agents/hooks/` and `.claude/settings.json`.

## Hard rules (CONSTITUTION.md § "Hard rules")

- **No `any`, no `@ts-ignore` / `@ts-expect-error`** without a justified inline comment. TypeScript strict.
- **Every trust boundary is a Zod boundary** — HTTP, oRPC procedures, queue payloads, env, config.
- **Schema separation:** `public` and `admin` Postgres schemas are never cross-referenced by foreign key; correlate across them by UUID only.
- **Every migration is reversible**, or the change justifies why not.
- **A `modules/saas/*` module never re-implements** what a `@maeton/*` package owns. Consume the package.
- **Module activation** flows through `maeton.config.ts` (Zod-validated), never env vars. Foundational modules can't be disabled.
- **Stack lock holds** (CONSTITUTION.md § "Stack lock"). A new runtime dependency needs review.
- **Conventional Commits, squash-merge to `main`, branch protection.** No direct push to `main`.

## Concepts we work by

- **Two documents, not one.** `CONSTITUTION.md` = engineering law; `docs/PROJECT.md` = business context. Never conflate them.
- **Documentation is true by definition** — Markdown in the repo, maintained by the pipeline. No external wiki.
- **The workflow is four commands:** `/project-explore`, `/feature-start`, `/feature-finish`, `/fix`. Full narrative: `docs/conventions/workflow.md`.
- **Depth is proportional to feature size** (size → route); skips bind to N/A conditions, always announced.
- **Push / PR are human-only.** The agent prepares; a human presses (`docs/conventions/git.md`).

## Where the detail lives

- Type safety → `.agents/rules/typescript.md` · Trust boundaries → `validation-boundaries.md`
- Data / migrations → `database.md` · Packages → `packages.md` · Modules → `modules.md` · Tests → `testing.md`
- Git → `docs/conventions/git.md` · Workflow → `docs/conventions/workflow.md`
