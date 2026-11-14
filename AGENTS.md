# AGENTS.md

Project guidance for AI coding assistants and contributors working on WDMWD.

Read this document before making changes. It describes the architecture, development conventions, important implementation constraints, and known technical pitfalls.

This file is the canonical source of project-specific guidance for AI-assisted development.

---

## 1. Project Overview

**WDMWD (What Did My Wallet Do?)** is a local-first, open-source, AI-powered onchain intelligence assistant.

It allows users to investigate Base Mainnet wallets and transactions through natural-language conversations.

The application retrieves real blockchain data, executes deterministic investigation tools, and uses an AI agent to produce understandable, evidence-backed explanations.

Findings must distinguish between:

- `CONFIRMED`: Directly supported by retrieved evidence.
- `INFERRED`: A reasonable interpretation of available evidence, not independently established as fact.
- `UNKNOWN`: Information that cannot currently be established.

Never present an inference as a confirmed fact.

### Core characteristics

- Single-user application per installation.
- Local-first and self-hostable.
- Read-only blockchain investigation.
- Base Mainnet is the initially supported network.
- Conversational interface with streaming responses.
- SQLite persistence.
- Modular monolithic architecture.
- AGPL-3.0-only licence.

### Application architecture

WDMWD is a **single unified Next.js application**.

The frontend, API routes, agent, blockchain integrations, and persistence layer run within the same application.

There is no separate backend API server.

Do not split the application into independently deployed frontend and backend services unless the project owner explicitly approves an architectural change.

---

## 2. Before Making Changes

Before implementing a feature or modifying existing code:

1. Inspect the relevant implementation.
2. Read the related types, tests, and documentation.
3. Understand the existing data flow.
4. Identify affected components and dependencies.
5. Check the current Git working-tree status.
6. Preserve unrelated user changes.
7. Make the smallest change that correctly solves the problem.

Do not assume that a file is unused simply because it is not referenced directly. Consider framework conventions, dynamic imports, generated files, scripts, and runtime behaviour.

Do not rewrite working modules merely to impose a preferred coding style.

For architectural changes, explain the problem being solved and the consequences before proceeding.

---

## 3. Development Commands

The following commands are expected project workflows. Check `package.json` before changing scripts or assuming that a command exists.

### Development

```bash
npm install
npm run dev
```

The development server normally runs at:

```text
http://127.0.0.1:3000
```

### Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Run the relevant checks after making changes.

The production build must succeed before a change is considered release-ready.

### Database

```bash
npm run db:generate
npm run db:migrate
```

Generate migrations after changing the Drizzle schema.

Apply migrations using the project's supported migration workflow.

Never modify an existing migration in a way that breaks installations that have already applied it. Add a new migration when a schema change requires one.

### Docker

```bash
docker compose build
docker compose up -d
docker compose logs -f wdmwd
docker compose stop
```

Use the actual service names defined in `compose.yaml`.

Verify Docker behaviour rather than assuming that a successful local development run proves container compatibility.

---

## 4. Architecture Map

The following describes the current logical module boundaries. Inspect the repository before assuming that every path or filename remains unchanged.

| Location | Responsibility |
|---|---|
| `src/app/` | Next.js application, pages, layouts, and API routes |
| `src/components/` | User interface components |
| `src/hooks/` | Frontend hooks |
| `src/lib/` | Frontend utilities and API integration |
| `src/agent/` | Agent loop, tool registry, and system prompt |
| `src/model/` | Model interface and provider adapters |
| `src/chat/` | Conversation context, sessions, messages, and streaming |
| `src/wallet/` | Wallet investigation logic |
| `src/transaction/` | Transaction inspection logic |
| `src/evidence/` | Evidence types, construction, and helpers |
| `src/data/` | Blockchain RPC and indexing adapters |
| `src/chain/` | Chain configuration and registry |
| `src/store/` | Drizzle schema, migrations, and database access |
| `src/config/` | Environment configuration and validation |
| `src/core/` | Shared types, errors, and validation utilities |
| `tests/` | Automated tests |

### Architectural principles

- Keep the application a modular monolith.
- Keep responsibilities separated by domain.
- Avoid circular dependencies.
- Avoid duplicating business logic.
- Keep provider-specific code behind adapters.
- Use shared internal types instead of leaking provider SDK types throughout the application.
- Keep deterministic blockchain investigation separate from AI interpretation.
- Keep persistence operations behind the existing store layer.
- Avoid unnecessary abstractions and dependencies.

