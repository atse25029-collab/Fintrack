'use client';

import React, { useState, useEffect } from 'react';
import { WalletBalances } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { X, Banknote, Building2, Check } from 'lucide-react';

interface WalletAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallets: WalletBalances;
  onSave: (wallets: WalletBalances) => void;
}

export default function WalletAdjustModal({
  isOpen,
  onClose,
  currentWallets,
  onSave,
}: WalletAdjustModalProps) {
  const [cashInHand, setCashInHand] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCashInHand(currentWallets.cashInHand.toString());
      setAccountBalance(currentWallets.accountBalance.toString());
      setError(null);
    }
  }, [isOpen, currentWallets]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cash = parseFloat(cashInHand);
    const account = parseFloat(accountBalance);

    if (isNaN(cash) || cash < 0) {
      setError('Please enter a valid amount for Money in Hand');
      return;
    }

    if (isNaN(account) || account < 0) {
      setError('Please enter a valid amount for Money in Account');
      return;
    }

    onSave({
      cashInHand: Math.round(cash * 100) / 100,
      accountBalance: Math.round(account * 100) / 100,
      lastUpdated: Date.now(),
    });
    onClose();
  };

  const cashNum = parseFloat(cashInHand) || 0;
  const accNum = parseFloat(accountBalance) || 0;
  const totalPreview = cashNum + accNum;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-950">
              Adjust Liquid Balances
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500">
              Update your physical cash in hand and digital bank balances
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Money in Hand Input */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
              <Banknote className="w-3.5 h-3.5 text-black" />
              <span>Money in Hand (Physical Cash)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-zinc-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={cashInHand}
                onChange={(e) => setCashInHand(e.target.value)}
                placeholder="2500"
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
            <p className="text-[10px] text-zinc-400">
              Cash expenses will automatically be deducted from here
            </p>
          </div>

          {/* Money in Account Input */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
              <Building2 className="w-3.5 h-3.5 text-black" />
              <span>Money in Account (Bank / UPI / Cards)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold font-mono text-zinc-400">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                placeholder="45000"
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
            <p className="text-[10px] text-zinc-400">
              UPI and Card expenses will automatically be deducted from here
            </p>
          </div>

          {/* Total Preview */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-xs">
            <span className="text-zinc-600 font-medium">Calculated Total Liquidity:</span>
            <span className="text-sm font-mono font-bold text-black">
              {formatCurrency(totalPreview)}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium text-zinc-600 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Balances</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
