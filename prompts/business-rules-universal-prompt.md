# **Universal Prompt — Generate Business Rules (per feature area)**

Paste this prompt to have an AI generate (or update) the **business rules** for one or more feature areas of an app — the "law" of each area: the invariants, constraints, decision rules, formulas, edge cases, and security rules that (together with the app-flow and screen-specs) drive how endpoints and business logic are built and tested. Output: one `business-rules-{audience?}-{feature-area}.md` per feature area (or, in a later phase, one phase file per feature), plus `business-rules-shared.md`, which always carries the message index and additionally holds any definitions, tables or calculations that genuinely span areas.

The document is read by developers, testers, **and non-technical stakeholders** — so each rule is written plainly first, with the precise detail attached.

Fill the `{PLACEHOLDERS}`, delete this intro line, and send.

---

## **Prompt**

**Role:** You are a senior product + backend engineer writing the authoritative **business rules** for a feature area — the invariants that make it secure, logical, consistent, and standard.

The file also carries the **definitions and reference data those rules depend on**: the area's key terms, its access table, and the tiers, thresholds and rates a rule reads from. Nothing beyond that — a fact no rule depends on is not context, it is bloat, and it belongs in the PRD, the app-flow or the screen-specs.

**Goal:** Produce the complete rule set for the area so that an implementer builds correct endpoints/logic, a tester can verify each rule, and a non-technical stakeholder can read and understand it.

### **Inputs**

- **Scope:** `{SCOPE}` — one of: a single area (default), a comma-separated subset, or `all`.
- **Feature area(s)** — which areas to write, taken from `docs/feature-areas.md`. Read the registry rather than re-deriving the division; if it does not exist yet, stop — the feature areas must be identified from the PRD first, and the rules cannot be divided before they are.
- **PRD (primary intent):** `{PRD}` — the product requirements; the source of what the app is meant to do. In a later phase, the phase's FRD.
- **Business rules doc (primary):** `{SOURCE_RULES}` — the business rules as supplied; the source of each rule.
- **App flows (optional):** `{APP_FLOW_DOCS}` — where they already exist, to check that the rules govern every flow.
- **Other context (optional):** `{OTHER_CONTEXT}` — other areas' app-flows or domain notes, only if a rule genuinely depends on them.
- **Shared rules doc (optional):** `{SHARED_RULES_DOC}` — existing cross-area business-rules doc, if any.
- **Output location:** from the `CLAUDE.md` documentation map — canonical files in `docs/business-rules/`; phase files in `docs/phase-{n}/features/{feature}/`.

### **Hard rules**

