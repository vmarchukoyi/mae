# mae Plugin (wrapper model) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure this repo into the `mae` Claude Code plugin: an SDD workflow layer (5 skills, 3 agents, hooks, project scaffold) that wraps the superpowers plugin as a required dependency.

**Architecture:** Repo = plugin = private marketplace. mae owns only the SDD layer (init/explore/feature-start/feature-finish/fix + using-mae + templates scaffolded into projects); all process discipline is invoked from `superpowers:*` at defined stages. A deterministic `scaffold.mjs` does file placement so `/mae:init` stays an interviewer, and `check-plugin.mjs` is the CI harness that must pass at the end.

**Tech Stack:** Markdown skills/agents, bash hooks + polyglot `run-hook.cmd`, Node ≥ 18 built-ins only (no runtime deps).

**Spec:** `docs/superpowers/specs/2026-07-10-mae-plugin-design.md` (rev 3). Read it before starting any task.

## Global Constraints

- Plugin name is exactly `mae`; skills are referenced namespaced: `/mae:init`, `/mae:explore`, `/mae:feature-start`, `/mae:feature-finish`, `/mae:fix`.
- `skills/using-mae/SKILL.md` body (after frontmatter) ≤ 60 lines.
- Every `superpowers:*` skill name used anywhere must appear in `docs/superpowers-compat.md`.
- No new runtime dependencies; scripts use Node built-ins only.
- Nothing in `skills/`, `agents/`, `templates/`, `hooks/`, `README.md` may reference: root `CONSTITUTION.md`/`CONSTITUTION.template.md`, `commands/`, `project-explore`, `.agents/`, `@maeton`, `app.config.ts`, or the removed agents (`architect`, `devils-advocate`, `codebase-explorer`, `implementer`).
- The constitution path is `docs/constitution.md` everywhere.
- Conventional Commits for every commit in this plan (`feat:`, `chore:`, `docs:`…).
- Push/PR: never — human-only.
- `scripts/check-plugin.mjs` is the acceptance gate: it must exit 0 at the end of Task 15. Individual tasks may leave it failing on checks whose subjects don't exist yet — each task states the expected residual failures.

---

### Task 1: Plugin manifests and repo hygiene

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`
- Modify: `.gitignore` (append)
- Delete: `.DS_Store`

**Interfaces:**
- Produces: `plugin.json` with `name: "mae"`, `version: "0.1.0"` — read by `check-plugin.mjs` (Task 2) and `scaffold.mjs` (Task 11, version stamp).

- [ ] **Step 1: Write `.claude-plugin/plugin.json`**

```json
{
  "name": "mae",
  "description": "Spec-driven development workflow for Claude Code: init/explore/feature-start/feature-finish/fix, project scaffolding, generated docs. Requires the superpowers plugin.",
  "version": "0.1.0",
  "author": { "name": "Otakoyi Software" },
  "license": "MIT",
  "keywords": ["sdd", "workflow", "spec-driven", "scaffolding"]
}
```

- [ ] **Step 2: Write `.claude-plugin/marketplace.json`**

```json
{
  "name": "otakoyi",
  "owner": { "name": "Otakoyi Software" },
  "plugins": [
    {
      "name": "mae",
      "source": "./",
      "description": "Spec-driven development workflow. Requires superpowers@claude-plugins-official."
    }
  ]
}
```

- [ ] **Step 3: Hygiene**

Append to `.gitignore` (new lines): `.DS_Store`, `.idea/`. Then `git rm --cached .DS_Store 2>/dev/null; rm -f .DS_Store`.

- [ ] **Step 4: Verify**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin .gitignore
git commit -m "feat: add mae plugin and marketplace manifests"
```

---

### Task 2: CI harness — `scripts/check-plugin.mjs`

**Files:**
- Create: `scripts/check-plugin.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `.claude-plugin/*.json` (Task 1).
- Produces: the acceptance gate. Checks (spec §7): manifests · frontmatter of `skills/*/SKILL.md` + `agents/*.md` · hooks wiring via `run-hook.cmd` · scaffold smoke test (`scripts/scaffold.mjs` + scaffolded `validate-workflow.mjs`) · forbidden-reference scan · superpowers-compat list · using-mae ≤ 60 lines. Exit 0 clean / 1 errors.

- [ ] **Step 1: Write the script**

Model it on the existing `scripts/validate-workflow.mjs` (same `parseFrontmatter`, `walk`, `err/warn` helpers — copy those functions verbatim from it). Structure:

```js
#!/usr/bin/env node
// CI checks for the mae plugin itself. Node built-ins only. Exit 0 clean, 1 errors.
import { readFileSync, existsSync, readdirSync, statSync, accessSync, constants, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// … err/warn/errors/warnings/parseFrontmatter/walk copied from validate-workflow.mjs …

// 1. Manifests
const plugin = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/plugin.json'), 'utf8'));
if (plugin.name !== 'mae') err('.claude-plugin/plugin.json', 'name must be "mae"');
if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? '')) err('.claude-plugin/plugin.json', 'version must be semver');
const market = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
if (!market.plugins?.some(p => p.name === 'mae')) err('.claude-plugin/marketplace.json', 'must list plugin "mae"');

// 2. Frontmatter: every skills/*/SKILL.md → name === dirname, non-empty description;
//    every agents/*.md and templates/agents/*.md → name === basename, description, tools.

