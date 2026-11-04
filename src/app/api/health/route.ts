/**
 * GET /api/health — application health check (spec §11).
 *
 * Reports whether each subsystem is reachable and configured.
 * NEVER returns secrets — API keys are reported as "configured" or
 * "not_configured" only, via `safeConfig()`.
 *
 * Always dynamic (never cached): the whole point is fresh status.
 */

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { config, safeConfig } from "@/config/config";
import { getDb } from "@/store/store";


type SubsystemStatus = "ok" | "error" | "not_configured";

interface HealthBody {
  status: "ok" | "degraded";
  checks: {
    application: { status: "ok" };
    database: { status: SubsystemStatus; error?: string };
    blockchain: { status: SubsystemStatus };
    ai: { status: SubsystemStatus };
  };
  config: ReturnType<typeof safeConfig>;
  timestamp: string;
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

  const blockchain: HealthBody["checks"]["blockchain"] = {
    status:
      config.chain.baseRpcUrl || config.chain.alchemyApiKey
        ? "ok"
        : "not_configured",
  };

  const ai: HealthBody["checks"]["ai"] = {
    status: config.ai.openaiApiKey ? "ok" : "not_configured",
  };

  const overall: HealthBody["status"] =
    database.status === "ok" ? "ok" : "degraded";

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