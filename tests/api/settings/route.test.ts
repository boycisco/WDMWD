// SPDX-License-Identifier: AGPL-3.0-only
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type Db } from "@/store/store";

let tmpDir: string;
let testDb: Db;

// Point the route's getDb to our real test database
vi.mock("@/store/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store/store")>();
  return {
    ...actual,
    getDb: () => testDb,
  };
});

// Mock RPC so we don't hit the network
vi.mock("@/data/rpc", () => ({
  createRpcClient: () => ({
    getBlockNumber: async () => 54948314n,
  }),
}));

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wdmwd-settings-test-"));
  testDb = createDb(join(tmpDir, "test.db"));
  migrate(testDb, { migrationsFolder: "./drizzle" });
});

afterEach(() => {
  testDb.close();
  rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

describe("GET /api/settings", () => {
  it("returns 200 with the required frontend shape", async () => {
    const { GET } = await import("@/app/api/settings/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.chainId).toBe(8453);
    expect(body.chainName).toBe("Base Mainnet");
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("config");
    expect(body.config).toHaveProperty("streamResponses");
    expect(body.providerIndicators).toHaveProperty("rpcConnected");
  });
});

describe("PATCH /api/settings", () => {
  it("updates streamResponses and returns the new state", async () => {
    const { PATCH } = await import("@/app/api/settings/route");
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ streamResponses: false }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config.streamResponses).toBe(false);
  });

  it("rejects invalid payloads", async () => {
    const { PATCH } = await import("@/app/api/settings/route");
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ streamResponses: "not-a-boolean" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400); // Validation Error
  });
});