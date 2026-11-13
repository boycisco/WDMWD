# API Reference

WDMWD exposes its API from the same origin as the Next.js frontend. The documented local base URL is `http://127.0.0.1:3000`.

All request and response examples below are JSON unless an endpoint explicitly streams Server-Sent Events (SSE). Examples are illustrative; identifiers, timestamps, and onchain values will differ at runtime.

## Health

### `GET /api/health`

Returns application and subsystem status. The endpoint does not return API keys; configuration is represented by boolean `*Configured` fields.

Example response shape:

```json
{
  "status": "ok",
  "checks": {
    "application": { "status": "ok" },
    "database": { "status": "ok" },
    "blockchain": {
      "status": "ok",
      "blockNumber": 53537741,
      "chainId": 8453,
      "latencyMs": 339
    },
    "ai": { "status": "ok", "provider": "gemini" },
    "indexer": { "status": "ok" }
  },
  "chainId": 8453,
  "chainName": "Base",
  "blockNumber": 53537741,
  "timestamp": "2026-11-05T12:00:00.000Z",
  "version": "0.1.0",
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
  }
}
```

The overall `status` is `ok` when the database and blockchain checks pass; otherwise it is `degraded`. Individual subsystem checks can report `ok`, `error`, or `not_configured`. The endpoint returns HTTP 200 for a health payload, including a degraded payload, so clients must inspect `status` and `checks`.

Configuration output must not contain secret values. It may indicate whether a credential is configured.

## Chat

### `POST /api/chat`

Submits a message and streams the agent's response using SSE.

Request:

```json
{
  "message": "Investigate wallet 0x4200000000000000000000000000000000000010",
  "sessionId": "optional-uuid-to-continue",
  "chainId": 8453
}
```

Fields:

| Field | Required | Description |
|---|---|---|
| `message` | Yes | User message, 1–10,000 characters. |
| `sessionId` | No | Existing session UUID. Omit to start a new conversation. |
| `chainId` | No | Chain identifier. Defaults to `8453` (Base Mainnet). |

The request body limit is 64 KB. An oversized body returns HTTP 413.

Successful responses use `Content-Type: text/event-stream`. Each SSE frame contains an `event` name and JSON `data` payload.

### SSE event types

| Event | Data shape | Meaning |
|---|---|---|
| `message.start` | `{"id":"uuid","sessionId":"uuid","role":"assistant","createdAt":"ISO8601"}` | The response stream has opened; IDs match the persisted assistant message. |
| `investigation.start` | `{"title":"Investigating","steps":[]}` | Investigation begins. Emitted only on iteration 1. |
| `tool.start` | `{"tool":"wallet","input":{...}}` | A registered investigation tool is starting. |
| `tool.result` | `{"tool":"wallet","success":true,"summary":"...","output":{...}}` | A tool has returned its result. |
| `evidence` | `{"evidence":{"id":"ev_...","classification":"confirmed","title":"ETH Transfer","txHash":"0x...","address":"0x...","blockNumber":1234,"timestamp":"ISO8601","assetMovement":"+1.5 ETH","source":"alchemy:8453","explorerLink":"https://basescan.org/tx/0x..."}}` | Emitted once per evidence item produced by a tool. Fields may be omitted when not applicable. |
| `message.delta` | `{"content":"text chunk"}` | Incremental user-facing answer text. |
| `message.complete` | `{"id":"uuid","content":"full text","status":"complete","sessionId":"uuid"}` | Completed answer; `id` matches the persisted assistant message. |
| `error` | `{"code":"LIMIT_EXCEEDED","message":"..."}` | A stream-time error. The stream then terminates. |
| `done` | `{"sessionId":"uuid","completedAt":"ISO8601"}` | Clean stream termination; documented as the final event. |

The stream exposes user-facing progress, registered tool activity, evidence references, and answer text. It is not a channel for private model chain-of-thought.

### Example client

