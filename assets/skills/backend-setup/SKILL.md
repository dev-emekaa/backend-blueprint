---
name: backend-setup
description: Set up a backend's foundation once, before the first feature area is built — the project scaffold, a local environment with separate test datastores, the test harness, health and dev-tool endpoints, the Dockerfile, and the CI/CD pipelines. Use at the start of a backend project, or to bring an existing one up to the foundation the build skills assume.
---

# Backend Setup

Builds the foundation every feature-area build stands on. It runs once per project, before the first `/backend-build`. It needs none of the product docs, so it can run while they are still being written.

It builds no features — not even authentication, which is a feature area built from its own docs under the `security` rules. It adds only what every backend needs. A service only some features use — object storage, payments, real-time, AI — is added by the first build that needs it.

## Read first

- **The rules in `.claude/rules/`:** `tech-stack`, `coding-standards`, `security`, `testing` and `ci-cd`. They define what this skill builds, and it does not restate them.
- **`CLAUDE.md`:** the project name, the audiences and clients, and the project configuration — the hosting choice above all. If hosting is not recorded, ask once: Railway (default) or AWS.

If the repository already has code, take stock first. Keep what meets the rules, add only what is missing, and list anything that conflicts with the rules for me to decide. Never rebuild working pieces unasked.

## Step 1 — Plan → **wait for my approval**

State what exists, what will be created, the processes the project runs (api, worker, and a scheduler only where `tech-stack` requires one), and anything the rules leave to this project. Check the current stable version of each tool in `tech-stack` rather than relying on memory.

## Step 2 — Scaffold the application

- **The project per `tech-stack`**, with strict typing, lint, format and type-check configuration, and a committed lockfile.
- **Configuration validated at boot**, and an `.env.example` naming every variable, with a comment for each and no secret values.
- **The application baseline** that `coding-standards` and `security` require:
  - structured logging with a correlation id per request
  - global input validation that rejects unknown fields
  - error handling that leaks nothing
  - security headers, and CORS from an allowlist
  - trusted-proxy configuration, and a body size limit
  - a global Redis-backed rate limiter
  - error tracking that scrubs before sending
  - OpenAPI docs that are off in production
