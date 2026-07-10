---
paths:
  - "modules/**"
---

# SaaS module rules

Loaded when editing a `modules/*` module. Authoritative source: `CONSTITUTION.md`
§ "Module canon" + § "Module activation rule".

- **Consume packages, don't re-build them.** A module wires `@maeton/*` infrastructure (db, auth, queue, storage, media, email) into a user-facing capability. It never re-implements what a package owns.
- **Activation via `maeton.config.ts` only** — Zod-validated, in version control. **No env-var override.** Foundational modules (`auth`, `admin-auth`, `multitenancy`) cannot be disabled; optional modules default to off.
- **Activation gates everything:** routes mount, workers boot, admin UI surfaces, jobs schedule, migrations run — all keyed off the config flag.
- **Tenancy by default.** Module data is `org_id`-scoped unless there is a stated reason not to be.
- **Foundational vs optional tier** determines expectations — check which tier the module is in (`CONSTITUTION.md` § "Module canon") before changing its activation semantics.
- Reserved categories (`modules/agentic/*`, `modules/mobile/*`) are name-locked; populating one is its own feature.
