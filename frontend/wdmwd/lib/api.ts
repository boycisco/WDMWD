import {
  HealthCheckResponse,
  ChatSessionsResponse,
  ChatSessionDetailResponse,
  SendMessagePayload,
  WalletInvestigationResponse,
  SettingsResponse,
  ErrorCode,
} from '@/types/api';
import { consumeSSEStream, SSECallbacks } from './stream';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
  ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '')
  : '';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'The submitted request was malformed or missing required parameters.',
  UNSUPPORTED: 'This query or chain action is currently unsupported on Base Mainnet.',
  NOT_FOUND: 'The requested wallet address, transaction, or session was not found.',
  PAYLOAD_TOO_LARGE: 'Message payload exceeds the allowed size limit.',
  RPC_ERROR: 'Base RPC node encountered a temporary connectivity issue.',
  INDEXER_ERROR: 'Onchain indexer service is temporarily unavailable or syncing.',
  AI_ERROR: 'Onchain intelligence assistant encountered an error processing your query.',
  LIMIT_EXCEEDED: 'Rate limit or resource quota reached. Please wait a moment.',
  CONFIG_ERROR: 'System configuration error. Check settings.',
  INTERNAL: 'An unexpected internal error occurred.',
};

export function getFriendlyErrorMessage(code?: string, defaultMsg?: string): string {
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ErrorCode];
  }
  return defaultMsg || 'An unexpected error occurred while communicating with WDMWD.';
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: string = 'INTERNAL', status: number = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorCode = 'INTERNAL';
    let errorMessage = res.statusText;
    let details: Record<string, unknown> | undefined;

    try {
      const data = await res.json();
      if (data.error) {
        errorCode = data.error.code || errorCode;
        errorMessage = data.error.message || errorMessage;
        details = data.error.details;
      }
    } catch {
      // Non-JSON error response
    }

    throw new ApiError(getFriendlyErrorMessage(errorCode, errorMessage), errorCode, res.status, details);
  }

  return res.json() as Promise<T>;
}

export const api = {
  /**
   * Health status of WDMWD subsystems
   */
  async getHealth(): Promise<HealthCheckResponse> {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<HealthCheckResponse>(res);
  },

  /**
   * List recent chat sessions
   */
  async getSessions(): Promise<ChatSessionsResponse> {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    return handleResponse<ChatSessionsResponse>(res);
  },

  /**
   * Get specific chat session and messages
   */
  async getSession(sessionId: string): Promise<ChatSessionDetailResponse> {
    const res = await fetch(`${API_BASE}/api/chat?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    return handleResponse<ChatSessionDetailResponse>(res);
  },

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/chat?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<{ success: boolean }>(res);
  },

  /**
   * Send a chat message and stream responses via Server-Sent Events
   */
  async sendChatMessage(
    payload: SendMessagePayload,
    callbacks: SSECallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        message: payload.message,
        sessionId: payload.sessionId,
        chainId: payload.chainId ?? 8453,
      }),
      signal,
    });

    if (!res.ok) {
      let errorCode = 'INTERNAL';
      let errorMessage = 'Failed to start chat stream';
      try {
        const data = await res.json();
        if (data.error) {
          errorCode = data.error.code || errorCode;
          errorMessage = data.error.message || errorMessage;
        }
      } catch {
        // Fallback
      }
      const friendly = getFriendlyErrorMessage(errorCode, errorMessage);
      callbacks.onError?.({ code: errorCode, message: friendly });
      throw new ApiError(friendly, errorCode, res.status);
    }

    await consumeSSEStream(res, callbacks, signal);
  },

  /**
   * Direct structured wallet investigation endpoint
   */
  async getWalletInvestigation(
    address: string,
    chainId = 8453,
    limit = 100
  ): Promise<WalletInvestigationResponse> {
    const res = await fetch(
      `${API_BASE}/api/wallet/${encodeURIComponent(address)}?chainId=${chainId}&limit=${limit}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );
    return handleResponse<WalletInvestigationResponse>(res);
  },

  /**
   * Retrieve application settings and subsystem status
   */
  async getSettings(): Promise<SettingsResponse> {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<SettingsResponse>(res);
  },

  /**
   * Update configurable settings
   */
  async updateSettings(config: Partial<SettingsResponse['config']>): Promise<SettingsResponse> {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(config),
    });
    return handleResponse<SettingsResponse>(res);
  },
};
