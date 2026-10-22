# backend-blueprint

**Spec-to-ship backend workflow for Claude Code — the docs come first, and every endpoint traces back to them.**

Thirteen Claude Code skills and the rules they depend on, installed into a project as one pipeline: identify the feature areas, write the business rules, derive the flows, spec the screens, review all of it, set up the foundation, then build. Nothing gets built that can't be traced to a document.

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
| `--ai` | Also install the AI services rule. For products with AI features, on either stack |
| `--store-client` | Also install the deprecations register. Mobile, desktop or any installed client |
| `--personal` | Install skills to `~/.claude/skills` instead of the project |
| `--force` | Overwrite existing files. Default is to skip them |
| `--dry-run` | Print what would change, write nothing |

**`--stack` is required.** It decides which coding standards and tech stack are installed, so without it — or with any value other than `nestjs` or `fastapi` — the installer stops, explains, and writes nothing.

The other options combine freely. A FastAPI backend with AI features and a mobile app in the stores:

```bash
npx github:dev-emekaa/backend-blueprint init --stack fastapi --ai --store-client
```

Add `--dry-run` to any command to preview it first. Re-running is safe: existing files are skipped and listed, never clobbered.

### What it writes

```
.claude/
  skills/                          13 skills
  rules/
    documentation-conventions.md   structure, naming, tags, readiness
    tech-stack.md                  the tools and services, for the stack you picked
    coding-standards.md            how code is written, for the stack you picked
    security.md                    security policy
    testing.md                     test layers, isolation, data
    ci-cd.md                       pipelines, releases, hosting — loads only when deploy files are touched
    api-rbac.md                    empty register + its instruction block
    background-jobs.md             empty register + its instruction block
    ai-services.md                 --ai only
    deprecations.md                --store-client only
CLAUDE.md                          documentation map · audiences · project configuration
docs/
  product-docs/                    your PRD goes here
  business-rules/  app-flows/  screen-specs/  api-docs/  api-testing/
```

`docs/feature-areas.md` is deliberately **not** created — the `/feature-areas` skill writes it from your PRD. An empty one would be a stub, which the conventions forbid.

### After installing

1. Put your PRD in `docs/product-docs/`.
2. Fill in the **audiences** and **project configuration** blocks in `CLAUDE.md`. Anything you leave blank, the skill that needs it asks for once.
3. Run `/feature-areas`. Everything downstream reads its output.
4. Run `/backend-setup` once, any time before the first build. It needs no product docs, so it can run while they are being written.

### Skills are project-scoped by default

They install to `.claude/skills/` and are meant to be committed, for two reasons:

- **Cloud sessions, scheduled runs and Cowork read only project skills.** `~/.claude/skills/` is invisible to all three.
- **The rules ship in the repo.** If the rules travel and the skills that execute them don't, a clone declares conventions with no tooling to follow them.

`--personal` exists for throwaway work where you don't want thirteen folders committed.

### Updating

**In a project that already has it**, the installer skips existing files by design, so an update needs `--force`:

```bash
npx github:dev-emekaa/backend-blueprint init --stack nestjs --force
```

`--force` overwrites, including any local edits you made to a skill or a rule. Run it on a clean working tree and read the diff before committing — that diff is the upgrade. `CLAUDE.md` is never rewritten: its blocks hold your project's values, so changes to the template are yours to copy across.

**Pin a tag** for a fixed version instead of whatever is on `main`:

```bash
npx github:dev-emekaa/backend-blueprint#v1.0.0 init --stack nestjs
```

<sub>If an update doesn't seem to have landed, `npm cache clean --force`.</sub>

---

## The pipeline

Each step is gated on the one before it. A skill whose inputs don't exist yet stops and says so.

```
PRD
 └─ /feature-areas      → docs/feature-areas.md          the division and the build order
     └─ /business-rules → docs/business-rules/            the law, per feature area
         └─ /app-flows  → docs/app-flows/                 the journeys, per feature area
             └─ /screen-specs → docs/screen-specs/        what each screen sends and shows
                 └─ /phase-review → docs/phase-1/review/  audit; nothing builds until it clears
                     └─ /backend-build                    one feature area at a time, or a whole phase

/backend-setup — once, any time before the first /backend-build; needs no product docs
```

`/backend-issue-fix` runs whenever an issue turns up. `/api-docs`, `/api-testing`, `/api-rbac` and `/background-jobs` are written *by* a build session — invoke them directly only to set up, audit or repair those files.

**Later phases** start with `/feature-requirements`, which turns the phase's feature ideas into its FRD. Then `/phase-review` for the whole phase — it writes the phase's business rules, flows and specs where the founder supplied none, through the type skills' later-phase modes, and audits them — then `/backend-build` once per **feature**, in `implementation-order.md` order.

---

## The skills

