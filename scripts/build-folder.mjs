#!/usr/bin/env node
/**
 * Builds the downloadable folder version from the same assets the installer uses:
 *   dist/backend-blueprint/            the folder
 *   dist/backend-blueprint-v{version}.zip
 * Run with: npm run package
 */
import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ASSETS, STACKS, RULES, OPTIONAL_RULES, techStack, claudeTemplate } from '../lib/assets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const DIST = join(ROOT, 'dist');
const OUT = join(DIST, 'backend-blueprint');
const ZIP = `backend-blueprint-v${version}.zip`;

await rm(DIST, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Guide
await cp(join(ROOT, 'folder', 'README.md'), join(OUT, 'README.md'));

// Skills — one folder each, as Claude Code expects
await cp(join(ASSETS, 'skills'), join(OUT, 'skills'), { recursive: true });

// Rules every project gets, plus the optional ones
for (const f of [...RULES, ...Object.values(OPTIONAL_RULES)]) {
  await cp(join(ASSETS, 'rules', f), join(OUT, 'rules', f));
}

// Per-stack rules: coding standards, and the tech stack already combined with the shared services
for (const stack of Object.keys(STACKS)) {
  const dir = join(OUT, 'rules', 'stacks', stack);
  await mkdir(dir, { recursive: true });
  await cp(join(ASSETS, 'coding-standards', STACKS[stack].standards), join(dir, 'coding-standards.md'));
  await writeFile(join(dir, 'tech-stack.md'), await techStack(stack));
}

// CLAUDE.md blocks to paste into the project's CLAUDE.md
await mkdir(join(OUT, 'templates'), { recursive: true });
await writeFile(join(OUT, 'templates', 'CLAUDE.md'), await claudeTemplate());

// Zip
try {
  execFileSync('zip', ['-rqX', ZIP, 'backend-blueprint', '-x', '*.DS_Store'], { cwd: DIST });
  console.log(`Built dist/backend-blueprint/ and dist/${ZIP}`);
} catch {
  console.log('Built dist/backend-blueprint/. The `zip` command was not found, so zip that folder yourself.');
}
