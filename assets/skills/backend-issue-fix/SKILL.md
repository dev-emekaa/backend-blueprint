---
name: backend-issue-fix
description: Resolve backend or API issues — found by me, by the client devs, or by anyone else — through validation, doc updates, code fixes, tests, curl verification on dev and staging, and a client handoff. Use for bugs, wrong behaviour and small corrections to built endpoints.
---

# Backend Issue Fix

## 1. Project Configuration

Read these from the project's `CLAUDE.md`. If a value isn't recorded there, ask me for it once and offer to add it, rather than guessing or asking again each session.

| Key | What it is |
| --- | --- |
| **Project name** | The project this backend serves. |
| **Stack / framework** | e.g. NestJS, Django, Rails, Express. |
| **Repo layout note** | Monorepo or other structure worth knowing. |
| **Rules directory** | Where always-loaded rules live, e.g. `.claude/rules/`. |
| **Docs directory** | Where the docs live, e.g. `docs/`. Referred to below as `{{DOCS_DIR}}`. |
| **Datastores** | e.g. Postgres + Redis. |
| **Reset/reseed command** | How to clear and reload the dev datastores. |
| **Dev server command** | How to start the dev server. |
| **Local base URL** | For the dev-server curl sweep. |
| **Staging base URL** | For the staging curl sweep. |
| **Production status** | Not yet launched / launched and serving real users. A mode switch for schema changes. |
| **Production base URL** | Only once launched. |
| **Production deploy trigger** | e.g. the Deploy Production workflow, run manually on the commit the client verified. |
| **Client release status** | First store release shipped or not *(store-distributed or installed clients only)*. |
| **Minimum-supported-version endpoint** | *(store-distributed or installed clients only)*. |
| **Infra / deployment docs** | Where the infra docs live, e.g. `docs/infra/`. Referred to below as `{{INFRA_DOCS_PATH}}`. |
| **Client(s) integrating** | e.g. mobile app, web dashboard. Decides how a breaking change is handled. |
| **Client team** | Who integrates, and where they work from. |
| **Scope in play now** | Which feature areas are live for this session. |
| **Scope explicitly deferred** | Which are not. |

Throughout this skill, `{{PROD_STATUS}}`, `{{CLIENT_TYPE}}`, `{{LOCAL_BASE_URL}}` and the rest refer to these values.

---

## 2. Project Context

- We are building the **`{{PROJECT_NAME}}` backend**, deployed to staging at `{{STAGING_BASE_URL}}`.
- Infrastructure and deployment are documented in `{{INFRA_DOCS_PATH}}`. Consult it whenever you need to understand the environment setup.
- The **`{{CLIENT_TYPE}}`** integrates these endpoints from `{{CLIENT_REPO_NOTE}}`.
- All **`{{IN_SCOPE_AREAS}}`** have already been built through the backend build process.
- We are **not** building **`{{OUT_OF_SCOPE_AREAS}}`** yet. First we must resolve the outstanding issues in the in-scope areas so they are solid before the client integrates them.

I will send you a list of issues. For each one, follow the per-issue workflow in Section 4.

### 2.1 — Engineering Constraints

These apply to **every** change you make — the Step 3 fixes, any new endpoints, and any fix that comes out of verification testing.

**Standards.** Follow `coding-standards`, `security`, `testing` and `tech-stack` as written — plus `ai-services` where a fix touches code that calls a model, and `ci-cd` where it touches the pipelines or deploy configuration. This skill does not restate them.

**Access control and data exposure**

- Validate every request payload/DTO. No unvalidated input reaches business logic.
- Return only the fields the screen/UI specs call for. Never leak internal fields, credentials, or other users' data in a response.

**Access control has two parts. Decide both, separately.**

**1. Role access — who may call this endpoint.** The **endpoint & access-control registry** is authoritative for endpoints already built — confirm every endpoint's guard/role matches its entry. For anything new or changed, the sources state it directly: the **screen specs** list the roles that can access each screen, the **flows doc** states the role each flow belongs to, the **business rules** gate specific actions by role, and the `prd` defines the roles and their permissions — including the shared variants of each. **A role named in prose counts as a grant** — no formal permission table is required. Where the business rules restrict something a flow or screen reads as permitted, **the restriction wins**. Update the registry for any endpoint that is new or whose access changed.

