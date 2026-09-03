'use client';

import React from 'react';
import { QuickPreset, PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { getPresetIcon } from './QuickPresetModal';
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from 'lucide-react';

interface QuickAddBarProps {
  presets: QuickPreset[];
  onOpenPresetManager: () => void;
  onQuickAdd: (item: {
    description: string;
    amount: number;
    category: string;
    type: 'expense' | 'income';
    paymentMethod: PaymentMethod;
  }) => void;
  onOpenCustomModal: (type: 'expense' | 'income') => void;
}

export default function QuickAddBar({
  presets,
  onOpenPresetManager,
  onQuickAdd,
  onOpenCustomModal,
}: QuickAddBarProps) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm space-y-3 w-full max-w-full overflow-hidden">
      {/* Header with Customise Presets button */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500 truncate">
          Quick 1-Tap Daily Log (INR)
        </span>

        <button
          type="button"
          onClick={onOpenPresetManager}
          className="flex items-center gap-1 text-[11px] sm:text-xs text-zinc-600 hover:text-black font-medium transition-colors shrink-0"
        >
          <SlidersHorizontal className="w-3 h-3 text-black" />
          <span>Customise ({presets.length})</span>
        </button>
      </div>

      {/* Dynamic 1-Tap Presets Grid (Supports both Incomes and Expenses!) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {presets.map((item) => {
          const Icon = getPresetIcon(item.iconName);
          const isIncome = item.type === 'income';
          const isCash = item.paymentMethod === 'Cash';

          return (
            <button
              key={item.id}
              onClick={() =>
                onQuickAdd({
                  description: item.label,
                  amount: item.amount,
                  category: item.category,
                  type: isIncome ? 'income' : 'expense',
                  paymentMethod: item.paymentMethod,
                })
              }
              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl active:scale-[0.97] transition-all border text-left group min-w-0 ${
                isIncome
                  ? 'bg-zinc-100/70 hover:bg-zinc-100 border-zinc-300'
                  : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className={`p-1.5 rounded-lg border shrink-0 transition-colors ${
                    isIncome
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-zinc-900 border-zinc-200 group-hover:border-black'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs font-semibold text-zinc-950 truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 truncate">
                    {isIncome ? (
                      <span className="text-black font-semibold">+Inflow</span>
                    ) : (
                      <span>-Spend</span>
                    )}
                    <span>&bull;</span>
                    <span className="truncate">{isCash ? 'Hand' : 'Account'}</span>
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-mono font-bold shrink-0 ml-1.5 ${
                  isIncome ? 'text-black font-black' : 'text-zinc-950'
                }`}
              >
                {isIncome ? '+' : '-'}
                {formatCurrency(item.amount)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Primary manual log buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100">
        <button
          onClick={() => onOpenCustomModal('expense')}
          className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-black text-white text-[11px] sm:text-xs font-semibold rounded-xl hover:bg-zinc-800 active:scale-95 transition-all shadow-sm"
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" />
          <span className="truncate">Custom Expense</span>
        </button>

        <button
          onClick={() => onOpenCustomModal('income')}
          className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-zinc-100 text-black text-[11px] sm:text-xs font-semibold rounded-xl hover:bg-zinc-200 active:scale-95 transition-all border border-zinc-300"
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
          <span className="truncate">Log Income</span>
        </button>
      </div>
    </div>
  );
}
