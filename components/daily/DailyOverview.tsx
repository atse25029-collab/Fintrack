'use client';

import React from 'react';
import { DailySummary, BudgetConfig } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Target, AlertCircle } from 'lucide-react';

interface DailyOverviewProps {
  summary: DailySummary;
  budget: BudgetConfig;
  onOpenBudgetModal: () => void;
}

export default function DailyOverview({
  summary,
  budget,
  onOpenBudgetModal,
}: DailyOverviewProps) {
  const percentCapped = Math.min(100, summary.percentUsed);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm w-full max-w-full overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-black shrink-0" />
          <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500 truncate">
            Daily Budget &amp; Allowance
          </span>
        </div>
        <button
          onClick={onOpenBudgetModal}
          className="flex items-center gap-1 text-[11px] sm:text-xs font-medium text-zinc-600 hover:text-black transition-colors shrink-0"
        >
          <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Edit ({formatCurrency(budget.dailyAllowance)}/day)</span>
        </button>
      </div>

      {/* Main daily numbers: Compact responsive grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {/* Spent Today */}
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-xs text-zinc-500 font-medium block truncate">
            Spent Today
          </span>
          <div className="text-base sm:text-2xl font-bold font-mono text-black truncate">
            {formatCurrency(summary.spentToday)}
          </div>
          <span className="text-[10px] sm:text-xs font-mono text-zinc-400 block truncate">
            / {formatCurrency(summary.dailyAllowance)}
          </span>
        </div>

        {/* Remaining Allowance */}
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-xs text-zinc-500 font-medium block truncate">
            Remaining
          </span>
          <div
            className={`text-base sm:text-2xl font-bold font-mono truncate ${
              summary.isOverBudget ? 'text-zinc-950 font-black' : 'text-zinc-900'
            }`}
          >
            {summary.isOverBudget
              ? `-${formatCurrency(summary.spentToday - summary.dailyAllowance)}`
              : formatCurrency(summary.remainingAllowance)}
          </div>
          {summary.isOverBudget ? (
            <span className="inline-block text-[9px] sm:text-[10px] font-mono px-1 py-0.2 bg-black text-white rounded font-medium truncate">
              Over Target
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs text-zinc-500 block truncate">available</span>
          )}
        </div>

        {/* Today's Income */}
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-xs text-zinc-500 font-medium block truncate">
            Earned Today
          </span>
          <div className="text-base sm:text-2xl font-bold font-mono text-black truncate">
            +{formatCurrency(summary.earnedToday)}
          </div>
          <span className="text-[10px] sm:text-xs text-zinc-500 block truncate">inflows</span>
        </div>
      </div>

      {/* Progress meter */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] sm:text-xs text-zinc-600 font-mono">
          <span>{summary.percentUsed}% used</span>
          <span>{formatCurrency(Math.max(0, budget.dailyAllowance - summary.spentToday))} left</span>
        </div>
        <div className="w-full h-2 sm:h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              summary.isOverBudget ? 'bg-zinc-950' : 'bg-black'
            }`}
            style={{ width: `${percentCapped}%` }}
          />
        </div>
      </div>
    </div>
  );
}
