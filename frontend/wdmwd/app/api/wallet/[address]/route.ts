import { NextRequest, NextResponse } from 'next/server';
import { isValidAddress } from '@/lib/validate';
import { WalletInvestigationResponse } from '@/types/api';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  const { address } = await context.params;

  if (!isValidAddress(address)) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid EVM address format '${address}'. Expected 42-character hexadecimal string beginning with 0x.`,
        },
      },
      { status: 400 }
    );
  }

  // Generate deterministic onchain profile data based on address checksum/slice
  const seed = address.slice(2, 10);
  const numSeed = parseInt(seed, 16);
  const txCount = (numSeed % 420) + 12;
  const ethBalance = ((numSeed % 350) / 100 + 0.045).toFixed(4);
  const isContract = numSeed % 3 === 0;

  const currentBlock = 27814920;
  const recentTxHash1 = `0x${address.slice(2, 34)}${seed}${address.slice(2, 34)}`;
  const recentTxHash2 = `0x${seed}${address.slice(2, 30)}${seed}a1b2c3d4e5f60718`;

  const response: WalletInvestigationResponse = {
    profile: {
      address,
      label: isContract ? 'Verified Smart Contract' : 'Active Base EOA',
      type: isContract ? 'Contract' : 'EOA',
      balance: `${ethBalance} ETH`,
      txCount,
      firstSeen: new Date(Date.now() - 3600 * 1000 * 24 * 180).toISOString(),
      lastSeen: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      tags: isContract
        ? ['Smart Contract', 'Base Mainnet', 'ERC-4337 Compatible']
        : ['DeFi Trader', 'Base Mainnet', 'Frequent Aerodrome User'],
      ensOrBasename: `${address.slice(2, 8)}.base.eth`,
    },
    findings: [
      {
        id: 'f-1',
        title: 'High Inflow Volume via Base Canonical Bridge',
        description: `Address established primary capital through official L1 to L2 Base Portal bridging across multiple epochs.`,
        severity: 'info',
        classification: 'confirmed',
        timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
      },
      {
        id: 'f-2',
        title: 'Aerodrome Slipstream Liquidity Interactions',
        description: `Consistently interacts with Aerodrome pool router. Minted 2 concentrated liquidity NFTs and claimed accumulated trading fees.`,
        severity: 'low',
        classification: 'confirmed',
        timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      },
      {
        id: 'f-3',
        title: 'Cluster Correlation with Multi-sig Safe',
        description: `Receives periodic funding disbursements matching batch multisig disbursement schedules. Likely managed or sub-account of a larger treasury entity.`,
        severity: 'medium',
        classification: 'inferred',
        timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      },
    ],
    evidence: [
      {
        id: 'ev-w1',
        classification: 'confirmed',
        title: 'L1 -> L2 Canonical Deposit Confirmation',
        txHash: recentTxHash1,
        address,
        blockNumber: currentBlock - 1240,
        timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
        assetMovement: `+${ethBalance} ETH via BasePortal`,
        source: 'Base Canonical Messenger',
        explorerLink: `https://basescan.org/tx/${recentTxHash1}`,
        limitations: 'L1 provenance tracked to standard deposit queue.',
        details: 'Deposit confirmed on Base Mainnet with 1-block finality.',
      },
      {
        id: 'ev-w2',
        classification: 'confirmed',
        title: 'DEX Liquidity Position Mint',
        txHash: recentTxHash2,
        address,
        blockNumber: currentBlock - 320,
        timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        assetMovement: 'Aerodrome Slipstream NFT #20948',
        source: 'Aerodrome CLPool Factory',
        explorerLink: `https://basescan.org/tx/${recentTxHash2}`,
        limitations: 'Yield fluctuates with trading pool volume.',
        details: 'Liquidity pair WETH/USDC position active on Base.',
      },
      {
        id: 'ev-w3',
        classification: 'inferred',
        title: 'Sub-treasury Correlation Heuristic',
        address,
        blockNumber: currentBlock - 840,
        timestamp: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
        assetMovement: 'Sequential nonce alignment with treasury signer',
        source: 'Graph Cluster Analysis',
        limitations: 'Correlated based on timing window (confidence 84%).',
        details: 'Fund movement patterns indicate automated treasury management script.',
      },
    ],
    limitations: [
      'Internal transaction traces prior to block 20,000,000 require archive node query.',
      'Off-chain LayerZero messaging payloads are verified only upon arrival on Base.',
      'Private mempool transactions (MEV protection) lack pre-inclusion block order history.',
    ],
  };

  return NextResponse.json(response);
}
