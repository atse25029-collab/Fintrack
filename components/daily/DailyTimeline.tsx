'use client';

import React from 'react';
import { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Trash2, Edit2, Calendar } from 'lucide-react';

interface DailyTimelineProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onLogFirst: () => void;
}

export default function DailyTimeline({
  transactions,
  onDelete,
  onEdit,
  onLogFirst,
}: DailyTimelineProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTxs = transactions.filter((t) => t.date === todayStr);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-black shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-black tracking-tight truncate">
            Today&apos;s Activity Stream
          </h3>
        </div>
        <span className="text-[11px] sm:text-xs font-mono text-zinc-500 font-medium shrink-0">
          {todayTxs.length} {todayTxs.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {todayTxs.length === 0 ? (
        <div className="py-8 text-center space-y-2.5 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">No expenses or income logged yet today.</p>
          <button
            onClick={onLogFirst}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Log First Entry</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {todayTxs.map((tx) => {
            const isIncome = tx.type === 'income';
            return (
              <div
                key={tx.id}
                className="py-2.5 sm:py-3 flex items-center justify-between gap-2 -mx-1 px-1.5 rounded-lg hover:bg-zinc-50/80 transition-colors"
              >
                {/* Left info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`p-1.5 sm:p-2 rounded-xl border shrink-0 ${
                      isIncome
                        ? 'bg-zinc-100 border-zinc-300 text-black'
                        : 'bg-black border-zinc-950 text-white'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    ) : (
                      <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-zinc-950 truncate">
                        {tx.description || tx.category}
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.2 bg-zinc-100 text-zinc-600 rounded border border-zinc-200 shrink-0">
                        {tx.paymentMethod.split(' ')[0]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-500 truncate mt-0.5">
                      <span className="truncate">{tx.category}</span>
                      {tx.time && (
                        <>
                          <span className="shrink-0">&bull;</span>
                          <span className="font-mono shrink-0">{tx.time}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right amount and actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-xs sm:text-sm font-mono font-bold ${
                        isIncome ? 'text-black font-extrabold' : 'text-zinc-950'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => onEdit(tx)}
                      aria-label="Edit transaction"
                      className="p-1 text-zinc-400 hover:text-black rounded hover:bg-zinc-200 transition-colors"
                    >
                      <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(tx.id)}
                      aria-label="Delete transaction"
                      className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-zinc-200 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
