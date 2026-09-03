'use client';

import React from 'react';
import { DailySummary, BudgetConfig } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Target, Sparkles, TrendingUp } from 'lucide-react';

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
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm w-full max-w-full overflow-hidden space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
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
          <span>Edit ({formatCurrency(summary.baseAllowance || budget.dailyAllowance)}/day)</span>
        </button>
      </div>

      {/* Carried Forward Rollover Banner (When unspent budget has accumulated) */}
      {summary.carriedForward > 0 && (
        <div className="flex items-center justify-between p-2.5 sm:p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 bg-black text-white rounded-lg shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-700 min-w-0">
              <span className="font-semibold text-black">Rollover Accumulated: </span>
              <span>Unspent budget from previous days carried forward</span>
            </div>
          </div>
          <span className="text-xs sm:text-sm font-mono font-bold text-black shrink-0 ml-2">
            +{formatCurrency(summary.carriedForward)}
          </span>
        </div>
      )}

      {/* Main daily numbers: Compact responsive grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Spent Today */}
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-xs text-zinc-500 font-medium block truncate">
            Spent Today
          </span>
          <div className="text-base sm:text-2xl font-bold font-mono text-black truncate">
            {formatCurrency(summary.spentToday)}
          </div>
          <span className="text-[10px] sm:text-xs font-mono text-zinc-500 block truncate">
            / {formatCurrency(summary.dailyAllowance)}
          </span>
        </div>

        {/* Remaining Allowance */}
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-xs text-zinc-500 font-medium block truncate">
            Remaining Today
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
              Over Budget
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs text-zinc-500 block truncate">
              {summary.carriedForward > 0
                ? `incl. +${formatCurrency(summary.carriedForward)} rollover`
                : 'available to spend'}
            </span>
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
          <span className="text-[10px] sm:text-xs text-zinc-500 block truncate">inflows / wage</span>
        </div>
      </div>

      {/* Progress meter */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[10px] sm:text-xs text-zinc-600 font-mono">
          <span>
            {summary.percentUsed}% used
            {summary.carriedForward > 0
              ? ` of ${formatCurrency(summary.dailyAllowance)} total allowance`
              : ''}
          </span>
          <span className="font-semibold text-zinc-900">
            {formatCurrency(summary.remainingAllowance)} left
          </span>
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
