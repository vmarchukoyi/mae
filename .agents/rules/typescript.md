---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript rules

Loaded when editing any TypeScript file. Authoritative source: `CONSTITUTION.md`
§ "Hard rules".

- **No `any`.** Use a real type, `unknown` + a narrowing check, or a Zod-inferred type.
- **No `@ts-ignore` / `@ts-expect-error`** without a justified inline comment on the same line explaining why it is safe.
- **Strict mode holds** (incl. `noUncheckedIndexedAccess` where configured) — do not weaken `tsconfig`.
- **Types flow from Zod at boundaries.** Parse at the edge, then thread the inferred type inward — do not re-declare a hand-written interface that a schema already infers.
- **Match the surrounding module's conventions** (export style, file layout, naming). Read the seam before adding to it.
- Keep escape hatches out of shared `@maeton/*` surfaces entirely — a published type is a contract.
