// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Agent loop — the tool-calling orchestration.
 *
 * Drives the model through bounded iterations:
 *   1. Call model with system prompt, history, tools.
 *   2. If tool calls returned, execute them, append results, loop.
 *   3. If text only, emit complete and stop.
 *   4. Enforce limits; recover from tool errors.
 *
 * Events are emitted as an async generator so the SSE layer can
 * forward them with zero buffering (spec §12).
 */

import type {
  Message,
  Model,
  ModelChunk,
  ToolCall,
} from "@/model/model";
import { executeTool, toolDefinitions, type ToolResult } from "./tools";

export type AgentEvent =
  | { type: "message.start"; timestamp: string }
  | { type: "turn.start"; iteration: number }
  | { type: "tool.start"; name: string; args: Record<string, unknown> }
  | { type: "tool.result"; name: string; result: ToolResult }
  | { type: "message.delta"; delta: string }
  | { type: "message.complete"; content: string }
  | {
      type: "error";
      /** Structured error code, e.g. "LIMIT_EXCEEDED", "AI_ERROR", "INTERNAL" */
      code: string;
      message: string;
      recoverable: boolean;
    };

export interface RunAgentInput {
  model: Model;
  systemPrompt: string;
  history: Message[];
  userMessage: string;
  modelName: string;
  limits: {
    maxToolCalls: number;
    maxAgentIterations: number;
    requestTimeoutMs: number;
  };
  signal?: AbortSignal;
}

export async function* runAgent(
  input: RunAgentInput,
): AsyncGenerator<AgentEvent, void> {
  const start = Date.now();
  const messages: Message[] = [
    ...input.history,
    { role: "user", content: input.userMessage },
  ];

  let totalToolCalls = 0;
  let iteration = 0;

  yield { type: "message.start", timestamp: new Date().toISOString() };

  while (iteration < input.limits.maxAgentIterations) {
    iteration += 1;
    yield { type: "turn.start", iteration };

    if (Date.now() - start > input.limits.requestTimeoutMs) {
      yield {
        type: "error",
        code: "LIMIT_EXCEEDED",
        message: `Request exceeded ${input.limits.requestTimeoutMs}ms; stopping.`,
        recoverable: false,
      };
      return;
    }

    const stream = input.model.stream({
      systemPrompt: input.systemPrompt,
      messages,
      tools: toolDefinitions,
      model: input.modelName,
      signal: input.signal,
    });

    let turnText = "";
    let finalOutput: { content: string; toolCalls: ToolCall[] } | null = null;

    try {
      let step = await stream.next();
      while (!step.done) {
        const chunk: ModelChunk = step.value;
        if (chunk.deltaText) {
          turnText += chunk.deltaText;
          yield { type: "message.delta", delta: chunk.deltaText };
        }
        step = await stream.next();
      }
      if (step.done && step.value) {
        finalOutput = step.value;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message.split("\n")[0]! : "Model error";
      yield { type: "error", code: "AI_ERROR", message, recoverable: false };
      return;
    }

    if (!finalOutput) {
      yield {
        type: "error",
        code: "INTERNAL",
        message: "Model produced no output",
        recoverable: false,
      };
      return;
    }

    const toolCalls = finalOutput.toolCalls;

    if (toolCalls.length === 0) {
      // Use `turnText` (accumulated deltas — what the SSE client already
      // received) rather than `finalOutput.content` (the model's own
      // accumulator). Some provider SDKs — Gemini 3.x in particular —
      // trim whitespace inconsistently between `.text` and streamed
      // deltas, producing content that doesn't match what was streamed.
      yield {
        type: "message.complete",
        content: turnText || finalOutput.content,
      };
      return;
    }

    if (totalToolCalls + toolCalls.length > input.limits.maxToolCalls) {
      yield {
        type: "error",
        code: "LIMIT_EXCEEDED",
        message: `Exceeded max tool calls (${input.limits.maxToolCalls})`,
        recoverable: false,
      };
      return;
    }

    messages.push({
      role: "assistant",
      content: finalOutput.content,
      toolCalls,
    });

    for (const call of toolCalls) {
      totalToolCalls += 1;
      yield { type: "tool.start", name: call.name, args: call.arguments };
      const result = await executeTool(call.name, call.arguments);
      yield { type: "tool.result", name: call.name, result };
      // Strip evidence from what the model sees — the model only needs
      // the summary and structured data, not the full evidence array
      // (which can be 200+ items after a wallet investigation). Evidence
      // flows separately via the SSE stream to the frontend.
      messages.push({
        role: "tool",
        toolCallId: call.id,
        toolCallName: call.name,
        content: JSON.stringify({
          ok: result.ok,
          summary: result.summary,
          data: result.data,
          error: result.error,
        }),
      });
    }
  }

  yield {
    type: "error",
    code: "LIMIT_EXCEEDED",
    message: `Reached max iterations (${input.limits.maxAgentIterations}). Stopping.`,
    recoverable: false,
  };
}