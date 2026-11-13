# WDMWD — What Did My Wallet Do?

**A personal onchain intelligence assistant for investigating Base activity through natural-language conversation.**

WDMWD is an open-source, single-user, local-first investigator for Base Mainnet. Ask questions about a wallet or transaction and the application uses an AI agent, blockchain data providers, and a persistent evidence store to produce readable, evidence-backed answers in a ChatGPT-style interface.

Examples of questions:

- What happened to this wallet?
- Where did it get its ETH?
- What happened in this transaction?
- Was that address a wallet or a contract?
- Who funded the address we were discussing?

WDMWD is read-only. It does not request private keys, sign transactions, or move funds. It is an investigation tool, not a portfolio tracker, trading terminal, or wallet application.

## Contents

- [What WDMWD does](#what-wdmwd-does)
- [What it does not do](#what-it-does-not-do)
- [How answers are grounded](#how-answers-are-grounded)
- [Technology](#technology)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Run the application](#run-the-application)
- [Docker deployment](#docker-deployment)
- [API overview](#api-overview)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Security and privacy](#security-and-privacy)
- [Known limitations](#known-limitations)
- [License](#license)
- [Contributing](#contributing)

## What WDMWD does

WDMWD investigates supported Base Mainnet activity through a conversational interface.

- **Wallet investigation:** examines indexed transfer activity and returns a wallet profile, findings, counterparties, and interacted contracts available from the configured data sources.
- **Transaction investigation:** explains transaction details including sender, recipient, contract-versus-EOA classification, success or revert status, ETH value, gas cost, and event-log information available to the current implementation.
- **Evidence-backed answers:** findings distinguish confirmed information, inferences, and unknowns. Evidence records can refer to transaction hashes, blocks, addresses, and the source used to retrieve the information.
- **Contextual follow-ups:** conversation context can resolve wallet addresses and transaction hashes mentioned earlier, so a follow-up does not always need the identifier repeated.
- **Streaming responses:** chat replies are delivered using Server-Sent Events (SSE), with investigation activity and evidence surfaced in the interface.
- **Persistent conversations:** sessions, messages, investigations, evidence, entities, and settings are stored in SQLite through Drizzle ORM.
- **Self-hosting:** the frontend and API are part of one Next.js application. There is no separate WDMWD-hosted service required to run your own instance.

## What it does not do

The current V1 scope is intentionally narrow. WDMWD is not:

- A portfolio or balance dashboard.
- A periodic wallet recap or social-sharing product.
- A trading signal service.
- A wallet signer, custody service, or transaction broadcaster.
- A multi-user hosted SaaS application.
- A multi-chain investigator. Base Mainnet is the only configured network in V1.
- A multi-hop fund-tracing or wallet-relationship analysis engine.

## How answers are grounded

The agent uses registered investigation tools to retrieve data before forming an answer. It distinguishes:

- **Confirmed:** directly supported by retrieved onchain or provider data.
- **Inferred:** a reasonable interpretation of available evidence, but not directly proven by it.
- **Unknown:** information that could not be established from the available data.

Treat an inference as an interpretation, not proof of intent or identity. Onchain proximity or repeated interaction alone does not establish that two addresses have the same owner.

## Technology

The current implementation is a unified Next.js modular monolith:

- Next.js App Router and React.
- TypeScript in strict mode.
- Tailwind CSS v4.
- Space Grotesk and Inter typography, with Lucide icons.
- Viem for Base RPC access.
- Alchemy for indexed and historical blockchain data.
- SQLite through `better-sqlite3` and Drizzle ORM.
- Google Gemini through `@google/genai`, with a provider abstraction that also supports the configured OpenAI adapter.
- Zod for validation.
- Vitest for automated tests.

The frontend and API run in the same Next.js application and share the same origin and local persistence layer.

## Requirements

The repository's release notes specify the following baseline:

- Node.js 22 or newer.
- npm 10 or newer.
- Access to Base Mainnet through the configured RPC/data provider.
- Credentials for the selected AI provider.
- Docker Engine / Docker Desktop and Docker Compose for container deployment.

Use the repository's `.nvmrc`, `package.json` engine constraints, and `.env.example` as the final authority if they specify more exact versions or requirements.

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/boycisco/WDMWD.git
cd WDMWD
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and provide the credentials required by your chosen AI and blockchain providers. Do not commit this file.

### 4. Apply local database migrations

```bash
npm run db:migrate
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The chat interface and API are served by the same application.

### 6. Check application health

```bash
curl http://127.0.0.1:3000/api/health
```

The health endpoint returns an overall status and individual subsystem checks. An HTTP 200 response does not by itself mean every subsystem is healthy; inspect the returned status fields.

## Configuration

Configuration is read from environment variables and validated at startup. The following table reflects the variables described by the current project configuration. `.env.example` and the runtime config schema are authoritative if they differ.

| Variable | Default / requirement | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment, normally `development`, `test`, or `production`. |
| `PORT` | `3000` | HTTP port. |
| `HOST` | `127.0.0.1` | Bind address. Non-loopback binding requires explicit remote-access configuration. |
| `DATABASE_URL` | `file:./data/wdmwd.db` | SQLite database location. Docker uses the container data directory. |
| `BASE_RPC_URL` | `https://mainnet.base.org` when using the public Base RPC | Base Mainnet JSON-RPC endpoint. |
| `ALCHEMY_API_KEY` | Optional in development; configure for Alchemy-backed indexed history | Alchemy access for historical/indexed activity. |
| `AI_PROVIDER` | `gemini` | Selects the configured model provider (`gemini` or `openai`). |
| `GEMINI_API_KEY` | Required when `AI_PROVIDER=gemini` | Google AI Studio API key. |
| `GEMINI_MODEL` | `gemini-3.6-flash` in the supplied configuration report | Gemini model identifier. |
| `OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` | OpenAI API key. |
| `OPENAI_MODEL` | `gpt-4o-mini` in the supplied configuration report | OpenAI model identifier. |
| `MAX_TOOL_CALLS` | `8` | Maximum tool calls allowed for one agent request. |
| `MAX_AGENT_ITERATIONS` | `6` | Maximum agent/model iterations for one request. |
| `MAX_TRACE_DEPTH` | `5` | Reserved configuration for future tracing; multi-hop tracing is not implemented in V1. |
| `REQUEST_TIMEOUT` | `60000` milliseconds | Request timeout. |
| `REMOTE_ACCESS` | `false` | Explicit opt-in required for non-loopback access. This does not add authentication or TLS. |
| `NEXT_ALLOWED_DEV_ORIGINS` | Unset | Comma-separated development hostnames allowed for local-network testing with `next dev`. |

For a complete investigation experience, configure the Base RPC and Alchemy credentials required by the features you intend to use. Configure the API key for the selected AI provider. Production startup validation may reject missing provider configuration.

Never put secrets in variables prefixed with `NEXT_PUBLIC_`; those are intended for browser-exposed values.

## Run the application

Development:

```bash
npm run dev
```

Production build and start:

```bash
npm run build
npm start
```

Database schema changes:

```bash
npm run db:generate
npm run db:migrate
```

`db:generate` is used when generating migration files after schema changes. `db:migrate` applies pending migrations for local development. Docker deployment applies pending migrations during application startup through the Node instrumentation startup path.

## Docker deployment

The repository includes a Dockerfile and `compose.yaml` for running the unified application with persistent SQLite storage.

```bash
cp .env.example .env
# Edit .env with your provider credentials.
docker compose up -d --build
```

Check the container and application:

```bash
docker compose ps
docker compose logs --tail=100 wdmwd
curl http://127.0.0.1:3000/api/health
```

The Compose configuration is intended to bind the application to loopback by default and persist the database in a named volume. Confirm the actual port mapping and volume name in `compose.yaml` before changing deployment settings.

**Warning:** `docker compose down -v` removes named volumes and can permanently delete the WDMWD database. Use it only when you intend to destroy the stored data.

See [Deployment](docs/deployment.md) for startup, backup, update, and troubleshooting instructions.

## API overview

The API is served from the same origin as the frontend.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Application and subsystem status. |
| `POST` | `/api/chat` | Submit a message and receive an SSE stream. |
| `GET` | `/api/chat` | List recent sessions. |
| `GET` | `/api/chat?sessionId=<uuid>` | Retrieve a conversation and its messages. |
| `DELETE` | `/api/chat?sessionId=<uuid>` | Delete a conversation and dependent records. |
| `GET` | `/api/wallet/[address]` | Run deterministic wallet investigation without the AI agent. |
| `GET` | `/api/settings` | Retrieve persisted UI settings. |
| `PATCH` | `/api/settings` | Update supported UI settings. |

The chat stream uses these event names: `message.start`, `investigation.start`, `tool.start`, `tool.result`, `evidence`, `message.delta`, `message.complete`, `error`, and `done`.

See [API Reference](docs/api.md) for request/response details and event payloads.

## Project structure

The application is a modular monolith. Important source areas include:

| Path | Responsibility |
|---|---|
| `src/app/` | Next.js pages, layouts, and route handlers. |
| `src/components/` | Reusable frontend components. |
| `src/hooks/` | Client-side state and interaction hooks. |
| `src/lib/` | Frontend utilities and API integration. |
| `src/agent/` | Agent loop, registered tools, and system instructions. |
| `src/model/` | Provider-independent model interface and provider adapters. |
| `src/chat/` | Conversation state, context resolution, and streaming support. |
| `src/wallet/` | Wallet investigation logic. |
| `src/transaction/` | Transaction investigation logic. |
| `src/data/` | Blockchain RPC and indexing adapters. |
| `src/chain/` | Chain configuration and registry. |
| `src/evidence/` | Evidence types and helpers. |
| `src/store/` | Drizzle schema, migrations, and SQLite access. |
| `src/config/` and `src/core/` | Runtime configuration and shared primitives. |

See [Architecture](docs/architecture.md) for the request and data flows.

## Testing

Run the default test suite:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

Run the opt-in live Base/Alchemy tests on macOS or Linux:

```bash
LIVE_TESTS=1 npm test
```

On Windows PowerShell:

```powershell
$env:LIVE_TESTS = "1"
npm test
Remove-Item Env:LIVE_TESTS
```

The supplied project report recorded 143 tests passing and 4 live tests skipped by default at the time of that report. Test counts can change; the output from the current test run is authoritative. See [Testing](docs/testing.md).

## Security and privacy

WDMWD is read-only: it does not request wallet private keys, sign transactions, or broadcast transactions. The default server bind is loopback (`127.0.0.1`). Remote access is an explicit opt-in and does not provide authentication or TLS by itself.

The SQLite database stores local conversation and investigation data. Requests and relevant retrieved onchain context are sent to the AI provider configured by the operator so that it can generate answers. Blockchain requests are sent to the configured RPC and indexing providers. Review those providers' terms and privacy policies before using the application with sensitive prompts.

Do not expose the application directly to the public internet. Read [Security Policy](SECURITY.md) before enabling remote access.

## Known limitations

The current V1 implementation has these known scope limits:

- Base Mainnet is the only configured chain.
- Multi-hop fund tracing is not implemented. The presence of `MAX_TRACE_DEPTH` does not mean tracing is available.
- Wallet-to-wallet relationship analysis is not implemented.
- Behavioural pattern detection is not implemented.
- Transaction event logs are surfaced as event information, but the current transaction tool does not provide full ABI decoding of token transfer details into a complete semantic transaction breakdown.
- Wallet history is based on supported indexed transfer activity. Internal contract movements, activity outside provider/indexer coverage, and other unsupported activity may be absent.
- Ollama and LM Studio local-model support is not implemented.

These limitations affect what the agent can establish. An absent result must not be interpreted as proof that an event never occurred.

## License

WDMWD is distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [`LICENSE`](LICENSE).

## Contributing

Bug reports, documentation improvements, and pull requests are welcome. Read [Contributing](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

For security vulnerabilities, do not open a public issue. Follow [`SECURITY.md`](SECURITY.md).
