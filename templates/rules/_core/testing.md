# Testing discipline (always-on)

Authoritative sources: `docs/constitution.md` § "Definition of Done",
`docs/conventions/workflow.md`.

- **Never weaken, skip, or delete a test to make the gate pass.** If a test fails
  legitimately, fix the code or surface the conflict — don't skip it away.
- **Tests accompany code per the spec's DoD.** The one exception is `/mae:fix`, where a
  failing test is written first to lock the bug (see `superpowers:test-driven-development`).
- **Meaningful over vanity.** A test proves an acceptance criterion — the positive and the
  negative/must-fail-safely case from the spec's Scenarios — not just line coverage.
- **Match the harness.** Tests run under the project's configured runner; don't introduce a
  second framework.
- The quality gate is `lint → typecheck → test → build`, run via the `test-runner` agent.
  Live e2e (if the project enabled it at `/mae:init`) is offered per the feature's `route`,
  not run by default.
