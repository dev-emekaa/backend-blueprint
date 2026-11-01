---
name: backend-adopt
description: Bring an existing backend under this blueprint — one that was built before it, or that I have just joined. Inventories the code, decides whether the stack fits, reconstructs the docs the other skills read (feature areas, business rules, app flows, schema, API docs, the registers) from the code with each fact citing its source, sets the tracker to what is true, and lists where the code departs from the rules as issues or a proposed phase. Use once, on a project the blueprint didn't start; changes no code.
---

# Backend Adopt

You are a senior engineer taking over a backend nobody documented the way this blueprint expects. The other skills assume a project they started: a PRD, feature areas, rules, flows, a schema, registers and a tracker. This skill gives an existing project those, from its code, so every later skill reads it exactly as it reads a project built here.

Two rules hold throughout. **Nothing is invented:** every reconstructed fact cites the code it was read from, and anything the code can't settle is a question to me. **Nothing in the code changes:** what the code does wrong becomes an issue or a proposed phase, never a fix made here.

## Read first

`CLAUDE.md` if it exists, and the rules: `documentation-conventions`, `tech-stack`, `coding-standards`, `security`, `testing`, `ci-cd`.

## Step 1 — Inventory → **wait for my approval**

Read the modules one at a time and each one in full, keeping notes as you go — never summarise a module you have not read — and present once, from the notes, in a few lines each:

- **Stack and shape:** language and framework with versions, the ORM and database, the package manager, how it runs locally, how it is tested, how it builds and deploys, the environments and the services it talks to (email, payments, storage, queues, AI).
- **What exists:** the modules or route groups and what each owns; the endpoints, by count and by module; background jobs, webhooks and scheduled work; the auth model and roles; the data model's main entities.
- **The feature areas it becomes,** divided under `/feature-areas`' "What a feature area is" — modules are not always areas — in dependency order, each with its reason.
- **What is already written down:** any README, PRD, docs, API spec, diagrams or ADRs, and how far each matches the code.
- **How it is run:** tests present and passing or not — run them only against a local datastore — CI, lint and types, error tracking, environment validation, migrations.
- **Where it runs:** whether production is live and serving real users, the staging and production base URLs, how it deploys, and whether any client ships through a store or update feed. These are the `CLAUDE.md` values that switch the build and fix skills between destructive and expand-contract migrations.
- **Audiences and clients,** derived as `documentation-conventions` → Project facts says, from the roles and the clients that call it.

Then the **stack verdict**, against the stack `tech-stack` names — the installer installed that one stack's rules:

- **Same stack:** every skill applies. The framework and the ORM decide this — `coding-standards`, which `/backend-setup`'s data and test steps and everything `/backend-build` writes follow, is written for that pair — so NestJS on TypeORM or Mongoose is a different stack, as Express or Django is; a different database host, package manager, queue, mailer or test runner is followed as found, named in the Stack row, and listed as a deviation in Step 3. If the code is the blueprint's other stack (NestJS with Prisma, or FastAPI with SQLModel), stop and have me re-run the installer with that `--stack` and `--force` first. Likewise, if a client ships through a store or update feed and `.claude/rules/deprecations.md` is not installed, or the code calls AI models and `ai-services.md` is not, have me re-run the installer with `--store-client` or `--ai` — without `--force`, so nothing already written is touched. The deprecations register starts empty: what the code keeps alive for old builds cannot be read from the code.
- **Different stack:** the documentation skills still apply — `/feature-areas`, `/business-rules`, `/app-flows`, `/screen-specs`, `/api-docs`, `/api-testing`, `/api-rbac`, `/background-jobs`, `/phase-review`, `/feature-requirements` are written for any backend — but `/backend-setup`, `/backend-build` and `/backend-issue-fix` would write the wrong stack and are **off**. A migration to the blueprint's stack is proposed as a phase through `/feature-requirements` if I want one. Say which skills are on and off, and why.

I approve the inventory, the division and the verdict, or correct them. Nothing is written before that.

## Step 2 — Reconstruct the docs

Each document is written to the format of the skill that owns it, so nothing downstream can tell it was reconstructed — with one addition: the line `Reverse-engineered from the code on {date} — verify` at the top, and a `source:` citation (`file:line`) on every rule, flow step, registry row, schema entity and module row — as an HTML comment, `<!-- source: file:line -->`, so the owning format is untouched. Marker and citations both come off when I approve the document in Step 4; the report keeps what each document was read from.

In this order, because each reads the one before:

