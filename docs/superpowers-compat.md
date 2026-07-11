# Superpowers compatibility

mae depends on the **superpowers** plugin. It does not vendor, rename, or rewrite any
superpowers skill — it invokes them by qualified name at defined pipeline stages. This
file is the canonical dependency list. `scripts/check-plugin.mjs` asserts that every
`superpowers:*` reference in `skills/`, `agents/`, and `hooks/` appears here, so an
upstream rename surfaces as a one-file CI failure.

**Last verified against:** superpowers 6.1.1

| skill | used by | last verified against |
|---|---|---|
| `superpowers:writing-plans` | `start` (planning) | superpowers 6.1.1 |
| `superpowers:executing-plans` | `start` (plan execution) | superpowers 6.1.1 |
| `superpowers:subagent-driven-development` | `start` (plan execution) | superpowers 6.1.1 |
| `superpowers:dispatching-parallel-agents` | `start` (parallel tasks) | superpowers 6.1.1 |
| `superpowers:using-git-worktrees` | `start` (workspace isolation) | superpowers 6.1.1 |
| `superpowers:test-driven-development` | `start`, `fix` (implementation) | superpowers 6.1.1 |
| `superpowers:systematic-debugging` | `fix` (diagnosis) | superpowers 6.1.1 |
| `superpowers:verification-before-completion` | `finish` (completion gate) | superpowers 6.1.1 |
| `superpowers:requesting-code-review` | `finish` (review loop) | superpowers 6.1.1 |
| `superpowers:receiving-code-review` | `finish` (review loop) | superpowers 6.1.1 |
| `superpowers:writing-skills` | plugin maintainers | superpowers 6.1.1 |
| `superpowers:brainstorming` | `using-mae`, `start` (referenced only to redirect away from it) | superpowers 6.1.1 |

## Notes

- The **ask-when-uncertain interview doctrine** baked into mae's skills is inspired by
  mattpocock's "grilling" skill — the idea only; no code is vendored.
- The cross-platform `hooks/run-hook.cmd` wrapper and the SessionStart injection pattern
  are borrowed from obra/superpowers (MIT). See `NOTICE.md`.