// 3. hooks/hooks.json parses; every hooks[*][*].hooks[*].command starts with
//    "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\""; the script named as its first arg
//    exists in hooks/ and is executable (accessSync X_OK).

// 4. Smoke test (skip with warn if scripts/scaffold.mjs missing):
//    const tmp = mkdtempSync(join(tmpdir(), 'mae-scaffold-'));
//    execFileSync('node', [join(ROOT,'scripts/scaffold.mjs'), '--target', tmp, '--preset', 'typescript']);
//    execFileSync('node', [join(tmp, 'scripts/validate-workflow.mjs')], { cwd: tmp });
//    rmSync(tmp, { recursive: true, force: true });

// 5. Forbidden references: walk skills/, agents/, templates/, hooks/, README.md for
//    /CONSTITUTION(\.template)?\.md|(^|[^.\w])commands\/|project-explore|\.agents\/|@maeton|app\.config\.ts|
//    \b(architect|devils-advocate|codebase-explorer|implementer)\b  → err per hit.
//    (docs/ and specs/ of the plugin repo itself are NOT scanned.)

// 6. Compat: collect /superpowers:[a-z-]+/g across skills/ agents/ hooks/;
//    each match must appear in docs/superpowers-compat.md, else err.

// 7. using-mae budget: body lines (after closing '---' of frontmatter) ≤ 60, else err.

// report exactly like validate-workflow.mjs; process.exit(errors.length ? 1 : 0)
```

Write the full implementation — every numbered block above is real code in the file, no stubs. Check 4 uses the skip-with-warning guard so the harness is runnable from this task onward.

- [ ] **Step 2: Wire into package.json**

Add to `"scripts"`: `"check:plugin": "node scripts/check-plugin.mjs"`.

- [ ] **Step 3: Run to verify current failures are the expected ones**

Run: `node scripts/check-plugin.mjs`
Expected: FAIL listing missing `skills/`, `agents/`, `hooks/hooks.json`, missing compat doc; smoke test warns (no scaffold.mjs). No crash.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-plugin.mjs package.json
git commit -m "feat: add check-plugin CI harness"
```

---

### Task 3: `using-mae` meta-skill

**Files:**
- Create: `skills/using-mae/SKILL.md`
- Create: `docs/superpowers-compat.md`

**Interfaces:**
- Produces: the SessionStart-injected contract. The integration-contract table's `superpowers:*` names are the canonical dependency list — `docs/superpowers-compat.md` must contain exactly these: `writing-plans`, `executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`, `using-git-worktrees`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `writing-skills`.

- [ ] **Step 1: Write `skills/using-mae/SKILL.md`** — frontmatter `name: using-mae`, `description: Use when starting any conversation in a mae project — establishes the SDD workflow, superpowers integration contract, and ask-when-uncertain doctrine.` Body ≤ 60 lines containing exactly these blocks:
  1. **The rule:** if ≥1% chance a skill applies, invoke it before any response; skills evolve — read, don't recall.
  2. **Entry points:** feature/bug work enters ONLY via `/mae:feature-start` / `/mae:fix`; `/mae:init` bootstraps; `/mae:explore` surveys; `/mae:feature-finish` closes. Trivial changes get the light route — size routing is legitimate and announced, never smuggled.
  3. **Integration contract table** (2 columns: mae stage → superpowers skill), rows per the Interfaces list above: planning→`superpowers:writing-plans` (plan lands at `specs/<feature>/plan.md`), execution→`superpowers:executing-plans` or `superpowers:subagent-driven-development`, parallel→`superpowers:dispatching-parallel-agents`, isolation→`superpowers:using-git-worktrees`, implementation→`superpowers:test-driven-development`, diagnosis→`superpowers:systematic-debugging`, completion→`superpowers:verification-before-completion`, review→`superpowers:requesting-code-review`+`superpowers:receiving-code-review`, maintainers→`superpowers:writing-skills`.
  4. **Precedence:** superpowers skills run *inside* mae stages, never as entry points; if `superpowers:brainstorming`/`superpowers:writing-plans` would trigger on feature work, route to the mae skill.
  5. **Interview doctrine:** design decisions belong to the user; one question at a time, each with a recommended answer; research facts, ask only decisions; no execution before shared understanding.
  6. **Two documents:** `docs/constitution.md` = law, `docs/PROJECT.md` = business context; never conflate.

