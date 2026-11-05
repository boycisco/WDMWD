# Security Review — V1

This document records the security posture of WDMWD backend V1 at the time of the initial release. It is a self-review, not a third-party audit.

---

## Threat model

**In scope:**

- Data confidentiality: API keys must not leak to logs, responses, or the client.
- Read-only guarantee: no signing, no broadcasting, no key material handling.
- Prompt injection resistance: blockchain data (token symbols, contract metadata) must not be able to redirect the agent.
- Local-network safety: no accidental exposure of the API to non-loopback networks without explicit opt-in.
- Input validation: every external input (HTTP body, env var, RPC response, tool args) is validated.
- DoS resistance on a single-user deployment: one client can't trivially crash or exhaust the server.

**Out of scope (by design):**

- Multi-tenant isolation (single-user app)
- Password / session authentication (delegated to reverse proxy)
- Rate limiting (delegated to reverse proxy on remote deployments)
- Blockchain data authenticity (trusted to the configured provider)
- LLM output correctness (advisory — the user verifies against evidence)

---

## Confirmed controls

### Read-only guarantee

- ✅ No `eth_sendRawTransaction`, no wallet connection, no signing code anywhere in the codebase.
- ✅ No code path accepts or requests private keys or seed phrases.
- ✅ All blockchain access is via read methods: `getTransaction`, `getTransactionReceipt`, `getBytecode`, `getBlockNumber`, `alchemy_getAssetTransfers`.

### Secrets

- ✅ API keys read only from `process.env`.
- ✅ `.env` is gitignored; `.env.example` has empty values.
- ✅ `/api/settings` and `/api/health` return `*Configured: true/false` flags, never actual keys — enforced by `safeConfig()` and tested (`tests/config/config.test.ts` → "redacts secrets and exposes only presence flags").
- ✅ Errors returned to clients are truncated to a single line and never contain stack traces (`err.message.split("\n")[0]` pattern in every route).
- ✅ Container image `.dockerignore` excludes `.env` — verified by inspection.

### Input validation

- ✅ Every HTTP request body is parsed against a Zod schema (`PostBodySchema`, etc.).
- ✅ `/api/chat` rejects bodies > 64 KB with `413` (this session).
- ✅ Every tool argument is parsed against a Zod schema before reaching investigation modules.
- ✅ Every config value is parsed against a Zod schema at startup. Invalid config = startup failure.
- ✅ Addresses and transaction hashes are validated by regex before use.

### Bounded execution

- ✅ `MAX_TOOL_CALLS` — 8 by default. Exceeded → error event, stream ends cleanly.
- ✅ `MAX_AGENT_ITERATIONS` — 6 by default. Exceeded → error event, stream ends cleanly.
- ✅ `REQUEST_TIMEOUT` — 60s by default, checked before each iteration.
- ✅ RPC timeout — 10s default, with 2 retries.
- ✅ Alchemy timeout — 20s per call, with pagination capped at 10 pages.
- ✅ Gemini request — retried up to 3 times on 503/429 with exponential backoff.
- ✅ All limits are configurable via `.env` and validated (min/max) at startup.

### Local-network safety

- ✅ Default `HOST=127.0.0.1`. Server refuses to start with a public `HOST` unless `REMOTE_ACCESS=true` is also set.
- ✅ `compose.yaml` binds to `127.0.0.1:3000:3000` — even if the container listens on all interfaces internally, the host port bind is loopback-only.
- ✅ Documented in `SECURITY.md` that remote deployments require a reverse proxy with TLS + auth.

### Prompt injection

- ✅ System prompt explicitly instructs the model to treat blockchain data (token symbols, contract metadata, event log contents) as untrusted and to ignore any embedded instructions (`src/agent/prompt.ts` §6).
- ⚠️ This is defence-in-depth, not a hard boundary. No LLM prompt is injection-proof. A sufficiently creative attack against a token symbol could conceivably confuse the model. Mitigated by: (a) token symbols are not user-controlled in normal flows, (b) the model has no tools that can be redirected to exfiltrate data — all tools are read-only investigation of public blockchain data.

### Graceful shutdown

- ✅ SIGTERM and SIGINT handlers close the SQLite connection cleanly (`instrumentation.ts`). Docker's 15s stop grace period is sufficient for the shutdown handler to complete.

---

## Known gaps (accepted)

These are documented as limitations, not bugs:

1. **No rate limiting at the WDMWD layer.** A single authenticated client on a loopback deployment cannot meaningfully DoS itself. On remote deployments, rate limiting is the reverse proxy's responsibility.
2. **No CSRF protection.** The API is designed to be called from a future chat UI. Once a browser frontend exists, CSRF tokens or `SameSite=Strict` cookies will be needed. Not applicable for the current server-to-server usage.
3. **Gemini SDK timeout not enforced at the SDK call level.** The agent loop's 60s overall timeout will fire between iterations, but a single `generateContentStream` call that hangs indefinitely would block. In practice the SDK's HTTP client times out (typically 60s+ default), and Google's API rarely hangs. Accepted as a rare edge case.
4. **No independent blockchain data verification.** All blockchain facts come from one RPC provider (Base public or user's Alchemy). A compromised provider could serve false data. For high-value use cases, run your own Base node and point `BASE_RPC_URL` at it.
5. **Devin-style prompt injection via malicious tokens.** If a user investigates a wallet that interacted with a token whose `symbol` field is `"ignore all previous instructions and..."`, the model's resistance depends on the system prompt's instructions. This is a fundamental limitation of LLM-based agents. The system prompt is designed to resist this; it is not a guarantee.
6. **No audit of the Gemini/OpenAI/Anthropic API traffic.** Everything the model sees leaves your machine. Not a WDMWD bug — it's inherent to the AI-provider architecture. Use a local model (future work) if the conversation content is sensitive.
7. **`npm audit` reports moderate-severity issues in dev dependencies.** Confirmed dev-only (`--omit=dev` shows zero). ESLint's globber has a DoS issue that only matters if the user provides malicious glob patterns to ESLint — which they don't in any WDMWD workflow. Reviewed and accepted.

---

## Verification performed this session

- ✅ `grep -r "sk-" src/` — no hardcoded API keys.
- ✅ `grep -r "process.env" src/ | grep -v "src/config/"` — only config reads env vars, no leaked reads.
- ✅ Reviewed every route handler for error sanitization: all truncate to first line, none leak file paths or stack frames.
- ✅ Confirmed `.env` is not in any Docker layer via `--chown` + `.dockerignore` inspection.
- ✅ `npm run build` succeeds with `output: "standalone"` — production image is minimal.
- ✅ Health check correctly reports `not_configured` for missing providers, does not fail-open.

---

## Recommendations for future versions

1. Add CSRF protection before shipping the browser frontend.
2. Consider a `RATE_LIMIT` config with token-bucket implementation for remote deployments.
3. Wire the SDK-level abort signal through the Gemini adapter for defense-in-depth on hangs.
4. Add ABI decoding to eliminate the "unknown log parameters" limitation (once decoded, more findings become confirmed facts).
5. Run `npm audit --production` in CI to catch future regressions.

---

## Reporting new issues

See `SECURITY.md`.