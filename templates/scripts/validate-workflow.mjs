#!/usr/bin/env node
// Validate this project's mae workflow artifacts — the "tests for the process".
// Scaffolded by /mae:init. Node built-ins only. Exit 0 = clean (warnings allowed),
// 1 = at least one error.
//
// Checks:
//   1. Optional subagents in .claude/agents/*.md (present only with e2e opt-in) have
//      valid frontmatter (name == filename, description, tools).
//   2. Every .claude/rules/*.md has well-formed frontmatter; a path-scoped rule that
//      declares `paths:` lists at least one glob.
//   3. Relative markdown links in README.md / AGENTS.md / docs/* resolve.
//   4. docs/constitution.md exists (engineering law).
//   5. AGENTS.md carries the mae-scaffold-version marker (warn if missing).
//   6. docs/architecture-map.md `reflects_commit` matches HEAD (warning only).

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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

// --- 1. Optional subagents (e2e opt-in) -----------------------------------
function checkAgents() {
  const dir = join(ROOT, '.claude/agents');
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

// --- 2. Rules (.claude/rules/*.md) ----------------------------------------
function checkRules() {
  const dir = join(ROOT, '.claude/rules');
  if (!existsSync(dir)) { warn(dir, '.claude/rules missing — run /mae:init'); return; }
  const files = walk(dir, (f) => f.endsWith('.md'));
  if (!files.length) warn(dir, 'rules directory exists but is empty');
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm) { err(file, 'frontmatter opened with --- but never closed'); continue; }
    if (!fm.body.trim()) err(file, 'rule has no body');
    if (/^paths:/m.test(raw) && !/^\s*-\s+["']?.+/m.test(raw)) {
      err(file, '`paths:` present but no glob list items follow it');
    }
  }
}

// --- 3. Markdown link resolution ------------------------------------------
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
function checkLinks() {
  const files = [
    join(ROOT, 'README.md'),
    join(ROOT, 'AGENTS.md'),
    ...walk(join(ROOT, 'docs'), (f) => f.endsWith('.md')),
  ].filter((f) => existsSync(f) && !f.includes('/_templates/'));

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(LINK_RE)) {
      let target = m[1].trim().split(/\s+/)[0]; // drop optional "title"
      if (!target) continue;
      if (/^(https?:|mailto:|tel:|#)/.test(target)) continue; // external / anchor
      target = target.split('#')[0].split('?')[0];
      if (!target) continue;
      if (/[<>*`$]/.test(target)) continue; // placeholder in a template-ish doc
      const resolved = resolve(dirname(file), target);
      if (!existsSync(resolved)) err(file, `broken link → ${m[1].trim()}`);
    }
  }
}

// --- 4. Constitution present ----------------------------------------------
function checkConstitution() {
  const file = join(ROOT, 'docs/constitution.md');
  if (!existsSync(file)) err(file, 'docs/constitution.md missing — run /mae:init');
}

// --- 5. Scaffold version marker -------------------------------------------
function checkScaffoldVersion() {
  const file = join(ROOT, 'AGENTS.md');
  if (!existsSync(file)) { warn(file, 'AGENTS.md missing — run /mae:init'); return; }
  const text = readFileSync(file, 'utf8');
  const m = text.match(/mae-scaffold-version:\s*([0-9]+\.[0-9]+\.[0-9]+)/);
  if (!m) warn(file, 'no mae-scaffold-version marker — not a mae scaffold or pre-versioning');
}

// --- 6. architecture-map staleness (warning only) -------------------------
function checkMapFreshness() {
  const file = join(ROOT, 'docs/architecture-map.md');
  if (!existsSync(file)) { warn(file, 'docs/architecture-map.md missing — run /mae:explore'); return; }
  const fm = parseFrontmatter(readFileSync(file, 'utf8'));
  const reflects = fm?.data?.reflects_commit;
  if (!reflects) { warn(file, 'no reflects_commit stamp'); return; }
  let changed;
  try {
    changed = execSync(`git diff --name-only ${reflects}..HEAD`, { cwd: ROOT })
      .toString().trim().split('\n').filter(Boolean);
  } catch { return; } // not a git checkout, or unknown commit — skip
  const surfaceTouched = changed.filter((p) => /^(apps|packages|modules)\//.test(p));
  if (surfaceTouched.length) {
    warn(file, `${surfaceTouched.length} surface file(s) changed since ${reflects.slice(0, 7)} — run /mae:explore`);
  }
}

checkAgents();
checkRules();
checkLinks();
checkConstitution();
checkScaffoldVersion();
checkMapFreshness();

for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(`\nvalidate-workflow: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
