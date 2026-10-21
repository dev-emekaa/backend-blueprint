# Documentation Conventions

Universal and project-agnostic. Project specifics live in `CLAUDE.md`.

## Definitions

- **Audience** — a group of user roles that uses its own separate product, with its own screens, navigation and rules. Test: would this group's docs be mostly screens and rules that other groups never see? If yes, it is an audience. If it is the same product with different permissions, those are roles within one audience. Exactly one audience is primary.
- **Client** — a separately designed app, with its own screens and navigation, through which an audience uses the product (mobile, web, desktop). A client is defined by design, not by device or codebase: a responsive web app on a phone is still `web`; iOS and Android apps with the same screens are one client, `mobile`.

## Project facts

`CLAUDE.md` holds the documentation map with exact paths, the audiences (marking the primary one), and the client or clients each audience uses. If audiences and clients are not recorded yet, derive them from the PRD's roles using the test above, propose them, and record them once approved.

## Canonical docs

- `docs/feature-areas.md` is the registry: every feature area in the product, what each owns, its status, and the first phase's build order. Every doc below is written per feature area, so this file is produced first and every other skill reads the division from it rather than re-deriving it.
- `docs/` contains `business-rules/`, `app-flows/`, `screen-specs/`, `api-docs/` and `api-testing/`, with one file per feature area.
- The primary audience sits at the root of each folder; other audiences get `{audience}/` subfolders.
  - Root business rules and API docs are platform-wide and bind every audience. An audience file holds only what is unique to it.
  - App flows and screen specs are entirely each audience's own. Nothing is inherited from the root.
- Client subfolders exist only in `app-flows/` and `screen-specs/`, and only when one audience has two or more clients with divergent screens. Minor divergences stay in one file as inline `Client:` notes.
- Business rules and API docs never split by client. A rule limited to one client says so inside the rule; an endpoint used by only some clients carries a `Clients:` field (no field means all clients).
- Filenames follow `{type}-{audience?}-{client?}-{feature-area}.md`, narrowing left to right; a segment appears only when that split exists. Types: `business-rules-`, `app-flow-`, `screen-specs-`, `api-docs-`, `api-testing-`. Examples: `business-rules-orders.md`, `business-rules-admin-disputes.md`, `screen-specs-admin-web-disputes.md`.
- Once the first phase ships, canonical docs describe only what is built. Planned changes live in phase folders until promotion.

## Registers

Three files record what exists in the **code** rather than what the product does. They live in `.claude/rules/`, loaded every session:

- `api-rbac` — every endpoint that exists, and who may call it. Being listed here is what makes an endpoint built, which is what a screen spec asserts when it references `METHOD /path` instead of `pending`.
- `background-jobs` — every piece of work no client request triggers.
- `deprecations` — anything kept alive only so released client builds keep working. Store-distributed or installed clients only.

**Registers follow the code; docs follow the product.** They are organised by backend module, not by feature area, and take no audience or client segment in their names. Each one's entry format lives in its own skill.

**`docs/` is what leaves the backend; `.claude/rules/` is what stays.** Business rules, app flows, screen specs, api-docs and api-testing travel to the client repo and are read by the client developer. The registers, the schema, the architecture index and the standards have no client reader.

## Phases

The first phase is built one feature area at a time, in the order `docs/feature-areas.md` gives, and its docs are written directly as canonical files. Its only phase folder is `docs/phase-1/review/`, holding the review docs; its PRD and product brief live in `docs/product-docs/`.

Every later phase is built one feature at a time, and its docs start in `docs/phase-{n}/`:

- `implementation-order.md` — build order and readiness, per feature
- `product-docs/` — the phase's inputs: the FRD (`frd-phase-{n}.md`, written by the Feature Requirements skill), business rules doc, screenshots, supporting docs
- `review/` — the review docs
- `features/{feature}/` — `business-rules-{feature}.md`, `app-flow-{feature}.md`, `screen-specs-{feature}.md`, mirroring the canonical audience and client split, with a subfolder only when there is content for it
- `integration/` — per-feature endpoint indexes, created at build time and linking only to canonical files

Feature folders never contain API docs or API testing; those are written directly into canonical files during the build. When a feature is built, its phase entries move into the canonical files (promotion) and its folder is deleted. Where the feature introduced a new feature area, its row in `docs/feature-areas.md` advances from `Draft` at the same time. The procedure lives in the backend building skill.

## Writing entries

- Every entry follows its doc type's template, which lives in that type's skill.
- Phase files are named per feature and sectioned per feature area. Every phase entry has a `Feature Area:` field and exactly one tag:

| Tag | Meaning | Canonical side |
| --- | --- | --- |
| `Supersedes:` | Changes an existing canonical entry | `Planned Phase {n} change →` on that entry |
| `Adds to:` | New behaviour in an existing feature area | `Planned Phase {n} additions →` on that section |
| `New feature area:` | Belongs to an area with no canonical file yet | No pointer |

- During review, only phase files are created or edited; canonical files receive pointer lines only. Pointers link rules, flows and screens by anchor or entry ID, never by line number.
- No stub canonical files. Missing ones are created at promotion; `Adds to:` names the path the file will take.
- No entry lives in two places.
- Docs never mention issues, resolutions, decisions or the review process.
- Screen specs record data shapes and types, not values. They reference endpoints only by `METHOD /path` plus the action; an endpoint not yet built is `pending`.
- Every screen spec states the roles that can access it; every app flow states its actor. Business rules carry no per-rule roles field: each feature area's access table is the source for permissions (there is no separate roles-and-access doc), and a rule names roles only where it differs by role. Role- or client-specific elements are marked inline as exceptions. Client is never tagged per entry — it comes from the path.

## Routing changes to existing areas

A change to an existing area goes with the feature that causes it:

- It can't ship before feature X exists → X's files.
- Several features need it → the earliest of them in build order.
- No new feature causes it → `platform-updates`, built as its own feature. Each entry records why it is independent of every feature.

## Readiness

Three values, wherever readiness is tracked:

- `Draft` — its context docs are not final: not written yet, written but not yet reviewed, or reviewed with issues still open. Never build from it.
- `Ready` — business rules, app flow and screen specs written, reviewed, and nothing outstanding — frontend actions already applied to the specs don't count; safe to build.
- `Built` — endpoints, jobs, tests and API docs done, and in a later phase the phase entries promoted.

**The review covers every context source** — the requirements doc, the business rules, the app flow, the screen specs, and any supporting doc supplied with them. It is what `Ready` asserts, so it is never skipped — a status nobody checked carries no information, and "never build from a `Draft` row" then protects nothing. Its depth is proportionate: an area that touches money, spans other areas, changes access or handles sensitive data earns a full pass, while a small self-contained one can be cleared by a single pass that finds nothing and records that it found nothing.

What is tracked differs by phase, and the file says which: the **first phase** tracks feature areas in `docs/feature-areas.md`; a **later phase** tracks features in its own `implementation-order.md`.

Work runs top to bottom and starts only when the one above it is `Built` — or, in a whole-phase build, completed earlier in the same run. A new feature area a later phase introduces enters the registry as `Draft`; its build position is governed by that phase's `implementation-order.md`. Any reordering is recorded with its reason.

## Session rules

- Before working on a feature area, read its business rules, app flow and screen specs.
- Existing drafts are unvalidated: take stock of what exists first, and fix files rather than regenerating them.
- In doc sessions, errors in canonical docs about already-built behaviour are reported, not fixed.
