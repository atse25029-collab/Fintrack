'use client';

import React, { useState, useEffect } from 'react';
import { BudgetConfig } from '@/lib/types';
import { X, Target, Check } from 'lucide-react';

interface BudgetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: BudgetConfig;
  onSaveBudget: (updated: BudgetConfig) => void;
}

export default function BudgetTargetModal({
  isOpen,
  onClose,
  currentBudget,
  onSaveBudget,
}: BudgetTargetModalProps) {
  const [dailyAllowance, setDailyAllowance] = useState<string>(
    currentBudget.dailyAllowance.toString()
  );
  const [monthlyLimit, setMonthlyLimit] = useState<string>(
    currentBudget.monthlyLimit.toString()
  );

  // Synchronize with currentBudget whenever modal opens or currentBudget updates
  useEffect(() => {
    if (isOpen) {
      setDailyAllowance(currentBudget.dailyAllowance.toString());
      setMonthlyLimit(currentBudget.monthlyLimit.toString());
    }
  }, [isOpen, currentBudget]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const daily = parseFloat(dailyAllowance);
    const monthly = parseFloat(monthlyLimit);

    if (isNaN(daily) || daily <= 0) return;
    if (isNaN(monthly) || monthly <= 0) return;

    onSaveBudget({
      dailyAllowance: daily,
      monthlyLimit: monthly,
      currency: 'INR',
      currencySymbol: '₹',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl">
              <Target className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Budget Boundaries (INR)</h3>
              <p className="text-xs text-zinc-500">Configure your daily allowance &amp; monthly cap in ₹</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Daily Allowance (₹) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              Daily Spending Allowance (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-base">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                min="1"
                value={dailyAllowance}
                onChange={(e) => setDailyAllowance(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                placeholder="e.g. 600"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Your personal daily spending allowance (persists across reloads).
            </p>
          </div>

          {/* Monthly Budget Limit (₹) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              Monthly Budget Ceiling (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-base">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                min="1"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                placeholder="e.g. 25000"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Total monthly expenditure ceiling including rent, bills, dues, and living costs.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Budget</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
