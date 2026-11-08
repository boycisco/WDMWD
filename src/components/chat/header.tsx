'use client';

import React from 'react';
import { Menu, Settings } from 'lucide-react';
import { HealthCheckResponse } from '@/types/api';

interface HeaderProps {
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  health: HealthCheckResponse | null;
  historyOpen?: boolean;
}

export function Header({ onToggleHistory, onOpenSettings }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between w-full max-w-[1100px] mx-auto px-4 sm:px-8 py-4 pointer-events-none">
      {/* Left: Circular History Button */}
      <button
        onClick={onToggleHistory}
        className="pointer-events-auto w-10 h-10 rounded-full bg-[#111821]/80 backdrop-blur-md border border-[#253343] flex items-center justify-center text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#1C2938] transition-colors shadow-sm"
        title="Toggle History"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Right: Circular Settings Button */}
      <button
        onClick={onOpenSettings}
        className="pointer-events-auto w-10 h-10 rounded-full bg-[#111821]/80 backdrop-blur-md border border-[#253343] flex items-center justify-center text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#1C2938] transition-colors shadow-sm"
        title="Settings"
      >
        <Settings className="w-4.5 h-4.5" />
      </button>
    </header>
  );
}