---

## 5. TypeScript and Code Conventions

### TypeScript

The project uses TypeScript strict mode.

- Avoid `any` in production source code.
- Prefer explicit types at module boundaries.
- Validate external data before trusting it.
- Avoid unsafe type assertions.
- Keep API request and response types consistent with the actual implementation.
- Do not suppress TypeScript errors merely to make the build pass.

Tests may use controlled type escapes when mocking external SDKs, but these should remain limited and understandable.

### Naming and organisation

- Use clear, descriptive names.
- Prefer one-word filenames where practical.
- Respect framework-required filenames and conventions.
- Keep modules focused.
- Avoid unnecessarily large files.
- Do not create abstractions for code that is only used once without a meaningful benefit.

### Comments

Write comments to explain non-obvious decisions, constraints, or workarounds.

Do not add comments that simply restate what the code already says.

---

## 6. Licensing and SPDX

The project uses:

**GNU Affero General Public License v3.0 only.**

SPDX identifier:

```text
AGPL-3.0-only
```

### Source-file headers

Project-authored TypeScript source files should use:

```ts
// SPDX-License-Identifier: AGPL-3.0-only
```

For files containing a Next.js directive such as:

```ts
'use client';
```

The directive must remain first. Place the SPDX comment immediately after the directive.

Example:

```ts
'use client';

// SPDX-License-Identifier: AGPL-3.0-only
```

Use the appropriate comment syntax for other file types.

Do not blindly add headers to:

- Third-party source code.
- Vendored code.
- Generated files.
- Lockfiles.
- Files where the format does not support comments.

### Licence restrictions

- Do not change the project licence.
- Do not use `AGPL-3.0-or-later`.
- Do not replace the official `LICENSE` with a summary.
- Do not modify the official licence text.
- Do not invent copyright holders or copyright dates.
- Preserve existing third-party notices.

Read `NOTICE.md` and `THIRD_PARTY_NOTICES.md`, if present, before changing licensing-related files.

---

## 7. Blockchain Data Integrity

Financial and onchain data must remain exact.

### Token amounts

**Never convert token amounts to JavaScript floating-point numbers for arithmetic or financial calculations.**

Use `bigint` internally and exact decimal strings at serialization boundaries.

The established amount-handling implementation retrieves raw contract values rather than relying on Alchemy's floating-point `value` field.

Important concepts include:

- Raw hexadecimal values.
- `BigInt` conversion.
- Token decimals.
- Exact decimal-string formatting.
- Preservation of precision across API and database boundaries.

Inspect the existing implementations, including `hexToBigInt` and `formatAmount` in `src/data/alchemy.ts`, before changing amount handling.

Do not introduce `Number()` conversions that can lose precision.

### Blockchain facts

Never fabricate:

- Balances.
- Transaction histories.
- Token amounts.
- Wallet identities.
- Counterparties.
- Contract labels.
- Transaction outcomes.
- Timestamps.
- Fund movements.

If a provider does not return sufficient information, represent the limitation honestly.

A reverted transaction must never be described as a successful execution.

Do not treat incomplete indexing results as proof that an event never occurred.

---

## 8. Evidence-First Investigation

Investigation findings must be grounded in evidence.

Every substantive finding should reference at least one relevant evidence ID.

An explicit unknown or coverage-limitation finding may exist without transaction-level evidence when its purpose is to document what could not be established.

Evidence should preserve relevant source information, including available:

- Transaction hashes.
- Wallet addresses.
- Block numbers.
- Timestamps.
- Asset movements.
- Data sources.
- Classification.
- Limitations.

Do not fabricate missing evidence fields.

### Classification rules

`CONFIRMED` means the claim is directly supported by retrieved evidence.

`INFERRED` means the claim is a reasoned interpretation of available evidence. Explain the uncertainty.

`UNKNOWN` means the available data is insufficient to establish the claim.

Do not use confidence language to disguise missing data.

Read `docs/evidence.md` before changing evidence structures or classification rules.

---

## 9. Provider Boundaries

Provider-specific implementation belongs in the appropriate adapter.

