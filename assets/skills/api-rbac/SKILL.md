---
name: api-rbac
description: Create, update or audit a project's api-rbac register — the complete inventory of every endpoint that exists, with who may call it and on what condition, organised by backend module. Use when registering built endpoints, establishing the project's permission vocabulary, or reconciling the register against the routes.
---

# API RBAC

The api-rbac register is the complete inventory of every endpoint the backend actually has, grouped by backend module, recording per role whether access is granted, denied or conditional — and on what condition.

It does two jobs:

- It is the **access-control specification** every endpoint's guard is checked against. A guard that disagrees with its row is a defect in one of the two.
- It is the **proof an endpoint exists**. A screen spec writes `METHOD /path` only for an endpoint listed here, and `pending` for everything else.

## Where it lives

`.claude/rules/api-rbac.md` — a rule, loaded every session, not a doc under `docs/`. Path-scope it to the backend paths once it grows large enough that loading it everywhere costs more than it gives.

It takes no audience or client segment in its name. **Registers follow the code; docs follow the product.** Business rules, app flows, screen specs, api-docs and api-testing are organised by feature area because their readers think in features. This file is read by whoever is writing backend code inside a module, asking "what is in this module, and does this guard match?" — so it follows the module structure of the codebase, and the route paths sort the same way.

## When it changes

**Only when an endpoint is built, modified or deleted. Never ahead of the code.**

A planned endpoint belongs in a build plan, not here. Registering something that does not exist breaks the one guarantee the file offers, and makes every `pending` reference in the screen specs unsafe to fill in.

- **Built** → add its row, in its module.
- **Changed** — path, roles, or record scope → update its row.
- **Deleted** → remove its row.

A build session registers its endpoints after building them, not while planning them.

## Inputs

Take these from the project. Ask for anything missing before starting.

- **The routes** — controllers/routes, guards and decorators, and the service-layer checks that enforce record scope.
- **The module structure** — from the backend architecture doc; the register's sections mirror it.
- **The roles** — from the PRD, and the business rules' access tables where they exist.
- **Scope of this pass** — a single module (default when registering a build), several, or the whole file (creation or reconciliation).

---

## Established once per project

These sections sit at the top of the file, before the first module. They are written when the register is created and revised only when the project's access model itself changes.

### Role definitions

Every role, with its scope, what it means, and how it is assigned. The distinction that matters:

- **Account-level roles** are loaded server-side on every request — never read from the token — so a role change takes effect at once. They are what a role decorator or guard checks directly.
- **Resource-scoped roles** are not account roles at all — they are relationships computed per request from the data (the owner of this record, the lead of this group). One person can hold such a role on one record and not another.

State this explicitly, because conflating the two is how an endpoint ends up guarded by a decorator that cannot see the relationship it is meant to enforce.

### Permission values

The vocabulary every cell in every matrix draws from. Each value states how it is enforced:

| Value | Meaning | Enforced by |
| --- | --- | --- |
| `YES` | Full access | Authentication only, no further guard |
| `NO` | No access | Role guard rejects |
| `PUBLIC` | No authentication required | No auth guard on the route |
| `OWN` | Own records only | The caller's identity is matched against the record's owner |
| `{SCOPE}` | Records within one relationship | The named guard or service check for that relationship |
| `CONDITIONAL` | Business rules decide | The Conditions column, always non-empty |

Define one `{SCOPE}` value per scoping relationship the project actually has, each naming the guard or check that enforces it. Do not invent scope values the code has no mechanism for.

### Principals

Where the system has more than one kind of principal — for example an end-user token and an administrator token — say so here, and give **each principal its own matrices**. The principal claim is checked before any role logic runs, so there is no cell in which one principal could appear in the other's table.

Never bolt an extra column onto a matrix for a different principal. A column implies the two are compared on the same axis; they are not, and a reader who takes the column at face value will assume an override exists where none does. Where a principal needs to act on something, it does so through a route built for it, and where no such route exists, neither does the capability.

### Delegation and inheritance

