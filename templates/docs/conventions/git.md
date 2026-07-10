# Git convention — Conventional Commits

The rules for touching version control in this project, for agents and humans. They are
enforced by `docs/constitution.md`, branch protection, `.claude/settings.json` (deny/ask),
the mae plugin's PreToolUse guard, and CI (see `mae-checks.yml`). When a rule here and
`docs/constitution.md` disagree, the constitution wins.

This project follows [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

## The loop (one logical change = one branch = one PR)

1. **Start clean.** Working tree empty (`git status --porcelain` prints nothing) before starting.
2. **Update the base**, then branch off it:
   ```
   git fetch origin
   git checkout main
   git pull --ff-only origin main
   git checkout -b feat/<spec-folder-name>
   ```
   Base is `main`. The branch name comes from the feature spec folder.
3. **One branch per logical change.** Don't pile unrelated work on one branch.
4. **Commit** in reviewable steps (format below).
5. **Rebase, don't merge, to stay current:** `git fetch origin && git rebase origin/main`.
   Keeps history linear; `main` uses squash-merge so one branch → one commit on `main`.
6. **PR** via `/mae:feature-finish` → review → CI green → one human approval → squash-merge.

## Branch naming

`<type>/<kebab-name>`, type from Conventional Commits. Feature branches use
`feat/<spec-folder-name>`; bug branches use `fix/<spec-name>`. Other work:
`chore/ · docs/ · refactor/ · test/ · perf/ · ci/ · build/`.
Examples: `feat/org-invites`, `fix/auth-session-expiry`.

## Commit format

```
<type>(<optional-scope>)<optional !>: <subject>

<body: the full task description — what changed and why, DoD context>

<optional footer: BREAKING CHANGE: <desc>, refs>
```

- **Type:** one of `feat fix docs style refactor perf test build ci chore revert`.
- **Subject:** lowercase, imperative, no trailing period, ≤ ~72 chars.
- **Scope (optional):** the surface — `feat(api): …`, `fix(@your-org/db): …`.
- **Breaking change:** append `!` after the type/scope (`feat(api)!: …`) **or** add a
  `BREAKING CHANGE: <description>` footer. A breaking change to a published package also
  needs a major bump + a migration note (constitution).
- **Body:** carry the full task description from the spec. A commit must explain itself
  without the PR open.

## Squash-merge — the PR title is the commit

`main` uses squash-merge, so **the PR title becomes the squash commit subject**. The PR
title must itself be a valid Conventional Commit
(`^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: .+`).
CI checks the PR title on every `pull_request` event; `git.md` documents the convention,
CI holds it.

## Hard NOs (blocked by the guard + branch protection)

- **No direct push to `main`.** Always via PR.
- **No `git push --force` / `--force-with-lease`** (guard blocks it).
- **No `git reset --hard`** through the agent (guard blocks) — use `git stash` or a scratch branch.
- **No `rm -rf`** via the agent (guard blocks). Delete files explicitly.
- **No committing** `.env*`, `secrets/**`, generated clients, or `node_modules`.

## Push & PR — always human-confirmed

`git push`, `gh pr create`, `gh pr merge`, and `git merge` are `ask`-gated. The agent
never pushes or opens a PR on its own — `/mae:feature-finish` stops and asks. A green
post-PR CI review does **not** replace the required human review.

## Keeping a branch current

```
git fetch origin
git rebase origin/main        # preferred — linear history
# resolve conflicts, then:
git rebase --continue
```
On messy conflicts, stop and hand back to the human. A task branch you own may be
force-pushed **only** by the human, out of band — never by the agent.
