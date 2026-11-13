// SPDX-License-Identifier: AGPL-3.0-only
/**
 * GET /api/wallet/[address]?chainId=8453&limit=100
 *
 * Returns a deterministic wallet investigation transformed into the
 * frontend's `WalletInvestigationResponse` shape:
 *   - `profile`: address, balance, txCount, firstSeen, lastSeen
 *   - `findings`: { id, title, description, classification, severity }
 *   - `evidence`: full EvidenceItem[] for UI rendering
 *   - `limitations`: top-level list of coverage notes
 */

import { NextResponse } from "next/server";
import {
  AppError,
  IndexerError,
  UnsupportedError,
  ValidationError,
} from "@/core/errors";
import { hasChain } from "@/chain/registry";
import { isValidAddress, normalizeAddress } from "@/wallet/wallet";
import { investigateWallet } from "@/wallet/investigate";
import { createRpcClient } from "@/data/rpc";
import { toFrontendEvidenceItem } from "@/evidence/item";
import type { Address } from "@/core/types";

const DEFAULT_CHAIN_ID = 8453;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

interface ErrorBody {
  error: { code: string; message: string };
}

// ─── Frontend-facing types (mirror ui/src/types/api.ts) ────────

interface FrontendWalletProfile {
  address: string;
  label?: string;
  type?: "EOA" | "Contract" | "Multisig" | "Token";
  balance: string;
  txCount: number;
  firstSeen?: string;
  lastSeen?: string;
  tags?: string[];
  ensOrBasename?: string;
}

interface FrontendWalletFinding {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low" | "info";
  classification: "confirmed" | "inferred" | "unknown";
  timestamp?: string;
}

interface FrontendWalletResponse {
  profile: FrontendWalletProfile;
  findings: FrontendWalletFinding[];
  evidence: ReturnType<typeof toFrontendEvidenceItem>[];
  limitations?: string[];
}

function formatEther(wei: bigint): string {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const scale = 10n ** 18n;
  const whole = abs / scale;
  const frac = (abs % scale).toString().padStart(18, "0").replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return frac.length > 0 ? `${sign}${whole}.${frac}` : `${sign}${whole}.0`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
): Promise<NextResponse> {
  try {
    const { address } = await params;

    if (!isValidAddress(address)) {
      throw new ValidationError(`Invalid wallet address: ${address}`);
    }
    const normalizedAddress = normalizeAddress(address);

    const url = new URL(request.url);
    const chainIdParam = url.searchParams.get("chainId");
    const chainId = chainIdParam ? Number(chainIdParam) : DEFAULT_CHAIN_ID;
    if (!Number.isInteger(chainId) || chainId <= 0) {
      throw new ValidationError(`Invalid chainId: ${chainIdParam}`);
    }
    if (!hasChain(chainId)) {
      throw new UnsupportedError(`Unsupported chainId: ${chainId}`);
    }

    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new ValidationError(
        `Invalid limit: must be an integer 1..${MAX_LIMIT}`,
      );
    }

    const investigation = await investigateWallet({
      chainId,
      address: normalizedAddress,
      limitPerDirection: limit,
    });

    // Balance lookup is best-effort — the investigation doesn't need it,
    // but the frontend profile wants a current balance string.
    let balanceEth = "0.0";
    let balanceLimitation: string | undefined;
    try {
      const rpc = createRpcClient(chainId, { timeoutMs: 3_000 });
      const wei = await rpc.getBalance(normalizedAddress as Address);
      balanceEth = formatEther(wei);
    } catch (err) {
      balanceLimitation = `Balance unavailable: ${
        err instanceof Error ? err.message.split("\n")[0] : "RPC error"
      }`;
    }

    const profile = investigation.profile;
    const firstBlockTime = [
      ...profile.incoming,
      ...profile.outgoing,
    ]
      .map((t) => t.blockTimestamp)
      .filter(Boolean)
      .sort()[0];
    const lastBlockTime = [
      ...profile.incoming,
      ...profile.outgoing,
    ]
      .map((t) => t.blockTimestamp)
      .filter(Boolean)
      .sort()
      .slice(-1)[0];

    const frontendProfile: FrontendWalletProfile = {
      address: investigation.address,
      balance: balanceEth,
      txCount: profile.summary.incomingCount + profile.summary.outgoingCount,
      ...(firstBlockTime && { firstSeen: firstBlockTime }),
      ...(lastBlockTime && { lastSeen: lastBlockTime }),
    };

    const frontendFindings: FrontendWalletFinding[] = investigation.findings.map(
      (f) => ({
        id: f.id,
        title: f.title,
        description: f.explanation,
        severity: "info",
        classification: f.classification,
      }),
    );

    const frontendEvidence = investigation.evidence.map(toFrontendEvidenceItem);

    const limitations: string[] = [];
    for (const f of investigation.findings) {
      if (f.limitations) limitations.push(...f.limitations);
    }
    if (balanceLimitation) limitations.push(balanceLimitation);
    const uniqueLimitations = Array.from(new Set(limitations));

    const body: FrontendWalletResponse = {
      profile: frontendProfile,
      findings: frontendFindings,
      evidence: frontendEvidence,
      ...(uniqueLimitations.length > 0 && { limitations: uniqueLimitations }),
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const body: ErrorBody = {
      error: {
        code: err instanceof AppError ? err.code : "INTERNAL",
        message:
          err instanceof Error
            ? err.message.split("\n")[0]!
            : "Unknown error",
      },
    };
    const status =
      err instanceof AppError
        ? err.httpStatus
        : err instanceof IndexerError
          ? 502
          : 500;
    return NextResponse.json(body, { status });
  }
}