1. **`docs/feature-areas.md`** — the registry, in `/feature-areas`' format, from the division approved in Step 1. Every row is `Built` and `Introduced` Phase 1. An area the code only partly implements is still `Built` — its docs say what exists — and what is missing is a finding in Step 3.
2. **Business rules, per area** — in `/business-rules`' anatomy (ID plus prose, its sections), from what the code enforces: validation, guards, constraints, state machines, limits, calculations. Rules the code implies but doesn't enforce are not written; they are questions. The rules say what the code *does*, not what it should.
3. **App flows, per area** — in `/app-flows`' output structure, as its "From designs" mode would, with the endpoints and the clients' screens (where a client repo is available) as the designs. System actions — expiries, notifications, scheduled work, callbacks — from the jobs and the rules, marked as that skill marks them.
4. **`docs/schema.md` and `.claude/rules/backend-architecture.md`** — in the shape `/backend-build`'s Phase 0 writes, from the migrations and the module tree: entities, relationships, ownership chains, enums and aggregate boundaries, with the locked decisions (identity, tenancy, keys, soft delete, audit, money) recorded as the code has them; and the module index with the cross-module call rules the code follows. The registers mirror this module structure, and a later build reads this schema instead of designing one.
5. **The registers** — run `/api-rbac` and `/background-jobs`. Both are written to audit a codebase: every route and every job gets its row. An endpoint with no access decision in the code is recorded as it behaves today and flagged in Step 3. Like the API docs, the registers are written from the code by their own skills: no marker, no citations.
6. **API docs and testing guides** — run `/api-docs`, then `/api-testing`. The running code is already their source of truth; they need no marker or citations.
7. **Screen specs** are the clients' to write; where a client repo exists, its adopt skill writes them and its docs sync brings them here. Record which audiences have no client repo.

Items 2, 3 and 6 are written one area at a time, in registry order; the registry, the schema, the architecture index and the registers once. On a large backend, give each area its own subagent told to read this skill and the rules, as `/backend-build`'s whole-phase mode does, or compact between areas.

## Step 3 — Gaps and deviations

Two lists, with nothing changed:

- **Foundation gaps** — what `/backend-setup` gives a new project and this one lacks: separate test databases, the test harness, the seed, the reseed and job-dispatcher dev-tool endpoints, the Dockerfile, a health endpoint, environment validation, the CI pipelines, migrations discipline, error tracking, the infra guide. Each as an item.
- **Deviations** — where the code departs from the rules (`security` first, then `testing` and `ci-cd` — a default branch other than `main` is a `ci-cd` deviation; `coding-standards` only on the same stack, since it is written for the blueprint's), where the reconstructed rules and flows fail the tests `/phase-review` applies to a rule and a flow, and where the registers fail their skills' reconciliation passes. Apply those checks by reading those skills; don't restate them. The findings go in the report, not in review docs. Each finding: file and line, the rule or check it fails, severity, the fix.

Route each item. **Same stack:** a **`/backend-setup` item** when it is a foundation gap — that skill takes stock of an existing repository and adds only what is missing; a **`/backend-issue-fix` item** when it is one change with a failing test; a line in a **proposed phase** when it is a body of work. **Different stack:** `/backend-setup` and `/backend-issue-fix` are off, so every item is a line in the proposed migration phase, or mine to do by hand — the report says which. A proposed phase goes to `/feature-requirements`, which decides it with me.

## Step 4 — Approve, per area → **wait for my approval**

Present each area's reconstructed docs with their citations, shortest area first; then the schema and architecture doc; then the two registers once; then the two lists. I confirm the docs are true — opening a cited line takes seconds — or correct them; marker and citations come off each approved document, and a correction re-runs Step 3's checks for that area. The lists I don't approve here; they are findings I hand to `/backend-setup` and `/backend-issue-fix` from the report, or to `/feature-requirements` as the proposed phase.

## Step 5 — Record

1. `CLAUDE.md`: the documentation map with a row for `docs/adoption-report.md`, audiences and clients, and the project configuration from the inventory — **Production status** first, since the template defaults to *not yet launched*, and the **Stack / framework** row corrected to what the code is, with the verdict after it: `{what it is} — {blueprint's stack: all skills apply | not the blueprint's: documentation skills only; see docs/adoption-report.md}`. Record where the product requirements live: any PRD or product doc the inventory found, moved into `docs/product-docs/`; where there is none, a line in the documentation map saying so — the registry and the business rules describe the product until one is written — so later skills stop asking. Under the phase folders, note that Phase 1 is the adopted code and later phases start at 2.
2. **`docs/phase-1/README.md`**, one line — `Phase 1 is the adopted code; see ../adoption-report.md` — so `/feature-requirements` numbers the next phase 2 and `/phase-review` runs it as a later phase, with the live code as its corpus.
3. **`docs/adoption-report.md`:** the inventory, the stack verdict, what was written and from where (each document's citations), the foundation gaps, the deviations with their routing, and what I should still verify by hand. Dated; the record of what the blueprint found when it arrived. It names environment variables and services, never their values.
4. Branch off the repo's default branch (`origin/main` where it has one), commit the docs, the rules and the report, and give me the link to create the PR — never create it yourself.

## Report

A few lines: what the project is, which skills are on, how many areas were documented, how many issues and whether a phase is proposed, that Phase 1 is the adopted code and later phases start at 2, and the next step — `/backend-setup` for the foundation gaps, then `/backend-issue-fix` on the first issue; or `/feature-requirements` for the proposed phase. From here the project is run like any other.

## Rules

- No code changes, no refactors, no "while I'm here". A deviation is a finding.
- No doc says what the code doesn't do. Intent the code doesn't carry is a question to me, not a rule.
- Existing docs are inputs, not truth: where a README and the code disagree, the code wins and the disagreement is noted.
- Environment variables are named, never valued. Nothing from `.env`, the host's settings or a committed secret is quoted in the inventory, a citation or the report; a committed secret is a `security` deviation.
- Clients first need this backend's docs: adopt the backend before any client repo.
