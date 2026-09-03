'use client';

import React, { useState } from 'react';
import { CashflowPoint } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

interface SpendingChartProps {
  data: CashflowPoint[];
}

export default function SpendingChart({ data }: SpendingChartProps) {
  const [activePoint, setActivePoint] = useState<CashflowPoint | null>(null);

  const maxVal = Math.max(...data.map((d) => Math.max(d.expense, d.income)), 200);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 text-black shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-black tracking-tight truncate">
            7-Day Cashflow (INR)
          </h3>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono shrink-0">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-black rounded-sm" />
            <span className="text-zinc-600">Expenses</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-zinc-300 rounded-sm" />
            <span className="text-zinc-600">Income</span>
          </div>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="pt-2 pb-1">
        <div className="h-36 sm:h-44 flex items-end justify-between gap-1 sm:gap-3 border-b border-zinc-200 px-0.5">
          {data.map((point) => {
            const expHeight = Math.round((point.expense / maxVal) * 100);
            const incHeight = Math.round((point.income / maxVal) * 100);
            const isHovered = activePoint?.date === point.date;

            return (
              <div
                key={point.date}
                onClick={() => setActivePoint(point)}
                onMouseEnter={() => setActivePoint(point)}
                onMouseLeave={() => setActivePoint(null)}
                className="flex-1 flex flex-col items-center gap-1 h-full justify-end group cursor-pointer min-w-0"
              >
                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-28 sm:h-36">
                  {/* Income bar */}
                  <div
                    className="w-1/2 max-w-[8px] sm:max-w-[12px] bg-zinc-300 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(incHeight, point.income > 0 ? 6 : 0)}%` }}
                    title={`Income: ${formatCurrency(point.income)}`}
                  />
                  {/* Expense bar */}
                  <div
                    className="w-1/2 max-w-[8px] sm:max-w-[12px] bg-black rounded-t-sm transition-all"
                    style={{ height: `${Math.max(expHeight, point.expense > 0 ? 6 : 0)}%` }}
                    title={`Expense: ${formatCurrency(point.expense)}`}
                  />
                </div>

                <span
                  className={`text-[9px] sm:text-[10px] font-mono transition-colors truncate text-center ${
                    isHovered ? 'text-black font-bold' : 'text-zinc-500'
                  }`}
                >
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip / Active details */}
      <div className="min-h-[24px] flex items-center justify-between text-[10px] sm:text-xs font-mono px-0.5">
        {activePoint ? (
          <>
            <span className="text-zinc-600 font-medium truncate">
              {activePoint.label}:
            </span>
            <div className="flex gap-2 font-semibold shrink-0">
              <span className="text-zinc-900">
                -{formatCurrency(activePoint.expense)}
              </span>
              <span className="text-zinc-600">
                +{formatCurrency(activePoint.income)}
              </span>
            </div>
          </>
        ) : (
          <span className="text-zinc-400 text-[10px]">
            Tap any day to view details
          </span>
        )}
      </div>
    </div>
  );
}
