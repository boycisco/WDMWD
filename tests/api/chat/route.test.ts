import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentEvent } from "@/agent/loop";
import type { Db } from "@/store/store";

const mockEvents: AgentEvent[] = [];

vi.mock("@/agent/agent", () => ({
  startAgent: vi.fn(() => {
    return (async function* () {
      for (const e of mockEvents) yield e;
    })();
  }),
}));

vi.mock("@/chat/chat", () => ({
  createSession: vi.fn(() => ({
    id: "sess-1",
    title: "t",
    createdAt: 0,
    updatedAt: 0,
  })),
  getSession: vi.fn((_db: unknown, id: string) =>
    id === "sess-1" ? { id, title: "t", createdAt: 0, updatedAt: 0 } : null,
  ),
  listSessions: vi.fn(() => []),
  deleteSession: vi.fn((_db: unknown, id: string) => id === "sess-1"),
  addMessage: vi.fn(),
  getMessages: vi.fn(() => []),
}));

vi.mock("@/store/store", () => ({
  getDb: () => ({} as unknown as Db),
}));

beforeEach(() => {
  mockEvents.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

async function collectSse(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("POST /api/chat", () => {
  it("returns 400 on invalid JSON", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on missing message", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("streams SSE events in order", async () => {
    mockEvents.push(
      { type: "message.start", timestamp: "T0" },
      { type: "turn.start", iteration: 1 },
      { type: "message.delta", delta: "Hello" },
      { type: "message.delta", delta: " world" },
      { type: "message.complete", content: "Hello world" },
    );
    const { POST } = await import("@/app/api/chat/route");
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hi" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const body = await collectSse(res.body!);
    expect(body).toContain("event: message.start");
    expect(body).toContain("event: investigation.start");
    expect(body).toContain('event: message.delta\ndata: {"content":"Hello"}');
    expect(body).toContain("event: message.complete");
    expect(body).toContain("event: done");
    expect(body).toContain("completedAt");
  });

  it("streams tool events and evidence", async () => {
    mockEvents.push(
      { type: "message.start", timestamp: "T0" },
      { type: "turn.start", iteration: 1 },
      {
        type: "tool.start",
        name: "wallet",
        args: { address: "0x4200" },
      },
      {
        type: "tool.result",
        name: "wallet",
        result: {
          ok: true,
          summary: "ok",
          data: {},
          evidence: [
            {
              id: "ev_1",
              chainId: 8453,
              type: "transfer",
              classification: "confirmed",
              data: {},
              source: "test",
              retrievedAt: "2024-01-01T00:00:00.000Z",
            },
            {
              id: "ev_2",
              chainId: 8453,
              type: "transfer",
              classification: "confirmed",
              data: {},
              source: "test",
              retrievedAt: "2024-01-01T00:00:00.000Z",
            },
          ],
        },
      },
      { type: "message.complete", content: "The wallet..." },
    );
    const { POST } = await import("@/app/api/chat/route");
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "investigate" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await collectSse(res.body!);
    expect(body).toContain("event: tool.start");
    expect(body).toContain("event: tool.result");
    expect(body).toContain("event: evidence");
    expect(body).toContain("ev_1");
    expect(body).toContain("ev_2");
  });
});

describe("GET /api/chat", () => {
  it("returns sessions list when no sessionId", async () => {
    const { GET } = await import("@/app/api/chat/route");
    const req = new Request("http://localhost/api/chat");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.sessions)).toBe(true);
  });

  it("returns 404 for unknown session", async () => {
    const { GET } = await import("@/app/api/chat/route");
    const req = new Request("http://localhost/api/chat?sessionId=unknown");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/chat", () => {
  it("returns 400 without sessionId", async () => {
    const { DELETE } = await import("@/app/api/chat/route");
    const req = new Request("http://localhost/api/chat");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deletes a known session", async () => {
    const { DELETE } = await import("@/app/api/chat/route");
    const req = new Request("http://localhost/api/chat?sessionId=sess-1");
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });
});