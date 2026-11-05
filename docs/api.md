# API Reference

All endpoints are JSON-over-HTTP. The chat endpoint streams Server-Sent Events (SSE).

Base URL: `http://127.0.0.1:3000` (default local bind)

---

## `GET /api/health`

Non-authenticated status endpoint. Safe to call frequently (rate-limited per provider config).

**Response (200):**

```json
{
  "status": "ok",
  "checks": {
    "application": { "status": "ok" },
    "database": { "status": "ok" },
    "blockchain": {
      "status": "ok",
      "blockNumber": "53537741",
      "chainId": 8453
    },
    "ai": { "status": "ok" }
  },
  "config": {
    "env": "development",
    "server": { "port": 3000, "host": "127.0.0.1", "remote": false },
    "database": { "url": "file:./data/wdmwd.db" },
    "chain": { "alchemyApiKeyConfigured": true },
    "ai": {
      "provider": "gemini",
      "openaiApiKeyConfigured": false,
      "openaiModel": "gpt-4o-mini",
      "geminiApiKeyConfigured": true,
      "geminiModel": "gemini-3.6-flash"
    },
    "limits": {
      "maxToolCalls": 8,
      "maxAgentIterations": 6,
      "maxTraceDepth": 5,
      "requestTimeoutMs": 60000
    }
  },
  "timestamp": "2026-11-05T12:00:00.000Z"
}
```

`status` is `"ok"` only when database and blockchain checks pass. Otherwise `"degraded"`.

Individual subsystem statuses are `"ok"`, `"error"`, or `"not_configured"`.

Never returns API keys — only `*Configured: true/false` flags.

Status codes: `200` always (even when degraded — the payload differentiates).

## `POST /api/chat`

Submit a user message. Streams agent response as SSE.

Request:

```json
{
  "message": "Investigate wallet 0x4200000000000000000000000000000000000010",
  "sessionId": "optional-uuid-to-continue",
  "chainId": 8453
}
```

`message` (required): 1–10,000 characters.

`sessionId` (optional): omit to start a new conversation; include to continue.

`chainId` (optional): defaults to 8453 (Base mainnet).

Body size limit: 64 KB. Larger → 413.

Response: `Content-Type: text/event-stream`

SSE event types:

| Event | Data shape | Meaning |
| --- | --- | --- |
| `message.start` | `{"timestamp":"ISO8601"}` | Stream opened |
| `investigation.start` | `{"iteration": 1}` | Model turn starting (1-based) |
| `tool.start` | `{"name":"wallet","args":{...}}` | Tool invocation beginning |
| `tool.result` | `{"name":"wallet","result":{"ok":true,...}}` | Tool finished |
| `evidence` | `{"source":"wallet","evidenceIds":["ev_..."]}` | Evidence IDs produced by the tool |
| `message.delta` | `{"delta":"text chunk"}` | Incremental text from the model |
| `message.complete` | `{"content":"full text"}` | Final text (also accumulated from deltas) |
| `error` | `{"message":"...","recoverable":false}` | Terminal error — stream will end |
| `done` | `{"sessionId":"uuid"}` | Clean termination. Always the last event |

Client example (JavaScript):

```javascript
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Investigate 0x4200..." }),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\n\n");
  buffer = events.pop();
  for (const block of events) {
    const [eventLine, dataLine] = block.split("\n");
    const type = eventLine.replace("event: ", "");
    const data = JSON.parse(dataLine.replace("data: ", ""));
    console.log(type, data);
  }
}
```

Error responses (non-streaming, HTTP status shown):

| Status | When |
| --- | --- |
| `400` | Invalid JSON, missing message, message too long, invalid `sessionId` format |
| `404` | `sessionId` does not exist |
| `413` | Body exceeds 64 KB |
| `500` | Unexpected server error (message not user-supplied) |

Stream-time errors (after headers sent) come as `event: error` instead.

## `GET /api/chat`

Without `sessionId`: list recent sessions.

```json
{ "sessions": [ { "id": "uuid", "title": "...", "createdAt": 0, "updatedAt": 0 } ] }
```

With `?sessionId=uuid`: fetch session + messages.

```json
{
  "session": { "id": "uuid", "title": "...", "createdAt": 0, "updatedAt": 0 },
  "messages": [
    { "id": "uuid", "role": "user", "content": "...", "createdAt": 0 },
    { "id": "uuid", "role": "assistant", "content": "...", "createdAt": 0 }
  ]
}
```

Query params: `limit` (default 50, max 500).

Errors: `400` invalid query, `404` session not found.

## `DELETE /api/chat?sessionId=uuid`

Delete a session and all its messages.

Response: `{ "deleted": true }`

Errors: `400` missing `sessionId`, `404` session not found.

Deletion cascades to messages and investigations via SQL foreign keys — no manual cleanup needed.

## `GET /api/wallet/[address]`

Deterministic wallet investigation — no AI involved.

Example: `GET /api/wallet/0x4200000000000000000000000000000000000010?limit=50`

Response: the `WalletInvestigation` structure — see `src/wallet/investigate.ts`. Contains:

- `profile` — transfer counts, counterparties, contracts, block range, totals by symbol
- `findings` — array of `{ id, title, explanation, classification, evidenceIds, limitations }`
- `evidence` — array of `{ id, chainId, type, classification, transactionHash, blockNumber, blockTimestamp, addresses, contractAddress, data, source, retrievedAt }`

Query params: `chainId` (default 8453), `limit` (default 100, max 500).

Errors: `400` invalid address or params, `400` unsupported chain.

## Common error shape

Every non-streaming error response is:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "user-safe text" } }
```

Known codes: `VALIDATION_ERROR`, `UNSUPPORTED`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `RPC_ERROR`, `INDEXER_ERROR`, `AI_ERROR`, `LIMIT_EXCEEDED`, `CONFIG_ERROR`, `INTERNAL`.

Messages never contain stack traces, API keys, or provider-specific internals.