- **The shared infrastructure modules:**
  - the database connection
  - the Redis client
  - the mail service — one interface over SMTP, pointed at Mailpit locally
  - the job queue, with the worker entry point (and the scheduler's, where the stack has one)
- **No domain modules yet.** The module index in `backend-architecture` is written by the build's Phase 0, from the schema.

## Step 3 — Local environment

- **Docker Compose** runs dev PostgreSQL and Redis, a **separate** test PostgreSQL and Redis, and Mailpit (SMTP 1025, web and API 8025). Only the dev datastores keep their data between restarts.
- **One command each** to:
  - start the services
  - run the dev server, and the worker
  - apply migrations
  - reseed the dev datastores
  - run unit tests
  - run e2e tests, which reset the test database first
  - lint, and type-check
- **Record in `CLAUDE.md`** the dev server command, the reseed command, the local base URL and the datastores, so later sessions stop asking.

## Step 4 — Data

- **Wire the ORM and its migration tool** as `coding-standards` describes. The schema itself comes from the build's Phase 0, so create no tables beyond what the foundation needs. The app connects with its least-privilege database role; migrations run with the separate migration role.
- **The seed script and reseed command.** Reseeding clears the dev datastores and loads the seed; each build adds its own data to the seed.
- **The e2e factory pattern**, ready for the first build's entities.

## Step 5 — Test harness

- **Unit and e2e set up as `coding-standards` describes.** The e2e suite boots the app against the test datastores and rebuilds the test database by running the migrations.
- **An e2e helper that reads the latest email for an address from Mailpit's API.**
- **A smoke suite** that reads its target base URL from the environment. Until sign-in exists it checks the health endpoint only; the build that delivers authentication adds the low-privilege smoke account and its credentials to the deploy environments.
- **One working test of each kind** against the foundation — the health endpoint covers e2e and smoke.

## Step 6 — Health and dev-tool endpoints

- **`GET /health`** reports that the app is up, the database is reachable, and which commit is running. It reveals nothing else. The commit is baked into the image at build time.
- **A dev-tools module** with the two endpoints the build process depends on:
  - **Reseed** — clears the datastores and reloads the seed.
  - **Job dispatcher** — fires a registered job by name, fails loudly on an unknown name, and returns what the run changed.

  Both routes register only when the environment is not production, with a token as a second lock. An e2e test boots the app in production mode and proves the routes do not exist.
- **Record all three endpoints in `api-rbac`:** health as `PUBLIC`, and the two dev tools as dev-tool endpoints with their environment gating stated.

## Step 7 — Container and pipelines

- **The Dockerfile** builds the image that staging and production run. The pipelines build it from this file; local dev and the CI tests run the app directly, against Compose or the workflow's service containers.
  - Multi-stage, with a pinned base image. The final image holds no dev dependencies, build tools or secrets, and runs as a non-root user.
  - Takes the commit SHA as a build argument, so the health check can report which commit is running.
  - One image runs every process — api, worker, scheduler — each with its own start command.
  - A `.dockerignore` keeps out `.env`, `.git` and anything else the image does not need.
- **The three GitHub Actions workflows `ci-cd` defines:**
  - PR checks
  - the staging deploy — serialized in merge order
  - the production deploy — with its release-owner check, SHA-only `commit` input, automatic rollback on a failed smoke test, and release tags
- **For the deploy steps**, check the host's current documentation for deploying a specific image tag — it changes over time.
- **Dependabot or Renovate configuration.**

## Step 8 — Infra guide

Write `docs/infra/infra-setup.md`: every step only I can do, numbered, so staging and production can be set up start to finish by following it.

- **On the host, for staging and production:**
  - one service per process, deployed from the GHCR image
  - PostgreSQL and Redis on the private network only, with any public database proxy the host adds turned off, and Redis requiring a password
  - two database roles, each with its own connection URL:
    - **the migration role** owns the schema and may change it. Only the migration step uses it.
    - **the app role** reads and writes rows — select, insert, update, delete, and use of sequences — but cannot change the schema. Default privileges, granted for tables the migration role creates, extend this to every future table. On staging it also needs `TRUNCATE` for the reseed endpoint; production never gets it.
  - the pre-deploy migration step, run with the migration role's URL; the running app gets only the app role's URL
  - the host's GitHub auto-deploy turned off
  - access to the registry
  - each variable from `.env.example`, with production values separate
- **On GitHub:**
  - branch protection, with PR checks required
  - squash merges
  - choose the release owners — the GitHub users allowed to start a production deploy; their usernames go into the production workflow
  - the `staging` and `production` environments, restricted to `main` with administrator bypass off, holding the deploy secrets
  - secret scanning with push protection
- **Elsewhere:**
  - the Sentry projects, with an uptime monitor on `/health`
  - the email provider, with SPF, DKIM and DMARC on the sending domain
  - DNS

Then **offer to walk me through it live.** Once staging exists, record its base URL and the production deploy trigger in `CLAUDE.md`.

## Step 9 — Verify and report

1. **Verify from a clean clone:**
   - start the services, migrate, reseed and start the dev server
   - `curl /health`
   - lint, type checks, and the unit, e2e and smoke suites (the smoke suite against local) all pass
   - the image builds and starts
2. **Boot in production mode** and confirm the dev-tool routes and docs are absent.
3. **Report:**
   - what was created
   - the commands
   - what remains for me, which is the infra guide
   - any open decisions
4. **Deliver it as a PR.** Create a branch off `origin/main`, push to it, and give me the link to create the PR. Never create the PR yourself. The PR checks workflow added here runs on that PR.
