---
name: backend-build
description: Build a backend feature area (first phase) or feature (later phases) end to end — schema, endpoints, background jobs, tests, curl verification, docs, deploy and promotion. Use when implementing what the business rules, app flows and screen specs define.
---

# Backend Build

## 0. Project Configuration

Read these from the project's `CLAUDE.md`. If a value isn't recorded there, ask me for it once and offer to add it, rather than guessing or asking again each session.

| Key | What it is |
| --- | --- |
| **Project name** | The project this backend serves. |
| **Stack / framework** | e.g. NestJS, Django, Rails, Express. |
| **Rules directory** | Where always-loaded rules live, e.g. `.claude/rules/`. |
| **Docs directory** | Where the docs live, e.g. `docs/`. Referred to below as `{{DOCS_DIR}}`. |
| **Datastores** | e.g. Postgres + Redis. |
| **Client(s) integrating** | e.g. mobile app, web dashboard. Decides whether the deprecation machinery applies. |
| **Local base URL** | For the dev-server curl sweep. |
| **Staging base URL** | For the staging curl sweep. |
| **Dev server command** | How to start the dev server. |
| **Reset/reseed command** | How to clear and reload the dev datastores. |
| **Production status** | Not yet launched / launched and serving real users. A mode switch for schema changes. |
| **Production base URL** | Only once launched. |
| **Production deploy trigger** | e.g. the Deploy Production workflow, run manually on the commit the client verified. |
| **Client release status** | First store release shipped or not *(store-distributed or installed clients only)*. |
| **Minimum-supported-version endpoint** | *(store-distributed or installed clients only)*. |

Throughout this skill, `{{PROD_STATUS}}`, `{{CLIENT_TYPE}}`, `{{LOCAL_BASE_URL}}` and the rest refer to these values.

---

## 1. How This Backend Is Built

The unit of work is a user-facing feature area in the first phase and a feature in every later phase, and nothing is built until that phase's documentation review is complete. There are two ways to run a build:

- **One at a time** *(default)* — one feature area per session in the first phase, one feature per session in later phases, with my approval of each plan and each verification.
- **Whole phase** — every `Ready` unit of the phase in one session, in order. See *Whole-phase mode* in Section 5.

A **feature area** is a user-facing area of the product containing all the user-facing flows that belong to it — happy paths and error paths, across every role that participates in it.

Three docs define exactly what must be built, all found through the `CLAUDE.md` documentation map:

- the **app-flow** doc tells you *what flows exist*,
- the **business-rules** doc tells you *what must be enforced*,
- the **screen-specs** doc tells you *what shape the endpoints must have*.

In the first phase, these are the area's canonical files, including any audience or client files. In later phases, they are the feature's phase files plus the canonical files of every feature area it touches.

**Throughout, "the area" means whichever unit is being built** — the feature area in the first phase, the feature in a later one. Where its app-flow, business-rules and screen-specs are named, a later phase reads the feature's phase files together with the canonical files they change. The workflow below is one workflow, not two: the steps are the same, and the handful of clauses that differ say which phase they apply to.

Together they guarantee that every flow and every screen in the area gets the right endpoints, with the right request/response shapes and the right behavior — so when the client integrates that area, every flow and screen integrates exactly as intended.

Nothing is built that isn't traceable to one of these docs. If something is needed but isn't in them, that is a gap to raise with me — not a gap to fill by invention.

We build **only the feature area or feature I name**. Do not build ahead into other areas or features.

---

## 2. Reference — Governing Files

### 2.1 — Inputs: read before building

**Product-level (read once, re-check per area)**

| File | What it gives you |
| --- | --- |
| `prd` | Product description, core value proposition, the problem being solved, core features, and the user roles and their permissions. |
| `feature-areas` | `docs/feature-areas.md` — every feature area in the product, what each owns, its status, and the first phase's build order. The first-phase build tracker; later phases track readiness per feature in `docs/phase-{n}/implementation-order.md`. Produced by the Feature Areas skill before any other doc exists. |
| `tech-stack` | The technologies the codebase uses and must continue to use, and the services each environment runs on. |

**Per-feature-area (the three main sources)**

Each feature area has its own doc for each of these — `app-flow-{{feature-area}}`, `business-rules-{{feature-area}}`, `screen-specs-{{feature-area}}`, with audience and client segments where those splits exist. A later phase's feature has one phase file of each type, sectioned per feature area:

| File | What it gives you |
| --- | --- |
| `app-flow-{{feature-area}}` | Every user-facing flow in the area: its entry trigger, every user action and system action in sequence, and the role the flow belongs to. Where a flow differs by role or branches off, that divergence is represented explicitly. Also contains the area's system actions. |
| `business-rules-{{feature-area}}` | All business rules and logic that must be enforced in this feature area. |
| `screen-specs-{{feature-area}}` | Every screen in the area: screen name, roles that can access it, the data it displays, the data it sends to the backend, the actions performed on it, and its conditional states. This is what tells you the request and response shapes the UI expects. |

Where a `business-rules-shared.md` exists, read it alongside the per-area files — a rule may live there rather than in the area's own file.

**Standards (apply to everything you write)**

| File | Applies to |
| --- | --- |
| `coding-standards` | All code written or modified. |
| `security` | All code written or modified. |
| `testing` | Creating, modifying, or working with any test. |
| `ci-cd` | Deploying, and any change to workflows, the Dockerfile or deploy configuration. |
| `ai-services` *(where the product has AI features)* | All code that calls an AI model. |

Follow these files as written. This prompt does not restate them.

### 2.2 — Artifacts: create or update as you build

