// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Wallet activity — orchestrates Alchemy adapter + normalization.
 *
 * This module knows about *both* sides of a transfer (in and out) and
 * produces `Transfer[]` where `direction` is set relative to the
 * queried wallet. It's what the future agent tool `wallet` will call.
 */

import { getAssetTransfers } from "@/data/alchemy";
import { normalizeAddress } from "./wallet";
import type { Address, ChainId, Transfer } from "@/core/types";

export interface WalletActivityOptions {
  chainId: ChainId;
  address: Address | string;
  /** Max transfers to fetch per direction. Default 100. */
  limitPerDirection?: number;
}

export interface WalletActivity {
  chainId: ChainId;
  address: Address;
  incoming: Transfer[];
  outgoing: Transfer[];
}

/**
 * Fetch a wallet's activity: incoming + outgoing transfers.
 *
 * Two Alchemy calls run in parallel (one per direction). Each is
 * bounded by `limitPerDirection`; the total returned cannot exceed
 * `2 * limitPerDirection`.
 *
 * Errors bubble up as `IndexerError` / `ValidationError` per spec §7.5.
 */
export async function getWalletActivity(
  opts: WalletActivityOptions,
): Promise<WalletActivity> {
  const address = normalizeAddress(opts.address);
  const limit = opts.limitPerDirection ?? 100;

  const [incoming, outgoing] = await Promise.all([
    getAssetTransfers({
      chainId: opts.chainId,
      address,
      toOnly: true,
      limit,
    }),
    getAssetTransfers({
      chainId: opts.chainId,
      address,
      fromOnly: true,
      limit,
    }),
  ]);

  return {
    chainId: opts.chainId,
    address,
    incoming: incoming.map((t) => ({ ...t, direction: "in" as const })),
    outgoing: outgoing.map((t) => ({ ...t, direction: "out" as const })),
  };
}