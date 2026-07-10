#!/usr/bin/env bash
# PreToolUse guard — deterministic guard-rail for Bash commands.
#
# Registered in .claude/settings.json under hooks.PreToolUse (matcher "Bash").
# Reads the hook event JSON on stdin, inspects tool_input.command, and blocks
# dangerous commands by exiting 2 (stderr is fed back to Claude as the reason).
#
# Blocks:
#   - git push --force / -f / --force-with-lease
#   - git reset --hard
#   - rm -rf / rm -fr
#   - writes (redirection / tee / sed -i / mv / cp / rm) targeting protected
#     paths: .env*, secrets/, .claude/, .github/workflows/
#
# Exit codes: 0 = allow, 2 = block (deterministic), other = non-blocking error.

set -euo pipefail

input="$(cat)"

# Extract the command field without requiring jq (fallback to a grep/sed pluck).
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"
else
  cmd="$(printf '%s' "$input" \
    | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' \
    | head -1)"
fi

# Nothing to inspect → allow.
[ -n "$cmd" ] || exit 0

block() {
  echo "BLOCKED by guard.sh: $1" >&2
  echo "Command: $cmd" >&2
  exit 2
}

# --- Destructive git / fs operations ---------------------------------------
case "$cmd" in
  *"git push"*"--force"* | *"git push"*"-f"* | *"git push"*"--force-with-lease"*)
    block "force-push is forbidden (branch protection on main; rewrite history out-of-band)";;
  *"git reset --hard"*)
    block "git reset --hard discards work irreversibly — stash or branch instead";;
  *"rm -rf"* | *"rm -fr"* | *"rm -Rf"*)
    block "rm -rf is forbidden via the agent — delete files explicitly and reviewably";;
esac

# --- Writes into protected zones -------------------------------------------
# Catch mutation verbs aimed at protected paths. Read-only commands (cat, grep,
# git diff) are not matched because they don't carry these write patterns.
protected_regex='(\.env($|[^a-zA-Z])|(^|[^a-zA-Z/])secrets/|(^|[^a-zA-Z/])\.claude/|\.github/workflows/)'
write_regex='(>[>]?[[:space:]]*|[[:space:]]tee[[:space:]]|sed[[:space:]]+-i|[[:space:]](mv|cp|rm|truncate|chmod|chown)[[:space:]])'

if printf '%s' "$cmd" | grep -Eq "$write_regex" \
   && printf '%s' "$cmd" | grep -Eq "$protected_regex"; then
  block "write into a protected path (.env*, secrets/, .claude/, .github/workflows/) is forbidden"
fi

exit 0
