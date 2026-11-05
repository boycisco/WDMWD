/**
 * RPC adapter — thin wrapper around Viem's public client.
 *
 * Why a wrapper?
 *   1. Centralizes timeout/retry policy (health check needs 3s,
 *      historical queries need 30s, both call the same code).
 *   2. Exposes only the methods WDMWD uses. If we ever swap to a
 *      different EVM library, only this file changes.
 *   3. Accepts a `transport` override so tests can inject mocked
 *      responses WITHOUT mocking the `viem` module itself.
 *
 * Never expose the raw Viem client beyond this file. Modules that need
 * a new RPC method add it to `RpcClient` here, not by importing viem
 * directly.
 */

import { createPublicClient, http, type PublicClient, type Transport } from "viem";
import { getChain } from "@/chain/registry";
import { config } from "@/config/config";

const DEFAULT_TIMEOUT_MS = 10_000;

export interface RpcClient {
  getBlockNumber(): Promise<bigint>;
  getChainId(): Promise<number>;
}

export interface RpcOptions {
  /** Override transport — used by tests. Production uses `http`. */
  transport?: Transport;
  /** HTTP timeout in milliseconds. Health check passes a small value. */
  timeoutMs?: number;
}

function resolveRpcUrl(chainId: number, chainRpcUrl: string): string {
  // Precedence: env override > chain default.
  // Session 4 only has one chain (Base). When more chains are added,
  // this grows into a per-chain env lookup.
  if (chainId === 8453 && config.chain.baseRpcUrl) {
    return config.chain.baseRpcUrl;
  }
  return chainRpcUrl;
}

export function createRpcClient(chainId: number, opts: RpcOptions = {}): RpcClient {
  const chain = getChain(chainId);
  const url = resolveRpcUrl(chain.id, chain.rpcUrl);
  const transport =
    opts.transport ??
    http(url, {
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      retryCount: 2,
      retryDelay: 500,
    });

  const client: PublicClient = createPublicClient({ transport });

  return {
    getBlockNumber: () => client.getBlockNumber(),
    getChainId: () => client.getChainId(),
  };
}