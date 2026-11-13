// SPDX-License-Identifier: AGPL-3.0-only
/**
 * SSE formatting — convert AgentEvent to the frontend's expected
 * wire format.
 *
 * The frontend's contract (see `src/types/api.ts` in the browser app)
 * differs from the internal AgentEvent shape in several ways:
 *   - `message.start` carries sessionId + assistant message ID
 *   - `investigation.start` replaces `turn.start` (and only on iteration 1)
 *   - `tool.start` / `tool.result` use `tool`/`input`/`output` key names
 *   - `evidence` fires ONE event per EvidenceItem (frontend expects full
 *     items, not just IDs)
 *   - `message.delta` uses `content`, not `delta`
 *   - `message.complete` carries IDs and sessionId
 *   - `error` carries a structured `code`
 *   - `done` carries `completedAt`
 *
 * The SSE wire format is documented in `docs/api.md`.
 */

import type { AgentEvent } from "@/agent/loop";
import { toFrontendEvidenceItem } from "@/evidence/item";

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
 * Context passed into the formatter — the route generates these IDs
 * once and reuses them across events for the same assistant turn.
 */
export interface SseContext {
  sessionId: string;
  assistantMessageId: string;
}

/**
 * Convert an AgentEvent into one or more SSE events matching the
 * frontend's expected contract. Context provides the session and
 * message IDs needed by `message.start` and `message.complete`.
 */
export function expandEvent(
  event: AgentEvent,
  context: SseContext,
): SseEvent[] {
  switch (event.type) {
    case "message.start":
      return [
        {
          type: "message.start",
          data: {
            id: context.assistantMessageId,
            sessionId: context.sessionId,
            role: "assistant",
            createdAt: event.timestamp,
          },
        },
      ];

    case "turn.start":
      // Only the FIRST turn signals the start of a new investigation.
      // Subsequent turns are continuations (tool → synthesis), which the
      // frontend builds incrementally from tool.start/tool.result events.
      // Emitting investigation.start again on iteration 2 would reset the
      // accumulated step list on the frontend.
      if (event.iteration === 1) {
        return [
          {
            type: "investigation.start",
            data: { title: "Investigating", steps: [] },
          },
        ];
      }
      return [];

    case "tool.start":
      return [
        {
          type: "tool.start",
          data: { tool: event.name, input: event.args },
        },
      ];

    case "tool.result": {
      const output: SseEvent[] = [
        {
          type: "tool.result",
          data: {
            tool: event.name,
            success: event.result.ok,
            summary: event.result.summary,
            output: event.result.data,
          },
        },
      ];
      // Emit one evidence event per EvidenceItem. The frontend's handler
      // pushes each one to the message's evidence array.
      if (event.result.evidence && event.result.evidence.length > 0) {
        for (const ev of event.result.evidence) {
          output.push({
            type: "evidence",
            data: { evidence: toFrontendEvidenceItem(ev) },
          });
        }
      }
      return output;
    }

    case "message.delta":
      return [{ type: "message.delta", data: { content: event.delta } }];

    case "message.complete":
      return [
        {
          type: "message.complete",
          data: {
            id: context.assistantMessageId,
            content: event.content,
            status: "complete",
            sessionId: context.sessionId,
          },
        },
      ];

    case "error":
      return [
        {
          type: "error",
          data: { code: event.code, message: event.message },
        },
      ];
  }
}

/** Serialize an SseEvent to the SSE wire format. */
export function formatSse(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}