---
paths:
  - "packages/**"
---

# `@maeton/*` package rules

Loaded when editing a shared package. Authoritative source: `CONSTITUTION.md`
§ "Package canon" + § "Hard rules".

- **A package owns its concern; nobody re-implements it.** Duplicating `@maeton/*` infrastructure inside a module or app is grounds for PR rejection. Consume the package.
- **Strict semver.** A breaking change to a package's public surface needs a **major bump + a migration runbook**. Additive changes are minor; fixes are patch.
- **Changelog on every published change** (DoD item for `@maeton/*` changes).
- **The public surface is a contract** — no `any`, no leaked internal types; export intentionally from `src/index.ts`.
- **Stay in your lane:** `@maeton/media` builds on `@maeton/storage` and never re-implements S3 access; `@maeton/auth` owns better-auth config, not tenancy; `@maeton/multitenancy` owns `org_id` isolation. Check the canon before adding surface.
- **Name-locked skeletons** (`@maeton/{auth,api,media}`) are placeholders — implementing one is its own feature (spec + plan + gate), not a drive-by.
- Adding a workspace package changes `pnpm-lock.yaml`: run `pnpm install` (Node ≥ 24.15) so CI's `--frozen-lockfile` passes.
