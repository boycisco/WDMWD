import { describe, expect, it } from "vitest";
import { expandEvent, formatSse } from "@/chat/stream";

describe("stream — expandEvent", () => {
  it("maps message.start", () => {
    const events = expandEvent({
      type: "message.start",
      timestamp: "2024-01-01T00:00:00Z",
    });
    expect(events).toEqual([
      { type: "message.start", data: { timestamp: "2024-01-01T00:00:00Z" } },
    ]);
  });

  it("maps turn.start to investigation.start", () => {
    const events = expandEvent({ type: "turn.start", iteration: 1 });
    expect(events).toEqual([
      { type: "investigation.start", data: { iteration: 1 } },
    ]);
  });

  it("maps message.delta", () => {
    const events = expandEvent({ type: "message.delta", delta: "hi" });
    expect(events).toEqual([
      { type: "message.delta", data: { delta: "hi" } },
    ]);
  });

  it("emits evidence event when tool result has evidenceIds", () => {
    const events = expandEvent({
      type: "tool.result",
      name: "wallet",
      result: {
        ok: true,
        summary: "ok",
        data: { evidenceIds: ["ev_1", "ev_2"] },
      },
    });
    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe("tool.result");
    expect(events[1]!.type).toBe("evidence");
    expect(events[1]!.data).toEqual({
      source: "wallet",
      evidenceIds: ["ev_1", "ev_2"],
    });
  });

  it("emits only tool.result when no evidenceIds", () => {
    const events = expandEvent({
      type: "tool.result",
      name: "wallet",
      result: { ok: true, summary: "ok", data: {} },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("tool.result");
  });

  it("maps message.complete", () => {
    const events = expandEvent({
      type: "message.complete",
      content: "done",
    });
    expect(events).toEqual([
      { type: "message.complete", data: { content: "done" } },
    ]);
  });

  it("maps error", () => {
    const events = expandEvent({
      type: "error",
      message: "boom",
      recoverable: true,
    });
    expect(events).toEqual([
      { type: "error", data: { message: "boom", recoverable: true } },
    ]);
  });
});

describe("stream — formatSse", () => {
  it("produces valid SSE block", () => {
    const s = formatSse({
      type: "tool.start",
      data: { name: "wallet", args: { address: "0x1" } },
    });
    expect(s).toBe(
      'event: tool.start\ndata: {"name":"wallet","args":{"address":"0x1"}}\n\n',
    );
  });

  it("ends with double newline", () => {
    const s = formatSse({ type: "done", data: {} });
    expect(s.endsWith("\n\n")).toBe(true);
  });
});