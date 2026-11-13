'use client';
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';
import { Search, Zap, GitBranch } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const suggestions = [
    {
      icon: <Search className="w-4 h-4" />,
      title: "Investigate Wallet",
      prompt: "Investigate wallet 0x4200000000000000000000000000000000000010",
    },
    {
      icon: <Zap className="w-4 h-4" />,
      title: "Explain Transaction",
      prompt: "What happened in transaction 0x7553bfddd1a2afa57d71106d1ad1ef73a9afd63ea6f83b0c15c568f4ddc601ea?",
    },
    {
      icon: <GitBranch className="w-4 h-4" />,
      title: "Trace Funds",
      prompt: "Trace the fund movements for wallet 0x4200000000000000000000000000000000000010",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[800px] mx-auto animate-in fade-in duration-500 h-full">
      
      {/* Scaled text down slightly for mobile to prevent scrolling */}
      <h1 className="font-heading text-3xl sm:text-5xl font-bold text-[#F1F5F9] mb-3 sm:mb-4 text-center tracking-tight px-4">
        What Did My Wallet Do?
      </h1>
      <p className="text-[#A0AEC0] text-sm sm:text-lg text-center mb-6 sm:mb-10 max-w-3xl mx-auto leading-relaxed text-balance px-4">
        Investigate any Base wallet or transaction using natural language.
      </p>

      <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex flex-row flex-nowrap sm:flex-wrap items-center justify-start sm:justify-center gap-2 sm:gap-3 min-w-max sm:min-w-0 px-4 sm:px-0">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectPrompt(s.prompt)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#253343] bg-[#111821]/50 backdrop-blur-sm text-sm font-medium text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#1C2938] hover:border-[#4169FF]/50 transition-all touch-manipulation active:scale-95 shrink-0"
            >
              {s.icon}
              {s.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}