The established integrations include:

- Viem for blockchain RPC.
- Alchemy for historical blockchain indexing.
- Gemini through `@google/genai`.
- OpenAI through its provider adapter, where configured.

The model abstraction should allow provider changes without rewriting the investigation tools or agent orchestration.

Do not scatter direct provider SDK calls throughout unrelated application modules.

Use internal types and adapter interfaces wherever the architecture already provides them.

Do not expose provider credentials to the browser.

---

## 10. Agent Behaviour and Tool Safety

The agent is a bounded, tool-calling system.

Current reported safeguards include:

```text
MAX_TOOL_CALLS=8
MAX_AGENT_ITERATIONS=6
REQUEST_TIMEOUT=60s
```

Inspect the actual configuration before changing these values.

### Rules

- Only registered tools may be executed.
- Validate tool arguments.
- Enforce execution limits.
- Handle provider errors.
- Handle timeouts.
- Avoid uncontrolled retries.
- Do not allow the model to bypass deterministic validation.
- Do not treat model-generated claims as blockchain evidence.
- Preserve conversation context without inventing historical facts.

The agent's job is to interpret questions, choose appropriate tools, examine returned evidence, and communicate findings.

It must not invent tool results to complete an answer.

### Model reasoning and streaming

The frontend may receive:

- User-facing progress.
- Tool activity.
- Investigation results.
- Evidence.
- Response text.
- Completion and error events.

Do not expose private internal model reasoning or hidden chain-of-thought.

Provider-specific metadata required for model operation must remain internal unless explicitly approved for exposure.

---

## 11. Conversation and Persistence

SQLite is the local persistence layer, accessed through Drizzle ORM and `better-sqlite3`.

The existing schema includes:

- Sessions.
- Messages.
- Investigations.
- Evidence.
- Entities.
- Settings.

Inspect the actual schema before making changes.

### Persistence rules

- Conversations must survive application restarts.
- Session deletion must follow the intended cascade behaviour.
- Database migrations must be safe and reproducible.
- Do not store API credentials in browser-accessible settings.
- Avoid destructive database operations.
- Preserve user data during upgrades.

Use the existing conversation-context resolution system for follow-up questions.

Do not implement a second, competing conversation-history mechanism.

---

## 12. Next.js and Runtime Gotchas

The following are known project-specific implementation details. Verify them against the current framework version and build configuration before modifying related code.

### Instrumentation placement

The current Next.js 16 standalone configuration uses instrumentation files under `src/`:

```text
src/instrumentation.ts
src/instrumentation-node.ts
```

The graceful-shutdown registration depends on the correct instrumentation entry point.

Do not move these files without verifying that the production standalone build still registers the required handlers.

### Docker process handling

The production Docker command should use:

```dockerfile
CMD ["sh", "-c", "exec node server.js"]
```

or an equivalent configuration that ensures Node receives termination signals correctly.

Do not introduce a shell wrapper that prevents the Node process from receiving SIGTERM.

Verify graceful shutdown inside an actual container.

### Gemini thoughtSignature

The Gemini adapter has a provider-specific requirement concerning `thoughtSignature` metadata on function-call parts during subsequent model turns.

A missing signature has previously caused a 400 response during later agent iterations.

Inspect:

```text
src/model/gemini.ts
tests/model/gemini.test.ts
```

Preserve the required metadata when replaying conversation parts.

Do not strip provider metadata during normalisation if the SDK requires it.

### Environment files

The tracked `.env.example` must contain placeholders only.

Actual `.env` files must remain untracked.

Inspect `.gitignore` before adding environment-file patterns. Ensure `.env.example` remains included.

### Mobile development

Next.js 16 may enforce development-origin restrictions.

The project uses `NEXT_ALLOWED_DEV_ORIGINS` for authorised local development origins where required.

Do not hardcode machine-specific LAN IP addresses in application configuration.

Production remote-access behaviour must continue to follow the project's explicit security configuration.

---

## 13. Frontend Design Preservation

The existing WDMWD interface is approved.

Do not redesign it as part of backend or infrastructure changes.

Preserve:

- Dark, minimal visual identity.
- Telegram-style conversational experience.
- Space Grotesk and Inter typography.
- Blue and lime accents.
- Existing spacing and visual hierarchy.
- Rounded surfaces and subtle borders.
- Floating history and settings controls.
- Streaming response presentation.
- Collapsible investigation activity.
- Collapsible evidence sources.
- Mobile responsiveness.

