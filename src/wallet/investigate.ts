// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Wallet investigation — the deterministic "intelligence" layer.
 *
 * Given an address, orchestrates data retrieval, aggregation, evidence
 * creation, and finding generation. Returns a structure ready for the
 * API layer and (later) the agent.
 *
 * Every finding MUST reference at least one evidence ID, EXCEPT the
 * "coverage" finding which explicitly documents what we could not
 * establish — it carries an "unknown" classification and no evidence.
 */

import { randomUUID } from "node:crypto";
import type {
  Address,
  ChainId,
  Finding,
} from "@/core/types";
import type { WalletActivity } from "./activity";
import { getWalletActivity } from "./activity";
import { buildWalletProfile, type WalletProfile } from "./profile";
import {
  dedupeEvidence,
  transferToEvidence,
  type Evidence,
} from "@/evidence/evidence";

export interface WalletInvestigation {
  id: string;
  address: Address;
  chainId: ChainId;
  timestamp: string;
  profile: WalletProfile;
  findings: Finding[];
  evidence: Evidence[];
}

export interface InvestigateWalletOptions {
  chainId: ChainId;
  address: Address | string;
  limitPerDirection?: number;
}

const MAX_EVIDENCE_PER_FINDING = 25;

function pickEvidenceIds(evidence: Evidence[], limit = MAX_EVIDENCE_PER_FINDING): string[] {
  return evidence.slice(0, limit).map((e) => e.id);
}

function buildFindings(
  profile: WalletProfile,
  evidence: Evidence[],
  retrievedAt: string,
): Finding[] {
  const findings: Finding[] = [];
  const { summary, incoming, outgoing } = profile;

  if (incoming.length === 0 && outgoing.length === 0) {
    findings.push({
      id: "f_empty",
      title: "No observable transfer activity",
      explanation:
        "This wallet has no observable native, ERC-20, ERC-721, or ERC-1155 transfer activity in the queried window. It may be a newly created address, may only contain self-transfers, may interact solely via internal calls, or the indexed window may not reach its first activity.",
      classification: "unknown",
      evidenceIds: [],
      limitations: [
        "Only the most recent transfer window per direction was queried",
        "Internal contract-mediated transfers are not indexed here",
      ],
    });
    return findings;
  }

  // 1. Summary (confirmed)
  findings.push({
    id: "f_summary",
    title: "Wallet activity summary",
    explanation:
      `In the observed window, this wallet has ${summary.incomingCount} incoming ` +
      `and ${summary.outgoingCount} outgoing transfers. ` +
      `${summary.uniqueIncomingCounterparties} unique sender(s) and ` +
      `${summary.uniqueOutgoingCounterparties} unique recipient(s) appear.`,
    classification: "confirmed",
    evidenceIds: pickEvidenceIds(evidence),
    limitations: [
      `Only up to ${incoming.length + outgoing.length} transfers were considered (window cap)`,
    ],
  });

  // 2. Top incoming counterparty (confirmed)
  if (profile.topIncomingCounterparties.length > 0) {
    const top = profile.topIncomingCounterparties[0]!;
    const matching = incoming
      .filter((t) => t.from === top.address)
      .map((t) => transferToEvidence(t, retrievedAt));
    findings.push({
      id: "f_top_incoming",
      title: "Most frequent source",
      explanation: `The wallet most frequently receives transfers from ${top.address} (${top.count} incoming transfer${top.count === 1 ? "" : "s"}).`,
      classification: "confirmed",
      evidenceIds: pickEvidenceIds(matching),
      limitations: [
        "Frequent interaction does not imply shared ownership or common control",
      ],
    });
  }

  // 3. Top outgoing counterparty (confirmed)
  if (profile.topOutgoingCounterparties.length > 0) {
    const top = profile.topOutgoingCounterparties[0]!;
    const matching = outgoing
      .filter((t) => t.to === top.address)
      .map((t) => transferToEvidence(t, retrievedAt));
    findings.push({
      id: "f_top_outgoing",
      title: "Most frequent recipient",
      explanation: `The wallet most frequently sends transfers to ${top.address} (${top.count} outgoing transfer${top.count === 1 ? "" : "s"}).`,
      classification: "confirmed",
      evidenceIds: pickEvidenceIds(matching),
    });
  }

  // 4. Contract interactions (confirmed, if any)
  if (profile.topContracts.length > 0) {
    const top = profile.topContracts[0]!;
    findings.push({
      id: "f_top_contract",
      title: "Most interacted contract",
      explanation:
        `The contract at ${top.contract} appears in ${top.count} transfer${top.count === 1 ? "" : "s"} ` +
        `across ${top.categories.join(", ")}.`,
      classification: "confirmed",
      evidenceIds: pickEvidenceIds(
        evidence.filter((e) => e.contractAddress === top.contract),
      ),
    });
  }

  // 5. Coverage limitation (always present, unknown)
  findings.push({
    id: "f_coverage",
    title: "Data coverage and limitations",
    explanation:
      "This investigation is based on indexed transfer events only. " +
      "Zero-value transfers, certain internal contract-mediated movements, " +
      "and out-of-window historical data may not be present.",
    classification: "unknown",
    evidenceIds: [],
    limitations: [
      "Only the most recent window per direction is indexed",
      "Internal native transfers between contracts are excluded",
      "Data provided by Alchemy; not directly verified against a Base node",
      "Token metadata (symbol, name) is supplied by the indexer and should be treated as untrusted",
    ],
  });

  return findings;
}

export async function investigateWallet(
  opts: InvestigateWalletOptions,
): Promise<WalletInvestigation> {
  const activity: WalletActivity = await getWalletActivity(opts);
  const profile = buildWalletProfile(activity);

  const retrievedAt = new Date().toISOString();
  const evidence = dedupeEvidence(
    [...activity.incoming, ...activity.outgoing].map((t) =>
      transferToEvidence(t, retrievedAt),
    ),
  );

  const findings = buildFindings(profile, evidence, retrievedAt);
  const investigationId = randomUUID();

  // Attach investigationId to evidence entries that support findings.
  // We reuse the same objects; since they're plain objects this is safe.
  for (const e of evidence) {
    e.investigationId = investigationId;
  }

  return {
    id: investigationId,
    address: activity.address,
    chainId: activity.chainId,
    timestamp: retrievedAt,
    profile,
    findings,
    evidence,
  };
}