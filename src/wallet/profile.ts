// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Wallet profile — pure aggregation over WalletActivity.
 *
 * No I/O. Given incoming + outgoing transfers, produces summary
 * statistics used by findings. Testing this is trivial because there
 * are no external dependencies.
 *
 * Amount sums use BigInt; the formatted strings are produced at the
 * end. Never sum via JS numbers — that corrupts financial data.
 */

import type {
  Address,
  ChainId,
  Transfer,
  TransferCategory,
} from "@/core/types";
import type { WalletActivity } from "./activity";

export interface WalletProfile {
  chainId: ChainId;
  address: Address;
  incoming: Transfer[];
  outgoing: Transfer[];
  summary: {
    incomingCount: number;
    outgoingCount: number;
    uniqueIncomingCounterparties: number;
    uniqueOutgoingCounterparties: number;
    firstBlock: number | null;
    lastBlock: number | null;
    /** Sum per symbol ("ETH", "USDC", ...) as a formatted decimal string. */
    totalIncomingBySymbol: Record<string, string>;
    totalOutgoingBySymbol: Record<string, string>;
  };
  /** Top counterparties by transfer count, descending. */
  topIncomingCounterparties: Array<{ address: Address; count: number }>;
  topOutgoingCounterparties: Array<{ address: Address; count: number }>;
  /** Contracts (ERC-20/721/1155) by transfer count, descending. */
  topContracts: Array<{
    contract: Address;
    count: number;
    categories: TransferCategory[];
  }>;
}

function formatSum(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString();
  const whole = raw / 10n ** BigInt(decimals);
  const frac = (raw % 10n ** BigInt(decimals))
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : `${whole}.0`;
}

function sumBySymbol(
  transfers: Transfer[],
): Record<string, string> {
  const raws = new Map<string, { value: bigint; decimals: number }>();
  for (const t of transfers) {
    const sym = t.amount.symbol ?? `token:${t.contractAddress ?? "unknown"}`;
    const cur = raws.get(sym);
    if (cur) {
      cur.value += BigInt(t.amount.raw);
    } else {
      raws.set(sym, {
        value: BigInt(t.amount.raw),
        decimals: t.amount.decimals,
      });
    }
  }
  const out: Record<string, string> = {};
  for (const [sym, v] of raws) {
    out[sym] = formatSum(v.value, v.decimals);
  }
  return out;
}

function countCounterparties(
  transfers: Transfer[],
  side: "from" | "to",
): Map<Address, number> {
  const m = new Map<Address, number>();
  for (const t of transfers) {
    const key = side === "from" ? t.from : t.to;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

function sortedTop(
  counts: Map<Address, number>,
  topN = 5,
): Array<{ address: Address; count: number }> {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([address, count]) => ({ address, count }));
}

export function buildWalletProfile(activity: WalletActivity): WalletProfile {
  const { incoming, outgoing, address, chainId } = activity;

  const incParties = countCounterparties(incoming, "from");
  const outParties = countCounterparties(outgoing, "to");

  const contractCounts = new Map<
    Address,
    { count: number; categories: Set<TransferCategory> }
  >();
  for (const t of [...incoming, ...outgoing]) {
    if (!t.contractAddress) continue;
    const cur = contractCounts.get(t.contractAddress);
    if (cur) {
      cur.count += 1;
      cur.categories.add(t.category);
    } else {
      contractCounts.set(t.contractAddress, {
        count: 1,
        categories: new Set([t.category]),
      });
    }
  }
  const topContracts = [...contractCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([contract, v]) => ({
      contract,
      count: v.count,
      categories: [...v.categories],
    }));

  const all = [...incoming, ...outgoing];
  const blocks = all.map((t) => t.blockNumber).filter((n) => n > 0);
  const firstBlock = blocks.length ? Math.min(...blocks) : null;
  const lastBlock = blocks.length ? Math.max(...blocks) : null;

  return {
    chainId,
    address,
    incoming,
    outgoing,
    summary: {
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
      uniqueIncomingCounterparties: incParties.size,
      uniqueOutgoingCounterparties: outParties.size,
      firstBlock,
      lastBlock,
      totalIncomingBySymbol: sumBySymbol(incoming),
      totalOutgoingBySymbol: sumBySymbol(outgoing),
    },
    topIncomingCounterparties: sortedTop(incParties),
    topOutgoingCounterparties: sortedTop(outParties),
    topContracts,
  };
}