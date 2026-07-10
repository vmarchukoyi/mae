---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "apps/e2e/**"
  - "e2e/**"
---

# Testing rules

Loaded when editing a test or the e2e harness. Authoritative sources: `CONSTITUTION.md`
§ "Definition of Done", `docs/conventions/workflow.md`.

- **Never weaken, skip, or delete a test to make the gate pass.** If a test fails legitimately, fix the code or surface the conflict — don't `.skip` it away.
- **Tests accompany code per the spec's DoD** — this repo is not test-first for features. The one exception is `/fix`, where a failing test is written first to lock the bug.
- **Meaningful over vanity.** A test proves an acceptance criterion (positive and the negative/must-fail-safely case from the spec's Scenarios), not just line coverage.
- **Match the harness.** Unit/integration tests run under the repo's runner (`pnpm test`); don't introduce a second framework.
- **E2E is Markdown-plan driven.** Plans live in `e2e/plans/*.md`, executed live by the `e2e-runner` agent — do **not** hand-write `.spec.ts` for e2e flows. Author plans with `e2e-planner`.
- The quality gate is `lint → typecheck → test → build` (`test-runner`); e2e is offered per the feature's `route`, not run by default.
