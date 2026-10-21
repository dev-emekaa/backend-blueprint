---
name: background-jobs
description: Create, update or audit a project's background-jobs register — every piece of work no client request triggers, organised by backend module. Use when registering built jobs, establishing the trigger vocabulary, or reconciling the register against the code.
---

# Background Jobs

The background-jobs register is the complete inventory of every piece of work the backend runs that no client request triggers: scheduled sweeps, delayed one-shots, event-driven work, and inbound provider webhooks. It records what each one does, how it is triggered, the state it selects for, what makes a second run a no-op, how it retries, what it emits, and how to fire it by hand.

It is to background work what the api-rbac register is to endpoints: the single place a job is named, and the file that must gain an entry whenever background work is added.

**Why it exists.** A broken endpoint returns an error to somebody. A cron that stops firing produces *nothing*, and the failure surfaces days later as a thing that never expired, a refund that never landed, or a state that never advanced. Background work is the least visible part of a backend and the part where silence is indistinguishable from success. The register is what makes it as auditable as the endpoint matrix.

## Where it lives

`.claude/rules/background-jobs.md` — a rule, loaded every session, not a doc under `docs/`.

It takes no audience or client segment in its name. **Registers follow the code; docs follow the product.** This file is read by whoever is writing backend code inside a module, so it follows the module structure of the codebase rather than the product's feature areas.

## When it changes

**Only when a job is built, modified or removed. Never ahead of the code.**

Registration is also mechanically load-bearing: being listed here is what makes a job dispatchable by name, so an unregistered job fails its first manual dispatch — which is exactly when verification catches it.

- **Built** → add its entry, in its module, and to the index.
- **Changed** — trigger, selection criteria, or failure behaviour → update its entry.
- **Removed** → delete its entry and its index row.

## Inputs

Take these from the project. Ask for anything missing before starting.

- **The jobs themselves** — processors, cron declarations, event handlers and webhook routes, plus the service methods they call.
- **The module structure** — from the backend architecture doc; the register's sections mirror it.
- **The app flows** — each job implements a system action from a flow, and the entry links it.
- **The queue or scheduler configuration** — the project-wide retry, backoff and retention defaults.
- **Scope of this pass** — a single module (default when registering a build), several, or the whole file (creation or reconciliation).

---

## Established once per project

### Trigger types

| Type | Meaning |
| --- | --- |
| **scheduled** | A cron on a fixed expression. Sweeps for work; owns no per-entity timer. |
| **delayed** | A one-shot enqueued with a delay, keyed to one entity. Fires once, at a computed moment. |
| **event-driven** | Enqueued with no delay in reaction to a domain event. Runs as soon as a worker is free. |
| **inbound webhook** | Initiated by an external provider calling in. Neither enqueued nor scheduled. |
| **lazy-on-read** | Deliberately *not* a job — evaluated on the next request that cares. |

**Record the lazy-on-read decisions too.** A state change that could have been a job and deliberately was not is worth naming, with the reason. Otherwise the decision gets re-litigated every few months, or somebody adds a redundant cron for something the read path already handles.

### Global defaults

State once, near the top, what the queue or scheduler applies to everything: attempts, backoff, and how long completed and failed jobs are retained. Entries then record only where they deviate.

Retaining failed jobs is worth stating as a decision rather than leaving as a default. A retained failure is often the only trace of work that never happened, and it is what makes a silent miss discoverable.

### Job index

A single table above the module sections, so one scan answers what runs and how often:

```markdown
| Job | Module | Trigger | Schedule / delay |
| --- | --- | --- | --- |
| `{job-name}` | {Module} | {type} | {expression, delay basis, event, or provider} |
```

---

## Entry format

One section per backend module, with the job count in the heading. Each entry:

