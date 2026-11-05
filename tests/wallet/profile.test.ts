import { describe, expect, it } from "vitest";
import { buildWalletProfile } from "@/wallet/profile";
import type { Transfer } from "@/core/types";
import type { WalletActivity } from "@/wallet/activity";

function mkTransfer(overrides: Partial<Transfer> = {}): Transfer {
  return {
    chainId: 8453,
    hash: "0x0" as const,
    blockNumber: 1,
    blockTimestamp: "2024-01-01T00:00:00.000Z",
    from: "0xaaaa000000000000000000000000000000000001" as const,
    to: "0xbbbb000000000000000000000000000000000002" as const,
    category: "external",
    amount: { raw: "0", formatted: "0.0", decimals: 18, symbol: "ETH" },
    direction: "in",
    ...overrides,
  };
}

function mkActivity(incoming: Transfer[], outgoing: Transfer[]): WalletActivity {
  return {
    chainId: 8453,
    address: "0x4200000000000000000000000000000000000010" as const,
    incoming,
    outgoing,
  };
}

describe("wallet profile — aggregation", () => {
  it("counts incoming and outgoing", () => {
    const p = buildWalletProfile(mkActivity([mkTransfer(), mkTransfer()], [mkTransfer()]));
    expect(p.summary.incomingCount).toBe(2);
    expect(p.summary.outgoingCount).toBe(1);
  });

  it("sums ETH amounts with BigInt (no float drift)", () => {
    const p = buildWalletProfile(
      mkActivity(
        [
          mkTransfer({ amount: { raw: "1500000000000000000", formatted: "1.5", decimals: 18, symbol: "ETH" } }),
          mkTransfer({ amount: { raw: "500000000000000000", formatted: "0.5", decimals: 18, symbol: "ETH" } }),
        ],
        [],
      ),
    );
    expect(p.summary.totalIncomingBySymbol.ETH).toBe("2.0");
  });

  it("counts unique counterparties", () => {
    const p = buildWalletProfile(
      mkActivity(
        [
          mkTransfer({ from: "0xaaaa000000000000000000000000000000000001" as const }),
          mkTransfer({ from: "0xaaaa000000000000000000000000000000000001" as const }),
          mkTransfer({ from: "0xcccc000000000000000000000000000000000003" as const }),
        ],
        [],
      ),
    );
    expect(p.summary.uniqueIncomingCounterparties).toBe(2);
    expect(p.topIncomingCounterparties[0]!.address).toBe(
      "0xaaaa000000000000000000000000000000000001",
    );
    expect(p.topIncomingCounterparties[0]!.count).toBe(2);
  });

  it("aggregates top contracts across categories", () => {
    const contract = "0xttt000000000000000000000000000000000001" as const;
    const p = buildWalletProfile(
      mkActivity(
        [
          mkTransfer({ category: "erc20", contractAddress: contract }),
          mkTransfer({ category: "erc20", contractAddress: contract }),
          mkTransfer({ category: "erc721", contractAddress: contract }),
        ],
        [],
      ),
    );
    expect(p.topContracts[0]!.contract).toBe(contract);
    expect(p.topContracts[0]!.count).toBe(3);
    expect(p.topContracts[0]!.categories.sort()).toEqual(["erc20", "erc721"]);
  });

  it("computes first/last block", () => {
    const p = buildWalletProfile(
      mkActivity(
        [mkTransfer({ blockNumber: 100 }), mkTransfer({ blockNumber: 500 })],
        [mkTransfer({ blockNumber: 300 })],
      ),
    );
    expect(p.summary.firstBlock).toBe(100);
    expect(p.summary.lastBlock).toBe(500);
  });

  it("handles empty activity", () => {
    const p = buildWalletProfile(mkActivity([], []));
    expect(p.summary.incomingCount).toBe(0);
    expect(p.summary.firstBlock).toBeNull();
    expect(p.topIncomingCounterparties).toEqual([]);
  });
});