'use client';

import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Zap,
  Laptop,
  Building,
  Gift,
  HandCoins,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react';

interface QuickIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveIncome: (
    amount: number,
    category: string,
    description: string,
    wallet: 'Cash' | 'UPI / Bank'
  ) => void;
  defaultWallet?: 'Cash' | 'UPI / Bank';
  expectedWage?: number;
}

const INCOME_PRESETS = [
  { label: 'Daily Shift', category: 'Daily Wage / Shift', desc: 'Daily Shift Wage', icon: Zap, defaultAmt: 200 },
  { label: 'Freelance / Gig', category: 'Freelance / Consulting', desc: 'Freelance Project', icon: Laptop, defaultAmt: 500 },
  { label: 'Salary / Bonus', category: 'Salary', desc: 'Salary / Advance', icon: Building, defaultAmt: 1000 },
  { label: 'Gift / Cashback', category: 'Gifts & Cashback', desc: 'Cashback Reward', icon: Gift, defaultAmt: 50 },
  { label: 'Tab Settled', category: 'Tab Settlement / Repayment', desc: 'Friend Repaid Tab', icon: HandCoins, defaultAmt: 150 },
  { label: 'Side Hustle', category: 'Side Hustle / Gig', desc: 'Item Sold / Gig', icon: ShoppingBag, defaultAmt: 300 },
];

export default function QuickIncomeModal({
  isOpen,
  onClose,
  onSaveIncome,
  defaultWallet = 'Cash',
  expectedWage = 200,
}: QuickIncomeModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(INCOME_PRESETS[0]);
  const [amount, setAmount] = useState(expectedWage.toString());
  const [description, setDescription] = useState(INCOME_PRESETS[0].desc);
  const [wallet, setWallet] = useState<'Cash' | 'UPI / Bank'>(defaultWallet);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof INCOME_PRESETS[0]) => {
    setSelectedPreset(preset);
    setDescription(preset.desc);
    if (preset.category === 'Daily Wage / Shift') {
      setAmount(expectedWage.toString());
    } else {
      setAmount(preset.defaultAmt.toString());
    }
  };

  const handleQuickAddAmount = (add: number) => {
    const current = Number(amount) || 0;
    setAmount((current + add).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (numAmt <= 0) return;
    onSaveIncome(
      numAmt,
      selectedPreset.category,
      description.trim() || selectedPreset.desc,
      wallet
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-black text-white rounded-xl">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Log Income Stream</h3>
              <p className="text-[11px] text-zinc-500">
                Instantly expands today&apos;s Earn-First safe spend
              </p>
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
          {/* Income Source Preset Chips */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Income Category / Source
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {INCOME_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset.category === preset.category;
                return (
                  <button
                    key={preset.category}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-xs font-semibold'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] leading-tight">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input & Increment Chips */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Amount Earned (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-zinc-400 font-mono">
                ₹
              </span>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-lg font-mono font-bold text-zinc-950 focus:outline-none focus:border-black focus:bg-white"
              />
            </div>
            {/* Quick add chips */}
            <div className="flex gap-1.5 pt-1">
              {[50, 100, 200, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-[10px] font-mono font-semibold transition-colors"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Description / Notes
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Evening Shift, Web Design Client, Swiggy Tip"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:outline-none focus:border-black focus:bg-white"
            />
          </div>

          {/* Wallet Inflow Destination */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Deposited Into
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWallet('Cash')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                  wallet === 'Cash'
                    ? 'bg-black text-white border-black'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>💵 Cash in Hand</span>
              </button>
              <button
                type="button"
                onClick={() => setWallet('UPI / Bank')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                  wallet === 'UPI / Bank'
                    ? 'bg-black text-white border-black'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>📱 UPI / Bank</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-3 bg-black hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-xs transition-colors"
            >
              Add to Safe Spend
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
