// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Shared types used across WDMWD modules.
 *
 * Keep this file dependency-free. Anything that imports from here
 * (wallet, transaction, agent, evidence) should never pull in a
 * provider SDK, an ORM, or any runtime that bloats the bundle.
 */

// ─── Chains ─────────────────────────────────────────────────────

/**
 * Numeric EVM chain ID.
 * Base Mainnet is `8453` — see `src/chain/registry.ts` for the
 * authoritative list of chains WDMWD currently supports.
 */
export type ChainId = number;

// ─── Addresses & hashes ─────────────────────────────────────────

/** A 20-byte hex address, e.g. "0xabc...". Always lowercase. */
export type Address = `0x${string}`;

/** A 32-byte transaction hash, e.g. "0x123...". Always lowercase. */
export type TxHash = `0x${string}`;

// ─── Evidence ───────────────────────────────────────────────────

/**
 * How confident we are in a finding, per spec §6.11:
 *  - confirmed: directly supported by observable onchain data.
 *  - inferred:  a reasonable interpretation supported by evidence.
 *  - unknown:   the data does not establish a reliable answer.
 */
export type Classification = "confirmed" | "inferred" | "unknown";

// ─── Findings ───────────────────────────────────────────────────

/**
 * A single intelligence output. Produced by wallet/transaction/trace/
 * relation/pattern modules, consumed by the agent when composing a
 * final answer.
 *
 * Every finding MUST reference at least one evidence ID.
 */
export interface Finding {
  id: string;
  title: string;
  explanation: string;
  classification: Classification;
  evidenceIds: string[];
  limitations?: string[];
}

// ─── Transfers ──────────────────────────────────────────────────

/** Categories that map to Alchemy's `alchemy_getAssetTransfers` categories. */
export type TransferCategory = "external" | "erc20" | "erc721" | "erc1155";

/**
 * Exact token amount.
 *
 * `raw` is a decimal string of the integer amount — e.g. 1.5 ETH is
 * "1500000000000000000". We deliberately use strings, not numbers:
 * `number` cannot represent values above 2^53 exactly, and any float
 * arithmetic silently corrupts financial amounts (spec §7.3).
 *
 * Consumers that need to do arithmetic must use `BigInt(raw)`.
 * `formatted` is the human-readable form for assistant output.
 */
export interface TokenAmount {
  raw: string;
  formatted: string;
  decimals: number;
  symbol?: string;
  name?: string;
}

/**
 * A normalized transfer, direction-agnostic at the transport layer.
 *
 * `direction` is set by the consumer (wallet/activity) relative to the
 * address being investigated. The Alchemy adapter itself cannot know
 * which side of the transfer is "ours" — that depends on the caller.
 */
export interface Transfer {
  chainId: ChainId;
  hash: TxHash;
  blockNumber: number;
  blockTimestamp: string;
  from: Address;
  to: Address;
  category: TransferCategory;
  contractAddress?: Address;
  tokenId?: string;
  amount: TokenAmount;
  direction: "in" | "out";
}