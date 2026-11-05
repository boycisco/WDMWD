import { describe, expect, it } from "vitest";
import { custom } from "viem";
import { createRpcClient } from "@/data/rpc";

function mockTransport(handlers: Record<string, () => unknown>) {
  return custom({
    async request({ method }) {
      const handler = handlers[method];
      if (!handler) {
        throw new Error(`Unexpected RPC method in test: ${method}`);
      }
      return handler();
    },
  });
}

describe("rpc adapter", () => {
  it("returns block number from getBlockNumber", async () => {
    const rpc = createRpcClient(8453, {
      transport: mockTransport({
        eth_blockNumber: () => "0x1234",
        eth_chainId: () => "0x2105",
      }),
    });
    expect(await rpc.getBlockNumber()).toBe(0x1234n);
  });

  it("returns chain ID from getChainId", async () => {
    const rpc = createRpcClient(8453, {
      transport: mockTransport({
        eth_blockNumber: () => "0x0",
        eth_chainId: () => "0x2105",
      }),
    });
    expect(await rpc.getChainId()).toBe(8453);
  });

  it("propagates RPC errors", async () => {
    const rpc = createRpcClient(8453, {
      transport: custom({
        async request() {
          throw new Error("RPC unavailable");
        },
      }),
    });
    await expect(rpc.getBlockNumber()).rejects.toThrow(/RPC unavailable/);
  });

  it("rejects unsupported chain IDs at client creation", () => {
    expect(() => createRpcClient(1)).toThrow(/Unsupported chain ID/);
  });
});