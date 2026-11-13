// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it } from "vitest";
import { expandEvent, formatSse, type SseContext } from "@/chat/stream";
import type { Evidence } from "@/evidence/evidence";

const CTX: SseContext = {
  sessionId: "sess-test-123",
  assistantMessageId: "asst-test-456",
};

const sampleEvidence: Evidence = {
  id: "ev_abc123",
  chainId: 8453,
  type: "transfer",
  classification: "confirmed",
  transactionHash: ("0x" + "a".repeat(64)) as `0x${string}`,
  blockNumber: 12345678,
  blockTimestamp: "2024-01-01T00:00:00.000Z",
  addresses: [
    ("0x" + "1".repeat(40)) as `0x${string}`,
    ("0x" + "2".repeat(40)) as `0x${string}`,
  ],
  data: {
    category: "external",
    amountFormatted: "1.5",
    symbol: "ETH",
    direction: "in",
  },
  source: "alchemy:8453",
  retrievedAt: "2024-01-01T00:00:00.000Z",
};

describe("stream — expandEvent", () => {
  it("maps message.start with context IDs", () => {
    const events = expandEvent(
      { type: "message.start", timestamp: "2024-01-01T00:00:00.000Z" },
      CTX,
    );
    expect(events).toEqual([
      {
        type: "message.start",
        data: {
          id: "asst-test-456",
          sessionId: "sess-test-123",
          role: "assistant",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      },
    ]);
  });

  it("maps turn.start on iteration 1 to investigation.start", () => {
    const events = expandEvent({ type: "turn.start", iteration: 1 }, CTX);
    expect(events).toEqual([
      {
        type: "investigation.start",
        data: { title: "Investigating", steps: [] },
      },
    ]);
  });

  it("skips turn.start on iteration 2+ (avoids resetting step list)", () => {
    expect(expandEvent({ type: "turn.start", iteration: 2 }, CTX)).toEqual([]);
    expect(expandEvent({ type: "turn.start", iteration: 3 }, CTX)).toEqual([]);
  });

  it("maps tool.start with tool/input keys", () => {
    const events = expandEvent(
      { type: "tool.start", name: "wallet", args: { address: "0x4200" } },
      CTX,
    );
    expect(events).toEqual([
      {
        type: "tool.start",
        data: { tool: "wallet", input: { address: "0x4200" } },
      },
    ]);
  });

  it("maps tool.result with flattened output and emits evidence events", () => {
    const events = expandEvent(
      {
        type: "tool.result",
        name: "wallet",
        result: {
          ok: true,
          summary: "Investigating wallet",
          data: { investigationId: "inv-1" },
          evidence: [sampleEvidence],
        },
      },
      CTX,
    );

    // Should emit 2 events: tool.result then evidence
    expect(events).toHaveLength(2);

    expect(events[0]!.type).toBe("tool.result");
    expect(events[0]!.data).toEqual({
      tool: "wallet",
      success: true,
      summary: "Investigating wallet",
      output: { investigationId: "inv-1" },
    });

    expect(events[1]!.type).toBe("evidence");
    expect((events[1]!.data as any).evidence.id).toBe("ev_abc123");
    expect((events[1]!.data as any).evidence.classification).toBe("confirmed");
    expect((events[1]!.data as any).evidence.txHash).toBe("0x" + "a".repeat(64));
    expect((events[1]!.data as any).evidence.assetMovement).toBe("+1.5 ETH");
    expect((events[1]!.data as any).evidence.explorerLink).toBe(
      `https://basescan.org/tx/0x${"a".repeat(64)}`,
    );
  });

  it("emits tool.result only when no evidence is present", () => {
    const events = expandEvent(
      {
        type: "tool.result",
        name: "transaction",
        result: { ok: false, summary: "not found" },
      },
      CTX,
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("tool.result");
    expect(events[0]!.data).toMatchObject({
      tool: "transaction",
      success: false,
      summary: "not found",
    });
  });

  it("maps message.delta with content key", () => {
    const events = expandEvent({ type: "message.delta", delta: "Hello" }, CTX);
    expect(events).toEqual([{ type: "message.delta", data: { content: "Hello" } }]);
  });

  it("maps message.complete with id, sessionId, status", () => {
    const events = expandEvent(
      { type: "message.complete", content: "Done" },
      CTX,
    );
    expect(events).toEqual([
      {
        type: "message.complete",
        data: {
          id: "asst-test-456",
          content: "Done",
          status: "complete",
          sessionId: "sess-test-123",
        },
      },
    ]);
  });

  it("maps error with code", () => {
    const events = expandEvent(
      {
        type: "error",
        code: "LIMIT_EXCEEDED",
        message: "Too many calls",
        recoverable: false,
      },
      CTX,
    );
    expect(events).toEqual([
      {
        type: "error",
        data: { code: "LIMIT_EXCEEDED", message: "Too many calls" },
      },
    ]);
  });
});

describe("stream — formatSse", () => {
  it("produces valid SSE block", () => {
    const s = formatSse({
      type: "tool.start",
      data: { tool: "wallet", input: { address: "0x1" } },
    });
    expect(s).toBe(
      'event: tool.start\ndata: {"tool":"wallet","input":{"address":"0x1"}}\n\n',
    );
  });

  it("ends with double newline", () => {
    const s = formatSse({ type: "done", data: {} });
    expect(s.endsWith("\n\n")).toBe(true);
  });
});