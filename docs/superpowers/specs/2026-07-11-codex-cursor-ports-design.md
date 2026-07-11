# Design: mae ports for Codex CLI and Cursor

**Status:** approved-for-planning
**Date:** 2026-07-11
**Author:** Vlad Marchuk (with Claude)

## Problem

This repo **is** the mae plugin for Claude Code: a spec-driven, human-gated workflow
(`init` / `start` / `finish` / `fix`) delivered as skills, three subagents, two hooks,
and a scaffolder. Teams that drive the same projects from **OpenAI Codex CLI** or
**Cursor** get none of it. We want mae to work natively in those two apps too.

Neither app has Claude Code's plugin+marketplace system, dispatchable subagents, Plan
Mode, the `AskUserQuestion` tool, or the **superpowers** plugin. So this is not a copy —
it is a **faithful translation** of each mae skill into each app's native format, with the
Claude-specific machinery inlined as prose.

## Decisions (locked during brainstorming)

1. **Full native port** — translate skills into native slash-commands, the session
   contract into native always-on instructions, agents/hooks where the app supports them.
2. **Hand-authored, gate-checked** — write each port by hand for translation quality;
   extend `scripts/check-plugin.mjs` to keep the three ports structurally parallel and
   catch drift.
3. **Guard: Cursor native + Codex policy** — Cursor gets a real `beforeShellExecution`
   guard reusing the guard logic; Codex ships a `config.toml` approval policy plus a
   documented protected-path list (Codex cannot block per-command; stated honestly).
4. **Spec first, then build** — this document, then a plan, then all ports + the gate in
   one implementation pass.

## § 1 — Layout

