// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, it, vi } from "vitest";
import { AiError } from "@/core/errors";
import { createGeminiModel } from "@/model/gemini";

function mockClient(chunks: any[][]): any {
  let callIdx = 0;
  return {
    models: {
      generateContentStream: vi.fn(async () => {
        const c = chunks[callIdx++] ?? [];
        return (async function* () {
          for (const chunk of c) yield chunk;
        })();
      }),
    },
  };
}

describe("gemini adapter — streaming", () => {
  it("accumulates plain text", async () => {
    const client = mockClient([[{ text: "Hello " }, { text: "world" }]]);
    const model = createGeminiModel({ client });
    const gen = model.stream({
      systemPrompt: "s",
      messages: [{ role: "user", content: "hi" }],
      tools: [],
      model: "gemini-3.6-flash",
    });
    let content = "";
    let step = await gen.next();
    while (!step.done) {
      if (step.value.deltaText) content += step.value.deltaText;
      step = await gen.next();
    }
    expect(content).toBe("Hello world");
    expect(step.value!.content).toBe("Hello world");
    expect(step.value!.toolCalls).toHaveLength(0);
    expect(step.value!.finishReason).toBe("stop");
  });

  it("emits full tool calls (via candidates.parts)", async () => {
    const client = mockClient([
      [
        {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "wallet",
                      args: {
                        address:
                          "0x4200000000000000000000000000000000000010",
                      },
                      id: "call_1",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    ]);
    const model = createGeminiModel({ client });
    const gen = model.stream({
      systemPrompt: "s",
      messages: [{ role: "user", content: "investigate" }],
      tools: [],
      model: "gemini-3.6-flash",
    });
    let step = await gen.next();
    while (!step.done) step = await gen.next();
    const out = step.value!;
    expect(out.toolCalls).toHaveLength(1);
    expect(out.toolCalls[0]!.name).toBe("wallet");
    expect(out.toolCalls[0]!.arguments).toEqual({
      address: "0x4200000000000000000000000000000000000010",
    });
    expect(out.finishReason).toBe("tool_calls");
  });

  it("preserves thoughtSignature across turns (Gemini 3.x)", async () => {
    const capturedContents: unknown[] = [];
    let callIdx = 0;
    const client: any = {
      models: {
        generateContentStream: vi.fn(
          async ({ contents }: { contents: unknown }) => {
            capturedContents.push(contents);
            const chunks =
              callIdx++ === 0
                ? [
                    {
                      candidates: [
                        {
                          content: {
                            parts: [
                              {
                                functionCall: {
                                  name: "wallet",
                                  args: {
                                    address:
                                      "0x4200000000000000000000000000000000000010",
                                  },
                                  id: "call_1",
                                },
                                thoughtSignature: "SIG_OPAQUE_ABC",
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ]
                : [{ text: "The wallet has activity." }];
            return (async function* () {
              for (const c of chunks) yield c;
            })();
          },
        ),
      },
    };

    const model = createGeminiModel({ client });

    // Turn 1: model returns a functionCall + signature.
    const gen1 = model.stream({
      systemPrompt: "s",
      messages: [{ role: "user", content: "investigate" }],
      tools: [],
      model: "gemini-3.6-flash",
    });
    let step = await gen1.next();
    while (!step.done) step = await gen1.next();
    const out1 = step.value!;
    expect(out1.toolCalls).toHaveLength(1);
    expect(out1.toolCalls[0]!.thoughtSignature).toBe("SIG_OPAQUE_ABC");

    // Turn 2: replay the assistant turn. Adapter must echo the signature
    // back as a sibling field on the functionCall part.
    const gen2 = model.stream({
      systemPrompt: "s",
      messages: [
        { role: "user", content: "investigate" },
        {
          role: "assistant",
          content: "",
          toolCalls: out1.toolCalls,
        },
        {
          role: "tool",
          toolCallId: "call_1",
          toolCallName: "wallet",
          content: JSON.stringify({ ok: true, summary: "ok", data: {} }),
        },
      ],
      tools: [],
      model: "gemini-3.6-flash",
    });
    step = await gen2.next();
    while (!step.done) step = await gen2.next();

    // Inspect the second outbound request.
    const secondContents = capturedContents[1] as Array<{
      role: string;
      parts: Array<Record<string, unknown>>;
    }>;
    const modelTurn = secondContents.find((c) => c.role === "model");
    expect(modelTurn).toBeDefined();
    const fnPart = modelTurn!.parts.find((p) => "functionCall" in p);
    expect(fnPart).toBeDefined();
    expect(fnPart!.thoughtSignature).toBe("SIG_OPAQUE_ABC");
  });

  it("throws AiError on Gemini error", async () => {
    const badClient: any = {
      models: {
        generateContentStream: vi.fn(async () => {
          throw new Error("Rate limited");
        }),
      },
    };
    const model = createGeminiModel({ client: badClient });
    const gen = model.stream({
      systemPrompt: "s",
      messages: [{ role: "user", content: "hi" }],
      tools: [],
      model: "gemini-3.6-flash",
    });
    await expect(gen.next()).rejects.toThrow(AiError);
  });

  it("throws AiError if no API key and no client", () => {
    expect(() => createGeminiModel({ apiKey: "" })).toThrow(AiError);
  });
});