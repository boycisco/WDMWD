// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Chain definition shape.
 *
 * Deliberately minimal: only fields that intelligence modules actually
 * need (display name, RPC fallback, block explorer URL, native currency
 * for human-readable amounts). Anything else (Viem chain objects,
 * provider-specific metadata) belongs in the adapter that uses it.
 */

export interface Chain {
  /** EIP-155 chain ID. Base mainnet = 8453. */
  readonly id: number;
  /** Human-readable name for assistant output. */
  readonly name: string;
  /** Default public RPC endpoint (fallback if no env override). */
  readonly rpcUrl: string;
  /** Block explorer base URL, without trailing slash. */
  readonly explorerUrl: string;
  readonly nativeCurrency: {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
  };
}

/** Build an explorer URL for a transaction hash. */
export function txUrl(chain: Chain, hash: string): string {
  return `${chain.explorerUrl}/tx/${hash}`;
}

/** Build an explorer URL for an address. */
export function addressUrl(chain: Chain, address: string): string {
  return `${chain.explorerUrl}/address/${address}`;
}