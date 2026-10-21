# AI Services

The tools and rules for code that calls AI models, in either stack. Everything in `coding-standards` and `security` still applies; this adds what model-calling code needs on top.

## Tools

| Need | TypeScript | Python |
| --- | --- | --- |
| LLM calls — text in, text or structured output out, including models that read images | Mastra's model router | LiteLLM |
| Multi-agent orchestration | Mastra — supervisor agents and workflows | CrewAI |
| Validating model output | Zod schemas | Pydantic models |
| Embeddings | OpenAI embeddings | OpenAI embeddings |
| Vector database | Qdrant | Qdrant |
| Media models — image and video generation, speech-to-text, text-to-speech | fal.ai | fal.ai |

**LLM calls go through the router, never a provider's SDK directly; media models go through fal.ai.** Each is one layer over many models, chosen per feature, so swapping a model within it is a configuration change, not a rewrite.

**Choosing a model.** Per feature: the cheapest model that meets the feature's accuracy and latency needs, from a provider whose data terms fit what is sent — no training on customer data, acceptable retention. The choice and its reason go in the build plan for approval. The model identifier lives in configuration.

## Model calls are external I/O

- **Every call has a timeout and an output-token ceiling.** A call with no ceiling is an unbounded bill and an unbounded wait.
- **Retry transient failures** — timeouts, rate limits, 5xx — with exponential backoff and a cap. Malformed output gets at most one repair attempt, with the validation error included. A refusal is not retried.
- **Record token usage and cost per call**, attributed to the feature and the run. Cost not measured per feature cannot be controlled.
- **Spend ceilings per user and per feature hold before the call:** reserve the worst-case cost — from the output-token ceiling — atomically, and settle the actual cost after. Checking first and spending after lets concurrent calls overshoot.

## Model output is untrusted input

This is the rule with no equivalent in a conventional backend, and the one that matters most.

- **Treat model output exactly like a request body from an anonymous caller.** Anything the model read — a document, a web page, a database row, an earlier message — may have carried an instruction aimed at steering it.
- **Never pass model output unvalidated** into SQL, a shell, a file path, a URL, HTML, or a deserializer. Never evaluate it as code.
- **Parse output into a schema and validate it.** Prefer structured output or tool-call arguments to parsing prose. A wrong shape is normal, not exceptional, so a validation failure is a handled path with a defined fallback, never a 500.

## Data sent to models

- **Send only what the feature needs.** Never secrets; personal data only where the provider's terms and the product's privacy policy allow it.
- **One user's context never reaches another user's call.**

## Retrieval (RAG)

- **Indexing runs in background jobs, never in a request.** When a source record is created or changed, a job parses, chunks and embeds it — idempotent, keyed on the record and its version, so a re-run changes nothing.
- **The index follows its source.** Updating a record re-indexes it; deleting it deletes its vectors. A deleted document that can still be retrieved is a leak, and an account deletion that leaves vectors behind is not a deletion.
- **Every vector carries its source's scope** — owner, tenant, visibility — and every search filters on it inside the query, never by fetching and discarding. Otherwise the model quotes another user's documents.
- **Every vector records the embedding model and chunking that produced it.** Changing either means re-embedding everything, as a background job, with search switched to the new index only once it is complete.

## Tools and agent actions

- **A tool an agent can call is an endpoint.** It enforces the acting user's authorization inside the tool itself, never inferred from what the model asked for. An agent that can do what its user cannot is a privilege escalation.
- **Actions that write, spend, message someone, or cannot be undone need confirmation from outside the model.** The model proposes; the user or a rule authorizes.
- **Every tool call is idempotent or carries an idempotency key.** Agents retry and loops re-enter; running a step twice must change nothing.
- **Every agent run is bounded** by maximum steps, wall-clock time and spend.

## Prompts

- **Prompts are versioned files in the repository**, not strings scattered through services. Changing one is a code change, with a diff and a review.
- **User content goes in a clearly delimited section**, never concatenated into the instructions.
- **A prompt change is a behaviour change** even when no signature moves, and ships through the same review.

## Testing

- **No test calls a live model.** Stub the call layer, or record real responses and replay them as fixtures.
- **Fixtures cover the failure shapes too:** malformed output, refusal, truncation, timeout, rate limit.
- **E2E proves retrieval is scoped:** a search as one user never returns another user's documents.
- **Output quality — retrieval included — is measured by an evaluation suite**, run deliberately against real models. It is separate from the test suite and never in the PR pipeline.

## Observability

- **Every agent run has a run id.** Every model call, tool call and retry is logged against it — non-deterministic behaviour cannot be debugged after the fact without the trace.
- **Each call logs** the prompt version, model, token counts and latency. Inputs and outputs are logged with secrets and personal data redacted.
- **Stored conversations and context** have a stated retention period, like any other user content.
