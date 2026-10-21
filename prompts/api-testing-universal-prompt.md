# **Universal Prompt — Generate API Testing Docs (per feature area)**

Paste this prompt to have an AI generate (or update) the **API testing guide** for one or more feature areas of a backend. Each guide shows how to exercise every endpoint of an area — via **curl or Postman** — against **any environment** (local/dev, staging, etc.). Output: one `api-testing-{audience?}-{feature-area}.md` per feature area, plus a shared setup/prerequisites base doc.

Fill the `{PLACEHOLDERS}`, delete this intro line, and send.

---

## **Prompt**

**Role:** You are a senior backend engineer writing hands-on API testing guides for developers (backend or client) validating endpoints.

**Goal:** Let a developer test every endpoint of an area quickly, in the right order, with either curl or Postman, on whatever environment they point at.

### **Inputs**

- **Scope:** `{SCOPE}` — `all` (every built feature area), a comma-separated subset, or a single area. Default `all`.
- **Feature area(s):** `{FEATURE_AREAS}`
- **API docs (source for shapes):** the area's `api-docs-{feature-area}.md`. Take request/response/error shapes **from here** (single source) rather than re-deriving them.
- **Endpoint + access reference:** `{ENDPOINT_RBAC_REF}`
- **Background jobs reference:** `{JOBS_REF}` — each job's name (the dispatcher key) and what it does.
- **Flow docs (optional):** `{APP_FLOW_DOCS}` — to sequence the recommended testing order.
- **Seed/test-data reference (optional):** `{SEED_REF}` — seed accounts/data if the project has a seed.
- **Base URL variable:** `{BASE_URL_VAR}` (default: Postman `{{baseUrl}}`, curl `$BASE_URL`).
- **Output location:** from the `CLAUDE.md` documentation map — `docs/api-testing/`.

### **Hard rules**

1. **Environment-agnostic.** Every request uses the base-URL variable — **never hardcode `localhost` or one environment.** The setup section explains pointing it at local/dev **or** staging **or** any host. Don't assume a specific seed command; reference the seed only if one is provided.
2. **Both tools, every endpoint.** Each endpoint shows a **With curl** command and a **With Postman** description. Use one **canonical set of variable names** across both (e.g. `baseUrl`/`BASE_URL`, `accessToken`/`ACCESS_TOKEN`).
3. **Shapes come from the api-docs**, not re-invented — this keeps the testing doc and the api-docs from drifting.
4. **One file per area, `api-testing-{audience?}-{feature-area}.md`.** The primary audience sits at the root of `docs/api-testing/`; other audiences get `{audience}/` subfolders. API testing docs never split by client. For `Scope = all`/subset, process each area **independently, area by area** — never one merged document.
5. **Continuous numbering.** Endpoint steps are numbered continuously across the whole doc. If you group endpoints under userflows, numbering **still never restarts** per group.
6. **Group only when it fits.** Default to a flat, business-flow-ordered list. Group under userflows **only** when the area cleanly partitions, and **never duplicate** a shared endpoint across groups.
7. **Concise.** Omit sections that don't apply. Do **not** add a redundant global error checklist, a quick-test checklist, or a total-time estimate — the per-endpoint errors and the top testing order already cover testing.
8. **Take stock first.** Existing docs are updated in place, not regenerated.

### **Phase builds**

In a phase build, a feature's endpoints go into the canonical file of each area they belong to. API testing docs are never written into phase folders.

### **Shared setup/prerequisites base doc (produce once)**

