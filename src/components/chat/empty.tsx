'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Search, ArrowRight, Zap, GitBranch } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const cards = [
    {
      id: 'wallet',
      title: 'Investigate Wallet',
      subtitle: 'EOA & Smart Contract Scan',
      icon: Search,
      iconBg: 'bg-[#0052FF]/20 text-[#3888FF] border-[#0052FF]/30',
      badge: '98% Accuracy',
      badgeColor: 'text-[#4ADE80] bg-[#122B1E] border-[#4ADE80]/30',
      metrics: [
        { label: 'Sample Target', value: '0x3301…94A1' },
        { label: 'Focus Area', value: 'Aerodrome & Swaps' },
        { label: 'Verification', value: 'Base Sequencer' },
      ],
      prompt: 'Investigate wallet 0x33013807E2c479e4f8380D41c21054E844Ec94A1 on Base and summarize recent transactions',
      buttonText: 'Scan Target Wallet',
      highlighted: false,
    },
    {
      id: 'tx',
      title: 'Explain Transaction',
      subtitle: 'Execution & Gas Decoding',
      icon: Zap,
      iconBg: 'bg-[#0052FF]/25 text-[#60A5FA] border-[#0052FF]/40',
      badge: '100% Onchain',
      badgeColor: 'text-[#4ADE80] bg-[#122B1E] border-[#4ADE80]/30',
      metrics: [
        { label: 'Sample Tx', value: '0x8f2d…70df' },
        { label: 'Method Type', value: 'BasePortal Bridge' },
        { label: 'Asset Inflow', value: '+4,250.00 USDC' },
      ],
      prompt: 'Explain transaction 0x8f2d5c317a9e14c1d764b49cb32ef4f14d896172605b0d00b1464c80389270df on Base Mainnet',
      buttonText: 'Deconstruct Tx',
      highlighted: true,
    },
    {
      id: 'trace',
      title: 'Trace Fund Movements',
      subtitle: 'Multihop Origin & Outflows',
      icon: GitBranch,
      iconBg: 'bg-[#3888FF]/20 text-[#60A5FA] border-[#3888FF]/30',
      badge: '94% Cluster',
      badgeColor: 'text-[#60A5FA] bg-[#102148] border-[#0052FF]/30',
      metrics: [
        { label: 'Tracking Mode', value: 'Deep Cluster Graph' },
        { label: 'Entities', value: 'Gnosis Safe Treasury' },
        { label: 'Chain ID', value: 'Base (8453)' },
      ],
      prompt: 'Trace USDC and ETH fund movements and liquidity deposits for 0x33013807E2c479e4f8380D41c21054E844Ec94A1',
      buttonText: 'Trace Capital Path',
      highlighted: false,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full flex flex-col items-center text-center mb-8"
      >
        {/* Glow Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102148] border border-[#0052FF]/40 text-xs font-mono text-[#F0F4FF] shadow-[0_0_18px_rgba(0,82,255,0.35)] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] shadow-[0_0_8px_#0052FF]" />
          <span>WDMWD · BASE ONCHAIN INTELLIGENCE DESK</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-[#F0F4FF] tracking-tight mb-3">
          What did your wallet do?
        </h1>

        <p className="text-sm sm:text-base text-[#94A3C8] max-w-lg mx-auto font-normal leading-relaxed">
          Ask questions. Follow cryptographic evidence. Understand transactions and asset flow on Base.
        </p>
      </motion.div>

      {/* 3 Cyber Trading Desk Cards in Base Blue style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full px-2 sm:px-0">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className={`relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                card.highlighted
                  ? 'bg-gradient-to-b from-[#101D3D] to-[#0A1124] border-2 border-[#0052FF]/70 shadow-[0_8px_30px_rgba(0,82,255,0.25)]'
                  : 'bg-gradient-to-b from-[#0F172C] to-[#090E1C] border border-[#1E2945] hover:border-[#2A3B66] shadow-[0_8px_20px_rgba(0,0,0,0.4)]'
              }`}
            >
              {/* Card Header with Icon + Title + Confidence Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-heading font-semibold text-sm text-[#F0F4FF] leading-tight">
                        {card.title}
                      </h3>
                      <p className="text-[11px] text-[#627299]">{card.subtitle}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-medium shrink-0 ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Metrics Table */}
                <div className="space-y-2 py-3 border-y border-[#1A2542] my-3 text-xs font-mono">
                  {card.metrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-[#627299] text-[11px] font-sans">{m.label}</span>
                      <span className="text-[#F0F4FF] text-[11px] font-medium">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onSelectPrompt(card.prompt)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  card.highlighted
                    ? 'bg-gradient-to-r from-[#0052FF] to-[#3888FF] text-white shadow-[0_0_20px_rgba(0,82,255,0.5)] hover:brightness-110 active:scale-95'
                    : 'bg-[#121E3C] hover:bg-[#1A2A54] text-[#F0F4FF] border border-[#24355A] active:scale-95'
                }`}
              >
                <span>{card.buttonText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
