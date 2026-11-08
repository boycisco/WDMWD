# WDMWD — What Did My Wallet Do?

**A personal onchain intelligence assistant. Ask questions about Base wallet activity in plain language. Get evidence-backed answers.**

WDMWD is an open-source, single-user, local-first backend that turns natural-language questions about onchain activity into structured, evidence-backed investigations. You paste an address or a transaction hash, ask a question, and get a response that cites exact transaction hashes from Base mainnet.

> *"What happened to this wallet?"*
> *"Where does it receive its ETH?"*
> *"What happened in this transaction?"*
> *"Was that sent to a wallet or a contract?"*

No portfolio tracking, no trading signals, no wallet signing. Just a focused investigator.

---

## Table of Contents

- [What it does](#what-it-does)
- [What it doesn't do](#what-it-doesnt-do)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Running](#running)
- [API overview](#api-overview)
- [Testing](#testing)
- [Architecture](#architecture)
- [Docker](#docker)
- [Security](#security)
- [Current limitations](#current-limitations)
- [Roadmap](#roadmap)
- [License](#license)
- [Contributing](#contributing)

---

## What it does

WDMWD investigates Base mainnet activity through natural-language conversation:

- **Wallet investigation** — incoming and outgoing transfers, top counterparties, top interacted contracts, with exact token amounts preserved to their smallest unit.
- **Transaction investigation** — sender, recipient, contract-vs-EOA classification, success/reverted status, ETH value moved, gas cost, and event-log summary.
- **Evidence-first answers** — every factual claim is tagged `CONFIRMED`, `INFERRED`, or `UNKNOWN`. Every confirmed claim cites evidence IDs that resolve to specific transactions, blocks, and amounts.
- **Contextual follow-ups** — after investigating a wallet, ask *"who funded it?"* and it resolves the wallet from history without being asked to repeat it.
- **Streaming responses** — every conversation turn streams over Server-Sent Events (SSE) so you see the investigation progress in real time.

## What it doesn't do

WDMWD is deliberately narrow. It is **not**:

- A portfolio tracker or balance dashboard
- A wallet recap or Spotify-Wrapped product
- A social or sharing application
- A trading signal platform
- A transaction signer or custodial wallet
- A multi-tenant SaaS

If you want any of the above, WDMWD is the wrong tool.

---

## Requirements

- **Node.js** ≥ 22 LTS (tested on Node 26)
- **npm** ≥ 10
- **Base mainnet access** — either the free public endpoint (`https://mainnet.base.org`) or an [Alchemy](https://www.alchemy.com/) account (free tier fine)
- **AI provider** — either [Google AI Studio](https://aistudio.google.com/apikey) (free tier) for Gemini, or an OpenAI API key

## Quick start

```bash
git clone https://github.com/boycisco/WDMWD.git
cd WDMWD
npm install
cp .env.example .env
# Edit .env and set at minimum:
#   BASE_RPC_URL=https://mainnet.base.org
#   GEMINI_API_KEY=AIza...   (get one free at https://aistudio.google.com/apikey)
#   ALCHEMY_API_KEY=...      (get one free at https://www.alchemy.com/)
npm run db:migrate
npm run dev
```

The server starts on [http://127.0.0.1:3000](http://127.0.0.1:3000).

```bash
# Verify it's working
curl http://localhost:3000/api/health
```

You should see {"status":"ok",...} with blockchain: "ok" and a live Base block number.

Try a conversation:

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Investigate wallet 0x4200000000000000000000000000000000000010"}'
```

You'll see SSE events: tool.start (the wallet investigation), tool.result (real Base data), evidence (cited evidence IDs), then message.delta streaming the answer.

On PowerShell, use --data-binary "@-" and pipe the JSON:

```powershell
'{"message":"Investigate wallet 0x4200000000000000000000000000000000000010"}' |
  curl.exe -N -X POST http://localhost:3000/api/chat `
    -H "Content-Type: application/json" --data-binary "@-"
```

## Configuration

All configuration is environment-based. Copy .env.example to .env and edit.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| NODE_ENV | no | development | development / test / production |
| PORT | no | 3000 | HTTP port |
| HOST | no | 127.0.0.1 | Bind address. 0.0.0.0 requires REMOTE_ACCESS=true |
| DATABASE_URL | no | file:./data/wdmwd.db | SQLite file path |
| BASE_RPC_URL | dev: no, prod: yes (or ALCHEMY_API_KEY) | Base public endpoint | Base mainnet RPC URL |
| ALCHEMY_API_KEY | dev: no, prod: yes (or BASE_RPC_URL) | — | Alchemy key for historical wallet activity |
| AI_PROVIDER | no | gemini | gemini or openai |
| GEMINI_API_KEY | if provider=gemini | — | Google AI Studio key |
| GEMINI_MODEL | no | gemini-3.6-flash | Model name |
| OPENAI_API_KEY | if provider=openai | — | OpenAI key |
| OPENAI_MODEL | no | gpt-4o-mini | Model name |
| MAX_TOOL_CALLS | no | 8 | Max tool calls per request |
| MAX_AGENT_ITERATIONS | no | 6 | Max model turns per request |
| MAX_TRACE_DEPTH | no | 5 | Max fund-trace hop depth (reserved for future) |
| REQUEST_TIMEOUT | no | 60000 | Per-request timeout in ms |
| REMOTE_ACCESS | no | false | Must be true if HOST is not loopback |

Configuration is validated at startup by Zod. Missing required values throw a ConfigError with an explicit message — never a silent fallback.

## Running

Development (with hot reload):

```bash
npm run dev
```

Production (build then start):

```bash
npm run build
npm start
```

Database:

```bash
npm run db:generate   # after schema changes: generate migration SQL
npm run db:migrate    # apply pending migrations
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
```

## API overview

All endpoints are documented in detail in [docs/api.md](./docs/api.md). Summary:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/health | Application, database, blockchain, and AI status (no secrets) |
| POST | /api/chat | Send a message, receive an SSE stream |
| GET | /api/chat?sessionId=... | Retrieve session history |
| GET | /api/chat | List sessions |
| DELETE | /api/chat?sessionId=... | Delete a session and all dependent records |
| GET | /api/wallet/[address] | Deterministic wallet investigation (no AI involved) |
| `GET` | `/api/settings` | Retrieve configuration and UI preferences |
| `PATCH` | `/api/settings` | Update UI preferences (e.g., `streamResponses`) |

The /api/chat stream uses eight documented SSE event types: message.start, investigation.start, tool.start, tool.result, evidence, message.delta, message.complete, error, plus done for termination.

## Testing

```bash
npm test                       # fast unit + mocked integration, no network
npm run test:coverage          # with coverage report
$env:LIVE_TESTS="1"; npm test  # include live Base/Alchemy tests (real network)
Remove-Item Env:LIVE_TESTS     # (Windows) or `unset LIVE_TESTS` on Unix
```

The suite is 134 passed + 4 skipped by default. The skipped tests are opt-in live tests that hit Base mainnet and Alchemy — they verify that our adapters actually work against real providers, not just mocks.

Live tests require a valid ALCHEMY_API_KEY in .env. Unit tests do not.

See [docs/testing.md](./docs/testing.md) for the strategy and how to write new tests.

## Architecture

WDMWD is a modular monolith: one Next.js process, one SQLite file, no external queue or cache.

```text
┌──────────────────────────────────────────────────────────┐
│ POST /api/chat  (SSE)                                    │
└────────────┬─────────────────────────────────────────────┘
             │
       ┌─────▼──────┐
       │  chat/     │  sessions, messages, context, SSE
       └─────┬──────┘
             │
       ┌─────▼──────┐
       │  agent/    │  tool-calling loop (bounded)
       └─────┬──────┘
             │
    ┌────────┼─────────┐
    ▼        ▼         ▼
 wallet/  transaction/  evidence/
    │        │             │
    ▼        ▼             │
 data/  (Alchemy, RPC)     │
    │                     │
    ▼                     ▼
 chain/ (Base)      store/ (SQLite)
```

Key directories (see [docs/architecture.md](./docs/architecture.md) for the full map):

- `src/app/api/` — HTTP entry points only
- `src/agent/` — model loop, tools, system prompt
- `src/model/` — provider-independent model interface + Gemini/OpenAI adapters
- `src/chat/` — conversation persistence, context resolution, SSE formatting
- `src/wallet/`, `src/transaction/` — deterministic investigation modules
- `src/evidence/` — evidence schema and helpers
- `src/data/` — RPC and Alchemy adapters (provider-specific)
- `src/chain/` — chain registry (Base now; extensible)
- `src/store/` — Drizzle schema and DB access

The provider-independence rule is strict: only `src/data/alchemy.ts`, `src/data/rpc.ts`, `src/model/gemini.ts`, and `src/model/openai.ts` may contain provider-specific code. Everything else speaks internal types.

## Docker

See [docs/deployment.md](./docs/deployment.md) for full deployment guidance. Once Session 9b lands the Docker config:

```bash
docker compose up -d
```

The SQLite database persists in a named volume across container restarts. .env is mounted read-only at runtime and is never copied into the image.

## Security

WDMWD is a read-only application. It never requests private keys, never signs or broadcasts transactions, and never moves funds.

Default binding is 127.0.0.1. Public binding requires explicit REMOTE_ACCESS=true and is refused by the config loader without it.

API keys live only in environment variables; .env is gitignored; /api/settings returns only *Configured: true/false flags.

Errors returned to clients never include secrets or full stack traces.

Blockchain data (token symbols, contract text) is treated as untrusted input to the model; the system prompt instructs the model to ignore embedded instructions.

Before exposing WDMWD to a non-loopback network, read [SECURITY.md](./SECURITY.md). Remote deployment requires a reverse proxy with TLS and authentication — none of which WDMWD provides itself.

## Current limitations

Being honest about what V1 does not do:

Base mainnet only. The chain registry supports adding more EVM chains, but only Base is registered. Adding one is a 20-line change (src/chain/) — see [CONTRIBUTING.md](./CONTRIBUTING.md).

Transfer activity only. Wallet investigations enumerate indexed transfer events (native, ERC-20, ERC-721, ERC-1155). Internal transfers between contracts, out-of-window history, and zero-value calls are not included.

Event logs are counted, not decoded. Transaction investigations report that token Transfer events were emitted but not who sent how much of which token — ABI decoding is reserved for a future session.

No fund tracing yet. MAX_TRACE_DEPTH is wired through config but the trace module (§6.8) is not implemented.

No relations module yet. "Do these two addresses interact?" requires src/relation/ (§6.9) — not implemented.

No pattern detection yet. src/pattern/ (§6.10) is not implemented.

Gemini free tier is rate-limited. ~20 requests/day. Each user message consumes 2–4 calls. This is a real constraint for frequent use.

No frontend. Backend only — the SSE API is frontend-ready but no UI ships with V1.

No local model support. Gemini and OpenAI via HTTPS only. Ollama/LM Studio are future work.

## Roadmap

The backend V1 delivers the core product (§2 of the original spec): chat-first, evidence-first, single-user, local-first investigation of Base wallets and transactions.

Post-V1 work, in rough priority order:

- Transaction ABI decoding (know which token, what amount, to whom)
- Fund tracing module (§6.8) — bounded multi-hop transfer paths
- Relations module (§6.9) — recurring counterparties, shared contracts
- Pattern detection (§6.10) — deterministic behavioural signatures
- Chat frontend (the SSE API is already designed for it)
- Local model support (Ollama, LM Studio)
- Additional EVM chains (Ethereum, Optimism, Arbitrum — registry is ready)

None of these are promised. WDMWD is a personal project; it may move slowly or not at all.

## License

GNU Affero General Public License v3.0 — see [LICENSE](./LICENSE).

AGPL-3.0 is a copyleft license. If you run WDMWD as a network service and modify it, you must make your modified source available to users of that service. If you only self-host for yourself, no obligation is triggered.

## Contributing

Bug reports, feature discussions, and pull requests are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) and read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

For security issues, do not open a public issue — see [SECURITY.md](./SECURITY.md).