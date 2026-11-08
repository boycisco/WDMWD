/**
 * GET /api/health — application health check.
 *
 * Returns a shape matching the frontend's `HealthCheckResponse` type:
 * top-level `chainId`, `chainName`, `blockNumber`, `version`; nested
 * per-subsystem `checks.*` with `status`, `provider`, `latencyMs`.
 *
 * Backward-compat: also includes `config` (safe-projected) so tests
 * and future settings endpoints have access to config flags.
 *
 * NEVER returns secrets — API keys are reported as `*Configured: boolean`.
 */

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { config, safeConfig } from "@/config/config";
import { getDb } from "@/store/store";
import { createRpcClient } from "@/data/rpc";

const CHAIN_PROBE_TIMEOUT_MS = 2_500;
const APP_VERSION = "0.1.0";

type SubsystemStatus = "ok" | "degraded" | "error" | "not_configured";

interface ResponseChecks {
  application: { status: "ok" };
  database: { status: SubsystemStatus; error?: string };
  blockchain: {
    status: SubsystemStatus;
    blockNumber?: number;
    chainId?: number;
    error?: string;
    latencyMs?: number;
  };
  ai: { status: SubsystemStatus; provider: string };
  indexer: { status: SubsystemStatus };
}

interface ResponseBody {
  status: "ok" | "degraded";
  checks: ResponseChecks;
  chainId: number;
  chainName: string;
  blockNumber?: number;
  timestamp: string;
  version: string;
  config: ReturnType<typeof safeConfig>;
}

async function probeChain(): Promise<{
  status: SubsystemStatus;
  blockNumber?: string;
  chainId?: number;
  error?: string;
  latencyMs?: number;
}> {
  if (!config.chain.baseRpcUrl && !config.chain.alchemyApiKey) {
    return { status: "not_configured" };
  }
  const start = Date.now();
  try {
    const rpc = createRpcClient(8453, { timeoutMs: CHAIN_PROBE_TIMEOUT_MS });
    const [blockNumber, chainId] = await Promise.all([
      rpc.getBlockNumber(),
      rpc.getChainId(),
    ]);
    return {
      status: "ok",
      blockNumber: blockNumber.toString(),
      chainId,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message.split("\n")[0] : "unknown error",
    };
  }
}

export async function GET(): Promise<NextResponse<ResponseBody>> {
  const database: ResponseChecks["database"] = { status: "error" };
  try {
    const db = getDb();
    db.get(sql`SELECT 1`);
    database.status = "ok";
  } catch (err) {
    database.status = "error";
    database.error =
      err instanceof Error ? err.message.split("\n")[0] : "unknown error";
  }

  const chain = await probeChain();
  const chainId = chain.chainId ?? 8453;
  const topBlockNumber = chain.blockNumber ? Number(chain.blockNumber) : undefined;

  const ai: ResponseChecks["ai"] = {
    status:
      config.ai.openaiApiKey || config.ai.geminiApiKey
        ? "ok"
        : "not_configured",
    provider: config.ai.provider,
  };

  const indexer: ResponseChecks["indexer"] = {
    status: config.chain.alchemyApiKey ? "ok" : "not_configured",
  };

  const overall: "ok" | "degraded" =
    database.status === "ok" && chain.status === "ok" ? "ok" : "degraded";

  return NextResponse.json<ResponseBody>({
    status: overall,
    checks: {
      application: { status: "ok" },
      database,
      blockchain: {
        status: chain.status,
        ...(chain.blockNumber && { blockNumber: Number(chain.blockNumber) }),
        ...(chain.chainId && { chainId: chain.chainId }),
        ...(chain.error && { error: chain.error }),
        ...(chain.latencyMs !== undefined && { latencyMs: chain.latencyMs }),
      },
      ai,
      indexer,
    },
    chainId,
    chainName: "Base",
    ...(topBlockNumber !== undefined && { blockNumber: topBlockNumber }),
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    config: safeConfig(),
  });
}