#!/usr/bin/env node
/**
 * backend-blueprint — scaffold the spec-to-ship backend workflow into a project.
 * Zero dependencies. Idempotent: existing files are skipped unless --force.
 */
import { readdir, mkdir, copyFile, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { ASSETS, STACKS, RULES, OPTIONAL_RULES, DOC_DIRS, techStack, claudeTemplate } from '../lib/assets.mjs';

const CWD = process.cwd();
const MARKER = '<!-- backend-blueprint:docs-map -->';

const c = { dim: s => `\x1b[2m${s}\x1b[0m`, b: s => `\x1b[1m${s}\x1b[0m`,
            g: s => `\x1b[32m${s}\x1b[0m`, y: s => `\x1b[33m${s}\x1b[0m`, r: s => `\x1b[31m${s}\x1b[0m` };

function parseArgs(argv) {
  const o = { cmd: argv[0], stack: null, personal: false, storeClient: false, ai: false, force: false, dry: false };
  for (const a of argv.slice(1)) {
    if (a === '--personal') o.personal = true;
    else if (a === '--store-client') o.storeClient = true;
    else if (a === '--ai') o.ai = true;
    else if (a === '--force') o.force = true;
    else if (a === '--dry-run') o.dry = true;
    else if (a.startsWith('--stack=')) o.stack = a.slice(8);
    else if (a === '--stack') o.stack = 'MISSING';
    else if (!a.startsWith('-') && o.stack === 'MISSING') o.stack = a;
    else { console.error(c.r(`Unknown option: ${a}`)); process.exit(1); }
  }
  return o;
}

const written = [], skipped = [];

async function put(dest, contents, { force, dry }) {
  const rel = dest.startsWith(CWD) ? dest.slice(CWD.length + 1) : dest;
  if (existsSync(dest) && !force) { skipped.push(rel); return; }
  if (!dry) { await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, contents); }
  written.push(rel);
}

async function putFile(src, dest, opts) {
  const rel = dest.startsWith(CWD) ? dest.slice(CWD.length + 1) : dest;
  if (existsSync(dest) && !opts.force) { skipped.push(rel); return; }
  if (!opts.dry) { await mkdir(dirname(dest), { recursive: true }); await copyFile(src, dest); }
  written.push(rel);
}

async function installSkills(opts) {
  const srcRoot = join(ASSETS, 'skills');
  const destRoot = opts.personal
    ? join(homedir(), '.claude', 'skills')
    : join(CWD, '.claude', 'skills');
  const names = (await readdir(srcRoot, { withFileTypes: true }))
    .filter(d => d.isDirectory()).map(d => d.name).sort();
  for (const name of names) {
    const dir = join(srcRoot, name);
    for (const f of await readdir(dir)) {
      if ((await stat(join(dir, f))).isFile()) {
        await putFile(join(dir, f), join(destRoot, name, f), opts);
      }
    }
  }
  return names.length;
}

async function installRules(opts) {
  const src = join(ASSETS, 'rules');
  const dest = join(CWD, '.claude', 'rules');
  const files = [...RULES];
  if (opts.storeClient) files.push(OPTIONAL_RULES.storeClient);
  if (opts.ai) files.push(OPTIONAL_RULES.ai);
  for (const f of files) await putFile(join(src, f), join(dest, f), opts);

  const stack = STACKS[opts.stack];
  await putFile(join(ASSETS, 'coding-standards', stack.standards), join(dest, 'coding-standards.md'), opts);

  await put(join(dest, 'tech-stack.md'), await techStack(opts.stack), opts);
}

async function installDocDirs(opts) {
  for (const d of DOC_DIRS) {
    await put(join(CWD, 'docs', d, '.gitkeep'), '', opts);
  }
}

const docsMap = async (stack) => `\n${MARKER}\n${await claudeTemplate(stack)}`;

async function installClaudeMd(opts) {
  const dest = join(CWD, 'CLAUDE.md');
  if (existsSync(dest)) {
    const cur = await readFile(dest, 'utf8');
    if (cur.includes(MARKER)) { skipped.push('CLAUDE.md (already has the docs map)'); return; }
    if (!opts.dry) await writeFile(dest, cur.trimEnd() + '\n' + (await docsMap(opts.stack)));
    written.push('CLAUDE.md (docs map appended)');
  } else {
    await put(dest, `# Project instructions\n${await docsMap(opts.stack)}`, opts);
  }
}

