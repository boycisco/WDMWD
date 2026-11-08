'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink, Search, FileText } from 'lucide-react';
import { ChatMessage, EvidenceItem } from '@/types/api';
import { InvestigationActivity } from './activity';
import { EvidenceReferenceChip } from '@/components/evidence/item';
import {
  formatTimeOnly,
  getBasescanAddressUrl,
  getBasescanTxUrl,
  truncateAddress,
  truncateTxHash,
} from '@/lib/format';
import { isValidAddress, isValidTxHash } from '@/lib/validate';
import { useToast } from '@/components/ui/toast';

interface MessageBubbleProps {
  message: ChatMessage;
  onInspectAddress?: (address: string) => void;
  onInspectEvidence?: (evidence: EvidenceItem) => void;
}

export function MessageBubble({
  message,
  onInspectAddress,
  onInspectEvidence,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string, label = 'Message content') => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Copied ${label} to clipboard`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="w-full flex justify-end mb-4 group">
        <div className="relative max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#12234D] to-[#0D1838] border border-[#1E3778] px-4 py-3 text-sm text-[#F0F4FF] shadow-[0_4px_24px_rgba(0,82,255,0.22)] leading-relaxed break-words font-sans">
          <div className="whitespace-pre-wrap">{message.content}</div>

          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-[#94A3C8]/70 font-mono select-none">
            <span>{formatTimeOnly(message.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="w-full flex justify-start mb-6 group">
      <div className="relative max-w-[95%] sm:max-w-[88%] rounded-2xl rounded-tl-sm bg-[#0E1426] border border-[#1E2945] p-4 sm:p-5 text-sm text-[#F0F4FF] shadow-[0_8px_30px_rgba(0,0,0,0.4)] font-sans leading-relaxed">
        {/* Identity Marker Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1A2542]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0052FF] shadow-[0_0_8px_#0052FF]" />
            <span className="font-heading font-semibold text-xs tracking-wider text-[#F0F4FF]">
              WDMWD
            </span>
            <span className="text-[10px] text-[#627299] font-mono">
              · {formatTimeOnly(message.createdAt)}
            </span>
          </div>

          {/* Contextual actions toolbar */}
          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => handleCopy(message.content, 'response')}
              className="p-1 rounded-lg text-[#94A3C8] hover:text-[#F0F4FF] hover:bg-[#141E38] transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Investigation Steps / Activity */}
        {message.steps && message.steps.length > 0 && (
          <InvestigationActivity
            steps={message.steps}
            isStreaming={message.isStreaming}
          />
        )}

        {/* Markdown Content */}
        <div className="prose prose-invert max-w-none text-sm text-[#F0F4FF] space-y-3 prose-p:leading-relaxed prose-headings:font-heading prose-headings:font-semibold prose-headings:text-[#F0F4FF] prose-h3:text-base prose-h4:text-sm prose-ul:my-2 prose-li:my-0.5 prose-strong:text-[#F0F4FF] prose-code:text-[#60A5FA] prose-code:font-mono prose-code:text-xs">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom code renderer to catch EVM addresses and tx hashes
              code({ node, className, children, ...props }) {
                const codeString = String(children).replace(/\n$/, '').trim();

                if (isValidAddress(codeString)) {
                  return (
                    <span className="inline-flex items-center gap-1 bg-[#101E3D] text-[#60A5FA] px-1.5 py-0.5 rounded-md border border-[#1E3778] font-mono text-xs shadow-sm hover:border-[#0052FF]/60 transition-colors">
                      <span>{codeString}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(codeString, 'address');
                        }}
                        className="hover:text-white p-0.5"
                        title="Copy address"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectAddress?.(codeString);
                        }}
                        className="hover:text-[#4ADE80] p-0.5"
                        title="Inspect Wallet"
                      >
                        <Search className="w-3 h-3" />
                      </button>
                      <a
                        href={getBasescanAddressUrl(codeString)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white p-0.5"
                        title="View on Basescan"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  );
                }

                if (isValidTxHash(codeString)) {
                  return (
                    <span className="inline-flex items-center gap-1 bg-[#122B1E] text-[#4ADE80] px-1.5 py-0.5 rounded-md border border-[#4ADE80]/30 font-mono text-xs shadow-sm hover:border-[#4ADE80]/60 transition-colors">
                      <span>{codeString}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(codeString, 'hash');
                        }}
                        className="hover:text-white p-0.5"
                        title="Copy transaction hash"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <a
                        href={getBasescanTxUrl(codeString)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white p-0.5"
                        title="View on Basescan"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  );
                }

                return (
                  <code className="bg-[#121E3C] text-[#60A5FA] px-1.5 py-0.5 rounded-md border border-[#1E2945] font-mono text-xs" {...props}>
                    {children}
                  </code>
                );
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3888FF] hover:text-[#60A5FA] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>{children}</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Evidence References Strip */}
        {message.evidence && message.evidence.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1A2542]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#627299] mb-2 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#0052FF]" />
              <span>Cryptographic Evidence Records</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.evidence.map((ev) => (
                <EvidenceReferenceChip
                  key={ev.id}
                  evidence={ev}
                  onClick={(selected) => onInspectEvidence?.(selected)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error Message Display */}
        {message.error && (
          <div className="mt-3 p-3 rounded-xl bg-[#F87171]/10 border border-[#F87171]/30 text-xs text-[#F87171] shadow-[0_0_12px_rgba(248,113,113,0.15)]">
            <p className="font-semibold mb-0.5">Error</p>
            <p>{message.error}</p>
          </div>
        )}

        {/* Streaming indicator */}
        {message.isStreaming && !message.content && (
          <div className="flex items-center gap-2 text-xs text-[#94A3C8] pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] animate-pulse shadow-[0_0_6px_#0052FF]" />
            <span>Analyzing Base onchain traces...</span>
          </div>
        )}
      </div>
    </div>
  );
}
