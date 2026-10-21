# Universal Prompt — Review a Phase's Context Docs

Use this to audit the context docs of any phase — the first, where the unit is the feature area
and the requirements come from the PRD, or a later one, where the unit is the feature and they
come from the FRD. It can also be pointed at a single artifact rather than a whole phase. It
produces the reviewed content and the review docs.


Fill the `{PLACEHOLDERS}`, delete this intro, and send.

---

## Prompt

**Role:** You are a senior product + backend engineer auditing a phase's requirements,
business rules, app flows and screens against first principles — and, where the product is
already shipped, against the live docs and codebase.

**Goal:** Establish whether every rule, flow and screen is logically sound, secure, efficient
and internally consistent — and where it is not, say precisely what is wrong and what the
correct version should be. Then record what survives, and raise every issue for the
stakeholders to answer.

### Inputs

- **Phase** — Phase 1, or a later phase; a later phase's folder is `docs/phase-{n}/`
- **What is being reviewed** — the feature areas (first phase) or features (later phase) in scope, or the single artifact handed over
- **Requirements** — the **PRD** and product brief in the first phase; the phase's **FRD** in a later one
- **Business rules** — as supplied, or as already written per feature area
- **Screens** — delivered in batches after the rules are settled, as designs or as specs already drafted
- **Supplied flows** and **supporting product docs**, if any
- **Feature-areas registry** — `docs/feature-areas.md`: the areas, what each owns, and the first phase's review order
- **Canonical docs** — under `docs/`, per the `CLAUDE.md` documentation map. In a later phase these are the live law, flows and specs; in the first phase they are whatever has been written so far

Artifact formats are defined once, elsewhere. Follow them exactly — do not restate them here:
the **Business Rules**, **App Flow** and **Screen Specs** skills, including their Phase files sections.

---

## Modes

Settle which mode this is before anything else; four things differ.

| | **First phase** | **Later phase** |
| --- | --- | --- |
| Requirements source | PRD, and the product brief if there is one | FRD |
| Unit of work | the **feature area** | the **feature** |
| Where reviewed content is written | canonical files directly | phase files, with pointer lines on canonical files |
| Live corpus to check against | none — nothing is built yet | the shipped docs, schema and code |

**First phase.** Feature areas come from `docs/feature-areas.md`, and its order is the order they
are reviewed in. There is no shipped behaviour, so nothing can collide with a live rule and
nothing has a production blast radius — those tests are skipped, and consistency is checked
*between areas* instead. Reviewed content is written straight into the canonical files, because
the first phase writes them directly.

**Later phase.** As described through the rest of this document.

**Targeted review.** Either mode can be invoked on one artifact rather than a whole phase. Every
context source is auditable: the **requirements doc** (PRD or FRD) on its own, one area's or
feature's **business rules**, its **app flow**, its **screen specs**, a batch of designs, a single
screen at a time, and any **supporting context doc** supplied alongside them — a design system, a
domain note, a compliance document. Run only the stages that apply to what was handed over, write
issues to the same review docs, and state plainly what was and was not covered, so a partial pass
is never mistaken for a full one.

---

## Hard rules

1. **Write where the mode says.** In the **first phase**, reviewed content goes into the
   canonical files directly; nothing is built yet, so there is nothing to protect. In a
   **later phase**, the canonical docs are the source of truth every build reads, against a
   production database and a shipped client — so only phase files are created or edited, and
   canonical files get only the pointer lines each phase entry calls for. Promotion then
   happens in the feature's build session, not here.
2. **Rules before screens.** Screens are checked against a settled law. Reviewing screens
   first means re-reviewing every one the moment a rule changes.
3. **Verify, never assume.** Before calling anything a collision, read the live rule *and*
   the code or schema that implements it. Cite what you found. In the first phase there is no
   code to read, so a claimed conflict is between two documents and both are quoted.
4. **You do not decide intent.** Where a new rule conflicts with a live one, classify and
   recommend — but whether a replacement was *intended* is the founder's call. Document it
   as an open decision, never resolve it silently.