`.claude-plugin/` holds only manifests; mae's real content (`skills/ agents/ hooks/
templates/`) lives at **repo root**. Repo root is therefore already claimed, so each new
port is a **self-contained folder** carrying both its manifest and its content.

```
.codex-plugin/
  plugin.json          metadata mirror: name "mae", version == Claude's, target "codex"
  AGENTS.md            session contract (= using-mae, Codex-native; AGENTS.md always loads)
  prompts/
    mae-init.md    → /mae-init
    mae-start.md   → /mae-start
    mae-finish.md  → /mae-finish
    mae-fix.md     → /mae-fix
  config.toml          sample: MCP servers + approval_policy (the guard's honest equivalent)
  README.md            install: copy prompts/* to ~/.codex/prompts, AGENTS.md to project root

.cursor-plugin/
  plugin.json          metadata mirror: target "cursor"
  rules/
    using-mae.mdc      alwaysApply rule (= using-mae)
  commands/
    mae-init.md    → /mae-init
    mae-start.md   → /mae-start
    mae-finish.md  → /mae-finish
    mae-fix.md     → /mae-fix
  hooks.json           beforeShellExecution → guard equivalent
  mcp.json             sample MCP config
  README.md            install: copy rules/ commands/ hooks.json into .cursor/
```

**No `marketplace.json`** for either port — neither app has a marketplace, and shipping
one would imply a distribution channel that does not exist. `plugin.json` is retained
**only** as a metadata + gate anchor, and its description says so.

**Naming.** Codex turns `prompts/foo.md` into `/foo`; Cursor turns `commands/foo.md` into
`/foo`. There is no `:` namespacing, so files are named `mae-init.md` → `/mae-init`
(not `/mae:init`). The mapping is 1:1 with the four mae skills.

## § 2 — Command-body translation (normative)

Each ported command is a faithful translation of the corresponding `skills/<name>/SKILL.md`
body, applying the substitutions below **consistently**. This table is the normative
reference the implementation and the gate both key off.

| Claude construct | Native translation |
|---|---|
| `AskUserQuestion` tool | "ask one question at a time in chat, each with a recommended answer + a one-line why" |
| dispatch **Explore** (recon) | do recon inline: read the surface docs, produce a delta analysis with `path:line` cites |
| dispatch **spec-analyst** | inline: reconcile spec vs constitution/code, then an adversarial gap pass; return restated intent, placement, constitution check, ranked clarifying questions |
| dispatch **code-reviewer** | inline review checklist: design, readability, security, performance, testability + constitution hard rules |
| dispatch **test-runner** | run the gate directly (`lint → typecheck → test → build`); report GREEN/RED with exact failing output |
| Plan Mode / `ExitPlanMode` | "present the plan and **STOP**; write no code until the user replies `approved`" |
| `superpowers:writing-plans` | inline plan-doc structure; plan still lands at `specs/<feature>/plan.md` |
| `superpowers:test-driven-development` | inline: write the failing test first, then the minimal code to green it |
| `superpowers:systematic-debugging` | inline: reproduce → root-cause → fix; no guessing from the symptom |
| `superpowers:verification-before-completion` | inline: evidence before claims — every checked item traces to output |
| `superpowers:requesting/receiving-code-review` | inline the review-then-react loop |
| `superpowers:using-git-worktrees` / `dispatching-parallel-agents` | drop to a one-line note ("isolate in a worktree / split the plan if you want"); no native mechanism to invoke |
| `${CLAUDE_PLUGIN_ROOT}` | a documented relative path to the mae repo (used only for the shared scaffolder) |

**Agent bodies are inlined compactly at point-of-use**, not centralized into the session
contract. `AGENTS.md` (Codex) and `using-mae.mdc` (Cursor) load on **every** turn, so they
stay as lean as today's 60-line-budgeted `using-mae`; the heavier reviewer/analyst/gate
detail lives inside the individual command files where it is only read when that command
runs. The source of truth for that inlined detail remains `agents/*.md` in the Claude
plugin — the ports paraphrase it.

**What each command preserves** (the non-negotiable behaviors, unchanged by the port):
- `start`: spec is the source of truth; interview one question at a time; branch off an
  updated clean base; size→route; recon + analysis; plan → STOP for approval → persist.
- `finish`: review → gate → DoD-against-diff → docs-with-code → conventional commit
  (human-only authorship, no AI co-author trailer) → draft PR → **STOP**; push/PR are
  human-confirmed.
- `fix`: reproduce → trace to an acceptance criterion → failing test first → smallest fix
  → same gate → patch spec + write fix record.
- `init`: interview → scaffold the SDD layer via the shared scaffolder → survey into the
  three documents (constitution / PROJECT / architecture-map); idempotent re-run.

## § 3 — Session contract & hooks

**Session contract.**
- **Codex** — `.codex-plugin/AGENTS.md` carries the using-mae contract natively; Codex
  loads `AGENTS.md` every session, so **no hook is needed**.
- **Cursor** — `.cursor-plugin/rules/using-mae.mdc` with `alwaysApply: true` carries it.
  Optionally the existing `hooks/session-start` (which already emits `additional_context`
  for Cursor) can be wired for parity, but the always-on rule is the primary mechanism.

**Guard (block dangerous Bash).**
- **Cursor** — `.cursor-plugin/hooks.json` registers a `beforeShellExecution` hook that
  reuses the guard's *logic* (force-push, `reset --hard`, `rm -rf`, writes to `.env*` /
  `secrets/` / `.claude/` / `.github/workflows/` / `docs/constitution.md`). Cursor's
  protocol differs from Claude's exit-code-2: the hook must emit JSON
  `{"permission":"deny"|"ask"|"allow", ...}` on stdout, and Cursor's payload carries the
  command on a different field than Claude's `tool_input.command`. Implementation: a thin
  Cursor-native wrapper script that shares the pattern list with `hooks/guard` and emits
  Cursor's JSON. (The wrapper lives under `.cursor-plugin/`.)
- **Codex** — no deterministic per-command shell gate exists. `.codex-plugin/config.toml`
  ships an `approval_policy` (e.g. `on-request`) so risky commands prompt, and the README
  documents the same protected-path list as policy. This is best-effort and **stated as a
  known limitation**, not hidden.

## § 4 — Anti-drift gate (extend `scripts/check-plugin.mjs`)

New checks (Node built-ins only, consistent with the existing gate):

1. **Manifests.** `.codex-plugin/plugin.json` and `.cursor-plugin/plugin.json` are valid
   JSON, `name === "mae"`, and `version` **equals** the Claude `plugin.json` version.
2. **Command parity.** `{init, start, finish, fix}` each exist as a Codex prompt
   (`.codex-plugin/prompts/mae-<name>.md`) *and* a Cursor command
   (`.cursor-plugin/commands/mae-<name>.md`), mirroring `skills/`.
3. **Leakage guard (the drift alarm).** Fail if any file under `.codex-plugin/` or
   `.cursor-plugin/` contains a Claude-only token that a faithful port must have inlined
   away: `superpowers:`, `AskUserQuestion`, `ExitPlanMode`, `${CLAUDE_PLUGIN_ROOT}`, or a
   subagent-dispatch reference (`Explore` agent / `spec-analyst` / `code-reviewer` /
   `test-runner` used as a dispatch target). README install text that must mention a path
   is the one allowed exception and is scoped narrowly.
4. **Cursor frontmatter.** Every `.mdc` has valid frontmatter; `using-mae.mdc` is
   `alwaysApply: true` with a `description`.
5. **Contract presence.** `.codex-plugin/AGENTS.md` and `.cursor-plugin/rules/using-mae.mdc`
   exist and are non-empty.

The existing forbidden-reference and superpowers-compat scans continue to cover only the
Claude source (`skills/ agents/ hooks/`), unchanged.

## § 5 — Scope boundaries (YAGNI)

- **Scaffolder is reused, not rebuilt.** `/mae-init` in both ports calls the same
  app-agnostic `scripts/scaffold.mjs`; the port documents how to invoke it (relative path
  to the mae repo). The scaffolded artifacts (constitution, rules, specs, validator) are
  already app-neutral.
- **Out of scope for v1** (named here, not silently dropped):
  - `e2e-planner` / `e2e-runner` agents (Playwright-MCP based) — a later addition.
  - Any Codex per-command shell **blocking** beyond `approval_policy`.
  - A marketplace manifest for either app (no such system exists).

## § 6 — Success criteria

- `.codex-plugin/` and `.cursor-plugin/` exist with the layout in § 1.
- All four commands are ported for both apps, faithfully translated per § 2, with the four
  mae behaviors in § 2 preserved.
- Cursor guard denies the dangerous-command set; Codex ships the approval-policy config +
  documented policy.
- `node scripts/check-plugin.mjs` passes, including the new § 4 checks, and **fails** if a
  Claude-only token leaks into a port (verified with a deliberate temporary violation).
- Each port has a README that makes install a copy-paste.

## Open questions

None blocking. Cursor's exact `beforeShellExecution` payload shape and Codex's current
`config.toml` approval keys will be confirmed against their live docs during
implementation; both are localized to one file each and do not affect the rest of the
design.