Frontend changes are permitted when required to fix bugs, integrate functionality, improve accessibility, or maintain correctness.

They must remain consistent with the existing design.

Do not introduce dashboards, permanent sidebars, unnecessary cards, or unrelated interface elements.

---

## 14. Security and Read-Only Behaviour

WDMWD is a read-only investigation application.

Do not introduce:

- Wallet signing.
- Private-key collection.
- Seed phrase collection.
- Transaction broadcasting.
- Unrequested wallet connection flows.
- Automatic asset transfers.
- Trading or execution functionality.

Never commit credentials.

Validate external input.

Avoid exposing stack traces, private configuration, or provider secrets.

Preserve the default localhost-only access restrictions.

Do not weaken CORS, host validation, rate limits, or remote-access safeguards to make local development easier.

---

## 15. Testing Requirements

Run relevant tests after every meaningful change.

Standard validation:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Do not assume the test count is fixed. Report the actual results from the current test run.

### Live tests

Live tests are opt-in and interact with Base Mainnet.

PowerShell:

```powershell
$env:LIVE_TESTS="1"
npm test
```

Bash:

```bash
LIVE_TESTS=1 npm test
```

A valid `ALCHEMY_API_KEY` is required for the relevant live tests.

Do not run live tests unnecessarily.

Never report skipped tests as passing.

### Testing principles

- Do not weaken tests to make a build pass.
- Do not delete meaningful coverage.
- Test both success and failure paths.
- Test exact amount handling.
- Test evidence classification.
- Test streaming and cancellation.
- Test persistence and deletion.
- Test provider error handling.

If a test fails after a change, determine whether the implementation or the test contract is incorrect. Do not modify both merely to hide a regression.

---

## 16. Documentation

Documentation must describe the actual implementation.

Before making significant changes, read the relevant documentation:

- `README.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/evidence.md`
- `docs/deployment.md`
- `docs/testing.md`
- `NOTICE.md`
- `THIRD_PARTY_NOTICES.md`, if present
- `CONTRIBUTING.md`

Not every file will exist in every revision. Inspect the actual repository.

When implementation changes affect documented behaviour, update the relevant documentation in the same change.

Do not document planned features as implemented.

Do not invent API fields, environment variables, commands, or deployment capabilities.

---

## 17. What Not to Do

- Do not split the unified application into separate services without approval.
- Do not introduce unnecessary infrastructure.
- Do not add mock blockchain data to production paths.
- Do not fabricate evidence or investigation results.
- Do not use floating-point arithmetic for token amounts.
- Do not expose hidden model reasoning.
- Do not introduce signing or transaction-broadcasting functionality.
- Do not commit secrets.
- Do not weaken security restrictions.
- Do not change the AGPL-3.0-only licence.
- Do not modify the official `LICENSE` text.
- Do not remove SPDX identifiers.
- Do not redesign the approved frontend.
- Do not remove meaningful tests.
- Do not claim unverified functionality is complete.

---

## 18. Read Before Larger Changes

| Area | Read first |
|---|---|
| Architecture | `docs/architecture.md` |
| API and SSE | `docs/api.md` |
| Evidence | `docs/evidence.md` |
| Deployment | `docs/deployment.md` |
| Testing | `docs/testing.md` |
| Licensing | `LICENSE`, `NOTICE.md`, and `THIRD_PARTY_NOTICES.md` |
| Contributions | `CONTRIBUTING.md` |
| Security | `SECURITY.md` |

If a referenced file does not exist, inspect the repository and identify the current authoritative source rather than assuming its contents.

---

## 19. Definition of Done

A change is complete when:

1. It solves the intended problem.
2. It follows the existing architecture.
3. It preserves data integrity.
4. It respects security boundaries.
5. It has appropriate test coverage.
6. Relevant tests pass.
7. TypeScript and production builds remain valid.
8. Documentation is updated where necessary.
9. No unrelated user changes have been lost.
10. Any remaining limitations are clearly reported.

Prefer small, verifiable changes over broad rewrites.

**Keep WDMWD accurate, maintainable, evidence-driven, and easy to self-host.**