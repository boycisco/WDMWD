import type { Chain } from "./chain";

/**
 * Base Mainnet — initial network per spec §4.
 *
 * `rpcUrl` is Base's public endpoint: free, unauthenticated,
 * rate-limited (~5-10 req/sec). Fine for development and light use.
 * Heavy use should supply a private RPC or Alchemy key via .env.
 */
export const base: Chain = Object.freeze({
  id: 8453,
  name: "Base",
  rpcUrl: "https://mainnet.base.org",
  explorerUrl: "https://basescan.org",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
});