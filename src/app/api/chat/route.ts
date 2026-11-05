/**
 * /api/chat — the primary conversation endpoint (spec §11).
 *
 * POST   — submit a message, stream agent response as SSE
 * GET    — retrieve session history (or list sessions)
 * DELETE — delete a session and dependent records
 *
 * Streaming: uses ReadableStream + SSE. Each event is one
 * `event: <type>\ndata: <json>\n\n` block. See src/chat/stream.ts.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { startAgent } from "@/agent/agent";
import { expandEvent, formatSse } from "@/chat/stream";
import { extractRefs, formatRefsForPrompt } from "@/chat/context";
import {
  addMessage,
  createSession,
  deleteSession,
  getMessages,
  getSession,
  listSessions,
  type StoredMessage,
} from "@/chat/chat";
import { getDb } from "@/store/store";
import type { Message } from "@/model/model";

/** Max request body size. Prevents trivial DoS via huge payloads. */
const MAX_BODY_BYTES = 64 * 1024;

const PostBodySchema = z.object({
  message: z.string().min(1).max(10_000),
  sessionId: z.string().min(1).optional(),
  chainId: z.number().int().positive().optional(),
});

/** How many prior messages to feed the model as context. */
const HISTORY_LIMIT = 20;

function errorJson(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Convert persisted messages into the shape the agent expects.
 * Tool messages are dropped — they require tool-call linkage the
 * persistence layer doesn't currently retain. Follow-up conversations
 * work off the assistant's synthesis text instead.
 */
function toAgentHistory(stored: StoredMessage[]): Message[] {
  const out: Message[] = [];
  for (const m of stored) {
    if (m.role === "user") out.push({ role: "user", content: m.content });
    else if (m.role === "assistant")
      out.push({ role: "assistant", content: m.content });
    else if (m.role === "system")
      out.push({ role: "system", content: m.content });
    // "tool" role: dropped
  }
  return out;
}

// ─── POST ──────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return errorJson(
      413,
      "PAYLOAD_TOO_LARGE",
      `Request body exceeds ${MAX_BODY_BYTES} bytes`,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson(400, "VALIDATION_ERROR", "Invalid JSON body");
  }
  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(
      400,
      "VALIDATION_ERROR",
      "Invalid body: " +
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
    );
  }

  const db = getDb();

  let session;
  try {
    if (parsed.data.sessionId) {
      session = getSession(db, parsed.data.sessionId);
      if (!session) {
        return errorJson(
          404,
          "NOT_FOUND",
          `Session ${parsed.data.sessionId} not found`,
        );
      }
    } else {
      const title =
        parsed.data.message.slice(0, 60).trim() || "New conversation";
      session = createSession(db, title);
    }
    addMessage(db, session.id, "user", parsed.data.message);
  } catch (err) {
    return errorJson(
      500,
      "INTERNAL",
      err instanceof Error ? err.message : "Unknown error",
    );
  }

  // Pull history BEFORE building the stream — so request validation
  // errors surface as HTTP errors, not mid-stream.
  const stored = getMessages(db, session.id, HISTORY_LIMIT);
  // The most-recent entry is the just-added user message; exclude it
  // because `startAgent` will inject it as `userMessage`.
  const priorStored = stored.slice(0, -1);
  const history = toAgentHistory(priorStored);
  const refs = extractRefs(history);
  const refsBlock = formatRefsForPrompt(refs);

  const encoder = new TextEncoder();
  const sessionId = session.id;
  const userMessage = parsed.data.message;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* client disconnected */
        }
      };

      let assistantText = "";
      try {
        const iter = startAgent({
          userMessage,
          history,
          systemPromptSuffix: refsBlock || undefined,
          signal: request.signal,
        });

        for await (const event of iter) {
          for (const sse of expandEvent(event)) {
            send(formatSse(sse));
            if (
              sse.type === "message.delta" &&
              typeof sse.data.delta === "string"
            ) {
              assistantText += sse.data.delta;
            }
          }
          if (event.type === "message.complete") {
            assistantText = event.content || assistantText;
          }
        }

        if (assistantText.length > 0) {
          try {
            addMessage(getDb(), sessionId, "assistant", assistantText);
          } catch {
            /* persistence best-effort; don't kill the stream */
          }
        }

        send(formatSse({ type: "done", data: { sessionId } }));
      } catch (err) {
        send(
          formatSse({
            type: "error",
            data: {
              message: err instanceof Error ? err.message : "Unknown error",
              recoverable: false,
            },
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ─── GET ───────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.min(Number(limitRaw) || 50, 500) : 50;

  const db = getDb();
  if (!sessionId) {
    const sessions = listSessions(db, limit);
    return NextResponse.json({ sessions });
  }
  const session = getSession(db, sessionId);
  if (!session) {
    return errorJson(404, "NOT_FOUND", `Session ${sessionId} not found`);
  }
  const messages = getMessages(db, sessionId, limit);
  return NextResponse.json({ session, messages });
}

// ─── DELETE ────────────────────────────────────────────────────

export async function DELETE(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return errorJson(400, "VALIDATION_ERROR", "sessionId is required");
  }
  const db = getDb();
  const ok = deleteSession(db, sessionId);
  if (!ok) {
    return errorJson(404, "NOT_FOUND", `Session ${sessionId} not found`);
  }
  return NextResponse.json({ deleted: true });
}