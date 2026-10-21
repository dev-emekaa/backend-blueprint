---
name: feature-areas
description: Identify every feature area of a product from its PRD and order them for building, producing the feature-areas registry. Use at the start of a project before any business rules, flows or specs exist, and to test whether a later phase's proposed area is genuinely new.
---

# Feature Areas

You are a senior product + backend engineer reading a product's requirements and deciding how it divides into feature areas, and in what order those areas should be built.

This runs **first**, before any business rules, app flows or screen specs exist. Every one of those docs is written per feature area, so the division and the order have to be settled before any of them can start. The output is `docs/feature-areas.md` — the permanent registry of every feature area in the product, in build order.

## Inputs

Take these from the project. Ask for anything missing before starting.

- **PRD** — the product requirements: what it does, its features, and its user roles. The primary source.
- **Product brief (optional)** — positioning, goals, constraints, anything that frames what matters.
- **Supporting docs (optional)** — anything else supplied about specific features.
- **`CLAUDE.md`** — the documentation map, and the audiences and clients if already recorded.

Read the PRD in full before dividing anything. A division made from a skim splits one area in two or merges two that have separate lifecycles, and every doc written afterwards inherits the mistake.

---

## What a feature area is

A **feature area** is a user-facing area of the product that owns a piece of the domain end to end: every flow that belongs to it, across every role that participates, happy paths and error paths alike.

An area is warranted **only when all three hold**:

1. It owns a **root entity** no other area owns.
2. That entity has its **own lifecycle** — transitions governed by something more than a plain edit. The number of states does not matter: `draft → published → archived` qualifies, because publishing is gated and changes who can see the thing. Create, edit, delete does not — every record in every table has that.
3. It has **user-facing surfaces of its own** — screens, or flows a person moves through — and they do not sit naturally on another area's.

Failing any one, it is not an area — it **extends** an existing one. Two candidates that share a root entity are one area. A candidate with no lifecycle of its own is a feature of whichever area owns the entity it acts on.

**Areas are domain divisions, not role divisions.** "Admin" is not a feature area because it is a role; the admin's work on orders belongs to whichever area owns orders, or to a separate audience entirely. Where a group of roles uses its own separate product with its own screens and rules, that is an **audience**, recorded in `CLAUDE.md` — not a feature area. Apply the audience test from the documentation conventions before splitting an area by who uses it.

**Areas are not screens either.** A settings screen that edits four areas' data is not a Settings area; each setting belongs to the area that owns the rule behind it.

**Areas are not mechanisms.** Notification delivery, file storage, a queue — these own entities and have lifecycles, so they clear the first two tests, but nobody moves through them. Their rules belong to the areas that trigger them, and their aggregates still become backend modules, which is a separate list.

**Areas cross, and that is normal.** A screen can display data three areas own; a flow can pass through several. Crossing is not a sign the division is wrong — it is what a product does. What matters is that each artifact has exactly one home: a **screen** or **flow** belongs to the area owning the entity whose lifecycle it advances, and a **rule** to the area owning the entity it constrains. A read-only screen advances nothing: a dashboard or a report belongs to the area whose decisions it serves — the action its viewer takes from it — and only where it serves none, the area owning most of what it shows. Everywhere else it is cross-referenced by name, never duplicated.

## Identifying them

1. **List every feature in the PRD**, and every user role.
2. **Name the root entities** the product is about — the things that have identity, persist, and move through states.
3. **Group each feature under the entity whose lifecycle it advances.** A feature that advances no entity's lifecycle is a read or a report; it belongs to the area owning the data it reads.
4. **Apply the three-part test** to each group. Merge what fails it.
5. **Check the leftovers.** Features that landed nowhere are the useful signal: either an entity is missing from step 2, or the feature is a cross-cutting concern that belongs to an area you already have.
6. **Name each area** for the domain it owns, in the product's own vocabulary — not for a screen, a role, or a technical layer.

Where the PRD is silent or contradictory about something that changes the division, ask rather than deciding. Raise any other gap or contradiction you notice while reading it too — an underspecified feature, two feature descriptions that disagree — even where the division is unaffected. This is the first time anyone reads the PRD end to end, so it is the cheapest moment to find them; the phase review can audit it in full on demand. A wrong boundary is the most expensive mistake available at this stage: it propagates into the business rules, the flows, the specs, the schema's aggregate roots and the backend's modules.

