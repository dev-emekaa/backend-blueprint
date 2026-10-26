# Backend Blueprint

Build a product's backend with Claude Code, from the product docs to a tested, deployed API. You write down what the product must do first — its feature areas, business rules, user flows and screens — and have it reviewed; then each part of the backend is built from those docs. Nothing gets built that can't be traced back to a document. Thirteen skills and the rules they follow.

Two stacks are included: **NestJS · TypeScript · Prisma · PostgreSQL** and **Python · FastAPI · SQLModel · PostgreSQL**.

---

## What's inside

```
backend-blueprint/
  skills/                13 skills, one folder each
  rules/                 the rules every project uses, plus two optional ones
    stacks/
      nestjs/            coding-standards.md · tech-stack.md
      fastapi/           coding-standards.md · tech-stack.md
  templates/
    CLAUDE.md            the blocks to add to your project's CLAUDE.md
```

---

## Install

Everything goes into your project's `.claude/` folder, which Claude Code reads. In a terminal, from your project's root — set `BP` to wherever you unzipped this folder, and pick your stack on the last line:

```bash
BP=~/Downloads/backend-blueprint
mkdir -p .claude/rules docs/product-docs
cp -R "$BP/skills" .claude/
cp "$BP"/rules/*.md .claude/rules/
cp "$BP"/rules/stacks/nestjs/*.md .claude/rules/      # or: stacks/fastapi
```

Then:

1. **Remove the optional rules you don't need** from `.claude/rules/`:
   - `deprecations.md` — keep it only if a client app ships through an app store or is installed on devices.
   - `ai-services.md` — keep it only if the product has AI features.
2. **Add the CLAUDE.md blocks.** Paste `templates/CLAUDE.md` into your project's `CLAUDE.md` (create the file if there is none). Fill in your stack and audiences now, or leave them — each skill asks for anything missing, once.
3. **Put your PRD** in `docs/product-docs/`.
4. **Check it worked.** Start Claude Code and run `/context` — the rules appear under Memory files (`ci-cd.md` only once a deploy file is touched). Type `/` and the thirteen skills are listed.

> `.claude` is a hidden folder. To see it in Finder, press **Cmd + Shift + .**

**Commit `.claude/` with your project.** Cloud sessions and scheduled runs only read project skills, and the rules should travel with the code.

---

## Which skill when

**Building a new backend**

1. `/feature-areas` — divides the product into feature areas and sets the build order.
2. `/business-rules` — the rules of each feature area.
3. `/app-flows` — every user journey in each area.
4. `/screen-specs` — what each screen sends and shows. If the frontend already generated specs, bring those instead.
5. `/phase-review` — audits all of it. Nothing is built until it clears.
6. `/backend-setup` — the project foundation, once. It needs no product docs, so it can run any time before the first build.
7. `/backend-build` — one feature area per session, or the whole phase in one session.

**Adding a new phase**

1. `/feature-requirements` — learns the existing product, gives a verdict on each feature idea, and writes the phase's FRD.
2. Add the phase's designs, and any business rules you already have, to `docs/phase-{n}/product-docs/`.
3. `/phase-review` — writes and audits the phase's rules, flows and specs, and sets the build order in `implementation-order.md`.
4. `/backend-build` — one feature per session, or the whole phase.

**Fixing an issue**

`/backend-issue-fix` — validates the issue, fixes the docs and code, proves the fix with a test, verifies it on dev and staging, and writes the handoff for the client team.

---

## The skills

**`/feature-areas`** — Identifies every feature area from the PRD and orders them by dependency. An area must own an entity no other area owns, that entity must move through governed states, and the area needs screens of its own. Writes `docs/feature-areas.md`, which every other skill reads.

**`/business-rules`** — The law of each feature area: invariants, limits, decisions, formulas, edge cases and security rules, each with a stable ID and written so a non-technical reader can follow it.

**`/app-flows`** — Every user journey as numbered steps, user actions separate from system actions, with explicit branching, error paths and state machines. Derived from the PRD and rules, or from designs.

**`/screen-specs`** — What each screen sends to the backend and shows from it: fields with real constraints, display data, actions and states. Shapes and types only. Endpoints read `pending` until they are built.

**`/phase-review`** — Audits every context doc before anything is built. Each issue is either a **decision** for the founder, with a recommendation, or an **action** for the frontend or backend, already applied to the specs. Writes an issues doc, a decisions doc and an actions doc.

**`/feature-requirements`** — Plans a later phase. Learns the existing product from its docs (and its code, where the docs leave a question open), gives a verdict on each feature idea for your approval, and writes the phase's FRD, including each feature's impact on existing users, data and released app builds.

**`/backend-setup`** — The foundation, once: project scaffold, local environment with separate test databases, test harness, health and dev-tool endpoints, Dockerfile, the three CI/CD pipelines, and an infra guide for the steps only you can do.

**`/backend-build`** — Builds a feature area or feature end to end: schema, endpoints, background jobs, tests, a curl sweep against real seed data, docs and promotion. Your approval comes at the plan; tests gate everything after it.

**`/backend-issue-fix`** — Resolves a backend issue: confirms it against the code and docs, writes a failing test first, fixes it, verifies on dev and staging, and produces the client handoff.

**`/api-docs`** — The integration reference client developers build against, per feature area, written from the running code.

**`/api-testing`** — How to exercise every endpoint and background job with curl or Postman, against any environment.

**`/api-rbac`** — The register of every endpoint and who may call it. Written by builds; invoke it directly only to set up or audit the register.

**`/background-jobs`** — The register of every piece of work no request triggers: scheduled, delayed, event-driven and webhook jobs. Written by builds; invoke it directly only to set up or audit the register.

---

## The rules

Rules load into every Claude Code session and apply to all the code it writes.

| Rule | What it covers |
| --- | --- |
| `documentation-conventions.md` | Folder structure, file names, phases, readiness values and the registers — everything more than one skill must agree on. |
| `tech-stack.md` | The tools the backend uses and the services each environment runs on. Anything not listed is proposed in a build plan and approved first. |
| `coding-standards.md` | How code is written in your stack: layering, validation, database rules, errors, logging, performance, test setup. |
| `security.md` | Security policy for both stacks: auth and sessions, authorization, input, HTTP, rate limits, real-time, data, payments, media, secrets, audit, privacy. |
| `testing.md` | The four test layers, which environment each touches, and the rule that every bug gets a test that reproduces it. |
| `ci-cd.md` | PR checks, the automatic staging deploy, and a manual production deploy of the exact build a client verified. Also rollback and hosting. Loads only when deploy files are touched. |
| `api-rbac.md` · `background-jobs.md` | Registers that start empty and grow as the backend is built. |
| `deprecations.md` *(optional)* | What is kept alive only for released app builds, and when it can go. |
| `ai-services.md` *(optional)* | AI tools and rules: model calls, agents, retrieval, prompts, and treating model output as untrusted input. |

---

**Requires** Claude Code. Updates replace these files — any edits you made to a skill or rule are overwritten, so keep your own changes in `CLAUDE.md` or new rule files.

© dev-emeka. All rights reserved. Licensed for use in your own projects; not for redistribution.