This example handles partial network chunks, CRLF line endings, multiple `data:` lines, and incomplete final buffers. Production clients should also handle cancellation and network errors.

```javascript
async function streamChat(message, sessionId) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId, chainId: 8453 }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function dispatch(block) {
    if (!block.trim()) return;

    let event = "message";
    const data = [];

    for (const line of block.split("\n")) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }

    if (data.length === 0) return;
    const payload = JSON.parse(data.join("\n"));
    handleWdmwdEvent(event, payload);
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) dispatch(block);
  }

  buffer += decoder.decode().replace(/\r\n/g, "\n");
  if (buffer.trim()) dispatch(buffer);
}
```

`handleWdmwdEvent` is application-specific and should update the UI based on the received event. Do not treat an untrusted tool result as trusted HTML.

### Non-streaming request errors

| HTTP status | Meaning |
|---|---|
| `400` | Invalid JSON, missing/invalid message, invalid session identifier, or another validation error. |
| `404` | Requested session does not exist. |
| `413` | Request body exceeds the configured size limit. |
| `500` | Unexpected server-side failure. Client messages should remain user-safe. |

Errors that occur after the SSE response has started are delivered as an `error` event rather than a new HTTP response.

## Conversation history

### `GET /api/chat`

Without `sessionId`, lists recent sessions. The documented `limit` query parameter defaults to 50 and has a maximum of 500.

Example response shape:

```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "title": "Wallet investigation",
      "createdAt": "2026-11-13T13:18:33.000Z",
      "updatedAt": "2026-11-13T13:18:45.006Z",
      "messageCount": 2,
      "lastMessageSnippet": "Here is what the available evidence shows..."
    }
  ]
}
```

With `?sessionId=<uuid>`, retrieves the session and its messages:

```json
{
  "session": {
    "id": "session-uuid",
    "title": "Wallet investigation",
    "createdAt": "2026-11-13T13:18:33.000Z",
    "updatedAt": "2026-11-13T13:18:45.006Z",
    "messageCount": 2,
    "lastMessageSnippet": "Here is what the available evidence shows..."
  },
  "messages": [
    {
      "id": "message-uuid",
      "role": "user",
      "content": "What happened to this wallet?",
      "createdAt": "2026-11-13T13:18:33.000Z"
    },
    {
      "id": "message-uuid-2",
      "role": "assistant",
      "content": "Here is what the available evidence shows...",
      "createdAt": "2026-11-13T13:18:45.000Z"
    }
  ]
}
```

Query parameters:

| Parameter | Default | Description |
|---|---:|---|
| `sessionId` | None | When present, retrieves the matching session. |
| `limit` | `50` | Maximum number of recent sessions to return; maximum `500`. |

Errors: HTTP 400 for invalid query parameters and 404 when the requested session does not exist.

### `DELETE /api/chat?sessionId=<uuid>`

Deletes the specified session and dependent conversation records.

Success response:

```json
{ "deleted": true }
```

Errors: HTTP 400 when `sessionId` is missing or invalid; HTTP 404 when the session does not exist. Database cascade rules remove dependent records configured for cascading deletion.

## Wallet investigation

### `GET /api/wallet/[address]`

Runs the deterministic wallet investigation directly, without invoking the AI chat agent.

Example:

```text
GET /api/wallet/0x4200000000000000000000000000000000000010?chainId=8453&limit=50
```

Query parameters:

| Parameter | Default | Maximum | Description |
|---|---:|---:|---|
| `chainId` | `8453` | — | Chain identifier. Base Mainnet is `8453`. |
| `limit` | `100` | `500` | Requested activity limit. |

The response is transformed for frontend consumption:

