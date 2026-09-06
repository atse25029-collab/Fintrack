'use client';

import React, { useState, useEffect } from 'react';
import { EarnFirstConfig, MonthlyDue } from '@/lib/types';
import { calculateDueUrgency } from '@/lib/safeSpend/safeSpendEngine';
import { formatCurrency } from '@/lib/utils';
import { X, Sliders, Shield, Wallet, Briefcase, Sparkles, ArrowRight } from 'lucide-react';

interface SafeSpendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EarnFirstConfig;
  onSave: (newConfig: EarnFirstConfig) => void;
  dues?: MonthlyDue[];
}

export default function SafeSpendConfigModal({
  isOpen,
  onClose,
  config,
  onSave,
  dues = [],
}: SafeSpendConfigModalProps) {
  const [wage, setWage] = useState(config.expectedDailyWage.toString());
  const [workFactor, setWorkFactor] = useState(config.workFactor.toString());
  const [wallet, setWallet] = useState<'Cash' | 'UPI / Bank'>(config.defaultWallet || 'Cash');
  const [cap, setCap] = useState((config.duesReserveCapPercent || 40).toString());

  useEffect(() => {
    if (isOpen) {
      setWage(config.expectedDailyWage.toString());
      setWorkFactor(config.workFactor.toString());
      setWallet(config.defaultWallet || 'Cash');
      setCap((config.duesReserveCapPercent || 40).toString());
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const numWage = Math.max(50, Number(wage) || 200);
  const numFactor = Math.min(1, Math.max(0.2, Number(workFactor) || 0.70));
  const numCap = Math.min(60, Math.max(15, Number(cap) || 40));

  const urgency = calculateDueUrgency(dues, new Date(), numFactor);
  const maxCapAmount = Math.round(numWage * (numCap / 100));
  const simulatedShield = Math.min(urgency.totalDailyCut, maxCapAmount);
  const simulatedSafePocket = Math.max(0, numWage - simulatedShield);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      expectedDailyWage: numWage,
      workFactor: numFactor,
      defaultWallet: wallet,
      duesReserveCapPercent: numCap,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl text-black">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Earn-First Safe Spend Settings</h3>
              <p className="text-[11px] text-zinc-500">Tune your daily wage and shift work factor</p>
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
          {/* Expected Daily Wage */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-zinc-600" />
              <span>Standard Daily Shift Wage (₹)</span>
            </label>
            <input
              type="number"
              min="50"
              step="10"
              required
              value={wage}
              onChange={(e) => setWage(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="200"
            />
            <p className="text-[10px] text-zinc-400">
              Typical wage earned per full working shift (e.g. ₹200).
            </p>
          </div>

          {/* Work Frequency Factor */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 flex items-center justify-between">
              <span>Work Attendance Factor</span>
              <span className="font-mono text-black font-bold">
                {Math.round(Number(workFactor) * 7)} days / week ({Math.round(Number(workFactor) * 100)}%)
              </span>
            </label>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { label: '3-4 d/wk', val: 0.50, desc: 'Occasional' },
                { label: '5 d/wk', val: 0.70, desc: 'Standard' },
                { label: '6 d/wk', val: 0.85, desc: 'Frequent' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setWorkFactor(item.val.toString())}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    Math.abs(Number(workFactor) - item.val) < 0.08
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <span className="block font-bold text-[11px]">{item.label}</span>
                  <span className={`block text-[9px] ${Math.abs(Number(workFactor) - item.val) < 0.08 ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400">
              The engine assumes you take occasional rest days so missing a shift never panics your budget.
            </p>
          </div>

          {/* Default Wallet */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-zinc-600" />
              <span>Receive Daily Wage Into</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWallet('Cash')}
                className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                  wallet === 'Cash'
                    ? 'bg-black text-white border-black'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                💵 Physical Cash
              </button>
              <button
                type="button"
                onClick={() => setWallet('UPI / Bank')}
                className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                  wallet === 'UPI / Bank'
                    ? 'bg-black text-white border-black'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                📱 UPI / Bank
              </button>
            </div>
          </div>

          {/* Dues Cap */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-600" />
                <span>Max Dues Reserve Cap per Shift</span>
              </span>
              <span className="font-mono text-black font-bold">{cap}%</span>
            </label>
            <input
              type="range"
              min="20"
              max="50"
              step="5"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              className="w-full accent-black cursor-pointer"
            />
            <p className="text-[10px] text-zinc-400">
              Guarantees you keep at least {100 - Number(cap)}% of every shift as pocket cash, even when big dues approach.
            </p>
          </div>

          {/* Live Mathematical Model Simulation */}
          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Live Simulation (per shift):</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Formula preview</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-2 bg-white rounded-xl border border-zinc-200">
                <span className="text-[9px] text-zinc-500 block">Gross Shift</span>
                <span className="text-xs font-mono font-bold text-black">+{formatCurrency(numWage)}</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-zinc-200">
                <span className="text-[9px] text-zinc-500 block">Dues Shield</span>
                <span className={`text-xs font-mono font-bold ${simulatedShield > 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>
                  {simulatedShield > 0 ? `-${formatCurrency(simulatedShield)}` : '₹0'}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-zinc-200">
                <span className="text-[9px] text-zinc-500 block">Pocket Cash</span>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  +{formatCurrency(simulatedSafePocket)}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500">
              {urgency.totalDailyCut > 0 ? (
                <>🛡️ Reserving <strong>{formatCurrency(simulatedShield)}</strong>/shift to protect upcoming monthly dues ({urgency.nearestDue?.title || 'bills'} due in {urgency.nearestDue?.daysLeft} days).</>
              ) : (
                <>💡 You currently have <strong>no unpaid monthly dues</strong>, so Dues Shield is ₹0 (100% of your earnings go to pocket cash).</>
              )}
            </p>
            <p className="text-[10px] font-mono text-zinc-600 bg-white p-1.5 rounded-lg border border-zinc-200/60">
              📌 Saving updates your 1-tap Home button to: <strong>+₹{numWage} Shift</strong>.
            </p>
          </div>

          {/* Multi-Income Support Note */}
          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80 text-[11px] text-zinc-600 flex items-start gap-2">
            <span className="text-sm shrink-0">💡</span>
            <p>
              <strong>All Income Types Supported:</strong> Daily shift wages, freelance projects, bonuses, gifts, cashbacks, and tab repayments automatically expand today&apos;s safe pocket spend!
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl font-semibold shadow-sm transition-all active:scale-95"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
