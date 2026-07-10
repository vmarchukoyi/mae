# specs/

Drop-zone for feature specs. One folder per feature: `specs/<feature-name>/spec.md`.

A spec is the input artifact handed off by designer + manager. The `feature-start`
skill reads it, `spec-analyst` reconciles it against `CONSTITUTION.md` / `AGENTS.md`
/ `docs/`, `devils-advocate` attacks it, and the resulting plan is built against it.
The `feature-finish` skill turns its **Definition of done** into the PR checklist.

Copy `_template/spec.md` to start a new one.

## Frontmatter — lifecycle status

Every spec carries frontmatter. Status lives here, not in an `archive/` folder:

```yaml
---
status: draft        # draft | in-progress | done
size:                # XS | S | M | L | XL — set by /feature-start
route:               # quick | standard | full — set by /feature-start
---
```

- `draft` — written, not yet started. `in-progress` — `/feature-start` began work.
  `done` — `/feature-finish` shipped it.
- `size` / `route` are set by `/feature-start` from one question at the start; the
  route decides how deep the workflow goes (dispatch the architect? need an e2e plan?).

## Required sections

Every `spec.md` must contain these four sections (see `_template/spec.md`):

```markdown
# <Feature name>

## Task description
What is being built and the problem it solves. Plain language.

## Idea
The intended approach / UX / behavior. Sketches, flows, examples welcome.

## Scenarios
Positive (happy paths) and negative (must-fail-safely) cases, each as
Given / when / then. Read by spec-analyst and devils-advocate to find gaps.

## Definition of done
A checklist of observable, testable conditions. Each item becomes a PR
checklist row in feature-finish, checked only when actually satisfied.
- [ ] ...
```

## Visual references (Figma)

Screenshots exported from Figma live **beside the spec** in `specs/<feature>/design/`
and are linked from the spec's **Visual references** section with a relative path
(`./design/<screen>.png`). Keep the design assets in version control with the spec so
the visual intent travels with the feature.

## Conventions

- Folder name = kebab-case feature name (`specs/org-invites/spec.md`).
- A spec describes a change to **the this starter template** (schemas, modules, packages,
  apps, agent infra) — not a single client's application feature.
- Keep supporting material (mockups, sample payloads, `design/*.png`) beside `spec.md`
  in the same folder.