Create a shared base doc (e.g. `api-testing-setup.md` or reuse the auth area's) covering: base URL & environments, the variables table, and how to obtain an auth token. Every per-area guide references it instead of repeating it. (Analog of the api-docs conventions doc.) Create a shared *endpoint* testing doc only if genuinely cross-area endpoints exist.

### **Per-area document template**

Produce each `api-testing-{audience?}-{feature-area}.md` in exactly this order:

```markdown
# API Testing Guide — {Feature Area}

## Recommended testing order

| Step | Action / Endpoint | Login as | Expected |
| --- | --- | --- | --- |
| 1 | {…} | {role / —} | {status + gist} |
{a fast, flow-aligned path through the area; references the numbered endpoints below}

## Prerequisites & setup

- {What must exist first: an auth token, and any dependent entities/ids from other areas.} See {shared setup doc}.
- **Variables**

| variable | meaning | set for curl | set for Postman |
| --- | --- | --- | --- |
| `baseUrl` | API root for your target env | `export BASE_URL=https://…` | collection/env var `{{baseUrl}}` |
| `accessToken` | bearer token from login | `export ACCESS_TOKEN=…` | `{{accessToken}}` |
| `{areaId}` | {…} | `export {AREA_ID}=…` | `{{areaId}}` |

- **Seed (if available):** {relevant seed accounts/ids for this area, else "register + walk the prerequisite flows".}
- {Optional one-line OS note, e.g. on Windows PowerShell use `curl.exe`.}

## RBAC quick reference

| # | Endpoint | {role A} | {role B} | … | Notes |
| --- | --- | --- | --- | --- | --- |
{expected status per role — e.g. 401 / 403 / ✅ — the testable access matrix}

## Endpoints

### {N}. {short title}

**{METHOD}** `{{baseUrl}}/path`

**Path / query params** (small table, when the route has them)
| name | type | notes |
| --- | --- | --- |

**Headers** (if any)
```
Authorization: Bearer {{accessToken}}
```

**Request body** (if any)
```json
{ realistic request JSON — same fields/shape the api-docs documents }
```

**With curl**
```bash
curl -i -X {METHOD} "$BASE_URL/path" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ … }'
```

**With Postman**
- Method **{METHOD}**, URL `{{baseUrl}}/path`
- Headers: `Authorization: Bearer {{accessToken}}`{, Content-Type}
- Body: {raw JSON / form-data field}

**Save for later** (only if a later request needs a value from this response)
- Postman → Tests tab:
  ```javascript
  if (pm.response.code === 200) {
    pm.collectionVariables.set('{var}', pm.response.json().{field});
  }
  ```
- curl: `export {VAR}=$(… | jq -r '.{field}')` (or copy the value from the response into the next request)

**Expected response — {2xx}**
```json
{ realistic success JSON — same shape/example the api-docs documents }
```

**Error scenarios**
| condition | status | message |
| --- | --- | --- |

{Repeat the whole `### {N}. {title}` block above for every endpoint, each separated by a `---` rule, with N incrementing continuously across the doc.}

## Background jobs

{One entry per background job in this area. Omit the section if none.}

### {job name}

{One line: what the job does and which flow it serves.}

**Dispatch with curl**
```bash
curl -i -X POST "$BASE_URL/{dispatcher-path}" \
  -H "Authorization: Bearer $DEV_TOOL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"job":"{job name}"}'
```

**Dispatch with Postman**
- Method **POST**, URL `{{baseUrl}}/{dispatcher-path}`
- Headers: `Authorization: Bearer {{devToolToken}}`, Content-Type
- Body: raw JSON `{"job":"{job name}"}`

**Expected result:** {which records transition, to which state, and which near-boundary records stay untouched}

**Dispatch a second time:** nothing changes — same response, no further transitions. That is the idempotency check.

## Troubleshooting
{optional, lean — only genuinely useful area gotchas; omit if none}
```

**Background jobs:** inbound webhook handlers are excluded from this section — they are signature-verified endpoints, tested through their own path in the Endpoints section above.

### **Output & quality checklist**

- One `api-testing-{audience?}-{feature-area}.md` per area in its canonical folder; a shared setup/prereq base doc alongside.
- Recommended testing order is **at the top**; numbering is continuous across the whole doc.
- No hardcoded environment — every URL uses the base-URL variable.
- Every endpoint has both a curl and a Postman path; chaining values captured for both tools where needed.
- Every background job in the area has its dispatch command in both tools, its expected result, and its second-dispatch check.
- Request/response/error shapes match the area's api-docs.
- No project-specific assumption leaks in — read the provided inputs for this project's real names, ids, and seed.
