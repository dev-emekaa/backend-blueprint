# Coding Standards — NestJS · TypeScript · Prisma · PostgreSQL

How code is written in this codebase. Stack-specific and project-agnostic.

## Scope

This file owns **how code is written**. It does not restate rules that live elsewhere:

- **What must be built, and the engineering rules for it** — server-side enforcement, access-control decisions, migration safety, background-job design, API compatibility — belong to the backend build process.
- **Which module owns what, and how modules may call each other** — `backend-architecture`.
- **Which endpoint each role may call** — `api-rbac`.
- **Security policy** — trust boundaries, authentication design, data classification and retention, transport and headers, upload policy, secrets lifecycle, audit requirements, dependency policy, what must be rate-limited — `security`.
- **Testing** — the strategy, what each suite proves, coverage expectations — `testing`; the pipelines and their gates — `ci-cd`.
- **Which tools are used** — `tech-stack`.
- **Code that calls AI models** — `ai-services`, where the product has AI features.

Where a rule below touches one of those, it gives the **mechanism** in this stack, not the rule itself.

---

## Language and types

- Declare types for parameters, return values, and any variable whose type is not obvious from its initializer.
- **Never `any`.** Use Prisma-generated model types, a declared interface, or `unknown` with a narrowing check. `any` in a controller or service signature is a defect, not a shortcut.
- Prefer Prisma-generated types over hand-written duplicates of the same shape. Hand-write a type only where the shape genuinely differs from the model.
- `readonly` for data that must not be reassigned; `as const` for literal constants and lookup tables.
- Comment why, not what. A doc comment earns its place where behaviour is non-obvious — a side effect, an ordering requirement, a rule the signature cannot express. Restating the signature in prose is noise.
- English for all code, comments and commit messages.

## Naming

| Case | Applies to |
| --- | --- |
| `PascalCase` | Classes, interfaces, types, enums |
| `camelCase` | Variables, functions, methods, properties |
| `kebab-case` | Files and directories |
| `SCREAMING_SNAKE_CASE` | Enum values, module-level constants |
| `UPPERCASE` | Environment variables |

- Functions start with a verb: `createUser`, `validateOffer`, `expireRequest`.
- Booleans and boolean-returning functions read as assertions: `isActive`, `hasAccess`, `canSubmit`.
- The same concept carries the same name everywhere — in the schema, the DTO, the response and the docs. A field renamed on the way out is a field somebody will mismatch.

## Module and layer structure

A module is a folder holding its own controller, service, DTOs, and job processors where it has them. Each layer has one job:

- **Controller** — declares the route, applies the guard, accepts a validated DTO, calls **one** service method, returns its result. No business logic, no database access, no conditionals beyond mapping a result to a response.
- **Service** — holds the business logic, owns its transactions, and throws domain-meaningful exceptions. This is the layer unit tests target.
- **Database access** — through `PrismaService`, from the service layer. Never from a controller, a guard, or a job processor.
- **Job processor** — resolves its input and calls a service method. No business logic, so the logic stays unit-testable without constructing a job.

**Dependencies are injected through constructors**, never created with `new` inside a class. Injection is what lets a test swap them.

**A module exposes its service.** Other modules import the module and inject that service; they never query another module's tables directly or reach into its internals. Which module may call which, and when a domain event is preferred to a direct call, is `backend-architecture`'s decision — this rule only says the call goes through the service.

## Functions and control flow

- One purpose per function. Past roughly 20 lines it usually has two; extract rather than section it with comments.
- Guard clauses and early returns instead of nested conditionals. The happy path stays at the lowest indentation level.
- Three or more parameters become a single object parameter with a declared type.
- No side effects hidden behind a name that suggests a read. `getX` does not write.

## Requests and responses

- **Every endpoint takes a DTO** with `class-validator` decorators. Validation is declarative and lives on the DTO, never as manual checks scattered through the service.
- Validate what the field actually permits: type, required or optional, length, format, allowed enum values, numeric bounds. A DTO that only checks type is a DTO that passes garbage to the service.
- The global validation pipe runs with `whitelist` and `forbidNonWhitelisted` on, so undeclared properties are stripped or rejected rather than silently carried.
- **Sensitive fields never leave the service layer.** Exclude them at the query with `select`, rather than fetching the row and deleting keys afterwards — a delete that is forgotten in one code path leaks. Password hashes, token hashes, verification codes and internal counters are never in a response.
- **Every list endpoint paginates**, with a server-enforced maximum page size. An unbounded list endpoint is a table scan waiting for the table to grow.
- Response shapes are declared types, not inferred object literals.

## Database

- `select` to return only the fields the caller needs; `include` to fetch relations in one query rather than looping. A query inside a loop is an N+1 and is a defect.
- **Transactions** wrap any operation that writes more than one row where a partial write would leave the data inconsistent — a balance and its ledger entry, a status and the record that depends on it.
- **Never call an external service inside a transaction.** It holds a database connection for the duration of a network call, and the external effect cannot be rolled back. Do the external call before or after, and make the operation recoverable if it fails between the two.
- **Counters and balances use atomic operations** (`increment`, `decrement`, conditional `updateMany`), never read-then-write. Read-then-write loses concurrent updates, and it loses them silently.
- **Soft deletes are filtered in the query**, not after fetching. Every read of a soft-deletable model carries its `deletedAt: null` condition.
- **Money is `Decimal`, never `Float`.** Store the smallest unit or a fixed-scale decimal, convert only at the boundary, and never do arithmetic on a float that represents money.
- **Timestamps are UTC.** Store `DateTime`, never a formatted local string. Any calculation with a day or calendar boundary states which boundary it means.

