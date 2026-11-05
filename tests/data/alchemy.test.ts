import { afterEach, describe, expect, it, vi } from "vitest";
import { IndexerError } from "@/core/errors";
import { normalizeTransfer } from "@/data/alchemy";

// ─── Normalize-transfer unit tests (pure, no HTTP) ──────────────

describe("alchemy adapter — normalizeTransfer", () => {
  it("uses rawContract for exact ETH amount (ignores float `value`)", () => {
    const raw = {
      blockNum: "0x100",
      hash: "0xabc",
      from: "0xaaaa000000000000000000000000000000000001",
      to: "0xbbbb000000000000000000000000000000000002",
      rawContract: {
        value: "0x14d1120d7b160000", // 1.5 ETH = 1500000000000000000 wei
        address: null,
        decimal: "0x12", // 18
      },
      metadata: { blockTimestamp: "2024-01-01T00:00:00.000Z" },
      category: "external" as const,
    };
    const t = normalizeTransfer(raw, 8453);
    expect(t.amount.raw).toBe("1500000000000000000");
    expect(t.amount.formatted).toBe("1.5");
    expect(t.amount.decimals).toBe(18);
    expect(t.amount.symbol).toBe("ETH");
    expect(t.blockNumber).toBe(256);
  });

  it("normalizes an ERC-20 transfer with 6 decimals (USDC-style)", () => {
    const raw = {
      blockNum: "0x200",
      hash: "0xdef",
      from: "0xaaaa000000000000000000000000000000000001",
      to: "0xbbbb000000000000000000000000000000000002",
      rawContract: {
        value: "0x1e8480", // 2,000,000 = 2.0 USDC
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        decimal: "0x6",
      },
      tokenMetadata: {
        tokenType: "ERC20",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
      metadata: { blockTimestamp: "2024-01-01T00:00:00.000Z" },
      category: "erc20" as const,
    };
    const t = normalizeTransfer(raw, 8453);
    expect(t.amount.raw).toBe("2000000");
    expect(t.amount.formatted).toBe("2.0");
    expect(t.amount.decimals).toBe(6);
    expect(t.amount.symbol).toBe("USDC");
    expect(t.contractAddress).toBe(
      "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    );
  });

  it("normalizes an ERC-721 transfer (amount = 1, tokenId set)", () => {
    const raw = {
      blockNum: "0x300",
      hash: "0x111",
      from: "0xaaaa000000000000000000000000000000000001",
      to: "0xbbbb000000000000000000000000000000000002",
      erc721TokenId: "0x2a", // token 42
      rawContract: {
        value: null,
        address: "0x0000000000000000000000000000000000000001",
        decimal: "0x0",
      },
      metadata: { blockTimestamp: "2024-01-01T00:00:00.000Z" },
      category: "erc721" as const,
    };
    const t = normalizeTransfer(raw, 8453);
    expect(t.tokenId).toBe("42");
    expect(t.amount.raw).toBe("1");
    expect(t.amount.decimals).toBe(0);
  });

  it("formats zero-value amounts correctly", () => {
    const raw = {
      blockNum: "0x0",
      hash: "0x0",
      from: "0x0000000000000000000000000000000000000000",
      to: "0x0000000000000000000000000000000000000000",
      rawContract: { value: "0x0", address: null, decimal: "0x12" },
      category: "external" as const,
    };
    const t = normalizeTransfer(raw, 8453);
    expect(t.amount.raw).toBe("0");
    expect(t.amount.formatted).toBe("0.0");
  });
});

// ─── Parameter validation (no HTTP needed) ──────────────────────

describe("alchemy adapter — parameter validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects when neither fromOnly nor toOnly is set", async () => {
    const { getAssetTransfers } = await import("@/data/alchemy");
    await expect(
      getAssetTransfers({
        chainId: 8453,
        address: "0x4200000000000000000000000000000000000010",
      }),
    ).rejects.toThrow(IndexerError);
  });

  it("rejects fromOnly + toOnly together", async () => {
    const { getAssetTransfers } = await import("@/data/alchemy");
    await expect(
      getAssetTransfers({
        chainId: 8453,
        address: "0x4200000000000000000000000000000000000010",
        fromOnly: true,
        toOnly: true,
      }),
    ).rejects.toThrow(IndexerError);
  });

  it("throws IndexerError for unsupported chain", async () => {
    const { getAssetTransfers } = await import("@/data/alchemy");
    await expect(
      getAssetTransfers({
        chainId: 1,
        address: "0x4200000000000000000000000000000000000010",
        fromOnly: true,
      }),
    ).rejects.toThrow(IndexerError);
  });
});