| Artifact | What it is | Updated when |
| --- | --- | --- |
| `schema` | `docs/schema.md` — every entity, enum, relationship, ownership chain and aggregate boundary, with the locked decisions marked. Designed globally once in Phase 0 from the `prd` plus **all** areas' business rules, app flows, and screen specs; migrated incrementally per area thereafter. | Phase 0 writes it; each area's build updates it as its migrations realise or extend the design. |
| `backend-architecture` | The module index — one row per module, naming its aggregate root or marking it infrastructure, plus one line on what it owns — and the cross-module rules: which module may call which, in which direction, and when it is a direct call rather than a domain event. Domain modules are derived from the schema's aggregate roots; infrastructure modules own no aggregate and appear nowhere else. Lives in `.claude/rules/backend-architecture.md`, so it loads every session. Layering conventions stay in `coding-standards`. | Phase 0 for the initial index and rules; whenever a build introduces a new aggregate root. |
| `api-rbac` | Every endpoint in the app, grouped under its backend module (aggregate root). Each endpoint lists, per user role, whether access is granted, denied, or **conditional** — and on what condition. Starts empty and grows with the build. | Any endpoint built, modified, or removed. |
| `background-jobs` | Every piece of background work in the app — scheduled, event-driven, delayed, and inbound-webhook handlers — grouped under its backend module. The `api-rbac` of work that isn't request-triggered. Entry format follows the Background Jobs skill. Starts empty and grows with the build. | Any background job built, modified, or removed. |
| `deprecations` *(store-distributed or installed clients only)* | Everything kept alive only so released client builds keep working, and the record of when each can go. Covers old response and request fields, replaced endpoints, retired enum values, and schema columns awaiting their contract phase. Each entry records: what it is, its kind, what replaces it (or "none"), the date it was deprecated, and its status — `deprecated` while released builds may still read it, `removable` once none can reach the API. When the thing is deleted, its entry is deleted with it; git holds the history. Without this, deprecated things are never deleted, because nobody can prove what still reads them. | Anything deprecated rather than deleted outright; an entry becomes removable; the thing and its entry are removed. |
| Server `seed` file | Realistic fake users and data, aligned with the schema, flows, and rules, that make every user-facing flow in a built area testable — happy and error paths — without registering users from scratch. Used on the dev and staging servers by the backend dev and by client devs testing against integrated UI. | Every area built; every change to endpoints or business logic. |
| E2E test factories / fixtures | Test data for the e2e suite. **Kept entirely separate from the server seed file** — they serve different purposes and must not be merged or made to depend on each other. | Every area built. |
| `api-docs-{{feature-area}}` | The client devs' primary integration reference for that area. | Area built or changed. |
| `api-testing-{{feature-area}}` | How to exercise that area's endpoints via Postman or curl. | Area built or changed. |
| `integration-{{feature}}` *(later phases only)* | The feature's endpoint index in `docs/phase-{n}/integration/`: sectioned by feature area, holding only endpoint identifiers, actions, and links to canonical files — not a copy of api-docs. | The feature is promoted. |
| Swagger / OpenAPI | Schema documentation for every endpoint. | Area built or changed. |
| Third-party setup guide | One per external service integrated. Lives in `{{DOCS_DIR}}external-integrations/`. | A third-party service is introduced. |
| Infra docs | Everything related to provisioning, configuring, and deploying the **staging** and **production** environments — servers, databases, deployment pipeline, and any infra tooling — written so each environment can be set up start to finish by following them. The primary file is the `infra-setup` doc; any further infra docs live alongside it. All live in `{{DOCS_DIR}}infra/`. Local dev is **not** covered — it is fully derivable from `tech-stack`, `.env.example`, and the dev server and reseed commands. | Infra is first set up or changed; a feature area introduces a new infra requirement (queue, scheduler, storage bucket, public callback URL, etc.). |

**Register template** *(store-distributed or installed clients only)* — the installed `.claude/rules/deprecations.md` carries the register's header and entry format; builds only add rows, flip statuses, and delete rows with the thing they describe.

**When a `deprecations` entry becomes `removable`** *(store-distributed or installed clients only)*

1. Wait until the deprecation is old enough that every current build has had time to integrate the replacement — months, not weeks. Deprecated things cost nothing while they sit, so there is no reason to rush this.
2. Ask me for the version table from the production database — platform, version, and request count over the last week or two. Organise it by platform and version, and show me the current build's share and how many people are on builds below it. **Do not recommend a floor**; the cost of interrupting those users is not visible from here.
3. I raise the minimum supported version — normally to the current build — per platform, and only where that build is live in that platform's store, or, for a desktop platform, has reached 100% on the desktop client's update feed. This is a config change I deploy; it is not something you set. Forcing an update is my call, not an automatic consequence of low request counts: it interrupts people mid-task, and a deprecated field costs nothing while it waits.
4. The floor takes effect only when each person next opens the app, so it clears over a few days. I paste the table again; when the builds below the floor have stopped calling, nothing that reads the old shapes can reach the API.
5. Mark every entry deprecated before that point `removable`. `removable` means cleared and waiting — the deletion itself happens in the next build session's plan (a feature area in the first phase, a feature in later phases), where the code and the register entry both go.

This is answered by reading data production already recorded. Nothing is written, no endpoint is called, and there is no endpoint for this.

---

## 3. Global Constraints

**Enforcement**

- Enforce every rule **server-side**. Never rely on the client to prevent an invalid action.
- Validate every request payload. No unvalidated input reaches business logic.
- Return only what the screen specs call for. Never leak internal fields, credentials, or other users' data.
- Every endpoint's guard/role must match its `api-rbac` entry — including conditional access.

**Access control has two parts. Decide both, separately.**

**1. Role access — who may call this endpoint.** Your sources state this directly: `screen-specs` lists the roles that can access each screen, `app-flow` states the role each flow belongs to, `business-rules` gates specific actions by role, and `prd` defines the roles and their permissions — including the shared variants of each. **A role named in prose counts as a grant** — no formal permission table is required. Where `business-rules` restricts something a flow or screen reads as permitted, **the restriction wins**. For endpoints already built, `api-rbac` is authoritative. Record every new decision in `api-rbac`.

**2. Record scope — which records that role may touch.** Scope is usually implied by context rather than stated outright. Determine it in this order:

1. **Start at the narrowest scope:** the user's own records.
2. **Widen only where a source shows wider access.** Any of the three can establish it: `app-flow` showing a flow that acts on records belonging to others, `business-rules` stating what a role may reach, or `screen-specs` describing a screen that displays other users' records. Whichever states it most specifically is the specification — implement what it shows, and don't narrow it because it wasn't phrased as a permission.
    - **On contradiction:** `business-rules` wins, whether it widens or restricts. If `app-flow` and `screen-specs` disagree on scope and `business-rules` is silent, treat it as two defensible readings — flag it in the Step 2 build plan rather than picking one.
3. **Bound the widening.** Wider access is almost never global. Identify what limits it — the group, organization, or other boundary the user belongs to or administers — and enforce that boundary **in the query itself**, not after fetching.
4. **Record the result** in `api-rbac` as a conditional access entry, naming both the condition and the source it came from.

