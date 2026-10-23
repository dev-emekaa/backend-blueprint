## Documentation map

| Type | Location |
| --- | --- |
| Feature-areas registry | `docs/feature-areas.md` |
| Schema | `docs/schema.md` |
| PRD and product brief | `docs/product-docs/` |
| Business rules | `docs/business-rules/` |
| App flows | `docs/app-flows/` |
| Screen specs | `docs/screen-specs/` |
| API docs | `docs/api-docs/` |
| API testing | `docs/api-testing/` |
| Infra setup | `docs/infra/` |
| Phase folders | `docs/phase-{n}/` |

## Audiences and clients

<!-- Fill this in, or the first skill that needs it will derive it from the PRD's roles and ask
     you to confirm. An audience is a group of roles using its own separate product; a client is
     a separately designed app (mobile, web, desktop). Exactly one audience is primary. -->

| Audience | Primary | Clients |
| --- | --- | --- |

## Project configuration

<!-- The backend skills read these. Anything missing, they ask for once; /backend-setup fills in the commands.
     Hosting is Railway (the default) or AWS. -->

| Key | Value |
| --- | --- |
| Stack / framework | {{STACK}} |
| Hosting | |
| Datastores | |
| Local base URL | |
| Staging base URL | |
| Dev server command | |
| Reset/reseed command | |
| Production status | not yet launched |
| Production base URL | once launched |
| Production deploy trigger | Deploy Production workflow, run manually on the verified commit |
| Client(s) integrating | |
| Client release status | |
| Client team | who integrates, and where they work from |
| Minimum-supported-version endpoint | store-distributed or installed clients only |
| Push provider | Expo's push service · FCM and APNs — mobile client only |
| Link files served by | the web client · this backend — mobile client only |
| Download page served by | the web client · this backend — desktop client only |
| Repo layout note | monorepo or anything else worth knowing |
