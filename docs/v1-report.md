# WDMWD Backend V1 — Engineering Report

**Version:** 1.0.0  
**Completion date:** November 5, 2026  
**Commit at completion:** `b35c795` (Session 9b)  
**Author:** Abdul (GitHub: [@boycisco](https://github.com/boycisco))  
**License:** AGPL-3.0

This document records exactly what was built in backend V1 — what is implemented-and-tested, what is implemented but not live-verified, what is partially implemented, and what is not implemented. It is the deliverable the original specification §22 asked for.

---

## 1. What was built

WDMWD (What Did My Wallet Do?) is a **personal onchain intelligence assistant**. It answers natural-language questions about Base mainnet activity with **evidence-backed, classified answers**.

Backend V1 delivers:

- A natural-language conversation endpoint that streams responses over SSE
- Two deterministic intelligence modules — wallet investigation and transaction investigation — that produce evidence-cited findings
- A provider-independent tool-calling agent loop that selects tools, executes them, and synthesizes answers
- Persistent conversation storage in SQLite with cascade delete
- Full configuration validation, structured error handling, and a health endpoint
- **134 passing unit tests**, **4 opt-in live tests** verifying real provider integration
- Docker deployment with graceful shutdown
- Full documentation: README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, LICENSE, and 8 files under `docs/`

## 2. Final folder structure

```text
src/
app/api/ HTTP entry points (chat, health, wallet)
agent/ Model loop, tools, system prompt
model/ Model interface + Gemini/OpenAI adapters
chat/ Persistence, context, SSE formatting
wallet/ Address validation, activity, profile, investigation
transaction/ Transaction investigation
evidence/ Evidence schema and helpers
data/ RPC and Alchemy adapters
chain/ Chain registry (Base)
store/ Drizzle schema, migrations, DB access
core/ Shared types, errors, validation
config/ Centralized configuration
tests/ Mirrors src/, 21 test files
docs/ 8 documentation files

```

## 3. Technologies and dependencies

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | ≥22 LTS (tested 26) |
| Language | TypeScript | strict mode |
| Framework | Next.js | 16.4.5 (App Router) |
| Blockchain | Viem | 2.x |
| Indexer | Alchemy (`alchemy_getAssetTransfers`) | — |
| Database | SQLite + better-sqlite3 | — |
| ORM | Drizzle ORM + drizzle-kit | 0.45 / 0.31 |
| Validation | Zod | 4.6 |
| AI (default) | Gemini via @google/genai | — |
| AI (alternative) | OpenAI SDK | 6.x |
| Testing | Vitest + @vitest/coverage-v8 | 5.1 |
| Deployment | Docker + compose | — |

Production dependency audit: **0 vulnerabilities** (`npm audit --omit=dev`). Dev dependencies have moderate ESLint-tooling warnings that do not affect runtime — documented in `SECURITY.md`.

## 4. Implemented intelligence capabilities

### Wallet investigation (`src/wallet/investigate.ts`)
- Incoming/outgoing transfer retrieval with **exact BigInt amounts** (`rawContract.value` from Alchemy, never the float `value`)
- Aggregated profile: transfer counts, unique counterparties, top contracts, block range, per-symbol totals
- Findings: `f_summary`, `f_top_incoming`, `f_top_outgoing`, `f_top_contract`, `f_coverage` — each classified `confirmed`/`inferred`/`unknown`
- Every non-coverage finding cites evidence IDs that resolve to specific transactions

### Transaction investigation (`src/transaction/investigate.ts`)
- Full tx + receipt retrieval via Viem
- Success/reverted classification
- **Contract vs EOA** detection via `getBytecode`
- Top-level native ETH value moved (separate from receipt events — never conflated)
- Gas cost and fee calculation
- Receipt event-log count and **ERC-20/721 Transfer topic detection**
- Findings: `f_tx_summary`, `f_tx_value`, `f_tx_gas`, `f_tx_target`, `f_tx_events`, `f_tx_coverage`

### Agent layer (`src/agent/`)
- Provider-independent `Model` interface
- Bounded tool-calling loop with `MAX_TOOL_CALLS`, `MAX_AGENT_ITERATIONS`, `REQUEST_TIMEOUT`
- Tool result errors never crash the stream — become `ok:false` data
- System prompt enforcing evidence-first behavior, classification discipline, prompt-injection resistance, no-secret/no-signing guarantees

### Chat layer (`src/chat/`)
- SQLite-backed session and message persistence
- Context reference extraction (`extractRefs`) — ordered, deduplicated addresses and tx hashes from history
- SSE event formatting (8 documented event types + `done`)
- Follow-ups resolve references without user repetition (verified live)

### Evidence (`src/evidence/`)
- Content-hashed evidence IDs (sha256 of identifying tuple → 16 hex chars)
- Automatic deduplication via `dedupeEvidence`
- Three classifications: `confirmed`, `inferred`, `unknown`

## 5. API endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/health` | App / DB / blockchain / AI status | none (local) |
| `POST` | `/api/chat` | Send message, stream SSE | none (local) |
| `GET` | `/api/chat` | List sessions (no `sessionId`) or fetch history | none |
| `DELETE` | `/api/chat?sessionId=` | Delete session and dependent records | none |
| `GET` | `/api/wallet/[address]` | Deterministic wallet investigation (no AI) | none |

Full reference: `docs/api.md`. SSE event types: `message.start`, `investigation.start`, `tool.start`, `tool.result`, `evidence`, `message.delta`, `message.complete`, `error`, `done`.

## 6. Database structure

Six tables, defined in `src/store/schema.ts`, applied via `drizzle/0000_*.sql`:

- **`sessions`** — id, title, timestamps
- **`messages`** — id, sessionId (FK cascade), role, content, metadata JSON, timestamp
- **`investigations`** — id, sessionId (FK cascade), type, target, chainId, status, result JSON
- **`evidence`** — id, investigationId (FK cascade), type, classification, data JSON, source
- **`entities`** — id, chainId, address, type, metadata (unique index on chainId+address)
- **`settings`** — key, value, timestamp

All timestamps are `INTEGER` unix milliseconds. JSON columns use `TEXT` with `{ mode: "json" }`. Foreign keys use `ON DELETE CASCADE` — session deletion cleans up messages, investigations, and evidence automatically. Enum-like columns (`role`, `status`, `classification`) have both TypeScript narrowing **and** SQL `CHECK` constraints.

## 7. Test results

```text
Test Files 19 passed | 2 skipped (21)
Tests 134 passed | 4 skipped (138)
Duration ~3s
```

Breakdown:
- config: 14 (validation, redaction, empty-env handling)
- store: 5 (schema, cascade, JSON round-trip, CHECK enforcement)
- health: 1 (degraded-path reporting)
- chain: 7 (registry lookups, explorer URLs)
- rpc: 4 (mocked transport, error propagation)
- alchemy: 7 (normalizeTransfer exact-amount assertions, parameter validation)
- wallet: 11 (address validation, EIP-55 checksum against canonical vector)
- evidence: 6 (content-derived ID determinism, deduplication)
- profile: 6 (aggregation, BigInt sums, empty activity)
- wallet/investigate: 5 (finding-evidence linkage, coverage classification)
- transaction/investigate: 9 (success/reverted, contract/EOA/deployment, missing receipt)
- chat: 10 (sessions, messages, cascade, metadata)
- context: 9 (extraction, deduplication, most-recent-first ordering)
- stream: 9 (event mapping, SSE formatting)
- model/gemini: 5 (**thoughtSignature round-trip**, tool-call accumulation, error handling)
- agent/loop: 6 (single turn, tool call, iteration limit, tool-call limit, delta preservation)
- agent/tools: 8 (wallet, transaction, payload trim, error recovery)
- api/chat: 8 (SSE streaming, all HTTP status codes, session operations)
- api/wallet: 4 (valid investigation, invalid address/chain/limit)

Skipped (opt-in `LIVE_TESTS=1`): 2 rpc live + 2 alchemy live — verified real Base and Alchemy integration with the L2 Standard Bridge predeploy.

## 8. Build results

`npm run build` succeeds on Next.js 16.4.5 with `output: "standalone"`:

```text
✓ Compiled successfully in ~1s
✓ Finalizing page optimization
Route (app)
┌ ○ / (static — Next.js welcome, unused)
├ ○ /_not-found (static)
├ ƒ /api/chat (dynamic — SSE)
├ ƒ /api/health (dynamic)
└ ƒ /api/wallet/[address] (dynamic)
```

Zero warnings. `.next/standalone` is the standalone bundle the Dockerfile copies.

## 9. Security implementation

Full review: `docs/security-review.md`. Summary:

- **Read-only guarantee** — no signing, no broadcasting, no private keys anywhere in the codebase
- **Secret handling** — API keys read only from `process.env`; `.env` gitignored; `/api/settings` and `/api/health` return only `*Configured: true/false` flags (tested in `tests/config/config.test.ts`)
- **Input validation** — every HTTP body, tool argument, and config value is validated by Zod; body size limit on `/api/chat` (64 KB, `413` above)
- **Bounded execution** — every agent loop, every provider call, every trace depth is bounded by config; limits are checked before expensive operations
- **Local-network safety** — default `HOST=127.0.0.1`; the config loader **refuses to start** with a public `HOST` unless `REMOTE_ACCESS=true`; `compose.yaml` binds the host port to loopback
- **Prompt injection defence** — system prompt instructs the model to treat blockchain data (token symbols, contract metadata, event log content) as untrusted and to ignore embedded instructions
- **Error sanitization** — every route truncates errors to first line; no stack traces or file paths reach clients
- **Graceful shutdown** — SIGTERM/SIGINT close the SQLite connection cleanly via `instrumentation-node.ts`

## 10. Local installation

```bash
git clone https://github.com/boycisco/WDMWD.git
cd WDMWD
npm install
cp .env.example .env
# Edit .env: set BASE_RPC_URL, GEMINI_API_KEY, ALCHEMY_API_KEY
npm run db:migrate
npm run dev
```

Server: http://127.0.0.1:3000

Quick sanity check:

```bash
curl http://localhost:3000/api/health
```

## 11. Docker deployment

```bash
cp .env.example .env
# Edit .env
docker compose up -d
```

Runs on 127.0.0.1:3000 (loopback only — do not change without reading SECURITY.md).

Persistent volume wdmwd-data holds the SQLite database. Health check polls /api/health. Graceful shutdown on docker compose stop (15s grace period).

For remote/VPS deployment: docs/deployment.md.

## 12. Required environment variables

| Variable | Required for | Default |
|---|---|---|
| BASE_RPC_URL | prod (or ALCHEMY_API_KEY) | https://mainnet.base.org |
| ALCHEMY_API_KEY | wallet investigation | — |
| GEMINI_API_KEY | if AI_PROVIDER=gemini | — |
| OPENAI_API_KEY | if AI_PROVIDER=openai | — |
| DATABASE_URL | no | file:./data/wdmwd.db |
| HOST, PORT | no | 127.0.0.1, 3000 |
| AI_PROVIDER | no | gemini |
| GEMINI_MODEL | no | gemini-3.6-flash |
| MAX_TOOL_CALLS, MAX_AGENT_ITERATIONS, MAX_TRACE_DEPTH, REQUEST_TIMEOUT | no | 8, 6, 5, 60000 |
| REMOTE_ACCESS | no | false |

## 13. Known limitations (documented, not bugs)

- Base only — chain registry extensible but only one chain registered
- Transfer activity only — wallet investigations cover indexed transfer events; internal transfers and out-of-window history are excluded
- Event logs counted, not decoded — transaction investigations report that Transfer events occurred but not which token, how much, or to whom
- No fund tracing (§6.8), no relations module (§6.9), no pattern detection (§6.10)
- No local model support — Gemini and OpenAI via HTTPS only
- Gemini free tier ~20 RPD — each user message consumes 2–4 calls
- No frontend — backend only; SSE API is frontend-ready
- npm audit dev-dependency warnings — ESLint tooling; production audit is clean

## 14. Remaining issues

None known in V1 scope. Deferred work is documented above as future scope, not as defects.

## 15. Frontend integration readiness

The backend is designed to be consumed by a browser chat UI. What is already in place:

API contract (`docs/api.md`):

- `POST /api/chat` with `{ message, sessionId?, chainId? }` — SSE stream with 9 documented event types
- `GET /api/chat?sessionId=` — full message history
- `DELETE /api/chat?sessionId=` — session deletion
- `GET /api/wallet/[address]` — direct structured investigation endpoint (no AI)

SSE event reference — the frontend can display:

- `message.start` → "investigation started"
- `investigation.start` → per-turn progress marker
- `tool.start` / `tool.result` → "calling wallet investigation..."
- `evidence` → array of evidence IDs to fetch from the investigation result
- `message.delta` → streamed text chunks appended to the transcript
- `message.complete` → final text (fallback for message.delta accumulation)
- `error` → display error, close stream
- `done` → session terminated, save sessionId for follow-ups

Evidence is UI-ready — each Finding has classification (confirmed/inferred/unknown) for visual distinction; each Evidence has transactionHash, blockNumber, source, and retrievedAt. Explorer URLs are constructible from `chain.explorerUrl` in `src/chain/base.ts` (https://basescan.org).

Recommendation for frontend build:

- Chat UI with message list, streaming indicator, tool-call visual feedback
- Evidence panel per message — expandable findings with classification badges and Basescan links
- Session list in a sidebar (from `GET /api/chat` without `sessionId`)
- Optional: direct wallet view (`GET /api/wallet/[address]`) for deterministic display without AI cost

Deferred frontend decisions:

- Whether to show tool-call progress inline or in a sidebar
- Whether to render findings as structured cards or inline citations
- Whether to expose `/api/wallet/[address]` as a "no AI" path for power users

None of these require backend changes — the API surface supports any of these options today.

Backend V1 is complete. What remains is the chat interface, which the backend was designed for from day one.