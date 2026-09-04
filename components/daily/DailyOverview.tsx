'use client';

import React from 'react';
import { DailySummary, BudgetConfig } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Target, Sparkles, AlertTriangle, ShieldCheck, ArrowDownRight, ArrowUpRight } from 'lucide-react';

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
            Daily Spending Budget &amp; Allowance
          </span>
        </div>
        <button
          onClick={onOpenBudgetModal}
          className="flex items-center gap-1 text-[11px] sm:text-xs font-medium text-zinc-600 hover:text-black transition-colors shrink-0"
        >
          <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Edit Base ({formatCurrency(summary.baseAllowance || budget.dailyAllowance)}/day)</span>
        </button>
      </div>

      {/* Case A: Active Overspend Deficit Alert (Compensating previous overspending) */}
      {summary.isDeficit && summary.deficitAmount > 0 && (
        <div className="p-3 bg-zinc-900 text-white rounded-xl border border-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="p-1 bg-zinc-800 rounded-lg text-zinc-300 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-4 h-4 text-zinc-200" />
            </div>
            <div className="text-[11px] sm:text-xs min-w-0">
              <span className="font-bold text-white">Overspend Deficit Active: </span>
              <span className="text-zinc-300">
                You overspent by{' '}
                <strong className="text-white font-mono font-bold">
                  {formatCurrency(summary.deficitAmount)}
                </strong>{' '}
                on previous days. Today&apos;s allowance is reduced to compensate!
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-300 self-end sm:self-auto shrink-0 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
            Compensating
          </span>
        </div>
      )}

      {/* Case B: Rollover Savings Surplus (When unspent budget has accumulated) */}
      {!summary.isDeficit && summary.carriedForward > 0 && (
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
        {/* Spent Today (Excluding Monthly Dues) */}
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
              {summary.isDeficit
                ? 'after compensation'
                : summary.carriedForward > 0
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
            {summary.dailyAllowance !== summary.baseAllowance
              ? ` of ${formatCurrency(summary.dailyAllowance)} compensated allowance`
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

      {/* Weekly & Monthly Budget Health Summary */}
      <div className="pt-2 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {/* This Week */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">This Week</span>
            <div className="font-mono text-xs font-semibold text-zinc-900">
              {formatCurrency(summary.weeklySpent)} / {formatCurrency(summary.weeklyTarget)}
            </div>
          </div>
          <div className="text-right shrink-0">
            {summary.weeklyVariance >= 0 ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-bold text-black">
                <ArrowDownRight className="w-3 h-3 text-black" />
                +{formatCurrency(summary.weeklyVariance)} saved
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-bold text-black bg-zinc-200 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="w-3 h-3 text-black" />
                -{formatCurrency(Math.abs(summary.weeklyVariance))} over
              </span>
            )}
          </div>
        </div>

        {/* This Month (Daily Budget Track) */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">Month-to-Date</span>
            <div className="font-mono text-xs font-semibold text-zinc-900">
              {formatCurrency(summary.monthlyDailySpent)} / {formatCurrency(summary.monthlyDailyTarget)}
            </div>
          </div>
          <div className="text-right shrink-0">
            {summary.monthlyDailyVariance >= 0 ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-bold text-black">
                <ArrowDownRight className="w-3 h-3 text-black" />
                +{formatCurrency(summary.monthlyDailyVariance)} saved
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-bold text-black bg-zinc-200 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="w-3 h-3 text-black" />
                -{formatCurrency(Math.abs(summary.monthlyDailyVariance))} over
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-zinc-400 text-center">
        Fixed monthly dues (rent, bills) are part of your monthly ceiling and do not reduce your daily budget.
      </p>
    </div>
  );
}
