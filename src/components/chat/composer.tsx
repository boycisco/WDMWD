'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { validateMessagePayload } from '@/lib/validate';

interface ComposerProps {
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function Composer({
  onSendMessage,
  onStopGeneration,
  isStreaming,
  disabled,
}: ComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${Math.max(newHeight, 44)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
      return;
    }
  };

  const handleSubmit = () => {
    if (isStreaming) {
      onStopGeneration();
      return;
    }

    const trimmed = value.trim();
    const validation = validateMessagePayload(trimmed);
    if (!validation.valid || disabled) return;

    onSendMessage(trimmed);
    setValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const charCount = value.length;
  const isNearLimit = charCount > 8000;
  const isOverLimit = charCount > 10000;
  const canSend = value.trim().length > 0 && !isOverLimit && !disabled;

  return (
    <div className="w-full max-w-[800px] mx-auto px-4 pb-6 pt-2">
      {/* Main Input Container */}
      <div className="relative flex flex-col rounded-[24px] bg-[#141B30] border border-[#2A3B66] focus-within:border-[#4169FF]/60 focus-within:shadow-[0_0_20px_rgba(65,105,255,0.15)] transition-all shadow-lg p-2">
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a wallet or transaction..."
          rows={1}
          disabled={disabled}
          maxLength={10500}
          className="w-full bg-transparent text-[#F1F5F9] placeholder:text-[#718096] text-[15px] resize-none focus:outline-none px-3 py-2.5 leading-relaxed font-sans max-h-[200px] min-h-[44px]"
        />

        {/* Footer row inside input */}
        <div className="flex items-center justify-between px-2 pb-1 mt-1">
          
          {/* Left: Subtle Badge */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0B0F14]/50 border border-[#253343] text-[10px] font-mono text-[#718096] tracking-wider uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4169FF] shadow-[0_0_6px_#4169FF]" />
              Base Mainnet
            </span>
            {isNearLimit && (
              <span
                className={`text-[11px] font-mono ${
                  isOverLimit ? 'text-[#F17878] font-bold' : 'text-[#E6B45D]'
                }`}
              >
                {charCount}/10k
              </span>
            )}
          </div>

          {/* Right: Action Button */}
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="w-8 h-8 rounded-full bg-[#F17878]/20 hover:bg-[#F17878]/30 text-[#F17878] border border-[#F17878]/30 flex items-center justify-center transition-all cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  canSend
                    ? 'bg-[#F1F5F9] text-[#0B0F14] hover:bg-white active:scale-95 shadow-sm cursor-pointer'
                    : 'bg-[#253343] text-[#718096] cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}