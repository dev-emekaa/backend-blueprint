
## Services

The same whatever the language. Hosting, the pipelines and the infrastructure each host provides are in `ci-cd`.

| Need | Local | Staging | Production |
| --- | --- | --- | --- |
| Database · Redis | Docker Compose, plus a separate pair for tests | Managed, on the host | Managed, on the host — separate instances |
| Email | Mailpit | Amazon SES by default, or Resend | Same provider, production credentials |
| Object storage | The shared non-production bucket, `dev/` prefix | Same bucket, `staging/` prefix | Production bucket |
| CDN | — | Cloudflare (CloudFront on AWS) | Same |
| Error tracking | — | Sentry, `staging` environment | Sentry, `production` environment |
| Logs, metrics, alerts | Console | The host's (Railway, or CloudWatch on AWS) | Same |
| CI/CD · image registry | — | GitHub Actions · GHCR | Same |
| Push notifications *(mobile client)* | — | Expo's push service for an Expo app, otherwise FCM and APNs directly; staging credentials | Same, production credentials |

**Sentry** also monitors `/health` for downtime and runs a cron monitor for every scheduled job, so a job that stops running raises an alert instead of going silent.

**Breached passwords** are checked against the Pwned Passwords range API: only the first 5 characters of the password's SHA-1 hash leave the server. A bundled list of common passwords still applies when the API is unreachable, and in tests.

**Email** goes out over SMTP in every environment, so only the host and credentials change: Mailpit locally and in e2e tests, SES or Resend once deployed. The code tests exercise is the code that sends in production.

### Media

- **Storage and CDN come as a pair.** Cloudflare R2 with Cloudflare by default: R2 speaks the S3 API and charges nothing for data leaving it. On AWS, S3 with CloudFront. The code uses the S3 API either way.
- **The flow:**
  1. The client uploads straight to the bucket with a presigned URL.
  2. A background job verifies the file and re-encodes it with the image library.
  3. The verified file is served according to its kind:
     - **Public media** — through the CDN on the media domain, resized at the edge from a fixed list of sizes. On AWS, the job writes those sizes itself.
     - **Private media** — only through short-lived signed URLs, never through the CDN.
- **R2 presigned URLs use the S3 API endpoint**, not the custom media domain.
- **Security rules** are in `security` → Media and CDN.

### Mobile clients

Where a mobile client exists (`CLAUDE.md` → Client(s) integrating):

- **Push notifications.** The backend stores each device's push token against its session — registered after sign-in, removed on sign-out and when the provider reports the token invalid — and sends through Expo's push service for an Expo app (one API for both platforms; the APNs key and FCM credentials live in the app's EAS project) or directly through FCM and APNs otherwise. A notification carries a route and ids, never personal data; the app fetches what it shows.
- **Universal and app links** are verified against `.well-known/apple-app-site-association` and `.well-known/assetlinks.json` on the product's web domain. The web client serves them where one exists; otherwise this backend serves them on the links domain. Either way they carry the mobile client's identifiers, and `CLAUDE.md` records who serves them.
- **Account deletion is an endpoint**, because the stores require deletion from inside the app: behind re-authentication (`security` → Authentication and sessions), deleting or anonymising as `security` → Personal data says, audit-logged. Play also requires a deletion-request page on the product's web domain; the web client serves it where one exists, otherwise this backend does, beside the link files.
- **The minimum-supported-version endpoint** is in the build rule's deprecation section.

### Payments

- **Web, and real-world goods or services in any app:** Stripe for global products, Paystack for African markets, through their hosted checkout or fields.
- **Digital goods and subscriptions used inside a mobile app:** Apple In-App Purchase and Google Play Billing, as the stores require, through RevenueCat. The app's SDK makes the purchase; the backend takes subscription state from RevenueCat's webhooks, confirms it through RevenueCat's REST API, and grants access from its own entitlement records. Without RevenueCat, the backend verifies purchases directly through the App Store Server API and the Google Play Developer API, with each store's server notifications.
