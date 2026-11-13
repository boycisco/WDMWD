// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Alchemy adapter — historical wallet activity.
 *
 * Provider-specific: everything here is Alchemy's response format.
 * Callers get normalized `RawTransfer` objects (pre-direction), not
 * `alchemy_getAssetTransfers` responses. Swapping to another indexer
 * means rewriting this file alone.
 *
 * Critical: Alchemy's `value` field is a JS float (e.g. 1.5000001) and
 * is NOT safe for financial amounts. We ignore it entirely. Exact
 * amounts come from `rawContract.value` (hex integer) and
 * `rawContract.decimal` (hex) — spec §7.3.
 */

import { config } from "@/config/config";
import { IndexerError } from "@/core/errors";
import { parseOrThrow, z } from "@/core/validate";
import type {
  Address,
  ChainId,
  TokenAmount,
  TransferCategory,
  TxHash,
} from "@/core/types";

const ALCHEMY_HOST_BY_CHAIN: Record<number, string> = {
  8453: "https://base-mainnet.g.alchemy.com/v2",
};

const DEFAULT_MAX_COUNT = 100;
const HARD_MAX_COUNT = 1000;
const MAX_PAGES = 10;

export interface RawTransfer {
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
}

export interface GetTransfersOptions {
  chainId: ChainId;
  address: Address;
  fromOnly?: boolean;
  toOnly?: boolean;
  limit?: number;
}

// ─── Alchemy response shape (defensive subset) ──────────────────

const AlchemyTransferSchema = z.object({
  blockNum: z.string(),
  hash: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  erc721TokenId: z.string().nullable().optional(),
  erc1155Metadata: z
    .array(z.object({ tokenId: z.string(), value: z.string().optional() }))
    .nullable()
    .optional(),
  tokenMetadata: z
    .object({
      tokenType: z.string().optional(),
      symbol: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      decimals: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  rawContract: z.object({
    value: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    decimal: z.string().nullable().optional(),
  }),
  metadata: z
    .object({ blockTimestamp: z.string().optional() })
    .nullable()
    .optional(),
  category: z.enum(["external", "erc20", "erc721", "erc1155"]),
});

const AlchemyResponseSchema = z.object({
  transfers: z.array(AlchemyTransferSchema),
  pageKey: z.string().optional(),
});

// ─── Amount helpers ─────────────────────────────────────────────

function hexToBigInt(hex: string | null | undefined): bigint {
  if (!hex) return 0n;
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean === "") return 0n;
  return BigInt("0x" + clean);
}

function formatAmount(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString();
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const scale = 10n ** BigInt(decimals);
  const whole = abs / scale;
  const frac = (abs % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return frac.length > 0 ? `${sign}${whole}.${frac}` : `${sign}${whole}.0`;
}

// ─── Normalization ──────────────────────────────────────────────

/**
 * @internal Exported for unit testing. Application code should call
 * `getAssetTransfers`, which handles the full HTTP + pagination cycle.
 */
export function normalizeTransfer(
  raw: z.infer<typeof AlchemyTransferSchema>,
  chainId: ChainId,
): RawTransfer {
  const decimalsRaw = hexToBigInt(raw.rawContract.decimal);
  const decimals = Number(decimalsRaw);

  let rawAmount = hexToBigInt(raw.rawContract.value);
  let tokenId: string | undefined;

  if (raw.category === "erc721" && raw.erc721TokenId) {
    tokenId = hexToBigInt(raw.erc721TokenId).toString();
    rawAmount = 1n;
  } else if (raw.category === "erc1155" && raw.erc1155Metadata && raw.erc1155Metadata[0]) {
    tokenId = hexToBigInt(raw.erc1155Metadata[0].tokenId).toString();
    if (raw.erc1155Metadata[0].value) {
      rawAmount = hexToBigInt(raw.erc1155Metadata[0].value);
    }
  }

  const effectiveDecimals = raw.category === "external" ? 18 : decimals;
  const symbol =
    raw.category === "external"
      ? "ETH"
      : raw.tokenMetadata?.symbol ?? undefined;
  const name =
    raw.category === "external"
      ? "Ether"
      : raw.tokenMetadata?.name ?? undefined;

  return {
    chainId,
    hash: raw.hash as TxHash,
    blockNumber: Number(hexToBigInt(raw.blockNum)),
    blockTimestamp: raw.metadata?.blockTimestamp ?? "",
    from: (raw.from ?? "0x0000000000000000000000000000000000000000") as Address,
    to: (raw.to ?? "0x0000000000000000000000000000000000000000") as Address,
    category: raw.category,
    contractAddress: raw.rawContract.address
      ? (raw.rawContract.address as Address)
      : undefined,
    tokenId,
    amount: {
      raw: rawAmount.toString(),
      formatted: formatAmount(rawAmount, effectiveDecimals),
      decimals: effectiveDecimals,
      symbol,
      name,
    },
  };
}

// ─── URL builder ────────────────────────────────────────────────

function buildAlchemyUrl(chainId: ChainId): string {
  const host = ALCHEMY_HOST_BY_CHAIN[chainId];
  if (!host) {
    throw new IndexerError(`Alchemy adapter does not support chain ${chainId}`);
  }
  const apiKey = config.chain.alchemyApiKey;
  if (!apiKey) {
    throw new IndexerError(
      "ALCHEMY_API_KEY is not configured. Add it to .env to enable historical wallet activity.",
    );
  }
  return `${host}/${apiKey}`;
}

// ─── Public API ─────────────────────────────────────────────────

export async function getAssetTransfers(
  opts: GetTransfersOptions,
): Promise<RawTransfer[]> {
  const url = buildAlchemyUrl(opts.chainId);

  if (opts.fromOnly && opts.toOnly) {
    throw new IndexerError("fromOnly and toOnly are mutually exclusive");
  }
  if (!opts.fromOnly && !opts.toOnly) {
    throw new IndexerError(
      "getAssetTransfers requires fromOnly or toOnly to be set",
    );
  }

  const limit = Math.min(opts.limit ?? DEFAULT_MAX_COUNT, HARD_MAX_COUNT);
  const collected: RawTransfer[] = [];
  let pageKey: string | undefined = undefined;
  let pages = 0;

  while (collected.length < limit && pages < MAX_PAGES) {
    const params: Record<string, unknown> = {
      fromBlock: "0x0",
      toBlock: "latest",
      category: ["external", "erc20", "erc721", "erc1155"],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount:
        "0x" + Math.min(limit - collected.length, DEFAULT_MAX_COUNT).toString(16),
    };
    if (opts.fromOnly) params.fromAddress = opts.address;
    if (opts.toOnly) params.toAddress = opts.address;
    if (pageKey) params.pageKey = pageKey;

    let result: unknown;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getAssetTransfers",
          params: [params],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        throw new IndexerError(
          `Alchemy returned HTTP ${res.status} for chain ${opts.chainId}`,
        );
      }
      const json = (await res.json()) as {
        result?: unknown;
        error?: { message?: string };
      };
      if (json.error) {
        throw new IndexerError(
          `Alchemy RPC error: ${json.error.message ?? "unknown"}`,
        );
      }
      result = json.result;
    } catch (err) {
      if (err instanceof IndexerError) throw err;
      throw new IndexerError(
        `Alchemy request failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }

    const parsed = parseOrThrow(AlchemyResponseSchema, result);
    for (const t of parsed.transfers) {
      collected.push(normalizeTransfer(t, opts.chainId));
      if (collected.length >= limit) break;
    }
    pageKey = parsed.pageKey;
    pages += 1;
    if (!pageKey) break;
  }

  return collected;
}