/**
 * GET /api/health — application health check (spec §11).
 *
 * Reports whether each subsystem is reachable and configured.
 * NEVER returns secrets — API keys are reported as "configured" or
 * "not_configured" only, via `safeConfig()`.
 *
 * Blockchain check: performs a real RPC call to Base with a short
 * timeout (2.5s). If Base is slow or down, health says "error" fast
 * rather than hanging.
 */

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { config, safeConfig } from "@/config/config";
import { getDb } from "@/store/store";
import { createRpcClient } from "@/data/rpc";

const CHAIN_PROBE_TIMEOUT_MS = 2_500;

type SubsystemStatus = "ok" | "error" | "not_configured";

interface ChainCheck {
  status: SubsystemStatus;
  blockNumber?: string;
  chainId?: number;
  error?: string;
}

interface HealthBody {
  status: "ok" | "degraded";
  checks: {
    application: { status: "ok" };
    database: { status: SubsystemStatus; error?: string };
    blockchain: ChainCheck;
    ai: { status: SubsystemStatus };
  };
  config: ReturnType<typeof safeConfig>;
  timestamp: string;
}

async function probeChain(): Promise<ChainCheck> {
  if (!config.chain.baseRpcUrl && !config.chain.alchemyApiKey) {
    return { status: "not_configured" };
  }
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
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message.split("\n")[0] : "unknown error",
    };
  }
}

export async function GET(): Promise<NextResponse<HealthBody>> {
  const database: HealthBody["checks"]["database"] = { status: "error" };
  try {
    const db = getDb();
    db.get(sql`SELECT 1`);
    database.status = "ok";
  } catch (err) {
    database.status = "error";
    database.error =
      err instanceof Error ? err.message.split("\n")[0] : "unknown error";
  }

  const blockchain = await probeChain();

  const ai: HealthBody["checks"]["ai"] = {
    status: config.ai.openaiApiKey ? "ok" : "not_configured",
  };

  const overall: HealthBody["status"] =
    database.status === "ok" && blockchain.status === "ok"
      ? "ok"
      : "degraded";

  return NextResponse.json<HealthBody>({
    status: overall,
    checks: {
      application: { status: "ok" },
      database,
      blockchain,
      ai,
    },
    config: safeConfig(),
    timestamp: new Date().toISOString(),
  });
}