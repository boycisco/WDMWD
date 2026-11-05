# Blockchain Integration

Base mainnet only in V1. Adding more EVM chains is a 20-line change.

---

## Chain registry

`src/chain/` defines:

- `Chain` interface — `{ id, name, rpcUrl, explorerUrl, nativeCurrency }`
- `base.ts` — the Base instance
- `registry.ts` — `getChain(chainId)`, `hasChain(chainId)`, `listChains()`

**Adding a chain:**

1. Create `src/chain/optimism.ts`:

```typescript
export const optimism: Chain = Object.freeze({
  id: 10,
  name: "Optimism",
  rpcUrl: "https://mainnet.optimism.io",
  explorerUrl: "https://optimistic.etherscan.io",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
});
```

2. Add one line in `src/chain/registry.ts`:

```typescript
[optimism.id, optimism],
```

If you need Alchemy for historical data, add an entry to `ALCHEMY_HOST_BY_CHAIN` in `src/data/alchemy.ts`.

Nothing else changes. Not the agent, not the investigation modules, not the tools. The registry is the entire surface.

## RPC adapter (`src/data/rpc.ts`)

Wraps Viem's `createPublicClient`. Exposes:

- `getBlockNumber()` — health check
- `getChainId()` — sanity check
- `getTransaction(hash)` — returns `Transaction | null`
- `getTransactionReceipt(hash)` — returns `TransactionReceipt | null`
- `getBytecode(address)` — for contract-vs-EOA classification

The adapter accepts an injectable `Transport` so tests can run without real network calls. Production uses `http(url, { timeout, retryCount, retryDelay })`.

Viem returns typed errors (`TransactionNotFoundError`) for missing records — the adapter converts those to `null` and lets anything else throw. This is a deliberate distinction: "not found" is a valid answer, "RPC timed out" is not.

RPC URL precedence:

1. `BASE_RPC_URL` env var (if set)
2. Chain's `rpcUrl` fallback (`https://mainnet.base.org`)

This lets a user set their own RPC endpoint without touching code.

## Alchemy adapter (`src/data/alchemy.ts`)

Uses `alchemy_getAssetTransfers` for historical wallet activity. This is not a standard JSON-RPC method — it lives in Alchemy's extended namespace. The adapter calls it via `fetch()` directly against `https://base-mainnet.g.alchemy.com/v2/<key>`.

Categories handled: `external` (native ETH), `erc20`, `erc721`, `erc1155`.

Pagination: loops until `pageKey` is exhausted or `MAX_PAGES=10` is hit. Cap at 1,000 transfers per call.

Provider response normalization: the adapter converts Alchemy's response into `RawTransfer[]` before returning. Callers never see `alchemy_getAssetTransfers` shapes.

## Exact amounts — the one rule that cannot be broken

Alchemy's `value` field is a JS number and is unsafe for financial amounts. The adapter ignores it entirely. Instead, it reads `rawContract.value` (hex string → bigint) and `rawContract.decimal` (hex string → number) and formats via integer division.

```typescript
// From src/data/alchemy.ts
const rawAmount = BigInt("0x" + clean);  // NEVER parseFloat
const formatted = formatAmount(rawAmount, decimals);  // string manipulation
```

The result is stored as `TokenAmount.raw` (decimal string, e.g. `"1500000000000000000"` for 1.5 ETH). Consumers doing math must `BigInt(raw)` — never `Number(raw)`.

This is tested (`tests/data/alchemy.test.ts` → "uses rawContract for exact ETH amount, ignores float value"). Don't relax it.

## Transaction investigation (`src/transaction/investigate.ts`)

Uses only `RpcClient` — no Alchemy needed. Fast and cheap.

Classifies the recipient as `contract` / `eoa` / `deployment` by calling `getBytecode` on the `to` address. Empty bytecode = EOA. Non-empty = contract. `to === null` = deployment.

Reports the top-level `tx.value` separately from receipt event logs. Never conflates them. A contract call that moves tokens internally will show `value: 0` at the top level but have `Transfer` events in the receipt — the user needs both to understand what happened.

Individual event log parameters (which token, how much, to whom) are not decoded in V1. That's future work — see `docs/evidence.md` for what that would look like.

## Provider failure handling

All errors from RPC/Alchemy become typed `RpcError` or `IndexerError`. The health endpoint catches these and reports `status: "error"` — it does not crash. The `/api/wallet/[address]` endpoint returns `502` with a user-safe message.

Rate limits: the public `mainnet.base.org` endpoint allows roughly 5–10 requests/sec. Alchemy free tier allows ~330 CU/sec. For production or heavy use, provide your own Alchemy project or a private RPC.

Base block time: ~2 seconds. If you're polling for "new activity since last check", you'll see updates quickly but consume quota quickly too. WDMWD doesn't poll — it queries on demand.