**2. Record scope — which records that role may touch.** Scope is usually implied by context rather than stated outright. Determine it in this order:

1. **Start at the narrowest scope:** the user's own records.
2. **Widen only where a source shows wider access.** Any of the three can establish it: the flows doc showing a flow that acts on records belonging to others, the business rules stating what a role may reach, or the screen specs describing a screen that displays other users' records. Whichever states it most specifically is the specification — implement what it shows, and don't narrow it because it wasn't phrased as a permission.
    - **On contradiction:** the business rules win, whether they widen or restrict. If the flows doc and screen specs disagree on scope and the business rules are silent, treat it as two defensible readings — raise it with me rather than picking one.
3. **Bound the widening.** Wider access is almost never global. Identify what limits it — the group, organization, or other boundary the user belongs to or administers — and enforce that boundary **in the query itself**, not after fetching.
4. **Check the result against the registry.** If the fix changes an endpoint's scope, update its entry with the condition and the source it came from, and flag it as client-visible in the Step 7 report.

**Stop and ask only when a scope has two defensible readings that expose different data.**

**Correctness**

- For each business rule you implement or change, state which rule in the **business rules** doc it enforces, and where in the code it is enforced.
- Enforce rules server-side. Never rely on the client to prevent an invalid action.

**Schema changes**

- Conform to the schema conventions already established in the codebase — key strategy, soft-delete, audit/timestamp, ownership chains. A fix is not the place to change them.
- Migrations must be safe to apply to an environment with existing data, and `{{PROD_STATUS}}` sets the bar. **Before launch:** staging is reseeded at will and a destructive migration is acceptable where it is the cleanest fix. **After launch:** every schema change follows **expand → backfill → migrate the code → contract**, one phase per production deploy, the next merging only once the previous one is live in production. Expand means add, never alter — new columns nullable, a rename is an add plus a later drop, a type change is a new column rather than a cast. Backfill only where the value already exists in another shape (a rename, a type change, a split column, a value derivable from data the record already carries), as a single re-runnable statement scoped `WHERE <column> IS NULL`, shipped as its own migration file, or as a batched background job where it could outlast the deploy's migration step — never as an endpoint, never run by hand. **Never fabricate a value for rows that never supplied one**, and never add a NOT NULL constraint old rows could only satisfy by invention; leave the column nullable, document that NULL means *not collected*, and handle it at each read site. Code rolls back; schema rolls forward — a down migration does not restore dropped data, so expand/contract is the rollback plan.
- A reseeded staging does not test a migration: it empties the table before the migration runs, then refills it with rows that already carry the new column. Once production is live, verify each migration against a restored production snapshot before promoting it, and state its expected lock behaviour at production volume.
- Anything touching identity, ownership, tenancy, primary keys, or aggregate boundaries is not a call to make inside a bug fix. **Raise it with me first.**

**Scope and consistency**

- Follow the existing patterns and conventions of the module you are working in. Do not introduce a new pattern for something the codebase already solves.
- Keep diffs minimal and surgical. Touch only files related to the issue being resolved — no drive-by refactors.
- Do not add dependencies or external services outside `tech-stack` without asking me first. If a fix cannot be made without one — or if a service we already use cannot do what the fix needs — say which requirement it fails and wait for my decision. A cheaper or more modern alternative is not a reason to swap a working integration during a fix.
- Flag uncertainty and ask rather than guessing at intent.

**Environment configuration and infra**

- If a fix changes anything about how an environment is provisioned, configured, or deployed — a new env variable a deployed environment must carry, a change to the deployment steps, a new or reconfigured infra service — update the corresponding doc in `{{INFRA_DOCS_PATH}}` so the environments can still be set up start to finish from those docs alone.
- If a fix requires new console-side setup on my part — provider dashboard steps, infra provisioning, credential generation — **offer to walk me through it live**, one step at a time against the updated guide, waiting for my confirmation before each next step, folding any console discrepancy I report back into the guide, with secrets going directly into `.env` (never the chat) and the result verified by exercising the integration. If I decline, the updated guide stands on its own.
- Third-party credentials follow the project's established convention: local dev and staging share the same external accounts and env values; production has its own separate live credentials. A fix must not break that separation.

**Performance**

- No N+1 queries in list endpoints. Flag any new query placed inside a loop.

**Background work — system actions that aren't request-triggered**