5. **Approve nothing implicitly.** Content is drafted from the sources, and nothing is
   treated as settled until its issues are cleared — a later phase's feature stays `Draft` in
   `implementation-order.md`, and a first-phase area stays `Draft` in the feature-areas
   registry until its docs are written and reviewed. An accepted recommendation is applied to the
   phase files and removed from the review docs. A stakeholder alternative is judged by
   the same standard: if it meets it, it is applied and removed; if not, the issue stays, with
   the reason and a corrected recommendation. An **action** needs no acceptance: it is applied
   at once and stays only on its owner's action list.
6. **Take stock first.** Existing drafts are unvalidated: fix them rather than regenerating.
   Errors found in canonical docs about already-built behaviour are reported, not fixed.
7. **No doc ever mentions issues, resolutions, decisions or the review.**
8. **Depth is proportionate; the review itself is never skipped.** Scale how hard you look to
   what is at stake: anything touching money, spanning other areas, changing access, or
   handling sensitive data earns every test below, while a small self-contained area can be
   cleared in a single pass. But that pass happens and records that it found nothing — `Ready`
   asserts somebody looked, and a status nobody checked carries no information.

---

## Stage 1 — Business rules

For each rule supplied, apply five tests in order. In the first phase, tests 3 and 5 have
nothing to act on — nothing is shipped — so test 3 becomes a check for contradictions between
this area's rules and another area's, and test 5 is skipped.



1. **First principles** — is it internally coherent and complete? Does it define its own
   thresholds, edge cases, on-violation behaviour, and the actor who performs it?
2. **Corpus fit** — locate the feature area(s) it touches; read that area's rules, flows and
   specs plus the always-on baseline (security, monetization, architecture, coding
   standards); determine whether it fits.
3. **Collision** — where it conflicts with a live rule, classify as:
   - **Replacement** — supersedes the live rule. Open decision + recommendation + full cost.
   - **Inconsistency** — unintended. State the correct rule.

   Also check it against the FRD: where the FRD and the business rules disagree, raise an
   open decision + recommendation.
4. **Completeness** — what does this feature need that nobody wrote? Propose it for acceptance.
5. **Production blast radius** — for anything that changes live behaviour, state explicitly
   whether it: breaks the shipped client's contract · needs a schema change (forward-only,
   expand → backfill → contract) · touches money or a ledger · needs a new admin route,
   permission or audit entry · needs background work · needs a new notification type.

Then assign each rule its **target feature area** — existing, or flagged `NEW AREA`. A change
to an existing area goes with the feature that causes it: if it can't ship before feature X
exists, it goes in X's files; if several features need it, it goes in the earliest of them in
build order. Changes no new feature causes go in `platform-updates`, which is built as its own
feature, and each such entry records why it is independent.

**The rules file does not freeze here.** Screen review surfaces missing rules; add each one to
its feature-area section at the right lifecycle position rather than pretending Stage 1 was final.

---

## Stage 2 — Screens, batch by batch

Per batch:

1. **Derive flows from screens + approved rules + the analogous existing flow**, following the
   App Flow skill's From designs mode. Where flows were supplied, check them against the
   screens instead of deriving them fresh. A screen
   shows a surface; a flow also contains system actions with no screen — background jobs,
   notifications, webhooks, expiries, cron-driven state changes. Mark those steps
   `(System Action — no screen; derived from {RULE-ID})`. That marked set is also the list of
   screens the frontend still owes.
2. **Derive one spec per screen**, following the Screen Specs skill's From designs mode — or,
   where specs arrived already drafted, take them as the drafts to review.
3. **Review each screen** for: display data a rule requires but the screen omits · missing
   input fields · missing actions · missing conditional states · missing modals a flow needs ·
   dead-end flows · contradictions with an approved or live rule · data exposed to a viewer
   who should not see it · a screen needing N calls where the corpus's own precedent is one.
   A placeholder or sample value in a design is not an issue unless its shape or type is wrong.
4. Report the issues in the review docs, then write to the phase files with every action already
   applied.

---

## New feature areas

A later phase may introduce a feature area that does not exist yet. Apply the **three-part
feature-area test from the Feature Areas skill**: it owns a root entity no existing area owns,
that entity has its own lifecycle, and its screens and flows do not sit naturally on an
existing area's surfaces. Failing any one, it **extends** an existing area instead.

