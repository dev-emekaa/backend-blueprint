---
name: screen-specs
description: Create, update or edit a project's screen specs docs, from the app flows or from UI designs. Use when recording what each screen sends to the backend, what it displays from the backend, and the actions performed on it.
---

# Screen Specs

You are generating screen specification docs that will be used as context for AI coding tools during development. Each is a doc in `docs/screen-specs/`, read on demand. These specs record what each screen sends to the backend, what it displays from the backend, and the actions performed on it — so endpoints get the right request/response shapes and behavior. They are read by the backend and client developers and the AI assisting them, so they shouldn't be too technical but clear, simple and concise so they are easy to understand.

---

## Modes and Context Sources

Read these, and ask for anything missing before starting.

**Both modes:**

- App Flow doc for the feature area
- PRD
- Business Rules
- `docs/feature-areas.md` — the feature areas and what each owns
- `CLAUDE.md` — the documentation map, the audiences (and which is primary), and each audience's clients
- **Reference material (optional)** — screens from competitor or similar products, for inspiration: screenshots you supply, or screens pulled from a design-reference library such as Mobbin, through its connector, when one is connected and you ask for it. Strict limits: they are **reference, never a source**. Coverage is driven by the app flow and the business rules alone, so a screen they never showed is still specified and a screen they showed that no flow calls for is not. Where one suggests something genuinely better that the PRD does not ask for, raise it as a question rather than writing it in, and never copy anything that conflicts with the business rules.


**From app flows (no designs)** — also:

- The design system file, where the project has one

**From designs** — also:

- Screenshots of the designs, or screen specs already drafted from them — for example by the frontend. State which screen from the app flow each one corresponds to.

In From designs mode, report these as issues — in the chat (or, during a phase review, in its review docs), never in the spec: conflicts between the designs and the flows or business rules, logically flawed specs, and missing context, fields or data a screen needs. A placeholder or sample value in a design is not an issue unless its shape or type is wrong. Where a fix follows from the approved flows and business rules, write the corrected spec and report the change as a frontend action; only content waiting on a decision is left out until it is answered.

---

## Screen Spec Structure

Generate one section per screen. All screens belong to a single user-facing feature area per file (e.g., `screen-specs-auth.md` contains every screen from the Auth feature area's userflows). Each screen follows this structure:

**Roles:** Roles that can access this screen and any auth state preconditions.

**Purpose:** One sentence — what the user accomplishes here.

**Input Data** *(only if the screen captures user input):*

```
fieldName (type, constraints): what it is
```

- type = string | number | boolean | enum | file | date | datetime
- constraints = required/optional, min/max, length, format (e.g. email, phone pattern), allowed values, file size/type limits
- Dot notation for nested objects, bracket notation for arrays
- If a field name isn't obvious from the source material, use the best descriptive name and report the uncertainty rather than flagging it in the doc

**Display Data:**
Data the screen displays that does NOT come from user input on this screen:

```
fieldName (type): What it represents
```

Group under subheadings if the screen has multiple distinct data-displaying sections.

**Actions:**
Every user-initiated action on this screen:

- Action description → `METHOD /path` (endpoint already built) or `pending` (not built yet)
- Action description → navigates to [Screen Name]
- Action description → opens [Modal/Drawer Name]

Only an endpoint already built (listed in api-rbac) is written as `METHOD /path`; every other is `pending` until the build replaces it. The reference is the method and path plus the action — nothing more. Include conditional visibility rules inline where an action is only available under certain conditions.

Mark role- or client-specific fields and actions inline as exceptions (e.g. `— admin only`, `— Client: web only`). Never add a per-screen client field; the client comes from the path.

**Conditional States** *(only if the screen has meaningfully different states):*
List states where the available actions, displayed data, or visible sections materially change.

---

## Rules

1. Every field must trace to the app flow, PRD, business rules, or (in From designs mode) the design. Reference material supplied for inspiration is never a trace source.
2. Never invent an endpoint path.
3. No implementation details — no component names, services, models, or stack-specific terms.
4. No styling directives — no colors, fonts, spacing, or design tokens.
5. Record data shapes, types and constraints only: no UI copy (labels, placeholder text), no sample values from designs, and no on-screen positions.
6. Skip static screens with no dynamic data, input, or meaningful actions.
7. Skip frontend-only state fields and content that never touch the backend.
8. Modals/drawers get their own mini-spec below the parent screen.
9. Same data on multiple screens uses the exact same field name everywhere.
10. A screen that appears in several feature areas' userflows belongs to **the area whose entity's lifecycle it advances** — a checkout screen reads a cart, an address and a payment method, but it exists to create an order, so it is an Orders screen. A read-only screen advances nothing: it belongs to the area whose decisions it serves — the action its viewer takes from it — and only where it serves none, the area owning most of what it shows. Reference it by name in the other areas' files; never duplicate its full spec.
11. Let it be clear, concise and efficient, but plain and simple so it's easy to understand rather than it being too technical and complicated. But if there is any part of it that is meant to be technical then leave those parts technical (don't oversimplify those parts)
12. Docs never mention issues, resolutions, decisions or the review process.
13. Take stock first. Existing drafts are unvalidated: fix them in place rather than regenerating. Errors in canonical files about already-built behaviour are reported, not fixed.

---

## Output

Create a doc per feature area named `screen-specs-{audience?}-{client?}-{feature-area}.md` (e.g., `screen-specs-auth.md`, `screen-specs-admin-web-disputes.md`), in `docs/screen-specs/` per the `CLAUDE.md` map. The primary audience sits at the root; other audiences get `{audience}/` subfolders, and their specs are entirely their own — nothing is inherited from the root. A client subfolder exists only when an audience's clients have divergent screens.

Write into canonical files only in the first phase (before it ships) or at promotion. During a later phase, new and changed screens go in the phase files.

---

## Phase Files (later phases)

From the second phase on, planned screens go in the feature's phase file, and canonical files receive pointer lines only.

- **Location:** `docs/phase-{n}/features/{feature}/screen-specs-{feature}.md`, mirroring the canonical audience and client split, with a subfolder only when there is content for it.
- **Sections:** one section per feature area the feature touches.
- **Entries:** each screen uses the structure above, with one field line under its `Roles:` line:
  `Feature Area: {area} · Supersedes: {canonical screen anchor}` — or `Adds to: {canonical path}#{section}` — or `New feature area: {area}`
- Modals keep their mini-spec under the parent screen.
- **Canonical side:** `Planned Phase {n} change → {link}` under the superseded screen's heading; `Planned Phase {n} additions → {link}` on the section the new screens join. Link by anchor, never by line number. No stub files.
- Tag meanings and promotion follow the documentation conventions rule.

---

## Generate

**From app flows (no designs):** for the feature area named, identify every screen involved in all its userflows from the app flow. Generate a section for each one. Do not ask which screens to cover — extract them yourself from the app flow.

**From designs:** For each design screenshot provided, use the app flow to determine which feature area that screen belongs to. Generate the screen's spec and place it in the corresponding file per the Output section. If that file doesn't exist yet, create it.

Where specs arrive already drafted, copy them into this project's screen-specs files (or the feature's phase file) — that copy is the one maintained from then on. Review each against the app flow, PRD and business rules, and fix it in place rather than regenerating it.
