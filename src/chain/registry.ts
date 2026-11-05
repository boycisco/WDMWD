/**
 * Chain registry — lookup by chain ID.
 *
 * Adding a chain means:
 *   1. Create `src/chain/<name>.ts` with a Chain object.
 *   2. Add one entry to the `registry` map below.
 *
 * No intelligence module needs to change. That's the point of the
 * registry: chain set is data, not code paths.
 */

import { UnsupportedError } from "@/core/errors";
import type { Chain } from "./chain";
import { base } from "./base";

const registry: ReadonlyMap<number, Chain> = new Map<number, Chain>([
  [base.id, base],
]);

export function getChain(chainId: number): Chain {
  const chain = registry.get(chainId);
  if (!chain) {
    throw new UnsupportedError(
      `Unsupported chain ID: ${chainId}. Supported: ${[...registry.keys()].join(", ")}`,
    );
  }
  return chain;
}

export function hasChain(chainId: number): boolean {
  return registry.has(chainId);
}

export function listChains(): Chain[] {
  return [...registry.values()];
}

export { base };
export type { Chain };