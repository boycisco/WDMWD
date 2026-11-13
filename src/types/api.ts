// SPDX-License-Identifier: AGPL-3.0-only
export type SystemStatus = 'ok' | 'degraded' | 'error' | 'not_configured';

export type ToolName =
  | 'wallet'
  | 'transaction'
  | 'transfers'
  | 'trace'
  | 'relations'
  | 'contracts'
  | 'patterns'
  | 'history';

export interface HealthCheckResponse {
  status: SystemStatus;
  checks: {
    blockchain: { status: SystemStatus; latencyMs?: number; blockNumber?: number };
    ai: { status: SystemStatus; provider: string };
    database: { status: SystemStatus };
    indexer: { status: SystemStatus };
  };
  chainId: number;
  chainName: string;
  blockNumber: number;
  timestamp: string;
  version: string;
}

export type EvidenceClassification = 'confirmed' | 'inferred' | 'unknown';

export interface EvidenceItem {
  id: string;
  classification: EvidenceClassification;
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

export interface InvestigationStep {
  tool: ToolName | string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  summary?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  steps?: InvestigationStep[];
  evidence?: EvidenceItem[];
  isStreaming?: boolean;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageSnippet?: string;
}

export interface ChatSessionsResponse {
  sessions: ChatSession[];
}

export interface ChatSessionDetailResponse {
  session: ChatSession;
  messages: ChatMessage[];
}

export interface SendMessagePayload {
  message: string;
  sessionId?: string;
  chainId?: number;
}

export interface WalletProfile {
  address: string;
  label?: string;
  type?: 'EOA' | 'Contract' | 'Multisig' | 'Token';
  balance: string;
  txCount: number;
  firstSeen?: string;
  lastSeen?: string;
  tags?: string[];
  ensOrBasename?: string;
}

export interface WalletFinding {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  classification: EvidenceClassification;
  timestamp?: string;
}

export interface WalletInvestigationResponse {
  profile: WalletProfile;
  findings: WalletFinding[];
  evidence: EvidenceItem[];
  limitations?: string[];
}

export interface SettingsResponse {
  status: SystemStatus;
  chainId: number;
  chainName: string;
  currentBlock: number;
  aiProvider: string;
  blockchainProvider: string;
  databaseStatus: SystemStatus;
  environment: string;
  providerIndicators: {
    rpcConnected: boolean;
    aiConnected: boolean;
    indexerConnected: boolean;
  };
  config: {
    streamResponses: boolean;
    autoExpandActivity: boolean;
    network: string;
  };
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNSUPPORTED'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'RPC_ERROR'
  | 'INDEXER_ERROR'
  | 'AI_ERROR'
  | 'LIMIT_EXCEEDED'
  | 'CONFIG_ERROR'
  | 'INTERNAL';

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}
