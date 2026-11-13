// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import { getAssetTransfers } from "@/data/alchemy";

/**
 * Live Alchemy test — hits Base mainnet. Opt-in only:
 *     $env:LIVE_TESTS="1"; npm test; Remove-Item Env:LIVE_TESTS
 *
 * Requires ALCHEMY_API_KEY in .env.
 *
 * Uses Base's L2 Standard Bridge predeploy (0x4200...0010) as the
 * target wallet — it has continuous high-volume activity, so the test
 * reliably finds transfers. The bridge is also stable and public.
 */

const isLive = process.env.LIVE_TESTS === "1";
const BRIDGE = "0x4200000000000000000000000000000000000010" as const;

describe.skipIf(!isLive)("alchemy adapter — LIVE (Base mainnet)", () => {
  it("fetches outgoing transfers from the Base L2 bridge", async () => {
    const transfers = await getAssetTransfers({
      chainId: 8453,
      address: BRIDGE,
      fromOnly: true,
      limit: 5,
    });
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.length).toBeLessThanOrEqual(5);
    for (const t of transfers) {
      expect(t.chainId).toBe(8453);
      expect(t.hash.startsWith("0x")).toBe(true);
      expect(t.from.toLowerCase()).toBe(BRIDGE);
      // Amounts must be strings (never floats)
      expect(typeof t.amount.raw).toBe("string");
      expect(typeof t.amount.formatted).toBe("string");
      expect(Number.isInteger(t.blockNumber)).toBe(true);
      expect(t.blockNumber).toBeGreaterThan(0);
    }
  }, 30_000);

  it("fetches incoming transfers to the Base L2 bridge", async () => {
    const transfers = await getAssetTransfers({
      chainId: 8453,
      address: BRIDGE,
      toOnly: true,
      limit: 5,
    });
    expect(transfers.length).toBeGreaterThan(0);
    for (const t of transfers) {
      expect(t.to.toLowerCase()).toBe(BRIDGE);
    }
  }, 30_000);
});