Some fixes touch work that no client request triggers: expiries, reminders, scheduled settlement, cleanup, third-party webhook handlers. These are as much a part of a flow as its endpoints, and are easy to miss because no screen calls them.

- When validating an issue, check whether the failing behavior belongs to a background job rather than an endpoint. A flow that "doesn't complete" is often a job that never ran, ran twice, or ran against the wrong records.
- Any job you build or modify must be **state-derived** (query records whose condition has passed, never records created exactly N hours ago), **idempotent** (running twice is a no-op), hold **no business logic in the handler** (it calls a service method), and be **dispatchable by its job name** through the single protected job-dispatcher dev-tool endpoint, so it can be curl-verified and e2e-tested. The dispatcher fails loudly on an unknown job name and returns what the run did. Inbound webhooks are excluded from the dispatcher — they are signature-verified endpoints exercised through their own path.
- Record every job added, modified, or removed in the **background jobs registry**, with its job name (the dispatcher key), trigger type, trigger detail (schedule, event, or delay basis), selection criteria (the state it queries for), idempotency key, and retry/failure behavior.
- If a fix introduces a new job, or widens an existing job's selection criteria, against a live production, its next tick matches every record that has built up in the newly targeted state — nothing has ever drained them, and staging cannot show this since its data is a seed file. State what it will select and, if the volume warrants, bound it in the job's own query: a batch limit where the backlog should be processed gradually, or a permanent cutoff where it should not be processed at all. Both live in the code and need no action once deployed.

**Inbound webhooks are registered twice.** A webhook handler is both a real endpoint and system-triggered work, so it gets an entry in **both** registries, cross-referenced:

- In the endpoint & access-control registry, with access expressed as *signature-verified third party* rather than a user role. An endpoint no screen calls and no role owns is the one most likely to end up unauthenticated — listing it is what prevents that.
- In the **background jobs registry**, with its provider, callback path, idempotency key, and retry behavior.

Verify the signature on every inbound call, treat the payload as untrusted input, expect duplicate deliveries, and never trust payload contents over your own persisted state.

**API compatibility**

Classify every change you make to an endpoint the client already integrates:

- **Additive (safe):** new endpoint, new optional request field, new response field, new enum value.
- **Breaking:** removing or renaming a field or endpoint, changing a type, making an optional field required, changing status or error codes, tightening validation, changing default pagination or sort.

How a breaking change is handled depends on the client type (`{{CLIENT_TYPE}}`):

- **Store-distributed or installed clients** (mobile app, desktop app, etc.): **before the client's first store release**, breaking changes are acceptable — they just have to reach the handoff message. **After it**, a breaking change strands users on older builds who cannot update instantly. Take the deprecation path instead: add the new field while keeping the old one populated, bridging it inside the existing endpoint rather than duplicating the endpoint where that is possible, and record the old one in the **deprecations register**, status `deprecated`. Store approval is not the removal gate — a release being approved means it is available, not installed. The old shape goes only once the minimum supported version for that platform has been raised above the builds that read it and requests from those builds have stopped, which belongs in the next build session's plan (a feature area in the first phase, a feature in later phases) rather than a fix. If a fix cannot be made without a breaking change, **raise it with me before implementing it** — that is a release-planning decision, not a bug-fix decision.
- **Web-only clients**: no stranded builds, so no deprecation ceremony — but a breaking change is a *coordination* requirement: it must ship in step with the client deploy, or the backend must briefly tolerate both shapes across the deploy window (long-lived open tabs still call the old shape until refreshed). Flag every breaking change in the handoff message either way.

### 2.2 — Documentation & Rules-File Writing Rules

These apply to **every** rules file and doc file you touch, in Step 2 and Step 6 alike — including the infra docs in `{{INFRA_DOCS_PATH}}` and the third-party setup guides.

- **Only what belongs.** Do not add content to a file just because a fix happened. If it does not fit that file's purpose, it does not go in.
- **Correct location, natural fit.** Insert changes where they belong in the existing narrative, so the file reads as though it was always written that way — not as an appended patch note.
- **Follow the file's existing structure and format.** Match its heading levels, section order, table layouts, naming conventions, and tone. Do not restructure a file to accommodate an edit.
- **Docs never mention issues, resolutions or decisions.** Write the corrected behaviour as though it had always been that way. The issue, the fix and the reasoning belong in the Step 7 report and the handoff message, never in a doc.
- **Write plainly.** These files are read by the client developers and others, not just the backend developer. Default to clear, non-technical language.
    - **Exception:** files that are technical by design — the API doc, the API testing doc, the access-control registry, the infra docs, and similar — stay technical. Do not dumb these down.