- `profile`: `{ address, balance, txCount, firstSeen?, lastSeen? }` — a display-oriented summary. `balance` is a formatted decimal string (e.g. `"1.5"` for 1.5 ETH). `txCount` is the total of incoming + outgoing transfers in the investigated window.
- `findings`: entries with `id`, `title`, `description`, `severity`, `classification`. Note that `description` replaces the internal finding's `explanation` field, and `severity` is currently always `"info"`.
- `evidence`: frontend-friendly evidence items with `id`, `classification`, and, where available, `title`, `txHash`, `address`, `blockNumber`, `timestamp`, `assetMovement`, `source`, `explorerLink`.
- `limitations`: top-level array of coverage/caveat strings collected from the underlying findings.

```json
{
  "profile": {
    "address": "0x4200000000000000000000000000000000000010",
    "balance": "136.8746",
    "txCount": 200,
    "firstSeen": "2023-07-11T23:11:37.000Z",
    "lastSeen": "2024-03-31T16:24:19.000Z"
  },
  "findings": [
    {
      "id": "f_summary",
      "title": "Wallet activity summary",
      "description": "In the observed window, this wallet has 100 incoming and 100 outgoing transfers...",
      "severity": "info",
      "classification": "confirmed"
    }
  ],
  "evidence": [
    {
      "id": "ev_858e5341195132fb",
      "classification": "confirmed",
      "title": "ETH Transfer",
      "txHash": "0x7474ce2d947a981cb0cd7fe9d3c9ec6e59c7ef4de479608bc9e13b6e48cef60a",
      "address": "0xa16b60af75df4b8f40f36cd5af35c3b7c3629985",
      "blockNumber": 1163875,
      "timestamp": "2023-07-11T23:11:37.000Z",
      "assetMovement": "+0.1234567890123457 ETH",
      "source": "alchemy:8453",
      "explorerLink": "https://basescan.org/tx/0x7474ce2d947a981cb0cd7fe9d3c9ec6e59c7ef4de479608bc9e13b6e48cef60a"
    }
  ],
  "limitations": [
    "Only the most recent window per direction is indexed",
    "Internal native transfers between contracts are excluded"
  ]
}
```

Invalid addresses or query parameters return HTTP 400. Unsupported chains also return HTTP 400.

## Settings

### `GET /api/settings`

Returns current subsystem status plus persisted UI preferences. Never exposes API keys or secret values.

Example response shape:

```json
{
  "status": "ok",
  "chainId": 8453,
  "chainName": "Base Mainnet",
  "currentBlock": 56951431,
  "aiProvider": "gemini",
  "blockchainProvider": "Base RPC",
  "databaseStatus": "ok",
  "environment": "production",
  "providerIndicators": {
    "rpcConnected": true,
    "aiConnected": true,
    "indexerConnected": true
  },
  "config": {
    "streamResponses": true,
    "autoExpandActivity": false,
    "network": "mainnet"
  }
}
```

status is "ok" when the database and blockchain probes pass; otherwise "degraded". currentBlock is a number (not a string). environment mirrors the resolved NODE_ENV.

### `PATCH /api/settings`
Updates supported UI preferences and persists them in SQLite. Only the fields below are accepted; any other field is rejected with 400 VALIDATION_ERROR. Provider credentials cannot be changed through this endpoint.

Request fields (all optional, all booleans unless noted):

Field	| Type | Description
|---|---:|---:|
streamResponses	| boolean	| Whether the UI should stream model output token-by-token.
autoExpandActivity | boolean | Whether investigation activity is expanded by default.
network |	string |	Persisted network label. Not validated against the chain registry.

Example request body:

```json
{
  "streamResponses": true,
  "autoExpandActivity": false
}
```

The response is the same shape as GET /api/settings, reflecting the updated state.

## Common error shape

Non-streaming API errors use this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-safe explanation"
  }
}
```

Known error codes:

- `VALIDATION_ERROR`
- `UNSUPPORTED`
- `NOT_FOUND`
- `PAYLOAD_TOO_LARGE`
- `RPC_ERROR`
- `INDEXER_ERROR`
- `AI_ERROR`
- `LIMIT_EXCEEDED`
- `CONFIG_ERROR`
- `INTERNAL`

Error messages should not expose stack traces, API keys, or provider credentials.