**Stop and ask only when a scope has two defensible readings that expose different data.** Collect these in the Step 2 build plan rather than interrupting the build.

**Scope**

- Build only the named feature area or feature. Do not build endpoints, entities, or logic for areas or features not yet in scope.
- Follow the existing patterns of the module you are working in. Do not introduce a new pattern for something the codebase already solves.
- Do not add dependencies or external services outside `tech-stack` without asking me first. This includes any hosted service the code would call — a payment provider, a messaging service, a storage bucket — not just code libraries.
- **If a service in `tech-stack` cannot do what this area's flows need, say so.** A blocker is a fact: the provider does not support the country, the payment method, or the volume the flow needs, or the vendor has dropped the feature. Say which requirement it fails and what would meet it. **Do not raise preference.** Cheaper or more modern is not a blocker — prices change, the cost of switching is invisible from inside the code, and swapping a working integration mid-area is the drive-by refactor this prompt forbids everywhere else.
- Where the sources are silent, ambiguous, or contradictory: **stop and ask**. Do not invent product behavior.

**Secrets and config**

- Never commit secrets. New configuration goes in as environment variables, documented in the relevant setup guide and in `.env.example` (or its equivalent).
- **Third-party credentials are shared between local dev and staging.** Both environments exist to test the same endpoints and flows, so they use the **same external accounts and env variable values** — same storage bucket, same messaging credentials, same sandbox keys. The two environments differ in infra (server, database), never in third-party accounts. Three bounds on this:
    - **Production always gets its own separate live credentials — no exceptions.** No prod credential ever appears in a dev or staging config, and vice versa.
    - **Webhooks are the partial exception:** a provider delivers callbacks to a configured URL, so within the shared account the callback URL is configured per environment (tunnel URL for local dev, real URL for staging).
    - **Shared storage is prefixed by environment** (e.g. `dev/` and `staging/` key prefixes in the shared bucket), so the two environments never stomp each other's data.

**Schema changes and migration safety**

`{{PROD_STATUS}}` decides how much ceremony a schema change carries. It is a mode switch, not a detail.

- **Before production launch.** Staging is the only populated environment and it is reseeded at will. A migration may be destructive if that is the cleanest design — rewrite the table, drop the column, change the type. Get the model right rather than preserving convenience data.
- **After production launch.** No migration may destroy, or block access to, data that already exists. Every schema change follows **expand → backfill → migrate the code → contract**, each phase in its own production deploy. Production deploys a chosen commit and can skip several, so the next phase merges only once the previous one is live in production — a `prod-*` release tag contains it:
    1. **Expand — add, never alter.** New columns go in **nullable**, or with a constant default that is true of every existing row, so the migration cannot fail on rows that predate it. A rename is an add plus a later drop, not an alter. A type change is a new column, not a cast. Deployed code keeps running against the old shape untouched.
    2. **Backfill — only when the data already exists in another shape.** Most post-launch additions need none: the field is new, the value was never collected, and NULL on older rows is the correct record of that. A backfill is required only when the value is **mandatory** (a rename, a type change, a split column, or a denormalised value computed from existing records — skipping it loses data or leaves code reading a column nobody wrote to) or **derivable** (computable from data the record already carries, and needed downstream). In both cases it is a single statement applied to all matching rows by the database, batched only where table size demands it, and scoped `WHERE <column> IS NULL` so re-running is safe. Where neither case applies there is no backfill: leave the column nullable, document in `schema` and `api-doc` that NULL means *not collected* rather than a default, decide per read site how NULL is handled, and collect the value going forward. **Never fabricate a value for rows that never supplied one** — once written it is indistinguishable from a value the user actually gave, and every rule reading that column then acts on a fact that is not one. **Never add a NOT NULL constraint to a column whose old rows could only satisfy it by invention**; if the value cannot be obtained, the field is not actually required. The one exception is a constant that records a system state universally true before the change — `email_verified = true` where verification was always mandatory, `plan = FREE` where no paid tier existed. Test it by asking whether someone who knows the system would call the value correct or would call it a guess. A guess stays NULL.
    3. **Migrate the code** — write both old and new, read from new. Deploy.
    4. **Contract** — drop the old column, add the NOT NULL constraint, or validate the foreign key, only once no code running in production depends on the old shape, and for store-distributed clients only once version telemetry supports it.
- **Nullable does not cover every change.** It solves adding a field. It does nothing for renames, type changes, drops, new unique constraints, foreign keys against existing rows, or removed enum values — each of which fails against production data and passes against a reseeded staging. These take the full path above.
- **Backfills are versioned code, never commands.** One that finishes well inside the deploy's migration step ships as a migration file, in its own file so it can be re-run without re-running the DDL. One that could outlast that step ships instead as a background job registered in `background-jobs`: scoped to the same `WHERE <column> IS NULL`, a batch per tick, idempotent by construction. The next phase waits until it selects nothing, and the job is removed in the contract release. Never expose a backfill as an endpoint, and never run one against production by hand — an endpoint that mass-mutates records is a permanent hole cut for a one-time need.
- **Rollback is forward.** Code rolls back; schema does not. A down migration that drops a column does not restore the rows that went with it. Expand/contract is what makes a code rollback survivable at every phase — treat it as the rollback plan, not the reversible migration.
- **Assume production is large and busy.** A statement that is instant against seed data can lock a table for minutes against real volume. On `{{DATASTORES}}`: build indexes concurrently, add columns without a volatile default, add foreign keys unvalidated and validate as a separate step, and never rewrite a table in a request-serving window. State each migration's expected lock behaviour in the build plan.
- **A reseeded staging does not test a migration.** Reseeding empties the table before the migration runs, then refills it with rows that already carry the new column — proving the schema compiles, not that the change survives rows that predate it, which is the only condition production presents. Once production is live, verify each migration against a restored snapshot of the production database before promoting it, and confirm the backfill and any new constraints hold there.

**Performance**

- No N+1 queries in list endpoints. Flag any new query placed inside a loop.

**Background work — system actions that aren't request-triggered**

Some system actions in the app-flow files are not triggered by a client request: expiries, reminders, scheduled settlement, cleanup, third-party callbacks. No screen calls them and no endpoint exposes them, so they must be built deliberately or they are silently skipped.

Classify every such action by trigger: **scheduled** (cron), **event-driven** (fires off a domain event), **delayed** (scheduled at runtime, e.g. "expire this 24h from now"), or **inbound webhook** (third-party callback).

