# Codex CLI & Cursor Ports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `.codex-plugin/` and `.cursor-plugin/` — faithful native ports of the four mae skills (init/start/finish/fix) plus the session contract and guard — for OpenAI Codex CLI and Cursor, gate-checked against drift.

**Architecture:** Each port is a self-contained folder at repo root carrying its own metadata manifest and content. Command bodies are hand-translated from `skills/<name>/SKILL.md` per the normative substitution table in the design spec §2 (subagents → inline steps, Plan Mode → present-and-STOP, `AskUserQuestion` → one-question-at-a-time prose, every `superpowers:*` → inlined essence). `scripts/check-plugin.mjs` gains new checks that keep the three ports structurally parallel and fail if any Claude-only token leaks into a port.

**Tech Stack:** Markdown (Codex prompts, Cursor commands/rules), JSON (manifests, Cursor hooks), TOML (Codex config), Bash (Cursor guard wrapper), Node built-ins only (gate).

## Global Constraints

- **Source of truth for translation:** `docs/superpowers/specs/2026-07-11-codex-cursor-ports-design.md` §2 table. Every command port applies those substitutions.
- **Version pin:** both port `plugin.json` files use `"version": "0.1.0"` — must equal `.claude-plugin/plugin.json`.
- **No marketplace.json** in either port.
- **Leakage ban:** no file under `.codex-plugin/` or `.cursor-plugin/` may contain `superpowers:`, `AskUserQuestion`, `ExitPlanMode`, `${CLAUDE_PLUGIN_ROOT}`, or a subagent-dispatch reference (`spec-analyst`, `code-reviewer`, `test-runner`, or the `Explore` agent as a dispatch target). README path mentions are the only scoped exception.
- **Command naming:** `mae-<name>` (Codex `prompts/mae-init.md` → `/mae-init`; Cursor `commands/mae-init.md` → `/mae-init`). No `:` namespacing.
- **Preserved behaviors** (unchanged by any port): start = spec-as-truth, one-question interview, clean/updated base branch, size→route, recon+analysis, plan→STOP→persist. finish = review→gate→DoD-vs-diff→docs-with-code→conventional commit (human-only author, no AI co-author trailer)→draft PR→STOP. fix = reproduce→trace-to-AC→failing-test-first→smallest-fix→same-gate→patch-spec+fix-record. init = interview→scaffold via shared scaffolder→survey three docs, idempotent.
- **Node built-ins only** in the gate. Conventional Commits, one commit per task.

---

### Task 1: Codex plugin scaffold (manifest, contract, config, README)

Deterministic non-command files for the Codex port.

**Files:**
- Create: `.codex-plugin/plugin.json`
- Create: `.codex-plugin/AGENTS.md`
- Create: `.codex-plugin/config.toml`
- Create: `.codex-plugin/README.md`

**Interfaces:**
- Produces: the `.codex-plugin/` folder that Task 2's prompts live in and Task 7's gate validates. `plugin.json` shape `{name, description, version, author, license, keywords, target}`.

- [ ] **Step 1: Write `.codex-plugin/plugin.json`**

```json
{
  "name": "mae",
  "description": "mae (Managed Agentic Engineering) for OpenAI Codex CLI — spec-driven, human-gated init/start/finish/fix as native prompts. Metadata + gate anchor only; install by copying prompts/ and AGENTS.md (see README).",
  "version": "0.1.0",
  "target": "codex",
  "author": { "name": "Vlad Marchuk", "email": "vlad.marchuk@otakoyi.com" },
  "license": "MIT",
  "keywords": ["managed-agentic-engineering", "spec-driven", "sdd", "workflow", "agentic", "codex", "scaffolding"]
}
```

- [ ] **Step 2: Write `.codex-plugin/AGENTS.md`** — translate `skills/using-mae/SKILL.md` per spec §2. Keep it lean (≤ 60 body lines, matching the Claude budget). Replace the superpowers integration-contract table with an **inlined** version: each mae stage names the discipline in prose ("planning: write the plan to `specs/<feature>/plan.md`, present it and STOP for approval"; "implementation: write the failing test first, then minimal code"; "diagnosis: reproduce → root-cause → fix"; "completion: evidence before claims"; "review: review the diff, then react to findings"). Preserve: the ≥1% rule, entry points (`/mae-start` `/mae-fix` only; `/mae-init`, `/mae-finish`), interview doctrine, "three documents never one". **No `superpowers:` token, no `AskUserQuestion`.**