- [ ] **Step 2: Write `docs/superpowers-compat.md`** — table `skill | used by | last verified against`, one row per name above, version column `superpowers 6.1.1`; plus one line noting the interview doctrine is inspired by mattpocock's grilling skill (idea only, no code). Add `superpowers:brainstorming` with note "referenced only to redirect away from it".

- [ ] **Step 3: Verify**

Run: `node scripts/check-plugin.mjs 2>&1 | grep -i "using-mae\|compat"`
Expected: no errors about using-mae line budget or unknown `superpowers:*` names (other checks still fail).

- [ ] **Step 4: Commit**

```bash
git add skills/using-mae docs/superpowers-compat.md
git commit -m "feat: add using-mae meta-skill and superpowers compat list"
```

---

### Task 4: Hooks (cross-platform)

**Files:**
- Create: `hooks/run-hook.cmd` — the polyglot wrapper. Copy the pattern from the installed superpowers plugin (`~/.claude/plugins/cache/claude-plugins-official/superpowers/6.1.1/hooks/run-hook.cmd`) verbatim; note the borrowing in `docs/superpowers-compat.md`.
- Create: `hooks/guard` — move `.agents/hooks/guard.sh`, extensionless (Windows auto-detection quirk), with the protected-paths regex extended: replace the `protected_regex` value with `'(\.env($|[^a-zA-Z])|(^|[^a-zA-Z/])secrets/|(^|[^a-zA-Z/])\.claude/|\.github/workflows/|docs/constitution\.md)'` and update the two human-readable messages to mention `docs/constitution.md`.
- Create: `hooks/format` — move `.agents/hooks/format.sh` unchanged except the header comment (now plugin-owned; keep the "never fails the tool call" contract).
- Create: `hooks/session-start` — new bash script.
- Create: `hooks/hooks.json`.

**Interfaces:**
- Consumes: `skills/using-mae/SKILL.md` (Task 3).
- Produces: hook wiring `check-plugin.mjs` validates (every command via `run-hook.cmd`).

- [ ] **Step 1: Create the four hook scripts.** For `hooks/session-start`, adapt the superpowers session-start pattern (same JSON-escape function, same output shape) with two changes: read `${PLUGIN_ROOT}/skills/using-mae/SKILL.md`, and before emitting, check for the dependency:

```bash
superpowers_found=0
for d in "${HOME}/.claude/plugins/cache"/*/superpowers "${HOME}/.claude/plugins"/*/superpowers; do
  [ -d "$d" ] && superpowers_found=1 && break
done
if [ "$superpowers_found" -eq 0 ]; then
  warning="\n\nWARNING: the superpowers plugin is NOT installed. mae depends on it. Install: /plugin install superpowers@claude-plugins-official"
fi
```

Append `${warning:-}` inside the injected context block. Wrap the whole context in a `<MAE>` marker analogous to superpowers' `<EXTREMELY_IMPORTANT>` block.

- [ ] **Step 2: Write `hooks/hooks.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [
        { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" guard" }
      ] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [
        { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" format" }
      ] }
    ],
    "SessionStart": [
      { "matcher": "startup|clear|compact", "hooks": [
        { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start" }
      ] }
    ]
  }
}
```

- [ ] **Step 3: Make executable and test by hand**

Run: `chmod +x hooks/guard hooks/format hooks/session-start hooks/run-hook.cmd`
Run: `echo '{"tool_input":{"command":"rm -rf /tmp/x"}}' | hooks/run-hook.cmd guard; echo "exit=$?"`
Expected: `BLOCKED by guard.sh…` on stderr, `exit=2`.
Run: `echo '{"tool_input":{"command":"echo hi > docs/constitution.md"}}' | hooks/guard; echo "exit=$?"`
Expected: `exit=2` (protected path).
Run: `hooks/run-hook.cmd session-start | head -c 200`
Expected: JSON containing `using-mae` content (and no superpowers warning on this machine).

- [ ] **Step 4: Commit**

```bash
git add hooks
git commit -m "feat: add plugin hooks with cross-platform wrapper and dependency check"
```

---

### Task 5: `explore` skill

**Files:**
- Create: `skills/explore/SKILL.md` (from `.agents/skills/project-explore/SKILL.md`)

