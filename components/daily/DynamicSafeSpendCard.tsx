'use client';

import React, { useState } from 'react';
import {
  DynamicSafeSpendState,
  DynamicSafeSpendConfig,
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
  Clock,
  ArrowUpRight,
  Flame,
} from 'lucide-react';
import SafeSpendConfigModal from './SafeSpendConfigModal';
import QuickIncomeModal from './QuickIncomeModal';

interface DynamicSafeSpendCardProps {
  state: DynamicSafeSpendState;
  config: DynamicSafeSpendConfig;
  onUpdateConfig: (newConfig: DynamicSafeSpendConfig) => void;
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

export default function DynamicSafeSpendCard({
  state,
  config,
  onUpdateConfig,
  onLogShift,
  onLogIncome,
  dues = [],
  onOpenCopilot,
}: DynamicSafeSpendCardProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isObligationsOpen, setIsObligationsOpen] = useState(false);

  const isOverspent = state.isOverspentToday;
  const isClose = !isOverspent && state.percentUsedToday >= 80;
  const bottleneck = state.activeBottleneck;

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
                Safe to Spend
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-black text-white">
                Dynamic Runway
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200"
                title={`${state.runwayDays}-day continuous rolling runway`}
              >
                {state.runwayDays}d Horizon
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                {state.shiftsCompleted} of {state.shiftsPerWeek} shifts done
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">
              Continuous Cashflow Runway &bull; Zero Calendar Resets &bull; Guaranteed Bill Protection
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
            title="Runway Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Bottleneck Banner */}
      {bottleneck && (
        <div className="p-2.5 sm:p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-amber-200/80 text-amber-900 font-bold text-xs">
              ⚡
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-amber-950 truncate">
                  Paced for {bottleneck.title} ({formatCurrency(bottleneck.amount)})
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-200/70 text-amber-900">
                  {bottleneck.daysUntilDue === 0
                    ? 'Due Today!'
                    : bottleneck.daysUntilDue === 1
                    ? 'Due Tomorrow'
                    : `in ${bottleneck.daysUntilDue} days`}
                </span>
              </div>
              <p className="text-[10px] text-amber-800 truncate">
                Capping daily spend at {formatCurrency(bottleneck.criticalRate)}/day so this bill never bounces.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsObligationsOpen(true)}
            className="flex-shrink-0 text-[10px] font-bold text-amber-900 hover:underline px-2 py-1 bg-white/80 rounded-lg border border-amber-200"
          >
            View
          </button>
        </div>
      )}

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

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-mono text-zinc-500 block">
              Daily Target Cap: {formatCurrency(state.dailyTargetToday)}/day
            </span>
            <span className="text-[10px] font-mono text-zinc-600">
              Spent Today: {formatCurrency(state.spentToday)}
            </span>
          </div>
        </div>

        {/* Visual Burn Gauge */}
        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isOverspent
                ? 'bg-red-500'
                : isClose
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, state.percentUsedToday)}%` }}
          />
        </div>
      </div>

      {/* Upcoming Obligations Chronological Timeline */}
      {state.upcomingTimeline && state.upcomingTimeline.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              Upcoming Obligations Timeline
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {state.upcomingTimeline.length} upcoming
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {state.upcomingTimeline.map((item) => {
              const isItemBottleneck = item.isBottleneck;
              return (
                <div
                  key={item.id}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                    isItemBottleneck
                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      {isItemBottleneck && (
                        <span className="text-[10px]" title="Active Bottleneck">
                          ⚡
                        </span>
                      )}
                      <span className="font-semibold truncate max-w-[110px]">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {item.daysUntilDue === 0
                        ? 'Today'
                        : item.daysUntilDue === 1
                        ? 'Tomorrow'
                        : `in ${item.daysUntilDue} days`}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[11px]">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* The Financial Triad: Have, Earned, Will Earn */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {/* 1. HAVE */}
        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Wallet className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              1. You Have
            </span>
          </div>
          <div className="text-sm sm:text-base font-mono font-bold text-zinc-900">
            {formatCurrency(state.totalLiquidFunds)}
          </div>
          <div className="text-[9px] font-mono text-zinc-500 truncate">
            Cash: {formatCurrency(state.wallets.cashInHand)} &bull; Bank: {formatCurrency(state.wallets.accountBalance)}
          </div>
        </div>

        {/* 2. EARNED */}
        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              2. You Earned
            </span>
          </div>
          <div className="text-sm sm:text-base font-mono font-bold text-emerald-700">
            {formatCurrency(state.earnedRecent)}
          </div>
          <div className="text-[9px] font-mono text-zinc-500">
            {state.shiftsCompleted} shifts completed
          </div>
        </div>

        {/* 3. WILL EARN */}
        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              3. Will Earn
            </span>
          </div>
          <div className="text-sm sm:text-base font-mono font-bold text-indigo-700">
            {formatCurrency(state.projectedRemainingIncome)}
          </div>
          <div className="text-[9px] font-mono text-zinc-500 truncate">
            {state.shiftsRemaining} shifts @ {formatCurrency(state.expectedWagePerShift)}
          </div>
        </div>

        {/* 4. LOCKED OBLIGATIONS */}
        <div
          onClick={() => setIsObligationsOpen(!isObligationsOpen)}
          className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70 space-y-1 cursor-pointer hover:bg-zinc-100 transition-colors"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Locked Dues
              </span>
            </div>
            {isObligationsOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </div>
          <div className="text-sm sm:text-base font-mono font-bold text-amber-800">
            {formatCurrency(state.totalObligationsInRunway)}
          </div>
          <div className="text-[9px] font-mono text-zinc-500">
            {state.pendingDuesCount} dues &bull; {state.pendingTabsCount} tabs
          </div>
        </div>
      </div>

      {/* Expandable Breakdown of Locked Obligations */}
      {isObligationsOpen && (
        <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
            <span className="font-bold text-zinc-900">
              Itemized Locked Obligations ({formatCurrency(state.totalObligationsInRunway)})
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Ring-fenced across {state.runwayDays}d runway
            </span>
          </div>

          {/* Monthly Dues */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500">
              Upcoming Monthly Dues ({state.pendingDuesCount}):
            </span>
            {state.pendingDuesList.length > 0 ? (
              state.pendingDuesList.map((due) => (
                <div
                  key={due.id}
                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-zinc-200/80"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{due.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700">
                      {due.daysUntilDue === 0 ? 'Today' : `in ${due.daysUntilDue}d`}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">
                    {formatCurrency(due.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 italic text-[11px]">No pending monthly dues.</p>
            )}
          </div>

          {/* Tabs Owed */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500">
              Friend Tabs You Owe ({state.pendingTabsCount}):
            </span>
            {state.pendingTabsList.length > 0 ? (
              state.pendingTabsList.map((tab) => (
                <div
                  key={tab.id}
                  className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-zinc-200/80"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">Owe {tab.personName}</span>
                    {tab.description && (
                      <span className="text-[10px] text-zinc-500 italic truncate max-w-[120px]">
                        ({tab.description})
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-red-600">
                    {formatCurrency(tab.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 italic text-[11px]">Zero friend debts.</p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
        {/* 1-Tap Log Shift Button */}
        <button
          onClick={() =>
            onLogShift(
              config.expectedWagePerShift,
              `Shift Wage (${formatCurrency(config.expectedWagePerShift)})`
            )
          }
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>+ {formatCurrency(config.expectedWagePerShift)} Shift</span>
        </button>

        {/* Log Custom Inflow */}
        <button
          onClick={() => setIsIncomeModalOpen(true)}
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold active:scale-[0.98] transition-all border border-zinc-200"
        >
          <Coins className="w-3.5 h-3.5 text-emerald-600" />
          <span>+ Log Inflow</span>
        </button>
      </div>

      {/* Modals */}
      <SafeSpendConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={(newConfig) => {
          onUpdateConfig(newConfig);
          setIsConfigOpen(false);
        }}
        dues={dues}
      />

      <QuickIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSaveIncome={(amount, category, description, wallet) => {
          if (onLogIncome) {
            onLogIncome(amount, category, description, wallet);
          } else {
            onLogShift(amount, description);
          }
          setIsIncomeModalOpen(false);
        }}
        defaultWallet={config.defaultWallet}
        expectedWage={config.expectedWagePerShift}
      />

    </div>
  );
}
