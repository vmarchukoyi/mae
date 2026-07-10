# Project Constitution — <PROJECT NAME>

> **This is a template.** Copy it to `CONSTITUTION.md` at your repo root and fill in every
> `<…>`. This file is engineering **law** — the non-negotiables the agents enforce. Business
> context (idea, goals, roles, scenarios) lives in a **separate** `docs/PROJECT.md`; never
> merge the two. Changes to the constitution require senior review and a standalone PR — they
> cannot ride inside a feature change.

## Identity

- **Project:** <name — one line>
- **Repository:** `<org/repo>`
- **Owner team:** <team>
- **Senior accountable engineers:** <handles — who signs off on deviations>

## Mission

<Two or three sentences: what this codebase is, who it serves, what "done" looks like at the
product level. Keep it durable — this should rarely change.>

## Delivery model

- <e.g. One senior engineer owns a feature end to end; no junior-only delivery.>
- <Every change has an accountable reviewer.>
- Review at PR boundaries. CI must be green before merge.

## Stack lock

<Your locked technology choices. Deviation from any row requires senior review with the
justification recorded in the PR. Delete rows that don't apply; add your own.>

| Concern | Lock |
|---|---|
| Language | <e.g. TypeScript, strict mode> |
| Package manager | <e.g. pnpm workspaces> |
| Framework | <…> |
| API layer | <…> |
| ORM / data access | <…> |
| Database | <…> |
| Validation | <e.g. Zod at every trust boundary> |
| Auth | <…> |
| UI | <…> |
| Background jobs | <…> |
| … | <…> |

## Shared-code canon (optional)

<If you publish shared/internal packages, name the namespace and the rule that a feature
module never re-implements what a package owns. Otherwise delete this section.>

- Namespace: `@<org>/*`
- A feature module **consumes** a shared package; it never duplicates its concern.

## Hard rules — never violate

<The short, absolute list the agents check on every change. Keep it to what you truly never
allow. Examples — edit to your stack:>

- No `any`, no type-checker suppression without a justified inline comment.
- Every trust boundary is a validation boundary (parse, don't cast).
- Every database migration is reversible, or the PR justifies why not.
- <Any data-isolation rule, e.g. schema/tenancy boundaries.>
- Shared packages follow strict semver; breaking changes need a major bump + a migration note.
- Conventional Commits, squash-merge to the default branch, branch protection, no direct push.

## Definition of Done (DoD)

A PR is Done when:

1. CI is green (typecheck, lint, test, build — as each lands).
2. One human reviewer approved.
3. No unresolved review threads.
4. Branch is rebased on the default branch.
5. <Any extra gate, e.g. changelog + semver bump when a published package changed.>
