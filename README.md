# backend-blueprint

**Build a product's backend with Claude Code, from the product docs to a tested, deployed API.**

You write down what the product must do first — its feature areas, business rules, user flows and screens — and have it reviewed. Then each part of the backend is built from those docs, with tests, API docs and a register of every endpoint and background job. Nothing gets built that can't be traced back to a document. Thirteen Claude Code skills and the rules behind them, for NestJS or FastAPI.

**Works with** the Web App, Mobile App, Desktop App and Web Extension Blueprints: they build the apps against this backend's API docs, and send issues back through handoff files.

```bash
npx github:dev-emekaa/backend-blueprint init --stack nestjs
```

---

## Install

Run it in your project root. Nothing to install first — `npx` fetches this repo and runs it.

```bash
npx github:dev-emekaa/backend-blueprint init --stack <nestjs|fastapi> [options]
```

| Option | Effect |
| --- | --- |
| `--stack nestjs` | NestJS · TypeScript · Prisma · PostgreSQL |
| `--stack fastapi` | Python · FastAPI · SQLModel · PostgreSQL |
| `--ai` | Also install the AI services rule, for products with AI features |
| `--store-client` | Also install the deprecations register, when a mobile, desktop or extension app ships through a store or update feed |
| `--personal` | Install skills to `~/.claude/skills` instead of the project |
| `--force` | Overwrite existing files. Default is to skip them |
| `--dry-run` | Show what would change, write nothing |

`--stack` is required: without it, the installer stops and writes nothing. The other options combine freely — for example, a FastAPI backend with AI features and a mobile app:

```bash
npx github:dev-emekaa/backend-blueprint init --stack fastapi --ai --store-client
```

Re-running is safe: existing files are skipped and listed.

### What it writes

```
.claude/
  skills/        13 skills
  rules/         8 rules (plus ai-services.md with --ai, deprecations.md with --store-client)
CLAUDE.md        documentation map · audiences · project configuration
docs/
  product-docs/  your PRD goes here
  business-rules/  app-flows/  screen-specs/  api-docs/  api-testing/
```

`docs/feature-areas.md` isn't created — `/feature-areas` writes it from your PRD.

### After installing

1. Put your PRD in `docs/product-docs/`.
2. Fill in the **audiences** and **project configuration** in `CLAUDE.md`. Anything you leave blank, the skill that needs it asks for once.
3. Run `/feature-areas`. Everything after it reads its output.
4. Run `/backend-setup` once, any time before the first build — it needs no product docs.

Commit `.claude/` with your project: cloud sessions and scheduled runs only read project skills. `--personal` is for throwaway work.

### Updating

```bash
npx github:dev-emekaa/backend-blueprint init --stack nestjs --force
```

- Skills and rules are overwritten, including any edits you made — run it on a clean working tree and read the diff before committing.
- `CLAUDE.md` is never overwritten: it holds your project's values.
- To pin a version: `npx github:dev-emekaa/backend-blueprint#v1.4.1 init --stack nestjs`. If an update doesn't seem to land: `npm cache clean --force`.

---

## How a backend gets built

Each step needs the one before it; a skill whose inputs don't exist yet stops and says so.

```
PRD
 └─ /feature-areas      the parts of the product, in build order     → docs/feature-areas.md
     └─ /business-rules what must always be true, per area          → docs/business-rules/
         └─ /app-flows  every user journey, per area                → docs/app-flows/
             └─ /screen-specs  what each screen sends and shows     → docs/screen-specs/
                 └─ /phase-review  checks all of it; nothing is built until it passes
                     └─ /backend-build  one area at a time, or a whole phase

/backend-setup — once, before the first build
```

- **When something goes wrong:** `/backend-issue-fix`.
- **Later phases** start with `/feature-requirements`, which turns new feature ideas into the phase's requirements. Then `/phase-review`, then `/backend-build` once per feature.
- **`/api-docs`, `/api-testing`, `/api-rbac` and `/background-jobs`** are run by the build itself. Run them directly only to set up, audit or repair those files.

---

## The skills

### `/feature-areas`
Divides the product into feature areas from the PRD and orders them for building, with the reason for each position.
**Writes** `docs/feature-areas.md`

### `/business-rules`
The rules each area must always follow — limits, decisions, formulas, edge cases and security rules — each with an ID, written so a non-technical reader can follow them.
**Writes** `docs/business-rules/`

