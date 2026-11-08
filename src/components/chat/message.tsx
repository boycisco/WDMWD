'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink, Search, FileText, ChevronRight } from 'lucide-react';
import { ChatMessage, EvidenceItem } from '@/types/api';
import { InvestigationActivity } from './activity';
import { EvidenceReferenceChip } from '@/components/evidence/item';
import { formatTimeOnly, getBasescanAddressUrl, getBasescanTxUrl } from '@/lib/format';
import { isValidAddress, isValidTxHash } from '@/lib/validate';
import { useToast } from '@/components/ui/toast';

interface MessageBubbleProps {
  message: ChatMessage;
  onInspectAddress?: (address: string) => void;
  onInspectEvidence?: (evidence: EvidenceItem) => void;
}

export function MessageBubble({ message, onInspectAddress, onInspectEvidence }: MessageBubbleProps) {
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
      <div className="w-full flex justify-end mb-6 group">
        <div className="relative max-w-[85%] sm:max-w-[75%] rounded-3xl bg-[#17212D] border border-[#253343] px-5 py-3.5 text-[15px] text-[#F1F5F9] leading-relaxed shadow-sm">
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] text-[#718096] font-mono select-none">
            <span>{formatTimeOnly(message.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex gap-4 mb-8 group text-[#F1F5F9]">
      <div className="w-8 h-8 rounded-full bg-[#0B0F14] border border-[#253343] flex items-center justify-center shrink-0 mt-0.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#0052FF] shadow-[0_0_8px_#0052FF]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-heading font-semibold text-sm text-[#F1F5F9]">WDMWD</span>
          <span className="text-[11px] text-[#718096] font-mono">{formatTimeOnly(message.createdAt)}</span>
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleCopy(message.content, 'response')}
              className="p-1 rounded-md text-[#718096] hover:text-[#F1F5F9] hover:bg-[#1C2938] transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#B7F36B]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {message.steps && message.steps.length > 0 && (
          <InvestigationActivity steps={message.steps} isStreaming={message.isStreaming} />
        )}

        {/* Markdown Text */}
        <div className="prose prose-invert max-w-none text-[15px] text-[#E2E8F0] leading-7 prose-p:leading-7 prose-headings:font-heading prose-headings:font-semibold prose-headings:text-[#F1F5F9] prose-h3:text-lg prose-h4:text-base prose-ul:my-4 prose-li:my-1.5 prose-strong:text-[#F1F5F9] prose-code:text-[#93C5FD] prose-code:bg-[#17212D] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[13px] prose-pre:bg-[#0B0F14] prose-pre:border prose-pre:border-[#253343] prose-pre:rounded-xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, className, children, ...props }) {
                const codeString = String(children).replace(/\n$/, '').trim();
                if (isValidAddress(codeString)) {
                  return (
                    <span className="inline-flex items-center gap-1 bg-[#17212D] text-[#93C5FD] px-2 py-0.5 rounded-md border border-[#253343] font-mono text-[13px] hover:border-[#4169FF]/50 transition-colors">
                      <span>{codeString}</span>
                      <button onClick={() => handleCopy(codeString, 'address')} className="hover:text-white p-0.5"><Copy className="w-3 h-3" /></button>
                      <button onClick={() => onInspectAddress?.(codeString)} className="hover:text-[#B7F36B] p-0.5"><Search className="w-3 h-3" /></button>
                      <a href={getBasescanAddressUrl(codeString)} target="_blank" rel="noreferrer" className="hover:text-white p-0.5"><ExternalLink className="w-3 h-3" /></a>
                    </span>
                  );
                }
                if (isValidTxHash(codeString)) {
                  return (
                    <span className="inline-flex items-center gap-1 bg-[#17212D] text-[#B7F36B] px-2 py-0.5 rounded-md border border-[#253343] font-mono text-[13px] hover:border-[#B7F36B]/50 transition-colors">
                      <span>{codeString}</span>
                      <button onClick={() => handleCopy(codeString, 'hash')} className="hover:text-white p-0.5"><Copy className="w-3 h-3" /></button>
                      <a href={getBasescanTxUrl(codeString)} target="_blank" rel="noreferrer" className="hover:text-white p-0.5"><ExternalLink className="w-3 h-3" /></a>
                    </span>
                  );
                }
                return <code className={className} {...props}>{children}</code>;
              },
              a({ href, children }) {
                return (
                  <a href={href} target="_blank" rel="noreferrer" className="text-[#60A5FA] hover:text-[#93C5FD] hover:underline inline-flex items-center gap-0.5">
                    <span>{children}</span><ExternalLink className="w-3 h-3 inline" />
                  </a>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {message.evidence && message.evidence.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#253343]">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#718096] mb-2">
              <FileText className="w-3.5 h-3.5 text-[#4169FF]" />
              <span>Sources ({message.evidence.length})</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
              {message.evidence.slice(0, 4).map((ev) => (
                <EvidenceReferenceChip key={ev.id} evidence={ev} onClick={(selected) => onInspectEvidence?.(selected)} />
              ))}
              {message.evidence.length > 4 && (
                <button
                  onClick={() => onInspectEvidence?.(message.evidence![4]!)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#253343] bg-[#111821] text-xs text-[#A0AEC0] hover:text-[#F1F5F9] hover:bg-[#1C2938] transition-colors"
                >
                  +{message.evidence.length - 4} more
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {message.isStreaming && !message.content && (!message.steps || message.steps.length === 0) && (
          <div className="flex items-center gap-2 text-sm text-[#A0AEC0] py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4169FF] animate-pulse shadow-[0_0_6px_#4169FF]" />
            <span>Thinking...</span>
          </div>
        )}

        {message.error && (
          <div className="mt-3 p-3 rounded-xl bg-[#F17878]/10 border border-[#F17878]/20 text-sm text-[#F17878]">
            <p className="font-semibold mb-0.5">Error</p>
            <p>{message.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}