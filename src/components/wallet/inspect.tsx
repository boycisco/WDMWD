'use client';
// SPDX-License-Identifier: AGPL-3.0-only

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { WalletInvestigationResponse, EvidenceItem } from '@/types/api';
import { FindingCard } from './finding';
import { EvidenceReferenceChip } from '@/components/evidence/item';
import { getBasescanAddressUrl } from '@/lib/format';
import { useToast } from '@/components/ui/toast';

interface WalletInspectorProps {
  address: string | null;
  onClose: () => void;
  onSelectEvidence: (evidence: EvidenceItem) => void;
}

export function WalletInspector({
  address,
  onClose,
  onSelectEvidence,
}: WalletInspectorProps) {
  const [data, setData] = useState<WalletInvestigationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    if (!address) {
      return;
    }

    const fetchWallet = async () => {
      try {
        const res = await api.getWalletInvestigation(address);
        if (isMounted) {
          setData(res);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to investigate wallet profile');
          setLoading(false);
        }
      }
    };

    fetchWallet();

    return () => {
      isMounted = false;
    };
  }, [address]);

  const handleClose = () => {
    setData(null);
    setError(null);
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied address to clipboard', 'success');
  };

  return (
    <AnimatePresence>
      {address && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Drawer container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg h-full bg-[#0E1426] border-l border-[#1E2945] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-y-auto z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1A2542]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-[#627299]">WALLET INSPECTOR</span>
                <span className="text-xs font-mono text-[#0052FF] font-semibold">BASE MAINNET</span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-[#94A3C8] hover:text-[#F0F4FF] hover:bg-[#141E38] transition-colors cursor-pointer"
                aria-label="Close Wallet Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-[#94A3C8]">
                <Loader2 className="w-6 h-6 animate-spin text-[#0052FF]" />
                <span>Querying Base indexer and sequencer...</span>
              </div>
            )}

            {error && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-8 h-8 text-[#F87171] mb-2 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]" />
                <h4 className="text-sm font-semibold text-[#F0F4FF] mb-1">Investigation Failed</h4>
                <p className="text-xs text-[#94A3C8] mb-4">{error}</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-[#141E38] text-xs font-medium text-white border border-[#1E2945] hover:border-[#0052FF]"
                >
                  Return to Chat
                </button>
              </div>
            )}

            {!loading && !error && data && (
              <div className="py-5 flex flex-col gap-6 flex-1">
                {/* Profile Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-[#627299]">TARGET IDENTIFIER</span>
                    {data.profile.ensOrBasename && (
                      <span className="text-xs font-mono text-[#60A5FA] font-semibold">
                        {data.profile.ensOrBasename}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#090E1D] border border-[#1A2542] font-mono text-xs shadow-inner">
                    <span className="truncate text-[#F0F4FF]">{data.profile.address}</span>
                    <div className="flex items-center gap-1 shrink-0 font-sans">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(data.profile.address)}
                        className="p-1.5 text-[#94A3C8] hover:text-white rounded hover:bg-[#141E38]"
                        title="Copy address"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={getBasescanAddressUrl(data.profile.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-[#0052FF] hover:text-[#60A5FA] rounded hover:bg-[#141E38]"
                        title="View on Basescan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Profile stats */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#121E3E] to-[#090E1D] border border-[#1E2945] shadow-sm">
                      <span className="text-[10px] uppercase text-[#627299] tracking-wider font-sans">ETH Balance</span>
                      <div className="text-base font-bold text-[#4ADE80] font-mono mt-1 drop-shadow-[0_0_8px_rgba(74,222,128,0.25)]">
                        {data.profile.balance}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#121E3E] to-[#090E1D] border border-[#1E2945] shadow-sm">
                      <span className="text-[10px] uppercase text-[#627299] tracking-wider font-sans">Transactions</span>
                      <div className="text-base font-bold text-[#F0F4FF] font-mono mt-1">
                        {data.profile.txCount.toLocaleString()} txs
                      </div>
                    </div>
                  </div>

                  {data.profile.tags && data.profile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {data.profile.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-lg bg-[#141E38] text-[#94A3C8] text-[11px] border border-[#1E2945]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Findings Section */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F0F4FF] font-heading">
                      Synthesized Findings
                    </span>
                    <span className="text-[11px] font-mono text-[#627299]">
                      {data.findings.length} findings
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {data.findings.map((f) => (
                      <FindingCard key={f.id} finding={f} />
                    ))}
                  </div>
                </div>

                {/* Relevant Evidence */}
                {data.evidence && data.evidence.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-semibold text-[#F0F4FF] font-heading">
                      Cryptographic Evidence
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {data.evidence.map((ev) => (
                        <EvidenceReferenceChip
                          key={ev.id}
                          evidence={ev}
                          onClick={onSelectEvidence}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Limitations */}
                {data.limitations && data.limitations.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[#231A12]/40 border border-[#44331C] text-xs">
                    <div className="font-semibold text-[#FBBF24] mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
                      Investigation Limitations
                    </div>
                    <ul className="list-disc list-inside text-[#94A3C8] flex flex-col gap-1 leading-relaxed">
                      {data.limitations.map((lim, idx) => (
                        <li key={idx}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
