import { EvidenceItem } from '@/types/api';

export interface SSECallbacks {
  onMessageStart?: (data: { id: string; sessionId: string; role: 'assistant'; createdAt: string }) => void;
  onInvestigationStart?: (data: { title: string; steps?: string[] }) => void;
  onToolStart?: (data: { tool: string; label?: string; input?: Record<string, unknown> }) => void;
  onToolResult?: (data: { tool: string; success: boolean; summary?: string; output?: Record<string, unknown> }) => void;
  onEvidence?: (data: { evidence: EvidenceItem }) => void;
  onMessageDelta?: (data: { content: string }) => void;
  onMessageComplete?: (data: { id: string; content: string; status: 'complete'; sessionId: string }) => void;
  onError?: (data: { code: string; message: string }) => void;
  onDone?: (data: { sessionId: string; completedAt: string }) => void;
}

/**
 * Parses Server-Sent Events stream from response body with full handling for:
 * - Incomplete buffer splits across network chunks
 * - Multiple events per chunk
 * - LF and CRLF line endings
 * - AbortController cancellation
 */
export async function consumeSSEStream(
  response: Response,
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported on response body.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by double newline (\n\n or \r\n\r\n)
      const eventRegex = /\r?\n\r?\n/;
      let match: RegExpExecArray | null;

      while ((match = eventRegex.exec(buffer)) !== null) {
        const rawEvent = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);

        if (!rawEvent.trim()) continue;

        processRawSSEBlock(rawEvent, callbacks);
      }
    }

    // Process any trailing event remaining in the buffer
    if (buffer.trim()) {
      processRawSSEBlock(buffer, callbacks);
    }
  } catch (err: unknown) {
    if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
      // Intentional cancellation by user
      return;
    }
    callbacks.onError?.({
      code: 'STREAM_ERROR',
      message: err instanceof Error ? err.message : 'Unknown network stream error occurred.',
    });
    throw err;
  } finally {
    reader.releaseLock();
  }
}

function processRawSSEBlock(block: string, callbacks: SSECallbacks) {
  const lines = block.split(/\r?\n/);
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(':')) {
      // SSE comment / heartbeat ping
      continue;
    }
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return;

  const rawData = dataLines.join('\n');
  let parsedData: any = null;

  try {
    parsedData = JSON.parse(rawData);
  } catch {
    parsedData = { text: rawData };
  }

  switch (eventName) {
    case 'message.start':
      callbacks.onMessageStart?.(parsedData);
      break;
    case 'investigation.start':
      callbacks.onInvestigationStart?.(parsedData);
      break;
    case 'tool.start':
      callbacks.onToolStart?.(parsedData);
      break;
    case 'tool.result':
      callbacks.onToolResult?.(parsedData);
      break;
    case 'evidence':
      callbacks.onEvidence?.(parsedData);
      break;
    case 'message.delta':
      callbacks.onMessageDelta?.(parsedData);
      break;
    case 'message.complete':
      callbacks.onMessageComplete?.(parsedData);
      break;
    case 'error':
      callbacks.onError?.(parsedData);
      break;
    case 'done':
      callbacks.onDone?.(parsedData);
      break;
    default:
      // Fallback for generic event or unstructured data
      if (parsedData.content) {
        callbacks.onMessageDelta?.({ content: parsedData.content });
      }
      break;
  }
}