### `/feature-areas`
**Identify every feature area from the PRD and order them for building.**
Runs first, before any other doc exists. Applies a three-part test — it owns a root entity no other area owns, that entity has a lifecycle of governed transitions, its screens don't sit naturally elsewhere — then orders the areas by dependency and records why each sits where it does.
**Reads** PRD, product brief · **Writes** `docs/feature-areas.md`

### `/business-rules`
**The law of each feature area.**
Invariants, constraints, decision rules, formulas, edge cases and security rules, each with a stable ID and written plain-language-first so a non-technical stakeholder can read them — plus only the definitions and reference data those rules depend on. User-facing messages are referenced by key; the wording lives in one shared index.
**Reads** PRD or FRD, the supplied rules, the registry · **Writes** `docs/business-rules/`

### `/app-flows`
**Every user journey, step by step.**
Numbered timelines separating user actions from system actions, with explicit IF/THEN branching, error paths, and the area's state machines. Derived from the PRD and rules, or from designs — screenshots, or screen specs the frontend already generated. Screens from competitor or similar products can be supplied for inspiration — reference only, never a source for which flows exist.
**Reads** PRD, business rules, the registry, optionally designs · **Writes** `docs/app-flows/`

### `/screen-specs`
**What each screen sends to the backend and shows from it.**
Roles, purpose, input fields with real constraints, display data, and every action with its endpoint. Shapes and types only — no UI copy, no sample values, no positions. An endpoint reads `METHOD /path` only once it exists in api-rbac; everything else stays `pending` until the build fills it in.
**Reads** app flows, PRD, business rules, optionally designs · **Writes** `docs/screen-specs/`

### `/phase-review`
**Audit the context docs before anything gets built.**
Covers the first phase (unit: feature area, requirements: PRD) and later phases (unit: feature, requirements: FRD), and can be pointed at a single artifact — one area's rules, one batch of screens, one screen. Each issue is either a decision for the founder, with a recommendation, or an action for the frontend or backend, already applied to the specs. Nothing reaches `Ready` without it.
**Reads** every context source · **Writes** the reviewed content, plus issues · decisions · responses · actions

### `/feature-requirements`
**Turn feature ideas for a later phase into the phase's FRD.**
Learns the existing product first — the PRD, feature areas, the affected areas' rules, flows and specs, the registers, and the code only where the docs leave a question open — then researches each idea, gives a verdict (build, change, defer or drop) for your approval, and writes the FRD with each feature's reason and its impact on existing users, data and released app builds. Updates the Product Brief only when the phase changes who the product is for, its positioning or its pricing model.
**Reads** the product docs, registry, affected areas' docs, registers · **Writes** `docs/phase-{n}/product-docs/frd-phase-{n}.md`

### `/backend-setup`
**The foundation every build stands on, set up once.**
The project scaffold per the tech stack, with config validated at boot and the security baseline in place. A local environment with separate test datastores and Mailpit. The test harness, a health endpoint that reports the running commit, and dev-tool endpoints that don't exist in production. The Dockerfile, and the three CI/CD pipelines. Ends with an infra guide for the steps only you can do — host, GitHub, DNS — and records the dev commands in `CLAUDE.md`.
**Reads** the rules, `CLAUDE.md` · **Writes** the foundation, `docs/infra/infra-setup.md`

### `/backend-build`
**Build a feature area, or a feature, end to end.**
Runs one feature area or feature per session by default, or a whole phase in one session — one approved plan up front, each unit built in order with tests gating the next, then one setup pass and one curl sweep at the end. Phase 0 designs the schema globally once. Then twelve steps per build, from scoping through an approved plan, migrations, endpoints and jobs, tests, curl verification against a reseeded server, docs, and promotion. Carries the rules that prevent the expensive mistakes: expand/backfill/contract after launch, state-derived idempotent jobs, atomic counters, no external call inside a transaction, deprecation rather than deletion once a client has shipped.
**Reads** everything · **Writes** the backend, plus api-docs, api-testing and the registers

### `/backend-issue-fix`
**Resolve a backend or API issue.**
Confirms it's real against the code *and* the docs, updates whatever docs the fix touches, reproduces it with a failing test, fixes the code, updates seed and tests, verifies with curl on dev then staging, and produces a client handoff; the updated docs reach the client repo through its docs sync, and each handoff-file entry gets its resolution appended. Knows that aggregate boundaries and the identity model are not decisions to make inside a fix.
**Reads** the issue, the code, the area's docs · **Writes** the fix, doc updates, handoff

### `/api-docs`
**The integration reference the client team builds against.**
Per feature area: every endpoint with its access, parameters, shapes, client-actionable errors, side effects, state transitions, and a Background behaviour section for state that changes without the client calling anything. The running code is the source of truth; a divergence from the other docs is reported, never silently reconciled.
**Reads** the code, api-rbac, flows, screens · **Writes** `docs/api-docs/`

### `/api-testing`
**How to exercise a feature area's endpoints.**
A recommended testing order, the variables table, an RBAC quick reference, then every endpoint with both a curl command and a Postman description — plus every background job's dispatch, expected result and second-dispatch idempotency check. Environment-agnostic: every URL uses a base-URL variable.
**Reads** the area's api-docs, api-rbac, the jobs register · **Writes** `docs/api-testing/`