```markdown
### `{job-name}`

- **Trigger** — {type} · {cron expression, delay basis, domain event, or provider}
- **Owner** — {module} · {where the handler lives}
- **Produced by** — {the call site that enqueues it — queued jobs only}
- **Does** — {one line}
- **Flow served** — {link to the app-flow system action or business rule it implements}
- **Selects** — {the state predicate it queries for}
- **Idempotency** — {what makes a second run a no-op}
- **Retry / failure** — {attempts, backoff, and where a permanent failure surfaces}
- **Emits** — {notifications, ledger writes, external calls}
- **Concurrency** — {whether two runs may overlap}
- **Manual trigger** — {the dispatcher key that fires it}
- **Known issues** — {only where one exists}
```

**What the fields are for.** Each one records how the entry satisfies a requirement the code must meet. The requirements themselves are engineering rules owned by the backend build process; here they explain why a field cannot be left vague:

- **Selects** carries a *state predicate*, never a time window — "records whose deadline has passed and are still in the state the job acts on", not "records created exactly N hours ago". A missed, delayed or retried run then self-heals on the next tick. This is also what makes the job idempotent by construction: if the handler transitions the record out of the state, the second run selects nothing.
- **Idempotency** states what makes a re-run a no-op. Where the selection predicate supplies it for free, say so. Where it does not — a job reading a time window rather than a state — name the explicit marker that records the window as processed.
- **Retry / failure** names the **surface**, not just the counts. A job that dies silently is worse than no job. "A retained failed job on the queue", "an error to the monitoring service", "a log line nobody watches" — the last is a legitimate answer; leaving it unstated is not. A scheduled job also checks in to a cron monitor, so a run that never happens is caught too.
- **Emits** is the job's blast radius. It is what tells a reader whether a stuck job costs a missed notification or a missed payment.
- **Manual trigger** is how the job is verified at all. Work that can only be observed by waiting is work that is never checked.

**Two more rules for entries:**

- **Any job with a day, week or calendar boundary states where that boundary falls.** Timestamps are stored in UTC, and "a day" is otherwise the reader's guess.
- **A new scheduled job's first tick finds every record that has accumulated in its target state.** Where that matters — the job has an external side effect and the backlog is not empty — the bound placed on it, a batch limit or a cutoff, is part of the selection criteria and belongs in **Selects**, not in a note to be removed later.

## Inbound webhooks are registered twice

A webhook handler is both a real endpoint and system-triggered work, so it gets an entry in **both** registers, each linking the other:

- **api-rbac** — with access recorded as *signature-verified third party*, naming the provider, rather than as a user role.
- **Here** — with its provider, callback path, idempotency key and retry behaviour.

An endpoint no screen calls and no role owns is the one most likely to end up unauthenticated. Listing it in both places is what prevents that.

---

## Creating and reconciling the whole file

**Creating it** — write the trigger types, global defaults and an empty index first. Then one section per module, from the background work that exists.

**Reconciling it** against the code — three passes:

1. **Every job in the code has an entry**, and every entry is in the index. Unregistered background work is invisible and cannot be dispatched.
2. **Every entry has a job.** A stale entry describes work nobody is doing.
3. **Every entry matches its code** — the trigger, the actual query predicate, and the retry configuration. A `Selects` line that no longer matches the query is how a job quietly starts acting on the wrong records.

Report what reconciliation finds rather than silently correcting the file. A mismatch is as likely to be a defect in the job as in the entry.

**The register records what is, not how it got there.** Keep `Known issues` for defects that are live now. A refactor that has already landed, a handler that used to hold logic and no longer does — that is history, and git holds it. A changelog inside a register makes the current state harder to read, which is the one thing the file exists to make easy.

---

## Quality checklist

- Every piece of background work in the codebase has an entry, in the module it belongs to, and a row in the index.
- Every entry names its trigger type from the defined set.
- Every `Selects` is a state predicate, not a time window, and carries any first-tick bound.
- Every entry states what makes a second run a no-op.
- Every entry names where a permanent failure surfaces.
- Every entry names its manual trigger.
- Any job with a calendar boundary says where that boundary falls.
- Inbound webhook entries cross-link their api-rbac entries.
- Deliberate lazy-on-read decisions are recorded, with their reason.
- Module headings carry job counts that match the entries beneath them.
- Nothing in the file describes work that has not been built, and nothing records history.