Four rules govern all of them:

1. **Derive from state, not from time.** Query for *records whose expiry has passed and are still pending* — never *records created exactly 24 hours ago*. A missed, delayed, or duplicated run then self-heals on the next tick.
2. **Idempotent always.** Cron runs overlap, retries happen, deploys restart schedulers. Running twice must be a no-op.
3. **The handler holds no business logic.** It calls a service method. The service method is what unit tests target — no new testing approach required.
4. **Every job is manually dispatchable** through a single protected **job-dispatcher dev-tool endpoint**, which fires any job by its job name as listed in `background-jobs`. One endpoint for all jobs — no per-job trigger endpoints. This works because rule 1 makes jobs argument-free: they query for eligible state rather than acting on passed-in records. The dispatcher must fail loudly on an unknown job name (never a silent no-op) and return what the run did — records affected and state transitions — so a dispatch can be curl-verified. Registering a job in `background-jobs` is what makes it dispatchable; an unregistered job fails its first dispatch, which is exactly when verification catches it. **Inbound webhooks are excluded** — they are real endpoints with signature verification, and dispatching them by name would bypass that check; exercise them through their own path.

**A new job's first tick finds old records.** A state-derived query has no memory of previous runs — it returns whatever matches now, and normally that is a small trickle only because earlier ticks already drained everything older. A job deployed to a live production has never drained anything, so its first tick matches every record that has built up in its target state since launch. This bites when the job is scheduled, acts on records that have sat unprocessed, and has an external side effect — a notification, a payment, a released hold. Before promoting a new job or a widened selection criteria, state what its first tick will select and, if the volume warrants, bound it in the job's own query: a **batch limit** where the backlog should be processed but not all at once, or a **cutoff** excluding records from before the deploy where it should not be processed at all. Write the cutoff as a permanent part of the selection criteria, not a temporary line to remove later — once the backlog ages out it excludes nothing. Both live in the code and need no action once deployed. Delayed and event-driven jobs have no backlog by construction.

Also: store timestamps in UTC and state explicitly what a "day" means for any job that depends on it. Define retry and failure behavior per job. Record every job in `background-jobs`.

**Inbound webhooks are registered twice.** A webhook handler is both a real endpoint and system-triggered work, so it gets an entry in **both** registries, cross-referenced:

- In the `api-rbac`, with access expressed as *signature-verified third party* rather than a user role. An endpoint no screen calls and no role owns is the one most likely to end up unauthenticated — listing it is what prevents that.
- In `background-jobs`, with its provider, callback path, idempotency key, and retry behavior.

Verify the signature on every inbound call, treat the payload as untrusted input, expect duplicate deliveries, and never trust payload contents over your own persisted state.

**API compatibility and versioning**

These apply to **every** backend, regardless of client type:

- **Client releases are absorbed inside the existing API, not by a path segment.** Adding, renaming, or reshaping a field is handled by keeping both shapes populated until the old one can go — see the deprecation path below. Do not fork endpoints or introduce a version prefix per client release; that multiplies the API surface every few weeks and buys nothing field-level deprecation does not already give you.
- **Clients must tolerate unknown enum values.** State this in `api-doc`. It keeps adding an enum value an additive change rather than a breaking one.
- **Classify every API change:**
    - **Additive (safe):** new endpoint, new optional request field, new response field, new enum value.
    - **Breaking:** removing or renaming a field or endpoint, changing a type, making an optional field required, changing status or error codes, tightening validation, changing default pagination or sort.

These apply **only when any client is store-distributed or installed** (mobile app, desktop app, etc. — check `{{CLIENT_TYPE}}`), because they exist for clients that persist in the field and cannot be force-refreshed:

- **Every request carries a client version header** (`X-App-Version`) and, where more than one client platform ships, a platform header (`X-Platform`). Accept both from day one and store them somewhere you can still query months later — a small table of platform, version, date, and request count, not raw logs alone, since logs are usually deleted long before a deprecation is ready to remove. This is what tells you when dropping support for an old build is safe.
- **Ship a minimum-supported-version endpoint** that the client calls on launch — before sign-in, so it needs no session — with its platform and version, returning one of: supported / soft update available / force update required, with the place to get the update: the platform's store page, or the download page for a desktop platform. **Hold the minimum per platform** (`ios`, `android`, `macos`, `windows`, `linux`). Stores approve on their own timelines, and a desktop release rolls out gradually, so a single shared floor will force-update users on a platform whose new build is still in review or still rolling out — sending them to a page that does not have it yet.
- **The first store release is the hard line** (`{{CLIENT_RELEASE_STATUS}}`). Before it, breaking changes are acceptable — note them in the build report. After it, breaking changes take the deprecation path: add the new field while keeping the old one populated, and record the old one in `deprecations`, status `deprecated`. Bridge the change inside the existing endpoint wherever possible; duplicating an endpoint is the heavy option, for operations genuinely reshaped beyond what both-shapes-populated can span.
- **Store approval is not the removal gate**, and neither is a desktop release reaching 100%. A release being approved or fully rolled out means it is available, not installed — on that day almost nobody is running it, and removing then breaks everyone. The gate is that the minimum supported version has been raised above the last build that reads the old shape, and requests from those builds have stopped. See the graduation steps in Section 2.2.

**For web-only clients**, the deprecation machinery above does not apply — the client ships from the server, so there are no stranded old builds. A **breaking** change instead means a *coordination* requirement, not a ceremony: deploy backend and client together, or have the backend briefly tolerate both shapes across the deploy window (long-lived open tabs still call the old shape until refreshed). Every breaking change still reaches the build report and the client team either way.

---

## 4. Phase 0 — Global Schema Design

**Done once, before the first feature area. Not repeated per area.**

The schema is the one part of this build that is **not** built incrementally. Code modules are largely independent of one another; tables are not. Foreign keys, ownership chains, and enum values cross feature areas by nature, and the cost of getting them wrong is asymmetric — a wrong service method costs a refactor of one area, while a wrong ownership or tenancy model costs a data migration touching every area built on top of it, plus their tests, seed data, docs, and any client code already integrated.

**Design globally, migrate incrementally.**

### 4.0 — Modelling approach

The design pass works under these constraints. The schema is modelled domain-first: entities are the domain's own resources, and the aggregate is the unit of consistency.

