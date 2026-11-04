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