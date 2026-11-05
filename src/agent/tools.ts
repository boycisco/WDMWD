/**
 * Agent tools — the single source of truth for what the model can call.
 *
 * Each tool has a `ToolDefinition` (JSON schema) shown to the model,
 * and a `handler` that executes with validated arguments.
 *
 * Handlers MUST:
 *   - Validate inputs (Zod)
 *   - Return a compact, evidence-referencing result
 *   - Never throw — failures become `ToolResult` with ok:false
 */

import { z } from "zod";
import { ValidationError } from "@/core/errors";
import type { ToolDefinition } from "@/model/model";
import { investigateWallet } from "@/wallet/investigate";
import { isValidAddress } from "@/wallet/wallet";

const AddressSchema = z
  .string()
  .refine((v) => isValidAddress(v), "Invalid EVM address");

const ChainIdSchema = z.number().int().positive().default(8453);

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: { code: string; message: string };
}

const WalletArgsSchema = z.object({
  address: AddressSchema,
  chainId: ChainIdSchema,
  limit: z.number().int().min(1).max(500).optional(),
});

export const walletTool: ToolDefinition = {
  name: "wallet",
  description:
    "Investigate a wallet's onchain activity: incoming/outgoing transfers, top counterparties, top contracts, and evidence. Use when the user asks about a wallet's behavior, who funds it, where funds go, what contracts it uses, or anything else requiring the wallet's transfer history.",
  parameters: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "EVM address (0x followed by 40 hex chars).",
      },
      chainId: {
        type: "number",
        description: "Chain ID. Base mainnet is 8453.",
        default: 8453,
      },
      limit: {
        type: "number",
        description: "Max transfers per direction (1-500, default 100).",
        minimum: 1,
        maximum: 500,
      },
    },
    required: ["address"],
    additionalProperties: false,
  },
};

async function handleWallet(args: unknown): Promise<ToolResult> {
  const parsed = WalletArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new ValidationError(
      `Invalid wallet tool arguments: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const { address, chainId, limit } = parsed.data;

  const investigation = await investigateWallet({
    chainId,
    address,
    limitPerDirection: limit ?? 100,
  });

  const findingSummaries = investigation.findings.map((f) => ({
    id: f.id,
    title: f.title,
    explanation: f.explanation,
    classification: f.classification,
    evidenceIds: f.evidenceIds,
    limitations: f.limitations,
  }));

  return {
    ok: true,
    summary:
      `Investigated ${address} on chain ${chainId}. ` +
      `${investigation.profile.summary.incomingCount} incoming, ` +
      `${investigation.profile.summary.outgoingCount} outgoing transfers. ` +
      `${investigation.findings.length} findings produced.`,
    data: {
      investigationId: investigation.id,
      address: investigation.address,
      chainId: investigation.chainId,
      summary: investigation.profile.summary,
      topIncomingCounterparties: investigation.profile.topIncomingCounterparties,
      topOutgoingCounterparties: investigation.profile.topOutgoingCounterparties,
      topContracts: investigation.profile.topContracts,
      findings: findingSummaries,
      evidenceCount: investigation.evidence.length,
      evidenceIds: investigation.evidence.map((e) => e.id),
    },
  };
}

export interface ToolHandler {
  definition: ToolDefinition;
  handler: (args: unknown) => Promise<ToolResult>;
}

export const tools: Record<string, ToolHandler> = {
  wallet: { definition: walletTool, handler: handleWallet },
};

export const toolDefinitions: ToolDefinition[] = Object.values(tools).map(
  (t) => t.definition,
);

/**
 * Execute a tool by name. Never throws — failures become `ToolResult`
 * with ok:false, so the agent loop can continue gracefully.
 */
export async function executeTool(
  name: string,
  args: unknown,
): Promise<ToolResult> {
  const tool = tools[name];
  if (!tool) {
    return {
      ok: false,
      summary: `Unknown tool: ${name}`,
      error: { code: "UNKNOWN_TOOL", message: `No tool named "${name}"` },
    };
  }
  try {
    return await tool.handler(args);
  } catch (err) {
    const message =
      err instanceof Error ? err.message.split("\n")[0]! : "Unknown error";
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "TOOL_ERROR";
    return {
      ok: false,
      summary: `Tool "${name}" failed: ${message}`,
      error: { code, message },
    };
  }
}