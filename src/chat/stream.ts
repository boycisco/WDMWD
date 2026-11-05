/**
 * SSE formatting — convert AgentEvent to wire format (spec §12).
 *
 * Wire format:
 *   event: <type>\n
 *   data: <json>\n
 *   \n
 *
 * Event types per spec §12: message.start, investigation.start,
 * tool.start, tool.result, evidence, message.delta, message.complete,
 * error. Plus our extension `done` for clean termination.
 *
 * The frontend must not need to understand any provider-specific
 * streaming format — this is our own shape, documented and stable.
 */

import type { AgentEvent } from "@/agent/loop";

export type SseEventType =
  | "message.start"
  | "investigation.start"
  | "tool.start"
  | "tool.result"
  | "evidence"
  | "message.delta"
  | "message.complete"
  | "error"
  | "done";

export interface SseEvent {
  type: SseEventType;
  data: Record<string, unknown>;
}

/**
 * Convert an AgentEvent into one or more SSE events.
 * - `turn.start` becomes `investigation.start` (spec §12 name).
 * - `tool.result` with evidence IDs also emits an `evidence` event.
 */
export function expandEvent(event: AgentEvent): SseEvent[] {
  switch (event.type) {
    case "message.start":
      return [{ type: "message.start", data: { timestamp: event.timestamp } }];
    case "turn.start":
      return [
        { type: "investigation.start", data: { iteration: event.iteration } },
      ];
    case "tool.start":
      return [
        { type: "tool.start", data: { name: event.name, args: event.args } },
      ];
    case "tool.result": {
      const out: SseEvent[] = [
        {
          type: "tool.result",
          data: { name: event.name, result: event.result },
        },
      ];
      const data = event.result.data as Record<string, unknown> | undefined;
      if (
        data &&
        Array.isArray(data.evidenceIds) &&
        data.evidenceIds.length > 0
      ) {
        out.push({
          type: "evidence",
          data: {
            source: event.name,
            evidenceIds: data.evidenceIds,
          },
        });
      }
      return out;
    }
    case "message.delta":
      return [{ type: "message.delta", data: { delta: event.delta } }];
    case "message.complete":
      return [
        { type: "message.complete", data: { content: event.content } },
      ];
    case "error":
      return [
        {
          type: "error",
          data: { message: event.message, recoverable: event.recoverable },
        },
      ];
  }
}

export function formatSse(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}