### `/api-rbac`
**The register of every endpoint that exists, and who may call it.**
Organised by backend module. Defines the project's permission vocabulary once, gives each principal its own matrix, and names the three kinds of endpoint that have no user role — public, inbound webhooks, dev tools — because those are the ones that end up unguarded. Being listed here is what makes an endpoint *built*.
**Writes** `.claude/rules/api-rbac.md`

### `/background-jobs`
**The register of every piece of work no request triggers.**
Scheduled, delayed, event-driven, inbound webhook — and the lazy-on-read decisions, so a deliberate non-job isn't re-litigated later. Twelve fields per entry, including the state it selects on, what makes a re-run a no-op, and where a permanent failure surfaces. A cron that stops firing produces nothing, and silence is indistinguishable from success.
**Writes** `.claude/rules/background-jobs.md`

---

## The rules

These install into `.claude/rules/`, which Claude Code loads at the start of every session — except `ci-cd.md`, which is path-scoped and loads only when a workflow, Dockerfile, Compose file or Railway config is read or edited.

### `documentation-conventions.md`
Universal and project-agnostic. Defines audience and client, the canonical folder structure and filenames, the phase folder layout, how a phase entry is tagged and pointed at, where a change to an existing area is routed, the three readiness values, and the registers. It is the single source for anything more than one skill must agree on.

### `tech-stack.md`
The tools this backend uses, and the services each environment runs on — Railway or AWS hosting, R2 + Cloudflare or S3 + CloudFront for media, SES or Resend for email over SMTP, Stripe or Paystack and the app stores for payments, push and link files where a mobile client exists. Built by the installer from the stack you picked plus the shared services file. Anything not listed is proposed in a build plan and approved before it is added.

### `coding-standards.md`
How code is written, for the stack you picked: layering, validation, database rules, atomic counters, Decimal money, UTC, errors, logging, caching and performance, and how tests are set up in that stack. Where a rule touches security or testing, it gives the mechanism in this stack; the policy lives in those files.

### `security.md`
Policy for both stacks:
- authentication, sessions and token rotation
- authorization
- input handling
- API and HTTP hardening
- rate limiting and abuse
- real-time connections
- datastores
- money and payments
- media and CDN
- third parties and webhooks
- secrets
- errors and audit
- personal data
- supply chain

### `testing.md`
Four layers: static, unit, API e2e against real test datastores, and smoke after each deploy. Also which environment each layer touches, and why e2e uses factories while manual testing uses the seed. Plus the regression rule: every bug gets a test that reproduces it.

### `ci-cd.md`
Three pipelines: PR checks, an automatic staging deploy, and a manual production deploy that ships the exact image a client verified. Also release tags, releasing alongside clients, migrations at deploy, rollback, and the Railway and AWS hosting maps.

### `ai-services.md` *(with `--ai`)*
The AI tools for each stack:
- model calls through a provider-agnostic layer — Mastra's model router, or LiteLLM
- orchestration with Mastra or CrewAI
- Qdrant for vectors
- fal.ai for media models — image, video and speech

And the rules that have no equivalent elsewhere: model output is untrusted input, a tool an agent can call is an endpoint, retrieval stays in step with its sources and scoped to the caller, runs are bounded, prompts are versioned, and no test calls a live model.

### `api-rbac.md` · `background-jobs.md` · `deprecations.md`
Installed empty, carrying their instruction block and the universal parts of their vocabulary. They grow as the backend is built — an empty register means "nothing built yet", which is true.

---

## The folder version

The downloadable, manual alternative to the installer — the skills, rules and stack files laid out to copy into a project by hand, with its own README. Build it from this repo:

```bash
npm run package
```

It writes `dist/backend-blueprint/` and `dist/backend-blueprint-v{version}.zip`, from the same assets the installer uses, so the two never drift apart. Its guide lives in `folder/README.md`.

### Releasing

Every release is a version tag. Pushing one builds the zip and publishes it on the repo's **Releases** page:

```bash
npm version minor        # bumps package.json, commits, and tags v1.3.0 (patch · minor · major)
git push --follow-tags   # pushes the commit and the tag
```

The zip appears under the release's **Assets** as `backend-blueprint-v1.3.0.zip` — that is the file to share. The **Source code** archives GitHub adds to every release are the repo itself, not the folder version. A tag that doesn't match the `package.json` version fails the build, so the zip's name always matches its contents.

---

`prompts/` holds the pre-skill versions of nine of the skills, frozen as they were in the paste-into-a-chat era, with its intros and `{PLACEHOLDER}` blocks. Useful if you want to run the workflow outside Claude Code — but the skills are the maintained copies and have moved on (above all, the prompts predate the client-pairing handoff files and still describe copying docs by hand).

**Requires** Node 22 or later, and Claude Code. **License** proprietary — all rights reserved.