## Ordering them

Build order is determined by dependency, not by importance or by what is most interesting.

1. **Identity first.** Whatever owns accounts and authentication comes first; nothing else can be exercised without a user.
2. **An area whose root entity another area references comes before that area.** This is the main rule, and it follows the same chain the schema's foreign keys will.
3. **An area that produces data comes before an area that only displays it.**
4. **Areas nothing depends on come last** — reporting, analytics, anything purely consumptive.
5. **Money follows the thing being paid for.** Payments and balances are built after the entities they settle against exist.
6. **Break cycles deliberately.** Where two areas reference each other, they are not both blocked: name the minimal part of one that the other needs, build that first, and record the split. An undeclared cycle stalls the build at the point somebody notices it.

**Every position records its reason** — what the area depends on, or why nothing blocks it. An order without reasons cannot be re-derived when a later change makes you revisit it.

---

## The registry

Write `docs/feature-areas.md`. This one file is the product's permanent list of feature areas **and** the first phase's build order and tracker.

```markdown
# Feature Areas

> **What this is:** every feature area in the product, in build order. The first phase is built one feature area at a time, top to bottom. Later phases are built one feature at a time and order those features in their own `docs/phase-{n}/implementation-order.md`; a new area they introduce is added here.
> **Readiness:** `Draft` — its context docs are not final; never build from it · `Ready` — every context source written, reviewed, and nothing outstanding; safe to build · `Built` — endpoints, jobs, tests and API docs done. The same three values track a later phase's features in its `implementation-order.md`.
> **Conventions:** see the documentation conventions rule, which defines these values.
> **Order:** by dependency. Each row records why it sits where it does. Any reordering is recorded with its reason.
> **New areas:** a later phase adds its area here as `Draft`, and its readiness advances when that phase's build promotes it. Canonical files are never created ahead of that — see the no-stub rule in the documentation conventions.

| # | Feature area | Owns | Used by | Readiness | Introduced | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | {area} | {root entity} | {audience · clients} | Draft | Phase 1 | — |
| 2 | {area} | {root entity} | {audience · clients} | Draft | Phase 1 | {area(s)}, or the reason nothing blocks it |
```

**Notes on the registry:**

- **`Owns`** names the root entity, which is what makes the boundary checkable later. It is also what the schema's aggregate roots and the backend's modules are derived from.
- **`Used by`** lists the audiences and clients that use the area, e.g. `User · mobile, web; Admin · web` — which client teams integrate it and sign off its releases. One row per area, never one per platform: the area's endpoints serve all of them, and the order follows what each area's data depends on, not which app shows it.
- **`Introduced`** is the phase the area first appeared in. It never changes.
- **`Depends on`** is the justification for the row's position, not a restatement of the schema.
- Where an area was split to break a cycle, both parts appear, and each says so in `Depends on`.

## Maintaining it

- **During the first phase**, each area's readiness advances as its docs are written and reviewed, and then as it is built. Nothing else edits the file.
- **In a later phase**, the phase review applies the three-part test to any proposed new area, records the alternative it rejected, and adds the area here as `Draft`. Its build position is governed by that phase's `implementation-order.md`, which orders features; this registry only records that the area exists and what it owns.
- **Reordering** during the first phase is allowed when a dependency was missed. Record the reason in the row that moved.
- **An area is never removed.** If a planned area turns out to belong inside another, merge it and note the merge in the surviving row, so the decision is not re-litigated.

---

## Quality checklist

- Every feature in the PRD belongs to exactly one feature area.
- Every area passes all three parts of the test, and each proposed area that failed is recorded as part of the area that absorbed it.
- No area is named after a role, a screen, or a technical layer.
- Every area names the root entity it owns, and no entity is owned twice.
- Groups of roles that use a separate product are recorded as audiences in `CLAUDE.md`, not as feature areas.
- The order is a dependency order, every row states its reason, and any cycle is broken explicitly.
- Anything the PRD left ambiguous about a boundary was asked about, not decided silently.

## What happens next

Once the registry is approved, the documentation pipeline runs per feature area, in this order: **business rules** → **app flows** → **screen specs**, each with its own skill, each gated on the previous being settled. The phase review audits them. Only then does the backend build begin, taking this registry as its build order and tracker.