- [ ] **Step 3: Write `.codex-plugin/config.toml`** — approval policy (guard's honest equivalent) + sample MCP:

```toml
# mae — Codex CLI config sample. Merge into ~/.codex/config.toml.
# Guard equivalent: Codex cannot block individual commands the way Claude's
# PreToolUse guard does, so we require approval for commands that touch the
# protected surface. Protected paths (deny by policy — review before running):
#   git push --force / -f / --force-with-lease, git reset --hard, rm -rf,
#   and any write to .env*, secrets/, .github/workflows/, docs/constitution.md
approval_policy = "on-request"
sandbox_mode = "workspace-write"

# Optional: Playwright MCP for e2e (parity with the Claude plugin's e2e agents).
# [mcp_servers.playwright]
# command = "npx"
# args = ["-y", "@playwright/mcp@latest"]
```

- [ ] **Step 4: Write `.codex-plugin/README.md`** — install = copy `prompts/*.md` to `~/.codex/prompts/` (each becomes `/mae-<name>`), copy `AGENTS.md` into the project root (Codex loads it every session), merge `config.toml` into `~/.codex/config.toml`. State the guard limitation honestly (approval-policy best-effort, not per-command blocking). Note `scripts/scaffold.mjs` is invoked by `/mae-init` via a relative path to the mae repo. List the four commands.

- [ ] **Step 5: Verify no leakage**

Run: `grep -rEl 'superpowers:|AskUserQuestion|ExitPlanMode|\$\{CLAUDE_PLUGIN_ROOT\}|spec-analyst|code-reviewer|test-runner' .codex-plugin/ || echo CLEAN`
Expected: `CLEAN` (README may mention a repo path but none of these tokens).

- [ ] **Step 6: Commit**

```bash
git add .codex-plugin/plugin.json .codex-plugin/AGENTS.md .codex-plugin/config.toml .codex-plugin/README.md
git commit -m "feat: codex-plugin scaffold — manifest, contract, config, readme"
```

---

### Task 2: Codex command ports (init/start/finish/fix prompts)

**Files:**
- Create: `.codex-plugin/prompts/mae-init.md`
- Create: `.codex-plugin/prompts/mae-start.md`
- Create: `.codex-plugin/prompts/mae-finish.md`
- Create: `.codex-plugin/prompts/mae-fix.md`

**Interfaces:**
- Consumes: the four `skills/<name>/SKILL.md` bodies as source; spec §2 translation table.
- Produces: four Codex prompts satisfying the gate's command-parity + leakage checks (Task 7).

For **each** file: translate the matching skill body applying every spec §2 substitution. Drop the Claude frontmatter (`allowed-tools`, `disable-model-invocation`); a Codex prompt is plain Markdown. Keep the step structure, the handoff block, and the Rules section. Concretely per command:

- [ ] **Step 1: `mae-start.md`** from `skills/start/SKILL.md`. Substitute: `AskUserQuestion` → "ask one question at a time, each with a recommended answer + one-line why"; dispatch Explore → "do recon inline: read surface docs, produce a delta analysis with `path:line` cites"; dispatch spec-analyst → inline the reconcile-then-adversarial-gap pass returning ranked clarifying questions; `superpowers:writing-plans` → "write the plan to `specs/<feature>/plan.md`"; Plan Mode/`ExitPlanMode` → "present the plan and STOP; write no code until the user replies `approved`"; `superpowers:using-git-worktrees`/`dispatching-parallel-agents` → one-line optional notes; `superpowers:test-driven-development`/`executing-plans`/`subagent-driven-development` → "implement test-first against the approved plan". Preserve the start behaviors from Global Constraints. Read `.claude/sdd.local.md` reference stays (it's app-neutral).

- [ ] **Step 2: `mae-finish.md`** from `skills/finish/SKILL.md`. Substitute: dispatch code-reviewer + `superpowers:requesting/receiving-code-review` → inline review checklist (design/readability/security/performance/testability + constitution hard rules) then react to findings; dispatch test-runner → "run the gate directly: `pnpm lint → pnpm typecheck → pnpm test → pnpm build`, report GREEN/RED with exact output"; `superpowers:verification-before-completion` → "evidence before claims — every checked DoD item and GREEN gate traces to captured output"; `AskUserQuestion` (push/PR) → one-question prose. Preserve: STOP before push/PR, human-only commit author (no AI co-author trailer), DoD-vs-diff, docs-with-code.

- [ ] **Step 3: `mae-fix.md`** from `skills/fix/SKILL.md`. Substitute: `superpowers:systematic-debugging` → "reproduce → root-cause → fix, no guessing from the symptom"; `superpowers:test-driven-development` → "write the failing test first (red for the right reason), then the smallest fix"; dispatch test-runner → run the gate directly; `AskUserQuestion` → one-question prose. Preserve: reproduce-first, trace-to-AC classification, patch-spec + `_fixes/<date>-<slug>.md` record, escalate-to-`/mae-start` if large.

- [ ] **Step 4: `mae-init.md`** from `skills/init/SKILL.md`. Substitute: Step 0 superpowers dependency gate → **remove** (no superpowers in Codex); `AskUserQuestion` → one-question prose; dispatch Explore (brownfield/survey) → "analyze the codebase yourself: stack, layout, test/build commands, existing docs"; `${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs` → a documented relative path to the mae repo's `scripts/scaffold.mjs` (e.g. `node <path-to-mae>/scripts/scaffold.mjs --target .`). Preserve: interview-not-batch, three-documents-never-one, evidence-only machine keys, idempotent re-run + incremental refresh, `.claude/sdd.local.md` keys.

- [ ] **Step 5: Verify parity + leakage**

Run: `ls .codex-plugin/prompts/ && grep -rEl 'superpowers:|AskUserQuestion|ExitPlanMode|\$\{CLAUDE_PLUGIN_ROOT\}|\bspec-analyst\b|\bcode-reviewer\b|\btest-runner\b' .codex-plugin/prompts/ || echo CLEAN`
Expected: four `mae-*.md` files listed; `CLEAN`.

- [ ] **Step 6: Commit**

```bash
git add .codex-plugin/prompts/
git commit -m "feat: codex-plugin command ports — init/start/finish/fix prompts"
```

---

### Task 3: Cursor plugin scaffold (manifest, contract rule, mcp, README)

**Files:**
- Create: `.cursor-plugin/plugin.json`
- Create: `.cursor-plugin/rules/using-mae.mdc`
- Create: `.cursor-plugin/mcp.json`
- Create: `.cursor-plugin/README.md`

**Interfaces:**
- Produces: the `.cursor-plugin/` folder Task 4/5 fill and Task 7 validates. `using-mae.mdc` has `alwaysApply: true`.

- [ ] **Step 1: Write `.cursor-plugin/plugin.json`**

```json
{
  "name": "mae",
  "description": "mae (Managed Agentic Engineering) for Cursor — spec-driven, human-gated init/start/finish/fix as native commands + an always-on rule. Metadata + gate anchor only; install by copying rules/, commands/, hooks.json into .cursor/ (see README).",
  "version": "0.1.0",
  "target": "cursor",
  "author": { "name": "Vlad Marchuk", "email": "vlad.marchuk@otakoyi.com" },
  "license": "MIT",
  "keywords": ["managed-agentic-engineering", "spec-driven", "sdd", "workflow", "agentic", "cursor", "scaffolding"]
}
```

- [ ] **Step 2: Write `.cursor-plugin/rules/using-mae.mdc`** — same translation as Task 1 Step 2 (the using-mae contract, superpowers table inlined as prose), with Cursor rule frontmatter:

```markdown
---
description: mae SDD workflow contract — establishes entry points, interview doctrine, and the three-documents rule for every session in a mae project.
alwaysApply: true
---
```

Body ≤ 60 lines, no `superpowers:`/`AskUserQuestion` tokens.

- [ ] **Step 3: Write `.cursor-plugin/mcp.json`** — sample MCP config (Playwright for e2e parity), commented as optional:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

- [ ] **Step 4: Write `.cursor-plugin/README.md`** — install = copy `rules/` `commands/` `hooks.json` into the project's `.cursor/`, and `mcp.json` into `.cursor/mcp.json`. Explain the guard is enforced via `beforeShellExecution` (Task 5). Note `/mae-init` calls `scripts/scaffold.mjs` via a relative path to the mae repo. List the four commands.

- [ ] **Step 5: Verify no leakage**

Run: `grep -rEl 'superpowers:|AskUserQuestion|ExitPlanMode|\$\{CLAUDE_PLUGIN_ROOT\}|\bspec-analyst\b|\bcode-reviewer\b|\btest-runner\b' .cursor-plugin/ || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 6: Commit**

```bash
git add .cursor-plugin/plugin.json .cursor-plugin/rules/ .cursor-plugin/mcp.json .cursor-plugin/README.md
git commit -m "feat: cursor-plugin scaffold — manifest, contract rule, mcp, readme"
```

---

### Task 4: Cursor command ports (init/start/finish/fix commands)

**Files:**
- Create: `.cursor-plugin/commands/mae-init.md`
- Create: `.cursor-plugin/commands/mae-start.md`
- Create: `.cursor-plugin/commands/mae-finish.md`
- Create: `.cursor-plugin/commands/mae-fix.md`

**Interfaces:**
- Consumes: identical source + substitution rules as Task 2.
- Produces: four Cursor commands satisfying command-parity + leakage checks.

- [ ] **Step 1: Port all four** using the exact same per-command substitution recipe as Task 2 Steps 1–4 (start, finish, fix, init). Cursor commands are plain Markdown (no required frontmatter; an optional `# Title` + short description line is fine). The prose translation is identical to the Codex prompts — reuse the Task 2 output as the base and adjust only app-name references (`/mae-init` etc. are the same). Keep step structure, handoff, Rules.

- [ ] **Step 2: Verify parity + leakage**

Run: `ls .cursor-plugin/commands/ && grep -rEl 'superpowers:|AskUserQuestion|ExitPlanMode|\$\{CLAUDE_PLUGIN_ROOT\}|\bspec-analyst\b|\bcode-reviewer\b|\btest-runner\b' .cursor-plugin/commands/ || echo CLEAN`
Expected: four `mae-*.md`; `CLEAN`.

- [ ] **Step 3: Commit**

```bash
git add .cursor-plugin/commands/
git commit -m "feat: cursor-plugin command ports — init/start/finish/fix commands"
```

---

### Task 5: Cursor guard hook (beforeShellExecution)

Reuse the `hooks/guard` deny-list logic in Cursor's native protocol (JSON out, not exit-code-2).

**Files:**
- Create: `.cursor-plugin/hooks.json`
- Create: `.cursor-plugin/hooks/guard-cursor.sh`

**Interfaces:**
- Consumes: stdin JSON from Cursor's `beforeShellExecution` event (command on `.command`, per Cursor hook payload).
- Produces: stdout JSON `{"permission":"allow"|"deny", "userMessage"?: string}`.

- [ ] **Step 1: Write `.cursor-plugin/hooks/guard-cursor.sh`** — read stdin JSON, pluck the command (`jq -r '.command // .tool_input.command // ""'`, with a sed fallback like `hooks/guard`), apply the same deny patterns as `hooks/guard` (force-push `--force`/`-f`/`--force-with-lease`, `git reset --hard`, `rm -rf`/`rm -fr`, and writes — redirection/`tee`/`sed -i`/`mv`/`cp`/`rm` — targeting `.env*`, `secrets/`, `.claude/`, `.github/workflows/`, `docs/constitution.md`). On match print `{"permission":"deny","userMessage":"<reason>"}` and exit 0; otherwise print `{"permission":"allow"}` and exit 0. `chmod +x` it.

- [ ] **Step 2: Write `.cursor-plugin/hooks.json`**

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      { "command": "./hooks/guard-cursor.sh" }
    ]
  }
}
```

- [ ] **Step 3: Test the guard denies a dangerous command**

Run: `echo '{"command":"git push --force origin main"}' | bash .cursor-plugin/hooks/guard-cursor.sh`
Expected: JSON containing `"permission":"deny"`.

- [ ] **Step 4: Test the guard allows a safe command**

Run: `echo '{"command":"pnpm test"}' | bash .cursor-plugin/hooks/guard-cursor.sh`
Expected: JSON containing `"permission":"allow"`.

- [ ] **Step 5: Test a protected-path write is denied**

Run: `echo '{"command":"echo x > .env"}' | bash .cursor-plugin/hooks/guard-cursor.sh`
Expected: `"permission":"deny"`.

- [ ] **Step 6: Commit**

```bash
git add .cursor-plugin/hooks.json .cursor-plugin/hooks/guard-cursor.sh
git commit -m "feat: cursor-plugin guard — beforeShellExecution deny-list"
```

---

### Task 6: Extend the CI gate for both ports

Add the spec §4 checks to `scripts/check-plugin.mjs`. This is the anti-drift enforcement.

**Files:**
- Modify: `scripts/check-plugin.mjs` (add a `checkPorts()` function + call it near the other check calls)

**Interfaces:**
- Consumes: existing helpers `walk`, `parseFrontmatter`, `err`, `warn`, `ROOT`, and the Claude `plugin.json` version.
- Produces: `checkPorts()` invoked in the run sequence; new errors on manifest mismatch, missing command parity, leakage, bad `.mdc` frontmatter, or missing contract files.

- [ ] **Step 1: Add `checkPorts()` to `scripts/check-plugin.mjs`** (insert after `checkUsingMaeBudget`, before the invocation block). Full implementation:

```js
// --- 8. Codex / Cursor ports ----------------------------------------------
const PORT_LEAK_RE =
  /superpowers:|AskUserQuestion|ExitPlanMode|\$\{CLAUDE_PLUGIN_ROOT\}|\bspec-analyst\b|\bcode-reviewer\b|\btest-runner\b/;
