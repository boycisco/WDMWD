import { ChatMessage, ChatSession, EvidenceItem, InvestigationStep } from '@/types/api';

// In-memory server session store (persists across requests in node process)
interface StoreData {
  sessions: Map<string, ChatSession>;
  messages: Map<string, ChatMessage[]>;
  evidence: Map<string, EvidenceItem[]>;
  settings: {
    streamResponses: boolean;
    autoExpandActivity: boolean;
    network: string;
  };
}

declare global {
  var __wdmwd_store: StoreData | undefined;
}

if (!global.__wdmwd_store) {
  const initialSessionId = '018f4a22-7b81-7910-8b1e-4589d9c8201a';
  const initialDate = new Date(Date.now() - 3600 * 1000 * 3).toISOString();

  const sampleSession: ChatSession = {
    id: initialSessionId,
    title: 'Base USDC Bridge & Aerodrome Swap Analysis',
    createdAt: initialDate,
    updatedAt: initialDate,
    messageCount: 2,
    lastMessageSnippet: 'Investigated wallet 0x330138… and confirmed 12 transactions totaling 4,250 USDC.',
  };

  const sampleUserMessage: ChatMessage = {
    id: 'msg-u1',
    role: 'user',
    content: 'Can you investigate what wallet 0x33013807E2c479e4f8380D41c21054E844Ec94A1 did on Base yesterday?',
    createdAt: initialDate,
  };

  const sampleEvidence: EvidenceItem[] = [
    {
      id: 'ev-1',
      classification: 'confirmed',
      title: 'USDC Bridge Inflow via Base Portal',
      txHash: '0x8f2d5c317a9e14c1d764b49cb32ef4f14d896172605b0d00b1464c80389270df',
      address: '0x33013807E2c479e4f8380D41c21054E844Ec94A1',
      blockNumber: 27804102,
      timestamp: new Date(Date.now() - 3600 * 1000 * 25).toISOString(),
      assetMovement: '+4,250.00 USDC',
      source: 'Base Portal Bridge Contract',
      explorerLink: 'https://basescan.org/tx/0x8f2d5c317a9e14c1d764b49cb32ef4f14d896172605b0d00b1464c80389270df',
      limitations: 'Gas costs paid in L1 ETH during initial deposit.',
      details: 'Direct bridge deposit from Ethereum L1 to Base Mainnet without intermediary router hops.',
    },
    {
      id: 'ev-2',
      classification: 'confirmed',
      title: 'Aerodrome Slipstream Liquidity Deposit',
      txHash: '0x4e6b12a9c7d10f438902e5b7190e8c4591a32b0c9f8d7e6a5b4c3d2e1f0a9b8c',
      address: '0x33013807E2c479e4f8380D41c21054E844Ec94A1',
      blockNumber: 27804218,
      timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      assetMovement: '-2,000.00 USDC / +0.72 WETH (CLPool NFT #18429)',
      source: 'Aerodrome Slipstream CLPool Router',
      explorerLink: 'https://basescan.org/tx/0x4e6b12a9c7d10f438902e5b7190e8c4591a32b0c9f8d7e6a5b4c3d2e1f0a9b8c',
      limitations: 'Position remains active in pool; fees accrued off-chain.',
      details: 'Concentrated liquidity position minting with tick range [184000, 192000].',
    },
    {
      id: 'ev-3',
      classification: 'inferred',
      title: 'Cluster Connection to Gnosis Safe Treasury',
      address: '0x2a945b6329c0a9689403a0279d48b4c0228d4889',
      blockNumber: 27804490,
      timestamp: new Date(Date.now() - 3600 * 1000 * 23).toISOString(),
      assetMovement: '0.05 ETH gas funding transfer',
      source: 'Address Relationship Heuristics',
      limitations: 'Cluster correlation confidence 88% based on sequential nonce and timing.',
      details: 'Wallet received initial gas sponsorship from this address 3 blocks prior to bridge completion.',
    },
  ];

  const sampleSteps: InvestigationStep[] = [
    { tool: 'wallet', label: 'Investigating wallet', status: 'completed', summary: 'Fetched profile for 0x3301…94A1' },
    { tool: 'transfers', label: 'Reviewing asset movements', status: 'completed', summary: 'Identified 4 transfers (USDC, WETH, ETH)' },
    { tool: 'contracts', label: 'Inspecting contract interactions', status: 'completed', summary: 'Verified Base Portal & Aerodrome CLPool' },
    { tool: 'relations', label: 'Investigating address relationships', status: 'completed', summary: 'Discovered gas sponsor treasury' },
  ];

  const sampleAssistantMessage: ChatMessage = {
    id: 'msg-a1',
    role: 'assistant',
    content: `### Executive Summary

Wallet \`0x33013807E2c479e4f8380D41c21054E844Ec94A1\` executed **4 key transactions** on **Base Mainnet** within the last 24 hours:

1. **Bridge Deposit Inflow**: Transferred **4,250.00 USDC** via the official Base Portal bridge.
2. **Liquidity Provisioning**: Deposited **2,000.00 USDC** and **0.72 WETH** into the Aerodrome Slipstream concentrated liquidity pool (NFT Position #18429).
3. **Treasury Correlation**: Traced an initial gas sponsorship of **0.05 ETH** originating from \`0x2a945b6329c0a9689403a0279d48b4c0228d4889\`.

All primary transactions were confirmed with sub-second finality on Base. Select any evidence reference or address to view exact cryptographic receipts.`,
    createdAt: new Date(Date.now() - 3600 * 1000 * 3 + 12000).toISOString(),
    steps: sampleSteps,
    evidence: sampleEvidence,
  };

  const sessionsMap = new Map<string, ChatSession>();
  sessionsMap.set(initialSessionId, sampleSession);

  const messagesMap = new Map<string, ChatMessage[]>();
  messagesMap.set(initialSessionId, [sampleUserMessage, sampleAssistantMessage]);

  const evidenceMap = new Map<string, EvidenceItem[]>();
  evidenceMap.set(initialSessionId, sampleEvidence);

  global.__wdmwd_store = {
    sessions: sessionsMap,
    messages: messagesMap,
    evidence: evidenceMap,
    settings: {
      streamResponses: true,
      autoExpandActivity: false,
      network: 'Base Mainnet (8453)',
    },
  };
}

export const serverStore = global.__wdmwd_store;
