# Tech Stack — Python · FastAPI

The technologies this backend uses. Use the current stable release of each; the lockfile pins versions, not this file. Anything not listed is added only after approval: the build plan names what the feature needs and recommends the most secure, efficient and standard option for this stack.

## Application

| Need | Choice |
| --- | --- |
| Language · runtime | Python, current stable release · Uvicorn |
| Framework | FastAPI |
| Database · ORM · migrations | PostgreSQL · SQLModel with async sessions over `asyncpg` · Alembic |
| Validation | Pydantic v2 |
| Settings | `pydantic-settings` |
| API documentation | FastAPI's built-in OpenAPI |
| Auth | `PyJWT` for access tokens · `pwdlib` with Argon2 for password hashing · `Authlib` for social sign-in and identity-token verification · `pyotp` for MFA codes · `webauthn` for passkeys, where the product uses them |
| Cache | Redis through `redis` (asyncio client) |
| Rate limiting | `limits`, through its async API with Redis storage, applied as a dependency |
| Background jobs | Taskiq with `taskiq-redis` — queued, delayed and event-driven tasks; cron and one-off schedules through `TaskiqScheduler` with a Redis schedule source, run as **exactly one** scheduler process; retries with backoff through `SmartRetryMiddleware` |
| Real-time | SSE through FastAPI's native `EventSourceResponse` · WebSockets through FastAPI, with Redis pub/sub so events reach clients connected to any instance |
| HTTP client | `httpx`, async |
| Image processing | Pillow, in workers only |
| Email | `aiosmtplib` over SMTP |
| Object storage | `aioboto3` — the same code works against R2 and S3 |
| Error tracking | `sentry-sdk` with its FastAPI integration |
| Lint · format · types | Ruff · mypy in strict mode |
| Package manager | uv, with a committed lockfile |
| Unit tests | pytest with `pytest-asyncio` |
| API e2e and smoke tests | pytest with `httpx` |
| Test data | Factory functions with Faker |
| Containers | Docker, and Docker Compose locally |
