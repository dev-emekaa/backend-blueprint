---
name: api-docs
description: Create or update the per-feature-area API integration docs the client team builds against. Use when documenting a feature area's endpoints — request and response shapes, access, errors, side effects and background behaviour — after they are built.
---

# API Docs

You are a senior backend engineer and technical writer producing API integration docs for the client team.

Generate accurate, concise, scannable API docs so an integrator can wire screens to the backend **without reading the codebase**. Output: one `api-docs-{audience?}-{feature-area}.md` per feature area, plus a shared conventions doc and (only if needed) a shared cross-area doc.

## Inputs

Take these from what I said when invoking, and from the project's own files. Ask for anything missing before starting.

- **Scope** — `all` (every feature area whose endpoints are built), a comma-separated subset, or a single area. Default `all`.
- **Feature area(s)** — which areas to document.
- **Source code (source of truth)** — the controllers/routes, DTOs/validation, and services for each area.
- **Endpoint + access reference** — the api-rbac register: the endpoints and their role/permission rules.
- **Flow docs (optional)** — the user/system flows each endpoint powers.
- **Screen docs (optional)** — the screens that consume each endpoint's data.
- **Business rules (optional)** — the rules the endpoints enforce (for context; don't transcribe verbatim).
- **Conventions doc (optional)** — the existing shared conventions doc, if any.
- **Output location** — from the `CLAUDE.md` documentation map: `docs/api-docs/`. All doc inputs above are located through the same map.

## Hard rules

1. **The running code is the single source of truth.** For each area, enumerate its endpoints from the code + endpoint reference **first** (so coverage is complete), then document each. Read the actual DTOs/services for request shapes, response shapes, validation constraints, error messages, and side effects. **Never invent a shape or a field.** When the flow/screen/access docs disagree with the code, document the code and **report the divergence to me** — do not silently reconcile, and do not write the divergence into the doc.
2. **One file per area, `api-docs-{audience?}-{feature-area}.md`.** For `Scope = all`/subset, process each area **independently, area by area** (one file at a time) — never emit one giant merged document.
3. **Audiences and clients.** The primary audience sits at the root of `docs/api-docs/`; other audiences get `{audience}/` subfolders. Root API docs are platform-wide and bind every audience; an audience file holds only what is unique to it. API docs never split by client — an endpoint used by only some clients carries a `Clients:` field instead.
4. **Concise, no bloat.** Omit any section that doesn't apply to an endpoint. No filler, no restating global conventions per endpoint.
5. **Realistic examples.** Use real-looking ids, names, and ISO-8601 UTC timestamps in JSON — never `{"foo":"bar"}`.
6. **Errors = realistic and client-actionable only.** Cover validation, auth, ownership, state-conflict, and business-rule errors with status + the stable error code + the real thrown message. Skip generic 500s and unbounded cases.
7. **Deprecated endpoints and fields stay documented until they are removed.** Mark each one deprecated and name what replaces it, so client devs know not to build on it. It leaves the doc only when the thing itself is deleted.
8. **Resolvable links.** Cross-reference anchors must slugify correctly (lowercase, dashes, no punctuation).
9. **Take stock first.** Existing docs are updated in place, not regenerated.

## Cross-cutting artifacts (produce alongside the per-area docs)

- **Conventions doc — conditional.** If globals repeat across endpoints (auth header + refresh, error envelope, pagination params/envelope, date format, idempotency, soft-delete → 404, file-upload rules), put them **once** in `api-docs-conventions.md` and have each area doc point at it — don't restate per endpoint. If the API is tiny or has no meaningful shared rules, inline the few globals in the area doc's own conventions section and skip a separate file. Keep it code-accurate. Suggested sections: Base URL(s) & environments · Authentication (tokens, refresh, revocation, the required CSRF header for the web client; the platform and version headers, and tokens in the body, for native clients) · Roles/access model · Error responses (codes + body shape) · Validation · Pagination · Dates · File uploads · Any other cross-cutting mechanic (push, idempotency, soft deletes, deep links). Two entries always belong here where they apply: **clients must tolerate unknown enum values**, which is what keeps adding an enum value additive rather than breaking; and, where a nullable column was added after launch, that **NULL means *not collected*** rather than a default.
- **Shared doc — conditional.** Create `api-docs-shared.md` **only** for endpoints with no single-area home or genuinely cross-area system/utility endpoints. An endpoint that has a clear owner but is *consumed* by other areas stays in its owner's doc and is cross-linked — do **not** move it to shared.

## Phase builds

In a phase build, a feature's endpoints go into the canonical file of each area they belong to. API docs are never written into phase folders.

## Per-area document template

Produce each `api-docs-{audience?}-{feature-area}.md` in exactly this order, omitting any part that doesn't apply:

````markdown
# API — {Feature Area}

Read conventions first{ — note the section most relevant to this area, if any}.

## Overview

{1–2 sentences: what this area's endpoints cover.}

Cross-references:
- App flow: {app-flow doc}
- Screen specs: {screen-specs doc}
- API testing: {api-testing doc}

## Roles & access summary

| Endpoint | Access | Ownership |
| --- | --- | --- |
| `{METHOD} /path` | {role(s)} | {OWN / {scope} / — } |
{one row per endpoint; drop the Ownership column if no endpoint is ownership-scoped}

## Area-specific conventions

- {Bullets for rules unique to this area — enums, tier gates, cooldowns, state machines. Omit the whole section if none.}

---

## Endpoints

### {METHOD} /path/:param — {short title}

{1–3 sentence description: purpose + any critical business logic.}

**Access:** {role} ({OWN | scope | none}).
**Clients:** {client(s)} — only when the endpoint is used by some clients, not all; no field means all clients.
**Used on screens:** {Screen}{, ...}
**Used in flows:** {Flow N — Title}
**API testing:** {section}

**Path params**
| name | type | notes |
| --- | --- | --- |

**Query params**
| name | type | required | default | notes |
| --- | --- | --- | --- | --- |

**Request body**
```json
{ realistic example }
```
| field | type | constraints |
| --- | --- | --- |

**Success — {2xx}**
```json
{ realistic example }
```
{one-line notes on non-obvious fields, or a small field table, only if needed}

**Errors**
| status | code | when | example message |
| --- | --- | --- | --- |

**Side effects**
- {write endpoints only: notifications fired, jobs enqueued, ledger/DB writes, external API calls}

**Related calls / notes**
- {what to call before/after, what to refetch on success, and any lean integration gotcha}

**State transitions**
- {ENTITY: STATE_A → STATE_B — only when the endpoint moves an entity between states}

---

## Background behaviour

{For each state in this area that can change without the client calling anything. Omit the section if none.}

### {What changes}

- **Cause:** {what triggers it}
- **When:** {roughly — schedule, delay, or triggering event}
- **How the client finds out:** {poll / push notification / next fetch}
````

Repeat the whole `### {METHOD} /path — {title}` block above for **every** endpoint in the area, each separated by a `---` rule (as after `## Area-specific conventions`).

**Section presence:** Heading, description, Access, and (for write endpoints) Errors are always present. Clients, Path/Query params, Request body, Side effects, Related calls/notes, and State transitions appear only when they apply. `Used on screens` / `Used in flows` / `API testing` appear when those docs exist.

**Endpoint ordering:** by business flow (setup → discovery → primary actions → sub-actions), not CRUD order.

**Background behaviour:** the client cannot integrate correctly against state it doesn't know can move on its own, so every scheduled, delayed, event-driven and webhook-driven change that the client can observe belongs in that section.

## Output & quality checklist

- One `api-docs-{audience?}-{feature-area}.md` per area in its canonical folder; `api-docs-conventions.md` and (if warranted) `api-docs-shared.md` alongside.
- Every documented endpoint exists in the code; every code endpoint for the area is documented.
- Every endpoint used by only some clients carries its `Clients:` field; everything else carries none.
- Every state that changes without a client call is in the Background behaviour section, with how the client finds out.
- Anything deprecated but not yet removed is still documented, marked deprecated, with its replacement named.
- JSON examples match the actual DTO/serializer field names and types.
- Every cross-reference link resolves.
- No project-specific assumption leaks in — read the provided inputs for this project's real names and shapes.
- If a maintained index/README lists per-area endpoint counts, update it for any area you changed.
