# Finish Feature

Thin orchestrator. Reviews, verifies, commits, and drafts the PR — but **never pushes or
opens a PR on its own**. Push and PR creation are always explicit, human-confirmed steps.

Read `specs/<feature>/spec.md` (definition of done) and `plan.md` first — they anchor
everything below.

## Steps

1. **Pre-PR review (do it yourself, inline).** Review the diff (`git diff main...HEAD`)
   across five axes — **design, readability, security, performance, testability** — plus
   `docs/constitution.md` hard-rule compliance (Zod at trust boundaries, no untyped escape
   hatches, schema separation, reversible migrations). Report findings with severity, then
   react to them honestly: verify each before acting, push back on any that are wrong.
   - **Blockers** → stop, report, fix the code, re-review. No PR with open blockers.

2. **Quality gate.** Run the single verification route, in order — no ad hoc calls in its
   place: `pnpm lint → pnpm typecheck → pnpm test → pnpm build`. Report GREEN / RED with
   the exact failing output.
   - **Coverage:** if the test run emits coverage, report it and flag drops on touched
     files.
   - **E2E is not run every time.** Follow the spec's `route`: on `full` (or any route
     when the change touches a user-facing flow), *offer* to draft/refresh a Markdown e2e
     plan under `e2e/plans/` and run it (or `pnpm test:e2e`) — only where an e2e setup was
     scaffolded into the project. On `quick`/`standard` with no UI flow, skip and say so.
     Never a silent default.
   - RED = fix the code, never weaken/skip/delete a test.

3. **Constitution gates (conditional).**
   - **Migrations:** if the diff touches migrations or schema, verify each migration is
     reversible (down path / rollback). Irreversible → the PR must justify why. Only when
     migrations are present.
   - **Published packages:** if a package this repo publishes changed, confirm a changelog
     entry + semver bump are present. Only when a package changed.
   - **Secrets:** scan the diff for leaked secrets/keys; confirm nothing under `.env*` /
     `secrets/` is staged. Run the project's dependency audit if dependencies changed.
   - **Decision records / diagrams:** if a decision record or architecture diagram delta
     was produced for this feature, confirm it's committed alongside the code.

4. **Verify DoD against the diff.** For **each** definition-of-done item in the spec, map
   it to concrete evidence in the diff (file/test/behavior). Check an item **only** if
   actually satisfied — no rubber-stamping. Unmet items → report them; the feature isn't
   done.

5. **Document (mandatory).** Update project knowledge — docs ship **with** the code, in
   the same commit.
   - Update every `docs/projects/<app>.md` / `docs/packages/<pkg>.md` whose surface
     changed: the **"For the agent"** facts, and the **mermaid** if structure moved.
   - Add a one-line entry to each touched doc's **Changelog**.
   - Write `docs/features/<slug>.md` — what shipped, why, surfaces touched, link to
     `specs/<slug>/spec.md`.
   - New app/package/module → add its doc **and link it from `docs/README.md`** (no orphan
     docs). If structure moved, note whether `docs/architecture-map.md` needs a re-survey
     (`/mae-init`).
   - **Flip the spec status** to `done` in `specs/<feature>/spec.md` frontmatter, and move
     the feature from **Now** to **Shipped** in `docs/roadmap.md` (with the PR link once it
     exists, or a placeholder to fill on push).

6. **Commit (mandatory).** Stage the change (code **and** docs) and commit:
   - **Conventional Commits** subject (`feat|fix|chore|docs|refactor|test|perf|ci|build:
     ...`, lowercase, no trailing period) — the squash-merge PR title must itself be a
     valid conventional commit, since it becomes the commit on `main`.
   - **Body = the full task description** from the spec (what + why, the DoD context), so
     the commit is self-explanatory.
   - **Author = the human only.** Do **not** add a `Co-Authored-By` (or any AI) trailer.
     The commit is attributed to the repo's git user, nothing else.
   - Never commit to `main` directly (branch protection + `docs/constitution.md`). Commit
     on the task branch.

7. **Rebase check.** `git fetch origin` and confirm the branch is up to date with `main`.
   If behind, offer to `git rebase origin/main`; on conflicts, stop and hand back to the
   user.

8. **Draft the PR from the template.** Fill `.github/pull_request_template.md` (do not
   invent a fresh format):
   - Summary (what + why) from the spec.
   - DoD as a checklist — each row checked only where step 4 proved it.
   - Constitution notes: any declared deviation + its decision record; changelog/semver
     note if a published package changed.
   - Test evidence: the gate result (+ coverage / e2e if run).
   - PR **title** in Conventional Commits form — the string that becomes the squash-merge
     commit subject, so it must pass the same check as step 6.

9. **Verification before declaring done.** Before summarizing or drafting the PR as ready,
   confirm **evidence before claims** — every checked DoD item and every GREEN gate must
   trace to command output or a diff line already captured in steps 2 and 4, not to
   assumption.

10. **STOP and summarize.** Show review verdict, gate result, DoD coverage, docs updated,
    commit sha, rebase status, and the drafted PR body. Then ask whether to push + open the
    PR. Offer **draft PR** as an option.

11. **On explicit confirmation only:** `git push` → `gh pr create`. Note that **human
    review remains required** before merge (one human reviewer, CI green, branch rebased,
    threads resolved). Post-PR CI review does not replace it.

## Handoff (the STOP block in step 10, rendered)

```
## What I did
- <commit sha> on feat/<feature> — <conventional subject>
- docs updated: <docs/projects/… , docs/features/<slug>.md , docs/roadmap.md → Shipped>
- spec status → done
Review verdict: <ship-ready> · Gate: <GREEN> · DoD: <n/n> · Rebase: <up to date>

## Review before continuing (real, clickable paths = your review checklist)
- git diff main...HEAD          ← the whole change
- docs/features/<slug>.md       ← what shipped and why
- <drafted PR body above>       ← summary + DoD checklist + test evidence

## Run next (human-gated — the agent does not press this)
On your confirmation only:  git push  →  gh pr create   (draft PR offered)
Human review still required before merge — CI green, one reviewer, threads resolved.
```

## Rules

- Push and PR creation are **manual**, always — never automatic, never bundled into
  "done".
- Evidence before assertions: don't claim a DoD item or a green gate without the command
  output that proves it.
- Squash-merge to `main` is the merge mode; direct push to `main` is forbidden.
- Human-only commit authorship — no AI co-author trailer, ever.
