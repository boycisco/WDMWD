import { describe, expect, it, vi } from "vitest";
import { runAgent, type AgentEvent } from "@/agent/loop";
import type { Model, ModelChunk, ModelOutput } from "@/model/model";

// Mock the wallet module so tool execution never hits Alchemy.
vi.mock("@/wallet/investigate", () => ({
  investigateWallet: vi.fn(async ({ address, chainId }: any) => ({
    id: "inv-test",
    address,
    chainId,
    timestamp: "2024-01-01T00:00:00.000Z",
    profile: {
      chainId,
      address,
      incoming: [],
      outgoing: [],
      summary: {
        incomingCount: 1,
        outgoingCount: 0,
        uniqueIncomingCounterparties: 1,
        uniqueOutgoingCounterparties: 0,
        firstBlock: 100,
        lastBlock: 100,
        totalIncomingBySymbol: { ETH: "1.0" },
        totalOutgoingBySymbol: {},
      },
      topIncomingCounterparties: [],
      topOutgoingCounterparties: [],
      topContracts: [],
    },
    findings: [],
    evidence: [],
  })),
}));

/**
 * Scripted model: pops one response per `stream()` call.
 * Each response is either text or a list of tool calls.
 */
function scriptedModel(
  responses: Array<{
    text?: string;
    toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  }>,
): Model {
  let i = 0;
  return {
    async generate(): Promise<ModelOutput> {
      throw new Error("generate not used in loop tests");
    },
    async *stream(): AsyncGenerator<ModelChunk, ModelOutput> {
      const resp = responses[i++] ?? { text: "fallback" };
      if (resp.text) yield { deltaText: resp.text };
      return {
        content: resp.text ?? "",
        toolCalls: (resp.toolCalls ?? []).map((tc, j) => ({
          id: `call_${j}`,
          name: tc.name,
          arguments: tc.args,
        })),
        finishReason: resp.toolCalls ? "tool_calls" : "stop",
      };
    },
  };
}

const LIMITS = {
  maxToolCalls: 5,
  maxAgentIterations: 4,
  requestTimeoutMs: 10000,
};

async function drain(gen: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

const ADDR = "0x4200000000000000000000000000000000000010";

describe("agent loop", () => {
  it("returns text-only response in one turn", async () => {
    const model = scriptedModel([{ text: "Hello, I am WDMWD." }]);
    const events = await drain(
      runAgent({
        model,
        systemPrompt: "sys",
        history: [],
        userMessage: "hi",
        modelName: "test",
        limits: LIMITS,
      }),
    );
    const complete = events.find((e) => e.type === "message.complete");
    expect(complete).toBeDefined();
    if (complete?.type === "message.complete") {
      expect(complete.content).toBe("Hello, I am WDMWD.");
    }
    expect(events.filter((e) => e.type === "turn.start")).toHaveLength(1);
  });

  it("executes a tool call and continues", async () => {
    const model = scriptedModel([
      { toolCalls: [{ name: "wallet", args: { address: ADDR } }] },
      { text: "The wallet has activity." },
    ]);
    const events = await drain(
      runAgent({
        model,
        systemPrompt: "sys",
        history: [],
        userMessage: "investigate",
        modelName: "test",
        limits: LIMITS,
      }),
    );
    expect(events.find((e) => e.type === "tool.start")).toBeDefined();
    expect(events.find((e) => e.type === "tool.result")).toBeDefined();
    expect(events.find((e) => e.type === "message.complete")).toBeDefined();
    expect(events.filter((e) => e.type === "turn.start")).toHaveLength(2);
  });

  it("stops at max iterations", async () => {
    const model = scriptedModel(
      Array.from({ length: 10 }, () => ({
        toolCalls: [{ name: "wallet", args: { address: ADDR } }],
      })),
    );
    const events = await drain(
      runAgent({
        model,
        systemPrompt: "sys",
        history: [],
        userMessage: "loop forever",
        modelName: "test",
        limits: { ...LIMITS, maxAgentIterations: 3, maxToolCalls: 100 },
      }),
    );
    const error = events.find((e) => e.type === "error");
    expect(error).toBeDefined();
    if (error?.type === "error") {
      expect(error.message).toMatch(/max iterations/i);
    }
    expect(events.filter((e) => e.type === "turn.start")).toHaveLength(3);
  });

  it("stops at max tool calls", async () => {
    const model = scriptedModel([
      {
        toolCalls: [
          { name: "wallet", args: { address: ADDR } },
          {
            name: "wallet",
            args: { address: "0x4200000000000000000000000000000000000011" },
          },
        ],
      },
    ]);
    const events = await drain(
      runAgent({
        model,
        systemPrompt: "sys",
        history: [],
        userMessage: "many tools",
        modelName: "test",
        limits: { ...LIMITS, maxToolCalls: 1 },
      }),
    );
    const error = events.find((e) => e.type === "error");
    expect(error).toBeDefined();
    if (error?.type === "error") {
      expect(error.message).toMatch(/max tool calls/i);
    }
  });

  it("emits message.start before turn.start", async () => {
    const model = scriptedModel([{ text: "hi" }]);
    const events = await drain(
      runAgent({
        model,
        systemPrompt: "sys",
        history: [],
        userMessage: "test",
        modelName: "test",
        limits: LIMITS,
      }),
    );
    const start = events.findIndex((e) => e.type === "message.start");
    const turn = events.findIndex((e) => e.type === "turn.start");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(turn).toBeGreaterThan(start);
  });

  it("preserves text deltas as message.delta events", async () => {
    const model = scriptedModel([{ text: "Hello there" }]);
    const events = await drain(
      runAgent({
        model,
        systemPrompt: "sys",
        history: [],
        userMessage: "test",
        modelName: "test",
        limits: LIMITS,
      }),
    );
    const deltas = events.filter((e) => e.type === "message.delta");
    expect(deltas.length).toBeGreaterThan(0);
    const combined = deltas
      .map((e) => (e.type === "message.delta" ? e.delta : ""))
      .join("");
    expect(combined).toBe("Hello there");
  });
});