---
paths:
  - ".github/**"
  - "Dockerfile"
  - "**/Dockerfile*"
  - ".dockerignore"
  - "docker-compose*.yml"
  - "docker-compose*.yaml"
  - "compose*.yml"
  - "compose*.yaml"
  - "railway.json"
  - "railway.toml"
---

# CI/CD

How code moves from a pull request to production. Stack-agnostic: the checks, test runners and package manager are named in `tech-stack`; what each test layer proves is in `testing`; migration safety and API compatibility are the backend build's rules, which this file follows rather than restates.

## Principles

- **Test through the HTTP API against a real database** before anything merges.
- **Build the image once per commit.** Staging and production run that same image.
- **Every merge to `main` deploys to staging.** Production deploys only by a manual trigger, after sign-off.
- **Production runs the exact commit verified on staging** — never "latest `main`".
- **Every release stays compatible with the clients already in production**, so the backend can always deploy first.

## Environments

| | CI | Staging | Production |
| --- | --- | --- | --- |
| **Database** | Fresh for each pipeline run, deleted after | Staging database | Production database, with automated backups and point-in-time recovery where the host offers it |
| **API** | Started inside the run, for the tests | The staging URL, used by clients' staging builds | The production URL, used by clients' production builds |
| **Redis, Mailpit** | Service containers in the run | Staging Redis; real email provider | Production Redis; real email provider |
| **Runs on** | GitHub Actions | Railway by default, or AWS | Same host as staging |
| **Config and secrets** | Test values in the workflow | The host's environment settings, never the repository | The host's environment settings, separate values from staging |
| **Deploys** | Never | Automatically, on every merge to `main` | Manually, through Deploy Production |

## Processes

One image, started with different commands:

- **api** — serves HTTP and real-time connections. Scales horizontally.
- **worker** — runs background jobs. Scales horizontally.
- **scheduler** — only where the stack needs a separate scheduler process (`tech-stack` says). Always exactly one instance, or every scheduled job runs twice.

Migrations run once per deploy in a pre-deploy step, never when a process starts — several instances starting together would race.

## Pipelines

| Pipeline | Trigger | What it does | Deploys to |
| --- | --- | --- | --- |
| **1. PR checks** | Pull request opened or updated against `main` | Static checks, unit tests, build, API e2e tests | Nothing |
| **2. Staging deploy** | Push to `main` — every merge | Re-runs the checks, builds and pushes the image, migrates, deploys, smoke tests | Staging |
| **3. Production deploy** | Manual — release owners only | Deploys the verified image, migrates, smoke tests, tags the release | Production |

### 1. PR checks

**Trigger:** a pull request opened or updated against `main`. **Required to merge.** Target: under 10 minutes.

1. Install dependencies from the lockfile, cached.
2. In parallel: lint and format check, type check, unit tests, dependency audit.
3. Build the app and its Docker image, without pushing, to catch build and Dockerfile errors.
4. Start a fresh database, Redis and Mailpit as service containers.
5. Apply every migration from scratch, and fail if a model change has no migration.
6. Run the API e2e tests.

The e2e tests run here, not only after merge, so a failing change never reaches `main` or blocks staging.

### 2. Staging deploy

**Trigger:** a push to `main` — every merged PR. Runs automatically, one at a time in merge order, so staging never moves backwards.

1. Re-run Pipeline 1's checks on the merged commit.
2. Build the image and push it to GHCR, tagged with the commit SHA. This is the image staging and production will run.
3. Migrate the staging database before the new version takes traffic. If the migration fails, the deploy stops and the current version keeps running.
4. Deploy the image.
5. Move the `staging-current` tag to this commit.
6. Smoke test staging: the health check confirms the expected commit is running, then a few critical read endpoints are called.
7. Post the result to the team channel, if the project has one: the commit, what changed, and a link to the staging API docs.

**After the workflow — not part of it:** staging is reseeded and curl-verified as the backend build process describes. Clients then integrate against it and sign off by naming the backend commit they verified, which the health check shows. That sign-off is what Pipeline 3 releases.

### 3. Production deploy

**Trigger:** manual, after sign-off — a release owner runs it from GitHub (Actions → Deploy Production → Run workflow). Its one optional input, `commit`, defaults to `staging-current`. A commit SHA (shown on GitHub as a short code like `a3f9c21`) releases exactly that commit instead — for example the one a client verified when newer merges have reached staging since. Branch names are rejected, so `main` can never be deployed by mistake.

**Before running it:** check the commit and its changes in the latest staging deploy message, and that production already has every new variable and piece of infra the release notes list.

