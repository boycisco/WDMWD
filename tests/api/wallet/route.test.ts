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
      incoming: [],
      outgoing: [],
      summary: {
        incomingCount: 0,
        outgoingCount: 0,
        uniqueIncomingCounterparties: 0,
        uniqueOutgoingCounterparties: 0,
        firstBlock: null,
        lastBlock: null,
        totalIncomingBySymbol: {},
        totalOutgoingBySymbol: {},
      },
      topIncomingCounterparties: [],
      topOutgoingCounterparties: [],
      topContracts: [],
    },
    findings: [
      { id: "f_coverage", title: "Coverage", explanation: "test", classification: "unknown", evidenceIds: [] },
    ],
    evidence: [],
  })),
}));

describe("GET /api/wallet/[address]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with investigation for a valid address", async () => {
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
    expect(body.address).toBe("0x4200000000000000000000000000000000000010");
    expect(body.findings).toBeDefined();
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