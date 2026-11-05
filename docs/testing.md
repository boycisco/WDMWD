# Testing

WDMWD uses Vitest. The suite has two modes: fast (default, no network) and live (opt-in, hits real providers).

---

## Running

```bash
npm test                          # default — 134 passed, 4 skipped, ~3s
npm run test:watch                # interactive rerun on file change
npm run test:coverage             # coverage report
```

### Live tests

```bash
$env:LIVE_TESTS="1"; npm test; Remove-Item Env:LIVE_TESTS   # Windows
LIVE_TESTS=1 npm test                                        # macOS/Linux
```

Live tests hit Base mainnet and Alchemy. They require `ALCHEMY_API_KEY` in `.env`. Do not run them on paid API keys without intending to — they consume a small amount of quota.

Do not mock providers in live tests. The whole point is verifying our adapters work against real responses.

## Test layout

`tests/` mirrors `src/`:

| Path | What |
| --- | --- |
| `tests/config/` | Config validation, secret redaction |
| `tests/store/` | SQLite schema, cascade delete, JSON round-trip |
| `tests/chain/` | Registry lookups |
| `tests/data/` | RPC and Alchemy adapters (mocked + live) |
| `tests/wallet/` | Address validation, activity retrieval, profile, investigation |
| `tests/transaction/` | Transaction investigation |
| `tests/evidence/` | Evidence ID determinism, deduplication |
| `tests/chat/` | Persistence, context extraction, SSE formatting |
| `tests/model/` | Gemini adapter, thoughtSignature replay |
| `tests/agent/` | Loop limits, tool execution, error recovery |
| `tests/api/` | HTTP endpoint integration (mocked) |

## Conventions

Unit tests mock at the boundary, not inside the module. For example:

- The RPC adapter test uses Viem's `custom()` transport, not `vi.mock("viem")`. The adapter code runs; only the wire transport is stubbed.
- The Gemini adapter test passes a mock `GoogleGenAI` client to `createGeminiModel({ client })`. The adapter's translation logic runs against the mock's chunks.
- The chat route test mocks `@/agent/agent` and `@/chat/chat`. The route's validation and SSE formatting run for real.

Never `vi.doMock + vi.doUnmock`. These have subtle state-leak bugs across tests. Use `vi.mocked(fn).mockImplementationOnce(...)` for one-shot overrides; use `vi.mocked(fn).mockImplementation(...)` inside `beforeEach` for defaults. This is enforced by convention in the codebase; the tools test rewrote to avoid `doMock` after it caused intermittent failures.

Use the temp directory for DB tests. The pattern:

```typescript
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wdmwd-test-"));
  db = createDb(join(tmpDir, "test.db"));
  migrate(db, { migrationsFolder: "./drizzle" });
});
afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
```

`maxRetries + retryDelay` handle the Windows `EPERM` race where the OS hasn't released the file handle yet. `db.close()` is called before `rmSync` for the same reason. On Linux this would work without retries; on Windows it fails ~30% of the time without them.

## What we don't test

- Third-party SDK internals. We don't test that Viem parses a transaction correctly — that's Viem's responsibility. We test that our adapter uses Viem's result correctly.
- Base RPC availability. The default `mainnet.base.org` is allowed to be down. Live tests will fail in that case; unit tests won't.
- LLM behaviour. We don't assert "Gemini will say X". We assert "the agent loop emits the correct events regardless of what the model returns". Model selection quality (does Gemini pick wallet for addresses?) is verified by the human-run smoke test at the end of each session, not by automated tests — a decision made because LLM output is non-deterministic and testing it flakes.

## Coverage

Coverage is a signal, not a goal. The high-value lines to cover:

- Every Zod schema has at least one valid and one invalid input test.
- Every error path in `src/data/` produces the expected typed error.
- Every API route returns the correct status code for its documented error cases.
- Every investigation module has a "coverage finding exists and is classified as unknown" test.

Untested code is usually fast to identify: if a branch handles a real user scenario and no test exercises it, that's a gap. If it handles a provider quirk that upstream might fix, it's often acceptable to skip.

## Adding a test

For a new module `src/foo/bar.ts`:

1. Create `tests/foo/bar.test.ts`.
2. Test the happy path with realistic data.
3. Test the primary failure mode (invalid input, provider error).
4. If the module produces `Finding[]`, test that non-coverage findings reference evidence.
5. If the module talks to a provider, inject a mock client (see `createGeminiModel({ client })` pattern) rather than mocking the provider module.

## Build verification

The final gate before merging any PR:

```bash
npm run typecheck    # zero errors
npm run lint         # zero warnings
npm test             # 134 passed, 4 skipped
npm run build        # production build succeeds
```

If build fails but dev works, the cause is almost always: a dynamic/runtime route config that conflicts with Next.js 16's Cache Components, a missing dependency in the standalone output, or a type that's only reachable during production compilation.