**Interfaces:**
- Produces: `/mae:explore` → `docs/PROJECT.md` + `docs/architecture-map.md`. Later skills reference it by this name only.

- [ ] **Step 1: Copy and adapt.** `frontmatter name: explore`; description keeps triggers, adds "explore the project". In the body: replace every `project-explore` self-reference with `explore`; every `/feature-start|/feature-finish|/fix` with `/mae:…`; every `CONSTITUTION.md` with `docs/constitution.md`; every dispatch of `codebase-explorer` with the built-in Explore agent ("dispatch the Explore agent (built-in)"); remove/replace any `@maeton`/`app.config.ts` example with a neutral one. Doc templates path becomes "the plugin's `templates/docs/_templates/`" (scaffolded into the project by `/mae:init` as `docs/_templates/`).
- [ ] **Step 2: Verify** — Run: `grep -nE "project-explore|codebase-explorer|@maeton|CONSTITUTION\.md" skills/explore/SKILL.md` → Expected: no output.
- [ ] **Step 3: Commit** — `git add skills/explore && git commit -m "feat: add explore skill (renamed project-explore)"`

---

### Task 6: `feature-start` skill

**Files:**
- Create: `skills/feature-start/SKILL.md` (from `.agents/skills/feature-start/SKILL.md`)

**Interfaces:**
- Consumes: `spec-analyst` agent (Task 9), `superpowers:writing-plans`, `superpowers:using-git-worktrees`, `superpowers:executing-plans` / `superpowers:subagent-driven-development`.
- Produces: `specs/<feature>/spec.md` + approved `specs/<feature>/plan.md`.

- [ ] **Step 1: Copy and rewrite.** Keep the existing step skeleton (persist spec → branch → size/route → recon → analysis → Plan Mode) with these mandatory deltas:
  1. **Spec authoring becomes an interview** (spec §4.1): when given free text, do NOT draft the whole spec and ask for confirmation; walk the decision tree one question at a time (AskUserQuestion), each with a recommended answer, until scenarios + DoD are resolved; then persist `specs/<feature>/spec.md`. State explicitly: `superpowers:brainstorming` is not used here.
  2. Recon step: dispatch the built-in Explore agent (delta analysis, `path:line` results) — not `codebase-explorer`.
  3. Analysis step: single `spec-analyst` dispatch (it now includes the adversarial phase — Task 9); its questions feed the interview one at a time. Remove the separate `devils-advocate` step.
  4. Worktree option: "invoke `superpowers:using-git-worktrees`" instead of inline worktree instructions.
  5. Plan Mode phase: "create the plan with `superpowers:writing-plans`; the plan document location is `specs/<feature>/plan.md` (this overrides that skill's default location — it explicitly honors user preference)". After approval, offer execution via `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`; implementation follows `superpowers:test-driven-development`.
  6. Path/name sweep: `/mae:` namespacing, `docs/constitution.md`, no `@maeton`/`app.config.ts`/`implementer`/`architect`.
- [ ] **Step 2: Verify** — Run: `grep -nE "devils-advocate|codebase-explorer|implementer|architect|@maeton|CONSTITUTION\.md|app\.config" skills/feature-start/SKILL.md` → no output; `grep -c "superpowers:" skills/feature-start/SKILL.md` → ≥ 4.
- [ ] **Step 3: Commit** — `git add skills/feature-start && git commit -m "feat: add feature-start skill wired to superpowers process skills"`

---

### Task 7: `feature-finish` skill

**Files:**
- Create: `skills/feature-finish/SKILL.md` (from `.agents/skills/feature-finish/SKILL.md`)

**Interfaces:**
- Consumes: `code-reviewer` + `test-runner` agents, `superpowers:requesting-code-review`, `superpowers:receiving-code-review`, `superpowers:verification-before-completion`.

- [ ] **Step 1: Copy and rewrite.** Deltas: review step = "follow `superpowers:requesting-code-review`, dispatching mae's `code-reviewer` agent; react to findings per `superpowers:receiving-code-review`" (criteria live only in the agent). Quality gate runs only via `test-runner`. Before declaring done / drafting the PR: "invoke `superpowers:verification-before-completion` — evidence before claims". DoD-vs-diff check stays. PR body follows Conventional-Commit-style title (squash-merge title check — `docs/conventions/git.md`). Ends with STOP: push/PR human-only. Same path/name sweep as Task 6.
- [ ] **Step 2: Verify** — `grep -nE "@maeton|CONSTITUTION\.md|implementer" skills/feature-finish/SKILL.md` → no output; `grep -c "superpowers:" …` → ≥ 3.
- [ ] **Step 3: Commit** — `git add skills/feature-finish && git commit -m "feat: add feature-finish skill with verification and review gates"`