1. **Derive the rules from the PRD (or FRD) + the supplied business rules doc + the app's own logic(if it is built already), and be exhaustive for the area. And if there is something you need to ask to be sure if you are to include or if youwant my opinion or my choice then feel free to ask.** Capture every invariant, limit, **decision rule (the "when X → do Y" business logic the backend must enforce — the conditions and their outcomes, not the implementation or algorithm)**, formula, edge case, and security rule the area needs to be correct and safe. Reason about what *should* be true for the area to be secure, logical, and efficient — don't just transcribe the flow. Don't invent scope beyond the app; don't leave gaps.
2. **This is the law — not flows, UI, or API shapes.** Do not restate app-flow steps, screen layouts (screen-specs), or request/response bodies (api-docs). Reference them, and state the *rule* the flow/screen/endpoint must obey. **State machines (the states and their transitions) live in the app-flow — its canonical home; do not redraw them here.** Capture only state-related *invariants* — forbidden transitions, terminal-state immutability, "action X is invalid in state Y" — as ordinary rules in the relevant thematic section, referencing the app-flow's state machine.
3. **Plain sentence first, specifics attached.** Write each rule as a clear declarative sentence a non-technical reader understands, then attach the precise specifics (threshold / enum / formula) and the **on-violation behavior**: what happens — the business outcome — and, where the user must be told why, what they have to learn plus the message key. State the obligation, not the wording: the string itself lives in the shared message index, so re-wording and translating it never touches a rule. Keep field names, endpoint paths, and code identifiers minimal in the sentence itself — demote them to the attached detail or a note. Do **not** put HTTP status codes here — the status is an API-layer convention owned by the api-doc's error tables; state the business outcome (rejected / blocked / forfeited …), not the code.
4. **Stable rule IDs — combined with the prose, never instead of it.** Every atomic rule carries a compact, visually-secondary ID `[BR-{AREA}-NNN]` **and** its plain-language statement. IDs are append-only (never renumber when inserting), and go only on atomic rules (not headings, explanatory prose, or reference tables). Never emit an ID without its rule, or a rule without an ID. (See "Anatomy of one rule" below.)
5. **Security and edge cases are first-class.** Cover the constraints that keep the area safe (limits, verification, idempotency, access/storage, locking order, abuse prevention) and the non-obvious edge cases — grouped in their own sections where the area warrants, each with on-violation behavior. Never leave them scattered or implied.
6. **Concise, no bloat.** Only rules that belong, plus the definitions and reference data a rule actually depends on — if a term or table is here, some rule must read from it. Don't duplicate shared definitions (reference the shared doc). Omit any section that doesn't apply to the area. Docs never mention issues, resolutions, decisions or the review process.
7. **One emphasis convention.** Use **MUST / MUST NOT** for hard requirements and **SHOULD** for recommendations; `code font` for identifiers and enums; **bold** for the key term of a rule. Don't mix styles arbitrarily.
8. **Take stock first.** Existing drafts are unvalidated: fix them in place rather than regenerating. Errors in canonical files about already-built behaviour are reported, not fixed.

### **Anatomy of ONE rule (ID + prose together — the required form)**

Each atomic rule is a single line combining the ID and the plain rule; specifics and on-violation behavior attach after:

> `[BR-{AREA}-NNN]` **{plain-language declarative sentence anyone can read}** — {precise specifics: threshold / enum / formula}; {on-violation: what happens (the business outcome) + what the user must be told, and its message key}{; only where the rule would otherwise read as arbitrary: why it exists}.
> 

Example:

> `[BR-ORDERS-007]` **An order needs a delivery address before it can be placed.** — checked when the order is submitted; no address → the order is rejected, and the user is told a delivery address is required (`MSG_ADDRESS_REQUIRED`).
> 

The ID is a small tag; the sentence carries the meaning; a non-technical reader skims the sentences, a developer/test cites the IDs.

### **Cross-cutting artifact**

- **Shared rules doc.** `business-rules-shared.md` always holds the **message index** — every user-facing message the rules mandate, one row per key, with its text. Rules reference a key; only the index holds wording, so a re-wording or a translation is one edit in one file and no rule changes. Where definitions, constants and tables (tier or pricing matrices, say), or calculations genuinely span multiple areas, they are factored in here too — a glossary of key terms, the shared tables, and the shared calculations with a "Used by:" consumer list. Area docs reference this file instead of duplicating it.

### **File placement**

- **Filename:** `business-rules-{audience?}-{feature-area}.md`. The primary audience sits at the root; other audiences get `{audience}/` subfolders. Audiences come from `CLAUDE.md`.
- **Which area a rule goes in:** the one owning the entity the rule constrains, even where the rule reads other areas' data — a rule limiting how long after delivery an order can be disputed constrains a dispute, so it is a Disputes rule. Cross-link the areas it reads; never write one rule into two files.
- **Root rules are platform-wide and bind every audience;** an audience file holds only what is unique to it.
- **Never split by client.** A rule limited to one client says so inside the rule.
- **IDs in audience files** are `[BR-{AUDIENCE}-{AREA}-NNN]`, so they never clash with the root file's IDs for the same area.

### **Per-area document template**

Produce each `business-rules-{audience?}-{feature-area}.md` in this order, omitting any section that doesn't apply:

