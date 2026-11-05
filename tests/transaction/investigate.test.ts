import { describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/core/errors";
import { investigateTransaction } from "@/transaction/investigate";

// Mock the RPC client factory so we can inject controlled data.
vi.mock("@/data/rpc", () => ({
  createRpcClient: vi.fn(),
}));

const HASH_OK = "0x" + "a".repeat(64);
const HASH_REVERTED = "0x" + "b".repeat(64);
const HASH_MISSING = "0x" + "c".repeat(64);
const HASH_NORECEIPT = "0x" + "d".repeat(64);
const HASH_DEPLOY = "0x" + "e".repeat(64);

const FROM = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TO_CONTRACT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TO_EOA = "0xcccccccccccccccccccccccccccccccccccccccc";

function mockRpc() {
  const txByHash: Record<string, unknown> = {
    [HASH_OK]: {
      from: FROM,
      to: TO_CONTRACT,
      value: 1500000000000000000n,
      nonce: 7,
      blockNumber: 1000n,
      input: "0xa9059cbb00000000000000000000000000000000000000000000000000000000deadbeef",
    },
    [HASH_REVERTED]: {
      from: FROM,
      to: TO_CONTRACT,
      value: 0n,
      nonce: 8,
      blockNumber: 1001n,
      input: "0xdeadbeef",
    },
    [HASH_NORECEIPT]: {
      from: FROM,
      to: TO_EOA,
      value: 1000000000000000n,
      nonce: 9,
      blockNumber: 1002n,
      input: "0x",
    },
    [HASH_DEPLOY]: {
      from: FROM,
      to: null,
      value: 0n,
      nonce: 10,
      blockNumber: 1003n,
      input: "0x6080604052",
    },
  };

  const receipts: Record<string, unknown> = {
    [HASH_OK]: {
      status: "success",
      gasUsed: 21000n,
      effectiveGasPrice: 1000000000n,
      contractAddress: null,
      logs: [
        {
          address: TO_CONTRACT,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          ],
          data: "0x00",
        },
      ],
    },
    [HASH_REVERTED]: {
      status: "reverted",
      gasUsed: 30000n,
      effectiveGasPrice: 1000000000n,
      contractAddress: null,
      logs: [],
    },
    [HASH_NORECEIPT]: null,
    [HASH_DEPLOY]: {
      status: "success",
      gasUsed: 500000n,
      effectiveGasPrice: 1000000000n,
      contractAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
      logs: [],
    },
  };

  return {
    getTransaction: vi.fn(async (hash: string) => txByHash[hash] ?? null),
    getTransactionReceipt: vi.fn(async (hash: string) => receipts[hash] ?? null),
    getBytecode: vi.fn(async (address: string) => {
      if (address.toLowerCase() === TO_CONTRACT.toLowerCase()) return "0x6080";
      if (address.toLowerCase() === TO_EOA.toLowerCase()) return undefined;
      return undefined;
    }),
    getBlockNumber: vi.fn(),
    getChainId: vi.fn(),
  };
}

describe("investigateTransaction", () => {
  it("rejects invalid hash format", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    await expect(
      investigateTransaction({ chainId: 8453, hash: "0xnotahash" }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects unsupported chain", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    await expect(
      investigateTransaction({ chainId: 1, hash: HASH_OK }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws NotFoundError when the tx does not exist", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    await expect(
      investigateTransaction({ chainId: 8453, hash: HASH_MISSING }),
    ).rejects.toThrow(NotFoundError);
  });

  it("produces confirmed findings with ETH value, gas, contract target, and token events", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    const inv = await investigateTransaction({ chainId: 8453, hash: HASH_OK });

    expect(inv.hash).toBe(HASH_OK);
    expect(inv.recipientType).toBe("contract");
    expect(inv.transaction.valueFormatted).toBe("1.5");
    expect(inv.transaction.selector).toBe("0xa9059cbb");
    expect(inv.receipt?.status).toBe("success");
    expect(inv.receipt?.tokenTransferCount).toBe(1);

    const ids = inv.findings.map((f) => f.id);
    expect(ids).toContain("f_tx_summary");
    expect(ids).toContain("f_tx_value");
    expect(ids).toContain("f_tx_gas");
    expect(ids).toContain("f_tx_target");
    expect(ids).toContain("f_tx_events");
    expect(ids).toContain("f_tx_coverage");

    const summary = inv.findings.find((f) => f.id === "f_tx_summary")!;
    expect(summary.classification).toBe("confirmed");
    expect(summary.evidenceIds.length).toBeGreaterThan(0);

    const coverage = inv.findings.find((f) => f.id === "f_tx_coverage")!;
    expect(coverage.classification).toBe("unknown");
    expect(coverage.evidenceIds).toEqual([]);
  });

  it("classifies a reverted tx with status reverted and no value finding", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    const inv = await investigateTransaction({
      chainId: 8453,
      hash: HASH_REVERTED,
    });

    expect(inv.receipt?.status).toBe("reverted");
    const valueFinding = inv.findings.find((f) => f.id === "f_tx_value");
    expect(valueFinding).toBeUndefined();
    const summary = inv.findings.find((f) => f.id === "f_tx_summary")!;
    expect(summary.explanation).toContain("REVERTED");
  });

  it("classifies an EOA recipient", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    const inv = await investigateTransaction({
      chainId: 8453,
      hash: HASH_NORECEIPT,
    });
    expect(inv.recipientType).toBe("eoa");
  });

  it("classifies a deployment (to === null)", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    const inv = await investigateTransaction({
      chainId: 8453,
      hash: HASH_DEPLOY,
    });
    expect(inv.recipientType).toBe("deployment");
    const target = inv.findings.find((f) => f.id === "f_tx_target")!;
    expect(target.explanation).toContain("created a new contract");
  });

  it("handles missing receipt (pending/not mined)", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    const inv = await investigateTransaction({
      chainId: 8453,
      hash: HASH_NORECEIPT,
    });
    expect(inv.receipt).toBeNull();
    const summary = inv.findings.find((f) => f.id === "f_tx_summary")!;
    expect(summary.classification).toBe("unknown");
  });

  it("every non-coverage finding references the evidence ID", async () => {
    const rpc = mockRpc();
    (await import("@/data/rpc")).createRpcClient = vi
      .fn()
      .mockReturnValue(rpc) as never;
    const inv = await investigateTransaction({ chainId: 8453, hash: HASH_OK });
    const evidenceIds = new Set(inv.evidence.map((e) => e.id));
    for (const f of inv.findings) {
      if (f.id === "f_tx_coverage") continue;
      expect(f.evidenceIds.length).toBeGreaterThan(0);
      for (const id of f.evidenceIds) {
        expect(evidenceIds.has(id)).toBe(true);
      }
    }
  });
});