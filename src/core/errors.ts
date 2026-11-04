/**
 * Structured error hierarchy for WDMWD.
 *
 * Every subsystem (config, chain, agent, api) needs to signal different
 * kinds of failure. API route handlers turn these into HTTP responses;
 * the agent uses them to decide whether a tool failure is retryable.
 *
 * Each error has:
 *  - `code`:       stable machine identifier (safe to log, safe to expose)
 *  - `httpStatus`: default HTTP status for the API layer
 *  - `details`:    structured context, never contains secrets
 *
 * Rules:
 *  - Never include API keys, tokens, or request headers in `message` or `details`.
 *  - `message` must be safe to show to a user (no stack traces, no file paths).
 */

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ─── Configuration ──────────────────────────────────────────────

export class ConfigError extends AppError {
  readonly code = "CONFIG_ERROR";
  readonly httpStatus = 500;
}

// ─── Input validation ───────────────────────────────────────────

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly httpStatus = 400;
}

// ─── Data providers ─────────────────────────────────────────────

export class ProviderError extends AppError {
  // Explicit `: string` prevents TS from narrowing to the literal
  // "PROVIDER_ERROR", which would prevent subclasses from overriding.
  readonly code: string = "PROVIDER_ERROR";
  readonly httpStatus = 502;
}

export class RpcError extends ProviderError {
  override readonly code = "RPC_ERROR";
}

export class IndexerError extends ProviderError {
  override readonly code = "INDEXER_ERROR";
}

export class AiError extends ProviderError {
  override readonly code = "AI_ERROR";
}

// ─── Lookups ────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly httpStatus = 404;
}

// ─── Guardrails ─────────────────────────────────────────────────

export class LimitExceededError extends AppError {
  readonly code = "LIMIT_EXCEEDED";
  readonly httpStatus = 429;
}

export class UnsupportedError extends AppError {
  readonly code = "UNSUPPORTED";
  readonly httpStatus = 400;
}

// ─── Type guard ─────────────────────────────────────────────────

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}