Where one role implies another, or where authority can be granted temporarily, record it here once rather than in every affected row. State what is delegable, what is reserved, and how long a grant lasts.

**Give each authority tier its own permission value.** Where an action can be taken by more than one kind of holder — an owner, a standing deputy, a temporary delegate — define one value per tier, each naming its own guard, rather than one shared value plus a prose list of exceptions. A row that needs a footnote to be read correctly will eventually be read incorrectly, and the reserved set is then enforced by which value a row carries instead of by a reader remembering an exception.

**Time-bounded authority is evaluated at request time, against the current clock.** It is never cached with the session, and its expiry is enforced in the guard or the query — not by whatever job cleans the grant up afterwards. If that job runs late, an expired grant must already be dead. This is the state-derived principle applied to authorization: the state is the source of truth and the job is only housekeeping.

---

## Per-module entry format

One section per backend module, with the endpoint count in the heading as a cheap integrity check against the code:

```markdown
## {MODULE} MODULE ({n} endpoints)

| Endpoint | {Role} | {Role} | Conditions |
| --- | --- | --- | --- |
| `{METHOD} /path` | {value} | {value} | {condition, or None} |
```

Rules for rows:

- **Every endpoint in the module has exactly one row.** No endpoint appears in two modules.
- **`CONDITIONAL` always carries a condition.** A `CONDITIONAL` cell with an empty Conditions entry says nothing at all and is the most common way a row becomes useless.
- **Name the source of a non-obvious condition** — the rule or flow it comes from — so a reader can check it rather than take it on trust.
- **Order rows by the module's own flow** — setup, then discovery, then primary actions, then sub-actions — not alphabetically and not by HTTP verb.
- **Cross-cutting module behaviour goes in a note below the table**, not repeated into every row. A rule that refuses a whole group of endpoints under some condition is one note, not six cells.
- **Drop a role column** where the whole module denies it and the denial is not informative.

## Endpoints with no user role

Three kinds of endpoint have no user principal at all. Each is the kind most likely to end up unguarded, which is exactly why each is listed rather than omitted:

- **Public endpoints** — reached with no token. Marked `PUBLIC`, not as a role grant. An endpoint called before anyone is authenticated is not "allowed for every role"; it is outside the role system.
- **Inbound webhooks** — called by a third party, never by a user. Access is recorded as *signature-verified third party*, naming the provider. These are registered in the background-jobs register as well, and each entry links the other.
- **Dev-tool endpoints** — a reseed route, a job dispatcher, anything similar. They are live routes and they belong here, with their environment gating stated. A token is a second lock, not the only one, and the route must not register at all in production.

---

## Creating and reconciling the whole file

**Creating it** — write the established-once sections first, from the PRD and the business rules' access tables. Then one section per module, from the routes that exist. A register created before any endpoint exists is an empty skeleton, and that is correct.

**Reconciling it** against the code — three passes, each of which finds a different class of defect:

1. **Every route in the code has a row.** A missing row is an endpoint nobody has decided the access model for.
2. **Every row has a route.** A stale row describes access to something that no longer exists, and will be trusted by the next person who reads it.
3. **Every row matches its actual enforcement** — the role decorator, the scope guard, and the service-layer check. A row that is more permissive than the code is a documentation bug; a row that is more restrictive than the code is a security hole.

Report what reconciliation finds rather than silently correcting the file: a mismatch is as likely to be a defect in the code as in the register, and which one is wrong is not a call to make inside a documentation pass.

---

## Quality checklist

- Role definitions distinguish account-level roles from resource-scoped relationships.
- Every permission value used in a matrix is defined, and names how it is enforced.
- Each principal has its own matrices; no principal appears as a column in another's.
- Every endpoint in the codebase has exactly one row, in the module it belongs to.
- Every `CONDITIONAL` cell has a non-empty condition.
- Public endpoints, inbound webhooks and dev-tool endpoints are all listed, none as role grants.
- Inbound webhook entries cross-link their background-jobs entries.
- Module headings carry endpoint counts that match the rows beneath them.
- Nothing in the file describes an endpoint that has not been built.
