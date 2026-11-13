// SPDX-License-Identifier: AGPL-3.0-only
/**
 * /api/settings — Application settings and subsystem status.
 *
 * GET   — Returns current config, subsystem status, and UI preferences.
 * PATCH — Updates UI preferences in the SQLite database.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { settings as settingsTable } from "@/store/schema";
import { getDb } from "@/store/store";
import { config } from "@/config/config";
import { createRpcClient } from "@/data/rpc";
import { AppError, ValidationError } from "@/core/errors";

// ─── Schema for PATCH ──────────────────────────────────────────

const PatchBodySchema = z.object({
  streamResponses: z.boolean().optional(),
  autoExpandActivity: z.boolean().optional(),
  network: z.string().optional(),
});

// ─── Helpers ───────────────────────────────────────────────────

function getSetting(db: any, key: string, fallback: string): string {
  const row = db.select().from(settingsTable).where(eq(settingsTable.key, key)).get();
  return row ? row.value : fallback;
}

function setSetting(db: any, key: string, value: string) {
  db.insert(settingsTable)
    .values({ key, value, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value, updatedAt: Date.now() },
    })
    .run();
}

async function buildResponse() {
  const db = getDb();
  
  // 1. Fetch UI prefs from SQLite (with defaults)
  const streamResponses = getSetting(db, "streamResponses", "true") === "true";
  const autoExpandActivity = getSetting(db, "autoExpandActivity", "false") === "true";
  const network = getSetting(db, "network", "mainnet");

  // 2. Probe Base RPC for current block
  let currentBlock = 0;
  let blockchainStatus = "not_configured";
  let rpcConnected = false;
  
  if (config.chain.baseRpcUrl || config.chain.alchemyApiKey) {
    try {
      const rpc = createRpcClient(8453, { timeoutMs: 2500 });
      const block = await rpc.getBlockNumber();
      currentBlock = Number(block);
      blockchainStatus = "ok";
      rpcConnected = true;
    } catch {
      blockchainStatus = "error";
    }
  }

  // 3. Check DB
  let databaseStatus = "error";
  try {
    db.get(/* sql */ `SELECT 1` as any);
    databaseStatus = "ok";
  } catch {}

  const aiStatus = (config.ai.openaiApiKey || config.ai.geminiApiKey) ? "ok" : "not_configured";
  const indexerStatus = config.chain.alchemyApiKey ? "ok" : "not_configured";

  // 4. Determine overall status
  const overallStatus = 
    (blockchainStatus === "ok" && databaseStatus === "ok") ? "ok" : "degraded";

  return {
    status: overallStatus as "ok" | "degraded",
    chainId: 8453,
    chainName: "Base Mainnet",
    currentBlock,
    aiProvider: config.ai.provider,
    blockchainProvider: config.chain.alchemyApiKey ? "Alchemy" : "Base RPC",
    databaseStatus: databaseStatus as "ok" | "error",
    environment: config.env,
    providerIndicators: {
      rpcConnected,
      aiConnected: aiStatus === "ok",
      indexerConnected: indexerStatus === "ok",
    },
    config: {
      streamResponses,
      autoExpandActivity,
      network,
    },
  };
}

// ─── GET ───────────────────────────────────────────────────────

export async function GET() {
  try {
    const data = await buildResponse();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Failed to load settings" } },
      { status: 500 }
    );
  }
}

// ─── PATCH ─────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = PatchBodySchema.safeParse(body);
    
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      );
    }

    const db = getDb();
    const updates = parsed.data;

    if (updates.streamResponses !== undefined) {
      setSetting(db, "streamResponses", String(updates.streamResponses));
    }
    if (updates.autoExpandActivity !== undefined) {
      setSetting(db, "autoExpandActivity", String(updates.autoExpandActivity));
    }
    if (updates.network !== undefined) {
      setSetting(db, "network", updates.network);
    }

    const data = await buildResponse();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: { code: err instanceof AppError ? err.code : "INTERNAL", message } },
      { status: err instanceof AppError ? err.httpStatus : 500 }
    );
  }
}