- **Model domain resources, not user roles.** An entity per role fragments identity the moment one person holds two of them.
- **Roles are attributes on the principal's entity**, not entities of their own. A separate entity is warranted only for a genuinely separate principal — its own authentication, its own product surface, no shared behaviour — which is the same test that separates audiences.
- **Authorization is enforced at the application layer, never the data layer.** No row-level policies and no per-role database users deciding who may read what. Authorization split across two layers is authorization nobody can audit, and it is what keeps `api-rbac` truthful: the guard is the single enforcement point. Database constraints are a different thing and stay — they enforce invariants, not permissions.
- **Every aggregate root becomes a module** in `backend-architecture`. The converse does not hold: a module may own no aggregate where it exists for infrastructure rather than domain.

### 4.1 — The global design pass

Read the `prd` plus **every** feature area's `app-flow`, `business-rules`, and `screen-specs` docs, plus `business-rules-shared.md` where it exists. Produce a logical design covering:

- every **entity** and the feature area(s) it serves,
- **relationships** between entities,
- **ownership and scoping chains** — how a record traces back to the user or group that owns it,
- **enums** and their values,
- **aggregate boundaries** — which entities cluster under each aggregate root. Each root becomes a module; the resulting module list is recorded in `backend-architecture` once this design is approved.

Design to **entity-and-relationship depth, not column depth.** Exhaustive columns for areas you haven't built yet is speculation; the structure between entities is not.

Present this design and **wait for my approval**, then write it to `docs/schema.md` — entities and relationships, ownership chains, enums, aggregate boundaries, with the Section 4.2 locked decisions marked as locked. Every later session reads the design from that file, and no migration is written before it exists.

### 4.2 — Lock early vs. leave loose

**Lock early** — expensive to change once areas are built on top:

- identity and ownership model
- tenancy / scoping strategy
- primary key strategy
- soft-delete convention
- audit and timestamp convention
- money representation
- aggregate boundaries

Get these right in the global pass. Changing one later is a migration across every built area.

**Leave loose** — cheap to change per area:

- non-key descriptive columns
- nullable fields
- indexes
- area-specific detail tables

Don't stall the global pass on these. They belong to the area that needs them.

---

## 5. Build Workflow

Apply these twelve steps to each feature area (first phase) or feature (later phases), in order.

### Step 1 — Select and scope the build

- Confirm readiness in the tracker for this phase — `feature-areas` in the first phase, `implementation-order.md` in a later one: what you are about to build is `Ready`, and the one above it is `Built` — or, in whole-phase mode, completed earlier in the same run. **Never build from a `Draft` row.**
- Identify **prerequisites**: any area, module, or entity this one depends on. If a prerequisite is unbuilt, say so before starting rather than stubbing around it.
- Load the docs from Section 1 — the area's canonical files in the first phase, or the feature's phase files plus the canonical files of every area it touches — plus `business-rules-shared.md` where it exists, plus `prd`, `backend-architecture`, and `schema`.
- **If the area uses an already-integrated external service**, also load that service's setup guide from `{{DOCS_DIR}}external-integrations/` (and any relevant infra docs) — they hold the provider-side configuration the code cannot show: subscribed webhook events, registered redirect URIs, sandbox vs live keys, bucket policies, plan limits. Only the guides for services this area actually touches.
- **If the client has shipped a store release**, check `deprecations` for anything marked `removable` — it goes into this build's plan for deletion, code and register entry both. This is the moment deprecated things actually get removed; without it they accumulate indefinitely. If there are entries still marked `deprecated`, ask me whether I have current version counts from production; if I do, work through the graduation steps in Section 2.2 before planning.

### Step 2 — Derive the build plan → **wait for my approval**

Before writing any code, produce a short plan I can check against the sources:

- **Flows** — every flow in the area's app-flow file, with its entry trigger and role.
- **Screens** — every screen in the area's screen-specs file.
- **Endpoints** — the endpoint list derived from those flows and screens: method, path, purpose, which flow(s) and screen(s) it serves, and which roles can call it. Every flow step and every screen must be covered by at least one endpoint; every endpoint must trace back to at least one flow or screen.
- **System actions** — every system action in the area's app-flow file that is **not** triggered by a client request, each tagged **scheduled** / **event-driven** / **delayed** / **inbound webhook**, with the flow it serves.
- **Rules** — each business rule from the area's rules file, and where it will be enforced.
- **API compatibility** — whether anything in this plan is a **breaking** change to an endpoint the client already integrates. If so, flag it here, before code exists. List any `deprecations` entries this plan removes, and any it adds.
- **Schema impact** — new or changed entities, enums, and relationships, and whether each conforms to the Phase 0 global design or deviates from it. **If production is live**, also give each migration its phase (expand / backfill / contract), what any backfill derives its value from and which rows it will leave NULL, and its expected lock behaviour at production volume.
- **Third-party services** — any external service this area needs, each marked **already in `tech-stack`** or **new**. For anything new: what it does here, whether a service we already use could do it instead, and what it commits us to — an account, credentials, and what it costs at our expected usage. For anything in `tech-stack` that cannot meet what this area needs: say which requirement it fails, and suggest one or two services that would meet it, with what makes each a fit — the requirement it satisfies, whether it works with our stack, and what it costs. Take pricing from the provider's current pricing page rather than memory, and say when you have; if you cannot check it, say the figures are unverified. Report cost as a fact for me to weigh, not as the deciding factor — you cannot see existing accounts or the cost of switching away from a working integration.
- **Infra requirements** — any infra this area's work depends on that isn't already provisioned (queue, scheduler, storage bucket, public callback URL, etc.).
- **Gaps and conflicts** — anything the three sources disagree on, any screen needing data no flow produces, any rule with no flow to attach to, anything underspecified. List these as questions.

**Do not proceed to Step 3 until I approve the plan and answer the questions.**

### Step 3 — Migrate the schema for this area

The global design from Phase 0 is the reference. This step is **physical migrations for what this area needs** — not a redesign.

