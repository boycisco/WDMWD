import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the store so this test never touches a real DB file.
vi.mock("@/store/store", () => ({
  getDb: () => ({
    get: () => ({ ok: 1 }),
  }),
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
    expect(body.status).toBe("ok");
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