function usage() {
  console.log(`
${c.b('backend-blueprint')} — spec-to-ship backend workflow for Claude Code

${c.b('Usage')}
  npx github:dev-emekaa/backend-blueprint init --stack <nestjs|fastapi> [options]

${c.b('Options')}
  --stack <s>       Required. ${c.dim('nestjs')} = NestJS/TypeScript/Prisma · ${c.dim('fastapi')} = Python/FastAPI/SQLModel
  --store-client    Also install the deprecations register ${c.dim('(mobile/desktop clients only)')}
  --ai              Also install the AI services rule ${c.dim('(products with AI features)')}
  --personal        Install skills to ~/.claude/skills instead of the project
  --force           Overwrite existing files ${c.dim('(default: skip them)')}
  --dry-run         Print what would change, write nothing

${c.b('What it writes')}
  .claude/skills/          13 skills
  .claude/rules/           conventions · tech stack · coding standards · security · testing · ci-cd
                           api-rbac · background-jobs
  docs/                    product-docs · business-rules · app-flows · screen-specs · api-docs · api-testing
  CLAUDE.md                documentation map, audiences, project configuration
`);
}

async function main() {
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 22) { console.error(c.r(`Node 22+ required (found ${process.versions.node})`)); process.exit(1); }

  const opts = parseArgs(process.argv.slice(2));
  if (!opts.cmd || opts.cmd === 'help' || opts.cmd === '--help' || opts.cmd === '-h') { usage(); return; }
  if (opts.cmd !== 'init') { console.error(c.r(`Unknown command: ${opts.cmd}`)); usage(); process.exit(1); }
  if (!opts.stack || opts.stack === 'MISSING' || !STACKS[opts.stack]) {
    const given = opts.stack && opts.stack !== 'MISSING' ? `\n  ${c.r(`Unknown stack: ${opts.stack}`)}` : '';
    console.error(`${given}
  ${c.b('--stack is required')} — it decides which coding standards get installed, and
  installing the wrong one would point every session at the wrong idioms.

  ${c.b('npx github:dev-emekaa/backend-blueprint init --stack nestjs')}
    ${c.dim('NestJS · TypeScript · Prisma · PostgreSQL')}

  ${c.b('npx github:dev-emekaa/backend-blueprint init --stack fastapi')}
    ${c.dim('Python · FastAPI · SQLModel · PostgreSQL')}

  ${c.dim('Nothing has been written. Add --dry-run to either command to preview.')}
`);
    process.exit(1);
  }

  console.log(`\n${c.b('backend-blueprint')} → ${CWD}${opts.dry ? c.y('  (dry run)') : ''}\n`);

  const n = await installSkills(opts);
  await installRules(opts);
  await installDocDirs(opts);
  await installClaudeMd(opts);

  const label = opts.dry ? 'would write' : 'written';
  console.log(`${c.g(`${written.length} ${label}`)}${skipped.length ? c.dim(`, ${skipped.length} skipped`) : ''}\n`);
  for (const f of written) console.log(`  ${c.g('+')} ${f}`);
  if (skipped.length) {
    console.log(c.dim(`\n  skipped (already present — use --force to overwrite):`));
    for (const f of skipped) console.log(c.dim(`  · ${f}`));
  }

  console.log(`
${c.b('Next')}
  1. Put your PRD in ${c.dim('docs/product-docs/')}
  2. Fill in the audiences and project configuration blocks in ${c.dim('CLAUDE.md')}
  3. Start Claude Code and run ${c.b('/feature-areas')} — it identifies every feature area
     from the PRD and writes ${c.dim('docs/feature-areas.md')}, which everything else reads.
  4. Run ${c.b('/backend-setup')} once, any time before the first build — it needs no product docs.

  ${n} skills installed to ${c.dim(opts.personal ? '~/.claude/skills' : '.claude/skills')}${
    opts.personal ? c.y('\n  Note: personal skills are not read by cloud sessions, routines or Cowork.') : ''}
`);
}

main().catch(e => { console.error(c.r(e.stack || String(e))); process.exit(1); });
