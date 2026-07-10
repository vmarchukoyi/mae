---
name: fix
description: Use for a bug report (not a new feature) — reproduce it, trace the symptom back to the acceptance criterion it violates, lock it with a failing test, apply the smallest fix through the same quality gate, then patch the spec and record the fix. Works even on a repo with no spec for the affected area. Triggers on "fix this bug", "regression", "this is broken", a bug report or stack trace.
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, AskUserQuestion
---

# Fix — the bug entrance to the workflow

`/feature-start` is for new capability. `/fix` is for "it's broken." A bug is not a
feature; it gets its own thin loop that ends at a failing-test-turned-green plus a
record of what went wrong, so the same class of bug does not return.

Do **not** treat a bug as a mini-feature — no spec-from-scratch, no full plan. Trace,
lock, fix, record.

## Step 1 — reproduce first

No reproduction, no fix. Turn the report into a concrete, runnable repro:

- The exact input / state / steps that trigger it.
- Observed behavior vs expected behavior, both stated plainly.
- The surface it lives in (find via Glob/Grep; read the seam, not the repo).

If you cannot reproduce it, stop and report what you tried — a fix for a bug you can't
trigger is a guess. Ask the user for the missing input via `AskUserQuestion`.

## Step 2 — trace the symptom to an acceptance criterion

Walk the symptom back to **why the code allowed it**, and classify:

- **Regression** — code that used to satisfy an existing acceptance criterion stopped.
  Name the spec/DoD line it now violates (`specs/<feature>/spec.md:NN`).
- **Ambiguous AC** — the spec was read two ways and the code took the wrong one. The
  spec is the bug as much as the code — both get fixed.
- **Uncovered gap** — no acceptance criterion ever covered this path. There is nothing
  to regress against; you are adding the missing contract.

State the classification and cite the line (or state "no covering AC exists"). On a
repo with **no spec** for the area, the "AC" is the reproduced expected behavior from
Step 1 — write it down so the fix has something to satisfy.

## Step 3 — lock it with a failing test

Write a test that **fails for the reported reason** before you touch the fix. This is
the one place the workflow is test-first: the failing test is the proof you understood
the bug, and the guard against its return. Run it; confirm it is red for the right
reason (not a typo, not a missing import).

## Step 4 — smallest fix, same quality gate

- Apply the **minimal** change that turns the test green. No drive-by refactors, no
  scope creep — this is a fix, not a redesign. If the real fix is large or structural,
  stop and escalate to `/feature-start` (it needs a plan and review, not a patch).
- Enforce `CONSTITUTION.md` hard rules in the fix (Zod at boundaries, no `any`, schema
  separation, reversible migration if the fix touches schema).
- Run the same gate as `feature-finish` (dispatch `test-runner`):
  `pnpm lint → pnpm typecheck → pnpm test → pnpm build`. Green including the new test.
- Never weaken, skip, or delete a test to make the gate pass.

## Step 5 — patch the spec and record the fix

Documentation stays true by definition — a fix updates it, not a wiki:

- **Patch the spec** when the bug was an ambiguous or missing AC: tighten the wording
  or add the acceptance criterion, in `specs/<feature>/spec.md` (add its **Scenarios**
  negative case). A regression against a correct AC needs no spec change.
- **Write a fix record** at `_fixes/<yyyy-mm-dd>-<slug>.md`:
  - symptom + reproduction, root cause, the classification from Step 2,
  - the AC it violated (or the one you added), the test that now guards it,
  - surfaces touched, and the commit-to-be.
- Update the touched surface doc's **Changelog** if behavior visibly changed.

## Handoff (always end with this block)

```
## What I did
- <path> — <the fix, one line>
- <test path> — failing-then-green regression test
- specs/<feature>/spec.md — <AC tightened / negative scenario added | n/a>
- _fixes/<date>-<slug>.md — fix record
Proposed commit: fix: <symptom in one line>

## Review before continuing
- <test path>              ← does it fail without the fix? (the proof)
- <fix path>               ← is it the smallest change?
- _fixes/<date>-<slug>.md  ← root cause + classification

## Run next
Gate is green. To review + PR this fix:
`/clear`
```
/feature-finish
```
```

## Rules

- Reproduce before fixing; lock with a failing test before fixing. No exceptions.
- Smallest change that turns the test green — escalate to `/feature-start` if it isn't
  small.
- Same quality gate as a feature — a fix is not exempt.
- Never weaken a test to pass. The spec and the docs get patched by the same loop —
  they do not drift.
- Push / PR are still human-only (see `/feature-finish`). This skill stops at green.
