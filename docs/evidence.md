# Evidence

Evidence is the atom of verifiable truth. Every factual claim in a finding must be traceable to at least one evidence entry.

---

## Structure

```typescript
interface Evidence {
  id: string;                  // "ev_" + sha256(content)[0:16]
  chainId: number;             // 8453 for Base
  type: "transfer" | "receipt" | "block" | "balance" | "log" | "metadata";
  classification: "confirmed" | "inferred" | "unknown";
  transactionHash?: string;
  blockNumber?: number;
  blockTimestamp?: string;
  addresses?: string[];
  contractAddress?: string;
  data: Record<string, unknown>;  // type-specific
  source: string;                  // "alchemy:8453" or "rpc:8453"
  retrievedAt: string;             // ISO timestamp
  investigationId?: string;
}
```

### IDs are content-derived

The id is `sha256(key).slice(0, 16)` where `key` is a canonical string of the identifying fields. For transfers, the key is:

```text
chainId:hash:from:to:category:contractAddress:amountRaw:tokenId
```

Consequences:

- Same transfer observed twice (e.g., two `getAssetTransfers` calls) gets the same ID → automatic deduplication.
- Different transfers never collide (assuming no two distinct transfers share all those fields — extremely unlikely, but see below).
- Evidence IDs are stable across requests and providers (as long as the underlying blockchain data is the same).

Known limitation: two distinct transfers in the same transaction with identical `(from, to, category, contractAddress, amountRaw, tokenId)` produce the same evidence ID. Alchemy doesn't provide a per-transfer log index, so we can't disambiguate. In practice this is rare (identical transfers in a single tx are unusual). If it becomes a problem, add an index-based counter to the key.

## Classifications

Three values, per spec §6.11:

- `confirmed` — directly observable in retrieved blockchain data. Example: "This wallet has 100 incoming transfers."
- `inferred` — a reasonable interpretation of confirmed data. Example: "This address appears to be a bridge contract." (The bridge claim requires trust in our heuristic about `0x4200...` addresses; the contract-is-not-a-wallet claim is confirmed.)
- `unknown` — the data does not establish a reliable answer. Example: "The specific token amounts in these event logs are not decoded."

Every finding has a classification. Coverage findings (e.g. `f_coverage`, `f_tx_coverage`) are always unknown and carry explicit limitations. They exist to be honest about what we don't know.

## Evidence → Findings

`Finding.evidenceIds` references evidence by ID. The `investigate*` modules assert this at construction time — a finding without evidence (other than coverage) throws during tests.

`tests/wallet/investigate.test.ts` → "every non-coverage finding references at least one evidence ID" enforces this. If you add a new investigation module, add an equivalent test.

## What V1 does NOT do

Being explicit about the gaps:

- No log parameter decoding. A transaction with 4 event logs reports "4 logs, 1 matches ERC-20 Transfer topic" but cannot say which token, how much, to whom. This requires ABI decoding, which is future work.
- No internal transaction tracing. Contract-mediated native ETH transfers (e.g., a contract sending ETH to a user) do not appear as separate transfers in the receipt logs. They're invisible to our current adapter.
- No cross-transaction tracing. "Where did these funds originally come from?" requires walking through multiple transactions. This is spec §6.8 (trace module), not implemented in V1.
- No token metadata verification. Symbols and names come from the indexer. We treat them as untrusted — a malicious token can claim symbol: "USDC". The canonical identifier is the contract address.

## Why this matters for the frontend

When the frontend displays a finding, it should:

- Show the classification prominently (green/amber/grey for confirmed/inferred/unknown).
- Link evidence IDs to transaction hashes and block numbers — the user can verify on `basescan.org`.
- Never upgrade an inference into a fact in the UI. If the model says "likely a bridge", the UI shouldn't say "is a bridge".

The evidence structure is designed exactly for this — every fact has a citation you can click.