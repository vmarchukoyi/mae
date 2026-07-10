---
paths:
  - "**/*.router.ts"
  - "**/router/**"
  - "**/*.schema.ts"
  - "**/app/api/**"
  - "**/route.ts"
  - "**/webhooks/**"
  - "**/*.webhook.ts"
  - "packages/config/**"
---

# Trust-boundary validation

Loaded when editing an oRPC router, a Next route handler, a webhook, a schema, or
config. Authoritative source: `CONSTITUTION.md` § "Hard rules" (Zod boundary).

- **Every trust boundary is a Zod boundary.** Validate before you trust: HTTP bodies/params, oRPC inputs, queue payloads, webhook events, env, and config.
- **Parse, don't cast.** `schema.parse()` / `safeParse()` at the edge; never assert a shape with `as`.
- **oRPC:** input + output schemas on every procedure; OpenAPI is emitted from them, so they are the contract.
- **AuthZ + tenancy at the boundary** — confirm the caller's identity and `org_id` scope before touching data (see `auth-tenancy` guidance in `database.md` / `packages.md`).
- **Webhooks:** verify the signature, treat delivery as at-least-once (idempotency key + dedup window).
- **Errors:** return the repo's typed error shape; never leak internal messages or secrets across the boundary.
- **Config:** new keys go through the `maeton.config.ts` Zod schema with a default — never read raw `process.env` for module activation.