---

### Task 8: `fix` skill

**Files:**
- Create: `skills/fix/SKILL.md` (from `.agents/skills/fix/SKILL.md`)

**Interfaces:**
- Consumes: `superpowers:systematic-debugging`, `superpowers:test-driven-development`, `test-runner` agent.

- [ ] **Step 1: Copy and rewrite.** Deltas: diagnosis phase = "invoke `superpowers:systematic-debugging` — root cause before any fix"; ambiguous repro/acceptance criterion → interview doctrine (ask first, one question, recommended answer); failing-test-first stays and cites `superpowers:test-driven-development`; gate via `test-runner`; spec patch + fix record steps stay. Path/name sweep as Task 6.
- [ ] **Step 2: Verify** — `grep -nE "@maeton|CONSTITUTION\.md" skills/fix/SKILL.md` → no output; `grep -c "superpowers:" …` → ≥ 2.
- [ ] **Step 3: Commit** — `git add skills/fix && git commit -m "feat: add fix skill built on systematic debugging"`

---

### Task 9: Agents (3 core) + optional e2e templates

**Files:**
- Create: `agents/spec-analyst.md` (merge `.agents/agents/spec-analyst.md` + `.agents/agents/devils-advocate.md`)
- Create: `agents/code-reviewer.md`, `agents/test-runner.md` (from `.agents/agents/`, cleaned)
- Create: `templates/agents/e2e-planner.md`, `templates/agents/e2e-runner.md` (moved verbatim, path sweep only)

**Interfaces:**
- Produces: `spec-analyst` with two phases — later skills dispatch it once. Agent frontmatter keeps `name`, `description`, `tools` (read-only sets preserved).

