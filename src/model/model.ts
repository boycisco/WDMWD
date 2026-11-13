// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Model interface — provider-independent abstraction (spec §8.1).
 *
 * The agent engine only knows about `Model` and the types below.
 * Adding a new provider (Gemini, Ollama, etc.) means writing a new
 * adapter file; the agent loop does not change.
 */

// ─── Messages ──────────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface TextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AssistantWithToolCalls {
  role: "assistant";
  content: string;
  toolCalls: ToolCall[];
}

export interface ToolResultMessage {
  role: "tool";
  toolCallId: string;
  /** Gemini requires the function name; OpenAI ignores it. */
  toolCallName?: string;
  content: string;
}

export type Message = TextMessage | AssistantWithToolCalls | ToolResultMessage;

// ─── Tool definitions ──────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  /**
   * Opaque replay token emitted by Gemini 3.x thinking models. Must be
   * echoed back verbatim on the same functionCall part in the next turn,
   * or Gemini rejects the request with "Function call is missing a
   * thought_signature". Ignored by other providers.
   *
   * Per Gemini docs: for parallel function calls, only the first
   * functionCall part carries a signature; siblings stay unsigned.
   */
  thoughtSignature?: string;
}

// ─── Inputs / outputs ──────────────────────────────────────────

export interface ModelInput {
  systemPrompt: string;
  messages: Message[];
  tools: ToolDefinition[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export type FinishReason = "stop" | "tool_calls" | "length" | "content_filter" | "unknown";

export interface ModelChunk {
  deltaText?: string;
  deltaToolCall?: {
    index: number;
    id?: string;
    name?: string;
    argumentFragment?: string;
  };
  finishReason?: FinishReason;
}

export interface ModelOutput {
  content: string;
  toolCalls: ToolCall[];
  finishReason: FinishReason;
}

export interface Model {
  generate(input: ModelInput): Promise<ModelOutput>;
  stream(input: ModelInput): AsyncGenerator<ModelChunk, ModelOutput, void>;
}