```markdown
# Business Rules — {Feature Area}

## Description

{One short paragraph: what this area's rules cover. End with a pointer to the shared rules doc if one exists.}

## Key terms

- **{Term}** — {plain definition}. {Only area-specific terms; reference the shared glossary for cross-area ones. Omit the section if none.}

## Access

| Action | {Role} | {Role} |
| --- | --- | --- |
| {action} | ✅ | — |

{One row per action in the area; each cell is ✅ (granted), — (denied), or the condition that grants it.}

---

## {Thematic section — ordered by the domain's natural lifecycle}

`[BR-{AREA}-001]` **{plain-language rule}** — {specifics}; {on-violation: what happens + what the user is told, and its message key}.
`[BR-{AREA}-002]` **{plain-language rule}** — {specifics}; {on-violation}.

{Use a table when the rule is a set of tiers / thresholds / fees / enums:}
| {col} | {col} | {col} |
| --- | --- | --- |

{Set off a formula when the rule is a calculation:}
`{RESULT} = {expression}`

{Use numbered steps only where the order itself is the constraint — a sequence that must run in exactly this order, with no user action or screen in it. Phases whose order does not matter are ordinary rules in lifecycle order instead:}
1. **{Step}** — {what must happen, and why it must happen here}.
2. **{Step}** — {…}.

---

## Security & abuse constraints

{Only where the area has them. The rules that keep it safe, each with on-violation behavior.}

`[BR-{AREA}-NNN]` **{security rule}** — {specifics}; {on-violation}.

---

## Edge cases

{Only where the area has non-obvious edge handling.}

`[BR-{AREA}-NNN]` **{edge case rule}** — {what triggers it}; {the defined handling}.
```

**Notes on the template:**

- Order sections by the domain's lifecycle (e.g. setup → limits → core actions → resolution), not alphabetically.
- **Access.** The access table is the area's source for permissions. Rules carry no per-rule roles field; a rule names roles only where it differs by role.
- **Current scope only.** Business rules are the law — all of them are meant to be enforced — so do NOT track code-completion (planned vs built); that's an implementation concern, not a business rule. Canonical files hold only current-scope behaviour. Anything planned for a later phase is not written here; it enters through that phase's files.
- Cross-reference the shared doc and the area's app-flow / screen-specs / api-doc where a rule is exercised — link, don't restate.

### **Phase files (later phases)**

The first phase writes canonical files directly. From the second phase on, planned rules go in the feature's phase file, and canonical files receive pointer lines only.

- **Location:** `docs/phase-{n}/features/{feature}/business-rules-{feature}.md`, with an `{audience}/` subfolder only when there is content for it.
- **Sections:** one `## {Feature Area}` section per area the feature touches, each in that area's lifecycle order.
- **Entries:** the same anatomy as above, followed by one field line:
  `Feature Area: {area} · Supersedes: [BR-…]` — or `Adds to: {canonical path}#{section}` — or `New feature area: {area}`
- **IDs:** a superseding entry keeps the ID of the rule it replaces. A new entry takes the next free ID in its area, checked against the canonical file and every phase file in the phase.
- **Canonical side:** `Planned Phase {n} change → {link}` under the superseded rule; `Planned Phase {n} additions → {link}` under the section heading. Link by ID or anchor, never by line number. No stub files.
- Tag meanings and promotion follow the documentation conventions rule.

### **Output & quality checklist**

- One `business-rules-{audience?}-{feature-area}.md` per area in its canonical folder (or one phase file per feature), plus `business-rules-shared.md` carrying the message index.
- Every rule an implementer needs to build the area correctly and safely is present — no gaps; security and edge cases covered.
- Each atomic rule is plain-language-first, carries a stable `[BR-{AREA}-NNN]` id, and states its on-violation behavior where one applies.
- Every user-facing message is referenced by key, with its wording in the shared message index — never quoted inside a rule.
- Every definition and reference table present is depended on by at least one rule.
- The area's access table is present; rules name roles only where they differ by role.
- Phase entries carry their `Feature Area:` field and exactly one tag, with the matching pointer on the canonical side.
- No shared-definition duplication; no app-flow steps, screens, or request/response shapes restated (referenced instead).
- Readable by a non-technical stakeholder, yet precise enough for a developer and a tester.
- Project-agnostic wording — read the provided PRD/app-flow for this app's real names, terms, and thresholds; introduce no assumptions from other projects.
