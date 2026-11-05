/**
 * Centralised, validated application configuration.
 *
 * Every other module imports `config` from here. Nothing reads
 * `process.env` directly outside this file, and nothing hardcodes
 * ports, model names, API keys or chain URLs.
 *
 * Rules:
 *  - Fail fast: an invalid environment throws `ConfigError` at import time.
 *  - Never log secrets: use `safeConfig()` when you need a printable copy.
 *  - Optional vs required: BASE_RPC_URL and OPENAI_API_KEY are optional
 *    in development and required in production (enforced below).
 */

import { z } from "zod";
import { ConfigError } from "@/core/errors";

// ─── Primitive parsers ──────────────────────────────────────────

const BoolFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((v) =>
    typeof v === "boolean" ? v : v.toLowerCase() === "true" || v === "1",
  );

const IntFromEnv = (opts: { min?: number; max?: number } = {}) =>
  z
    .union([z.number(), z.string().min(1)])
    .transform((v) => (typeof v === "number" ? v : Number(v)))
    .pipe(
      z
        .number()
        .int()
        .min(opts.min ?? 0)
        .max(opts.max ?? Number.MAX_SAFE_INTEGER),
    );

// ─── Schema ─────────────────────────────────────────────────────

const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: IntFromEnv({ min: 1, max: 65535 }).default(3000),
    HOST: z.string().min(1).default("127.0.0.1"),

    DATABASE_URL: z.string().min(1).default("file:./data/wdmwd.db"),

    BASE_RPC_URL: z.string().url().optional(),
    ALCHEMY_API_KEY: z.string().min(1).optional(),

    AI_PROVIDER: z.enum(["openai", "gemini"]).default("gemini"),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),

    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-3.6-flash"),

    MAX_TOOL_CALLS: IntFromEnv({ min: 1, max: 100 }).default(8),
    MAX_AGENT_ITERATIONS: IntFromEnv({ min: 1, max: 100 }).default(6),
    MAX_TRACE_DEPTH: IntFromEnv({ min: 1, max: 20 }).default(5),
    REQUEST_TIMEOUT: IntFromEnv({ min: 1_000, max: 600_000 }).default(60_000),

    REMOTE_ACCESS: BoolFromEnv.default(false),
  })
  .superRefine((env, ctx) => {
    // Public binding requires explicit opt-in (spec §13).
    const publicHosts = new Set(["0.0.0.0", "::", "*"]);
    if (publicHosts.has(env.HOST) && !env.REMOTE_ACCESS) {
      ctx.addIssue({
        code: "custom",
        message: `HOST=${env.HOST} requires REMOTE_ACCESS=true (see SECURITY.md)`,
        path: ["HOST"],
      });
    }

    // Production requires real provider credentials.
    if (env.NODE_ENV === "production") {
      if (env.AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
        ctx.addIssue({
          code: "custom",
          message: "OPENAI_API_KEY is required when AI_PROVIDER=openai",
          path: ["OPENAI_API_KEY"],
        });
      }
      if (env.AI_PROVIDER === "gemini" && !env.GEMINI_API_KEY) {
        ctx.addIssue({
          code: "custom",
          message: "GEMINI_API_KEY is required when AI_PROVIDER=gemini",
          path: ["GEMINI_API_KEY"],
        });
      }
      if (!env.BASE_RPC_URL && !env.ALCHEMY_API_KEY) {
        ctx.addIssue({
          code: "custom",
          message:
            "BASE_RPC_URL or ALCHEMY_API_KEY is required in production",
          path: ["BASE_RPC_URL"],
        });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

// ─── Public shape ───────────────────────────────────────────────

export interface AppConfig {
  env: Env["NODE_ENV"];
  server: {
    port: number;
    host: string;
    remote: boolean;
  };
  database: {
    url: string;
  };
  chain: {
    baseRpcUrl?: string;
    alchemyApiKey?: string;
  };
  ai: {
    provider: Env["AI_PROVIDER"];
    openaiApiKey?: string;
    openaiModel: string;
    geminiApiKey?: string;
    geminiModel: string;
  };
  limits: {
    maxToolCalls: number;
    maxAgentIterations: number;
    maxTraceDepth: number;
    requestTimeoutMs: number;
  };
}

// ─── Loader ─────────────────────────────────────────────────────

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): AppConfig {
  // `.env` files commonly carry empty placeholders like `OPENAI_API_KEY=`
  // for values that are intentionally unset. Zod's `.optional()` only
  // allows `undefined`, not `""`, so we normalize here: an env var that
  // is present but empty is semantically identical to "not set."
  const cleaned: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    cleaned[key] = value === "" ? undefined : value;
  }

  const parsed = EnvSchema.safeParse(cleaned);
  if (!parsed.success) {
    const summary = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new ConfigError(
      `Invalid configuration — ${summary}`,
      parsed.error.issues,
    );
  }
  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    server: { port: e.PORT, host: e.HOST, remote: e.REMOTE_ACCESS },
    database: { url: e.DATABASE_URL },
    chain: { baseRpcUrl: e.BASE_RPC_URL, alchemyApiKey: e.ALCHEMY_API_KEY },
    ai: {
      provider: e.AI_PROVIDER,
      openaiApiKey: e.OPENAI_API_KEY,
      openaiModel: e.OPENAI_MODEL,
      geminiApiKey: e.GEMINI_API_KEY,
      geminiModel: e.GEMINI_MODEL,
    },
    limits: {
      maxToolCalls: e.MAX_TOOL_CALLS,
      maxAgentIterations: e.MAX_AGENT_ITERATIONS,
      maxTraceDepth: e.MAX_TRACE_DEPTH,
      requestTimeoutMs: e.REQUEST_TIMEOUT,
    },
  };
}

/** Cached singleton, created on first import. */
export const config: AppConfig = loadConfig();

// ─── Safe projection ────────────────────────────────────────────

export interface SafeAppConfig {
  env: Env["NODE_ENV"];
  server: AppConfig["server"];
  database: AppConfig["database"];
  chain: { baseRpcUrl?: string; alchemyApiKeyConfigured: boolean };
  ai: {
    provider: Env["AI_PROVIDER"];
    openaiApiKeyConfigured: boolean;
    openaiModel: string;
    geminiApiKeyConfigured: boolean;
    geminiModel: string;
  };
  limits: AppConfig["limits"];
}

/**
 * A copy of the config with secrets redacted to "is it configured?" flags.
 * Safe to log or return from `/api/settings` (spec §11).
 */
export function safeConfig(cfg: AppConfig = config): SafeAppConfig {
  return {
    env: cfg.env,
    server: { ...cfg.server },
    database: { ...cfg.database },
    chain: {
      baseRpcUrl: cfg.chain.baseRpcUrl,
      alchemyApiKeyConfigured: Boolean(cfg.chain.alchemyApiKey),
    },
    ai: {
      provider: cfg.ai.provider,
      openaiApiKeyConfigured: Boolean(cfg.ai.openaiApiKey),
      openaiModel: cfg.ai.openaiModel,
      geminiApiKeyConfigured: Boolean(cfg.ai.geminiApiKey),
      geminiModel: cfg.ai.geminiModel,
    },
    limits: { ...cfg.limits },
  };
}