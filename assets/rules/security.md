# Security

What must hold in every part of this backend, whatever the stack. This file is policy. How each rule is enforced in this stack is in `coding-standards`; which role may call which endpoint is in `api-rbac`; rules for code that calls AI models are in `ai-services`, where the product has AI features.

## Principles

- **The server is the only authority.** Identity, role, ownership, price, quantity, status and timestamps are decided or verified server-side. A value the client sends is a claim, and a record moves only to a state its current state allows.
- **Deny by default.** An endpoint, real-time channel, job trigger or file is unreachable until a rule grants access. A route with no guard is a defect, not a public endpoint.
- **Every input is untrusted:** bodies, headers, query strings, files, webhook payloads, third-party responses, model output — and anything stored from them.
- **Fail closed.** When a check cannot complete — a provider is down, a signature is missing, a lookup times out — the action is refused.
- **Limits are enforced by the database, not by a check in code.** One-per-account offers, stock, seats, balances and quotas use unique constraints or conditional atomic updates. Read-then-check loses to two concurrent requests.
- **Least privilege** for every database role, API key, cloud role, admin account and token.

## Authentication and sessions

- **Built in this backend, on vetted libraries.** The backend owns the flows: sign-up, sessions, refresh and recovery. Every cryptographic or protocol step (hashing, token signing, OAuth/OIDC, one-time passwords, passkeys) uses the library `tech-stack` names. None is ever hand-written.
- **Access token:** a JWT living 15 minutes or less, carrying only the user id and session id — its payload is readable by anyone, so nothing secret goes in it. Signed with a pinned algorithm: HS256 when only this backend verifies tokens, an asymmetric one (EdDSA or RS256) when anything else must. Verification checks signature, `exp`, `iss` and `aud`, and never trusts the token's own `alg` header.
- **Every request checks that the session is still active** (a cached lookup), and reads the user's current role from the server, not from the token. Logout, password change, a ban or a demotion then takes effect at once instead of when the token expires.
- **Refresh token:** opaque and random (not a JWT), bound to one session — one device. Valid 30 days from last use, with an absolute limit after which the user signs in again.
- **Rotation:** every refresh returns a new access and refresh pair and invalidates the token presented.
- **Reuse detection:** a refresh token presented after it was rotated means it was copied — revoke that session. The one exception is a grace window of about ten seconds for the token just rotated, which covers an app killed mid-refresh that never received its new pair, and a web client whose server-side refresh and browser refresh, or several open tabs, present the same token together. Clients refresh one request at a time and queue the rest behind it; the auth section of `api-docs` says so.
- **Logout** revokes the current session only. Signing out of every device is a product feature, offered where the business rules include it.
- **Password change and password reset revoke every session**, including the current one, and require signing in again.
- **Re-authentication** — the password or a fresh one-time code — before changing email, password or MFA, adding payout details, or deleting the account. An email change is confirmed from the new address, and the old address is told.
- **Where clients keep tokens:** web holds both tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies with `Path=/`, set on the parent domain (`.example.com`) so the app and API subdomains share them and the app's server can render signed-in pages — never in browser storage, never readable by JavaScript. The sign-in and refresh responses set them; sign-out clears them. Mobile holds the refresh token in the Keychain or Keystore and keeps the access token in memory.
- **One-time codes and links** — verification, reset, sign-in, OTP — are random, single-use and short-lived: minutes for codes, an hour at most for links. Issuing a new one invalidates the previous one, and verification attempts are limited.
- **No account enumeration.** Sign-in failures return one generic error; reset and resend return the same response whether or not the account exists. That includes timing: run the password comparison even when the account does not exist.
- **Passwords:** at least 8 characters, no upper limit below 64, no composition rules — length beats complexity — and rejected if they appear in a list of breached or common passwords. They are hashed with Argon2id; tokens, codes and API keys are stored only as hashes.
- **MFA** is required for admin and internal roles.
- **Social sign-in** verifies the identity token's signature, issuer, audience, expiry and nonce, uses `state` and PKCE, and links to an existing account only through a verified email.