- **Remove only what is now obsolete.** Do not delete or rewrite content the current fixes did not affect.

---

## 3. Reference — How the Backend Is Built

Endpoints and business logic are built in batches. In the first phase, **one feature area at a time**; in every later phase, **one feature at a time**. For each build, what gets built is determined by the documents below. Every fix you make must stay consistent with them.

> Locations come from the `CLAUDE.md` documentation map. Placeholders remain only where a file is genuinely project-specific.
> 

| Role | File | Purpose |
| --- | --- | --- |
| **Flows doc** | `app-flow-{{feature-area}}` | All user-facing flows for the feature area: user and system actions per flow, flow logic, state machines, entry points, and cross-cutting flows. |
| **Business rules doc** | `business-rules-{{feature-area}}` | Core rules, info, and context the feature area must follow and that the business logic must enforce. |
| **Screen/UI specs** | `screen-specs-{{feature-area}}` | All backend-relevant screens: the data each screen sends to the backend, the data it displays from the backend, and the actions performed there. Ensures endpoints have the correct request/response shapes and behavior each screen needs. |
| **Backend architecture** | `backend-architecture` | The module index, and the cross-module rules: which module may call which, in which direction, and when it is a direct call rather than a domain event. Consulted whenever a fix wires one module to another — a direct service call can reach behaviour without passing the guard that protects it through its own endpoint. Never updated by a fix: a fix that needs a new module is raised first, not made. |
| **Endpoint & access-control registry** | `api-rbac` | The complete list of every endpoint in the codebase, organized by backend module, with access control and permissions. Updated whenever an endpoint is added, modified, or deleted. |
| **Background jobs registry** | `background-jobs` | The complete list of every background job in the codebase — scheduled, event-driven, delayed, and inbound-webhook handlers — organized by module, with each job's name (the dispatcher key), trigger, selection criteria, idempotency key, and retry/failure behavior. Updated whenever a job is added, modified, or removed. |
| **Deprecations register** | `deprecations` *(store-distributed or installed clients only)* | Everything kept alive only so released client builds keep working — old fields, replaced endpoints, retired enum values, schema columns awaiting their contract phase — each with what replaces it, the date it was deprecated, and its status: `deprecated` while released builds may still read it, `removable` once none can reach the API. Entries are deleted when the thing itself is; git holds the history. Updated whenever something is deprecated rather than deleted. Clearing entries and removing the thing itself belongs in the next build session's plan, not a fix. |
| **Seed data** | The server seed file | Seed users and data for easily testing all built feature areas' flows and endpoints. Must be updated every time a feature area is built or updated. |
| **API doc** | `api-docs-{{feature-area}}` | The client dev's **primary integration reference**. Organized by feature area; contains all endpoints needed by that area's flows and screens, plus everything needed to integrate them properly. |
| **API testing doc** | `api-testing-{{feature-area}}` | Guides the backend or client dev in testing each feature area's endpoints and flows, against either the local base URL or the staging base URL. |
| **Infra docs** | `{{INFRA_DOCS_PATH}}` (e.g. `docs/infra/`) | Provisioning, configuration, and deployment of the staging and production environments. Consulted to understand the environment setup; updated whenever a fix changes it. |
| **External-integration guides** | `{{DOCS_DIR}}external-integrations/` | One setup guide per third-party service, covering provider-side setup, credentials, and env variables. Updated if a fix changes an integration's setup or configuration. |

**Why the flows doc, business rules, and screen specs matter together:** they guarantee every flow and every screen in a feature area gets the right endpoints in the right shapes — so when the client integrates a feature area, every flow and screen integrates exactly as intended.

**Who uses seed data:**

- The backend dev, in the local/dev environment.
- The client dev, to test integrated feature areas without manually registering users or walking through prerequisite flows. Against staging, they can flush and reseed the datastores with default seed data via the **dev-tool endpoints**.

Seed users and data exist so any flow or endpoint can be tested without building up state from scratch with brand-new users.

---

## 4. Per-Issue Workflow

