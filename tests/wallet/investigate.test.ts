// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it, vi } from "vitest";
import type { Transfer } from "@/core/types";

function mkTransfer(overrides: Partial<Transfer> = {}): Transfer {
  return {
    chainId: 8453,
    hash: "0xabc" as const,
    blockNumber: 100,
    blockTimestamp: "2024-01-01T00:00:00.000Z",
    from: "0xaaaa000000000000000000000000000000000001" as const,
    to: "0xbbbb000000000000000000000000000000000002" as const,
    category: "external",
    amount: { raw: "1000000000000000000", formatted: "1.0", decimals: 18, symbol: "ETH" },
    direction: "in",
    ...overrides,
  };
}

// Mock the activity layer so tests don't hit Alchemy.
vi.mock("@/wallet/activity", () => ({
  getWalletActivity: vi.fn(async ({ address }: { address: string }) => ({
    chainId: 8453,
    address: address.toLowerCase(),
    incoming: [
      mkTransfer({ from: "0xaaaa000000000000000000000000000000000001" as const }),
      mkTransfer({
        from: "0xaaaa000000000000000000000000000000000001" as const,
        hash: "0xabc2" as const,
      }),
    ],
    outgoing: [mkTransfer({ hash: "0xdef" as const })],
  })),
}));

describe("investigateWallet", () => {
  it("emits summary, top-incoming, top-outgoing, and coverage findings", async () => {
    const { investigateWallet } = await import("@/wallet/investigate");
    const inv = await investigateWallet({
      chainId: 8453,
      address: "0x4200000000000000000000000000000000000010",
    });
    const ids = inv.findings.map((f) => f.id);
    expect(ids).toContain("f_summary");
    expect(ids).toContain("f_top_incoming");
    expect(ids).toContain("f_top_outgoing");
    expect(ids).toContain("f_coverage");
  });

  it("every non-coverage finding references at least one evidence ID", async () => {
    const { investigateWallet } = await import("@/wallet/investigate");
    const inv = await investigateWallet({
      chainId: 8453,
      address: "0x4200000000000000000000000000000000000010",
    });
    const evidenceIds = new Set(inv.evidence.map((e) => e.id));
    for (const f of inv.findings) {
      if (f.id === "f_coverage" || f.id === "f_empty") continue;
      expect(f.evidenceIds.length).toBeGreaterThan(0);
      for (const id of f.evidenceIds) {
        expect(evidenceIds.has(id)).toBe(true);
      }
    }
  });

  it("coverage finding is classified unknown with no evidence", async () => {
    const { investigateWallet } = await import("@/wallet/investigate");
    const inv = await investigateWallet({
      chainId: 8453,
      address: "0x4200000000000000000000000000000000000010",
    });
    const coverage = inv.findings.find((f) => f.id === "f_coverage")!;
    expect(coverage.classification).toBe("unknown");
    expect(coverage.evidenceIds).toEqual([]);
    expect(coverage.limitations!.length).toBeGreaterThan(0);
  });

  it("top-incoming finding names the most frequent sender", async () => {
    const { investigateWallet } = await import("@/wallet/investigate");
    const inv = await investigateWallet({
      chainId: 8453,
      address: "0x4200000000000000000000000000000000000010",
    });
    const top = inv.findings.find((f) => f.id === "f_top_incoming")!;
    expect(top.classification).toBe("confirmed");
    expect(top.explanation).toContain("0xaaaa000000000000000000000000000000000001");
    expect(top.explanation).toMatch(/2 incoming/);
  });

  it("evidence entries carry the investigation ID", async () => {
    const { investigateWallet } = await import("@/wallet/investigate");
    const inv = await investigateWallet({
      chainId: 8453,
      address: "0x4200000000000000000000000000000000000010",
    });
    expect(inv.evidence.length).toBeGreaterThan(0);
    for (const e of inv.evidence) {
      expect(e.investigationId).toBe(inv.id);
    }
  });
});