- Write migrations only for the entities, columns, enums, and relationships this area actually uses. Do not materialize tables for areas not yet built.
- Conform to the approved global design. Its ownership chains, key strategy, and conventions are settled.
- **If this area needs something the global design didn't anticipate, or contradicts it, stop and raise it with me before applying.** Small additions inside an existing entity are fine; anything touching a locked decision from Section 4.2 is not a per-area call.
- Migrations follow the schema-change rules in Section 3 for the current `{{PROD_STATUS}}`: additive where possible, forward-only, and safe to apply to an environment with existing data. Assume the change will eventually ship to a live production database.
- After launch, if a change cannot be made non-destructively, raise it with me before making it.
- Update `docs/schema.md` in the same step, where this area's migrations realise part of the design or extend it: the file always matches what is migrated plus the approved design for what isn't.
- If this build introduces a new aggregate root, add its module to `backend-architecture` in the same step as the migration. A module with no row there has no defined home for its endpoints, and it would still be a section in `api-rbac` and `background-jobs` that nothing names.

### Step 4 — Implement endpoints and business logic

- Build the endpoints from the approved plan, in the module each belongs to per `backend-architecture`.
- Implement request/response shapes to match what `screen-specs` says each screen sends and displays.
- Implement flow behavior — including system actions and role divergence — to match `app-flow`.
- Enforce every rule from `business-rules`, server-side, at the right layer.
- Cover error paths, not just happy paths: the errors the flows and screens expect must be produced with the right status codes.
- Build the **background jobs** identified in the plan, following the four rules in Section 3 — state-derived, idempotent, logic in the service layer, dispatchable by job name via the job-dispatcher dev-tool endpoint.

### Step 5 — Update `api-rbac`, `background-jobs`, and `deprecations`

Add every background job built to `background-jobs`, under its module, following the Background Jobs skill for the entry format. Inbound webhook handlers go in **both** registries, cross-referenced — `api-rbac` with access as signature-verified third party, `background-jobs` with provider and callback details.

Add every endpoint built to `api-rbac`, under its module, following the API RBAC skill for the entry format: per-role access — granted, denied, or conditional, and the condition where applicable. Update entries for anything modified; remove entries for anything deleted.

If the client has shipped a store release: add an entry to `deprecations`, status `deprecated`, for anything kept alive only for released builds — an old field still populated, a replaced endpoint still served, a retired enum value, a schema column awaiting its contract phase. Delete the entry for anything this area removed.

### Step 6 — Third-party setup guide *(only if this area introduces an external service, or changes an existing integration's provider-side configuration)*

For each external service introduced, write a setup guide in `{{DOCS_DIR}}external-integrations/` covering:

- what the service is used for in this area,
- step-by-step setup in the provider's console or dashboard,
- every credential and environment variable required, and where to find each one in that console,
- any provider-side configuration the integration depends on (webhooks, redirect URIs, sandbox vs live keys, plan requirements),
- how to verify the setup works.

Written so I can follow it start to finish without prior knowledge of that provider. Follow the shared-credentials convention from Section 3: one account and one set of env values for dev and staging, separate live credentials for production, and per-environment callback URLs where the provider delivers webhooks.

**If this area changes an existing integration's provider-side configuration** — a new webhook event to subscribe, a new redirect URI, a changed bucket policy, or similar — update that service's existing guide in place, per the doc-writing rules, so it still describes the setup start to finish.

**If this area introduces an infra requirement** — a queue, a scheduler, a storage bucket, a public callback URL, or anything else that must be provisioned for staging or production — document it in the infra docs in `{{DOCS_DIR}}infra/`, in the right place per each doc's structure, so the environments can still be set up start to finish from those docs alone.

**Guided walkthrough.** After writing or updating a setup guide or infra doc, **offer to walk me through executing it live** — the console and dashboard steps are the one part of the build only I can perform, and the build cannot be verified until they are done. If I accept: guide me through the written guide one step at a time, waiting for my confirmation — or my report of what I actually see — before the next step. Where the provider's console differs from the guide, my report is ground truth: adapt, and **fold the correction into the guide immediately**, so a completed walkthrough leaves the doc proven-accurate, not just written. Credentials and secrets go directly into `.env` on my side — never pasted into the chat; verify the integration works by exercising it (test call, health check, per the guide's verification section), not by inspecting keys. If I decline the walkthrough, the guide stands on its own — it is the canonical artifact either way.

### Step 7 — Update seed data

- **Server seed file** — add realistic users and data covering every flow in this area, happy and error paths, aligned with the schema, flows, and rules. A dev should be able to exercise any flow in the area without creating a user from scratch.
- **Pre-job states** — include records sitting in the states this area's background jobs act on (pending expiry, awaiting reminder, ready to settle), so every job has something to operate on when triggered — and near-boundary records the job must **not** act on (e.g. a match due tomorrow next to one overdue), so the untouched side of its selection criteria can be asserted.
- **Seed email addresses belong to a domain the team controls** (one catch-all inbox), so a flow that emails a code or link can be completed on staging, where the provider is real; locally Mailpit captures them regardless.
- **E2E factories/fixtures** — updated separately, for the e2e suite only. Keep the two independent.
- **Reseed dev-tool endpoint** — a protected dev-tool endpoint that clears the staging datastores and reloads the seed data must exist from the first area built; deploy and client-side testing depend on it. Build it once, keep it working as the seed grows.
- Remove seed data this area's work has made obsolete.

### Step 8 — Write tests

Follow the `testing` rules file for structure, naming, and approach.

- **Unit tests** — the business logic built in this area that is worth isolating: rules, calculations, state decisions. Code that only passes data through gets none.
- **E2E tests** — scope these to what only e2e can prove: the full wiring of routing, guards, validation, and persistence. For every flow in this area, cover:
    - **Happy paths** — each one, per participating role, including role variants.
    - **Access denials** — every denial the flow's `api-rbac` entries imply: wrong role, and out-of-scope records for conditional access. These must be proven at e2e — a guard sits in the request pipeline that unit tests bypass, and query scoping is only exercised with the caller's real identity.
    - **Business-rule rejections** — every one the client must handle (the documented error responses).
    - **Invalid state transitions.**
    
    For input validation, one representative failure per endpoint proves the validation layer is wired; the permutation matrix belongs in unit tests. Do not re-prove service-layer logic already unit-tested — assert the flow outcome, not the logic again.
- **Background jobs** — unit-test the service method each job calls. E2E-test each job by dispatching it by name via the job-dispatcher endpoint, asserting that eligible records make the expected state transition **and that ineligible ones are untouched** — this is what verifies the job's selection criteria from both sides. Dispatch a second time and assert nothing changes; that is the idempotency proof. For **event-driven** jobs, dispatching exercises the job's work against seeded state — the event wiring itself (event emitted → handler fires) is proven by the e2e tests of the flow that emits the event; dispatch does not substitute for that.
- **Regression** — re-run the suites for previously built areas. Schema changes and shared modules can break them; if this area's work broke a prior area, fix it before continuing.
- All suites must pass cleanly.

