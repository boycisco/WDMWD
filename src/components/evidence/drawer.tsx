'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, ExternalLink } from 'lucide-react';
import { EvidenceItem } from '@/types/api';
import { ClassificationBadge } from '@/components/ui/badge';
import { getBasescanAddressUrl, getBasescanTxUrl } from '@/lib/format';
import { useToast } from '@/components/ui/toast';

interface EvidenceDrawerProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
}

export function EvidenceDrawer({ evidence, onClose }: EvidenceDrawerProps) {
  const { showToast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`, 'success');
  };

  return (
    <AnimatePresence>
      {evidence && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Slide-out Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-md h-full bg-[#0E1426] border-l border-[#1E2945] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-y-auto z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1A2542]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-[#627299]">EVIDENCE RECORD</span>
                <span className="text-xs font-mono text-[#60A5FA]">#{evidence.id}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3C8] hover:text-[#F0F4FF] hover:bg-[#141E38] transition-colors cursor-pointer"
                aria-label="Close Evidence Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="py-5 flex flex-col gap-5 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClassificationBadge classification={evidence.classification} />
                </div>
                <h3 className="text-lg font-heading font-semibold text-[#F0F4FF]">
                  {evidence.title || 'Cryptographic Finding'}
                </h3>
                {evidence.details && (
                  <p className="text-xs text-[#94A3C8] mt-2 leading-relaxed">
                    {evidence.details}
                  </p>
                )}
              </div>

              {/* Data Rows */}
              <div className="flex flex-col gap-3 rounded-2xl bg-[#090E1D] border border-[#1A2542] p-4 text-xs font-mono shadow-inner">
                {evidence.txHash && (
                  <div>
                    <div className="text-[10px] uppercase text-[#627299] mb-1 font-sans">
                      Transaction Hash
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-[#121E3E] px-2.5 py-1.5 rounded-xl border border-[#1E2945]">
                      <span className="text-[#F0F4FF] truncate">{evidence.txHash}</span>
                      <div className="flex items-center gap-1 shrink-0 font-sans">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(evidence.txHash!, 'Transaction hash')}
                          className="p-1 text-[#94A3C8] hover:text-white rounded hover:bg-[#1B2952]"
                          title="Copy hash"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getBasescanTxUrl(evidence.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-[#0052FF] hover:text-[#60A5FA] rounded hover:bg-[#1B2952]"
                          title="View on Basescan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {evidence.address && (
                  <div>
                    <div className="text-[10px] uppercase text-[#627299] mb-1 font-sans">
                      Address
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-[#121E3E] px-2.5 py-1.5 rounded-xl border border-[#1E2945]">
                      <span className="text-[#F0F4FF] truncate">{evidence.address}</span>
                      <div className="flex items-center gap-1 shrink-0 font-sans">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(evidence.address!, 'Address')}
                          className="p-1 text-[#94A3C8] hover:text-white rounded hover:bg-[#1B2952]"
                          title="Copy address"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getBasescanAddressUrl(evidence.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-[#0052FF] hover:text-[#60A5FA] rounded hover:bg-[#1B2952]"
                          title="View on Basescan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {evidence.assetMovement && (
                  <div className="pt-2 border-t border-[#1A2542] flex items-center justify-between">
                    <span className="text-[#627299] font-sans">Asset Movement</span>
                    <span className="text-[#4ADE80] font-semibold drop-shadow-[0_0_6px_rgba(74,222,128,0.3)]">
                      {evidence.assetMovement}
                    </span>
                  </div>
                )}

                {evidence.blockNumber && (
                  <div className="pt-2 border-t border-[#1A2542] flex items-center justify-between">
                    <span className="text-[#627299] font-sans">Block Number</span>
                    <span className="text-[#F0F4FF]">#{evidence.blockNumber.toLocaleString()}</span>
                  </div>
                )}

                {evidence.timestamp && (
                  <div className="pt-2 border-t border-[#1A2542] flex items-center justify-between">
                    <span className="text-[#627299] font-sans">Timestamp</span>
                    <span className="text-[#94A3C8]">{new Date(evidence.timestamp).toLocaleString()}</span>
                  </div>
                )}

                {evidence.source && (
                  <div className="pt-2 border-t border-[#1A2542] flex items-center justify-between">
                    <span className="text-[#627299] font-sans">Source</span>
                    <span className="text-[#94A3C8]">{evidence.source}</span>
                  </div>
                )}
              </div>

              {/* Limitations Section */}
              {evidence.limitations && (
                <div className="rounded-2xl bg-[#231A12]/40 border border-[#44331C] p-4 text-xs">
                  <div className="font-semibold text-[#FBBF24] mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
                    Investigation Limitations
                  </div>
                  <p className="text-[#94A3C8] leading-relaxed">
                    {evidence.limitations}
                  </p>
                </div>
              )}
            </div>

            {/* Footer action */}
            {evidence.explorerLink && (
              <div className="pt-4 border-t border-[#1A2542]">
                <a
                  href={evidence.explorerLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#121E3E] hover:bg-[#1A2B56] text-xs font-medium text-[#F0F4FF] border border-[#1E2945] hover:border-[#0052FF]/60 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(0,82,255,0.25)]"
                >
                  <span>Verify on Basescan Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#0052FF]" />
                </a>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