Apply these seven steps to **every** issue I send.

### Step 1 — Validate the issue

1. Scan the codebase to confirm it is a valid issue before acting.
2. **Also** scan it against the relevant **business rules, flows doc, and screen specs** that the issue touches or involves, to see whether the issue aligns with them and the backend simply failed to implement it correctly.
3. **If the issue touches an external integration**, also read that service's setup guide in `{{DOCS_DIR}}external-integrations/` — the failure may be provider-side configuration drift (an unsubscribed webhook event, a wrong callback URL, a missing console setting) rather than a code defect, and the guide is the record of how the provider side is meant to be configured.
4. Then decide:
    - **Not a legitimate backend issue** → tell me it was a confusion, not a real backend issue. Do not act on it.
    - **A legitimate backend issue** → proceed to Step 2.
    - **A request to use a different approach from the one in the relevant rules files** *and it is logically sound* → present it to me and **request my permission** before proceeding, since accepting it will also replace the current documented approach.

### Step 2 — Update the affected docs

Update any docs the fix touches — flows doc, business rules, screen specs, endpoint registry, background jobs registry, PRD, etc.

Only update a file if the change **genuinely belongs there**. Follow the writing rules in Section 2.2.

**If a canonical entry you change carries a `Planned Phase {n}` pointer**, check the phase entry it points at against the fix and tell me if they now conflict. Do not edit the phase entry yourself — that is a phase-review decision.

### Step 3 — Fix the codebase

**First, write a test that reproduces the issue** — at the lowest layer that can, usually e2e — and run it to watch it fail. A fix is proven only by a test that failed without it.

Then correct the business logic and endpoints. This may mean **building new endpoints or deleting existing ones** if that is what the fix requires.

Every updated or newly built endpoint must be in line with:

- the **up-to-date business rules** for the affected feature area,
- the **flows doc** (all user-facing flows in that feature area),
- the **screen specs** (specifications of all screens in that feature area).

This is what guarantees that when the client UI is integrated, every endpoint has the right shape and performs the right action in the way the screens and flows expect.

### Step 4 — Update seed data

- Remove obsolete seed data.
- Ensure the seed file contains everything needed to test **all** flows and endpoints for each affected feature area.

### Step 5 — Update tests

- **The reproducing test from Step 3** — now passing, and kept in the suite.
- **Unit tests** — covering business logic.
- **E2E tests** — for every affected flow: its happy paths per role, every access denial its registry entries imply (wrong role and out-of-scope records), every business-rule rejection the client must handle, and invalid state transitions. One representative validation failure per endpoint; the permutation matrix stays in unit tests.
- Ensure **both suites pass cleanly**.

### Step 6 — Update documentation