## Performance

- **Cache only reads that are hot and measured.** Cache-aside in Redis, a TTL on every key, invalidated in the same service method that writes the data.
- **A cache key includes every input that scopes the result** — user, tenant, role, query parameters. A key missing one serves one user's data to another.
- **Work the response does not wait on goes to a BullMQ job** — email, image processing, external calls the client need not wait for, fan-out.
- **Every column a list endpoint filters or sorts on is indexed** (`@@index` in the Prisma schema). Check the query plan of every new list query.

## Errors

- Throw NestJS HTTP exceptions from the service layer: `NotFoundException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `ConflictException`. Never a bare `Error`.
- Pick the type by meaning: absent record is `NotFound`, failed authentication is `Unauthorized`, authenticated but not permitted is `Forbidden`, valid request against a state that forbids it is `Conflict`.
- The message says what the caller got wrong, in terms the caller can act on. It never contains a query, a stack trace, an internal identifier, or the existence of a record the caller may not see.
- Catch only to add meaning or to recover. A catch that logs and rethrows unchanged adds a line and no information.

## Security

The policy lives in `security`. These are the mechanisms that enforce it in this stack.

- **Passwords are hashed with Argon2id**, its cost set deliberately and reviewed as hardware improves. Never bcrypt, which silently ignores everything past 72 bytes; never encrypted, never stored recoverably.
- **Tokens are stored hashed** — refresh tokens, reset tokens, verification codes, API keys. The plaintext exists only in the response that issues it. A leaked table of hashes is an inconvenience; a leaked table of tokens is a breach.
- **Compare secrets in constant time.** A normal string comparison on a token leaks its prefix through timing.
- Authorization is enforced in the guard and in the query. A service method that trusts an id from the request without scoping it to the caller is the most common way records leak.
- No secret is ever committed. New configuration is an environment variable, documented in `.env.example`.
- **The auth guard** verifies the access token's signature with a pinned algorithm, plus `exp`, `iss` and `aud`. It then checks the token's session id against the session store, cached in Redis, and loads the user's current role from it. The cached entry is deleted on logout, password change, ban and role change, so each takes effect at once.
- **Rate limits:** `ThrottlerGuard` registered globally with Redis storage, and tighter `@Throttle()` limits on the routes `security` names.
- **In `main.ts`:** `helmet({ frameguard: { action: 'deny' } })`, CORS with the origin allowlist from configuration, `trust proxy` set to the platform's proxy hops, a body size limit, and Swagger mounted only outside production.

## Configuration

- Read configuration through a config service, never `process.env` inside a service or controller.
- Validate the whole environment schema **at boot** and fail fast on anything missing or malformed. A missing variable should stop the process at startup, not surface as a runtime error inside one endpoint weeks later.
- Configuration has no secret defaults. A fallback value for a secret is a production incident waiting for someone to forget the variable.

## Logging

- Use the framework logger, structured, with a correlation id per request.
- **Never log** passwords, tokens, full request bodies, or personal data. A log line is the easiest place to leak the thing the rest of this file protects.
- Log at the boundaries — request in, external call out, job start and finish — and at every caught failure. Not at every step of a happy path.
- An error log carries enough to reproduce: what was attempted, the identifier, and the failure. Not the whole object.

## Testing

The strategy is in `testing`; this is how it is set up here.

- **Unit:** `Test.createTestingModule` with the service under test and a mock for each dependency — `{ provide: PrismaService, useValue: prismaMock }`, each method a `jest.fn()` given its return value inside the test. Time comes from an injected clock or Jest's fake timers.
- **E2E:** boot the real `AppModule` against the test database, replace only third-party clients with `.overrideProvider()`, and drive it over HTTP with Pactum. Factories create rows through Prisma.
- **The test database is built with `prisma migrate reset`, never `db push`**, so every run exercises the migrations.
- **Unit tests sit beside the code** as `*.spec.ts`; e2e tests live in `test/` as `*.e2e-spec.ts`.

## Review checklist

Scan for these before opening a PR:

- [ ] No `any` in any signature.
- [ ] Every endpoint has a DTO, and every DTO field declares its real constraints.
- [ ] No sensitive field selected into a response.
- [ ] No query inside a loop.
- [ ] Every multi-row write that must agree is in a transaction, and no external call is inside one.
- [ ] Counters and balances use atomic operations.
- [ ] Every soft-deletable read filters `deletedAt`.
- [ ] Money is `Decimal`; timestamps are UTC.
- [ ] Every list endpoint paginates with an enforced maximum.
- [ ] Controllers hold no business logic; processors hold none either.
- [ ] Exceptions are typed, and messages leak nothing.
- [ ] No secret, token or personal data reaches a log line.
- [ ] Every cache key carries every scoping input; work the response does not wait on is in a job.
