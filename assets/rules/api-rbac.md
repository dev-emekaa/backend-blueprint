# API RBAC

> **What this is:** every endpoint that exists in this backend, grouped by backend module, with who may call it and on what condition. It is the access-control specification each guard is checked against, **and** the proof an endpoint exists — a screen spec writes `METHOD /path` only for an endpoint listed here, and `pending` for everything else.
> **When it changes:** only when an endpoint is built, modified or deleted. Never ahead of the code.
> **Entry format and the full conventions:** the API RBAC skill.

## Role definitions

<!-- Filled once, during Phase 0. Every role, its scope, what it means, how it is assigned.
     Account-level roles are loaded server-side per request, never read from the token. Resource-scoped roles are relationships computed
     per request from the data — one person can hold one on one record and not another. -->

| Role | Scope | Description | How assigned |
| --- | --- | --- | --- |

## Permission values

| Value | Meaning | Enforced by |
| --- | --- | --- |
| `YES` | Full access | Authentication only, no further guard |
| `NO` | No access | Role guard rejects |
| `PUBLIC` | No authentication required | No auth guard on the route |
| `OWN` | Own records only | The caller's identity matched against the record's owner |
| `{SCOPE}` *(one value per relationship)* | Records within one relationship | The named guard or service check for that relationship |
| `CONDITIONAL` | Business rules decide | The Conditions column, always non-empty |

<!-- Define one {SCOPE} value per scoping relationship this project actually has, each naming
     the guard that enforces it. Do not invent scope values the code has no mechanism for. -->

## Principals

<!-- Only where this system has more than one kind of principal (for example an end-user token
     and an administrator token). Each principal gets its own matrices below — never an extra
     column on another principal's table. Delete this section if there is only one. -->

## Delegation and inheritance

<!-- Where one role implies another, or authority can be granted temporarily. One permission
     value per authority tier, each naming its guard. Time-bounded authority is evaluated at
     request time against the current clock and expires in the guard or query, never by the
     job that cleans it up. Delete this section if nothing is delegable. -->

---

<!-- One section per backend module, added as endpoints are built:

## {MODULE} MODULE ({n} endpoints)

| Endpoint | {Role} | {Role} | Conditions |
| --- | --- | --- | --- |
| `{METHOD} /path` | {value} | {value} | {condition, or None} |

No endpoints built yet. -->
