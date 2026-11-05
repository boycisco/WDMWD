import { describe, expect, it, vi } from "vitest";

// Mock the wallet module — this is what the wallet tool handler calls.
vi.mock("@/wallet/investigate", () => ({
  investigateWallet: vi.fn(async ({ address, chainId }: any) => ({
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
    evidence: [{ id: "ev_1" }],
  })),
}));

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
    // Re-mock investigateWallet to throw, then reimport tools so the
    // handler picks up the new mock. Use vi.doMock (non-hoisted).
    vi.doMock("@/wallet/investigate", () => ({
      investigateWallet: vi.fn(async () => {
        throw new Error("Upstream timeout");
      }),
    }));
    vi.resetModules();
    const { executeTool } = await import("@/agent/tools");
    const result = await executeTool("wallet", {
      address: "0x4200000000000000000000000000000000000010",
    });
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("Upstream");
    vi.doUnmock("@/wallet/investigate");
  });
});