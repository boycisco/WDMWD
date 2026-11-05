# Contributing to WDMWD

Thanks for considering a contribution. WDMWD is a small, deliberately-scoped project — the best contributions are usually bug fixes, tests, and documentation improvements, not new features.

Before you start, read [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) and [`SECURITY.md`](SECURITY.md).

---

## Development setup

Requirements:

- Node.js ≥ 22 LTS
- npm ≥ 10
- A Gemini API key (free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
- An Alchemy API key (free at [alchemy.com](https://www.alchemy.com/)) — only needed for live tests and for wallet investigations

```bash
git clone https://github.com/boycisco/WDMWD.git
cd WDMWD
npm install
cp .env.example .env
# Edit .env with your keys and BASE_RPC_URL
npm run db:migrate
npm run dev
```

Before opening a PR, ensure all four pass locally:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Coding conventions

TypeScript strict mode. No any in application code. Test code may use any when stubbing provider SDKs (lint config allows it under tests/).

No provider code outside adapters. Only these files may reference a specific external SDK:

- `src/data/alchemy.ts` (Alchemy)
- `src/data/rpc.ts` (Viem)
- `src/model/gemini.ts` (Google Gen AI SDK)
- `src/model/openai.ts` (OpenAI SDK)

Everything else speaks WDMWD's own types from `src/core/types.ts`.

Never use JS number for token amounts. All amounts are bigint internally and stored as decimal strings (`TokenAmount.raw`) in public types. This is the one rule we cannot relax — floating-point math corrupts financial data.

Errors are typed. Throw from `src/core/errors.ts` (`ValidationError`, `NotFoundError`, `RpcError`, `IndexerError`, `AiError`, `UnsupportedError`, `LimitExceededError`, `ConfigError`). Never throw raw `Error` from application code.

Validate at boundaries. Any input from outside the process (HTTP body, env var, RPC response, model tool argument) is validated with Zod before reaching business logic. Use the helpers in `src/core/validate.ts`.

Evidence for every claim. A finding without an evidence ID will fail review. Only the `f_coverage` finding may omit evidence, and it must be classification: "unknown" with explicit limitations.

Test the behaviour, not the implementation. Prefer a test that asserts "invalid address returns 400" over one that asserts "the handler called parseOrThrow".

## Folder responsibilities

See [docs/architecture.md](./docs/architecture.md) for the full map. In brief:

- `src/app/` — HTTP routes only. No business logic here; route handlers call into the appropriate module.
- `src/agent/` — the tool-calling loop, tool registry, and system prompt.
- `src/model/` — the Model interface and provider adapters. Adding a new AI provider means a new file here and one branch in `agent.ts`.
- `src/chat/` — session and message persistence, context extraction, SSE formatting.
- `src/wallet/` — address validation, activity retrieval, profile aggregation, investigation orchestration.
- `src/transaction/` — transaction investigation.
- `src/evidence/` — evidence schema and helpers.
- `src/data/` — provider-specific data retrieval (RPC, Alchemy).
- `src/chain/` — chain registry.
- `src/store/` — Drizzle schema, migrations, DB access.
- `src/core/` — shared types, errors, validation helpers.
- `src/config/` — centralized configuration.

## Testing requirements

Every PR must include tests for new behaviour. The bar is:

- New exported function → at least one test covering its happy path and one covering a failure mode.
- New API endpoint → integration test using a mocked underlying module.
- Bug fix → a test that reproduces the bug before the fix and passes after.
- Schema change → migration tested in an isolated temp DB (see `tests/store/store.test.ts` for the pattern).

Live tests (network calls) are opt-in, gated by `LIVE_TESTS=1`, and never run in the default `npm test`. This keeps the suite fast and CI-safe. Unit tests mock provider SDKs; live tests validate real integration.

Coverage is a signal, not a goal. If you're unsure what to test, ask in the PR — testing the wrong thing is worse than not testing.

## Contribution workflow

Open an issue first for anything larger than a small bug fix. State what you intend to build and why. This avoids wasted effort on PRs that don't fit the project scope.

Fork and branch. Use a descriptive branch name: `fix/evidence-id-collision`, `feat/transaction-abi-decode`.

Write tests and code together. Commit in logical chunks with clear messages. Squash before merging if your commits are noisy.

Run the full check locally before opening the PR: typecheck, lint, test, build.

Open the PR with a description that explains the why, not just the what. Include before/after output if relevant.

Respond to review. Small, focused changes are easier to review than large ones. If a review suggests a different approach, it's usually because the reviewer knows something about a downstream consumer you don't.

## Adding investigation modules

To add a new intelligence module (e.g. fund tracing, relations, patterns):

Create `src/<module>/investigate.ts` with a single exported async function `investigateX(opts): Promise<XInvestigation>`.

`XInvestigation` should contain findings: `Finding[]` and evidence: `Evidence[]`, following the shape of `WalletInvestigation` and `TransactionInvestigation`.

Every finding must reference at least one evidence ID, except a final `f_<module>_coverage` finding with classification: "unknown" that explicitly lists what the module does not establish.

Add the module to `src/agent/tools.ts` as a `ToolHandler` with a clear description, a JSON schema for arguments, and a `handleX` function that returns a `ToolResult` (see `handleWallet` for the pattern).

Add the tool to the "Available tools" section of `src/agent/prompt.ts`.

Write unit tests in `tests/<module>/investigate.test.ts` with mocked RPC/adapters.

## Adding blockchain adapters

### Adding a new EVM chain

Create `src/chain/<name>.ts` with a `Chain` object (see `src/chain/base.ts`).

Add one entry to the registry map in `src/chain/registry.ts`.

Add one entry to `ALCHEMY_HOST_BY_CHAIN` in `src/data/alchemy.ts` if the chain has an Alchemy endpoint.

If the chain needs an env override for RPC URL, extend `resolveRpcUrl` in `src/data/rpc.ts`.

Add the chain's `rpcUrl` fallback in `src/chain/<name>.ts`.

That's the entire surface. No intelligence modules need to change — that's the point of the registry.

### Adding a new AI provider

Create `src/model/<provider>.ts` exporting `create<Provider>Model(opts): Model`.

Add the provider name to the `AI_PROVIDER` enum in `src/config/config.ts`.

Add the API-key and model-name env vars to `EnvSchema` and the config interface.

Add one branch to `src/agent/agent.ts` that constructs the new model when `config.ai.provider === "<provider>"`.

Add tests in `tests/model/<provider>.test.ts` with a mocked SDK client.

Nothing in `src/agent/loop.ts` or `src/chat/` needs to change. The `Model` interface in `src/model/model.ts` is the entire contract.

## Commit style

Use the imperative mood in the subject line: "add transaction tool" not "added transaction tool".

Keep the subject under 72 characters.

Reference the issue number in the body if relevant.

No emoji. No WIP. No fix.

## Questions

Open a discussion or an issue. If you're unsure whether an idea fits the project scope, ask before building.

Thanks for contributing.