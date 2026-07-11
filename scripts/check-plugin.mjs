#!/usr/bin/env node
// CI checks for the mae plugin itself. Node built-ins only. Exit 0 clean, 1 errors.
//
// Checks (design §7):
//   1. plugin.json / marketplace.json valid + consistent (name, version).
//   2. Frontmatter: every skills/*/SKILL.md (name==dir, description); every
//      agents/*.md and templates/agents/*.md (name==basename, description, tools).
//   3. hooks/hooks.json parses; every command goes through run-hook.cmd and names
//      a script that exists in hooks/ and is executable.
//   4. Smoke test: scaffold into a temp dir, then run the scaffolded
//      validate-workflow.mjs there (skip-with-warn if scripts/scaffold.mjs missing).
//   5. Forbidden references across skills/ agents/ templates/ hooks/ README.md.
//   6. Superpowers-compat: every superpowers:* reference is listed in
//      docs/superpowers-compat.md.
//   7. skills/using-mae/SKILL.md body is <= 60 lines.
//
// Run: node scripts/check-plugin.mjs   (or `pnpm check:plugin`)

import {
  readFileSync, existsSync, readdirSync, statSync, accessSync, constants,
  mkdtempSync, rmSync,
} from 'node:fs';
import { join, dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${relative(ROOT, file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(ROOT, file)}: ${msg}`);

/** Minimal top-level frontmatter parser. Returns { data, body } or null if none. */
function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') return { data: {}, body: text };
  const end = lines.indexOf('---', 1);
  if (end === -1) return null; // opened but never closed
  const data = {};
  for (const line of lines.slice(1, end)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf(':');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, body: lines.slice(end + 1).join('\n') };
}

/** Recursively collect files matching a predicate, skipping node_modules/.git. */
function walk(dir, pred, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, pred, out);
    else if (pred(full)) out.push(full);
  }
  return out;
}

// --- 1. Manifests ----------------------------------------------------------
function checkManifests() {
  const pluginPath = join(ROOT, '.claude-plugin/plugin.json');
  const marketPath = join(ROOT, '.claude-plugin/marketplace.json');
  let plugin;
  try {
    plugin = JSON.parse(readFileSync(pluginPath, 'utf8'));
  } catch (e) {
    err(pluginPath, `unreadable/invalid JSON: ${e.message}`);
    return;
  }
  if (plugin.name !== 'mae') err(pluginPath, 'name must be "mae"');
  if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? '')) {
    err(pluginPath, 'version must be semver');
  }
  let market;
  try {
    market = JSON.parse(readFileSync(marketPath, 'utf8'));
  } catch (e) {
    err(marketPath, `unreadable/invalid JSON: ${e.message}`);
    return;
  }
  if (!market.plugins?.some((p) => p.name === 'mae')) {
    err(marketPath, 'must list plugin "mae"');
  }
}

// --- 2. Frontmatter --------------------------------------------------------
function checkFrontmatter() {
  const skillsDir = join(ROOT, 'skills');
  if (!existsSync(skillsDir)) err(skillsDir, 'skills/ directory is missing');
  for (const file of walk(skillsDir, (f) => basename(f) === 'SKILL.md')) {
    const fm = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!fm) { err(file, 'frontmatter opened with --- but never closed'); continue; }
    const { data } = fm;
    const expected = basename(dirname(file));
    if (!data.description) err(file, 'missing frontmatter key "description"');
    if (!data.name) err(file, 'missing frontmatter key "name"');
    else if (data.name !== expected) {
      err(file, `frontmatter name "${data.name}" != directory "${expected}"`);
    }
  }

  const agentDirs = [join(ROOT, 'agents'), join(ROOT, 'templates/agents')];
  if (!existsSync(agentDirs[0])) err(agentDirs[0], 'agents/ directory is missing');
  for (const dir of agentDirs) {
    for (const file of walk(dir, (f) => f.endsWith('.md'))) {
      const fm = parseFrontmatter(readFileSync(file, 'utf8'));
      if (!fm) { err(file, 'frontmatter opened with --- but never closed'); continue; }
      const { data } = fm;
      for (const key of ['name', 'description', 'tools']) {
        if (!data[key]) err(file, `missing frontmatter key "${key}"`);
      }
      const expected = basename(file, '.md');
      if (data.name && data.name !== expected) {
        err(file, `frontmatter name "${data.name}" != filename "${expected}"`);
      }
    }
  }
}

// --- 3. Hooks wiring -------------------------------------------------------
const RUN_HOOK_PREFIX = '"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd"';
function checkHooks() {
  const hooksJson = join(ROOT, 'hooks/hooks.json');
  if (!existsSync(hooksJson)) { err(hooksJson, 'hooks/hooks.json is missing'); return; }
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(hooksJson, 'utf8'));
  } catch (e) {
    err(hooksJson, `invalid JSON: ${e.message}`);
    return;
  }
  const events = cfg.hooks ?? {};
  for (const event of Object.keys(events)) {
    for (const group of events[event] ?? []) {
      for (const entry of group.hooks ?? []) {
        const cmd = entry.command ?? '';
        if (!cmd.startsWith(RUN_HOOK_PREFIX)) {
          err(hooksJson, `${event} command must start with ${RUN_HOOK_PREFIX}: "${cmd}"`);
          continue;
        }
        const scriptName = cmd.slice(RUN_HOOK_PREFIX.length).trim().split(/\s+/)[0];
        if (!scriptName) { err(hooksJson, `${event} command names no hook script`); continue; }
        const scriptPath = join(ROOT, 'hooks', scriptName);
        if (!existsSync(scriptPath)) {
          err(hooksJson, `hook script hooks/${scriptName} does not exist`);
          continue;
        }
        try {
          accessSync(scriptPath, constants.X_OK);
        } catch {
          err(scriptPath, 'hook script is not executable (chmod +x)');
        }
      }
    }
  }
}

// --- 4. Scaffold smoke test ------------------------------------------------
function checkScaffoldSmoke() {
  const scaffold = join(ROOT, 'scripts/scaffold.mjs');
  if (!existsSync(scaffold)) {
    warn(scaffold, 'scripts/scaffold.mjs missing — smoke test skipped');
    return;
  }
  let tmp;
  try {
    tmp = mkdtempSync(join(tmpdir(), 'mae-scaffold-'));
    execFileSync('node', [scaffold, '--target', tmp], {
      stdio: 'pipe',
    });
    const scaffoldedValidator = join(tmp, 'scripts/validate-workflow.mjs');
    if (!existsSync(scaffoldedValidator)) {
      err(scaffold, 'scaffold did not produce scripts/validate-workflow.mjs');
    } else {
      execFileSync('node', [scaffoldedValidator], { cwd: tmp, stdio: 'pipe' });
    }
  } catch (e) {
    const detail = e.stderr ? e.stderr.toString().trim() : e.message;
    err(scaffold, `smoke test failed: ${detail}`);
  } finally {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  }
}

// --- 5. Forbidden references ----------------------------------------------
const FORBIDDEN =
  /CONSTITUTION(\.template)?\.md|(^|[^.\w])commands\/|project-explore|\.agents\/|@maeton|app\.config\.ts|\b(architect|devils-advocate|codebase-explorer|implementer)\b/;
function checkForbiddenRefs() {
  const targets = [
    ...walk(join(ROOT, 'skills'), (f) => f.endsWith('.md')),
    ...walk(join(ROOT, 'agents'), (f) => f.endsWith('.md')),
    ...walk(join(ROOT, 'templates'), (f) => f.endsWith('.md')),
    ...walk(join(ROOT, 'hooks'), () => true),
    join(ROOT, 'README.md'),
  ].filter((f) => existsSync(f));
  for (const file of targets) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (FORBIDDEN.test(line)) {
        err(file, `forbidden reference on line ${i + 1}: ${line.trim().slice(0, 80)}`);
      }
    });
  }
}

// --- 6. Superpowers-compat -------------------------------------------------
const SUPERPOWERS_RE = /superpowers:[a-z-]+/g;
function checkCompat() {
  const compatPath = join(ROOT, 'docs/superpowers-compat.md');
  const compat = existsSync(compatPath) ? readFileSync(compatPath, 'utf8') : null;
  if (compat === null) err(compatPath, 'docs/superpowers-compat.md is missing');
  const refs = new Set();
  const sources = [
    ...walk(join(ROOT, 'skills'), (f) => f.endsWith('.md')),
    ...walk(join(ROOT, 'agents'), (f) => f.endsWith('.md')),
    ...walk(join(ROOT, 'hooks'), () => true),
  ];
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(SUPERPOWERS_RE)) refs.add(m[0]);
  }
  if (compat === null) return;
  for (const ref of [...refs].sort()) {
    if (!compat.includes(ref)) {
      err(compatPath, `superpowers reference "${ref}" is not listed in the compat doc`);
    }
  }
}

// --- 7. using-mae line budget ---------------------------------------------
function checkUsingMaeBudget() {
  const file = join(ROOT, 'skills/using-mae/SKILL.md');
  if (!existsSync(file)) return; // subject not created yet
  const fm = parseFrontmatter(readFileSync(file, 'utf8'));
  if (!fm) { err(file, 'frontmatter opened with --- but never closed'); return; }
  const bodyLines = fm.body.replace(/\n+$/, '').split('\n').length;
  if (bodyLines > 60) {
    err(file, `using-mae body is ${bodyLines} lines (budget is <= 60)`);
  }
}

checkManifests();
checkFrontmatter();
checkHooks();
checkScaffoldSmoke();
checkForbiddenRefs();
checkCompat();
checkUsingMaeBudget();

for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(`\ncheck-plugin: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
