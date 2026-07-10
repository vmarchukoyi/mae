# Engineering non-negotiables (always-on)

The rules an agent must hold in every session in this project. These are **reminders**;
the authoritative text is `docs/constitution.md` (law) and `docs/conventions/*`. When a
reminder here and the constitution disagree, **the constitution wins**. For guaranteed
behavior (not guidance) see the mae plugin's hooks and `.claude/settings.json`.

## Hard rules (docs/constitution.md § "Hard rules")

- **No untyped escape hatches** (e.g. `any`, unchecked casts, type-checker suppression) without a justified inline comment.
- **Every trust boundary is a validation boundary** — parse and validate external input (HTTP, RPC, queue payloads, env, config); never trust-cast it.
- **Every migration is reversible**, or the change justifies why not.
- **A feature module never re-implements what a shared package owns.** Consume the package.
- **Module activation flows through the project's typed config**, not env vars.
- **Stack lock holds** (docs/constitution.md § "Stack lock"). A new runtime dependency needs review.
- **Never weaken, skip, or delete a test** to make the gate pass.
- **Conventional Commits, squash-merge to the default branch, branch protection.** No direct push. Push/PR are human-only.

## Concepts we work by

- **Two documents, not one.** `docs/constitution.md` = engineering law; `docs/PROJECT.md` = business context. Never conflate them.
- **Documentation is true by definition** — Markdown in the repo, maintained by the pipeline. No external wiki.
- **The workflow is five skills:** `/mae:init`, `/mae:explore`, `/mae:feature-start`, `/mae:feature-finish`, `/mae:fix`. Full narrative: `docs/conventions/workflow.md`.
- **Depth is proportional to feature size** (size → route); skips bind to N/A conditions, always announced.
- **Push / PR are human-only.** The agent prepares; a human presses (`docs/conventions/git.md`).

## Where the detail lives

- Stack-specific rules → `.claude/rules/` (e.g. the `typescript` preset).
- Git → `docs/conventions/git.md` · Workflow → `docs/conventions/workflow.md` · Docs → `docs/conventions/documentation.md`.