Document every proposed area against the test, naming the alternative you rejected and why,
then add it to `docs/feature-areas.md` as `Draft`, with the phase that introduced it.
**Do not create its canonical files** — those are created when that phase's build promotes the
feature, per the no-stub rule.

This section does not apply in the first phase, where every area is new and the registry
already holds them all. What matters there is the reverse check: two areas that should have
been one.

---

## Deliverables

**First phase** — reviewed content goes to the canonical folders; the phase folder holds only
the review:

```
docs/
  feature-areas.md           ← the registry; its order is the review order
  product-docs/              ← PRD, product brief, supporting docs
  phase-1/review/            ← issues · decisions · decisions-with-responses · actions
  business-rules/ app-flows/ screen-specs/   ← written directly, per feature area
```

**Later phase:**

```
docs/phase-{n}/
  implementation-order.md    ← build order + readiness, per feature
  product-docs/              ← inputs
  review/                    ← issues · decisions · decisions-with-responses · actions
  features/{feature}/        ← business-rules-{feature}.md · app-flow-{feature}.md · screen-specs-{feature}.md
  integration/               ← created at build, not by review
```

A new area a later phase introduces is recorded in `docs/feature-areas.md`, not in a file of
its own.

**One bundle per feature, not per artifact type.** A phase changes areas that already exist,
so the unit of work is a change set — a feature — not an area. Bundling by feature lets one
feature reach fully-approved and start building while another is still being argued over, and
it matches how the rules were written and the screens designed.

**The issues doc is single and stays that way.** Its job is triage, and its most valuable
findings are the ones that *span* features — a rule in feature A and a rule in feature B, each
defensible alone, that together open an exploit. Split by feature, nobody sees those.

**PRD update.** Update the PRD from the FRD only, covering new features and new roles. If the
FRD introduces a new group of roles, apply the audience test and propose any `CLAUDE.md` change.

**`implementation-order.md`** is a later-phase file only — the first phase's order is the
feature-areas registry. It uses this template:

```markdown
# Phase {n} — Implementation Order

> **How to use:** Build features top to bottom. A feature starts only when it is `Ready` and the one above it is `Built` — or, in a whole-phase build, completed earlier in the same run. Record any reordering with its reason.
> **Readiness:** `Draft` — its context docs are not final; never build from it · `Ready` — every context source written, reviewed, and nothing outstanding; safe to build · `Built` — built and promoted. The same three values track the first phase's feature areas in `docs/feature-areas.md`.
> **Promotion checklist (per feature, in its build session):** build and register endpoints and jobs · run tests · verify · write api-docs and api-testing · replace pending endpoint references · promote phase entries and clear pointers · create the integration index · delete the feature folder · mark `Built`.
> **Teardown (when every feature is `Built`):** remove `features/`; keep this file and `integration/`; move `product-docs/` to `docs/product-docs/`.
> **Used by:** the audiences and clients the feature serves — one row per feature, never one per platform.
> **Conventions:** see the documentation conventions rule.

| # | Feature | Used by | Readiness | Notes |
| --- | --- | --- | --- | --- |
| 1 | {feature} | {audience · clients} | Draft | {dependency, or reorder reason} |
```

---

## Internal organization (all three artifact types)

**Feature area is the top-level section. Lifecycle order within each section.**

```
## {Feature Area}
   {entries, in that area's lifecycle order — each with its Feature Area: field and one tag}
```

- **Order the area sections by the feature's own lifecycle**, not alphabetically. That keeps
  the bundle readable as a product for the founder while each section stays ready to drop
  into its destination file.
- **Every entry carries `Feature Area:` and exactly one tag** — `Supersedes:` (changes a
  canonical entry — this is where the risk is), `Adds to:` (new behaviour in an existing area)
  or `New feature area:`. Formats follow the type skills.
- **One entry, one home, never duplicated.** Cross-reference instead. Copied entries drift.

---

## Review docs

Four docs in `docs/phase-{n}/review/`:

- **Issues doc** — the full register: one block per issue, ordered by severity within feature,
  with a blocker index and an owner index at the end.
- **Decisions doc** — lean: per decision, its ID, a one-line statement, and the recommendation.
  Actions are not listed; they need no answer.
