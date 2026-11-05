/**
 * OpenAI adapter — implements `Model` using the official SDK.
 *
 * Streaming is the primary path: the agent loop consumes `stream()`.
 * `generate()` is implemented by draining `stream()` and accumulating,
 * so there's exactly one place where OpenAI's response is parsed.
 *
 * Errors are wrapped in `AiError` so the agent can distinguish
 * "OpenAI is down" from "blockchain provider is down."
 */

import OpenAI from "openai";
import { AiError } from "@/core/errors";
import { config } from "@/config/config";
import type {
  FinishReason,
  Message,
  Model,
  ModelChunk,
  ModelInput,
  ModelOutput,
  ToolCall,
} from "./model";

// ─── Message conversion ────────────────────────────────────────

function toOpenAIMessages(
  systemPrompt: string,
  messages: Message[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];
  for (const m of messages) {
    if (m.role === "tool") {
      out.push({
        role: "tool",
        tool_call_id: m.toolCallId,
        content: m.content,
      });
    } else if (m.role === "assistant" && "toolCalls" in m && m.toolCalls.length > 0) {
      out.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });
    } else {
      out.push({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      });
    }
  }
  return out;
}

function toOpenAITools(
  tools: ModelInput["tools"],
): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

function normalizeFinishReason(raw: string | null | undefined): FinishReason {
  switch (raw) {
    case "stop":
    case "tool_calls":
    case "length":
    case "content_filter":
      return raw;
    default:
      return "unknown";
  }
}

// ─── Tool call accumulator ─────────────────────────────────────

interface PendingToolCall {
  id: string;
  name: string;
  argumentJson: string;
}

function finalizeToolCalls(pending: Map<number, PendingToolCall>): ToolCall[] {
  const out: ToolCall[] = [];
  for (const [, p] of [...pending.entries()].sort((a, b) => a[0] - b[0])) {
    if (!p.name) continue;
    let parsedArgs: Record<string, unknown> = {};
    if (p.argumentJson.trim().length > 0) {
      try {
        parsedArgs = JSON.parse(p.argumentJson) as Record<string, unknown>;
      } catch {
        throw new AiError(
          `Model returned invalid tool call arguments for "${p.name}"`,
        );
      }
    }
    out.push({ id: p.id || `call_${p.name}`, name: p.name, arguments: parsedArgs });
  }
  return out;
}

// ─── The adapter ────────────────────────────────────────────────

export interface OpenAIModelOptions {
  apiKey?: string;
  /** Inject a client for testing. */
  client?: OpenAI;
}

export function createOpenAIModel(
  opts: OpenAIModelOptions = {},
): Model {
  const apiKey = opts.apiKey ?? config.ai.openaiApiKey;
  if (!apiKey && !opts.client) {
    throw new AiError(
      "OPENAI_API_KEY is not configured. Add it to .env to enable the agent.",
    );
  }
  const client = opts.client ?? new OpenAI({ apiKey: apiKey! });

  return {
    async generate(input: ModelInput): Promise<ModelOutput> {
      const gen = this.stream(input);
      let content = "";
      const toolCalls: ToolCall[] = [];
      for await (const chunk of gen) {
        if (chunk.deltaText) content += chunk.deltaText;
      }
      // Final value is what stream() returns
      const last = await gen.next();
      if (last.done && last.value) {
        return { ...last.value, content: last.value.content || content };
      }
      return { content, toolCalls, finishReason: "unknown" };
    },

    async *stream(input: ModelInput): AsyncGenerator<ModelChunk, ModelOutput> {
      let stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>;
      try {
        stream = await client.chat.completions.create(
          {
            model: input.model,
            messages: toOpenAIMessages(input.systemPrompt, input.messages),
            tools: input.tools.length > 0 ? toOpenAITools(input.tools) : undefined,
            temperature: input.temperature ?? 0.2,
            max_tokens: input.maxTokens,
            stream: true,
          },
          { signal: input.signal },
        );
      } catch (err) {
        throw new AiError(
          `OpenAI request failed: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`,
        );
      }

      let content = "";
      const pending = new Map<number, PendingToolCall>();
      let finishReason: FinishReason = "unknown";

      try {
        for await (const chunk of stream) {
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta;
          if (delta?.content) {
            content += delta.content;
            yield { deltaText: delta.content };
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              const cur = pending.get(idx) ?? {
                id: "",
                name: "",
                argumentJson: "",
              };
              if (tc.id) cur.id = tc.id;
              if (tc.function?.name) cur.name = tc.function.name;
              if (tc.function?.arguments) {
                cur.argumentJson += tc.function.arguments;
              }
              pending.set(idx, cur);
              yield {
                deltaToolCall: {
                  index: idx,
                  id: tc.id,
                  name: tc.function?.name,
                  argumentFragment: tc.function?.arguments,
                },
              };
            }
          }
          if (choice.finish_reason) {
            finishReason = normalizeFinishReason(choice.finish_reason);
            yield { finishReason };
          }
        }
      } catch (err) {
        throw new AiError(
          `OpenAI stream failed: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`,
        );
      }

      const toolCalls = finalizeToolCalls(pending);
      return { content, toolCalls, finishReason };
    },
  };
}