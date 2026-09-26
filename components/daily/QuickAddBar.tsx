'use client';

import React from 'react';
import { motion } from 'motion/react';
import { QuickPreset, PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { getPresetIcon } from './QuickPresetModal';
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal, MessageSquare, ArrowRightLeft } from 'lucide-react';

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
  onOpenPasteSms: () => void;
  onOpenTransferModal?: () => void;
}

export default function QuickAddBar({
  presets,
  onOpenPresetManager,
  onQuickAdd,
  onOpenCustomModal,
  onOpenPasteSms,
  onOpenTransferModal,
}: QuickAddBarProps) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm space-y-3 w-full max-w-full overflow-hidden">
      {/* Header with Customise Presets button */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500 truncate">
          Quick 1-Tap Daily Log (INR)
        </span>

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onOpenPresetManager}
          className="flex items-center gap-1 text-[11px] sm:text-xs text-zinc-600 hover:text-black font-medium transition-colors shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-3 h-3 text-black" />
          <span>Customise ({presets.length})</span>
        </motion.button>
      </div>

      {/* Dynamic 1-Tap Presets Grid (Supports both Incomes and Expenses!) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {presets.map((item) => {
          const Icon = getPresetIcon(item.iconName);
          const isIncome = item.type === 'income';
          const isCash = item.paymentMethod === 'Cash';

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.96 }}
              onClick={() =>
                onQuickAdd({
                  description: item.label,
                  amount: item.amount,
                  category: item.category,
                  type: item.type || 'expense',
                  paymentMethod: item.paymentMethod,
                })
              }
              className={`p-2.5 sm:p-3 rounded-xl border transition-all text-left flex items-center justify-between gap-2 group cursor-pointer shadow-2xs ${
                isIncome
                  ? 'bg-zinc-50 hover:bg-zinc-100/80 border-zinc-200'
                  : 'bg-zinc-50 hover:bg-zinc-100/80 border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isIncome ? 'bg-black text-white' : 'bg-black text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 group-hover:text-black truncate leading-tight">
                    {item.label}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-600 leading-none mt-0.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        isCash ? 'bg-black' : 'bg-black'
                      }`}
                    />
                    <span>{item.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`text-xs sm:text-sm font-bold font-mono block leading-tight ${
                    isIncome ? 'text-black' : 'text-zinc-950 font-black'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(item.amount)}
                </span>
                <span
                  className={`text-[9px] font-mono uppercase tracking-wider block ${
                    isIncome ? 'text-zinc-700 font-bold' : 'text-zinc-600 font-semibold'
                  }`}
                >
                  {item.type || 'expense'}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Primary manual log buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100">
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onOpenCustomModal('expense')}
          className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-black text-white text-[11px] sm:text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" />
          <span className="truncate">Custom Expense</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onOpenCustomModal('income')}
          className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-zinc-100 text-black text-[11px] sm:text-xs font-semibold rounded-xl hover:bg-zinc-200 transition-colors border border-zinc-300 cursor-pointer"
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
          <span className="truncate">Log Income</span>
        </motion.button>
      </div>

      {/* Smart 1-Tap Entry: Paste SMS & Transfer */}
      <div className={`pt-1 border-t border-zinc-100 ${onOpenTransferModal ? 'grid grid-cols-2 gap-2' : ''}`}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenPasteSms}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-[11px] font-semibold rounded-xl border border-zinc-200 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-black" />
          <span>Paste Bank SMS</span>
        </motion.button>

        {onOpenTransferModal && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenTransferModal}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-[11px] font-semibold rounded-xl border border-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-black" />
            <span>Transfer Funds</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
