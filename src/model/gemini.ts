/**
 * Gemini adapter — implements `Model` using @google/genai (spec §8.1).
 *
 * Key Gemini details handled here:
 *   1. Role "assistant" → "model".
 *   2. Tool calls arrive as `functionCalls` (not `tool_calls`).
 *   3. Tool results go back as `functionResponse` parts inside a "user" turn.
 *   4. Gemini does NOT stream partial function-call arguments.
 *   5. Gemini 3.x thinking models attach an opaque `thoughtSignature` to
 *      each functionCall part. When manually reconstructing history, we
 *      must echo it back as a sibling field on the same part, or Gemini
 *      rejects the next turn with 400 "missing thought_signature".
 *
 * Transient 503/429 errors are retried with exponential backoff per
 * Google's official guidance.
 */

import { GoogleGenAI, type Content, type Part } from "@google/genai";
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

// ─── Retry helpers ─────────────────────────────────────────────

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status === 503 || status === 429) return true;
  const code = (err as { code?: number }).code;
  return code === 503 || code === 429;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxAttempts) throw err;
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}

// ─── Message conversion ────────────────────────────────────────

function toGeminiContents(messages: Message[]): {
  contents: Content[];
  systemInstruction: string | undefined;
} {
  const contents: Content[] = [];
  let systemInstruction: string | undefined;

  for (const m of messages) {
    if (m.role === "system") {
      systemInstruction = m.content;
      continue;
    }
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
      continue;
    }
    if (m.role === "tool") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(m.content);
      } catch {
        parsed = { error: "invalid tool result", raw: m.content };
      }
      const part: Part = {
        functionResponse: {
          name: m.toolCallName ?? m.toolCallId,
          response: { result: parsed },
          id: m.toolCallId,
        },
      };
      contents.push({ role: "user", parts: [part] });
      continue;
    }

    // Assistant / model turn
    const parts: Part[] = [];
    if (m.content.length > 0) parts.push({ text: m.content });
    if ("toolCalls" in m && m.toolCalls.length > 0) {
      for (const tc of m.toolCalls) {
        const part: Part = {
          functionCall: { name: tc.name, args: tc.arguments, id: tc.id },
        };
        if (tc.thoughtSignature) {
          // Sibling field per Gemini docs. Parallel siblings that were
          // returned unsigned stay unsigned — do not synthesize one.
          part.thoughtSignature = tc.thoughtSignature;
        }
        parts.push(part);
      }
    }
    if (parts.length > 0) contents.push({ role: "model", parts });
  }
  return { contents, systemInstruction };
}

function toGeminiTools(tools: ModelInput["tools"]) {
  if (tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parametersJsonSchema: t.parameters,
      })),
    },
  ];
}

// ─── Public interface ──────────────────────────────────────────

export interface GeminiModelOptions {
  apiKey?: string;
  client?: GoogleGenAI; // test injection
}

export function createGeminiModel(opts: GeminiModelOptions = {}): Model {
  const apiKey = opts.apiKey ?? config.ai.geminiApiKey;
  if (!apiKey && !opts.client) {
    throw new AiError(
      "GEMINI_API_KEY is not configured. Add it to .env to enable the agent.",
    );
  }
  const ai = opts.client ?? new GoogleGenAI({ apiKey: apiKey! });

  return {
    async generate(input: ModelInput): Promise<ModelOutput> {
      const gen = this.stream(input);
      let content = "";
      let step = await gen.next();
      while (!step.done) {
        if (step.value.deltaText) content += step.value.deltaText;
        step = await gen.next();
      }
      return step.value ?? { content, toolCalls: [], finishReason: "unknown" };
    },

    async *stream(input: ModelInput): AsyncGenerator<ModelChunk, ModelOutput> {
      const { contents, systemInstruction } = toGeminiContents([
        { role: "system", content: input.systemPrompt },
        ...input.messages,
      ]);
      const tools = toGeminiTools(input.tools);

      let response: AsyncIterable<unknown>;
      try {
        response = await withRetry(() =>
          ai.models.generateContentStream({
            model: input.model,
            contents,
            config: {
              systemInstruction,
              tools,
              temperature: input.temperature ?? 0.2,
              maxOutputTokens: input.maxTokens,
            },
          }),
        );
      } catch (err) {
        throw new AiError(
          `Gemini request failed: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`,
        );
      }

      let content = "";
      const toolCalls: ToolCall[] = [];

      try {
        for await (const chunk of response) {
          const c = chunk as {
            text?: string;
            functionCalls?: Array<{
              name: string;
              args?: Record<string, unknown>;
              id?: string;
            }>;
            candidates?: Array<{
              content?: {
                parts?: Array<{
                  text?: string;
                  functionCall?: {
                    name: string;
                    args?: Record<string, unknown>;
                    id?: string;
                  };
                  thoughtSignature?: string;
                }>;
              };
            }>;
          };

          if (c.text) {
            content += c.text;
            yield { deltaText: c.text };
          }

          // Prefer the raw `candidates[0].content.parts` path because it
          // preserves `thoughtSignature` on each functionCall part. The
          // convenience `.functionCalls` accessor strips it.
          const parts = c.candidates?.[0]?.content?.parts;
          if (parts) {
            for (let i = 0; i < parts.length; i++) {
              const p = parts[i]!;
              if (!p.functionCall) continue;
              const fc = p.functionCall;
              yield {
                deltaToolCall: {
                  index: i,
                  id: fc.id,
                  name: fc.name,
                  argumentFragment: JSON.stringify(fc.args ?? {}),
                },
              };
              toolCalls.push({
                id: fc.id ?? `call_${i}_${fc.name}`,
                name: fc.name,
                arguments: (fc.args ?? {}) as Record<string, unknown>,
                thoughtSignature: p.thoughtSignature,
              });
            }
          } else if (c.functionCalls) {
            for (let i = 0; i < c.functionCalls.length; i++) {
              const fc = c.functionCalls[i]!;
              yield {
                deltaToolCall: {
                  index: i,
                  id: fc.id,
                  name: fc.name,
                  argumentFragment: JSON.stringify(fc.args ?? {}),
                },
              };
              toolCalls.push({
                id: fc.id ?? `call_${i}_${fc.name}`,
                name: fc.name,
                arguments: (fc.args ?? {}) as Record<string, unknown>,
              });
            }
          }
        }
      } catch (err) {
        throw new AiError(
          `Gemini stream failed: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`,
        );
      }

      const finishReason: FinishReason =
        toolCalls.length > 0 ? "tool_calls" : "stop";
      yield { finishReason };
      return { content, toolCalls, finishReason };
    },
  };
}