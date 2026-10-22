# Coding Standards — Python · FastAPI · SQLModel · PostgreSQL

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

- Type-annotate every function signature — parameters and return. Run a type checker in strict mode in CI; an unannotated public function fails the build.
- **Never `Any`.** Use a concrete type, a `Protocol`, a `TypedDict`, or `object` with a narrowing check. `Any` on a route handler or service method is a defect.
- Prefer immutable structures for data that is passed around: frozen dataclasses, `tuple` over `list`, `Final` for module constants.
- No mutable default arguments. Ever.
- Comment why, not what. A docstring earns its place where behaviour is non-obvious — a side effect, an ordering requirement, a rule the signature cannot express.
- English for all code, comments and commit messages.

## Naming

| Case | Applies to |
| --- | --- |
| `PascalCase` | Classes, Pydantic models, enums, exceptions |
| `snake_case` | Functions, methods, variables, attributes |
| `snake_case` | Modules and packages — never kebab-case; a hyphen is not importable |
| `SCREAMING_SNAKE_CASE` | Enum members, module-level constants |
| `UPPERCASE` | Environment variables |
| `_leading_underscore` | Module-private helpers not part of the public surface |

- Functions start with a verb: `create_user`, `validate_offer`, `expire_request`.
- Booleans and predicates read as assertions: `is_active`, `has_access`, `can_submit`.
- The same concept carries the same name everywhere — in the model, the schema, the response and the docs.

## Module and layer structure

A module is a package holding its own router, service, schemas and models. Each layer has one job:

- **Router** — declares the path, applies the dependency that authenticates and authorizes, accepts a validated Pydantic schema, calls **one** service function, returns its result. No business logic, no database access.
- **Service** — holds the business logic, owns its transactions, raises domain exceptions. This is the layer unit tests target.
- **Table models and API models are separate classes.** SQLModel lets one class be both — never use that. A `table=True` model is never a request body or a `response_model`; declare `XCreate`, `XUpdate` and `XPublic` models instead, so a new column reaches a response only when someone adds it to one.
- **Database access** happens in the service or a repository it calls, through an injected session. Never in a router, a dependency, or a task handler.
- **Task handler** — resolves its input and calls a service function. No business logic, so the logic stays testable without constructing a task.

**Dependencies — the session, settings, clients — arrive through `Depends` or as parameters**, never as module-level globals imported into services. That is what lets a test replace them.

**A module exposes its service functions.** Other modules import those; they never query another module's tables or import its models to query through. Which module may call which is `backend-architecture`'s decision.

## Async and the event loop

This is the rule most often broken, and it degrades the whole process rather than one request.

- **Every I/O path is `async`** — database, HTTP, cache, queue — with an async driver. A synchronous database driver called from an async route blocks the event loop and stalls every other request on that worker.
- **Never call blocking code from an async function.** If a library is sync-only, run it in a thread executor. If the work is CPU-bound, it does not belong in the request path at all — move it to a worker.
- A route that does no I/O may be `def`; FastAPI runs it in a threadpool. Mixing `def` and `async def` deliberately is fine, doing it by accident is not.
- Concurrent independent I/O uses `asyncio.gather`, not sequential awaits.
- **Every outbound call has a timeout.** A client with no timeout will eventually hold a connection until the process is restarted.
- **Work that must outlive the request goes to a Taskiq task.** An untracked `asyncio.create_task` or `BackgroundTasks` is lost on shutdown, so never use one for anything that must not be lost.

## Requests and responses

- **Every endpoint takes a Pydantic schema** for its body, and typed parameters for path and query. Validation is declarative and lives on the schema, never as manual checks in the service.
- Validate what the field actually permits: type, required or optional, length, pattern, allowed enum values, numeric bounds. Use `model_config` with `extra="forbid"` so undeclared fields are rejected rather than ignored.
- **Response models are declared** with `response_model`, so the response shape is enforced rather than whatever the service happened to return.
- **Sensitive fields never leave the service layer.** Exclude them in the query, rather than fetching the row and stripping keys — a strip that is forgotten in one path leaks. Password hashes, token hashes, verification codes and internal counters are never in a response.
- **Every list endpoint paginates**, with a server-enforced maximum page size.

## Database

- Use SQLModel's `AsyncSession` with `session.exec(select(...))`, dropping to SQLAlchemy constructs (`update()`, `selectinload`) where SQLModel has no equivalent.
- Load relations explicitly with `selectinload` or `joinedload`. Lazy loading in an async context either raises or silently issues a query per row — both are defects.
- **Transactions** wrap any operation that writes more than one row where a partial write would leave the data inconsistent. One session, one unit of work, committed once at the boundary.
- **Never call an external service inside a transaction.** It holds a connection for a network call, and the external effect cannot be rolled back.
- **Counters and balances use atomic SQL** — an `UPDATE ... SET x = x + :n` with a conditional `WHERE`, never read-then-write. Read-then-write loses concurrent updates silently.
- **Soft deletes are filtered in the query**, not after fetching.
- **Money is `Numeric`/`Decimal`, never `float`.** Never do arithmetic on a float that represents money.
- **Timestamps are timezone-aware UTC** — `datetime.now(timezone.utc)`, never `datetime.now()`, and never a naive column. Any calculation with a day or calendar boundary states which boundary it means.
- Schema changes are Alembic migrations, reviewed like code. Never `create_all`. Alembic's `env.py` targets `SQLModel.metadata` with every model module imported, and the migration template imports `sqlmodel`.

