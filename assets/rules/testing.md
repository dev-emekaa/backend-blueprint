# Testing

How this backend is tested, whatever the stack. The tools are named in `tech-stack`; how tests are set up in this stack is in `coding-standards`; which pipeline runs what is in `ci-cd`. What each build or fix must cover is set by the backend build and issue resolution processes.

## Layers

| Layer | Proves | Runs against | When |
| --- | --- | --- | --- |
| **Static** | Lint, formatting, types | The source | Before commit, and in every pipeline |
| **Unit** | Business logic in isolation — rules, calculations, state decisions, validators | Nothing: every dependency is mocked | Locally, on every PR and merge |
| **API e2e** | The wiring — routing, guards, validation, permissions, queries, error responses | The running app over HTTP, with real test datastores | Locally, on every PR and merge |
| **Smoke** | That a deploy landed | The deployed URL, read-only | After every staging and production deploy |

API e2e tests are the bulk of the suite: one test proves routing, validation, auth, the query and the response together. Unit tests are for logic worth isolating. Code that only passes data through gets none — with its one dependency mocked, the test would prove the mock. Coverage is read to find untested logic, never enforced as a percentage.

Manual verification — curl sweeps on dev and staging, and the per-area API testing guides — is not a test layer. It is the build's verification step, run against seed data.

## Environments and data

| | Unit | API e2e | Development | Staging | Production |
| --- | --- | --- | --- | --- | --- |
| **Database and Redis** | Mocked | A separate test database and Redis, never the dev ones | Dev, in Docker | Staging | Production |
| **Email** | Mocked | Mailpit | Mailpit | Email provider | Email provider |
| **Third-party APIs** | Mocked | Mocked | Sandbox accounts | Sandbox accounts, shared with dev | Live accounts |
| **Data** | Built per test | Factories, per test | Seed | Seed | Real — never seeded |

- **Automated tests never touch the dev, staging or production databases.** The dev database is for manual work only. Staging is checked by the build's curl sweep and the clients' own test suites; production by smoke tests only.
- **Every e2e run starts from a clean test database built by running the migrations**, so the migrations are tested too. Locally the test database is reset before each run; CI creates a fresh one per run.
- **E2E data comes from factories.** Each test creates what it needs and never depends on another test's data, or on the seed.
- **The seed is for manual testing only.** Reset it on dev with the reseed command and on staging with the reseed dev-tool endpoint. Production is never reseeded.
- **E2E tests read sent emails from Mailpit's API** to complete flows that need a code or a link — the real mail path runs, nothing is mocked.

## Unit tests

- **No database, network, filesystem or clock.** Mock the database service, other modules' services, external clients and time. Never mock pure functions, calculations or validators — run them for real.
- **Each test sets up its own mocks** and leaves no shared state. Tests pass in any order.
- **Group tests by the method under test, one behaviour per test**, named for the behaviour: `should reject an offer below the minimum`.
- **Assert outcomes:** the return value, the error thrown, or the call that is the method's point (the payment was requested). Never the internal sequence of calls.
- **Each test runs well under 100 ms.** A slow unit test is doing I/O.

## API e2e tests

- **Send HTTP requests through the app's complete request pipeline** — over a real socket or the framework's in-process transport — against the test datastores. Mock only third-party services, at their client, with fakes that can also return their failure shapes.
- **Each test creates its own data and signs in as the role under test.**
- **Assert what the client sees** — status, body shape, error code — and the persisted outcome where the point of the flow is a state change.
- **Access denials and record scope are proven here**, because guards and query scoping only run inside the real request pipeline. For a business-rule rejection, the rule's logic is unit-tested and the error the client receives is proven here.

## Smoke tests

- **Read-only, always** — they run against production.
- **The health check confirms** the app is up, the database is reachable, and which commit is running. That commit is what a client's sign-off names.
- **Two or three critical read endpoints**, called with a dedicated low-privilege smoke account in each environment.

## When something breaks

- **A bug found anywhere gets a test that reproduces it**, at the lowest layer that can — usually e2e. The test fails before the fix, passes after, and ships in the same PR.
- **A failing test is never skipped, deleted or loosened to turn a pipeline green** unless the PR states why. A flaky test is fixed, not retried until it passes.