- **API schema documentation** (e.g. Swagger/OpenAPI).
- **API doc** for each affected feature area (the client devs' primary integration reference).
- **API testing doc** for each affected feature area.
- **Infra docs and external-integration guides** — only if the fix changed environment setup, deployment, or a third-party integration's configuration.

For all docs: follow the writing rules in Section 2.2.

### Step 7 — Report completion

Close each issue with a short checklist so the workflow stays honored across the session and I have an audit trail. Keep it to a few lines:

- **Issue** — one-line restatement, and the **feature area** it belongs to.
- **Steps 1–6** — which were done, and which were **N/A** and why (e.g. "Step 4 N/A — no seed data affected").
- **Docs touched** — each file, and one line on why the change belonged there.
- **Endpoints affected** — method + full path, tagged `FIXED` / `NEW` / `UPDATED` / `REMOVED`.
- **Client impact** — anything already integrated that this breaks or changes, classified **additive** / **breaking** / **deprecation**, with the client-side action required for anything not additive. For a deprecation, name the deprecations register entry added. "None" if none.
- **Production impact** — if production is live: migrations and their phase, what any backfill derives from, new environment variables, and any job whose next production run changes what it selects. "None" if none.
- **Background jobs** touched, if any — name, trigger type, and what changed.

These entries are the source material for the handoff message in Section 8.1 — build it from them rather than reconstructing from memory at the end.

---

## 5. Phase A — Verification in the Local/Dev Environment

Once **all** issues are resolved, do not make me test manually. You verify everything yourself with curl.

**Procedure:**

1. Reset and reseed the dev datastores (`{{DATASTORES}}`) — via `{{RESEED_COMMAND}}`, or any other reliable way to get them up, running, and reseeded.
2. Familiarize yourself with the **seed users and data**; use them to run the tests efficiently.
3. Start the dev server (`{{DEV_SERVER_COMMAND}}`).
4. Run curl tests against `{{LOCAL_BASE_URL}}` covering:
    - every endpoint touched by the resolved issues,
    - every flow those endpoints are involved in,
    - every other endpoint those flows depend on,
    - every background job those flows depend on, dispatched by job name via the job-dispatcher dev-tool endpoint — including a second dispatch, confirming the second run changes nothing.
5. For each endpoint, confirm that its **request shape → response result → intended action** all work exactly as expected and are in line with the **flows doc, business rules, and screen specs** of the feature area it belongs to.
6. **Present the sweep in the chat, flow by flow:** each call's request — method, path and body — and its response — status and body, with tokens shortened and long lists trimmed — then whether the flow passed. End with a list of everything that failed, so I can review it with an extra pair of eyes.

**Steps that need a person.** Automate third-party steps wherever the provider allows it — test modes, test cards, CLI-triggered webhooks. Where a step genuinely needs me — browser consent, a code sent to a real device — pause there, tell me exactly what to do, and continue once I confirm. Never skip the step, or mark the flow passed without it.

**If any bug or logic issue is found:**

- Do **not** fix it immediately.
- Tell me how you intend to fix it, and confirm the proposed fix satisfies the engineering constraints in Section 2.1.
- **Wait for my approval**, then implement the fix.

Proceed to Phase B **only if** everything works as expected with no outstanding issues.

---

## 6. Phase B — Branch, Commit, PR

Read `.claude/rules/ci-cd.md` before this phase and Phase E — it is path-scoped, so it may not be loaded yet.

1. Create a **new branch off `origin/main`** — **not** the current branch. This is our standard PR procedure.
2. Commit the changes to that branch.
3. Give me the **link to create the PR**.

Then, on my side:

- I create the PR.
- The **CI pipeline** runs; once it passes, I merge the PR.
- Merging triggers the **staging deploy** in `ci-cd`, which migrates, deploys and smoke-tests staging (`{{STAGING_BASE_URL}}`).
- I reseed staging using the **dev-tool reseed endpoint** (clears the staging datastores, then reseeds).

---

## 7. Phase C — Verification on Staging

After I confirm the staging reseed succeeded:

- Run the **same curl tests** against `{{STAGING_BASE_URL}}` — all endpoints and flows touched by the resolved issues, plus every endpoint and flow involved with them.
- Use the seeded staging users and data.
- Confirm everything behaves identically to dev, so we know it works as expected in **both** environments — local/dev and the staging environment the client integrates against.
- Present the sweep in the chat the same way as on dev.

Afterwards, I will reseed staging again to return it to a stable state for the client developers to continue integration.

---

## 8. Phase D — Final Deliverables

When everything above is complete, produce the two deliverables below.

### 8.1 — Client Handoff Message

A single message addressed to **both** the `{{CLIENT_TEAM_NAME}}` developers and the AI assistant helping them integrate. Both will read it, so it must be readable by a person and unambiguous to a model.

**Structure it in exactly these sections:**

1. **Summary** — one short paragraph: all backend issues are resolved, verified in dev and on staging, and deployed to `{{STAGING_BASE_URL}}`. Note at a high level what areas changed.
2. **What changed — by feature area** — group all items under their feature area. For each item give:
    - a **tag**: `FIXED` / `NEW` / `UPDATED` / `REMOVED`
    - what was wrong or missing before, in one line
    - what it does now / how it behaves, in one or two lines
    - the affected **endpoint(s) by method and full path**
3. **Action required on the client side** — anything already integrated that must now change, grouped **Breaking** (must be handled before the next release) and **Deprecated** (still works, has a removal target): removed endpoints, renamed paths, changed status codes, changed behavior, new required calls or ordering. Also note any state that now changes on its own in the background — what causes it and how the client finds out. If there is nothing, say so explicitly.
4. **Reference files updated** — the list described below.

**Rules for the message:**

- **Do not include request or response shapes**, payload examples, or field lists. The API doc already carries all of that and is the integration reference — point them there instead.
- **Do not include backend internals**: no source file paths, class or service names, migrations, commit hashes, branch names, or test details.
- Reference every endpoint by **method + full path**.
- Describe changes in terms of **what the client will now observe** when it calls the endpoint, not how the backend implements it.
- Plain language, no backend jargon. Concise — every line earns its place.
- Neat and consistently formatted: same tag style, same ordering, same level of detail for every item.

**The "Reference files updated" section at the bottom must:**

- List every doc file updated during this session that is relevant to the client side, split into two groups:
    - **Integration references** — the API doc and API testing doc (what to build against and test with).
    - **Context references** — the flows doc, business rules, screen specs, and any others (context on the app's flows, rules, and screens, and how the backend behaves).
- Give a one-line note per file on what changed in it and why it matters to them.
- State clearly that **these files have already been updated on the `main` branch of the client codebase** — the outdated copies were replaced with the current backend versions — so they should pull `main` and work from those.

### 8.2 — File list for me

Separately from the handoff message, give me a plain checklist of **every** doc file updated or touched across this session that is relevant to the client codebase, **with its path in the backend repo**, so I can copy each one over and replace the outdated version in the client repo's `main` branch before I hand the message to the client developers.

---

## 9. Phase E — Production Promotion *(only once `{{PROD_STATUS}}` is launched)*

A passing staging sweep is not the promotion trigger. Resolved issues are promoted only after the client has integrated against staging and confirmed everything behaves correctly.

1. **The verified commit is the promotion candidate.** The client's confirmation names the backend commit it verified — the health check shows it — and production gets exactly that commit's image, already built and tested, never a rebuild of `main`. Merging new work while a confirmation is outstanding is therefore safe: staging moves forward with backward-compatible changes, and production still deploys the commit that was verified.
2. **Trigger.** Production deploys only by `{{PROD_DEPLOY_TRIGGER}}`, never automatically on merge — the production pipeline in `ci-cd`, run with that commit. It migrates, deploys, smoke-tests, and rolls back on its own if the smoke test fails.
3. **Production release notes** — produce these before I trigger the deploy, built from the Step 7 entries:
    - **Issues included** — every resolved issue in this promotion, by feature area.
    - **Migrations** — each one, its phase, what any backfill derives from and which rows it leaves NULL, and its expected lock behaviour.
    - **Environment variables** — every variable this release needs that production does not already carry, and where its production value comes from. Production holds its own live credentials, so a variable proven on staging is not configured in production. A missing one is a boot failure, not a degraded feature.
    - **Infra** — anything that must be provisioned in production before the deploy, per the infra docs.
    - **Background jobs newly active or newly widened in production** — what each selects on its next automatic tick against production's existing records, and the bound placed on it.
    - **Client compatibility** — every breaking change and its deprecation state, and confirmation that nothing is removed while a released client build still reads it.
    - **Rollback plan** — what rolling the code back does at this migration phase, and what it cannot undo.
4. **Dev-tool endpoints must be inert in production.** The reseed endpoint clears datastores and the job dispatcher fires jobs outside their trigger — both exist for dev and staging only. They must be gated by **environment**, so the routes do not register in production at all, with the token as a second lock rather than the only one. A token-protected endpoint is still a live route reachable by anyone holding the token, and the curl commands for it are written in the API testing doc. Confirm the gating before the first production deploy, and again whenever a dev-tool endpoint is added.
5. **Verify after deploy.** Once the pipeline's smoke test has passed, run a read-only pass against `{{PROD_BASE_URL}}` — health, auth, and the primary read endpoints of the affected areas. **Do not run the curl sweep against production**; it writes data. Staging is where behaviour is proven, production is where you confirm the deploy landed.

A bug found in live production is still fixed through the full workflow above — validated, fixed, tested, and verified on staging before it goes anywhere near production. Urgency is not a reason to skip a step. What urgency does change is what rides along: production deploys the fix's own commit, so anything merged after it stays out — and the release notes list anything merged before it that production does not have yet.

---

## 10. Opening the session

Before the first issue, in a few lines:

1. **State the project values** you read from `CLAUDE.md` that change what you do: production status, client type, client release status, and the scope in play. Ask for any that are missing.
2. **Ask for the issues** if I haven't already given them. Some I found myself; some the client developers found while integrating and handed to me to resolve.

Then work through them one at a time per Section 4. Do not summarise the workflow back to me — start it.