## Authorization

- Who may call an endpoint and which records they may touch are decided per the backend build process and recorded in `api-rbac`. What follows must hold in the code.
- **Both are enforced on every request:** the role in the guard, the record scope in the query itself — never fetched first and filtered after.
- **An id from the client never implies ownership.** Unguessable ids slow enumeration; they are not authorization.
- **A record the caller may not access returns 404**, so its existence is not disclosed.
- **No one raises their own privileges.** Role and permission changes, and any admin action on another user's data, are limited to roles holding that power and are recorded in the audit trail.
- **Every surface enforces the same rules:** HTTP routes, real-time channels, file URLs, job triggers and agent tools. A second door with weaker checks is the usual bypass.

## Input validation and output handling

- **Validate at the boundary against an allowlist:** type, presence, length, format, range, allowed values. Unknown fields are rejected, so a client can never set what it does not own — role, owner, status, balance, price, verified flags.
- **Bound everything:** body size, string lengths, array sizes, page sizes, nesting depth, file size. Unbounded input is a denial of service.
- **Normalize before comparing:** trim, Unicode-normalize identifiers, lowercase emails for uniqueness.
- **Never build an interpreter's input from strings.** No input concatenated into SQL, shell commands, file paths, regexes or templates. Raw-query escape hatches use bound parameters.
- **Never deserialize untrusted data** with a format that can construct objects (pickle, unsafe YAML).
- **Output is encoded by its consumer's rules.** Emails, PDFs and HTML the backend renders use an escaping template engine. Rich text is sanitized against an allowlist when it is stored.
- **Redirect targets** come from an allowlist, never a raw parameter.
- **Server-side fetches of user-supplied URLs** (fetch-by-URL, link previews, user-configured webhooks) allow only `https`, resolve the host and refuse private, loopback, link-local and cloud-metadata addresses, re-check after each redirect, and cap size and time.

## API and HTTP

- **HTTPS only in every deployed environment**, with HSTS. Local development runs on plain `http://localhost`. Traffic between services stays on the private network.
- **CORS** allows an explicit list of origins per environment. Never `*` with credentials, never the request's own `Origin` echoed back.
- **Security headers on every response:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS.
- **Endpoints that accept cookie auth are protected against CSRF:** `SameSite` cookies plus a CSRF token or a required custom header on every state-changing request. `GET` never changes state.
- **No secrets or personal data in URLs** — query strings land in logs, browser history and CDN logs. The exceptions — signed media URLs, real-time tickets, one-time email links — are short-lived, and tickets and links work once.
- **The client IP comes from the platform's proxy header, with the trusted proxies configured explicitly.** Rate limits and the audit trail then use an address the caller cannot forge.
- **Retried operations take an idempotency key** — payments, orders, transfers. The same key returns the original result instead of acting twice.
- **API documentation is not public in production:** disabled or behind authentication.
- **The health endpoint reveals only** that the app is up, the database is reachable, and which commit is running.

## Rate limiting and abuse prevention

- **Every endpoint is rate limited**, with the counters in Redis so limits hold across instances. Authenticated routes are keyed by account, anonymous ones by IP, sensitive ones by both.
- **Strict limits** on sign-in, sign-up, password reset, code verification and resend, search, export, uploads and AI calls.
- **SMS is limited per number, account and IP, and restricted to the countries the product serves.** An open code-sending endpoint is a bill: attackers trigger SMS to premium-rate numbers.
- **Repeated failed sign-ins slow down** with progressive delays or a temporary lock, never a permanent lockout an attacker can trigger against the real user.
- **Over the limit returns 429** with `Retry-After`, and reveals nothing about the account.
- **Per-account quotas** wherever abuse costs money — storage, messages sent, AI spend, invitations — consumed atomically at the moment of use.
- **Bot challenges** (e.g. Turnstile) on anonymous forms that attract abuse, such as sign-up.

