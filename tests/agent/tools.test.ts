import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/wallet/investigate", () => ({
  investigateWallet: vi.fn(),
}));

vi.mock("@/transaction/investigate", () => ({
  investigateTransaction: vi.fn(),
}));

beforeEach(async () => {
  const { investigateWallet } = await import("@/wallet/investigate");
  const { investigateTransaction } = await import("@/transaction/investigate");

  vi.mocked(investigateWallet).mockImplementation(
    async ({ address, chainId }: any) => ({
      id: "inv-test",
      address,
      chainId,
      timestamp: "2024-01-01T00:00:00.000Z",
      profile: {
        chainId,
        address,
        incoming: [],
        outgoing: [],
        summary: {
          incomingCount: 3,
          outgoingCount: 2,
          uniqueIncomingCounterparties: 3,
          uniqueOutgoingCounterparties: 2,
          firstBlock: 100,
          lastBlock: 500,
          totalIncomingBySymbol: { ETH: "1.5" },
          totalOutgoingBySymbol: { ETH: "0.5" },
        },
        topIncomingCounterparties: [
          { address: "0xaaaa000000000000000000000000000000000001", count: 2 },
        ],
        topOutgoingCounterparties: [
          { address: "0xbbbb000000000000000000000000000000000002", count: 1 },
        ],
        topContracts: [],
      },
      findings: [
        {
          id: "f_summary",
          title: "Summary",
          explanation: "test",
          classification: "confirmed",
          evidenceIds: ["ev_1"],
        },
      ],
      evidence: [
        {
          id: "ev_tx_1",
          chainId: 8453,
          type: "receipt",
          classification: "confirmed",
          data: {},
          source: "test",
          retrievedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    }),
  );

  vi.mocked(investigateTransaction).mockImplementation(
    async ({ hash, chainId }: any) => ({
      id: "tx-inv-test",
      chainId,
      hash,
      timestamp: "2024-01-01T00:00:00.000Z",
      transaction: {
        from: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        to: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        valueFormatted: "1.5",
        valueRaw: "1500000000000000000",
        nonce: 7,
        blockNumber: 1000,
        inputSize: 68,
        selector: "0xa9059cbb",
      },
      receipt: {
        status: "success",
        gasUsed: "21000",
        effectiveGasPrice: "1000000000",
        feeEth: "0.000021",
        logCount: 1,
        contractAddress: null,
        tokenTransferCount: 1,
        contractsInvolved: ["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
      },
      recipientType: "contract",
      findings: [
        {
          id: "f_tx_summary",
          title: "Transaction overview",
          explanation: "test",
          classification: "confirmed",
          evidenceIds: ["ev_tx_1"],
        },
      ],
      evidence: [
        {
          id: "ev_tx_1",
          chainId: 8453,
          type: "receipt",
          classification: "confirmed",
          data: {},
          source: "test",
          retrievedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    }),
  );
});

describe("agent tools — executeTool", () => {
  it("executes wallet tool successfully", async () => {
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("wallet", {
      address: "0x4200000000000000000000000000000000000010",
      chainId: 8453,
    });
    expect(result.ok).toBe(true);
    expect(result.summary).toContain("Investigated");
    const data = result.data as Record<string, unknown>;
    expect(data.investigationId).toBe("inv-test");
    const summary = data.summary as Record<string, unknown>;
    expect(summary.incomingCount).toBe(3);
    const findings = data.findings as Array<{ id: string }>;
    expect(findings[0]!.id).toBe("f_summary");
  });

  it("returns ok:false for unknown tool", async () => {
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("nonexistent", {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("UNKNOWN_TOOL");
  });

  it("returns ok:false on invalid wallet args (bad address)", async () => {
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("wallet", { address: "not-an-address" });
    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/address|Invalid/i);
  });

  it("returns ok:false on missing required arg", async () => {
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("wallet", {});
    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/address/i);
  });

  it("never throws, even on internal handler failure", async () => {
    // One-shot override: throws only for the next call.
    const { investigateWallet } = await import("@/wallet/investigate");
    vi.mocked(investigateWallet).mockImplementationOnce(async () => {
      throw new Error("Upstream timeout");
    });
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("wallet", {
      address: "0x4200000000000000000000000000000000000010",
    });
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("Upstream");
  });

  it("executes transaction tool successfully", async () => {
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("transaction", {
      hash: "0x" + "a".repeat(64),
      chainId: 8453,
    });
    expect(result.ok).toBe(true);
    expect(result.summary).toContain("Status: success");
    const data = result.data as Record<string, unknown>;
    expect(data.investigationId).toBe("tx-inv-test");
    expect(data.recipientType).toBe("contract");
    expect(data.status).toBe("success");
  });

  it("rejects invalid transaction hash", async () => {
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("transaction", { hash: "0xnotahash" });
    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/hash/i);
  });

  it("wallet tool omits the flat evidenceIds array (payload trim)", async () => {
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("wallet", {
      address: "0x4200000000000000000000000000000000000010",
    });
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const findings = data.findings as Array<{ evidenceIds: string[] }>;
    expect(findings[0]!.evidenceIds.length).toBeGreaterThan(0);
    expect(data.evidenceIds).toBeUndefined();
    expect(data.evidenceCount).toBeDefined();
  });
});