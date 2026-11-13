// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Transaction investigation — deterministic fact extraction for a single
 * onchain transaction (spec §6.7).
 *
 * Produces findings for:
 *   - Which transaction (hash, block, sender, recipient)
 *   - Success / reverted
 *   - Native ETH value moved by the top-level call
 *   - Gas consumed and fee paid
 *   - Recipient type (EOA / contract / deployment)
 *   - Receipt event log summary (distinguishes ERC-20/721 Transfer events)
 *
 * Distinguishes the top-level transaction (`tx.value`) from
 * contract-internal effects (receipt logs). Per spec §6.7 the two are
 * reported separately and never conflated.
 *
 * Limitations (documented in the coverage finding):
 *   - Individual log parameters are not decoded (no ABI handling yet)
 *   - Internal transactions (contract-mediated ETH moves) are not traced
 *   - DeFi / swap / mint semantics are not classified
 */

import { randomUUID } from "node:crypto";
import { NotFoundError, RpcError, ValidationError } from "@/core/errors";
import type {
  Address,
  ChainId,
  Finding,
  TxHash,
} from "@/core/types";
import { hasChain } from "@/chain/registry";
import { createRpcClient } from "@/data/rpc";
import {
  transactionToEvidence,
  type Evidence,
} from "@/evidence/evidence";

// ─── Canonical ERC-20/721 Transfer event topic ──────────────────
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export interface TransactionInvestigationOptions {
  chainId: ChainId;
  hash: TxHash | string;
}

export interface TransactionInvestigation {
  id: string;
  chainId: ChainId;
  hash: TxHash;
  timestamp: string;
  transaction: {
    from: Address;
    to: Address | null;
    valueFormatted: string;
    valueRaw: string;
    nonce: number;
    blockNumber: number | null;
    inputSize: number;
    selector: string | null;
  };
  receipt: {
    status: "success" | "reverted";
    gasUsed: string;
    effectiveGasPrice: string;
    feeEth: string;
    logCount: number;
    contractAddress: Address | null;
    tokenTransferCount: number;
    contractsInvolved: Address[];
  } | null;
  recipientType: "deployment" | "contract" | "eoa" | "unknown";
  findings: Finding[];
  evidence: Evidence[];
}

// ─── Formatting ─────────────────────────────────────────────────