const MAE_COMMANDS = ['init', 'start', 'finish', 'fix'];

function claudeVersion() {
  try {
    return JSON.parse(readFileSync(join(ROOT, '.claude-plugin/plugin.json'), 'utf8')).version;
  } catch { return null; }
}

function checkPortManifest(dir, target, wantVersion) {
  const p = join(ROOT, dir, 'plugin.json');
  if (!existsSync(p)) { err(p, `${dir}/plugin.json is missing`); return; }
  let m;
  try { m = JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { err(p, `invalid JSON: ${e.message}`); return; }
  if (m.name !== 'mae') err(p, 'name must be "mae"');
  if (m.target !== target) err(p, `target must be "${target}"`);
  if (wantVersion && m.version !== wantVersion) {
    err(p, `version "${m.version}" must equal Claude plugin version "${wantVersion}"`);
  }
}

function checkPortLeakage(dir) {
  const root = join(ROOT, dir);
  if (!existsSync(root)) return;
  for (const file of walk(root, (f) => f.endsWith('.md') || f.endsWith('.mdc') || f.endsWith('.toml') || f.endsWith('.json'))) {
    if (basename(file) === 'README.md') continue; // READMEs may cite repo paths
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (PORT_LEAK_RE.test(line)) {
        err(file, `Claude-only token leaked on line ${i + 1}: ${line.trim().slice(0, 80)}`);
      }
    });
  }
}

