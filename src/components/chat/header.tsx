'use client';

import React from 'react';
import { PanelLeft, Settings2, Sparkles } from 'lucide-react';
import { HealthCheckResponse } from '@/types/api';

interface HeaderProps {
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  health: HealthCheckResponse | null;
  historyOpen?: boolean;
}

export function Header({
  onToggleHistory,
  onOpenSettings,
  health,
  historyOpen,
}: HeaderProps) {
  const isHealthy = health?.status === 'ok';

  return (
    <header className="sticky top-0 z-30 w-full px-3 sm:px-6 pt-3 pb-2 transition-all">
      <div className="max-w-6xl mx-auto h-14 rounded-2xl bg-[#0E1424]/90 backdrop-blur-xl border border-[#1E2945] px-3.5 sm:px-5 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        {/* Left: History drawer toggle & WDMWD Base Blue brand lockup */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleHistory}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              historyOpen
                ? 'bg-[#14234C] text-[#F0F4FF] shadow-[0_0_14px_rgba(0,82,255,0.4)] border border-[#0052FF]/50'
                : 'text-[#94A3C8] hover:text-[#F0F4FF] hover:bg-[#141B30] border border-transparent hover:border-[#2A3B66]'
            }`}
            aria-label="Toggle Conversation History"
            title="Conversation History"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 px-2.5 rounded-xl bg-gradient-to-r from-[#0052FF]/20 to-[#3888FF]/10 border border-[#0052FF]/40 flex items-center gap-1.5 shadow-[0_0_14px_rgba(0,82,255,0.3)]">
              <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
              <span className="font-heading font-bold text-sm tracking-wide text-[#F0F4FF] select-none">
                WDMWD
              </span>
            </div>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#141B30] border border-[#1E2945] text-[10px] text-[#94A3C8] font-mono font-medium">
              BASE ONCHAIN INTELLIGENCE
            </span>
          </div>
        </div>

        {/* Center: Subtle capability indicators */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-[#080D1A]/80 border border-[#1A243F] text-[11px] font-medium text-[#94A3C8]">
          <span className="px-2.5 py-1 rounded-lg text-[#F0F4FF] bg-[#121E3E] border border-[#2A3B66] shadow-[0_0_10px_rgba(0,82,255,0.2)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shadow-[0_0_6px_#4ADE80]" />
            Live Assistant
          </span>
          <span className="px-2.5 py-1 text-[#627299]">Wallet Scanner</span>
          <span className="px-2.5 py-1 text-[#627299]">Fund Flow</span>
        </div>

        {/* Right: Base Mainnet indicator & Settings toggle */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A0F1F] border border-[#1E2945] text-xs font-mono text-[#94A3C8] shadow-inner"
            title={
              health?.blockNumber
                ? `Base Mainnet (8453) · Block #${health.blockNumber.toLocaleString()} · ${health.checks.blockchain.latencyMs || 40}ms`
                : 'Base Mainnet (8453)'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy
                  ? 'bg-[#0052FF] shadow-[0_0_8px_#0052FF]'
                  : 'bg-[#FBBF24] shadow-[0_0_8px_#FBBF24]'
              }`}
            />
            <span className="text-[11px] font-semibold text-[#F0F4FF]">BASE</span>
            {health?.blockNumber && (
              <span className="hidden lg:inline text-[10px] text-[#627299]">
                #{health.blockNumber}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-[#94A3C8] hover:text-[#F0F4FF] bg-[#0A0F1F] hover:bg-[#141B30] border border-[#1E2945] hover:border-[#2A3B66] transition-all cursor-pointer shadow-sm"
            aria-label="Settings"
            title="Settings & System Diagnostics"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
