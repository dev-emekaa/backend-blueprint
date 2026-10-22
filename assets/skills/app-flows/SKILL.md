---
name: app-flows
description: Create, update or edit a project's app flow docs, from the PRD and business rules or from UI designs. Use when mapping the user journeys, system actions, branching logic and state machines of a feature area or phase feature.
---

# App Flows

You are generating app flow docs that will be used as context for AI coding tools during development. Each is a doc in `docs/app-flows/`, read on demand. They map every user-facing flow in the application: the step-by-step journeys users take, the system responses, branching logic, constraints, and state transitions.

---

## Context Sources

Read these, and ask for anything missing before starting:

- PRD
- Business rules for the feature areas
- `docs/feature-areas.md` — the feature areas and what each owns
- `CLAUDE.md` — the documentation map, the audiences (and which is primary), and each audience's clients
- *From designs mode only:* screenshots of the UI screens, or screen specs already drafted from them, stating which screen each one shows where known
- **Reference material (optional)** — screens from competitor or similar products, for inspiration: screenshots you supply, or screens pulled from a design-reference library such as Mobbin, through its connector, when one is connected and you ask for it. Strict limits: they are **reference, never a source**. Coverage is driven by the PRD and the business rules alone, so a flow they never showed is still written and a flow they showed that this product does not call for is not. Where one suggests something genuinely better that the PRD does not ask for, raise it as a question rather than writing it in, and never copy anything that conflicts with the business rules.


---

## Modes

- **From PRD (default)** — flows are derived from the PRD and the business rules. Reference material, where supplied, informs how a flow could be shaped; it never decides which flows exist.
- **From designs** — used when designs are supplied: screenshots of the UI, or screen specs already drafted from them. Work in this order:
  1. Map each screen to its feature area and flow. Confirm any mapping you inferred.
  2. Derive each flow from the screens plus the business rules. Steps no screen shows — expiries, notifications, scheduled changes, third-party callbacks — are derived from the rules and marked `(System Action — no screen; derived from {RULE-ID})`.
  3. Report conflicts between the screens and the rules, missing steps or screens, and logically flawed flows in the chat (or, during a phase review, in its review docs) — never in the doc. Where a fix follows from the business rules, write the corrected flow and report the change as a frontend action; content waiting on a decision is left out until it is answered.

  The screen specs are then built from the same designs with the Screen Specs skill — or, where specs were supplied, reviewed in place — checked against these flows.

---

## Output Structure

### Step 1: Confirm the feature areas

The feature areas are already settled in `docs/feature-areas.md`, which names each one and the root entity it owns. Read it rather than re-deriving the list — every doc deriving its own would drift. Every flow belongs to exactly one of those areas — **the one whose entity's lifecycle it advances**. A flow that reads a cart, an address and a payment method but ends by creating an order is an Orders flow; it reaches the other areas with `→ see [Flow Name]` rather than restating them.

If the registry does not exist yet, stop: it is produced by the Feature Areas skill from the PRD, and the flows cannot be divided before it is.

Take the audiences and each audience's clients from `CLAUDE.md`. If they are not recorded yet, derive them per the documentation conventions and confirm them before continuing. Each audience's flows are written in full for that audience — nothing is inherited from the root.

### Step 2: Generate One File Per Feature Area

Create a separate doc for each feature area, named `app-flow-{audience?}-{client?}-{feature-area}.md` (e.g., `app-flow-auth.md`, `app-flow-project-management.md`, `app-flow-admin-web-disputes.md`). The primary audience's files sit at the root of `docs/app-flows/`; other audiences get `{audience}/` subfolders. A client subfolder exists only when one audience has two or more clients with divergent screens; a minor divergence stays in one file as an inline `Client:` note on the step. Never tag the client per flow — it comes from the path.

Each file follows this structure:

**Description**

2-3 sentences stating what this feature area covers.

**User Flows**

Each feature area contains one or more user flows. Each flow represents a complete task a user performs from entry to completion.

Each flow opens with its name and an `Actor:` line, then a numbered timeline — a chronological sequence of steps:

```
{Flow Name}
Actor: {role(s)}

1. Step Name (User Action / System Action)
   - Action: What specifically happens
   - Constraint: Hard rules that must be met
   - Logic:
     - IF [condition] THEN [outcome]
     - ELSE [outcome]

2. Next Step...
```

Rules for steps:

- Every step is numbered sequentially — do not nest numbered steps inside other numbered steps
- Label each step as (User Action) or (System Action) in the step title
- Under each step, use indented bullets for Action, Constraint, and Logic — include only the ones that apply to that step
- Use explicit IF/THEN/ELSE for all branching and validation logic — do not describe conditions in prose
- For branching that leads to a different flow, use: `→ see [Flow Name]`
- Cover both happy paths and error paths within the same flow

**State Machines**

At the end of each feature area, list the state machines relevant to that feature area. Use this format:

```
**[Entity] States:** STATE_A, STATE_B, STATE_C

- STATE_A → STATE_B (via [action])
- STATE_B → STATE_C (via [action])
- Terminal States: STATE_C
```

State machines stay with their feature area, not in a global appendix.

---

## Rules

1. Cover every user-facing flow (both happy and error paths) for all roles defined in the PRD. Do not skip flows.
2. For every userflow, if the flow will be different for different user roles then do a separate version of that flow for each of the user role it differs for, but if the flows will be almost the same i.e near-duplicates with the tier difference buried then instead just use one flow and put the tier difference in explicit IF/THEN logic instead.
3. Every flow states its actor on its `Actor:` line — the role or roles the flow belongs to.
4. No code blocks. Use plain text IF/THEN/ELSE bullets for logic. Only use structured pseudocode if a process is too complex for IF/THEN/ELSE to express clearly.
5. Flow-focused only — describe what the user can do or see, not visual layout or positioning.
6. No fluff — no introductions, no marketing language, no redundant context.
7. Every step must clearly separate what the user does from what the system does.
8. Do not invent features, flows, or constraints that aren't meant to be in the app or can't be inferred from the PRD, the business rules, or (in From designs mode) the designs. Reference material supplied for inspiration is never a source — a flow exists because the PRD or the business rules call for it, not because another product has one.
9. Use consistent naming — if a screen or action is referenced across multiple flows, use the exact same name everywhere.
10. Let it be clear, concise and efficient, but plain and simple so it's easy to understand not just by technical readers but also the non-technical readers that will read/use it too.
11. Docs never mention issues, resolutions, decisions or the review process.
12. Take stock first. Existing drafts are unvalidated: fix them in place rather than regenerating. Errors in canonical files about already-built behaviour are reported, not fixed.

---

## Phase Files (later phases)

The first phase writes canonical files directly. From the second phase on, planned flows go in the feature's phase file, and canonical files receive pointer lines only.

- **Location:** `docs/phase-{n}/features/{feature}/app-flow-{feature}.md`, mirroring the canonical audience and client split, with a subfolder only when there is content for it.
- **Sections:** one section per feature area the feature touches, each in that area's lifecycle order.
- **Entries:** each flow uses the structure above, with one field line under its `Actor:` line:
  `Feature Area: {area} · Supersedes: {canonical flow anchor}` — or `Adds to: {canonical path}#{section}` — or `New feature area: {area}`
- **State machines:** a change to an existing state machine is its own entry, using `Supersedes:` with that state machine's anchor.
- **Canonical side:** `Planned Phase {n} change → {link}` under the superseded flow's heading; `Planned Phase {n} additions → {link}` on the section the new flows join. Link by anchor, never by line number. No stub files.
- Tag meanings and promotion follow the documentation conventions rule.