function checkPorts() {
  const v = claudeVersion();

  // Codex
  checkPortManifest('.codex-plugin', 'codex', v);
  const codexAgents = join(ROOT, '.codex-plugin/AGENTS.md');
  if (!existsSync(codexAgents) || readFileSync(codexAgents, 'utf8').trim() === '') {
    err(codexAgents, '.codex-plugin/AGENTS.md missing or empty');
  }
  for (const c of MAE_COMMANDS) {
    const f = join(ROOT, `.codex-plugin/prompts/mae-${c}.md`);
    if (!existsSync(f)) err(f, `codex prompt for "${c}" is missing`);
  }
  checkPortLeakage('.codex-plugin');

  // Cursor
  checkPortManifest('.cursor-plugin', 'cursor', v);
  const rule = join(ROOT, '.cursor-plugin/rules/using-mae.mdc');
  if (!existsSync(rule)) {
    err(rule, '.cursor-plugin/rules/using-mae.mdc is missing');
  } else {
    const fm = parseFrontmatter(readFileSync(rule, 'utf8'));
    if (!fm) err(rule, 'frontmatter opened with --- but never closed');
    else {
      if (!fm.data.description) err(rule, 'missing frontmatter "description"');
      if (String(fm.data.alwaysApply) !== 'true') err(rule, 'using-mae.mdc must be alwaysApply: true');
    }
  }
  for (const c of MAE_COMMANDS) {
    const f = join(ROOT, `.cursor-plugin/commands/mae-${c}.md`);
    if (!existsSync(f)) err(f, `cursor command for "${c}" is missing`);
  }
  checkPortLeakage('.cursor-plugin');
}
```

- [ ] **Step 2: Register the call** — add `checkPorts();` in the invocation block, after `checkUsingMaeBudget();`.

```js
checkUsingMaeBudget();
checkPorts();
```

- [ ] **Step 3: Run the gate — expect PASS on the good ports**

Run: `node scripts/check-plugin.mjs`
Expected: `check-plugin: 0 error(s), ...` (exit 0). If port command files show leakage errors, fix the offending port file (a substitution was missed), not the gate.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-plugin.mjs
git commit -m "feat: gate — validate codex/cursor ports (parity, manifests, leakage)"
```

