/**
 * Evidence — the atom of verifiable truth.
 *
 * Every factual claim in a finding must be backed by at least one
 * Evidence entry. Evidence is immutable once created; findings
 * reference it by ID but never mutate it.
 *
 * Classification (spec §6.11):
 *   - confirmed: directly observable in blockchain data
 *   - inferred:  reasonable interpretation of observable data
 *   - unknown:   data does not establish a reliable answer
 *
 * Evidence IDs are content-derived (sha256 of the identifying tuple)
 * so identical evidence always gets the same ID. This makes evidence
 * deduplication and cross-finding references trivially correct.
 */

import { createHash } from "node:crypto";
import type {
  Address,
  ChainId,
  Classification,
  Transfer,
  TxHash,
} from "@/core/types";

export type EvidenceType =
  | "transfer"
  | "receipt"
  | "block"
  | "balance"
  | "log"
  | "metadata";

export interface Evidence {
  /** Stable, content-derived ID (e.g. "ev_1a2b3c4d5e6f7890"). */
  id: string;
  chainId: ChainId;
  type: EvidenceType;
  classification: Classification;
  transactionHash?: TxHash;
  blockNumber?: number;
  blockTimestamp?: string;
  addresses?: Address[];
  contractAddress?: Address;
  /** Transfer/receipt/log details; shape depends on `type`. */
  data: Record<string, unknown>;
  /** Provenance tag, e.g. "alchemy:8453" or "rpc:8453". */
  source: string;
  /** ISO timestamp of when the evidence was retrieved. */
  retrievedAt: string;
  investigationId?: string;
}

/** Deterministic evidence ID from a canonical tuple. */
function evidenceId(key: string): string {
  const h = createHash("sha256").update(key).digest("hex").slice(0, 16);
  return `ev_${h}`;
}

/**
 * Build evidence for a single transfer observation.
 *
 * Note on ID collisions: two distinct transfers in the same tx with
 * identical (from, to, category, contract, amount) hash to the same
 * evidence ID. Alchemy does not return a per-transfer log index, so
 * we cannot disambiguate. In practice identical transfers in a single
 * tx are rare; if it becomes a problem, add a "transferIndex" counter.
 */
export function transferToEvidence(
  t: Transfer,
  retrievedAt: string = new Date().toISOString(),
): Evidence {
  const key = [
    t.chainId,
    t.hash,
    t.from,
    t.to,
    t.category,
    t.contractAddress ?? "",
    t.amount.raw,
    t.tokenId ?? "",
  ].join(":");
  return {
    id: evidenceId(key),
    chainId: t.chainId,
    type: "transfer",
    classification: "confirmed",
    transactionHash: t.hash,
    blockNumber: t.blockNumber,
    blockTimestamp: t.blockTimestamp,
    addresses: [t.from, t.to],
    contractAddress: t.contractAddress,
    data: {
      category: t.category,
      amountRaw: t.amount.raw,
      amountFormatted: t.amount.formatted,
      decimals: t.amount.decimals,
      symbol: t.amount.symbol,
      tokenId: t.tokenId,
      direction: t.direction,
    },
    source: `alchemy:${t.chainId}`,
    retrievedAt,
  };
}

/** Deduplicate evidence by ID, preserving first occurrence. */
export function dedupeEvidence(items: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const e of items) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out;
}

// ─── Transaction evidence ──────────────────────────────────────

export interface TransactionEvidenceInput {
  chainId: ChainId;
  hash: TxHash;
  blockNumber: number | null;
  blockTimestamp: string;
  from: Address;
  to: Address | null;
  status: "success" | "reverted" | "unknown";
  /** Already-formatted ETH value transferred. */
  valueFormatted: string;
  valueRaw: string;
  /** Fee paid in ETH, formatted. `null` if no receipt. */
  feeEth: string | null;
  gasUsed: string | null;
}

/**
 * Build evidence for a transaction investigation.
 *
 * Unlike the wallet case (one evidence per transfer — because there are
 * hundreds of transfers), a transaction investigation produces **one**
 * evidence entry. The transaction hash itself is the natural unit of
 * traceability: every claim about this tx cites the same hash.
 */
export function transactionToEvidence(
  t: TransactionEvidenceInput,
  retrievedAt: string = new Date().toISOString(),
): Evidence {
  const key = [
    "tx",
    t.chainId,
    t.hash,
    t.from,
    t.to ?? "null",
    t.status,
  ].join(":");
  return {
    id: evidenceId(key),
    chainId: t.chainId,
    type: "receipt",
    classification: t.status === "unknown" ? "unknown" : "confirmed",
    transactionHash: t.hash,
    blockNumber: t.blockNumber ?? undefined,
    blockTimestamp: t.blockTimestamp,
    addresses: t.to ? [t.from, t.to] : [t.from],
    data: {
      status: t.status,
      valueFormatted: t.valueFormatted,
      valueRaw: t.valueRaw,
      feeEth: t.feeEth,
      gasUsed: t.gasUsed,
    },
    source: `rpc:${t.chainId}`,
    retrievedAt,
  };
}