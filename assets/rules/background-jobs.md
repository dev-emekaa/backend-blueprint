# Background Jobs

> **What this is:** every piece of work this backend runs that no client request triggers — scheduled sweeps, delayed one-shots, event-driven work, and inbound provider webhooks. A broken endpoint returns an error to somebody; a cron that stops firing produces nothing, and silence is indistinguishable from success. This register is what makes background work as auditable as the endpoint matrix.
> **When it changes:** only when a job is built, modified or removed. Being listed here is also what makes a job dispatchable by name, so an unregistered job fails its first manual dispatch.
> **Entry format and the full conventions:** the Background Jobs skill.

## Trigger types

| Type | Meaning |
| --- | --- |
| **scheduled** | A cron on a fixed expression. Sweeps for work; owns no per-entity timer. |
| **delayed** | A one-shot enqueued with a delay, keyed to one entity. Fires once, at a computed moment. |
| **event-driven** | Enqueued with no delay in reaction to a domain event. Runs as soon as a worker is free. |
| **inbound webhook** | Initiated by an external provider calling in. Neither enqueued nor scheduled. |
| **lazy-on-read** | Deliberately *not* a job — evaluated on the next request that cares. |

## Lazy-on-read decisions

<!-- A state change that could have been a job and deliberately was not, with the reason.
     Recording these stops the decision being re-litigated, or a redundant cron being added
     for something the read path already handles. -->

## Global defaults

<!-- Filled once, when the queue or scheduler is set up: attempts, backoff, and how long
     completed and failed jobs are retained. Entries below then record only deviations.
     Retaining failed jobs is worth stating as a decision — a retained failure is often the
     only trace of work that never happened. -->

## Job index

| Job | Module | Trigger | Schedule / delay |
| --- | --- | --- | --- |

---

<!-- One section per backend module, added as jobs are built:

## {MODULE} MODULE ({n} jobs)

### `{job-name}`

- **Trigger** — {type} · {cron expression, delay basis, domain event, or provider}
- **Owner** — {module} · {where the handler lives}
- **Produced by** — {the call site that enqueues it — queued jobs only}
- **Does** — {one line}
- **Flow served** — {link to the app-flow system action or business rule it implements}
- **Selects** — {the state predicate it queries for, including any first-tick bound}
- **Idempotency** — {what makes a second run a no-op}
- **Retry / failure** — {attempts, backoff, and where a permanent failure surfaces}
- **Emits** — {notifications, ledger writes, external calls}
- **Concurrency** — {whether two runs may overlap}
- **Manual trigger** — {the dispatcher key that fires it}
- **Known issues** — {only where one exists}

No jobs built yet. -->