---

### Task 7: Prove the leakage guard bites, then finalize

The gate's value is that it *fails* on drift. Verify that, then confirm the whole gate is green.

**Files:** none created (verification only).

- [ ] **Step 1: Inject a deliberate violation**

Run: `printf '\nsuperpowers:writing-plans\n' >> .cursor-plugin/commands/mae-start.md`

- [ ] **Step 2: Run the gate — expect FAIL**

Run: `node scripts/check-plugin.mjs; echo "exit=$?"`
Expected: an ERROR line naming `.cursor-plugin/commands/mae-start.md` with "Claude-only token leaked", and `exit=1`.

- [ ] **Step 3: Revert the violation**

Run: `git checkout .cursor-plugin/commands/mae-start.md`

- [ ] **Step 4: Run the full gate — expect PASS**

Run: `node scripts/check-plugin.mjs; echo "exit=$?"`
Expected: `check-plugin: 0 error(s)` and `exit=0`.

- [ ] **Step 5: Update AGENTS.md layout docs** — add `.codex-plugin/` and `.cursor-plugin/` to the "Layout" section of the repo-root `AGENTS.md` (the plugin-dev guide), and note the new gate checks in "The gate" section. Commit:

```bash
git add AGENTS.md
git commit -m "docs: document codex/cursor ports in plugin-dev AGENTS.md"
```

