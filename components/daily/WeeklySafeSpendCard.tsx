'use client';

import React, { useState } from 'react';
import {
  WeeklySafeSpendState,
  WeeklySafeSpendConfig,
  MonthlyDue,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Settings2,
  TrendingUp,
  Briefcase,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Coins,
  CheckCircle2,
  Lock,
  Wallet,
  Calendar,
  Users,
} from 'lucide-react';
import SafeSpendConfigModal from './SafeSpendConfigModal';
import QuickIncomeModal from './QuickIncomeModal';

interface WeeklySafeSpendCardProps {
  state: WeeklySafeSpendState;
  config: WeeklySafeSpendConfig;
  onUpdateConfig: (newConfig: WeeklySafeSpendConfig) => void;
  onLogShift: (amount: number, description: string) => void;
  onLogIncome?: (
    amount: number,
    category: string,
    description: string,
    wallet: 'Cash' | 'UPI / Bank'
  ) => void;
  dues?: MonthlyDue[];
  onOpenCopilot?: () => void;
}

export default function WeeklySafeSpendCard({
  state,
  config,
  onUpdateConfig,
  onLogShift,
  onLogIncome,
  dues = [],
  onOpenCopilot,
}: WeeklySafeSpendCardProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isObligationsOpen, setIsObligationsOpen] = useState(false);

  const isOverspent = state.isOverspentToday;
  const isClose = !isOverspent && state.percentUsedToday >= 80;

  return (
    <div className="w-full bg-white rounded-3xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-4 transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-black text-white rounded-xl shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Weekly Safe to Spend
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                {state.shiftsCompletedThisWeek} of {state.plannedWorkShiftsThisWeek} shifts done
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-50 text-zinc-600 border border-zinc-200">
                {state.daysRemainingInWeek} {state.daysRemainingInWeek === 1 ? 'day left' : 'days left'}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">
              Anchored to real bank balances &bull; All dues and tabs ring-fenced
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              type="button"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-all active:scale-95 shadow-2xs"
              title="Chat with AI Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Ask Copilot</span>
            </button>
          )}

          <button
            onClick={() => setIsConfigOpen(true)}
            className="p-2 rounded-xl text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
            title="Safe Spend Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Safe Spend Today Metric */}
      <div className="p-3.5 sm:p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
              Safe Left to Spend Today
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`text-2xl sm:text-3xl font-mono font-black tracking-tight ${
                  isOverspent
                    ? 'text-red-600'
                    : isClose
                    ? 'text-amber-600'
                    : 'text-zinc-950'
                }`}
              >
                {formatCurrency(Math.max(0, state.remainingSafeToday))}
              </span>
              {isOverspent && (
                <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                  Overspent by {formatCurrency(state.overspentAmount)}
                </span>
              )}
            </div>
          </div>

          <div className="text-right sm:text-right text-[11px] font-mono text-zinc-600 space-y-0.5">
            <div>
              Daily Target: <strong className="text-zinc-900">{formatCurrency(state.dailyTargetToday)}</strong>
            </div>
            <div>
              Spent Today: <strong className="text-zinc-900">{formatCurrency(state.spentToday)}</strong>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverspent
                  ? 'bg-red-600'
                  : isClose
                  ? 'bg-amber-500'
                  : 'bg-black'
              }`}
              style={{ width: `${Math.min(100, state.percentUsedToday)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>{state.percentUsedToday}% of safe limit used today</span>
            <span>
              {isOverspent
                ? 'Absorbed by weekly cushion'
                : isClose
                ? 'Approaching limit'
                : 'Pacing safely'}
            </span>
          </div>
        </div>
      </div>

      {/* Live Financial Pillars: Real Liquid Cash, Work Income, Locked Obligations */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Pillar 1: Liquid Cash */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1">
          <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-mono uppercase">
            <Wallet className="w-3 h-3 text-black" />
            <span>Liquid Cash</span>
          </div>
          <div className="font-mono font-bold text-zinc-900 text-sm">
            {formatCurrency(state.totalLiquidFunds)}
          </div>
          <div className="text-[10px] text-zinc-400 truncate">Cash + Bank in hand</div>
        </div>

        {/* Pillar 2: Estimated Work Remaining */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1">
          <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-mono uppercase">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>Work Remaining</span>
          </div>
          <div className="font-mono font-bold text-emerald-700 text-sm">
            +{formatCurrency(state.remainingExpectedIncome)}
          </div>
          <div className="text-[10px] text-zinc-400 truncate">
            {state.shiftsRemainingThisWeek} shifts @ ₹{config.expectedWagePerShift}
          </div>
        </div>

        {/* Pillar 3: Locked Obligations (Clickable) */}
        <button
          type="button"
          onClick={() => setIsObligationsOpen(!isObligationsOpen)}
          className="p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200/80 space-y-1 text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-red-600" />
              <span>Locked Debts</span>
            </div>
            {isObligationsOpen ? (
              <ChevronUp className="w-3 h-3 text-zinc-400 group-hover:text-black" />
            ) : (
              <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-black" />
            )}
          </div>
          <div className="font-mono font-bold text-red-600 text-sm">
            -{formatCurrency(state.totalObligationsLocked)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {state.pendingDuesCount} dues, {state.pendingTabsCount} tabs
          </div>
        </button>

        {/* Pillar 4: Net Weekly Safe Pool */}
        <div className="p-2.5 bg-zinc-900 text-white rounded-xl space-y-1">
          <div className="flex items-center gap-1 text-zinc-400 text-[10px] font-mono uppercase">
            <Calendar className="w-3 h-3 text-amber-300" />
            <span>Weekly Safe Pool</span>
          </div>
          <div className="font-mono font-bold text-amber-300 text-sm">
            {formatCurrency(state.netWeeklySafePool)}
          </div>
          <div className="text-[10px] text-zinc-400 truncate">
            Spread across {state.daysRemainingInWeek} days
          </div>
        </div>
      </div>

      {/* Expandable Itemized Obligations Drawer */}
      {isObligationsOpen && (
        <div className="p-3.5 bg-zinc-100/90 rounded-2xl border border-zinc-200 space-y-3 text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
              <Lock className="w-3.5 h-3.5 text-red-600" />
              <span>Protected Obligations ({state.pendingDuesCount + state.pendingTabsCount})</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-red-600">
              Total: -{formatCurrency(state.totalObligationsLocked)}
            </span>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Every unpaid due and friend tab is 100% ring-fenced from your liquid funds so you never
            risk missing rent, bills, or debt repayments.
          </p>

          <div className="space-y-2">
            {/* Monthly Dues List */}
            {state.pendingDuesList.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-600" />
                  <span>Unpaid Monthly Dues ({state.pendingDuesList.length})</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {state.pendingDuesList.map((d) => (
                    <div
                      key={d.id}
                      className="p-2 bg-white rounded-xl border border-zinc-200 flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-zinc-900 block truncate">{d.title}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">
                          Due day {d.dueDayOfMonth} &bull; {d.category}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-red-600 shrink-0">
                        -{formatCurrency(d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Tabs You Owe */}
            {state.pendingTabsList.filter((t) => t.type === 'you_owe').length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3 text-zinc-600" />
                  <span>Friend Tabs You Owe ({state.pendingTabsList.filter((t) => t.type === 'you_owe').length})</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {state.pendingTabsList
                    .filter((t) => t.type === 'you_owe')
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-2 bg-white rounded-xl border border-zinc-200 flex items-center justify-between text-[11px]"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold text-zinc-900 block truncate">
                            {t.personName}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-mono truncate block">
                            {t.description || 'Tab debt'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-red-600 shrink-0">
                          -{formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {state.pendingDuesList.length === 0 &&
              state.pendingTabsList.filter((t) => t.type === 'you_owe').length === 0 && (
                <div className="p-3 bg-white rounded-xl border border-zinc-200 text-center text-zinc-500 text-xs">
                  ✨ No pending dues or debts! 100% of your money is discretionary.
                </div>
              )}
          </div>
        </div>
      )}

      {/* Quick 1-Tap Loggers */}
      <div className="pt-1 border-t border-zinc-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* 1-Tap Shift Logger */}
          <button
            type="button"
            onClick={() => onLogShift(config.expectedWagePerShift, 'Daily Shift Wage')}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>+₹{config.expectedWagePerShift} Shift</span>
          </button>

          {/* Quick Custom Inflow Logger */}
          <button
            type="button"
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Log Inflow</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
          Earned this week: <strong className="text-zinc-900">+{formatCurrency(state.earnedThisWeek)}</strong>
        </div>
      </div>

      {/* Settings Modal */}
      <SafeSpendConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={onUpdateConfig}
        dues={dues}
      />

      {/* Quick Income Modal */}
      <QuickIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSaveIncome={(amt, cat, desc, w) => {
          if (onLogIncome) {
            onLogIncome(amt, cat, desc, w);
          } else {
            onLogShift(amt, desc);
          }
        }}
        defaultWallet={config.defaultWallet}
        expectedWage={config.expectedWagePerShift}
      />
    </div>
  );
}
