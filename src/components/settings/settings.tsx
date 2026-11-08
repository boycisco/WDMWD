'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Server, Cpu, Database, Network, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { SettingsResponse } from '@/types/api';
import { useToast } from '@/components/ui/toast';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    if (!open) return;

    const loadSettings = async () => {
      try {
        const res = await api.getSettings();
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          showToast('Failed to load settings', 'error');
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [open, showToast]);

  const handleToggleStream = async () => {
    if (!data || updating) return;
    setUpdating(true);
    try {
      const updated = await api.updateSettings({
        streamResponses: !data.config.streamResponses,
      });
      setData(updated);
      showToast('Settings updated', 'success');
    } catch {
      showToast('Failed to update settings', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Settings Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-md bg-[#0E1426] border border-[#1E2945] rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#1A2542]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0052FF] shadow-[0_0_8px_#0052FF]" />
                <h3 className="text-sm font-heading font-semibold text-[#F0F4FF]">
                  System Status & Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3C8] hover:text-[#F0F4FF] hover:bg-[#141E38] transition-colors cursor-pointer"
                aria-label="Close Settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading || !data ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-[#94A3C8]">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0052FF]" />
                <span>Reading diagnostics...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-xs">
                {/* Network & Block Telemetry */}
                <div className="rounded-2xl bg-[#090E1D] border border-[#1A2542] p-3.5 flex flex-col gap-2.5 shadow-inner">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[#627299]">Target Network</span>
                    <span className="text-[#F0F4FF] font-medium">{data.chainName} ({data.chainId})</span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[#627299]">Current Block</span>
                    <span className="text-[#4ADE80] font-semibold drop-shadow-[0_0_6px_rgba(74,222,128,0.3)]">
                      #{data.currentBlock.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[#627299]">Environment</span>
                    <span className="text-[#94A3C8]">{data.environment}</span>
                  </div>
                </div>

                {/* Subsystem Status Indicators */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase text-[#627299] tracking-wider">
                    Subsystem Diagnostics
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#090E1D] border border-[#1A2542] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Network className="w-3.5 h-3.5 text-[#0052FF]" />
                        <span className="text-[#F0F4FF]">Base RPC</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_6px_#4ADE80]" title="Connected" />
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#090E1D] border border-[#1A2542] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-[#0052FF]" />
                        <span className="text-[#F0F4FF]">AI Engine</span>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          data.providerIndicators.aiConnected
                            ? 'bg-[#4ADE80] shadow-[0_0_6px_#4ADE80]'
                            : 'bg-[#FBBF24] shadow-[0_0_6px_#FBBF24]'
                        }`}
                        title={data.aiProvider}
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#090E1D] border border-[#1A2542] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-[#0052FF]" />
                        <span className="text-[#F0F4FF]">Session DB</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_6px_#4ADE80]" title="Active" />
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#090E1D] border border-[#1A2542] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-[#0052FF]" />
                        <span className="text-[#F0F4FF]">Indexer</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_6px_#4ADE80]" title="Active" />
                    </div>
                  </div>
                </div>

                {/* Documented Config Toggles */}
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-[10px] font-mono uppercase text-[#627299] tracking-wider">
                    Preferences
                  </span>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#090E1D] border border-[#1A2542]">
                    <div>
                      <div className="font-medium text-[#F0F4FF]">Stream Responses</div>
                      <div className="text-[11px] text-[#627299]">Stream tokens in real-time via SSE</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleStream}
                      disabled={updating}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        data.config.streamResponses
                          ? 'bg-[#0052FF] shadow-[0_0_10px_rgba(0,82,255,0.55)]'
                          : 'bg-[#18233D]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          data.config.streamResponses ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