- [ ] **Step 1: Write merged `spec-analyst.md`.** Frontmatter: keep name `spec-analyst`; description now covers both duties ("reconcile a feature spec against docs/constitution.md, AGENTS.md, /docs and the code, surface clarifying questions, THEN adversarially attack the spec — ambiguities, edge cases, omissions, blast radius — reading the spec from disk in clean context"). Body: Phase 1 = the current spec-analyst content; Phase 2 = the devils-advocate content (cite-or-drop rule intact); output = single report: clarifying questions (ordered, each with the analyst's recommended answer) + adversarial findings. Path sweep (`docs/constitution.md`, no `@maeton`).
- [ ] **Step 2: Clean `code-reviewer.md` and `test-runner.md`.** Only path/name sweep; review criteria stay in code-reviewer (skills point here). test-runner keeps "never weaken/skip/delete tests".
- [ ] **Step 3: Move e2e pair to `templates/agents/`.** Content verbatim; sweep paths; add one frontmatter comment line: scaffolded on `/mae:init` e2e opt-in, requires Playwright MCP (`.mcp.json`, written by init).
- [ ] **Step 4: Verify** — `ls agents/` → exactly 3 files; `grep -rnE "@maeton|CONSTITUTION\.md" agents/ templates/agents/` → no output.
- [ ] **Step 5: Commit** — `git add agents templates/agents && git commit -m "feat: add core agent roster and optional e2e agent templates"`

---

### Task 10: Project templates — docs, conventions, specs

**Files:**
- Create: `templates/docs/constitution.md` (from `CONSTITUTION.template.md`)
- Create: `templates/docs/conventions/git.md` (rewrite of `docs/conventions/git.md`)
- Create: `templates/docs/conventions/workflow.md`, `templates/docs/conventions/documentation.md` (moved + sweep)
- Create: `templates/docs/_templates/{project,architecture-map,service-doc}.md` (moved from `docs/_templates/`)
- Create: `templates/specs/README.md`, `templates/specs/_template/spec.md` (moved from `specs/`)

**Interfaces:**
- Produces: files `scaffold.mjs` (Task 11) copies verbatim into projects.

- [ ] **Step 1: `templates/docs/constitution.md`.** Take `CONSTITUTION.template.md` content; retitle to "Constitution — engineering law" noting its project path is `docs/constitution.md`; update every self-reference and cross-link (`AGENTS.md`, rules paths → `.claude/rules/`); keep the `<…>` fill-in placeholders — `/mae:init`'s interview fills them.
- [ ] **Step 2: `templates/docs/conventions/git.md`.** Rewrite around [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): format `type(scope)!: description`; allowed types `feat fix docs style refactor perf test build ci chore revert`; `!`/`BREAKING CHANGE:` footer; branch naming `feat/<spec-folder-name>` (bug branches `fix/<spec-name>`); squash-merge to `main` — the PR title must itself be a valid conventional commit (it becomes the squash commit); push and PR creation are human-only (keep the existing section's wording); CI holds the convention (commitlint or PR-title check — scaffolded in Task 12).
- [ ] **Step 3: Move the rest.** `workflow.md`, `documentation.md`, `_templates/*`, `specs/*`: sweep — `/mae:` names (`/mae:explore` not `project-explore`), `docs/constitution.md`, agent roster per §3.2, no `.agents/` paths.
- [ ] **Step 4: Verify** — `grep -rnE "project-explore|CONSTITUTION\.md|\.agents/|devils-advocate|implementer|architect|codebase-explorer" templates/docs templates/specs` → no output.
- [ ] **Step 5: Commit** — `git add templates/docs templates/specs && git commit -m "feat: add project doc and spec templates with conventional commits git convention"`

---

### Task 11: Project templates — rules, AGENTS.md, settings, CI, validator + `scaffold.mjs`

**Files:**
- Create: `templates/rules/_core/engineering.md` (from `.agents/rules/engineering.md`, de-stacked), `templates/rules/_core/testing.md` (from `testing.md`, universal parts)
- Create: `templates/rules/typescript/{typescript,validation-boundaries,database,packages,modules}.md` (from `.agents/rules/`, cleaned of `@maeton`, `paths:` globs kept)
- Create: `templates/rules/php/engineering-php.md` (skeleton: strict types, PSR-12, boundary validation, reversible migrations; `paths: ["**/*.php"]`; header noting v1 skeleton)
- Create: `templates/AGENTS.md`
- Create: `templates/settings.json`
- Create: `templates/ci/mae-checks.yml`
- Create: `templates/scripts/validate-workflow.mjs` (from `scripts/validate-workflow.mjs`, adapted)
- Create: `scripts/scaffold.mjs`
- Delete: original `scripts/validate-workflow.mjs` (moves), `package.json` script `validate:workflow` (replaced by `check:plugin`)

**Interfaces:**
- Produces: `scripts/scaffold.mjs` CLI — `node scripts/scaffold.mjs --target <dir> [--preset typescript|php|none] [--e2e] [--ci]`; stamps `{{MAE_VERSION}}`; used by `/mae:init` (Task 12) and the smoke test (Task 2 check 4).
- `templates/AGENTS.md` contains the literal marker line `<!-- mae-scaffold-version: {{MAE_VERSION}} -->`.

- [ ] **Step 1: Rules presets.** `_core`: keep only stack-agnostic law (no `any`-equivalents phrased generically: "no untyped escape hatches without a justified inline comment", boundary validation, reversible migrations, never weaken a test, conventional commits, push/PR human-only); constitution referenced as `docs/constitution.md`. `typescript`: current five files, sweep `@maeton`→neutral (`@your-org/*` placeholder), `maeton.config.ts`→"the project's typed config module". `php`: one skeleton file as specified.
- [ ] **Step 2: `templates/AGENTS.md`.** Rewrite of root `AGENTS.md` as a project template: version marker line at top; two-documents section (`docs/constitution.md` + `docs/PROJECT.md`); the 5 `/mae:*` skills table; roster = 3 core agents (+ e2e note "if enabled"); the entry-point precedence paragraph from spec §4 verbatim ("Feature and bug work in this project enters through `/mae:feature-start` and `/mae:fix` only…"); rules pointer `.claude/rules/`; `<…>` placeholders for surface layout.
- [ ] **Step 3: `templates/settings.json`.**

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)", "Read(./.env.*)", "Edit(./.env)", "Edit(./.env.*)",
      "Write(./.env)", "Write(./.env.*)", "Edit(./secrets/**)", "Write(./secrets/**)",
      "Edit(./.claude/**)", "Write(./.claude/**)",
      "Edit(./docs/constitution.md)", "Write(./docs/constitution.md)",
      "Edit(./.github/workflows/**)", "Write(./.github/workflows/**)",
      "Bash(git push --force:*)", "Bash(git push -f:*)",
      "Bash(git reset --hard:*)", "Bash(rm -rf:*)"
    ],
    "ask": [
      "Bash(git push:*)", "Bash(gh pr create:*)", "Bash(gh pr merge:*)",
      "Bash(git merge:*)", "Bash(curl:*)", "Bash(wget:*)",
      "Bash(pnpm add:*)", "Bash(pnpm remove:*)", "Bash(composer require:*)"
    ],
    "allow": []
  },
  "enabledPlugins": {
    "mae@otakoyi": true,
    "superpowers@claude-plugins-official": true
  }
}
```

(Preset overlay: scaffold.mjs appends `Bash(pnpm lint:*)`, `Bash(pnpm typecheck:*)`, `Bash(pnpm test:*)` to `allow` for `typescript`.)

- [ ] **Step 4: `templates/ci/mae-checks.yml`.** GitHub Actions workflow: job 1 `node scripts/validate-workflow.mjs`; job 2 PR-title conventional-commit check — a 15-line inline `node -e` regex check of `github.event.pull_request.title` against `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: .+`, on `pull_request` events.
- [ ] **Step 5: Adapt `templates/scripts/validate-workflow.mjs`.** Path changes: agents at `.claude/agents/` (optional — only if e2e scaffolded), skills check dropped (skills live in the plugin now), rules at `.claude/rules/`, orchestrator handoff check dropped, constitution link target `docs/constitution.md`; ADD the version-drift check: read the `mae-scaffold-version` marker from `AGENTS.md` — if missing, warn "not a mae scaffold or pre-versioning"; comparison against the installed plugin happens in-session (init), so here it's presence-only.
- [ ] **Step 6: Write `scripts/scaffold.mjs`.** Full implementation: parse args; read version from `.claude-plugin/plugin.json`; recursive copy of `templates/{docs,specs,scripts}` → target (skip existing files, collect skipped list); copy `templates/rules/_core/*` + preset dir → `<target>/.claude/rules/`; copy `templates/AGENTS.md` → `<target>/AGENTS.md`; `templates/settings.json` → `<target>/.claude/settings.json` (if exists: deep-merge permissions+enabledPlugins, never remove existing entries); `--e2e`: copy `templates/agents/*` → `<target>/.claude/agents/` and write/merge `<target>/.mcp.json` with `{"mcpServers":{"playwright-test":{"command":"npx","args":["@playwright/mcp@latest"]}}}`; `--ci`: copy `templates/ci/mae-checks.yml` → `<target>/.github/workflows/`; replace `{{MAE_VERSION}}` in all copied files; print a created/skipped report. Node built-ins only.
- [ ] **Step 7: Verify** — Run: `node scripts/check-plugin.mjs` → the smoke test (check 4) now RUNS and passes; residual failures only from not-yet-moved knowledge skills / README (Tasks 13–15). Also run scaffold manually into a temp dir and `ls` the result to eyeball layout.
- [ ] **Step 8: Commit** — `git add templates scripts/scaffold.mjs package.json && git rm scripts/validate-workflow.mjs && git commit -m "feat: add scaffold engine, rules presets, project templates and CI template"`

---

### Task 12: `init` skill

**Files:**
- Create: `skills/init/SKILL.md`

**Interfaces:**
- Consumes: `scripts/scaffold.mjs` (invoked as `node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" --target . [flags]`), built-in Explore agent, `templates/docs/constitution.md` placeholders.

- [ ] **Step 1: Write the skill.** Frontmatter: `name: init`, description "Use to bootstrap or adopt a project for the mae SDD workflow — questionnaire-driven; detects new vs existing projects, scaffolds docs/constitution.md, rules preset, specs/, validator, permissions. Triggers on 'init the project', 'set up mae', 'bootstrap sdd'." Body implements spec §3.1 verbatim as numbered steps:
  0. Dependency check (superpowers skills visible? else STOP with the two `/plugin` commands).
  1. State detection (empty vs existing; ambiguous → ask).
  2. New-project: ask generate-structure? → preset list (Next.js `npx create-next-app@latest`, NestJS `npx @nestjs/cli new`, Node/TS lib, Laravel `composer create-project laravel/laravel`) with tool-availability check + fallback to free description → proposal tree → explicit approval → create.
  3. Existing-project: built-in Explore dispatch; report found-vs-missing; never overwrite without a diff.
  4. Interview for the constitution (one question at a time, recommended answers): stack lock, hard rules, DoD → fill `docs/constitution.md` placeholders after scaffolding.
  5. Run scaffold: `node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" --target . --preset <detected>` (+ `--e2e` after the e2e question, + `--ci` after the CI question, opt-out).
  6. Re-run behavior: scaffold skips existing files; for skipped-but-outdated files (version marker older than plugin version) show per-file diffs and apply only approved ones.
  7. Finish: suggest `/mae:explore` (skip if analysis already produced `docs/PROJECT.md`).
- [ ] **Step 2: Verify** — `node scripts/check-plugin.mjs 2>&1 | grep init` → no frontmatter/link errors; manual read-through against spec §3.1 checklist.
- [ ] **Step 3: Commit** — `git add skills/init && git commit -m "feat: add init questionnaire skill"`

---

### Task 13: Knowledge skills move

**Files:**
- Create: `skills/{prisma-cli,prisma-client-api,prisma-database-setup,prisma-upgrade-v7,stripe-best-practices,stripe-projects,better-auth-best-practices,shadcn,magic-ui}/` — `git mv` each directory from `.agents/skills/<name>` to `skills/<name>` verbatim (including `references/` subdirs).

- [ ] **Step 1: Move** — `git mv .agents/skills/<name> skills/<name>` for the nine listed (all except the four orchestrators, which were rewritten in Tasks 5–8).
- [ ] **Step 2: Verify** — `node scripts/check-plugin.mjs 2>&1 | grep "skills/"` → frontmatter check passes for all (fix only `name:` mismatches if any; content stays verbatim).
- [ ] **Step 3: Commit** — `git add -A skills .agents && git commit -m "chore: move knowledge skills into plugin layout"`

---

### Task 14: README, root docs, license notice

**Files:**
- Modify: `README.md` (full rewrite)
- Modify: `AGENTS.md`, `CLAUDE.md` (root — now about developing the plugin)
- Create: `NOTICE.md`

- [ ] **Step 1: Rewrite `README.md`** for colleagues: what mae is (SDD workflow, 5 skills, generated docs); **Requirements: the superpowers plugin — mae will not run without it** (exact `/plugin marketplace add obra/superpowers` or official-marketplace install command + this repo's marketplace add/install commands); quickstart (`/mae:init` → answer the interview → `/mae:explore` → `/mae:feature-start`); the five skills table; how updates roll out (`/plugin update`); model-cost note per agent (test-runner cheap, code-reviewer strong); feedback channel line (`#mae-feedback`).
- [ ] **Step 2: Root `AGENTS.md`/`CLAUDE.md`** — describe developing the plugin: layout map, `pnpm check:plugin` gate, "this repo dogfoods /mae:feature-start once bootstrapped", conventional commits. `CLAUDE.md` stays a pointer to `AGENTS.md`.
- [ ] **Step 3: `NOTICE.md`** — MIT notice for the `run-hook.cmd` wrapper and session-start pattern borrowed from obra/superpowers; pointer to `docs/superpowers-compat.md`.
- [ ] **Step 4: Verify** — `grep -nE "\.agents/|CONSTITUTION\.template|project-explore" README.md AGENTS.md CLAUDE.md` → no output.
- [ ] **Step 5: Commit** — `git add README.md AGENTS.md CLAUDE.md NOTICE.md && git commit -m "docs: rewrite README and root docs for the plugin"`

---

### Task 15: Cleanup and final gate

**Files:**
- Delete: `.agents/` (everything left), `.claude/{agents,skills,rules,commands}/`, `CONSTITUTION.template.md`, `docs/conventions/` (moved to templates in Task 10), `docs/_templates/`, `specs/` (moved to templates)
- Modify: `.claude/settings.json` (dev settings for this repo)

- [ ] **Step 1: Delete migrated trees** — `git rm -r .agents .claude/agents .claude/skills .claude/rules .claude/commands CONSTITUTION.template.md docs/conventions docs/_templates specs`.
- [ ] **Step 2: Rewrite `.claude/settings.json`** for plugin development: keep `deny` guards (drop `CONSTITUTION.md` entries, keep `.env`/secrets/workflows), drop the entire `@maeton` allow-list, add `"allow": ["Bash(node scripts/check-plugin.mjs)"]`, remove the `hooks` block (hook scripts moved into the plugin; wire nothing project-side), keep `enabledPlugins` with superpowers enabled.
- [ ] **Step 3: Final gate** — Run: `node scripts/check-plugin.mjs`
Expected: exit 0, zero errors (warnings allowed). If any check fails, fix within this task before committing.
- [ ] **Step 4: Full-tree reference sweep** — Run: `grep -rnE "@maeton|\.agents/|CONSTITUTION\.template" --include="*.md" --include="*.json" --include="*.sh" . | grep -v "docs/superpowers/" | grep -v node_modules` → no output.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "chore: remove migrated skeleton trees and finalize plugin layout"`

---

## Manual acceptance (after Task 15, human + agent together)

1. `/plugin marketplace add <this repo path>` + `/plugin install mae@otakoyi` locally; superpowers already installed.
2. New empty dir: `/mae:init` → new-project branch → TS preset → confirm scaffold + constitution interview + version stamp in `AGENTS.md`.
3. Existing throwaway TS repo: `/mae:init` → existing-project branch → found-vs-added report.
4. One tiny feature through `/mae:feature-start` → plan at `specs/<f>/plan.md` → execution → `/mae:feature-finish` — confirm superpowers skills fire *inside* stages (watch for `superpowers:brainstorming` hijacking the entry point; if it does, strengthen the precedence wording in `using-mae` and templates/AGENTS.md).
5. Re-run `/mae:init` on the same repo — idempotency + diff behavior.
