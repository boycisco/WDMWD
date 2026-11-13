// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Shared transform: internal `Evidence` → frontend `EvidenceItem`.
 *
 * Used by both the SSE stream (per-item events during a chat) and the
 * wallet inspection endpoint (full evidence array in one response).
 * Keeping it in one place ensures the frontend's evidence renderer sees
 * the same shape regardless of source.
 */

import type { Evidence } from "./evidence";

export interface FrontendEvidenceItem {
  id: string;
  classification: "confirmed" | "inferred" | "unknown";
  title?: string;
  txHash?: string;
  address?: string;
  blockNumber?: number;
  timestamp?: string;
  assetMovement?: string;
  source?: string;
  explorerLink?: string;
  limitations?: string;
  details?: string;
}

export function toFrontendEvidenceItem(ev: Evidence): FrontendEvidenceItem {
  const data = (ev.data ?? {}) as {
    category?: string;
    amountFormatted?: string;
    symbol?: string;
    direction?: string;
  };

  let title: string | undefined;
  if (ev.type === "transfer") {
    const symbol =
      data.symbol ?? (data.category === "external" ? "ETH" : "Tokens");
    title = `${symbol} Transfer`;
  } else if (ev.type === "receipt") {
    title = "Transaction";
  } else {
    title = ev.type.charAt(0).toUpperCase() + ev.type.slice(1);
  }

  let assetMovement: string | undefined;
  if (data.amountFormatted && data.symbol) {
    const prefix =
      data.direction === "in" ? "+" : data.direction === "out" ? "-" : "";
    assetMovement = `${prefix}${data.amountFormatted} ${data.symbol}`;
  }

  let explorerLink: string | undefined;
  if (ev.transactionHash) {
    explorerLink = `https://basescan.org/tx/${ev.transactionHash}`;
  }

  return {
    id: ev.id,
    classification: ev.classification,
    title,
    txHash: ev.transactionHash,
    address: ev.addresses?.[0],
    blockNumber: ev.blockNumber,
    timestamp: ev.blockTimestamp,
    assetMovement,
    source: ev.source,
    explorerLink,
  };
}