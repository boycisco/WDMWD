'use client';
// SPDX-License-Identifier: AGPL-3.0-only

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  ExternalLink,
  Search,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const handleCopy = (text: string, label = 'Message content') => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Copied ${label} to clipboard`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="w-full flex justify-end mb-6 group">
        <div className="relative max-w-[85%] sm:max-w-[75%] rounded-3xl bg-[#17212D] border border-[#253343] px-5 py-3.5 text-[15px] text-[#F1F5F9] leading-relaxed shadow-sm break-words">
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] text-[#718096] font-mono select-none">
            <span>{formatTimeOnly(message.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  const hasSteps = message.steps && message.steps.length > 0;
  const isWaitingForText = message.isStreaming && !message.content;

  // Assistant message - ChatGPT style
  return (
    <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 group text-[#F1F5F9]">
      {/* Avatar - Premium Gradient Ring */}
      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0052FF] to-[#B7F36B] p-[1px] shrink-0 mt-1 shadow-[0_0_8px_rgba(0,82,255,0.25)]">
        <div className="w-full h-full bg-[#0B0F14] rounded-full flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] shadow-[0_0_4px_#60A5FA]" />
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        {/* Header - Removed WDMWD text */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-[#718096] font-mono">{formatTimeOnly(message.createdAt)}</span>
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleCopy(message.content, 'response')}
              className="p-1 rounded-md text-[#718096] hover:text-[#F1F5F9] hover:bg-[#1C2938] transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Activity */}
        {hasSteps && (
          <InvestigationActivity steps={message.steps} isStreaming={message.isStreaming} />
        )}

        {/* Loading Indicator for Synthesis (Bridges the gap) */}
        {isWaitingForText && (
          <div className="flex items-center gap-2 text-sm text-[#A0AEC0] py-2 my-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF] animate-pulse shadow-[0_0_6px_#0052FF]" />
            <span>Synthesizing onchain findings...</span>
          </div>
        )}

        {/* Markdown Text */}
        {message.content && (
          <div className="prose prose-invert max-w-none text-[15px] text-[#E2E8F0] leading-7 break-words prose-p:leading-7 prose-headings:font-heading prose-headings:font-semibold prose-headings:text-[#F1F5F9] prose-h3:text-lg prose-h4:text-base prose-ul:my-4 prose-li:my-1.5 prose-strong:text-[#F1F5F9] prose-code:text-[#93C5FD] prose-code:bg-[#17212D] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[13px] prose-pre:bg-[#0B0F14] prose-pre:border prose-pre:border-[#253343] prose-pre:rounded-xl prose-pre:overflow-x-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  const codeString = String(children).replace(/\n$/, '').trim();
                  if (isValidAddress(codeString)) {
                    return (
                      <span className="inline-flex items-center gap-1 bg-[#17212D] text-[#93C5FD] px-2 py-0.5 rounded-md border border-[#253343] font-mono text-[13px] hover:border-[#0052FF]/50 transition-colors break-all">
                        <span className="truncate max-w-[150px] sm:max-w-none">{codeString}</span>
                        <button onClick={() => handleCopy(codeString, 'address')} className="hover:text-white p-0.5 shrink-0"><Copy className="w-3 h-3" /></button>
                        <button onClick={() => onInspectAddress?.(codeString)} className="hover:text-[#B7F36B] p-0.5 shrink-0"><Search className="w-3 h-3" /></button>
                        <a href={getBasescanAddressUrl(codeString)} target="_blank" rel="noreferrer" className="hover:text-white p-0.5 shrink-0"><ExternalLink className="w-3 h-3" /></a>
                      </span>
                    );
                  }
                  if (isValidTxHash(codeString)) {
                    return (
                      <span className="inline-flex items-center gap-1 bg-[#17212D] text-[#B7F36B] px-2 py-0.5 rounded-md border border-[#253343] font-mono text-[13px] hover:border-[#B7F36B]/50 transition-colors break-all">
                        <span className="truncate max-w-[150px] sm:max-w-none">{codeString}</span>
                        <button onClick={() => handleCopy(codeString, 'hash')} className="hover:text-white p-0.5 shrink-0"><Copy className="w-3 h-3" /></button>
                        <a href={getBasescanTxUrl(codeString)} target="_blank" rel="noreferrer" className="hover:text-white p-0.5 shrink-0"><ExternalLink className="w-3 h-3" /></a>
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
        )}

        {/* Collapsible Sources */}
        {message.evidence && message.evidence.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1E2945]">
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#718096] hover:text-[#A0AEC0] transition-colors mb-2"
            >
              <FileText className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Sources ({message.evidence.length})</span>
              {sourcesExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </button>
            
            {sourcesExpanded && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center animate-in fade-in slide-in-from-top-2 duration-200">
                {message.evidence.map((ev) => (
                  <EvidenceReferenceChip key={ev.id} evidence={ev} onClick={(selected) => onInspectEvidence?.(selected)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
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