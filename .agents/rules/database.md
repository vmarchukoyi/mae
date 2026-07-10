---
paths:
  - "**/*.prisma"
  - "**/prisma/**"
  - "**/migrations/**"
  - "packages/db/**"
---

# Database & migrations

Loaded when editing Prisma schema, migrations, or `@maeton/db`. Authoritative source:
`CONSTITUTION.md` § "Hard rules" + § "Stack lock".

- **Schema separation is absolute.** `public` (user-side) and `admin` (admin-side) schemas are **never** joined by a foreign key. Correlate across them by UUID only.
- **Every migration is reversible** — provide the down path, or state in the change why it cannot be reversed. Prefer online-safe, backfill-then-switch for large tables.
- **Tenancy:** tenant-scoped tables carry `org_id`; reads and writes go through the tenancy mechanism (`@maeton/multitenancy`). Call out any deliberately unscoped access.
- **Prisma is the ORM** (stack lock). No raw SQL for things Prisma expresses; raw only with a justified reason and still parameterized.
- **Soft delete vs hard delete vs grace window:** pick one deliberately and match the module's existing choice.
- **`@maeton/db` owns the client and schema.** A module does not spin up its own Prisma client or duplicate models it can import.
