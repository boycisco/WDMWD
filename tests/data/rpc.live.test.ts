// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import { createRpcClient } from "@/data/rpc";

const isLive = process.env.LIVE_TESTS === "1";

describe.skipIf(!isLive)("rpc adapter — LIVE (Base mainnet)", () => {
  it("reads the current Base block number from mainnet.base.org", async () => {
    const rpc = createRpcClient(8453);
    const blockNumber = await rpc.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(1_000_000n);
  }, 15_000);

  it("reads the chain ID as 8453", async () => {
    const rpc = createRpcClient(8453);
    expect(await rpc.getChainId()).toBe(8453);
  }, 15_000);
});