### Step 9 — Curl-verify on the dev server

Do not make me test manually — verify the area yourself with curl before documenting it.

1. Reset and reseed the dev datastores via `{{RESEED_COMMAND}}`, and start the dev server (`{{DEV_SERVER_COMMAND}}`).
2. Using the seeded users, curl every flow in the area end to end against `{{LOCAL_BASE_URL}}` — happy paths as the client would walk them, the key error responses the client must handle, and every background job dispatched by name (eligible records transition, ineligible ones untouched, second dispatch changes nothing).
3. Confirm each endpoint's request shape → response result → intended action matches the area's `app-flow`, `business-rules`, and `screen-specs`. This is a verification sweep of the shipped artifact against real seed data — not a re-run of the e2e permutation matrix, which Step 8 owns.
4. **Present the sweep in the chat, flow by flow:** each call's request — method, path and body — and its response — status and body, with tokens shortened and long lists trimmed — then whether the flow passed. End with a list of everything that failed, so I can review it with an extra pair of eyes.

**Steps that need a person.** Automate third-party steps wherever the provider allows it — test modes, test cards, CLI-triggered webhooks. Where a step genuinely needs me — browser consent, a code sent to a real device — pause there, tell me exactly what to do, and continue once I confirm. Never skip the step, or mark the flow passed without it.

If a bug is found: do not fix it immediately — state the intended fix, confirm it satisfies the constraints in Section 3, and **wait for my approval** before implementing.

### Step 10 — Update documentation

- **Swagger / OpenAPI** — every endpoint in this area properly documented.
- **`api-docs-{{feature-area}}` and `api-testing-{{feature-area}}`** — written following the API Docs and API Testing skills, including their background-behaviour and background-jobs sections. In a later phase, a feature's endpoints go into the canonical file of every area they belong to, never into phase folders.
- **Screen-spec endpoint references** — replace every `pending` reference in the screen specs this build covers with `METHOD /path` and the action. First phase: in the canonical files. Later phases: in the phase file, before promotion.

For all docs: write to the file's purpose and follow its existing structure and format. Add only what belongs there; remove only what this work made obsolete. Keep them readable — client developers and non-backend readers use these — except where the file is technical by design (`api-doc`, `api-testing`, `api-rbac`), which stay precise and technical. Docs never mention issues, resolutions, decisions or the review.

### Step 11 — Promote, index, clean up *(later phases only)*

1. **Promote.** Move each phase entry into the canonical file named by its `Feature Area:` field, in the same type folder and the same audience and client subfolder. A `Supersedes:` entry replaces the entry it names and keeps its ID; an `Adds to:` entry is inserted into its section in lifecycle order. Drop the phase-only fields. Create any missing canonical file first, and where the feature introduces a new feature area, advance its row in `docs/feature-areas.md` from `Draft` once its files exist. Clear every pointer, and fix any reference to the paths being deleted.
2. **Create `integration/integration-{feature}.md`** — sectioned by feature area, holding only endpoint identifiers, actions, and links to canonical files. It is not a copy of the api-docs.
3. **Delete the feature folder.** Deleted, not archived; git keeps the history.

### Step 12 — Update the tracker and report

- Mark it `Built` — the feature area in `feature-areas` (first phase), or the feature in `implementation-order.md` (later phases). If it is the phase's last feature, run teardown: remove `features/`, keep `implementation-order.md` and `integration/`, and move `product-docs/` to `docs/product-docs/`.
- Report completion:
    - **Feature area** and a one-line summary of what it now does.
    - **Endpoints built** — method + full path, grouped by module.
    - **Rules enforced** — each business rule and where it is enforced.
    - **Schema changes** — entities, enums, relationships added or changed.
    - **Background jobs built** — name, trigger type, and the flow each serves.
    - **API compatibility** — every change classified **additive**, **breaking**, or **deprecation**, with the client-side action required for anything not additive.
    - **Third-party services** introduced, and the setup guide written for each. **Infra requirements** introduced, and where they were documented in the infra docs.
    - **Files created or updated** — rules files, docs, seed, tests.
    - **Tests** — unit and e2e counts, and confirmation that prior areas' suites still pass.
    - **Curl verification** — confirmation the dev-server sweep in Step 9 passed, with anything it caught and fixed.
    - **Open questions or deferred items**, if any.

### Whole-phase mode

Builds every unit of the phase in one session — each feature area (first phase) or feature (later phases), in tracker order — through the same steps. My input moves to the start and the end instead of between units.

1. **Phase 0 first**, if the global schema design is not yet approved. It keeps its own approval, because every plan depends on it.
2. **One plan for the phase → wait for my approval.** Steps 1 and 2 for every unit, in one document: each unit's plan in full, then every question, new third-party service and infra requirement across the phase, collected in one place. The run covers `Ready` units in order and ends before the first that is not.
3. **Build each unit in order — Steps 3–8, 10 and 11 — in a fresh context.** Give each unit a subagent with its approved plan, told to read this skill and `.claude/rules/` first. If subagents are unavailable, build in this session and compact between units. Never build units in parallel: they share the schema, migrations, registers and seed.
4. **Tests gate each unit.** A unit is complete when its suites and every earlier unit's pass; it is then committed — one commit per unit, on one branch. A unit that fails, or meets anything its plan did not settle, stops the run with a report. The commits show where to resume.
5. **External setup, once.** After the last unit, list every setup guide and infra step the phase introduced, and offer to walk me through them — now or in a later session.
6. **One curl sweep** (Step 9) of every flow in the phase, against a freshly reseeded dev server, once setup is done. Bugs follow Step 9's rule.
7. **Mark every unit `Built`** (Step 12), write one report for the phase, and go to Section 6 with one PR.

---

## 6. Deploy & Staging Verification

Read `.claude/rules/ci-cd.md` before this section and Section 7 — it is path-scoped, so it may not be loaded yet.

Once Steps 1–12 are complete for the area:

