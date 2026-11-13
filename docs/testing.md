# Testing

WDMWD uses Vitest for unit tests and mocked integration tests. The project report supplied for this documentation recorded **143 passing tests and 4 opt-in live tests skipped by default**. This is a historical reported count, not a promise that the current checkout has the same number of tests. The output of the current run is authoritative.

## Default test suite

Run:

```bash
npm test
```

The default suite is intended to run without live blockchain or AI-provider calls. It covers unit behaviour and mocked integration paths.

## Coverage

Run:

```bash
npm run test:coverage
```

Review the generated report for uncovered critical paths. Coverage percentage alone does not establish correctness.

## Live tests

The project includes opt-in live tests that query Base Mainnet and Alchemy. They require valid provider configuration and network access.

macOS / Linux:

```bash
LIVE_TESTS=1 npm test
```

Windows PowerShell:

```powershell
$env:LIVE_TESTS = "1"
npm test
Remove-Item Env:LIVE_TESTS
```

Do not count skipped live tests as passing tests. Report them separately from unit and mocked integration tests.

## Additional checks

Run the repository's configured quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Run a Docker build when validating a deployment change:

```bash
docker compose build
```

Use only scripts that exist in the current `package.json`. If a script is absent in a checkout, do not silently substitute a different command; update this document to match the actual script configuration.

## Important test areas

The test suite should protect the following behaviours:

- Exact amount formatting and `BigInt` conversions.
- Zod input validation and request limits.
- Agent tool registration and execution limits.
- SSE event mapping and stream termination.
- Context resolution across conversation turns.
- Drizzle schema and cascade behaviour.
- Model-provider request and response handling.
- Error handling for missing configuration and provider failures.

The project report also identified tests for model-provider request replay behaviour, including Gemini `thoughtSignature` handling.

## Manual release checks

Before a public release, verify the application beyond unit tests:

1. Start from a clean local installation.
2. Check `GET /api/health` and inspect the returned subsystem states.
3. Investigate a valid Base wallet.
4. Inspect a valid Base transaction.
5. Send a follow-up question that relies on earlier conversation context.
6. Confirm that SSE events arrive and terminate cleanly.
7. Open and restore a saved conversation.
8. Change the supported UI settings and reload them.
9. Restart the application and confirm SQLite persistence.
10. Build and run the Docker deployment using a disposable volume.
11. Confirm the default local-only access behaviour.
12. Check the interface at desktop and mobile viewport sizes.

Record the command, environment, result, and any skipped or blocked test. Never describe a test as passed if it was not executed.
