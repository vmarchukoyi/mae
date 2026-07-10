<!--
PROJECT.md TEMPLATE — copy to docs/PROJECT.md, generated/refreshed by /mae:explore.
This is the BUSINESS context, not the engineering rules. It answers "what are we
building and why" so an agent keeps the goal in view and does not hallucinate one.
  - docs/constitution.md = engineering non-negotiables (stack, hard rules). Different doc.
  - docs/architecture-map.md = structural map (surfaces, commands). Different doc.
Keep it short, current, and true. Delete this comment block in the real file.
-->

# <Product name> — project context

- **One-liner:** <what it is, in a sentence a stranger understands>
- **Stage:** greenfield | early | in production
- **Last surveyed:** <yyyy-mm-dd> (see `architecture-map.md` `reflects_commit`)

## Idea & problem

What this product is, and the concrete pain it removes. Who feels that pain today and
how they cope without it. Two or three paragraphs, plain language.

## Goals & success signals

What "working" means in business terms — the outcomes, not the features. State each as
something observable.

- <goal — e.g. "a new engagement ships its differentiator in weeks, not months">
- <success signal — how we'd know it's true>

## Target users & roles

Who uses this and what each role is allowed to do. Ties to auth/tenancy later, but
stated here in domain language.

| Role | Who they are | What they do |
|---|---|---|
| <role> | <…> | <…> |

## Top scenarios

The handful of end-to-end journeys that matter most. Each is a positive path a real
user walks. These seed the **Scenarios** section of feature specs.

1. **<scenario name>** — <actor> does <action> so that <outcome>.
2. …

## Non-goals

What this product deliberately does **not** do — the boundaries that stop scope creep
and wrong-headed features. Just as important as the goals.

- <non-goal>

## Glossary

Domain terms an agent must not confuse. One line each.

| Term | Means |
|---|---|
| <term> | <definition> |