1. **Branch and push.** Create a new branch off `origin/main` — **not** the current branch — and commit and push the area's changes to it. This is our standard PR procedure.
2. **Give me the link to create the PR.** Never create the PR yourself — I create it.
3. **On my side:** I create the PR; the CI pipeline runs; once it passes, I merge. Merging triggers the staging deploy in `ci-cd`, which migrates, deploys and smoke-tests staging (`{{STAGING_BASE_URL}}`).
4. **Reseed staging.** I reseed staging via the dev-tool reseed endpoint — it clears the staging datastores, then reloads the seed data. I may instead ask you to fire it.
5. **Wait for my confirmation** that the deploy and reseed succeeded — do not begin before it. Then run the **staging curl sweep**: the same verification as Step 9, against `{{STAGING_BASE_URL}}` using the seeded staging users — every flow in the area end to end, every background job via the dispatcher — and present it in the chat the same way as Step 9. Confirm behavior matches dev, so the area is proven in both environments before the client integrates it.

If the staging sweep finds a bug: do not fix it immediately — state the intended fix, confirm it satisfies the constraints in Section 3, and **wait for my approval**. The fix then goes through this same deploy path.

---

## 7. Production Promotion *(only once `{{PROD_STATUS}}` is launched)*

A passing staging sweep is not the promotion trigger. A build is promoted only after the client has integrated it against staging and confirmed it behaves correctly end to end.

1. **The verified commit is the promotion candidate.** The client's confirmation names the backend commit it verified — the health check shows it — and production gets exactly that commit's image, already built and tested, never a rebuild of `main`. Merging new work while a confirmation is outstanding is therefore safe: staging moves forward with backward-compatible changes, and production still deploys the commit that was verified.
2. **Trigger.** Production deploys only by `{{PROD_DEPLOY_TRIGGER}}`, never automatically on merge — the production pipeline in `ci-cd`, run with that commit. It migrates, deploys, smoke-tests, and rolls back on its own if the smoke test fails.
3. **Production release notes** — produce these before I trigger the deploy:
    - **Areas or features included** — every feature area or feature in this promotion not already in production.
    - **Migrations** — each one, its phase, what any backfill derives from and which rows it leaves NULL, and its expected lock behaviour.
    - **Environment variables** — every variable this release needs that production does not already carry, and where its production value comes from. Production holds its own live credentials, so a variable proven on staging is not configured in production. A missing one is a boot failure, not a degraded feature.
    - **Infra** — anything that must be provisioned in production before the deploy, per the infra docs.
    - **Background jobs newly active in production** — what each selects on its first automatic tick against production's existing records, and the bound placed on it.
    - **Client compatibility** — every breaking change and its deprecation state, and confirmation that nothing is contracted while a released client build still reads it.
    - **Rollback plan** — what rolling the code back does at this migration phase, and what it cannot undo.
4. **Dev-tool endpoints must be inert in production.** The reseed endpoint clears datastores and the job dispatcher fires jobs outside their trigger — both exist for dev and staging only. They must be gated by **environment**, so the routes do not register in production at all, with the token as a second lock rather than the only one. A token-protected endpoint is still a live route reachable by anyone holding the token, and the curl commands for it are written in `api-testing`. Confirm the gating before the first production deploy, and again whenever a dev-tool endpoint is added.
5. **Verify after deploy.** Once the pipeline's smoke test has passed, run a read-only pass against `{{PROD_BASE_URL}}` — health, auth, and the area's primary read endpoints. **Do not run the curl sweep against production**; it writes data. Staging is where behaviour is proven, production is where you confirm the deploy landed.

## 8. Definition of Done

A build is not done until all of the following are true:

- [ ]  Every flow in the area's `app-flow` file is fully served by endpoints — including system actions and role variations.
- [ ]  Every screen in the area's `screen-specs` file has the endpoints it needs, returning exactly the data it displays and accepting exactly the data it sends.
- [ ]  Every system action in the area's `app-flow` file is built — including those not triggered by a client request.
- [ ]  Every background job is state-derived, idempotent, dispatchable by its job name via the job-dispatcher dev-tool endpoint, and recorded in `background-jobs`.
- [ ]  Every rule in the area's `business-rules` file is enforced server-side.
- [ ]  Every endpoint is in `api-rbac` with correct per-role access. Inbound webhooks appear in both `api-rbac` and `background-jobs`, signature-verified.
- [ ]  Every API change is classified additive / breaking / deprecation.
- [ ]  If the client has shipped a store release: anything deprecated rather than deleted is in `deprecations`, and anything marked `removable` was removed in this build — code and register entry both.
- [ ]  Schema migrations follow Section 3's rules for the current production status, conforming to the Phase 0 global design, and `docs/schema.md` reflects them.
- [ ]  Server seed data lets every flow in the area be exercised end to end.
- [ ]  E2E factories updated, separate from the server seed.
- [ ]  Unit and e2e suites pass — this area's and every previously built area's.
- [ ]  Swagger, `api-docs`, and `api-testing` written for the area, including the background behavior section.
- [ ]  Every `pending` endpoint reference in the screen specs this build covers is replaced with `METHOD /path` and the action.
- [ ]  Setup guide written for any third-party service introduced, and the infra docs updated for any infra requirement introduced.
- [ ]  Later phases: phase entries promoted with every pointer cleared, the integration index created, and the feature folder deleted.
- [ ]  Marked `Built` — the feature area in `feature-areas` (first phase), or the feature in `implementation-order.md` (later phases). A new feature area's row advanced from `Draft`.
- [ ]  Curl-verified: every flow in the area exercised end to end against a freshly reseeded dev server (Step 9), and against staging after deploy and reseed (Section 6), with results presented in the chat.
- [ ]  If production is live: every migration phase-classified, any backfill derived only from data already held, and the change verified against a restored production snapshot.
- [ ]  If production is live: production release notes produced — migrations, new environment variables, infra, newly active jobs, client compatibility, rollback plan.
- [ ]  Dev-tool endpoints (reseed, job dispatcher) disabled by environment in production.

If any box cannot be ticked, say which and why rather than reporting the area complete.

---

## 9. Opening the session

Before Step 1, in a few lines:

1. **State the phase and the mode** — one at a time (and which feature area or feature) or whole phase. If I haven't said, use one at a time.
2. **State the project values** you read from `CLAUDE.md` that change what you do: production status, client type, and client release status. Ask for any that are missing.
3. **Say whether Phase 0 is done.** If the global schema design has not been approved yet, we start there instead.

Then go to Step 1. Do not summarise the workflow back to me — start it.
