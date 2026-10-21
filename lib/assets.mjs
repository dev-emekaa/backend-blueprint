/**
 * What backend-blueprint ships, defined once — read by the installer and by the folder build.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

export const STACKS = {
  nestjs:  { standards: 'nestjs-prisma.md',  techStack: 'nestjs.md',  label: 'NestJS · TypeScript · Prisma · PostgreSQL' },
  fastapi: { standards: 'python-fastapi.md', techStack: 'fastapi.md', label: 'Python · FastAPI · SQLModel · PostgreSQL' },
};

/** Rules every project gets. */
export const RULES = ['documentation-conventions.md', 'security.md', 'testing.md', 'ci-cd.md', 'api-rbac.md', 'background-jobs.md'];

/** Rules only some projects get. */
export const OPTIONAL_RULES = { storeClient: 'deprecations.md', ai: 'ai-services.md' };

export const DOC_DIRS = ['product-docs', 'business-rules', 'app-flows', 'screen-specs', 'api-docs', 'api-testing'];

/** tech-stack.md for a stack: its application layer, then the shared services. */
export async function techStack(stack) {
  const app = await readFile(join(ASSETS, 'tech-stack', STACKS[stack].techStack), 'utf8');
  const services = await readFile(join(ASSETS, 'tech-stack', 'services.md'), 'utf8');
  return `${app.trimEnd()}\n${services}`;
}

/** The CLAUDE.md blocks, with the stack filled in (or left blank when none is given). */
export async function claudeTemplate(stack) {
  const template = await readFile(join(ASSETS, 'templates', 'CLAUDE.md'), 'utf8');
  return template.replaceAll('{{STACK}}', stack ? STACKS[stack].label : '');
}