---

## Self-Review

**Spec coverage:**
- §1 layout → Tasks 1–5 create every listed file; no `marketplace.json` (respected). ✓
- §2 translation table → Tasks 2 & 4 apply it per-command; preserved behaviors in Global Constraints. ✓
- §3 contract & hooks → AGENTS.md (T1), using-mae.mdc (T3), Cursor guard (T5), Codex approval-policy config (T1). ✓
- §4 gate checks → Task 6 implements all five (manifest/version, parity, leakage, .mdc frontmatter, contract presence); Task 7 proves the leakage alarm. ✓
- §5 scope → scaffolder reused (T2/T4 init step), e2e + Codex per-command blocking deferred (noted in READMEs). ✓
- §6 success criteria → Tasks 5 & 7 exercise guard + gate; READMEs make install copy-paste. ✓

**Placeholder scan:** deterministic files have full content; command ports specify exact source file + exact substitutions + preserved-behavior list + a mechanical leakage check — the realistic level for prose translation, no "TBD"/"handle edge cases". ✓

**Type consistency:** gate helper names (`walk`, `parseFrontmatter`, `err`, `existsSync`, `readFileSync`, `basename`, `join`, `ROOT`) all exist in the current `check-plugin.mjs`; `checkPorts` uses only those. Command filenames (`mae-<name>.md`) and the leak regex are identical across Tasks 2, 4, 6, 7. ✓
