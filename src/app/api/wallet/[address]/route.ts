/**
 * GET /api/wallet/[address]?chainId=8453&limit=100
 *
 * Returns a deterministic wallet investigation: aggregated profile,
 * classified findings, evidence references, and stated limitations.
 *
 * Error mapping (spec §11, §7.5):
 *   400 — invalid address, unsupported chain, bad query params
 *   500 — indexer misconfigured (e.g. missing API key)
 *   502 — indexer upstream failure
 */

import { NextResponse } from "next/server";
import {
  AppError,
  IndexerError,
  UnsupportedError,
  ValidationError,
} from "@/core/errors";
import { hasChain } from "@/chain/registry";
import { isValidAddress } from "@/wallet/wallet";
import { investigateWallet } from "@/wallet/investigate";

const DEFAULT_CHAIN_ID = 8453;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
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
      address,
      limitPerDirection: limit,
    });

    return NextResponse.json(investigation, {
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