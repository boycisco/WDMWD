'use client';

import React from 'react';
import { Search, Zap, GitBranch } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const suggestions = [
    {
      icon: <Search className="w-5 h-5 text-[#0052FF]" />,
      title: "Investigate Wallet",
      description: "Analyze any wallet's activity, transfers, and top counterparties on Base.",
      prompt: "Investigate wallet 0x4200000000000000000000000000000000000010",
    },
    {
      icon: <Zap className="w-5 h-5 text-[#B7F36B]" />,
      title: "Explain Transaction",
      description: "Decode a specific transaction, gas costs, and underlying token movements.",
      prompt: "What happened in transaction 0x7553bfddd1a2afa57d71106d1ad1ef73a9afd63ea6f83b0c15c568f4ddc601ea?",
    },
    {
      icon: <GitBranch className="w-5 h-5 text-[#A0AEC0]" />,
      title: "Trace Fund Movements",
      description: "Follow the flow of ETH and tokens across wallets and smart contracts.",
      prompt: "Trace the fund movements for wallet 0x4200000000000000000000000000000000000010",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[1000px] mx-auto px-4 animate-in fade-in duration-500">
      
      <div className="text-center mb-8">
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#F1F5F9] mb-3 tracking-tight">
          What Did My Wallet Do?
        </h1>
        <p className="text-[#A0AEC0] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Investigate any Base wallet or transaction using natural language. 
          Every answer is backed by cryptographic evidence.
        </p>
      </div>

      {/* grid items-stretch ensures equal height */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full items-stretch">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt(s.prompt)}
            className="flex flex-col items-start p-5 rounded-2xl border border-[#1E2945] bg-[#0E1426]/50 backdrop-blur-sm transition-all duration-300 text-left group h-full
                       hover:bg-[#141B30] hover:border-[#4169FF]/50 hover:shadow-[0_0_20px_rgba(0,82,255,0.15)]"
          >
            <div className="p-2.5 rounded-xl bg-[#0B0F14] border border-[#1E2945] mb-4 group-hover:scale-105 transition-transform">
              {s.icon}
            </div>
            
            <h3 className="font-heading font-semibold text-base text-[#F1F5F9] mb-2">
              {s.title}
            </h3>
            
            {/* flex-1 pushes the link to the bottom so they all align perfectly */}
            <p className="text-xs text-[#A0AEC0] leading-relaxed flex-1">
              {s.description}
            </p>
            
            <div className="mt-5 flex items-center text-xs font-medium text-[#0052FF] group-hover:text-[#3888FF] transition-colors">
              Start investigation <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}