## Performance

- **Cache only reads that are hot and measured.** Cache-aside in Redis, a TTL on every key, invalidated in the same service function that writes the data.
- **A cache key includes every input that scopes the result** — user, tenant, role, query parameters. A key missing one serves one user's data to another.
- **Work the response does not wait on goes to a Taskiq task** — email, image processing, external calls the client need not wait for, fan-out.
- **Every column a list endpoint filters or sorts on is indexed** (`index=True` or `Index(...)` on the model, created by a migration). Check the query plan of every new list query.

## Errors

- Services raise **domain exceptions** — a small hierarchy from one base class — and a FastAPI exception handler translates them to status codes at the boundary. The service layer stays free of HTTP.
- Pick the status by meaning: absent record is 404, failed authentication is 401, authenticated but not permitted is 403, valid request against a state that forbids it is 409.
- **Every error response carries a stable machine code** alongside the HTTP status: a SCREAMING_SNAKE string per distinct failure (`INVOICE_ALREADY_PAID`), set where the domain exception is raised and never renamed once documented — clients switch on it. Validation failures also carry `fieldErrors`, keyed by field path. The exception handler shapes every error body the same way (`code`, `message`, `fieldErrors?`), and `api-docs-conventions` documents the envelope once.
- The message says what the caller got wrong, in terms the caller can act on. It never contains a query, a traceback, an internal identifier, or the existence of a record the caller may not see.
- Never `except Exception: pass`. Catch the exception you can handle, and let the rest reach the handler.

## Security

The policy lives in `security`. These are the mechanisms that enforce it in this stack.

- **Passwords are hashed with Argon2id**, its cost set deliberately and reviewed as hardware improves. Never bcrypt, which silently ignores everything past 72 bytes.
- **Tokens are stored hashed** — refresh, reset, verification, API keys. The plaintext exists only in the response that issues it.
- **Compare secrets with `secrets.compare_digest`**, never `==`.
- Authorization is enforced in the dependency and in the query. A service that trusts an id from the request without scoping it to the caller is the most common way records leak.
- No secret is ever committed. New configuration is an environment variable, documented in `.env.example`.
- **The auth dependency** verifies the access token with a pinned algorithm, plus `exp`, `iss` and `aud`. It then checks the token's session id against the session store, cached in Redis, and loads the user's current role from it. The cached entry is deleted on logout, password change, ban and role change, so each takes effect at once.
- **Rate limits:** a dependency built on the `limits` async API with Redis storage — never a sync limiter, which blocks the event loop on every request. A default limit on every route, tighter ones on the routes `security` names, keyed by account once the caller is authenticated.
- **At startup:** `CORSMiddleware` with the origin allowlist from settings, a middleware that sets the security headers `security` lists, Uvicorn's proxy headers trusted only from the platform's proxy (`--forwarded-allow-ips`), and the docs routes disabled in production (`docs_url=None`, `openapi_url=None`).

## Configuration

- One settings object built with `pydantic-settings`, injected where needed. Never `os.environ` inside a service or route.
- The settings model is **validated at import or boot** and fails fast on anything missing or malformed.
- Configuration has no secret defaults. A fallback for a secret is a production incident waiting for someone to forget the variable.

## Logging

- Structured logging, with a correlation id per request and a run id per background task.
- **Never log** passwords, tokens, full request bodies, or personal data.
- Log at the boundaries — request in, external call out, task start and finish — and at every caught failure. Not at every step of a happy path.
- Use the logging module, never `print`.

## Testing

The strategy is in `testing`; this is how it is set up here.

- **Unit:** pytest with `pytest-asyncio`. Services take their session and clients as parameters, so tests pass `AsyncMock`s with return values set inside the test. Time comes from an injected clock.
- **E2E:** an `httpx.AsyncClient` over `ASGITransport(app=app)`, with the app's lifespan started, against the test database. Replace only third-party clients through `app.dependency_overrides`. Factories insert through the session.
- **The test database is built with `alembic upgrade head`**, so every run exercises the migrations.
- **Tests live in `tests/unit` and `tests/e2e`.**

## Review checklist

- [ ] No `Any` in any signature; type checker passes in strict mode.
- [ ] No blocking call in an async path; every outbound call has a timeout.
- [ ] Every endpoint has a request schema and a declared response model.
- [ ] No sensitive field selected into a response.
- [ ] No lazy load in an async context; no query inside a loop.
- [ ] Every multi-row write that must agree is in a transaction, and no external call is inside one.
- [ ] Counters and balances use atomic SQL.
- [ ] Money is `Decimal`; datetimes are timezone-aware UTC.
- [ ] Every list endpoint paginates with an enforced maximum.
- [ ] Routers hold no business logic; task handlers hold none either.
- [ ] Domain exceptions raised in services, translated at the boundary.
- [ ] No secret, token or personal data reaches a log line.
- [ ] Every cache key carries every scoping input; work the response does not wait on is in a task.