- **Responses copy** — a copy of the decisions doc carrying the stakeholders' responses.
- **Actions doc** — the handoff for every action, by owner. An action is removed when its owner
  confirms it done.

An issue is any of: a conflict between any two context sources — screens against business rules,
the requirements doc against the rules, a supporting context doc against either · a logically
flawed flow or spec · a flow or spec missing context, steps, fields or data it needs · a gap or
contradiction within the business rules · a gap or contradiction within the requirements doc
itself, including a feature it leaves too underspecified to build. A placeholder or sample value
in a design is not an issue unless its shape or type is wrong.

```
### {ID} · {SEVERITY} · {OWNER} · {TYPE}
**Artifact:** the rule, flow or screen it belongs to
**Feature area:** existing area, or NEW AREA: {name}
**Statement:** what is wrong, and why it matters — one paragraph
**Recommendation** (decision) or **Action** (determined): what the correct rule/flow/field should be
**Phase-1 impact:** blast radius where it touches live behaviour
```

- **Severity** — `BLOCKER` cannot be built until answered · `MAJOR` builds wrong without an
  answer · `MINOR` cosmetic or naming.
- **Owner** — `FOUNDER` (rule decision) · `FRONTEND` (screen correction — to the design, where there is one, and to
  the built UI) · `BACKEND`
  (implementation note).
- **Type** — CONTRADICTION · LOGIC-GAP · MISSING-RULE · MISSING-FIELD · MISSING-FLOW ·
  MISSING-SCREEN · ERROR · SECURITY · EFFICIENCY · AMBIGUITY · ARCHITECTURE · COMPLIANCE.
- **Decision or action.** An issue whose fix the approved rules and flows already determine is
  an **action**: the reviewed flow or spec is written in its corrected state now, and the owner
  is told exactly what to change. An issue that needs a choice is a **decision**, with a
  recommendation, and waits for its answer. Frontend and backend issues are usually actions; a
  screen issue that needs a product choice is the founder's decision.
- Every recommendation and action must be logically sound, efficient and secure.
- IDs are **append-only**. Never renumber.

**Actions doc structure** — owner, then feature area (first phase) or feature (later phase), then
screen — or, for a backend action, the rule, flow or screen it concerns. A flow is named only where
the action changes it; the screen's spec already links its flows.

```
## Frontend
### {Feature area or feature}
**{Screen}**
- {ID} — {exactly what to change}  ·  Flow changed: {flow}   ← only when it changes one
## Backend
...
```

---

## Close-out

After the final batch, report:

- Flows still incomplete, and exactly what is missing from each
- Rules still missing for a feature to be logically complete
- Screens never supplied for a flow that needs one → the frontend's outstanding list
- Fields, actions and states missing from supplied screens → the frontend's section of the actions
  doc — already reflected in the specs
- Open founder decisions still unanswered → the blocker list
- **Build order** — in a later phase, recorded in `implementation-order.md`: where feature B's
  rules reference something feature A introduces, A comes first, and each feature is `Draft`
  until its decisions are answered, then `Ready` — open frontend actions do not hold it. In the first phase, any dependency the review
  uncovered that the registry's order does not reflect, so the order can be corrected
- Any new feature areas, as registered in `docs/feature-areas.md`

Answered decisions are applied to the reviewed files in place. Frontend actions do not come back
for review; a later design change beyond them comes back as a targeted review of the screens it
touches. `review/` is deleted
once every feature in the phase is `Ready` and the actions doc is empty.

---

## Quality checklist

- The mode was settled first, and the review covered the stages that mode calls for.
- Every entry written traces to a supplied requirement, an uploaded screen, or an explicitly
  accepted amendment — nothing invented.
- Every flow step is backed by a screen or explicitly marked screen-less with its rule.
- Every issue names its artifact, feature area, owner and severity.
- Where a targeted review was run, what it did not cover is stated.

**Later phase, additionally:**

- Every phase entry carries its `Feature Area:` field and exactly one tag.
- Every collision states its production blast radius.
- No entry appears in two sections.
- Canonical files received pointer lines only.
- Any new feature area is in `docs/feature-areas.md` as `Draft`, with no canonical files created.
