---
name: mae:start
description: Use to begin a feature from a Markdown feature-spec (task description, idea, scenarios, definition of done), your own spec file, or a free-text task. A spec is optional and created on demand — recommended for large (L/XL) features; small features run plan-only. Uses an existing spec if you have one, cuts a task branch off an updated base, sizes and routes the work, orchestrates recon + spec analysis + clarifying questions, then drops into Plan Mode and persists the approved plan. Triggers on "start a feature", "new feature", "implement this spec", or a path under specs/.
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

1. **Locate an existing spec (don't create one yet).** A spec is **optional** — when one
   exists it is the source of truth and carries the **definition of done** that
   `/mae:finish` turns into the PR checklist. The decision to *create* a spec is deferred
   to Step 3 (size-aware); here you only find one if it already exists and always derive
   the feature name.
   - **Given a spec path** (`specs/<feature>/spec.md`): read it. Confirm the four
     sections — **task description**, **idea**, **scenarios** (positive/negative),
     **definition of done** — and the frontmatter (`status`, `size`, `route`). If a
     required section is missing, stop and ask the user to complete it.
   - **No path given:** ask **one** `AskUserQuestion` — *"Do you already have a feature
     spec file for this?"* Bring-your-own is first-class.
     - **Yes** → the user points at it; read + validate it as above.
     - **No** → don't author a spec now. Derive just the kebab-case **feature name** from
       the task (one question if it isn't obvious). The create-or-skip decision happens in
       Step 3 once size is known.
   - **Visual references:** if a spec links Figma exports, confirm they exist under
     `specs/<feature>/design/`. Missing linked images → flag, don't invent.
   - The **feature name** drives the branch name (and the spec folder if one is created).

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

3. **Size & route, then the spec decision.** Ask **one** `AskUserQuestion` to set the
   depth.
   - **Size** — XS / S / M / L / XL, judged on four signals: expected number of PRs,
     time-to-merge, new modules/APIs/migrations, breaking changes.
   - **Route** — `quick` / `standard` / `full`. Default mapping (offer, let the user
     override): **XS/S → quick**, **M → standard**, **L/XL → full**.
   - **Spec decision (only if no spec exists yet):**
     - **Large (L/XL)** → *recommend a spec.* Ask **one** `AskUserQuestion`: *"This is a
       large feature — implementation may continue in another session. Create a tracked
       spec (with a definition of done) now?"* Default **Yes**. On yes, run the spec
       interview and **save** `specs/<feature>/spec.md` (see below).
     - **Small (XS/S/M)** → default **no spec**; the plan is the source of truth. The user
       may still opt in — offer it, don't push.
   - **Authoring a spec on demand** (when the user opts in, or brought their own): this is
     an **interview, not a draft-and-confirm** — `superpowers:brainstorming` is not used;
     spec authoring is mae's own interview. Walk the decision tree **one question at a
     time** with `AskUserQuestion` — task description, idea, scenarios (positive/negative),
     definition of done — each with your **recommended answer** and a one-line why. Only
     once scenarios and the DoD are resolved, create `specs/` on demand and **save**
     `specs/<feature>/spec.md` from the plugin template
     `${CLAUDE_PLUGIN_ROOT}/templates/specs/_template/spec.md`.
   - **Record size/route/status.** If a spec exists, write `size` + `route` into its
     frontmatter and flip `status` to `in-progress`. If there is **no spec**, carry
     `size`/`route` into the plan (Step 8) instead — there is no spec frontmatter to hold
     them.
   - The route governs the optional stages below:

     | Route | Recon | Spec analysis | Design note (Step 6) | e2e plan (finish) |
     |---|---|---|---|---|
     | quick | yes | yes | only if N/A-triggered | offer only if UI flow |
     | standard | yes | yes | if design-triggered | offer if UI flow |
     | full | yes | yes | yes | yes |

   - **Skips bind to N/A conditions, not to size.** An XS feature that adds a migration
     still runs the migration-relevant steps. Announce every auto-skip with its reason.

4. **Reconnaissance.** Dispatch the built-in **Explore** agent (read-only) with the spec
   (or the task text when there is no spec) + target surface. Ask it for a **delta analysis** with `path:line` citations — it
   reads the project's surface docs first (overview → `docs/projects/<app>.md` /
   `docs/packages/<pkg>.md` → the system map produced by `/mae:init`), then returns
   brownfield delta (what changes vs exists, blast radius, reuse) or greenfield
   structure. Wait for it.

5. **Spec analysis.** Dispatch **`spec-analyst`** (read-only) with the spec — or the
   inline task text when there is no spec (the analyst accepts either) — the
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
     spec (or, when there is no spec, into the plan). Blockers → resolve with the user
     before Plan Mode; the rest inform the plan.

8. **Plan Mode → persist.** Enter Plan Mode and create the plan with
   `superpowers:writing-plans`, grounded in recon + analysis + answers. The plan document
   location is `specs/<feature>/plan.md` — this overrides that skill's default location;
   it explicitly honors user preference. Writing the plan **creates `specs/<feature>/` on
   demand** (this is the one folder that always lands per feature; `spec.md` beside it is
   optional). **When there is no spec, the plan is the source of truth** — carry the
   `size`/`route` into it and include a **Definition of done / acceptance** section so
   `/mae:finish` has criteria to check. **Wait for approval** (`ExitPlanMode`). On
   approval, save the plan so the work survives across sessions. Then offer how
   implementation proceeds: `superpowers:subagent-driven-development` (recommended — a
   fresh subagent per task) or `superpowers:executing-plans` (inline, main context,
   checkpoints). Either way implementation follows
   `superpowers:test-driven-development`.

9. **Promote on the roadmap.** Move this feature into **Now** in `docs/roadmap.md`
   (linked to its spec, or its plan when there is no spec). `/mae:finish` moves it to
   **Shipped** later.

10. **Large task? Offer, don't impose.** Big/parallelizable plan → *offer*
    `superpowers:dispatching-parallel-agents` as an explicit choice. Default is the
    single-context flow.

## Handoff (end here, before implementation)

```
## What I did
- specs/<feature>/spec.md — status: in-progress, size <S>, route <quick>   (omit if no spec)
- feat/<feature> — branch off <base>@<sha>
- specs/<feature>/plan.md — approved plan (carries size/route + DoD when there's no spec)
- docs/roadmap.md — promoted to Now

## Review before continuing
- specs/<feature>/plan.md      ← the approved plan
- specs/<feature>/spec.md      ← DoD + scenarios the plan must satisfy   (omit if no spec)

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
