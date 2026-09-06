'use client';

import React, { useState, useEffect } from 'react';
import { DynamicSafeSpendConfig, MonthlyDue } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { X, Sliders, Shield, Wallet, Briefcase, Calendar, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

interface SafeSpendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DynamicSafeSpendConfig;
  onSave: (newConfig: DynamicSafeSpendConfig) => void;
  dues?: MonthlyDue[];
}

export default function SafeSpendConfigModal({
  isOpen,
  onClose,
  config,
  onSave,
  dues = [],
}: SafeSpendConfigModalProps) {
  const [wage, setWage] = useState((config.expectedWagePerShift || 300).toString());
  const [shifts, setShifts] = useState((config.shiftsPerWeek || config.plannedWorkShiftsThisWeek || 5).toString());
  const [additional, setAdditional] = useState((config.additionalWeeklyIncome || 0).toString());
  const [wallet, setWallet] = useState<'Cash' | 'UPI / Bank'>(config.defaultWallet || 'Cash');
  const [horizon, setHorizon] = useState((config.runwayHorizonDays || config.duesHorizonDays || 14).toString());
  const [includeOwed, setIncludeOwed] = useState(Boolean(config.includeOwedToYouTabs));
  const [buffer, setBuffer] = useState((config.emergencyBufferPercent || 0).toString());

  useEffect(() => {
    if (isOpen) {
      setWage((config.expectedWagePerShift || 300).toString());
      setShifts((config.shiftsPerWeek || config.plannedWorkShiftsThisWeek || 5).toString());
      setAdditional((config.additionalWeeklyIncome || 0).toString());
      setWallet(config.defaultWallet || 'Cash');
      setHorizon((config.runwayHorizonDays || config.duesHorizonDays || 14).toString());
      setIncludeOwed(Boolean(config.includeOwedToYouTabs));
      setBuffer((config.emergencyBufferPercent || 0).toString());
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const numWage = Math.max(50, Number(wage) || 300);
  const numShifts = Math.min(7, Math.max(1, Number(shifts) || 5));
  const numAdditional = Math.max(0, Number(additional) || 0);
  const numHorizon = Number(horizon) || 14;
  const numBuffer = Math.min(25, Math.max(0, Number(buffer) || 0));

  // Simulation
  const simulatedWorkIncome = numShifts * numWage;
  const simulatedTotalIncome = simulatedWorkIncome + numAdditional;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...config,
      expectedWagePerShift: numWage,
      shiftsPerWeek: numShifts,
      plannedWorkShiftsThisWeek: numShifts,
      additionalWeeklyIncome: numAdditional,
      defaultWallet: wallet,
      runwayHorizonDays: numHorizon,
      duesHorizonDays: numHorizon,
      includeOwedToYouTabs: includeOwed,
      emergencyBufferPercent: numBuffer,
    });
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl text-black">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Safe Spend Work & Horizon Settings</h3>
              <p className="text-[11px] text-zinc-500">Estimate weekly income from your planned work</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Expected Wage per Shift */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-zinc-600" />
              <span>Wage Rate Per Shift / Day (₹)</span>
            </label>
            <input
              type="number"
              min="50"
              step="10"
              required
              value={wage}
              onChange={(e) => setWage(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-black"
              placeholder="300"
            />
            <p className="text-[10px] text-zinc-400">
              Standard amount you earn when you complete one full work shift.
            </p>
          </div>

          {/* Planned Work Shifts this Week */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                <span>Planned Work Shifts This Week</span>
              </label>
              <span className="font-mono font-bold text-black bg-zinc-100 px-2 py-0.5 rounded-md">
                {numShifts} {numShifts === 1 ? 'shift' : 'shifts'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              step="1"
              value={shifts}
              onChange={(e) => setShifts(e.target.value)}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>1 day (Part-time)</span>
              <span>5 days (Standard)</span>
              <span>7 days (Daily)</span>
            </div>
          </div>

          {/* Additional Weekly Income (Freelance / Gigs) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
              <span>Other Estimated Weekly Inflow / Gigs (₹)</span>
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={additional}
              onChange={(e) => setAdditional(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-black"
              placeholder="0"
            />
            <p className="text-[10px] text-zinc-400">
              Expected freelance earnings, gifts, or side income this week (optional).
            </p>
          </div>

          {/* Dues Protection Horizon */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-600" />
              <span>Dues Protection Horizon</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 7, label: 'This Week (7d)' },
                { val: 14, label: 'Fortnight (14d)' },
                { val: 30, label: 'Full Month (30d)' },
              ].map((h) => (
                <button
                  key={h.val}
                  type="button"
                  onClick={() => setHorizon(h.val.toString())}
                  className={`py-2 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                    numHorizon === h.val
                      ? 'bg-black text-white border-black shadow-2xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400">
              Locks away all unpaid bills due within this window.
            </p>
          </div>

          {/* Default Wallet for 1-Tap Shifts */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-zinc-600" />
              <span>Default Credit Wallet for 1-Tap Shifts</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Cash', 'UPI / Bank'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWallet(w)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    wallet === w
                      ? 'bg-black text-white border-black shadow-2xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                >
                  {w === 'Cash' ? '💵 Cash in Hand' : '📱 UPI / Bank'}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle: Include Money Friends Owe You */}
          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-zinc-900 block text-[11px]">
                Include Money Friends Owe You?
              </span>
              <span className="text-[10px] text-zinc-400 block leading-tight">
                Offsets what you owe against pending tabs others owe you.
              </span>
            </div>
            <input
              type="checkbox"
              checked={includeOwed}
              onChange={(e) => setIncludeOwed(e.target.checked)}
              className="w-4 h-4 accent-black cursor-pointer rounded"
            />
          </div>

          {/* Live Mathematical Preview */}
          <div className="p-3.5 bg-zinc-100 rounded-2xl border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-600 font-medium">Estimated Work Earnings:</span>
              <span className="font-bold text-zinc-900">
                {numShifts} shifts &times; ₹{numWage} = {formatCurrency(simulatedWorkIncome)}
              </span>
            </div>
            {numAdditional > 0 && (
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-600 font-medium">+ Additional Inflow:</span>
                <span className="font-bold text-emerald-600">+{formatCurrency(numAdditional)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-zinc-200">
              <span className="font-bold text-zinc-900">Total Weekly Potential:</span>
              <span className="font-black text-black text-sm">
                {formatCurrency(simulatedTotalIncome)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 hover:text-black font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
