'use client';

import React, { useState } from 'react';
import { CategoryBreakdownItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { PieChart } from 'lucide-react';

interface CategoryBreakdownProps {
  expenses: CategoryBreakdownItem[];
  incomes: CategoryBreakdownItem[];
}

export default function CategoryBreakdown({
  expenses,
  incomes,
}: CategoryBreakdownProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  const items = activeTab === 'expense' ? expenses : incomes;
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PieChart className="w-4 h-4 text-black shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-black tracking-tight truncate">
            Category Breakdown
          </h3>
        </div>

        <div className="flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs transition-all ${
              activeTab === 'expense'
                ? 'bg-black text-white shadow-sm font-semibold'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs transition-all ${
              activeTab === 'income'
                ? 'bg-black text-white shadow-sm font-semibold'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Income
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl p-4">
          No {activeTab} records found.
        </div>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 6).map((item) => (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-semibold text-zinc-900 truncate min-w-0">{item.category}</span>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-zinc-500">{item.percentage}%</span>
                  <span className="font-bold text-black">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                <div
                  className="h-full bg-black rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Total */}
      <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-500">Total {activeTab}s:</span>
        <span className="font-bold text-black">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
