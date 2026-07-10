<!--
SPEC TEMPLATE — copy to specs/<feature-name>/spec.md (kebab-case folder = feature name).
Filled by the designer/manager as the feature input; /feature-start reads it, then
sets `size` / `route` and flips `status` to in-progress; /feature-finish flips it to
done. Keep visual references beside this file under design/ and link them below.
Delete this comment block in the real spec.
-->

---
status: draft        # draft | in-progress | done  (lifecycle, replaces an archive folder)
size:                # XS | S | M | L | XL — set by /feature-start, don't guess up front
route:               # quick | standard | full — set by /feature-start from size
---

# <Feature name>

## Task description

What is being built and the problem it solves. Plain language. This becomes the commit
body and the PR summary.

## Idea

The intended approach / UX / behavior. Sketches, flows, examples welcome.

## Scenarios

The concrete paths this feature must handle. `spec-analyst` and `devils-advocate` read
these to find gaps, and `/fix` adds negative cases here when a bug slips through.

### Positive (happy paths)

1. **<name>** — Given <state>, when <actor does X>, then <observable outcome>.
2. …

### Negative (must fail safely)

1. **<name>** — Given <state>, when <invalid/edge input>, then <the safe, specified
   failure> (validation error, empty state, permission denied, retry, …).
2. …

## Visual references

Screenshots exported from Figma live in `design/` beside this spec; link them here.
No visuals for this feature → write "none".

- ![<screen name>](./design/<screen>.png) — <what it shows>

## Definition of done

A checklist of observable, testable conditions. Each becomes a PR checklist row in
`/feature-finish`, checked **only** when actually satisfied by the diff.

- [ ] …
- [ ] …
