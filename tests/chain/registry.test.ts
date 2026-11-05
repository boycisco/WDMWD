import { describe, expect, it } from "vitest";
import { UnsupportedError } from "@/core/errors";
import { addressUrl, txUrl } from "@/chain/chain";
import { base, getChain, hasChain, listChains } from "@/chain/registry";

describe("chain registry", () => {
  it("returns Base for chain ID 8453", () => {
    const chain = getChain(8453);
    expect(chain.id).toBe(8453);
    expect(chain.name).toBe("Base");
  });

  it("hasChain returns true for supported IDs", () => {
    expect(hasChain(8453)).toBe(true);
  });

  it("hasChain returns false for unknown IDs", () => {
    expect(hasChain(1)).toBe(false);
    expect(hasChain(0)).toBe(false);
    expect(hasChain(-1)).toBe(false);
  });

  it("getChain throws UnsupportedError for unknown IDs", () => {
    expect(() => getChain(1)).toThrow(UnsupportedError);
    expect(() => getChain(999999)).toThrow(/Unsupported chain ID/);
  });

  it("listChains contains exactly Base right now", () => {
    const chains = listChains();
    expect(chains).toHaveLength(1);
    expect(chains[0]!.id).toBe(8453);
  });

  it("txUrl builds a BaseScan transaction link", () => {
    expect(txUrl(base, "0xabc123")).toBe("https://basescan.org/tx/0xabc123");
  });

  it("addressUrl builds a BaseScan address link", () => {
    expect(addressUrl(base, "0xdeadbeef")).toBe(
      "https://basescan.org/address/0xdeadbeef",
    );
  });
});