## Real-time connections (SSE and WebSockets)

- **Authenticate on connect** under the same token rules as HTTP. Where the client can, the access token goes in the handshake payload (Socket.IO's `auth`) or a header (native clients). Where it cannot — `EventSource`, a raw browser WebSocket — the client fetches a single-use ticket valid for seconds over an authenticated request. Never a long-lived token in the URL.
- **WebSocket handshakes check `Origin`** against the CORS allowlist.
- **Every subscription is authorized** with the same role and record-scope rules as the equivalent HTTP read. A room or channel name is not a secret.
- **Close the connection when the session is revoked** or its token expires without renewal.
- **Every inbound message is validated** like a request body and rate limited. Message size, and connections per user, are capped.
- **A broadcast carries only what every recipient may see.** Per-user data goes to that user's channel alone.

## Datastores

- **PostgreSQL and Redis are not reachable from the internet** — private networking only. Human access to production data goes through a controlled, logged path.
- **The application connects with a least-privilege role** that reads and writes its own tables. Migrations run under a separate role that may change the schema; neither is a superuser.
- **Redis requires authentication.** Connections leaving the private network use TLS.
- **Encryption at rest is on.** Fields whose leak does direct harm — government ids, bank details, MFA secrets, third-party tokens stored for a user — are also encrypted in the application, with a key held outside the database.
- **Production data never enters dev or staging.** A production snapshot restored to test a migration lives in an isolated, access-restricted environment and is deleted afterwards.

## Money and payments

- **Amounts are computed server-side** from server-held prices, discounts, fees, tax and currency. A client-sent amount is never charged or credited.
- **Payment success comes from the provider, not the client:** a signature-verified webhook, or a server-side fetch of the payment's status. Never the client's redirect or callback alone. Entitlements, credits and fulfilment are granted only from that verified state.
- **In-app purchases are verified server-side,** through RevenueCat or with Apple and Google directly. Subscription state follows their server notifications — renewals, refunds, revocations and grace periods included.
- **Every money movement happens once.** Send an idempotency key to the provider, and put a unique constraint on the provider's transaction or event id, so a retry or duplicate webhook cannot charge, credit or pay out twice.
- **Balances change only through atomic updates** with a ledger entry in the same transaction. The ledger is append-only; a correction is a new entry.
- **Usage limits and credits are consumed atomically** at the moment of use — decrement only if enough remains — never checked first and spent after.
- **Refunds, chargebacks and cancellations revoke** what they paid for.
- **Payouts and changes to payout details** require re-authentication, are audit-logged, and are held for review where the amount warrants.
- **Card data never touches the backend.** The provider's hosted checkout or fields keep the backend out of PCI scope; store only the provider's tokens, the card brand and its last four digits.

## Media and CDN

- **Uploads go straight to the bucket** through a presigned URL that fixes the object key, content type and exact size. The client declares the size and the API refuses one over the limit before signing. The URL expires within minutes and is issued only after the upload is authorized.
- **Object keys are generated by the server**, random and unguessable — never the user's filename, which is kept only as sanitized metadata.
- **Nothing is served until it is verified.** Check the stored object's size before downloading it, then its real type from the file's bytes, not its name or declared type; cap the pixel dimensions before decoding; then re-encode images, which strips metadata (location included) and malformed payloads.
- **File types are allowlisted per use.** SVG and HTML are never accepted as images, because they can carry script. Files users send to each other are malware-scanned.
- **Buckets are private.** Public media — avatars, listing photos — is served through the CDN on a separate media domain, never the API's domain. Private media — documents, receipts, ids — is never on a public or cached URL. It is served through short-lived signed URLs, each issued after an access check.
- **Downloads** carry `Content-Disposition: attachment` and the verified content type.
- **The CDN caches public content only.** Authenticated API responses are marked `Cache-Control: private, no-store`.
- **On-the-fly transformations accept only a fixed list of sizes and formats.** Arbitrary dimensions are a cost and denial-of-service vector.
- **Per-account storage quotas.** Deleting a record or an account deletes its files.

## Third-party integrations and webhooks

- **Inbound webhooks** are verified before parsing: the provider's signature over the raw body, a timestamp tolerance against replay, and deduplication on the provider's event id. For anything involving money, fetch the object from the provider before acting on it.
- **Outbound calls** verify TLS, time out, and validate responses like any other input.
- **API keys** are restricted to the scopes the integration uses. Production's are separate from every non-production key, and all are rotated when exposure is suspected or someone with access leaves.
- **Send providers only what the integration needs** — never a full user record to analytics, email or support tools.
- **A provider failure fails closed** for money, identity and access. Only non-critical features (analytics, recommendations) degrade quietly.
- **Tokens the backend holds to act for a user** (connected accounts) are encrypted, minimally scoped, and revoked on disconnect or account deletion.
- **The email sending domain has SPF, DKIM and DMARC**, so nobody can send convincing fake reset emails as the product.

## Secrets and environments

- **Secrets live only in each environment's configuration on the hosting platform.** Never in the repository, an image, a log, an error report, a client build or a response.
- **Production secrets are separate from every other environment's**, and only the production runtime and release owners can read them.
- **Signing keys** for tokens, cookies and webhooks are long random values (256 bits or more), distinct per environment and per purpose. Token signing keys carry a key id, so a key can be rotated while older tokens expire naturally.
- **Every secret can be rotated without a code change.** On suspected exposure, rotate first and investigate after. A secret pushed to the repository is leaked even if the commit is removed.
- **Secret scanning with push protection** is on for the repository.
- **Debug modes, verbose errors and dev-tool endpoints are off in production by environment**, not by flag or token alone.

## Errors, logging and audit

- **Clients get a generic message and a correlation id.** What a message may contain is in `coding-standards`.
- **The error tracker scrubs before sending:** authorization headers, cookies, tokens, passwords, and the bodies of auth and payment requests.
- **Security events are recorded in the audit trail** — who, what, when, from which IP and client, with what outcome:
  - sign-ins, successful and failed
  - changes to password, email or MFA
  - session revocations
  - role changes
  - admin actions on other users' data
  - payouts and refunds
  - data exports and account deletions
- **The audit trail is append-only**, kept apart from debug logs, retained longer, and readable only by roles that need it.
- **Alerts fire on patterns:** spikes in failed sign-ins, 401s and 403s, webhook signature failures, and unusual payouts.

## Personal data

- **Collect only what a feature uses.** Every personal field traces to a feature that needs it.
- **Every kind of personal data has a retention period.** A scheduled job deletes or anonymizes it when the period ends.
- **Account deletion removes or irreversibly anonymizes the user's personal data** everywhere it lives: database, storage, caches, search indexes and third parties. Records kept for legal or financial reasons — invoices, the ledger — keep their amounts and lose their personal fields. A soft delete is not deletion.
- **Data exports** are generated asynchronously, delivered through a short-lived signed link, and audit-logged.
- **Non-production environments hold seed data only.**
- **This file is the engineering floor, not legal compliance.** The privacy law of the markets the product serves is confirmed with the product owner.

## Supply chain and access

- **Lockfiles are committed, and installs use them exactly.** A new dependency must be maintained and widely used, and earn its weight; a few lines of code are written, not installed.
- **The pipeline audits dependencies** and fails on a high or critical vulnerability that has a fix. Update PRs go through the same checks as any other.
- **Runtime images** pin their base image, exclude dev dependencies and build tools, contain no secrets, and run as a non-root user.
- **CI workflows** pin third-party actions to a commit SHA, give each job the least token permission, and expose secrets only to the jobs that need them — never to pull requests from forks. Deploy secrets live in GitHub environments that only `main` can deploy to, never as repository secrets, which a workflow on any branch can read.
- **People:** MFA on GitHub, the hosting platform, the cloud and DNS accounts. Least-privilege roles for everyone. Access is removed the day someone leaves.
