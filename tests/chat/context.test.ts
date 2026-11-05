import { describe, expect, it } from "vitest";
import { extractRefs, formatRefsForPrompt } from "@/chat/context";
import type { Message } from "@/model/model";
import type { Address, TxHash } from "@/core/types";

describe("context — extractRefs", () => {
  it("extracts an address from a user message", () => {
    const history: Message[] = [
      {
        role: "user",
        content: "Investigate 0x4200000000000000000000000000000000000010 please",
      },
    ];
    const refs = extractRefs(history);
    expect(refs.addresses).toEqual([
      "0x4200000000000000000000000000000000000010",
    ]);
    expect(refs.transactions).toEqual([]);
  });

  it("extracts a tx hash without misidentifying it as an address", () => {
    const tx = "0x" + "a".repeat(64);
    const history: Message[] = [{ role: "user", content: `What is ${tx}?` }];
    const refs = extractRefs(history);
    expect(refs.transactions).toEqual([tx]);
    expect(refs.addresses).toEqual([]);
  });

  it("orders most-recent first and deduplicates", () => {
    const a1 = "0x" + "1".repeat(40);
    const a2 = "0x" + "2".repeat(40);
    const history: Message[] = [
      { role: "user", content: `first ${a1}` },
      { role: "assistant", content: `ok` },
      { role: "user", content: `then ${a2}, and ${a1} again` },
    ];
    const refs = extractRefs(history);
    expect(refs.addresses).toEqual([a2, a1]);
  });

  it("lowercases addresses", () => {
    const addr = "0xABC0000000000000000000000000000000000001";
    const history: Message[] = [{ role: "user", content: addr }];
    expect(extractRefs(history).addresses).toEqual([addr.toLowerCase()]);
  });

  it("ignores tool messages", () => {
    const history: Message[] = [
      {
        role: "tool",
        toolCallId: "t1",
        content: "0x" + "9".repeat(40),
      },
    ];
    expect(extractRefs(history).addresses).toEqual([]);
  });

  it("returns empty refs for empty history", () => {
    expect(extractRefs([])).toEqual({ addresses: [], transactions: [] });
  });
});

describe("context — formatRefsForPrompt", () => {
  it("returns empty string when no refs", () => {
    expect(formatRefsForPrompt({ addresses: [], transactions: [] })).toBe("");
  });

  it("formats addresses with numbered list", () => {
    const out = formatRefsForPrompt({
      addresses: [
        "0x" + "1".repeat(40),
        "0x" + "2".repeat(40),
      ] as Address[],
      transactions: [],
    });
    expect(out).toContain("## Resolved references");
    expect(out).toContain("1. 0x");
    expect(out).toContain("2. 0x");
  });

  it("formats transactions separately", () => {
    const out = formatRefsForPrompt({
      addresses: [],
      transactions: ["0x" + "a".repeat(64)] as TxHash[],
    });
    expect(out).toContain("Transactions:");
    expect(out).toContain("0x" + "a".repeat(64));
  });
});