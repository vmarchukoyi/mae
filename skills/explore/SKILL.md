---
name: explore
description: Use once per project (and to refresh) to generate the two documents every later stage reads — docs/PROJECT.md (business context — idea, goals, roles, scenarios) and docs/architecture-map.md (surface map stamped with the commit it reflects). Works greenfield (choose the foundation) and brownfield (scan what exists). On a stale map it runs an incremental re-survey of only the changed modules. Triggers on "explore the project", "survey", "map the codebase", "bootstrap the docs".
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion
---

# Explore — one-time survey + incremental refresh

Thin orchestrator. It produces the **two documents** the rest of the workflow depends
on, and nothing else. It does not write feature code, plans, or specs.

Two documents, two audiences — do not conflate them (they are the constitution of
this workflow's "two documents, not one" rule):

| Document | Audience | Holds |
|---|---|---|
| `docs/PROJECT.md` | the agent's **business** memory | idea, goals, target users, roles, top user scenarios, non-goals, glossary |
| `docs/architecture-map.md` | the agent's **structural** memory | surface inventory, boundaries, machine-readable commands, the commit it reflects |

`docs/constitution.md` (engineering hard rules) and `docs/PROJECT.md` (business context)
are **different documents and both are required**. Confusing them is the #1 source of
an agent losing the business goal and hallucinating. Never fold one into the other.

## Step 0 — decide the run

Read `docs/architecture-map.md` if it exists.

- **No map** → first run. Decide **greenfield vs brownfield** (below).
- **Map exists** → read its `reflects_commit`. Run:
  `git rev-parse HEAD` and `git diff --name-only <reflects_commit>..HEAD`.
  - Diff empty → the map is current. Report that and stop.
  - Diff touches **≤ half** the modules → **incremental refresh**: re-scan only the
    changed surfaces, update just their sections, re-stamp `reflects_commit`.
  - Diff touches **> half** the modules → **full re-scan**.

State which run you chose and why in one line.

## Greenfield vs brownfield

- **Brownfield** — real code already exists in the target surfaces, with git history
  and established patterns → **scan and describe what is there**.
- **Greenfield** — empty or name-reserved surfaces, no meaningful history → **a
  level-adaptive session to choose the foundation**, then scaffold the docs from the
  choices. Do not invent a codebase that does not exist.

## Step 1 — depth dial (one question)

Ask **one** `AskUserQuestion`: how much the survey decides on its own vs asks.

- **easy** — decide reversible calls yourself; list assumptions for veto at the end.
- **medium** — ask on anything that shapes the business framing or a boundary.
- **hard** — confirm each non-trivial call before writing it.

Default **medium**. First read `.claude/sdd.local.md` for a saved default (below).

**Per-developer config — `.claude/sdd.local.md`.** Local-only, gitignored,
auto-created on first run with self-documenting defaults; degrade gracefully if it is
absent or unwritable (fall back to the defaults, don't block). Keys:

| Key | Default | Meaning |
|---|---|---|
| `interview_depth` | `medium` | easy (decide + list assumptions) / medium (ask on framing or a boundary) / hard (confirm each call) |
| `default_route` | `auto` | `/mae:feature-start` size→route mapping: `auto` (XS/S→quick, M→standard, L/XL→full) or a pinned route |
| `artifact_language` | `uk` | language of generated **prose**; headings, code, and machine tokens (frontmatter, commit subjects, size/route) stay English always |
| `auto_dispatch_subagents` | `true` | dispatch subagents automatically vs ask before each |

When absent, create it with these defaults (via the Write tool — the `.claude/` path
is guarded against Bash writes) and tell the user it was seeded.

## Step 2 — gather

**Brownfield:**
- Read `docs/constitution.md`, `AGENTS.md`, existing `docs/` — the stated intent.
- Inventory surfaces: `apps/*`, `packages/*`, `modules/*`. For each, read the entry
  file, `package.json`, and any existing surface doc.
- Detect the machine facts from evidence, never from guesswork (Step 4 rule).

**Greenfield:**
- Run the level-adaptive foundation session: stack, first surfaces, first modules,
  data boundaries — anchored to `docs/constitution.md`'s stack lock (do not re-litigate
  locked choices; choose only what the constitution leaves open).
- The output is a skeleton map + a short list of foundational decisions to record.

## Step 3 — write `docs/PROJECT.md` (business context)

Copy `project.md` from the plugin's `templates/docs/_templates/` (scaffolded into the
project by `/mae:init` as `docs/_templates/`) and fill it. This is the business brief
an agent reads to keep the goal in view:

- **Idea & problem** — what this product is and the pain it removes.
- **Goals / success signals** — what "working" means in business terms.
- **Target users & roles** — who uses it, what each role can do.
- **Top scenarios** — the handful of end-to-end journeys that matter most.
- **Non-goals** — what this product deliberately does not do.
- **Glossary** — domain terms an agent must not confuse.

For a **derived project**, the "product" is that project's application — its users are
the engineers and stakeholders building on top of it.

## Step 4 — write `docs/architecture-map.md` (structural map)

Copy `architecture-map.md` from the plugin's `templates/docs/_templates/` (scaffolded
into the project by `/mae:init` as `docs/_templates/`). Two rules make this document
trustworthy:

1. **`reflects_commit` stamp.** Put the current `git rev-parse HEAD` in the
   frontmatter. This is what makes staleness detectable and refresh incremental.

2. **Machine-readable frontmatter, evidence-only.** Fill `test_cmd`, `lint_cmd`,
   `typecheck_cmd`, `build_cmd`, `migration_tool`, `frontend` from **proof in the
   repo** (a script in `package.json`, a config file, a lockfile). **No proof → leave
   the value an empty string. Never guess.** Every later stage reads its commands from
   here, so a wrong guess poisons the whole pipeline; a blank is safe.

Body: one row per surface (path, kind, role, depends-on, consumed-by), the boundaries
that bite (schema separation, tenancy, package ownership), and a coarse mermaid of how
surfaces connect. Link out to the per-surface docs under `docs/projects/` and
`docs/packages/` — do not duplicate them here.

## Step 5 — greenfield only: record the foundation

For each foundational choice made in Step 2, write a short decision record (inline is
fine unless it changes a shared boundary, in which case open it as its own planning
conversation) and a starter task list. Skip entirely for brownfield — you are
describing, not deciding.

## Handoff (always end with this block)

```
## What I did
- docs/PROJECT.md — <created | refreshed sections: …>
- docs/architecture-map.md — reflects_commit <sha>, <full scan | incremental: modules …>
- <decision records / roadmap seed, if greenfield>
Proposed commit: docs: survey project (PROJECT.md + architecture-map.md @ <sha>)

## Review before continuing
- docs/PROJECT.md         ← is the business goal right? veto any wrong assumption
- docs/architecture-map.md ← are the machine commands real? any blank that should be filled?

## Run next
Start a feature once the map is approved:
`/clear`
```
/mae:feature-start
```
```

## Rules

- Two documents, never one. `docs/PROJECT.md` (business) ≠ `docs/constitution.md`
  (engineering) ≠ `docs/architecture-map.md` (structure).
- Evidence-only for machine keys — blank beats a guess.
- Incremental by default when a map already exists; full scan only past the half-way
  threshold. Never silently do a full rescan when an incremental one suffices.
- Announce every auto-skip with its reason. This is a survey, not a black box.
- Read-heavy work can go to the Explore agent (built-in); keep the main context clean.
