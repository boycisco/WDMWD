import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the store so this test never touches a real DB file.
vi.mock("@/store/store", () => ({
  getDb: () => ({
    get: () => ({ ok: 1 }),
  }),
}));

vi.mock("@/data/rpc", () => ({
  createRpcClient: () => {
    throw new Error("rpc not available in unit tests");
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with ok status and redacted config", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    // Session 4: overall status is "ok" only when database AND blockchain
    // are both ok. Test env has no BASE_RPC_URL / ALCHEMY_API_KEY, so
    // probeChain returns "not_configured" → overall is "degraded".
    // The "ok" path is verified by the live curl command during dev.
    expect(body.status).toBe("degraded");
    expect(body.checks.application.status).toBe("ok");
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.blockchain.status).toBe("not_configured");
    expect(body.checks.ai.status).toBe("not_configured");

    // Redaction guarantee: the actual key fields must not be present,
    // only the "...Configured" boolean flags.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('"openaiApiKey"');
    expect(serialized).not.toContain('"alchemyApiKey"');
    expect(body.config.ai.openaiApiKeyConfigured).toBe(false);
    expect(body.config.chain.alchemyApiKeyConfigured).toBe(false);
  });
});