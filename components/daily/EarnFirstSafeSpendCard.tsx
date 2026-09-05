'use client';

import React, { useState } from 'react';
import {
  EarnFirstState,
  EarnFirstConfig,
  Transaction,
  MonthlyDue,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  ShieldCheck,
  Zap,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  TrendingUp,
  Briefcase,
  Sparkles,
  PlusCircle,
  Coins,
} from 'lucide-react';
import SafeSpendConfigModal from './SafeSpendConfigModal';
import QuickIncomeModal from './QuickIncomeModal';

interface EarnFirstSafeSpendCardProps {
  state: EarnFirstState;
  config: EarnFirstConfig;
  onUpdateConfig: (newConfig: EarnFirstConfig) => void;
  onLogShift: (amount: number, description: string) => void;
  onLogIncome?: (
    amount: number,
    category: string,
    description: string,
    wallet: 'Cash' | 'UPI / Bank'
  ) => void;
  onToggleRestDay: () => void;
}

export default function EarnFirstSafeSpendCard({
  state,
  config,
  onUpdateConfig,
  onLogShift,
  onLogIncome,
  onToggleRestDay,
}: EarnFirstSafeSpendCardProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const isOverspent = state.remainingToday < 0;
  const isHealthy = !isOverspent && state.percentUsed < 80;
  const isClose = !isOverspent && state.percentUsed >= 80;

  return (
    <div className="w-full bg-white rounded-3xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-4 transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-black text-white rounded-xl">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Today&apos;s Earn-First Safe Spend
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                  state.totalIncomeToday > 0
                    ? 'bg-zinc-100 text-black border-zinc-300'
                    : state.isRestDay
                    ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                }`}
              >
                {state.totalIncomeToday > 0
                  ? `+${formatCurrency(state.totalIncomeToday)} Earned (${state.incomeCountToday || 1} ${
                      (state.incomeCountToday || 1) === 1 ? 'stream' : 'streams'
                    })`
                  : state.isRestDay
                  ? '🛋️ Rest Day'
                  : '⏳ Awaiting Income'}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-500">
              {Math.round(config.workFactor * 100)}% shift probability • Auto-compensating rollover
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsConfigOpen(true)}
          className="p-2 rounded-xl text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
          title="Safe Spend Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Metric & Progress Meter */}
      <div className="p-3.5 sm:p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
              Safe Left to Spend Today
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-mono font-black tracking-tight ${
                  isOverspent
                    ? 'text-red-600'
                    : isClose
                    ? 'text-amber-600'
                    : 'text-zinc-950'
                }`}
              >
                {formatCurrency(Math.max(0, state.remainingToday))}
              </span>
              {isOverspent && (
                <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                  Overspent by {formatCurrency(Math.abs(state.remainingToday))}
                </span>
              )}
            </div>
          </div>

          <div className="text-right sm:text-right text-[11px] font-mono text-zinc-600 space-y-0.5">
            <div>
              Allowance: <strong className="text-zinc-900">{formatCurrency(state.totalAllowanceToday)}</strong>
              {state.carriedRollover !== 0 && (
                <span
                  className={`ml-1 font-bold ${
                    state.carriedRollover > 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  ({state.carriedRollover > 0 ? '+' : ''}
                  {formatCurrency(state.carriedRollover)} rollover)
                </span>
              )}
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
              style={{ width: `${Math.min(100, state.percentUsed)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>{state.percentUsed}% of safe limit used</span>
            <span>
              {isOverspent
                ? 'Compensates on next shift'
                : isClose
                ? 'Approaching limit'
                : 'Spending safely'}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Incomes Today */}
      {state.incomeItemsToday && state.incomeItemsToday.length > 0 && (
        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
              <Coins className="w-3 h-3 text-black" />
              <span>Today&apos;s Income Streams ({state.incomeItemsToday.length})</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-black">
              Total: +{formatCurrency(state.totalIncomeToday)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {state.incomeItemsToday.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-zinc-200 text-[11px] shadow-2xs"
              >
                <span className="font-semibold text-zinc-900 truncate max-w-[130px] sm:max-w-[200px]">
                  {item.description}
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 bg-zinc-100 rounded text-zinc-600">
                  {item.paymentMethod === 'Cash' ? '💵 Cash' : '📱 UPI'}
                </span>
                <span className="font-mono font-bold text-black">
                  +{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>

          {state.duesShieldToday > 0 && (
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-200/60">
              <span>Gross: +{formatCurrency(state.totalIncomeToday)}</span>
              <span>Dues Shield: -{formatCurrency(state.duesShieldToday)}</span>
              <span className="font-bold text-zinc-900">
                Pocket Inflow: +{formatCurrency(state.basePocketAllowance)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 1-Tap Income Logging Presets & Custom Inflow */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
            Quick Income Loggers &amp; Day Off Toggle
          </span>
          <button
            type="button"
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-black hover:text-zinc-600 transition-colors"
          >
            <PlusCircle className="w-3 h-3 text-emerald-600" />
            <span>+ Custom Income</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Full Shift (Configured expected wage) */}
          <button
            type="button"
            onClick={() => onLogShift(config.expectedDailyWage, 'Daily Shift Wage')}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-black hover:bg-zinc-800 border border-black rounded-xl text-xs font-semibold text-white transition-all active:scale-95 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>+₹{config.expectedDailyWage} Shift</span>
          </button>

          {/* Gig / Freelance Quick Log */}
          <button
            type="button"
            onClick={() => {
              if (onLogIncome) {
                onLogIncome(500, 'Freelance / Consulting', 'Freelance Gig', 'UPI / Bank');
              } else {
                onLogShift(500, 'Freelance Gig');
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 transition-all active:scale-95"
          >
            <Briefcase className="w-3.5 h-3.5 text-zinc-600" />
            <span>+₹500 Gig</span>
          </button>

          {/* Other Inflow Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 transition-all active:scale-95"
          >
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Other Inflow</span>
          </button>

          {/* Rest Day */}
          <button
            type="button"
            onClick={onToggleRestDay}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 border rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              state.isRestDay
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{state.isRestDay ? 'Work Mode' : 'Rest Day'}</span>
          </button>
        </div>
      </div>

      {/* Dues Shield & Cushion Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-100">
        {/* Dues Shield Info */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/70 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-black shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-900 text-[11px] block">
              🛡️ Dues Shield:{' '}
              {state.duesShieldToday > 0
                ? `${formatCurrency(state.duesShieldToday)} reserved`
                : 'Active'}
            </span>
            <p className="text-[10px] text-zinc-500">
              {state.nextUrgentDue
                ? `Next: ${state.nextUrgentDue.title} (${formatCurrency(state.nextUrgentDue.amount)}) in ${state.nextUrgentDue.daysLeft} days`
                : 'All upcoming monthly dues are protected.'}
            </p>
          </div>
        </div>

        {/* Rest-Day Cushion & Rollover Info */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/70 flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-black shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-900 text-[11px] block">
              🛋️ Cushion Fund: {formatCurrency(state.restDayCushion)}
            </span>
            <p className="text-[10px] text-zinc-500">
              Weekly Net:{' '}
              <span
                className={`font-mono font-bold ${
                  state.weeklyNetRollover >= 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {state.weeklyNetRollover >= 0 ? '+' : ''}
                {formatCurrency(state.weeklyNetRollover)}
              </span>{' '}
              ({state.weeklyNetRollover >= 0 ? 'ahead of plan' : 'tightening'})
            </p>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <SafeSpendConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={onUpdateConfig}
      />

      {/* Quick Income Modal for Any Income Type */}
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
        expectedWage={config.expectedDailyWage}
      />
    </div>
  );
}
