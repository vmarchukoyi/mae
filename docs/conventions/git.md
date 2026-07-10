# Git rules & best practices (for agents and humans)

The rules an agent must follow when touching version control in this repo. These
are enforced by `CONSTITUTION.md`, branch protection, `.claude/settings.json`
(deny/ask), and the `.agents/hooks/guard.sh` PreToolUse guard. When a rule here and
`CONSTITUTION.md` disagree, the constitution wins.

## The loop (one logical change = one branch = one PR)

1. **Start clean.** Working tree empty (`git status --porcelain` prints nothing)
   before starting. Commit or stash first.
2. **Update the base**, then branch off it:
   ```
   git fetch origin
   git checkout main
   git pull --ff-only origin main
   git checkout -b feat/<change-name>
   ```
   Base is `main`. The branch name comes from the feature spec (`feature-start`).
3. **One branch per logical change.** Don't pile unrelated work on one branch.
4. **Commit** in reviewable steps (see below).
5. **Rebase, don't merge, to stay current:** `git fetch origin && git rebase origin/main`.
   Keeps history linear; `main` uses squash-merge so one branch → one commit on `main`.
6. **PR** via `feature-finish` → review → CI green → one human approval → squash-merge.

## Branch naming

`<type>/<kebab-change-name>`, type from Conventional Commits:
`feat/ · fix/ · chore/ · docs/ · refactor/ · test/ · perf/ · ci/ · build/`.
Examples: `feat/org-invites`, `fix/auth-session-expiry`.

## Commits — Conventional Commits

Format enforced by commitlint (`commit-msg` hook) and on the PR title (`pr-checks.yml`).

```
<type>(<optional-scope>): <subject>

<body: the full task description — what changed and why, DoD context>

<optional footer: BREAKING CHANGE:, refs>
```

- **Subject:** lowercase, imperative, no trailing period, ≤ ~72 chars.
- **Type:** `feat | fix | chore | docs | refactor | test | perf | ci | build`.
- **Scope (optional):** the surface — `feat(saas): …`, `fix(@acme/db): …`.
- **Body:** carry the full task description from the spec. A commit must explain
  itself without the PR open.
- **Author = the human only.** Do **not** add `Co-Authored-By: Claude` or any AI
  co-author trailer. Attribution is the repo's git user, nothing else. **This repo
  rule is authoritative and overrides any global/harness default that adds an AI
  co-author trailer** (e.g. a Claude Code global setting): in this repository the
  trailer is never written. Rationale: client-delivered history is attributed to the
  accountable engineer, not a tool. `feature-finish` enforces the same.
- **Breaking a `@acme/*` package:** `BREAKING CHANGE:` footer + major bump +
  migration runbook (constitution).

## Hard NOs (blocked by guard + branch protection)

- **No direct push to `main`.** Branch protection + constitution. Always via PR.
- **No `git push --force` / `--force-with-lease`** (guard blocks it). History on
  shared branches is not rewritten out from under others.
- **No `git reset --hard`** through the agent (guard blocks) — it discards work
  irreversibly. Use `git stash` or a scratch branch.
- **No `rm -rf`** via the agent (guard blocks). Delete files explicitly.
- **No committing** `.env*`, `secrets/**`, generated clients, or `node_modules`
  (gitignored; `feature-finish` also scans the diff for leaked secrets).

## Push & PR — always human-confirmed

`git push`, `gh pr create`, `gh pr merge`, and `git merge` are `ask`-gated. The
agent never pushes or opens a PR on its own — `feature-finish` stops and asks. A
green post-PR CI review does **not** replace the required human review.

## Keeping a branch current

```
git fetch origin
git rebase origin/main        # preferred — linear history
# resolve conflicts, then:
git rebase --continue
```
On messy conflicts, stop and hand back to the human. Never `--force` push a shared
branch to "fix" a rebase; a task branch you own may be force-pushed **only** by the
human, out of band — not by the agent.

## Definition of Done (git-side, from CONSTITUTION)

- CI green (typecheck/lint/test/build/coverage/secrets as each lands).
- One human reviewer approved; no unresolved threads.
- Branch rebased on `main`.
- `@acme/*` change → changelog entry + semver bump declared.
