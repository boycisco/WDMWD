import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/wallet/investigate", () => ({
  investigateWallet: vi.fn(async () => ({
    id: "inv-test",
    address: "0x4200000000000000000000000000000000000010",
    chainId: 8453,
    timestamp: "2024-01-01T00:00:00.000Z",
    profile: {
      chainId: 8453,
      address: "0x4200000000000000000000000000000000000010",
      incoming: [
        {
          chainId: 8453,
          hash: "0x" + "a".repeat(64),
          blockNumber: 100,
          blockTimestamp: "2024-01-01T00:00:00.000Z",
          from: "0x" + "1".repeat(40),
          to: "0x4200000000000000000000000000000000000010",
          category: "external",
          amount: { raw: "1000000000000000000", formatted: "1.0", decimals: 18, symbol: "ETH" },
          direction: "in",
        },
      ],
      outgoing: [],
      summary: {
        incomingCount: 1,
        outgoingCount: 0,
        uniqueIncomingCounterparties: 1,
        uniqueOutgoingCounterparties: 0,
        firstBlock: 100,
        lastBlock: 100,
        totalIncomingBySymbol: { ETH: "1.0" },
        totalOutgoingBySymbol: {},
      },
      topIncomingCounterparties: [],
      topOutgoingCounterparties: [],
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
        id: "ev_1",
        chainId: 8453,
        type: "transfer",
        classification: "confirmed",
        transactionHash: "0x" + "a".repeat(64),
        blockNumber: 100,
        blockTimestamp: "2024-01-01T00:00:00.000Z",
        addresses: ["0x" + "1".repeat(40), "0x4200000000000000000000000000000000000010"],
        data: {
          category: "external",
          amountFormatted: "1.0",
          symbol: "ETH",
          direction: "in",
        },
        source: "alchemy:8453",
        retrievedAt: "2024-01-01T00:00:00.000Z",
      },
    ],
  })),
}));

vi.mock("@/data/rpc", () => ({
  createRpcClient: vi.fn(() => ({
    getBalance: vi.fn(async () => 5000000000000000000n), // 5 ETH
  })),
}));

describe("GET /api/wallet/[address]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with transformed frontend shape", async () => {
    const { GET } = await import("@/app/api/wallet/[address]/route");
    const req = new Request(
      "http://localhost:3000/api/wallet/0x4200000000000000000000000000000000000010",
    );
    const res = await GET(req, {
      params: Promise.resolve({
        address: "0x4200000000000000000000000000000000000010",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    // Profile shape
    expect(body.profile.address).toBe(
      "0x4200000000000000000000000000000000000010",
    );
    expect(body.profile.balance).toBe("5.0");
    expect(body.profile.txCount).toBe(1);
    expect(body.profile.firstSeen).toBe("2024-01-01T00:00:00.000Z");

    // Findings shape
    expect(body.findings).toHaveLength(1);
    expect(body.findings[0].description).toBe("test");
    expect(body.findings[0].severity).toBe("info");
    expect(body.findings[0].classification).toBe("confirmed");

    // Evidence shape
    expect(body.evidence).toHaveLength(1);
    expect(body.evidence[0].id).toBe("ev_1");
    expect(body.evidence[0].assetMovement).toBe("+1.0 ETH");
    expect(body.evidence[0].explorerLink).toContain("basescan.org/tx/");
  });

  it("returns 400 for invalid address", async () => {
    const { GET } = await import("@/app/api/wallet/[address]/route");
    const req = new Request("http://localhost:3000/api/wallet/nope");
    const res = await GET(req, {
      params: Promise.resolve({ address: "nope" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for unsupported chain", async () => {
    const { GET } = await import("@/app/api/wallet/[address]/route");
    const req = new Request(
      "http://localhost:3000/api/wallet/0x4200000000000000000000000000000000000010?chainId=1",
    );
    const res = await GET(req, {
      params: Promise.resolve({
        address: "0x4200000000000000000000000000000000000010",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("UNSUPPORTED");
  });

  it("returns 400 for invalid limit", async () => {
    const { GET } = await import("@/app/api/wallet/[address]/route");
    const req = new Request(
      "http://localhost:3000/api/wallet/0x4200000000000000000000000000000000000010?limit=9999",
    );
    const res = await GET(req, {
      params: Promise.resolve({
        address: "0x4200000000000000000000000000000000000010",
      }),
    });
    expect(res.status).toBe(400);
  });
});