# Tech Stack — NestJS · TypeScript

The technologies this backend uses. Use the current stable release of each; the lockfile pins versions, not this file. Anything not listed is added only after approval: the build plan names what the feature needs and recommends the most secure, efficient and standard option for this stack.

## Application

| Need | Choice |
| --- | --- |
| Language · runtime | TypeScript in strict mode · Node.js, active LTS |
| Framework | NestJS |
| Database · ORM · migrations | PostgreSQL · Prisma · Prisma Migrate |
| Validation | DTOs with `class-validator` and `class-transformer` |
| API documentation | `@nestjs/swagger` (OpenAPI) |
| Auth | `@nestjs/jwt` and `@nestjs/passport` for access tokens · `argon2` for password hashing · `openid-client` for social sign-in, with `jose` verifying identity tokens · `otpauth` for MFA codes · `@simplewebauthn/server` for passkeys, where the product uses them |
| Cache | Redis through `ioredis` |
| Rate limiting | `@nestjs/throttler` with Redis storage (`@nest-lab/throttler-storage-redis`) |
| Background jobs | BullMQ through `@nestjs/bullmq` — queued, delayed and event-driven jobs, and scheduled jobs through BullMQ job schedulers. Not `@nestjs/schedule`: it runs every cron in every instance, so a second instance runs each job twice. |
| Real-time | SSE through NestJS `@Sse()` for one-way streams · WebSockets through `@nestjs/websockets` with Socket.IO for two-way, plus `@socket.io/redis-adapter` so events reach clients connected to any instance |
| Security headers | `helmet` |
| Image processing | `sharp`, in workers only |
| Email | `nodemailer` over SMTP |
| Object storage | `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` — the same code works against R2 and S3 |
| Error tracking | `@sentry/nestjs` |
| Lint · format · types | ESLint · Prettier · `tsc` |
| Package manager | npm or pnpm, with a committed lockfile |
| Unit tests | Jest |
| API e2e and smoke tests | Jest with Pactum |
| Test data | Factory functions with `@faker-js/faker` |
| Containers | Docker, and Docker Compose locally |
