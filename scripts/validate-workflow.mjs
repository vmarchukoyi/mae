#!/usr/bin/env node
// Validate the agent workflow's own artifacts — the "tests for the process".
//
// Checks (see agentic-workflow-plan.md § P7):
//   1. Every .agents/agents/*.md has valid frontmatter (name, description, tools)
//      and name == filename.
//   2. Every .agents/skills/*/SKILL.md has valid frontmatter (name, description,
//      allowed-tools) and name == directory.
//   3. The orchestrator skills (feature-start/finish, project-explore, fix) each
//      carry a Handoff section.
//   3b. Every .agents/rules/*.md has well-formed frontmatter; a path-scoped rule
//      that declares `paths:` lists at least one glob.
//   4. Relative markdown links in the curated doc set resolve to real files.
//   5. docs/architecture-map.md `reflects_commit` matches HEAD (warning only).
//
// Zero dependencies — Node built-ins only (stack lock: no new runtime dep). Run:
//   node scripts/validate-workflow.mjs      (or `pnpm validate:workflow`)
// Exit 0 = clean (warnings allowed), 1 = at least one error.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${relative(ROOT, file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(ROOT, file)}: ${msg}`);

const ORCHESTRATORS = ['feature-start', 'feature-finish', 'project-explore', 'fix'];

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

// --- 1. Agents -------------------------------------------------------------
function checkAgents() {
  const dir = join(ROOT, '.agents/agents');
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
    if (!data.model) warn(file, 'no explicit model in frontmatter (routing relies on it)');
  }
}

// --- 2. Skills + 3. Handoff -----------------------------------------------
function checkSkills() {
  const dir = join(ROOT, '.agents/skills');
  for (const file of walk(dir, (f) => basename(f) === 'SKILL.md')) {
    const raw = readFileSync(file, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm) { err(file, 'frontmatter opened with --- but never closed'); continue; }
    const { data, body } = fm;
    const expected = basename(dirname(file));
    // name + description are universal; allowed-tools + a Handoff section are only
    // required of OUR orchestrator skills (vendor knowledge skills legitimately omit them).
    const required = ORCHESTRATORS.includes(expected)
      ? ['name', 'description', 'allowed-tools']
      : ['name', 'description'];
    for (const key of required) {
      if (!data[key]) err(file, `missing frontmatter key "${key}"`);
    }
    if (data.name && data.name !== expected) {
      err(file, `frontmatter name "${data.name}" != directory "${expected}"`);
    }
    if (ORCHESTRATORS.includes(expected) && !/^##+\s+Handoff/m.test(body)) {
      err(file, 'orchestrator skill is missing a "## Handoff" section');
    }
  }
}

// --- 3b. Rules (.agents/rules/*.md) ---------------------------------------
function checkRules() {
  const dir = join(ROOT, '.agents/rules');
  if (!existsSync(dir)) return; // rules are optional
  const files = walk(dir, (f) => f.endsWith('.md'));
  if (!files.length) warn(dir, 'rules directory exists but is empty');
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm) { err(file, 'frontmatter opened with --- but never closed'); continue; }
    if (!fm.body.trim()) err(file, 'rule has no body');
    // A path-scoped rule declares `paths:` followed by ≥1 glob list item.
    if (/^paths:/m.test(raw) && !/^\s*-\s+["']?.+/m.test(raw)) {
      err(file, '`paths:` present but no glob list items follow it');
    }
  }
}

// --- 4. Markdown link resolution ------------------------------------------
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
function checkLinks() {
  const files = [
    join(ROOT, 'README.md'),
    join(ROOT, 'AGENTS.md'),
    join(ROOT, 'CONSTITUTION.md'),
    join(ROOT, 'CLAUDE.md'),
    join(ROOT, 'modules/README.md'),
    join(ROOT, 'specs/README.md'),
    ...walk(join(ROOT, 'docs'), (f) => f.endsWith('.md')),
  ].filter((f) => existsSync(f) && !f.includes('/_templates/'));

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(LINK_RE)) {
      let target = m[1].trim().split(/\s+/)[0]; // drop optional "title"
      if (!target) continue;
      if (/^(https?:|mailto:|tel:|#)/.test(target)) continue; // external / anchor
      target = target.split('#')[0].split('?')[0]; // strip anchor / query
      if (!target) continue;
      if (/[<>*`$]/.test(target)) continue; // placeholder in a template-ish doc
      const resolved = resolve(dirname(file), target);
      if (!existsSync(resolved)) {
        err(file, `broken link → ${m[1].trim()}`);
      }
    }
  }
}

// --- 5. architecture-map staleness (warning only) -------------------------
function checkMapFreshness() {
  const file = join(ROOT, 'docs/architecture-map.md');
  if (!existsSync(file)) { warn(file, 'docs/architecture-map.md missing — run /project-explore'); return; }
  const fm = parseFrontmatter(readFileSync(file, 'utf8'));
  const reflects = fm?.data?.reflects_commit;
  if (!reflects) { warn(file, 'no reflects_commit stamp'); return; }
  // Staleness (per the plan) = the diff since reflects_commit touches a SURFACE dir
  // (apps/packages/modules), not merely any commit. A docs-only commit does not
  // stale the map — otherwise stamping the map itself would loop forever.
  let changed;
  try {
    changed = execSync(`git diff --name-only ${reflects}..HEAD`, { cwd: ROOT })
      .toString().trim().split('\n').filter(Boolean);
  } catch { return; } // not a git checkout, or unknown commit — skip
  const surfaceTouched = changed.filter((p) => /^(apps|packages|modules)\//.test(p));
  if (surfaceTouched.length) {
    warn(file, `${surfaceTouched.length} surface file(s) changed since reflects_commit ${reflects.slice(0, 7)} — run /project-explore (incremental)`);
  }
}

checkAgents();
checkSkills();
checkRules();
checkLinks();
checkMapFreshness();

for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(
  `\nvalidate-workflow: ${errors.length} error(s), ${warnings.length} warning(s).`
);
process.exit(errors.length ? 1 : 0);
