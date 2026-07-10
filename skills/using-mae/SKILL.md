---
name: using-mae
description: Use when starting any conversation in a mae project — establishes the SDD workflow, superpowers integration contract, and ask-when-uncertain doctrine.
---

# Using mae

**The rule.** If there is a ≥1% chance a skill applies to what you are doing, invoke it before any response — including clarifying questions. Skills evolve; read the current version, never rely on memory.

## Entry points

Feature and bug work enters **only** through `/mae:feature-start` and `/mae:fix`. `/mae:init` bootstraps or adopts a project; `/mae:explore` surveys it; `/mae:feature-finish` reviews and closes. A trivial change takes the light route — size routing is legitimate, announced out loud, never smuggled.

## Integration contract

mae owns the SDD layer; process discipline is invoked from the superpowers plugin at defined stages:

| mae stage | superpowers skill |
|---|---|
| planning | `superpowers:writing-plans` (plan lands at `specs/<feature>/plan.md`) |
| plan execution | `superpowers:executing-plans` or `superpowers:subagent-driven-development` |
| parallel tasks | `superpowers:dispatching-parallel-agents` |
| workspace isolation | `superpowers:using-git-worktrees` |
| implementation | `superpowers:test-driven-development` |
| diagnosis (`/mae:fix`) | `superpowers:systematic-debugging` |
| completion gate | `superpowers:verification-before-completion` |
| review loop | `superpowers:requesting-code-review` + `superpowers:receiving-code-review` |
| plugin maintainers | `superpowers:writing-skills` |

## Precedence

Superpowers skills run **inside** mae stages, never as entry points. If `superpowers:brainstorming` or `superpowers:writing-plans` would trigger on feature work, route to the mae skill instead — it invokes them at the right stage.

## Interview doctrine (ask when uncertain)

Design decisions belong to the user. Ask one question at a time, each with your recommended answer and a one-line why. Research facts from the code and docs; ask only genuine decisions. No execution before shared understanding is confirmed.

## Two documents

`docs/constitution.md` is engineering law; `docs/PROJECT.md` is business context. Never conflate them.