### `/app-flows`
Every user journey step by step: what the user does, what the system does, every branch and error, and each area's state changes. From the PRD and rules, or from designs.
**Writes** `docs/app-flows/`

### `/screen-specs`
What each screen sends to the backend and shows from it, and every action with its endpoint. Shapes and types only — no UI copy or layout.
**Writes** `docs/screen-specs/`

### `/phase-review`
Checks a phase's requirements, rules, flows and screens for logic, efficiency and security before anything is built. Each issue becomes a decision for you, with a recommendation, or a fix applied to the docs.
**Writes** the reviewed docs, and the phase's issues, decisions and actions

### `/feature-requirements`
For a later phase: learns the existing product, researches each new feature idea, recommends build, change, defer or drop for your approval, and writes the phase's requirements with each feature's impact on existing users and data.
**Writes** `docs/phase-{n}/product-docs/frd-phase-{n}.md`

### `/backend-setup`
The foundation, once: the project scaffold, a local environment with separate test databases, the test setup, a health endpoint, the Dockerfile and the CI/CD pipelines, plus a guide to the steps only you can do (hosting, GitHub, DNS).
**Writes** the foundation, `docs/infra/infra-setup.md`

### `/backend-build`
Builds one feature area or feature end to end — or a whole phase in one session — from an approved plan: database changes, endpoints, background jobs, tests, a check of every endpoint against a running server, the docs, and the release.
**Writes** the backend, its API docs, testing guides and registers

### `/backend-issue-fix`
Confirms an issue is real against the code and the docs, reproduces it with a failing test, fixes it, checks it on development and staging, and hands the result to the app teams.
**Writes** the fix, the docs it changes, the handoff to the app teams

### `/api-docs`
The reference the app teams build against: every endpoint's access, inputs, responses, errors and side effects, and anything that changes without the app asking. The running code is the source of truth.
**Writes** `docs/api-docs/`

### `/api-testing`
How to test each area's endpoints and background jobs, with a curl command and a Postman description for each, against any environment.
**Writes** `docs/api-testing/`

### `/api-rbac`
The register of every endpoint and who may call it — including public endpoints, inbound webhooks and dev tools, the ones most often left unguarded.
**Writes** `.claude/rules/api-rbac.md`

### `/background-jobs`
The register of all work that no request starts — scheduled, delayed, event-driven and webhook jobs — with what each acts on and why running it twice is safe.
**Writes** `.claude/rules/background-jobs.md`

---

## The rules

Loaded by Claude Code at the start of every session — except `ci-cd.md`, which loads only when deploy files are touched.

| Rule | Covers |
| --- | --- |
| `documentation-conventions.md` | Where every document lives, how it's named, and how phases and readiness work |
| `tech-stack.md` | The tools for your stack, and the services: hosting (Railway or AWS), media, email, payments, push |
| `coding-standards.md` | How code is written in your stack |
| `security.md` | Sign-in and sessions, permissions, input, rate limits, payments, webhooks, secrets, personal data |
| `testing.md` | The four test layers, test data, and a test for every bug |
| `ci-cd.md` | PR checks, staging and production deploys, releasing alongside the apps, rollback |
| `api-rbac.md` · `background-jobs.md` | The two registers, empty until the build fills them |
| `ai-services.md` *(with `--ai`)* | Model calls, agents, vector search and media models, and treating model output as untrusted |
| `deprecations.md` *(with `--store-client`)* | What can't change once an app version has shipped |

---

## The folder version

A downloadable alternative to the installer, built from the same files:

```bash
npm run package
```

It writes `dist/backend-blueprint/` and `dist/backend-blueprint-v{version}.zip`. Its guide is `folder/README.md`.

### Releasing

```bash
npm version patch        # bumps package.json, commits and tags (patch · minor · major)
git push --follow-tags   # pushes the commit and the tag
```

The zip appears under the release's **Assets** as `backend-blueprint-v{version}.zip` — that is the file to share, not the Source code archives. A tag that doesn't match `package.json` fails the build.

`prompts/` in this repository holds older, paste-into-a-chat versions of nine skills, kept for running the workflow outside Claude Code. The skills are the maintained versions.

---

## Requires

- Node 22 or later, and Claude Code

**License** proprietary — all rights reserved.
