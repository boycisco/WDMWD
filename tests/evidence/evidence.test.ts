// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import {
  dedupeEvidence,
  transferToEvidence,
} from "@/evidence/evidence";
import type { Transfer } from "@/core/types";

const baseTransfer: Transfer = {
  chainId: 8453,
  hash: "0xabc123" as const,
  blockNumber: 100,
  blockTimestamp: "2024-01-01T00:00:00.000Z",
  from: "0xaaaa000000000000000000000000000000000001" as const,
  to: "0xbbbb000000000000000000000000000000000002" as const,
  category: "external",
  amount: {
    raw: "1500000000000000000",
    formatted: "1.5",
    decimals: 18,
    symbol: "ETH",
    name: "Ether",
  },
  direction: "in",
};

describe("evidence — transferToEvidence", () => {
  it("produces a deterministic content-derived ID", () => {
    const a = transferToEvidence(baseTransfer);
    const b = transferToEvidence(baseTransfer);
    expect(a.id).toBe(b.id);
    expect(a.id.startsWith("ev_")).toBe(true);
    expect(a.id.length).toBeGreaterThanOrEqual(19);
  });

  it("produces different IDs for distinct transfers", () => {
    const a = transferToEvidence(baseTransfer);
    const b = transferToEvidence({ ...baseTransfer, hash: "0xdef456" as const });
    expect(a.id).not.toBe(b.id);
  });

  it("classifies as confirmed", () => {
    expect(transferToEvidence(baseTransfer).classification).toBe("confirmed");
  });

  it("captures tx, block, addresses and contract", () => {
    const withContract = transferToEvidence({
      ...baseTransfer,
      category: "erc20",
      contractAddress: "0xttt000000000000000000000000000000000001" as const,
    });
    expect(withContract.transactionHash).toBe("0xabc123");
    expect(withContract.blockNumber).toBe(100);
    expect(withContract.addresses).toEqual([baseTransfer.from, baseTransfer.to]);
    expect(withContract.contractAddress).toBe("0xttt000000000000000000000000000000000001");
    expect(withContract.source).toBe("alchemy:8453");
    expect(withContract.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("preserves amount as string (never float)", () => {
    const e = transferToEvidence(baseTransfer);
    expect(typeof e.data.amountRaw).toBe("string");
    expect(e.data.amountRaw).toBe("1500000000000000000");
    expect(e.data.amountFormatted).toBe("1.5");
  });
});

describe("evidence — dedupeEvidence", () => {
  it("removes duplicate IDs", () => {
    const e = transferToEvidence(baseTransfer);
    const dup = { ...e };
    expect(dedupeEvidence([e, dup])).toHaveLength(1);
  });
});