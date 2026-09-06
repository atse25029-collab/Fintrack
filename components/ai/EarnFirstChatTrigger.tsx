'use client';

import React from 'react';
import { Sparkles, Bot } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface EarnFirstChatTriggerProps {
  onClick: () => void;
  safeRemaining: number;
}

export default function EarnFirstChatTrigger({
  onClick,
  safeRemaining,
}: EarnFirstChatTriggerProps) {
  const safeLeft = Math.max(0, safeRemaining);

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
      <button
        onClick={onClick}
        type="button"
        className="group flex items-center gap-2 pl-3 pr-3.5 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-full shadow-xl hover:shadow-2xl border border-zinc-700/80 transition-all duration-200 active:scale-95 animate-in fade-in slide-in-from-bottom-3"
        title="Open Earn-First AI Copilot"
      >
        <div className="relative">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-black" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold leading-tight flex items-center gap-1">
            <span>AI Copilot</span>
          </span>
          <span className="text-[9px] font-mono text-zinc-300 leading-none">
            Safe: {formatCurrency(safeLeft)}
          </span>
        </div>
      </button>
    </div>
  );
}
