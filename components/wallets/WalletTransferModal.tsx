'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WalletBalances, TransferDirection } from '@/lib/types';
import { formatCurrency, getExactRealTime } from '@/lib/utils';
import {
  X,
  ArrowRightLeft,
  Banknote,
  Building2,
  Check,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface WalletTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallets: WalletBalances;
  onTransfer: (data: {
    direction: TransferDirection;
    amount: number;
    description: string;
    notes?: string;
    date: string;
    time: string;
  }) => void;
}

export default function WalletTransferModal({
  isOpen,
  onClose,
  currentWallets,
  onTransfer,
}: WalletTransferModalProps) {
  const [direction, setDirection] = useState<TransferDirection>('account_to_cash');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const realTime = getExactRealTime();
      setDate(realTime.date);
      setTime(realTime.time);
      setAmount('');
      setNotes('');
      setError(null);
      setDescription(
        direction === 'account_to_cash'
          ? 'ATM Cash Withdrawal'
          : 'Cash Deposit to Account'
      );
    }
  }, [isOpen, direction]);

  const handleDirectionChange = (newDir: TransferDirection) => {
    setDirection(newDir);
    setDescription(
      newDir === 'account_to_cash'
        ? 'ATM Cash Withdrawal'
        : 'Cash Deposit to Account'
    );
    setError(null);
  };

  const parsedAmount = parseFloat(amount) || 0;
  const sourceBalance =
    direction === 'account_to_cash'
      ? currentWallets.accountBalance
      : currentWallets.cashInHand;
  const destBalance =
    direction === 'account_to_cash'
      ? currentWallets.cashInHand
      : currentWallets.accountBalance;

  const projectedSource = Math.max(0, sourceBalance - parsedAmount);
  const projectedDest = destBalance + parsedAmount;
  const isOverdraw = parsedAmount > sourceBalance;

  const handleAddQuickAmount = (val: number) => {
    const next = (parseFloat(amount) || 0) + val;
    setAmount(next.toString());
  };

  const handleMaxAmount = () => {
    setAmount(sourceBalance.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError('Please enter a valid transfer amount greater than 0.');
      return;
    }

    if (isOverdraw) {
      setError(
        direction === 'account_to_cash'
          ? `Transfer amount exceeds available account balance (${formatCurrency(sourceBalance)}).`
          : `Transfer amount exceeds available cash in hand (${formatCurrency(sourceBalance)}).`
      );
      return;
    }

    const realTime = getExactRealTime();
    onTransfer({
      direction,
      amount: Math.round(parsedAmount * 100) / 100,
      description: description.trim() || (direction === 'account_to_cash' ? 'ATM Cash Withdrawal' : 'Cash Deposit'),
      notes: notes.trim() || undefined,
      date: date || realTime.date,
      time: time || realTime.time,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="relative z-10 bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-black text-white shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-950">
                    Transfer Funds
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-500">
                    Shift money between physical cash and bank accounts
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Direction Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleDirectionChange('account_to_cash')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  direction === 'account_to_cash'
                    ? 'bg-white text-black shadow-2xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>Account ➔ Cash</span>
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange('cash_to_account')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  direction === 'cash_to_account'
                    ? 'bg-white text-black shadow-2xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 shrink-0" />
                <span>Cash ➔ Account</span>
              </button>
            </div>

            {/* Visual Live Balance Flow */}
            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono font-medium text-zinc-500">
                <span>{direction === 'account_to_cash' ? 'Bank / Account (Source)' : 'Cash in Hand (Source)'}</span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <ArrowRight className="w-3 h-3" />
                </span>
                <span>{direction === 'account_to_cash' ? 'Cash in Hand (Dest)' : 'Bank / Account (Dest)'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                {/* Source Pocket */}
                <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Current:</span>
                    <span className="font-mono font-semibold">{formatCurrency(sourceBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-700 font-medium">After:</span>
                    <span
                      className={`font-mono font-bold ${
                        isOverdraw ? 'text-red-600 font-extrabold' : 'text-black'
                      }`}
                    >
                      {formatCurrency(projectedSource)}
                    </span>
                  </div>
                </div>

                {/* Destination Pocket */}
                <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Current:</span>
                    <span className="font-mono font-semibold">{formatCurrency(destBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-700 font-medium">After:</span>
                    <span className="font-mono font-bold text-black">
                      {formatCurrency(projectedDest)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total liquidity indicator */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 text-[10px] text-zinc-500 font-mono">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Total Available Liquidity</span>
                </span>
                <span className="font-bold text-zinc-900">
                  {formatCurrency(currentWallets.cashInHand + currentWallets.accountBalance)} (Constant)
                </span>
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Amount input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-900 block">
                  Transfer Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold font-mono text-zinc-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    placeholder="1000"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                    required
                    autoFocus
                  />
                </div>

                {/* Quick amount chips */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                  {[500, 1000, 2000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAddQuickAmount(val)}
                      className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      +{val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleMaxAmount}
                    className="px-2.5 py-1 text-[11px] font-mono font-bold bg-black text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    All Available
                  </button>
                </div>
              </div>

              {/* Description & Label */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-900 block">
                  Activity Title / Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    direction === 'account_to_cash'
                      ? 'ATM Cash Withdrawal'
                      : 'Cash Deposit'
                  }
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-900 block">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. HDFC Bank ATM, Market CDM machine"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 block">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 block">
                    Time
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-medium text-zinc-600 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={isOverdraw || parsedAmount <= 0}
                  className="flex-1 py-2 bg-black disabled:opacity-50 text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Transfer</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
