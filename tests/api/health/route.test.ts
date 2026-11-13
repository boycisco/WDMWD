// SPDX-License-Identifier: AGPL-3.0-only
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

describe("GET /api/health — degraded paths", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with degraded status when blockchain is not configured", async () => {
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
    // In default mode, .env is not loaded → "not_configured".
    // In LIVE_TESTS=1 mode, .env is loaded → the mocked createRpcClient
    // throws → "error". Both make overall status "degraded".
    expect(["not_configured", "error"]).toContain(body.checks.blockchain.status);
    expect(body.checks.ai.status).toBe("not_configured");

    // Redaction guarantee: the actual key fields must not be present,
    // only the "...Configured" boolean flags. The flag VALUE depends on
    // whether `.env` was loaded (LIVE_TESTS=1), so we only assert type.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('"openaiApiKey"');
    expect(serialized).not.toContain('"alchemyApiKey"');
    expect(typeof body.config.ai.openaiApiKeyConfigured).toBe("boolean");
    expect(typeof body.config.chain.alchemyApiKeyConfigured).toBe("boolean");
  });
});