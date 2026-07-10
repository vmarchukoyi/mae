---
name: feature-start
description: Use to begin a feature from a Markdown feature-spec (task description, idea, scenarios, definition of done) or a free-text task. Persists the spec, cuts a task branch off an updated base, sizes and routes the work, orchestrates recon + spec analysis + clarifying questions + an adversarial critique, then drops into Plan Mode and persists the approved plan. Triggers on "start a feature", "new feature", "implement this spec", or a path under specs/.
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion
---

# Start Feature

Thin orchestrator. You stay in the main context, dispatch subagents for the heavy work,
cut a clean branch, and end at an approved + persisted plan. Do **not** write feature
code in this skill.

Depth is proportional to feature size (Step 3) — but a step is only ever skipped on an
**N/A condition**, never on size alone, and every skip is announced with its reason.

## Steps

1. **Locate & persist the spec.** The spec is the source of truth — it carries the
   **definition of done** that `feature-finish` turns into the PR checklist.
   - Given a path (`specs/<feature>/spec.md`): read it. Confirm the four sections —
     **task description**, **idea**, **scenarios** (positive/negative), **definition of
     done** — and the frontmatter (`status`, `size`, `route`). If a required section is
     missing, stop and ask the user to complete it (copy `specs/_template/spec.md`).
   - Given free-text: derive a kebab-case feature name, draft `specs/<feature>/spec.md`
     from `specs/_template/spec.md` with all four sections (ask the user to fill/confirm
     the DoD and scenarios), and **save it** before continuing. No spec file → no DoD →
     no PR later.
   - **Visual references:** if the spec links Figma exports, confirm they exist under
     `specs/<feature>/design/`. Missing linked images → flag, don't invent.
   - The **feature name = the spec folder name**. It drives the branch name.

2. **Cut the task branch off an updated base.**
   - Refuse to start on a dirty tree: `git status --porcelain` must be empty. If dirty,
     stop — the user commits/stashes first.
   - Update the base branch (default `main`): `git fetch origin` → `git checkout main` →
     `git pull --ff-only origin main`.
   - Create the task branch **named from the spec**: `git checkout -b feat/<feature-name>`
     off the updated base. One branch per change (constitution).
   - **Worktree only when needed** — if the user wants to keep the current workspace
     untouched (parallel work), offer an isolated worktree (superpowers
     `using-git-worktrees`). Not the default.

3. **Size & route (one question).** Read `.claude/sdd.local.md` first (per-developer
   config — `default_route`, `artifact_language`; see `/project-explore` for the keys).
   Ask **one** `AskUserQuestion` to set the depth, then write `size` + `route` into the
   spec frontmatter and flip `status` to `in-progress`.
   - **Size** — XS / S / M / L / XL, judged on four signals: expected number of PRs,
     time-to-merge, new modules/APIs/migrations, breaking changes.
   - **Route** — `quick` / `standard` / `full`. Default mapping (offer, let the user
     override): **XS/S → quick**, **M → standard**, **L/XL → full**.
   - The route governs the optional stages below:

     | Route | Recon | Spec analysis | Architect (Step 6) | Devil's advocate (Step 7) | e2e plan (finish) |
     |---|---|---|---|---|---|
     | quick | yes | yes | only if N/A-triggered | short pass | offer only if UI flow |
     | standard | yes | yes | if design-triggered | yes | offer if UI flow |
     | full | yes | yes | yes | yes | yes |

   - **Skips bind to N/A conditions, not to size.** An XS feature that adds a migration
     still runs the migration-relevant steps. Announce every auto-skip with its reason.

4. **Reconnaissance.** Dispatch **`codebase-explorer`** (Haiku, read-only) with the spec
   + target surface. It reads the surface docs first (`docs/README.md` +
   `docs/architecture-map.md` → `docs/projects/<app>.md` / `docs/packages/<pkg>.md` →
   `docs/architecture.md`), then returns brownfield delta (what changes vs exists, blast
   radius, reuse) or greenfield structure. Wait for it.

5. **Spec analysis.** Dispatch **`spec-analyst`** (Opus, read-only) with the spec, the
   explorer's map, `CONSTITUTION.md`, `AGENTS.md`, `docs/PROJECT.md` (business context),
   `docs/` → restated intent, surface placement, constitution check, gaps, **ranked
   clarifying questions**.

6. **Design (only if non-trivial).** New module, new `@maeton/*` package, cross-cutting
   refactor, stack deviation, or schema-boundary question → dispatch **`architect`** for
   a design note + decision record first. Skip for routine work (announce the skip).
   - **`maeton.config.ts` flag:** if the feature adds or toggles an **optional module**
     (onboarding/billing/notifications/uploads), the plan must include the
     `maeton.config.ts` activation change — foundational modules can't be disabled, and
     there is no env-var override. Call this out now.

7. **Clarify, then attack the spec.**
   - Put the analyst's ranked questions to the user via `AskUserQuestion` (blockers
     first). Fold answers in.
   - **Devil's advocate (last gate before planning).** Dispatch **`devils-advocate`**
     (Opus, read-only, clean context — it reads the spec from disk, not this
     conversation). It hunts ambiguities, edge cases, omissions, and cross-feature blast
     radius, citing spec lines. Blockers it raises → resolve with the user before Plan
     Mode; the rest inform the plan.

8. **Plan Mode → persist.** Enter Plan Mode, write the implementation plan grounded in
   recon + analysis + answers + the critique, **wait for approval** (`ExitPlanMode`). On
   approval, save it to `specs/<feature>/plan.md` so the work survives across sessions.
   Then implementation begins (main agent or the `implementer` agent). **No TDD** — tests
   accompany code per the spec's DoD, not test-first.

9. **Promote on the roadmap.** Move this feature into **Now** in `docs/roadmap.md`
   (linked to its spec). `feature-finish` moves it to **Shipped** later.

10. **Large task? Offer, don't impose.** Big/parallelizable plan → *offer* a Dynamic
    Workflow / `ultracode` run as an explicit choice. Default is the single-context flow.

## Handoff (end here, before implementation)

```
## What I did
- specs/<feature>/spec.md — status: in-progress, size <S>, route <quick>
- feat/<feature> — branch off <base>@<sha>
- specs/<feature>/plan.md — approved plan
- docs/roadmap.md — promoted to Now

## Review before continuing
- specs/<feature>/plan.md      ← the approved plan
- specs/<feature>/spec.md      ← DoD + scenarios the plan must satisfy

## Run next
Implement against the plan (inline or the implementer agent). When code is done:
`/clear`
```
/feature-finish
```
```

## Rules

- Heavy reading/analysis lives in subagents — keep the main window clean for planning.
- Never start on `main` or a dirty tree. Branch name comes from the spec, always.
- Never skip clarifying questions when the analyst raised blockers, and never skip the
  devil's advocate on `standard`/`full` routes.
- Depth follows the route; skips follow N/A conditions and are always announced.
- This skill ends at an approved + persisted plan on a task branch. The PR is a separate
  step (`feature-finish`).
