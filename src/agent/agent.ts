/**
 * Agent facade — assembles the model, prompt, and loop.
 *
 * Picks the configured provider (Gemini by default, OpenAI if
 * AI_PROVIDER=openai). Reads per-request limits from config.
 */

import { config } from "@/config/config";
import { createOpenAIModel } from "@/model/openai";
import { createGeminiModel } from "@/model/gemini";
import type { Model, Message } from "@/model/model";
import { SYSTEM_PROMPT } from "./prompt";
import { runAgent, type AgentEvent } from "./loop";

export interface StartAgentInput {
  userMessage: string;
  history?: Message[];
  /** Appended after the base system prompt — used to inject context refs. */
  systemPromptSuffix?: string;
  model?: Model;
  signal?: AbortSignal;
}

export function startAgent(input: StartAgentInput): AsyncGenerator<AgentEvent> {
  const model =
    input.model ??
    (config.ai.provider === "gemini"
      ? createGeminiModel()
      : createOpenAIModel());

  const systemPrompt = input.systemPromptSuffix
    ? `${SYSTEM_PROMPT}\n\n${input.systemPromptSuffix}`
    : SYSTEM_PROMPT;

  return runAgent({
    model,
    systemPrompt,
    history: input.history ?? [],
    userMessage: input.userMessage,
    modelName:
      config.ai.provider === "gemini"
        ? config.ai.geminiModel
        : config.ai.openaiModel,
    limits: {
      maxToolCalls: config.limits.maxToolCalls,
      maxAgentIterations: config.limits.maxAgentIterations,
      requestTimeoutMs: config.limits.requestTimeoutMs,
    },
    signal: input.signal,
  });
}

export type { AgentEvent };