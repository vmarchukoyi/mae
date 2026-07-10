---
name: feature-finish
description: Use when a feature's implementation is complete and you want to review, run the quality gate, commit, and prepare a PR. Runs pre-PR review + checks, verifies each definition-of-done item against the diff, commits with a full task description, fills the PR template, then STOPS — push and PR creation happen only on explicit confirmation. Triggers on "finish the feature", "prepare a PR", "wrap up this change".
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion
---

# Finish Feature

Thin orchestrator. Reviews, verifies, commits, and drafts the PR — but **never pushes or opens a PR on its own**. Push and PR creation are always explicit, human-confirmed steps.

Read `specs/<feature>/spec.md` (definition of done) and `plan.md` first — they anchor everything below.

## Steps

1. **Pre-PR review.** Dispatch **`code-reviewer`** (Opus, read-only) on the diff (`git diff main...HEAD`) → findings across design / readability / security / performance / testability + constitution compliance, with severity + confidence.
   - **Blockers** → stop, report, hand fixes to **`implementer`**, re-review. No PR with open blockers.

2. **Quality gate.** Dispatch **`test-runner`** (Haiku): `pnpm lint → pnpm typecheck → pnpm test → pnpm build`. Reports GREEN / RED with exact failing output.
   - **Coverage:** if the test run emits coverage, report it and flag drops on touched files (DoD tracks coverage as it lands).
   - **E2E is not run every time.** Follow the spec's `route`: on `full` (or any route when the change touches a user-facing flow), *offer* a `e2e-planner` pass to draft/refresh a Markdown plan under `e2e/plans/` and the `e2e-runner` agent to execute it live (or `pnpm test:e2e`). On `quick`/`standard` with no UI flow, skip and say so. Never a silent default.
   - RED = fix the code (via `implementer`), never weaken/skip/delete a test.

3. **Constitution gates (conditional).**
   - **Migrations:** if the diff touches `prisma/migrations/**` or schema, verify each migration is reversible (down path / rollback). Irreversible → the PR must justify why. Only when migrations are present.
   - **`@maeton/*` packages:** if a published package changed, confirm a changelog entry + semver bump are present. Only when a `@maeton/*` package changed.
   - **Secrets:** scan the diff for leaked secrets/keys; confirm nothing under `.env*` / `secrets/` is staged. Run `pnpm audit` if dependencies changed.
   - **Decision records / C4:** if `architect` produced a decision record or diagram delta, confirm it's committed alongside the code.

4. **Verify DoD against the diff.** For **each** definition-of-done item in the spec, map it to concrete evidence in the diff (file/test/behavior). Check an item **only** if actually satisfied — no rubber-stamping. Unmet items → report them; the feature isn't done.

5. **Document (mandatory).** Update project knowledge — docs ship **with** the code, in the same commit. See `docs/conventions/documentation.md`.
   - Update every `docs/projects/<app>.md` / `docs/packages/<pkg>.md` whose surface changed: the **"For the agent"** facts, and the **mermaid** if structure moved.
   - Add a one-line entry to each touched doc's **Changelog**.
   - Write `docs/features/<slug>.md` — what shipped, why, surfaces touched, link to `specs/<slug>/spec.md`.
   - New app/package/module → add its doc **and link it from `docs/README.md`** (no orphan docs). If structure moved, note whether `docs/architecture-map.md` needs a re-survey (`/project-explore`).
   - **Flip the spec status** to `done` in `specs/<feature>/spec.md` frontmatter, and move the feature from **Now** to **Shipped** in `docs/roadmap.md` (with the PR link once it exists, or a placeholder to fill on push). The pipeline owns the roadmap — keep it true.

6. **Commit (mandatory).** Stage the change (code **and** docs) and commit:
   - **Conventional Commits** subject (`feat|fix|chore|docs|refactor|test|perf|ci|build: ...`, lowercase, no trailing period) — `pr-checks.yml` enforces this on the PR title too.
   - **Body = the full task description** from the spec (what + why, the DoD context), so the commit is self-explanatory.
   - **Author = the human only.** Do **not** add a `Co-Authored-By: Claude` (or any AI) trailer. The commit is attributed to the repo's git user, nothing else.
   - Never commit to `main` directly (branch protection + constitution). Commit on the task branch.

7. **Rebase check.** `git fetch origin` and confirm the branch is up to date with `main` (DoD item 4). If behind, offer to `git rebase origin/main`; on conflicts, stop and hand back to the user.

8. **Draft the PR from the template.** Fill `.github/pull_request_template.md` (do not invent a fresh format):
   - Summary (what + why) from the spec.
   - DoD as a checklist — each row checked only where step 4 proved it.
   - Constitution notes: any declared deviation + its decision record; changelog/semver note if a `@maeton/*` package changed.
   - Test evidence: the gate result (+ coverage / e2e if run).
   - PR **title** in Conventional Commits form.

9. **STOP and summarize.** Show review verdict, gate result, DoD coverage, docs updated, commit sha, rebase status, and the drafted PR body. Then ask (`AskUserQuestion`) whether to push + open the PR. Offer **draft PR** as an option.

10. **On explicit confirmation only:** `git push` → `gh pr create` (both `ask`-gated in settings; the user confirms again at the prompt). Note that **human review remains required** before merge (DoD: one human reviewer, CI green, branch rebased, threads resolved). Post-PR CI review does not replace it — see superpowers `receiving-code-review` for handling feedback.

## Handoff (the STOP block in step 9, rendered)

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

- Push and PR creation are **manual**, always — never automatic, never bundled into "done".
- Evidence before assertions (superpowers `verification-before-completion`): don't claim a DoD item or a green gate without the command output that proves it.
- Squash-merge to `main` is the merge mode; direct push to `main` is forbidden.
- Human-only commit authorship — no AI co-author trailer, ever.
