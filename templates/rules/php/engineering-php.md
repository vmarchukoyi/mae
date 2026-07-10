---
paths:
  - "**/*.php"
---

# PHP engineering rules (v1 skeleton)

> **v1 skeleton** — extend for your framework (Laravel, Symfony, …). The stack-agnostic
> law in `_core/` still applies; this file adds PHP-specific reminders. Grow it as the
> project's PHP surface matures.

- **`declare(strict_types=1);`** at the top of every PHP file. No loose cross-type comparisons.
- **PSR-12** coding style; enforce it in CI with a linter (PHP-CS-Fixer or PHP_CodeSniffer).
- **Validate at every trust boundary** — request input, queue payloads, external API
  responses. Parse into typed value objects / DTOs; never trust a raw array deep into the domain.
- **Every database migration is reversible** (`up`/`down`), or the PR justifies why not.
- **Type everything you can** — typed properties, parameter and return types; avoid `mixed`
  without a justified inline comment.
- **A feature module never re-implements what a shared package owns.** Consume it.
