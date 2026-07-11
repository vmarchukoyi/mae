---
name: mae:start
description: Use to begin a feature from a Markdown feature-spec (task description, idea, scenarios, definition of done) or a free-text task. Interviews the user to build the spec, persists it, cuts a task branch off an updated base, sizes and routes the work, orchestrates recon + spec analysis + clarifying questions, then drops into Plan Mode and persists the approved plan. Triggers on "start a feature", "new feature", "implement this spec", or a path under specs/.
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
   **definition of done** that `/mae:finish` turns into the PR checklist.
   - Given a path (`specs/<feature>/spec.md`): read it. Confirm the four sections —
     **task description**, **idea**, **scenarios** (positive/negative), **definition of
     done** — and the frontmatter (`status`, `size`, `route`). If a required section is
     missing, stop and ask the user to complete it (copy `specs/_template/spec.md`).
   - Given free-text: this is an **interview, not a draft-and-confirm**. Do not write the
     whole spec and ask the user to approve it in one shot. `superpowers:brainstorming`
     is **not** used here — spec authoring is mae's own interview. Instead, walk the
     decision tree **one question at a time** with `AskUserQuestion`: derive a kebab-case
     feature name, then work through task description, idea, scenarios
     (positive/negative), and definition of done question by question. Every question
     carries your **recommended answer** with a one-line why — the user confirms or
     overrides, never fills a blank page. Only once scenarios and the DoD are resolved do
     you draft and **save** `specs/<feature>/spec.md` from `specs/_template/spec.md`. No
     spec file → no DoD → no PR later.
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
     untouched (parallel work), invoke `superpowers:using-git-worktrees` for an isolated
     worktree. Not the default.

3. **Size & route (one question).** Read `.claude/sdd.local.md` first (per-developer
   config — `default_route`, `artifact_language`; see `/mae:init` for the keys).
   Ask **one** `AskUserQuestion` to set the depth, then write `size` + `route` into the
   spec frontmatter and flip `status` to `in-progress`.
   - **Size** — XS / S / M / L / XL, judged on four signals: expected number of PRs,
     time-to-merge, new modules/APIs/migrations, breaking changes.
   - **Route** — `quick` / `standard` / `full`. Default mapping (offer, let the user
     override): **XS/S → quick**, **M → standard**, **L/XL → full**.
   - The route governs the optional stages below:

     | Route | Recon | Spec analysis | Design note (Step 6) | e2e plan (finish) |
     |---|---|---|---|---|
     | quick | yes | yes | only if N/A-triggered | offer only if UI flow |
     | standard | yes | yes | if design-triggered | offer if UI flow |
     | full | yes | yes | yes | yes |

   - **Skips bind to N/A conditions, not to size.** An XS feature that adds a migration
     still runs the migration-relevant steps. Announce every auto-skip with its reason.

4. **Reconnaissance.** Dispatch the built-in **Explore** agent (read-only) with the spec
   + target surface. Ask it for a **delta analysis** with `path:line` citations — it
   reads the project's surface docs first (overview → `docs/projects/<app>.md` /
   `docs/packages/<pkg>.md` → the system map produced by `/mae:init`), then returns
   brownfield delta (what changes vs exists, blast radius, reuse) or greenfield
   structure. Wait for it.

5. **Spec analysis.** Dispatch **`spec-analyst`** (read-only) with the spec, the
   explorer's map, `docs/constitution.md`, `AGENTS.md`, `docs/PROJECT.md` (business
   context), `docs/`. It now runs both phases in one dispatch — reconcile the spec
   against constitution/code, then an adversarial pass in the same clean context hunting
   ambiguities, edge cases, omissions, and cross-feature blast radius — and returns
   restated intent, surface placement, constitution check, gaps, and **ranked clarifying
   questions** citing spec lines.

6. **Design note (only if non-trivial).** New module, new package, cross-cutting
   refactor, stack deviation, or schema-boundary question → note the design decision and
   record it before planning. Skip for routine work (announce the skip).
   - **Config activation flag:** if the feature adds or toggles an **optional module**
     (onboarding/billing/notifications/uploads), the plan must include the activation
     change in the project's config — foundational modules can't be disabled, and there
     is no env-var override. Call this out now.

7. **Clarify — fold the analyst's questions into the interview.**
   - Put `spec-analyst`'s ranked questions (blockers first) to the user one at a time via
     `AskUserQuestion`, each with your recommended answer and a one-line why — this is
     the same interview doctrine from Step 1, not a dumped list. Fold answers into the
     spec. Blockers → resolve with the user before Plan Mode; the rest inform the plan.

8. **Plan Mode → persist.** Enter Plan Mode and create the plan with
   `superpowers:writing-plans`, grounded in recon + analysis + answers. The plan document
   location is `specs/<feature>/plan.md` — this overrides that skill's default location;
   it explicitly honors user preference. **Wait for approval** (`ExitPlanMode`). On
   approval, save the plan so the work survives across sessions. Then offer how
   implementation proceeds: `superpowers:subagent-driven-development` (recommended — a
   fresh subagent per task) or `superpowers:executing-plans` (inline, main context,
   checkpoints). Either way implementation follows
   `superpowers:test-driven-development`.

9. **Promote on the roadmap.** Move this feature into **Now** in `docs/roadmap.md`
   (linked to its spec). `/mae:finish` moves it to **Shipped** later.

10. **Large task? Offer, don't impose.** Big/parallelizable plan → *offer*
    `superpowers:dispatching-parallel-agents` as an explicit choice. Default is the
    single-context flow.

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
Implement against the plan (`superpowers:subagent-driven-development` or
`superpowers:executing-plans`). When code is done:
```
/mae:finish
```
```

## Rules

- Heavy reading/analysis lives in subagents — keep the main window clean for planning.
- Never start on `main` or a dirty tree. Branch name comes from the spec, always.
- Spec authoring and clarifying questions are one interview, one question at a time, each
  with a recommended answer — never a batch of questions, never a draft dropped on the
  user for wholesale approval.
- Never skip clarifying questions when the analyst raised blockers.
- Depth follows the route; skips follow N/A conditions and are always announced.
- This skill ends at an approved + persisted plan on a task branch. The PR is a separate
  step (`/mae:finish`).