function formatAmount(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString();
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const scale = 10n ** BigInt(decimals);
  const whole = abs / scale;
  const frac = (abs % scale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return frac.length > 0 ? `${sign}${whole}.${frac}` : `${sign}${whole}.0`;
}

function selectorOf(input: string): string | null {
  // Function selector is the first 4 bytes after the 0x prefix.
  if (!input || input.length < 10 || input === "0x") return null;
  return input.slice(0, 10).toLowerCase();
}

// ─── Recipient classification ──────────────────────────────────

async function classifyRecipient(
  rpc: ReturnType<typeof createRpcClient>,
  to: Address | null,
): Promise<"deployment" | "contract" | "eoa" | "unknown"> {
  if (!to) return "deployment";
  try {
    const code = await rpc.getBytecode(to);
    if (!code || code === "0x" || code.length <= 2) return "eoa";
    return "contract";
  } catch {
    return "unknown";
  }
}

// ─── Investigation ─────────────────────────────────────────────

export async function investigateTransaction(
  opts: TransactionInvestigationOptions,
): Promise<TransactionInvestigation> {
  const hashInput = typeof opts.hash === "string" ? opts.hash : String(opts.hash);
  if (!TX_HASH_RE.test(hashInput)) {
    throw new ValidationError(`Invalid transaction hash: ${hashInput}`);
  }
  const hash = hashInput.toLowerCase() as TxHash;

  if (!hasChain(opts.chainId)) {
    throw new ValidationError(`Unsupported chainId: ${opts.chainId}`);
  }

  const rpc = createRpcClient(opts.chainId);
  const retrievedAt = new Date().toISOString();

  const tx = await rpc.getTransaction(hash as `0x${string}`);
  if (!tx) {
    throw new NotFoundError(
      `Transaction ${hash} not found on chain ${opts.chainId}`,
    );
  }

  let receipt;
  try {
    receipt = await rpc.getTransactionReceipt(hash as `0x${string}`);
  } catch (err) {
    throw new RpcError(
      `Receipt lookup failed: ${err instanceof Error ? err.message.split("\n")[0] : "unknown"}`,
    );
  }

  const recipientType = await classifyRecipient(rpc, (tx.to as Address | null) ?? null);

  const valueFormatted = formatAmount(tx.value, 18);
  const valueRaw = tx.value.toString();
  const inputSize = tx.input ? (tx.input.length - 2) / 2 : 0;
  const selector = selectorOf(tx.input ?? "0x");

  // ─── Build receipt summary ────────────────────────────────

  let receiptSummary: TransactionInvestigation["receipt"] = null;
  if (receipt) {
    const feeWei = receipt.gasUsed * receipt.effectiveGasPrice;
    const contractsInvolved = new Set<string>();
    let tokenTransferCount = 0;
    for (const log of receipt.logs) {
      contractsInvolved.add(log.address.toLowerCase());
      if (log.topics[0]?.toLowerCase() === TRANSFER_TOPIC) {
        tokenTransferCount += 1;
      }
    }

    receiptSummary = {
      status: receipt.status === "success" ? "success" : "reverted",
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      feeEth: formatAmount(feeWei, 18),
      logCount: receipt.logs.length,
      contractAddress: (receipt.contractAddress as Address | null) ?? null,
      tokenTransferCount,
      contractsInvolved: [...contractsInvolved] as Address[],
    };
  }

  // ─── Build evidence (single entry, keyed by tx hash) ──────

  const evidence = transactionToEvidence(
    {
      chainId: opts.chainId,
      hash,
      blockNumber: tx.blockNumber !== null ? Number(tx.blockNumber) : null,
      blockTimestamp: "",
      from: tx.from.toLowerCase() as Address,
      to: (tx.to?.toLowerCase() as Address) ?? null,
      status: receiptSummary?.status ?? "unknown",
      valueFormatted,
      valueRaw,
      feeEth: receiptSummary?.feeEth ?? null,
      gasUsed: receiptSummary?.gasUsed ?? null,
    },
    retrievedAt,
  );
  const evidenceId = evidence.id;

  // ─── Build findings ───────────────────────────────────────

  const findings: Finding[] = [];

  // 1. Summary
  const toDisplay = tx.to ?? "<contract creation>";
  findings.push({
    id: "f_tx_summary",
    title: "Transaction overview",
    explanation:
      `Transaction ${hash.slice(0, 10)}…${hash.slice(-6)} was sent from ${tx.from.toLowerCase()} to ${toDisplay}` +
      (tx.blockNumber !== null ? ` in block ${Number(tx.blockNumber)}` : "") +
      (receiptSummary
        ? `. Execution status: ${receiptSummary.status.toUpperCase()}.`
        : ". Receipt not available — execution status unknown."),
    classification: receiptSummary ? "confirmed" : "unknown",
    evidenceIds: [evidenceId],
    limitations: receiptSummary
      ? undefined
      : ["No receipt was returned by the RPC provider — the transaction may be pending or the provider may be lagging"],
  });

  // 2. Native value
  if (tx.value > 0n) {
    findings.push({
      id: "f_tx_value",
      title: "Native ETH transfer",
      explanation: `The top-level transaction transferred ${valueFormatted} ETH from ${tx.from.toLowerCase()} to ${toDisplay}. This is the transaction's own value; contract-emitted token transfers, if any, are separate (see f_tx_events).`,
      classification: "confirmed",
      evidenceIds: [evidenceId],
    });
  }

  // 3. Gas
  if (receiptSummary) {
    findings.push({
      id: "f_tx_gas",
      title: "Gas cost",
      explanation: `Execution consumed ${receiptSummary.gasUsed} gas at an effective price of ${receiptSummary.effectiveGasPrice} wei per gas. Total fee paid: ${receiptSummary.feeEth} ETH.`,
      classification: "confirmed",
      evidenceIds: [evidenceId],
    });
  }

  // 4. Recipient type
  const targetExplanation: Record<typeof recipientType, string> = {
    deployment: "The transaction created a new contract (no recipient address).",
    contract:
      `${toDisplay} is a contract (has deployed bytecode on Base). Interacting with it invokes contract logic — the transaction's ` +
      `${selector ? `selector ${selector}` : "input"} indicates which function was called.`,
    eoa: `${toDisplay} is an externally-owned account (no deployed bytecode). The transfer sent ${valueFormatted} ETH directly to a wallet.`,
    unknown:
      `Unable to classify whether ${toDisplay} is a contract or a wallet (bytecode lookup failed or returned an unexpected result).`,
  };
  findings.push({
    id: "f_tx_target",
    title: "Recipient classification",
    explanation: targetExplanation[recipientType],
    classification: recipientType === "unknown" ? "unknown" : "confirmed",
    evidenceIds: [evidenceId],
  });

  // 5. Event logs
  if (receiptSummary) {
    if (receiptSummary.logCount === 0) {
      findings.push({
        id: "f_tx_events",
        title: "No contract events emitted",
        explanation:
          "The receipt contains no log entries. Any state change was limited to the top-level call (e.g. ETH value transfer or a simple contract state update with no events).",
        classification: "confirmed",
        evidenceIds: [evidenceId],
      });
    } else {
      const parts: string[] = [
        `The receipt contains ${receiptSummary.logCount} event log${receiptSummary.logCount === 1 ? "" : "s"} emitted by ${receiptSummary.contractsInvolved.length} contract${receiptSummary.contractsInvolved.length === 1 ? "" : "s"}.`,
      ];
      if (receiptSummary.tokenTransferCount > 0) {
        parts.push(
          `${receiptSummary.tokenTransferCount} of these match the ERC-20/ERC-721 Transfer event signature — indicating token movement triggered by the transaction.`,
        );
      }
      findings.push({
        id: "f_tx_events",
        title: "Contract event activity",
        explanation: parts.join(" "),
        classification: "confirmed",
        evidenceIds: [evidenceId],
        limitations: [
          "Individual log parameters are not decoded — the specific token, sender, recipient and amount are not established here",
          "Internal transactions (contract-mediated native ETH transfers) are not traced",
        ],
      });
    }
  }

  // 6. Coverage
  findings.push({
    id: "f_tx_coverage",
    title: "Data coverage and limitations",
    explanation:
      "This investigation is based on the raw transaction and its receipt as returned by the RPC provider. It does not decode individual event parameters, trace internal contract-mediated transfers, or interpret DeFi operations.",
    classification: "unknown",
    evidenceIds: [],
    limitations: [
      "Log parameters (amounts, token identities) are not decoded",
      "Internal native transfers between contracts are not traced",
      "Contract source code and ABI are not inspected",
      "Transaction data is retrieved from a single RPC provider and not independently verified",
    ],
  });

  // ─── Assemble ─────────────────────────────────────────────

  return {
    id: randomUUID(),
    chainId: opts.chainId,
    hash,
    timestamp: retrievedAt,
    transaction: {
      from: tx.from.toLowerCase() as Address,
      to: (tx.to?.toLowerCase() as Address) ?? null,
      valueFormatted,
      valueRaw,
      nonce: tx.nonce,
      blockNumber: tx.blockNumber !== null ? Number(tx.blockNumber) : null,
      inputSize,
      selector,
    },
    receipt: receiptSummary,
    recipientType,
    findings,
    evidence: [evidence],
  };
}