**Steps**

1. Stop unless the person who started the run is a release owner.
2. Show what is shipping: the commit, its message, and the changes since the last production release.
3. Find that commit's image in GHCR. No rebuild, no test re-run — it passed Pipelines 1 and 2 and was verified on staging.
4. If the release includes migrations, back up the production database.
5. Migrate the production database before the new version takes traffic.
6. Deploy the image.
7. Smoke test production, read-only.
8. If the smoke test fails, redeploy the previous image automatically and stop.
9. If it passes, tag the commit and its image `prod-<date>-<time>` (e.g. `prod-2026-10-09-1825`).
10. Post the result, so client teams know they can release.

## Release tags

| Tag | Moves? | Set by | Marks |
| --- | --- | --- | --- |
| `staging-current` | Yes, on every successful staging deploy | Pipeline 2 | The commit live on staging |
| `prod-<date>-<time>` | Never | Pipeline 3 | Each successful production release; the newest is what is live |

There are no version numbers and no staging branch; the tags are the record. Every image is tagged with its commit SHA, so each commit maps to exactly one image.

## Releasing with clients

1. Backend merges deploy to staging automatically.
2. Clients integrate against staging and sign off naming the backend commit they verified — the health check shows it.
3. A release owner runs Pipeline 3 with that commit.
4. Clients release their production builds.

Backend-only releases, with no API change, skip steps 2 and 4.

Merging while a client is still verifying does not change what production gets — it deploys the commit named in the sign-off, not whatever staging holds by then. It does change staging under the client, so tell client teams before a merge that reseeds staging, or that changes the API before launch.

## Migrations at deploy

- **A migration runs before the new code takes traffic**, so the previous code briefly runs on the new schema, and a code rollback leaves the schema as it is. Every migration must therefore work with both the previous and the new code — which is what the backend build's expand → backfill → migrate code → contract rules guarantee, provided each phase is live in production before the next one merges. Production can skip commits, so one deploy must never carry two phases.
- **Migrations only move forward.** A bad migration is fixed by a new one; an applied migration is never edited.
- **A backfill that might outlast the migration step runs as a background job**, not inside the step, so a deploy never times out.

## Rollback

| What went wrong | Recovery | Time |
| --- | --- | --- |
| Bad code | Redeploy the previous production image | Minutes |
| Bad migration | Fix forward with a new migration, through the pipelines | Minutes to hours |
| Damaged data | Restore from backup or point-in-time recovery | Depends on database size |

If production clients already use the release's new endpoints, roll them back first, or fix forward instead of rolling back the backend.

## Repository rules

- **`main` is protected:** no direct pushes, Pipeline 1 must pass, and PRs squash-merge so every commit on `main` is one reviewed PR.
- **The host's own auto-deploy from GitHub is off.** Only these pipelines deploy, so nothing reaches staging or production untested.
- **Dependency update PRs** (Dependabot or Renovate) go through Pipeline 1 like any other PR.
- **Release owners** are the people allowed to start a production deploy: a list of GitHub usernames written into the Deploy Production workflow on `main`. Changing it is then a reviewed PR, unlike a repository setting, which an admin can change unseen. On a solo project, the list is you.
- **Deploy secrets live in the `staging` and `production` GitHub environments**, each restricted to `main`, with administrator bypass turned off. Never repository secrets: a workflow on any branch can read those — including a copy of Deploy Production with its release-owner check removed. On a private repository, environment secrets need GitHub Pro, Team or Enterprise; without them, only release owners may have write access.
- **The rest of workflow security** follows `security` → Supply chain and access.

## Hosting

| Need | Railway (default) | AWS |
| --- | --- | --- |
| App processes | One Railway service per process, each deployed from the GHCR image | ECS services on Fargate — ECS Express Mode is the simplest start |
| PostgreSQL | Railway PostgreSQL | RDS for PostgreSQL |
| Redis | Railway Redis | ElastiCache |
| Migrations at deploy | The service's pre-deploy command | A one-off ECS task from the same image |
| Secrets | Service variables, per environment | Secrets Manager or SSM Parameter Store |
| Private networking | Railway's private network | A VPC and security groups |
| Logs, metrics, alerts | Railway's built-in observability | CloudWatch |
| Image registry | GHCR — deploying a private image needs the Pro plan | GHCR with registry credentials, or ECR |

On AWS, ECS rather than Elastic Beanstalk, because it runs the same image as a service and as a one-off migration task. App Runner is closed to new customers. How a workflow deploys a specific image tag differs by host and changes over time; check the host's current documentation when writing that step.
